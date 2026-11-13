"""Exact-byte content admission for this conduction pilot only."""
import hashlib
import json
from pathlib import Path


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def read(path):
    path = Path(path)
    raw = path.read_bytes()
    if Path(str(path)+'.sha256').read_text().strip() != sha(raw):
        raise ValueError('Corrupt sealed artifact: '+str(path))
    return json.loads(raw), sha(raw)


def write(path, value):
    path = Path(path)
    seal = Path(str(path)+'.sha256')
    if path.exists() or seal.exists():
        raise FileExistsError('Immutable artifact already exists: '+str(path))
    path.parent.mkdir(parents=True, exist_ok=True)
    raw = (json.dumps(value, sort_keys=True, allow_nan=False)+'\n').encode()
    temporary = Path(str(path)+'.partial')
    temporary.write_bytes(raw)
    temporary.replace(path)
    seal.write_text(sha(raw)+'\n')
