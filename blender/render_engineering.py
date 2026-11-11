"""Render exported runtime geometry using the existing safe-dev Blender cache.

blender -b --python render_engineering.py -- /work/project/scientific/engineering-v39/rotating.glb
No public assets are overwritten; PNG and editable .blend sit beside the input.
"""
from pathlib import Path
import math
import sys
import bpy
from mathutils import Vector
import numpy as np

# Blender 3.4's bundled glTF importer uses the removed NumPy bool alias.
# The preserved guest NumPy is 1.26; restore that exact scalar alias for import only.
if bpy.app.version < (3, 5, 0) and 'bool' not in np.__dict__:
    np.bool = np.bool_

files = [Path(p).resolve() for p in sys.argv[sys.argv.index('--') + 1:]]
if not files:
    raise ValueError('Supply one or more exported engineering GLB paths.')
for source in files:
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(source))
    meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
    if not meshes:
        raise ValueError(f'No meshes in {source}')
    # This bounds the visible constructed hardware, never an invisible numerical boundary.
    points = [o.matrix_world @ Vector(corner) for o in meshes for corner in o.bound_box]
    lo = Vector(tuple(min(p[i] for p in points) for i in range(3)))
    hi = Vector(tuple(max(p[i] for p in points) for i in range(3)))
    centre, span = (lo + hi) / 2, (hi - lo).length
    bpy.ops.object.camera_add(location=centre + Vector((.75, -1, .72)).normalized() * span * 1.5)
    camera = bpy.context.object
    camera.rotation_euler = (centre - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.type = 'ORTHO'
    camera.data.ortho_scale = span * 1.1
    camera.data.clip_start = span / 10000
    camera.data.clip_end = span * 20
    scene = bpy.context.scene
    scene.camera = camera
    scene.render.engine = 'CYCLES'
    scene.cycles.device = 'CPU'
    scene.cycles.samples = 96
    # Existing isolated Debian Blender was verified without compiled OIDN support.
    scene.cycles.use_denoising = False
    scene.render.resolution_x, scene.render.resolution_y = 1200, 800
    scene.render.resolution_percentage = 100
    scene.world.color = (.08, .10, .11)
    for offset, colour, power in [((1, -1, 2), (1, .87, .73), 1000), ((-1, -.4, 1), (.66, .82, 1), 850), ((0, 1, 1.2), (1, 1, 1), 1300)]:
        bpy.ops.object.light_add(type='AREA', location=centre + Vector(offset) * span)
        light = bpy.context.object
        light.data.energy = power * span * span
        light.data.color = colour
        light.data.shape = 'DISK'
        light.data.size = span * 1.2
        light.rotation_euler = (centre - light.location).to_track_quat('-Z', 'Y').to_euler()
    scene.view_settings.view_transform = 'Filmic'
    scene.render.image_settings.file_format = 'PNG'
    scene.render.filepath = str(source.with_suffix('.png'))
    bpy.ops.wm.save_as_mainfile(filepath=str(source.with_suffix('.blend')))
    bpy.ops.render.render(write_still=True)
    print(f'ENGINEERING_RENDER {source.name}', flush=True)
