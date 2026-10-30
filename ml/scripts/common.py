"""Shared paths and helpers for the scanner scripts.

Every script imports from here so they all agree on where files live and how
images are turned into embeddings.
"""

import json
from pathlib import Path
from urllib.parse import quote

ML_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = ML_DIR / "data"
IMAGES_DIR = DATA_DIR / "images"
CARDS_FILE = DATA_DIR / "cards.json"  # card list from TCGdex (id, name, image URL)
SETS_FILE = DATA_DIR / "sets.json"  # set list from TCGdex (id, name, card count)
INDEX_DIR = DATA_DIR / "index"
EMBEDDINGS_FILE = INDEX_DIR / "embeddings.npy"  # one row of numbers per card
CARD_IDS_FILE = INDEX_DIR / "card_ids.json"  # row N above belongs to card_ids[N]
INDEX_INFO_FILE = INDEX_DIR / "info.json"  # which model/settings built the index
MODEL_CACHE_DIR = ML_DIR / "models"  # downloaded model weights (gitignored)

TCGDEX_CARDS_URL = "https://api.tcgdex.net/v2/en/cards"
TCGDEX_SETS_URL = "https://api.tcgdex.net/v2/en/sets"

# DINOv2 "small": ~22M parameters, fast enough on a normal laptop CPU.
MODEL_NAME = "facebook/dinov2-small"

# Pokémon cards are 63 x 88 mm. We resize every image to this portrait size
# (both multiples of 14, DINOv2's patch size) so the whole card is seen —
# the model's default square crop would cut off the name and attacks.
IMAGE_WIDTH = 224
IMAGE_HEIGHT = 308

# Standard ImageNet color normalization that DINOv2 was trained with.
IMAGE_MEAN = (0.485, 0.456, 0.406)
IMAGE_STD = (0.229, 0.224, 0.225)


def image_path_for(card_id: str) -> Path:
    """Where a card's image is saved.

    A couple of card ids contain characters Windows doesn't allow in file
    names (like "?"), so we percent-encode them: "exu-!" -> "exu-%21.webp".
    """
    return IMAGES_DIR / f"{quote(card_id, safe='')}.webp"


def load_model():
    """Download (first run only) and load DINOv2 in inference mode."""
    import torch
    from transformers import AutoModel

    torch.set_grad_enabled(False)  # we only use the model, never train it
    model = AutoModel.from_pretrained(MODEL_NAME, cache_dir=MODEL_CACHE_DIR)
    model.eval()
    return model


def preprocess(image):
    """Turn a PIL image into the tensor DINOv2 expects (3 x H x W)."""
    import numpy as np
    import torch

    image = image.convert("RGB").resize((IMAGE_WIDTH, IMAGE_HEIGHT), resample=3)  # 3 = bicubic
    pixels = np.asarray(image, dtype=np.float32) / 255.0
    pixels = (pixels - IMAGE_MEAN) / IMAGE_STD
    return torch.from_numpy(pixels.transpose(2, 0, 1).astype(np.float32))


def embed(model, images):
    """Turn a list of PIL images into embeddings: one row of 384 numbers each.

    Rows are scaled to length 1, so the similarity of two cards is just the dot
    product of their rows (1.0 = identical, lower = less alike).
    """
    import torch

    batch = torch.stack([preprocess(image) for image in images])
    vectors = model(pixel_values=batch).pooler_output
    vectors = torch.nn.functional.normalize(vectors, dim=1)
    return vectors.numpy()


def open_photo(path):
    """Open a phone photo (.jpg, .png, or iPhone .heic) as an upright RGB image.

    Phones often save photos sideways and store a note (EXIF orientation) saying
    which way to turn them. exif_transpose applies that turn so the card is upright.
    """
    from PIL import Image, ImageOps
    from pillow_heif import register_heif_opener

    register_heif_opener()  # teaches Pillow to read .heic files
    with Image.open(path) as image:
        return ImageOps.exif_transpose(image).convert("RGB")


def load_index():
    """Load the embedding index: (embeddings, card ids, {card id: card info})."""
    import numpy as np

    if not EMBEDDINGS_FILE.exists():
        raise SystemExit("No index found — run scripts/build_index.py first.")
    embeddings = np.load(EMBEDDINGS_FILE)
    card_ids = json.loads(CARD_IDS_FILE.read_text(encoding="utf-8"))
    cards = {card["id"]: card for card in json.loads(CARDS_FILE.read_text(encoding="utf-8"))}
    return embeddings, card_ids, cards


def top_matches(embeddings, card_ids, query, k):
    """Nearest-neighbor search: the k cards most like `query`, as [(card id, score)].

    All rows have length 1, so a dot product is the cosine similarity.
    """
    import numpy as np

    scores = embeddings @ query
    best = np.argsort(-scores)[:k]
    return [(card_ids[row], float(scores[row])) for row in best]
