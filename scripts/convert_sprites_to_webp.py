"""Convert authoring PNG sprites into the shipped WebP set.

Reads every PNG under ``--source`` (default ``docs/art/source``), skipping
review sheets and ``source/`` sub-folders, and writes a same-size WebP
(quality 85, alpha preserved) to the mirrored path under ``--out``
(default ``public/sprites``).

The helpers here are shared by the other asset scripts so every pipeline
writes its PNG authoring source and its shipped WebP in one step.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image

WEBP_QUALITY = 85
SKIP_DIRS = {"review", "source"}
AUTHORING_ROOT = Path("docs/art/source")
REVIEW_ROOT = Path("docs/art/review")
SHIPPED_ROOT = Path("public/sprites")


def is_shippable(path: Path, root: Path) -> bool:
    relative = path.relative_to(root)
    if any(part in SKIP_DIRS for part in relative.parts[:-1]):
        return False
    return not path.name.endswith("contact-sheet.png")


def shipped_dir_for(authoring_dir: Path) -> Path:
    """Mirror an authoring folder under public/sprites (or reuse it when it is elsewhere)."""
    try:
        return SHIPPED_ROOT / authoring_dir.relative_to(AUTHORING_ROOT)
    except ValueError:
        return authoring_dir


def save_webp(image: Image.Image, destination: Path, quality: int = WEBP_QUALITY) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.convert("RGBA").save(destination, format="WEBP", quality=quality, method=6)


def save_sprite(image: Image.Image, png_dir: Path, webp_dir: Path, stem: str) -> tuple[Path, Path]:
    """Write the PNG authoring source and the shipped WebP for one sprite."""
    png_path = png_dir / f"{stem}.png"
    png_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(png_path, optimize=True)
    webp_path = webp_dir / f"{stem}.webp"
    save_webp(image, webp_path)
    return png_path, webp_path


def convert_tree(source: Path, out: Path, quality: int = WEBP_QUALITY) -> list[tuple[Path, Path]]:
    written: list[tuple[Path, Path]] = []
    for png in sorted(source.rglob("*.png")):
        if not is_shippable(png, source):
            continue
        webp = out / png.relative_to(source).with_suffix(".webp")
        with Image.open(png) as image:
            save_webp(image, webp, quality)
        written.append((png, webp))
    return written


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=AUTHORING_ROOT)
    parser.add_argument("--out", type=Path, default=SHIPPED_ROOT)
    parser.add_argument("--quality", type=int, default=WEBP_QUALITY)
    args = parser.parse_args()
    written = convert_tree(args.source, args.out, args.quality)
    png_bytes = sum(png.stat().st_size for png, _ in written)
    webp_bytes = sum(webp.stat().st_size for _, webp in written)
    print(f"{len(written)} sprites: {png_bytes} bytes PNG -> {webp_bytes} bytes WebP")


if __name__ == "__main__":
    main()
