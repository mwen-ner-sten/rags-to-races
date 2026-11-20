"""Review sheets: every sprite at full size and at the size the game draws it.

    python scripts/art/contact_sheet.py            # writes docs/art/review/<category>.png
    python scripts/art/contact_sheet.py parts

Look at these before shipping art: siblings side by side on the panel colour,
at in-game size, is where an odd one out shows.
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
from spec import CATEGORIES, ROOT, SPRITES  # noqa: E402

OUT = ROOT / "docs" / "art" / "review"
PANEL = (5, 6, 13)
WELL = (7, 18, 27)
LINE = (20, 58, 74)
INK = (163, 195, 207)
# The size the game draws each category at (smallest common use).
IN_GAME = {"parts": (40, 40), "vehicles": (120, 80), "rally": (40, 30), "venues": (120, 64),
           "places": (96, 64), "organizations": (320, 180), "stages": (576, 240)}


def fit(image: Image.Image, box: tuple[int, int]) -> Image.Image:
    ratio = min(box[0] / image.width, box[1] / image.height)
    return image.resize((max(1, round(image.width * ratio)), max(1, round(image.height * ratio))), Image.LANCZOS)


def sheet(category: str) -> Path | None:
    files = sorted((SPRITES / category).glob("*.webp"))
    if not files:
        return None
    full = CATEGORIES[category].size
    preview = fit(Image.new("RGB", full), (min(full[0], 300), min(full[1], 220))).size
    small = IN_GAME[category]
    cell = (preview[0] + small[0] + 50, max(preview[1], small[1]) + 40)
    cols = max(1, min(len(files), 1500 // cell[0]))
    rows = (len(files) + cols - 1) // cols
    out = Image.new("RGB", (cols * cell[0] + 20, rows * cell[1] + 50), PANEL)
    draw = ImageDraw.Draw(out)
    draw.text((10, 10), f"{category}: {len(files)} sprites, full size and in game at {small[0]}x{small[1]}", fill=INK)
    for i, path in enumerate(files):
        x, y = 10 + (i % cols) * cell[0], 40 + (i // cols) * cell[1]
        image = Image.open(path).convert("RGBA")
        for (bx, by), size in (((x, y + 16), preview), ((x + preview[0] + 20, y + 16), small)):
            draw.rectangle((bx - 1, by - 1, bx + size[0], by + size[1]), fill=WELL, outline=LINE)
            tile = fit(image, size)
            out.paste(tile, (bx + (size[0] - tile.width) // 2, by + (size[1] - tile.height) // 2), tile)
        draw.text((x, y), path.stem, fill=INK)
    OUT.mkdir(parents=True, exist_ok=True)
    target = OUT / f"{category}.png"
    out.save(target)
    return target


if __name__ == "__main__":
    for name in sys.argv[1:] or list(CATEGORIES):
        written = sheet(name)
        if written:
            print(f"[sheet] {written.relative_to(ROOT)}")
