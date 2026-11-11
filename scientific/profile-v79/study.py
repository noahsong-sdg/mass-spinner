"""Frozen electrical-only predictions. Never reads measured rotation targets."""
import argparse
import hashlib
import json
from pathlib import Path
import time

import numpy as np
from scipy.optimize import brentq

import reference
import solver


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def summarize(result, chords):
    values = {k: v for k, v in result.items() if not isinstance(v, np.ndarray)}
    r = result['r']
    centers = np.sqrt((r[:-1]**2+r[1:]**2)/2)
    values.update(chordsM=chords, chordVelocityMS=solver.observe(result, chords),
                  radialCentersM=centers.tolist(),
                  localMidplaneVelocityMS=(centers*result['omega'][0]).tolist())
    numbers = [v for v in values.values() if isinstance(v, (int, float))]
    if not np.isfinite(numbers).all() or not np.isfinite(values['chordVelocityMS']).all():
        raise ArithmeticError('Nonfinite prediction')
    if min(values['jouleW'], values['viscousW']) < 0:
        raise ArithmeticError('Negative dissipation')
    return values


def run(directory):
    directory.mkdir(parents=True, exist_ok=False)
    here = Path(__file__).parent
    sources = {p.name: digest(p) for p in here.glob('*.py')}
    sources['manifest.json'] = digest(here/'manifest.json')
    sources['PROTOCOL.md'] = digest(here/'PROTOCOL.md')
    m = json.loads((here/'manifest.json').read_text())
    output = {'manifest': m, 'sourceSHA256': sources, 'cases': [],
              'qualification': False, 'targetDataRead': False}
    for beta in m['effectiveBetaCases']:
        for refinement in m['refinements']:
            start = time.monotonic()
            case = {'beta': beta, 'refinement': refinement,
                    'voltageV': m['bulkVoltageV']}
            try:
                sigma, result = solver.calibrate(m, beta, m['bulkVoltageV'], refinement)
                case.update(sigmaParallelSM=sigma, status='available',
                            prediction=summarize(result, m['chordsM']))
                check = reference.solve(m, beta, sigma, m['bulkVoltageV'], refinement)
                case['independentSameSigma'] = {k: v for k, v in check.items()
                                                if k not in ('potentialV', 'velocityMS', 'omegaRadS')}
            except (ValueError, ArithmeticError) as error:
                case.update(status='unavailable', reason=str(error))
            case['elapsedSeconds'] = time.monotonic()-start
            output['cases'].append(case)
            (directory/'predictions.json').write_text(json.dumps(output, indent=2, allow_nan=False)+'\n')
            print(json.dumps({k: v for k, v in case.items()
                              if k not in ('prediction', 'independentSameSigma')}), flush=True)
    for beta in m['effectiveBetaCases']:
        for voltage in (v for v in m['bulkVoltageCasesV'] if v != m['bulkVoltageV']):
            case = {'beta': beta, 'refinement': max(m['refinements']), 'voltageV': voltage}
            try:
                sigma, result = solver.calibrate(m, beta, voltage, case['refinement'])
                case.update(sigmaParallelSM=sigma, status='available',
                            prediction=summarize(result, m['chordsM']))
            except (ValueError, ArithmeticError) as error:
                case.update(status='unavailable', reason=str(error))
            output['cases'].append(case)
            (directory/'predictions.json').write_text(json.dumps(output, indent=2, allow_nan=False)+'\n')
            print('Voltage sensitivity', beta, voltage, case['status'], flush=True)
    assert sources == {**{p.name: digest(p) for p in here.glob('*.py')},
                       'manifest.json': digest(here/'manifest.json'),
                       'PROTOCOL.md': digest(here/'PROTOCOL.md')}
    print('SEALED', digest(directory/'predictions.json'), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('output', type=Path)
    run(parser.parse_args().output)
