"""Bounded allocation-work benchmark; old/new equations share identical inputs."""
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import time
import numpy as np

SCIENTIFIC = Path(__file__).resolve().parents[1]
for name in ('mixture-axial-v75', 'meridional-v86'):
    sys.path.insert(0, str(SCIENTIFIC/name))
from flow import Flow
from electro86 import Electro


def benchmark(old_file):
    raw = old_file.read_bytes()
    if hashlib.sha256(raw).hexdigest() != '23e2ac67777bfeea8c09179450b218241265dac21a3b9f3857a2a36c02ac7463':
        raise ValueError('Original electrical source seal changed')
    spec = importlib.util.spec_from_file_location('original_electro', old_file)
    old = importlib.util.module_from_spec(spec); spec.loader.exec_module(old)
    f = Flow(np.linspace(0, .06, 17), np.linspace(0, .24, 25), [6.6335e-26]*2)
    q = f.state(.001, 3000., .5, 1000., vr=1.)
    results, answers = [], {}
    for repeat in range(3):
        for label, cls in (('original', old.Electro), ('cached', Electro)):
            model = cls(f, .01, .03, 2., .13, 100.)
            state = q.copy(); start = time.perf_counter()
            for i in range(20):
                state, _ = model.advance(state, (1+i%3)*1e-10)
            results.append(dict(implementation=label, repeat=repeat,
                                elapsedS=time.perf_counter()-start))
            answers[label] = state
    np.testing.assert_allclose(answers['cached'], answers['original'], rtol=1e-10, atol=1e-20)
    medians = {label: float(np.median([r['elapsedS'] for r in results
                                     if r['implementation'] == label])) for label in answers}
    return dict(runs=results, medianElapsedS=medians,
        speedup=medians['original']/medians['cached'], finalStateAgreement=True,
        measuredPeakMemoryReduction=False, oldSourceSHA256=hashlib.sha256(raw).hexdigest(),
        newSourceSHA256=hashlib.sha256(Path(sys.modules[Electro.__module__].__file__).read_bytes()).hexdigest())


if __name__ == '__main__':
    result = benchmark(Path(sys.argv[1]))
    with Path(sys.argv[2]).open('x') as stream:
        json.dump(result, stream, indent=2)
    print(json.dumps(result, indent=2))
