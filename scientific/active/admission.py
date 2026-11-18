"""Checker-only admission: verdict changes do not rerun the physical producer."""
import json
from pathlib import Path

from campaign_inputs import sha, sources


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
    if any(
        report[key] is not False
        for key in (
            "experimentalQualification",
            "parametersRefitted",
            "fieldProducerReexecuted",
            "temperaturePredictionAvailable",
        )
    ):
        raise ValueError("Unsupported physical qualification claim")
    if report["opticalCases"] != 4320 or report["electricalCases"] != 60:
        raise ValueError("Incomplete no-fit diagnostic replay")
    return manifest

