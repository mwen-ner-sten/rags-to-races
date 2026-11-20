"""Wheels and frames. See render_parts.py."""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import kit  # noqa: E402,F401
from kit import TAU, arc, box, rod, torus, tube  # noqa: E402,F401
from mathutils import Matrix, Vector  # noqa: E402,F401


def wheel_basic():
    """A turf tyre: wide, low-pressure, chevron tread, pressed-steel rim."""
    r, w = 1.0, 0.7
    rod((0, -w / 2, 0), (0, w / 2, 0), r * 0.92, "rubber", 72)
    for sign in (-1, 1):
        torus((0, sign * (w / 2 - 0.1), 0), r * 0.82, 0.18, "rubber", (math.pi / 2, 0, 0), 72)
    for i in range(28):
        a = TAU * i / 28
        for sign in (-1, 1):
            box((r * math.cos(a), sign * 0.16, r * math.sin(a)), (0.12, 0.32, 0.06), "rubber", 0.01,
                (sign * 0.5, -a + math.pi / 2, 0))
    face = -w / 2 - 0.02
    rod((0, face + 0.1, 0), (0, face, 0), 0.62, "steel", 64)
    rod((0, face, 0), (0, face - 0.04, 0), 0.5, "enamel", 64)
    for i in range(4):
        a = TAU * i / 4 + 0.4
        rod((0.32 * math.cos(a), face - 0.02, 0.32 * math.sin(a)), (0.32 * math.cos(a), face - 0.06, 0.32 * math.sin(a)), 0.08, "plastic", 20)
    rod((0, face - 0.04, 0), (0, face - 0.14, 0), 0.16, "alloy", 32)
    arc((0, face - 0.045, 0), 0.56, "y", "teal", 0.014)


# ── Shared wheel and frame helpers ─────────────────────────────────────────


def revolve(profile, mat, a0=0.0, a1=TAU, steps=72, smooth=True):
    """Lathe a closed (radius, y) profile around the Y axis."""
    full = abs(a1 - a0 - TAU) < 1e-6
    n = len(profile)
    rings = steps if full else steps + 1
    verts = []
    for k in range(rings):
        a = a0 + (a1 - a0) * k / steps
        verts += [(rho * math.cos(a), y, rho * math.sin(a)) for rho, y in profile]
    faces = []
    for k in range(steps):
        k2 = (k + 1) % rings
        for i in range(n):
            j = (i + 1) % n
            faces.append((k * n + i, k * n + j, k2 * n + j, k2 * n + i))
    if not full:
        faces.append(tuple(range(n)))
        faces.append(tuple(range((rings - 1) * n, rings * n)))
    obj = kit.mesh_from(verts, faces, mat, "Lathe", smooth=smooth)
    bm = kit.bmesh.new()
    bm.from_mesh(obj.data)
    kit.bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(obj.data)
    bm.free()
    return obj


def tire(r, w, rb, wb, bulge=0.0, corner=0.12, a0=0.0, a1=TAU, mat="rubber", steps=72):
    """Tyre carcass. r outer radius, w width, rb bead radius, wb bead half width,
    bulge pulls the crown shoulders in (round tread), corner rounds the shoulder."""
    c, hw = corner, w / 2
    mid = rb + 0.5 * (r - rb)
    re = r - bulge
    pts = [(rb, -wb), (mid, -hw), (re - c, -hw)]
    pts += [(re - c + c * math.sin(t), -hw + c - c * math.cos(t)) for t in (0.4, 0.8, 1.2)]
    ys = [-hw + c + (w - 2 * c) * i / 6 for i in range(7)]
    pts += [(r - bulge * (y / (hw - c)) ** 2, y) for y in ys]
    pts += [(re - c + c * math.sin(t), hw - c + c * math.cos(t)) for t in (1.2, 0.8, 0.4)]
    pts += [(re - c, hw), (mid, hw), (rb, wb)]
    return revolve(pts, mat, a0, a1, steps)


def blocks(r, rows, mat="rubber"):
    """Tread blocks around the crown. rows: (y, (tangent, width, height), count, phase, chevron)."""
    for y, (dt, dw, dh), n, phase, chev in rows:
        for i in range(n):
            a = phase + TAU * i / n
            rot = (Matrix.Rotation(-a + math.pi / 2, 3, "Y") @ Matrix.Rotation(chev, 3, "Z")).to_euler()
            c = r + dh / 2 - 0.03
            box((c * math.cos(a), y, c * math.sin(a)), (dt, dw, dh), mat, min(dt, dw, dh) * 0.15, tuple(rot))


def ribs(r, ys, width, height, mat="rubber"):
    """Circumferential tread ribs: rings standing proud of the crown."""
    for y in ys:
        rod((0, y - width / 2, 0), (0, y + width / 2, 0), r + height, mat, 72)


def hub_disc(y0, rr, mat, holes=0, hole_mat="cast", hole_r=0.09, hole_ring=0.0):
    """Pressed disc wheel face with punched holes."""
    rod((0, y0 + 0.1, 0), (0, y0, 0), rr * 0.95, mat, 64)
    for i in range(holes):
        a = TAU * i / holes + 0.3
        px, pz = hole_ring * math.cos(a), hole_ring * math.sin(a)
        rod((px, y0 + 0.02, pz), (px, y0 - 0.02, pz), hole_r, hole_mat, 20)


def spokes(y0, r_in, r_out, n, width, mat, depth=0.1, twin=0.0, phase=0.0):
    """Radial spokes on the wheel face (twin gives double-spoke pairs)."""
    offsets = (-twin, twin) if twin else (0.0,)
    for i in range(n):
        for off in offsets:
            a = TAU * i / n + phase + off
            m = (r_in + r_out) / 2
            box((m * math.cos(a), y0, m * math.sin(a)), (r_out - r_in, depth, width), mat, width * 0.2, (0, -a, 0))


def rim_barrel(y0, rr, depth, mat="alloy", lip=0.05):
    """Rim lip ring, barrel and dark dish behind the spokes."""
    torus((0, y0, 0), rr, lip, mat, (math.pi / 2, 0, 0), 72)
    rod((0, y0, 0), (0, y0 + depth, 0), rr - 0.02, "cast", 64)


def centre_nut(y0, r, mat="chrome", length=0.12):
    rod((0, y0, 0), (0, y0 - length, 0), r, mat, 6)


def lip_accent(y0, rr, mat="teal", t=0.014):
    arc((0, y0 - 0.01, 0), rr * 0.97, "y", mat, t)


def pipe(points, r, mat, joints=True):
    """Round tube through points, with ball joints at the bends."""
    for a, b in zip(points, points[1:]):
        rod(a, b, r, mat, 16, bevel=0)
    if joints:
        for p in points[1:-1]:
            kit.ball(p, r, mat)


# ── Wheels ─────────────────────────────────────────────────────────────────


def wheel_busted():
    """A scrap-yard wheel: tyre torn open at the shoulder, rim rusted and sagging."""
    r, w = 1.0, 0.55
    gap = (0.55, 1.45)
    tire(r, w, 0.62, 0.17, 0.04, 0.1, gap[1], gap[0] + TAU, "rubber", 54)
    # Torn-out carcass: bare belt cords hanging across the gap.
    for k in range(5):
        a = gap[0] + 0.15 + 0.17 * k
        y = -0.18 + 0.09 * k
        tube([(r * 0.9 * math.cos(a), y, r * 0.9 * math.sin(a)),
              (r * 1.05 * math.cos(a + 0.2), y + 0.05, r * 1.0 * math.sin(a + 0.2) - 0.1 * (k % 2)),
              (r * 1.12 * math.cos(a + 0.3), y + 0.08, r * 1.06 * math.sin(a + 0.3) - 0.15)], "steel", 0.016)
    face = -w / 2 + 0.02
    rod((0, face + 0.1, -0.08), (0, face, -0.08), 0.64, "rust", 48)
    rod((0, face + 0.1, -0.08), (0, face - 0.06, -0.08), 0.18, "rust", 24)
    for i in range(5):
        a = TAU * i / 5 + 0.2
        px, pz = 0.38 * math.cos(a), 0.38 * math.sin(a) - 0.08
        rod((px, face + 0.03, pz), (px, face - 0.03, pz), 0.1, "cast", 16)
    torus((0, face, -0.08), 0.64, 0.05, "rust", (math.pi / 2, 0, 0), 48)
    # Crack across the sidewall: the one accent, fuchsia for damage.
    yy = -w / 2 - 0.012
    tube([(-0.78, yy, 0.18), (-0.7, yy, 0.05), (-0.8, yy, -0.08), (-0.72, yy, -0.28), (-0.82, yy, -0.4)], "fuchsia", 0.012, smooth=False)


def wheel_kart():
    """Go-kart slick: small, fat and smooth on a three-hole magnesium rim."""
    r, w = 0.78, 0.92
    tire(r, w, 0.45, 0.3, 0.1, 0.2)
    y0 = -w / 2 + 0.03
    rim_barrel(y0, 0.46, 0.2, "alloy", 0.045)
    hub_disc(y0 + 0.02, 0.44, "alloy", 3, "cast", 0.13, 0.26)
    rod((0, y0 + 0.02, 0), (0, y0 - 0.06, 0), 0.14, "alloy", 24)
    centre_nut(y0 - 0.04, 0.06)
    lip_accent(y0 - 0.03, 0.46)


def wheel_river():
    """Light river-trailer tyre: tall, narrow, rounded and ribbed on a steel rim."""
    r, w = 0.95, 0.44
    tire(r - 0.07, w, 0.5, 0.16, 0.08, 0.16)
    ribs(r - 0.07, [-0.15, 0.0, 0.15], 0.07, 0.07)
    y0 = -w / 2 + 0.06
    rod((0, y0 + 0.08, 0), (0, y0, 0), 0.5, "steel", 64)
    torus((0, y0, 0), 0.5, 0.04, "steel", (math.pi / 2, 0, 0), 64)
    rod((0, y0, 0), (0, y0 - 0.06, 0), 0.2, "alloy", 32)
    for i in range(5):
        a = TAU * i / 5
        px, pz = 0.32 * math.cos(a), 0.32 * math.sin(a)
        rod((px, y0 + 0.01, pz), (px, y0 - 0.05, pz), 0.045, "chrome", 12)
    lip_accent(y0 - 0.04, 0.5)


def wheel_sport():
    """Low-profile road tyre on a five-twin-spoke alloy, shallow tread grooves."""
    r, w = 1.0, 0.62
    tire(r, w, 0.7, 0.2, 0.03, 0.12)
    for y in (-0.13, 0.13):
        torus((0, y, 0), r - 0.015, 0.012, "cast", (math.pi / 2, 0, 0), 72)
    y0 = -w / 2 + 0.03
    rim_barrel(y0, 0.7, 0.2, "alloy", 0.05)
    spokes(y0 - 0.01, 0.12, 0.68, 5, 0.12, "alloy", 0.09, 0.1, 0.1)
    rod((0, y0 + 0.02, 0), (0, y0 - 0.06, 0), 0.2, "alloy", 32)
    centre_nut(y0 - 0.05, 0.07)
    lip_accent(y0 - 0.05, 0.7)


def wheel_knobby():
    """Wheelbarrow tyre: narrow and fat, big chunky blocks, battered steel hub."""
    r, w = 0.92, 0.52
    tire(r, w, 0.42, 0.18, 0.1, 0.16, steps=48)
    blocks(r, [(-0.13, (0.2, 0.2, 0.2), 14, 0.0, 0.3), (0.13, (0.2, 0.2, 0.2), 14, TAU / 28, -0.3)])
    y0 = -w / 2 + 0.01
    rod((0, y0 + 0.1, 0), (0, y0, 0), 0.44, "rust", 48)
    torus((0, y0, 0), 0.44, 0.04, "steel", (math.pi / 2, 0, 0), 48)
    rod((0, y0, 0), (0, y0 - 0.1, 0), 0.14, "steel", 24)
    centre_nut(y0 - 0.08, 0.07, "alloy")
    arc((0, y0 - 0.03, 0), 0.4, "y", "teal", 0.012, 1.0, 2.6)


def wheel_dirt():
    """Dirt-track tyre: tall paddle blocks in staggered rows on a beadlock rim."""
    r, w = 1.08, 0.78
    tire(r - 0.02, w, 0.58, 0.24, 0.0, 0.14)
    blocks(r - 0.02, [(-0.25, (0.26, 0.22, 0.2), 16, 0.0, 0.0), (0.0, (0.26, 0.2, 0.2), 16, TAU / 32, 0.0),
                      (0.25, (0.26, 0.22, 0.2), 16, 0.0, 0.0)])
    y0 = -w / 2 + 0.04
    rim_barrel(y0, 0.58, 0.2, "alloy", 0.06)
    hub_disc(y0 + 0.02, 0.5, "steel", 0)
    torus((0, y0 - 0.02, 0), 0.52, 0.04, "alloy", (math.pi / 2, 0, 0), 64)
    for i in range(12):
        a = TAU * i / 12
        px, pz = 0.52 * math.cos(a), 0.52 * math.sin(a)
        rod((px, y0, pz), (px, y0 - 0.08, pz), 0.035, "chrome", 8)
    rod((0, y0, 0), (0, y0 - 0.1, 0), 0.16, "alloy", 24)
    lip_accent(y0 - 0.05, 0.6)


def wheel_at():
    """Truck all-terrain tyre: big staggered shoulder lugs, six-hole steel wheel."""
    r, w = 1.18, 0.78
    tire(r - 0.02, w, 0.7, 0.25, 0.04, 0.14)
    blocks(r - 0.02, [(-0.3, (0.3, 0.17, 0.14), 18, 0.0, 0.5), (0.3, (0.3, 0.17, 0.14), 18, 0.0, -0.5),
                      (-0.1, (0.26, 0.15, 0.1), 18, TAU / 36, 0.0), (0.1, (0.26, 0.15, 0.1), 18, TAU / 36, 0.0)])
    y0 = -w / 2 + 0.05
    rim_barrel(y0, 0.7, 0.2, "steel", 0.05)
    hub_disc(y0 + 0.02, 0.68, "steel", 6, "cast", 0.1, 0.4)
    rod((0, y0 + 0.02, 0), (0, y0 - 0.08, 0), 0.26, "steel", 32)
    for i in range(6):
        a = TAU * i / 6 + 0.5
        px, pz = 0.18 * math.cos(a), 0.18 * math.sin(a)
        rod((px, y0, pz), (px, y0 - 0.1, pz), 0.035, "chrome", 8)
    lip_accent(y0 - 0.05, 0.7)


