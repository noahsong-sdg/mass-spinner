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
    'dimensionSource': D['source'],
    'geometryLabel': 'Paper dimensions',
    'scaleLabel': 'Paper model · R 4.2 m · a 1.2 m',
    'caption': D['basis'] + ' ' + D['derived'] + ' ' + D['reconstruction'],
    'modelCamera': {'position': [1, .65, .45], 'target': [0, 0, 0], 'up': [0, 1, 0], 'fitScale': .86},
}

scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 24
scene.cycles.use_denoising = True
scene.render.resolution_x, scene.render.resolution_y, scene.render.resolution_percentage = 1600, 900, 100
scene.world.color = (.15, .15, .15)
bpy.ops.object.camera_add(location=(11, -5, 8))
camera = bpy.context.object
camera.rotation_euler = (Vector((0, 0, 0)) - camera.location).to_track_quat('-Z', 'Y').to_euler()
camera.data.type, camera.data.ortho_scale = 'ORTHO', 21
scene.camera = camera
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
