"""Profile the unchanged coupled campaign's bounded early-time hot path.

Run inside safe-dev: Python profile101.py SOURCE_ROOT OUTPUT_DIR [2|4] [END_S].
Initialization is measured separately; cProfile covers the actual evolve path,
including receipt/ledger work and final snapshot conversion. No physics knobs
or acceptance thresholds change. Peak RSS describes this whole worker process.
"""
import cProfile
import hashlib
import importlib.util
import json
from pathlib import Path
import pstats
import resource
import sys
import time
import numpy as np


def main():
    root, directory = (Path(v).resolve() for v in sys.argv[1:3])
    n = int(sys.argv[3]) if len(sys.argv) > 3 else 2
    target = float(sys.argv[4]) if len(sys.argv) > 4 else 5e-8
    profiling = '--no-profile' not in sys.argv[5:]
    if n not in (2, 4) or not np.isfinite(target) or not 0 < target <= 1e-6:
        raise ValueError('Bounded profile requires n=2/4 and end in (0,1 us]')
    directory.mkdir(parents=True, exist_ok=False)
    path = root/'scientific/coupled-v99/campaign99.py'
    spec = importlib.util.spec_from_file_location('profiled_campaign99', path)
    campaign = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(campaign)
    source_before = campaign.sources()
    baseline = root/'scientific/boundary-v84/results/predictions.json'
    packet = json.loads(baseline.read_bytes())
    scenario, manifest = packet['scenarios'][0], packet['manifest']
    started = time.monotonic()
    initialized = campaign.initialize(scenario, manifest, n)
    initialization_seconds = time.monotonic()-started
    campaign.initialize = lambda *_: initialized
    campaign.TIMES = (0., target)
    profiler = cProfile.Profile()
    started = time.monotonic()
    if profiling:
        profiler.enable()
    state = campaign.evolve(scenario, manifest, n, .1)
    if profiling:
        profiler.disable()
    elapsed = time.monotonic()-started
    if campaign.sources() != source_before:
        raise ValueError('Profiled inputs changed during execution')
    if profiling:
        profiler.dump_stats(directory/'profile.pstats')
    stats = pstats.Stats(profiler) if profiling else None
    top = []
    for (filename, line, function), row in sorted(stats.stats.items() if stats else (), key=lambda item: item[1][3], reverse=True)[:30]:
        primitive_calls, calls, own_seconds, cumulative_seconds, _ = row
        top.append(dict(file=filename, line=line, function=function,
            calls=calls, primitiveCalls=primitive_calls,
            ownSeconds=own_seconds, cumulativeSeconds=cumulative_seconds))
    q = np.asarray(state['snapshots'][-1]['q'], dtype=float)
    np.savez_compressed(directory/'final.npz', q=q)
    output = dict(refinement=n, cfl=.1, endS=target,
        stepCount=len(state['history']), initializationSeconds=initialization_seconds,
        evolutionSeconds=elapsed, profilingEnabled=profiling,
        workerPeakRssKiB=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss,
        initialTotals=initialized[-1].sum(axis=(1, 2)).tolist(),
        finalTotals=q.sum(axis=(1, 2)).tolist(), sourceSHA256=source_before,
        helperSHA256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        finalHistory=state['history'][-1], topCumulative=top)
    (directory/'profile.json').write_text(json.dumps(output, indent=2, allow_nan=False)+'\n')
    print(json.dumps({k: v for k, v in output.items() if k not in ('sourceSHA256', 'topCumulative')}, allow_nan=False), flush=True)


if __name__ == '__main__':
    main()