def wheel_slick():
    """Racing slick: bald, wide and low, on a lightweight twelve-spoke alloy."""
    r, w = 1.0, 1.0
    tire(r, w, 0.68, 0.3, 0.015, 0.1)
    y0 = -w / 2 + 0.03
    rim_barrel(y0, 0.68, 0.22, "alloy", 0.045)
    spokes(y0 - 0.01, 0.16, 0.66, 12, 0.055, "alloy", 0.07)
    torus((0, y0 - 0.01, 0), 0.36, 0.02, "alloy", (math.pi / 2, 0, 0), 48)
    rod((0, y0 + 0.02, 0), (0, y0 - 0.07, 0), 0.19, "alloy", 32)
    rod((0, y0 - 0.06, 0), (0, y0 - 0.14, 0), 0.1, "chrome", 6)
    lip_accent(y0 - 0.04, 0.68, "teal", 0.016)


def wheel_groove():
    """Hand-grooved dirt tyre: deep circumferential grooves cut into a tall rubber slab."""
    r, w = 1.08, 0.86
    tire(r - 0.1, w, 0.62, 0.26, 0.05, 0.14)
    ys = [-0.32, -0.16, 0.0, 0.16, 0.32]
    ribs(r - 0.1, ys, 0.11, 0.1)
    for y in ys:
        for i in range(36):
            a = TAU * i / 36
            box(((r - 0.04) * math.cos(a), y, (r - 0.04) * math.sin(a)), (0.085, 0.1, 0.05), "rubber", 0.01,
                (0, -a + math.pi / 2, 0))
    y0 = -w / 2 + 0.04
    rim_barrel(y0, 0.62, 0.2, "alloy", 0.055)
    spokes(y0 - 0.01, 0.14, 0.6, 6, 0.16, "alloy", 0.09)
    rod((0, y0 + 0.02, 0), (0, y0 - 0.07, 0), 0.22, "alloy", 32)
    centre_nut(y0 - 0.06, 0.08)
    lip_accent(y0 - 0.05, 0.62)


# ── Frames ─────────────────────────────────────────────────────────────────


def angle_x(x0, x1, y, z, mat="rust", leg=0.3, t=0.06):
    """Angle iron running along X: a flat leg and an upright leg."""
    m = (x0 + x1) / 2
    box((m, y, z), (abs(x1 - x0), leg, t), mat, 0.01)
    box((m, y - (leg - t) / 2, z + (leg - t) / 2), (abs(x1 - x0), t, leg), mat, 0.01)


def angle_y(x, y0, y1, z, mat="steel", leg=0.3, t=0.06):
    m = (y0 + y1) / 2
    box((x, m, z), (leg, abs(y1 - y0), t), mat, 0.01)
    box((x - (leg - t) / 2, m, z + (leg - t) / 2), (t, abs(y1 - y0), leg), mat, 0.01)


def frame_scrap():
    """Welded angle iron ladder with a cracked rail and a plank for a floor."""
    angle_x(-3.3, 1.2, -1.4, 0.15)
    angle_x(1.8, 3.3, -1.4, 0.3)
    angle_x(-3.3, 3.3, 1.4, 0.15)
    for x in (-3.1, -0.3, 2.3):
        angle_y(x, -1.4, 1.4, 0.15)
    pipe([(-3.1, -1.4, 0.45), (-0.3, 1.4, 0.45)], 0.05, "rust", False)
    box((-1.6, 0.0, 0.5), (2.6, 2.4, 0.1), "wood", 0.015, (0, 0, 0.05))
    for x, y in ((-3.1, -1.4), (-0.3, 1.4), (2.3, 1.4), (-0.3, -1.4), (2.3, -1.4)):
        box((x, y, 0.4), (0.5, 0.5, 0.05), "steel", 0.01)
        kit.ball((x, y, 0.46), 0.07, "rust")
    box((1.5, -1.4, 0.3), (0.55, 0.08, 0.3), "fuchsia", 0)  # the cracked weld, glowing hot


def frame_mower():
    """A riding-mower deck: stamped red steel shell, blade bulges, engine plate and seat post."""
    box((0, 0, 0.35), (6.2, 4.6, 0.7), "oxblood", 0.2)
    box((0, 0, 0.74), (5.9, 4.3, 0.1), "oxblood", 0.05)
    for x in (-1.45, 1.45):
        rod((x, 0, 0.78), (x, 0, 0.92), 1.6, "oxblood", 48)
        rod((x, 0, 0.92), (x, 0, 0.98), 0.3, "cast", 24)
    box((0, 0, 1.0), (2.2, 2.2, 0.12), "steel", 0.02)
    for sx in (-0.85, 0.85):
        for sy in (-0.85, 0.85):
            rod((sx, sy, 1.06), (sx, sy, 1.16), 0.07, "chrome", 6)
    box((-0.4, -2.55, 0.4), (1.5, 1.1, 0.55), "oxblood", 0.1)
    box((-0.4, -3.05, 0.4), (1.3, 0.2, 0.45), "cast", 0.05)
    for x in (-2.9, 2.9):
        for y in (-2.0, 2.0):
            rod((x, y, -0.2), (x, y, 0.3), 0.04, "steel", 12)
            rod((x, y - 0.12, -0.2), (x, y + 0.12, -0.2), 0.2, "rubber", 24)
    pipe([(3.1, -2.1, 0.45), (3.4, 0, 0.5), (3.1, 2.1, 0.45)], 0.08, "steel")
    rod((-2.6, 0, 1.0), (-2.6, 0, 2.4), 0.1, "steel", 12)
    box((-2.6, 0, 2.45), (1.5, 1.7, 0.2), "plastic", 0.07)
    box((3.07, 0, 0.6), (0.06, 4.3, 0.1), "teal", 0)


def frame_kart():
    """Racing kart chassis: bent steel tube loop, floor pan, steering column and axles."""
    r = 0.1
    for s in (-1, 1):
        pipe([(-3.0, s * 1.6, 0.35), (-1.0, s * 1.5, 0.35), (1.8, s * 1.4, 0.35), (3.2, s * 0.85, 0.45)], r, "steel")
        pipe([(-1.0, s * 1.5, 0.35), (-0.6, s * 1.5, 1.2)], 0.07, "steel")
    pipe([(3.2, -0.85, 0.45), (3.55, 0, 0.5), (3.2, 0.85, 0.45)], r, "steel")
    pipe([(-3.0, -1.6, 0.35), (-3.3, 0, 0.4), (-3.0, 1.6, 0.35)], r, "steel")
    for x in (-1.0, 1.2):
        pipe([(x, -1.5, 0.35), (x, 1.5, 0.35)], r * 0.85, "steel")
    box((0.1, 0, 0.25), (3.3, 2.4, 0.06), "cast", 0.02)
    rod((-2.5, -2.4, 0.35), (-2.5, 2.4, 0.35), 0.12, "alloy", 20)
    for s in (-1, 1):
        rod((2.6, s * 1.0, 0.45), (2.6, s * 1.95, 0.45), 0.08, "alloy", 12)
        box((2.6, s * 1.0, 0.45), (0.3, 0.2, 0.2), "steel", 0.03)
    pipe([(1.9, 0, 0.5), (1.4, 0, 1.6)], 0.08, "alloy", False)
    torus((1.25, 0, 1.75), 0.55, 0.045, "plastic", (math.radians(65), 0, math.radians(90)), 32)
    kit.ball((1.4, 0, 1.6), 0.13, "teal")
    box((-2.0, 1.2, 0.6), (0.9, 1.0, 0.1), "steel", 0.02)


def frame_steel():
    """Sedan subframe: boxed steel rails, cross members, control-arm forks with rubber bushings."""
    for s in (-1, 1):
        box((-0.3, s * 1.6, 0.4), (7.2, 0.45, 0.4), "steel", 0.08)
        box((-3.9, s * 1.6, 0.4), (0.3, 0.7, 0.5), "steel", 0.05)
    for x in (-3.6, -1.0, 1.8):
        box((x, 0, 0.4), (0.45, 3.2, 0.34), "steel", 0.06)
    box((3.4, 0, 0.55), (0.45, 3.4, 0.5), "cast", 0.08)  # front crossmember
    for s in (-1, 1):
        for x in (1.4, 2.4):
            rod((x, s * 1.8, 0.4), (x + 0.4, s * 3.0, 0.4), 0.14, "steel", 16)
        box((1.9, s * 2.4, 0.4), (1.2, 0.2, 0.12), "steel", 0.03, (0, 0, s * 0.2))
        rod((1.55, s * 3.05, 0.1), (1.55, s * 3.05, 0.75), 0.22, "rubber", 24)
        rod((2.8, s * 3.05, 0.1), (2.8, s * 3.05, 0.75), 0.22, "rubber", 24)
        rod((-3.6, s * 2.2, 0.2), (-3.6, s * 2.2, 0.8), 0.2, "rubber", 24)
        box((-3.6, s * 2.0, 0.4), (0.4, 0.7, 0.14), "steel", 0.03)
    rod((2.6, -1.2, 0.95), (2.6, 1.2, 0.95), 0.16, "alloy", 20)  # steering rack
    box((3.63, 0, 0.55), (0.04, 3.0, 0.1), "teal", 0)
    for x in (-1.0, 1.8):
        for s in (-1, 1):
            rod((x, s * 1.0, 0.55), (x, s * 1.0, 0.62), 0.09, "cast", 16)


def frame_wagon():
    """Little red wagon: flared pressed-steel tub, four wheels, bent pull handle."""
    box((0, 0, 0.1), (6.0, 3.0, 0.14), "oxblood", 0.04)
    for s, tilt in ((-1, 0.22), (1, -0.22)):
        box((0, s * 1.58, 0.65), (6.2, 0.12, 1.0), "oxblood", 0.03, (tilt, 0, 0))
    for s, tilt in ((-1, -0.22), (1, 0.22)):
        box((s * 3.1, 0, 0.65), (0.12, 3.3, 1.0), "oxblood", 0.03, (0, tilt, 0))
    pipe([(-3.35, -1.72, 1.12), (3.35, -1.72, 1.12), (3.35, 1.72, 1.12), (-3.35, 1.72, 1.12), (-3.35, -1.72, 1.12)], 0.06, "steel", False)
    for x in (-2.0, 2.2):
        rod((x, -2.0, -0.35), (x, 2.0, -0.35), 0.06, "steel", 12)
        for s in (-1, 1):
            rod((x, s * 2.15, -0.35), (x, s * 1.92, -0.35), 0.58, "rubber", 32)
            rod((x, s * 2.15, -0.35), (x, s * 2.2, -0.35), 0.4, "steel", 24)
            kit.ball((x, s * 2.2, -0.35), 0.1, "alloy")
    box((2.2, 0, -0.2), (0.4, 3.0, 0.15), "steel", 0.03)
    pipe([(3.0, 0, -0.1), (4.6, 0.2, 0.5), (6.5, 0.6, 1.5), (7.0, 0.7, 1.9)], 0.07, "steel")
    rod((6.85, 0.45, 1.85), (7.2, 0.95, 1.95), 0.12, "plastic", 16)
    box((0.2, -1.69, 0.78), (4.4, 0.04, 0.12), "teal", 0, (0.22, 0, 0))


def frame_tube():
    """Race-car spaceframe: triangulated chromoly tube cage with suspension mounts."""
    r = 0.09
    low = [(-4.0, 1.3, 0.0), (0.0, 1.5, 0.0), (3.4, 1.0, 0.0)]
    up = [(-3.6, 1.1, 1.7), (-0.4, 1.35, 1.2), (2.6, 0.9, 1.0)]

    def side(s):
        return [(x, s * y, z) for x, y, z in low], [(x, s * y, z) for x, y, z in up]

    for s in (-1, 1):
        lo, hi = side(s)
        pipe(lo, r, "alloy")
        pipe(hi, r, "alloy")
        for a, b in zip(lo, hi):
            pipe([a, b], r * 0.85, "alloy", False)
        pipe([lo[1], hi[0]], r * 0.7, "alloy", False)
        pipe([lo[1], hi[2]], r * 0.7, "alloy", False)
        pipe([lo[0], hi[1]], r * 0.7, "alloy", False)
        pipe([lo[2], hi[2]], r * 0.7, "alloy", False)
    for a, b in zip(low + up, low + up):
        pipe([(a[0], -a[1], a[2]), a], r * 0.9, "alloy", False)
    pipe([(-3.6, -1.1, 1.7), (2.6, 0.9, 1.0)], r * 0.6, "alloy", False)
    pipe([(-3.6, 1.1, 1.7), (2.6, -0.9, 1.0)], r * 0.6, "alloy", False)
    for p in low + up:
        for s in (-1, 1):
            kit.ball((p[0], s * p[1], p[2]), r * 1.15, "alloy")
    for p in ((3.4, -1.0, 0.0), (3.4, 1.0, 0.0), (-4.0, -1.3, 0.0), (-4.0, 1.3, 0.0)):
        box(p, (0.5, 0.5, 0.08), "steel", 0.02)
    pipe([(-0.4, -1.35, 1.2), (2.6, -0.9, 1.0)], r * 1.12, "teal", False)


def frame_cage():
    """Caged chassis: steel sills and crossmembers under a full roll cage and window net."""
    for s in (-1, 1):
        box((-0.2, s * 2.1, 0.3), (8.4, 0.5, 0.45), "steel", 0.08)
    for x in (-3.4, -1.2, 1.2, 3.4):
        box((x, 0, 0.3), (0.4, 4.2, 0.3), "steel", 0.05)
    box((0.2, 0, 0.18), (7.4, 3.8, 0.06), "cast", 0.02)
    r = 0.11
    for s in (-1, 1):
        pipe([(2.0, s * 2.05, 0.5), (1.5, s * 1.95, 3.0)], r, "alloy")
        pipe([(-1.1, s * 2.05, 0.5), (-1.1, s * 2.0, 3.2)], r, "alloy")
        pipe([(-1.1, s * 2.0, 3.2), (-3.2, s * 1.4, 0.5)], r * 0.9, "alloy")
        for z in (1.0, 1.8, 2.5):
            pipe([(-1.1, s * 2.03, z), (1.9 - (z - 1.0) * 0.25, s * 1.99, z)], r * 0.85, "alloy", False)
        pipe([(2.0, s * 2.05, 0.5), (3.2, s * 1.2, 0.5)], r * 0.9, "alloy")
    pipe([(-1.1, -2.0, 3.2), (-1.1, 2.0, 3.2)], r, "alloy")
    pipe([(-1.1, -2.0, 0.6), (-1.1, 2.0, 3.0)], r * 0.7, "alloy", False)
    pipe([(-1.1, 2.0, 0.6), (-1.1, -2.0, 3.0)], r * 0.7, "alloy", False)
    for i in range(7):
        x = -1.0 + i * 0.4
        rod((x, -2.08, 1.1), (x, -2.08, 2.9), 0.025, "plastic", 8)
    for j in range(6):
        z = 1.2 + j * 0.33
        rod((-1.0, -2.08, z), (1.6, -2.08, z), 0.025, "plastic", 8)
    pipe([(-1.1, -2.0, 3.2), (1.5, -1.95, 3.0)], r * 1.12, "teal", False)
    pipe([(1.5, 1.95, 3.0), (-1.1, 2.0, 3.2)], r * 1.12, "teal", False)
    pipe([(1.5, -1.95, 3.0), (1.5, 1.95, 3.0)], r, "alloy")


