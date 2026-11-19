"""Midnight Circuit art samples: dark machined objects with neon trim.

Run: blender --background --python scripts/render_neon_samples.py -- [name ...]
Writes raw PNGs to docs/art/samples/midnight-circuit/raw/. Then run
scripts/finish_neon_samples.py to add the glow pass and build the comparison sheet.
"""
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "art" / "samples" / "midnight-circuit" / "raw"
OUTPUT.mkdir(parents=True, exist_ok=True)
TAU = math.tau
SELECTED = set(sys.argv[sys.argv.index("--") + 1:]) if "--" in sys.argv else set()

TEAL = (0.0, 0.78, 1.0)
FUCHSIA = (1.0, 0.1, 0.62)
WHITE = (0.8, 0.95, 1.0)


def material(name, color, metallic=0.0, roughness=0.45, emission=None, strength=0.0):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    surface = mat.node_tree.nodes.get("Principled BSDF")
    surface.inputs["Base Color"].default_value = (*color, 1)
    surface.inputs["Metallic"].default_value = metallic
    surface.inputs["Roughness"].default_value = roughness
    if emission:
        surface.inputs["Emission Color"].default_value = (*emission, 1)
        surface.inputs["Emission Strength"].default_value = strength
    return mat


def palette():
    return {
        "hull": material("Graphite hull", (0.035, 0.045, 0.06), 0.85, 0.3),
        "panel": material("Slate panel", (0.085, 0.105, 0.135), 0.7, 0.38),
        "steel": material("Machined steel", (0.42, 0.5, 0.56), 1.0, 0.22),
        "rubber": material("Carbon rubber", (0.012, 0.014, 0.018), 0.0, 0.62),
        "teal": material("Teal light", (0, 0, 0), 0, 0.4, TEAL, 9),
        "teal_dim": material("Teal light, dim", (0, 0, 0), 0, 0.4, TEAL, 2.2),
        "fuchsia": material("Fuchsia light", (0, 0, 0), 0, 0.4, FUCHSIA, 9),
        "fuchsia_dim": material("Fuchsia light, dim", (0, 0, 0), 0, 0.4, FUCHSIA, 2.5),
        "white": material("White light", (0, 0, 0), 0, 0.4, WHITE, 6),
        "grid": material("Grid light", (0, 0, 0), 0, 0.4, TEAL, 0.7),
        "ground": material("Ground", (0.012, 0.016, 0.024), 0.2, 0.55),
        "track": material("Track", (0.05, 0.062, 0.085), 0.3, 0.5),
    }


M = {}


def finish(obj, mat, bevel=0.0):
    obj.data.materials.append(M[mat])
    if bevel:
        mod = obj.modifiers.new("Rounded edges", "BEVEL")
        mod.width, mod.segments = bevel, 3
        obj.modifiers.new("Machined faces", "WEIGHTED_NORMAL")
    return obj


def box(pos, dims, mat, bevel=0.03, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos, rotation=rot)
    obj = bpy.context.object
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, mat, bevel)


def rod(start, end, radius, mat, vertices=32, bevel=None):
    a, b = Vector(start), Vector(end)
    axis = b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=axis.length, location=(a + b) / 2)
    obj = bpy.context.object
    obj.rotation_euler = axis.to_track_quat("Z", "Y").to_euler()
    bpy.ops.object.shade_smooth()
    return finish(obj, mat, min(0.025, radius * 0.12) if bevel is None else bevel)


def arc(center, radius, axis, mat, thickness=0.014, start=0.0, end=TAU, steps=72):
    """A light tube along part of a circle around `axis` ("x", "y" or "z")."""
    c = Vector(center)
    pts = []
    for i in range(steps + 1):
        a = start + (end - start) * i / steps
        u, v = radius * math.cos(a), radius * math.sin(a)
        pts.append(c + {"x": Vector((0, u, v)), "y": Vector((u, 0, v)), "z": Vector((u, v, 0))}[axis])
    return tube(pts, mat, thickness, cyclic=abs(end - start - TAU) < 1e-6)


