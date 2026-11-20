"""Rally stage maps: top-down night views under the CSS car marker.

    blender --background --factory-startup --python scripts/art/render_stages.py -- [forest fast_straight tight_infield]

The camera and route geometry match the original stage renderer (removed; see git history) exactly:
an orthographic camera straight down over a 24 x 10 world, and the route in
src/game/rally-course.json mapped from percent of the image to world units by
    x = (px/100 - 0.5) * 24,   y = (0.5 - py/100) * 10
so the marker (left/top in %) sits on the road drawn here. Do not change the
camera framing, and keep the raw size at a 2.4:1 ratio: finish.py then does no
cropping.
"""
import json
import math
import os
import random
import sys
from pathlib import Path

import bpy

sys.path.insert(0, str(Path(__file__).resolve().parent))
import kit  # noqa: E402
import props as P  # noqa: E402
from kit import box, cone, rod  # noqa: E402
from mathutils import Vector  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
COURSES = json.loads((ROOT / "src/game/rally-course.json").read_text())
SIZE = (2304, 960)  # 2x the shipped 1152x480, same 2.4:1 ratio
WIDTH, HEIGHT = 24.0, 10.0  # world units seen by the camera: do not change
SAMPLES = int(os.environ.get("ART_SAMPLES", 96))


def world(x, y):
    """Percent of the image to world units (the old renderer's position())."""
    return Vector(((x / 100 - 0.5) * WIDTH, (0.5 - y / 100) * HEIGHT, 0))


def distance(x, y, path):
    nearest = 1000.0
    for a, b in zip(path, path[1:]):
        dx, dy = b.x - a.x, b.y - a.y
        f = max(0.0, min(1.0, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy)))
        nearest = min(nearest, math.hypot(x - a.x - f * dx, y - a.y - f * dy))
    return nearest


def top_camera():
    """Orthographic, straight down, exactly the old framing."""
    cam = kit.scene_rig(*SIZE, location=(0, 0, 15), target=(0, 0, 0), lens=35)
    cam.location = (0, 0, 15)
    cam.rotation_euler = (0, 0, 0)
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = WIDTH
    cam.data.clip_end = 100
    moon = bpy.data.lights["Moon"]
    moon.energy = 1.1
    bpy.data.objects["Moon"].rotation_euler = (math.radians(32), math.radians(-12), math.radians(-30))
    bpy.context.scene.view_settings.exposure = 0.9


def pine(x, y, r, tilt=0.0):
    cone((x, y, r * 1.0 + 0.03), r, 0.02, r * 2.4, "foliage", 9)
    cone((x, y, r * 1.9 + 0.03), r * 0.62, 0.02, r * 1.6, "foliage", 8)


def spot_down(p, power=500, spread=70, colour=kit.ICE, height=3.0):
    kit.flood((p.x, p.y, height), (p.x, p.y, 0), power, colour, spread)


def gantry(p, colour, label_dir=0.0):
    """Start or finish arch: two posts, a lit bar, an ice spot on the road."""
    for dy in (-0.34, 0.34):
        box((p.x, p.y + dy, 0.2), (0.07, 0.07, 0.4), "steel", 0)
    box((p.x, p.y, 0.42), (0.1, 0.8, 0.07), colour, 0)
    P.flat_line([Vector((p.x, p.y - 0.28, 0)), Vector((p.x, p.y + 0.28, 0))], 0.07, "ice_dim", 0.09, closed=False)
    spot_down(p, 650, 80, kit.ICE, 2.6)


def shed(x, y, rot):
    box((x, y, 0.2), (1.3, 0.7, 0.4), "steel", 0.02, (0, 0, rot))
    box((x, y, 0.43), (1.5, 0.84, 0.08), "cast", 0.01, (0, 0, rot))
    box((x + 0.2, y - 0.37, 0.2), (0.5, 0.03, 0.2), "ice_dim", 0, (0, 0, rot))
    kit.point((x, y - 0.55, 0.3), 12, kit.ICE, 0.08)


def road_lines(road, width, surface, edge_mat, edge_w=0.03):
    """Verge, road surface and lit edge lines along the route."""
    P.flat_line(road, width * 1.45, "dirt", 0.05, closed=False)
    P.flat_line(road, width, surface, 0.065, closed=False)
    for sign in (-1, 1):
        pts = []
        for i, p in enumerate(road):
            a, b = road[min(i + 1, len(road) - 1)], road[max(i - 1, 0)]
            t = (a - b).normalized()
            pts.append(p + Vector((-t.y, t.x, 0)) * sign * (width / 2 - 0.02))
        P.flat_line(pts, edge_w, edge_mat, 0.08, closed=False)


def edge_posts(road, width, every, material="teal", step=0.04):
    """Reflective posts either side of the road."""
    for i in range(1, len(road) - 1, every):
        t = (road[i + 1] - road[i - 1]).normalized()
        for sign in (-1, 1):
            p = road[i] + Vector((-t.y, t.x, 0)) * sign * (width / 2 + 0.12)
            box((p.x, p.y, 0.13), (0.07, 0.07, 0.26), "steel", 0)
            box((p.x, p.y, 0.27), (0.09, 0.09, 0.05), material, 0)


