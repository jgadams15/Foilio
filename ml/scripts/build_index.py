"""Turn every downloaded card image into an embedding and save the index.

    python scripts/build_index.py

Run download_images.py first. Writes:
  data/index/embeddings.npy — one row of 384 numbers per card
  data/index/card_ids.json  — card_ids[N] is the card for row N

Progress is saved every few hundred cards, so you can stop (Ctrl+C) and re-run
to continue. Re-running later only embeds images that are new since last time.
"""

import json

import numpy as np
from PIL import Image
from tqdm import tqdm

from common import (
    CARD_IDS_FILE,
    CARDS_FILE,
    EMBEDDINGS_FILE,
    IMAGE_HEIGHT,
    IMAGE_WIDTH,
    INDEX_DIR,
    INDEX_INFO_FILE,
    MODEL_NAME,
    embed,
    image_path_for,
    load_model,
)

BATCH_SIZE = 32  # images per trip through the model
SAVE_EVERY = 512  # images between progress saves

# If any of these change, old embeddings aren't comparable and we start over.
INDEX_INFO = {"model": MODEL_NAME, "width": IMAGE_WIDTH, "height": IMAGE_HEIGHT}


def load_existing_index():
    """Return (embeddings, card_ids) saved by a previous run, or empty ones."""
    if not (EMBEDDINGS_FILE.exists() and CARD_IDS_FILE.exists() and INDEX_INFO_FILE.exists()):
        return None, []
    if json.loads(INDEX_INFO_FILE.read_text()) != INDEX_INFO:
        print("Model or image settings changed since the last run — rebuilding from scratch.")
        return None, []
    return np.load(EMBEDDINGS_FILE), json.loads(CARD_IDS_FILE.read_text(encoding="utf-8"))


def save_index(embeddings, card_ids):
    # Save to temporary files, then swap them in, so stopping mid-save can't
    # leave a broken index behind.
    INDEX_DIR.mkdir(parents=True, exist_ok=True)
    with open(EMBEDDINGS_FILE.with_suffix(".tmp"), "wb") as f:
        np.save(f, embeddings)
    CARD_IDS_FILE.with_suffix(".tmp").write_text(json.dumps(card_ids, ensure_ascii=False), encoding="utf-8")
    EMBEDDINGS_FILE.with_suffix(".tmp").replace(EMBEDDINGS_FILE)
    CARD_IDS_FILE.with_suffix(".tmp").replace(CARD_IDS_FILE)
    INDEX_INFO_FILE.write_text(json.dumps(INDEX_INFO))


def main():
    if not CARDS_FILE.exists():
        raise SystemExit("No card list found — run scripts/download_images.py first.")
    cards = json.loads(CARDS_FILE.read_text(encoding="utf-8"))
    on_disk = [card["id"] for card in cards if image_path_for(card["id"]).exists()]

    embeddings, card_ids = load_existing_index()
    done = set(card_ids)
    todo = [card_id for card_id in on_disk if card_id not in done]
    print(f"{len(on_disk)} images on disk, {len(done)} already in the index, {len(todo)} to embed.")
    if not todo:
        print("Index is up to date.")
        return

    print(f"Loading {MODEL_NAME} (downloads once, ~90 MB) ...")
    model = load_model()

    new_rows, new_ids = [], []
    unsaved = 0
    with tqdm(total=len(todo), desc="Embedding", unit="card") as progress:
        for start in range(0, len(todo), BATCH_SIZE):
            batch_ids, images = [], []
            for card_id in todo[start : start + BATCH_SIZE]:
                try:
                    with Image.open(image_path_for(card_id)) as image:
                        images.append(image.convert("RGB"))
                    batch_ids.append(card_id)
                except OSError as error:
                    tqdm.write(f"  skipping unreadable image {card_id}: {error}")
            if images:
                new_rows.append(embed(model, images))
                new_ids.extend(batch_ids)
                unsaved += len(images)
            progress.update(len(todo[start : start + BATCH_SIZE]))

            is_last = start + BATCH_SIZE >= len(todo)
            if new_rows and (unsaved >= SAVE_EVERY or is_last):
                parts = ([embeddings] if embeddings is not None else []) + new_rows
                embeddings = np.concatenate(parts).astype(np.float32)
                card_ids = card_ids + new_ids
                save_index(embeddings, card_ids)
                new_rows, new_ids, unsaved = [], [], 0

    print(f"Done. Index has {len(card_ids)} cards: {EMBEDDINGS_FILE}")


if __name__ == "__main__":
    main()
