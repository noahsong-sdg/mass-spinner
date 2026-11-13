"""Export replay evidence with exact-byte canonical recovery pointers; guest only."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import platform
import tarfile


def digest(path, git_blob=False):
    h = hashlib.sha1() if git_blob else hashlib.sha256()
    if git_blob:
        h.update(('blob '+str(path.stat().st_size)+'\0').encode())
    with path.open('rb') as stream:
        for block in iter(lambda: stream.read(1024*1024), b''):
            h.update(block)
    return h.hexdigest()


def canonical_relative(name):
    parts = Path(name).parts
    if parts[0] in ('v86', 'v87'):
        return Path(*parts[1:])
    if parts[:2] == ('baseline', 'v86'):
        return Path('scientific/meridional-v86/results', *parts[2:])
    if parts[:2] == ('baseline', 'v87'):
        return Path('scientific/timestep-v87/results', *parts[2:])
    return None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--run', type=Path, required=True)
    parser.add_argument('--helper', type=Path, required=True)
    parser.add_argument('--source', type=Path, default=Path('/work/project'))
    parser.add_argument('--host-canonical', required=True)
    parser.add_argument('--git-tree', type=Path, required=True,
                        help='Trusted host git ls-tree -rz -r COMMIT output')
    parser.add_argument('--repository-url', required=True)
    parser.add_argument('--commit', required=True)
    parser.add_argument('--archive', type=Path, required=True)
    args = parser.parse_args()
    if platform.system() != 'Linux' or os.getuid() != 1000:
        raise RuntimeError('Execute only in the nonroot safe-dev guest')
    if args.archive.exists() or Path(str(args.archive)+'.json').exists():
        raise FileExistsError('Preserve an existing evidence archive')
    tree = {}
    for entry in args.git_tree.read_bytes().split(b'\0'):
        if not entry:
            continue
        metadata, name = entry.split(b'\t', 1)
        mode, kind, oid = metadata.decode().split()
        if kind == 'blob' and mode in ('100644', '100755'):
            tree[name.decode()] = oid
    receipt = json.loads((args.run/'execution.json').read_bytes())
    if receipt.get('physicalCampaignsComplete') is not True:
        raise ValueError('Incomplete run; do not label it a completed replay packet')
    closure = json.loads((args.run/'source-closure.json').read_bytes())['fileSHA256']
    for name, expected in {**closure, **receipt['outputSHA256']}.items():
        if digest(args.run/name) != expected:
            raise ValueError('Changed source/input/output since its receipt: '+name)
    packed, recovered = [], []
    for prefix, directory in (('run', args.run), ('helper', args.helper)):
        for path in sorted(directory.rglob('*')):
            if '__pycache__' in path.parts or path == args.archive:
                continue
            if path.is_symlink():
                raise ValueError('Unexpected evidence symlink: '+str(path))
            if not path.is_file():
                continue
            name = str(path.relative_to(directory)); value = digest(path)
            row = dict(path=prefix+'/'+name, sha256=value, bytes=path.stat().st_size)
            relative = canonical_relative(name) if prefix == 'run' else None
            original = args.source/relative if relative else None
            blob = tree.get(str(relative)) if relative else None
            if (original and original.is_file() and blob
                    and digest(original) == value and digest(path, git_blob=True) == blob):
                recovered.append(row | dict(canonicalPath=str(Path(args.host_canonical)/relative),
                                             canonicalRelativePath=str(relative),
                                             repositoryURL=args.repository_url,
                                             commit=args.commit, gitBlobOID=blob))
            else:
                packed.append((path, row))
    total = sum(row['bytes'] for _, row in packed)
    if total >= 512*1024*1024:
        raise ValueError('Unique evidence exceeds the bounded export budget')
    manifest = dict(schema=1, runReceiptSHA256=digest(args.run/'execution.json'),
                    repositoryURL=args.repository_url, commit=args.commit,
                    gitTreeSHA256=digest(args.git_tree),
                    gitTreeCommand=['git', 'ls-tree', '-rz', '-r', args.commit],
                    gitTreeProvenance='Trusted host read-only Git command, reviewed by root; Git-free guest verifies candidate bytes against its recorded blob OIDs.',
                    physicalCampaignsComplete=True, allCommandsPassed=receipt['allCommandsPassed'],
                    experimentalQualification=False, packedBytes=total,
                    included=[row for _, row in packed], recoveredExactBytes=recovered,
                    scope='Exact-byte deduplication against a pinned Git blob only. All guest originals remain retained. Recover omitted bytes from the named repository commit/path or verified local file; verify both SHA256 and Git blob OID. Untracked or different bytes are included in full.')
    raw = (json.dumps(manifest, indent=2, allow_nan=False)+'\n').encode()
    if total+len(raw) >= 512*1024*1024:
        raise ValueError('Evidence plus inventory exceeds the export budget')
    with args.archive.open('xb') as stream, tarfile.open(fileobj=stream, mode='w:gz') as archive:
        for path, row in packed:
            archive.add(path, arcname=row['path'], recursive=False)
        entry = tarfile.TarInfo('archive-inventory.json'); entry.size = len(raw)
        archive.addfile(entry, io.BytesIO(raw))
    # Verify the actual archive bytes before authorizing their transfer.
    with tarfile.open(args.archive, mode='r:gz') as archive:
        members = archive.getmembers()
        expected = {row['path']: row for _, row in packed}
        if len(members) != len(expected)+1 or len({m.name for m in members}) != len(members):
            raise ValueError('Archive member inventory changed')
        for member in members:
            if not member.isfile():
                raise ValueError('Non-regular archive member')
            data = archive.extractfile(member).read()
            if member.name == 'archive-inventory.json':
                if data != raw:
                    raise ValueError('Archive inventory changed')
            elif (member.name not in expected or member.size != expected[member.name]['bytes']
                  or hashlib.sha256(data).hexdigest() != expected[member.name]['sha256']):
                raise ValueError('Archive payload does not match its receipt: '+member.name)
    result = dict(archive=str(args.archive), sha256=digest(args.archive),
                  archiveBytes=args.archive.stat().st_size, includedFiles=len(packed),
                  includedRegularBytes=total, recoveredFiles=len(recovered),
                  recoveredBytes=sum(row['bytes'] for row in recovered))
    result['includedMemberHashesVerified'] = True
    metadata = json.dumps(result, indent=2)+'\n'
    if result['archiveBytes']+len(metadata.encode()) >= 512*1024*1024:
        raise ValueError('Actual archive and sidecar exceed the bounded transfer budget')
    Path(str(args.archive)+'.json').write_text(metadata)
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