PARTS = {
    "wheel_basic": wheel_basic,
    "wheel_busted": wheel_busted,
    "wheel_kart": wheel_kart,
    "wheel_river": wheel_river,
    "wheel_sport": wheel_sport,
    "wheel_knobby": wheel_knobby,
    "wheel_dirt": wheel_dirt,
    "wheel_at": wheel_at,
    "wheel_slick": wheel_slick,
    "wheel_groove": wheel_groove,
    "frame_scrap": frame_scrap,
    "frame_mower": frame_mower,
    "frame_kart": frame_kart,
    "frame_steel": frame_steel,
    "frame_wagon": frame_wagon,
    "frame_tube": frame_tube,
    "frame_cage": frame_cage,
}


# ── Shared wheel and frame helpers ─────────────────────────────────────────


def revolve(profile, mat, a0=0.0, a1=TAU, steps=72, smooth=True):
    """Lathe a closed (radius, y) profile around the Y axis."""
    full = abs(a1 - a0 - TAU) < 1e-6
    n = len(profile)
    rings = steps if full else steps + 1
    verts = []
    for k in range(rings):
        a = a0 + (a1 - a0) * k / steps
        verts += [(rho * math.cos(a), y, rho * math.sin(a)) for rho, y in profile]
    faces = []
    for k in range(steps):
        k2 = (k + 1) % rings
        for i in range(n):
            j = (i + 1) % n
            faces.append((k * n + i, k * n + j, k2 * n + j, k2 * n + i))
    if not full:
        faces.append(tuple(range(n)))
        faces.append(tuple(range((rings - 1) * n, rings * n)))
    obj = kit.mesh_from(verts, faces, mat, "Lathe", smooth=smooth)
    bm = kit.bmesh.new()
    bm.from_mesh(obj.data)
    kit.bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(obj.data)
    bm.free()
    return obj


def tire(r, w, rb, wb, bulge=0.0, corner=0.12, a0=0.0, a1=TAU, mat="rubber", steps=72):
    """Tyre carcass. r outer radius, w width, rb bead radius, wb bead half width,
    bulge pulls the crown shoulders in (round tread), corner rounds the shoulder."""
    c, hw = corner, w / 2
    mid = rb + 0.5 * (r - rb)
    re = r - bulge
    pts = [(rb, -wb), (mid, -hw), (re - c, -hw)]
    pts += [(re - c + c * math.sin(t), -hw + c - c * math.cos(t)) for t in (0.4, 0.8, 1.2)]
    ys = [-hw + c + (w - 2 * c) * i / 6 for i in range(7)]
    pts += [(r - bulge * (y / (hw - c)) ** 2, y) for y in ys]
    pts += [(re - c + c * math.sin(t), hw - c + c * math.cos(t)) for t in (1.2, 0.8, 0.4)]
    pts += [(re - c, hw), (mid, hw), (rb, wb)]
    return revolve(pts, mat, a0, a1, steps)


def blocks(r, rows, mat="rubber"):
    """Tread blocks around the crown. rows: (y, (tangent, width, height), count, phase, chevron)."""
    for y, (dt, dw, dh), n, phase, chev in rows:
        for i in range(n):
            a = phase + TAU * i / n
            rot = (Matrix.Rotation(-a + math.pi / 2, 3, "Y") @ Matrix.Rotation(chev, 3, "Z")).to_euler()
            c = r + dh / 2 - 0.03
            box((c * math.cos(a), y, c * math.sin(a)), (dt, dw, dh), mat, min(dt, dw, dh) * 0.15, tuple(rot))


def ribs(r, ys, width, height, mat="rubber"):
    """Circumferential tread ribs: rings standing proud of the crown."""
    for y in ys:
        rod((0, y - width / 2, 0), (0, y + width / 2, 0), r + height, mat, 72)


def hub_disc(y0, rr, mat, holes=0, hole_mat="cast", hole_r=0.09, hole_ring=0.0):
    """Pressed disc wheel face with punched holes."""
    rod((0, y0 + 0.1, 0), (0, y0, 0), rr * 0.95, mat, 64)
    for i in range(holes):
        a = TAU * i / holes + 0.3
        px, pz = hole_ring * math.cos(a), hole_ring * math.sin(a)
        rod((px, y0 + 0.02, pz), (px, y0 - 0.02, pz), hole_r, hole_mat, 20)


def spokes(y0, r_in, r_out, n, width, mat, depth=0.1, twin=0.0, phase=0.0):
    """Radial spokes on the wheel face (twin gives double-spoke pairs)."""
    offsets = (-twin, twin) if twin else (0.0,)
    for i in range(n):
        for off in offsets:
            a = TAU * i / n + phase + off
            m = (r_in + r_out) / 2
            box((m * math.cos(a), y0, m * math.sin(a)), (r_out - r_in, depth, width), mat, width * 0.2, (0, -a, 0))


def rim_barrel(y0, rr, depth, mat="alloy", lip=0.05):
    """Rim lip ring, barrel and dark dish behind the spokes."""
    torus((0, y0, 0), rr, lip, mat, (math.pi / 2, 0, 0), 72)
    rod((0, y0, 0), (0, y0 + depth, 0), rr - 0.02, "cast", 64)


def centre_nut(y0, r, mat="chrome", length=0.12):
    rod((0, y0, 0), (0, y0 - length, 0), r, mat, 6)


def lip_accent(y0, rr, mat="teal", t=0.014):
    arc((0, y0 - 0.01, 0), rr * 0.97, "y", mat, t)


def pipe(points, r, mat, joints=True):
    """Round tube through points, with ball joints at the bends."""
    for a, b in zip(points, points[1:]):
        rod(a, b, r, mat, 16, bevel=0)
    if joints:
        for p in points[1:-1]:
            kit.ball(p, r, mat)


# ── Wheels ─────────────────────────────────────────────────────────────────


def wheel_busted():
    """A scrap-yard wheel: tyre torn open at the shoulder, rim rusted and sagging."""
    r, w = 1.0, 0.55
    gap = (0.55, 1.45)
    tire(r, w, 0.62, 0.17, 0.04, 0.1, gap[1], gap[0] + TAU, "rubber", 54)
    # Torn-out carcass: bare belt cords hanging across the gap.
    for k in range(5):
        a = gap[0] + 0.15 + 0.17 * k
        y = -0.18 + 0.09 * k
        tube([(r * 0.9 * math.cos(a), y, r * 0.9 * math.sin(a)),
              (r * 1.05 * math.cos(a + 0.2), y + 0.05, r * 1.0 * math.sin(a + 0.2) - 0.1 * (k % 2)),
              (r * 1.12 * math.cos(a + 0.3), y + 0.08, r * 1.06 * math.sin(a + 0.3) - 0.15)], "steel", 0.016)
    face = -w / 2 + 0.02
    rod((0, face + 0.1, -0.08), (0, face, -0.08), 0.64, "rust", 48)
    rod((0, face + 0.1, -0.08), (0, face - 0.06, -0.08), 0.18, "rust", 24)
    for i in range(5):
        a = TAU * i / 5 + 0.2
        px, pz = 0.38 * math.cos(a), 0.38 * math.sin(a) - 0.08
        rod((px, face + 0.03, pz), (px, face - 0.03, pz), 0.1, "cast", 16)
    torus((0, face, -0.08), 0.64, 0.05, "rust", (math.pi / 2, 0, 0), 48)
    # Crack across the sidewall: the one accent, fuchsia for damage.
    yy = -w / 2 - 0.012
    tube([(-0.78, yy, 0.18), (-0.7, yy, 0.05), (-0.8, yy, -0.08), (-0.72, yy, -0.28), (-0.82, yy, -0.4)], "fuchsia", 0.012, smooth=False)


def wheel_kart():
    """Go-kart slick: small, fat and smooth on a three-hole magnesium rim."""
    r, w = 0.78, 0.92
    tire(r, w, 0.45, 0.3, 0.1, 0.2)
    y0 = -w / 2 + 0.03
    rim_barrel(y0, 0.46, 0.2, "alloy", 0.045)
    hub_disc(y0 + 0.02, 0.44, "alloy", 3, "cast", 0.13, 0.26)
    rod((0, y0 + 0.02, 0), (0, y0 - 0.06, 0), 0.14, "alloy", 24)
    centre_nut(y0 - 0.04, 0.06)
    lip_accent(y0 - 0.03, 0.46)


def wheel_river():
    """Light river-trailer tyre: tall, narrow, rounded and ribbed on a steel rim."""
    r, w = 0.95, 0.44
    tire(r - 0.07, w, 0.5, 0.16, 0.08, 0.16)
    ribs(r - 0.07, [-0.15, 0.0, 0.15], 0.07, 0.07)
    y0 = -w / 2 + 0.06
    rod((0, y0 + 0.08, 0), (0, y0, 0), 0.5, "steel", 64)
    torus((0, y0, 0), 0.5, 0.04, "steel", (math.pi / 2, 0, 0), 64)
    rod((0, y0, 0), (0, y0 - 0.06, 0), 0.2, "alloy", 32)
    for i in range(5):
        a = TAU * i / 5
        px, pz = 0.32 * math.cos(a), 0.32 * math.sin(a)
        rod((px, y0 + 0.01, pz), (px, y0 - 0.05, pz), 0.045, "chrome", 12)
    lip_accent(y0 - 0.04, 0.5)


def wheel_sport():
    """Low-profile road tyre on a five-twin-spoke alloy, shallow tread grooves."""
    r, w = 1.0, 0.62
    tire(r, w, 0.7, 0.2, 0.03, 0.12)
    for y in (-0.13, 0.13):
        torus((0, y, 0), r - 0.015, 0.012, "cast", (math.pi / 2, 0, 0), 72)
    y0 = -w / 2 + 0.03
    rim_barrel(y0, 0.7, 0.2, "alloy", 0.05)
    spokes(y0 - 0.01, 0.12, 0.68, 5, 0.12, "alloy", 0.09, 0.1, 0.1)
    rod((0, y0 + 0.02, 0), (0, y0 - 0.06, 0), 0.2, "alloy", 32)
    centre_nut(y0 - 0.05, 0.07)
    lip_accent(y0 - 0.05, 0.7)


def wheel_knobby():
    """Wheelbarrow tyre: narrow and fat, big chunky blocks, battered steel hub."""
    r, w = 0.92, 0.52
    tire(r, w, 0.42, 0.18, 0.1, 0.16, steps=48)
    blocks(r, [(-0.13, (0.26, 0.2, 0.15), 18, 0.0, 0.3), (0.13, (0.26, 0.2, 0.15), 18, TAU / 36, -0.3)])
    y0 = -w / 2 + 0.01
    rod((0, y0 + 0.1, 0), (0, y0, 0), 0.44, "rust", 48)
    torus((0, y0, 0), 0.44, 0.04, "steel", (math.pi / 2, 0, 0), 48)
    rod((0, y0, 0), (0, y0 - 0.1, 0), 0.14, "steel", 24)
    centre_nut(y0 - 0.08, 0.07, "alloy")
    arc((0, y0 - 0.03, 0), 0.4, "y", "teal", 0.012, 1.0, 2.6)


def wheel_dirt():
    """Dirt-track tyre: tall paddle blocks in staggered rows on a beadlock rim."""
    r, w = 1.08, 0.78
    tire(r - 0.02, w, 0.58, 0.24, 0.0, 0.14)
    blocks(r - 0.02, [(-0.25, (0.26, 0.22, 0.2), 16, 0.0, 0.0), (0.0, (0.26, 0.2, 0.2), 16, TAU / 32, 0.0),
                      (0.25, (0.26, 0.22, 0.2), 16, 0.0, 0.0)])
    y0 = -w / 2 + 0.04
    rim_barrel(y0, 0.58, 0.2, "alloy", 0.06)
    hub_disc(y0 + 0.02, 0.5, "steel", 0)
    torus((0, y0 - 0.02, 0), 0.52, 0.04, "alloy", (math.pi / 2, 0, 0), 64)
    for i in range(12):
        a = TAU * i / 12
        px, pz = 0.52 * math.cos(a), 0.52 * math.sin(a)
        rod((px, y0, pz), (px, y0 - 0.08, pz), 0.035, "chrome", 8)
    rod((0, y0, 0), (0, y0 - 0.1, 0), 0.16, "alloy", 24)
    lip_accent(y0 - 0.05, 0.6)


def wheel_at():
    """Truck all-terrain tyre: big staggered shoulder lugs, six-hole steel wheel."""
    r, w = 1.18, 0.78
    tire(r - 0.02, w, 0.7, 0.25, 0.04, 0.14)
    blocks(r - 0.02, [(-0.3, (0.3, 0.17, 0.14), 18, 0.0, 0.5), (0.3, (0.3, 0.17, 0.14), 18, 0.0, -0.5),
                      (-0.1, (0.26, 0.15, 0.1), 18, TAU / 36, 0.0), (0.1, (0.26, 0.15, 0.1), 18, TAU / 36, 0.0)])
    y0 = -w / 2 + 0.05
    rim_barrel(y0, 0.7, 0.2, "steel", 0.05)
    hub_disc(y0 + 0.02, 0.68, "steel", 6, "cast", 0.1, 0.4)
    rod((0, y0 + 0.02, 0), (0, y0 - 0.08, 0), 0.26, "steel", 32)
    for i in range(6):
        a = TAU * i / 6 + 0.5
        px, pz = 0.18 * math.cos(a), 0.18 * math.sin(a)
        rod((px, y0, pz), (px, y0 - 0.1, pz), 0.035, "chrome", 8)
    lip_accent(y0 - 0.05, 0.7)


def wheel_slick():
    """Racing slick: bald, wide and low, on a lightweight twelve-spoke alloy."""
    r, w = 1.0, 1.0
    tire(r, w, 0.68, 0.3, 0.015, 0.1)
    y0 = -w / 2 + 0.03
    rim_barrel(y0, 0.68, 0.22, "alloy", 0.045)
    spokes(y0 - 0.01, 0.16, 0.66, 12, 0.055, "alloy", 0.07)
    torus((0, y0 - 0.01, 0), 0.36, 0.02, "alloy", (math.pi / 2, 0, 0), 48)
    rod((0, y0 + 0.02, 0), (0, y0 - 0.07, 0), 0.19, "alloy", 32)
    rod((0, y0 - 0.06, 0), (0, y0 - 0.14, 0), 0.1, "chrome", 6)
    lip_accent(y0 - 0.04, 0.68, "teal", 0.016)


