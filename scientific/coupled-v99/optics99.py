"""Reuse the frozen two-sided PyAbel/Doppler diagnostic; seal before scoring."""
import gzip
import json
from pathlib import Path
import sys
import numpy as np
from campaign99 import HERE, TIMES, sha

V80 = HERE.parent/'optical-v80'
TARGET_SHA256 = '1e4f542dab2cdd777673f724ec3038e0223589797fa290765c0e1c8f047b4741'
sys.path.insert(0, str(V80))
sys.path.insert(0, str(HERE.parent/'meridional-v86'))
import optical86 as optical
study = optical.load('study80_for99', V80/'study.py')
fourier = optical.load('fourier86_for99', HERE.parent/'meridional-v86-independent/fourier86.py')


def inputs():
    files = list(V80.glob('*.py'))+[V80/'brightness-independent.json', V80/'locations.json',
        Path(__file__), HERE.parent/'meridional-v86/optical86.py', Path(fourier.__file__)]
    return {str(p.relative_to(HERE.parent.parent)):sha(p.read_bytes()) for p in files}


def load_field(directory, case):
    packet = case['fieldPacket']; path = (directory/packet['path']).resolve()
    if path.parent != directory.resolve()/'fields': raise ValueError('Field outside sealed directory')
    packed = path.read_bytes(); raw = gzip.decompress(packed)
    if sha(packed) != packet['sha256'] or sha(raw) != packet['rawSHA256']:
        raise ValueError('Stale field packet')
    field = json.loads(raw)
    if [s['timeS'] for s in field['snapshots']] != list(TIMES): raise ValueError('Changed clock inventory')
    return field


def predict(directory):
    raw = (directory/'predictions.json').read_bytes(); flow = json.loads(raw)
    rows = [c for c in flow['cases'] if (c['refinement'], c['cfl']) == (4, .1)]
    if len(rows) != 1 or rows[0]['completed'] is not True:
        raise ValueError('Missing finest conditional trajectory')
    field = load_field(directory, rows[0])
    brightness = study.extract(json.loads((V80/'brightness-independent.json').read_text()))
    locations = json.loads((V80/'locations.json').read_text())['points']
    index = dict(predictionSHA256=sha(raw), sourceSHA256=inputs(), targetVelocityRead=False,
        experimentalQualification=False, groups=[], diagnosticScope='First axial cell layer as near-midplane proxy; frozen thermal/emissivity alternatives, not evolved-temperature spectra')
    (directory/'optics').mkdir(exist_ok=False)
    for i, snapshot in enumerate(field['snapshots']):
        print('OPTICS', snapshot['timeS'], flush=True)
        value = optical.predict(field['radialEdgesM'], snapshot['omegaRadS'][0],
            snapshot['vrMPS'][0], brightness, locations, spectrum_fn=fourier.spectrum)
        payload = json.dumps(value, default=study.serializable, separators=(',', ':'), allow_nan=False).encode()
        packed = gzip.compress(payload, mtime=0); name = f'optics/t{i}.json.gz'
        (directory/name).write_bytes(packed)
        index['groups'].append(dict(timeS=snapshot['timeS'], path=name,
            sha256=sha(packed), rawSHA256=sha(payload)))
        (directory/'optical-index.json').write_text(json.dumps(index, indent=2)+'\n')
    if inputs() != index['sourceSHA256'] or sha((directory/'predictions.json').read_bytes()) != index['predictionSHA256']:
        raise ValueError('Inputs changed during optical prediction')


def score(directory):
    raw = (directory/'optical-index.json').read_bytes(); index = json.loads(raw)
    if (index['sourceSHA256'] != inputs() or index['targetVelocityRead'] is not False
            or index['experimentalQualification'] is not False
            or [g['timeS'] for g in index['groups']] != list(TIMES)
            or sha((directory/'predictions.json').read_bytes()) != index['predictionSHA256']):
        raise ValueError('Stale or incomplete optical prediction')
    target = (HERE.parent/'profile-v79/results/score.json').read_bytes()
    if sha(target) != TARGET_SHA256: raise ValueError('Frozen measured target changed')
    points = json.loads(target)['points']
    scorer = optical.load('compare80_for99', V80/'compare.py')
    result = dict(opticalIndexSHA256=sha(raw), targetSHA256=sha(target),
        experimentalQualification=False, velocityFitted=False, currentFitted=False,
        retrospectiveDevelopmentData=True, conditionalRelease=True, velocityScreenOnly=True,
        diagnosticScope=index['diagnosticScope'], groups=[])
    for entry in index['groups']:
        path = (directory/entry['path']).resolve()
        if path.parent != directory.resolve()/'optics': raise ValueError('Invalid optical path')
        packed = path.read_bytes(); payload = gzip.decompress(packed)
        if sha(packed) != entry['sha256'] or sha(payload) != entry['rawSHA256']:
            raise ValueError('Stale optical packet')
        prediction = json.loads(payload); scored = scorer.score(prediction, points)
        for row in scored['cases']:
            closure = next(c for c in prediction['cases'][0]['closures'] if c['edgeClosure'] == row['edgeClosure'])
            spectra = [s for s in closure['spectra'] if s['temperatureK'] == row['temperatureK']
                and s['instrumentSigmaMS'] == row['instrumentSigmaMS']]
            row['losQuadratureGate'] = all(s['losQuadratureGate'] for s in spectra)
        if len(scored['cases']) != 72: raise ValueError('Incomplete diagnostic alternatives')
        result['groups'].append(dict(timeS=entry['timeS'], **scored))
    (directory/'comparison.json').write_text(json.dumps(result, indent=2, allow_nan=False)+'\n')
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    fig, axes = plt.subplots(1, 4, figsize=(13, 3.6), constrained_layout=True, sharey=True)
    x = np.array([p['radiusM'] for p in points])*100
    y = np.array([p['velocityMS'] for p in points])
    for ax, group in zip(axes, result['groups']):
        values = np.array([r['predictionMS'] for r in group['cases']])
        ax.fill_between(x, values.min(axis=0), values.max(axis=0), alpha=.3, label='All diagnostic alternatives')
        ax.plot(x, y, 'ko', label='Published Ar I')
        ax.set(title=f"{group['timeS']*1e6:g} µs", xlabel='Sightline offset (cm)')
        ax.grid(alpha=.15)
        print('SCORE', group['timeS'], group['anyAllPointPass'],
            min(r['worstRelative'] for r in group['cases']), max(r['worstRelative'] for r in group['cases']), flush=True)
    axes[0].set_ylabel('Doppler speed (m/s)'); axes[-1].legend(fontsize=7)
    fig.suptitle('Conditional near-midplane proxy; frozen thermal alternatives; not steady discharge')
    fig.savefig(directory/'argon-comparison.png', dpi=150); plt.close(fig)


if __name__ == '__main__':
    directory = Path(sys.argv[2]).resolve()
    if sys.argv[1] == 'predict': predict(directory)
    elif sys.argv[1] == 'score': score(directory)
    else: raise ValueError('Phase must be predict or score')
