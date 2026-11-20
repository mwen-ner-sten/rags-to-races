"""Midnight Circuit art kit: the one place sprite looks are defined.

Every sprite in public/sprites is modelled by a script in scripts/art/ that
imports this module. The kit owns materials, lights, cameras and render
settings, so a new sprite inherits the house look instead of inventing one.
See docs/art/art-bible.md for the rules this encodes.

Run a category script with:
    blender --background --factory-startup --python scripts/art/<script>.py -- [name ...]
Raw renders land in .tmp/art/raw/<category>/<name>.png; then run
    python scripts/art/finish.py
to add the glow pass, crop, size and write the WebP into public/sprites.
"""
from __future__ import annotations

import math
import random
import sys
import zlib
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / ".tmp" / "art" / "raw"
TAU = math.tau

# ── Palette ────────────────────────────────────────────────────────────────
# Light colours. These are the only saturated hues allowed in a sprite.
TEAL = (0.0, 0.82, 1.0)
FUCHSIA = (1.0, 0.08, 0.58)
ICE = (0.78, 0.93, 1.0)  # cool white for lamps, headlights, number boards

# Surface colours: real materials, pushed dark and cool so the lights carry
# the colour. Linear RGB.
SURFACES = {
    #  name        base colour               metal rough  wear
    "steel":     ((0.10, 0.11, 0.125),        0.9, 0.34, 0.35),
    "cast":      ((0.07, 0.075, 0.085),       0.7, 0.58, 0.45),
    "alloy":     ((0.32, 0.35, 0.39),         1.0, 0.26, 0.25),
    "chrome":    ((0.55, 0.6, 0.66),          1.0, 0.12, 0.15),
    "rubber":    ((0.014, 0.014, 0.017),      0.0, 0.78, 0.25),
    "plastic":   ((0.03, 0.033, 0.042),       0.0, 0.48, 0.2),
    "enamel":    ((0.035, 0.05, 0.075),       0.3, 0.38, 0.45),  # dark navy paint
    "oxblood":   ((0.07, 0.018, 0.03),        0.3, 0.42, 0.5),   # dark red paint
    "rust":      ((0.055, 0.03, 0.022),       0.2, 0.85, 0.6),
    "wood":      ((0.045, 0.032, 0.025),      0.0, 0.8, 0.5),
    "canvas":    ((0.035, 0.035, 0.04),       0.0, 0.9, 0.3),
    "glass":     ((0.02, 0.03, 0.04),         0.0, 0.05, 0.0),
    "dirt":      ((0.05, 0.036, 0.028),       0.0, 0.95, 0.7),
    "grass":     ((0.008, 0.016, 0.014),      0.0, 0.95, 0.9),
    "asphalt":   ((0.022, 0.024, 0.03),       0.0, 0.82, 0.4),
    "concrete":  ((0.05, 0.055, 0.062),       0.0, 0.85, 0.4),
    "foliage":   ((0.008, 0.02, 0.022),       0.0, 0.85, 0.5),
    "water":     ((0.004, 0.01, 0.016),       0.0, 0.08, 0.0),
}

LIGHTS = {
    #  name           colour   strength
    "teal":         (TEAL, 14.0),
    "teal_dim":     (TEAL, 3.0),
    "fuchsia":      (FUCHSIA, 14.0),
    "fuchsia_dim":  (FUCHSIA, 3.5),
    "ice":          (ICE, 25.0),
    "ice_dim":      (ICE, 2.5),
    # Soft: windows, screens and sign panels that should keep their hue
    # instead of blooming to white.
    "teal_soft":    (TEAL, 0.8),
    "fuchsia_soft": (FUCHSIA, 0.8),
    "ice_soft":     (ICE, 0.8),
}

_CACHE: dict[str, bpy.types.Material] = {}


def args() -> set[str]:
    """Sprite names passed after `--`; empty means render everything."""
    return set(sys.argv[sys.argv.index("--") + 1:]) if "--" in sys.argv else set()


