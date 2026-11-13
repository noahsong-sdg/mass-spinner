"""Alternating fresh-worker paired timings with full conserved-field checks."""
import json
import os
from pathlib import Path
import subprocess
import sys
import numpy as np


def main():
    before, after, directory = map(lambda p: Path(p).resolve(), sys.argv[1:4])
    directory.mkdir(parents=True, exist_ok=False)
    helper = Path(__file__).with_name('profile101.py')
    env = dict(os.environ, OPENBLAS_NUM_THREADS='1', OMP_NUM_THREADS='1')
    rows = []
    for repeat in range(3):
        fields = {}
        order = (('before', before), ('after', after))
        for label, root in order if repeat % 2 == 0 else order[::-1]:
            out = directory/f'{repeat}-{label}'
            command = [sys.executable, str(helper), str(root), str(out), '4', '3e-7', '--no-profile']
            with (directory/f'{repeat}-{label}.log').open('x') as log:
                subprocess.run(command, stdout=log, stderr=subprocess.STDOUT, env=env, check=True)
            report = json.loads((out/'profile.json').read_text())
            rows.append(dict(repeat=repeat, implementation=label, **report))
            fields[label] = np.load(out/'final.npz')['q']
            print(label, repeat, report['evolutionSeconds'], report['workerPeakRssKiB'], flush=True)
        # Normalize each conserved component separately; zero/tiny momentum
        # must not be hidden by total energy's larger units and magnitude.
        a, b = fields['before'], fields['after']
        error = np.max(abs(a-b), axis=(1, 2))/np.maximum(np.max(abs(a), axis=(1, 2)), np.finfo(float).tiny)
        if np.max(error) > 1e-10:
            raise ArithmeticError('Optimization changed conserved fields beyond roundoff screen')
        rows[-1]['componentRelativeDifferences'] = error.tolist()
    medians = {label: {key: float(np.median([r[key] for r in rows if r['implementation'] == label]))
        for key in ('evolutionSeconds', 'workerPeakRssKiB')} for label in ('before', 'after')}
    output = dict(rows=rows, medians=medians,
        speedup=medians['before']['evolutionSeconds']/medians['after']['evolutionSeconds'],
        peakRssReductionFraction=1-medians['after']['workerPeakRssKiB']/medians['before']['workerPeakRssKiB'],
        scope='152-step early transient; fresh-worker RSS, not host/VM RAM or full-campaign speed',
        experimentalQualification=False)
    (directory/'summary.json').write_text(json.dumps(output, indent=2, allow_nan=False)+'\n')


if __name__ == '__main__':
    main()
