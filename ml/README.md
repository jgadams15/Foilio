# ml

Python pipeline for the card scanner. It recognizes a card from a photo by cropping the
card out of it and comparing that against an **index** of every card image. See
[docs/decisions/scanner.md](../docs/decisions/scanner.md) for how and why. Phase 3
(current) added the auto-crop and an accuracy test on your own photos.

## Setup (Windows, once)

Needs Python 3.11 or newer (`python --version`). In PowerShell:

```powershell
cd ml
python -m venv .venv                 # create a private Python just for this project
.\.venv\Scripts\Activate.ps1         # turn it on — your prompt now starts with (.venv)
pip install -r requirements.txt      # install the packages (PyTorch is a big download)
```

Already set up from an earlier phase? Run `pip install -r requirements.txt` again to get
the new packages (OpenCV for cropping, pillow-heif for iPhone photos).

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

Example output:

```
Found the card and cropped it.
Top 5 matches for photo.jpg:
  1. A3b-001          Tropius                        0.867
  2. A2a-001          Heracross                      0.493
  ...
```

### Matching options

`match.py` works with `.jpg`, `.png` and iPhone `.heic` photos. It turns sideways phone
photos upright, then **crops the card out automatically**: it finds the card's outline,
straightens it, and matches only the card, not the table around it.

```powershell
python scripts/match.py photo.heic --save-crop seen.jpg   # also save exactly what the model saw
python scripts/match.py photo.jpg --no-crop               # skip cropping, match the whole photo
python scripts/crop.py photo.jpg cropped.jpg              # just crop, no matching
```

If it prints `No card outline found`, it matched the whole photo instead. A darker
background, or the card filling more of the photo, usually fixes that.

## Test accuracy on your own photos

1. Put card photos in `test_photos/` and list them in `test_photos/labels.csv`. Step by
   step instructions are in [test_photos/README.md](test_photos/README.md).
2. Run (from `ml/`, venv active):

   ```powershell
   python scripts/evaluate.py
   ```

It matches every photo twice, once with cropping and once without, and prints a table
for each:

```
=== WITH CROP ===
photo                  correct card                     top-1 match                      #1?  top5? score
pikachu.jpg            Pikachu (sv03.5-025)             Pikachu (sv03.5-025)             yes  yes   0.924
...
With crop     top-1 5/6 (83%)   top-5 5/6 (83%)
Without crop  top-1 4/6 (67%)   top-5 4/6 (67%)
```

- **top-1** = the right card was the #1 match. **top-5** = it was somewhere in the top 5,
  which matters because the app will show a few matches for you to pick from.
- **score** = how similar the #1 match looked (1.0 = identical).
- Then open the visual report to see what went wrong: `start evaluation\reports\report.html`.
  Each photo is shown next to its crop and the top 3 matches with and without
  cropping. Green border = right card, red = wrong.
- Photos whose label couldn't be matched to a card are listed as skipped, with the reason.

## What's where

- `scripts/` — the pipeline: `download_images.py` → `build_index.py` → `match.py`, plus
  `crop.py` (finds and straightens the card), `evaluate.py` (accuracy test), and
  `common.py` (shared paths, photo loading, and the model code).
- `data/` — `cards.json`, `sets.json`, `images/`, and `index/` (all gitignored; rebuild
  with the scripts above).
- `test_photos/` — your own photos and `labels.csv` for `evaluate.py` (gitignored except
  the README and example).
- `evaluation/reports/` — the HTML report from `evaluate.py` (gitignored).
- `models/` — downloaded pretrained model weights (gitignored).
- `notebooks/`, `export/`, `tests/` — not used yet; see each README.
