"""Export editable apparatus to pickable PBR glTF inside safe-dev Blender.

Run from a bounded project snapshot containing render-editable/*.blend and
web-assets/renders/manifest.json. Geometry and optical materials are conceptual;
no particle, density, field or neutron simulation is baked into these assets.
"""
import hashlib
import json
import math
from pathlib import Path
import struct

import bpy
import bmesh
from mathutils import Vector

ROOT = Path.cwd()
OUTPUT = ROOT / 'web-assets/models'
EVIDENCE = ROOT / 'scientific/model-assets-v24'
OUTPUT.mkdir(parents=True, exist_ok=True)
EVIDENCE.mkdir(parents=True, exist_ok=True)
MANIFEST = ROOT / 'web-assets/renders/manifest.json'
manifest = json.loads(MANIFEST.read_text())


def yup(point):
    return [round(float(point[0]), 6), round(float(point[2]), 6), round(float(-point[1]), 6)]


def identify(mode, obj):
    name = obj.name
    if mode == 'beam-target':
        if name.startswith(('Vacuum beamline base', 'Base fastener', 'Mounting support')):
            return 'support'
        if name.startswith(('Cutaway source', 'Ceramic RF', 'RF winding', 'Source flange', 'Deuterium gas')):
            return 'rf-source'
        if name.startswith(('Accelerator electrode', 'Ceramic high voltage')):
            return 'accelerator'
        if name.startswith('Downstream vacuum'):
            return 'beamline'
        if name.startswith('LiT layer'):
            return 'target'
        if name.startswith(('Cooled substrate', 'Cooling')):
            return 'substrate'
    elif mode == 'blanket':
        for prefix, ident in [('W armor', 'armor'), ('Inner V4Cr4Ti', 'structure'),
                              ('Outer V4Cr4Ti', 'structure'), ('Hg-Li', 'multiplier'),
                              ('FLiBe', 'breeder'), ('Eurofer97', 'tank')]:
            if name.startswith(prefix):
                return ident
    else:
        if name.startswith(('Field-coil', 'Axial-field', 'Solenoid', 'Exposed solenoid', 'Guide magnet')):
            return 'coils'
        if name.startswith(('Transverse source', 'Source body', 'Source ceramic', 'Source inlet', 'Source slit')):
            return 'source'
        if name.startswith(('Transverse injection', 'Conducting arc', 'Arc anode',
                            'Independently biased', 'Annular ceramic', 'RF electrode', 'RF feed')):
            return 'electrodes'
        if name.startswith(('Gyro-plane segmented', 'Exit collector', 'Radial collector')):
            return 'collectors'
        if name.startswith(('Cutaway', 'End flange', 'Vacuum flange', 'Flange fastener',
                            'Diagnostic port', 'Support', 'Isolation foot', 'Gyro chamber', 'Bent cutaway', 'Curved guide')):
            return 'vessel'
    raise ValueError(f'Unmapped hardware: {mode}: {name}')


def orient_toroidal_shell(mode, obj):
    """Repair demonstrated inner/outer source winding and assert orientation."""
    cx, cy, major = (0, 0, 2) if mode == 'blanket' else (-1.3, .8, 1.8)
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    if mode == 'curved':
        # The cutaway channel skins have open boundaries; consistency alone
        # cannot infer which disconnected skin faces the vacuum bore.
        inner = []
        for face in bm.faces:
            center = face.calc_center_median()
            rho = math.hypot(center.x - cx, center.y - cy)
            radial = center - Vector((cx + major * (center.x - cx) / rho,
                                      cy + major * (center.y - cy) / rho, 0))
            if radial.length < .315:
                inner.append(face)
        bmesh.ops.reverse_faces(bm, faces=inner)
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()
    values = []
    for face in obj.data.polygons:
        center = face.center
        rho = math.hypot(center.x - cx, center.y - cy)
        radial = center - Vector((cx + major * (center.x - cx) / rho,
                                  cy + major * (center.y - cy) / rho, 0))
        values.append((radial.length, face.normal.dot(radial.normalized())))
    low, high = min(v[0] for v in values), max(v[0] for v in values)
    inner = [dot for radius, dot in values if radius < low + .2 * (high - low)]
    outer = [dot for radius, dot in values if radius > high - .2 * (high - low)]
    audit = {'innerMeanNormalDotRadial': sum(inner) / len(inner),
             'outerMeanNormalDotRadial': sum(outer) / len(outer)}
    assert audit['innerMeanNormalDotRadial'] < -.99, (obj.name, audit)
    assert audit['outerMeanNormalDotRadial'] > .99, (obj.name, audit)
    return audit


