"""Venue scenes: the five race venues, seen from a drone at night.

Progression: a mower track round a back yard, a dirt oval behind the feed
store, the county fair half-mile, a regional paved oval, the state track.
Each is bigger, better lit and more crowded than the one before.

    blender --background --factory-startup --python scripts/art/render_venues.py -- [venue_id ...]
"""
import math
import os
import random
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import kit  # noqa: E402
import props as P  # noqa: E402
from kit import box, rod, tube  # noqa: E402
from mathutils import Vector  # noqa: E402

SIZE = (960, 512)  # 2x the shipped 480x256
SAMPLES = int(os.environ.get("ART_SAMPLES", 128))


def paved_edges(centre, width, line="ice_dim"):
    """Edge and centre lines on a paved track."""
    P.flat_line(P.offset(centre, width / 2 - 0.25), 0.14, line, 0.025)
    P.flat_line(P.offset(centre, -width / 2 + 0.25), 0.14, line, 0.025)


def trees_ring(seed, boxes, pines=0.4, lo=3, hi=6):
    random.seed(seed)
    for area in boxes:
        P.scatter(area[4] if len(area) > 4 else 18, area[:4],
                  lambda x, y: P.tree(x, y, random.uniform(lo, hi), "pine" if random.random() < pines else "round"))


# ── 1. Backyard Derby ──────────────────────────────────────────────────────


def backyard():
    """A lap around the Hendersons' yard. Mind the birdbath."""
    P.ground(300, "grass")
    # Back-yard lawn is a touch lighter: a patch of concrete patio and the mown path.
    centre = P.loop(9.5, 4.6, 120, squareness=0.2, cy=-0.8)
    P.track(centre, 2.4, "dirt")
    P.flat_line(P.offset(centre, 1.2), 0.08, "teal_dim", 0.03)
    P.flat_line(P.offset(centre, -1.2), 0.08, "teal_dim", 0.03)
    # Tyre markers half buried round the path, with a painted ring.
    for i, p in enumerate(P.offset(centre, -1.45)[::8]):
        P.tyre_stack(p.x, p.y, 1 + (i % 2), ring="teal_dim" if i % 3 else "fuchsia_dim")
    # The yard: back fence, side fences, front fence (low, so we see in).
    back_y, front_y, left_x, right_x = 8.6, -9.0, -14.5, 14.5
    P.fence_line([Vector((left_x, front_y, 0)), Vector((left_x, back_y, 0)), Vector((right_x, back_y, 0)),
                  Vector((right_x, front_y, 0))], 1.7, "wood", cap="teal_dim", post_gap=1)
    P.fence_line([Vector((left_x, front_y, 0)), Vector((-4, front_y, 0))], 0.9, "wood")
    P.fence_line([Vector((4, front_y, 0)), Vector((right_x, front_y, 0))], 0.9, "wood")
    # The house, back door facing the yard, lit windows and a porch light.
    P.house(-4.5, 14.5, 13, 6.5, 5.4, 0, "enamel")
    P.house(11.5, 15.5, 8, 5.5, 4.8, 0.05, "steel", glow=0.5)
    P.house(-18, 15, 7, 5, 4.5, -0.1, "oxblood", glow=0.4)
    kit.point((-1.5, 10.8, 3.2), 120, kit.ICE, 0.2)
    kit.flood((-1.5, 11.0, 4.2), (-1.5, -2, 0), 2500, kit.ICE, 70)
    # Patio, grill glowing with heat, picnic table, string lights.
    box((-7.5, 8.0, 0.04), (7.5, 3.0, 0.08), "concrete", 0)
    box((-9.0, 7.5, 0.5), (1.5, 0.8, 0.9), "cast", 0.04)
    box((-9.0, 7.5, 0.97), (1.2, 0.5, 0.06), "fuchsia_dim", 0)
    kit.point((-9.0, 7.5, 1.4), 25, kit.FUCHSIA, 0.1)
    box((-5.0, 7.6, 0.75), (2.2, 0.9, 0.08), "wood", 0.01)
    for dx in (-0.9, 0.9):
        box((-5.0 + dx, 7.6, 0.37), (0.1, 1.2, 0.74), "wood", 0, (0, 0, 0))
    pole_a, pole_b = Vector((-14.0, -3.0, 4.2)), Vector((-1.5, 10.6, 4.4))
    rod((pole_a.x, pole_a.y, 0), pole_a, 0.06, "wood", 8)
    P.string_lights(pole_a, (-4.5, 10.8, 4.6), 0.9, 14)
    P.string_lights((-4.5, 10.8, 4.6), pole_b, 0.4, 8)
    P.string_lights((-1.5, 10.6, 4.4), (9.0, 8.5, 3.2), 0.8, 12, "fuchsia_dim")
    rod((9.0, 8.5, 0), (9.0, 8.5, 3.3), 0.06, "wood", 8)
    for p in ((-10.5, 8.2, 3.6), (-2.0, 10.4, 4.0), (5.0, 9.2, 3.6)):
        kit.point(p, 55, kit.ICE, 0.12)
    # The birdbath, planted in the infield at the inner corner of turn two.
    bx, by = 3.8, 1.4
    kit.cone((bx, by, 0.4), 0.26, 0.14, 0.8, "concrete")
    kit.torus((bx, by, 0.85), 0.5, 0.1, "concrete")
    kit.cone((bx, by, 0.84), 0.45, 0.45, 0.04, "water", vertices=24)
    kit.arc((bx, by, 0.92), 0.5, "z", "ice_dim", 0.015)
    # Swing set, kiddie pool and a lawn chair as infield furniture.
    for sx in (-11.0, -8.6):
        rod((sx, -6.2, 0), (sx + 0.7, -5.6, 2.2), 0.04, "steel", 6)
        rod((sx, -5.0, 0), (sx + 0.7, -5.6, 2.2), 0.04, "steel", 6)
    rod((-10.9, -5.6, 2.2), (-8.0, -5.6, 2.2), 0.04, "steel", 6)
    kit.torus((9.0, -6.0, 0.18), 1.3, 0.14, "plastic")
    kit.arc((9.0, -6.0, 0.36), 1.3, "z", "teal_dim", 0.015)
    # A lawn-mower racing field: three little cars on the path, headlights on.
    P.cars_on_loop(centre, [(12, "enamel", (1, 1, 1)), (19, "oxblood", (1.7, 0.6, 0.8)),
                            (88, "enamel", (0.6, 1.3, 1.7))], scale=0.5)
    kit.flood((-0.0, -12.0, 7.0), (0, 0.5, 0), 14000, kit.ICE, 80)
    for x in (-12, 12):
        P.light_pole(x, -8.5, 5.5, (x * 0.2, 0, 0), power=5000, heads=1)
    trees_ring(5, [(-40, 20, 40, 45, 16), (-40, -40, -16, 18, 8), (16, -40, 40, 18, 8)], 0.3, 4, 8)
    kit.scene_rig(*SIZE, location=(0, -20, 11), target=(0, 3.0, 0), lens=30)