def reset(seed: int = 1) -> None:
    """Empty scene with the house render settings."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    _CACHE.clear()
    random.seed(seed)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    _use_gpu(scene)
    scene.cycles.samples = 96
    scene.cycles.use_denoising = True
    scene.cycles.max_bounces = 6
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.view_settings.view_transform = "AgX"
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass
    world = bpy.data.worlds.new("Night")
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.003, 0.004, 0.009, 1)
    bg.inputs[1].default_value = 1.0


def _use_gpu(scene) -> None:
    prefs = bpy.context.preferences.addons["cycles"].preferences
    for backend in ("OPTIX", "CUDA"):
        try:
            prefs.compute_device_type = backend
            prefs.get_devices()
            devices = [d for d in prefs.devices if d.type == backend]
            if devices:
                for d in prefs.devices:
                    d.use = d.type == backend
                scene.cycles.device = "GPU"
                return
        except TypeError:
            continue
    scene.cycles.device = "CPU"


# ── Materials ──────────────────────────────────────────────────────────────


def mat(name: str, tint: tuple[float, float, float] | None = None) -> bpy.types.Material:
    """A house material by name: a SURFACES entry, a LIGHTS entry, or
    "paint:<r>,<g>,<b>" is not allowed - use `tint` on "enamel" instead so
    paint stays dark. `tint` multiplies the base colour of a surface."""
    key = name if tint is None else f"{name}:{tint}"
    if key in _CACHE:
        return _CACHE[key]
    if name in LIGHTS:
        colour, strength = LIGHTS[name]
        m = _emissive(key, colour, strength)
    elif name in SURFACES:
        base, metal, rough, wear = SURFACES[name]
        if tint is not None:
            base = tuple(min(b * t, 0.12) for b, t in zip(base, tint))
        m = _surface(key, base, metal, rough, wear)
    else:
        raise KeyError(f"Unknown house material {name!r}; add it to SURFACES or LIGHTS in kit.py")
    _CACHE[key] = m
    return m


def _surface(name, base, metal, rough, wear):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    bsdf.inputs["Metallic"].default_value = metal
    if name.startswith("glass"):
        bsdf.inputs["Transmission Weight"].default_value = 0.6
    # Wear: low-frequency noise drives roughness and a slight colour shift, so
    # surfaces read as used objects rather than plastic toys.
    coord = nt.nodes.new("ShaderNodeTexCoord")
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = 6.0
    noise.inputs["Detail"].default_value = 8.0
    noise.inputs["Roughness"].default_value = 0.6
    nt.links.new(coord.outputs["Object"], noise.inputs["Vector"])
    ramp = nt.nodes.new("ShaderNodeValToRGB")
    ramp.color_ramp.elements[0].position = 0.35
    ramp.color_ramp.elements[1].position = 0.75
    nt.links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.inputs["A"].default_value = (*base, 1)
    worn = tuple(c * (1 - 0.45 * wear) for c in base)
    mix.inputs["B"].default_value = (*worn, 1)
    nt.links.new(ramp.outputs["Color"], mix.inputs["Factor"])
    nt.links.new(mix.outputs["Result"], bsdf.inputs["Base Color"])
    rmap = nt.nodes.new("ShaderNodeMapRange")
    rmap.inputs["To Min"].default_value = rough
    rmap.inputs["To Max"].default_value = min(1.0, rough + 0.3 * wear)
    nt.links.new(ramp.outputs["Color"], rmap.inputs["Value"])
    nt.links.new(rmap.outputs["Result"], bsdf.inputs["Roughness"])
    # Fine bump for machined or cast texture.
    bump = nt.nodes.new("ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.08 + 0.15 * wear
    fine = nt.nodes.new("ShaderNodeTexNoise")
    fine.inputs["Scale"].default_value = 60.0
    nt.links.new(coord.outputs["Object"], fine.inputs["Vector"])
    nt.links.new(fine.outputs["Fac"], bump.inputs["Height"])
    nt.links.new(bump.outputs["Normal"], bsdf.inputs["Normal"])
    return m


def _emissive(name, colour, strength):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (0, 0, 0, 1)
    bsdf.inputs["Emission Color"].default_value = (*colour, 1)
    bsdf.inputs["Emission Strength"].default_value = strength
    return m


# ── Geometry helpers ───────────────────────────────────────────────────────


def _link(obj):
    if obj.name not in bpy.context.collection.objects:
        bpy.context.collection.objects.link(obj)
    return obj


def apply(obj, material, bevel: float = 0.0, smooth: bool = False):
    obj.data.materials.clear()
    obj.data.materials.append(mat(material) if isinstance(material, str) else material)
    if bevel:
        mod = obj.modifiers.new("Bevel", "BEVEL")
        mod.width, mod.segments, mod.limit_method = bevel, 3, "ANGLE"
        obj.modifiers.new("Weighted normals", "WEIGHTED_NORMAL")
    if smooth:
        for poly in obj.data.polygons:
            poly.use_smooth = True
    return obj


def box(pos, dims, material, bevel=0.02, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos, rotation=rot)
    obj = bpy.context.object
    obj.scale = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return apply(obj, material, bevel)


def rod(start, end, radius, material, vertices=32, bevel=None):
    """A cylinder between two points."""
    a, b = Vector(start), Vector(end)
    axis = b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=axis.length, location=(a + b) / 2)
    obj = bpy.context.object
    obj.rotation_mode = "QUATERNION"
    obj.rotation_quaternion = Vector((0, 0, 1)).rotation_difference(axis.normalized())
    for poly in obj.data.polygons:
        poly.use_smooth = abs(poly.normal.z) < 0.5
    return apply(obj, material, radius * 0.08 if bevel is None else bevel)


def ball(pos, radius, material, scale=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=radius, location=pos, segments=32, ring_count=16)
    obj = bpy.context.object
    obj.scale = scale
    return apply(obj, material, smooth=True)


def cone(pos, r1, r2, depth, material, vertices=32, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices, radius1=r1, radius2=r2, depth=depth, location=pos, rotation=rot)
    return apply(bpy.context.object, material, smooth=True)


def torus(pos, major, minor, material, rot=(0, 0, 0), major_segments=64):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=major_segments, location=pos, rotation=rot)
    return apply(bpy.context.object, material, smooth=True)


def tube(points, material, thickness=0.012, cyclic=False, smooth=True):
    """A round tube along points: pipes, cables, and neon light lines."""
    curve = bpy.data.curves.new("Tube", "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth, curve.bevel_resolution = thickness, 4
    curve.use_fill_caps = True
    spline = curve.splines.new("NURBS" if smooth and len(points) > 2 else "POLY")
    spline.points.add(len(points) - 1)
    for p, co in zip(spline.points, points):
        p.co = (*Vector(co), 1)
    spline.use_cyclic_u = cyclic
    spline.use_endpoint_u = not cyclic
    if spline.type == "NURBS":
        spline.order_u = 3
    obj = bpy.data.objects.new("Tube", curve)
    _link(obj)
    curve.materials.append(mat(material) if isinstance(material, str) else material)
    return obj


def arc(center, radius, axis, material, thickness=0.012, start=0.0, end=TAU, steps=96):
    """A circle or arc of tube around `axis` ("x", "y" or "z")."""
    c = Vector(center)
    pts = []
    for i in range(steps + 1):
        a = start + (end - start) * i / steps
        u, v = radius * math.cos(a), radius * math.sin(a)
        pts.append(c + {"x": Vector((0, u, v)), "y": Vector((u, 0, v)), "z": Vector((u, v, 0))}[axis])
    full = abs(end - start - TAU) < 1e-6
    return tube(pts[:-1] if full else pts, material, thickness, cyclic=full, smooth=False)


def mesh_from(verts, faces, material, name="Mesh", smooth=False):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [], faces)
    me.update()
    obj = bpy.data.objects.new(name, me)
    _link(obj)
    return apply(obj, material, smooth=smooth)


def ribbon(inner, outer, material, z=0.0, name="Ribbon"):
    """A closed band between two loops of points (track surfaces)."""
    n = len(inner)
    verts = [(p[0], p[1], z) for p in inner] + [(p[0], p[1], z) for p in outer]
    faces = [(i, n + i, n + (i + 1) % n, (i + 1) % n) for i in range(n)]
    return mesh_from(verts, faces, material, name)


def array_around(make, count, radius, axis="z", center=(0, 0, 0), phase=0.0):
    """Call make(position, angle) for `count` points on a circle."""
    c = Vector(center)
    for i in range(count):
        a = phase + TAU * i / count
        u, v = radius * math.cos(a), radius * math.sin(a)
        off = {"x": Vector((0, u, v)), "y": Vector((u, 0, v)), "z": Vector((u, v, 0))}[axis]
        make(c + off, a)


def edge_lines(obj, material="teal_dim", thickness=0.006):
    """Light the edges of an object - use on one or two key shapes, not all."""
    copy = obj.copy()
    copy.data = obj.data.copy()
    _link(copy)
    copy.modifiers.clear()
    copy.data.materials.clear()
    copy.data.materials.append(mat(material))
    mod = copy.modifiers.new("Edge lines", "WIREFRAME")
    mod.thickness, mod.use_replace = thickness, True
    return copy


# ── Staging ────────────────────────────────────────────────────────────────

# Every object sprite is seen from the same direction: three-quarter, front
# right, from above. Scenes use their own perspective camera.
OBJECT_VIEW = Vector((4.4, -6.0, 3.6))


def _bounds(objects=None):
    graph = bpy.context.evaluated_depsgraph_get()
    pts = []
    for obj in objects or bpy.context.scene.objects:
        if obj.type not in {"MESH", "CURVE"}:
            continue
        ev = obj.evaluated_get(graph)
        pts.extend(obj.matrix_world @ Vector(c) for c in ev.bound_box)
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi, pts


def _area(name, location, target, power, colour, size):
    data = bpy.data.lights.new(name, "AREA")
    data.energy, data.color, data.size = power, colour, size
    obj = bpy.data.objects.new(name, data)
    _link(obj)
    obj.location = location
    direction = Vector(target) - Vector(location)
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
    return obj


def object_rig(width: int, height: int, view: Vector = OBJECT_VIEW, top_down: bool = False):
    """Orthographic camera fitted to the model, plus the house light rig:
    a dim cool key from front left, a teal rim from back left and a fuchsia
    rim from back right. Call after the model is built."""
    scene = bpy.context.scene
    scene.render.resolution_x, scene.render.resolution_y = width, height
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = True
    scene.view_settings.exposure = 1.3
    lo, hi, pts = _bounds()
    centre = (lo + hi) / 2
    radius = (hi - lo).length / 2
    direction = Vector((0.0, -0.001, 1.0)) if top_down else view.normalized()
    cam_data = bpy.data.cameras.new("Camera")
    cam_data.type = "ORTHO"
    cam = bpy.data.objects.new("Camera", cam_data)
    _link(cam)
    cam.location = centre + direction * radius * 6
    cam.rotation_euler = (-direction).to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam
    bpy.context.view_layer.update()
    inv = cam.matrix_world.inverted()
    local = [inv @ p for p in pts]
    xs, ys = [p.x for p in local], [p.y for p in local]
    span_x, span_y = max(xs) - min(xs), max(ys) - min(ys)
    aspect = width / height
    cam_data.ortho_scale = 1.08 * max(span_x, span_y * aspect)
    cam_data.shift_x = ((max(xs) + min(xs)) / 2) / cam_data.ortho_scale
    cam_data.shift_y = ((max(ys) + min(ys)) / 2) / cam_data.ortho_scale
    cam_data.clip_end = radius * 20
    r = max(radius, 0.1)
    p = r * r  # light power scales with the area it has to cover
    _area("Key", centre + Vector((-3.0, -4.0, 4.5)) * r, centre, 160 * p, ICE, 2.5 * r)
    _area("Teal rim", centre + Vector((-4.5, 3.5, 2.5)) * r, centre, 420 * p, TEAL, 1.6 * r)
    _area("Fuchsia rim", centre + Vector((4.5, 3.0, 1.8)) * r, centre, 320 * p, FUCHSIA, 1.6 * r)
    _area("Teal bounce", centre + Vector((1.5, -3.0, -2.5)) * r, centre, 30 * p, TEAL, 3 * r)
    return cam


def scene_rig(width: int, height: int, location, target, lens: float = 35.0, rim: float = 0.5):
    """Perspective camera for venues and places, night world, faint moonlight.
    The scene supplies its own practical lights (floodlights, signs)."""
    scene = bpy.context.scene
    scene.render.resolution_x, scene.render.resolution_y = width, height
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False
    scene.view_settings.exposure = 0.6
    cam_data = bpy.data.cameras.new("Camera")
    cam_data.lens = lens
    cam_data.clip_end = 2000
    cam = bpy.data.objects.new("Camera", cam_data)
    _link(cam)
    cam.location = location
    cam.rotation_euler = (Vector(target) - Vector(location)).to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam
    world = scene.world.node_tree.nodes["Background"]
    world.inputs[0].default_value = (0.004, 0.006, 0.014, 1)
    moon = bpy.data.lights.new("Moon", "SUN")
    moon.energy, moon.color, moon.angle = 0.35, (0.6, 0.75, 1.0), 0.05
    sun = bpy.data.objects.new("Moon", moon)
    _link(sun)
    sun.rotation_euler = (math.radians(50), 0, math.radians(-35))
    # The house rim light, as on objects: teal from back left, fuchsia from
    # back right, both shining toward the camera so every edge picks up colour.
    forward = Vector(target) - Vector(location)
    forward.z = 0
    forward.normalize()
    for name, colour, yaw, energy in (("Teal rim", TEAL, 50, rim), ("Fuchsia rim", FUCHSIA, -50, rim * 0.8)):
        data = bpy.data.lights.new(name, "SUN")
        data.energy, data.color, data.angle = energy, colour, 0.1
        obj = bpy.data.objects.new(name, data)
        _link(obj)
        heading = Matrix.Rotation(math.radians(yaw), 3, "Z") @ (-forward)
        shine = -(heading + Vector((0, 0, 0.9)))  # from behind and above, toward the camera
        obj.rotation_euler = shine.to_track_quat("-Z", "Y").to_euler()
    return cam


def flood(location, target, power=900.0, colour=ICE, spread=55.0):
    """A floodlight: a spot lamp plus a glowing head the camera can see."""
    data = bpy.data.lights.new("Flood", "SPOT")
    data.energy, data.color, data.spot_size = power, colour, math.radians(spread)
    data.spot_blend = 0.6
    data.shadow_soft_size = 0.4
    obj = bpy.data.objects.new("Flood", data)
    _link(obj)
    obj.location = location
    obj.rotation_euler = (Vector(target) - Vector(location)).to_track_quat("-Z", "Y").to_euler()
    return obj


def point(location, power, colour=ICE, radius=0.2):
    data = bpy.data.lights.new("Lamp", "POINT")
    data.energy, data.color, data.shadow_soft_size = power, colour, radius
    obj = bpy.data.objects.new("Lamp", data)
    _link(obj)
    obj.location = location
    return obj


def render(category: str, name: str, samples: int | None = None) -> Path:
    scene = bpy.context.scene
    if samples:
        scene.cycles.samples = samples
    out = RAW / category / f"{name}.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(out)
    bpy.ops.render.render(write_still=True)
    print(f"[art] wrote {out.relative_to(ROOT)}")
    return out


def run(category: str, builders: dict, size: tuple[int, int], *, top_down: bool = False, samples: int | None = None) -> None:
    """Render each object builder in `builders` (name -> function) on the
    object rig. Respects names passed after `--`."""
    wanted = args()
    for name, build in builders.items():
        if wanted and name not in wanted:
            continue
        reset(seed=zlib.crc32(name.encode()))
        build()
        object_rig(*size, top_down=top_down)
        render(category, name, samples)
