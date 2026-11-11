"""Offline Blender: modular illustrative centrifuge hardware, not fabrication CAD.

Local SI xyz, axial z. Each module retains its radius-scale and axial anchor so
the live assembly follows accepted dimensions without stretching bolt heads.
"""
from pathlib import Path
import json
import math
import sys
import bpy
from mathutils import Vector, Quaternion

OUT = Path(sys.argv[sys.argv.index('--') + 1]).resolve()
OUT.mkdir(parents=True, exist_ok=False)
R, L = .12, .8
TAU = 2 * math.pi
BASIS = 'Marathon patent topology; illustrative construction, not as-built dimensions or fabrication CAD.'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
materials = {}
for name, color, metal, rough in [
    ('Stainless steel', (.36, .43, .46, 1), 1, .3),
    ('Copper', (.58, .26, .12, 1), 1, .28),
    ('Alumina', (.75, .72, .62, 1), 0, .32),
    ('Seal alloy', (.13, .16, .17, 1), .9, .4),
    ('Structural steel', (.045, .065, .06, 1), .8, .4),
]:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = color
    shader.inputs['Metallic'].default_value = metal
    shader.inputs['Roughness'].default_value = rough
    materials[name] = mat

modules = []
def module(name, anchor, kind='radius'):
    obj = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(obj)
    obj['assemblyModule'] = True
    obj['anchorFraction'] = anchor
    obj['scaleMode'] = kind
    obj['coilPack'] = name == 'Solenoid pack'
    obj['referenceRadiusM'] = R
    obj['referenceLengthM'] = L
    modules.append(obj)
    return obj

def finish(obj, name, material, component, parent, bevel=.0003):
    obj.name = name
    obj.parent = parent
    obj.data.materials.append(materials[material])
    obj['componentId'] = component
    obj['renderName'] = name
    obj['materialBasis'] = 'Assumed ' + material.lower() + '; optical finish illustrative'
    obj['geometryBasis'] = BASIS
    for face in obj.data.polygons:
        face.use_smooth = True
    obj.data.use_auto_smooth = True
    if bevel:
        modifier = obj.modifiers.new('Machined edge radii', 'BEVEL')
        modifier.width, modifier.segments = bevel, 3
        modifier = obj.modifiers.new('Face-weighted normals', 'WEIGHTED_NORMAL')
        modifier.keep_sharp = True
    return obj

def ring(name, ri, ro, depth, z, material, component, parent, opening=False, rise=0):
    start, span = (TAU * .375, TAU * .75) if opening else (0, TAU)
    n, vertices, faces = 96, [], []
    for i in range(n + 1):
        a = start + span * i / n
        for radius, dz in [(ri, -depth/2), (ro, -depth/2), (ro, depth/2), (ri, depth/2)]:
            vertices.append((radius*math.cos(a), radius*math.sin(a), z+dz+rise*(i/n-.5)))
    for i in range(n):
        for j in range(4):
            a, b = 4*i+j, 4*i+(j+1)%4
            faces.append((a+4, b+4, b, a))
    if opening or rise:
        faces.extend([(0, 1, 2, 3), (4*n+3, 4*n+2, 4*n+1, 4*n)])
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    return finish(obj, name, material, component, parent)

def cylinder(name, radius, depth, pos, material, component, parent, vertices=48):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=pos)
    return finish(bpy.context.object, name, material, component, parent)

def box(name, size, pos, material, component, parent):
    bpy.ops.mesh.primitive_cube_add(size=1, location=pos)
    obj = bpy.context.object
    obj.dimensions = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, material, component, parent)

wall = module('Pressure boundary', .5, 'length')
ring('Vessel pressure wall', R, R*1.045, L, 0, 'Stainless steel', 'vessel', wall, True)
for anchor in [0, 1]:
    end = module('Vacuum end assembly', anchor)
    ring('Beveled vacuum flange', R, R*1.22, .012, 0, 'Stainless steel', 'vessel', end)
    ring('Recessed metallic seal', R*1.025, R*1.055, .0012, .006, 'Seal alloy', 'vessel', end)
    ring('End retaining plate', R*.91, R*1.18, .004, -.009, 'Stainless steel', 'vessel', end)
    for i in range(16):
        a = TAU*i/16
        x, y = R*1.12*math.cos(a), R*1.12*math.sin(a)
        cylinder('Flange stud', .0018, .024, (x,y,0), 'Stainless steel', 'vessel', end)
        for sign in [-1,1]:
            washer = ring('Captive washer', .0019, .0034, .0007, sign*.007, 'Seal alloy', 'vessel', end)
            washer.location.x, washer.location.y = x, y
            cylinder('Hex flange nut', .003, .0028, (x,y,sign*.009), 'Stainless steel', 'vessel', end, 6)
    # External feedthrough module; radial bus connections are assembled parametrically at runtime.
    for x in [-R*.62, R*.62]:
        cylinder('HV feedthrough flange', .012, .004, (x,-R*.84,-.023), 'Stainless steel', 'insulators', end)
        cylinder('HV alumina feedthrough', .006, .025, (x,-R*.84,-.035), 'Alumina', 'insulators', end)
        for z in [-.027,-.033,-.039]:
            collar = ring('Ceramic creepage rib', .005, .009, .002, z, 'Alumina', 'insulators', end)
            collar.location.x, collar.location.y = x, -R*.84
        cylinder('Drive terminal pin', .002, .043, (x,-R*.84,-.038), 'Copper', 'electrodes', end)
