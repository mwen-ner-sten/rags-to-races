"""Crop a transparent grid source sheet into normalized game assets."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image, ImageOps


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", type=Path, required=True)
    parser.add_argument("--out-dir", type=Path, required=True)
    parser.add_argument("--ids", required=True, help="Comma-separated IDs in row-major order")
    parser.add_argument("--cols", type=int)
    parser.add_argument("--rows", type=int)
    parser.add_argument("--row-counts", help="Comma-separated cell counts for uneven rows")
    parser.add_argument("--width", type=int, default=64)
    parser.add_argument("--height", type=int, default=64)
    parser.add_argument("--padding", type=float, default=0.08)
    parser.add_argument("--cover", action="store_true", help="Crop opaque cells to fill the output instead of alpha-normalizing")
    return parser.parse_args()


def normalize(cell: Image.Image, width: int, height: int, padding: float) -> Image.Image:
    bbox = cell.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("Grid cell contains no opaque artwork")
    subject = cell.crop(bbox)
    max_width = max(1, round(width * (1 - padding * 2)))
    max_height = max(1, round(height * (1 - padding * 2)))
    scale = min(max_width / subject.width, max_height / subject.height)
    resized = subject.resize(
        (max(1, round(subject.width * scale)), max(1, round(subject.height * scale))),
        Image.Resampling.LANCZOS,
    )
    output = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    output.alpha_composite(resized, ((width - resized.width) // 2, (height - resized.height) // 2))
    return output


def main() -> None:
    args = parse_args()
    ids = [asset_id.strip() for asset_id in args.ids.split(",") if asset_id.strip()]
    row_counts = [int(value) for value in args.row_counts.split(",")] if args.row_counts else None
    expected = sum(row_counts) if row_counts else (args.cols or 0) * (args.rows or 0)
    if not row_counts and (not args.cols or not args.rows):
        raise ValueError("Provide --cols and --rows, or --row-counts")
    if len(ids) != expected:
        raise ValueError(f"Expected {expected} IDs, got {len(ids)}")

    sheet = Image.open(args.input).convert("RGBA")
    rows = len(row_counts) if row_counts else args.rows
    cell_height = sheet.height // rows
    args.out_dir.mkdir(parents=True, exist_ok=True)

    for index, asset_id in enumerate(ids):
        if row_counts:
            remaining = index
            row = 0
            while remaining >= row_counts[row]:
                remaining -= row_counts[row]
                row += 1
            column = remaining
            columns = row_counts[row]
        else:
            columns = args.cols
            column = index % columns
            row = index // columns
        cell_width = sheet.width // columns
        cell = sheet.crop((
            column * cell_width,
            row * cell_height,
            (column + 1) * cell_width,
            (row + 1) * cell_height,
        ))
        output = (
            ImageOps.fit(cell.convert("RGB"), (args.width, args.height), Image.Resampling.LANCZOS).convert("RGBA")
            if args.cover
            else normalize(cell, args.width, args.height, args.padding)
        )
        output.save(args.out_dir / f"{asset_id}.png", optimize=True)


if __name__ == "__main__":
    main()