def wheel_groove():
    """Hand-grooved dirt tyre: deep circumferential grooves cut into a tall rubber slab."""
    r, w = 1.08, 0.86
    tire(r - 0.1, w, 0.62, 0.26, 0.05, 0.14)
    ys = [-0.32, -0.16, 0.0, 0.16, 0.32]
    ribs(r - 0.1, ys, 0.11, 0.1)
    for y in ys:
        for i in range(36):
            a = TAU * i / 36
            box(((r - 0.04) * math.cos(a), y, (r - 0.04) * math.sin(a)), (0.085, 0.1, 0.05), "rubber", 0.01,
                (0, -a + math.pi / 2, 0))
    y0 = -w / 2 + 0.04
    rim_barrel(y0, 0.62, 0.2, "alloy", 0.055)
    spokes(y0 - 0.01, 0.14, 0.6, 6, 0.16, "alloy", 0.09)
    rod((0, y0 + 0.02, 0), (0, y0 - 0.07, 0), 0.22, "alloy", 32)
    centre_nut(y0 - 0.06, 0.08)
    lip_accent(y0 - 0.05, 0.62)


# ── Frames ─────────────────────────────────────────────────────────────────


def angle_x(x0, x1, y, z, mat="rust", leg=0.3, t=0.06):
    """Angle iron running along X: a flat leg and an upright leg."""
    m = (x0 + x1) / 2
    box((m, y, z), (abs(x1 - x0), leg, t), mat, 0.01)
    box((m, y - (leg - t) / 2, z + (leg - t) / 2), (abs(x1 - x0), t, leg), mat, 0.01)


def angle_y(x, y0, y1, z, mat="steel", leg=0.3, t=0.06):
    m = (y0 + y1) / 2
    box((x, m, z), (leg, abs(y1 - y0), t), mat, 0.01)
    box((x - (leg - t) / 2, m, z + (leg - t) / 2), (t, abs(y1 - y0), leg), mat, 0.01)


def frame_scrap():
    """Welded angle iron ladder with a cracked rail and a plank for a floor."""
    angle_x(-3.3, 1.2, -1.4, 0.15)
    angle_x(1.8, 3.3, -1.4, 0.3)
    angle_x(-3.3, 3.3, 1.4, 0.15)
    for x in (-3.1, -0.3, 2.3):
        angle_y(x, -1.4, 1.4, 0.15)
    pipe([(-3.1, -1.4, 0.45), (-0.3, 1.4, 0.45)], 0.05, "rust", False)
    box((-1.6, 0.0, 0.5), (2.6, 2.4, 0.1), "wood", 0.015, (0, 0, 0.05))
    for x, y in ((-3.1, -1.4), (-0.3, 1.4), (2.3, 1.4), (-0.3, -1.4), (2.3, -1.4)):
        box((x, y, 0.4), (0.5, 0.5, 0.05), "steel", 0.01)
        kit.ball((x, y, 0.46), 0.07, "rust")
    box((1.5, -1.4, 0.3), (0.55, 0.08, 0.3), "fuchsia", 0)  # the cracked weld, glowing hot


def frame_mower():
    """A riding-mower deck: stamped red steel shell, blade bulges, engine plate and seat post."""
    box((0, 0, 0.35), (6.2, 4.6, 0.7), "oxblood", 0.2)
    box((0, 0, 0.74), (5.9, 4.3, 0.1), "oxblood", 0.05)
    for x in (-1.45, 1.45):
        rod((x, 0, 0.78), (x, 0, 0.92), 1.6, "oxblood", 48)
        rod((x, 0, 0.92), (x, 0, 0.98), 0.3, "cast", 24)
    box((0, 0, 1.0), (2.2, 2.2, 0.12), "steel", 0.02)
    for sx in (-0.85, 0.85):
        for sy in (-0.85, 0.85):
            rod((sx, sy, 1.06), (sx, sy, 1.16), 0.07, "chrome", 6)
    box((-0.4, -2.55, 0.4), (1.5, 1.1, 0.55), "oxblood", 0.1)
    box((-0.4, -3.05, 0.4), (1.3, 0.2, 0.45), "cast", 0.05)
    for x in (-2.9, 2.9):
        for y in (-2.0, 2.0):
            rod((x, y, -0.2), (x, y, 0.3), 0.04, "steel", 12)
            rod((x, y - 0.12, -0.2), (x, y + 0.12, -0.2), 0.2, "rubber", 24)
    pipe([(3.1, -2.1, 0.45), (3.4, 0, 0.5), (3.1, 2.1, 0.45)], 0.08, "steel")
    rod((-2.6, 0, 1.0), (-2.6, 0, 2.4), 0.1, "steel", 12)
    box((-2.6, 0, 2.45), (1.5, 1.7, 0.2), "plastic", 0.07)
    box((3.07, 0, 0.6), (0.06, 4.3, 0.1), "teal", 0)


def frame_kart():
    """Racing kart chassis: bent steel tube loop, floor pan, steering column and axles."""
    r = 0.1
    for s in (-1, 1):
        pipe([(-3.0, s * 1.6, 0.35), (-1.0, s * 1.5, 0.35), (1.8, s * 1.4, 0.35), (3.2, s * 0.85, 0.45)], r, "steel")
        pipe([(-1.0, s * 1.5, 0.35), (-0.6, s * 1.5, 1.2)], 0.07, "steel")
    pipe([(3.2, -0.85, 0.45), (3.55, 0, 0.5), (3.2, 0.85, 0.45)], r, "steel")
    pipe([(-3.0, -1.6, 0.35), (-3.3, 0, 0.4), (-3.0, 1.6, 0.35)], r, "steel")
    for x in (-1.0, 1.2):
        pipe([(x, -1.5, 0.35), (x, 1.5, 0.35)], r * 0.85, "steel")
    box((0.1, 0, 0.25), (3.3, 2.4, 0.06), "cast", 0.02)
    rod((-2.5, -2.4, 0.35), (-2.5, 2.4, 0.35), 0.12, "alloy", 20)
    for s in (-1, 1):
        rod((2.6, s * 1.0, 0.45), (2.6, s * 1.95, 0.45), 0.08, "alloy", 12)
        box((2.6, s * 1.0, 0.45), (0.3, 0.2, 0.2), "steel", 0.03)
    pipe([(1.9, 0, 0.5), (1.4, 0, 1.6)], 0.08, "alloy", False)
    torus((1.25, 0, 1.75), 0.55, 0.045, "plastic", (math.radians(65), 0, math.radians(90)), 32)
    kit.ball((1.4, 0, 1.6), 0.13, "teal")
    box((-2.0, 1.2, 0.6), (0.9, 1.0, 0.1), "steel", 0.02)


def frame_steel():
    """Sedan subframe: boxed steel rails, cross members, control-arm forks with rubber bushings."""
    for s in (-1, 1):
        box((-0.3, s * 1.6, 0.4), (7.2, 0.45, 0.4), "steel", 0.08)
        box((-3.9, s * 1.6, 0.4), (0.3, 0.7, 0.5), "steel", 0.05)
    for x in (-3.6, -1.0, 1.8):
        box((x, 0, 0.4), (0.45, 3.2, 0.34), "steel", 0.06)
    box((3.4, 0, 0.55), (0.45, 3.4, 0.5), "cast", 0.08)  # front crossmember
    for s in (-1, 1):
        for x in (1.4, 2.4):
            rod((x, s * 1.8, 0.4), (x + 0.4, s * 3.0, 0.4), 0.14, "steel", 16)
        box((1.9, s * 2.4, 0.4), (1.2, 0.2, 0.12), "steel", 0.03, (0, 0, s * 0.2))
        rod((1.55, s * 3.05, 0.1), (1.55, s * 3.05, 0.75), 0.22, "rubber", 24)
        rod((2.8, s * 3.05, 0.1), (2.8, s * 3.05, 0.75), 0.22, "rubber", 24)
        rod((-3.6, s * 2.2, 0.2), (-3.6, s * 2.2, 0.8), 0.2, "rubber", 24)
        box((-3.6, s * 2.0, 0.4), (0.4, 0.7, 0.14), "steel", 0.03)
    rod((2.6, -1.2, 0.95), (2.6, 1.2, 0.95), 0.16, "alloy", 20)  # steering rack
    box((3.63, 0, 0.55), (0.04, 3.0, 0.1), "teal", 0)
    for x in (-1.0, 1.8):
        for s in (-1, 1):
            rod((x, s * 1.0, 0.55), (x, s * 1.0, 0.62), 0.09, "cast", 16)


def frame_wagon():
    """Little red wagon: flared pressed-steel tub, four wheels, bent pull handle."""
    box((0, 0, 0.1), (6.0, 3.0, 0.14), "oxblood", 0.04)
    for s, tilt in ((-1, 0.22), (1, -0.22)):
        box((0, s * 1.58, 0.65), (6.2, 0.12, 1.0), "oxblood", 0.03, (tilt, 0, 0))
    for s, tilt in ((-1, -0.22), (1, 0.22)):
        box((s * 3.1, 0, 0.65), (0.12, 3.3, 1.0), "oxblood", 0.03, (0, tilt, 0))
    pipe([(-3.35, -1.72, 1.12), (3.35, -1.72, 1.12), (3.35, 1.72, 1.12), (-3.35, 1.72, 1.12), (-3.35, -1.72, 1.12)], 0.06, "steel", False)
    for x in (-2.0, 2.2):
        rod((x, -2.0, -0.35), (x, 2.0, -0.35), 0.06, "steel", 12)
        for s in (-1, 1):
            rod((x, s * 2.15, -0.35), (x, s * 1.92, -0.35), 0.58, "rubber", 32)
            rod((x, s * 2.15, -0.35), (x, s * 2.2, -0.35), 0.4, "steel", 24)
            kit.ball((x, s * 2.2, -0.35), 0.1, "alloy")
    box((2.2, 0, -0.2), (0.4, 3.0, 0.15), "steel", 0.03)
    pipe([(3.0, 0, -0.1), (4.6, 0.2, 0.5), (6.5, 0.6, 1.5), (7.0, 0.7, 1.9)], 0.07, "steel")
    rod((6.85, 0.45, 1.85), (7.2, 0.95, 1.95), 0.12, "plastic", 16)
    box((0.2, -1.69, 0.78), (4.4, 0.04, 0.12), "teal", 0, (0.22, 0, 0))


def frame_tube():
    """Race-car spaceframe: triangulated chromoly tube cage with suspension mounts."""
    r = 0.09
    low = [(-4.0, 1.3, 0.0), (0.0, 1.5, 0.0), (3.4, 1.0, 0.0)]
    up = [(-3.6, 1.1, 1.7), (-0.4, 1.35, 1.2), (2.6, 0.9, 1.0)]

    def side(s):
        return [(x, s * y, z) for x, y, z in low], [(x, s * y, z) for x, y, z in up]

    for s in (-1, 1):
        lo, hi = side(s)
        pipe(lo, r, "alloy")
        pipe(hi, r, "alloy")
        for a, b in zip(lo, hi):
            pipe([a, b], r * 0.85, "alloy", False)
        pipe([lo[1], hi[0]], r * 0.7, "alloy", False)
        pipe([lo[1], hi[2]], r * 0.7, "alloy", False)
        pipe([lo[0], hi[1]], r * 0.7, "alloy", False)
        pipe([lo[2], hi[2]], r * 0.7, "alloy", False)
    for a, b in zip(low + up, low + up):
        pipe([(a[0], -a[1], a[2]), a], r * 0.9, "alloy", False)
    pipe([(-3.6, -1.1, 1.7), (2.6, 0.9, 1.0)], r * 0.6, "alloy", False)
    pipe([(-3.6, 1.1, 1.7), (2.6, -0.9, 1.0)], r * 0.6, "alloy", False)
    for p in low + up:
        for s in (-1, 1):
            kit.ball((p[0], s * p[1], p[2]), r * 1.15, "alloy")
    for p in ((3.4, -1.0, 0.0), (3.4, 1.0, 0.0), (-4.0, -1.3, 0.0), (-4.0, 1.3, 0.0)):
        box(p, (0.5, 0.5, 0.08), "steel", 0.02)
    pipe([(-0.4, -1.35, 1.2), (2.6, -0.9, 1.0)], r * 1.12, "teal", False)


def frame_cage():
    """Caged chassis: steel sills and crossmembers under a full roll cage and window net."""
    for s in (-1, 1):
        box((-0.2, s * 2.1, 0.3), (8.4, 0.5, 0.45), "steel", 0.08)
    for x in (-3.4, -1.2, 1.2, 3.4):
        box((x, 0, 0.3), (0.4, 4.2, 0.3), "steel", 0.05)
    box((0.2, 0, 0.18), (7.4, 3.8, 0.06), "cast", 0.02)
    r = 0.11
    for s in (-1, 1):
        pipe([(2.0, s * 2.05, 0.5), (1.5, s * 1.95, 3.0)], r, "alloy")
        pipe([(-1.1, s * 2.05, 0.5), (-1.1, s * 2.0, 3.2)], r, "alloy")
        pipe([(-1.1, s * 2.0, 3.2), (-3.2, s * 1.4, 0.5)], r * 0.9, "alloy")
        for z in (1.0, 1.8, 2.5):
            pipe([(-1.1, s * 2.03, z), (1.9 - (z - 1.0) * 0.25, s * 1.99, z)], r * 0.85, "alloy", False)
        pipe([(2.0, s * 2.05, 0.5), (3.2, s * 1.2, 0.5)], r * 0.9, "alloy")
    pipe([(-1.1, -2.0, 3.2), (-1.1, 2.0, 3.2)], r, "alloy")
    pipe([(-1.1, -2.0, 0.6), (-1.1, 2.0, 3.0)], r * 0.7, "alloy", False)
    pipe([(-1.1, 2.0, 0.6), (-1.1, -2.0, 3.0)], r * 0.7, "alloy", False)
    for i in range(7):
        x = -1.0 + i * 0.4
        rod((x, -2.08, 1.1), (x, -2.08, 2.9), 0.025, "plastic", 8)
    for j in range(6):
        z = 1.2 + j * 0.33
        rod((-1.0, -2.08, z), (1.6, -2.08, z), 0.025, "plastic", 8)
    pipe([(-1.1, -2.0, 3.2), (1.5, -1.95, 3.0)], r * 1.12, "teal", False)
    pipe([(1.5, 1.95, 3.0), (-1.1, 2.0, 3.2)], r * 1.12, "teal", False)
    pipe([(1.5, -1.95, 3.0), (1.5, 1.95, 3.0)], r, "alloy")


