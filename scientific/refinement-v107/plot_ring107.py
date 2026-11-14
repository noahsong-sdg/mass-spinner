"""Plot sealed common-point diagnostics; descriptive profiles, not error gates."""
import gzip
import hashlib
import json
from pathlib import Path
import sys

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np


def main(source, output):
    output.mkdir(exist_ok=False)
    summary_raw = (source/'summary.json').read_bytes()
    summary = json.loads(summary_raw)
    fig, axes = plt.subplots(2, 2, figsize=(11, 7), layout='constrained')
    rows = []
    for receipt, color in zip(summary['cases'], ('#9b6254', '#16848a', '#2a477e')):
        path = source/receipt['path']; packed = path.read_bytes(); raw = gzip.decompress(packed)
        if hashlib.sha256(packed).hexdigest() != receipt['sha256'] or \
                hashlib.sha256(raw).hexdigest() != receipt['rawSHA256']:
            raise ValueError('Changed diagnostic seal')
        data = json.loads(raw); r, z = (np.asarray(data[k]) for k in ('radialQueryM', 'axialQueryM'))
        iz, ir = int(np.argmin(abs(z-.228))), int(np.argmin(abs(r-.017)))
        row = data['snapshots'][-1]
        if row['timeS'] != 4e-6 or abs(z[iz]-.228) > 1e-15 or abs(r[ir]-.017) > 1e-15:
            raise ValueError('Require the declared common clock and point')
        s = {name: np.asarray(value)[iz] for name, value in row['samples'].items()}
        density = s['densityIncrementKgM3']; peak = float(density.max()); crossings = []
        for i in range(len(r)-1):
            a, b = density[i]-peak/2, density[i+1]-peak/2
            if a*b < 0:
                crossings.append(float(r[i]+(r[i+1]-r[i])*(-a)/(b-a)))
        if len(crossings) != 2:
            raise ValueError('Positive half-height feature is not enclosed by the sampled window')
        nr = int(receipt['label'].split('-')[0][1:])*20
        label = f'{nr} radial cells'
        axes[0, 0].plot(r*1000, density*1e5, color=color, label=label)
        axes[0, 1].plot(r*1000, s['vrMPS'], color=color)
        axes[1, 0].plot(r*1000, s['radial_total'], color=color)
        axes[1, 0].plot(r*1000, s['axial_total'], color=color, linestyle='--')
        axes[1, 1].plot(r*1000, s['radial_relativePressureJump']*100, color=color)
        rows.append(dict(label=receipt['label'], timeS=row['timeS'], axialCoordinateM=float(z[iz]),
            sampledPeakRadiusM=float(r[np.argmax(density)]), sampledPeakDensityIncrementKgM3=peak,
            halfHeightCrossingsM=crossings, sampledHalfHeightWidthM=crossings[1]-crossings[0],
            commonPoint=dict(radiusM=float(r[ir]), **{name:float(values[ir]) for name, values in s.items()})))
    labels = ('Density increment (10⁻⁵ kg m⁻³)', 'Radial velocity (m s⁻¹)',
              'Instantaneous density rate (kg m⁻³ s⁻¹)', 'Reconstructed radial pressure jump (%)')
    for ax, label in zip(axes.flat, labels):
        ax.set(xlabel='Radius (mm)', ylabel=label, xlim=(12, 24))
        ax.axhline(0, linewidth=.5, color='.6'); ax.grid(alpha=.15)
    axes[0, 0].legend(frameon=False)
    axes[1, 0].set_title('Solid: radial transport; dashed: axial transport', fontsize=10)
    fig.suptitle('Late density ring · z = 228 mm · t = 4 µs\n'
                 'Fixed Q1 point samples; descriptive profiles, not continuum error bounds', fontsize=12)
    fig.savefig(output/'ring-profiles.png', dpi=160)
    fig.savefig(output/'ring-profiles.svg')
    plt.close(fig)
    result = dict(sourceSummarySHA256=hashlib.sha256(summary_raw).hexdigest(),
        plotSourceSHA256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        interpretation='Sampled positive-increment half-height widths, not native-cell resolution or gate values',
        profiles=rows)
    (output/'profiles.json').write_text(json.dumps(result, indent=2, allow_nan=False)+'\n')


if __name__ == '__main__':
    main(*map(Path, sys.argv[1:]))
