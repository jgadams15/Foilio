"""Find the card in a phone photo and straighten it.

    from crop import crop_card
    card, found = crop_card(photo)   # photo is a PIL image

Steps: find edges in the photo, trace them into outlines, and keep the biggest
outline with 4 corners that is roughly card-shaped. Then a perspective warp
"un-tilts" those 4 corners into a flat, straight-on 63 x 88 card. If no card is
found, the original photo comes back with found=False.

Can also be run on its own to check a crop:

    python scripts/crop.py photo.jpg cropped.jpg
"""

import argparse

import cv2
import numpy as np
from PIL import Image

# Pokémon cards are 63 x 88 mm. The straightened card is saved at this size.
CARD_WIDTH = 630
CARD_HEIGHT = 880

# Edges are found on a shrunken copy of the photo: faster, and it ignores tiny
# details like the card's text that would otherwise look like edges.
DETECT_SIZE = 800

# A real card should fill at least this much of the photo...
MIN_AREA_FRACTION = 0.10
# ...but an outline running along the photo's own edges is the photo frame
# (or a blur of background), not a card. This is how close counts as "along".
EDGE_MARGIN_FRACTION = 0.01
# ...and its short side / long side should be close to 63 / 88 = 0.72.
# The range is wide because a tilted photo stretches the shape.
MIN_ASPECT = 0.55
MAX_ASPECT = 0.90


def crop_card(photo: Image.Image) -> tuple[Image.Image, bool]:
    """Return (straightened card, True), or (the original photo, False) if no card is found."""
    pixels = np.asarray(photo.convert("RGB"))
    scale = DETECT_SIZE / max(pixels.shape[:2])
    small = cv2.resize(pixels, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA) if scale < 1 else pixels
    scale = min(scale, 1.0)

    corners = _find_card_corners(small)
    if corners is None:
        return photo, False
    return Image.fromarray(_warp(pixels, corners / scale)), True


def _find_card_corners(pixels):
    """The 4 corners of the most likely card outline, or None."""
    pixels = cv2.GaussianBlur(pixels, (5, 5), 0)

    # Try a few edge maps, from strict to loose. Loose ones help when the card
    # barely stands out (a white card on a light table, or a shiny sleeve).
    # Small gap-closing first: closing big gaps can also glue a busy background
    # onto the card.
    for strength in (0.33, 0.66):
        for gap in (3, 7):
            corners = _best_quad(_edges(pixels, strength, gap))
            if corners is not None:
                return corners
    return None


def _edges(pixels, strength, gap):
    """A black-and-white map of the edges in the photo.

    Edges are found in the red, green and blue channels separately and then
    combined, so a card border counts even when it differs from the background
    only in color, not in brightness.
    """
    combined = None
    for channel in cv2.split(pixels):
        median = float(np.median(channel))
        low = int(max(0, (1 - strength) * median))
        high = int(min(255, (1 + strength) * median))
        edges = cv2.Canny(channel, low, high)
        combined = edges if combined is None else cv2.bitwise_or(combined, edges)
    # "Close" small gaps in the card's border so it becomes one connected outline.
    return cv2.morphologyEx(combined, cv2.MORPH_CLOSE, np.ones((gap, gap), np.uint8), iterations=2)


def _best_quad(edges):
    """Largest outline in an edge map that simplifies to a card-shaped 4-sided shape."""
    height, width = edges.shape
    min_area = MIN_AREA_FRACTION * height * width
    margin = EDGE_MARGIN_FRACTION * max(height, width)
    # RETR_LIST gives outlines inside other outlines too, so a card can still be
    # found when the edges around it join up with the background's.
    contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    # The hull is the outline with all dents filled in, like a rubber band
    # stretched around it. That's what we measure, so a card border with a small
    # gap still counts at full size.
    hulls = sorted((cv2.convexHull(contour) for contour in contours), key=cv2.contourArea, reverse=True)
    for hull in hulls:
        if cv2.contourArea(hull) < min_area:
            break  # sorted biggest first, so the rest are too small too
        # Simplify the outline step by step until it has 4 corners. Cards have
        # rounded corners, so a little simplification is needed first.
        perimeter = cv2.arcLength(hull, True)
        for tolerance in (0.02, 0.03, 0.05):
            quad = cv2.approxPolyDP(hull, tolerance * perimeter, True)
            if len(quad) == 4:
                corners = _order_corners(quad.reshape(4, 2).astype(np.float32))
                x, y = corners[:, 0], corners[:, 1]
                hugs_frame = (x.min() < margin and y.min() < margin
                              and x.max() > width - margin and y.max() > height - margin)
                if not hugs_frame and MIN_ASPECT <= _aspect(corners) <= MAX_ASPECT:
                    return corners
                break
    return None


def _order_corners(points):
    """Sort 4 points as top-left, top-right, bottom-right, bottom-left."""
    sums = points.sum(axis=1)  # x + y: smallest at top-left, largest at bottom-right
    diffs = points[:, 1] - points[:, 0]  # y - x: smallest at top-right, largest at bottom-left
    return np.array(
        [points[np.argmin(sums)], points[np.argmin(diffs)], points[np.argmax(sums)], points[np.argmax(diffs)]],
        dtype=np.float32,
    )


def _side_lengths(corners):
    """(width, height) of the shape, averaging opposite sides."""
    top_left, top_right, bottom_right, bottom_left = corners
    width = (np.linalg.norm(top_right - top_left) + np.linalg.norm(bottom_right - bottom_left)) / 2
    height = (np.linalg.norm(bottom_left - top_left) + np.linalg.norm(bottom_right - top_right)) / 2
    return width, height


def _aspect(corners):
    width, height = _side_lengths(corners)
    return min(width, height) / max(width, height)


def _warp(pixels, corners):
    """Perspective warp: stretch the 4 corners out into a flat, upright card."""
    width, height = _side_lengths(corners)
    landscape = width > height  # card lying on its side in the photo
    out_w, out_h = (CARD_HEIGHT, CARD_WIDTH) if landscape else (CARD_WIDTH, CARD_HEIGHT)
    target = np.array([[0, 0], [out_w - 1, 0], [out_w - 1, out_h - 1], [0, out_h - 1]], dtype=np.float32)
    matrix = cv2.getPerspectiveTransform(corners.astype(np.float32), target)
    card = cv2.warpPerspective(pixels, matrix, (out_w, out_h), flags=cv2.INTER_CUBIC)
    if landscape:
        # We can't tell which way the card was turned, so we pick one. If it ends
        # up upside down, the match will be worse — see docs/decisions/scanner.md.
        card = cv2.rotate(card, cv2.ROTATE_90_CLOCKWISE)
    return card


def main():
    from common import open_photo

    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("photo", help="path to a photo of a card (.jpg, .png, .heic)")
    parser.add_argument("output", help="where to save the cropped card, e.g. cropped.jpg")
    args = parser.parse_args()

    card, found = crop_card(open_photo(args.photo))
    card.save(args.output)
    print(f"Saved {'cropped card' if found else 'original photo (no card found)'} to {args.output}")


if __name__ == "__main__":
    main()
