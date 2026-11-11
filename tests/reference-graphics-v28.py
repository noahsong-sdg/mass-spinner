"""Bounded rendering regression; run with NumPy, Matplotlib and Pillow in safe-dev.

Usage: python tests/reference-graphics-v28.py [scripts/build-reference-atlas.py]
Generates only inside a temporary directory, using the real atlas save path.
"""
from pathlib import Path
import json
import math
import os
import runpy
import sys
import tempfile
from unittest.mock import patch

import matplotlib
matplotlib.use('Agg')
from matplotlib.figure import Figure
from matplotlib.patches import Circle
from PIL import Image

source = Path(sys.argv[1] if len(sys.argv) > 1 else 'scripts/build-reference-atlas.py').resolve()
original_savefig = Figure.savefig
measured = {}


def inspect_save(fig, filename, *args, **kwargs):
    if Path(filename).name == 'azimuthal.png':
        fig.canvas.draw()
        ax = fig.axes[0]
        origin, x, y = ax.transData.transform([(0, 0), (1, 0), (0, 1)])
        x_scale, y_scale = math.dist(origin, x), math.dist(origin, y)
        circles = [p for p in ax.patches if isinstance(p, Circle)]
        measured.update(x_pixels_per_unit=x_scale, y_pixels_per_unit=y_scale,
                        display_axis_ratio=x_scale / y_scale,
                        circle_radii=[p.radius for p in circles])
    return original_savefig(fig, filename, *args, **kwargs)


old_cwd = Path.cwd()
try:
    with tempfile.TemporaryDirectory(prefix='mass-spinner-atlas-') as temporary:
        os.chdir(temporary)
        with patch.object(Figure, 'savefig', inspect_save):
            runpy.run_path(str(source), run_name='__main__')
        atlas = Path('web-assets/reference-atlas')
        measured['azimuthal_size'] = list(Image.open(atlas / 'azimuthal.png').size)
        measured['contact_sheet_size'] = list(Image.open(atlas / 'contact-sheet.png').size)
        measured['manifest_count'] = len(json.loads((atlas / 'manifest.json').read_text()))
finally:
    os.chdir(old_cwd)

print(json.dumps(measured, indent=2))
assert measured['circle_radii'] == [2.05, .38, .07], 'Actual conductor/annulus circles were not inspected'
assert math.isclose(measured['display_axis_ratio'], 1, rel_tol=1e-12), 'Circular cross-section distorted in display coordinates'
assert measured['azimuthal_size'] == [1600, 1000]
assert measured['contact_sheet_size'] == [1280, 2400]
assert measured['manifest_count'] == 11
print('Reference graphics display-scale and atlas integrity regression passed.')
