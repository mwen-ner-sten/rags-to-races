"""Part sprites: every part in src/core/content/parts.ts, one model each.

    blender --background --factory-startup --python scripts/art/render_parts.py -- [part_id ...]

Models are real objects at roughly real proportions (units are decimetres).
House rule for accents: one or two neon details per part that mean something
(a spark lead, a heat glow, a gauge), never a light tube around everything.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import kit  # noqa: E402
import parts_engines  # noqa: E402
import parts_other  # noqa: E402
import parts_running  # noqa: E402

SIZE = (576, 576)  # 2x the shipped 288x288
PARTS = {**parts_engines.PARTS, **parts_running.PARTS, **parts_other.PARTS}

if __name__ == "__main__":
    kit.run("parts", PARTS, SIZE)