def inspect_glb(path, expected_ids):
    """Structural and numeric regression gates independent of Blender's exporter."""
    raw = path.read_bytes()
    magic, version, length = struct.unpack_from('<4sII', raw)
    assert (magic, version, length) == (b'glTF', 2, len(raw))
    chunk_size, chunk_type = struct.unpack_from('<II', raw, 12)
    assert chunk_type == 0x4E4F534A
    doc = json.loads(raw[20:20 + chunk_size])
    assert doc['asset']['version'] == '2.0'
    assert not doc.get('cameras') and not doc.get('extensions', {}).get('KHR_lights_punctual')
    assert all('uri' not in buffer for buffer in doc['buffers'])
    mesh_nodes = [node for node in doc['nodes'] if 'mesh' in node]
    ids = sorted({node.get('extras', {}).get('componentId') for node in mesh_nodes})
    assert ids == sorted(expected_ids), (ids, expected_ids)
    assert all(node['extras'].get('componentId') for node in mesh_nodes)
    triangles = 0
    for mesh in doc['meshes']:
        for primitive in mesh['primitives']:
            position = doc['accessors'][primitive['attributes']['POSITION']]
            assert all(math.isfinite(v) for v in position['min'] + position['max'])
            assert primitive.get('mode', 4) == 4
            triangles += doc['accessors'][primitive['indices']]['count'] // 3
    for mat in doc['materials']:
        pbr = mat['pbrMetallicRoughness']
        assert all(math.isfinite(v) and 0 <= v <= 1 for v in pbr['baseColorFactor'])
        assert 0 <= pbr.get('metallicFactor', 1) <= 1
        assert 0 <= pbr.get('roughnessFactor', 1) <= 1
    return {'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest(),
            'meshNodes': len(mesh_nodes), 'meshes': len(doc['meshes']),
            'materials': len(doc['materials']), 'triangles': triangles,
            'componentIds': ids}


reports = {}
for mode in ['beam-target', 'gyro', 'icr', 'curved', 'centrifuge', 'rotating', 'doublewell', 'blanket']:
    source = ROOT / 'render-editable' / f'{mode}.blend'
    bpy.ops.wm.open_mainfile(filepath=str(source))
    camera = bpy.context.scene.camera
    camera_position = yup(camera.matrix_world.translation)
    camera_target = yup(camera.matrix_world.translation + camera.matrix_world.to_quaternion() @ Vector((0, 0, -8)))
    bpy.ops.object.select_all(action='DESELECT')
    components = set()
    hardware = []
    normal_audits = {}
    for obj in list(bpy.context.scene.objects):
        if obj.type not in {'MESH', 'CURVE'}:
            continue
        if any(mat and mat.name.startswith('Charcoal studio surface') for mat in obj.data.materials):
            continue
        obj['componentId'] = identify(mode, obj)
        obj['apparatusMode'] = mode
        if mode == 'blanket' or (mode == 'curved' and obj.name.startswith('Bent cutaway channel')):
            normal_audits[obj.name] = orient_toroidal_shell(mode, obj)
        if obj.type == 'MESH' and any(mod.type == 'WEIGHTED_NORMAL' for mod in obj.modifiers):
            # Blender 3.4 requires this for the source's machined-edge modifier.
            obj.data.use_auto_smooth = True
        components.add(obj['componentId'])
        hardware.append(obj)
    # Curves need real evaluated mesh geometry in glTF; selecting only hardware
    # also excludes the 200-unit studio plane from bounds and camera fitting.
    for obj in hardware:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = hardware[0]
    bpy.ops.object.convert(target='MESH')
    bpy.context.view_layer.update()
    points = [yup(obj.matrix_world @ Vector(corner)) for obj in bpy.context.selected_objects for corner in obj.bound_box]
    low = [min(point[i] for point in points) for i in range(3)]
    high = [max(point[i] for point in points) for i in range(3)]
    path = OUTPUT / f'{mode}.glb'
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True,
        export_apply=True, export_extras=True, export_yup=True, export_cameras=False,
        export_lights=False, export_materials='EXPORT', export_normals=True,
        export_texcoords=False, export_tangents=False, export_animations=False)
    report = inspect_glb(path, components)
    report['surfaceNormalAudit'] = normal_audits
    report['blendSHA256'] = hashlib.sha256(source.read_bytes()).hexdigest()
    report['hardwareNodes'] = [{'name': obj.name, 'componentId': obj['componentId']} for obj in bpy.context.selected_objects]
    reports[mode] = report
    asset = manifest['assets'][mode]
    catalog_ids = {hotspot['id'] for hotspot in asset['hotspots']}
    asset.update({'model': f'/models/{mode}.glb',
        'modelBounds': {'min': low, 'max': high,
                        'center': [(a + b) / 2 for a, b in zip(low, high)],
                        'size': [b - a for a, b in zip(low, high)]},
        'modelCamera': {'position': camera_position, 'target': camera_target, 'up': [0, 1, 0]},
        'componentIds': sorted(catalog_ids | components),
        'modelMeshComponentIds': sorted(components),
        'modelRegionComponentIds': sorted(catalog_ids - components),
        'modelSHA256': report['sha256']})
    print(f'EXPORTED {mode}: {report["bytes"]} bytes, {report["triangles"]} triangles, {sorted(components)}', flush=True)

for key in ['model', 'modelBounds', 'modelCamera', 'componentIds', 'modelMeshComponentIds', 'modelRegionComponentIds', 'modelSHA256']:
    manifest['assets']['doublewell-dynamics'][key] = manifest['assets']['doublewell'][key]
manifest['modelFormat'] = 'glTF 2.0 binary, PBR metallic roughness, Y up'
manifest['modelExporterSHA256'] = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
MANIFEST.write_text(json.dumps(manifest, indent=2) + '\n')
(EVIDENCE / 'validation.json').write_text(json.dumps({'blenderVersion': bpy.app.version_string,
    'exporterSHA256': manifest['modelExporterSHA256'], 'assets': reports}, indent=2) + '\n')
