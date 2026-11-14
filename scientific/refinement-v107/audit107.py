"""Fixed-gate admission of actual V107 jobs; no solver or target fitting."""
import argparse
from contextlib import contextmanager
import gzip
import json
import os
from pathlib import Path
import sys
import tempfile

import numpy as np

import campaign107 as campaign
import audit99
from geometry101 import hermite_edges
import independent100

ROOT = Path(__file__).resolve().parents[2]
TIMES = (0., 1e-6, 2e-6, 4e-6)
FULL_JOBS = ((4, 2, .1), (8, 2, .1), (16, 2, .1), (8, 2, .2),
             (8, 2, .05), (8, 4, .1), (16, 4, .1), (4, 1, .1), (8, 1, .1))
PREFLIGHT_JOBS = ((16, 2, .1), (8, 4, .1), (16, 4, .1))
RESOURCE_BUDGET_KIB = {(rn, zn): (2 if (rn, zn) == (16, 4) else 1)*1024**2
                       for rn, zn, _ in FULL_JOBS}
PINS = dict(original='96098e86f874d1d5f65317a882a5f14df75685afc06ecc8a98cbd7a76e48a7b4',
    cross='6339cfda5463c5ca27568f999ffb97dcdf3bf8e1c820506025a7ae7be1124916',
    radial='6b0bdcfe63999aeb1046a22b7287ccf88975e82dc3169f1c3e2ab3bf42bb048e')
ORIGINAL_AUDIT = '3410969b822e0f28c2142e006bdacf0e59464eacca5383e25ce5960ed55822d0'
METHOD = 'v105-consistent-source-and-wall-with-fipy-cell-heat'
BASELINE_FILE = 'scientific/boundary-v84/results/predictions.json'


def geometry(rn, zn):
    audit99.require(all(type(n) is int and n > 0 and n & (n-1) == 0 for n in (rn, zn)),
                    'Geometry levels must be positive powers of two')
    return (hermite_edges([0., .004, .05, .056, .06], [4, 8, 4, 4], rn),
            hermite_edges([0., .06, .08, .232, .24], [4, 4, 12, 4], zn))


def job(row):
    return row['radialRefinement'], row['axialRefinement'], row['cfl']


def field(directory, row, times):
    entry = row['fieldPacket']; path = (directory/entry['path']).resolve()
    audit99.require(path.parent == directory.resolve()/'fields', 'Invalid field path')
    packed = path.read_bytes(); raw = gzip.decompress(packed)
    audit99.require(audit99.sha(packed) == entry['sha256'] and
                    audit99.sha(raw) == entry['rawSHA256'], 'Field seal mismatch')
    state = json.loads(raw)
    audit99.require([s['timeS'] for s in state['snapshots']] == list(times), 'Snapshot clock drift')
    for actual, expected in zip((state['radialEdgesM'], state['axialEdgesM']), geometry(*job(row)[:2])):
        actual = np.asarray(actual)
        audit99.require(actual.shape == expected.shape and np.isfinite(actual).all() and
                        np.allclose(actual, expected, rtol=0, atol=1e-15), 'Changed fixed geometry')
    audit99.require(state['cfl'] == row['cfl'], 'State CFL drift')
    return path, state


def historical(original, radial, producer):
    packets = {}
    for name, path in (('original', original), ('radial', radial)):
        audit99.require(audit99.sha(path.read_bytes()) == PINS[name], 'Stale historical input: '+name)
        packets[name] = json.loads(path.read_bytes())
        for relative, digest in packets[name]['sourceSHA256'].items():
            if relative != 'scientific/coupled-v99/audit99.py':
                audit99.require(audit99.sha((producer/relative).read_bytes()) == digest,
                                'Historical physical source changed: '+relative)
    audit_path = original.parent/'audit.json'
    audit99.require(audit99.sha(audit_path.read_bytes()) == ORIGINAL_AUDIT, 'Historical audit seal mismatch')
    old_audit = json.loads(audit_path.read_bytes())
    audit99.require(old_audit['predictionSHA256'] == PINS['original'] and
                    old_audit['allRequiredNumericalPass'] is False and len(old_audit['failures']) == 6,
                    'Historical failures must remain separate')
    audit99.require(packets['radial']['originalPredictionSHA256'] == PINS['original'] and
                    packets['radial']['crossSummarySHA256'] == PINS['cross'], 'Historical lineage drift')
    return packets['original'], packets['radial'], old_audit


