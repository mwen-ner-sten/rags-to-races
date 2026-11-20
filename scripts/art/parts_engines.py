"""Engines, gearboxes and exhausts. See render_parts.py."""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import kit  # noqa: E402,F401
from kit import TAU, arc, ball, box, cone, rod, torus, tube  # noqa: E402,F401
from mathutils import Vector  # noqa: E402,F401


def fins(origin, axis_len, radius, count, gap, material="cast", axis="z"):
    """Cooling fins: a stack of thin discs."""
    o = Vector(origin)
    step = Vector({"x": (1, 0, 0), "y": (0, 1, 0), "z": (0, 0, 1)}[axis]) * gap
    for i in range(count):
        c = o + step * i
        rod(c - step * 0.22, c + step * 0.22, radius, material, 32)


def engine_small():
    """Single-cylinder pull-start engine off a pressure washer."""
    box((0, 0, 0.05), (2.6, 1.9, 0.1), "steel", 0.02)  # base plate
    box((0, 0, 0.75), (1.8, 1.5, 1.3), "cast", 0.12)  # crankcase
    rod((0, -0.75, 0.6), (0, -1.15, 0.6), 0.16, "steel", 24)  # output shaft
    rod((0, -1.15, 0.6), (0, -1.5, 0.6), 0.08, "alloy", 16)
    # Horizontal finned cylinder out the right side.
    rod((0.9, 0, 0.9), (1.9, 0, 0.9), 0.38, "cast", 32)
    for i in range(7):
        x = 1.0 + i * 0.13
        rod((x, 0, 0.9), (x + 0.04, 0, 0.9), 0.6, "cast", 40)
    box((2.05, 0, 0.9), (0.25, 0.8, 0.8), "cast", 0.05)  # head
    rod((2.18, 0, 1.15), (2.38, 0, 1.4), 0.05, "ice_dim", 12)  # spark plug
    tube([(2.38, 0, 1.4), (2.2, -0.4, 1.9), (1.0, -0.7, 1.9), (0.4, -0.6, 1.6)], "teal", 0.03)  # plug lead
    # Recoil starter shroud on top with the pull handle.
    rod((0, 0.1, 1.4), (0, 0.1, 1.75), 0.75, "enamel", 48)
    for i in range(10):
        a = TAU * i / 10
        box((0.48 * math.cos(a), 0.1 + 0.48 * math.sin(a), 1.76), (0.3, 0.05, 0.03), "steel", 0, (0, 0, a))
    rod((0, 0.1, 1.76), (0, 0.1, 1.82), 0.16, "alloy", 24)
    tube([(-0.55, -0.45, 1.6), (-0.8, -0.85, 1.85)], "steel", 0.015)
    rod((-0.95, -0.9, 1.9), (-0.65, -0.9, 1.9), 0.06, "rubber", 12)
    # Fuel tank and air filter on the left.
    box((-1.3, 0.25, 1.35), (0.9, 1.2, 0.7), "oxblood", 0.15)
    rod((-1.3, 0.55, 1.7), (-1.3, 0.55, 1.85), 0.14, "plastic", 20)
    box((-1.25, -0.75, 0.95), (0.6, 0.35, 0.6), "plastic", 0.06)
    # Muffler with heat glowing through its slots.
    box((1.45, -0.85, 1.55), (0.7, 0.45, 0.4), "rust", 0.08)
    for k in range(3):
        box((1.25 + k * 0.2, -1.08, 1.55), (0.08, 0.02, 0.26), "fuchsia", 0)


# -- Shared bits -------------------------------------------------------------


def bolt_row(start, step, count, radius, height, material="steel", up=(0, 0, 1)):
    """A row of bolt heads / caps."""
    s, d, u = Vector(start), Vector(step), Vector(up)
    for i in range(count):
        p = s + d * i
        rod(p, p + u * height, radius, material, 12)


def pulley(center, radius, material="alloy", thick=0.3):
    """Crank pulley facing +x."""
    c = Vector(center)
    rod(c, c + Vector((thick, 0, 0)), radius, material, 32)
    rod(c + Vector((thick, 0, 0)), c + Vector((thick + 0.08, 0, 0)), radius * 0.4, "steel", 16)


def stand_plug(pos, direction, length=0.35):
    p = Vector(pos)
    d = Vector(direction).normalized()
    q = p + d * length
    rod(p, q, 0.06, "ice_dim", 12)
    rod(q, q + d * 0.08, 0.04, "steel", 8)
    return q


def exhaust_manifold(xs, y_face, z, out=0.45, material="rust", pipe_r=0.17):
    """Individual runners from a head face to a collector rail."""
    sgn = -1 if y_face < 0 else 1
    for x in xs:
        tube([(x, y_face, z), (x, y_face + sgn * out * 0.7, z - 0.05), (x, y_face + sgn * out, z - 0.35)], material, pipe_r)
    rod((min(xs) - 0.1, y_face + sgn * out, z - 0.38), (max(xs) + 0.1, y_face + sgn * out, z - 0.38), pipe_r * 1.25, material, 24)


