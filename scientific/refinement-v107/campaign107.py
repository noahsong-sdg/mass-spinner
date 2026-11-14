"""One whitelisted V106-equation refinement case per isolated invocation."""
import argparse
import gzip
import json
import os
from pathlib import Path
import resource
import subprocess
import sys
import time

import numpy as np

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent/'heat-v106'))
import radial_next106 as prior

old = prior.old
TIMES = (0., 1e-6, 2e-6, 4e-6)
FULL_JOBS = ((4, 2, .1), (8, 2, .1), (16, 2, .1), (8, 2, .2),
             (8, 2, .05), (8, 4, .1), (16, 4, .1), (4, 1, .1), (8, 1, .1))
PREFLIGHT_JOBS = ((16, 2, .1), (8, 4, .1), (16, 4, .1))
RESOURCE_BUDGET_KIB = {(rn, zn): (2 if (rn, zn) == (16, 4) else 1)*1024**2
                       for rn, zn, _ in FULL_JOBS}
INPUT_SHA256 = dict(original=prior.ORIGINAL, cross=prior.CROSS,
    radial='6b0bdcfe63999aeb1046a22b7287ccf88975e82dc3169f1c3e2ab3bf42bb048e')
AUDITOR_ONLY_DELTA = 'scientific/coupled-v99/audit99.py'


def label(job):
    rn, zn, cfl = job
    return f'r{rn}-z{zn}-cfl{cfl:g}'


def geometry(rn, zn):
    if (rn, zn) not in {(r, z) for r, z, _ in FULL_JOBS}:
        raise ValueError('Undeclared radial/axial geometry')
    return prior.cross.mesh(rn, 'smooth-source-aligned')[0], prior.cross.mesh(zn, 'smooth-source-aligned')[1]


def sources():
    names = ('campaign107.py', 'PROTOCOL.md', 'audit107.py', 'test_audit107.py')
    return {**prior.sources(), **{'scientific/refinement-v107/'+name: old.sha((HERE/name).read_bytes())
                                for name in names}}


def progress_diffusion(base, started):
    class Progress(base):
        def advance(self, q, dt):
            out, receipt = super().advance(q, dt)
            self.progress_steps = getattr(self, 'progress_steps', 0)+1
            if self.progress_steps % 256 == 0:
                print('PROGRESS', self.progress_steps, time.monotonic()-started,
                    float(self.flow.primitive(out)['temperatureK'].max()),
                    resource.getrusage(resource.RUSAGE_SELF).ru_maxrss, flush=True)
            return out, receipt
    return Progress


def inputs(original, cross, radial):
    packets = {}
    for name, path in zip(('original', 'cross', 'radial'), (original, cross, radial)):
        if old.sha(path.read_bytes()) != INPUT_SHA256[name]:
            raise ValueError('Pinned historical input changed: '+name)
        packet = json.loads(path.read_bytes())
        for relative, digest in packet['sourceSHA256'].items():
            if relative != AUDITOR_ONLY_DELTA and old.sha((HERE.parents[1]/relative).read_bytes()) != digest:
                raise ValueError('Historical physical/input source changed: '+relative)
        for row in packet['cases']:
            prior.cross.read_field(path.parent, row)
        packets[name] = packet
    packet = prior.cross.inputs(original)
    if packets['cross']['sourcePredictionSHA256'] != INPUT_SHA256['original'] or \
            packets['radial']['originalPredictionSHA256'] != INPUT_SHA256['original'] or \
            packets['radial']['crossSummarySHA256'] != INPUT_SHA256['cross']:
        raise ValueError('Historical dataset lineage changed')
    return packet


