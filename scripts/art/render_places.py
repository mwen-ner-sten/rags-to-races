"""Place scenes: the scavenging locations of the Trips tab, at night.

    blender --background --factory-startup --python scripts/art/render_places.py -- [place_id ...]

House rules for these scenes (same as the venues): dark ground, small pools of
light, real worn objects, and one bold teal or fuchsia structure per scene (a
lit fence line, a kerb line, a sign bar) that still reads at 96x64.
"""
import math
import os
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import kit  # noqa: E402
import props as P  # noqa: E402
import render_vehicles as V  # noqa: E402
from kit import box, rod, tube  # noqa: E402
from mathutils import Vector  # noqa: E402

SIZE = (768, 512)  # 2x the shipped 384x256
SAMPLES = int(os.environ.get("ART_SAMPLES", 128))


def scene(*a, exposure=0.6, **k):
    """scene_rig plus a per-scene exposure (night scenes can lift a little)."""
    import bpy
    cam = kit.scene_rig(*a, **k)
    bpy.context.scene.view_settings.exposure = exposure
    return cam


def slab(x0, y0, x1, y1, material, z=0.0, h=0.1):
    """A ground patch between two corners."""
    box(((x0 + x1) / 2, (y0 + y1) / 2, z - h / 2 + 0.001), (abs(x1 - x0), abs(y1 - y0), h), material, 0)


def spot(x, y, z, aim, power=2500, spread=40, colour=kit.ICE):
    """A tight floodlight: small pool of light, ground stays dark around it."""
    return kit.flood(Vector((x, y, z)), aim, power, colour, spread)


def lamp(x, y, height, aim, power=1800, lean=(1, 0), spread=45):
    """A street lamp plus a tight spot that lights a small pool below it."""
    P.street_lamp(x, y, height, 60, lean)
    head = Vector((x + lean[0] * 1.2, y + lean[1] * 1.2, height - 0.15))
    kit.flood(head, aim, power, kit.ICE, spread)


def tyre(x, y, z=0.0, r=0.34, tilt=0.0):
    kit.torus((x, y, z + 0.14), r, 0.13, "rubber", (tilt, 0, 0))


def tyre_pile(x, y, n=4, r=0.36):
    for k in range(n):
        kit.torus((x + (k % 2) * 0.06, y, 0.13 + k * 0.25), r, 0.13, "rubber")


def wheel_rim(x, y, z=0.0):
    kit.torus((x, y, z + 0.17), 0.3, 0.14, "rubber", (math.pi / 2, 0, 0.3))
    kit.rod((x, y - 0.1, z + 0.17), (x, y + 0.1, z + 0.17), 0.2, "alloy", 16)


def engine_block(x, y, z=0.0, rot=0.0):
    box((x, y, z + 0.35), (0.95, 0.6, 0.55), "cast", 0.04, (0, 0, rot))
    for k in range(4):
        box((x - 0.3 + k * 0.2, y, z + 0.78), (0.14, 0.5, 0.3), "rust", 0.02, (0, 0, rot))
    kit.rod((x - 0.5, y, z + 0.4), (x - 0.75, y, z + 0.4), 0.1, "steel", 10)


def bag(x, y, s=0.5, mat="plastic"):
    kit.ball((x, y, s * 0.6), s * 0.6, mat, (1, 1, 0.85))


def neon(points, material="teal", w=0.04):
    """A lit line in the air (a rail, a fence top, a sign bar)."""
    tube([Vector(p) for p in points], material, w, smooth=False)


def wheelie(x, y, rot=0.0, tint=None, band="teal_dim"):
    def build():
        V.loft([(-0.38, 0.12, 1.0, 0.3, 0.36), (0.38, 0.12, 1.0, 0.3, 0.36)], kit.mat("plastic", tint), 0.025)
        box((0, 0, 1.03), (0.84, 0.76, 0.06), "plastic", 0.02)
        box((0, -0.0, 1.06), (0.5, 0.5, 0.03), "cast", 0.01)
        for sy in (-1, 1):
            rod((-0.3, sy * 0.3, 0.12), (-0.3, sy * 0.36, 0.12), 0.12, "rubber", 14)
        if band:
            tube([Vector((0.375, -0.31, 0.7)), Vector((0.375, 0.31, 0.7))], band, 0.018, smooth=False)
    return P.place(build, x, y, rot)


def washer(x, y, rot=0.0):
    def build():
        box((0, 0, 0.45), (0.65, 0.62, 0.9), "alloy", 0.03)
        box((0, 0, 0.45), (0.66, 0.63, 0.88), "steel", 0.03)
        kit.rod((0.325, 0, 0.5), (0.34, 0, 0.5), 0.22, "glass", 24)
        kit.torus((0.335, 0, 0.5), 0.23, 0.025, "chrome", (0, math.pi / 2, 0), 32)
        box((0.33, -0.18, 0.82), (0.02, 0.12, 0.05), "fuchsia_soft", 0)
    return P.place(build, x, y, rot)