def inline_block(n, pitch, y_w=2.2, z_pan=0.7, block_h=1.8, head_h=0.7, cover="plastic", pan="steel", block="cast", head="cast"):
    """Pan, block, head and cover for an inline engine along x.
    Returns (xs of cylinders, z of head top, length)."""
    length = n * pitch + 0.3
    z1 = z_pan + block_h
    box((0, 0, z_pan / 2), (length * 0.82, y_w * 0.88, z_pan), pan, 0.06)
    box((0, 0, z_pan + block_h / 2), (length, y_w, block_h), block, 0.08)
    box((0, 0, z1 + head_h / 2), (length, y_w, head_h), head, 0.06)
    zt = z1 + head_h
    box((0, 0, zt + 0.18), (length * 0.88, y_w * 0.68, 0.36), cover, 0.07)
    xs = [(-(n - 1) / 2 + i) * pitch for i in range(n)]
    return xs, zt, length


# -- Lawn / tiller: small engines --------------------------------------------


def engine_lawn():
    """Vertical-shaft mower engine: tank on top, pull-start shroud, finned cylinder."""
    box((0, 0, 0.05), (2.8, 2.8, 0.1), "steel", 0.02)  # deck mount plate
    box((0, 0, 0.7), (1.7, 1.7, 1.2), "cast", 0.12)  # crankcase
    rod((0, 0, 0.1), (0, 0, -0.9), 0.14, "steel", 20)  # vertical crank shaft
    box((0, 0, -0.75), (2.6, 0.3, 0.06), "steel", 0.01, (0, 0, 0.5))  # blade stub
    rod((0, 0, -0.8), (0, 0, -0.7), 0.3, "alloy", 20)
    # Cylinder out the +x side, finned.
    rod((0.8, 0, 0.9), (1.8, 0, 0.9), 0.4, "cast", 32)
    for i in range(7):
        x = 0.95 + i * 0.12
        rod((x, 0, 0.9), (x + 0.04, 0, 0.9), 0.62, "cast", 40)
    box((1.95, 0, 0.9), (0.25, 0.85, 0.85), "cast", 0.05)
    q = stand_plug((2.0, 0.0, 1.3), (0.3, 0, 1), 0.3)
    tube([q, (1.8, -0.3, 2.0), (0.9, -0.5, 2.0), (0.4, -0.5, 1.7)], "teal", 0.03)
    # Fuel tank across the top and the recoil housing on it.
    box((0, 0.1, 1.55), (1.9, 1.7, 0.5), "oxblood", 0.15)
    rod((-0.6, 0.55, 1.8), (-0.6, 0.55, 1.95), 0.17, "plastic", 20)
    rod((0.1, 0.1, 1.8), (0.1, 0.1, 2.05), 0.62, "enamel", 40)
    for i in range(8):
        a = TAU * i / 8
        box((0.1 + 0.4 * math.cos(a), 0.1 + 0.4 * math.sin(a), 2.06), (0.26, 0.05, 0.03), "steel", 0, (0, 0, a))
    rod((0.1, 0.1, 2.05), (0.1, 0.1, 2.14), 0.14, "alloy", 20)
    tube([(-0.55, -0.4, 1.8), (-0.9, -0.9, 1.7)], "steel", 0.015)
    rod((-1.05, -0.95, 1.7), (-0.75, -0.95, 1.7), 0.06, "rubber", 12)
    # Air filter pod and muffler.
    box((-0.5, -1.05, 0.95), (0.9, 0.5, 0.65), "plastic", 0.08)
    box((0.7, -1.1, 1.0), (0.7, 0.45, 0.4), "steel", 0.08)


def engine_tiller():
    """Heavy cast tiller engine: tall finned cylinder, gear case, tines."""
    box((0, 0, 0.5), (2.2, 1.9, 0.9), "rust", 0.1)  # gear case
    box((0, 0, 1.3), (1.9, 1.6, 0.9), "cast", 0.12)  # crankcase
    # Output shaft out the front with two sets of tines.
    rod((0, -0.9, 0.5), (0, -2.2, 0.5), 0.14, "steel", 20)
    for yy in (-1.3, -2.0):
        for sgn in (1, -1):
            box((sgn * 0.5, yy, 0.1), (0.9, 0.12, 0.2), "steel", 0.02, (0, sgn * 0.7, 0))
            box((sgn * 0.85, yy, -0.25), (0.5, 0.12, 0.16), "rust", 0.02, (0, sgn * 1.2, 0))
    # Tall finned vertical cylinder.
    rod((0.1, 0.2, 1.7), (0.1, 0.2, 3.0), 0.4, "cast", 32)
    for i in range(8):
        z = 1.85 + i * 0.14
        rod((0.1, 0.2, z), (0.1, 0.2, z + 0.05), 0.62, "cast", 40)
    box((0.1, 0.2, 3.1), (0.9, 0.9, 0.3), "cast", 0.05)
    q = stand_plug((0.5, 0.2, 3.15), (1, 0, 0.5), 0.3)
    tube([q, (1.3, 0.2, 3.4), (1.4, -0.5, 2.6), (0.9, -0.8, 1.7)], "teal", 0.03)
    # Fuel tank, recoil and a stubby exhaust.
    box((-1.2, 0.3, 1.9), (0.9, 1.1, 0.7), "rust", 0.12)
    rod((-1.2, 0.3, 2.25), (-1.2, 0.3, 2.4), 0.14, "plastic", 20)
    rod((-0.95, -0.82, 1.4), (-0.95, -1.0, 1.4), 0.7, "enamel", 40)
    rod((-0.95, -1.0, 1.4), (-0.95, -1.08, 1.4), 0.15, "alloy", 20)
    box((1.15, -0.2, 1.75), (0.6, 0.5, 0.45), "rust", 0.08)
    box((1.2, -0.46, 1.75), (0.08, 0.02, 0.26), "fuchsia", 0)


