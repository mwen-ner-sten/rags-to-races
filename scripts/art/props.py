"""Reusable scene props for venues, places and team garages.

Grounded, real-world things (fences, light poles, sheds, bleachers, trees,
parked cars) built from kit materials. Keep them plain: the night lighting and
the neon accents carry the style, not exaggerated shapes.
"""
from __future__ import annotations

import math
import random

import bpy
from mathutils import Matrix, Vector

import kit
from kit import TAU, arc, box, cone, flood, mat, mesh_from, point, ribbon, rod, tube


def loop(a: float, b: float, n: int = 160, squareness: float = 0.0, cx: float = 0.0, cy: float = 0.0):
    """Points on an oval track centre-line. `squareness` 0 is an ellipse; higher
    values flatten the straights like a real short-track oval."""
    pts = []
    for i in range(n):
        t = TAU * i / n
        c, s = math.cos(t), math.sin(t)
        e = 2 / (2 + squareness * 6)
        x = a * math.copysign(abs(c) ** e, c)
        y = b * math.copysign(abs(s) ** e, s)
        pts.append(Vector((cx + x, cy + y, 0)))
    return pts


def offset(points, distance: float):
    """Offset a closed loop of points outward (positive) or inward."""
    out = []
    n = len(points)
    for i, p in enumerate(points):
        tangent = (points[(i + 1) % n] - points[i - 1]).normalized()
        normal = Vector((tangent.y, -tangent.x, 0))
        out.append(p + normal * distance)
    return out


def track(centre, width: float, surface: str = "dirt", z: float = 0.01):
    inner, outer = offset(centre, -width / 2), offset(centre, width / 2)
    return ribbon(inner, outer, surface, z, "Track"), inner, outer


def ground(size: float, material: str = "grass", z: float = 0.0):
    return box((0, 0, z - 0.05), (size, size, 0.1), material, 0)


def wall(points, height: float, material: str = "concrete", thickness: float = 0.15, cap: str | None = "teal"):
    """A low wall or tyre barrier along a closed loop, with an optional light strip on top."""
    n = len(points)
    for i in range(n):
        a, b = points[i], points[(i + 1) % n]
        mid, d = (a + b) / 2, b - a
        box((mid.x, mid.y, height / 2), (d.length + 0.02, thickness, height), material, 0, (0, 0, math.atan2(d.y, d.x)))
    if cap:
        tube([p + Vector((0, 0, height + 0.02)) for p in points], cap, thickness * 0.18, cyclic=True, smooth=False)


def catch_fence(points, height: float = 1.2, every: int = 4, material: str = "steel", glow: str | None = "teal_dim"):
    """Posts and two rails, the cheap catch fence of a dirt oval."""
    n = len(points)
    for i in range(0, n, every):
        p = points[i]
        rod(p, p + Vector((0, 0, height)), 0.035, material, 8)
    for h, light in ((height, glow), (height * 0.55, None)):
        tube([p + Vector((0, 0, h)) for p in points], light or material, 0.02 if light else 0.025, cyclic=True, smooth=False)


def light_pole(x: float, y: float, height: float, target, power: float = 1500.0, colour=kit.ICE, heads: int = 3, spread: float = 55.0):
    """A wooden or steel pole with a bank of floodlights aimed at `target`."""
    base = Vector((x, y, 0))
    top = base + Vector((0, 0, height))
    rod(base, top, 0.09, "steel", 10)
    face = (Vector(target) - top)
    face.z = 0
    face.normalize()
    side = Vector((-face.y, face.x, 0))
    box(top + Vector((0, 0, 0.05)), (0.15, 1.1, 0.08), "steel", 0, (0, 0, math.atan2(side.y, side.x) - math.pi / 2))
    for k in range(heads):
        head = top + side * (k - (heads - 1) / 2) * 0.38 + Vector((0, 0, 0.2))
        box(head, (0.24, 0.24, 0.2), "cast", 0.02)
        box(head + face * 0.13, (0.2, 0.2, 0.17), "ice", 0, (0, 0, math.atan2(face.y, face.x)))
    flood(top + face * 0.3, target, power, colour, spread)


