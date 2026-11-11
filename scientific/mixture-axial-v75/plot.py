"""Numerical research evidence, not a Marathon device render or experiment.

CLI: python plot.py raw.json convergence.json output.png. Run in safe-dev.
Primitive reconstruction shares the analysis layer, not an independent solver.
"""
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from analyze import primitives


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('raw', type=Path)
    parser.add_argument('convergence', type=Path)
    parser.add_argument('output', type=Path)
    args = parser.parse_args()
    raw, convergence = [json.loads(p.read_text()) for p in (args.raw, args.convergence)]
    canonical = json.loads(Path(__file__).with_name('manifest.json').read_text())
    if raw['manifest'] != canonical or convergence['manifest'] != canonical:
        raise ValueError('Raw/convergence/canonical manifests disagree')
    if 'inputHashes' in convergence and convergence['inputHashes'] != {
            args.raw.name: hashlib.sha256(args.raw.read_bytes()).hexdigest()}:
        raise ValueError('Convergence report binds a different raw artifact')
    nr, nz, nt = canonical['joint'][-1]
    candidates = [t for t in raw['cases'] if (t['nr'], t['nz'], t['nt'], t['mode']) == (nr, nz, nt, 'base')]
    if len(candidates) != 1:
        raise ValueError('Need exactly one declared joint-reference trajectory')
    trajectory = candidates[0]
    endpoint = max(trajectory['cases'], key=lambda c: c['timeS'])
    fields = primitives(trajectory, endpoint)
    r, z = [np.asarray(trajectory['setup'][key]) for key in ('r', 'z')]
    fig, axes = plt.subplots(2, 3, figsize=(14, 8), constrained_layout=True)
    for ax, name, title, unit in ((axes[0, 0], 'density', 'Mass density', 'kg/m³'),
                                 (axes[0, 1], 'Y', 'Light-isotope mass fraction', 'kg/kg'),
                                 (axes[0, 2], 'gas', 'Gas temperature', 'K'),
                                 (axes[1, 0], 'omega', 'Angular speed', 'rad/s')):
        image = ax.pcolormesh(r, z, fields[name], shading='flat', cmap='cividis')
        ax.set(title=title, xlabel='r (m)', ylabel='z (m)')
        fig.colorbar(image, ax=ax, label=unit)
    masses = trajectory['setup']['masses']
    pressure = 1.380649e-23*fields['gas']*fields['density']*(fields['Y']/masses[0]+(1-fields['Y'])/masses[1])
    ax = axes[1, 1]
    image = ax.pcolormesh(r, z, pressure, shading='flat', cmap='Greys')
    fig.colorbar(image, ax=ax, label='Pa')
    speed = float(np.max(np.hypot(fields['vr'], fields['vz'])))
    if speed > 0:
        stride_r, stride_z = max(1, nr//12), max(1, nz//12)
        rr, zz = np.meshgrid((r[:-1]+r[1:])/2, (z[:-1]+z[1:])/2)
        sample = (slice(None, None, stride_z), slice(None, None, stride_r))
        arrows = ax.quiver(rr[sample], zz[sample], fields['vr'][sample], fields['vz'][sample],
                           angles='xy', scale_units='xy', scale=speed/(.18*r[-1]), color='#b54a16')
        ax.quiverkey(arrows, .7, 1.04, speed, f'{speed:.2g} m/s', labelpos='E')
    ax.set(title='Pressure and meridional velocity', xlabel='r (m)', ylabel='z (m)')
    ax = axes[1, 2]
    comparisons = convergence['series']['joint']['comparisons']
    for name, label in (('density', 'ρ'), ('Y', 'Y'), ('gas', 'Gas T'), ('omega', 'Ω')):
        pairs = sorted((c['nr'], 100*max(row['profiles'][name]['rmsNormalized'] for row in c['cases']))
                       for c in comparisons)
        x, error = np.asarray(pairs).T
        if not np.all(np.isfinite(error)) or np.any(error < 0):
            raise ValueError('Cannot plot invalid refinement errors')
        positive = error > 0
        if np.any(positive):
            ax.plot(x[positive], error[positive], marker='o', label=label)
    ax.set(title='Joint refinement', xlabel='Radial / axial cells', ylabel='Maximum scheduled RMS error (%)',
           xscale='log', yscale='log')
    ax.grid(True, which='both', alpha=.2)
    if ax.lines:
        ax.legend(frameon=False)
    status = 'PASS' if convergence.get('numericallyQualified') is True else 'NOT QUALIFIED'
    fig.suptitle(f'r–z binary research model · {nr} × {nz} · t = {endpoint["timeS"]*1e6:g} μs · refinement {status}\n'
                 'Finite-reference errors; positive RMS points only. Not a Marathon device or experimental validation.', fontsize=12)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(args.output, dpi=180)
    plt.close(fig)


if __name__ == '__main__':
    main()
