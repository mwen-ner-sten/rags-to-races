"""Vehicle sprites: every vehicle in src/core/content/vehicles.ts, one model each.

    blender --background --factory-startup --python scripts/art/render_vehicles.py -- [vehicle_id ...]

Every vehicle faces +X (nose), is seen from its right side (-Y), and shares one
family look: dark paint, bright alloy wheels, ice headlights, fuchsia tail
lights and a teal underglow strip along the sill. Units are roughly metres.
The helpers here (loft, wheel, sedan, ...) are reused by parts_other.py (the
sedan shell) and render_rally.py (top-down markers).
"""
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import bmesh  # noqa: E402
import bpy  # noqa: E402
import kit  # noqa: E402
from kit import TAU, box, mat, mesh_from, rod, torus, tube  # noqa: E402

SIZE = (720, 480)  # 2x the shipped 360x240
PI = math.pi


# ── Helpers ───────────────────────────────────────────────────────────────


def loft(secs, material, bevel=0.03, name="Loft"):
    """A closed solid through (x, z_bottom, z_top, half_width_bottom, half_width_top)
    cross sections along X."""
    verts = []
    for x, z0, z1, hwb, hwt in secs:
        verts += [(x, -hwb, z0), (x, hwb, z0), (x, hwt, z1), (x, -hwt, z1)]
    faces = []
    for i in range(len(secs) - 1):
        a, b = 4 * i, 4 * (i + 1)
        for k in range(4):
            k2 = (k + 1) % 4
            faces.append((a + k, a + k2, b + k2, b + k))
    last = 4 * (len(secs) - 1)
    faces += [(0, 3, 2, 1), (last, last + 1, last + 2, last + 3)]
    obj = mesh_from(verts, faces, material, name, smooth=True)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(obj.data)
    bm.free()
    if bevel:
        mod = obj.modifiers.new("Bevel", "BEVEL")
        mod.width, mod.segments, mod.limit_method = bevel, 3, "ANGLE"
        obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    return obj


def cut_arches(target, centres, radius, y_inner=0.5, y_outer=1.1):
    """Cut wheel arches (cylinders along Y) out of a solid, outer part only."""
    bpy.context.view_layer.objects.active = target
    for x, z in centres:
        for side in (-1, 1):
            bpy.ops.mesh.primitive_cylinder_add(
                vertices=40, radius=radius, depth=y_outer - y_inner,
                location=(x, side * (y_inner + y_outer) / 2, z), rotation=(PI / 2, 0, 0))
            cutter = bpy.context.object
            bpy.context.view_layer.objects.active = target
            mod = target.modifiers.new("Arch", "BOOLEAN")
            mod.operation, mod.object, mod.solver = "DIFFERENCE", cutter, "EXACT"
            bpy.ops.object.modifier_apply(modifier=mod.name)
            bpy.data.objects.remove(cutter, do_unlink=True)