# ── 2. Dirt Track ──────────────────────────────────────────────────────────


def dirt():
    """A quarter-mile oval behind the feed store. Friday nights."""
    P.ground(300, "grass")
    centre = P.loop(11, 6.2, 180, squareness=0.25)
    P.track(centre, 3.4, "dirt")
    infield = P.offset(centre, -1.7)
    P.wall(P.offset(centre, 1.85), 0.45, "concrete", 0.18, cap="teal")
    P.catch_fence(P.offset(centre, 2.1), 1.4, every=5, glow=None)
    for p in infield[::9]:
        kit.torus((p.x, p.y, 0.1), 0.22, 0.08, "rubber")
    P.flat_line(P.offset(centre, -1.0), 0.07, "teal_dim", 0.03)
    # Feed store behind turn one, sign bar in fuchsia.
    P.shed(-5, 11.5, 7, 4, 3.2, 0, "oxblood", sign="fuchsia", window="ice_dim")
    P.shed(3.5, 12, 3, 3, 2.4, 0.1, "steel", window=None)
    box((8.5, 11.5, 2.5), (1.6, 1.6, 5), "cast", 0.05)  # grain bin
    kit.cone((8.5, 11.5, 5.4), 1.0, 0.1, 0.8, "steel")
    box((11.5, 12.2, 1.2), (1.4, 1.4, 2.4), "steel", 0.05)
    # Bleachers with a Friday-night crowd, and one more behind the wall.
    P.grandstand(0, -9.0, 10, rows=4, rot=math.pi, roof=False, crowd=0.55)
    P.grandstand(-2, 9.6, 12, rows=3, rot=0, roof=False, crowd=0.45)
    # Infield: a flag stand, a lit scoreboard, a few more tyres.
    box((-8.5, 0, 1.0), (0.12, 0.12, 2.0), "steel", 0)
    box((-8.5, 0.0, 2.2), (0.04, 0.9, 0.5), "ice_dim", 0)
    box((6.5, 1.0, 1.4), (0.2, 3.0, 1.4), "cast", 0.03)
    box((6.35, 1.0, 1.4), (0.04, 2.7, 1.1), "teal_dim", 0)
    for x, y in ((-14, -8.5), (14, -8.5), (-14, 8.5), (14, 8.5)):
        P.light_pole(x, y, 7.5, (x * 0.3, y * 0.3, 0), power=12000)
    # The field of eight: a pack through turn two, a few more down the back.
    spots = [(36, "enamel", (1, 1, 1)), (40, "oxblood", (1.8, 0.6, 0.8)), (44, "enamel", (0.6, 1.2, 1.6)),
             (48, "enamel", (1, 1, 1)), (52, "oxblood", (1, 1, 1)), (120, "enamel", (1.4, 1.4, 1.0)),
             (124, "enamel", (0.6, 0.9, 1.6)), (158, "oxblood", (1.8, 0.6, 0.8))]
    for k, (i, body, tint) in enumerate(spots):
        p, q = centre[i], centre[(i + 1) % len(centre)]
        heading = math.atan2(q.y - p.y, q.x - p.x) + (0.35 if i < 60 else 0)
        P.race_car(p.x, p.y, heading, body, tint, scale=0.75)
    # Pit trailers and a few trucks outside turn three, haulers with lit doors.
    for i in range(4):
        box((-17.5 - (i % 2) * 0.4, -4 + i * 2.6, 0.7), (4.2, 2.2, 1.4), "steel" if i % 2 else "enamel", 0.05)
        kit.point((-15, -4 + i * 2.6, 1.8), 25, kit.ICE, 0.1)
    for i in range(3):
        box((18.5, -3 + i * 3, 0.7), (4.4, 2.2, 1.4), "enamel" if i % 2 else "steel", 0.05)
        box((18.5 - 2.5, -3 + i * 3, 0.55), (0.9, 1.8, 1.1), "cast", 0.05)
        kit.point((16.4, -3 + i * 3, 1.8), 25, kit.ICE, 0.1)
    # A string of pit lights along the back wall and a dim fuchsia tower glow.
    P.string_lights((-14.5, 9.2, 3.0), (14.5, 9.2, 3.0), 0.8, 26, "ice_dim")
    kit.point((0, 20, 12), 1500, kit.FUCHSIA, 3)
    trees_ring(7, [(-45, 14, 45, 40, 40), (-45, -30, -21, 14, 18), (21, -30, 45, 14, 18)], 0.4)
    kit.scene_rig(*SIZE, location=(0, -23, 13.5), target=(0, 1.0, 0), lens=30)


