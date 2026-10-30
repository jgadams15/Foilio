"""Measure how accurate the matcher is on your own photos.

    python scripts/evaluate.py

Reads test_photos/labels.csv (photo, name, number), works out which card each
photo really is, and matches every photo twice: with cropping and without.
Prints a results table and accuracy for each, and saves a visual report to
evaluation/reports/report.html. See test_photos/README.md for how to set it up.
"""

import argparse
import base64
import csv
import html
import io
import json
import re
import sys
import unicodedata
from pathlib import Path

import requests
from PIL import Image

from common import (
    ML_DIR,
    SETS_FILE,
    TCGDEX_SETS_URL,
    embed,
    image_path_for,
    load_index,
    load_model,
    open_photo,
    top_matches,
)
from crop import crop_card

PHOTOS_DIR = ML_DIR / "test_photos"
REPORT_FILE = ML_DIR / "evaluation" / "reports" / "report.html"
TOP_K = 5
REPORT_TOP = 3  # matches shown per photo in the HTML report
MODES = ("with crop", "without crop")


# ---------- Working out which card a label means ----------


def normalize_name(name):
    """'Pokémon  Ex' -> 'pokemon ex': ignore capitals, accents, curly quotes, extra spaces."""
    name = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return " ".join(name.replace("’", "'").lower().split())


def normalize_number(number):
    """'025' -> '25', 'TG01' -> 'TG1': drop leading zeros so '025' and '25' match."""
    return re.sub(r"(?<!\d)0+(?=\d)", "", number.strip().upper())


def load_set_sizes():
    """{set id: official card count}, downloaded once from TCGdex and saved."""
    if not SETS_FILE.exists():
        print("Downloading the set list from TCGdex (once)...")
        response = requests.get(TCGDEX_SETS_URL, timeout=30)
        response.raise_for_status()
        SETS_FILE.write_text(response.text, encoding="utf-8")
    sets = json.loads(SETS_FILE.read_text(encoding="utf-8"))
    return {s["id"]: s.get("cardCount", {}).get("official") for s in sets}


def set_id_of(card):
    """A card's id is '<set id>-<number>', e.g. 'sv03.5-025' -> 'sv03.5'."""
    suffix = "-" + card["localId"]
    return card["id"][: -len(suffix)] if card["id"].endswith(suffix) else card["id"].rsplit("-", 1)[0]


def resolve_label(row, cards, set_sizes, indexed):
    """Which card ids a label row could mean, plus a problem message if none fit.

    Several ids can fit (e.g. the same card number in two sets of the same size);
    then any of them counts as correct. We never guess between them.
    """
    if row.get("card_id"):
        card_id = row["card_id"].strip()
        return ([card_id], None) if card_id in indexed else ([], f"card_id {card_id} is not in the index")

    number, _, total = row["number"].partition("/")
    same_card = [
        c for c in cards.values()
        if normalize_name(c["name"]) == normalize_name(row["name"])
        and normalize_number(c["localId"]) == normalize_number(number)
    ]
    if not same_card:
        return [], f"no card named '{row['name']}' with number {number.strip()}"

    total = total.strip()
    if total.isdigit():
        same_set_size = [c for c in same_card if set_sizes.get(set_id_of(c)) == int(total)]
        if not same_set_size:
            others = ", ".join(c["id"] for c in same_card[:5])
            return [], f"no set has {total} cards for this number (try a card_id: {others})"
        same_card = same_set_size

    ids = [c["id"] for c in same_card if c["id"] in indexed]
    return (ids, None) if ids else ([], "card has no image in the index")


# ---------- Report helpers ----------


def thumbnail_data_url(image, height=240):
    """A small JPEG copy of an image, embedded straight into the HTML."""
    image = image.convert("RGB")
    image.thumbnail((height * 2, height))
    buffer = io.BytesIO()
    image.save(buffer, format="JPEG", quality=80)
    return "data:image/jpeg;base64," + base64.b64encode(buffer.getvalue()).decode()


def card_thumbnail(card_id, cache={}):
    if card_id not in cache:
        path = image_path_for(card_id)
        if path.exists():
            with Image.open(path) as image:
                cache[card_id] = thumbnail_data_url(image)
        else:
            cache[card_id] = None
    return cache[card_id]


def card_label(card_id, cards):
    return f"{cards.get(card_id, {}).get('name', '?')} ({card_id})"


def shorten(text, width):
    return text if len(text) <= width else text[: width - 3] + "..."


