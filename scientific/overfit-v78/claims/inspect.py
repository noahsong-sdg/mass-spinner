"""Read-only v77 gate accounting; execute offline inside safe-dev."""
import hashlib
import json
from pathlib import Path
import platform

ROOT = Path("/work/home/mass-spinner-v77-full01")
OUT = Path(__file__).resolve().parent / "receipt.json"
def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

assert not OUT.exists(), "Preserve previous audit receipt"
paths = {
    "convergence": ROOT / "scientific/spatial-v77/convergence-01.json",
    "raw": ROOT / "scientific/spatial-v77/study-01.json",
    "studySource": ROOT / "scientific/spatial-v77/study.py",
    "commonMetricSource": ROOT / "scientific/spatial-v76/common_space.py",
    "producerManifest": ROOT / "scientific/mixture-axial-v75/manifest.json",
}
report = json.loads(paths["convergence"].read_text())
raw = json.loads(paths["raw"].read_text())
result = {
    "scope": "Gate-accounting inspection, not a solver rerun or statistical independence assessment.",
    "python": platform.python_version(),
    "inputSha256": {key: sha(path) for key, path in paths.items()},
    "inspectorSha256": sha(Path(__file__)),
    "metrics": {},
}
for name in ("cellAverage", "commonSpace"):
    gates = report[name]["gates"]
    assert len(gates) == 315 and len({g["name"] for g in gates}) == 315
    decreasing = [g for g in gates if g["name"].endswith(":decreasing")]
    under_floor = [g["name"] for g in decreasing if max(g["values"]) < .002]
    result["metrics"][name] = {
        "gateCount": len(gates),
        "passedCount": sum(g["passed"] for g in gates),
        "decreasingGateCount": len(decreasing),
        "decreasingGatesUnderExistingExemption": len(under_floor),
        "exemptGateNames": under_floor,
    }
a, b = [report[name]["gates"] for name in ("cellAverage", "commonSpace")]
observable = [(x, y) for x, y in zip(a, b)
              if not x["name"].endswith((":rms", ":max", ":decreasing"))]
assert all(x == y for x, y in observable)
assert len(observable) == 126
result["accounting"] = {
    "displayedGateRows": len(a) + len(b),
    "identicalObservableRowsInEachMetric": len(observable),
    "observableRowsAcrossBothMetrics": 2 * len(observable),
    "profileAndDecreasingRowsAcrossBothMetrics": len(a) + len(b) - 2 * len(observable),
    "rowsAfterRemovingOnlyRepeatedObservableRows": len(a) + len(b) - len(observable),
    "caution": "504 rows after this limited deduplication do not constitute 504 independent tests or 504 independent physical cases.",
}
result["newTrajectories"] = [{k: t[k] for k in ("nr", "nz", "nt", "mode")}
                             for t in raw["cases"]]
result["newPhysicalManifestCount"] = 1
result["physicalManifest"] = raw["manifest"]
result["experimentalQualified"] = False
result["liveQualified"] = False
OUT.write_text(json.dumps(result, indent=2, allow_nan=False) + "\n")
print(json.dumps({k: result[k] for k in ("metrics", "accounting", "inputSha256")}))
