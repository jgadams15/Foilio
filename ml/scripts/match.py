"""Find the cards that look most like a photo.

    python scripts/match.py path/to/photo.jpg
    python scripts/match.py photo.heic --save-crop seen.jpg   # see what the model saw
    python scripts/match.py photo.jpg --no-crop               # use the whole photo

The card is cropped out of the photo automatically first (see crop.py).
Prints the top 5 matches with a similarity score (1.0 = identical image).
"""

import argparse
import sys

from common import embed, load_index, load_model, open_photo, top_matches
from crop import crop_card

TOP_K = 5


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("photo", help="path to a photo of a card (.jpg, .png, .heic)")
    parser.add_argument("--no-crop", action="store_true", help="match the whole photo without cropping")
    parser.add_argument("--save-crop", metavar="PATH", help="save the image the model sees, e.g. seen.jpg")
    args = parser.parse_args()
    # Some card names have symbols (like ☆) that Windows can't always print;
    # show a "?" for those instead of crashing.
    sys.stdout.reconfigure(errors="replace")

    embeddings, card_ids, cards = load_index()

    try:
        photo = open_photo(args.photo)
    except OSError as error:
        raise SystemExit(f"Couldn't open {args.photo}: {error}")

    if args.no_crop:
        print("Cropping off: matching the whole photo.")
    else:
        photo, found = crop_card(photo)
        print("Found the card and cropped it." if found else "No card outline found: matching the whole photo.")
    if args.save_crop:
        photo.save(args.save_crop)
        print(f"Saved what the model saw to {args.save_crop}")

    query = embed(load_model(), [photo])[0]

    print(f"Top {TOP_K} matches for {args.photo}:")
    for rank, (card_id, score) in enumerate(top_matches(embeddings, card_ids, query, TOP_K), start=1):
        name = cards.get(card_id, {}).get("name", "?")
        print(f"  {rank}. {card_id:<16} {name:<30} {score:.3f}")


if __name__ == "__main__":
    main()