def box_tv(x, y, rot=0.0, z=0.0):
    def build():
        box((0, 0, 0.32), (0.55, 0.62, 0.55), "plastic", 0.04)
        box((0.28, 0, 0.33), (0.02, 0.5, 0.4), "glass", 0.02)
        box((0.28, 0.2, 0.1), (0.02, 0.06, 0.03), "fuchsia_soft", 0)
        box((-0.2, 0, 0.62), (0.3, 0.3, 0.06), "plastic", 0.02)
    return P.place(build, x, y, rot, z)


def mattress(x, y, rot=0.0, z=0.0, tilt=0.0):
    def build():
        box((0, 0, 0.14), (2.0, 1.0, 0.28), kit.mat("canvas", (1.4, 1.5, 1.8)), 0.1)
        for k in (-0.6, 0.0, 0.6):
            box((k, 0, 0.285), (0.02, 1.0, 0.012), "cast", 0)
        tube([Vector((-1.0, -0.5, 0.29)), Vector((1.0, -0.5, 0.29)), Vector((1.0, 0.5, 0.29)), Vector((-1.0, 0.5, 0.29))],
             "teal_soft", 0.012, cyclic=True, smooth=False)
    return P.place(build, x, y, rot, z)


def homes(xs, y, rot=0.0, seed=1, soft=0.7):
    """Dark houses across the street: soft windows, a porch light, no blown whites."""
    rnd = random.Random(seed)
    for i, x in enumerate(xs):
        w, d, h = 7 + (i % 2) * 2, 5, 4.6 + (i % 3) * 0.6
        P.shed(x, y, w, d, h, rot, ("enamel", "steel", "oxblood", "enamel")[i % 4], window=None)
        for k in range(3):
            px = x - w / 2 + (k + 0.5) * w / 3
            for pz in (h * 0.3, h * 0.72):
                if rnd.random() < soft:
                    box((px, y - d / 2 - 0.02, pz), (0.7, 0.04, 0.6), rnd.choice(("ice_soft", "ice_soft", "fuchsia_soft", "teal_soft")), 0)
        box((x + w * 0.3, y - d / 2 - 0.02, 1.0), (0.8, 0.04, 2.0), "cast", 0)
        box((x + w * 0.3, y - d / 2 - 0.05, 2.15), (0.3, 0.06, 0.08), "ice_soft", 0)


def trailer(x, y, rot=0.0, body="steel", tint=None, w=7.0, d=2.7, h=2.4, tilt=0.0, glow=True, accent=None):
    """A single-wide trailer home: skirting, door and steps, eave strip, AC unit."""
    at = P.frame(x, y, rot)
    box(at(0, 0, h / 2 + 0.7), (w, d, h), kit.mat(body, tint), 0.06, (tilt, 0, rot))
    box(at(0, 0, h + 0.78), (w + 0.2, d + 0.2, 0.14), "steel", 0.03, (tilt, 0, rot))
    box(at(0, 0, 0.35), (w - 0.1, d - 0.1, 0.7), "cast", 0.02, (tilt, 0, rot))  # skirting
    for k in range(3):
        px = -w * 0.3 + k * w * 0.3
        box(at(px, -d / 2 - 0.02, h / 2 + 1.0), (0.9, 0.04, 0.7), (("teal_soft" if k != 1 else "fuchsia_soft") if glow else "cast"), 0, (tilt, 0, rot))
        box(at(px, -d / 2 - 0.03, h / 2 + 1.0), (1.0, 0.03, 0.8), "cast", 0.01, (tilt, 0, rot))
    box(at(w * 0.38, -d / 2 - 0.02, 1.5), (0.9, 0.05, 1.7), "cast", 0.01, (tilt, 0, rot))
    box(at(w * 0.38, -d / 2 - 0.6, 0.45), (1.2, 0.9, 0.12), "wood", 0.01, (tilt, 0, rot))
    box(at(-w * 0.3, 0.2, h + 1.0), (0.8, 0.6, 0.4), "alloy", 0.02, (tilt, 0, rot))
    if accent:
        tube([at(-w / 2, -d / 2 - 0.1, h + 0.62), at(w / 2, -d / 2 - 0.1, h + 0.62)], accent, 0.03, smooth=False)


def chain_fence(points, height=2.2, glow="teal", gap=3, w=0.04):
    """Posts, a mesh-dark mid rail, and a bright lit top rail."""
    for p in points[::gap]:
        rod(p, p + Vector((0, 0, height)), 0.05, "steel", 6)
    tube([p + Vector((0, 0, height)) for p in points], glow, w, smooth=False)
    tube([p + Vector((0, 0, height * 0.5)) for p in points], "steel", 0.014, smooth=False)
    tube([p + Vector((0, 0, 0.12)) for p in points], "steel", 0.012, smooth=False)


def glow_band(y, x0, x1, material, h=2.5, z=0.0):
    """A faint distant town glow: a long low emissive strip on the horizon."""
    box(((x0 + x1) / 2, y, z + h / 2), (x1 - x0, 2.0, h), material, 0)


def row(a, b, n):
    return [Vector(a).lerp(Vector(b), i / (n - 1)) for i in range(n)]