def shed(x: float, y: float, w: float, d: float, h: float, rot: float = 0.0, wall_mat: str = "enamel",
         sign: str | None = None, window: str | None = "ice_dim"):
    """A gable-roofed shed or small store, with lit windows and an optional sign bar."""
    c, s = math.cos(rot), math.sin(rot)

    def at(px, py, pz):
        return Vector((x + px * c - py * s, y + px * s + py * c, pz))

    box(at(0, 0, h / 2), (w, d, h), wall_mat, 0.02, (0, 0, rot))
    ridge = h + d * 0.35
    verts = [at(-w / 2 - 0.1, -d / 2 - 0.1, h), at(w / 2 + 0.1, -d / 2 - 0.1, h), at(w / 2 + 0.1, 0, ridge),
             at(-w / 2 - 0.1, 0, ridge), at(-w / 2 - 0.1, d / 2 + 0.1, h), at(w / 2 + 0.1, d / 2 + 0.1, h)]
    mesh_from(verts, [(0, 1, 2, 3), (3, 2, 5, 4)], "steel", "Roof")
    mesh_from([at(-w / 2, -d / 2, h), at(-w / 2, 0, ridge), at(-w / 2, d / 2, h)], [(0, 1, 2)], wall_mat, "Gable")
    mesh_from([at(w / 2, -d / 2, h), at(w / 2, 0, ridge), at(w / 2, d / 2, h)], [(0, 2, 1)], wall_mat, "Gable")
    if window:
        for k in range(max(1, int(w // 1.6))):
            px = -w / 2 + (k + 0.5) * w / max(1, int(w // 1.6))
            box(at(px, -d / 2 - 0.01, h * 0.55), (0.6, 0.02, 0.45), window, 0, (0, 0, rot))
    if sign:
        box(at(0, -d / 2 - 0.05, h * 0.9), (w * 0.6, 0.04, 0.22), sign, 0, (0, 0, rot))


def bleachers(x: float, y: float, length: float, rows: int = 5, rot: float = 0.0, lit: bool = True):
    c, s = math.cos(rot), math.sin(rot)
    for r in range(rows):
        px, py = 0, r * 0.45
        pos = Vector((x + px * c - py * s, y + px * s + py * c, 0.25 + r * 0.32))
        box(pos, (length, 0.4, 0.06), "alloy", 0, (0, 0, rot))
        rod(pos - Vector((0, 0, 0.3 + r * 0.32)), pos, 0.03, "steel", 6)
    if lit:
        top = Vector((x - (rows * 0.45) * s, y + (rows * 0.45) * c, 0.25 + rows * 0.32))
        a = top + Vector((-length / 2 * c, -length / 2 * s, 0))
        b = top + Vector((length / 2 * c, length / 2 * s, 0))
        tube([a, b], "fuchsia", 0.03, smooth=False)


def tree(x: float, y: float, h: float = 3.0, kind: str = "round"):
    rod((x, y, 0), (x, y, h * 0.4), 0.08 * h / 3, "wood", 8)
    if kind == "pine":
        for i in range(3):
            cone((x, y, h * (0.45 + i * 0.18)), h * (0.33 - i * 0.08), 0, h * 0.35, "foliage", 10)
    else:
        for _ in range(4):
            kit.ball((x + random.uniform(-0.3, 0.3) * h / 3, y + random.uniform(-0.3, 0.3) * h / 3,
                      h * random.uniform(0.6, 0.8)), h * random.uniform(0.22, 0.3), "foliage")


def tyre_stack(x: float, y: float, count: int = 4, ring: str | None = None):
    for i in range(count):
        kit.torus((x, y, 0.1 + i * 0.17), 0.28, 0.1, "rubber")
    if ring:
        arc((x, y, 0.12 + count * 0.17), 0.3, "z", ring, 0.012)


def race_car(x: float, y: float, heading: float, body: str = "enamel", tint=None, lights: bool = True, scale: float = 1.0):
    """A plain short-track car: tub, cabin, four wheels, head and tail lights."""
    c, s = math.cos(heading), math.sin(heading)

    def at(px, py, pz):
        return Vector((x + (px * c - py * s) * scale, y + (px * s + py * c) * scale, pz * scale))

    body_mat = mat(body, tint)
    box(at(0, 0, 0.32), (1.9 * scale, 0.9 * scale, 0.3 * scale), body_mat, 0.06 * scale, (0, 0, heading))
    box(at(-0.15, 0, 0.6), (0.8 * scale, 0.75 * scale, 0.3 * scale), "glass", 0.05 * scale, (0, 0, heading))
    for px in (-0.62, 0.62):
        for py in (-0.45, 0.45):
            w = at(px, py, 0.2)
            axis = Vector((-s, c, 0)) * 0.11 * scale
            rod(w - axis, w + axis, 0.2 * scale, "rubber", 16)
    if lights:
        for py in (-0.3, 0.3):
            box(at(0.96, py, 0.36), (0.04 * scale, 0.18 * scale, 0.07 * scale), "ice", 0, (0, 0, heading))
            box(at(-0.96, py, 0.36), (0.04 * scale, 0.2 * scale, 0.06 * scale), "fuchsia", 0, (0, 0, heading))


def sign_bar(start, end, material: str = "fuchsia", thickness: float = 0.04):
    """A plain neon bar or outline. Never letters: the game puts words in the UI."""
    tube([Vector(start), Vector(end)], material, thickness, smooth=False)


def scatter(n: int, area: tuple[float, float, float, float], make, keep_out=None):
    """Call make(x, y) at n random points in (x0, y0, x1, y1), skipping keep_out(x, y)."""
    placed = 0
    tries = 0
    while placed < n and tries < n * 30:
        tries += 1
        x, y = random.uniform(area[0], area[2]), random.uniform(area[1], area[3])
        if keep_out and keep_out(x, y):
            continue
        make(x, y)
        placed += 1


# ── Scene helpers added for the second art pass ───────────────────────────


def frame(x: float, y: float, rot: float = 0.0):
    """A local coordinate frame: at(px, py, pz) maps to world space."""
    c, s = math.cos(rot), math.sin(rot)
    return lambda px, py, pz=0.0: Vector((x + px * c - py * s, y + px * s + py * c, pz))


def blocks(points, size, material, name: str = "Blocks"):
    """Many small axis-aligned cubes as one mesh (crowds, windows, bulbs)."""
    hx, hy, hz = (v / 2 for v in size)
    verts, faces = [], []
    for p in points:
        i = len(verts)
        for dz in (-hz, hz):
            for dx, dy in ((-hx, -hy), (hx, -hy), (hx, hy), (-hx, hy)):
                verts.append((p[0] + dx, p[1] + dy, p[2] + dz))
        faces += [(i, i + 3, i + 2, i + 1), (i + 4, i + 5, i + 6, i + 7), (i, i + 1, i + 5, i + 4),
                  (i + 1, i + 2, i + 6, i + 5), (i + 2, i + 3, i + 7, i + 6), (i + 3, i, i + 4, i + 7)]
    return mesh_from(verts, faces, material, name)


def flat_line(points, width: float, material: str, z: float = 0.03, closed: bool = True):
    """A painted or lit line lying on the ground along a loop or path."""
    n = len(points)
    out = []
    for i, p in enumerate(points):
        a = points[(i + 1) % n] if (closed or i < n - 1) else p
        b = points[i - 1] if (closed or i > 0) else p
        t = (a - b).normalized()
        side = Vector((-t.y, t.x, 0)) * width / 2
        out.append((p + side, p - side))
    verts = [(q[0].x, q[0].y, z) for q in out] + [(q[1].x, q[1].y, z) for q in out]
    last = n if closed else n - 1
    faces = [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(last)]
    return mesh_from(verts, faces, material, "Line")


def fence_line(points, height: float = 1.6, material: str = "wood", closed: bool = False, post_gap: int = 1,
               cap: str | None = None):
    """A plank fence along a path: a solid board run plus posts."""
    n = len(points)
    for i in range(n if closed else n - 1):
        a, b = points[i], points[(i + 1) % n]
        mid, d = (a + b) / 2, b - a
        box((mid.x, mid.y, height / 2), (d.length + 0.03, 0.06, height), material, 0, (0, 0, math.atan2(d.y, d.x)))
    for p in points[::post_gap]:
        box((p.x, p.y, height / 2 + 0.05), (0.12, 0.12, height + 0.1), material, 0)
    if cap:
        tube([p + Vector((0, 0, height + 0.1)) for p in points], cap, 0.02, cyclic=closed, smooth=False)


def string_lights(a, b, sag: float = 0.7, bulbs: int = 12, material: str = "ice_dim", wire: str = "steel"):
    """Bulbs on a drooping wire between two points."""
    a, b = Vector(a), Vector(b)
    pts = []
    for i in range(bulbs + 1):
        t = i / bulbs
        pts.append(a.lerp(b, t) - Vector((0, 0, sag * 4 * t * (1 - t))))
    tube(pts, wire, 0.008, smooth=False)
    blocks(pts[1:-1], (0.11, 0.11, 0.11), material, "Bulbs")


def street_lamp(x: float, y: float, height: float = 5.0, power: float = 900.0, lean=(0, 1), colour=kit.ICE):
    """A street lamp on a pole with an arm toward `lean` and a glowing head."""
    base, top = Vector((x, y, 0)), Vector((x, y, height))
    rod(base, top, 0.06, "steel", 8)
    arm = Vector((lean[0], lean[1], 0)).normalized() * 1.2
    rod(top, top + arm, 0.04, "steel", 6)
    head = top + arm
    box(head, (0.45, 0.2, 0.08), "ice", 0, (0, 0, math.atan2(arm.y, arm.x)))
    point(head - Vector((0, 0, 0.3)), power, colour, 0.15)


def house(x: float, y: float, w: float, d: float, h: float, rot: float = 0.0, body: str = "enamel", glow: float = 1.0):
    """A suburban two-storey house; lit windows face local -y."""
    at = frame(x, y, rot)
    shed(x, y, w, d, h, rot, body, window=None)
    cols = max(2, int(w // 2.2))
    i = 0
    for k in range(cols):
        px = -w / 2 + (k + 0.5) * w / cols
        for pz in (h * 0.28, h * 0.72):
            i += 1
            lit = random.random() < 0.7 * glow + 0.2
            box(at(px, -d / 2 - 0.02, pz), (0.65, 0.04, 0.55), ("ice_dim" if i % 5 else "fuchsia_dim") if lit else "glass", 0, (0, 0, rot))
    box(at(w * 0.3, -d / 2 - 0.02, 0.95), (0.9, 0.04, 1.9), "ice_dim", 0, (0, 0, rot))
    box(at(-w * 0.32, 0.0, h + d * 0.4), (0.5, 0.5, 1.4), "cast", 0.02, (0, 0, rot))


def wreck(x: float, y: float, heading: float = 0.0, body: str = "rust", tint=None, z: float = 0.0, lean: float = 0.0):
    """A stripped car hulk: tub, cabin, no wheels, dead glass."""
    at = frame(x, y, heading)
    m = mat(body, tint)
    box(at(0, 0, z + 0.45), (4.0, 1.7, 0.7), m, 0.08, (lean, 0, heading))
    box(at(-0.3, 0, z + 1.0), (2.0, 1.5, 0.55), m, 0.08, (lean, 0, heading))
    box(at(-0.3, 0, z + 1.02), (2.05, 1.4, 0.35), "glass", 0.04, (lean, 0, heading))


def grandstand(x: float, y: float, length: float, rows: int = 8, rot: float = 0.0, roof: bool = True,
               crowd: float = 0.6, trim: str | None = "fuchsia", lamps: int = 0, depth: float = 0.8):
    """Concrete terraces rising toward local +y (the track is at local -y), a
    seat line on each step, a seated crowd, and an optional lit roof."""
    at = frame(x, y, rot)
    people, phones = [], []
    for r in range(rows):
        h = 0.6 + r * 0.5
        box(at(0, r * depth + depth / 2, h / 2), (length, depth, h), "concrete", 0, (0, 0, rot))
        box(at(0, r * depth + depth * 0.35, h + 0.06), (length - 0.2, 0.18, 0.1), "alloy", 0, (0, 0, rot))
        for k in range(int(length / 0.6)):
            px = -length / 2 + (k + 0.5) * 0.6
            if random.random() < crowd:
                people.append(at(px, r * depth + depth * 0.55, h + 0.42))
                if random.random() < 0.07:
                    phones.append(at(px, r * depth + depth * 0.28, h + 0.62))
    blocks(people, (0.34, 0.3, 0.62), "canvas", "Crowd")
    blocks(phones, (0.08, 0.04, 0.1), "ice_dim", "Phones")
    top = 0.6 + rows * 0.5
    if roof:
        span = rows * depth
        roof_z = top + 3.0
        box(at(0, span / 2 + 0.2, roof_z), (length + 1.0, span + 1.6, 0.15), "steel", 0.02, (0, 0, rot))
        for px in (-length / 2, 0, length / 2):
            rod(at(px, span + 0.7, 0.0), at(px, span + 0.7, roof_z), 0.07, "steel", 8)
        front = [at(-length / 2 - 0.5, -0.6, roof_z - 0.1), at(length / 2 + 0.5, -0.6, roof_z - 0.1)]
        tube(front, "ice_dim", 0.035, smooth=False)
        if trim:
            tube([q + Vector((0, 0, 0.18)) for q in front], trim, 0.04, smooth=False)
        for k in range(lamps):
            px = -length / 2 + (k + 0.5) * length / lamps
            point(at(px, 0.6, roof_z - 0.5), 500, kit.ICE, 0.15)


def ferris_wheel(x: float, y: float, radius: float, rot_phase: float = 0.0, hub: float | None = None):
    """A ferris wheel standing in the XZ plane, lit with teal spokes."""
    hub = hub if hub is not None else radius + 1.0
    c = Vector((x, y, hub))
    arc(c, radius, "y", "fuchsia_dim", 0.09)
    arc(c, radius * 0.55, "y", "teal_dim", 0.05)
    cars = []
    for i in range(12):
        a = rot_phase + TAU * i / 12
        p = c + Vector((radius * math.cos(a), 0, radius * math.sin(a)))
        tube([c, p], "teal_dim", 0.035, smooth=False)
        cars.append(p - Vector((0, 0, 0.35)))
    blocks(cars, (0.9, 0.7, 0.7), "ice_dim", "Gondolas")
    for sy in (0.5, -0.5):
        for sx in (-0.5, 0.5):
            rod(c + Vector((0, sy, 0)), Vector((x + sx * radius, y + sy * 3, 0)), 0.14, "steel", 8)


def pit_row(x: float, y: float, bays: int, rot: float = 0.0, bay_w: float = 3.4, glow: str = "glass"):
    """A row of garage bays with lit open doors facing local -y."""
    at = frame(x, y, rot)
    box(at(0, 0.8, 1.7), (bays * bay_w, 3.0, 3.4), "steel", 0.03, (0, 0, rot))
    for k in range(bays):
        px = -bays * bay_w / 2 + (k + 0.5) * bay_w
        box(at(px, -0.72, 1.5), (bay_w * 0.55, 0.05, 1.1), glow, 0, (0, 0, rot))
        box(at(px, -0.73, 0.7), (bay_w * 0.7, 0.04, 0.6), "cast", 0, (0, 0, rot))
        point(at(px, -2.0, 2.4), 90, kit.ICE, 0.1)
    tube([at(-bays * bay_w / 2, -0.76, 3.5), at(bays * bay_w / 2, -0.76, 3.5)], "teal", 0.04, smooth=False)


def container(x: float, y: float, rot: float = 0.0, body: str = "steel", tint=None, z: float = 0.0):
    box((x, y, z + 1.3), (6.0, 2.4, 2.6), mat(body, tint), 0.04, (0, 0, rot))


def cars_on_loop(centre, spots, scale: float = 0.75, skew: float = 0.0):
    """Race cars at index positions on a loop; spots are (index, body, tint)."""
    n = len(centre)
    for i, body, tint in spots:
        p, q = centre[i % n], centre[(i + 1) % n]
        race_car(p.x, p.y, math.atan2(q.y - p.y, q.x - p.x) + skew, body, tint, scale=scale)


def sedan(x: float, y: float, heading: float = 0.0, body: str = "enamel", tint=None, trunk_open: bool = False,
          lights_on: bool = True, scale: float = 1.0, lean: float = 0.0):
    """A plain family car (heading 0 faces +x). Optionally trunk lid up."""
    at = frame(x, y, heading)
    m = mat(body, tint)

    def p(px, py, pz):
        q = at(px * scale, py * scale, 0)
        return Vector((q.x, q.y, pz * scale))

    box(p(0, 0, 0.55), (4.4 * scale, 1.8 * scale, 0.7 * scale), m, 0.1 * scale, (lean, 0, heading))
    box(p(-0.2, 0, 1.2), (2.3 * scale, 1.6 * scale, 0.6 * scale), m, 0.12 * scale, (lean, 0, heading))
    box(p(-0.2, 0, 1.22), (2.35 * scale, 1.5 * scale, 0.4 * scale), "glass", 0.05 * scale, (lean, 0, heading))
    for px in (-1.4, 1.4):
        for py in (-0.95, 0.95):
            w = p(px, py, 0.33)
            axis = Vector((-math.sin(heading), math.cos(heading), 0)) * 0.12 * scale
            rod(w - axis, w + axis, 0.33 * scale, "rubber", 16)
    if trunk_open:
        hinge = p(-1.45, 0, 0.92)
        k = math.cos(math.radians(70))
        d = Vector((-k * math.cos(heading), -k * math.sin(heading), math.sin(math.radians(70))))
        box(hinge + d * 0.45 * scale, (1.0 * scale, 1.6 * scale, 0.06 * scale), m, 0.02, (0, math.radians(70), heading))
        box(p(-1.75, 0, 0.9), (0.3 * scale, 0.5 * scale, 0.04), "ice_dim", 0, (0, 0, heading))
    if lights_on:
        for py in (-0.65, 0.65):
            box(p(2.2, py, 0.62), (0.05 * scale, 0.32 * scale, 0.14 * scale), "ice", 0, (0, 0, heading))
            box(p(-2.2, py, 0.66), (0.05 * scale, 0.36 * scale, 0.1 * scale), "fuchsia", 0, (0, 0, heading))

def place(build, x: float, y: float, rot: float = 0.0, z: float = 0.0, scale=1.0):
    """Run a no-argument builder that models something at the origin (facing
    +x), then move everything it made to (x, y, z), turned by `rot` about Z.
    `scale` is a number or an (x, y, z) tuple. Returns the new objects."""
    before = set(bpy.data.objects)
    build()
    new = [o for o in bpy.data.objects if o not in before]
    sx, sy, sz = (scale, scale, scale) if isinstance(scale, (int, float)) else scale
    m = Matrix.Translation((x, y, z)) @ Matrix.Rotation(rot, 4, "Z") @ Matrix.Diagonal((sx, sy, sz, 1.0))
    for o in new:
        o.matrix_world = m @ o.matrix_world
    return new


def car(x: float, y: float, rot: float = 0.0, body: str = "enamel", tint=None, wheels: bool = True,
        lights: bool = False, wear: float = 0.0, z: float = 0.0, scale=1.0, tail: bool = False):
    """A real sedan (the vehicle sprites' lofted body, glass, door lines and
    wheels) placed in a scene. Heading 0 faces +x. `wear` adds rust patches
    and a dull bumper; `lights` adds head and tail lamps, `tail` only tail lamps."""
    import render_vehicles as V  # lazy: only scenes that want real cars pay for it

    def build():
        paint = V.paint(body, tint)
        V.sedan_body(paint)
        V._greenhouse(paint)
        V._door_lines()
        if lights:
            V._sedan_lights()
        elif tail:
            for side in (-1, 1):
                V.lamp((-2.15, side * 0.52, 0.80), (0.05, 0.3, 0.09), "fuchsia")
        if wear:
            for pos, dims in (((1.55, -0.905, 0.62), (0.6, 0.012, 0.3)), ((-1.55, 0.905, 0.5), (0.5, 0.012, 0.2)),
                              ((1.3, 0, 0.945), (0.8, 0.5, 0.012)), ((-1.7, 0.2, 1.035), (0.5, 0.6, 0.012))):
                box(pos, dims, "rust", 0)
        box((2.27, 0, 0.42), (0.1, 1.5, 0.12), "steel", 0.03)
        box((-2.25, 0, 0.4), (0.1, 1.5, 0.12), "steel", 0.03)
        if wheels:
            V.sedan_wheels(0.33, 0.22, "steel", spokes=4)
        else:  # up on blocks
            for wx in V.WHEEL_X:
                for side in (-1, 1):
                    box((wx, side * 0.7, 0.14), (0.3, 0.3, 0.28), "cast", 0.02)

    return place(build, x, y, rot, z, scale)


__all__ = [
    "loop", "offset", "track", "ground", "wall", "catch_fence", "light_pole", "shed", "bleachers",
    "tree", "tyre_stack", "race_car", "sign_bar", "scatter", "point", "box", "rod", "frame", "blocks",
    "flat_line", "fence_line", "string_lights", "street_lamp", "house", "wreck", "grandstand", "ferris_wheel",
    "pit_row", "container", "cars_on_loop", "frame", "blocks",
    "flat_line", "fence_line", "string_lights", "street_lamp", "house", "wreck", "grandstand", "ferris_wheel",
    "pit_row", "container", "cars_on_loop", "sedan", "place", "car",
]
