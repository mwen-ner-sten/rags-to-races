from __future__ import annotations

import argparse
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps


VEHICLES = [
    ("push_mower", "T0 Push Mower"),
    ("riding_mower", "T1 Riding Mower"),
    ("go_kart", "T2 Go-Kart"),
    ("beater_car", "T3 Beater Car"),
    ("street_racer", "T4 Street Racer"),
    ("rally_car", "T5 Rally Car"),
    ("stock_car", "T6 Stock Car"),
    ("prototype_racer", "T7 Prototype"),
    ("supercar", "T8 Supercar"),
    ("hypercar", "T9 Hypercar"),
    ("prototype_x", "T10 Prototype X"),
]


def non_key_mask(image: Image.Image) -> np.ndarray:
    rgb = np.asarray(image.convert("RGB"))
    red = rgb[:, :, 0]
    green = rgb[:, :, 1]
    blue = rgb[:, :, 2]

    # Generated sheets use bright chroma green. Keep muted vehicle greens.
    key = (green > 110) & (red < 140) & (blue < 140) & ((green - red) > 45) & ((green - blue) > 45)
    mask = ~key

    # Remove tiny isolated flecks before component detection.
    height, width = mask.shape
    padded = np.pad(mask, 1, mode="constant", constant_values=False)
    neighbors = np.zeros_like(mask, dtype=np.uint8)
    for y in range(3):
        for x in range(3):
            if x == 1 and y == 1:
                continue
            neighbors += padded[y : y + height, x : x + width]
    return mask & (neighbors >= 2)


def connected_components(mask: np.ndarray) -> list[tuple[int, int, int, int, int]]:
    height, width = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    components: list[tuple[int, int, int, int, int]] = []

    for start_y in range(height):
        xs = np.flatnonzero(mask[start_y] & ~seen[start_y])
        for start_x in xs:
            if seen[start_y, start_x]:
                continue

            queue: deque[tuple[int, int]] = deque([(start_x, start_y)])
            seen[start_y, start_x] = True
            min_x = max_x = start_x
            min_y = max_y = start_y
            area = 0

            while queue:
                x, y = queue.popleft()
                area += 1
                min_x = min(min_x, x)
                max_x = max(max_x, x)
                min_y = min(min_y, y)
                max_y = max(max_y, y)

                for next_x, next_y in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if (
                        0 <= next_x < width
                        and 0 <= next_y < height
                        and mask[next_y, next_x]
                        and not seen[next_y, next_x]
                    ):
                        seen[next_y, next_x] = True
                        queue.append((next_x, next_y))

            if area > 2500:
                components.append((min_x, min_y, max_x + 1, max_y + 1, area))

    return components


def sort_sheet_components(components: list[tuple[int, int, int, int, int]]) -> list[tuple[int, int, int, int, int]]:
    components = sorted(components, key=lambda box: ((box[1] + box[3]) / 2, box[0]))
    rows: list[list[tuple[int, int, int, int, int]]] = []

    for component in components:
        center_y = (component[1] + component[3]) / 2
        if not rows:
            rows.append([component])
            continue

        last_row = rows[-1]
        row_center = sum((box[1] + box[3]) / 2 for box in last_row) / len(last_row)
        if abs(center_y - row_center) > 140:
            rows.append([component])
        else:
            last_row.append(component)

    ordered: list[tuple[int, int, int, int, int]] = []
    for row in rows:
        ordered.extend(sorted(row, key=lambda box: box[0]))
    return ordered


def apply_alpha(image: Image.Image, mask: np.ndarray) -> Image.Image:
    rgba = image.convert("RGBA")
    alpha = (mask.astype(np.uint8) * 255)
    rgba.putalpha(Image.fromarray(alpha, "L"))
    return rgba


