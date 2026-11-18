"""Render the point-to-point stage used by the rally race viewer in Blender."""
import json
import math
import random
from pathlib import Path

import bpy

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/sprites/circuits/forest-stage.webp"
random.seed(708)
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.world = bpy.data.worlds.new("Overcast sky")
scene.world.color = (0.45, 0.52, 0.55)
WIDTH, HEIGHT = 24, 10


def material(name, rgb):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*rgb, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*rgb, 1)
    shader.inputs["Roughness"].default_value = .85
    return mat


def position(x, y):
    return (x / 100 - 0.5) * WIDTH, (0.5 - y / 100) * HEIGHT


def box(name, x, y, z, dims, mat, rotation=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z))
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dims
    obj.rotation_euler.z = rotation
    obj.data.materials.append(mat)
    return obj


def ribbon(name, points, width, z, mat):
    vertices = []
    for i, (x, y) in enumerate(points):
        prev = points[max(0, i - 1)]
        following = points[min(i + 1, len(points) - 1)]
        angle = math.atan2(following[1] - prev[1], following[0] - prev[0])
        dx, dy = -math.sin(angle) * width / 2, math.cos(angle) * width / 2
        vertices.extend([(x - dx, y - dy, z), (x + dx, y + dy, z)])
    faces = [(i, i + 2, i + 3, i + 1) for i in range(0, len(vertices) - 2, 2)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    obj = bpy.data.objects.new(name, mesh)
    scene.collection.objects.link(obj)
    obj.data.materials.append(mat)


def distance(x, y, path):
    nearest = 1000
    for a, b in zip(path, path[1:]):
        dx, dy = b[0] - a[0], b[1] - a[1]
        f = max(0, min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (dx * dx + dy * dy)))
        nearest = min(nearest, math.hypot(x - a[0] - f * dx, y - a[1] - f * dy))
    return nearest


road = [position(*p) for p in json.loads((ROOT / "src/game/rally-course.json").read_text())]
grass = material("Field", (0.18, 0.25, 0.093))
earth = material("Road verge", (0.20, 0.125, 0.063))
gravel = material("Gravel", (0.60, 0.44, 0.26))
crop = material("Harvested stubble", (0.48, 0.39, 0.13))
water = material("Quarry stream", (0.063, 0.23, 0.25))
stone = material("Granite", (0.25, 0.28, 0.24))
tin = material("Tin roofs", (0.40, 0.13, 0.063))
cream = material("Farm sheds", (0.64, 0.53, 0.34))
trees = [material("Pine", color) for color in [(0.048, 0.14, 0.081), (0.074, 0.19, 0.089), (0.12, 0.22, 0.108)]]
box("Valley", 0, 0, -0.10, (26, 12, 0.18), grass)
for x, y, width, height in [(-10, 2, 5.6, 4), (8, -3.6, 6, 3.1)]:
    box("Stubble field", x, y, 0, (width, height, .025), crop)
    for i in range(14):
        box("Furrow", x, y - height / 2 + i * height / 14, .025, (width, .024, .025), earth)
stream = [position(x, y) for x, y in [(46,-5),(49,8),(55,16),(59,29),(60,38),(62,46),(66,60),(63,75),(59,89),(59,108)]]
ribbon("Stream bank", stream, .56, .035, earth)
ribbon("Stream", stream, .40, .04, water)
ribbon("Gravel shoulder", road, .63, .05, earth)
ribbon("Driving line", road, .46, .055, gravel)
for x, y, angle in [(-10, -.75, .22), (-8.7, -.65, .22), (8.2, -1.8, -.32)]:
    box("Shed", x, y, .23, (1.3, .70, .45), cream, angle)
    box("Roof", x, y, .49, (1.48, .84, .10), tin, angle)
for _ in range(370):
    x, y = random.uniform(-12.5, 12.5), random.uniform(-5.4, 5.4)
    if distance(x, y, road) < .58 or distance(x, y, stream) < .5 or (x < -7 and y > -1.5) or (x > 5 and y < -1.1):
        continue
    radius = random.uniform(.13, .29)
    height = radius * random.uniform(2.5, 4.4)
    bpy.ops.mesh.primitive_cone_add(vertices=7, radius1=radius, depth=height, location=(x, y, height / 2 + .035))
    obj = bpy.context.object
    obj.data.materials.append(random.choice(trees))
    obj.rotation_euler.z = random.uniform(0, math.tau)
for _ in range(75):
    x, y = random.uniform(-12, 12), random.uniform(-5, 5)
    if distance(x,y,road) > .6 and distance(x,y,stream) < .72:
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=random.uniform(.045,.14), location=(x,y,.08))
        bpy.context.object.data.materials.append(stone)
for point in [road[0], road[-1]]:
    for dy in (-.34, .34):
        box("Marshal post", point[0], point[1]+dy, .16, (.09,.10,.32), cream)
    box("Timing gantry", point[0], point[1], .34, (.12,.80,.08), tin)
bpy.ops.object.camera_add(location=(0,0,15))
camera = bpy.context.object
camera.rotation_euler = (0,0,0)
camera.data.type = "ORTHO"
camera.data.ortho_scale = WIDTH
scene.camera = camera
bpy.ops.object.light_add(type="SUN", location=(0,0,8))
bpy.context.object.rotation_euler = (.68,-.46,-.25)
bpy.context.object.data.energy = 3
bpy.context.object.data.angle = .09
scene.render.engine = "CYCLES"
scene.cycles.samples = 12
scene.cycles.use_denoising = True
scene.render.resolution_x, scene.render.resolution_y = 1152, 480
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "WEBP"
scene.render.image_settings.quality = 91
scene.render.filepath = str(OUT)
bpy.ops.render.render(write_still=True)
