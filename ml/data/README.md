# ml/data

Card image datasets used to train and evaluate the recognition model.

- `raw/` — unmodified card images downloaded from the Pokémon TCG data API (or TCGdex),
  organized by set/card ID.
- `processed/` — preprocessed/augmented versions of the raw images (resized, normalized,
  augmented) ready for training or embedding generation.

Dataset files themselves are gitignored; only this structure and its READMEs are tracked.
