"""Standalone research evidence figure; no production imports or live controls.

Usage: python plot.py study-02.json convergence-02.json validation.png
Run only in safe-dev. Geometry depicts a constrained numerical domain, not a
Marathon engineering specification. Convergence errors use finite references.
"""
import argparse
import json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('study', type=Path)
    parser.add_argument('convergence', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    raw, convergence = [json.loads(p.read_text()) for p in (args.study, args.convergence)]
    if raw['manifest'] != convergence['manifest']:
        raise ValueError('Raw study and convergence manifests disagree')
    level = raw['manifest']['joint'][-1]
    nr, nz, nt = (level[0], level[0], level[1]) if len(level) == 2 else level
    reference = [t for t in raw['cases'] if (t['n'], t.get('nz', t['n']), t['nt'], t['tight'])
                 == (nr, nz, nt, False)]
    if len(reference) != 1:
        raise ValueError('Need exactly one declared joint-reference trajectory')
    case = max(reference[0]['cases'], key=lambda c: c['timeS'])
    setup, result = case['setup'], case['result']
    r, z = np.array(setup['r']), np.array(setup['z'])
    volume = np.pi*np.diff(z)[:, None]*np.diff(r*r)[None, :]
    total_nr = nr+len(setup['wall'])-1
    temperature = np.array(result['temperatureK']).reshape(nz, total_nr)[:, :nr]
    mechanical = result['mechanical']
    omega = np.array(mechanical['omegaRadS']).reshape(nz, nr)
    joule = np.array(mechanical['current']['jouleByCellW']).reshape(nz, nr)/volume
    shear = np.array(mechanical['shearByCellW']).reshape(nz, nr)/volume
    if not all(np.all(np.isfinite(f)) for f in (temperature, omega, joule, shear)):
        raise ValueError('Cannot plot nonfinite physical fields')
    if np.any(joule < 0) or np.any(shear < 0):
        raise ValueError('Physical Joule and viscous dissipation must be nonnegative')
    fig, axes = plt.subplots(2, 3, figsize=(14, 8), constrained_layout=True)
    for ax, field, title, unit, cmap in (
            (axes[0, 0], temperature, 'Gas temperature', 'K', 'cividis'),
            (axes[0, 1], omega, 'Angular speed', 'rad/s', 'cividis'),
            (axes[0, 2], joule, 'Joule heating', 'W/m³', 'magma'),
            (axes[1, 0], shear, 'Viscous heating', 'W/m³', 'magma')):
        bounds = dict(vmin=0., vmax=float(field.max()) or 1.) if unit == 'W/m³' else {}
        image = ax.pcolormesh(r, z, field, shading='flat', cmap=cmap, **bounds)
        ax.set(title=title, xlabel='r (m)', ylabel='z (m)')
        fig.colorbar(image, ax=ax, label=unit)
    for ax, name, xlabel in ((axes[1, 1], 'joint', 'Cells per coordinate'),
                             (axes[1, 2], 'temporal', 'Timesteps')):
        comparisons = convergence['series'][name]['comparisons']
        for field, label in (('gas', 'Gas T'), ('solid', 'Wall T'), ('omega', 'Ω')):
            pairs = sorted((c['nr'] if name == 'joint' else c['nt'],
                            100*max(row['profiles'][field]['rmsNormalized'] for row in c['cases']))
                           for c in comparisons)
            ax.plot(*zip(*pairs), marker='o', label=label)
        ax.set(xlabel=xlabel, ylabel='Maximum scheduled RMS error (%)',
               title=f'{name.capitalize()} refinement', xscale='log', yscale='log')
        ax.grid(True, which='both', alpha=.2)
        ax.legend(frameon=False)
    fig.suptitle(f'Constrained r–z numerical model · {nr} × {nz} gas cells · t = {case["timeS"]:g} s\n'
                 'Fixed density; no meridional flow. Errors relative to finite numerical references.', fontsize=12)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(args.output, dpi=180)
    plt.close(fig)


if __name__ == '__main__':
    main()