# -- Inline fours ------------------------------------------------------------


def _four_dressing(xs, zt, length, intake="plastic"):
    """Pulley end (+x), intake behind, alternator."""
    xe = length / 2
    pulley((xe, 0, 1.5), 0.55)
    rod((xe, 0.75, 1.3), (xe + 0.25, 0.75, 1.3), 0.33, "steel", 24)  # alternator face
    tube([(xe + 0.15, 0.0, 2.0), (xe + 0.22, 0.75, 1.65)], "rubber", 0.05)
    for x in xs:
        rod((x, 0.75, zt - 0.4), (x, 1.5, zt - 0.1), 0.2, intake, 20)
    rod((xs[0] - 0.2, 1.5, zt - 0.1), (xs[-1] + 0.2, 1.5, zt - 0.1), 0.32, intake, 24)


def engine_v4():
    """Hatchback inline four: plastic cover, belt end facing us, exhaust runners."""
    xs, zt, length = inline_block(4, 1.15)
    _four_dressing(xs, zt, length)
    exhaust_manifold(xs, -1.1, 2.75, 0.5, "rust")
    rod((-0.4, 0, zt + 0.36), (-0.4, 0, zt + 0.5), 0.17, "plastic", 20)  # oil cap
    coil = (xs[0] - 0.5, -0.1, zt + 0.15)
    box(coil, (0.4, 0.5, 0.35), "plastic", 0.05)
    for x in xs:
        q = stand_plug((x, -1.1, 3.15), (0, -0.4, 1), 0.3)
        tube([q, (x * 0.8 + coil[0] * 0.2, -1.3, 3.9), (coil[0] + 0.1, -0.5, coil[2] + 0.2)], "teal", 0.022)


def engine_quarry():
    """Old pump-rig four: skid base, huge flywheel, oil-bath air cleaner, rusty."""
    box((0, 0, 0.08), (6.2, 3.0, 0.16), "steel", 0.03)
    box((0, -1.3, 0.28), (6.0, 0.25, 0.24), "rust", 0.03)
    box((0, 1.3, 0.28), (6.0, 0.25, 0.24), "rust", 0.03)
    xs, zt, length = inline_block(4, 1.25, y_w=2.4, z_pan=0.5, block_h=2.0, head_h=0.8, cover="rust", pan="rust", block="oxblood", head="cast")
    px = length / 2
    # Giant flywheel with bolt holes on the +x end.
    rod((px, 0, 1.6), (px + 0.35, 0, 1.6), 1.6, "cast", 48)
    for i in range(6):
        a = TAU * i / 6
        y, z = 1.0 * math.sin(a), 1.6 + 1.0 * math.cos(a)
        rod((px + 0.36, y, z), (px + 0.4, y, z), 0.16, "steel", 12)
    rod((px, 0, 1.6), (px + 0.6, 0, 1.6), 0.28, "steel", 20)
    # Pushrod tubes and side covers on the front face.
    for x in xs:
        rod((x, -1.25, 1.2), (x, -1.25, 3.0), 0.09, "steel", 10)
        rod((x, -1.2, 1.2), (x, -1.45, 1.2), 0.2, "steel", 16)
    exhaust_manifold(xs, -1.2, 3.2, 0.4, "rust", 0.17)
    # Oil-bath air cleaner on top, a tall can.
    rod((xs[3], 0.4, zt + 0.3), (xs[3], 0.4, zt + 1.3), 0.5, "rust", 32)
    rod((xs[3], 0.4, zt + 1.3), (xs[3], 0.4, zt + 1.55), 0.36, "steel", 32)
    tube([(xs[3], 0.4, zt + 1.5), (xs[1], 0.5, zt + 1.7), (xs[0], 0.7, zt + 0.7)], "steel", 0.15)
    # Pressure gauge on the front: the one lit thing.
    gp = (xs[1] + 0.1, -1.26, 2.1)
    rod(gp, (gp[0], gp[1] - 0.18, gp[2]), 0.3, "alloy", 28)
    rod((gp[0], gp[1] - 0.18, gp[2]), (gp[0], gp[1] - 0.2, gp[2]), 0.24, "teal_dim", 28)
    rod((xs[0], -1.2, 0.5), (xs[0], -1.6, 0.3), 0.08, "steel", 12)  # drain cock


