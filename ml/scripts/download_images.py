"""Download every English Pokémon card image from TCGdex.

    python scripts/download_images.py            # everything (~22k images)
    python scripts/download_images.py --limit 50 # just the first 50, for a quick test

Saves the card list to data/cards.json and each image to data/images/<card id>.webp.
Safe to stop (Ctrl+C) and re-run: images already on disk are skipped.
"""

import argparse
import json
import time

import requests
from tqdm import tqdm

from common import CARDS_FILE, IMAGES_DIR, TCGDEX_CARDS_URL, image_path_for

PAUSE_SECONDS = 0.1  # be polite to the free TCGdex servers
TIMEOUT_SECONDS = 30


def fetch_card_list(session):
    print(f"Fetching card list from {TCGDEX_CARDS_URL} ...")
    response = session.get(TCGDEX_CARDS_URL, timeout=TIMEOUT_SECONDS)
    response.raise_for_status()
    cards = response.json()
    CARDS_FILE.parent.mkdir(parents=True, exist_ok=True)
    CARDS_FILE.write_text(json.dumps(cards, ensure_ascii=False), encoding="utf-8")
    print(f"Found {len(cards)} cards (saved list to {CARDS_FILE}).")
    return cards


def download(session, url, path):
    response = session.get(url, timeout=TIMEOUT_SECONDS)
    response.raise_for_status()
    # Write to a temporary name first, so a half-finished download (e.g. if
    # you press Ctrl+C) is never mistaken for a complete image on the next run.
    partial = path.with_suffix(".part")
    partial.write_bytes(response.content)
    partial.replace(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--limit", type=int, help="only process the first N cards (for testing)")
    args = parser.parse_args()

    session = requests.Session()
    cards = fetch_card_list(session)
    if args.limit:
        cards = cards[: args.limit]

    IMAGES_DIR.mkdir(parents=True, exist_ok=True)
    downloaded = already_had = no_image = failed = 0

    for card in tqdm(cards, desc="Downloading", unit="card"):
        if not card.get("image"):
            no_image += 1
            continue
        path = image_path_for(card["id"])
        if path.exists():
            already_had += 1
            continue
        try:
            download(session, card["image"] + "/low.webp", path)
            downloaded += 1
        except requests.RequestException as error:
            failed += 1
            tqdm.write(f"  failed {card['id']}: {error}")
        time.sleep(PAUSE_SECONDS)

    print()
    print(f"Downloaded:            {downloaded}")
    print(f"Skipped (already had): {already_had}")
    print(f"Skipped (no image):    {no_image}")
    print(f"Failed:                {failed}")
    if failed:
        print("Re-run the script to retry the failed ones.")


if __name__ == "__main__":
    main()
