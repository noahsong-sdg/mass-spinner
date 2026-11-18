"""Author the live diagnostic cell topology; no gas properties are baked in.

Run after build_fuel_assembly.py, in the pinned isolated Blender environment.
The JSON and GLB describe the same normalized quarter-annulus. Runtime maps its
two radial boundaries onto the accepted finite-volume grid, in SI metres.
"""
import json
import math
from pathlib import Path
import sys
import bpy

out = Path(sys.argv[sys.argv.index('--') + 1]).resolve()
bpy.ops.wm.open_mainfile(filepath=str(out / 'centrifuge-assembly.blend'))

# Four corners at each azimuth: inner/outer radius, inlet/outlet z.
segments = 32
vertices, faces = [], []
for i in range(segments + 1):
    angle = -math.pi / 2 + math.pi / 2 * i / segments
    for radius, z in [(.5, 0), (1, 0), (1, 1), (.5, 1)]:
        vertices.append((radius * math.cos(angle), radius * math.sin(angle), z))
for i in range(segments):
    for j in range(4):
        a, b = 4*i+j, 4*i+(j+1) % 4
        faces.append((a, b, b+4, a+4))
faces.extend([(3, 2, 1, 0), (4*segments, 4*segments+1, 4*segments+2, 4*segments+3)])
mesh = bpy.data.meshes.new('Gas cell topology')
mesh.from_pydata(vertices, [], faces)
mesh.update()
mesh.calc_loop_triangles()
obj = bpy.data.objects.new('Gas domain cell', mesh)
bpy.context.collection.objects.link(obj)
obj['purpose'] = 'Numerical diagnostic volume, not optical emission or a solid gas material'
obj['coordinateSystem'] = 'Normalized xyz; radius .5..1, axial z 0..1, azimuth -pi/2..0'
data = {'schemaVersion': 1, 'generator': 'blender/build_gas_domain.py',
        'blender': bpy.app.version_string, 'purpose': obj['purpose'],
        'positions': [v for p in vertices for v in p],
        'indices': [i for face in mesh.loop_triangles for i in face.vertices]}
(out / 'gas-cell.json').write_text(json.dumps(data, separators=(',', ':')) + '\n')
bpy.ops.object.select_all(action='DESELECT')
obj.select_set(True)
bpy.context.view_layer.objects.active = obj
bpy.ops.export_scene.gltf(filepath=str(out / 'gas-cell.glb'), export_format='GLB',
    use_selection=True, export_extras=True, export_yup=False)

# A uniform field previews only the geometry; live colors come from the solver.
material = bpy.data.materials.new('Diagnostic field - uniform geometry preview')
material.diffuse_color = (.24, .48, .42, 1)
material.use_nodes = True
shader = material.node_tree.nodes.get('Principled BSDF')
shader.inputs['Base Color'].default_value = material.diffuse_color
shader.inputs['Roughness'].default_value = .65
mesh.materials.append(material)
for side in [-1, 1]:
    cell = obj.copy()
    cell.data = mesh.copy()
    bpy.context.collection.objects.link(cell)
    for vertex in cell.data.vertices:
        x, y, z = vertex.co
        radius = math.hypot(x, y)
        target = .12 * (2*radius-1)
        vertex.co = (side*x/radius*target, y/radius*target, z*.8)
    cell['purpose'] = 'Uniform diagnostic geometry preview; no simulated profile baked in'
bpy.data.objects.remove(obj, do_unlink=True)
scene = bpy.context.scene
scene.render.filepath = str(out / 'gas-cutaway.png')
bpy.ops.wm.save_as_mainfile(filepath=str(out / 'gas-cutaway.blend'))
bpy.ops.render.render(write_still=True)
