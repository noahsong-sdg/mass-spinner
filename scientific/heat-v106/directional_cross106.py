"""Fixed-input 0/1us directional diagnostic, never a replacement gate matrix."""
import gzip
import json
import os
from pathlib import Path
import resource
import subprocess
import sys
import time

import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
import campaign106
from reconstruction101 import mesh
import audit99
sys.path.insert(0, str(HERE.parent/'spatial-v100'))
import independent100

old = campaign106.old
TIMES = (0., 1e-6)
PROTOCOL = dict(scope='Directional refinement diagnostic; not the original qualification matrix',
    originalGatesReplaced=False, originalFailuresSuperseded=False, qualificationGatesScored=False,
    physicalInputsChanged=False, currentFitted=False, velocityFitted=False, targetVelocityRead=False,
    experimentalQualification=False, conditionalRelease=True, thermalSteadyState=False,
    cfl=.1, maxDtS=1e-7, timesS=TIMES, reused=[(2, 2), (4, 4)], added=[(4, 2), (2, 4)],
    initialization='Original source profiles and mesh-dependent steady torsion; q0 differences retained',
    comparison='Unchanged audit99 exact-panel metrics plus independent100 cylindrical restriction',
    interpretation='Regional discrepancies are discrete differences, not continuum error. '
        'Widths/sqrt(local diffusivity*time) are dimensional indicators, not measured layers; '
        'snapshot diffusivity is not time-integrated. Thermal alpha=kappa/(rho*cv) belongs '
        'to the frozen-density heat split; walls are adiabatic, not fixed-temperature.')


def write(path, value):
    with path.open('x') as stream:
        stream.write(json.dumps(value, indent=2, allow_nan=False)+'\n')


def sources():
    extra = ('heat-v106/directional_cross106.py', 'coupled-v99/audit99.py',
             'meridional-v86/audit86.py', 'spatial-v100/independent100.py')
    return {**campaign106.sources(), **{'scientific/'+name: old.sha((HERE.parent/name).read_bytes())
                                      for name in extra}}


def inputs(source):
    packet = json.loads(source.read_bytes())
    fixed = campaign106.baseline.baseline.reference.campaign100.baseline()
    if (packet['sourceSHA256'] != campaign106.sources()
            or packet['radialBalanceMethod'] != campaign106.METHOD
            or packet['manifest'] != fixed['manifest'] or packet['scenario'] != fixed['scenarios'][0]
            or packet['baselinePredictionSHA256'] != old.BASELINE
            or packet['timesS'] != [0., 1e-6, 2e-6, 4e-6]):
        raise ValueError('Require the frozen, unchanged V106 producer and physical inputs')
    jobs = {(c['refinement'], c['cfl']) for c in packet['cases']}
    if len(packet['cases']) != 5 or jobs != set(campaign106.JOBS) or any(c['completed'] is not True for c in packet['cases']):
        raise ValueError('Require all five original V106 cases; preserve their study separately')
    for flag in ('targetVelocityRead', 'currentFitted', 'velocityFitted', 'experimentalQualification'):
        if packet[flag] is not False:
            raise ValueError('Unexpected fitting or qualification claim')
    return packet


def read_field(directory, row):
    entry = row['fieldPacket']; path = (directory/entry['path']).resolve()
    if row['completed'] is not True or path.parent != directory.resolve()/'fields':
        raise ValueError('Require complete contained fields')
    packed = path.read_bytes(); raw = gzip.decompress(packed)
    if old.sha(packed) != entry['sha256'] or old.sha(raw) != entry['rawSHA256']:
        raise ValueError('Field packet seal mismatch')
    return json.loads(raw)


def retain(out, label, state, rn, zn, **metadata):
    if [s['timeS'] for s in state['snapshots']] != list(TIMES):
        raise ValueError('Diagnostic snapshot clocks changed')
    r, z = mesh(rn, 'smooth-source-aligned')[0], mesh(zn, 'smooth-source-aligned')[1]
    for actual, expected in zip((state['radialEdgesM'], state['axialEdgesM']), (r, z)):
        if not np.array_equal(actual, expected):
            raise ValueError('Directional geometry changed')
    if state['cfl'] != .1 or not state['history'] or state['history'][-1]['timeS'] != TIMES[-1]:
        raise ValueError('Diagnostic CFL or history changed')
    raw = json.dumps(state, separators=(',', ':'), allow_nan=False).encode()
    packed = gzip.compress(raw, mtime=0); name = 'fields/'+label+'.json.gz'
    with (out/name).open('xb') as stream:
        stream.write(packed)
    row = dict(label=label, radialRefinement=rn, axialRefinement=zn, nr=len(r)-1, nz=len(z)-1,
        completed=True, cfl=.1, maxDtS=1e-7, sourceClocksS=list(TIMES),
        stepCount=len(state['history']), fieldPacket=dict(path=name, sha256=old.sha(packed),
        rawSHA256=old.sha(raw)), **metadata)
    write(out/(label+'.json'), row)
    return row