PARTS = {
    "wheel_basic": wheel_basic,
    "wheel_busted": wheel_busted,
    "wheel_kart": wheel_kart,
    "wheel_river": wheel_river,
    "wheel_sport": wheel_sport,
    "wheel_knobby": wheel_knobby,
    "wheel_dirt": wheel_dirt,
    "wheel_at": wheel_at,
    "wheel_slick": wheel_slick,
    "wheel_groove": wheel_groove,
    "frame_scrap": frame_scrap,
    "frame_mower": frame_mower,
    "frame_kart": frame_kart,
    "frame_steel": frame_steel,
    "frame_wagon": frame_wagon,
    "frame_tube": frame_tube,
    "frame_cage": frame_cage,
}


# ── Shared wheel and frame helpers ─────────────────────────────────────────


def revolve(profile, mat, a0=0.0, a1=TAU, steps=72, smooth=True):
    """Lathe a closed (radius, y) profile around the Y axis."""
    full = abs(a1 - a0 - TAU) < 1e-6
    n = len(profile)
    rings = steps if full else steps + 1
    verts = []
    for k in range(rings):
        a = a0 + (a1 - a0) * k / steps
        verts += [(rho * math.cos(a), y, rho * math.sin(a)) for rho, y in profile]
    faces = []
    for k in range(steps):
        k2 = (k + 1) % rings
        for i in range(n):
            j = (i + 1) % n
            faces.append((k * n + i, k * n + j, k2 * n + j, k2 * n + i))
    if not full:
        faces.append(tuple(range(n)))
        faces.append(tuple(range((rings - 1) * n, rings * n)))
    obj = kit.mesh_from(verts, faces, mat, "Lathe", smooth=smooth)
    bm = kit.bmesh.new()
    bm.from_mesh(obj.data)
    kit.bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(obj.data)
    bm.free()
    return obj


def tire(r, w, rb, wb, bulge=0.0, corner=0.12, a0=0.0, a1=TAU, mat="rubber", steps=72):
    """Tyre carcass. r outer radius, w width, rb bead radius, wb bead half width,
    bulge pulls the crown shoulders in (round tread), corner rounds the shoulder."""
    c, hw = corner, w / 2
    mid = rb + 0.5 * (r - rb)
    re = r - bulge
    pts = [(rb, -wb), (mid, -hw), (re - c, -hw)]
    pts += [(re - c + c * math.sin(t), -hw + c - c * math.cos(t)) for t in (0.4, 0.8, 1.2)]
    ys = [-hw + c + (w - 2 * c) * i / 6 for i in range(7)]
    pts += [(r - bulge * (y / (hw - c)) ** 2, y) for y in ys]
    pts += [(re - c + c * math.sin(t), hw - c + c * math.cos(t)) for t in (1.2, 0.8, 0.4)]
    pts += [(re - c, hw), (mid, hw), (rb, wb)]
    return revolve(pts, mat, a0, a1, steps)


def blocks(r, rows, mat="rubber"):
    """Tread blocks around the crown. rows: (y, (tangent, width, height), count, phase, chevron)."""
    for y, (dt, dw, dh), n, phase, chev in rows:
        for i in range(n):
            a = phase + TAU * i / n
            rot = (Matrix.Rotation(-a + math.pi / 2, 3, "Y") @ Matrix.Rotation(chev, 3, "Z")).to_euler()
            c = r + dh / 2 - 0.03
            box((c * math.cos(a), y, c * math.sin(a)), (dt, dw, dh), mat, min(dt, dw, dh) * 0.15, tuple(rot))


def ribs(r, ys, width, height, mat="rubber"):
    """Circumferential tread ribs: rings standing proud of the crown."""
    for y in ys:
        rod((0, y - width / 2, 0), (0, y + width / 2, 0), r + height, mat, 72)


def hub_disc(y0, rr, mat, holes=0, hole_mat="cast", hole_r=0.09, hole_ring=0.0):
    """Pressed disc wheel face with punched holes."""
    rod((0, y0 + 0.1, 0), (0, y0, 0), rr * 0.95, mat, 64)
    for i in range(holes):
        a = TAU * i / holes + 0.3
        px, pz = hole_ring * math.cos(a), hole_ring * math.sin(a)
        rod((px, y0 + 0.02, pz), (px, y0 - 0.02, pz), hole_r, hole_mat, 20)


def spokes(y0, r_in, r_out, n, width, mat, depth=0.1, twin=0.0, phase=0.0):
    """Radial spokes on the wheel face (twin gives double-spoke pairs)."""
    offsets = (-twin, twin) if twin else (0.0,)
    for i in range(n):
        for off in offsets:
            a = TAU * i / n + phase + off
            m = (r_in + r_out) / 2
            box((m * math.cos(a), y0, m * math.sin(a)), (r_out - r_in, depth, width), mat, width * 0.2, (0, -a, 0))


def rim_barrel(y0, rr, depth, mat="alloy", lip=0.05):
    """Rim lip ring, barrel and dark dish behind the spokes."""
    torus((0, y0, 0), rr, lip, mat, (math.pi / 2, 0, 0), 72)
    rod((0, y0, 0), (0, y0 + depth, 0), rr - 0.02, "cast", 64)


def centre_nut(y0, r, mat="chrome", length=0.12):
    rod((0, y0, 0), (0, y0 - length, 0), r, mat, 6)


def lip_accent(y0, rr, mat="teal", t=0.014):
    arc((0, y0 - 0.01, 0), rr * 0.97, "y", mat, t)


def pipe(points, r, mat, joints=True):
    """Round tube through points, with ball joints at the bends."""
    for a, b in zip(points, points[1:]):
        rod(a, b, r, mat, 16, bevel=0)
    if joints:
        for p in points[1:-1]:
            kit.ball(p, r, mat)


# ── Wheels ─────────────────────────────────────────────────────────────────


def wheel_busted():
    """A scrap-yard wheel: tyre torn open at the shoulder, rim rusted and sagging."""
    r, w = 1.0, 0.55
    gap = (0.55, 1.45)
    tire(r, w, 0.62, 0.17, 0.04, 0.1, gap[1], gap[0] + TAU, "rubber", 54)
    # Torn-out carcass: bare belt cords hanging across the gap.
    for k in range(5):
        a = gap[0] + 0.15 + 0.17 * k
        y = -0.18 + 0.09 * k
        tube([(r * 0.9 * math.cos(a), y, r * 0.9 * math.sin(a)),
              (r * 1.05 * math.cos(a + 0.2), y + 0.05, r * 1.0 * math.sin(a + 0.2) - 0.1 * (k % 2)),
              (r * 1.12 * math.cos(a + 0.3), y + 0.08, r * 1.06 * math.sin(a + 0.3) - 0.15)], "steel", 0.016)
    face = -w / 2 + 0.02
    rod((0, face + 0.1, -0.08), (0, face, -0.08), 0.64, "rust", 48)
    rod((0, face + 0.1, -0.08), (0, face - 0.06, -0.08), 0.18, "rust", 24)
    for i in range(5):
        a = TAU * i / 5 + 0.2
        px, pz = 0.38 * math.cos(a), 0.38 * math.sin(a) - 0.08
        rod((px, face + 0.03, pz), (px, face - 0.03, pz), 0.1, "cast", 16)
    torus((0, face, -0.08), 0.64, 0.05, "rust", (math.pi / 2, 0, 0), 48)
    # Crack across the sidewall: the one accent, fuchsia for damage.
    yy = -w / 2 - 0.012
    tube([(-0.78, yy, 0.18), (-0.7, yy, 0.05), (-0.8, yy, -0.08), (-0.72, yy, -0.28), (-0.82, yy, -0.4)], "fuchsia", 0.012, smooth=False)


def wheel_kart():
    """Go-kart slick: small, fat and smooth on a three-hole magnesium rim."""
    r, w = 0.78, 0.92
    tire(r, w, 0.45, 0.3, 0.1, 0.2)
    y0 = -w / 2 + 0.03
    rim_barrel(y0, 0.46, 0.2, "alloy", 0.045)
    hub_disc(y0 + 0.02, 0.44, "alloy", 3, "cast", 0.13, 0.26)
    rod((0, y0 + 0.02, 0), (0, y0 - 0.06, 0), 0.14, "alloy", 24)
    centre_nut(y0 - 0.04, 0.06)
    lip_accent(y0 - 0.03, 0.46)


def wheel_river():
    """Light river-trailer tyre: tall, narrow, rounded and ribbed on a steel rim."""
    r, w = 0.95, 0.44
    tire(r - 0.07, w, 0.5, 0.16, 0.08, 0.16)
    ribs(r - 0.07, [-0.15, 0.0, 0.15], 0.07, 0.07)
    y0 = -w / 2 + 0.06
    rod((0, y0 + 0.08, 0), (0, y0, 0), 0.5, "steel", 64)
    torus((0, y0, 0), 0.5, 0.04, "steel", (math.pi / 2, 0, 0), 64)
    rod((0, y0, 0), (0, y0 - 0.06, 0), 0.2, "alloy", 32)
    for i in range(5):
        a = TAU * i / 5
        px, pz = 0.32 * math.cos(a), 0.32 * math.sin(a)
        rod((px, y0 + 0.01, pz), (px, y0 - 0.05, pz), 0.045, "chrome", 12)
    lip_accent(y0 - 0.04, 0.5)


def wheel_sport():
    """Low-profile road tyre on a five-twin-spoke alloy, shallow tread grooves."""
    r, w = 1.0, 0.62
    tire(r, w, 0.7, 0.2, 0.03, 0.12)
    for y in (-0.13, 0.13):
        torus((0, y, 0), r - 0.015, 0.012, "cast", (math.pi / 2, 0, 0), 72)
    y0 = -w / 2 + 0.03
    rim_barrel(y0, 0.7, 0.2, "alloy", 0.05)
    spokes(y0 - 0.01, 0.12, 0.68, 5, 0.12, "alloy", 0.09, 0.1, 0.1)
    rod((0, y0 + 0.02, 0), (0, y0 - 0.06, 0), 0.2, "alloy", 32)
    centre_nut(y0 - 0.05, 0.07)
    lip_accent(y0 - 0.05, 0.7)


def wheel_knobby():
    """Wheelbarrow tyre: narrow and fat, big chunky blocks, battered steel hub."""
    r, w = 0.92, 0.52
    tire(r, w, 0.42, 0.18, 0.1, 0.16, steps=48)
    blocks(r, [(-0.13, (0.26, 0.2, 0.15), 18, 0.0, 0.3), (0.13, (0.26, 0.2, 0.15), 18, TAU / 36, -0.3)])
    y0 = -w / 2 + 0.01
    rod((0, y0 + 0.1, 0), (0, y0, 0), 0.44, "rust", 48)
    torus((0, y0, 0), 0.44, 0.04, "steel", (math.pi / 2, 0, 0), 48)
    rod((0, y0, 0), (0, y0 - 0.1, 0), 0.14, "steel", 24)
    centre_nut(y0 - 0.08, 0.07, "alloy")
    arc((0, y0 - 0.03, 0), 0.4, "y", "teal", 0.012, 1.0, 2.6)


def wheel_dirt():
    """Dirt-track tyre: tall paddle blocks in staggered rows on a beadlock rim."""
    r, w = 1.08, 0.78
    tire(r - 0.02, w, 0.58, 0.24, 0.0, 0.14)
    blocks(r - 0.02, [(-0.25, (0.26, 0.22, 0.2), 16, 0.0, 0.0), (0.0, (0.26, 0.2, 0.2), 16, TAU / 32, 0.0),
                      (0.25, (0.26, 0.22, 0.2), 16, 0.0, 0.0)])
    y0 = -w / 2 + 0.04
    rim_barrel(y0, 0.58, 0.2, "alloy", 0.06)
    hub_disc(y0 + 0.02, 0.5, "steel", 0)
    torus((0, y0 - 0.02, 0), 0.52, 0.04, "alloy", (math.pi / 2, 0, 0), 64)
    for i in range(12):
        a = TAU * i / 12
        px, pz = 0.52 * math.cos(a), 0.52 * math.sin(a)
        rod((px, y0, pz), (px, y0 - 0.08, pz), 0.035, "chrome", 8)
    rod((0, y0, 0), (0, y0 - 0.1, 0), 0.16, "alloy", 24)
    lip_accent(y0 - 0.05, 0.6)


def wheel_at():
    """Truck all-terrain tyre: big staggered shoulder lugs, six-hole steel wheel."""
    r, w = 1.18, 0.78
    tire(r - 0.02, w, 0.7, 0.25, 0.04, 0.14)
    blocks(r - 0.02, [(-0.3, (0.3, 0.17, 0.14), 18, 0.0, 0.5), (0.3, (0.3, 0.17, 0.14), 18, 0.0, -0.5),
                      (-0.1, (0.26, 0.15, 0.1), 18, TAU / 36, 0.0), (0.1, (0.26, 0.15, 0.1), 18, TAU / 36, 0.0)])
    y0 = -w / 2 + 0.05
    rim_barrel(y0, 0.7, 0.2, "steel", 0.05)
    hub_disc(y0 + 0.02, 0.68, "steel", 6, "cast", 0.1, 0.4)
    rod((0, y0 + 0.02, 0), (0, y0 - 0.08, 0), 0.26, "steel", 32)
    for i in range(6):
        a = TAU * i / 6 + 0.5
        px, pz = 0.18 * math.cos(a), 0.18 * math.sin(a)
        rod((px, y0, pz), (px, y0 - 0.1, pz), 0.035, "chrome", 8)
    lip_accent(y0 - 0.05, 0.7)


def wheel_slick():
    """Racing slick: bald, wide and low, on a lightweight twelve-spoke alloy."""
    r, w = 1.0, 1.0
    tire(r, w, 0.68, 0.3, 0.015, 0.1)
    y0 = -w / 2 + 0.03
    rim_barrel(y0, 0.68, 0.22, "alloy", 0.045)
    spokes(y0 - 0.01, 0.16, 0.66, 12, 0.055, "alloy", 0.07)
    torus((0, y0 - 0.01, 0), 0.36, 0.02, "alloy", (math.pi / 2, 0, 0), 48)
    rod((0, y0 + 0.02, 0), (0, y0 - 0.07, 0), 0.19, "alloy", 32)
    rod((0, y0 - 0.06, 0), (0, y0 - 0.14, 0), 0.1, "chrome", 6)
    lip_accent(y0 - 0.04, 0.68, "teal", 0.016)


