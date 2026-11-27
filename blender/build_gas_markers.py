"""Author normalized 3D bulk-sample markers, animated by the live solver.

These are enlarged numerical markers, not atom sizes or predicted emission.
No trajectory is baked into the asset: SI positions and phases are live data.
"""
import json
from pathlib import Path
import sys
import bpy

out = Path(sys.argv[sys.argv.index('--') + 1]).resolve()
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
markers = {}
for ion in [False, True]:
    if ion:
        bpy.ops.mesh.primitive_torus_add(major_segments=16, minor_segments=6,
                                        major_radius=.76, minor_radius=.24)
    else:
        bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=6, radius=1)
    obj = bpy.context.object
    obj.name = 'Ion sample' if ion else 'Neutral sample'
    obj['purpose'] = 'Enlarged weighted bulk sample; not an atom or optical emission'
    obj['motionSource'] = 'Accepted solver CDF and integrated angular phase; no baked animation'
    mesh = obj.data
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    mesh.calc_loop_triangles()
    markers['ion' if ion else 'neutral'] = {
        'positions': [v for vertex in mesh.vertices for v in vertex.co],
        'indices': [i for face in mesh.loop_triangles for i in face.vertices],
    }
    material = bpy.data.materials.new(obj.name)
    material.use_nodes = True
    material.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = (.3, .75, .66, 1)
    material.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .4
    mesh.materials.append(material)

data = {'schemaVersion': 1, 'generator': 'blender/build_gas_markers.py',
        'blender': bpy.app.version_string,
        'purpose': 'Normalized weighted sample geometry; no physical atom size or emission',
        'markers': markers}
(out / 'gas-markers.json').write_text(json.dumps(data, separators=(',', ':')) + '\n')
bpy.ops.wm.save_as_mainfile(filepath=str(out / 'gas-markers.blend'))
bpy.ops.export_scene.gltf(filepath=str(out / 'gas-markers.glb'), export_format='GLB',
                          export_extras=True, export_yup=False, export_animations=False)