def worker(out, source, rn, zn):
    if (rn, zn) not in ((4, 2), (2, 4)):
        raise ValueError('Worker pair must be one of the two declared directional additions')
    packet = inputs(source)
    seals = sources(); old.TIMES = TIMES
    old.mesh = lambda _: (mesh(rn, 'smooth-source-aligned')[0], mesh(zn, 'smooth-source-aligned')[1])
    started = time.monotonic()
    state = old.evolve(packet['scenario'], packet['manifest'], 1, .1)
    if seals != sources():
        raise ValueError('Diagnostic source changed during execution')
    retain(out, f'r{rn}-z{zn}', state, rn, zn, reused=False,
        elapsedS=time.monotonic()-started, peakResidentKiB=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss)


def probes(state, viscosity):
    f = old.Flow(state['radialEdgesM'], state['axialEdgesM'], [old.M_AR, old.M_AR])
    rows = []
    def rms(value):
        return float(np.sqrt(np.sum(f.volume*value**2)/f.volume.sum()))
    for snapshot in state['snapshots']:
        q = np.asarray(snapshot['q']); p = f.primitive(q)
        nu = viscosity/p['densityKgM3']; row = dict(timeS=snapshot['timeS'])
        if snapshot['timeS'] == 0.:
            radial, axial = f.fluxes(q)
            dr = (radial[0, :, :-1]-radial[0, :, 1:])/f.volume
            dz = (axial[0, :-1]-axial[0, 1:])/f.volume
            left, right = f._face_states(p, 2)
            square = (dr+dz)**2; norm = float(np.sum(f.volume*square))
            row.update(initialMassRHSRMSKgM3S=rms(dr+dz), radialMassRHSRMSKgM3S=rms(dr),
                axialMassRHSRMSKgM3S=rms(dz), maximumRadialFacePressureJumpPa=float(np.max(abs(left[1]-right[1]))),
                initialMassRHSSquaredFractions={name: float(np.sum(volume*square)/norm) if norm else 0.
                    for name, volume in independent100.regions(state).items()})
        else:
            def summary(value):
                return dict(minimum=float(value.min()), median=float(np.median(value)), maximum=float(value.max()))
            for name, diffusivity in (('viscous', nu), ('thermal', 2.5*nu)):
                length = np.sqrt(diffusivity*snapshot['timeS'])
                row[name] = dict(endwallWidthToLength=summary(np.diff(f.z)[-1]/length[-1]),
                    outerWallWidthToLength=summary(np.diff(f.r)[-1]/length[:, -1]))
        rows.append(row)
    return rows


def main(out, source):
    packet = inputs(source); source_sha = old.sha(source.read_bytes()); seals = sources()
    out.mkdir(parents=True, exist_ok=False); (out/'fields').mkdir()
    result = dict(protocol=PROTOCOL, sourcePredictionSHA256=source_sha,
        sourceSHA256=seals, manifest=packet['manifest'], scenario=packet['scenario'],
        originalSourceClocksS=packet['timesS'], cases=[], comparisons=[])
    for n in (2, 4):
        original = next(c for c in packet['cases'] if c['refinement'] == n and c['cfl'] == .1)
        state = read_field(source.parent, original)
        if [s['timeS'] for s in state['snapshots']] != packet['timesS']:
            raise ValueError('Original V106 field clocks changed')
        state['snapshots'] = state['snapshots'][:2]
        state['history'] = [h for h in state['history'] if h['timeS'] <= TIMES[-1]]
        result['cases'].append(retain(out, f'r{n}-z{n}', state, n, n, reused=True,
            originalFieldPacket=original['fieldPacket'], originalSourceClocksS=packet['timesS']))
    env = dict(os.environ, OPENBLAS_NUM_THREADS='1', OMP_NUM_THREADS='1')
    for rn, zn in ((4, 2), (2, 4)):
        label = f'r{rn}-z{zn}'
        with (out/(label+'.log')).open('x') as log:
            subprocess.run([sys.executable, str(Path(__file__).resolve()), '--worker', str(out),
                str(source), str(rn), str(zn)], env=env, stdout=log, stderr=subprocess.STDOUT, check=True)
        result['cases'].append(json.loads((out/(label+'.json')).read_bytes()))
        print('FINISHED', label, flush=True)
    states = {row['label']: read_field(out, row) for row in result['cases']}
    result['probes'] = {label: probes(state, packet['manifest']['viscosityPaS']) for label, state in states.items()}
    pairs = (('r2-z2', 'r4-z2'), ('r2-z2', 'r2-z4'), ('r2-z2', 'r4-z4'),
             ('r4-z2', 'r4-z4'), ('r2-z4', 'r4-z4'))
    for a, b in pairs:
        for ti, clock in enumerate(TIMES):
            result['comparisons'].append(dict(pair=[a, b], timeS=clock,
                exactPanels={str(order): audit99.metrics(states[a], states[b], ti, order) for order in (2, 3)},
                cylindricalRestriction=independent100.compare(states[a], states[b], ti)))
    if seals != sources() or source_sha != old.sha(source.read_bytes()):
        raise ValueError('Producer or source dataset changed during diagnostic')
    write(out/'summary.json', result)


if __name__ == '__main__':
    if sys.platform != 'linux' or os.getuid() != 1000:
        raise RuntimeError('Execute only inside safe-dev')
    if sys.argv[1] == '--worker':
        worker(Path(sys.argv[2]).resolve(), Path(sys.argv[3]).resolve(), int(sys.argv[4]), int(sys.argv[5]))
    else:
        main(Path(sys.argv[1]).resolve(), Path(sys.argv[2]).resolve())
