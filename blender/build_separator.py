"""Blender 3.4+ asset recipe. Host execution explicitly authorized 2026-11-06.

blender --background --python blender/build_separator.py
Outputs: assets/separator.blend, separator.glb, separator-cutaway.png.
Illustrative rotating-filter hardware; no computed fields or plasma prediction.
"""
import math
from pathlib import Path
import bpy
from mathutils import Vector

OUT = Path.cwd() / 'assets'
OUT.mkdir(exist_ok=True)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1.0
hardware = bpy.data.collections.new('Separator hardware | metres')
scene.collection.children.link(hardware)


def material(name, color, metallic, roughness):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Metallic'].default_value = metallic
    shader.inputs['Roughness'].default_value = roughness
    return mat


steel = material('Brushed 316 stainless steel', (.32, .37, .40), .92, .24)
copper = material('Oxidation-free copper windings', (.48, .18, .064), .94, .23)
ceramic = material('Alumina insulators', (.68, .65, .54), 0, .3)
dark = material('Graphite anodized housing', (.018, .023, .029), .72, .27)
gold = material('Molybdenum collector finish', (.27, .22, .14), .88, .3)
seal = material('Viton vacuum seals', (.008, .01, .012), 0, .57)
nickel = material('Bright nickel fittings', (.52, .56, .58), .95, .17)


def finish(obj, name, mat):
    obj.name = name
    for collection in list(obj.users_collection):
        collection.objects.unlink(obj)
    hardware.objects.link(obj)
    obj.data.materials.append(mat)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    if bpy.app.version < (4, 1, 0):
        obj.data.use_auto_smooth = True
    bevel = obj.modifiers.new('Machined edge highlights', 'BEVEL')
    bevel.width = .003
    bevel.segments = 3
    obj.modifiers.new('Weighted normals', 'WEIGHTED_NORMAL')
    return obj


def ring(name, x, outer, inner, depth, mat, arc=2 * math.pi, start=None):
    # Cylinder axis X; a physical wall thickness, not a transparent solid.
    count = 128
    vertices = []
    for axial in (x - depth / 2, x + depth / 2):
        for radius in (outer, inner):
            for i in range(count + 1):
                angle = arc * i / count + (start if start is not None else (-math.pi / 2 if arc < math.tau else 0))
                vertices.append((axial, radius * math.cos(angle), radius * math.sin(angle)))
    stride = count + 1
    faces = []
    for i in range(count):
        faces += [(i, i + 1, 2 * stride + i + 1, 2 * stride + i),
                  (stride + i + 1, stride + i, 3 * stride + i, 3 * stride + i + 1),
                  (i + 1, i, stride + i, stride + i + 1),
                  (2 * stride + i, 2 * stride + i + 1, 3 * stride + i + 1, 3 * stride + i)]
    if arc < 2 * math.pi:
        faces += [(0, 2 * stride, 3 * stride, stride),
                  (count, stride + count, 3 * stride + count, 2 * stride + count)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    hardware.objects.link(obj)
    return finish(obj, name, mat)


def box(name, location, dimensions, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj, name, mat)


def cylinder(name, location, radius, length, mat, axis='Z', vertices=48):
    rotation = {'X': (0, math.pi / 2, 0), 'Y': (math.pi / 2, 0, 0), 'Z': (0, 0, 0)}[axis]
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=length,
                                      location=location, rotation=rotation)
    return finish(bpy.context.object, name, mat)


def cable(name, points, radius, mat):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = radius
    curve.bevel_resolution = 3
    spline = curve.splines.new('BEZIER')
    spline.bezier_points.add(len(points) - 1)
    for point, coordinate in zip(spline.bezier_points, points):
        point.co = coordinate
        point.handle_left_type = point.handle_right_type = 'AUTO'
    obj = bpy.data.objects.new(name, curve)
    hardware.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


# Rear half remains in the cutaway; exterior shell is retained separately.
shell = ring('Vessel | exterior', 0, .50, .48, 2.8, steel)
cutaway = ring('Vessel | rear section', 0, .50, .48, 2.8, steel, math.pi)
cutaway['physics_boundary_radius_m'] = .48
cutaway['physics_source_plane_x_m'] = -1.4
cutaway['physics_end_plane_x_m'] = 1.4
cutaway['boundary_model'] = 'Ideal absorbing cylinder and full end plane; hardware is illustrative.'
shell.hide_render = True
shell.hide_set(True)
for x in (-1.43, 1.43):
    ring('Vacuum flange', x, .59, .48, .11, steel)
    ring('Flange seal line', x - .061, .565, .43, .006, seal)
    ring('Machined flange lip', x + .057, .585, .555, .008, nickel)
    for i in range(20):
        angle = i * math.tau / 20
        bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=.018, depth=.13,
            location=(x, .545 * math.cos(angle), .545 * math.sin(angle)),
            rotation=(0, math.pi / 2, 0))
        finish(bpy.context.object, 'Flange fastener', nickel)
    ring('Machined flange concentric groove', x + .059, .51, .507, .002, dark)
