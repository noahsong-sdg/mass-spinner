"""Offline Blender: modular illustrative centrifuge hardware, not fabrication CAD.

Local SI xyz, axial z. Each module retains its radius-scale and axial anchor so
the live assembly follows accepted dimensions without stretching bolt heads.
"""
from pathlib import Path
import json
import math
import sys
import bpy
from mathutils import Vector, Matrix

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
    ('Winding insulation', (.19, .105, .045, 1), 0, .48),
    ('Bench surface', (.19, .23, .22, 1), .15, .6),
    ('Concrete floor', (.12, .145, .14, 1), 0, .88),
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
    obj['assemblyModule'] = 1
    obj['anchorFraction'] = anchor
    obj['scaleMode'] = kind
    obj['coilPack'] = int(name == 'Solenoid pack')
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
    # Blender 4.1+ uses mesh sharp-edge data; this removed RNA property is unnecessary.
    if bpy.app.version < (4, 1, 0):
        obj.data.use_auto_smooth = True
    if bevel:
        modifier = obj.modifiers.new('Machined edge radii', 'BEVEL')
        modifier.width, modifier.segments = bevel, 3
        modifier = obj.modifiers.new('Face-weighted normals', 'WEIGHTED_NORMAL')
        modifier.keep_sharp = True
    return obj

def ring(name, ri, ro, depth, z, material, component, parent, opening=False, rise=0, segments=96):
    start, span = (TAU * .5, TAU * .5) if opening else (0, TAU)
    n, vertices, faces = segments, [], []
    closed = not opening and not rise
    for i in range(n if closed else n + 1):
        a = start + span * i / n
        for radius, dz in [(ri, -depth/2), (ro, -depth/2), (ro, depth/2), (ri, depth/2)]:
            vertices.append((radius*math.cos(a), radius*math.sin(a), dz+rise*(i/n-.5)))
    for i in range(n):
        for j in range(4):
            a, b = 4*i+j, 4*i+(j+1)%4
            faces.append(((a+4) % len(vertices), (b+4) % len(vertices), b, a))
    if not closed:
        faces.extend([(0, 1, 2, 3), (4*n+3, 4*n+2, 4*n+1, 4*n)])
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.location.z = z
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
ring('Vessel pressure wall', R, R*1.045, L, 0, 'Stainless steel', 'vessel', wall)
for anchor in [0, 1]:
    end = module('Vacuum end assembly', anchor)
    direction = -1 if anchor == 0 else 1
    ring('Beveled vacuum flange', R, R*1.22, .012, 0, 'Stainless steel', 'vessel', end)
    ring('Recessed metallic seal', R*1.025, R*1.055, .0012, direction*.0066, 'Seal alloy', 'vessel', end)
    cover = ring('End retaining plate', .012, R*1.18, .006, direction*.010, 'Stainless steel', 'vessel', end)
    bpy.context.view_layer.objects.active = cover
    for modifier in list(cover.modifiers):
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    for x in [-R*.62, R*.62]:
        bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=.0062, depth=.04, location=(x,-R*.64,0))
        cutter = bpy.context.object
        bore = cover.modifiers.new('Feedthrough bore', 'BOOLEAN')
        bore.operation, bore.solver, bore.object = 'DIFFERENCE', 'EXACT', cutter
        bpy.context.view_layer.objects.active = cover
        bpy.ops.object.modifier_apply(modifier=bore.name)
        bpy.data.objects.remove(cutter, do_unlink=True)
    ring('Axial service port', .009, .012, .026, direction*.024, 'Stainless steel', 'feed', end)
    ring('Service compression nut', .009, .016, .008, direction*.039, 'Stainless steel', 'feed', end, segments=6)
    for i in range(16):
        a = TAU*i/16
        x, y = R*1.12*math.cos(a), R*1.12*math.sin(a)
        cylinder('Flange stud', .0018, .034, (x,y,0), 'Stainless steel', 'vessel', end)
        for sign in [-1,1]:
            washer = ring('Captive washer', .0019, .0034, .0007, sign*(.01335 if sign == direction else .007), 'Seal alloy', 'vessel', end)
            washer.location.x, washer.location.y = x, y
            nut = ring('Hex flange nut', .0018, .003, .0028, sign*(.0152 if sign == direction else .009), 'Stainless steel', 'vessel', end, segments=6)
            nut.location.x, nut.location.y = x, y
    # External feedthrough module; radial bus connections are assembled parametrically at runtime.
    for x in [-R*.62, R*.62]:
        flange = ring('HV feedthrough flange', .0062, .012, .004, direction*.015, 'Stainless steel', 'insulators', end)
        flange.location.x, flange.location.y = x, -R*.64
        ceramic = ring('HV alumina feedthrough', .002, .006, .034, direction*.022, 'Alumina', 'insulators', end)
        ceramic.location.x, ceramic.location.y = x, -R*.64
        for z in [.019,.025,.031]:
            collar = ring('Ceramic creepage rib', .005, .009, .002, direction*z, 'Alumina', 'insulators', end)
            collar.location.x, collar.location.y = x, -R*.64
        cylinder('Drive terminal pin', .002, .043, (x,-R*.64,direction*.028), 'Copper', 'electrodes', end)