def admit(phase, job, paths):
    if phase not in ('preflight', 'full') or job not in (PREFLIGHT_JOBS if phase == 'preflight' else FULL_JOBS):
        raise ValueError('Undeclared phase/job')
    required = {(16, 2, .1)} if (phase, job) != ('preflight', (16, 2, .1)) else set()
    if phase == 'full' and job[1] == 4:
        required.add(job)
    fixed = prior.cross.campaign106.baseline.baseline.reference.campaign100.baseline()
    admitted, records = set(), []
    for path in paths:
        raw = path.read_bytes(); packet = json.loads(raw)
        if (packet['phase'] != 'preflight' or packet['timesS'] != [0., 1e-6]
                or packet['workerExitCode'] != 0
                or packet['sourceSHA256'] != sources() or packet['inputSHA256'] != INPUT_SHA256
                or packet['manifest'] != fixed['manifest'] or packet['scenario'] != fixed['scenarios'][0]
                or packet['radialBalanceMethod'] != prior.cross.campaign106.METHOD
                or packet['baselinePredictionSHA256'] != old.BASELINE or packet['conditionalRelease'] is not True
                or any(packet[flag] is not False for flag in ('currentFitted', 'velocityFitted',
                    'targetVelocityRead', 'experimentalQualification', 'originalGatesReplaced',
                    'originalFailuresSuperseded'))
                or len(packet['cases']) != 1):
            raise ValueError('Require same-source sealed preflight receipt')
        row = packet['cases'][0]
        key = row['radialRefinement'], row['axialRefinement'], row['cfl']
        if (key not in PREFLIGHT_JOBS or row['completed'] is not True or row['maxDtS'] != 1e-7
                or packet['resourceBudgetKiB'] != RESOURCE_BUDGET_KIB[key[:2]]
                or row['resourceBudgetKiB'] != RESOURCE_BUDGET_KIB[key[:2]]
                or not 0 < row['peakResidentKiB'] < RESOURCE_BUDGET_KIB[key[:2]]):
            raise ValueError('Preflight did not meet its declared resource budget')
        state = prior.cross.read_field(path.parent, row)
        if [s['timeS'] for s in state['snapshots']] != [0., 1e-6]:
            raise ValueError('Preflight field clocks changed')
        for actual, expected in zip((state['radialEdgesM'], state['axialEdgesM']), geometry(*key[:2])):
            if not np.array_equal(actual, expected):
                raise ValueError('Preflight field geometry changed')
        admitted.add(key); records.append(dict(path=str(path), sha256=old.sha(raw), job=list(key),
            peakResidentKiB=row['peakResidentKiB'], resourceBudgetKiB=row['resourceBudgetKiB']))
    if not required <= admitted:
        raise ValueError('Required successful resource preflight is missing')
    return records


def worker(args, job):
    packet = inputs(args.original, args.cross, args.radial)
    admit(args.phase, job, args.preflight)
    sealed = sources(); rn, zn, cfl = job
    old.TIMES = (0., 1e-6) if args.phase == 'preflight' else TIMES
    old.mesh = lambda _: geometry(rn, zn)
    started = time.monotonic()
    old.Diffusion = progress_diffusion(old.Diffusion, started)
    state = old.evolve(packet['scenario'], packet['manifest'], 1, cfl)
    if [s['timeS'] for s in state['snapshots']] != list(old.TIMES):
        raise ValueError('Saved clocks changed')
    for actual, expected in zip((state['radialEdgesM'], state['axialEdgesM']), geometry(rn, zn)):
        if not np.array_equal(actual, expected):
            raise ValueError('Saved geometry changed')
    if state['cfl'] != cfl or state['history'][-1]['timeS'] != old.TIMES[-1]:
        raise ValueError('Saved CFL/history changed')
    raw = json.dumps(state, separators=(',', ':'), allow_nan=False).encode()
    packed = gzip.compress(raw, mtime=0); name = 'fields/'+args.label+'.json.gz'
    with (args.out/name).open('xb') as stream:
        stream.write(packed)
    if sources() != sealed:
        raise ValueError('V107 sources changed during the case')
    inputs(args.original, args.cross, args.radial)
    peak = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    row = dict(label=args.label, refinement=rn, radialRefinement=rn, axialRefinement=zn,
        nr=len(state['radialEdgesM'])-1, nz=len(state['axialEdgesM'])-1, cfl=cfl,
        maxDtS=1e-7, anodeCenterM=.07, resourceBudgetKiB=RESOURCE_BUDGET_KIB[(rn, zn)],
        completed=peak < RESOURCE_BUDGET_KIB[(rn, zn)],
        stepCount=len(state['history']), maximumTemperatureK=max(h['maximumTemperatureK'] for h in state['history']),
        elapsedS=time.monotonic()-started, peakResidentKiB=peak,
        fieldPacket=dict(path=name, sha256=old.sha(packed), rawSHA256=old.sha(raw)))
    prior.cross.write(args.out/'case.json', row)
    print('CASE_FINISHED', args.label, row['elapsedS'], peak, row['completed'], flush=True)
    if not row['completed']:
        raise RuntimeError('Case exceeded its declared measured peak limit')


