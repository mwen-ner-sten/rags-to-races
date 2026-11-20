"""Finish raw Blender renders into shipped sprites.

Reads .tmp/art/raw/<category>/<name>.png (written by the scripts/art/render_*
scripts), adds the house glow pass, crops or fits to the category's size and
writes public/sprites/<category>/<name>.webp.

    python scripts/art/finish.py                 # every raw render
    python scripts/art/finish.py parts vehicles  # some categories
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
from spec import CATEGORIES, RAW, SPRITES  # noqa: E402


def bloom(rgb: Image.Image, strength: float) -> Image.Image:
    """Blur the bright pixels and screen them back on: neon halation."""
    bright = rgb.point(lambda v: 0 if v < 140 else int((v - 140) * 255 / 115))
    glow = Image.new("RGB", rgb.size)
    w = rgb.width
    for radius, gain in ((w / 220, 0.8 * strength), (w / 70, 0.5 * strength), (w / 24, 0.28 * strength)):
        layer = bright.filter(ImageFilter.GaussianBlur(radius)).point(lambda v, g=gain: int(min(255, v * g)))
        glow = ImageChops.screen(glow, layer)
    return glow


def finish_object(raw: Image.Image, size: tuple[int, int], padding: float) -> Image.Image:
    rgba = raw.convert("RGBA")
    rgb, alpha = rgba.convert("RGB"), rgba.getchannel("A")
    solid = Image.composite(rgb, Image.new("RGB", rgb.size), alpha)
    glow = bloom(solid, 1.0)
    out = ImageChops.screen(solid, glow)
    out_alpha = ImageChops.lighter(alpha, glow.convert("L").point(lambda v: int(min(255, v * 1.5))))
    out.putalpha(out_alpha)
    box = out_alpha.point(lambda v: 255 if v > 10 else 0).getbbox()
    if box:
        out = out.crop(box)
    inner = (size[0] * (1 - 2 * padding), size[1] * (1 - 2 * padding))
    ratio = min(inner[0] / out.width, inner[1] / out.height)
    fitted = out.resize((max(1, round(out.width * ratio)), max(1, round(out.height * ratio))), Image.LANCZOS)
    canvas = Image.new("RGBA", size, (0, 0, 0, 0))
    canvas.paste(fitted, ((size[0] - fitted.width) // 2, (size[1] - fitted.height) // 2), fitted)
    return canvas


def finish_scene(raw: Image.Image, size: tuple[int, int]) -> Image.Image:
    rgb = raw.convert("RGB")
    out = ImageChops.screen(rgb, bloom(rgb, 0.9))
    # Cover-fit to the exact size, then a soft vignette so edges sit in the panel.
    ratio = max(size[0] / out.width, size[1] / out.height)
    out = out.resize((round(out.width * ratio), round(out.height * ratio)), Image.LANCZOS)
    left, top = (out.width - size[0]) // 2, (out.height - size[1]) // 2
    out = out.crop((left, top, left + size[0], top + size[1]))
    vignette = Image.new("L", size, 0)
    inset = Image.new("L", (size[0] - size[0] // 6, size[1] - size[1] // 6), 255)
    vignette.paste(inset, (size[0] // 12, size[1] // 12))
    vignette = vignette.filter(ImageFilter.GaussianBlur(min(size) / 7))
    dark = Image.new("RGB", size, (5, 6, 13))
    return Image.composite(out, dark, vignette.point(lambda v: 90 + int(v * 165 / 255)))


def main(selected: list[str]) -> None:
    for category, spec in CATEGORIES.items():
        if selected and category not in selected:
            continue
        folder = RAW / category
        if not folder.exists():
            continue
        for raw_path in sorted(folder.glob("*.png")):
            raw = Image.open(raw_path)
            if spec.kind == "object":
                image = finish_object(raw, spec.size, spec.padding)
            else:
                image = finish_scene(raw, spec.size)
            out = SPRITES / category / f"{raw_path.stem}.webp"
            out.parent.mkdir(parents=True, exist_ok=True)
            image.save(out, quality=90, method=6)
            print(f"[finish] {out.relative_to(SPRITES.parent.parent)} {image.size}")


if __name__ == "__main__":
    main(sys.argv[1:])
