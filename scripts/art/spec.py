"""Sprite categories, loaded from spec.json (shared with the TypeScript tests).

Sizes are twice the largest size the game draws the sprite at, so they stay
sharp on high-density screens.
"""
from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
RAW = ROOT / ".tmp" / "art" / "raw"
SPRITES = ROOT / "public" / "sprites"


@dataclass(frozen=True)
class Category:
    size: tuple[int, int]
    kind: str  # "object": transparent, fitted with padding; "scene": opaque, cover-fit
    script: str  # the Blender script that models this category
    shown: str  # where and how big the game draws it
    padding: float = 0.06


def _load() -> dict[str, Category]:
    raw = json.loads((HERE / "spec.json").read_text(encoding="utf-8"))
    return {
        name: Category(tuple(c["size"]), c["kind"], c["script"], c["shown"], c.get("padding", 0.06))
        for name, c in raw.items()
    }


CATEGORIES: dict[str, Category] = _load()