def engine_turbo4():
    """Inline four with a big alloy snail turbo and intercooler pipe."""
    xs, zt, length = inline_block(4, 1.15, cover="alloy", pan="alloy", head="cast")
    _four_dressing(xs, zt, length, intake="alloy")
    exhaust_manifold(xs, -1.1, 2.75, 0.5, "steel", 0.2)
    tx, ty, tz = xs[3] + 0.4, -2.4, 1.9
    # Turbine housing: scroll ball with outlet cone, glowing heat.
    ball((tx, ty, tz), 0.85, "steel", (1, 1, 0.85))
    rod((tx, ty, tz), (tx + 1.3, ty - 0.1, tz), 0.55, "steel", 32)
    rod((tx + 1.3, ty - 0.1, tz), (tx + 1.5, ty - 0.1, tz), 0.5, "chrome", 32)
    rod((tx + 1.45, ty - 0.1, tz), (tx + 1.5, ty - 0.1, tz), 0.38, "fuchsia", 32)  # turbine heat
    # Compressor housing (cone, other side) and intercooler pipe up and over.
    cone((tx - 0.9, ty, tz), 0.85, 0.45, 0.9, "alloy", 32, (0, math.radians(90), 0))
    tube([(tx - 0.9, ty, tz + 0.5), (tx - 1.4, ty + 0.5, 3.8), (xs[1], 0.8, 4.3), (xs[0] - 0.1, 1.3, 3.9)], "alloy", 0.2)
    rod((xs[3] + 0.15, -1.1, 2.4), (tx, ty + 0.5, tz + 0.3), 0.13, "steel", 12)  # oil feed
    rod((xs[1], 0, zt + 0.35), (xs[1], 0, zt + 0.52), 0.17, "alloy", 20)


# -- V engines ---------------------------------------------------------------


def _bank(n, pitch, theta, side, cover_mat="cast", d0=1.2, bank_w=1.7):
    """Block, head and valve cover of one V bank. Returns (frame fn, length)."""
    length = n * pitch + 0.3
    s, c = math.sin(theta), math.cos(theta)

    def at(along, across=0.0, x=0.0):
        return (x, side * along * s + across * c, 1.2 + along * c - side * across * s)

    rot = (-side * theta, 0, 0)
    box(at(d0 + 0.5), (length, bank_w, 1.0), "cast", 0.08, rot)
    box(at(d0 + 1.25), (length, bank_w, 0.55), "cast", 0.06, rot)
    box(at(d0 + 1.75), (length * 0.9, bank_w * 0.85, 0.35), cover_mat, 0.07, rot)
    return at, length


def engine_v6():
    """60-degree V6 with plastic plenum and a cracked, glowing valve cover."""
    th = math.radians(30)
    box((0, 0, 0.35), (3.4, 1.9, 0.7), "steel", 0.06)  # pan
    box((0, 0, 1.0), (3.6, 1.8, 1.2), "cast", 0.08)  # crankcase
    xs = [-1.1, 0, 1.1]
    banks = {side: _bank(3, 1.1, th, side, cover_mat="cast" if side == 1 else "enamel") for side in (1, -1)}
    at, length = banks[-1]
    box((0, 0, 2.7), (length * 0.9, 0.9, 0.5), "plastic", 0.12)  # plenum
    for x in xs:
        for side in (1, -1):
            rod((x, 0, 2.6), (x, side * 0.8, 2.3), 0.17, "plastic", 16)
    rod((-1.5, 0, 2.8), (-2.0, 0, 3.0), 0.4, "plastic", 24)  # throttle body
    # Cracked cover: a lit fracture line across the front bank cover.
    tube([at(3.15, -0.6, -1.2), at(3.15, -0.2, -0.5), at(3.15, 0.1, -0.3), at(3.15, 0.6, 0.4)], "fuchsia", 0.022, smooth=False)
    for side in (1, -1):
        a, _ = banks[side]
        for x in xs:
            p0 = a(1.45, 0.0, x)
            tube([p0, (p0[0], p0[1] + side * 0.5, p0[2]), (p0[0], p0[1] + side * 0.9, p0[2] - 0.2)], "rust", 0.17)
    pulley((1.9, 0, 1.0), 0.5)
    rod((1.9, -0.8, 1.9), (2.15, -0.8, 1.9), 0.3, "steel", 20)
    a, _ = banks[-1]
    for x in xs:
        stand_plug(a(2.9, 0.75, x), (0, -0.5, 1), 0.28)