for anchor in [.18,.4,.6,.82]:
    coil = module('Solenoid pack', anchor)
    ring('Grooved alumina former', R*1.06, R*1.13, .036, 0, 'Alumina', 'coils', coil)
    for i in range(7):
        ring('Turn insulation', R*1.129, R*1.231, .0039, (i-3)*.0048, 'Winding insulation', 'coils', coil, rise=.0048)
        ring('Copper solenoid turn', R*1.13, R*1.23, .0035, (i-3)*.0048, 'Copper', 'coils', coil, rise=.0048)
    for z in [-.02,.02]:
        ring('Solenoid retaining cheek', R*1.065, R*1.25, .002, z, 'Structural steel', 'coils', coil)
    for sign in [-1,1]:
        box('Coil bus tab', (.023,.008,.004), (R*1.27,0,sign*.0168), 'Copper', 'coils', coil)
        cylinder('Coil binding post', .003, .014, (R*1.35,0,sign*.0168), 'Copper', 'coils', coil, 6)
        washer = ring('Terminal isolation washer', .0031, .006, .002, sign*.023, 'Alumina', 'insulators', coil)
        washer.location.x = R*1.35
for anchor in [.18,.82]:
    saddle = module('Isolation saddle', anchor)
    ring('Vessel saddle strap', R*1.05, R*1.09, .025, 0, 'Structural steel', 'vessel', saddle, True)
    for x in [-R*.8,R*.8]:
        box('Machined saddle foot', (.025,.09,.045), (x,-R*1.08,0), 'Structural steel', 'vessel', saddle)
        box('Ceramic isolation pad', (.033,.004,.05), (x,-R*1.44,0), 'Alumina', 'vessel', saddle)
        bolt = cylinder('Saddle fixing bolt', .003, .047, (x,-R*1.2,0), 'Stainless steel', 'vessel', saddle, 6)
        bolt.rotation_euler.x = math.pi/2

# The room context keeps fixed SI height. Runtime adapts only the table span.
station = bpy.data.objects.new('Illustrative laboratory station', None)
bpy.context.collection.objects.link(station)
station['viewContext'] = True
station['nonPickable'] = True
station['geometryBasis'] = 'Illustrative laboratory setting. This is not a Marathon facility.'
span = L + .6
def station_box(name, size, pos, material, stretch=False, stretch_width=False):
    obj = box(name, size, pos, material, 'vessel', station)
    obj['geometryBasis'] = station['geometryBasis']
    obj['stationZFraction'] = pos[2]/span if pos[2] else 0
    obj['stationXFraction'] = pos[0]/.9 if pos[0] else 0
    obj['stationStretch'] = stretch
    obj['stationWidthStretch'] = stretch_width
    return obj

station_box('Workbench top', (.9,.03,span), (0,-.015,0), 'Bench surface', True, True)
station_box('Lower shelf', (.82,.018,span-.12), (0,-.70,0), 'Structural steel', True, True)
for x in [-.39,.39]:
    station_box('Longitudinal bench rail', (.04,.06,span-.1), (x,-.06,0), 'Structural steel', True)
    for z in [-span*.44,span*.44]:
        station_box('Bench leg', (.04,.84,.04), (x,-.48,z), 'Structural steel')
        station_box('Leveling foot', (.065,.015,.065), (x,-.9075,z), 'Seal alloy')
for z in [-span*.44,span*.44]:
    station_box('Bench cross rail', (.82,.06,.04), (0,-.06,z), 'Structural steel', stretch_width=True)
station_box('Laboratory floor', (6,.06,6), (0,-.945,0), 'Concrete floor')
station.location = (0,-.19,L/2)

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
center = Vector((0, -.28, L/2))
bpy.ops.object.camera_add(location=center+Vector((1.6, 1.1, 1.7)))
camera = bpy.context.object
forward = (center-camera.location).normalized()
right = forward.cross(Vector((0,1,0))).normalized()
up = right.cross(forward).normalized()
camera.rotation_euler = Matrix((right,up,-forward)).transposed().to_quaternion().to_euler()
camera.data.type, camera.data.lens = 'PERSP', 46
scene.camera = camera
scene.world.use_nodes = True
background = scene.world.node_tree.nodes.get('Background')
background.inputs['Color'].default_value = (.1,.14,.12,1)
background.inputs['Strength'].default_value = .35
for position, power in [((.5,.8,1.2),80),((-.7,.3,.4),50),((.3,-.5,.7),100)]:
    bpy.ops.object.light_add(type='AREA', location=position)
    light = bpy.context.object
    light.data.energy, light.data.size = power, .8
    light.rotation_euler = (center-light.location).to_track_quat('-Z','Y').to_euler()
scene.render.engine = 'CYCLES'
scene.cycles.samples, scene.cycles.use_denoising = 64, True
scene.render.threads_mode, scene.render.threads = 'FIXED', 4
scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = 1200, 800, 100
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = str(OUT/'centrifuge-assembly.png')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'centrifuge-assembly.blend'))
bpy.ops.render.render(write_still=True)
