"""Render transparent garage inventory art. Run with Blender --background --python this_file."""
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "public" / "sprites" / "garage"
OUTPUT.mkdir(parents=True, exist_ok=True)
TAU = math.tau
SELECTED = set(sys.argv[sys.argv.index("--")+1:]) if "--" in sys.argv else set()

def material(name, color, metallic=0.0, roughness=0.45):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    surface = mat.node_tree.nodes.get("Principled BSDF")
    surface.inputs["Base Color"].default_value = (*color, 1)
    surface.inputs["Metallic"].default_value = metallic
    surface.inputs["Roughness"].default_value = roughness
    return mat

rubber = material("Tyre rubber", (.026, .033, .036), 0, .67)
tread = material("Raised tread", (.055, .062, .063), 0, .64)
metal = material("Machined aluminium", (.42, .48, .47), .68)
dark = material("Cast iron", (.083, .098, .1), .55)
red = material("Oxide enamel", (.52, .056, .025), .38)
yellow = material("Workshop yellow", (.81, .41, .055), .27)
cream = material("Warm porcelain", (.78, .73, .56), .12)
blue = material("Petrol blue enamel", (.043, .21, .25), .45)
brass = material("Brass", (.62, .32, .09), .62)

def finish(obj, mat, bevel=0):
    obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new("Rounded edges", "BEVEL")
        mod.width, mod.segments = bevel, 3
        obj.modifiers.new("Machined faces", "WEIGHTED_NORMAL")
    return obj

def box(pos, dims, mat, bevel=.035):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    obj = bpy.context.object
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, mat, bevel)

def rod(start, end, radius, mat, vertices=24):
    a, b = Vector(start), Vector(end)
    axis = b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=axis.length, location=(a+b)/2)
    obj = bpy.context.object
    obj.rotation_euler = axis.to_track_quat("Z", "Y").to_euler()
    return finish(obj, mat, min(.028, radius*.12))

def wheel(kind):
    widths = {"river": .43, "kart": .85, "knobby": .39, "dirt": .67, "at": .75, "slick": .97, "groove": .73}
    width = widths[kind]
    rim = {"river": blue, "kart": red, "knobby": yellow, "dirt": cream, "at": dark, "slick": metal, "groove": brass}[kind]
    rod((0,-width/2,0),(0,width/2,0),1,rubber,64)
    for sign in (-1,1):
        face = sign * width/2
        rod((0,face,0),(0,face+sign*.04,0),.61,metal,48)
        rod((0,face+sign*.04,0),(0,face+sign*.07,0),.54,rim,48)
        rod((0,face+sign*.07,0),(0,face+sign*.11,0),.19,dark)
        for j in range(6):
            a = TAU*j/6
            x,z = .37*math.cos(a),.37*math.sin(a)
            rod((x,face+sign*.07,z),(x,face+sign*.08,z),.087,dark,14)
    rows = {"river": 3, "kart":0,"slick":0,"knobby":2,"dirt":3,"at":4,"groove":5}[kind]
    for row in range(rows):
        count = 15 if kind in ("dirt","knobby") else 23
        for j in range(count):
            a = TAU*(j+.45*(row%2))/count
            obj=box((math.sin(a),width*((row+.5)/rows-.5),math.cos(a)),
                    (3.5/count,width/rows*.88,.10 if kind=="knobby" else .065),tread,.013)
            obj.rotation_euler.y=a
            obj.rotation_euler.z=.18*(-1)**row

def engine(kind):
    cylinders = {"quarry":4,"tiller":1,"twin":2,"turbo4":4,"six":6}[kind]
    enamel = {"quarry":yellow,"tiller":yellow,"twin":red,"turbo4":blue,"six":cream}[kind]
    length = .45*cylinders+.40
    box((0,0,.38),(length, .89,.76),dark,.11)
    box((0,0,-.03),(length+.09,.92,.22),metal)
    for i in range(cylinders):
        x=.45*(i-(cylinders-1)/2)
        for j in range(4):
            box((x,0,.75+.071*j),(.41,.85,.04),metal,.016)
        box((x,0,1.04),(.39,.74,.15),enamel)
        rod((x,-.15,1.1),(x,-.15,1.25),.067,cream)
        rod((x,-.47,.50),(x,-.66,.24),.086,brass)
    if kind=="quarry":
        # Pump flange, cam cover and the rails that carried it on its original skid.
        box((0,0,1.12),(length,.69,.21),yellow,.07)
        for y in (-.58,.58):
            box((0,y,-.18),(length+.50,.16,.15),dark)
        rod((.45,-.40,.43),(.45,-.85,.43),.31,yellow)
        rod((.45,-.85,.43),(.45,-.90,.43),.38,metal)
        rod((.45,-.90,.43),(.45,-.92,.43),.19,dark)
        for j in range(6):
            a=TAU*j/6
            x,z=.45+.29*math.cos(a),.43+.29*math.sin(a)
            rod((x,-.91,z),(x,-.94,z),.038,dark,6)
    if kind=="turbo4":
        rod((.48,-.66,.4),(.48,-1.02,.4),.30,metal)
        rod((.48,-1.02,.4),(.48,-1.04,.4),.16,dark)
    rod((-length/2-.06,0,.25),(-length/2,0,.25),.26,red)