def engine_v8():
    """90-degree small-block V8: round air cleaner, distributor leads, iron manifolds."""
    th = math.radians(45)
    box((0, 0, 0.4), (4.4, 2.2, 0.8), "steel", 0.06)
    box((0, 0, 1.2), (4.6, 2.2, 1.4), "cast", 0.08)
    banks = {s: _bank(4, 1.05, th, s, cover_mat="steel", d0=1.3, bank_w=1.8) for s in (1, -1)}
    box((0, 0, 2.75), (4.2 * 0.85, 1.4, 0.55), "cast", 0.1)  # intake manifold
    rod((0, 0, 3.0), (0, 0, 3.55), 0.5, "alloy", 32)  # carb
    rod((0, 0, 3.4), (0, 0, 3.75), 1.35, "steel", 48)  # air cleaner base
    rod((0, 0, 3.75), (0, 0, 3.95), 1.3, "alloy", 48)  # lid
    rod((0, 0, 3.95), (0, 0, 4.2), 0.09, "chrome", 12)  # wing nut stud
    xs = [-1.5, -0.5, 0.5, 1.5]
    for side in (1, -1):
        a, _ = banks[side]
        for x in xs:
            p0 = a(1.5, 0.0, x)
            tube([p0, (p0[0], p0[1] + side * 0.4, p0[2] - 0.05), (p0[0], p0[1] + side * 0.8, p0[2] - 0.45)], "rust" if side < 0 else "cast", 0.2)
        p = a(1.5)
        rod((xs[0] - 0.1, p[1] + side * 0.8, p[2] - 0.48), (xs[-1] + 0.1, p[1] + side * 0.8, p[2] - 0.48), 0.25, "cast", 24)
    pulley((2.3, 0, 1.2), 0.65)
    rod((2.3, 0, 2.5), (2.55, 0, 2.5), 0.4, "alloy", 28)
    rod((2.3, 1.0, 1.4), (2.55, 1.0, 1.4), 0.32, "steel", 20)
    dist = (-1.8, 0, 3.0)
    rod((dist[0], 0, 2.7), (dist[0], 0, 3.25), 0.28, "plastic", 20)
    for side, mat in ((-1, "teal"), (1, "teal_dim")):
        a, _ = banks[side]
        for x in xs:
            end = a(3.2, 0.0, x)
            rod(end, (end[0], end[1], end[2] + 0.2), 0.07, "ice_dim", 12)
            tube([(dist[0], 0, 3.25), (x * 0.5 + dist[0] * 0.5, side * 0.5, 4.3), (end[0], end[1], end[2] + 0.2)], mat, 0.028)


def engine_six():
    """Built straight-six: long machined-alloy cover, six chrome velocity stacks."""
    n, pitch = 6, 1.1
    xs, zt, length = inline_block(n, pitch, y_w=2.0, cover="alloy", pan="alloy", block="steel", head="alloy")
    for x in xs:
        cone((x, 0.0, zt + 0.95), 0.34, 0.2, 0.9, "chrome", 32)
        rod((x, 0.0, zt + 0.35), (x, 0.0, zt + 0.5), 0.2, "alloy", 20)
    box((0, 0, zt + 0.5), (length * 0.8, 0.5, 0.18), "alloy", 0.04)
    bolt_row((xs[0] - 0.1, -0.78, zt + 0.36), (pitch, 0, 0), n, 0.07, 0.06, "chrome")
    bolt_row((xs[0] - 0.1, 0.78, zt + 0.36), (pitch, 0, 0), n, 0.07, 0.06, "chrome")
    for x in xs:
        tube([(x, -1.0, 2.8), (x, -1.45, 2.65), (x, -1.9, 1.6)], "steel", 0.17)
    rod((xs[0], -1.9, 1.6), (xs[-1], -1.9, 1.6), 0.24, "steel", 24)
    pulley((length / 2, 0, 1.5), 0.6)
    tube([(xs[0], -0.2, zt + 0.42), (xs[-1], -0.2, zt + 0.42)], "teal", 0.03, smooth=False)  # ignition rail
    for x in xs:
        stand_plug((x, -1.0, 3.2), (0, -0.4, 1), 0.28)


# -- Twin --------------------------------------------------------------------


def engine_twin():
    """Air-cooled V-twin: two finned cylinders in a V over a round-covered crankcase."""
    th = math.radians(38)
    box((0, 0, 0.9), (2.4, 1.6, 1.5), "cast", 0.14)  # crankcase
    rod((0, -0.8, 0.8), (0, -0.88, 0.8), 1.0, "alloy", 48)  # round side cover (faces us)
    rod((0, -0.88, 0.8), (0, -0.94, 0.8), 0.28, "steel", 24)
    rod((0, 0.8, 0.5), (0, 1.6, 0.5), 0.14, "steel", 16)
    for side in (1, -1):
        axis = Vector((side * math.sin(th), 0, math.cos(th)))
        base = Vector((0, 0, 1.3))
        rod(base, base + axis * 2.3, 0.42, "cast", 32)
        for i in range(9):
            p = base + axis * (0.5 + i * 0.17)
            rod(p, p + axis * 0.06, 0.66, "cast", 40)
        head = base + axis * 2.5
        rot = (0, side * th, 0)
        box(head, (1.0, 1.0, 0.55), "cast", 0.06, rot)
        box(base + axis * 2.85, (0.9, 0.85, 0.2), "alloy", 0.05, rot)
        hp = head + Vector((0, -0.45, 0))
        tube([hp, hp + Vector((0, -0.6, 0.15)), hp + Vector((side * 0.3, -0.9, -0.7)), Vector((side * 0.6, -1.3, -1.1))], "rust", 0.15)
    tube([(1.0, 0.1, 3.0), (0.4, 0.1, 3.5), (-0.4, 0.1, 3.5), (-1.0, 0.1, 3.0)], "teal", 0.028)  # plug lead
    rod((0, 0.4, 2.5), (0, 0.4, 2.9), 0.42, "plastic", 24)
    rod((0, 0.4, 2.9), (0, 0.4, 3.0), 0.55, "chrome", 28)


