"""Extract selected experimental vector markers, offline in safe-dev.

Selection rectangles/colors were checked on the full rendered page by two
reviewers. This extracts a published reproduction, not original instrument data.
"""
import hashlib
import json
from pathlib import Path
import sys

import fitz
from axis_calibration import tick_value

source = Path('scientific/experimental-v64/sources/hood2026.pdf')
digest = hashlib.sha256(source.read_bytes()).hexdigest()
assert digest == '9402d8d19a6ba33a3a75e5c180ed84e941bff500fe6265ee16075c4e3553d03c'
page = fitz.open(source)[16]
drawings = page.get_drawings()


def unique(rectangles):
    return sorted({tuple(round(v, 5) for v in rect) for rect in rectangles})


profile_rects = unique(d['rect'] for d in drawings
                       if d['fill'] and abs(d['fill'][0]-.48627451) < 1e-6
                       and len(d['items']) == 8 and 150 < d['rect'].x0 < 300
                       and 100 < d['rect'].y0 < 160 and 2.9 < d['rect'].width < 3.1)
assert len(profile_rects) == 8
profile_axes = [129.834, 47.8432, 307.7298, 183.19446]
x0, ytop, x1, yzero = profile_axes
profile = []
for rect in profile_rects:
    x, y = (rect[0]+rect[2])/2, (rect[1]+rect[3])/2
    profile.append({'rCm': 6*(x-x0)/(x1-x0), 'vMS': 1500*(yzero-y)/(yzero-ytop),
                    'vectorRect': rect, 'rHalfWidthCm': 6*.5/(x1-x0),
                    'vHalfWidthMS': 1500*.5/(yzero-ytop)})

# Red hollow square outlines, not black model curves or error-bar cap lines.
red = [d for d in drawings if d['color'] and d['color'][0] > .8 and d['color'][1] < .3
       and len(d['items']) == 1 and d['items'][0][0] == 're'
       and 4.9 < d['rect'].width < 5.1]
sweep_axes = {'velocity': [129.7785, 421.52829, 503.4715, 474.55048],
              'temperature': [129.7785, 494.16818, 503.4715, 547.19037],
              'lambda': [129.7785, 566.80908, 503.4715, 619.83142]}
sweeps = {}
# Tick15000 lies below the upper frame (which is approximately15500 K).
# Verify all three actual PDF tick marks instead of assigning the frame a label.
temperature_tick_positions = sorted(d['rect'].y0 for d in drawings
    if d['color'] and max(d['color']) < .1 and len(d['items']) == 1
    and 126 < d['rect'].x0 < 127 and 2.9 < d['rect'].width < 3.1
    and 494 < d['rect'].y0 < 550)
assert len(temperature_tick_positions) == 3
temperature_ticks = list(zip(temperature_tick_positions, [15000, 7500, 0]))
for key, axes in sweep_axes.items():
    x0, ytop, x1, yzero = axes
    maximum = {'velocity': 1600, 'temperature': 15000, 'lambda': .6}[key]
    rows = []
    for rect in unique(d['rect'] for d in red if ytop < d['rect'].y0 < yzero):
        x, y = (rect[0]+rect[2])/2, (rect[1]+rect[3])/2
        value = tick_value(y, temperature_ticks) if key == 'temperature' else maximum*(yzero-y)/(yzero-ytop)
        half_width = abs(tick_value(y+.5, temperature_ticks)-value) if key == 'temperature' else maximum*.5/(yzero-ytop)
        rows.append({'B': .1+.16*(x-x0)/(x1-x0), 'value': value,
                     'vectorRect': rect, 'valueHalfWidth': half_width,
                     'BHalfWidth': .16*.5/(x1-x0)})
    assert len(rows) == (7 if key == 'velocity' else 4)
    sweeps[key] = rows

packet = {'schemaVersion': 1, 'sourceSHA256': digest,
          'url': 'https://arxiv.org/pdf/2607.28208', 'version': 'v2', 'page': 17,
          'originalDOIs': ['10.1515/zna-1979-0602', '10.1515/zna-1980-0815'],
          'extractionHalfWidthPDFPoints': .5,
          'precisionWarning': 'Extraction precision excludes unknown error in the published reproduction',
          'profileAxes': profile_axes, 'sweepAxes': sweep_axes,
          'temperatureCalibrationTicks': temperature_ticks,
          'profile': profile, 'sweeps': sweeps,
          'reproducibility': {'relativeHalfWidth': .15, 'confidenceLevel': None,
                              'semantics': 'Reported reproducibility; dependence/covariance unspecified'},
          'diagnostic': 'Apparent neutral Doppler velocity, not Abel-deprojected bulk gas speed'}
destination = Path(sys.argv[1])
destination.parent.mkdir(parents=True, exist_ok=True)
with destination.open('x') as stream:
    json.dump(packet, stream, indent=2, allow_nan=False)
print(json.dumps(packet, indent=2))
