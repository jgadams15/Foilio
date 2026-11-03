# Scanner: recognizing cards with embeddings

**Decided:** The scanner recognizes a card by **image search**, not by training a
classifier. A free pretrained model, **DINOv2-small** (by Meta, Apache 2.0 license),
turns each card image into an **embedding**: a list of 384 numbers that acts like a
fingerprint for how the card looks. We build an **index** with one fingerprint per
card (~22k cards). To recognize a photo, we fingerprint it the same way and find the
cards whose fingerprints are closest (**nearest-neighbor search**). The closest one is
the match.

**Why this approach:**
- **No training needed.** The model already "knows how to look" from being trained on
  millions of images. We only use it, never teach it, so it runs fine on a normal CPU.
- **New sets are easy.** When a set comes out, download its images and re-run
  `build_index.py`. Nothing needs retraining, because the new cards just get added to
  the index.
- **Free.** The images come from TCGdex, and the model and libraries are free and open
  source. See [free-only](free-only.md).

**Why DINOv2 rather than CLIP:** CLIP was trained to connect images with captions, so
it groups things by *meaning*. Every Pikachu card looks "similar" to it. DINOv2 was
trained on images alone and pays attention to *visual detail* (artwork, layout, text
placement). That's what tells two Pikachu cards from different sets apart. The small
version is ~90 MB and embeds about 9 cards a second on a laptop CPU.

**How it works in practice:**
- We resize the whole card to 224 × 308 instead of the model's default square crop,
  which would cut off the card's name and attacks.
- Fingerprints are scaled to length 1, so "how similar" is a single multiplication
  (cosine similarity, 1.0 = identical). Comparing a photo against all ~22k cards
  this way takes milliseconds, so we don't need a special search library yet.

## Cropping the card out of the photo

**Decided:** Before matching, the card is found in the photo and straightened with
classic image processing (**OpenCV**, free and CPU-only), not with another ML model.
The index was built from clean, straight-on card images. A phone photo has a table
around the card and is taken at an angle, and both make the fingerprint less alike.

How `ml/scripts/crop.py` does it:
1. **Upright first.** Phones often save photos sideways plus a note (EXIF orientation)
   saying how to turn them. We apply that before anything else.
2. **Find edges** on a shrunken copy of the photo. We do it in each color channel
   separately, so a card counts even when it differs from the table only in color.
3. **Trace outlines** and, from biggest to smallest, keep the first one that simplifies
   to **4 corners**, fills at least 10% of the photo, has roughly a card's proportions
   (63 × 88), and isn't just the photo's own frame. It tries strict settings first, then
   looser ones for faint edges (light backgrounds, sleeves).
4. **Perspective warp:** stretch those 4 corners into a flat, upright 630 × 880 card,
   like scanning it straight on.
5. **Fallback:** if nothing card-shaped is found, use the whole photo. A match on the
   whole photo is worse but still often right, so it beats failing.

**Why not an ML model for cropping:** a detector would need training data and more
compute, and OpenCV-style edge finding is fast, free, and also available on phones.
We'll revisit only if the accuracy test shows cropping is the bottleneck.

**Measuring it:** `ml/scripts/evaluate.py` runs your own labeled photos through the
matcher with and without cropping and reports **top-1** (right card ranked #1) and
**top-5** (right card in the top 5) accuracy, plus a visual HTML report. Labels use
what's printed on the card (name + `025/165`). The script turns that into TCGdex ids by
matching name and number and using the set size after the `/`. If several cards still
fit, any of them counts as correct. If none fit, the photo is skipped with a reason,
never guessed.

**Known limits / next steps:**
- Very busy backgrounds (patterned cloth, a pile of other cards) can produce a wrong
  crop, which matches *worse* than no crop. The report shows these side by side.
  Photograph cards on a plain surface.
- A card lying sideways is turned upright in one fixed direction. If it was really
  the other way round, the crop comes out upside down and matches worse. Taking the
  photo with the card upright avoids this. Trying both directions is a possible
  improvement.
- In a sleeve or toploader, the crop may follow the plastic's edge instead of the
  card's, which leaves a thin border. It usually still matches.
- Near-identical printings (e.g. the same art reprinted in another set, or
  normal vs. reverse holo) may come out as close ties. The app should show the top few
  matches for the user to confirm. Finish is asked separately, see
  [scanner-finish](scanner-finish.md).
- Right now this runs in Python on a computer. Getting it onto the phone (exporting the
  model, shipping the index) is a later phase.