def wheel_groove():
    """Hand-grooved dirt tyre: deep circumferential grooves cut into a tall rubber slab."""
    r, w = 1.08, 0.86
    tire(r - 0.1, w, 0.62, 0.26, 0.05, 0.14)
    ys = [-0.32, -0.16, 0.0, 0.16, 0.32]
    ribs(r - 0.1, ys, 0.11, 0.1)
    for y in ys:
        for i in range(36):
            a = TAU * i / 36
            box(((r - 0.04) * math.cos(a), y, (r - 0.04) * math.sin(a)), (0.085, 0.1, 0.05), "rubber", 0.01,
                (0, -a + math.pi / 2, 0))
    y0 = -w / 2 + 0.04
    rim_barrel(y0, 0.62, 0.2, "alloy", 0.055)
    spokes(y0 - 0.01, 0.14, 0.6, 6, 0.16, "alloy", 0.09)
    rod((0, y0 + 0.02, 0), (0, y0 - 0.07, 0), 0.22, "alloy", 32)
    centre_nut(y0 - 0.06, 0.08)
    lip_accent(y0 - 0.05, 0.62)


# ── Frames ─────────────────────────────────────────────────────────────────


def angle_x(x0, x1, y, z, mat="rust", leg=0.5, t=0.1):
    """Angle iron running along X: a flat leg and an upright leg."""
    m = (x0 + x1) / 2
    box((m, y, z), (abs(x1 - x0), leg, t), mat, 0.01)
    box((m, y - (leg - t) / 2, z + (leg - t) / 2), (abs(x1 - x0), t, leg), mat, 0.01)


def angle_y(x, y0, y1, z, mat="steel", leg=0.45, t=0.09):
    m = (y0 + y1) / 2
    box((x, m, z), (leg, abs(y1 - y0), t), mat, 0.01)
    box((x - (leg - t) / 2, m, z + (leg - t) / 2), (t, abs(y1 - y0), leg), mat, 0.01)


def frame_scrap():
    """Welded angle iron ladder with a cracked rail and a plank for a floor."""
    angle_x(-3.3, 1.2, -1.4, 0.15)
    angle_x(1.8, 3.3, -1.4, 0.3)
    angle_x(-3.3, 3.3, 1.4, 0.15)
    for x in (-3.1, -0.3, 2.3):
        angle_y(x, -1.4, 1.4, 0.15)
    pipe([(-3.1, -1.4, 0.45), (-0.3, 1.4, 0.45)], 0.05, "rust", False)
    box((-1.8, 0.0, 0.62), (2.2, 2.4, 0.14), "wood", 0.015, (0, 0, 0.05))
    for x, y in ((-3.1, -1.4), (-0.3, 1.4), (2.3, 1.4), (-0.3, -1.4), (2.3, -1.4)):
        box((x, y, 0.4), (0.5, 0.5, 0.05), "steel", 0.01)
        kit.ball((x, y, 0.46), 0.07, "rust")
    box((1.5, -1.66, 0.4), (0.55, 0.1, 0.5), "fuchsia", 0)  # the cracked weld, glowing hot


def frame_mower():
    """A riding-mower deck: stamped red steel shell, blade bulges, engine plate and seat post."""
    box((0, 0, 0.35), (6.2, 4.6, 0.7), "oxblood", 0.2)
    box((0, 0, 0.74), (5.9, 4.3, 0.1), "oxblood", 0.05)
    for x in (-1.45, 1.45):
        rod((x, 0, 0.78), (x, 0, 0.92), 1.6, "oxblood", 48)
        rod((x, 0, 0.92), (x, 0, 0.98), 0.3, "cast", 24)
    box((0, 0, 1.0), (2.2, 2.2, 0.12), "steel", 0.02)
    for sx in (-0.85, 0.85):
        for sy in (-0.85, 0.85):
            rod((sx, sy, 1.06), (sx, sy, 1.16), 0.07, "chrome", 6)
    box((-0.4, -2.55, 0.4), (1.5, 1.1, 0.55), "oxblood", 0.1)
    box((-0.4, -3.05, 0.4), (1.3, 0.2, 0.45), "cast", 0.05)
    for x in (-2.9, 2.9):
        for y in (-2.0, 2.0):
            rod((x, y, -0.2), (x, y, 0.3), 0.04, "steel", 12)
            rod((x, y - 0.12, -0.2), (x, y + 0.12, -0.2), 0.2, "rubber", 24)
    pipe([(3.1, -2.1, 0.45), (3.4, 0, 0.5), (3.1, 2.1, 0.45)], 0.08, "steel")
    rod((-2.4, 0, 1.0), (-2.4, 0, 1.7), 0.18, "steel", 12)
    box((-2.4, 0, 1.8), (1.6, 1.8, 0.3), "plastic", 0.1)
    box((-3.1, 0, 2.4), (0.3, 1.8, 1.0), "plastic", 0.1, (0, -0.15, 0))
    box((3.07, 0, 0.6), (0.06, 4.3, 0.1), "teal", 0)


def frame_kart():
    """Racing kart chassis: bent steel tube loop, floor pan, steering column and axles."""
    r = 0.17
    for s in (-1, 1):
        pipe([(-3.0, s * 1.6, 0.35), (-1.0, s * 1.5, 0.35), (1.8, s * 1.4, 0.35), (3.2, s * 0.85, 0.45)], r, "steel")
        pipe([(-1.0, s * 1.5, 0.35), (-0.6, s * 1.5, 1.2)], 0.12, "steel")
    pipe([(3.2, -0.85, 0.45), (3.55, 0, 0.5), (3.2, 0.85, 0.45)], r, "steel")
    pipe([(-3.0, -1.6, 0.35), (-3.3, 0, 0.4), (-3.0, 1.6, 0.35)], r, "steel")
    for x in (-1.0, 1.2):
        pipe([(x, -1.5, 0.35), (x, 1.5, 0.35)], r * 0.85, "steel")
    box((0.1, 0, 0.25), (3.3, 2.4, 0.06), "cast", 0.02)
    rod((-2.5, -2.4, 0.35), (-2.5, 2.4, 0.35), 0.18, "alloy", 20)
    for s in (-1, 1):
        rod((2.6, s * 1.0, 0.45), (2.6, s * 1.95, 0.45), 0.08, "alloy", 12)
        box((2.6, s * 1.0, 0.45), (0.3, 0.2, 0.2), "steel", 0.03)
    pipe([(1.9, 0, 0.5), (1.4, 0, 1.6)], 0.13, "alloy", False)
    torus((1.25, 0, 1.75), 0.55, 0.08, "plastic", (math.radians(65), 0, math.radians(90)), 32)
    kit.ball((1.4, 0, 1.6), 0.2, "teal")
    box((-2.0, 1.2, 0.6), (0.9, 1.0, 0.1), "steel", 0.02)


def frame_steel():
    """Sedan subframe: boxed steel rails, cross members, control-arm forks with rubber bushings."""
    for s in (-1, 1):
        box((-0.3, s * 1.6, 0.4), (7.2, 0.45, 0.4), "steel", 0.08)
        box((-3.9, s * 1.6, 0.4), (0.3, 0.7, 0.5), "steel", 0.05)
    for x in (-3.6, -1.0, 1.8):
        box((x, 0, 0.4), (0.45, 3.2, 0.34), "steel", 0.06)
    box((3.4, 0, 0.55), (0.45, 3.4, 0.5), "cast", 0.08)  # front crossmember
    for s in (-1, 1):
        for x in (1.4, 2.4):
            rod((x, s * 1.8, 0.4), (x + 0.4, s * 3.0, 0.4), 0.14, "steel", 16)
        box((1.9, s * 2.4, 0.4), (1.2, 0.2, 0.12), "steel", 0.03, (0, 0, s * 0.2))
        rod((1.55, s * 3.05, 0.1), (1.55, s * 3.05, 0.75), 0.22, "rubber", 24)
        rod((2.8, s * 3.05, 0.1), (2.8, s * 3.05, 0.75), 0.22, "rubber", 24)
        rod((-3.6, s * 2.2, 0.2), (-3.6, s * 2.2, 0.8), 0.2, "rubber", 24)
        box((-3.6, s * 2.0, 0.4), (0.4, 0.7, 0.14), "steel", 0.03)
    rod((2.6, -1.2, 0.95), (2.6, 1.2, 0.95), 0.16, "alloy", 20)  # steering rack
    box((3.63, 0, 0.55), (0.04, 3.0, 0.1), "teal", 0)
    for x in (-1.0, 1.8):
        for s in (-1, 1):
            rod((x, s * 1.0, 0.55), (x, s * 1.0, 0.62), 0.09, "cast", 16)


def frame_wagon():
    """Little red wagon: flared pressed-steel tub, four wheels, bent pull handle."""
    box((0, 0, 0.1), (6.0, 3.0, 0.14), "oxblood", 0.04)
    for s, tilt in ((-1, 0.22), (1, -0.22)):
        box((0, s * 1.58, 0.65), (6.2, 0.12, 1.0), "oxblood", 0.03, (tilt, 0, 0))
    for s, tilt in ((-1, -0.22), (1, 0.22)):
        box((s * 3.1, 0, 0.65), (0.12, 3.3, 1.0), "oxblood", 0.03, (0, tilt, 0))
    pipe([(-3.35, -1.72, 1.12), (3.35, -1.72, 1.12), (3.35, 1.72, 1.12), (-3.35, 1.72, 1.12), (-3.35, -1.72, 1.12)], 0.06, "steel", False)
    for x in (-2.0, 2.2):
        rod((x, -2.0, -0.35), (x, 2.0, -0.35), 0.06, "steel", 12)
        for s in (-1, 1):
            rod((x, s * 2.2, -0.35), (x, s * 1.9, -0.35), 0.8, "rubber", 32)
            rod((x, s * 2.15, -0.35), (x, s * 2.3, -0.35), 0.55, "steel", 24)
            kit.ball((x, s * 2.2, -0.35), 0.1, "alloy")
    box((2.2, 0, -0.2), (0.4, 3.0, 0.15), "steel", 0.03)
    pipe([(3.0, 0, -0.1), (4.6, 0.2, 0.5), (6.5, 0.6, 1.5), (7.0, 0.7, 1.9)], 0.11, "steel")
    rod((6.85, 0.45, 1.85), (7.2, 0.95, 1.95), 0.12, "plastic", 16)
    box((0.2, -1.69, 0.78), (4.4, 0.04, 0.12), "teal", 0, (0.22, 0, 0))


def frame_tube():
    """Race-car spaceframe: triangulated chromoly tube cage with suspension mounts."""
    r = 0.14
    low = [(-4.0, 1.3, 0.0), (0.0, 1.5, 0.0), (3.4, 1.0, 0.0)]
    up = [(-3.6, 1.1, 1.7), (-0.4, 1.35, 1.2), (2.6, 0.9, 1.0)]

    def side(s):
        return [(x, s * y, z) for x, y, z in low], [(x, s * y, z) for x, y, z in up]

    for s in (-1, 1):
        lo, hi = side(s)
        pipe(lo, r, "alloy")
        pipe(hi, r, "alloy")
        for a, b in zip(lo, hi):
            pipe([a, b], r * 0.85, "alloy", False)
        pipe([lo[1], hi[0]], r * 0.7, "alloy", False)
        pipe([lo[1], hi[2]], r * 0.7, "alloy", False)
        pipe([lo[0], hi[1]], r * 0.7, "alloy", False)
        pipe([lo[2], hi[2]], r * 0.7, "alloy", False)
    for a, b in zip(low + up, low + up):
        pipe([(a[0], -a[1], a[2]), a], r * 0.9, "alloy", False)
    pipe([(-3.6, -1.1, 1.7), (2.6, 0.9, 1.0)], r * 0.6, "alloy", False)
    pipe([(-3.6, 1.1, 1.7), (2.6, -0.9, 1.0)], r * 0.6, "alloy", False)
    for p in low + up:
        for s in (-1, 1):
            kit.ball((p[0], s * p[1], p[2]), r * 1.15, "alloy")
    for p in ((3.4, -1.0, 0.0), (3.4, 1.0, 0.0), (-4.0, -1.3, 0.0), (-4.0, 1.3, 0.0)):
        box(p, (0.5, 0.5, 0.08), "steel", 0.02)
    pipe([(-0.4, -1.35, 1.2), (2.6, -0.9, 1.0)], r * 1.12, "teal", False)


def frame_cage():
    """Caged chassis: steel sills and crossmembers under a full roll cage and window net."""
    for s in (-1, 1):
        box((-0.2, s * 2.1, 0.3), (8.4, 0.5, 0.45), "steel", 0.08)
    for x in (-3.4, -1.2, 1.2, 3.4):
        box((x, 0, 0.3), (0.4, 4.2, 0.3), "steel", 0.05)
    box((0.2, 0, 0.18), (7.4, 3.8, 0.06), "cast", 0.02)
    r = 0.11
    for s in (-1, 1):
        pipe([(2.0, s * 2.05, 0.5), (1.5, s * 1.95, 3.0)], r, "alloy")
        pipe([(-1.1, s * 2.05, 0.5), (-1.1, s * 2.0, 3.2)], r, "alloy")
        pipe([(-1.1, s * 2.0, 3.2), (-3.2, s * 1.4, 0.5)], r * 0.9, "alloy")
        for z in (1.0, 1.8, 2.5):
            pipe([(-1.1, s * 2.03, z), (1.9 - (z - 1.0) * 0.25, s * 1.99, z)], r * 0.85, "alloy", False)
        pipe([(2.0, s * 2.05, 0.5), (3.2, s * 1.2, 0.5)], r * 0.9, "alloy")
    pipe([(-1.1, -2.0, 3.2), (-1.1, 2.0, 3.2)], r, "alloy")
    pipe([(-1.1, -2.0, 0.6), (-1.1, 2.0, 3.0)], r * 0.7, "alloy", False)
    pipe([(-1.1, 2.0, 0.6), (-1.1, -2.0, 3.0)], r * 0.7, "alloy", False)
    for i in range(7):
        x = -1.0 + i * 0.4
        rod((x, -2.08, 1.1), (x, -2.08, 2.9), 0.025, "plastic", 8)
    for j in range(6):
        z = 1.2 + j * 0.33
        rod((-1.0, -2.08, z), (1.6, -2.08, z), 0.025, "plastic", 8)
    pipe([(-1.1, -2.0, 3.2), (1.5, -1.95, 3.0)], r * 1.12, "teal", False)
    pipe([(1.5, 1.95, 3.0), (-1.1, 2.0, 3.2)], r * 1.12, "teal", False)
    pipe([(1.5, -1.95, 3.0), (1.5, 1.95, 3.0)], r, "alloy")


PARTS = {
    "wheel_basic": wheel_basic,
    "wheel_busted": wheel_busted,
    "wheel_kart": wheel_kart,
    "wheel_river": wheel_river,
    "wheel_sport": wheel_sport,
    "wheel_knobby": wheel_knobby,
    "wheel_dirt": wheel_dirt,
    "wheel_at": wheel_at,
    "wheel_slick": wheel_slick,
    "wheel_groove": wheel_groove,
    "frame_scrap": frame_scrap,
    "frame_mower": frame_mower,
    "frame_kart": frame_kart,
    "frame_steel": frame_steel,
    "frame_wagon": frame_wagon,
    "frame_tube": frame_tube,
    "frame_cage": frame_cage,
}