# ── 3. County Fair ─────────────────────────────────────────────────────────


def county_fair():
    """Grandstands, funnel cake and Big Ron's five trophies."""
    P.ground(400, "grass")
    centre = P.loop(17.5, 6.0, 200, squareness=0.55)
    P.track(centre, 4.4, "dirt")
    P.flat_line(P.offset(centre, 2.0), 0.14, "ice_dim", 0.03)
    # Wall with a teal strip, and tyre stacks at the ends of the long straights.
    P.wall(P.offset(centre, 2.6), 0.6, "concrete", 0.2, cap="teal")
    P.catch_fence(P.offset(centre, 2.9), 1.6, every=5, glow=None)
    # Drag-strip start/finish tree on the near straight.
    for dx in (-0.7, 0.7):
        box((-2.0 + dx, -6.4, 1.2), (0.12, 0.12, 2.4), "steel", 0)
    box((-2.0, -6.4, 2.35), (1.8, 0.14, 0.14), "steel", 0)
    for k, m in enumerate(("fuchsia", "teal", "ice")):
        box((-2.0 - 0.45 + k * 0.45, -6.45, 2.35), (0.22, 0.04, 0.22), m, 0)
    # Grandstand on the far side with a roof, a second behind turn 1.
    P.grandstand(0, 9.8, 24, rows=8, rot=0, roof=True, crowd=0.65, trim="fuchsia", lamps=6)
    P.grandstand(-27, 2.0, 10, rows=5, rot=-math.pi / 2, roof=False, crowd=0.55)
    # The midway beyond the stands: ferris wheel, drop tower, tents, string lights.
    P.ferris_wheel(-15, 27, 6.6, 0.2)
    P.ferris_wheel(30, 29, 4.4, 0.5)
    box((6, 27, 5.5), (0.5, 0.5, 11), "steel", 0)
    for z in (3, 5, 7, 9):
        box((6, 27, z), (0.9, 0.9, 0.05), "teal_dim", 0)
    box((6, 27, 11.2), (1.3, 1.3, 0.4), "fuchsia", 0)
    for x, w in ((-28, 7), (-5, 6), (14, 8), (22, 5)):
        P.shed(x, 21.5, w, 4, 2.4, 0.03, random.choice(("oxblood", "enamel", "steel")), sign=random.choice(("fuchsia", "teal")), window="ice_dim")
    P.string_lights((-28, 19, 3.2), (-5, 19, 3.2), 1.0, 22, "ice_dim")
    P.string_lights((-5, 19, 3.2), (22, 19, 3.2), 1.0, 22, "fuchsia_dim")
    # Pit area: trucks and trailers along the near side, hauler lights.
    for i in range(5):
        box((-14 + i * 6.5, -12.2, 1.1), (4.6, 2.3, 2.2), "steel" if i % 2 else "enamel", 0.05)
        box((-14 + i * 6.5 + 2.8, -12.2, 0.7), (1.0, 1.9, 1.4), "cast", 0.05)
        kit.point((-14 + i * 6.5, -10.8, 2.4), 40, kit.ICE, 0.1)
    for x, y in ((-26, -9), (26, -9), (-26, 9), (26, 9), (0, -16), (-13, -16), (13, -16)):
        P.light_pole(x, y, 9.5, (x * 0.35, y * 0.2, 0), power=16000, heads=4)
    spots = [(70, "enamel", (1, 1, 1)), (74, "oxblood", (1.8, 0.6, 0.8)), (78, "enamel", (0.6, 1.2, 1.6)),
             (82, "enamel", (1, 1, 1)), (86, "oxblood", (1, 1, 1)), (96, "enamel", (1.4, 1.4, 1.0)),
             (170, "enamel", (1.6, 0.6, 1.2)), (176, "oxblood", (1.8, 0.6, 0.8))]
    P.cars_on_loop(centre, spots, scale=0.8)
    trees_ring(9, [(-60, 40, 60, 80, 30), (-60, -45, -34, 40, 14), (34, -45, 60, 40, 14)], 0.4)
    kit.point((0, 60, 18), 9000, kit.FUCHSIA, 4)
    kit.scene_rig(*SIZE, location=(0, -33, 19.5), target=(0, 9.5, 0), lens=30)