for j in range(6):
    x = -1.0 + .4 * j
    # Exposed windings on an inner former; the old solid bobbin hid the copper.
    ring('Solenoid insulating former', x, .615, .585, .19, dark, math.pi)
    for cheek in (-.10, .10):
        ring('Solenoid cheek plate', x + cheek, .715, .585, .018, dark, math.pi)
    for k in range(7):
        ring('Exposed copper winding section', x + (k - 3) * .024,
             .69, .62, .020, copper, math.pi)
    box('Coil terminal block', (x, .72, .04), (.09, .06, .13), dark)
    for terminal in (-.022, .022):
        cylinder('Coil power terminal', (x + terminal, .759, .04), .009, .024, nickel, 'Y')
    cable('Insulated coil supply', [(x, .76, .04), (x, .86, -.10), (x, .85, -.75)], .009, seal)
for x in (-1.02, 1.02):
    box('Vessel support', (x, 0, -.83), (.12, .19, .65), dark)
    box('Machined saddle', (x, 0, -.51), (.23, .39, .08), steel)
    box('Support foot', (x, 0, -1.12), (.35, .60, .045), steel)
    for y in (-.22, .22):
        cylinder('Levelling foot', (x, y, -1.17), .055, .055, seal)
        cylinder('Foot fixing', (x, y, -1.08), .013, .028, nickel, vertices=6)
for y in (-.20, .20):
    box('Optical bench mounting rail', (0, y, -1.19), (3.55, .075, .065), dark)
ring('Source body', -1.76, .25, .13, .45, dark)
for x in (-1.99, -1.93, -1.87):
    ring('Source cooling fin', x, .285, .24, .014, steel)
ring('Source electrical break', -1.56, .25, .13, .055, ceramic)
ring('Source mounting bezel', -1.52, .28, .12, .025, nickel)
for i in range(5):
    ring('Independently biased source electrode', -1.47 - i * .025,
         .075 + i * .067, .04 + i * .067, .012, gold)
    ring('Electrode insulator', -1.49 - i * .025,
         .075 + i * .067, .04 + i * .067, .008, ceramic)
for i in range(4):
    ring('Segmented annular end collector', 1.4,
         .10 + i * .105, .025 + i * .105, .035, steel)
# Rear-side diagnostic flange and ceramic feedthroughs are illustrative hardware.
cylinder('Diagnostic vacuum neck', (.55, .59, 0), .075, .20, steel, 'Y')
cylinder('Diagnostic flange', (.55, .72, 0), .12, .035, nickel, 'Y')
cylinder('Diagnostic blanking cap', (.55, .748, 0), .096, .018, dark, 'Y')
for x in (-.65, .10):
    cylinder('Ceramic feedthrough', (x, .55, -.13), .025, .13, ceramic, 'Y')
    cylinder('Feedthrough terminal', (x, .63, -.13), .010, .03, nickel, 'Y')

# Export only hardware. No camera, studio lights, floor or decorative plasma.
bpy.ops.object.select_all(action='DESELECT')
for obj in hardware.objects:
    if obj != shell:
        obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT / 'separator.glb'),
    export_format='GLB', use_selection=True, export_apply=True, export_extras=True)

floor_mat = material('Charcoal studio floor', (.012, .016, .021), .18, .36)
bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -1.23))
bpy.context.object.data.materials.append(floor_mat)
scene.world.use_nodes = True
scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.025, .032, .045, 1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value = .22
for location, energy, size in [((-.6, -3.5, 4.5), 1400, 4), ((1.5, 2, 3), 2100, 3), ((-4, -1, 1.8), 850, 2)]:
    bpy.ops.object.light_add(type='AREA', location=location)
    light = bpy.context.object
    light.data.energy = energy
    light.data.shape = 'RECTANGLE'
    light.data.size = size
    light.data.size_y = size * .35
    light.rotation_euler = (Vector((0, 0, 0)) - light.location).to_track_quat('-Z', 'Y').to_euler()
bpy.ops.object.camera_add(location=(4.1, -7.5, 3.25))
camera = bpy.context.object
camera.rotation_euler = (Vector((0, 0, -.12)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 4.85
scene.camera = camera
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 128
scene.view_settings.view_transform = 'Filmic'
scene.view_settings.look = 'Medium High Contrast'
scene.view_settings.exposure = -.35
scene.cycles.use_denoising = True
scene.render.resolution_x = 1600
scene.render.resolution_y = 1000
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = str(OUT / 'separator-cutaway.png')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'separator.blend'))
bpy.ops.render.render(write_still=True)