# ── Shared wheel and frame helpers ─────────────────────────────────────────


def revolve(profile, mat, a0=0.0, a1=TAU, steps=72, smooth=True):
    """Lathe a closed (radius, y) profile around the Y axis."""
    full = abs(a1 - a0 - TAU) < 1e-6
    n = len(profile)
    rings = steps if full else steps + 1
    verts = []
    for k in range(rings):
        a = a0 + (a1 - a0) * k / steps
        verts += [(rho * math.cos(a), y, rho * math.sin(a)) for rho, y in profile]
    faces = []
    for k in range(steps):
        k2 = (k + 1) % rings
        for i in range(n):
            j = (i + 1) % n
            faces.append((k * n + i, k * n + j, k2 * n + j, k2 * n + i))
    if not full:
        faces.append(tuple(range(n)))
        faces.append(tuple(range((rings - 1) * n, rings * n)))
    obj = kit.mesh_from(verts, faces, mat, "Lathe", smooth=smooth)
    bm = kit.bmesh.new()
    bm.from_mesh(obj.data)
    kit.bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(obj.data)
    bm.free()
    return obj


def tire(r, w, rb, wb, bulge=0.0, corner=0.12, a0=0.0, a1=TAU, mat="rubber", steps=72):
    """Tyre carcass. r outer radius, w width, rb bead radius, wb bead half width,
    bulge pulls the crown shoulders in (round tread), corner rounds the shoulder."""
    c, hw = corner, w / 2
    mid = rb + 0.5 * (r - rb)
    re = r - bulge
    pts = [(rb, -wb), (mid, -hw), (re - c, -hw)]
    pts += [(re - c + c * math.sin(t), -hw + c - c * math.cos(t)) for t in (0.4, 0.8, 1.2)]
    ys = [-hw + c + (w - 2 * c) * i / 6 for i in range(7)]
    pts += [(r - bulge * (y / (hw - c)) ** 2, y) for y in ys]
    pts += [(re - c + c * math.sin(t), hw - c + c * math.cos(t)) for t in (1.2, 0.8, 0.4)]
    pts += [(re - c, hw), (mid, hw), (rb, wb)]
    return revolve(pts, mat, a0, a1, steps)


def blocks(r, rows, mat="rubber"):
    """Tread blocks around the crown. rows: (y, (tangent, width, height), count, phase, chevron)."""
    for y, (dt, dw, dh), n, phase, chev in rows:
        for i in range(n):
            a = phase + TAU * i / n
            rot = (Matrix.Rotation(-a + math.pi / 2, 3, "Y") @ Matrix.Rotation(chev, 3, "Z")).to_euler()
            c = r + dh / 2 - 0.03
            box((c * math.cos(a), y, c * math.sin(a)), (dt, dw, dh), mat, min(dt, dw, dh) * 0.15, tuple(rot))


def ribs(r, ys, width, height, mat="rubber"):
    """Circumferential tread ribs: rings standing proud of the crown."""
    for y in ys:
        rod((0, y - width / 2, 0), (0, y + width / 2, 0), r + height, mat, 72)


def hub_disc(y0, rr, mat, holes=0, hole_mat="cast", hole_r=0.09, hole_ring=0.0):
    """Pressed disc wheel face with punched holes."""
    rod((0, y0 + 0.1, 0), (0, y0, 0), rr * 0.95, mat, 64)
    for i in range(holes):
        a = TAU * i / holes + 0.3
        px, pz = hole_ring * math.cos(a), hole_ring * math.sin(a)
        rod((px, y0 + 0.02, pz), (px, y0 - 0.02, pz), hole_r, hole_mat, 20)


def spokes(y0, r_in, r_out, n, width, mat, depth=0.1, twin=0.0, phase=0.0):
    """Radial spokes on the wheel face (twin gives double-spoke pairs)."""
    offsets = (-twin, twin) if twin else (0.0,)
    for i in range(n):
        for off in offsets:
            a = TAU * i / n + phase + off
            m = (r_in + r_out) / 2
            box((m * math.cos(a), y0, m * math.sin(a)), (r_out - r_in, depth, width), mat, width * 0.2, (0, -a, 0))


def rim_barrel(y0, rr, depth, mat="alloy", lip=0.05):
    """Rim lip ring, barrel and dark dish behind the spokes."""
    torus((0, y0, 0), rr, lip, mat, (math.pi / 2, 0, 0), 72)
    rod((0, y0, 0), (0, y0 + depth, 0), rr - 0.02, "cast", 64)


def centre_nut(y0, r, mat="chrome", length=0.12):
    rod((0, y0, 0), (0, y0 - length, 0), r, mat, 6)


def lip_accent(y0, rr, mat="teal", t=0.014):
    arc((0, y0 - 0.01, 0), rr * 0.97, "y", mat, t)


def pipe(points, r, mat, joints=True):
    """Round tube through points, with ball joints at the bends."""
    for a, b in zip(points, points[1:]):
        rod(a, b, r, mat, 16, bevel=0)
    if joints:
        for p in points[1:-1]:
            kit.ball(p, r, mat)


# ── Wheels ─────────────────────────────────────────────────────────────────


def wheel_busted():
    """A scrap-yard wheel: tyre torn open at the shoulder, rim rusted and sagging."""
    r, w = 1.0, 0.55
    gap = (0.55, 1.45)
    tire(r, w, 0.62, 0.17, 0.04, 0.1, gap[1], gap[0] + TAU, "rubber", 54)
    # Torn-out carcass: bare belt cords hanging across the gap.
    for k in range(5):
        a = gap[0] + 0.15 + 0.17 * k
        y = -0.18 + 0.09 * k
        tube([(r * 0.9 * math.cos(a), y, r * 0.9 * math.sin(a)),
              (r * 1.05 * math.cos(a + 0.2), y + 0.05, r * 1.0 * math.sin(a + 0.2) - 0.1 * (k % 2)),
              (r * 1.12 * math.cos(a + 0.3), y + 0.08, r * 1.06 * math.sin(a + 0.3) - 0.15)], "steel", 0.016)
    face = -w / 2 + 0.02
    rod((0, face + 0.1, -0.08), (0, face, -0.08), 0.64, "rust", 48)
    rod((0, face + 0.1, -0.08), (0, face - 0.06, -0.08), 0.18, "rust", 24)
    for i in range(5):
        a = TAU * i / 5 + 0.2
        px, pz = 0.38 * math.cos(a), 0.38 * math.sin(a) - 0.08
        rod((px, face + 0.03, pz), (px, face - 0.03, pz), 0.1, "cast", 16)
    torus((0, face, -0.08), 0.64, 0.05, "rust", (math.pi / 2, 0, 0), 48)
    # Crack across the sidewall: the one accent, fuchsia for damage.
    yy = -w / 2 - 0.012
    tube([(-0.78, yy, 0.18), (-0.7, yy, 0.05), (-0.8, yy, -0.08), (-0.72, yy, -0.28), (-0.82, yy, -0.4)], "fuchsia", 0.012, smooth=False)


def wheel_kart():
    """Go-kart slick: small, fat and smooth on a three-hole magnesium rim."""
    r, w = 0.78, 0.92
    tire(r, w, 0.45, 0.3, 0.1, 0.2)
    y0 = -w / 2 + 0.03
    rim_barrel(y0, 0.46, 0.2, "alloy", 0.045)
    hub_disc(y0 + 0.02, 0.44, "alloy", 3, "cast", 0.13, 0.26)
    rod((0, y0 + 0.02, 0), (0, y0 - 0.06, 0), 0.14, "alloy", 24)
    centre_nut(y0 - 0.04, 0.06)
    lip_accent(y0 - 0.03, 0.46)


def wheel_river():
    """Light river-trailer tyre: tall, narrow, rounded and ribbed on a steel rim."""
    r, w = 0.95, 0.44
    tire(r - 0.07, w, 0.5, 0.16, 0.08, 0.16)
    ribs(r - 0.07, [-0.15, 0.0, 0.15], 0.07, 0.07)
    y0 = -w / 2 + 0.06
    rod((0, y0 + 0.08, 0), (0, y0, 0), 0.5, "steel", 64)
    torus((0, y0, 0), 0.5, 0.04, "steel", (math.pi / 2, 0, 0), 64)
    rod((0, y0, 0), (0, y0 - 0.06, 0), 0.2, "alloy", 32)
    for i in range(5):
        a = TAU * i / 5
        px, pz = 0.32 * math.cos(a), 0.32 * math.sin(a)
        rod((px, y0 + 0.01, pz), (px, y0 - 0.05, pz), 0.045, "chrome", 12)
    lip_accent(y0 - 0.04, 0.5)


def wheel_sport():
    """Low-profile road tyre on a five-twin-spoke alloy, shallow tread grooves."""
    r, w = 1.0, 0.62
    tire(r, w, 0.7, 0.2, 0.03, 0.12)
    for y in (-0.13, 0.13):
        torus((0, y, 0), r - 0.015, 0.012, "cast", (math.pi / 2, 0, 0), 72)
    y0 = -w / 2 + 0.03
    rim_barrel(y0, 0.7, 0.2, "alloy", 0.05)
    spokes(y0 - 0.01, 0.12, 0.68, 5, 0.12, "alloy", 0.09, 0.1, 0.1)
    rod((0, y0 + 0.02, 0), (0, y0 - 0.06, 0), 0.2, "alloy", 32)
    centre_nut(y0 - 0.05, 0.07)
    lip_accent(y0 - 0.05, 0.7)


def wheel_knobby():
    """Wheelbarrow tyre: narrow and fat, big chunky blocks, battered steel hub."""
    r, w = 0.92, 0.52
    tire(r, w, 0.42, 0.18, 0.1, 0.16, steps=48)
    blocks(r, [(-0.13, (0.26, 0.2, 0.15), 18, 0.0, 0.3), (0.13, (0.26, 0.2, 0.15), 18, TAU / 36, -0.3)])
    y0 = -w / 2 + 0.01
    rod((0, y0 + 0.1, 0), (0, y0, 0), 0.44, "rust", 48)
    torus((0, y0, 0), 0.44, 0.04, "steel", (math.pi / 2, 0, 0), 48)
    rod((0, y0, 0), (0, y0 - 0.1, 0), 0.14, "steel", 24)
    centre_nut(y0 - 0.08, 0.07, "alloy")
    arc((0, y0 - 0.03, 0), 0.4, "y", "teal", 0.012, 1.0, 2.6)


def wheel_dirt():
    """Dirt-track tyre: tall paddle blocks in staggered rows on a beadlock rim."""
    r, w = 1.08, 0.78
    tire(r - 0.02, w, 0.58, 0.24, 0.0, 0.14)
    blocks(r - 0.02, [(-0.25, (0.26, 0.22, 0.2), 16, 0.0, 0.0), (0.0, (0.26, 0.2, 0.2), 16, TAU / 32, 0.0),
                      (0.25, (0.26, 0.22, 0.2), 16, 0.0, 0.0)])
    y0 = -w / 2 + 0.04
    rim_barrel(y0, 0.58, 0.2, "alloy", 0.06)
    hub_disc(y0 + 0.02, 0.5, "steel", 0)
    torus((0, y0 - 0.02, 0), 0.52, 0.04, "alloy", (math.pi / 2, 0, 0), 64)
    for i in range(12):
        a = TAU * i / 12
        px, pz = 0.52 * math.cos(a), 0.52 * math.sin(a)
        rod((px, y0, pz), (px, y0 - 0.08, pz), 0.035, "chrome", 8)
    rod((0, y0, 0), (0, y0 - 0.1, 0), 0.16, "alloy", 24)
    lip_accent(y0 - 0.05, 0.6)


def wheel_at():
    """Truck all-terrain tyre: big staggered shoulder lugs, six-hole steel wheel."""
    r, w = 1.18, 0.78
    tire(r - 0.02, w, 0.7, 0.25, 0.04, 0.14)
    blocks(r - 0.02, [(-0.3, (0.3, 0.17, 0.14), 18, 0.0, 0.5), (0.3, (0.3, 0.17, 0.14), 18, 0.0, -0.5),
                      (-0.1, (0.26, 0.15, 0.1), 18, TAU / 36, 0.0), (0.1, (0.26, 0.15, 0.1), 18, TAU / 36, 0.0)])
    y0 = -w / 2 + 0.05
    rim_barrel(y0, 0.7, 0.2, "steel", 0.05)
    hub_disc(y0 + 0.02, 0.68, "steel", 6, "cast", 0.1, 0.4)
    rod((0, y0 + 0.02, 0), (0, y0 - 0.08, 0), 0.26, "steel", 32)
    for i in range(6):
        a = TAU * i / 6 + 0.5
        px, pz = 0.18 * math.cos(a), 0.18 * math.sin(a)
        rod((px, y0, pz), (px, y0 - 0.1, pz), 0.035, "chrome", 8)
    lip_accent(y0 - 0.05, 0.7)


def wheel_slick():
    """Racing slick: bald, wide and low, on a lightweight twelve-spoke alloy."""
    r, w = 1.0, 1.0
    tire(r, w, 0.68, 0.3, 0.015, 0.1)
    y0 = -w / 2 + 0.03
    rim_barrel(y0, 0.68, 0.22, "alloy", 0.045)
    spokes(y0 - 0.01, 0.16, 0.66, 12, 0.055, "alloy", 0.07)
    torus((0, y0 - 0.01, 0), 0.36, 0.02, "alloy", (math.pi / 2, 0, 0), 48)
    rod((0, y0 + 0.02, 0), (0, y0 - 0.07, 0), 0.19, "alloy", 32)
    rod((0, y0 - 0.06, 0), (0, y0 - 0.14, 0), 0.1, "chrome", 6)
    lip_accent(y0 - 0.04, 0.68, "teal", 0.016)


def wheel_groove():
    """Hand-grooved dirt tyre: deep circumferential grooves cut into a tall rubber slab."""
    r, w = 1.08, 0.86
    tire(r - 0.1, w, 0.62, 0.26, 0.05, 0.14)
    ys = [-0.32, -0.16, 0.0, 0.16, 0.32]
    ribs(r - 0.1, ys, 0.11, 0.1)
    for y in ys:
        for i in range(36):
            a = TAU * i / 36
            box(((r - 0.04) * math.cos(a), y, (r - 0.04) * math.sin(a)), (0.085, 0.1, 0.05), "rubber", 0.01,
                (0, -a + math.pi / 2, 0))
    y0 = -w / 2 + 0.04
    rim_barrel(y0, 0.62, 0.2, "alloy", 0.055)
    spokes(y0 - 0.01, 0.14, 0.6, 6, 0.16, "alloy", 0.09)
    rod((0, y0 + 0.02, 0), (0, y0 - 0.07, 0), 0.22, "alloy", 32)
    centre_nut(y0 - 0.06, 0.08)
    lip_accent(y0 - 0.05, 0.62)


