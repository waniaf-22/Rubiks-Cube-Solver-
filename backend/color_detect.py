"""
color_detect.py
───────────────
RGB Euclidean-distance colour classifier for Rubik's Cube stickers.
Matches any (r, g, b) triple to the nearest of the 6 standard cube colours.
"""

import math

# Standard cube face colours  (letter → RGB)
COLOUR_REFS: dict[str, tuple[int, int, int]] = {
    "W": (240, 240, 240),   # White
    "R": (239,  68,  68),   # Red
    "B": ( 59, 130, 246),   # Blue
    "O": (249, 115,  22),   # Orange
    "G": ( 34, 197,  94),   # Green
    "Y": (234, 179,   8),   # Yellow
}

# Human-readable names
COLOUR_NAMES: dict[str, str] = {
    "W": "White",
    "R": "Red",
    "B": "Blue",
    "O": "Orange",
    "G": "Green",
    "Y": "Yellow",
}


def classify_colour(r: float, g: float, b: float) -> str:
    """Return the colour key ('W','R','B','O','G','Y') closest to (r,g,b)."""
    best_key = "W"
    best_dist = float("inf")
    for key, (cr, cg, cb) in COLOUR_REFS.items():
        dist = math.sqrt((r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2)
        if dist < best_dist:
            best_dist = dist
            best_key = key
    return best_key


def classify_pixels(pixels: list[tuple[int, int, int]]) -> str:
    """Average a list of (r,g,b) tuples and classify the result."""
    if not pixels:
        return "W"
    n = len(pixels)
    avg_r = sum(p[0] for p in pixels) / n
    avg_g = sum(p[1] for p in pixels) / n
    avg_b = sum(p[2] for p in pixels) / n
    return classify_colour(avg_r, avg_g, avg_b)


def detect_face_from_image(image_bytes: bytes) -> list[str]:
    """
    Given raw image bytes (JPEG/PNG), sample a 3×3 grid from the centre
    region and return 9 colour codes (row-major order).

    Requires Pillow: pip install Pillow
    """
    from PIL import Image
    import io

    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    w, h = img.size

    # Centre crop  ─ use 33 % of the smaller dimension
    size = min(w, h) * 0.33
    cx, cy = w / 2, h / 2
    step = size / 3
    patch = 10          # half-size of sampling patch (pixels)

    colours: list[str] = []
    for row in range(3):
        for col in range(3):
            px = cx - size / 2 + col * step + step / 2
            py = cy - size / 2 + row * step + step / 2
            x0 = max(0, int(px - patch))
            y0 = max(0, int(py - patch))
            x1 = min(w, int(px + patch))
            y1 = min(h, int(py + patch))
            region = img.crop((x0, y0, x1, y1))
            pixels = list(region.getdata())           # list of (r,g,b)
            colours.append(classify_pixels(pixels))   # type: ignore[arg-type]

    return colours
