"""Reconstruct the published blanket dimensions, without claiming original CAD.

Run only in the pinned isolated Blender environment. All coordinates are metres.
The source dimensions and explicit reconstruction assumptions live in one JSON.
"""
import hashlib
import json
import math
from pathlib import Path
import sys

import bmesh
import bpy
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view

ROOT = Path(__file__).resolve().parents[1]
OUT = Path(sys.argv[sys.argv.index('--') + 1]).resolve() / 'paper-blanket'
OUT.mkdir(parents=True, exist_ok=True)
D = json.loads((ROOT / 'web-assets/marathon-blanket-dimensions.json').read_text())
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)


def contour(theta, offset):
    """Miller contour plus a normal offset; not an exact Paramak reconstruction."""
    phase = theta + math.asin(D['triangularity']) * math.sin(theta)
    radial = D['majorRadiusM'] + D['minorRadiusM'] * math.cos(phase)
    height = D['elongation'] * D['minorRadiusM'] * math.sin(theta)
    dr = -D['minorRadiusM'] * math.sin(phase) * (1 + math.asin(D['triangularity']) * math.cos(theta))
    dz = D['elongation'] * D['minorRadiusM'] * math.cos(theta)
    norm = math.hypot(dr, dz)
    return radial + offset * dz / norm, height - offset * dr / norm


def breeder(theta):
    return (D['inboardBreederM'] + D['outboardBreederM']) / 2 + (D['outboardBreederM'] - D['inboardBreederM']) / 2 * math.cos(theta)


layers = [
    ('armor', 'Tungsten armor · 5 mm', D['armorM'], (.36, .43, .46, 1), .9),
    ('structure', 'Inner V alloy · 10 mm', D['innerStructureM'], (.20, .25, .27, 1), .8),
    ('multiplier', 'Hg–Li channel · 210 mm', D['channelM'], (.62, .39, .12, 1), .7),
    ('structure', 'Outer V alloy · 30 mm', D['outerStructureM'], (.20, .25, .27, 1), .8),
    ('breeder', 'FLiBe · 545 mm inboard / 795 mm outboard', None, (.13, .38, .31, 1), .15),
    ('tank', 'Eurofer97 tank · 30 mm', D['tankM'], (.36, .43, .46, 1), .9),
]
objects = []
base = 0
nu, nv = 96, 128
# Put the display opening toward the camera. This is not a physics boundary.
start, span = math.pi / 4, 1.5 * math.pi
for component, name, thickness, color, metallic in layers:
    vertices, faces = [], []
    for outer in [False, True]:
        for i in range(nu + 1):
            phi = start + span * i / nu
            for j in range(nv):
                theta = math.tau * j / nv
                offset = base + (breeder(theta) if thickness is None and outer else 0)
                if thickness is not None and outer:
                    offset += thickness
                if component == 'tank':
                    offset += breeder(theta)
                r, z = contour(theta, offset)
                vertices.append((r * math.cos(phi), r * math.sin(phi), z))
    stride = (nu + 1) * nv
    for k in [0, stride]:
        for i in range(nu):
            for j in range(nv):
                a, b = k + i * nv + j, k + i * nv + (j + 1) % nv
                face = (a, b, b + nv, a + nv)
                faces.append(face if k == 0 else tuple(reversed(face)))
    for i in [0, nu]:
        for j in range(nv):
            a, b = i * nv + j, i * nv + (j + 1) % nv
            face = (a, b, b + stride, a + stride)
            faces.append(tuple(reversed(face)) if i == 0 else face)
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj['componentId'] = component
    obj['renderName'] = name
    obj['geometryBasis'] = D['basis'] + ' ' + D['reconstruction']
    obj['materialBasis'] = name + '; paper composition, illustrative optical finish.'
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = color
    shader.inputs['Metallic'].default_value = metallic
    shader.inputs['Roughness'].default_value = .34
    mesh.materials.append(mat)
    # Smooth toroidal faces, leave the exposed section faces flat.
    for face in mesh.polygons:
        face.use_smooth = face.index < 2 * nu * nv
    objects.append(obj)
    if thickness is not None:
        base += thickness

# Complete the context around the paper's six unchanged material layers. These
# additions are explicitly conceptual; this is not Marathon's reactor CAD.
CONCEPT = ('Conceptual tokamak context, not as-built hardware. Coil count, sizes, '
           'materials and service routing are illustrative assumptions; no magnetic '
           'equilibrium, engineering qualification or plant performance is solved.')


def author(name, component, vertices, faces, color, metallic=.65, alpha=1):
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(mesh)
    bm.free()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj['componentId'], obj['renderName'] = component, name
    obj['geometryBasis'] = CONCEPT
    obj['materialBasis'] = 'Illustrative optical finish; construction alloy or conductor technology unspecified.'
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Metallic'].default_value = metallic
    shader.inputs['Roughness'].default_value = .32
    shader.inputs['Alpha'].default_value = alpha
    if alpha < 1:
        mat.surface_render_method = 'DITHERED'
    mesh.materials.append(mat)
    objects.append(obj)
    return obj


