"""Guest-only algebraic isolation of the existing native spatial-flow failure."""
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import time

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scientific/periodic-axis-v96'))
from sector96 import (AMP, TIMES, configure, gradient, gradient_metrics,
                      native_identity, native_packet, command, environment)

VARIANTS = ('baseline', 'coupled-U', 'diagonal-p', 'GAMG-p')
NUMBER = r'[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?'
SOLVE = re.compile(r'Solving for (\w+), Initial residual = (' + NUMBER +
                   r'), Final residual = (' + NUMBER + r'), No Iterations (\d+)')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def solver_settings(text, variant):
    """One native algebraic change; neither equations nor tolerances change."""
    if variant not in VARIANTS:
        raise ValueError('Unregistered solver variant')
    old = 'U {solver smoothSolver; smoother symGaussSeidel; tolerance 1e-14; relTol 0;}'
    if variant == 'coupled-U':
        new = ('U {type coupled; solver PBiCCCG; preconditioner DILU; '
               'tolerance (1e-14 1e-14 1e-14); relTol (0 0 0);}')
    elif variant in ('diagonal-p', 'GAMG-p'):
        old = 'p {solver PCG; preconditioner DIC; tolerance 1e-14; relTol 0;}'
        new = ('p {solver PCG; preconditioner diagonal; tolerance 1e-14; relTol 0;}'
               if variant == 'diagonal-p' else
               'p {solver GAMG; smoother GaussSeidel; tolerance 1e-14; relTol 0;}')
    else:
        return text
    if text.count(old) != 1:
        raise ValueError('Expected exactly one frozen native solver entry')
    return text.replace(old, new)


def solver_log(text):
    """Keep individual solves; a capped intermediate p solve is not the final p."""
    steps = []
    for line in text.splitlines():
        if line.startswith('Time = '):
            steps.append(dict(time=line[7:], solves=[], continuity=[]))
        match = SOLVE.search(line)
        if match:
            if not steps:
                raise ValueError('Solve before a timestep')
            field, initial, final, iterations = match.groups()
            steps[-1]['solves'].append(dict(field=field, initial=float(initial),
                                           final=float(final), iterations=int(iterations)))
        if 'time step continuity errors' in line and steps:
            steps[-1]['continuity'].append(line)
    final_pressure = []
    for step in steps:
        pressure = [s for s in step['solves'] if s['field'] == 'p']
        if pressure:
            final_pressure.append(pressure[-1]['final'])
    return dict(steps=steps, iterationCapCount=sum(s['iterations'] >= 1000
                for step in steps for s in step['solves']),
                maxFinalPressureResidual=max(final_pressure) if final_pressure else None,
                finalPressureCorrectionCount=len(final_pressure))


def main(out):
    source = json.loads((ROOT / 'transfer.json').read_text())
    def verify():
        for name, expected in source.items():
            if sha(ROOT / name) != expected:
                raise ValueError('Source changed: ' + name)
    verify()
    native = native_identity()
    out.mkdir(exist_ok=False)
    result = dict(sourceSHA256=source, nativeSHA256=native, cases=[],
                  experimentalQualification=False, livePlaygroundQualified=False)
    for variant in VARIANTS:
        case = out / variant
        row = dict(variant=variant, n=16, nz=32, steps=256)
        start = time.monotonic()
        try:
            row['commands'] = configure(case, 16, 32, 256, 'rigid', 'cyclic', 'leastSquares')
            path = case / 'system/fvSolution'
            path.write_text(solver_settings(path.read_text(), variant))
            row['inputSHA256'] = {str(p.relative_to(case)): sha(p)
                                  for p in case.rglob('*') if p.is_file()}
            row['commands'].append(command(case, ['foamRun', '-case', str(case)], environment(), 'solver'))
            a, r, z, row['native'] = native_packet(case, 16, 256, 1., axialCells=32)
            g = np.array([gradient(case, 16, 32, t) for t in TIMES])
            packet = out / (variant + '.npz')
            np.savez_compressed(packet, native=a, nativeR=r, nativeZ=z, gradU=g)
            row.update(completed=True, packetSHA256=sha(packet), frames=[dict(timeS=float(t),
                       **gradient_metrics(g[i], 16, 32),
                       maxSwirlChangeOverA=float(np.max(np.abs(a[i]-a[0]))/AMP))
                       for i, t in enumerate(TIMES)])
            row['rigidPass'] = bool(all(f['maxStrainOverOmega'] < 1e-6 and
                f['maxSwirlChangeOverA'] < 1e-6 for f in row['frames']) and
                row['native']['peakMeridionalOverAmplitude'] < 1e-6)
        except Exception as error:
            row.update(completed=False, rigidPass=False, error=type(error).__name__ + ': ' + str(error))
        if (case / 'solver.log').exists():
            diagnostics = solver_log((case / 'solver.log').read_text())
            path = out / (variant + '-solves.json')
            path.write_text(json.dumps(diagnostics, indent=2, allow_nan=False) + '\n')
            row['solveDiagnosticsSHA256'] = sha(path)
            row['solverSummary'] = {k: v for k, v in diagnostics.items() if k != 'steps'}
        row['wallSeconds'] = time.monotonic() - start
        result['cases'].append(row)
        (out / 'predictions.json').write_text(json.dumps(result, indent=2, allow_nan=False) + '\n')
        print(json.dumps(row), flush=True)
        verify()
        if native_identity() != native:
            raise ValueError('Native implementation changed')


if __name__ == '__main__':
    if sys.platform != 'linux' or os.getuid() != 1000:
        raise RuntimeError('Execute only inside safe-dev')
    main(Path(sys.argv[1]))