for anchor in [.18,.4,.6,.82]:
    coil = module('Solenoid pack', anchor)
    ring('Grooved alumina former', R*1.06, R*1.13, .036, 0, 'Alumina', 'coils', coil)
    for i in range(7):
        ring('Copper solenoid turn', R*1.13, R*1.23, .0035, (i-3)*.0048, 'Copper', 'coils', coil, rise=.0048)
    for z in [-.02,.02]:
        ring('Solenoid retaining cheek', R*1.065, R*1.25, .002, z, 'Structural steel', 'coils', coil)
    for sign in [-1,1]:
        box('Coil bus tab', (.023,.008,.004), (R*1.29,-.009,sign*.0168), 'Copper', 'coils', coil)
        cylinder('Coil binding post', .003, .014, (R*1.35,-.009,sign*.0168), 'Copper', 'coils', coil, 6)
for anchor in [.18,.82]:
    saddle = module('Isolation saddle', anchor)
    ring('Vessel saddle strap', R*1.05, R*1.09, .025, 0, 'Structural steel', 'vessel', saddle, True)
    for x in [-R*.8,R*.8]:
        box('Machined saddle foot', (.025,.052,.045), (x,-R*1.2,0), 'Structural steel', 'vessel', saddle)
        box('Ceramic isolation pad', (.033,.004,.05), (x,-R*1.44,0), 'Alumina', 'vessel', saddle)
        cylinder('Saddle fixing bolt', .003, .047, (x,-R*1.2,0), 'Stainless steel', 'vessel', saddle, 6)

scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1
# Author modules at their real reference locations, export their origins as anchors.
for obj in modules:
    obj.location.z = obj['anchorFraction'] * L
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'centrifuge-assembly.blend'))
bpy.ops.export_scene.gltf(filepath=str(OUT/'centrifuge-assembly.glb'), export_format='GLB',
    export_apply=True, export_extras=True, export_yup=False, export_cameras=False,
    export_lights=False, export_animations=False)
records = [{'name':o.name,'anchorFraction':o['anchorFraction'],'scaleMode':o['scaleMode']} for o in modules]
(OUT/'assembly-manifest.json').write_text(json.dumps({'schemaVersion':1,'blender':bpy.app.version_string,
    'basis':BASIS,'coordinateSystem':'SI xyz, axial z','modules':records,
    'meshes':len([o for o in scene.objects if o.type=='MESH'])}, indent=2)+'\n')
print('FUEL_ASSEMBLY', json.dumps({'modules':len(modules),'meshes':len([o for o in scene.objects if o.type=='MESH'])}), flush=True)
center = Vector((0, 0, L/2))
bpy.ops.object.camera_add(location=center+Vector((.25, 1.4, .55)))
camera = bpy.context.object
camera.rotation_euler = ((center-camera.location).to_track_quat('-Z','Y') @ Quaternion((0,0,1),math.pi/2)).to_euler()
camera.data.type, camera.data.ortho_scale = 'ORTHO', 1.2
scene.camera = camera
scene.world.color = (.035,.045,.04)
for position, power in [((.5,.8,1.2),80),((-.7,.3,.4),50),((.3,-.5,.7),100)]:
    bpy.ops.object.light_add(type='AREA', location=position)
    light = bpy.context.object
    light.data.energy, light.data.size = power, .8
    light.rotation_euler = (center-light.location).to_track_quat('-Z','Y').to_euler()
scene.render.engine = 'CYCLES'
scene.cycles.samples, scene.cycles.use_denoising = 64, False
scene.render.threads_mode, scene.render.threads = 'FIXED', 4
scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = 1200, 800, 100
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = str(OUT/'centrifuge-assembly.png')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'centrifuge-assembly.blend'))
bpy.ops.render.render(write_still=True)