# ── 4. Regional Invitational ───────────────────────────────────────────────


def regional():
    """Three counties, one grid, and the Kessler twins."""
    P.ground(400, "grass")
    centre = P.loop(15.5, 8.8, 220, squareness=0.2)
    # Flat, technical paved oval: a wide asphalt ribbon with infield chicane tyres.
    P.track(centre, 5.0, "asphalt")
    paved_edges(centre, 5.0, "ice_dim")
    P.flat_line(P.offset(centre, 0.0), 0.06, "teal_dim", 0.025)
    P.wall(P.offset(centre, 3.0), 0.9, "concrete", 0.25, cap="ice_dim")
    P.wall(P.offset(centre, -2.9), 0.25, "concrete", 0.2, cap="fuchsia_dim")
    # Rumble kerbs at the apexes.
    for sx in (-1, 1):
        for sy in (-1, 1):
            for k in range(6):
                a = math.radians(30 + k * 5)
                x = sx * (15.5 - 2.5 + 0.0) * math.cos(a)
                y = sy * (8.8 - 2.5) * math.sin(a)
                box((x, y, 0.03), (0.5, 0.18, 0.04), "fuchsia_dim" if k % 2 else "ice_dim", 0, (0, 0, a * sx * sy))
    # Pit lane along the near straight, inside a paved apron, with garage bays.
    pit = [Vector((x, -13.2, 0)) for x in (-16, 16)]
    box((0, -13.4, 0.02), (36, 3.0, 0.04), "asphalt", 0)
    P.flat_line(pit, 0.12, "ice_dim", 0.03, closed=False)
    P.pit_row(0, -17.4, 8, 0)
    # Three-county pennants.
    for i, m in enumerate(("teal", "fuchsia", "ice")):
        x = -9 + i * 9
        rod((x, 12.8, 0), (x, 12.8, 9), 0.05, "steel", 6)
        box((x + 0.8, 12.8, 8.6), (1.4, 0.03, 0.7), m + "_dim" if m != "ice" else "ice_dim", 0)
    # A big roofed grandstand across the far side and a smaller one in the infield.
    P.grandstand(0, 14.2, 34, rows=9, rot=0, roof=True, crowd=0.7, trim="teal", lamps=8)
    P.grandstand(-28, 0, 12, rows=6, rot=-math.pi / 2, roof=False, crowd=0.6)
    P.grandstand(28, 0, 12, rows=6, rot=math.pi / 2, roof=False, crowd=0.6)
    # Race control tower on the infield and a timing board.
    box((0, -0.5, 2.0), (4, 3, 4), "steel", 0.04)
    box((0, -2.02, 2.7), (3.0, 0.04, 0.9), "ice_dim", 0)
    box((0, -0.5, 4.2), (4.4, 3.4, 0.2), "cast", 0.03)
    box((0, -0.5, 6.0), (0.2, 3.4, 1.6), "cast", 0.03)
    box((0, -2.26, 6.0), (0.04, 3.0, 1.2), "glass", 0)
    tube([Vector((-1.5, -2.3, 5.4)), Vector((1.5, -2.3, 5.4)), Vector((1.5, -2.3, 6.6)), Vector((-1.5, -2.3, 6.6))], "teal", 0.04, cyclic=True, smooth=False)
    for x, y in ((-27, -12), (27, -12), (-27, 12), (27, 12), (-10, -15.5), (10, -15.5), (0, 18)):
        P.light_pole(x, y, 11, (x * 0.4, y * 0.2, 0), power=20000, heads=4)
    spots = [(50, "enamel", (1, 1, 1)), (53, "oxblood", (1.8, 0.6, 0.8)), (56, "enamel", (0.6, 1.2, 1.6)),
             (59, "enamel", (1.4, 1.4, 1.0)), (62, "oxblood", (1, 1, 1)), (65, "enamel", (0.9, 0.7, 1.6)),
             (140, "enamel", (1.6, 0.6, 1.2)), (145, "oxblood", (1.8, 0.6, 0.8)), (200, "enamel", (1, 1, 1)),
             (205, "enamel", (0.6, 1.2, 1.6))]
    P.cars_on_loop(centre, spots, scale=0.85)
    for i in range(6):  # race haulers parked behind the pits
        box((-17 + i * 6.8, -23.5, 1.4), (5.6, 2.5, 2.8), "steel" if i % 2 else "enamel", 0.05)
    trees_ring(13, [(-70, 36, 70, 90, 30), (-70, -50, -40, 36, 14), (40, -50, 70, 36, 14)], 0.4)
    kit.point((0, 70, 18), 12000, kit.TEAL, 4)
    kit.scene_rig(*SIZE, location=(0, -40, 23), target=(0, 3.5, 0), lens=30)


