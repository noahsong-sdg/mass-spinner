"""Structural artifact checks; visual inspection of PNG is also required."""
import json
from pathlib import Path
import struct

root = Path('assets')
blend = root / 'separator.blend'
assert blend.is_file() and blend.stat().st_size > 1000, 'Missing Blender scene'
png = (root / 'separator-cutaway.png').read_bytes()
assert png[:8] == b'\x89PNG\r\n\x1a\n', 'Not a PNG'
assert struct.unpack('>II', png[16:24]) == (1600, 1000), 'Unexpected render dimensions'
glb = (root / 'separator.glb').read_bytes()
magic, version, length = struct.unpack_from('<III', glb)
assert magic == 0x46546c67 and version == 2 and length == len(glb), 'Invalid GLB header'
chunk_length, chunk_type = struct.unpack_from('<II', glb, 12)
assert chunk_type == 0x4e4f534a, 'Missing glTF JSON chunk'
document = json.loads(glb[20:20 + chunk_length])
assert document.get('meshes') and document.get('materials'), 'Missing hardware/materials'
assert not document.get('cameras'), 'Studio camera leaked into hardware asset'
assert not document.get('animations'), 'Unexpected animation in static hardware asset'
boundary = next(node['extras'] for node in document['nodes']
                if 'physics_boundary_radius_m' in node.get('extras', {}))
assert boundary['physics_boundary_radius_m'] == .48, 'Chamber radius differs from solver'
assert boundary['physics_source_plane_x_m'] == -1.4, 'Source plane differs from solver'
assert boundary['physics_end_plane_x_m'] == 1.4, 'End plane differs from solver'
# Exported mesh coordinates are baked: verify actual ring geometry, not just metadata.
collectors = [node for node in document['nodes'] if 'end collector' in node.get('name', '')]
assert len(collectors) == 4, 'Missing collector rings'
for node in collectors:
    assert not any(key in node for key in ['matrix', 'translation', 'rotation', 'scale']), 'Collector transform needs review'
    for primitive in document['meshes'][node['mesh']]['primitives']:
        bounds = document['accessors'][primitive['attributes']['POSITION']]
        centre = (bounds['min'][0] + bounds['max'][0]) / 2
        assert abs(centre - 1.4) < 1e-5, 'Collector ring does not align with absorbing end plane'
print(f'GLB v2: {len(document["meshes"])} meshes; PNG 1600×1000; Blender scene present')

fuel = Path('web-assets/models/centrifuge-assembly.glb').read_bytes()
assert struct.unpack_from('<III', fuel) == (0x46546c67, 2, len(fuel))
size, kind = struct.unpack_from('<II', fuel, 12)
assert kind == 0x4e4f534a
assembly = json.loads(fuel[20:20+size])
assert not assembly.get('cameras') and not assembly.get('animations')
modules = [n for n in assembly['nodes'] if n.get('extras', {}).get('assemblyModule')]
assert len(modules) == 9 and len(assembly['meshes']) == 261
assert sum(bool(n['extras'].get('coilPack')) for n in modules) == 4
for node in assembly['nodes']:
    if 'mesh' in node:
        assert all(key in node['extras'] for key in ['componentId', 'renderName', 'materialBasis', 'geometryBasis'])
print('Authored centrifuge: nine SI modules, 261 selectable hardware meshes, no studio objects')
