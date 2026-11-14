"""Supplemental V107 axial q0 witness: unchanged initialization, no evolution.

Run only inside the frozen checker113 safe-dev snapshot. Explicit packet hashes
are admission pins, not fitted parameters. This never qualifies a trajectory or
rewrites any original audit, threshold, source, initial state or failure.
"""
import argparse
import gzip
import hashlib
import json
import os
from pathlib import Path
import resource
import sys
import time


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def require(ok, message):
    if not ok:
        raise ValueError(message)


def main(args):
    started = time.monotonic()
    sys.path.insert(0, str(args.project/'scientific/refinement-v107'))
    import campaign107 as campaign
    import audit107 as admission
    import stable107 as stable
    import numpy as np

    metric_source = args.project/'scientific/refinement-v107/stable107.py'
    metric_sha = sha(metric_source.read_bytes())
    require(metric_sha == '5b54757cb1fc08eeffd70a0b62167cafb149fe4b101057e5c5bd4b3f54c9708b',
            'Stable metric differs from frozen checker113 implementation')
    sealed = campaign.sources()
    fixed = campaign.inputs(args.original, args.cross, args.radial)
    packets = []
    states = []
    for path, digest, expected_job, phase in (
            (args.r8z2, args.r8z2_sha, (8, 2, .1), 'full'),
            (args.r8z4, '9c071da189b7390b846d9925c2aa5d6ace484ba7ed37d66e9ee1d16152c971b6',
             (8, 4, .1), 'preflight')):
        require(sha(path.read_bytes()) == digest, 'Explicit saved-packet pin changed')
        packet, row, source = admission.load(path, fixed, args.project)
        require(admission.job(row) == expected_job and packet['phase'] == phase
                and row['completed'] is True and source is not None, 'Wrong saved trajectory')
        times = campaign.TIMES if phase == 'full' else (0., 1e-6)
        _, state = admission.field(path.parent, row, times)
        states.append(state)
        packets.append(dict(path=str(path), sha256=digest, phase=phase,
                            job=list(expected_job), fieldPacket=row['fieldPacket']))

    # Same production initializer and classes, with only its declared mesh bound
    # exactly as in campaign107.worker(). No evolve()/advance()/step is called.
    original_mesh = campaign.old.mesh
    try:
        campaign.old.mesh = lambda _: campaign.geometry(8, 1)
        flow, diffusion, electro, q = campaign.old.initialize(fixed['scenario'], fixed['manifest'], 1)
    finally:
        campaign.old.mesh = original_mesh
    p = flow.primitive(q)
    q0 = dict(radialEdgesM=flow.r.tolist(), axialEdgesM=flow.z.tolist(), cfl=.1,
              snapshots=[dict(timeS=0., q=q.tolist(), **{k: v.tolist() for k, v in p.items()})],
              history=[])
    require(all(np.array_equal(a, b) for a, b in zip(
        (q0['radialEdgesM'], q0['axialEdgesM']), campaign.geometry(8, 1))), 'Generated geometry drift')
    states.insert(0, q0)
    values = {}
    for label, a, b in zip(('r8z1-to-r8z2', 'r8z2-to-r8z4'), states[:-1], states[1:]):
        values[label] = {str(order): stable.metrics(a, b, 0, order) for order in (2, 3)}

    # Exact original audit99 comparison predicates, with the same fixed limits.
    # Preserve zero-reference/None and every initial observable, including Ω.
    gates = []
    def gate(kind, context, value, limit):
        passed = value is not None and np.isfinite(value) and 0 <= value < limit
        gates.append(dict(kind=kind, context=context, value=value, limit=limit, passed=bool(passed)))
    coarse, fine = (values[label]['2'] for label in values)
    comparisons = []
    for name in coarse:
        x, y = coarse[name]['value'], fine[name]['value']
        contracts = x is not None and y is not None and (y < x or x == y == 0)
        context = 'supplemental-axial-q0/'+name
        gate('refinement', context, y, .05)
        gate('contraction', context, 0. if contracts else 1., 1.)
        comparisons.append(dict(field=name, timeS=0., coarseChange=x, fineChange=y,
                                contraction=bool(contracts), limit=.05))
        for label, pair in values.items():
            for term in ('errorIntegral', 'referenceIntegral'):
                a, b = (pair[str(order)][name][term] for order in (2, 3))
                spread = abs(a-b)/max(abs(a), abs(b)) if a or b else 0.
                gate('panelQuadrature', context+'/'+label+'/'+term, spread, 1e-10)

    require(campaign.sources() == sealed and sha(metric_source.read_bytes()) == metric_sha,
            'Frozen sources changed during diagnostic')
    for item in packets:
        require(sha(Path(item['path']).read_bytes()) == item['sha256'], 'Saved packet changed')
    args.out.mkdir(parents=True, exist_ok=False)
    raw = json.dumps(q0, separators=(',', ':'), allow_nan=False).encode()
    packed = gzip.compress(raw, mtime=0)
    (args.out/'q0-r8z1.json.gz').write_bytes(packed)
    result = dict(schemaVersion=1, purpose='supplemental-initial-clock-contraction-diagnostic',
        evolutionPerformed=False, fullDeclaredMatrixPass=False, experimentalQualification=False,
        originalGatesReplaced=False, originalFailuresSuperseded=False, qualificationStatus='NOT_EVALUATED',
        sourceSHA256=sealed, metricImplementationSHA256=metric_sha,
        diagnosticSHA256=sha(Path(__file__).read_bytes()), inputSHA256=campaign.INPUT_SHA256,
        savedPackets=packets, manifest=fixed['manifest'], scenario=fixed['scenario'],
        generatedInitialState=dict(job=[8, 1, .1], timeS=0., nr=flow.nr, nz=flow.nz,
            path='q0-r8z1.json.gz', sha256=sha(packed), rawSHA256=sha(raw),
            flowClass=type(flow).__module__+'.'+type(flow).__name__,
            diffusionClass=type(diffusion).__module__+'.'+type(diffusion).__name__),
        exactPanels=values, comparisons=comparisons, gates=gates,
        failures=[g for g in gates if not g['passed']],
        elapsedS=time.monotonic()-started,
        peakResidentKiB=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss)
    destination = args.out/'diagnostic.json'
    destination.write_text(json.dumps(result, indent=2, allow_nan=False)+'\n')
    print(json.dumps(dict(diagnosticSHA256=sha(destination.read_bytes()),
                         comparisons=comparisons, failures=result['failures']), indent=2), flush=True)


if __name__ == '__main__':
    require(sys.platform == 'linux' and os.getuid() == 1000, 'Execute only inside safe-dev')
    parser = argparse.ArgumentParser(description=__doc__)
    for name in ('project', 'out', 'original', 'cross', 'radial', 'r8z2', 'r8z4'):
        parser.add_argument(name, type=lambda p: Path(p).resolve())
    parser.add_argument('--r8z2-sha', required=True)
    main(parser.parse_args())