def frame(name, component, phi, inner, outer, depth, color):
    vertices, faces, n = [], [], 96
    for offset, tangent in [(inner, -depth/2), (outer, -depth/2),
                            (outer, depth/2), (inner, depth/2)]:
        for j in range(n):
            r, z = contour(math.tau*j/n, offset)
            vertices.append((r*math.cos(phi)-tangent*math.sin(phi),
                             r*math.sin(phi)+tangent*math.cos(phi), z))
    for k in range(4):
        for j in range(n):
            a, b = k*n+j, k*n+(j+1)%n
            faces.append((a, b, ((k+1)%4)*n+(j+1)%n, ((k+1)%4)*n+j))
    return author(name, component, vertices, faces, color)


def hoop(name, component, radius, tube, height, color):
    vertices, faces, n, m = [], [], 96, 12
    for i in range(n):
        for j in range(m):
            phi, theta = math.tau*i/n, math.tau*j/m
            r = radius+tube*math.cos(theta)
            vertices.append((r*math.cos(phi), r*math.sin(phi), height+tube*math.sin(theta)))
    for i in range(n):
        for j in range(m):
            faces.append((i*m+j, ((i+1)%n)*m+j, ((i+1)%n)*m+(j+1)%m, i*m+(j+1)%m))
    obj = author(name, component, vertices, faces, color)
    for face in obj.data.polygons:
        face.use_smooth = True
    return obj


