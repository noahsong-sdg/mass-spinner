"""Fresh V86/V87 physical replays; execute only inside a root-owned safe-dev VM."""
import argparse
from datetime import datetime, timezone
import gzip
import hashlib
from importlib.metadata import version
import json
import os
from pathlib import Path
import platform
import re
import shutil
import subprocess
import sys
import time
import zlib


PINS = {'numpy': '2.4.6', 'scipy': '1.17.1', 'scikit-fem': '12.0.2',
        'FiPy': '4.0.3', 'matplotlib': '3.10.8', 'PyAbel': '0.9.1'}
DIRECTORIES = ('meridional-v86', 'meridional-v86-independent', 'timestep-v87',
               'timestep-v87-independent', 'tooling-v87', 'mixture-axial-v75',
               'electrical-v82', 'flow-v81', 'optical-v80')
V86_SHA = '70e0923e8ac9a53a476e439a9df3e670fb52467ee9d3d6ab5aa62ad9eae5e5c7'


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def stamp():
    return datetime.now(timezone.utc).isoformat()


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, allow_nan=False)+'\n')


def load(path):
    path = Path(path)
    raw = path.read_bytes()
    return json.loads(gzip.decompress(raw) if path.suffix == '.gz' else raw)


def copy(source, target):
    if source.is_symlink():
        raise ValueError('Source closure must not contain symlinks: '+str(source))
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, target)


def prepare(source, destination):
    """Copy closure and frozen inputs; never mutate the source tree."""
    destination.mkdir(exist_ok=False)
    baseline = source/'scientific/meridional-v86/results'
    if sha(baseline/'predictions.json') != V86_SHA:
        raise ValueError('Wrong original V86 prediction')
    v86 = load(baseline/'predictions.json')
    v87 = load(source/'scientific/timestep-v87/results/predictions.json')
    for packet in (v86, v87):
        for name, expected in packet['sourceSHA256'].items():
            if sha(source/name) != expected:
                raise ValueError('Current source differs from frozen physical source: '+name)
    common = []
    for directory in DIRECTORIES:
        for path in sorted((source/'scientific'/directory).iterdir()):
            if path.is_file() and path.suffix in ('.py', '.json', '.md', '.txt'):
                common.append(path.relative_to(source))
    baseline_inputs = [Path('scientific/boundary-v84/results/predictions.json'),
                       Path('scientific/profile-v79/results/score.json'),
                       Path('scientific/optical-v80/results/verification.json')]
    for stage in ('v86', 'v87'):
        root = destination/stage
        for name in (*common, *baseline_inputs):
            copy(source/name, root/name)
    # V86's independent replay/Fourier validation reads the actual archived attempt.
    archive = Path('scientific/meridional-v86/results/attempt01')
    shutil.copytree(source/archive, destination/'v86'/archive,
                    ignore=shutil.ignore_patterns('__pycache__', '*.pyc'))
    # V87 must read the original exact V86 packet and report, not the rerun's metadata.
    retained = ['predictions.json', 'optical-index.json', 'comparison-summary.json',
                'comparison.json.gz', 'audit.json', 'panel-audit.json']
    selected = next(c for c in v86['cases'] if c['scenario'] == v86['scenarios'][0]['name']
                    and c['anodeCenterM'] == .07 and c['nr'] == 64 and c['maxDtS'] == 1e-7)
    retained.append(selected['fieldPacket']['path'])
    for name in retained:
        relative = Path('scientific/meridional-v86/results')/name
        copy(source/relative, destination/'v87'/relative)
    # Keep all original field packets once for independent numerical replay comparison.
    for label, packet in (('v86', v86), ('v87', v87)):
        directory = 'meridional-v86' if label == 'v86' else 'timestep-v87'
        old = source/'scientific'/directory/'results'
        frozen = destination/'baseline'/label
        copy(old/'predictions.json', frozen/'predictions.json')
        for case in packet['cases']:
            copy(old/case['fieldPacket']['path'], frozen/case['fieldPacket']['path'])
        for name in ('audit.json', 'panel-audit.json', 'summary.json'):
            if (old/name).is_file():
                copy(old/name, frozen/name)
    manifest = {}
    for stage in ('v86', 'v87', 'baseline'):
        for path in sorted((destination/stage).rglob('*')):
            if path.is_file():
                manifest[str(path.relative_to(destination))] = sha(path)
    log = source/'scientific/meridional-v86/results/logs/flow.log'
    durations = [float(x) for x in re.findall(r'^END .+ ([\d.]+)$', log.read_text(), re.M)]
    write(destination/'source-closure.json', dict(sourceRoot=str(source),
          fileSHA256=manifest, inputBytes=sum((destination/p).stat().st_size for p in manifest),
          originalV86CaseSeconds=durations, originalV86TotalCaseSeconds=sum(durations),
          scope='Copied sources and frozen inputs; no physical outputs have been regenerated.'))
    return manifest