# ── curb ───────────────────────────────────────────────────────────────────


def curb():
    """Trash night on your street. Somebody's junk is your engine."""
    P.ground(300, "grass")
    slab(-100, -16, 100, -3.9, "asphalt", 0.0, 0.2)
    slab(-100, -3.9, 100, 0.0, "concrete", 0.1, 0.2)
    box((0, -3.85, 0.1), (200, 0.35, 0.22), "concrete", 0.02)
    # The lit kerb line: the scene's leading line.
    tube([Vector((-60, -4.03, 0.215)), Vector((60, -4.03, 0.215))], "teal_dim", 0.04, smooth=False)
    P.flat_line([Vector((-60, -10.5, 0)), Vector((60, -10.5, 0))], 0.14, "ice_dim", 0.02, closed=False)
    slab(-100, 0, 100, 40, "grass", 0.0, 0.1)
    homes((-22, -6, 10, 26, 40), 12.5, seed=3)
    for x in (-12, 4, 18):
        P.tree(x, 4.5, 4.5, "round")
    # The pile, under the street lamp: bin, washer, TV, mattress, mower, tyres, bags.
    wheelie(-3.4, -2.2, 0.15)
    wheelie(-5.2, -2.0, -0.1, (1.0, 1.0, 1.2))
    washer(-1.5, -2.7, -math.pi / 2 + 0.3)
    box_tv(0.4, -3.0, -math.pi / 2 - 0.3)
    box_tv(0.3, -3.0, -math.pi / 2 + 0.2, z=0.55)
    mattress(2.3, -2.5, 0.15)
    P.place(V.riding_mower, 3.9, -3.0, math.pi - 0.35, scale=1.3)
    engine_block(-0.4, -1.2, 0.0, 0.5)
    tyre_pile(0.9, -1.4, 3)
    wheel_rim(-2.4, -1.0)
    for bx, by, s in ((-2.6, -3.3, 0.5), (-0.6, -3.5, 0.42), (1.6, -3.4, 0.45), (-0.2, -2.0, 0.4), (5.0, -3.4, 0.4)):
        bag(bx, by, s)
    # Lamps and parked cars across the street.
    lamp(7.0, -3.7, 6.0, (2.0, -2.8, 0), 4200, (-1, 0.2), 45)
    lamp(-9, -3.7, 6.0, (-9, -2.8, 0), 2500, (1, 0.2), 45)
    lamp(14, -3.7, 6.0, (14, -2.8, 0), 2500, (-1, 0.2), 45)
    P.car(-10.5, -8.0, 0.02, "enamel", (1.3, 1.1, 1.0), tail=True)
    P.car(9, -8.2, math.pi, "oxblood", (1.2, 1.1, 1.1), lights=True)
    scene(*SIZE, location=(-4.2, -7.6, 2.0), target=(1.6, -2.6, 0.8), lens=30, rim=0.6, exposure=1.1)


# ── yards ──────────────────────────────────────────────────────────────────


