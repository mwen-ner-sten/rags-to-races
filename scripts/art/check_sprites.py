"""Pixel checks for the art bible (docs/art/art-bible.md).

    python scripts/art/check_sprites.py          # all sprites, exit 1 on failure
    python scripts/art/check_sprites.py parts    # one category

Checks every WebP under public/sprites against its category in spec.json:
size and alpha, palette (only teal/blue, fuchsia/violet or neutral may be
bright and saturated), overall darkness, and clean edges.
"""
from __future__ import annotations

import colorsys
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from spec import CATEGORIES, SPRITES  # noqa: E402

# Hue band (degrees) a bright saturated pixel may sit in: teal through blue
# and violet (where the teal and fuchsia rims mix) to fuchsia. Warm and green
# hues are off palette.
ALLOWED_HUES = ((165.0, 345.0),)
OFF_PALETTE_LIMIT = 0.02  # share of opaque pixels
# Mean brightness of opaque pixels. Objects allow more because thin subjects
# (tube frames, pipes) are mostly lit edges; scenes must stay night-dark.
MEAN_LUMA_LIMIT = {"object": 0.55, "scene": 0.26}
EDGE = 3  # px checked at each border


def _data(image: Image.Image) -> list:
    flat = getattr(image, "get_flattened_data", None)
    return list(flat() if flat else image.getdata())


def _pixels(image: Image.Image) -> list[tuple[int, int, int, int]]:
    small = image.convert("RGBA")
    small.thumbnail((160, 160))
    return _data(small)


def palette(image: Image.Image) -> tuple[list[str], float]:
    """Off-palette problems and the mean luma of opaque pixels."""
    off = opaque = 0
    luma_total = 0.0
    for r, g, b, a in _pixels(image):
        if a < 128:
            continue
        opaque += 1
        h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
        luma_total += 0.2126 * r / 255 + 0.7152 * g / 255 + 0.0722 * b / 255
        if s > 0.45 and v > 0.35:
            deg = h * 360
            if not any(lo <= deg <= hi for lo, hi in ALLOWED_HUES):
                off += 1
    if not opaque:
        return ["image is empty"], 0.0
    problems = []
    if off / opaque > OFF_PALETTE_LIMIT:
        problems.append(f"{off / opaque:.1%} of pixels are bright off-palette colours (only teal, fuchsia, ice)")
    return problems, luma_total / opaque


def check(path: Path, category: str) -> list[str]:
    spec = CATEGORIES[category]
    image = Image.open(path)
    problems = []
    if image.size != spec.size:
        problems.append(f"size {image.size[0]}x{image.size[1]}, want {spec.size[0]}x{spec.size[1]}")
    found, luma = palette(image)
    problems += found
    if luma > MEAN_LUMA_LIMIT[spec.kind]:
        problems.append(f"too bright for a night scene (mean luma {luma:.2f} > {MEAN_LUMA_LIMIT[spec.kind]})")
    rgba = image.convert("RGBA")
    w, h = rgba.size
    if spec.kind == "object":
        if rgba.mode != "RGBA" or image.mode not in ("RGBA", "LA", "P"):
            problems.append("object sprites need transparency")
        border = [rgba.getpixel((x, y))[3] for x in range(w) for y in (0, h - 1)]
        border += [rgba.getpixel((x, y))[3] for y in range(h) for x in (0, w - 1)]
        if max(border) > 40:
            problems.append("subject touches the edge (no transparent margin)")
    else:
        strips = [rgba.crop((0, 0, EDGE, h)), rgba.crop((w - EDGE, 0, w, h)), rgba.crop((0, 0, w, EDGE)), rgba.crop((0, h - EDGE, w, h))]
        for strip in strips:
            mean = sum(sum(p[:3]) / 3 for p in _data(strip)) / (strip.width * strip.height)
            if mean > 120:
                problems.append("light hairline on an edge")
                break
    return problems


def main(selected: list[str]) -> int:
    failures = 0
    count = 0
    for category in CATEGORIES:
        if selected and category not in selected:
            continue
        for path in sorted((SPRITES / category).glob("*.webp")):
            count += 1
            for problem in check(path, category):
                failures += 1
                print(f"FAIL {path.relative_to(SPRITES.parent.parent)}: {problem}")
    for folder in SPRITES.iterdir():
        if folder.is_dir() and folder.name not in CATEGORIES:
            failures += 1
            print(f"FAIL public/sprites/{folder.name}: not a category in scripts/art/spec.json")
    print(f"checked {count} sprites, {failures} problems")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
