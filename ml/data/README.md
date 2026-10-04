# ml/data

Card data for the scanner. Everything here is gitignored and rebuilt by `ml/scripts`;
only this README and the folder structure are tracked.

- `cards.json` — the full English card list from TCGdex (id, name, image URL), saved by
  `download_images.py`.
- `images/` — one small image per card, `<card id>.webp` (ids with characters Windows
  can't use in file names are percent-encoded, e.g. `exu-%21.webp`).
- `index/` — written by `build_index.py`: `embeddings.npy` (one row per card),
  `card_ids.json` (which card each row is), and `info.json` (model settings used).
- `raw/`, `processed/` — reserved for training data, if we ever fine-tune a model.
