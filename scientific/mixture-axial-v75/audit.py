"""Actual coupled step and deliberate local corruptions. Run only in safe-dev."""
import argparse
import json
from pathlib import Path
import numpy as np
from coupling import Coupled
from independent import check_hydro, check_diffusion, check_magnetic
from mixcheck import check_source
from run import configuration, hashes

HERE = Path(__file__).resolve().parent


def control(manifest):
    f, c, q, wall = configuration(manifest, 4, 4)
    saved, positive = {}, {}

    def check(kind, old, new, dt, *extras):
        if kind == 'hydro':
            return check_hydro(c, old, new, dt)
        if kind == 'diffusion':
            return check_diffusion(c, old, new, dt)
        if kind == 'magnetic':
            return check_magnetic(c, old, new, dt, *extras)
        return check_source(c, old, new, dt, *extras)

    def remember(kind, old, new, dt, *extras):
        positive[kind] = check(kind, old, new, dt, *extras)
        saved[kind] = (old.copy(), new.copy(), dt, extras)

    with Coupled(f, c['wall'], c['electrical'], q, c['contactH'], c['coolingH'], c['bathK']) as model:
        model.step(q, wall, .25*f.stable_dt(q), audit=remember)
    results = []
    for name in ('mass', 'species', 'angularMomentum', 'energy', 'enthalpyFlux', 'sourceNumericalHeat'):
        kind = 'diffusion' if name == 'enthalpyFlux' else 'source' if name == 'sourceNumericalHeat' else 'hydro'
        old, new, dt, extras = saved[kind]
        bad = new.copy()
        if name == 'mass':
            bad[0, 0, 0] *= 1.001
        elif name in ('species', 'angularMomentum', 'energy'):
            component = {'species': 5, 'angularMomentum': 3, 'energy': 4}[name]
            shift = .001*float(np.max(abs(new[component])))
            bad[component, 1, 1] += shift
            bad[component, 1, 2] -= shift
        elif name == 'enthalpyFlux':
            bad[4] = old[4]
        else:
            loss = extras[2]['mechanical']['numericalLossJ']
            if loss <= 0:
                raise AssertionError('Numerical-heat negative control needs positive BE loss')
            bad[4] += loss*new[0]/new[0].sum()
        try:
            check(kind, old, bad, dt, *extras)
            results.append(dict(name=name, rejected=False))
        except AssertionError as error:
            results.append(dict(name=name, rejected=True, reason=str(error)))
    return dict(manifest=manifest, positiveChecks=positive, negativeControls=results,
                sourceHashes=hashes(), passed=all(row['rejected'] for row in results),
                experimentalQualified=False, liveQualified=False)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    result = control(json.loads((HERE/'manifest.json').read_text()))
    args.output.write_text(json.dumps(result, indent=2, allow_nan=False)+'\n')
    print(json.dumps(dict(passed=result['passed'], negativeControls=result['negativeControls'])))
    raise SystemExit(0 if result['passed'] else 1)