def yards():
    """Sheds, side yards and Mr. Pruitt's 'collection'. Ask first."""
    P.ground(300, "grass")
    slab(-14, -14, 8, 11, "dirt", 0.0, 0.08)
    # A house flank on the left with a lit kitchen window and porch light.
    box((-9.5, 3.0, 2.6), (7, 14, 5.2), "enamel", 0.04)
    for k, z in enumerate((2.0, 3.8)):
        box((-5.95, -1.0 + k * 2.2, z), (0.04, 1.1, 1.0), "ice_soft" if k else "fuchsia_soft", 0)
    box((-5.95, 3.5, 1.1), (0.04, 1.0, 2.2), "ice_soft", 0)
    spot(-5.3, 1.2, 3.3, (-1.5, 0.8, 0), 1800, 50)
    # Fence down the right and across the back, lit cap.
    P.fence_line([Vector((6.5, -12, 0)), Vector((6.5, 10, 0))], 1.7, "wood", post_gap=2, cap="teal")
    P.fence_line([Vector((-6, 10, 0)), Vector((6.5, 10, 0))], 1.7, "wood", post_gap=2, cap="teal")
    # Mr. Pruitt's shed: doors open, lit inside.
    P.shed(1.5, 6.5, 6.0, 4.0, 2.8, 0.0, "steel", window=None)
    box((1.5, 4.46, 1.25), (2.4, 0.05, 2.3), "teal_soft", 0)
    kit.point((1.5, 3.8, 1.8), 25, kit.ICE, 0.2)
    tube([Vector((0.3, 4.43, 0.1)), Vector((0.3, 4.43, 2.4)), Vector((2.7, 4.43, 2.4)), Vector((2.7, 4.43, 0.1))], "teal", 0.035, smooth=False)
    for sx in (-0.5, 3.5):
        box((sx, 4.35, 1.1), (0.7, 0.08, 2.2), "wood", 0.01, (0, 0, 0.9 if sx < 1 else -0.9))
    # The collection.
    engine_block(-1.5, 2.5, 0, 0.3)
    engine_block(-0.6, 3.0, 0, -0.2)
    engine_block(-2.0, 1.4, 0, 0.9)
    for i, (x, y) in enumerate(((3.0, 2.8), (3.9, 3.4), (4.6, 2.4), (2.5, 3.6))):
        wheel_rim(x, y)
        if i % 2:
            tyre(x + 0.1, y - 0.3)
    box((4.6, 0.0, 0.6), (1.6, 1.0, 1.0), "canvas", 0.2, (0, 0, 0.3))  # tarp mound
    box((4.6, 0.0, 1.05), (0.9, 0.5, 0.2), "canvas", 0.1, (0, 0, 0.3))
    tyre_pile(-1.0, -1.8, 3, 0.3)
    P.place(V.push_mower, -3.4, -1.2, 0.5, scale=1.4)
    box((-4.0, 6.0, 0.4), (1.8, 0.9, 0.8), "steel", 0.06)  # chest freezer
    box((-4.0, 6.0, 0.82), (1.8, 0.9, 0.05), "teal_soft", 0)
    for bx in (3.0, 3.4, 3.8):  # leaning bike frames
        kit.torus((bx, 6.9, 0.45), 0.42, 0.025, "steel", (math.pi / 2, 0, 0))
        kit.torus((bx, 7.9, 0.45), 0.42, 0.025, "steel", (math.pi / 2, 0, 0))
    # Over the fence: another shed, a house, trees.
    P.shed(12, 5.0, 4.0, 3.0, 2.4, 0.2, "enamel", window="ice_soft")
    homes((18,), 15, seed=5)
    for x, y, h in ((9.5, 9, 4.5), (14, -3, 5), (-12, -6, 5), (10.5, -8, 4)):
        P.tree(x, y, h)
    P.car(2.5, -9.5, 0.15, "oxblood", (1.2, 1.1, 1.1), wear=1, scale=0.9, tail=True)
    spot(0, -16, 7.5, (0, -1.0, 0), 4500, 55)
    scene(*SIZE, location=(0.6, -10.5, 4.6), target=(0.4, 3.0, 1.0), lens=30, rim=0.45)


# ── junkyard ───────────────────────────────────────────────────────────────


def hulks(rows, seed=4):
    """Rows of dark wrecks (real sedans), some on blocks, some stacked."""
    random.seed(seed)
    paints = (("oxblood", (1.0, 1.1, 1.1)), ("enamel", (1.0, 1.0, 1.2)), ("steel", None), ("oxblood", (1.5, 1.2, 1.2)),
              ("enamel", (1.3, 1.3, 1.5)), ("rust", None))
    for ry, (y, n, x0, step) in enumerate(rows):
        for k in range(n):
            x = x0 + k * step + random.uniform(-0.4, 0.4)
            body, tint = paints[(k * 2 + ry) % len(paints)]
            rot = math.pi / 2 + random.uniform(-0.12, 0.12)
            P.car(x, y, rot, body, tint, wheels=random.random() < 0.45, wear=1)
            if random.random() < 0.5:
                b2, t2 = paints[(k + ry * 3 + 1) % len(paints)]
                P.car(x + 0.1, y, rot + random.uniform(-0.1, 0.1), b2, t2, wheels=False, wear=1, z=1.35,
                      scale=(1.0, 1.0, 0.7))


def junkyard():
    """Rows of wrecks and a dog named Carburetor. Bring a trailer."""
    P.ground(300, "dirt")
    slab(-26, -12, 26, 15, "dirt", 0.01, 0.1)
    hulks(((-5.0, 6, -14, 5.6), (1.5, 6, -13, 5.8), (8.0, 5, -12, 6.2)))
    # The perimeter: a bright teal fence line on all four sides.
    chain_fence(row((-26, -12, 0), (26, -12, 0), 27), 2.2, "steel", 3, 0.03)
    chain_fence(row((-26, 15, 0), (26, 15, 0), 27), 2.2, "teal", 3, 0.07)
    chain_fence(row((-26, -12, 0), (-26, 15, 0), 14), 2.2, "teal", 3, 0.07)
    chain_fence(row((26, -12, 0), (26, 15, 0), 14), 2.2, "teal", 3, 0.07)
    # The office: a lit window and a fuchsia sign bar. Carburetor's doghouse.
    P.shed(-16, -9.0, 6.0, 3.4, 2.8, 0.0, "enamel", sign=None, window="ice_soft")
    neon([(-18.6, -10.78, 3.3), (-13.4, -10.78, 3.3)], "fuchsia", 0.1)
    P.shed(-9.0, -10.2, 1.6, 1.4, 1.0, 0.0, "wood", window=None)
    box((-9.0, -10.95, 0.5), (0.6, 0.05, 0.6), "ice_soft", 0)
    # A gantry crane over the back rows with a lit top beam.
    for cx in (12, 22):
        for cy in (11.5, 15.0):
            rod((cx, cy, 0), (cx, cy, 8.0), 0.18, "steel", 8)
    box((17, 11.5, 8.0), (11, 0.3, 0.35), "steel", 0.02)
    box((17, 15.0, 8.0), (11, 0.3, 0.35), "steel", 0.02)
    box((17, 13.2, 8.0), (11, 3.8, 0.2), "steel", 0.02)
    tube([Vector((11.5, 11.3, 8.25)), Vector((22.5, 11.3, 8.25))], "teal", 0.06, smooth=False)
    neon([(11.5, 15.2, 8.25), (22.5, 15.2, 8.25)], "fuchsia", 0.06)
    # Tyre piles and drums in the foreground.
    for x in (-4, 3, 9):
        tyre_pile(x, -9.4, 5, 0.38)
    for x, y in ((14, -9), (15.2, -9.3), (14.6, -8.2)):
        rod((x, y, 0), (x, y, 0.95), 0.34, "rust", 14)
    # Small pools of light: tall poles with tight spots.
    for x, y, aim in ((-24, -10, (-8, -4, 0)), (24, -10, (8, -4, 0)), (-24, 13, (-8, 6, 0)), (24, 13, (8, 6, 0)),
                      (0, 4.3, (0, 2.0, 0))):
        P.light_pole(x, y, 8.5, aim, power=7500, heads=2, spread=36)
    spot(0, -22, 11, (0, 0, 0), 5000, 45)
    scene(*SIZE, location=(0, -19.5, 9.0), target=(0, 3.0, 0.5), lens=30, rim=0.55, exposure=0.95)


