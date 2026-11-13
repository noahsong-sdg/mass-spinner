"""Show every conditional case with shared physical axes and color scaling."""
import json
from pathlib import Path
import sys
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt


def main(directory):
    data = json.loads((directory/'predictions.json').read_text())
    rows = [c for c in data['cases'] if c['refinement'] == 4]
    packets = []
    for row in rows:
        with np.load(directory/row['packet'], allow_pickle=False) as p:
            packets.append({k: p[k] for k in p.files})
    maximum = max(float(np.max(p['omegaRadS']*p['radialM'])) for p in packets)
    plt.style.use('dark_background')
    fig, axes = plt.subplots(2, 4, figsize=(15, 7), constrained_layout=True)
    for ax, row, p in zip(axes.T.flat, rows, packets):
        image = ax.pcolormesh(p['radialM']*100, p['axialM']*100,
            p['omegaRadS']*p['radialM'], shading='nearest', vmin=0, vmax=maximum, cmap='magma')
        ax.set(title=row['scenario']+'\nanode '+str(round(row['anodeCenterM']*100))+' cm',
               xlabel='Radius (cm)', ylabel='Distance from midplane (cm)')
    fig.colorbar(image, ax=axes, label='Azimuthal speed (m/s)', shrink=.8)
    fig.suptitle('Argon • 100 A per branch • 0.13 T\nConditional torsional flow; not experimental validation', fontsize=15)
    fig.savefig(directory/'nonrigid-argon.png', dpi=150)
    plt.close(fig)


if __name__ == '__main__':
    main(Path(sys.argv[1]))