def compare_fields(new_root, baseline, output):
    """Describe exact/raw and numerical differences without changing any gate."""
    import numpy as np
    new, old = load(new_root/'predictions.json'), load(baseline/'predictions.json')
    old_cases = {c['label']: c for c in old['cases']}
    if len(new['cases']) != len(old_cases) or {c['label'] for c in new['cases']} != set(old_cases):
        raise ValueError('Physical campaign inventory changed')
    rows = []
    for case in new['cases']:
        prior = old_cases[case['label']]
        if case.get('completed') is not True or prior.get('completed') is not True:
            raise ValueError('Incomplete physical trajectory: '+case['label'])
        records = []
        for root, entry in ((new_root, case), (baseline, prior)):
            info = entry['fieldPacket']; path = root/info['path']; packed = path.read_bytes()
            raw = gzip.decompress(packed)
            if sha(path) != info['sha256'] or hashlib.sha256(raw).hexdigest() != info['rawSHA256']:
                raise ValueError('Field packet authentication failed')
            records.append(json.loads(raw))
        current, previous = records
        differences = []
        def numerical(name, a, b):
            x, y = np.asarray(a, dtype=float), np.asarray(b, dtype=float)
            if x.shape != y.shape or not np.isfinite(x).all() or not np.isfinite(y).all():
                raise ValueError('Changed/nonfinite array: '+name)
            delta = abs(x-y); scale = float(np.max(abs(y))) if y.size else 0.
            maximum = float(np.max(delta)) if delta.size else 0.
            differences.append(dict(field=name, shape=list(x.shape), maxAbsoluteDifference=maximum,
                                    baselineMaxAbsolute=scale,
                                    maxDifferenceOverBaselinePeak=maximum/scale if scale else None,
                                    exactlyEqual=bool(np.array_equal(x, y))))
        if len(current['snapshots']) != len(previous['snapshots']):
            raise ValueError('Reporting-time inventory changed')
        for index, (a, b) in enumerate(zip(current['snapshots'], previous['snapshots'])):
            if a.keys() != b.keys():
                raise ValueError('Saved state schema changed')
            for key in a:
                numerical(f'snapshot[{index}].{key}', a[key], b[key])
        if len(current['history']) != len(previous['history']):
            raise ValueError('Accepted step count changed')
        for key in current['history'][0]:
            numerical('history.'+key, [h[key] for h in current['history']],
                      [h[key] for h in previous['history']])
        rows.append(dict(label=case['label'], stepCount=case['stepCount'],
                         compressedBytesEqual=case['fieldPacket']['sha256'] == prior['fieldPacket']['sha256'],
                         rawBytesEqual=case['fieldPacket']['rawSHA256'] == prior['fieldPacket']['rawSHA256'],
                         decodedStateExactlyEqual=current == previous, numericalDifferences=differences))
    write(output, dict(cases=rows, completedCases=len(rows),
          rawIdenticalCases=sum(r['rawBytesEqual'] for r in rows),
          exactDecodedCases=sum(r['decodedStateExactlyEqual'] for r in rows),
          predictionBytesEqual=sha(new_root/'predictions.json') == sha(baseline/'predictions.json'),
          experimentalQualification=False, scope='Descriptive replay differences; all original gates remain authoritative.'))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, default=Path('/work/project'))
    parser.add_argument('--destination', type=Path, required=True)
    parser.add_argument('--flow-only', action='store_true', help='Omit full optical production; record reduced scope.')
    args = parser.parse_args()
    if platform.system() != 'Linux' or os.getuid() != 1000:
        raise RuntimeError('Execute only in the nonroot Apple safe-dev guest')
    source, destination = args.source.resolve(), args.destination.resolve()
    if not destination.is_relative_to(Path('/work/project')) or destination == source:
        raise ValueError('Fresh destination must be below /work/project and differ from source')
    installed = {p: version(p) for p in PINS}
    if installed != PINS:
        raise ValueError('Scientific package drift: '+json.dumps(installed))
    closure = prepare(source, destination)
    receipt = dict(startedUTC=stamp(), python=sys.version, zlib=zlib.ZLIB_VERSION,
                   platform=platform.platform(), versions=installed, commands=[],
                   helperSHA256=sha(__file__), flowOnly=args.flow_only,
                   experimentalQualification=False, physicalCampaignsComplete=False)
    def run(name, root, command, scientific_output=None):
        started = time.monotonic(); path = destination/'logs'/(name+'.log')
        path.parent.mkdir(exist_ok=True)
        print('RUN', name, flush=True)
        with path.open('x') as stream:
            process = subprocess.Popen(command, cwd=root, stdout=subprocess.PIPE,
                                       stderr=subprocess.STDOUT, text=True,
                                       env=os.environ | {'OMP_NUM_THREADS': '1', 'OPENBLAS_NUM_THREADS': '1'})
            for line in process.stdout:
                stream.write(line); stream.flush()
                if name in ('v86-flow', 'v87-flow', 'v86-optics'):
                    print(line.rstrip(), flush=True)
            code = process.wait()
        receipt['commands'].append(dict(name=name, command=command, cwd=str(root),
                                        exitCode=code, wallSeconds=time.monotonic()-started,
                                        scientificFailureRetained=bool(code and scientific_output)))
        receipt['updatedUTC'] = stamp(); write(destination/'execution.json', receipt)
        print('EXIT', name, code, flush=True)
        if code and not (code == 1 and scientific_output and scientific_output.is_file()):
            raise RuntimeError('Command failed; dependent work stopped: '+name)
    py = sys.executable
    v86, v87 = destination/'v86', destination/'v87'
    flow = v86/'scientific/meridional-v86'; out = flow/'results'
    independent = v86/'scientific/meridional-v86-independent'
    run('v86-controls', flow, [py, '-m', 'unittest', 'discover', '-p', 'test_*86.py', '-v'])
    run('v86-independent-controls', flow, [py, '-m', 'unittest', 'discover', '-s', str(independent), '-p', 'test_*86.py', '-v'])
    run('v86-hydro-controls', flow, [py, '-m', 'unittest', 'discover', '-s', '../mixture-axial-v75', '-p', 'test_flow.py', '-v'])
    run('v86-wall-controls', flow, [py, '-m', 'unittest', 'discover', '-s', str(independent), '-p', 'torque86.py', '-v'])
    if not args.flow_only:
        run('v86-fourier-validation', flow, [py, str(independent/'validate_fourier86.py')])
    run('v86-flow', flow, [py, 'campaign86.py', 'flow'])
    compare_fields(out, destination/'baseline/v86', destination/'v86-replay-differences.json')
    run('v86-archived-field-replay', flow, [py, str(independent/'replay_fields86.py')])
    run('v86-original-audit', flow, [py, 'audit86.py', 'results/predictions.json', 'results/audit.json'], out/'audit.json')
    run('v86-panel-audit', flow, [py, str(independent/'panel86.py'), 'results/predictions.json', 'results/panel-audit.json'], out/'panel-audit.json')
    run('v86-thermal-reference', flow, [py, 'thermal_reference86.py', 'results/thermal-reference.json'], out/'thermal-reference.json')
    if not args.flow_only:
        run('v86-optics', flow, [py, 'compare86.py', 'optics'])
        optical = load(out/'optical-index.json')
        if len(optical['groups']) != 64 or not all(c['completed'] for c in optical['groups']):
            raise ValueError('Incomplete full optical campaign; retained index must be inspected')
        run('v86-compare', flow, [py, 'compare86.py', 'compare'])
        run('v86-summary', flow, [py, 'summarize86.py'])
    run('v87-study-controls', v87, [py, '-m', 'unittest', 'discover', '-s', 'scientific/timestep-v87', '-p', 'test_*87.py', '-v'])
    run('v87-independent-controls', v87, [py, '-m', 'unittest', 'discover', '-s', 'scientific/timestep-v87-independent', '-p', 'test_audit87.py', '-v'])
    run('v87-report-controls', v87, [py, '-m', 'unittest', 'discover', '-s', 'scientific/tooling-v87', '-p', 'test_check_report87.py', '-v'])
    run('v87-flow', v87, [py, 'scientific/timestep-v87/launch87.py'])
    temporal = v87/'scientific/timestep-v87/results'
    compare_fields(temporal, destination/'baseline/v87', destination/'v87-replay-differences.json')
    run('v87-original-report-admission', v87, [py, 'scientific/tooling-v87/check_report87.py'])
    run('v87-audit', v87, [py, 'scientific/timestep-v87-independent/audit87.py', 'scientific/timestep-v87/results/predictions.json', 'scientific/timestep-v87/results/audit.json'], temporal/'audit.json')
    run('v87-summary', v87, [py, 'scientific/timestep-v87/summarize87.py'])
    for name, expected in closure.items():
        if sha(destination/name) != expected:
            raise ValueError('Frozen copied source/input changed during execution: '+name)
    receipt.update(finishedUTC=stamp(), physicalCampaignsComplete=True,
                   allCommandsPassed=all(c['exitCode'] == 0 for c in receipt['commands']),
                   fullModelNumericallyQualified=False,
                   outputSHA256={str(p.relative_to(destination)): sha(p) for p in sorted(destination.rglob('*'))
                                 if p.is_file() and str(p.relative_to(destination)) not in closure
                                 and p.name != 'execution.json' and '__pycache__' not in p.parts})
    write(destination/'execution.json', receipt)
    return 0 if receipt['allCommandsPassed'] else 1


if __name__ == '__main__':
    raise SystemExit(main())