# ── floodplain ─────────────────────────────────────────────────────────────


def floodplain():
    """Free trailer-lot salvage."""
    P.ground(400, "dirt")
    # The river: a dark band along the back with a levee in front of it.
    box((0, 17, -0.05), (300, 18, 0.2), "water", 0)
    box((0, 7.0, 0.6), (300, 3.0, 1.2), "concrete", 0.05)
    slab(-200, 26, 200, 300, "grass", 0.0, 0.2)  # a dark far bank
    tube([Vector((-80, 5.45, 1.25)), Vector((80, 5.45, 1.25))], "teal", 0.05, smooth=False)
    # Lamp reflections on the water: broken teal streaks below each pole and the bridge rails.
    rnd = random.Random(9)
    for lx in (-22, -6, 16, 14.5, 12.5):
        for k in range(7):
            ry = 9.5 + k * 2.1
            box((lx + rnd.uniform(-0.25, 0.25), ry, 0.075), (rnd.uniform(0.3, 0.8), rnd.uniform(0.8, 2.2), 0.02),
                "teal" if k % 2 == 0 else "fuchsia_dim", 0)
    # A road bridge across the river with lit rails.
    box((14, 17, 5.0), (3.5, 20, 0.4), "concrete", 0.03)
    for dx in (-1.6, 1.6):
        tube([Vector((14 + dx, 7, 5.6)), Vector((14 + dx, 27, 5.6))], "teal", 0.05, smooth=False)
    for y in (9, 17, 25):
        rod((14, y, -0.2), (14, y, 4.8), 0.3, "concrete", 8)
    # Trailers on the lot, nudged and tilted by past floods.
    random.seed(21)
    layout = [(-18, -1, 0.1, "steel", None), (-8.5, 2.5, -0.15, "enamel", (1.0, 1.0, 1.4)), (1.5, -1.5, 0.05, "steel", None),
              (12, 2.0, 0.2, "oxblood", (1.0, 1.1, 1.1)), (-14, -9, -0.2, "enamel", (1.2, 1.1, 1.0)), (-2, -9.5, 0.12, "steel", None),
              (9, -9, -0.1, "enamel", (1.0, 1.0, 1.3)), (20, -6, 0.3, "oxblood", (1.3, 1.2, 1.2))]
    for i, (x, y, r, b, t) in enumerate(layout):
        trailer(x, y, r, b, t, tilt=random.uniform(-0.03, 0.03), glow=random.random() < 0.85,
                accent=("teal" if i % 3 == 0 else "fuchsia" if i % 3 == 1 else None))
    # Flood-line stakes with teal tips, and dark mud puddles.
    for x in range(-24, 28, 4):
        rod((x, 5.4, 0), (x, 5.4, 1.2), 0.04, "steel", 6)
        box((x, 5.4, 1.25), (0.1, 0.1, 0.14), "teal", 0)
    for x, y, s in ((-4, -5, 1.6), (6, -4.5, 2.2), (-13, -4, 1.4), (14, -13, 2.0)):
        kit.ball((x, y, 0.02), s, "water", (1.4, 1, 0.03))
    for x, y in ((-20, -13), (4, -14), (17, -12)):
        tyre_pile(x, y, 3)
    for x, y, r, b, t in ((-5, -14, 0.2, "oxblood", (1.0, 1.1, 1.1)), (8, -5.5, 1.2, "enamel", (1.1, 1.1, 1.2))):
        P.car(x, y, r, b, t, wheels=False, wear=1)
    for x, y in ((-22, 6), (-6, -3), (16, -2)):
        P.light_pole(x, y, 8.5, (x, y - 3, 0), power=7500, heads=2, spread=36)
    glow_band(60, -150, 150, "teal_soft", 0.6)
    spot(0, -22, 11, (0, 0, 0), 14000, 55)
    scene(*SIZE, location=(0, -26, 10.5), target=(0, 3.5, 0.5), lens=32, rim=0.5, exposure=0.9)