# ── 5. State Invitational ──────────────────────────────────────────────────


def state():
    """Real grandstands. Real scouts. Lou from the race shop is watching."""
    P.ground(500, "grass")
    centre = P.loop(22, 11, 260, squareness=0.4)
    P.track(centre, 7.0, "asphalt")
    paved_edges(centre, 7.0, "ice_dim")
    P.flat_line(P.offset(centre, 1.2), 0.05, "teal_dim", 0.025)
    P.flat_line(P.offset(centre, -1.2), 0.05, "teal_dim", 0.025)
    P.wall(P.offset(centre, 4.0), 1.1, "concrete", 0.3, cap="teal")
    P.wall(P.offset(centre, -3.9), 0.3, "concrete", 0.2, cap="fuchsia")
    P.catch_fence(P.offset(centre, 4.4), 3.0, every=5, glow="teal_dim")
    box((-4, -15.4, 0.03), (0.6, 7.0, 0.04), "ice_dim", 0)
    # The main grandstand: huge, double-tier look, roofed, a glass VIP box on top.
    P.grandstand(0, 17.0, 52, rows=13, rot=0, roof=True, crowd=0.8, trim="teal", lamps=12)
    box((-14, 17 + 13 * 0.8 + 0.2, 8.4), (10, 2.4, 2.2), "glass", 0.05)
    box((-14, 17 + 13 * 0.8 - 1.05, 8.4), (9.6, 0.04, 1.6), "ice_dim", 0)
    for k in range(8):  # scouts at the glass
        box((-17.5 + k * 1.0, 17 + 13 * 0.8 - 1.2, 8.2), (0.3, 0.3, 0.8), "canvas", 0)
    P.grandstand(-38, 1.0, 16, rows=8, rot=-math.pi / 2, roof=True, crowd=0.7, trim="fuchsia", lamps=4)
    P.grandstand(38, 1.0, 16, rows=8, rot=math.pi / 2, roof=True, crowd=0.7, trim="fuchsia", lamps=4)
    # The big board in the infield: a tall tower with a teal screen and a fuchsia band.
    rod((0, 0, 0), (0, 0, 9), 0.25, "steel", 10)
    box((0, 0, 11.5), (12, 0.5, 5), "cast", 0.05)
    box((0, -0.3, 11.5), (11, 0.04, 4.2), "glass", 0)
    tube([Vector((-5.5, -0.34, 9.4)), Vector((5.5, -0.34, 9.4)), Vector((5.5, -0.34, 13.6)), Vector((-5.5, -0.34, 13.6))], "teal", 0.07, cyclic=True, smooth=False)
    tube([Vector((-4.5, -0.34, 12.2)), Vector((4.5, -0.34, 12.2))], "teal_dim", 0.05, smooth=False)
    tube([Vector((-4.5, -0.34, 11.0)), Vector((2.0, -0.34, 11.0))], "teal_dim", 0.05, smooth=False)
    box((0, -0.32, 9.4), (11, 0.04, 0.35), "fuchsia", 0)
    # Pit lane, bays, and team trucks.
    box((0, -19.6, 0.02), (52, 4.2, 0.04), "asphalt", 0)
    P.flat_line([Vector((-26, -18.1, 0)), Vector((26, -18.1, 0))], 0.14, "ice_dim", 0.03, closed=False)
    P.pit_row(0, -25.0, 12, 0)
    for i in range(7):
        box((-24 + i * 8, -33.5, 1.6), (6.5, 2.8, 3.2), "steel" if i % 2 else "enamel", 0.05)
    for x, y in ((-40, -20), (40, -20), (-40, 22), (40, 22), (-18, -26), (18, -26), (0, -34)):
        P.light_pole(x, y, 14, (x * 0.3, y * 0.15, 0), power=30000, heads=6)
    spots = [(60, "enamel", (1, 1, 1)), (63, "oxblood", (1.8, 0.6, 0.8)), (66, "enamel", (0.6, 1.2, 1.6)),
             (69, "enamel", (1.4, 1.4, 1.0)), (72, "oxblood", (1, 1, 1)), (75, "enamel", (0.9, 0.7, 1.6)),
             (78, "enamel", (1.6, 0.6, 1.2)), (180, "oxblood", (1.8, 0.6, 0.8)), (184, "enamel", (1, 1, 1)),
             (240, "enamel", (0.6, 1.2, 1.6)), (244, "oxblood", (1.8, 0.6, 0.8)), (248, "enamel", (1, 1, 1))]
    P.cars_on_loop(centre, spots, scale=0.95)
    trees_ring(17, [(-90, 40, 90, 120, 30), (-90, -60, -55, 40, 14), (55, -60, 90, 40, 14)], 0.4)
    kit.point((0, 90, 20), 16000, kit.FUCHSIA, 4)
    kit.point((-60, 70, 14), 9000, kit.TEAL, 4)
    kit.scene_rig(*SIZE, location=(0, -46, 29), target=(0, 6, 0), lens=30)


SCENES = {"backyard": backyard, "dirt": dirt, "county_fair": county_fair, "regional": regional, "state": state}

if __name__ == "__main__":
    wanted = kit.args()
    for name, build in SCENES.items():
        if wanted and name not in wanted:
            continue
        kit.reset(seed=11)
        build()
        kit.render("venues", name, samples=SAMPLES)
