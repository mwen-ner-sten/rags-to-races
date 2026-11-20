"""Team organisation scenes: the two garages you can run, at night.

    blender --background --factory-startup --python scripts/art/render_organizations.py -- [independent collective]

independent: a one-team garage, one bay, one lit lift.
collective: a shared co-op workshop, several bays, many hands, a fire barrel.
"""
import math
import os
import random
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
import kit  # noqa: E402
import props as P  # noqa: E402
from kit import box, rod, tube  # noqa: E402
from mathutils import Vector  # noqa: E402

SIZE = (1760, 990)  # ships at 880x495
SAMPLES = int(os.environ.get("ART_SAMPLES", 128))


def raised(fn, dz):
    """Run a builder, then lift everything it made by dz (a car on a lift)."""
    before = set(bpy.data.objects)
    fn()
    for obj in set(bpy.data.objects) - before:
        obj.location.z += dz


def person(x, y, z=0.0, tint=1.0):
    """A plain standing figure: body block and a head. Silhouette only."""
    box((x, y, z + 0.8), (0.42, 0.28, 1.2), kit.mat("canvas", (tint, tint, tint)), 0.05)
    kit.ball((x, y, z + 1.6), 0.15, "canvas")


def lift(x, y, car_rot, tint=None, body="enamel", height=1.5):
    """A two-post lift with a car on it."""
    for dy in (-1.5, 1.5):
        box((x, y + dy, 1.4), (0.22, 0.22, 2.8), "alloy", 0.02)
        box((x, y + dy, 0.03), (0.9, 0.5, 0.06), "cast", 0)
    raised(lambda: P.car(x, y, car_rot, body, tint, scale=0.9), height)
    tube([Vector((x - 0.9, y - 1.3, height - 0.1)), Vector((x + 0.9, y - 1.3, height - 0.1))], "teal_dim", 0.02, smooth=False)


def bench(x, y, rot=0.0, length=3.0):
    at = P.frame(x, y, rot)
    box(at(0, 0, 0.95), (length, 0.8, 0.1), "wood", 0.01, (0, 0, rot))
    for px in (-length / 2 + 0.15, length / 2 - 0.15):
        box(at(px, 0, 0.45), (0.12, 0.7, 0.9), "steel", 0, (0, 0, rot))
    box(at(0.3, 0.1, 1.2), (0.8, 0.5, 0.4), "cast", 0.03, (0, 0, rot))  # an engine on the bench
    box(at(-0.9, 0.1, 1.03), (0.5, 0.3, 0.05), "alloy", 0, (0, 0, rot))
    tube([at(-length / 2, 0.38, 1.02), at(length / 2, 0.38, 1.02)], "teal_dim", 0.015, smooth=False)


def tool_chest(x, y, rot=0.0, tint=(1.6, 0.6, 0.8)):
    at = P.frame(x, y, rot)
    box(at(0, 0, 0.55), (1.0, 0.6, 1.1), kit.mat("oxblood", tint), 0.03, (0, 0, rot))
    for z in (0.3, 0.55, 0.8):
        tube([at(-0.46, -0.31, z), at(0.46, -0.31, z)], "ice_dim" if z > 0.6 else "steel", 0.012, smooth=False)


def garage(x, y, w, d, h, bays, door_w, sign="fuchsia"):
    """A garage: lit open bays on the front (local -y), a flat steel roof."""
    t = 0.3
    box((x, y + d / 2 - t / 2, h / 2), (w, t, h), "concrete", 0.02)
    for sx in (-1, 1):
        box((x + sx * (w / 2 - t / 2), y, h / 2), (t, d, h), "concrete", 0.02)
    box((x, y, h + 0.15), (w + 0.8, d + 0.8, 0.3), "steel", 0.03)
    box((x, y, 0.03), (w, d, 0.06), "asphalt", 0)
    pier = (w - bays * door_w) / (bays + 1)
    fy = y - d / 2 + t / 2
    px = x - w / 2
    for k in range(bays + 1):
        box((px + pier / 2, fy, h / 2), (pier, t, h), "concrete", 0.02)
        px += pier
        if k < bays:
            cx = px + door_w / 2
            tube([Vector((cx - door_w / 2, fy - 0.17, 0.05)), Vector((cx - door_w / 2, fy - 0.17, h - 0.8)),
                  Vector((cx + door_w / 2, fy - 0.17, h - 0.8)), Vector((cx + door_w / 2, fy - 0.17, 0.05))], "teal_dim", 0.03, smooth=False)
            box((cx, fy - 0.1, h - 0.45), (door_w, 0.18, 0.6), "cast", 0.02)  # rolled-up door
            tube([Vector((cx - 1.2, y - d * 0.15, h - 0.2)), Vector((cx + 1.2, y - d * 0.15, h - 0.2))], "ice", 0.05, smooth=False)
            kit.point((cx, y - d * 0.15, h - 0.6), 560 * d / 7, kit.ICE, 0.3)
            kit.point((cx, y + d * 0.25, 1.6), 300, kit.ICE, 0.3)
            kit.flood((cx, y - d / 2 + 0.2, h - 0.7), (cx, y - d / 2 - 6, 0), 1100, kit.ICE, 52)
            px += door_w
    top = [Vector((x - w * 0.3, fy - 0.25, h + 0.7)), Vector((x + w * 0.3, fy - 0.25, h + 0.7))]
    P.sign_bar(top[0], top[1], sign, 0.07)
    for end in top:
        rod(Vector((end.x, end.y, h + 0.3)), end, 0.03, "steel", 6)
    return fy