def load(path, fixed, producer, active=None):
    path = path.resolve(); active = set() if active is None else active
    audit99.require(path not in active, 'Cyclic preflight lineage')
    active = active | {path}
    packet = json.loads(path.read_bytes())
    phase = packet['phase']; times = (0., 1e-6) if phase == 'preflight' else TIMES
    audit99.require(phase in ('preflight', 'full') and packet['schemaVersion'] == 1 and
        packet['timesS'] == list(times) and packet['inputSHA256'] == PINS and
        packet['sourceSHA256'] == campaign.sources() and packet['radialBalanceMethod'] == METHOD and
        packet['baselinePredictionSHA256'] == audit99.BASELINE and
        packet['manifest'] == fixed['manifest'] and packet['scenario'] == fixed['scenario'],
        'Stale source, input, method, physical state or clocks')
    for flag, expected in dict(targetVelocityRead=False, currentFitted=False, velocityFitted=False,
            experimentalQualification=False, originalGatesReplaced=False,
            originalFailuresSuperseded=False, conditionalRelease=True).items():
        audit99.require(packet[flag] is expected, 'Changed fitting, gates or qualification scope')
    audit99.require(len(packet['cases']) == 1, 'Require one declared case per packet')
    row = packet['cases'][0]; key = job(row)
    audit99.require(key in (PREFLIGHT_JOBS if phase == 'preflight' else FULL_JOBS) and
        all(type(v) is int for v in key[:2]) and row['refinement'] == key[0], 'Undeclared job')
    budget = RESOURCE_BUDGET_KIB[key[:2]]
    audit99.require(packet['resourceBudgetKiB'] == row['resourceBudgetKiB'] == budget,
                    'Undeclared resource profile')
    if row['completed'] is True:
        r, z = geometry(*key[:2])
        audit99.require(row['nr'] == len(r)-1 and row['nz'] == len(z)-1 and
            row['maxDtS'] == 1e-7 and row['anodeCenterM'] == .07 and
            0 < row['peakResidentKiB'] < budget and packet['workerExitCode'] == 0,
            'Case geometry, resource or completion drift')
        source, _ = field(path.parent, row, times)
    else:
        source = None
    admitted = set()
    for receipt in packet['preflightPackets']:
        prerequisite = Path(receipt['path']).resolve()
        audit99.require(audit99.sha(prerequisite.read_bytes()) == receipt['sha256'], 'Preflight seal mismatch')
        prior, _, _ = load(prerequisite, fixed, producer, active)
        previous = prior['cases'][0]
        audit99.require(prior['phase'] == 'preflight' and previous['completed'] is True and
            list(job(previous)) == receipt['job'] and previous['peakResidentKiB'] == receipt['peakResidentKiB'],
            'Invalid resource preflight receipt')
        admitted.add(job(previous))
    required = set() if (phase, key) == ('preflight', (16, 2, .1)) else {(16, 2, .1)}
    if phase == 'full' and key[1] == 4:
        required.add(key)
    audit99.require(required <= admitted, 'Required resource preflight missing')
    return packet, row, source


def encoded(key):
    rn, zn, cfl = key
    return rn*100+zn, cfl


