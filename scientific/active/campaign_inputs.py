"""Source closure shared by the producer and checker, independent of verdict code."""

import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


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
    paths.update(
        ROOT / name
        for name in [
            "scientific/public-data-campaign/study.py",
            "scientific/public-data-campaign/observations.json",
            "scientific/benchmark-identifiability-20261116/replay.py",
            "scientific/profile-v79/results/score.json",
            "scientific/electrical-v82/compare82.py",
            "scientific/optical-v80/compare.py",
            "scientific/flow-v81/transport.py",
            "scientific/flow-v81/argon-viscosity-source.json",
            "scientific/active/campaign.py",
            "scientific/active/campaign_inputs.py",
            "scientific/active/pyproject.toml",
            "scientific/active/uv.lock",
            "scientific/active/.python-version",
        ]
    )
    return sorted(paths)


def sources():
    return {str(path.relative_to(ROOT)): sha(path) for path in source_paths()}


def content_key(values):
    return hashlib.sha256(json.dumps(values, sort_keys=True).encode()).hexdigest()
