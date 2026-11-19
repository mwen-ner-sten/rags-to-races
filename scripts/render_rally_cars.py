"""Transparent overhead racing pieces for the stage roadbook. The nose points to the right."""
import math
from pathlib import Path
import bpy
from mathutils import Vector

DEST = Path(__file__).resolve().parents[1] / "public/sprites/rally"
DEST.mkdir(exist_ok=True)

def enamel(name, rgb, metallic=0.1):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*rgb, 1)
    material.use_nodes = True
    surface = material.node_tree.nodes.get("Principled BSDF")
    surface.inputs["Base Color"].default_value = (*rgb, 1)
    surface.inputs["Metallic"].default_value = metallic
    surface.inputs["Roughness"].default_value = .38
    return material

tire = enamel("Soft rubber", (.02,.025,.029))
iron = enamel("Cast iron", (.105,.115,.108), .55)
chrome = enamel("Bright metal", (.55,.61,.66), .72)
gold = enamel("Harvest ochre", (.87,.38,.035))
red = enamel("Red oxide", (.63,.058,.022))
blue = enamel("Sea green", (.039,.39,.39))
white = enamel("Aged cream", (.93,.88,.67))
glass = enamel("Smoked blue glass", (.057,.105,.14), .5)

def block(x,y,z,length,width,height,mat,radius=.06):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x,y,z))
    obj=bpy.context.object
    obj.dimensions=(length,width,height)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(mat)
    mod=obj.modifiers.new("Formed edges","BEVEL")
    mod.width=radius
    mod.segments=3
    obj.modifiers.new("Normals","WEIGHTED_NORMAL")
    return obj

def helmet(x):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,radius=.21,location=(x,0,.52))
    bpy.context.object.data.materials.append(white)
    block(x+.08,0,.68,.12,.27,.038,glass,.018)

def build(name):
    small=name!="saloon"
    width=.56 if name=="kart" else .53
    for x in [-.69,.66]:
        for y in [-width,width]:
            block(x,y,.18,.52 if x<0 else .44,.25,.38,tire,.10)
            for dx in (-.12,.09):
                block(x+dx,y,.371,.026,.19,.017,iron,.003)
    if small:
        block(0,0,.24,1.65,.67,.22,iron)
        block(-.22,0,.39,.55,.51,.20,tire)
        if name=="mower":
            block(.44,0,.48,.88,.70,.34,red,.12)
            block(.5,0,.66,.54,.12,.018,cream,.014)
            for y in (-.49,.49): block(-.57,y,.38,.82,.27,.19,red)
            block(.8,0,.56,.12,.57,.13,chrome)
        else:
            for y in (-.45,.45): block(0,y,.33,1.38,.11,.14,blue)
            block(.79,0,.34,.27,1.05,.15,red)
            block(.39,0,.38,.37,.45,.15,gold,.08)
            block(-.6,-.17,.49,.43,.58,.3,iron)
            for x in (-.73,-.62,-.51): block(x,-.17,.65,.055,.48,.025,chrome)
        helmet(-.22)
    else:
        block(0,0,.37,2.06,1.15,.38,blue,.16)
        block(-.1,0,.61,1.02,.96,.32,glass,.19)
        block(-.15,0,.8,.63,.89,.08,white,.10)
        block(.57,0,.58,.57,.17,.025,white)
        block(-.83,0,.58,.29,.17,.025,white)
        for y in (-.38,.38):
            block(.99,y,.48,.09,.22,.12,white,.02)
            block(-.99,y,.47,.075,.21,.12,red)

def render(name):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    build(name)
    scene=bpy.context.scene
    scene.render.engine="CYCLES"
    scene.cycles.samples=18
    scene.cycles.use_denoising=True
    scene.render.resolution_x,scene.render.resolution_y=160,120
    scene.render.resolution_percentage=100
    scene.render.film_transparent=True
    scene.render.image_settings.file_format="WEBP"
    scene.render.image_settings.color_mode="RGBA"
    scene.render.image_settings.quality=94
    bpy.ops.object.camera_add(location=(0,0,5),rotation=(0,0,0))
    cam=bpy.context.object
    cam.data.type="ORTHO"
    cam.data.ortho_scale=2.42
    scene.camera=cam
    for xyz,power,size in [((-2,-2,4),550,3),((2,2,3),350,3)]:
        bpy.ops.object.light_add(type="AREA",location=xyz)
        light=bpy.context.object
        light.rotation_euler=(-Vector(xyz)).to_track_quat("-Z","Y").to_euler()
        light.data.energy=power
        light.data.size=size
    scene.render.filepath=str(DEST/(name+".webp"))
    bpy.ops.render.render(write_still=True)

cream=white
for shape in ("mower","kart","saloon"):
    render(shape)