def crop_to_sprite(source: Image.Image, box: tuple[int, int, int, int, int], canvas_size: int) -> Image.Image:
    min_x, min_y, max_x, max_y, _area = box
    pad = 10
    crop = source.crop(
        (
            max(0, min_x - pad),
            max(0, min_y - pad),
            min(source.width, max_x + pad),
            min(source.height, max_y + pad),
        )
    )

    bbox = crop.getbbox()
    if bbox:
        crop = crop.crop(bbox)

    max_content_width = canvas_size - 6
    max_content_height = canvas_size - 10
    scale = min(max_content_width / crop.width, max_content_height / crop.height)
    new_size = (max(1, round(crop.width * scale)), max(1, round(crop.height * scale)))
    resized = crop.resize(new_size, Image.Resampling.LANCZOS)

    # Light palette reduction nudges the generated art toward sprite readability.
    rgb = Image.new("RGB", resized.size, (0, 0, 0))
    rgb.paste(resized, mask=resized.getchannel("A"))
    quantized = rgb.quantize(colors=96, method=Image.Quantize.MEDIANCUT).convert("RGBA")
    quantized.putalpha(resized.getchannel("A"))

    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    offset = ((canvas_size - quantized.width) // 2, (canvas_size - quantized.height) // 2)
    canvas.alpha_composite(quantized, offset)
    return canvas


def build_contact_sheet(sprites: list[tuple[str, str, Image.Image]], out_path: Path) -> None:
    previews = [64, 32, 24, 16]
    cell_w = 390
    cell_h = 112
    header_h = 34
    sheet = Image.new("RGBA", (cell_w, header_h + cell_h * len(sprites)), (14, 16, 20, 255))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    draw.text((12, 10), "Generated vehicle sprites: 64px / 32px / 24px / 16px", fill=(230, 235, 242), font=font)

    for row, (_vehicle_id, label, sprite) in enumerate(sprites):
        y = header_h + row * cell_h
        draw.rectangle((0, y, sheet.width, y + cell_h), fill=(20, 24, 31, 255) if row % 2 else (16, 19, 25, 255))
        draw.text((12, y + 12), label, fill=(126, 224, 170), font=font)

        x = 130
        for size in previews:
            preview = sprite.resize((size, size), Image.Resampling.NEAREST)
            checker = Image.new("RGBA", (72, 72), (32, 36, 44, 255))
            checker_draw = ImageDraw.Draw(checker)
            for cy in range(0, 72, 8):
                for cx in range(0, 72, 8):
                    if (cx // 8 + cy // 8) % 2 == 0:
                        checker_draw.rectangle((cx, cy, cx + 7, cy + 7), fill=(44, 49, 60, 255))
            checker.alpha_composite(preview, ((72 - size) // 2, (72 - size) // 2))
            sheet.alpha_composite(checker, (x, y + 28))
            draw.text((x + 2, y + 10), f"{size}px", fill=(170, 180, 195), font=font)
            x += 54

    out_path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out_path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--out-dir", required=True, type=Path)
    parser.add_argument("--canvas-size", type=int, default=64)
    args = parser.parse_args()

    image = Image.open(args.input).convert("RGB")
    mask = non_key_mask(image)
    keyed = apply_alpha(image, mask)
    components = sort_sheet_components(connected_components(mask))

    if len(components) != len(VEHICLES):
        raise SystemExit(f"Expected {len(VEHICLES)} vehicle components, found {len(components)}")

    source_out = args.out_dir / "source" / "vehicle-sprite-source.png"
    source_out.parent.mkdir(parents=True, exist_ok=True)
    keyed.save(source_out)

    sprites: list[tuple[str, str, Image.Image]] = []
    args.out_dir.mkdir(parents=True, exist_ok=True)
    for vehicle, component in zip(VEHICLES, components):
        vehicle_id, label = vehicle
        sprite = crop_to_sprite(keyed, component, args.canvas_size)
        sprite.save(args.out_dir / f"{vehicle_id}.png")
        sprites.append((vehicle_id, label, sprite))

    build_contact_sheet(sprites, args.out_dir / "contact-sheet.png")


if __name__ == "__main__":
    main()
