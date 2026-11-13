"""Postprocess new and old Radau arrays using the unchanged model's declared scales."""
import importlib.util
import json
from pathlib import Path
import sys
import numpy as np

root = Path("/work/project/v89-target-radau-20261113a")
here = root/"scientific/expert-v88/target-radau"
spec = importlib.util.spec_from_file_location("reference", here/"reference.py")
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
read = lambda path: json.loads(path.read_text())
current = read(here/"results/reference.json")
original = read(root/"baseline/scientific/expert-v88/target-radau/results/reference.json")
browser = read(here/"results/browser.json")
rows = []
for now, old in zip(current["records"], original["records"], strict=True):
    if now["id"] != old["id"]:
        raise ValueError("Case identity changed")
    source = next(r for r in browser["rows"] if r["id"] == now["id"])
    model = m.Model(source["beam"], source["config"])
    a, b = np.asarray(now["radauStates"]), np.asarray(old["radauStates"])
    if a.shape != b.shape:
        raise ValueError("Reporting grid changed")
    delta = abs(a-b)
    rows.append(dict(case=now["id"], maximumStateChangeOverDeclaredScale=float(np.max(delta/model.scale)),
                     maximumAbsolutePopulationChange=float(np.max(delta[:, :3*model.n])),
                     maximumAbsoluteTemperatureChangeK=float(np.max(delta[:, 3*model.n:model.offset])),
                     maximumAbsoluteLedgerChange=float(np.max(delta[:, model.offset:])),
                     radauStatsEqual=now["radauStats"] == old["radauStats"],
                     qualificationUnchanged=now["passed"] == old["passed"],
                     passed=now["passed"]))
result = dict(cases=rows, experimentalQualification=False,
              interpretation="Descriptive replay differences with the original declared coordinate scales; no original gate or normalization is changed.",
              explanation="Observed tiny state differences are consistent with floating-point execution differences. Their precise platform/library cause has not been isolated.")
print(json.dumps(result, indent=2))