def cut_box(target, pos, dims):
    """Cut a box-shaped hole out of a solid."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    cutter = bpy.context.object
    cutter.scale = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bpy.context.view_layer.objects.active = target
    mod = target.modifiers.new("Hole", "BOOLEAN")
    mod.operation, mod.object, mod.solver = "DIFFERENCE", cutter, "EXACT"
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter, do_unlink=True)


def bevelled(obj, width=0.03):
    mod = obj.modifiers.new("Bevel", "BEVEL")
    mod.width, mod.segments, mod.limit_method = width, 3, "ANGLE"
    obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    return obj


def wheel(x, y, z, r, w, side, rim="chrome", spokes=5, centre="alloy", dish=0.5):
    """Tyre on a visible rim; `side` is the way the outer face looks (-1 = -Y)."""
    rod((x, y - w / 2, z), (x, y + w / 2, z), r, "rubber", 48, bevel=min(r, w) * 0.12)
    face = y + side * (w / 2 + 0.004)
    inner = y + side * (w / 2 - 0.03 * r)
    rod((x, inner, z), (x, face, z), r * 0.68, rim, 40, bevel=0)  # bright rim face
    dark = y + side * (w / 2 + 0.012)
    rod((x, face, z), (x, dark, z), r * 0.5, "cast", 32, bevel=0)  # dark dish between spokes
    for i in range(spokes):
        a = TAU * i / spokes + 0.3
        box((x + math.cos(a) * r * 0.3, dark + side * 0.004, z + math.sin(a) * r * 0.3),
            (r * 0.5, r * 0.09, r * 0.14), rim, 0.004, (0, -a, 0))
    rod((x, dark, z), (x, dark + side * r * 0.12 * dish, z), r * 0.17, centre, 24)
    torus((x, face + side * 0.002, z), r * 0.67, max(0.006, r * 0.028), "teal_dim", (PI / 2, 0, 0), 48)


def sill_glow(x0, x1, y, z, glow="teal"):
    """The family underglow: a thin teal tube along a sill, both sides."""
    for side in (-1, 1):
        tube([(x0, side * y, z), (x1, side * y, z)], glow, 0.014, smooth=False)


def lamp(pos, dims, material, rot=(0, 0, 0)):
    return box(pos, dims, material, 0, rot)


def paint(name, tint=None):
    return mat(name, tint)


# ── Sedan (beater, street stock, roadbook special, parts shell) ───────────

BODY = [  # x, z_bottom, z_top, half_width_bottom, half_width_top
    (-2.2, 0.42, 0.92, 0.78, 0.78),
    (-2.1, 0.32, 1.00, 0.86, 0.86),
    (-1.4, 0.30, 1.03, 0.90, 0.90),
    (-0.5, 0.28, 1.01, 0.90, 0.90),
    (0.6, 0.28, 0.99, 0.90, 0.90),
    (1.4, 0.30, 0.93, 0.88, 0.88),
    (2.0, 0.36, 0.84, 0.84, 0.84),
    (2.2, 0.42, 0.72, 0.78, 0.78),
]
CABIN = [
    (-1.15, 1.0, 1.06, 0.80, 0.70),
    (-0.65, 1.0, 1.44, 0.80, 0.67),
    (0.15, 1.0, 1.44, 0.80, 0.67),
    (0.85, 1.0, 1.04, 0.80, 0.72),
]
WHEEL_X = (1.38, -1.35)


def _pillars(material, z_top=1.44):
    for side in (-1, 1):
        for (x0, x1) in ((0.85, 0.15), (-1.15, -0.65), (-0.25, -0.25)):
            a = (x0, side * 0.80, 1.0)
            b = (x1, side * 0.67, z_top)
            rod(a, b, 0.035, material, 12, bevel=0)


def sedan_body(body_paint, *, shell=False, lift=0.0):
    """Tub, cabin frame and arches. Returns nothing; adds objects at origin."""
    secs = BODY[:5] + [(0.85, 0.28, 0.99, 0.90, 0.90)] if shell else BODY
    tub = loft(secs, body_paint, bevel=0, name="Tub")
    cut_arches(tub, [(x, 0.34 + lift) for x in WHEEL_X if not (shell and x > 0.85)], 0.42)
    if shell:  # open the cabin: doors stay as thin walls, rear deck stays
        cut_box(tub, (-0.15, 0, 0.9), (1.9, 1.6, 0.8))
    bevelled(tub, 0.03)
    if shell:
        return
    box((-0.25, 0, 1.455), (0.86, 1.32, 0.045), body_paint, 0.02)  # roof


def _greenhouse(body_paint, glass=True):
    if glass:
        loft(CABIN, "glass", bevel=0.01, name="Glass")
    _pillars(body_paint)


def _sedan_lights(headlight="ice", dim_side=None):
    for side in (-1, 1):
        mat_name = "ice_dim" if dim_side == side else headlight
        lamp((2.17, side * 0.52, 0.70), (0.05, 0.3, 0.1), mat_name)
        lamp((-2.15, side * 0.52, 0.80), (0.05, 0.3, 0.09), "fuchsia")
    box((2.2, 0, 0.64), (0.04, 0.5, 0.16), "cast", 0.01)  # grille


def _door_lines():
    for side in (-1, 1):
        y = side * 0.905
        for x in (-1.05, -0.25, 0.55):
            box((x, y, 0.68), (0.012, 0.01, 0.62), "cast", 0)
        box((-0.05 - 0.05, y, 0.99), (1.6, 0.01, 0.014), "cast", 0)
        for x in (-0.2, -0.95):
            box((x, y * 1.005, 0.9), (0.2, 0.014, 0.03), "steel", 0.004)
        box((-0.0, y, 0.30), (3.0, 0.02, 0.02), "cast", 0)  # sill


def sedan_wheels(r=0.34, w=0.24, rim="alloy", lift=0.0, y=0.78, spokes=5, dish=0.5):
    for x in WHEEL_X:
        for side in (-1, 1):
            wheel(x, side * y, r + lift, r, w, side, rim, spokes, dish=dish)


# ── Vehicles ──────────────────────────────────────────────────────────────


def beater_car():
    """A tired old sedan: faded oxblood, one rust-eaten fender, mismatched panel."""
    body = paint("oxblood", (1.3, 1.4, 1.4))
    sedan_body(body)
    _greenhouse(body)
    _door_lines()
    _sedan_lights(dim_side=-1)
    # Rust and a replacement fender in the wrong colour.
    for pos, dims in (((1.55, -0.905, 0.62), (0.6, 0.012, 0.3)), ((-1.55, -0.905, 0.5), (0.5, 0.012, 0.2)),
                      ((1.3, 0, 0.945), (0.8, 0.5, 0.012)), ((-1.7, 0.2, 1.035), (0.5, 0.6, 0.012))):
        box(pos, dims, "rust", 0)
    box((0.1, -0.908, 0.64), (0.62, 0.012, 0.5), paint("enamel", (1.4, 1.4, 1.4)), 0.01)  # mismatched door
    # Bumpers: one a little low, dull steel.
    box((2.27, 0, 0.42), (0.1, 1.5, 0.12), "steel", 0.03)
    box((-2.25, 0, 0.4), (0.1, 1.5, 0.12), "steel", 0.03, (0, 0.08, 0))
    for side in (-1, 1):
        box((0.78, side * 0.93, 1.05), (0.16, 0.1, 0.1), "cast", 0.02)  # mirrors
    sedan_wheels(0.33, 0.22, "steel", spokes=4)
    sill_glow(-1.9, 1.9, 0.86, 0.27)


def street_stock():
    """A dirt oval stock car: glass out, doors welded, cage and plank spoiler."""
    body = paint("enamel", (0.9, 1.1, 1.8))
    sedan_body(body, lift=0.02)
    _greenhouse(body, glass=False)
    _door_lines()
    box((-0.5, 0, 0.98), (2.0, 1.5, 0.02), "cast", 0)  # blacked-out interior floor
    # Roll cage seen through the window openings.
    for side in (-1, 1):
        y = side * 0.72
        for z in (1.15, 1.32):
            rod((0.7, y, z), (-0.9, y, z), 0.022, "steel", 10, bevel=0)
        rod((0.2, y, 1.0), (0.2, side * 0.62, 1.42), 0.025, "steel", 10, bevel=0)
        rod((-0.6, y, 1.0), (-0.6, side * 0.62, 1.42), 0.025, "steel", 10, bevel=0)
    rod((0.2, -0.62, 1.42), (0.2, 0.62, 1.42), 0.025, "steel", 10, bevel=0)
    rod((-0.6, -0.62, 1.42), (-0.6, 0.62, 1.42), 0.025, "steel", 10, bevel=0)
    box((-0.55, 0, 0.96), (0.42, 0.5, 0.08), "plastic", 0.03)  # seat
    # Welded door seams, taped lamps.
    for side in (-1, 1):
        for x in (-0.25, 0.55):
            box((x, side * 0.912, 0.68), (0.03, 0.01, 0.6), "rust", 0)
    _sedan_lights(headlight="ice_dim")
    # Push bar and rear plank spoiler.
    box((2.27, 0, 0.5), (0.08, 1.4, 0.1), "steel", 0.02)
    for side in (-1, 1):
        rod((2.27, side * 0.5, 0.5), (2.1, side * 0.5, 0.75), 0.03, "steel", 10, bevel=0)
        rod((-2.0, side * 0.55, 1.0), (-2.15, side * 0.62, 1.22), 0.03, "steel", 10, bevel=0)
    box((-2.17, 0, 1.28), (0.1, 1.5, 0.3), body, 0.015, (0, -0.15, 0))
    sedan_wheels(0.36, 0.3, "alloy", lift=0.0, y=0.76, spokes=6, dish=0.2)
    sill_glow(-1.9, 1.9, 0.86, 0.27)


def roadbook_special():
    """A light rally sedan: scoops, a bar of driving lamps, bright alloys."""
    body = paint("enamel", (0.9, 1.5, 1.4))
    sedan_body(body, lift=0.06)
    _greenhouse(body)
    _door_lines()
    _sedan_lights()
    box((0.9, 0, 0.995), (0.8, 0.5, 0.06), "cast", 0.03)  # bonnet scoop
    box((0.55, 0, 1.07), (0.22, 0.3, 0.12), "cast", 0.02)
    box((-0.25, 0, 1.52), (0.4, 0.5, 0.1), "cast", 0.03)  # roof scoop
    # Front lamp bar.
    box((2.2, 0, 0.88), (0.06, 1.3, 0.05), "steel", 0.01)
    for side in (-1, 1):
        for off in (0.18, 0.46):
            y = side * off
            rod((2.25, y, 0.94), (2.3, y, 0.94), 0.09, "cast", 24, bevel=0)
            rod((2.3, y, 0.94), (2.325, y, 0.94), 0.075, "ice", 24, bevel=0)
    rod((-2.0, 0.55, 1.03), (-2.2, 0.75, 1.9), 0.01, "steel", 6, bevel=0)  # whip aerial
    box((-1.2, -0.92, 0.52), (0.06, 0.02, 0.2), "rubber", 0)  # mud flaps
    box((1.2, -0.92, 0.52), (0.06, 0.02, 0.2), "rubber", 0)
    box((2.0, 0, 0.3), (0.5, 1.1, 0.04), "alloy", 0.01)  # skid plate
    sedan_wheels(0.37, 0.25, "chrome", lift=0.06, y=0.78, spokes=5, dish=0.6)
    sill_glow(-1.9, 1.9, 0.86, 0.33)


def go_kart():
    """A welded tube kart: bucket seat, rear-mounted engine, slicks on the axle."""
    shell = paint("oxblood", (1.2, 1.2, 1.4))
    box((0, 0, 0.1), (1.15, 0.58, 0.03), "steel", 0.01)  # floor pan
    for side in (-1, 1):
        rod((-0.58, side * 0.31, 0.12), (0.52, side * 0.23, 0.12), 0.018, "steel", 10, bevel=0)
        rod((-0.4, side * 0.33, 0.24), (0.3, side * 0.25, 0.24), 0.016, "steel", 10, bevel=0)
        rod((-0.4, side * 0.33, 0.12), (-0.4, side * 0.33, 0.24), 0.014, "steel", 10, bevel=0)
        rod((0.3, side * 0.25, 0.12), (0.3, side * 0.25, 0.24), 0.014, "steel", 10, bevel=0)
    rod((-0.62, -0.33, 0.28), (-0.62, 0.33, 0.28), 0.02, "steel", 10, bevel=0)  # rear bumper
    for side in (-1, 1):
        rod((-0.58, side * 0.31, 0.12), (-0.62, side * 0.33, 0.28), 0.016, "steel", 10, bevel=0)
    loft([(0.45, 0.1, 0.22, 0.27, 0.25), (0.62, 0.1, 0.25, 0.25, 0.2), (0.82, 0.12, 0.2, 0.18, 0.1)], shell, 0.02)
    box((-0.1, 0, 0.17), (0.34, 0.36, 0.05), "plastic", 0.02)  # bucket seat
    box((-0.3, 0, 0.36), (0.06, 0.4, 0.36), "plastic", 0.025, (0, -0.15, 0))
    for side in (-1, 1):
        box((-0.15, side * 0.2, 0.3), (0.3, 0.04, 0.24), "plastic", 0.02)
    rod((0.28, 0, 0.14), (0.16, 0, 0.36), 0.014, "steel", 10, bevel=0)
    torus((0.14, 0, 0.395), 0.1, 0.012, "rubber", (0, -0.55, 0), 40)
    box((-0.46, -0.2, 0.22), (0.2, 0.17, 0.2), "cast", 0.02)  # engine on the right
    rod((-0.46, -0.2, 0.33), (-0.46, -0.2, 0.4), 0.07, "enamel", 24)
    box((-0.36, -0.3, 0.3), (0.06, 0.04, 0.12), "cast", 0.01)
    rod((-0.53, -0.3, 0.2), (-0.7, -0.3, 0.2), 0.03, "rust", 12, bevel=0)
    box((0.0, -0.3, 0.24), (0.22, 0.1, 0.1), shell, 0.03)  # side tank
    rod((-0.6, -0.4, 0.115), (-0.6, 0.4, 0.115), 0.016, "alloy", 12, bevel=0)  # rear axle
    for side in (-1, 1):
        wheel(0.46, side * 0.37, 0.1, 0.1, 0.1, side, "chrome", 5, dish=0.3)
        wheel(-0.6, side * 0.42, 0.115, 0.115, 0.2, side, "chrome", 5, dish=0.3)
        lamp((0.84, side * 0.1, 0.17), (0.03, 0.1, 0.04), "ice")
    lamp((-0.65, 0, 0.26), (0.03, 0.22, 0.04), "fuchsia")
    sill_glow(-0.45, 0.45, 0.28, 0.07)


def push_mower():
    """A walk-behind mower: pressed-steel deck, pull-start engine, tall handle."""
    shell = paint("oxblood", (1.3, 1.0, 1.0))
    loft([(-0.42, 0.18, 0.34, 0.32, 0.28), (0.0, 0.17, 0.4, 0.34, 0.26), (0.42, 0.18, 0.32, 0.3, 0.26)], shell, 0.04)
    box((0.0, -0.1, 0.34), (0.5, 0.4, 0.06), "steel", 0.03)  # engine mount
    box((0.0, 0.0, 0.5), (0.3, 0.3, 0.25), "cast", 0.04)  # engine
    rod((0.0, 0.0, 0.62), (0.0, 0.0, 0.7), 0.17, "enamel", 40)  # recoil shroud
    rod((0.0, 0.0, 0.7), (0.0, 0.0, 0.73), 0.05, "alloy", 20)
    box((0.14, 0.13, 0.55), (0.14, 0.12, 0.14), shell, 0.03)  # tank
    box((-0.24, -0.1, 0.6), (0.3, 0.08, 0.06), "rust", 0.02)  # muffler
    box((-0.1, -0.34, 0.26), (0.28, 0.12, 0.14), "plastic", 0.03)  # discharge chute
    for side in (-1, 1):
        rod((-0.45, side * 0.24, 0.36), (-1.05, side * 0.25, 1.0), 0.016, "steel", 10, bevel=0)
    rod((-1.05, -0.26, 1.0), (-1.05, 0.26, 1.0), 0.016, "steel", 10, bevel=0)
    for side in (-1, 1):
        rod((-1.05, side * 0.2, 1.0), (-1.05, side * 0.3, 1.0), 0.03, "rubber", 12, bevel=0)
    rod((-1.04, -0.2, 0.96), (-0.86, -0.2, 0.82), 0.008, "steel", 6, bevel=0)  # bail lever
    for side in (-1, 1):
        wheel(-0.32, side * 0.4, 0.2, 0.2, 0.1, side, "chrome", 6, dish=0.3)
        wheel(0.32, side * 0.37, 0.15, 0.15, 0.08, side, "chrome", 5, dish=0.3)
    lamp((0.43, 0, 0.27), (0.03, 0.14, 0.05), "ice")
    lamp((-0.42, 0, 0.32), (0.03, 0.14, 0.05), "fuchsia")
    sill_glow(-0.38, 0.38, 0.33, 0.15)


def riding_mower():
    """A lawn tractor: hood, seat, steering wheel, big rear wheels."""
    shell = paint("oxblood", (1.4, 1.1, 1.1))
    for side in (-1, 1):
        rod((-0.7, side * 0.26, 0.28), (0.9, side * 0.26, 0.28), 0.03, "steel", 10, bevel=0)
    box((0.1, 0, 0.2), (1.5, 0.58, 0.05), "steel", 0.02)  # deck
    loft([(0.9, 0.12, 0.2, 0.3, 0.3), (0.95, 0.12, 0.3, 0.3, 0.3)], "steel", 0)  # front bar
    loft([(0.35, 0.28, 0.6, 0.27, 0.25), (0.6, 0.3, 0.64, 0.28, 0.26), (0.95, 0.3, 0.58, 0.26, 0.2), (1.02, 0.34, 0.5, 0.2, 0.15)], shell, 0.04)
    box((-0.15, 0, 0.62), (0.3, 0.1, 0.1), "steel", 0.03)  # steering column base
    rod((0.2, 0, 0.62), (0.05, 0, 0.88), 0.025, "steel", 12, bevel=0)
    torus((0.0, 0, 0.93), 0.17, 0.02, "rubber", (0, -0.45, 0), 40)
    box((-0.42, 0, 0.55), (0.42, 0.42, 0.08), "plastic", 0.04)  # seat
    box((-0.62, 0, 0.78), (0.08, 0.42, 0.4), "plastic", 0.04, (0, -0.18, 0))
    for side in (-1, 1):
        box((-0.55, side * 0.5, 0.58), (0.7, 0.2, 0.05), shell, 0.03)  # fenders
    box((-0.6, 0, 0.26), (0.6, 0.5, 0.2), "cast", 0.04)  # engine and transaxle
    box((-0.05, -0.3, 0.2), (0.12, 0.06, 0.2), "steel", 0.02)  # footrest bracket
    box((0.15, -0.34, 0.4), (0.4, 0.1, 0.03), "steel", 0.01)
    box((-0.2, -0.38, 0.3), (0.6, 0.12, 0.17), "plastic", 0.03)  # discharge chute
    box((-0.98, 0, 0.35), (0.05, 0.16, 0.05), "steel", 0.01)  # hitch
    rod((-1.0, 0, 0.3), (-1.0, 0, 0.38), 0.025, "steel", 10, bevel=0)
    for side in (-1, 1):
        wheel(-0.68, side * 0.5, 0.3, 0.3, 0.16, side, "chrome", 6, dish=0.3)
        wheel(0.78, side * 0.4, 0.2, 0.2, 0.12, side, "chrome", 5, dish=0.3)
        lamp((1.03, side * 0.15, 0.42), (0.03, 0.14, 0.07), "ice")
        lamp((-0.82, side * 0.22, 0.48), (0.03, 0.14, 0.05), "fuchsia")
    sill_glow(-0.5, 0.7, 0.3, 0.13)


def service_runabout():
    """A depot hauler: cowl, bench seat under a roll hoop, open cargo bed."""
    shell = paint("enamel", (1.0, 1.4, 1.6))
    chassis = box((0, 0, 0.32), (2.4, 0.9, 0.08), "steel", 0.02)  # noqa: F841
    loft([(0.65, 0.3, 0.8, 0.42, 0.4), (1.0, 0.3, 0.78, 0.42, 0.36), (1.25, 0.32, 0.62, 0.4, 0.3)], shell, 0.04)
    box((1.25, 0, 0.5), (0.04, 0.4, 0.14), "cast", 0.01)  # grille
    box((0.1, 0, 0.5), (0.5, 0.78, 0.1), "plastic", 0.04)  # bench seat
    box((-0.15, 0, 0.78), (0.1, 0.78, 0.4), "plastic", 0.04)
    for side in (-1, 1):
        rod((0.4, side * 0.42, 0.34), (0.4, side * 0.42, 1.25), 0.03, "steel", 10, bevel=0)
        rod((-0.25, side * 0.42, 0.34), (-0.25, side * 0.42, 1.25), 0.03, "steel", 10, bevel=0)
    box((0.07, 0, 1.27), (0.8, 0.95, 0.04), shell, 0.015)  # canopy
    rod((0.62, 0, 0.62), (0.45, 0, 1.0), 0.02, "steel", 10, bevel=0)  # steering column
    torus((0.43, 0, 1.04), 0.16, 0.018, "rubber", (0, -0.5, 0), 40)
    # Cargo bed with a few crates.
    box((-0.9, 0, 0.42), (1.2, 0.86, 0.05), "steel", 0.02)
    for side in (-1, 1):
        box((-0.9, side * 0.42, 0.58), (1.2, 0.04, 0.28), "steel", 0.015)
    box((-1.5, 0, 0.58), (0.04, 0.86, 0.28), "steel", 0.015)
    box((-0.6, 0, 0.5), (0.04, 0.86, 0.28), "steel", 0.015)
    box((-1.1, -0.15, 0.66), (0.4, 0.4, 0.3), "wood", 0.02)
    box((-0.75, 0.1, 0.62), (0.3, 0.3, 0.22), "wood", 0.02, (0, 0, 0.3))
    box((-1.25, 0.25, 0.62), (0.28, 0.2, 0.24), shell, 0.04)
    for side in (-1, 1):
        wheel(0.85, side * 0.52, 0.26, 0.26, 0.16, side, "chrome", 5, dish=0.3)
        wheel(-1.0, side * 0.52, 0.26, 0.26, 0.16, side, "chrome", 5, dish=0.3)
        lamp((1.27, side * 0.2, 0.5), (0.03, 0.14, 0.08), "ice")
        lamp((-1.52, side * 0.3, 0.7), (0.03, 0.12, 0.07), "fuchsia")
    sill_glow(-1.4, 1.1, 0.46, 0.27)


VEHICLES = {
    "push_mower": push_mower,
    "riding_mower": riding_mower,
    "go_kart": go_kart,
    "beater_car": beater_car,
    "street_stock": street_stock,
    "service_runabout": service_runabout,
    "roadbook_special": roadbook_special,
}

if __name__ == "__main__":
    kit.run("vehicles", VEHICLES, SIZE)
