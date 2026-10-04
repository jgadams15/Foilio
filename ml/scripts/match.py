"""Find the cards that look most like a photo.

    python scripts/match.py path/to/photo.jpg

Prints the top 5 matches with a similarity score (1.0 = identical image).
For best results, crop the photo to just the card.
"""

import argparse
import json

import numpy as np
from PIL import Image

from common import CARD_IDS_FILE, CARDS_FILE, EMBEDDINGS_FILE, embed, load_model

TOP_K = 5


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("photo", help="path to a photo of a card")
    args = parser.parse_args()

    if not EMBEDDINGS_FILE.exists():
        raise SystemExit("No index found — run scripts/build_index.py first.")
    embeddings = np.load(EMBEDDINGS_FILE)
    card_ids = json.loads(CARD_IDS_FILE.read_text(encoding="utf-8"))
    names = {card["id"]: card["name"] for card in json.loads(CARDS_FILE.read_text(encoding="utf-8"))}

    try:
        with Image.open(args.photo) as image:
            photo = image.convert("RGB")
    except OSError as error:
        raise SystemExit(f"Couldn't open {args.photo}: {error}")

    query = embed(load_model(), [photo])[0]

    # Nearest-neighbor search: compare the photo with every card at once.
    # All rows have length 1, so a dot product is the cosine similarity.
    scores = embeddings @ query
    best = np.argsort(-scores)[:TOP_K]

    print(f"Top {TOP_K} matches for {args.photo}:")
    for rank, row in enumerate(best, start=1):
        card_id = card_ids[row]
        print(f"  {rank}. {card_id:<16} {names.get(card_id, '?'):<30} {scores[row]:.3f}")


if __name__ == "__main__":
    main()
