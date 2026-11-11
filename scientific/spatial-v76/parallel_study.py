"""Resume sealed independent trajectories concurrently inside one safe-dev VM.

No physical source or manifest edits. Completed checkpoints are preserved;
an interrupted, unsaved trajectory is recomputed in full. Run offline only.
"""
import argparse
from concurrent.futures import ProcessPoolExecutor, as_completed
import hashlib
from importlib.metadata import version
import json
import multiprocessing
from pathlib import Path
import platform
import sys

SOURCE = Path(__file__).resolve().parents[1]/'mixture-axial-v75'
sys.path.insert(0, str(SOURCE))
from run import admit_checkpoint, hashes, requests, serial, trajectory

BACKUP_ROOT = Path('/work/home')


def check_backup(path):
    if not path.resolve().is_relative_to(BACKUP_ROOT.resolve()) or path.exists():
        raise ValueError('Need a NEW backup file in persistent guest /work/home, outside replaceable source')


def save_checkpoint(report, output, source_map, backup):
    if hashes() != source_map:
        raise AssertionError('Scientific source changed during execution')
    content = (json.dumps(report, default=serial, indent=2, allow_nan=False)+'\n').encode()
    # Persist outside /work/project FIRST. A failed project write/export/sync
    # must never discard the latest expensive completed trajectories.
    for destination in (backup, output):
        temporary = destination.with_suffix('.checkpoint.tmp')
        temporary.write_bytes(content)
        temporary.replace(destination)
    if backup.read_bytes() != output.read_bytes():
        raise AssertionError('Persistent checkpoint differs from project checkpoint')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--workers', type=int, choices=(1, 2, 3), default=3)
    parser.add_argument('--backup', type=Path, required=True,
                        help='New persistent guest /work/home checkpoint, surviving source sync')
    args = parser.parse_args()
    check_backup(args.backup)
    original_bytes = args.output.read_bytes()
    report = json.loads(original_bytes)
    manifest = json.loads((SOURCE/'manifest.json').read_text())
    source_map = hashes()
    runtime = dict(python=platform.python_version(), numpy=version('numpy'),
                   scipy=version('scipy'), fipy=version('fipy'))
    keys = admit_checkpoint(report, dict(manifest=manifest, sourceHashes=source_map, preRunRuntime=runtime))
    remaining = sorted((k for k in requests(manifest) if k not in keys),
                       key=lambda k: k[0]*k[1]*k[2], reverse=True)
    report.setdefault('orchestration', []).append(dict(
        runnerSha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        resumedInputSha256=hashlib.sha256(original_bytes).hexdigest(), workers=args.workers,
        backupGuestPath=str(args.backup), completedBefore=len(keys), pending=[list(k) for k in remaining]))
    def save():
        save_checkpoint(report, args.output, source_map, args.backup)
    save()
    with ProcessPoolExecutor(max_workers=args.workers, mp_context=multiprocessing.get_context('spawn')) as pool:
        pending = {pool.submit(trajectory, manifest, *key): key for key in remaining}
        for future in as_completed(pending):
            key = pending[future]
            try:
                report['cases'].append(future.result())
            except Exception as error:
                report['failures'].append(dict(zip(('nr', 'nz', 'nt', 'mode'), key), error=repr(error)))
            save()
            print(f'CHECKPOINT {len(report["cases"])}/{len(requests(manifest))} failures={len(report["failures"])}', flush=True)
    raise SystemExit(1 if report['failures'] else 0)