def frame(kind):
    half={"wagon":.50,"tube":.62,"cage":.70}[kind]
    mat={"wagon":red,"tube":blue,"cage":yellow}[kind]
    for x in (-half,half):
        rod((x,-1.15,0),(x,1.15,0),.08,mat)
    for y in (-1.15,-.45,.56,1.15):
        rod((-half,y,0),(half,y,0),.07,mat)
    if kind=="wagon":
        box((0,0,0),(half*2,2.25,.12),red)
        rod((0,-1.2,0),(0,-1.88,.21),.044,metal)
    else:
        rod((-half,-1,0),(half,.42,0),.055,metal)
        rod((half,-1,0),(-half,.42,0),.055,metal)
        if kind=="cage":
            for x in (-half,half):
                for y in (-.7,.75):
                    rod((x,y,0),(x*.85,y*.70,.87),.065,mat)
                rod((x*.85,-.49,.87),(x*.85,.525,.87),.065,mat)
            for y in (-.49,.525):
                rod((-half*.85,y,.87),(half*.85,y,.87),.065,mat)
            rod((-half,-.65,.1),(-half*.85,.52,.87),.05,metal)

def gearbox(kind):
    auto = kind=="auto"
    rod((0,-.85,0),(0,-.5,0),.56,metal)
    rod((0,-.89,0),(0,-.85,0),.33,dark)
    rod((0,-1.10,0),(0,-.86,0),.10,brass)
    for i in range(8):
        a=TAU*i/8
        x,z=.46*math.sin(a),.46*math.cos(a)
        rod((x,-.88,z),(x,-.85,z),.045,dark,6)
    rod((0,-.5,0),(0,.55,0),.42,dark,12 if auto else 8)
    box((0,0,-.30),(.94,.97,.21),dark if auto else red)
    for y in (-.43,-.25,-.07,.11,.29,.47):
        rod((0,y,0),(0,y+.037,0),.44,metal,12 if auto else 8)
    rod((0,.49,0),(0,1.08,0),.22,metal)
    rod((0,1.07,0),(0,1.28,0),.12,brass)
    if not auto:
        rod((.24,.3,.23),(.41,.52,.88),.055,metal)
        box((.41,.52,.91),(.18,.18,.19),dark,.07)

def fuel():
    box((0,0,0),(1.6,1.18,.81),red,.10)
    for x in (-.54,.54):
        box((x,0,0),(.12,1.20,.85),dark)
    box((0,0,.415),(.62,.44,.052),metal)
    rod((0,0,.42),(0,0,.54),.20,dark)
    for x in (-.60,.60):
        rod((x,-.28,.39),(x,-.28,.54),.07,brass)

def ignition():
    box((0,0,0),(.84,1.5,.44),red,.08)
    for y in (-.50,-.31,-.12,.07,.26,.45):
        box((0,y,.25),(.81,.072,.075),red)
    for i,(x,col) in enumerate([(-.29,rubber),(-.10,red),(.1,yellow),(.29,blue)]):
        rod((x,-.66,0),(x,-1.08,.04),.042,col)
        rod((x,-1.08,.04),(x+(i-1.5)*.10,-1.28,-.10),.04,col)

def exhaust():
    rod((0,-.76,0),(0,.65,0),.24,red)
    for y in (-.77,.63):
        rod((0,y,0),(0,y+.05,0),.245,metal)
    rod((0,-.74,0),(.02,-1.15,.07),.115,metal)
    rod((.02,-1.15,.07),(.02,-1.17,.074),.089,dark)
    rod((0,.6,0),(.28,1.14,.06),.12,metal)