def write_report(results, cards, summary_lines, path):
    style = """
      :root { --bg: #fff; --fg: #1a1a1a; --muted: #666; --line: #ddd; --good: #1a9e4b; --bad: #d23c3c; }
      @media (prefers-color-scheme: dark) {
        :root { --bg: #121212; --fg: #eee; --muted: #999; --line: #333; --good: #3ccf73; --bad: #ff6b6b; }
      }
      body { background: var(--bg); color: var(--fg); font: 14px system-ui, sans-serif; margin: 24px; }
      .row { border-top: 1px solid var(--line); padding: 16px 0; display: flex; gap: 16px; flex-wrap: wrap; }
      figure { margin: 0; text-align: center; max-width: 200px; }
      figure img { height: 200px; border-radius: 6px; border: 4px solid transparent; }
      figure.good img { border-color: var(--good); }
      figure.bad img { border-color: var(--bad); }
      figcaption { color: var(--muted); font-size: 12px; margin-top: 4px; }
      .mode { display: flex; gap: 8px; align-items: flex-start; }
      .mode h3 { writing-mode: vertical-rl; transform: rotate(180deg); margin: 0; font-size: 12px; color: var(--muted); }
      .nocard { height: 200px; width: 140px; display: flex; align-items: center; justify-content: center;
                border: 2px dashed var(--line); border-radius: 6px; color: var(--muted); }
      pre { font-size: 14px; }
    """

    def figure(src, caption, css=""):
        image = f'<img src="{src}" alt="">' if src else '<div class="nocard">no image</div>'
        return f'<figure class="{css}">{image}<figcaption>{html.escape(caption)}</figcaption></figure>'

    parts = [f"<!doctype html><meta charset='utf-8'><title>Scanner evaluation</title><style>{style}</style>"]
    parts.append("<h1>Scanner evaluation</h1><pre>" + html.escape("\n".join(summary_lines)) + "</pre>")
    parts.append("<p>Green border = correct card, red = wrong.</p>")
    for result in results:
        parts.append('<div class="row">')
        parts.append(figure(result["photo_thumb"], f"{result['photo']} — should be {result['expected_label']}"))
        if result["found"]:
            parts.append(figure(result["crop_thumb"], "cropped"))
        else:
            parts.append('<figure><div class="nocard">no card found</div><figcaption>cropped</figcaption></figure>')
        for mode in MODES:
            parts.append(f'<div class="mode"><h3>{mode}</h3>')
            for card_id, score in result["matches"][mode][:REPORT_TOP]:
                css = "good" if card_id in result["expected"] else "bad"
                parts.append(figure(card_thumbnail(card_id), f"{card_label(card_id, cards)} {score:.3f}", css))
            parts.append("</div>")
        parts.append("</div>")

    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(parts), encoding="utf-8")


# ---------- Main ----------


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--labels", type=Path, default=PHOTOS_DIR / "labels.csv", help="the labels CSV file")
    parser.add_argument("--report", type=Path, default=REPORT_FILE, help="where to save the HTML report")
    args = parser.parse_args()
    # Some card names have symbols (like ☆) that Windows can't always print;
    # show a "?" for those instead of crashing.
    sys.stdout.reconfigure(errors="replace")

    if not args.labels.exists():
        raise SystemExit(f"No labels file at {args.labels} — see test_photos/README.md.")
    with open(args.labels, newline="", encoding="utf-8-sig") as file:
        rows = [row for row in csv.DictReader(file) if (row.get("photo") or "").strip()]

    embeddings, card_ids, cards = load_index()
    indexed = set(card_ids)
    set_sizes = load_set_sizes()
    model = load_model()
    photos_dir = args.labels.parent

    results, skipped = [], []
    for row in rows:
        photo_name = row["photo"].strip()
        expected, problem = resolve_label(row, cards, set_sizes, indexed)
        if problem:
            skipped.append((photo_name, problem))
            continue
        try:
            photo = open_photo(photos_dir / photo_name)
        except OSError as error:
            skipped.append((photo_name, f"couldn't open photo ({error})"))
            continue

        cropped, found = crop_card(photo)
        query_cropped, query_whole = embed(model, [cropped, photo])
        matches = {
            "with crop": top_matches(embeddings, card_ids, query_cropped, TOP_K),
            "without crop": top_matches(embeddings, card_ids, query_whole, TOP_K),
        }
        extra = f" +{len(expected) - 1} more" if len(expected) > 1 else ""
        results.append({
            "photo": photo_name,
            "expected": set(expected),
            "expected_label": card_label(expected[0], cards) + extra,
            "found": found,
            "matches": matches,
            "photo_thumb": thumbnail_data_url(photo),
            "crop_thumb": thumbnail_data_url(cropped) if found else None,
        })
        print(f"  matched {photo_name}")

    summary = []
    for mode in MODES:
        print(f"\n=== {mode.upper()} ===")
        print(f"{'photo':<22} {'correct card':<32} {'top-1 match':<32} {'#1?':<4} {'top5?':<5} score")
        top1 = top5 = 0
        for result in results:
            matches = result["matches"][mode]
            ids = [card_id for card_id, _ in matches]
            is_top1 = ids[0] in result["expected"]
            is_top5 = bool(result["expected"] & set(ids))
            top1 += is_top1
            top5 += is_top5
            print(
                f"{shorten(result['photo'], 22):<22} {shorten(result['expected_label'], 32):<32} "
                f"{shorten(card_label(ids[0], cards), 32):<32} {'yes' if is_top1 else 'no':<4} "
                f"{'yes' if is_top5 else 'no':<5} {matches[0][1]:.3f}"
            )
        total = len(results)
        if total:
            summary.append(
                f"{mode.capitalize():<13} top-1 {top1}/{total} ({top1 / total:.0%})   "
                f"top-5 {top5}/{total} ({top5 / total:.0%})"
            )

    if results:
        crops_found = sum(result["found"] for result in results)
        summary.append(f"Card outline found in {crops_found}/{len(results)} photos")
    if skipped:
        summary.append(f"Skipped {len(skipped)} photo(s):")
        summary += [f"  {photo}: {problem}" for photo, problem in skipped]

    print("\n" + "\n".join(summary or ["No photos to evaluate."]))
    if results:
        write_report(results, cards, summary, args.report)
        print(f"\nReport saved to {args.report}")


if __name__ == "__main__":
    main()
