"""One predeclared radial8/axial2 trial; no geometry tuning or replacement gates."""
import json
import os
from pathlib import Path
import resource
import subprocess
import sys
import time

import numpy as np

import directional_cross106 as cross

HERE = Path(__file__).resolve().parent
old = cross.old
ORIGINAL = '96098e86f874d1d5f65317a882a5f14df75685afc06ecc8a98cbd7a76e48a7b4'
CROSS = '6339cfda5463c5ca27568f999ffb97dcdf3bf8e1c820506025a7ae7be1124916'
PROTOCOL = dict(scope='Supplemental1us radial refinement; original six spatial failures remain',
    originalGatesReplaced=False, originalFailuresSuperseded=False, qualificationGatesScored=False,
    physicalInputsChanged=False, currentFitted=False, velocityFitted=False, targetVelocityRead=False,
    experimentalQualification=False, conditionalRelease=True, timesS=cross.TIMES, cfl=.1, maxDtS=1e-7,
    reused=[(2, 2), (4, 2)], added=[(8, 2)], geometry='Unchanged V101 smooth-source-aligned mapping',
    interpretation='q0 flux defects are not proof of later error causality. Mixed-grid initialization '
        'includes mesh-dependent steady torsion. Regional differences are not continuum errors; '
        'diffusion lengths are dimensional indicators, not measured layer thicknesses.')


def sources():
    names = ('heat-v106/radial_next106.py', 'heat-v106/test_radial_next106.py', 'spatial-v101/geometry101.py')
    return {**cross.sources(), **{'scientific/'+name: old.sha((HERE.parent/name).read_bytes()) for name in names}}


def geometry(rn, zn):
    if (rn, zn) not in ((2, 2), (4, 2), (8, 2)):
        raise ValueError('Only the predeclared radial sequence is admitted')
    return cross.mesh(rn, 'smooth-source-aligned')[0], cross.mesh(zn, 'smooth-source-aligned')[1]


def inputs(summary, original):
    if old.sha(original.read_bytes()) != ORIGINAL or old.sha(summary.read_bytes()) != CROSS:
        raise ValueError('Require pinned original V106 and passed directional cross')
    packet = cross.inputs(original)
    data = json.loads(summary.read_bytes())
    if (data['sourcePredictionSHA256'] != ORIGINAL or data['sourceSHA256'] != cross.sources()
            or data['manifest'] != packet['manifest'] or data['scenario'] != packet['scenario']
            or data['protocol'] != json.loads(json.dumps(cross.PROTOCOL))):
        raise ValueError('Directional input sources, protocol or physical inputs changed')
    levels = {(row['radialRefinement'], row['axialRefinement']) for row in data['cases']}
    if len(data['cases']) != 4 or levels != {(2, 2), (4, 2), (2, 4), (4, 4)}:
        raise ValueError('Require the complete sealed directional cross')
    for row in data['cases']:
        state = cross.read_field(summary.parent, row)
        if [s['timeS'] for s in state['snapshots']] != list(cross.TIMES):
            raise ValueError('Cross field clocks changed')
    return data, packet


def worker(out, original, summary):
    data, packet = inputs(summary, original)
    seals = sources(); old.TIMES = cross.TIMES
    old.mesh = lambda _: geometry(8, 2)
    started = time.monotonic()
    state = old.evolve(packet['scenario'], packet['manifest'], 1, .1)
    if seals != sources():
        raise ValueError('Radial diagnostic source changed during execution')
    inputs(summary, original)
    cross.retain(out, 'r8-z2', state, 8, 2, reused=False, elapsedS=time.monotonic()-started,
        peakResidentKiB=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss)


def main(out, original, summary):
    data, packet = inputs(summary, original); seals = sources()
    out.mkdir(parents=True, exist_ok=False); (out/'fields').mkdir()
    result = dict(protocol=PROTOCOL, originalPredictionSHA256=ORIGINAL, crossSummarySHA256=CROSS,
        sourceSHA256=seals, manifest=packet['manifest'], scenario=packet['scenario'],
        originalSourceClocksS=packet['timesS'], cases=[], comparisons=[])
    for rn in (2, 4):
        row = next(c for c in data['cases'] if (c['radialRefinement'], c['axialRefinement']) == (rn, 2))
        state = cross.read_field(summary.parent, row)
        result['cases'].append(cross.retain(out, f'r{rn}-z2', state, rn, 2,
            reused=True, originalCrossFieldPacket=row['fieldPacket']))
    env = dict(os.environ, OPENBLAS_NUM_THREADS='1', OMP_NUM_THREADS='1')
    with (out/'r8-z2.log').open('x') as log:
        subprocess.run([sys.executable, str(Path(__file__).resolve()), '--worker', str(out),
            str(original), str(summary)], env=env, stdout=log, stderr=subprocess.STDOUT, check=True)
    result['cases'].append(json.loads((out/'r8-z2.json').read_bytes()))
    print('FINISHED', 'r8-z2', result['cases'][-1]['elapsedS'], result['cases'][-1]['peakResidentKiB'], flush=True)
    states = {row['label']: cross.read_field(out, row) for row in result['cases']}
    result['probes'] = {label: cross.probes(state, packet['manifest']['viscosityPaS'])
                        for label, state in states.items()}
    for a, b in (('r2-z2', 'r4-z2'), ('r4-z2', 'r8-z2')):
        for ti, clock in enumerate(cross.TIMES):
            comparison = dict(pair=[a, b], timeS=clock,
                exactPanels={str(order): cross.audit99.metrics(states[a], states[b], ti, order) for order in (2, 3)},
                cylindricalRestriction=cross.independent100.compare(states[a], states[b], ti))
            if a == 'r2-z2':
                previous = next(c for c in data['comparisons'] if c['pair'] == [a, b] and c['timeS'] == clock)
                if comparison != previous:
                    raise ValueError('Reused pair does not reproduce sealed cross metrics exactly')
            result['comparisons'].append(comparison)
            if clock:
                print('RADIAL', a, b, clock, {name: comparison['exactPanels']['2'][name]['value']
                    for name in ('densityKgM3/increment', 'vrMPS')}, flush=True)
    if seals != sources():
        raise ValueError('Radial diagnostic sources changed')
    inputs(summary, original)
    cross.write(out/'summary.json', result)


if __name__ == '__main__':
    if sys.platform != 'linux' or os.getuid() != 1000:
        raise RuntimeError('Execute only inside safe-dev')
    if sys.argv[1] == '--worker':
        worker(*map(lambda p: Path(p).resolve(), sys.argv[2:]))
    else:
        main(*map(lambda p: Path(p).resolve(), sys.argv[1:]))