# -- Drivetrain --------------------------------------------------------------


def _cog(center, radius, teeth, thick, material="alloy"):
    """Toothed disc facing -y (gear or sprocket)."""
    c = Vector(center)
    rod(c - Vector((0, thick / 2, 0)), c + Vector((0, thick / 2, 0)), radius, material, 40)
    for i in range(teeth):
        a = TAU * i / teeth
        p = c + Vector((math.cos(a) * radius, 0, math.sin(a) * radius))
        box(p, (0.1, thick, 0.1), material, 0.005, (0, -a, 0))


def drive_chain():
    """Dirt-bike chain drive: small sprocket, big sprocket and a looped chain."""
    a, b = Vector((-1.8, 0, 0.3)), Vector((1.4, 0, 0.0))
    ra, rb = 0.55, 1.35
    _cog(a, ra, 11, 0.22, "alloy")
    _cog(b, rb, 38, 0.22, "chrome")
    rod(b - Vector((0, 0.3, 0)), b + Vector((0, 0.3, 0)), 0.3, "steel", 20)
    rod(a - Vector((0, 0.5, 0)), a + Vector((0, 0.4, 0)), 0.14, "steel", 16)
    ra2, rb2 = ra + 0.06, rb + 0.06
    top = [(a.x, 0, a.z + ra2), (b.x, 0, b.z + rb2)]
    bot = [(a.x, 0, a.z - ra2), (b.x, 0, b.z - rb2)]
    tube(top, "alloy", 0.06, smooth=False)
    tube(bot, "alloy", 0.06, smooth=False)
    arc((a.x, 0, a.z), ra2, "y", "alloy", 0.06, math.pi / 2, math.pi * 1.5)
    arc((b.x, 0, b.z), rb2, "y", "alloy", 0.06, -math.pi / 2, math.pi / 2)
    for i in range(17):
        for p0, p1 in ((top[0], top[1]), (bot[0], bot[1])):
            p = Vector(p0).lerp(Vector(p1), i / 16)
            rod(p - Vector((0, 0.1, 0)), p + Vector((0, 0.1, 0)), 0.07, "steel", 10)
    box((0.0, 0, 1.05), (1.4, 0.18, 0.12), "plastic", 0.03, (0, math.radians(-11), 0))  # chain slider
    rod(b + Vector((0, 0.3, 0)), b + Vector((0, 0.38, 0)), 0.18, "teal", 20)  # lit axle cap


def drive_manual():
    """Five-speed manual: bell housing, main case, tail shaft, floor shifter."""
    rod((1.4, 0, 1.2), (2.4, 0, 1.2), 1.15, "cast", 48)
    rod((2.4, 0, 1.2), (2.55, 0, 1.2), 1.25, "steel", 48)
    rod((2.6, 0, 1.2), (2.7, 0, 1.2), 0.5, "alloy", 24)
    for i in range(8):
        a = TAU * i / 8
        y, z = 1.2 * math.cos(a), 1.2 + 1.2 * math.sin(a)
        rod((2.4, y, z), (2.55, y, z), 0.07, "steel", 8)
    box((0.0, 0, 1.2), (2.2, 1.7, 1.9), "cast", 0.18)
    box((-1.3, 0, 1.1), (1.2, 1.3, 1.5), "cast", 0.15)
    box((0, -0.9, 1.2), (1.8, 0.08, 1.4), "alloy", 0.03)  # side cover plate
    bolt_row((-0.8, -0.96, 0.6), (0.4, 0, 0), 5, 0.06, 0.04, "steel", (0, -1, 0))
    bolt_row((-0.8, -0.96, 1.8), (0.4, 0, 0), 5, 0.06, 0.04, "steel", (0, -1, 0))
    rod((-1.9, 0, 1.1), (-3.0, 0, 1.1), 0.5, "cast", 32)
    rod((-3.0, 0, 1.1), (-3.5, 0, 1.1), 0.22, "steel", 20)
    rod((-3.2, 0, 1.1), (-3.0, 0, 1.1), 0.62, "steel", 24)  # flange
    box((-0.2, 0, 2.3), (0.9, 0.9, 0.35), "cast", 0.06)  # shift tower
    tube([(-0.2, 0, 2.4), (-0.35, 0.0, 3.2), (-0.5, 0.05, 4.0)], "steel", 0.07)
    ball((-0.5, 0.05, 4.1), 0.2, "alloy")
    rod((0.7, 0.85, 1.6), (0.7, 1.15, 1.6), 0.1, "steel", 12)
    rod((0.7, 1.15, 1.6), (0.7, 1.22, 1.6), 0.09, "teal", 12)  # reverse-light switch