def block(name, component, center, size, color):
    vertices = [(center[0]+x*size[0]/2, center[1]+y*size[1]/2, center[2]+z*size[2]/2)
                for z in [-1, 1] for y in [-1, 1] for x in [-1, 1]]
    faces = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1),
             (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
    return author(name, component, vertices, faces, color)


# A translucent inset surface marks the plasma location, not a calculated LCFS,
# temperature map, visible emission or a measured plasma-to-wall clearance.
vertices, faces = [], []
for i in range(97):
    phi = start+span*i/96
    for j in range(96):
        r, z = contour(math.tau*j/96, -.12)
        vertices.append((r*math.cos(phi), r*math.sin(phi), z))
for i in range(96):
    for j in range(96):
        a, b = i*96+j, i*96+(j+1)%96
        faces.append((a, b, b+96, a+96))
plasma = author('D–T plasma location envelope', 'plasma', vertices, faces, (.62, .25, .27), 0, .45)
plasma['geometryBasis'] = CONCEPT+' Inset location marker, not a plasma-wall gap or magnetic surface.'
for face in plasma.data.polygons:
    face.use_smooth = True

for i in range(12):
    phi = start+span*(i+.5)/12
    frame(f'TF winding {i+1:02}', 'tf-coils', phi, 1.18, 1.48, .24, (.48, .28, .13))
    for sign in [-1, 1]:
        casing = frame(f'TF casing {i+1:02} {sign}', 'tf-coils', phi, 1.14, 1.52, .045, (.38, .44, .47))
        casing.location = (-sign*.15*math.sin(phi), sign*.15*math.cos(phi), 0)

for i in range(9):
    hoop(f'Central solenoid module {i+1}', 'pf-coils', 1.05, .13, (i-4)*.42, (.49, .30, .17))
for height, radius in [(-3.35, 5.6), (3.35, 5.6), (-2.8, 2.0), (2.8, 2.0)]:
    hoop('Poloidal shaping coil', 'pf-coils', radius, .12, height, (.47, .30, .17))

vertices, faces = [], []
for radius, height in [(7.35, -3.9), (7.43, -3.9), (7.43, 3.9), (7.35, 3.9)]:
    for i in range(97):
        phi = start+span*i/96
        vertices.append((radius*math.cos(phi), radius*math.sin(phi), height))
for k in range(4):
    for i in range(96):
        faces.append((k*97+i, k*97+i+1, ((k+1)%4)*97+i+1, ((k+1)%4)*97+i))
for i in [0, 96]:
    faces.append(tuple(k*97+i for k in range(4)))
author('Cryostat display cutaway', 'cryostat', vertices, faces, (.36, .43, .46), .6, .12)
for z in [-3.9, 3.9]:
    hoop('Cryostat rim', 'cryostat', 7.39, .07, z, (.38, .43, .45))
block('Foundation interface', 'plant-supports', (0, 0, -4.3), (14.8, 13.8, .28), (.15, .19, .20))
for phi in [math.pi*.65, math.pi, math.pi*1.35]:
    block('Blanket support pedestal', 'plant-supports', (5.7*math.cos(phi), 5.7*math.sin(phi), -3.4), (.55, .55, 1.5), (.34, .40, .42))
    block('Magnet support foot', 'plant-supports', (6.7*math.cos(phi), 6.7*math.sin(phi), -3.7), (.8, .8, .9), (.31, .37, .39))

# Short interfaces intentionally stop at manifolds, rather than inventing an
# integrated tritium plant, turbine, shielding design or a pipe-flow solution.
for z in [-.65, .65]:
    block('Blanket heat extraction interface', 'plant-services', (2.4, -6.6, z), (.28, 2, .28), (.23, .38, .38))
    block('Heat extraction manifold', 'plant-services', (2.4, -7.7, z), (.7, .45, .6), (.36, .42, .44))
block('Fuel-cycle service interface', 'plant-services', (3.5, -6.4, 1.35), (.18, 2.3, .18), (.49, .32, .17))

bpy.ops.object.select_all(action='DESELECT')
for obj in objects:
    obj.select_set(True)
bpy.context.view_layer.objects.active = objects[0]
model = OUT / 'blanket.glb'
bpy.ops.export_scene.gltf(filepath=str(model), export_format='GLB', use_selection=True,
                          export_extras=True, export_yup=True, export_cameras=False, export_lights=False)
# The exporter changes Blender xyz into glTF x,z,-y.
points = [obj.matrix_world @ Vector(corner) for obj in objects for corner in obj.bound_box]
gltf_points = [(p.x, p.z, -p.y) for p in points]
metadata = {
    'modelBounds': {key: [fn(p[i] for p in gltf_points) for i in range(3)] for key, fn in [('min', min), ('max', max)]},
    'modelSHA256': hashlib.sha256(model.read_bytes()).hexdigest(),
    'geometryBuilder': 'blender/build_paper_blanket.py',
    'geometryBuilderSHA256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    'blenderVersion': bpy.app.version_string,
    'dimensionSource': D['source'],
    'geometryLabel': 'Paper core · conceptual hardware',
    'title': 'Fusion power reference',
    'scaleLabel': 'Power reference · R 4.2 m · a 1.2 m · outer hardware conceptual',
    'caption': D['basis'] + ' ' + D['derived'] + ' ' + D['reconstruction'],
    'modelCamera': {'position': [1, .65, .45], 'target': [0, 0, 0], 'up': [0, 1, 0], 'fitScale': .86},
    'componentIds': sorted({obj['componentId'] for obj in objects}),
    'modelMeshComponentIds': sorted({obj['componentId'] for obj in objects}),
    'modelRegionComponentIds': [],
}

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 24
scene.cycles.use_denoising = True
scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = 1600, 900, 100
metadata['renderSettings'] = {'engine': 'Cycles CPU', 'samples': scene.cycles.samples,
                              'denoising': scene.cycles.use_denoising,
                              'viewTransform': scene.view_settings.view_transform}
scene.world.color = (.15, .15, .15)
bpy.ops.object.camera_add(location=(11, -5, 8))
camera = bpy.context.object
camera.rotation_euler = (Vector((0, 0, 0)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera.data.type, camera.data.ortho_scale = 'ORTHO', 31
scene.camera = camera
bpy.context.view_layer.update()
# Fit every authored bound, including the foundation, with an 8% margin.
projected_bounds = [world_to_camera_view(scene, camera, point) for point in points]
extent = max(max(abs(p.x-.5), abs(p.y-.5))*2 for p in projected_bounds)
camera.data.ortho_scale *= extent*1.08
bpy.context.view_layer.update()
metadata['hotspots'] = []
for component, label, offset in [('plasma', 'Plasma region', -.3), ('armor', 'Tungsten armor', .0025),
                                 ('structure', 'Inner V alloy', .01), ('multiplier', 'Hg–Li channel', .12),
                                 ('breeder', 'FLiBe', .6), ('tank', 'Eurofer97 tank', 1.065)]:
    r, z = contour(0, offset)
    point = Vector((r * math.cos(start), r * math.sin(start), z))
    projected = world_to_camera_view(scene, camera, point)
    metadata['hotspots'].append({'id': component, 'label': label, 'xPct': projected.x * 100, 'yPct': (1 - projected.y) * 100})
(OUT / 'manifest-fragment.json').write_text(json.dumps(metadata, indent=2) + '\n')
for location, power, size in [((4, -7, 12), 4000, 8), ((-7, -2, 6), 3000, 8), ((3, 8, 8), 4000, 6)]:
    bpy.ops.object.light_add(type='AREA', location=location)
    light = bpy.context.object
    light.data.energy, light.data.shape, light.data.size = power, 'DISK', size
    light.rotation_euler = (-light.location).to_track_quat('-Z', 'Y').to_euler()
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = str(OUT / 'blanket.png')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'blanket.blend'))
bpy.ops.render.render(write_still=True)
scene.render.image_settings.file_format = 'WEBP'
bpy.data.images['Render Result'].save_render(str(OUT / 'blanket.webp'), scene=scene)