def main(args, job):
    packet = inputs(args.original, args.cross, args.radial)
    receipts = admit(args.phase, job, args.preflight); sealed = sources()
    args.out.mkdir(parents=True, exist_ok=False); (args.out/'fields').mkdir()
    result = dict(schemaVersion=1, phase=args.phase, timesS=(0., 1e-6) if args.phase == 'preflight' else TIMES,
        resourceBudgetKiB=RESOURCE_BUDGET_KIB[job[:2]],
        sourceSHA256=sealed, inputSHA256=INPUT_SHA256, preflightPackets=receipts,
        manifest=packet['manifest'], scenario=packet['scenario'], baselinePredictionSHA256=old.BASELINE,
        radialBalanceMethod=prior.cross.campaign106.METHOD, targetVelocityRead=False,
        currentFitted=False, velocityFitted=False, conditionalRelease=True, experimentalQualification=False,
        originalGatesReplaced=False, originalFailuresSuperseded=False, cases=[])
    destination = args.out/'predictions.json'
    destination.write_text(json.dumps(result, indent=2)+'\n')
    command = [sys.executable, str(Path(__file__).resolve()), '--worker', str(args.out), args.phase,
               args.label, str(args.original), str(args.cross), str(args.radial)]
    for path in args.preflight:
        command.extend(('--preflight', str(path)))
    env = dict(os.environ, OPENBLAS_NUM_THREADS='1', OMP_NUM_THREADS='1')
    with (args.out/'case.log').open('x') as log:
        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, env=env, text=True)
        for line in process.stdout:
            log.write(line); log.flush(); print(line, end='', flush=True)
        code = process.wait()
    rowfile = args.out/'case.json'
    if rowfile.exists():
        result['cases'] = [json.loads(rowfile.read_bytes())]
    else:
        rn, zn, cfl = job
        result['cases'] = [dict(label=args.label, refinement=rn, radialRefinement=rn,
            axialRefinement=zn, cfl=cfl, resourceBudgetKiB=RESOURCE_BUDGET_KIB[(rn, zn)],
            completed=False, workerExitCode=code)]
    if sources() != sealed:
        raise ValueError('V107 source inventory changed')
    inputs(args.original, args.cross, args.radial)
    result['workerExitCode'] = code
    destination.write_text(json.dumps(result, indent=2, allow_nan=False)+'\n')
    if code or result['cases'][0]['completed'] is not True:
        raise RuntimeError('Case failed; receipt, logs and any fields retained')
    print('SEALED', old.sha(destination.read_bytes()), flush=True)


if __name__ == '__main__':
    if sys.platform != 'linux' or os.getuid() != 1000:
        raise RuntimeError('Execute only inside safe-dev')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--worker', action='store_true')
    parser.add_argument('out', type=lambda p: Path(p).resolve())
    parser.add_argument('phase', choices=('preflight', 'full'))
    parser.add_argument('label', choices=tuple(label(job) for job in FULL_JOBS))
    for name in ('original', 'cross', 'radial'):
        parser.add_argument(name, type=lambda p: Path(p).resolve())
    parser.add_argument('--preflight', action='append', default=[], type=lambda p: Path(p).resolve())
    args = parser.parse_args()
    job = next(job for job in FULL_JOBS if label(job) == args.label)
    (worker if args.worker else main)(args, job)