def drive_auto():
    """Automatic: torque-converter dome, wide valve-body pan, cooler lines."""
    ball((1.6, 0, 1.3), 1.25, "cast", (0.8, 1, 1))  # converter housing
    rod((2.4, 0, 1.3), (2.55, 0, 1.3), 0.5, "steel", 24)
    box((-0.2, 0, 1.4), (2.4, 1.9, 1.8), "cast", 0.18)  # main case
    box((-0.2, 0, 0.55), (2.6, 2.0, 0.55), "steel", 0.06)  # wide pan
    box((-0.2, 0, 0.12), (2.7, 2.1, 0.1), "steel", 0.02)
    bolt_row((-1.3, -1.05, 0.55), (0.55, 0, 0), 5, 0.06, 0.04, "alloy", (0, -1, 0))
    rod((-1.4, 0, 1.4), (-2.6, 0, 1.4), 0.7, "cast", 32)
    rod((-2.6, 0, 1.4), (-3.2, 0, 1.4), 0.25, "steel", 20)
    tube([(0.7, -0.95, 1.7), (1.0, -1.5, 1.9), (1.0, -1.7, 1.2)], "steel", 0.07)
    tube([(0.7, -0.95, 1.3), (0.6, -1.5, 1.2), (0.9, -1.7, 0.9)], "steel", 0.07)
    tube([(-0.6, -0.5, 2.2), (-0.7, -0.9, 3.0), (-0.5, -1.0, 3.6)], "steel", 0.06)  # dipstick tube
    rod((-0.5, -1.0, 3.6), (-0.5, -1.0, 3.75), 0.13, "teal", 12)  # lit cap
    box((-0.2, 0.2, 2.35), (1.2, 1.1, 0.25), "alloy", 0.04)


def drive_race():
    """Straight-cut race box: compact alloy case, window onto the gear stacks."""
    box((0, 0, 1.0), (3.0, 1.9, 1.7), "alloy", 0.15)
    box((1.8, 0, 1.0), (0.8, 1.9, 1.7), "alloy", 0.15)  # bell flange
    rod((2.2, 0, 1.0), (2.65, 0, 1.0), 0.8, "alloy", 40)
    rod((2.65, 0, 1.0), (2.9, 0, 1.0), 0.28, "steel", 20)
    box((0, -0.97, 1.0), (2.4, 0.04, 1.3), "cast", 0.02)  # dark window recess
    for cx, cz, r in ((-0.7, 1.35, 0.5), (0.55, 1.35, 0.5), (-0.7, 0.65, 0.34), (0.55, 0.65, 0.34)):
        _cog((cx, -1.05, cz), r, 14, 0.14, "steel")
    for x in (-1.2, -0.4, 0.4, 1.2):
        box((x, 0.5, 1.95), (0.1, 1.4, 0.15), "alloy", 0.02)
    bolt_row((-1.2, -1.0, 1.85), (0.4, 0, 0), 7, 0.06, 0.04, "steel", (0, -1, 0))
    bolt_row((-1.2, -1.0, 0.2), (0.4, 0, 0), 7, 0.06, 0.04, "steel", (0, -1, 0))
    rod((-1.5, 0, 1.0), (-2.4, 0, 1.0), 0.45, "alloy", 28)
    rod((-2.4, 0, 1.0), (-2.9, 0, 1.0), 0.18, "steel", 16)
    rod((-2.55, 0, 1.0), (-2.4, 0, 1.0), 0.58, "steel", 24)
    rod((-0.3, 0.0, 1.85), (-0.3, 0.0, 2.7), 0.09, "steel", 12)  # shifter stub
    ball((-0.3, 0.0, 2.8), 0.17, "alloy")
    rod((1.0, -0.6, 1.85), (1.0, -0.6, 2.2), 0.09, "steel", 12)
    rod((1.0, -0.6, 2.2), (1.0, -0.6, 2.28), 0.08, "teal", 12)  # lit sensor


# -- Exhausts ----------------------------------------------------------------


def exhaust_rusted():
    """A bent rusted pipe: flange, a hole glowing with heat, flattened can, tail."""
    tube([(-3.0, 0, 1.0), (-1.8, 0, 1.0), (-1.1, 0, 0.35), (-0.5, 0, 0.35)], "rust", 0.32)
    box((-3.05, 0.0, 1.0), (0.12, 1.1, 1.1), "rust", 0.03)  # flange
    box((0.8, 0, 0.45), (2.4, 1.2, 0.9), "rust", 0.2)  # beat-up muffler
    rod((-0.6, 0, 0.35), (-0.2, 0, 0.4), 0.34, "rust", 16)
    tube([(2.0, 0, 0.45), (2.7, 0, 0.5), (3.2, 0, 0.8)], "rust", 0.26)
    box((0.4, 0, 1.0), (0.15, 0.4, 0.4), "steel", 0.02)
    box((-2.2, 0, 1.55), (0.12, 0.3, 1.0), "steel", 0.02)
    box((0.9, -0.62, 0.55), (0.5, 0.04, 0.3), "fuchsia", 0)  # rusted-through hole
    box((-1.4, -0.3, 0.75), (0.3, 0.03, 0.2), "fuchsia_dim", 0)


