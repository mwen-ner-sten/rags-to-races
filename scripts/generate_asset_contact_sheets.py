"""Generate deterministic multi-scale contact sheets for visual asset review."""

from __future__ import annotations

import argparse
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


BACKGROUND = (13, 17, 23, 255)
PANEL = (19, 25, 34, 255)
TEXT = (225, 232, 240, 255)
MUTED = (132, 148, 166, 255)
CHECK_A = (35, 42, 52, 255)
CHECK_B = (48, 57, 69, 255)


def checkerboard(width: int, height: int, tile: int = 8) -> Image.Image:
    image = Image.new("RGBA", (width, height), CHECK_A)
    draw = ImageDraw.Draw(image)
    for y in range(0, height, tile):
        for x in range(0, width, tile):
            if (x // tile + y // tile) % 2:
                draw.rectangle((x, y, x + tile - 1, y + tile - 1), fill=CHECK_B)
    return image


def item_sheet(files: list[Path], title: str, columns: int = 4) -> Image.Image:
    font = ImageFont.load_default()
    cell_width, cell_height = 300, 122
    header = 42
    rows = math.ceil(len(files) / columns)
    sheet = Image.new("RGBA", (columns * cell_width, header + rows * cell_height), BACKGROUND)
    draw = ImageDraw.Draw(sheet)
    draw.text((14, 14), f"{title} - 64 / 48 / 32 / 24 px", fill=TEXT, font=font)
    sizes = [64, 48, 32, 24]

    for index, path in enumerate(files):
        column, row = index % columns, index // columns
        x, y = column * cell_width, header + row * cell_height
        draw.rounded_rectangle((x + 5, y + 5, x + cell_width - 5, y + cell_height - 5), 8, fill=PANEL)
        draw.text((x + 14, y + 13), path.stem.replace("_", " "), fill=TEXT, font=font)
        source = Image.open(path).convert("RGBA")
        cursor = x + 14
        for size in sizes:
            board = checkerboard(size + 8, 72)
            resized = source.resize((size, size), Image.Resampling.LANCZOS)
            board.alpha_composite(resized, (4, (72 - size) // 2))
            sheet.alpha_composite(board, (cursor, y + 38))
            draw.text((cursor + 2, y + 111), str(size), fill=MUTED, font=font)
            cursor += size + 16
    return sheet


def thumbnail_sheet(files: list[Path], title: str, columns: int = 2) -> Image.Image:
    font = ImageFont.load_default()
    thumb_width, thumb_height = 384, 216
    cell_width, cell_height = 410, 258
    header = 42
    rows = math.ceil(len(files) / columns)
    sheet = Image.new("RGBA", (columns * cell_width, header + rows * cell_height), BACKGROUND)
    draw = ImageDraw.Draw(sheet)
    draw.text((14, 14), f"{title} - 16:9 review thumbnails", fill=TEXT, font=font)
    for index, path in enumerate(files):
        column, row = index % columns, index // columns
        x, y = column * cell_width, header + row * cell_height
        draw.text((x + 13, y + 8), path.stem.replace("_", " "), fill=TEXT, font=font)
        source = Image.open(path).convert("RGBA").resize((thumb_width, thumb_height), Image.Resampling.LANCZOS)
        sheet.alpha_composite(source, (x + 13, y + 28))
    return sheet


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=Path("public/sprites"))
    args = parser.parse_args()
    review = args.root / "review"
    review.mkdir(parents=True, exist_ok=True)
    groups = {
        "parts": args.root / "parts",
        "addons": args.root / "addons",
        "stations": args.root / "stations",
        "rivals": args.root / "rivals",
        "crew-specializations": args.root / "crew" / "specializations",
        "crew-roles": args.root / "crew" / "roles",
        "equipment-rarity": args.root / "equipment" / "rarity",
        "equipment-sets": args.root / "equipment" / "sets",
        "equipment-affixes": args.root / "equipment" / "affixes",
    }
    for name, folder in groups.items():
        files = sorted(path for path in folder.glob("*.png") if path.is_file())
        item_sheet(files, name.replace("-", " ").title()).save(review / f"{name}-contact-sheet.png", optimize=True)
    for name in ("locations", "circuits"):
        files = sorted(path for path in (args.root / name).glob("*.png") if path.is_file())
        thumbnail_sheet(files, name.title()).save(review / f"{name}-contact-sheet.png", optimize=True)


if __name__ == "__main__":
    main()