# ── quarry_breakers ────────────────────────────────────────────────────────


def pump(x, y, rot=0.0):
    """A pump on a skid: finned motor, banded barrel, pipework and a teal gauge ring."""
    at = P.frame(x, y, rot)
    box(at(0, 0, 0.2), (3.4, 1.8, 0.3), "cast", 0.03, (0, 0, rot))
    box(at(-1.0, 0, 1.0), (1.2, 0.8, 0.8), "enamel", 0.05, (0, 0, rot))  # motor housing
    for k in range(6):
        box(at(-1.5 + k * 0.2, 0, 1.0), (0.05, 0.95, 0.85), "steel", 0.01, (0, 0, rot))  # fins
    rod(at(0.2, 0, 0.95), at(1.3, 0, 0.95), 0.5, "steel", 20)
    for k in range(3):
        rod(at(0.4 + k * 0.35, 0, 0.95), at(0.46 + k * 0.35, 0, 0.95), 0.53, "cast", 20)
    tube([at(1.3, 0, 1.4), at(1.3, 0, 2.2), at(2.8, 0, 2.2), at(2.8, 0, 0.3)], "steel", 0.15, smooth=False)
    kit.torus(at(0.75, -0.55, 0.95), 0.12, 0.02, "teal", (math.pi / 2, 0, rot), 24)
    kit.point(at(-1.0, 0, 1.8), 25, kit.FUCHSIA, 0.1)
    box(at(-1.0, 0, 1.5), (0.18, 0.18, 0.12), "fuchsia", 0, (0, 0, rot))


def rig(x, y, rot=0.0, tint=None):
    """A service truck: ladder frame, boxy cab, flatbed with a crane boom, lit work strip."""
    def build():
        paint = V.paint("enamel", tint)
        box((0, 0, 0.9), (7.2, 1.5, 0.3), "cast", 0.04)
        V.loft([(1.6, 1.05, 3.0, 1.1, 1.0), (2.5, 1.05, 3.1, 1.1, 1.0), (3.2, 1.05, 2.4, 1.1, 1.0), (3.45, 1.05, 1.6, 1.1, 1.0)], paint, 0.05)
        box((2.2, 0, 2.5), (1.2, 2.3, 0.8), "glass", 0.04)
        box((3.5, 0, 1.2), (0.12, 1.5, 0.3), "cast", 0.02)
        for sy in (-0.7, 0.7):
            box((3.5, sy, 1.55), (0.06, 0.3, 0.14), "ice_soft", 0)
        box((-1.4, 0, 1.2), (4.2, 2.3, 0.2), "steel", 0.03)
        for sy in (-1.15, 1.15):
            box((-1.4, sy, 1.55), (4.2, 0.08, 0.5), paint, 0.02)
        tube([Vector((-3.5, -1.2, 1.35)), Vector((0.6, -1.2, 1.35))], "teal", 0.04, smooth=False)
        box((-0.4, 0, 1.6), (0.7, 0.7, 0.6), "cast", 0.03)
        rod((-0.4, 0, 1.7), (-2.4, 0, 4.4), 0.14, "steel", 8)
        rod((-2.4, 0, 4.4), (-4.4, 0, 3.4), 0.1, "steel", 8)
        rod((-4.4, 0, 3.4), (-4.4, 0, 2.2), 0.015, "steel", 6)
        box((-0.3, 0, 3.15), (0.2, 0.2, 0.12), "fuchsia", 0)
        for wx in (-2.6, -1.3, 2.4):
            for side in (-1, 1):
                V.wheel(wx, side * 0.95, 0.6, 0.6, 0.42, side, "steel", 6, dish=0.3)
    P.place(build, x, y, rot)
    kit.point(P.frame(x, y, rot)(-0.3, 0, 4.0), 15, kit.FUCHSIA, 0.1)


