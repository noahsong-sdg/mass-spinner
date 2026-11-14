"""Plot sealed hydro-only controls; this is not full-study qualification."""
import json
from pathlib import Path
import sys

import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import numpy as np

MESHES = ('original', 'smooth-source-aligned')
REFINEMENTS = (1, 2, 4)
CONSTANTS = dict(temperatureK=3000., wallDensityKgM3=.001,
                 omegaRadS=20000., endS=1e-7, cfl=.1)
FLOW = 'mixture-axial-v75/flow.py'
FLOW_SHA = ('9540aaf9fb80a4135ca7a42337830201c70e395174a808e2c86e05b7a382d1bc',
            'dcaf66d1d8506853b1b45468d7908adce967f88813a0b0a7426ad58be683a3f7')


def reports(old, new):
    inventory = {(mesh, n, omega, representation) for mesh in MESHES
        for n in REFINEMENTS for omega in (0., 20000.)
        for representation in ('native-primitives', 'conservative-moments')}
    indexed = []
    for report, changed in ((old, False), (new, True)):
        if (report['constants'] != CONSTANTS or report['experimentalQualification'] is not False
                or report['productionMethodChanged'] is not changed):
            raise ValueError('Unexpected equilibrium constants or method metadata')
        rows = {}
        for row in report['cases']:
            key = tuple(row[k] for k in ('mesh', 'refinement', 'omegaRadS', 'representation'))
            if key not in inventory or key in rows:
                raise ValueError('Unexpected or repeated equilibrium case')
            mesh, n, _, _ = key
            transient = row['transient']
            speed = transient['radialSpeedRMSMPS']
            if (row['nr'] != (16 if mesh == 'original' else 20)*n
                    or row['nz'] != 24*n or transient['endS'] != CONSTANTS['endS']
                    or not np.isfinite(speed) or speed < 0):
                raise ValueError('Invalid equilibrium geometry, clock or speed')
            rows[key] = speed
        if set(rows) != inventory:
            raise ValueError('Incomplete 24-case equilibrium inventory')
        indexed.append(rows)
    a, b = old['sourceSHA256'], new['sourceSHA256']
    if (set(a) != set(b) or FLOW not in a or (a[FLOW], b[FLOW]) != FLOW_SHA
            or any(a[k] != b[k] for k in a if k != FLOW)):
        raise ValueError('Controls must differ only in the declared flow method')
    return indexed


def limiter_rows(probe):
    inventory = {(method, mesh, amplitude) for method in ('Flow', 'Unlimited')
                 for mesh in ('smooth-source-aligned', 'uniform') for amplitude in (-.05, .05)}
    rows = {}
    for row in probe:
        key = tuple(row[k] for k in ('method', 'mesh', 'amplitude'))
        values = np.asarray(row['errors'], dtype=float)
        if (key not in inventory or key in rows or values.shape != (4,)
                or not np.all(np.isfinite(values)) or np.any(values <= 0)):
            raise ValueError('Invalid limiter probe case or logarithmic values')
        rows[key] = values
    if set(rows) != inventory:
        raise ValueError('Incomplete eight-case limiter inventory')
    return rows


def main(old_path, new_path, probe_path, output):
    old, new, probe = [json.loads(Path(p).read_text()) for p in (old_path, new_path, probe_path)]
    equilibrium, limiter = reports(old, new), limiter_rows(probe)
    fig, axes = plt.subplots(1, 2, figsize=(10, 4.4), layout='constrained')
    for rows, label, color in zip(equilibrium, ('Before', 'After'), ('#bd6a24', '#087e8b')):
        for mesh, marker, style in zip(MESHES, ('s', 'o'), ('--', '-')):
            values = [rows[mesh, n, 20000., 'native-primitives'] for n in REFINEMENTS]
            if min(values) <= 0:
                raise ValueError('Zero equilibrium speed cannot be shown on a logarithmic axis')
            axes[0].plot(REFINEMENTS, values, marker=marker, linestyle=style, color=color,
                         label=f'{label}: {"original" if mesh == "original" else "smooth"}')
    for method, label, color in (('Flow', 'Limited', '#087e8b'), ('Unlimited', 'Unlimited probe', '#69747c')):
        axes[1].plot((1, 2, 4, 8), limiter[method, 'smooth-source-aligned', -.05],
                     'o-', color=color, label=label)
    axes[0].set(title='Balanced rotating gas', ylabel='Radial RMS speed at 0.1 µs [m/s]')
    axes[1].set(title='Real pressure disturbance', ylabel='Relative radial-force RMS error')
    for axis, ticks in zip(axes, (REFINEMENTS, (1, 2, 4, 8))):
        axis.set_xscale('log', base=2); axis.set_yscale('log')
        axis.set_xticks(ticks, [str(n) for n in ticks]); axis.set_xlabel('Refinement factor')
        axis.grid(True, which='both', alpha=.18); axis.legend(fontsize=8)
    fig.suptitle('Hydro-only numerical controls — not apparatus predictions', fontsize=12)
    fig.supxlabel('Native equilibrium: Ω = 20,000 rad/s. Disturbance: amplitude −0.05, smooth mesh.\n'
                  'All coarse points retained. These controls do not qualify the full coupled spatial study.', fontsize=8)
    with Path(output).open('xb') as stream:
        fig.savefig(stream, format='png', dpi=180)
    plt.close(fig)


if __name__ == '__main__':
    main(*sys.argv[1:])