def exhaust_straight():
    """A bare mandrel-bent steel pipe, open end glowing."""
    tube([(-3.0, 0, 0.6), (-1.6, 0, 0.6), (-0.9, 0, 1.0), (-0.3, 0, 1.0), (2.8, 0, 1.0)], "steel", 0.42)
    box((-3.05, 0, 0.6), (0.14, 1.2, 1.2), "alloy", 0.03)  # flange
    bolt_row((-3.05, -0.4, 0.3), (0, 0.4, 0), 3, 0.06, 0.04, "chrome", (-1, 0, 0))
    rod((2.2, 0, 1.0), (2.8, 0, 1.0), 0.5, "chrome", 32)  # polished tip
    rod((2.78, 0, 1.0), (2.8, 0, 1.0), 0.38, "fuchsia", 32)  # lit open end
    for x in (-1.7, 0.6):
        tube([(x, 0, 1.4), (x, 0, 2.0)], "steel", 0.06)
        box((x, 0, 1.0), (0.3, 0.8, 0.12), "steel", 0.02)


def exhaust_glasspack():
    """Cherry-painted glasspack can with chrome end caps."""
    rod((-3.2, 0, 0.8), (-2.1, 0, 0.8), 0.3, "steel", 24)
    box((-3.25, 0, 0.8), (0.14, 1.1, 1.1), "steel", 0.03)
    rod((-2.1, 0, 0.8), (-1.5, 0, 0.8), 0.42, "steel", 24)
    rod((-1.5, 0, 0.8), (1.5, 0, 0.8), 0.7, "oxblood", 48)  # the can
    rod((-1.55, 0, 0.8), (-1.45, 0, 0.8), 0.74, "chrome", 48)
    rod((1.45, 0, 0.8), (1.55, 0, 0.8), 0.74, "chrome", 48)
    rod((1.5, 0, 0.8), (1.9, 0, 0.8), 0.42, "steel", 24)
    rod((1.9, 0, 0.8), (3.2, 0, 0.8), 0.3, "steel", 24)
    rod((3.1, 0, 0.8), (3.2, 0, 0.8), 0.3, "chrome", 24)
    rod((3.18, 0, 0.8), (3.2, 0, 0.8), 0.22, "fuchsia_dim", 24)  # tip glow
    for x in (-0.9, 0.9):
        rod((x - 0.05, 0, 0.8), (x + 0.05, 0, 0.8), 0.73, "steel", 40)
    box((0, 0, 1.55), (0.15, 0.4, 0.4), "steel", 0.02)
    box((0, 0, 1.2), (0.3, 0.3, 0.1), "steel", 0.02)
    for i in range(7):
        box((-1.0 + i * 0.33, -0.7, 0.8), (0.07, 0.03, 0.07), "cast", 0)


def exhaust_headers():
    """Eight long-tube primaries (4 per bank) converging into collectors, then one pipe."""
    xs = [-1.5, -0.5, 0.5, 1.5]
    cols = {}
    for side in (-1, 1):
        y0 = side * 1.3
        yc = side * 0.7
        box((0, y0, 2.0), (4.2, 0.12, 0.45), "alloy", 0.03)  # flange plate
        for x in xs:
            tube([(x, y0, 2.0), (x * 0.9, y0 + side * 0.35, 1.8), (x * 0.6, y0 + side * 0.2, 1.0), (x * 0.18, yc, 0.0), (0, side * 0.5, -1.0)], "chrome", 0.2)
            rod((x, y0 + side * 0.06, 2.0), (x, y0 + side * 0.12, 2.0), 0.07, "steel", 12)
        cone((0, side * 0.5, -1.1), 0.45, 0.28, 0.9, "chrome", 28)
        rod((0, side * 0.5, -1.55), (0, side * 0.5, -1.65), 0.38, "steel", 24)
        torus((0, side * 0.5, -0.95), 0.36, 0.045, "fuchsia")  # collector heat band
        cols[side] = (0, side * 0.5, -1.65)
    tube([cols[-1], (0, -0.2, -2.0), (0, 0, -2.6), (0.3, 0.0, -3.4)], "chrome", 0.28)
    tube([cols[1], (0, 0.2, -2.0), (0, 0, -2.6)], "chrome", 0.28)
    rod((0.3, 0, -3.3), (0.3, 0, -3.5), 0.3, "steel", 20)


PARTS = {
    "engine_small": engine_small,
    "engine_lawn": engine_lawn,
    "engine_v4": engine_v4,
    "engine_quarry": engine_quarry,
    "engine_v6": engine_v6,
    "engine_tiller": engine_tiller,
    "engine_twin": engine_twin,
    "engine_turbo4": engine_turbo4,
    "engine_v8": engine_v8,
    "engine_six": engine_six,
    "drive_chain": drive_chain,
    "drive_manual": drive_manual,
    "drive_auto": drive_auto,
    "drive_race": drive_race,
    "exhaust_rusted": exhaust_rusted,
    "exhaust_straight": exhaust_straight,
    "exhaust_glasspack": exhaust_glasspack,
    "exhaust_headers": exhaust_headers,
}
