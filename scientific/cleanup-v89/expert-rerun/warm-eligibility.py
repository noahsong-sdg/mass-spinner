"""Check new warm-off eligibility without scoring reflected free-space orbits."""
import json
from pathlib import Path
import numpy as np
from reference import MASSES, R, digest, exact_xy

root = Path.cwd()
warm_root = root/"supplemental-warm-off/results/warm-off"
warm = json.loads((warm_root/"result.json").read_text())
base_root = root/"results/bobylev"
base = json.loads((base_root/"result.json").read_text())
for folder, record in ((warm_root, warm), (base_root, base)):
    if digest(folder/"raw.npz") != record["rawSHA256"]:
        raise ValueError("New raw evidence digest mismatch")
    if digest(folder/"warpx.inputs") != record["deckSHA256"]:
        raise ValueError("New input-deck digest mismatch")
a, b = np.load(warm_root/"raw.npz"), np.load(base_root/"raw.npz")
keys = sorted(k for k in a.files if k.startswith("initial-"))
if keys != sorted(k for k in b.files if k.startswith("initial-")):
    raise ValueError("Initial raw-array inventory differs")
matched = {k: bool(np.array_equal(a[k], b[k])) for k in keys}
if not all(matched.values()):
    raise ValueError("Warm-off is not a matched-initial-array comparison")
differences = {k: [base["config"].get(k), warm["config"].get(k)]
               for k in set(base["config"]) | set(warm["config"])
               if base["config"].get(k) != warm["config"].get(k)}
if differences != {"law": ["bobylev", "off"]}:
    raise ValueError("Unexpected warm-off physics/config difference")
witnesses = []
for species, mass in enumerate(MASSES):
    initial = {k.removeprefix(f"initial-{species}-"): a[k]
               for k in keys if k.startswith(f"initial-{species}-")}
    xy, velocity = exact_xy(initial, mass, warm["config"])
    witnesses.append(dict(species=species, unboundedFinalOutsideCount=int(np.sum(abs(xy)>R)),
                          unboundedFinalMaxRadiusM=float(np.max(abs(xy))),
                          actualFinalMaxRadiusM=float(np.max(a[f"final-{species}-r"]))))
result = dict(schemaVersion=89, resultSHA256=digest(warm_root/"result.json"),
              rawSHA256=digest(warm_root/"raw.npz"), baselineResultSHA256=digest(base_root/"result.json"),
              matchedBaselineInitialArrays=matched, configDifferences=differences,
              boundaryWitnesses=witnesses,
              analyticOrbitComparisonApplicable=all(r["unboundedFinalOutsideCount"] == 0 for r in witnesses),
              interpretation="Matching establishes a pusher baseline; it does not permit exact subtraction of collision error.",
              experimentalQualification=False)
(root/"supplemental-warm-off/eligibility-v89.json").write_text(json.dumps(result, indent=2)+"\n")
print(json.dumps(result, indent=2))