# ── Frames ─────────────────────────────────────────────────────────────────


def angle_x(x0, x1, y, z, mat="rust", leg=0.5, t=0.1):
    """Angle iron running along X: a flat leg and an upright leg."""
    m = (x0 + x1) / 2
    box((m, y, z), (abs(x1 - x0), leg, t), mat, 0.01)
    box((m, y - (leg - t) / 2, z + (leg - t) / 2), (abs(x1 - x0), t, leg), mat, 0.01)


def angle_y(x, y0, y1, z, mat="steel", leg=0.45, t=0.09):
    m = (y0 + y1) / 2
    box((x, m, z), (leg, abs(y1 - y0), t), mat, 0.01)
    box((x - (leg - t) / 2, m, z + (leg - t) / 2), (t, abs(y1 - y0), leg), mat, 0.01)


def frame_scrap():
    """Welded angle iron ladder with a cracked rail and a plank for a floor."""
    angle_x(-3.3, 1.2, -1.4, 0.15)
    angle_x(1.8, 3.3, -1.4, 0.3)
    angle_x(-3.3, 3.3, 1.4, 0.15)
    for x in (-3.1, -0.3, 2.3):
        angle_y(x, -1.4, 1.4, 0.15)
    pipe([(-3.1, -1.4, 0.45), (-0.3, 1.4, 0.45)], 0.05, "rust", False)
    box((-1.8, 0.0, 0.62), (2.2, 2.4, 0.14), "wood", 0.015, (0, 0, 0.05))
    for x, y in ((-3.1, -1.4), (-0.3, 1.4), (2.3, 1.4), (-0.3, -1.4), (2.3, -1.4)):
        box((x, y, 0.4), (0.5, 0.5, 0.05), "steel", 0.01)
        kit.ball((x, y, 0.46), 0.07, "rust")
    for y in (-1.4, 1.4):
        box((-3.1, y, 1.3), (0.2, 0.2, 1.8), "rust", 0.02)
    pipe([(-3.1, -1.4, 2.2), (-3.1, 1.4, 2.2)], 0.1, "rust", False)
    pipe([(-3.1, 1.4, 1.0), (-1.2, 1.4, 0.3)], 0.09, "steel", False)
    box((1.5, -1.66, 0.4), (0.55, 0.1, 0.5), "fuchsia", 0)  # the cracked weld, glowing hot


def frame_mower():
    """A riding-mower deck: stamped red steel shell, blade bulges, engine plate and seat post."""
    box((0, 0, 0.35), (6.2, 4.6, 0.7), "oxblood", 0.2)
    box((0, 0, 0.74), (5.9, 4.3, 0.1), "oxblood", 0.05)
    for x in (-1.45, 1.45):
        rod((x, 0, 0.78), (x, 0, 0.92), 1.6, "oxblood", 48)
        rod((x, 0, 0.92), (x, 0, 0.98), 0.3, "cast", 24)
    box((0, 0, 1.0), (2.2, 2.2, 0.12), "steel", 0.02)
    for sx in (-0.85, 0.85):
        for sy in (-0.85, 0.85):
            rod((sx, sy, 1.06), (sx, sy, 1.16), 0.07, "chrome", 6)
    box((-0.4, -2.55, 0.4), (1.5, 1.1, 0.55), "oxblood", 0.1)
    box((-0.4, -3.05, 0.4), (1.3, 0.2, 0.45), "cast", 0.05)
    for x in (-2.9, 2.9):
        for y in (-2.0, 2.0):
            rod((x, y, -0.2), (x, y, 0.3), 0.04, "steel", 12)
            rod((x, y - 0.12, -0.2), (x, y + 0.12, -0.2), 0.2, "rubber", 24)
    pipe([(3.1, -2.1, 0.45), (3.4, 0, 0.5), (3.1, 2.1, 0.45)], 0.08, "steel")
    rod((-2.4, 0, 1.0), (-2.4, 0, 1.7), 0.18, "steel", 12)
    box((-2.4, 0, 1.8), (1.6, 1.8, 0.3), "plastic", 0.1)
    box((-3.1, 0, 2.4), (0.3, 1.8, 1.0), "plastic", 0.1, (0, -0.15, 0))
    box((3.07, 0, 0.6), (0.06, 4.3, 0.1), "teal", 0)


def frame_kart():
    """Racing kart chassis: bent steel tube loop, floor pan, steering column and axles."""
    r = 0.17
    for s in (-1, 1):
        pipe([(-3.0, s * 1.6, 0.35), (-1.0, s * 1.5, 0.35), (1.8, s * 1.4, 0.35), (3.2, s * 0.85, 0.45)], r, "steel")
        pipe([(-1.0, s * 1.5, 0.35), (-0.6, s * 1.5, 1.2)], 0.12, "steel")
    pipe([(3.2, -0.85, 0.45), (3.55, 0, 0.5), (3.2, 0.85, 0.45)], r, "steel")
    pipe([(-3.0, -1.6, 0.35), (-3.3, 0, 0.4), (-3.0, 1.6, 0.35)], r, "steel")
    for x in (-1.0, 1.2):
        pipe([(x, -1.5, 0.35), (x, 1.5, 0.35)], r * 0.85, "steel")
    box((0.1, 0, 0.25), (3.3, 2.4, 0.06), "cast", 0.02)
    rod((-2.5, -2.4, 0.35), (-2.5, 2.4, 0.35), 0.18, "alloy", 20)
    for s in (-1, 1):
        rod((2.6, s * 1.0, 0.45), (2.6, s * 1.95, 0.45), 0.08, "alloy", 12)
        box((2.6, s * 1.0, 0.45), (0.3, 0.2, 0.2), "steel", 0.03)
    pipe([(1.9, 0, 0.5), (1.4, 0, 1.6)], 0.13, "alloy", False)
    torus((1.25, 0, 1.75), 0.55, 0.08, "plastic", (math.radians(65), 0, math.radians(90)), 32)
    kit.ball((1.4, 0, 1.6), 0.2, "teal")
    box((-2.0, 1.2, 0.6), (0.9, 1.0, 0.1), "steel", 0.02)


def frame_steel():
    """Sedan subframe: boxed steel rails, cross members, control-arm forks with rubber bushings."""
    for s in (-1, 1):
        box((-0.3, s * 1.6, 0.4), (7.2, 0.45, 0.4), "steel", 0.08)
        box((-3.9, s * 1.6, 0.4), (0.3, 0.7, 0.5), "steel", 0.05)
    for x in (-3.6, -1.0, 1.8):
        box((x, 0, 0.4), (0.45, 3.2, 0.34), "steel", 0.06)
    box((3.4, 0, 0.55), (0.45, 3.4, 0.5), "cast", 0.08)  # front crossmember
    for s in (-1, 1):
        for x in (1.4, 2.4):
            rod((x, s * 1.8, 0.4), (x + 0.4, s * 3.0, 0.4), 0.14, "steel", 16)
        box((1.9, s * 2.4, 0.4), (1.2, 0.2, 0.12), "steel", 0.03, (0, 0, s * 0.2))
        rod((1.55, s * 3.05, 0.1), (1.55, s * 3.05, 0.75), 0.22, "rubber", 24)
        rod((2.8, s * 3.05, 0.1), (2.8, s * 3.05, 0.75), 0.22, "rubber", 24)
        rod((-3.6, s * 2.2, 0.2), (-3.6, s * 2.2, 0.8), 0.2, "rubber", 24)
        box((-3.6, s * 2.0, 0.4), (0.4, 0.7, 0.14), "steel", 0.03)
    rod((2.6, -1.2, 0.95), (2.6, 1.2, 0.95), 0.16, "alloy", 20)  # steering rack
    box((3.63, 0, 0.55), (0.04, 3.0, 0.1), "teal", 0)
    for x in (-1.0, 1.8):
        for s in (-1, 1):
            rod((x, s * 1.0, 0.55), (x, s * 1.0, 0.62), 0.09, "cast", 16)


def frame_wagon():
    """Little red wagon: flared pressed-steel tub, four wheels, bent pull handle."""
    box((0, 0, 0.1), (6.0, 3.0, 0.14), "oxblood", 0.04)
    for s, tilt in ((-1, 0.22), (1, -0.22)):
        box((0, s * 1.58, 0.65), (6.2, 0.12, 1.0), "oxblood", 0.03, (tilt, 0, 0))
    for s, tilt in ((-1, -0.22), (1, 0.22)):
        box((s * 3.1, 0, 0.65), (0.12, 3.3, 1.0), "oxblood", 0.03, (0, tilt, 0))
    pipe([(-3.35, -1.72, 1.12), (3.35, -1.72, 1.12), (3.35, 1.72, 1.12), (-3.35, 1.72, 1.12), (-3.35, -1.72, 1.12)], 0.06, "steel", False)
    for x in (-2.0, 2.2):
        rod((x, -2.0, -0.35), (x, 2.0, -0.35), 0.06, "steel", 12)
        for s in (-1, 1):
            rod((x, s * 2.2, -0.35), (x, s * 1.9, -0.35), 0.8, "rubber", 32)
            rod((x, s * 2.15, -0.35), (x, s * 2.3, -0.35), 0.55, "steel", 24)
            kit.ball((x, s * 2.2, -0.35), 0.1, "alloy")
    box((2.2, 0, -0.2), (0.4, 3.0, 0.15), "steel", 0.03)
    pipe([(3.0, 0, -0.1), (4.6, 0.2, 0.5), (6.5, 0.6, 1.5), (7.0, 0.7, 1.9)], 0.11, "steel")
    rod((6.85, 0.45, 1.85), (7.2, 0.95, 1.95), 0.12, "plastic", 16)
    box((0.2, -1.69, 0.78), (4.4, 0.04, 0.12), "teal", 0, (0.22, 0, 0))


def frame_tube():
    """Race-car spaceframe: triangulated chromoly tube cage with suspension mounts."""
    r = 0.14
    low = [(-4.0, 1.3, 0.0), (0.0, 1.5, 0.0), (3.4, 1.0, 0.0)]
    up = [(-3.6, 1.1, 1.7), (-0.4, 1.35, 1.2), (2.6, 0.9, 1.0)]

    def side(s):
        return [(x, s * y, z) for x, y, z in low], [(x, s * y, z) for x, y, z in up]

    for s in (-1, 1):
        lo, hi = side(s)
        pipe(lo, r, "alloy")
        pipe(hi, r, "alloy")
        for a, b in zip(lo, hi):
            pipe([a, b], r * 0.85, "alloy", False)
        pipe([lo[1], hi[0]], r * 0.7, "alloy", False)
        pipe([lo[1], hi[2]], r * 0.7, "alloy", False)
        pipe([lo[0], hi[1]], r * 0.7, "alloy", False)
        pipe([lo[2], hi[2]], r * 0.7, "alloy", False)
    for a, b in zip(low + up, low + up):
        pipe([(a[0], -a[1], a[2]), a], r * 0.9, "alloy", False)
    pipe([(-3.6, -1.1, 1.7), (2.6, 0.9, 1.0)], r * 0.6, "alloy", False)
    pipe([(-3.6, 1.1, 1.7), (2.6, -0.9, 1.0)], r * 0.6, "alloy", False)
    for p in low + up:
        for s in (-1, 1):
            kit.ball((p[0], s * p[1], p[2]), r * 1.15, "alloy")
    for p in ((3.4, -1.0, 0.0), (3.4, 1.0, 0.0), (-4.0, -1.3, 0.0), (-4.0, 1.3, 0.0)):
        box(p, (0.5, 0.5, 0.08), "steel", 0.02)
    pipe([(-0.4, -1.35, 1.2), (2.6, -0.9, 1.0)], r * 1.12, "teal", False)


def frame_cage():
    """Caged chassis: steel sills and crossmembers under a full roll cage and window net."""
    for s in (-1, 1):
        box((-0.2, s * 2.1, 0.3), (8.4, 0.5, 0.45), "steel", 0.08)
    for x in (-3.4, -1.2, 1.2, 3.4):
        box((x, 0, 0.3), (0.4, 4.2, 0.3), "steel", 0.05)
    box((0.2, 0, 0.18), (7.4, 3.8, 0.06), "cast", 0.02)
    r = 0.11
    for s in (-1, 1):
        pipe([(2.0, s * 2.05, 0.5), (1.5, s * 1.95, 3.0)], r, "alloy")
        pipe([(-1.1, s * 2.05, 0.5), (-1.1, s * 2.0, 3.2)], r, "alloy")
        pipe([(-1.1, s * 2.0, 3.2), (-3.2, s * 1.4, 0.5)], r * 0.9, "alloy")
        for z in (1.0, 1.8, 2.5):
            pipe([(-1.1, s * 2.03, z), (1.9 - (z - 1.0) * 0.25, s * 1.99, z)], r * 0.85, "alloy", False)
        pipe([(2.0, s * 2.05, 0.5), (3.2, s * 1.2, 0.5)], r * 0.9, "alloy")
    pipe([(-1.1, -2.0, 3.2), (-1.1, 2.0, 3.2)], r, "alloy")
    pipe([(-1.1, -2.0, 0.6), (-1.1, 2.0, 3.0)], r * 0.7, "alloy", False)
    pipe([(-1.1, 2.0, 0.6), (-1.1, -2.0, 3.0)], r * 0.7, "alloy", False)
    for i in range(7):
        x = -1.0 + i * 0.4
        rod((x, -2.08, 1.1), (x, -2.08, 2.9), 0.025, "plastic", 8)
    for j in range(6):
        z = 1.2 + j * 0.33
        rod((-1.0, -2.08, z), (1.6, -2.08, z), 0.025, "plastic", 8)
    pipe([(-1.1, -2.0, 3.2), (1.5, -1.95, 3.0)], r * 1.12, "teal", False)
    pipe([(1.5, 1.95, 3.0), (-1.1, 2.0, 3.2)], r * 1.12, "teal", False)
    pipe([(1.5, -1.95, 3.0), (1.5, 1.95, 3.0)], r, "alloy")


PARTS = {
    "wheel_basic": wheel_basic,
    "wheel_busted": wheel_busted,
    "wheel_kart": wheel_kart,
    "wheel_river": wheel_river,
    "wheel_sport": wheel_sport,
    "wheel_knobby": wheel_knobby,
    "wheel_dirt": wheel_dirt,
    "wheel_at": wheel_at,
    "wheel_slick": wheel_slick,
    "wheel_groove": wheel_groove,
    "frame_scrap": frame_scrap,
    "frame_mower": frame_mower,
    "frame_kart": frame_kart,
    "frame_steel": frame_steel,
    "frame_wagon": frame_wagon,
    "frame_tube": frame_tube,
    "frame_cage": frame_cage,
}
