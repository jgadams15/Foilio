# ml

Python pipeline for the card scanner. Phase 2 (current) recognizes a card from a photo
by comparing it against an **index** of every card image — see
[docs/decisions/scanner.md](../docs/decisions/scanner.md) for how and why.

## Setup (Windows, once)

Needs Python 3.11 or newer (`python --version`). In PowerShell:

```powershell
cd ml
python -m venv .venv                 # create a private Python just for this project
.\.venv\Scripts\Activate.ps1         # turn it on — your prompt now starts with (.venv)
pip install -r requirements.txt      # install the packages (PyTorch is a big download)
```

If PowerShell says running scripts is disabled, run this once and try again:
`Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

Each new terminal: `cd ml` then `.\.venv\Scripts\Activate.ps1` before running anything.

## Run

From `ml/`, with the venv active:

```powershell
python scripts/download_images.py        # ~22k card images, about an hour
python scripts/build_index.py            # one embedding per card, ~40 min on a laptop CPU
python scripts/match.py C:\path\to\photo.jpg
```

- Both long steps show a progress bar and can be stopped with Ctrl+C and re-run to pick
  up where they left off. Re-run them later to add newly released cards.
- `download_images.py --limit 50` grabs just 50 cards for a quick end-to-end test.
- For `match.py`, a photo cropped to just the card works best.

Example output:

```
Top 5 matches for photo.jpg:
  1. A3b-001          Tropius                        0.867
  2. A2a-001          Heracross                      0.493
  ...
```

## What's where

- `scripts/` — the pipeline: `download_images.py` → `build_index.py` → `match.py`, plus
  `common.py` (shared paths and the model code).
- `data/` — `cards.json`, `images/`, and `index/` (all gitignored; rebuild with the
  scripts above).
- `models/` — downloaded pretrained model weights (gitignored).
- `notebooks/`, `evaluation/`, `export/`, `tests/` — not used yet; see each README.
