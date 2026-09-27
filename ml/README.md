# ml

Python pipeline for the card scanner's recognition model: collecting card images from the
TCG data API, generating card fingerprints/embeddings, training and evaluating a
recognition model, and exporting it to mobile-friendly formats (TFLite / Core ML / ONNX)
and a web format (ONNX Runtime Web / TensorFlow.js).

- `data/` — card image datasets pulled from the Pokémon TCG data API, plus any processed
  versions used for training.
- `scripts/` — standalone scripts for data collection, preprocessing, training, and
  export, meant to be run from the command line.
- `notebooks/` — exploratory notebooks for data exploration, model experimentation, and
  visualization.
- `models/` — trained model checkpoints/artifacts (not exported yet — see `export/`).
- `export/` — exported model artifacts split by target platform, ready to be bundled by
  `apps/app`.
- `evaluation/` — evaluation scripts/reports measuring recognition accuracy, confusion
  cases, latency, and export-format parity.
- `tests/` — tests for the data/scripts/export pipeline code.

Nothing here is implemented yet — see each subfolder's contents/README for what belongs
there.