def quarry_breakers():
    """Pay to pick over the mine's obsolete pumps and service rigs."""
    P.ground(400, "dirt")
    # Stepped quarry face: dark benches, each with a lit teal lip.
    for y, h in ((16, 4), (23, 8), (31, 13), (40, 19)):
        box((0, y, h / 2), (110, 7, h), "concrete", 0.2)
        tube([Vector((-55, y - 3.6, h + 0.05)), Vector((55, y - 3.6, h + 0.05))], "teal_dim", 0.06, smooth=False)
    tube([Vector((-55, 12.4, 4.05)), Vector((55, 12.4, 4.05))], "teal", 0.07, smooth=False)
    slab(-30, -14, 30, 15, "dirt", 0.01, 0.1)
    # Pond with a teal edge.
    box((-10, 11, 0.0), (22, 7, 0.1), "water", 0)
    tube([Vector((-21, 7.4, 0.08)), Vector((1, 7.4, 0.08))], "teal", 0.04, smooth=False)
    # Headframe of the old mine shaft.
    for dx, dy in ((-2, -1.5), (2, -1.5), (-2, 1.5), (2, 1.5)):
        rod((24 + dx, 10 + dy, 0), (24, 10, 14), 0.15, "steel", 8)
    for z in (4, 7, 10):
        tube([Vector((24 - 2 + z * 0.1, 8.5, z)), Vector((24 + 2 - z * 0.1, 8.5, z)), Vector((24 + 2 - z * 0.1, 11.5, z)),
              Vector((24 - 2 + z * 0.1, 11.5, z))], "teal", 0.05, cyclic=True, smooth=False)
    kit.arc((24, 8.4, 14.5), 1.2, "y", "steel", 0.1)
    kit.point((24, 8.0, 14.8), 60, kit.FUCHSIA, 0.2)
    box((24, 8.0, 14.7), (0.5, 0.5, 0.3), "fuchsia", 0)
    # Pumps lined up for sale, rigs behind them.
    for k, x in enumerate((-17, -9.5, -2, 5.5)):
        pump(x, -4 + (k % 2) * 1.2, 0.1 * (k - 1.5))
    for k, x in enumerate((-15, -3, 8)):
        rig(x, 4.0 + (k % 2) * 1.2, 0.12 + 0.2 * (k - 1), (1.1, 1.0, 1.4) if k % 2 else (1.4, 0.9, 0.9))
    # The breaker house: a big shed with a lit roller door and a teal sign bar.
    P.shed(16.5, -3.5, 8.0, 5.0, 4.5, 0.0, "steel", sign=None, window=None)
    box((16.5, -6.04, 1.8), (4.6, 0.05, 3.2), "ice_soft", 0)
    tube([Vector((14.1, -6.1, 0.1)), Vector((14.1, -6.1, 3.5)), Vector((18.9, -6.1, 3.5)), Vector((18.9, -6.1, 0.1))], "teal", 0.06, smooth=False)
    neon([(13.0, -6.1, 4.2), (20.0, -6.1, 4.2)], "fuchsia", 0.09)
    kit.point((16.5, -7.4, 2.6), 160, kit.ICE, 0.3)
    # Pipe racks and barrels in front with teal bands.
    for k in range(3):
        tube([Vector((-24, -10 + k * 0.5, 0.3 + k * 0.45)), Vector((-12, -10 + k * 0.5, 0.3 + k * 0.45))], "steel", 0.22, smooth=False)
    for x in (-3, -2, 0, 1):
        rod((x, -10, 0), (x, -10, 0.9), 0.35, "rust", 14)
        tube([Vector((x - 0.36, -10, 0.55)), Vector((x + 0.36, -10, 0.55))], "teal", 0.02, smooth=False)
    for x, y, aim in ((-26, -10, (-12, -5, 0)), (26, -10, (12, -5, 0)), (-26, 13, (-12, 6, 0)), (-5, 14, (-5, 5, 0)), (12, 12, (12, 5, 0))):
        P.light_pole(x, y, 10, aim, power=8000, heads=2, spread=36)
    glow_band(70, -200, 200, "teal_soft", 3.0, 6.0)
    spot(0, -22, 10, (0, 0, 0), 6000, 50)
    scene(*SIZE, location=(0, -14, 6.8), target=(0, 1.5, 1.0), lens=30, rim=0.5, exposure=0.95)


# ── auction ────────────────────────────────────────────────────────────────


def auction():
    """Saturday lots from insurance write-offs."""
    P.ground(400, "asphalt")
    random.seed(33)
    paints = (("enamel", (1.0, 1.0, 1.3)), ("oxblood", (1.0, 1.1, 1.1)), ("steel", None), ("enamel", (1.3, 1.1, 1.0)),
              ("oxblood", (1.4, 1.2, 1.2)), ("enamel", (0.9, 1.1, 1.5)))
    for ry, y in enumerate((-8.0, -1.5, 5.0)):
        # Lit row line under each rank of cars: the lot's grid.
        P.flat_line(row((-25, y - 2.2, 0), (24, y - 2.2, 0), 8), 0.07, "teal_dim", 0.02, closed=False)
        for k in range(8):
            x = -21 + k * 5.6
            body, tint = paints[(k + ry * 2) % len(paints)]
            P.car(x, y, math.pi / 2 + random.uniform(-0.03, 0.03), body, tint, scale=0.95)
        box((-26.5, y, 0.75), (0.1, 1.2, 1.1), "cast", 0.02)
        box((-26.58, y, 0.75), (0.04, 1.0, 0.9), "teal_soft", 0)
    # The pavilion at the back: open sides, a lit block, bidders, a fuchsia sign bar.
    box((0, 12.5, 3.4), (22, 6, 0.25), "steel", 0.03)
    for dx in (-10.5, 10.5):
        for dy in (9.6, 15.4):
            rod((dx, dy, 0), (dx, dy, 3.3), 0.1, "steel", 8)
    neon([(-11, 9.35, 3.45), (11, 9.35, 3.45)], "fuchsia", 0.09)
    neon([(-11, 9.35, 3.05), (11, 9.35, 3.05)], "teal", 0.04)
    box((0, 13.8, 0.4), (5, 2.2, 0.8), "concrete", 0.03)
    box((0, 13.8, 1.0), (0.8, 0.6, 0.5), "wood", 0.02)
    P.blocks([Vector((x * 1.1 - 8, 10.5 + (x % 2) * 1.2, 0.8)) for x in range(14)], (0.4, 0.4, 1.6), "canvas")
    kit.point((0, 11.5, 2.8), 500, kit.ICE, 0.3)
    kit.point((-8, 11.5, 2.8), 220, kit.ICE, 0.3)
    kit.point((8, 11.5, 2.8), 220, kit.ICE, 0.3)
    chain_fence(row((-30, -14, 0), (30, -14, 0), 31), 2.2, "teal", 3, 0.03)
    chain_fence(row((-30, -14, 0), (-30, 14, 0), 15), 2.2, "teal", 3, 0.06)
    chain_fence(row((30, -14, 0), (30, 14, 0), 15), 2.2, "teal", 3, 0.06)
    for x in (-24, -8, 8, 24):
        for y, aim in ((-11.5, (x * 0.9, -9, 0)), (2.0, (x * 0.9, 0, 0))):
            P.light_pole(x, y, 8.5, aim, power=6500, heads=2, spread=34)
    scene(*SIZE, location=(0, -19.5, 8.5), target=(0, 3.0, 0.5), lens=30, rim=0.45, exposure=0.95)