def subdivide(road, parts=4):
    out = []
    for a, b in zip(road, road[1:]):
        for k in range(parts):
            out.append(a.lerp(b, k / parts))
    out.append(road[-1])
    return out


def scatter_trees(road, extra_keepout, count, rmin=0.12, rmax=0.26, seed=708):
    random.seed(seed)
    placed = tries = 0
    while placed < count and tries < count * 40:
        tries += 1
        x, y = random.uniform(-12.6, 12.6), random.uniform(-5.4, 5.4)
        r = random.uniform(rmin, rmax)
        if distance(x, y, road) < 0.62 + r * 0.6 or extra_keepout(x, y):
            continue
        pine(x, y, r)
        placed += 1


def fields(boxes):
    """Dim stubble fields with furrow lines: farmland round the road."""
    for x, y, w, h in boxes:
        box((x, y, 0.01), (w, h, 0.02), "dirt", 0)
        for i in range(10):
            box((x, y - h / 2 + (i + 0.5) * h / 10, 0.025), (w, 0.02, 0.012), "grass", 0)


def build(layout):
    road = subdivide([world(*p) for p in COURSES[layout]], 3)
    P.ground(60, "grass")
    top_camera()
    paved = layout == "fast_straight"
    # Faint teal glow all over, so dark pines separate from dark ground.
    kit.point((0, 0, 8), 900, kit.TEAL, 3.0)
    if layout == "forest":
        stream = [world(x, y) for x, y in [(46, -5), (49, 8), (55, 16), (59, 29), (60, 38), (62, 46), (66, 60), (63, 75), (59, 89), (59, 108)]]
        fields([(-10, 2, 5.6, 4), (8, -3.6, 6, 3.1)])
        P.flat_line(stream, 0.62, "dirt", 0.035, closed=False)
        P.flat_line(stream, 0.42, "water", 0.04, closed=False)
        P.flat_line(stream, 0.04, "teal_dim", 0.045, closed=False)
        road_lines(road, 0.5, "concrete", "teal_dim")
        edge_posts(road, 0.5, 5)
        sheds = [(-10, -0.75, 0.22), (-8.7, -0.65, 0.22), (8.2, -1.8, -0.32)]
        for s in sheds:
            shed(*s)
        keep = lambda x, y: distance(x, y, stream) < 0.5 or (x < -7 and y > -1.5) or (x > 5 and y < -1.1)  # noqa: E731
        scatter_trees(road, keep, 420)
    elif layout == "fast_straight":
        fields([(-9, 3.4, 6.4, 3.2), (9, -3.0, 5.0, 3.0)])
        road_lines(road, 0.52, "asphalt", "ice_dim", 0.03)
        # Dashed centre line on the long straight.
        for i in range(0, len(road) - 1, 2):
            a, b = road[i], road[i + 1]
            P.flat_line([a.lerp(b, 0.2), a.lerp(b, 0.7)], 0.025, "ice_dim", 0.085, closed=False)
        edge_posts(road, 0.52, 8)
        for s in ((-9.5, -1.2, 0.1), (4.0, -4.3, -0.2)):
            shed(*s)
        keep = lambda x, y: (x < -6.5 and y > -2.0) or (x > 5 and y < -0.5)  # noqa: E731
        scatter_trees(road, keep, 300, 0.12, 0.24, 711)
    else:  # tight_infield
        fields([(0, -0.5, 3.0, 2.6)])
        road_lines(road, 0.5, "concrete", "teal_dim")
        # Tyre walls on both sides of every corner, a few ringed in fuchsia.
        for i in range(2, len(road) - 2, 2):
            t = (road[i + 1] - road[i - 1]).normalized()
            turn = abs((road[i + 1] - road[i]).angle(road[i] - road[i - 1], 0))
            for sign in (-1, 1):
                p = road[i] + Vector((-t.y, t.x, 0)) * sign * 0.4
                kit.torus((p.x, p.y, 0.1), 0.105, 0.05, "rubber", major_segments=14)
                if i % 4 == 0:
                    kit.arc((p.x, p.y, 0.16), 0.11, "z", "teal_dim", 0.012, steps=16)
                if i % 8 == 0 and turn > 0.15:
                    kit.arc((p.x, p.y, 0.16), 0.11, "z", "fuchsia_dim", 0.012, steps=16)
        edge_posts(road, 0.5, 14, "teal")
        for s in ((-7.0, 4.3, 0.3), (8.5, -4.3, -0.2)):
            shed(*s)
        keep = lambda x, y: (x < -9 and y > 1.5) or (x > 9 and y < -2.8)  # noqa: E731
        scatter_trees(road, keep, 280, 0.12, 0.24, 715)
    gantry(road[0], "fuchsia")
    gantry(road[-1], "teal")
    # A couple of spot lights along the route so it never goes fully dark.
    for k in (len(road) // 4, len(road) // 2, 3 * len(road) // 4):
        spot_down(road[k], 220, 85, kit.ICE, 2.4)


STAGES = {"forest": lambda: build("forest"), "fast_straight": lambda: build("fast_straight"),
          "tight_infield": lambda: build("tight_infield")}

if __name__ == "__main__":
    wanted = kit.args()
    for name, make in STAGES.items():
        if wanted and name not in wanted:
            continue
        kit.reset(seed=31)
        make()
        kit.render("stages", name, samples=SAMPLES)
