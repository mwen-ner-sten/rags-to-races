"""Render the Roadbook Special garage sprite with Blender --background --python."""
import math
from pathlib import Path

import bpy
from mathutils import Vector

OUTPUT = Path(__file__).resolve().parents[1] / "public/sprites/vehicles/roadbook_special.webp"


def enamel(name, color, roughness=.36, metallic=0):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*color, 1)
    if material.node_tree is None:
        material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Metallic"].default_value = metallic
    shader.inputs["Roughness"].default_value = roughness
    return material


def finish(obj, material, radius):
    obj.data.materials.append(material)
    if radius:
        bevel = obj.modifiers.new("Rolled edges", "BEVEL")
        bevel.width, bevel.segments = radius, 3
        obj.modifiers.new("Panel normals", "WEIGHTED_NORMAL")
    return obj


def box(name, center, size, material, radius=.027):
    bpy.ops.mesh.primitive_cube_add(size=1, location=center)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, material, radius)


def tube(name, start, end, radius, material, segments=32):
    start, end = Vector(start), Vector(end)
    axis = end - start
    bpy.ops.mesh.primitive_cylinder_add(vertices=segments, radius=radius, depth=axis.length, location=(start + end) / 2)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = axis.to_track_quat("Z", "Y").to_euler()
    return finish(obj, material, min(.025, radius / 7))


