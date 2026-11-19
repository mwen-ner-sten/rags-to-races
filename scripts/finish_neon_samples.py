"""Glow pass and before/after sheet for the Midnight Circuit art samples.

Run after scripts/render_neon_samples.py:  python scripts/finish_neon_samples.py
"""
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SAMPLES = ROOT / "docs" / "art" / "samples" / "midnight-circuit"
RAW = SAMPLES / "raw"
SPRITES = ROOT / "public" / "sprites"
PANEL = (5, 6, 13)
WELL = (7, 18, 27)
LINE = (20, 58, 74)
INK = (163, 195, 207)

# name: (current sprite, size it is drawn at in the game)
SUBJECTS = {
    "wheel_busted": ("parts/wheel_busted.webp", (40, 40)),
    "engine_small": ("parts/engine_small.webp", (40, 40)),
    "push_mower": ("vehicles/push_mower.webp", (120, 80)),
    "backyard_derby": ("circuits/backyard_derby.webp", (120, 64)),
}


def add_glow(image: Image.Image) -> Image.Image:
    """Bloom: blur the bright, saturated pixels and screen them back on."""
    rgba = image.convert("RGBA")
    rgb = rgba.convert("RGB")
    alpha = rgba.getchannel("A")
    bright = rgb.point(lambda v: 0 if v < 150 else int((v - 150) * 255 / 105))
    lights = Image.composite(bright, Image.new("RGB", rgb.size), alpha)
    glow = Image.new("RGB", rgb.size)
    for radius, gain in ((rgb.width / 160, 0.9), (rgb.width / 50, 0.55), (rgb.width / 18, 0.3)):
        layer = lights.filter(ImageFilter.GaussianBlur(radius)).point(lambda v, g=gain: int(min(255, v * g)))
        glow = ImageChops.screen(glow, layer)
    solid = Image.composite(rgb, Image.new("RGB", rgb.size), alpha)
    out = ImageChops.screen(solid, glow)
    out_alpha = ImageChops.lighter(alpha, glow.convert("L").point(lambda v: int(min(255, v * 1.6))))
    out.putalpha(out_alpha)
    return out


def crop_to_subject(image: Image.Image, padding: float = 0.06) -> Image.Image:
    """Trim a transparent sprite to what is drawn, leaving a small even margin."""
    box = image.getchannel("A").point(lambda v: 255 if v > 12 else 0).getbbox()
    if box is None or box == (0, 0, *image.size):
        return image
    pad = int(max(box[2] - box[0], box[3] - box[1]) * padding)
    return image.crop((max(0, box[0] - pad), max(0, box[1] - pad), min(image.width, box[2] + pad), min(image.height, box[3] + pad)))


def on_well(image: Image.Image, size: tuple[int, int], pad: int = 0) -> Image.Image:
    tile = Image.new("RGB", (size[0] + pad * 2, size[1] + pad * 2), WELL)
    source = image.convert("RGBA")
    ratio = min(size[0] / source.width, size[1] / source.height)
    fitted = source.resize((max(1, round(source.width * ratio)), max(1, round(source.height * ratio))), Image.LANCZOS)
    tile.paste(fitted, ((tile.width - fitted.width) // 2, (tile.height - fitted.height) // 2), fitted)
    ImageDraw.Draw(tile).rectangle((0, 0, tile.width - 1, tile.height - 1), outline=LINE)
    return tile


def main() -> None:
    row_h, big = 300, (380, 260)
    sheet = Image.new("RGB", (40 + 2 * (big[0] + 20) + 2 * 150, 60 + row_h * len(SUBJECTS)), PANEL)
    draw = ImageDraw.Draw(sheet)
    for x, label in ((30, "NOW"), (30 + big[0] + 170, "SAMPLE")):
        draw.text((x, 20), label, fill=INK)
    for row, (name, (current, shown)) in enumerate(SUBJECTS.items()):
        finished = crop_to_subject(add_glow(Image.open(RAW / f"{name}.png")))
        finished.save(SAMPLES / f"{name}.webp", quality=92, method=6)
        before = Image.open(SPRITES / current)
        y = 50 + row * row_h
        draw.text((30, y), name, fill=INK)
        x = 30
        for image in (before, finished):
            sheet.paste(on_well(image, big, 10), (x, y + 18))
            x += big[0] + 30
            draw.text((x, y + 18), f"in game, {shown[0]}x{shown[1]}", fill=INK)
            sheet.paste(on_well(image, shown, 4), (x, y + 40))
            x += 140
    sheet.save(SAMPLES / "before-after.png")


if __name__ == "__main__":
    main()