def shell():
    for x in (-.63,.63):
        side=box((x,0,.43),(.09,2.42,.47),blue)
        for y in (-.74,.76):
            cutter=rod((x-.18,y,.22),(x+.18,y,.22),.30,dark,32)
            cut=side.modifiers.new("Wheel arch","BOOLEAN")
            cut.operation="DIFFERENCE"
            cut.object=cutter
            bpy.context.view_layer.objects.active=side
            bpy.ops.object.modifier_apply(modifier=cut.name)
            bpy.data.objects.remove(cutter,do_unlink=True)
        for y in (-.1,.38):
            box((x*1.08,y,.58),(.035,.11,.028),metal)
        box((x*.81,-1.05,.63),(.23,.31,.05),blue)
        for y,top in [(-.68,-.40),(.64,.43)]:
            rod((x,y,.62),(x*.9,top,1.03),.045,blue)
        rod((x,0,.61),(x*.9,.02,1.02),.034,blue)
    box((0,.015,1.04),(1.20,.93,.10),blue)
    box((0,0,.29),(1.04,1.57,.12),dark)
    box((0,-1.14,.41),(1.27,.10,.20),dark)
    box((0,.90,.57),(1.29,.36,.20),blue)
    for x in (-.55,.55):
        box((x,.995,.56),(.17,.07,.10),red)

def stage():
    scene=bpy.context.scene
    scene.render.engine="CYCLES"
    scene.cycles.samples=12
    scene.cycles.use_denoising=True
    scene.render.resolution_x=scene.render.resolution_y=192
    scene.render.resolution_percentage=100
    scene.render.film_transparent=True
    scene.render.image_settings.file_format="WEBP"
    scene.render.image_settings.color_mode="RGBA"
    scene.render.image_settings.quality=93
    scene.world.color=(.4,.4,.4)
    meshes=[obj for obj in scene.objects if obj.type=="MESH"]
    graph=bpy.context.evaluated_depsgraph_get()
    corners=[]
    for obj in meshes:
        mesh=obj.evaluated_get(graph)
        corners.extend(mesh.matrix_world @ v.co for v in mesh.data.vertices)
    low=Vector([min(v[i] for v in corners) for i in range(3)])
    high=Vector([max(v[i] for v in corners) for i in range(3)])
    center=(low+high)/2
    bpy.ops.object.camera_add(location=center+Vector((4,-6,3.4)))
    cam=bpy.context.object
    cam.rotation_euler=(center-cam.location).to_track_quat("-Z","Y").to_euler()
    cam.data.type="ORTHO"
    inv=cam.rotation_euler.to_matrix().transposed()
    projected=[inv @ (v-center) for v in corners]
    midpoint=Vector([(max(v[i] for v in projected)+min(v[i] for v in projected))/2 for i in (0,1,2)])
    cam.location += cam.rotation_euler.to_matrix() @ midpoint
    cam.data.ortho_scale=1.14*max(max(v[i] for v in projected)-min(v[i] for v in projected) for i in (0,1))
    scene.camera=cam
    for offset,power,color,size in [((-3,-4,6),720,(1,.86,.72),4),((3,-2,3),430,(.78,.88,1),3),((1,4,4),850,(1,.9,.71),3)]:
        bpy.ops.object.light_add(type="AREA",location=center+Vector(offset))
        light=bpy.context.object
        light.rotation_euler=(center-light.location).to_track_quat("-Z","Y").to_euler()
        light.data.energy,light.data.color,light.data.shape,light.data.size=power,color,"DISK",size

def render(name, build, *args):
    if SELECTED and name not in SELECTED:
        return
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    build(*args)
    bpy.context.view_layer.update()
    stage()
    bpy.context.scene.render.filepath=str(OUTPUT / (name+".webp"))
    bpy.ops.render.render(write_still=True)

for prefix, kinds, builder in [
    ("wheel", ["river","kart","knobby","dirt","at","slick","groove"],wheel),
    ("engine", ["quarry","tiller","twin","turbo4","six"],engine),
    ("frame", ["wagon","tube","cage"],frame),
    ("drive", ["auto","race"],gearbox),
]:
    for kind in kinds:
        render(f"{prefix}_{kind}",builder,kind)
for name,builder in [("fuel_cell",fuel),("elec_ignition",ignition),("exhaust_glasspack",exhaust),("beater_shell",shell)]:
    render(name,builder)