def outdoor_floor(w, d, material="asphalt"):
    box((0, 0, -0.06), (w, d, 0.1), material, 0)


def independent():
    """A one-team garage: the owner's bay, one lift, one lit bench."""
    P.ground(300, "grass")
    box((0, -9.0, 0.0), (26, 14, 0.12), "asphalt", 0)
    box((-30, -6, 0.0), (20, 3, 0.1), "concrete", 0)
    fy = garage(0, 0, 9.0, 7.0, 4.0, 1, 5.6, "fuchsia")
    P.flat_line([Vector((-13, -4.2, 0)), Vector((13, -4.2, 0))], 0.18, "teal", 0.09, closed=False)
    # Inside the bay: the car on the lift, a bench, a tool chest, a rack of tyres.
    lift(0.4, 0.6, math.pi / 2, (1.4, 1.0, 1.0))
    bench(-3.6, 1.0, math.pi / 2, 3.0)
    tool_chest(-3.5, -1.5, math.pi / 2)
    for k in range(3):
        kit.torus((3.5, 2.5, 0.14 + k * 0.28), 0.34, 0.13, "rubber")
    # Outside: a second car under a hood, tyres, a drum, and the street lamp.
    P.car(9.5, -7.5, 0.35, "oxblood", (1.2, 1.1, 1.1), lights=True, scale=0.95)
    P.car(-9.5, -10.0, -0.3, "steel", (0.9, 0.9, 1.2), wear=1, tail=True, scale=0.95)
    for k in range(4):
        kit.torus((-6.5, -4.0, 0.14 + k * 0.28), 0.34, 0.13, "rubber")
    rod((6.0, -5.5, 0), (6.0, -5.5, 0.9), 0.3, "rust", 14)
    box((6.0, -5.5, 0.95), (0.4, 0.4, 0.06), "fuchsia_dim", 0)
    kit.point((6.0, -5.5, 1.5), 12, kit.FUCHSIA, 0.1)
    P.street_lamp(-7.5, -6.5, 5.5, 300, (1, 0.3))
    kit.flood((-6.4, -6.2, 5.35), (-5.5, -6, 0), 1400, kit.ICE, 40)
    # The neighbourhood: a dark house with one lit window, trees, a fence.
    P.house(-18, 14, 10, 6, 5, 0.0, "enamel", glow=0.4)
    P.house(16, 15, 9, 6, 4.8, 0.0, "steel", glow=0.5)
    P.fence_line([Vector((-14, 6, 0)), Vector((-14, -14, 0))], 1.4, "wood", post_gap=2)
    random.seed(8)
    for x, y, h in ((-20, 4, 6), (14, 6, 7), (21, -2, 6), (-24, -8, 5), (24, 10, 6)):
        P.tree(x, y, h)
    kit.scene_rig(*SIZE, location=(4.0, -17.5, 3.6), target=(0.5, -1.0, 1.9), lens=30, rim=0.5)