def mesh(name, points, faces, material, radius=0):
    data = bpy.data.meshes.new(name)
    data.from_pydata(points, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    return finish(obj, material, radius)


def body(cream, rubber):
    sections = [(-2.23, .79, 1.13), (-1.86, .90, 1.25), (-.92, .94, 1.36),
                (.73, .94, 1.36), (1.77, .88, 1.28), (2.28, .82, 1.20)]
    points = [(x, side * width * ratio, z)
              for x, width, top in sections
              for side, ratio, z in [(-1, .90, .52), (1, .90, .52), (1, 1, top - .10), (-1, 1, top - .10),
                                     (-1, .87, top), (1, .87, top)]]
    # Each cross-section follows the lower sill up around the roof of the body shell.
    boundary = [0, 1, 2, 5, 4, 3]
    faces = [tuple(reversed(boundary)), tuple(30 + i for i in boundary)]
    for station in range(len(sections) - 1):
        a, b = station * 6, (station + 1) * 6
        faces.extend((a + i, a + j, b + j, b + i) for i, j in zip(boundary, boundary[1:] + boundary[:1]))
    shell = mesh("Pressed steel shell", points, faces, cream)
    for axle in (-1.40, 1.44):
        cutter = tube("Wheel arch cutter", (axle, -1.7, .49), (axle, 1.7, .49), .585, rubber, 48)
        cutter.modifiers.clear()
        cut = shell.modifiers.new("Wheel opening", "BOOLEAN")
        cut.operation, cut.object = "DIFFERENCE", cutter
        bpy.context.view_layer.objects.active = shell
        bpy.ops.object.modifier_apply(modifier=cut.name)
        bpy.data.objects.remove(cutter, do_unlink=True)
    bevel = shell.modifiers.new("Folded steel", "BEVEL")
    bevel.width, bevel.segments = .024, 3
    shell.modifiers.new("Steel panel normals", "WEIGHTED_NORMAL")


def build():
    cream = enamel("Ivory enamel", (.73, .63, .43), .34, .12)
    terracotta = enamel("Burnt vermilion", (.47, .046, .018), .38, .16)
    teal = enamel("Deep petrol enamel", (.022, .12, .14), .4, .15)
    rubber = enamel("Rally rubber", (.025, .029, .031), .72)
    steel = enamel("Satin alloy", (.42, .42, .36), .32, .59)
    smoked = enamel("Smoked slate windscreens", (.045, .083, .105), .23, .18)
    lens = enamel("Lamp reflector", (.92, .75, .44), .25, .1)
    amber = enamel("Tripmeter amber", (1, .36, .036), .32)
    charcoal = enamel("Grille and trim", (.017, .023, .022), .56)
    body(cream, rubber)
    for axle in (-1.40, 1.44):
        for side in (-1, 1):
            tube("Rally tire", (axle, side * .69, .49), (axle, side * 1.045, .49), .49, rubber, 56)
            tube("Rim", (axle, side * 1.045, .49), (axle, side * 1.077, .49), .322, steel)
            tube("Hub", (axle, side * 1.08, .49), (axle, side * 1.095, .49), .115, charcoal)
            for spoke in range(5):
                angle = spoke * math.tau / 5
                x, z = axle + .22 * math.cos(angle), .49 + .22 * math.sin(angle)
                tube("Rim opening", (x, side * 1.075, z), (x, side * 1.089, z), .054, charcoal, 12)
            for notch in range(16):
                angle = notch * math.tau / 16
                x, z = axle + .482 * math.cos(angle), .49 + .482 * math.sin(angle)
                tread = box("Tread block", (x, side * .985, z), (.038, .14, .08), charcoal, .007)
                tread.rotation_euler.y = -angle

    bottom = [(-1.31, -.80, 1.29), (.87, -.80, 1.36), (.87, .80, 1.36), (-1.31, .80, 1.29)]
    top = [(-.94, -.65, 2.01), (.20, -.65, 2.01), (.20, .65, 2.01), (-.94, .65, 2.01)]
    mesh("Cabin and glass", bottom + top, [(0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7), (4, 5, 6, 7)], smoked)
    box("Ivory roof", (-.36, 0, 2.025), (1.23, 1.37, .09), cream, .045)
    box("Vermilion roof stripe", (-.36, -.25, 2.073), (1.08, .26, .012), terracotta, .006)
    for index in range(4):
        tube("Window pillar", bottom[index], top[index], .047, cream)
        following = (index + 1) % 4
        tube("Sill trim", bottom[index], bottom[following], .032, charcoal)
    for side in (-1, 1):
        tube("Door pillar", (-.30, .81 * side, 1.33), (-.38, .66 * side, 2.005), .045, cream)
        box("Door stripe", (-.1, side * .933, .83), (1.93, .019, .23), teal)
        box("Warm pinstripe", (-.1, side * .945, .97), (1.93, .014, .045), terracotta)
        box("Door rally plate", (-.18, side * .956, 1.078), (.66, .019, .31), terracotta)
        box("Mirror pod", (.60, side * .88, 1.51), (.23, .25, .108), charcoal, .036)
        box("Door pull", (-.61, side * .953, 1.204), (.17, .026, .04), steel)

    bpy.ops.object.text_add(location=(-.18, -.969, 1.075), rotation=(math.pi / 2, 0, 0))
    plate = bpy.context.object
    plate.data.body, plate.data.align_x, plate.data.align_y = "07", "CENTER", "CENTER"
    plate.data.size, plate.data.extrude = .253, .0025
    plate.data.materials.append(lens)

    mesh("Bonnet stripe", [(.79, -.47, 1.359), (2.25, -.47, 1.207), (2.25, -.20, 1.207), (.79, -.20, 1.359)],
         [(0, 1, 2, 3)], terracotta)
    box("Rally grille", (2.288, 0, .977), (.09, 1.56, .31), charcoal, .033)
    box("Front bumper", (2.34, 0, .66), (.19, 1.75, .13), teal, .03)
    for side in (-1, 1):
        box("Corner headlamp", (2.34, side * .65, 1.03), (.088, .24, .16), lens)
        box("Amber marker", (2.39, side * .68, .67), (.042, .15, .062), amber)
        box("Rear mud flap", (-1.96, side * .912, .315), (.058, .32, .54), terracotta)
        box("Taillight", (-2.242, side * .52, .97), (.06, .27, .16), terracotta)
    for y in (-.42, -.14, .14, .42):
        tube("Lamp housing", (2.33, y, .92), (2.47, y, .92), .138, teal)
        tube("Lamp rim", (2.46, y, .92), (2.505, y, .92), .133, steel)
        tube("Lamp glass", (2.50, y, .92), (2.516, y, .92), .113, lens)
    box("Tripmeter cowl", (.75, .31, 1.375), (.22, .32, .12), charcoal)
    box("Tripmeter display", (.836, .31, 1.435), (.07, .227, .024), amber, .012)
    tube("Timing aerial", (-.77, .42, 2.068), (-1.0, .43, 2.48), .022, steel)


def render():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    build()
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.samples, scene.cycles.use_denoising = 24, True
    scene.render.resolution_x, scene.render.resolution_y = 384, 256
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "WEBP"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.quality = 95
    scene.view_settings.view_transform = "AgX"
    scene.world = bpy.data.worlds.new("Workshop ambient")
    if scene.world.node_tree is None:
        scene.world.use_nodes = True
    scene.world.node_tree.nodes.get("Background").inputs["Strength"].default_value = .36

    focus = Vector((.04, 0, 1.19))
    bpy.ops.object.camera_add(location=(6.6, -8.5, 4.55))
    camera = bpy.context.object
    camera.rotation_euler = (focus - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.data.type, camera.data.ortho_scale = "ORTHO", 5.65
    scene.camera = camera
    for where, intensity, size in (((1, -4, 7), 950, 4.5), ((5, 2, 4), 520, 3.4), ((-4, 2, 4), 750, 3.2)):
        bpy.ops.object.light_add(type="AREA", location=where)
        light = bpy.context.object
        light.rotation_euler = (focus - light.location).to_track_quat("-Z", "Y").to_euler()
        light.data.energy, light.data.size = intensity, size
    scene.render.filepath = str(OUTPUT)
    bpy.ops.render.render(write_still=True)


if __name__ == "__main__":
    render()
