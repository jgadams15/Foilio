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

**Known limits / next steps:**
- Photos with a lot of background or glare match worse than a clean crop. The scanner's
  card-outline guide (phase 1) helps, and automatic card cropping is a likely next step.
- Near-identical printings (e.g. the same art reprinted in another set, or
  normal vs. reverse holo) may come out as close ties. The app should show the top few
  matches for the user to confirm. Finish is asked separately, see
  [scanner-finish](scanner-finish.md).
- Right now this runs in Python on a computer. Getting it onto the phone (exporting the
  model, shipping the index) is a later phase.
