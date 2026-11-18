"""Package and retrieve immutable evidence; never run downloaded contents."""
import hashlib
import json
import shutil
import tarfile
import tempfile
import urllib.request
from pathlib import Path, PurePosixPath

MAX_BYTES = 512 * 1024 * 1024


def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()


def inventory(root):
    files = {}
    for path in sorted(root.rglob("*")):
        if path.is_symlink():
            raise ValueError("Evidence must not contain symlinks")
        if path.is_file():
            files[path.relative_to(root).as_posix()] = digest(path)
    if not files:
        raise ValueError("Empty evidence bundle")
    return files


def package(root, output, url, source_revision, run_url, scope):
    root, output = Path(root), Path(output)
    if root.resolve() in output.resolve().parents:
        raise ValueError("Bundle output must be outside evidence inputs")
    files = inventory(root)
    with tarfile.open(output, "w:gz") as archive:
        for name in files:
            archive.add(root / name, arcname=name, recursive=False)
    return {"schemaVersion": 1, "url": url, "sha256": digest(output),
            "bytes": output.stat().st_size, "sourceRevision": source_revision,
            "runUrl": run_url, "scope": scope, "files": files}


def unpack(bundle, catalog, destination):
    """Fail closed on tampering, traversal, links, missing or additional files."""
    if catalog["schemaVersion"] != 1 or not catalog["files"]:
        raise ValueError("Unsupported or empty evidence catalog")
    if bundle.stat().st_size != catalog["bytes"] or digest(bundle) != catalog["sha256"]:
        raise ValueError("Evidence bundle digest/size mismatch")
    destination = Path(destination)
    if destination.exists() or destination.is_symlink():
        raise ValueError("Retrieval requires a fresh destination")
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=destination.parent) as temporary:
        stage = Path(temporary)
        with tarfile.open(bundle, "r:gz") as archive:
            members = archive.getmembers()
            names = set()
            for member in members:
                path = PurePosixPath(member.name)
                if (not member.isfile() or path.is_absolute() or ".." in path.parts
                        or str(path) != member.name or member.name in names):
                    raise ValueError("Unsafe or duplicate evidence member")
                names.add(member.name)
            if names != catalog["files"].keys() or sum(m.size for m in members) > MAX_BYTES:
                raise ValueError("Evidence inventory/size mismatch")
            archive.extractall(stage, filter="data")
        if inventory(stage) != catalog["files"]:
            raise ValueError("Extracted evidence digest mismatch")
        shutil.move(stage, destination)


def retrieve(catalog, destination):
    url = catalog["url"]
    if not url.startswith("https://github.com/noahsong-sdg/mass-spinner/releases/download/"):
        raise ValueError("Evidence must come from this project's HTTPS releases")
    if not 0 < catalog["bytes"] <= MAX_BYTES:
        raise ValueError("Invalid bundle size")
    with tempfile.TemporaryDirectory() as temporary:
        bundle = Path(temporary) / "evidence.tar.gz"
        with urllib.request.urlopen(url, timeout=60) as response, bundle.open("wb") as output:
            remaining = catalog["bytes"]
            while chunk := response.read(min(1024 * 1024, remaining + 1)):
                remaining -= len(chunk)
                if remaining < 0:
                    raise ValueError("Download exceeds catalog size")
                output.write(chunk)
        unpack(bundle, catalog, destination)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    pack = sub.add_parser("package")
    for name in ("root", "output", "catalog", "url", "source_revision", "run_url", "scope"):
        pack.add_argument(name)
    fetch = sub.add_parser("retrieve")
    fetch.add_argument("catalog")
    fetch.add_argument("destination")
    args = parser.parse_args()
    if args.command == "package":
        data = package(args.root, args.output, args.url, args.source_revision, args.run_url, args.scope)
        Path(args.catalog).write_text(json.dumps(data, indent=2) + "\n")
    else:
        retrieve(json.loads(Path(args.catalog).read_text()), args.destination)