@contextmanager
def linked_packet(out, records, fixed, times, sources):
    """Hard-link immutable archives on the same guest filesystem; no state copies."""
    with tempfile.TemporaryDirectory(prefix='admission-', dir=out) as temporary:
        directory = Path(temporary); (directory/'fields').mkdir()
        cases = []
        for key, (row, source) in records.items():
            adapted = dict(row, refinement=encoded(key)[0])
            r, z = geometry(*key[:2])
            adapted.update(nr=len(r)-1, nz=len(z)-1, maxDtS=1e-7, anodeCenterM=.07)
            if source is not None:
                name = 'fields/'+str(encoded(key))+'.json.gz'
                os.link(source, directory/name)
                adapted['fieldPacket'] = dict(row['fieldPacket'], path=name)
            cases.append(adapted)
        packet = dict(fixed, sourceSHA256=sources, timesS=list(times), cases=cases)
        path = directory/'predictions.json'; path.write_text(json.dumps(packet, allow_nan=False))
        yield path


def pair_checks(records, times):
    """Two-level axial checks supplement the independent contraction layouts."""
    gates, pairs, restriction = [], [], []
    def gate(kind, context, value, limit):
        passed = value is not None and np.isfinite(value) and 0 <= value < limit
        gates.append(dict(kind=kind, context=context, value=value, limit=limit, passed=bool(passed)))
    for rn in (8, 16):
        keys = (rn, 2, .1), (rn, 4, .1)
        if not all(key in records and records[key][1] is not None for key in keys):
            continue
        a, b = (field(records[k][1].parent.parent, records[k][0], times)[1] for k in keys)
        for ti, t in enumerate(times):
            values = {order: audit99.metrics(a, b, ti, order) for order in (2, 3)}
            pairs.append(dict(pair=[list(k) for k in keys], timeS=t, exactPanels=values))
            restriction.append(dict(pair=[list(k) for k in keys], timeS=t,
                                    fields=independent100.compare(a, b, ti)))
            for name, row in values[2].items():
                context = f'axial/r{rn}/{t}/{name}'
                gate('refinement', context, row['value'], .05)
                for term in ('errorIntegral', 'referenceIntegral'):
                    x, y = (values[o][name][term] for o in (2, 3))
                    spread = abs(x-y)/max(abs(x), abs(y)) if x or y else 0.
                    gate('panelQuadrature', context+'/'+term, spread, 1e-10)
        del a, b
    return gates, pairs, restriction


