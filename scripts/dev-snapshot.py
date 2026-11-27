#!/usr/bin/env python3
"""Copy reviewed web build/test inputs, without modifying retained science evidence."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

# All maintained application inputs; scientific campaigns are opt-in fixtures below.
DIRECTORIES = ('src/', 'scripts/', 'tests/', 'e2e/', 'schemas/', 'web-assets/',
               'assets/', 'blender/', 'ci/', '.github/', 'docs/', 'security/')
ROOT_FILES = ('package.json', 'package-lock.json', 'vite.config.mjs', 'eslint.config.mjs',
              'playwright.config.ts', 'wrangler.jsonc', 'index.html', 'laurelin.html',
              '.node-version', '.gitignore', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'README.md',
              'LAURELIN-MODEL.md')
SCIENCE = (
    'scientific/electron-applicability/', 'scientific/equilibrium-composition/oracle.py',
    'scientific/experimental-v64/metrics.ts', 'scientific/experimental-v64/data/markers-corrected.json',
    'scientific/field-v70/scaling.ts', 'scientific/hotwall-boundary-v60/metrics.ts',
    'scientific/loading-independent-v24/reference-v24.json',
    'scientific/neutron-v38/results/decay-oracle.json',
    'scientific/marathon-v35/neutron-independent/independent-first.json',
    'scientific/formulary/plasmapy-reference.json',
    'scientific/transport-v33/performance/original-coulomb.ts',
    'scientific/transport-v33/performance/original-ring.ts',
    'scientific/nonrigid-v98/evidence.tar.gz',
    'scientific/public-data-campaign/results/comparison.png',
    'scientific/general3d-evolution-v17/main-results/',
    'scientific/general3d-review-v17/results/',
    'scientific/evolution-review-v16/reviewed-results/',
)
LIMIT = 512 * 1024 * 1024
MANIFEST = 'dev-inputs.json'
COMMIT = 'dev-source-commit'


def git(root, *args):
    return subprocess.check_output(['git', '-C', str(root), *args])


def allowed(name):
    return (name in ROOT_FILES or name.startswith('tsconfig') and '/' not in name and name.endswith('.json')
            or any(name.startswith(p) for p in DIRECTORIES)
            or any(name.startswith(p) if p.endswith('/') else name == p for p in SCIENCE))


def safe(name):
    path = Path(name)
    denied = {'.git', '.hg', '.svn', '.ssh', '.aws', '.azure', '.config', '.kube', '.gnupg',
              '.codex', '.claude', '.cursor', '.vscode', '.idea', '.npmrc', '.pypirc', '.netrc',
              '.gitconfig', 'node_modules', '.venv', 'venv', '__pycache__', '.cache', '.next',
              'dist', 'build', 'target', '.ds_store', 'credentials', 'credentials.json', 'secrets', 'secrets.json'}
    return (not path.is_absolute() and '..' not in path.parts
            and not any(p.lower() in denied or p.lower().startswith(('.env', 'id_rsa', 'id_ed25519')) for p in path.parts)
            and path.suffix.lower() not in {'.pem', '.key', '.p12', '.pfx'})


def digest(data):
    return hashlib.sha256(data).hexdigest()


def build(root, destination):
    root, destination = root.resolve(), destination.resolve()
    if destination.exists() or root == destination or root in destination.parents:
        raise ValueError('Use a new destination outside the source checkout')
    names = git(root, 'ls-files', '--cached', '--others', '--exclude-standard', '-z').decode().split('\0')
    selected = sorted({name for name in names if name and allowed(name) and safe(name)})
    commit = git(root, 'cat-file', 'commit', 'HEAD')
    revision = git(root, 'rev-parse', '--verify', 'HEAD').decode().strip()
    payload = {}
    for name in selected:
        source = root / name
        if source.is_symlink() or any(p.is_symlink() for p in source.parents if p != root.parent):
            raise ValueError(f'Symlink input refused: {name}')
        if not source.exists():  # A working-tree deletion is not an input.
            continue
        if not source.is_file():
            raise ValueError(f'Non-file input refused: {name}')
        payload[name] = source.read_bytes()
    payload[COMMIT] = commit
    size = sum(map(len, payload.values()))
    if size > LIMIT:
        raise ValueError(f'Inputs exceed 512 MiB: {size} bytes')
    metadata = dict(schemaVersion=1, scope='development web build and tests; not a complete science checkout',
                    sourceRevision=revision, lockSHA256=digest(payload['package-lock.json']),
                    files={name: dict(bytes=len(data), sha256=digest(data)) for name, data in sorted(payload.items())},
                    bytes=size)
    raw = (json.dumps(metadata, indent=2) + '\n').encode()
    if size + len(raw) > LIMIT:
        raise ValueError('Inputs and manifest exceed 512 MiB')
    destination.mkdir(parents=True)
    for name, data in payload.items():
        target = destination / name
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(data)
        target.chmod((root / name).stat().st_mode & 0o777 if name != COMMIT else 0o644)
    (destination / MANIFEST).write_bytes(raw)
    verify(destination)
    return metadata


def verify(root):
    metadata = json.loads((root / MANIFEST).read_bytes())
    if metadata.get('schemaVersion') != 1:
        raise ValueError('Unsupported input manifest')
    expected_names = set(metadata['files']) | {MANIFEST}
    actual_names = set()
    for path in root.rglob('*'):
        if path.is_symlink():
            raise ValueError(f'Symlink input refused: {path.relative_to(root)}')
        if path.is_file():
            actual_names.add(path.relative_to(root).as_posix())
        elif not path.is_dir():
            raise ValueError(f'Non-file input refused: {path.relative_to(root)}')
    if actual_names != expected_names:
        raise ValueError(f'Input inventory changed: extra={sorted(actual_names - expected_names)}, missing={sorted(expected_names - actual_names)}')
    for name, expected in metadata['files'].items():
        if not safe(name):
            raise ValueError(f'Unsafe manifest path: {name}')
        path = root / name
        if path.is_symlink() or any(p.is_symlink() for p in path.parents if p != root.parent):
            raise ValueError(f'Symlink input refused: {name}')
        data = path.read_bytes()
        if len(data) != expected['bytes'] or digest(data) != expected['sha256']:
            raise ValueError(f'Input changed: {name}')
    commit = (root / COMMIT).read_bytes()
    actual = hashlib.sha1(b'commit ' + str(len(commit)).encode() + b'\0' + commit).hexdigest()
    if actual != metadata['sourceRevision'] or digest((root / 'package-lock.json').read_bytes()) != metadata['lockSHA256']:
        raise ValueError('Source revision or lock identity changed')
    return metadata


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('destination', type=Path)
    parser.add_argument('--source', type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument('--verify', action='store_true')
    args = parser.parse_args()
    result = verify(args.destination) if args.verify else build(args.source, args.destination)
    print(json.dumps(dict(path=str(args.destination.absolute()), files=len(result['files']),
                          bytes=result['bytes'], sourceRevision=result['sourceRevision'],
                          manifestSHA256=digest((args.destination / MANIFEST).read_bytes()))))
