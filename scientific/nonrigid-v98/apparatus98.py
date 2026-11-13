"""Matched conditional argon family, new FEM versus preserved FV predictions."""
import hashlib
import json
import os
from pathlib import Path
import sys
import time
import numpy as np
from fem98 import solve, sample, chords

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT/'scientific/electrical-v82'))
from model82 import properties

BASELINE = '5654356e7fca335d0bc66c35420eeb2665134e39c84f23a78c7cc625c9d5fc92'
KEYS = ('radiusM', 'halfLengthM', 'cathodeRadiusM', 'anodeCenterM',
        'anodeWidthM', 'magneticT', 'branchCurrentA', 'viscosityPaS', 'chordsM')


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def main(out):
    source = json.loads((ROOT/'transfer.json').read_text())
    def verify():
        for p, expected in source.items():
            if sha((ROOT/p).read_bytes()) != expected:
                raise ValueError('Source changed: '+p)
    verify()
    raw = (ROOT/'scientific/axial-v85/results/predictions.json').read_bytes()
    if sha(raw) != BASELINE:
        raise ValueError('Frozen V85 baseline changed')
    old = json.loads(raw)
    m = {k: old['manifest'][k] for k in KEYS}
    scenarios = old['scenarios']
    out.mkdir(exist_ok=False)
    result = dict(manifest=m, scenarios=scenarios, baselineSHA256=BASELINE,
                  sourceSHA256=source, cases=[], comparisons=[], currentFitted=False,
                  experimentalQualification=False, livePlaygroundQualified=False,
                  runtime=dict(python=sys.version, numpy=np.__version__,
                               scipy=__import__('scipy').__version__, skfem=__import__('skfem').__version__),
                  scope='Conditional angular-only model; uniform-emissivity centroid, not the experimental diagnostic')
    r = np.linspace(0, m['radiusM'], 161)
    z = np.linspace(0, m['halfLengthM'], 121)
    rr, zz = np.meshgrid(r, z)
    for scenario in scenarios:
        fields = {**properties(scenario), 'viscosity': 1.14e-4}
        for center in (.07, .08):
            profiles = []
            for n in (1, 2, 4):
                start = time.monotonic()
                state = solve({**m, 'anodeCenterM': center}, n, fields)
                speed = r*sample(state, r, 0.)
                chord = chords(state, m['chordsM'], m['radiusM'])
                name = f"{scenario['name']}-a{center}-n{n}"
                packet = out/(name+'.npz')
                angular = sample(state, rr, zz)
                np.savez_compressed(packet, radialM=r, axialM=z, omegaRadS=angular,
                                    localMidplaneMS=speed, uniformChordMS=chord)
                row = {k: v for k, v in state.items() if k not in ('basis', 'potential', 'omega', 'operators')}
                row.update(scenario=scenario['name'], anodeCenterM=center, packet=packet.name,
                           packetSHA256=sha(packet.read_bytes()), chordVelocityMS=chord.tolist(),
                           wallSeconds=time.monotonic()-start)
                result['cases'].append(row)
                profiles.append((speed, chord, state['viscousW'], angular))
                (out/'predictions.json').write_text(json.dumps(result, indent=2, allow_nan=False)+'\n')
                print('CASE', name, row['wallSeconds'], 'torque error', row['torqueResidualRelative'], flush=True)
            base = next(c for c in old['cases'] if c['scenario'] == scenario['name'] and
                        c['anodeCenterM'] == center and c['refinement'] == 8)
            old_chord = np.array(base['prediction']['chordVelocityMS'])
            relative = lambda a, b: float(np.max(abs(a-b))/np.max(abs(b)))
            fine = profiles[-1][1]
            result['comparisons'].append(dict(scenario=scenario['name'], anodeCenterM=center,
                chordCoarseChange=relative(profiles[0][1], profiles[1][1]),
                chordFineChange=relative(profiles[1][1], fine),
                localCoarseChange=relative(profiles[0][0], profiles[1][0]),
                localFineChange=relative(profiles[1][0], profiles[2][0]),
                viscousCoarseChange=relative(profiles[0][2], profiles[1][2]),
                viscousFineChange=relative(profiles[1][2], profiles[2][2]),
                fieldCoarseChange=relative(profiles[0][3], profiles[1][3]),
                fieldFineChange=relative(profiles[1][3], profiles[2][3]),
                independentFVChordDifference=relative(fine, old_chord)))
            (out/'predictions.json').write_text(json.dumps(result, indent=2, allow_nan=False)+'\n')
            verify()
    result['numericalGates'] = dict(
        conservation=all(row[k] < 1e-8 for row in result['cases'] for k in
            ('chargeResidualRelative', 'momentumResidualRelative', 'linearResidualRelative',
             'powerResidualRelative', 'torqueResidualRelative', 'wallTorqueResidualRelative')),
        refinement=all(row['chordFineChange'] < .05 and row['localFineChange'] < .05 and
            row['viscousFineChange'] < .05 and row['fieldFineChange'] < .05 and
            row['chordFineChange'] < row['chordCoarseChange'] and
            row['localFineChange'] < row['localCoarseChange'] and
            row['viscousFineChange'] < row['viscousCoarseChange'] and
            row['fieldFineChange'] < row['fieldCoarseChange'] for row in result['comparisons']),
        independentReference=all(row['independentFVChordDifference'] < .05 for row in result['comparisons']))
    (out/'predictions.json').write_text(json.dumps(result, indent=2, allow_nan=False)+'\n')
    print('GATES', json.dumps(result['numericalGates']), flush=True)


if __name__ == '__main__':
    if sys.platform != 'linux' or os.getuid() != 1000:
        raise RuntimeError('Execute only inside safe-dev')
    main(Path(sys.argv[1]))