def audit(out, phase, original, radial, paths, producer=ROOT):
    producer = producer.resolve(); out.mkdir(parents=True, exist_ok=False)
    fixed, old_radial, old_audit = historical(original, radial, producer)
    sealed = campaign.sources(); records = {}; admissions = []
    times = (0., 1e-6) if phase == 'preflight' else TIMES
    audit99.require(phase in ('preflight', 'full'), 'Invalid audit phase')
    for path in paths:
        packet, row, source = load(path, fixed, producer)
        audit99.require(packet['phase'] == phase and job(row) not in records, 'Wrong phase or duplicate case')
        records[job(row)] = row, source
        admissions.append(dict(path=str(path.resolve()), sha256=audit99.sha(path.read_bytes()), job=list(job(row))))
    if phase == 'preflight' and (16, 2, .1) in records:
        for rn in (4, 8):
            row = next(row for row in old_radial['cases'] if job(row) == (rn, 2, .1))
            source, state = field(radial.parent, row, times)
            records[job(row)] = dict(row, maximumTemperatureK=max(h['maximumTemperatureK']
                for h in state['history'])), source
    audit99.require(bool(records), 'No actual cases to admit')
    radial_keys = [(n, 2, .1) for n in (4, 8, 16)]
    temporal_keys = [(8, 2, c) for c in (.2, .1, .05)]
    layouts = dict(joint=[(4, 1, .1), (8, 2, .1), (16, 4, .1)],
                   axial=[(8, z, .1) for z in (1, 2, 4)])
    declared = [('radial', 'spatial', radial_keys), ('timestep', 'timestep', temporal_keys),
                *[(name, 'spatial', keys) for name, keys in layouts.items()]]
    admitted_groups = [(name, kind, keys) for name, kind, keys in declared
                       if all(k in records for k in keys)]
    groups = [(kind, [encoded(k) for k in keys]) for _, kind, keys in admitted_groups]
    saved_sources = audit99.SOURCES
    try:
        audit99.SOURCES = tuple(sorted(set(sealed)-{BASELINE_FILE}))+(BASELINE_FILE,)
        with linked_packet(out, records, fixed, times, sealed) as packet:
            result = audit99.audit(packet, producer, 'cflBound',
                lambda identifier: geometry(*divmod(identifier, 100)),
                jobs={encoded(key) for key in records}, reporting_times=times, comparison_groups=groups)
    finally:
        audit99.SOURCES = saved_sources
    extra, axial, restrictions = pair_checks(records, times)
    for keys in (radial_keys, temporal_keys, *layouts.values()):
        for a, b in zip(keys[:-1], keys[1:]):
            if all(k in records and records[k][1] is not None for k in (a, b)):
                sa, sb = (field(records[k][1].parent.parent, records[k][0], times)[1] for k in (a, b))
                restrictions.extend(dict(pair=[list(a), list(b)], timeS=t,
                    fields=independent100.compare(sa, sb, ti)) for ti, t in enumerate(times))
                del sa, sb
    result['gates'].extend(extra)
    result['failures'] = [g for g in result['gates'] if not g['passed']]
    missing = sorted(set(FULL_JOBS)-set(records))
    numerical = not result['failures']
    full_pass = phase == 'full' and not missing and numerical
    result.update(phase=phase, status='PASS' if full_pass else ('FAIL' if result['failures'] else 'PENDING'),
        allRequiredNumericalPass=full_pass, fullDeclaredMatrixPass=full_pass,
        qualificationPending=phase != 'full' or bool(missing), missingFullJobs=[list(k) for k in missing],
        qualificationStatus='PENDING' if phase != 'full' or missing else ('PASS' if full_pass else 'FAIL'),
        caseAdmissionPass=all(g['passed'] for g in result['gates'] if g['kind'] not in
            ('refinement', 'contraction', 'panelQuadrature', 'missingComparison', 'distinctClocks')),
        casePackets=admissions, geometryIDs={str(encoded(k)[0]):list(k[:2]) for k in records},
        comparisonLayouts={str(i): dict(name=name, kind=kind, jobs=[list(k) for k in keys])
                           for i, (name, kind, keys) in enumerate(admitted_groups)},
        axialComparisons=axial, supplementalRestriction=restrictions, inputSHA256=PINS,
        originalAuditSHA256=ORIGINAL_AUDIT, originalFailures=old_audit['failures'],
        originalFailuresSuperseded=False, experimentalQualification=False, liveQualification=False,
        scope='Declared numerical matrix only, including separate radial, axial and joint contraction layouts. '
              'Mesh-dependent initial steady torsion is retained. No experimental or live qualification.')
    audit99.require(campaign.sources() == sealed, 'Audited sources changed')
    with (out/'audit.json').open('x') as stream:
        json.dump(result, stream, indent=2, allow_nan=False)
    return result


if __name__ == '__main__':
    audit99.require(sys.platform == 'linux' and os.getuid() == 1000, 'Execute only inside safe-dev')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('out', type=lambda p: Path(p).resolve())
    parser.add_argument('phase', choices=('preflight', 'full'))
    parser.add_argument('original', type=lambda p: Path(p).resolve())
    parser.add_argument('radial', type=lambda p: Path(p).resolve())
    parser.add_argument('cases', nargs='+', type=lambda p: Path(p).resolve())
    args = parser.parse_args()
    report = audit(args.out, args.phase, args.original, args.radial, args.cases)
    print(json.dumps({k: report[k] for k in ('status', 'qualificationPending', 'failures')}, indent=2))
    raise SystemExit(not report['fullDeclaredMatrixPass'])
