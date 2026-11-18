"""Content-addressed public diagnostic replay; no PDE or experimental qualification."""
import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).parent


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def source_paths():
    prediction = ROOT / "scientific/electrical-v82/results/predictions.json"
    index = ROOT / "scientific/electrical-v82/results/optical-index.json"
    p, i = json.loads(prediction.read_bytes()), json.loads(index.read_bytes())
    paths = {prediction, index}
    paths.update(ROOT / name for name in p["inputSHA256"] | p["sourceSHA256"])
    for group in ("operatorSHA256", "diagnosticSHA256"):
        paths.update(ROOT / "scientific/optical-v80" / name for name in i[group])
    paths.update(ROOT / "scientific/electrical-v82/results" / row["path"] for row in i["groups"])
    paths.update(ROOT / name for name in [
        "scientific/public-data-campaign/study.py", "scientific/public-data-campaign/observations.json",
        "scientific/benchmark-identifiability-20261116/replay.py",
        "scientific/profile-v79/results/score.json", "scientific/electrical-v82/compare82.py",
        "scientific/optical-v80/compare.py", "scientific/flow-v81/transport.py",
        "scientific/flow-v81/argon-viscosity-source.json",
        "scientific/active/campaign.py", "scientific/active/pyproject.toml",
        "scientific/active/uv.lock", "scientific/active/.python-version",
    ])
    return sorted(paths)


def sources():
    return {str(path.relative_to(ROOT)): sha(path) for path in source_paths()}


def content_key(values):
    return hashlib.sha256(json.dumps(values, sort_keys=True).encode()).hexdigest()


def produce(destination):
    destination = Path(destination).absolute()
    if destination.is_symlink():
        raise ValueError("Result destination must not be a symlink")
    destination.parent.mkdir(parents=True, exist_ok=True)
    identity = sources()
    with tempfile.TemporaryDirectory(dir=destination.parent) as stage:
        work = Path(stage) / "diagnostic"
        subprocess.run([sys.executable, str(ROOT / "scientific/public-data-campaign/study.py"), str(work)], check=True)
        manifest = {"schemaVersion": 1, "sources": identity,
                    "files": {name: sha(work / name) for name in ("diagnosis.json", "comparison.png")}}
        (work / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
        if destination.is_dir() and not destination.is_symlink():
            # Snakemake creates output parents; rmdir refuses nonempty evidence.
            destination.rmdir()
        shutil.move(work, destination)
    admit(destination)


def admit(destination):
    destination = Path(destination)
    manifest = json.loads((destination / "manifest.json").read_text())
    if manifest.get("schemaVersion") != 1 or manifest["sources"] != sources():
        raise ValueError("Diagnostic source identity mismatch")
    if set(manifest["files"]) != {"diagnosis.json", "comparison.png"}:
        raise ValueError("Incomplete diagnostic inventory")
    for name, digest in manifest["files"].items():
        if sha(destination / name) != digest:
            raise ValueError("Corrupted diagnostic artifact: " + name)
    report = json.loads((destination / "diagnosis.json").read_text())
    if any(report[key] is not False for key in ("experimentalQualification", "parametersRefitted", "fieldProducerReexecuted", "temperaturePredictionAvailable")):
        raise ValueError("Unsupported physical qualification claim")
    if report["opticalCases"] != 4320 or report["electricalCases"] != 60:
        raise ValueError("Incomplete no-fit diagnostic replay")
    return manifest


if __name__ == "__main__":
    if sys.argv[1] == "produce":
        produce(sys.argv[2])
    elif sys.argv[1] == "admit":
        admit(sys.argv[2])
    else:
        raise SystemExit("Usage: campaign.py produce|admit directory")