def collective():
    """A shared co-op workshop: many bays, many hands, one fire barrel."""
    P.ground(300, "grass")
    box((0, -10.0, 0.0), (60, 16, 0.12), "asphalt", 0)
    fy = garage(0, 0, 26.0, 9.0, 4.8, 4, 5.0, "teal")
    P.flat_line([Vector((-27, -5.2, 0)), Vector((27, -5.2, 0))], 0.2, "teal", 0.09, closed=False)
    # Inside, bay by bay: a car on the lift, an engine on a hoist, benches and hands.
    cx = [-9.75, -3.25, 3.25, 9.75]
    lift(cx[0], 1.2, math.pi / 2, (1.0, 1.2, 1.5), "enamel", 1.5)
    box((cx[1], 2.5, 1.1), (0.3, 0.3, 2.2), "alloy", 0.02)
    rod((cx[1], 2.5, 2.1), (cx[1], 0.0, 2.6), 0.07, "alloy", 8)
    rod((cx[1], 0.0, 2.6), (cx[1], 0.0, 1.6), 0.015, "steel", 6)
    box((cx[1], 0.0, 1.45), (0.9, 0.6, 0.5), "cast", 0.04)
    P.car(cx[1], 3.2, math.pi / 2, "oxblood", (1.2, 1.1, 1.1), scale=0.8)
    bench(cx[2], 2.8, 0.0, 4.0)
    tool_chest(cx[2] + 2.2, 3.5, 0.0)
    P.car(cx[3], 1.0, math.pi / 2, "steel", (1.2, 1.0, 1.0), scale=0.9)
    for px, py, tn in ((cx[0] - 1.5, -0.6, 1.0), (cx[1] + 1.4, -0.8, 0.8), (cx[2] - 1.0, 1.8, 1.2), (cx[3] + 1.8, 1.2, 1.0), (cx[3] - 1.6, -0.6, 0.8)):
        person(px, py, 0.0, tn)
    # Yard: shared containers, project cars, the fire barrel with its circle of chairs.
    P.container(-24, -4, 0.0, "steel")
    tube([Vector((-27, -5.25, 2.6)), Vector((-21, -5.25, 2.6))], "teal_dim", 0.03, smooth=False)
    P.container(-24, -7.0, 0.0, "enamel", (0.9, 1.0, 1.3))
    P.car(17, -8.0, 0.4, "enamel", (1.5, 1.0, 1.0), wear=1, tail=True, scale=0.95)
    P.car(10.0, -12.5, -0.25, "oxblood", (1.1, 1.1, 1.1), lights=True, scale=0.95)
    P.car(-6, -14.0, 0.3, "enamel", (1.0, 1.0, 1.3), wheels=False, wear=1)
    rod((-3.0, -8.0, 0), (-3.0, -8.0, 0.9), 0.32, "rust", 14)
    box((-3.0, -8.0, 0.95), (0.45, 0.45, 0.06), "fuchsia", 0)
    kit.point((-3.0, -8.0, 1.6), 60, kit.FUCHSIA, 0.2)
    for a in range(5):
        ang = a * math.tau / 5 + 0.3
        box((-3.0 + 1.5 * math.cos(ang), -8.0 + 1.5 * math.sin(ang), 0.3), (0.5, 0.5, 0.6), "steel", 0.03, (0, 0, ang))
    for k in range(2):
        person(-4.4, -8.0 + (k - 0.5) * 0.9, 0.0, 0.9)
    # String lights from the roof to a pole, flood poles, a yard sign bar.
    rod((-14.0, -11.0, 0), (-14.0, -11.0, 4.6), 0.07, "wood", 8)
    P.string_lights((-12.0, fy - 0.4, 5.0), (-14.0, -11.0, 4.5), 0.5, 8, "ice_dim")
    P.string_lights((-14.0, -11.0, 4.5), (-3.0, -8.0, 4.0), 1.0, 12, "fuchsia_dim")
    P.string_lights((-3.0, -8.0, 4.0), (6.0, fy - 0.4, 5.0), 0.8, 10, "ice_dim")
    P.light_pole(20, -6, 8.5, (16, -6, 0), power=2200, heads=2, spread=38)
    P.light_pole(-24, -6, 8.5, (-20, -6, 0), power=2000, heads=2, spread=38)
    # Neighbourhood, more of it and farther away than the single garage's.
    P.house(-26, 18, 10, 6, 5, 0.0, "enamel", glow=0.4)
    P.house(24, 18, 9, 6, 4.8, 0.0, "steel", glow=0.5)
    random.seed(12)
    for x, y, h in ((-30, 4, 6), (30, 4, 7), (-34, -6, 6), (34, -10, 5), (0, 24, 7)):
        P.tree(x, y, h)
    kit.scene_rig(*SIZE, location=(5, -27.0, 5.0), target=(0.0, -2.0, 2.1), lens=30, rim=0.5)


SCENES = {"independent": independent, "collective": collective}

if __name__ == "__main__":
    wanted = kit.args()
    for name, build in SCENES.items():
        if wanted and name not in wanted:
            continue
        kit.reset(seed=29)
        build()
        kit.render("organizations", name, samples=SAMPLES)