def tube(points, mat, thickness=0.014, cyclic=False):
    curve = bpy.data.curves.new("Light tube", "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth, curve.bevel_resolution = thickness, 3
    spline = curve.splines.new("POLY")
    pts = points[:-1] if cyclic else points
    spline.points.add(len(pts) - 1)
    for p, co in zip(spline.points, pts):
        p.co = (*co, 1)
    spline.use_cyclic_u = cyclic
    obj = bpy.data.objects.new("Light tube", curve)
    bpy.context.collection.objects.link(obj)
    curve.materials.append(M[mat])
    return obj


def wire(obj, mat, thickness=0.012):
    """Tron edge lines: a light-tube copy of the object's own edges."""
    copy = obj.copy()
    copy.data = obj.data.copy()
    bpy.context.collection.objects.link(copy)
    copy.modifiers.clear()
    copy.data.materials.clear()
    copy.data.materials.append(M[mat])
    mod = copy.modifiers.new("Edge lines", "WIREFRAME")
    mod.thickness, mod.use_replace = thickness, True
    return copy


# ── Objects ────────────────────────────────────────────────────────────────


def small_wheel(center, radius, width, side):
    """A mower-sized wheel on the Y axis. `side` is -1 or 1: the face that shows."""
    c = Vector(center)
    half = Vector((0, width / 2, 0))
    rod(c - half, c + half, radius, "rubber", 48)
    for i in range(18):
        a = TAU * i / 18
        box(c + Vector((radius * math.cos(a), 0, radius * math.sin(a))), (radius * 0.2, width * 0.92, radius * 0.1), "rubber", 0.006, (0, -a + math.pi / 2, 0))
    face = c + half * side
    out = Vector((0, side, 0))
    rod(face - out * 0.01, face + out * 0.02, radius * 0.62, "steel", 40)
    rod(face + out * 0.02, face + out * 0.04, radius * 0.5, "hull", 40)
    rod(face + out * 0.04, face + out * 0.07, radius * 0.16, "steel", 24)
    arc(face + out * 0.045, radius * 0.56, "y", "teal", radius * 0.03)


def wheel_busted():
    width, front = 0.52, -0.26
    rod((0, -width / 2, 0), (0, width / 2, 0), 1, "rubber", 96)
    for sign in (-1, 1):
        bpy.ops.mesh.primitive_torus_add(major_radius=0.9, minor_radius=0.1, major_segments=96, location=(0, sign * (width / 2 - 0.06), 0), rotation=(math.pi / 2, 0, 0))
        bpy.ops.object.shade_smooth()
        finish(bpy.context.object, "rubber")
    blocks = 30
    for i in range(blocks):
        if i in (5, 6, 7):  # the chunk that is missing
            continue
        a = TAU * i / blocks
        for y in (-0.13, 0.13):
            box((1.0 * math.cos(a), y, 1.0 * math.sin(a)), (0.15, 0.2, 0.09), "rubber", 0.012, (0, -a + math.pi / 2, 0))
    # Rim: stepped lip, dished face, five split spokes, hub and lugs.
    rod((0, front - 0.02, 0), (0, front + 0.06, 0), 0.66, "steel", 96)
    rod((0, front - 0.03, 0), (0, front + 0.02, 0), 0.6, "hull", 96)
    rod((0, front - 0.035, 0), (0, front, 0), 0.5, "panel", 96)
    for j in range(5):
        a = TAU * j / 5 + 0.3
        for off in (-0.07, 0.07):
            mid = 0.34
            x, z = mid * math.cos(a) - off * math.sin(a), mid * math.sin(a) + off * math.cos(a)
            box((x, front - 0.05, z), (0.42, 0.05, 0.055), "steel", 0.012, (0, -a, 0))
    rod((0, front - 0.09, 0), (0, front - 0.03, 0), 0.19, "hull", 48)
    rod((0, front - 0.11, 0), (0, front - 0.09, 0), 0.1, "steel", 32)
    for j in range(5):
        a = TAU * j / 5
        rod((0.14 * math.cos(a), front - 0.105, 0.14 * math.sin(a)), (0.14 * math.cos(a), front - 0.08, 0.14 * math.sin(a)), 0.026, "steel", 6)
    # Light: the rim ring is broken where the tyre is, and leaks fuchsia there.
    gap_a, gap_b = TAU * 4.6 / blocks, TAU * 8.4 / blocks
    arc((0, front - 0.035, 0), 0.63, "y", "teal", 0.016, gap_b, gap_a + TAU)
    arc((0, front - 0.035, 0), 0.63, "y", "fuchsia", 0.016, gap_a + 0.12, gap_a + 0.3)
    arc((0, front - 0.035, 0), 0.63, "y", "fuchsia", 0.016, gap_b - 0.34, gap_b - 0.2)
    arc((0, front - 0.1, 0), 0.115, "y", "teal", 0.008)
    arc((0, -width / 2 - 0.012, 0), 0.83, "y", "teal_dim", 0.007, gap_b + 0.3, gap_a + TAU - 0.3)
    crack = [(0.74, front - 0.06, 0.52), (0.82, front - 0.05, 0.66), (0.78, front - 0.03, 0.77), (0.88, front, 0.9)]
    tube([Vector(p) for p in crack], "fuchsia", 0.011)


def engine_block(origin=(0, 0, 0), scale=1.0):
    """Single-cylinder pull-start engine. Reused, smaller, on the mower."""
    o = Vector(origin)

    def at(p):
        return o + Vector(p) * scale

    def s(*dims):
        return tuple(d * scale for d in dims)

    box(at((0, 0, 0.04)), s(1.5, 1.05, 0.08), "steel", 0.02 * scale)
    for x in (-0.62, 0.62):
        for y in (-0.4, 0.4):
            rod(at((x, y, 0.08)), at((x, y, 0.13)), 0.05 * scale, "hull", 6)
    box(at((0, 0, 0.5)), s(1.1, 0.9, 0.84), "hull", 0.08 * scale)
    box(at((0, -0.455, 0.2)), s(1.0, 0.012, 0.022), "teal", 0)
    box(at((0.555, 0, 0.2)), s(0.012, 0.8, 0.022), "teal", 0)
    # Cylinder with cooling fins, lit from inside.
    rod(at((-0.12, 0, 0.9)), at((-0.12, 0, 1.52)), 0.27 * scale, "panel", 48)
    rod(at((-0.12, 0, 0.94)), at((-0.12, 0, 1.5)), 0.3 * scale, "teal_dim", 48, 0)
    for i in range(10):
        box(at((-0.12, 0, 0.95 + i * 0.06)), s(0.84, 0.84, 0.026), "steel", 0.008 * scale)
    box(at((-0.12, 0, 1.6)), s(0.72, 0.72, 0.14), "hull", 0.03 * scale)
    for x in (-0.38, 0.14):
        for y in (-0.26, 0.26):
            rod(at((x, y, 1.66)), at((x, y, 1.71)), 0.045 * scale, "steel", 6)
    rod(at((-0.12, 0, 1.66)), at((-0.12, 0, 1.8)), 0.07 * scale, "steel", 6)
    rod(at((-0.12, 0, 1.8)), at((-0.12, 0, 1.95)), 0.045 * scale, "white", 16)
    rod(at((-0.12, 0, 1.95)), at((-0.12, 0, 2.0)), 0.03 * scale, "fuchsia", 12)
    tube([at(p) for p in [(-0.12, 0, 1.98), (-0.3, -0.2, 2.02), (-0.5, -0.42, 1.6), (-0.52, -0.47, 0.95)]], "fuchsia_dim", 0.012 * scale)
    # Recoil starter housing on the front face.
    rod(at((0.05, -0.45, 0.52)), at((0.05, -0.6, 0.52)), 0.4 * scale, "panel", 64)
    rod(at((0.05, -0.6, 0.52)), at((0.05, -0.64, 0.52)), 0.3 * scale, "hull", 64)
    for j in range(12):
        a = TAU * j / 12
        box(at((0.05 + 0.2 * math.cos(a), -0.645, 0.52 + 0.2 * math.sin(a))), s(0.11, 0.012, 0.028), "teal_dim", 0, (0, -a, 0))
    rod(at((0.05, -0.64, 0.52)), at((0.05, -0.69, 0.52)), 0.09 * scale, "steel", 32)
    arc(at((0.05, -0.61, 0.52)), 0.35 * scale, "y", "teal", 0.014 * scale)
    rod(at((0.42, -0.62, 0.86)), at((0.62, -0.62, 0.86)), 0.045 * scale, "rubber", 16)
    for x in (0.42, 0.62):
        arc(at((x, -0.62, 0.86)), 0.047 * scale, "x", "fuchsia", 0.008 * scale)
    # Fuel tank with a level strip.
    box(at((0.62, 0, 1.18)), s(0.62, 0.86, 0.42), "panel", 0.12 * scale)
    rod(at((0.62, 0.12, 1.39)), at((0.62, 0.12, 1.46)), 0.11 * scale, "steel", 24)
    box(at((0.62, -0.435, 1.14)), s(0.34, 0.012, 0.03), "teal", 0)
    box(at((0.52, -0.435, 1.22)), s(0.14, 0.012, 0.03), "teal_dim", 0)
    # Air filter and carburettor.
    box(at((-0.68, 0, 0.72)), s(0.2, 0.3, 0.24), "steel", 0.03 * scale)
    rod(at((-0.78, 0, 0.72)), at((-1.12, 0, 0.72)), 0.24 * scale, "panel", 48)
    for i in range(4):
        arc(at((-0.84 - i * 0.07, 0, 0.72)), 0.245 * scale, "x", "teal_dim", 0.007 * scale)
    # Exhaust and muffler.
    rod(at((0.5, -0.2, 0.62)), at((0.86, -0.2, 0.62)), 0.07 * scale, "steel", 24)
    box(at((0.98, -0.1, 0.62)), s(0.24, 0.62, 0.34), "steel", 0.05 * scale)
    for i in range(5):
        box(at((1.105, -0.3 + i * 0.1, 0.62)), s(0.012, 0.045, 0.2), "fuchsia_dim", 0)


def engine_small():
    engine_block()


def push_mower():
    box((0, 0, 0.36), (1.9, 1.3, 0.2), "hull", 0.1)
    box((0, 0, 0.22), (2.02, 1.42, 0.14), "panel", 0.05)
    box((0.2, 0, 0.47), (1.1, 0.9, 0.06), "panel", 0.03)
    tube([Vector(p) for p in [(-1.0, -0.715, 0.2), (1.0, -0.715, 0.2)]], "teal", 0.014)
    tube([Vector(p) for p in [(1.015, -0.7, 0.2), (1.015, 0.7, 0.2)]], "teal", 0.014)
    box((0.25, -0.78, 0.3), (0.52, 0.24, 0.16), "panel", 0.03)
    box((0.25, -0.905, 0.3), (0.4, 0.012, 0.03), "fuchsia_dim", 0)
    for x in (-0.72, 0.72):
        for side in (-1, 1):
            small_wheel((x, side * 0.8, 0.28), 0.28, 0.16, side)
        rod((x, -0.72, 0.28), (x, 0.72, 0.28), 0.03, "steel", 12)
    engine_block((0.22, 0.02, 0.48), 0.5)
    # Handle: two rails, a lower brace, a grip and a bail lever.
    top = {}
    for side in (-1, 1):
        y = side * 0.5
        rod((-0.82, y, 0.42), (-0.98, y, 0.62), 0.036, "steel", 16)
        rod((-0.98, y, 0.62), (-2.05, y, 1.78), 0.032, "steel", 16)
        box((-0.88, y, 0.46), (0.16, 0.1, 0.14), "hull", 0.02)
        top[side] = (-2.05, y, 1.78)
    rod(top[-1], top[1], 0.032, "steel", 16)
    rod((-2.05, -0.3, 1.78), (-2.05, 0.3, 1.78), 0.05, "rubber", 24)
    for y in (-0.3, 0.3):
        arc((-2.05, y, 1.78), 0.052, "y", "fuchsia", 0.012)
    rod((-1.5, -0.5, 1.185), (-1.5, 0.5, 1.185), 0.024, "steel", 12)
    tube([Vector(p) for p in [(-1.93, -0.44, 1.65), (-1.86, -0.44, 1.86), (-1.86, 0.44, 1.86), (-1.93, 0.44, 1.65)]], "teal", 0.012)
    tube([Vector(p) for p in [(-1.9, 0.44, 1.7), (-1.2, 0.47, 0.9), (-0.4, 0.42, 0.52), (0.0, 0.3, 0.6)]], "teal_dim", 0.01)


# ── Scene ──────────────────────────────────────────────────────────────────


def oval(a, b, n=160):
    return [Vector((a * math.cos(TAU * i / n), b * math.sin(TAU * i / n), 0)) for i in range(n)]


def ribbon(inner, outer, z, mat):
    bm = bmesh.new()
    vi = [bm.verts.new((p.x, p.y, z)) for p in inner]
    vo = [bm.verts.new((p.x, p.y, z)) for p in outer]
    n = len(vi)
    for i in range(n):
        bm.faces.new((vi[i], vo[i], vo[(i + 1) % n], vi[(i + 1) % n]))
    mesh = bpy.data.meshes.new("Track")
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new("Track", mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(M[mat])
    return obj


def tree(x, y, h=1.5):
    rod((x, y, 0), (x, y, h * 0.35), 0.06, "panel", 6)
    for i, r in enumerate((0.55, 0.42, 0.28)):
        bpy.ops.mesh.primitive_cone_add(vertices=7, radius1=r, depth=h * 0.38, location=(x, y, h * (0.45 + i * 0.22)))
        cone = finish(bpy.context.object, "hull")
        wire(cone, "teal_dim", 0.012)


def backyard_derby():
    box((0, 0, -0.05), (30, 20, 0.1), "ground", 0)
    for i in range(-14, 15):
        tube([Vector((i, -9, 0.003)), Vector((i, 9, 0.003))], "grid", 0.005 if i % 4 else 0.011)
    for j in range(-9, 10):
        tube([Vector((-14, j, 0.003)), Vector((14, j, 0.003))], "grid", 0.005 if j % 4 else 0.011)
    inner, outer = oval(3.3, 1.5), oval(4.5, 2.6)
    ribbon(inner, outer, 0.02, "track")
    tube([p + Vector((0, 0, 0.04)) for p in outer] + [outer[0]], "teal", 0.03, cyclic=True)
    tube([p + Vector((0, 0, 0.04)) for p in inner] + [inner[0]], "fuchsia", 0.026, cyclic=True)
    mid = oval(3.9, 2.05, 64)
    for i in range(0, 64, 2):
        tube([mid[i] + Vector((0, 0, 0.03)), mid[i + 1] + Vector((0, 0, 0.03))], "white", 0.008)
    for k in range(6):
        box((0.05 if k % 2 else -0.05, -1.6 - k * 0.17, 0.03), (0.1, 0.16, 0.012), "white", 0)
        box((-0.05 if k % 2 else 0.05, -1.6 - k * 0.17, 0.03), (0.1, 0.16, 0.012), "hull", 0)
    # Three mowers on the back stretch.
    for (x, y, glow) in ((1.6, -1.95, "fuchsia"), (0.8, -2.2, "teal"), (2.4, -1.5, "white")):
        box((x, y, 0.1), (0.34, 0.2, 0.1), "hull", 0.02)
        box((x - 0.02, y, 0.18), (0.14, 0.12, 0.08), "panel", 0.015)
        tube([Vector((x - 0.17, y - 0.1, 0.06)), Vector((x + 0.17, y - 0.1, 0.06))], glow, 0.012)
        tube([Vector((x - 0.17, y, 0.14)), Vector((x - 0.4, y, 0.36))], glow, 0.006)
    # Infield: birdbath, tyre stack, a tree.
    rod((0, 0, 0), (0, 0, 0.42), 0.07, "steel", 16)
    rod((0, 0, 0.42), (0, 0, 0.5), 0.3, "panel", 32)
    arc((0, 0, 0.51), 0.27, "z", "teal", 0.014)
    for i in range(4):
        bpy.ops.mesh.primitive_torus_add(major_radius=0.2, minor_radius=0.075, location=(-1.6, 0.3, 0.075 + i * 0.14))
        bpy.ops.object.shade_smooth()
        finish(bpy.context.object, "rubber")
        arc((-1.6, 0.3, 0.075 + i * 0.14), 0.275, "z", "fuchsia_dim", 0.006)
    tree(1.7, 0.2, 1.3)
    # The Hendersons' house, shed and fence along the back.
    house = box((-3.6, 5.0, 0.8), (3.4, 2.0, 1.6), "hull", 0)
    wire(house, "teal_dim", 0.016)
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=2.3, depth=1.0, location=(-3.6, 5.0, 2.1), rotation=(0, 0, math.pi / 4))
    roof = finish(bpy.context.object, "panel")
    roof.scale = (1.0, 0.66, 1)
    wire(roof, "teal_dim", 0.016)
    for x in (-4.7, -3.9, -2.6):
        box((x, 3.99, 0.95), (0.5, 0.02, 0.55), "fuchsia_dim", 0)
    box((-3.2, 3.99, 0.5), (0.45, 0.02, 1.0), "panel", 0)
    shed = box((3.9, 4.6, 0.55), (1.5, 1.2, 1.1), "hull", 0)
    wire(shed, "teal_dim", 0.014)
    for i in range(-13, 14):
        rod((i * 0.9, 3.5, 0), (i * 0.9, 3.5, 0.5), 0.035, "panel", 6)
    tube([Vector((-12, 3.5, 0.46)), Vector((12, 3.5, 0.46))], "fuchsia", 0.014)
    tube([Vector((-12, 3.5, 0.24)), Vector((12, 3.5, 0.24))], "fuchsia_dim", 0.01)
    for (x, y, h) in ((-6.6, 1.5, 1.7), (6.3, 2.2, 1.9), (6.9, -1.4, 1.5), (-6.2, -2.2, 1.4), (0.8, 5.6, 2.0), (-7.4, 5.2, 1.8)):
        tree(x, y, h)


# ── Staging ────────────────────────────────────────────────────────────────


def setup_render(width, height, transparent):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples = 96
    scene.cycles.use_denoising = True
    scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = width, height, 100
    scene.render.film_transparent = transparent
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    world = scene.world or bpy.data.worlds.new("World")
    scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs[0].default_value = (0.004, 0.006, 0.012, 1)
    world.node_tree.nodes["Background"].inputs[1].default_value = 1.0
    return scene


def light(center, offset, power, color, size):
    bpy.ops.object.light_add(type="AREA", location=center + Vector(offset))
    lamp = bpy.context.object
    lamp.rotation_euler = (center - lamp.location).to_track_quat("-Z", "Y").to_euler()
    lamp.data.energy, lamp.data.color, lamp.data.shape, lamp.data.size = power, color, "DISK", size


def stage_object(width, height):
    scene = setup_render(width, height, True)
    graph = bpy.context.evaluated_depsgraph_get()
    corners = []
    for obj in scene.objects:
        if obj.type in {"MESH", "CURVE"}:
            corners.extend(obj.matrix_world @ Vector(c) for c in obj.evaluated_get(graph).bound_box)
    low = Vector([min(v[i] for v in corners) for i in range(3)])
    high = Vector([max(v[i] for v in corners) for i in range(3)])
    center = (low + high) / 2
    bpy.ops.object.camera_add(location=center + Vector((4.4, -6, 3.6)))
    cam = bpy.context.object
    cam.rotation_euler = (center - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam.data.type = "ORTHO"
    inv = cam.rotation_euler.to_matrix().transposed()
    projected = [inv @ (v - center) for v in corners]
    spans = [max(v[i] for v in projected) - min(v[i] for v in projected) for i in (0, 1)]
    mids = Vector([(max(v[i] for v in projected) + min(v[i] for v in projected)) / 2 for i in (0, 1)] + [0])
    cam.location += cam.rotation_euler.to_matrix() @ mids
    cam.data.ortho_scale = 1.16 * max(spans[0], spans[1] * width / height)
    scene.camera = cam
    size = max(high - low)
    # Cool key from upper left, fuchsia rim from behind, a low neutral fill.
    light(center, Vector((-3, -4, 6)) * size / 2, 520 * size * size / 4, (0.75, 0.92, 1.0), 4)
    light(center, Vector((4, 4, 3)) * size / 2, 190 * size * size / 4, (1.0, 0.35, 0.8), 3)
    light(center, Vector((4, -5, 1)) * size / 2, 110 * size * size / 4, (0.8, 0.9, 1.0), 5)


def stage_scene(width, height):
    scene = setup_render(width, height, False)
    bpy.ops.object.camera_add(location=(0.4, -9.2, 6.6))
    cam = bpy.context.object
    cam.rotation_euler = (Vector((0.2, 0.9, 0)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam.data.lens = 34
    scene.camera = cam
    light(Vector((0, 0, 0)), (-6, -6, 9), 700, (0.7, 0.9, 1.0), 8)
    light(Vector((0, 4, 0)), (6, 6, 5), 260, (1.0, 0.35, 0.8), 6)


def render(name, build, size, scene=False):
    if SELECTED and name not in SELECTED:
        return
    bpy.ops.wm.read_factory_settings(use_empty=True)
    M.clear()
    M.update(palette())
    build()
    bpy.context.view_layer.update()
    (stage_scene if scene else stage_object)(*size)
    bpy.context.scene.render.filepath = str(OUTPUT / (name + ".png"))
    bpy.ops.render.render(write_still=True)


render("wheel_busted", wheel_busted, (512, 512))
render("engine_small", engine_small, (512, 512))
render("push_mower", push_mower, (768, 512))
render("backyard_derby", backyard_derby, (1024, 576), scene=True)