# ── long_haul ──────────────────────────────────────────────────────────────


def long_haul():
    """An overnight run to the county scrapyard with the Beater's trunk empty."""
    P.ground(900, "grass")
    slab(-6.5, -30, 6.5, 400, "asphalt", 0.0, 0.2)
    # A lit edge line each side, reflective teal posts on the verges.
    P.flat_line([Vector((-5.8, -30, 0)), Vector((-5.8, 400, 0))], 0.2, "teal", 0.02, closed=False)
    P.flat_line([Vector((5.8, -30, 0)), Vector((5.8, 400, 0))], 0.2, "teal", 0.02, closed=False)
    for k in range(60):
        y = -25 + k * 7.5
        box((0, y + 1.5, 0.03), (0.15, 3.0, 0.02), "ice_dim", 0)
    for k in range(40):
        y = -20 + k * 11
        for sx in (-7.4, 7.4):
            rod((sx, y, 0), (sx, y, 0.9), 0.04, "steel", 6)
            box((sx, y, 0.95), (0.12, 0.04, 0.16), "fuchsia" if k % 2 else "teal", 0)
    for sx in (-8.4, 8.4):
        tube([Vector((sx, -28, 0.7)), Vector((sx, 200, 0.7))], "alloy", 0.09, smooth=False)
    for y in (60, 130):
        for sx in (-8.0, 8.0):
            rod((sx, y, 0), (sx, y, 6.0), 0.15, "steel", 8)
        box((0, y, 6.0), (17, 0.3, 1.6), "cast", 0.03)
        box((0, y - 0.2, 6.0), (13, 0.04, 0.8), "teal_soft", 0)
        tube([Vector((-6.5, y - 0.22, 5.6)), Vector((6.5, y - 0.22, 5.6))], "teal", 0.05, smooth=False)
    random.seed(3)
    for y in range(-10, 300, 12):
        P.tree(-14 + random.uniform(-4, 3), y, random.uniform(5, 8), "pine")
        P.tree(14 + random.uniform(-3, 5), y + 5, random.uniform(5, 8), "pine")
    glow_band(390, -250, 250, "teal_soft", 1.0)
    glow_band(392, 20, 180, "fuchsia_soft", 2.0, 1.0)
    # The Beater from behind, headlights throwing a tight beam down the road.
    P.car(0, 0, math.pi / 2, "oxblood", (1.3, 1.4, 1.4), lights=True, wear=1)
    kit.flood((0.7, 3.0, 0.8), (0.7, 40, 0), 9000, kit.ICE, 30)
    kit.flood((-0.7, 3.0, 0.8), (-0.7, 40, 0), 9000, kit.ICE, 30)
    kit.point((0, -2.9, 1.0), 14, kit.FUCHSIA, 0.3)
    for y, x in ((120, -2.8), (200, -2.6)):
        for dx in (-0.6, 0.6):
            box((x + dx, y, 0.7), (0.3, 0.1, 0.2), "ice", 0)
    scene(*SIZE, location=(0.0, -12.0, 3.3), target=(0.1, 16, 1.4), lens=32, rim=0.5)


SCENES = {"curb": curb, "yards": yards, "junkyard": junkyard, "floodplain": floodplain,
          "quarry_breakers": quarry_breakers, "auction": auction, "long_haul": long_haul}

if __name__ == "__main__":
    wanted = kit.args()
    for name, build in SCENES.items():
        if wanted and name not in wanted:
            continue
        kit.reset(seed=23)
        build()
        kit.render("places", name, samples=SAMPLES)
