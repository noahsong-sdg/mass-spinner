"""Read-only adversarial metric diagnostics; execute only in safe-dev."""
import hashlib
import json
from pathlib import Path
import sys
from copy import deepcopy
import numpy as np

ROOT = Path("/work/home/mass-spinner-v77-full01")
OUT = Path("/work/home/overfit-metrics-v78-20261111")
sys.path[:0] = [str(ROOT/"scientific/spatial-v77"),
    str(ROOT/"scientific/mixture-axial-v75"), str(ROOT/"scientific/spatial-v76")]
import study
from common_space import compare_profiles

def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

base_path = Path("/work/home/mass-spinner-v76-study05.json")
raw_path = ROOT/"scientific/spatial-v77/study-01.json"
manifest_path = ROOT/"scientific/mixture-axial-v75/manifest.json"
base, extra, m = [json.loads(p.read_text()) for p in (base_path, raw_path, manifest_path)]
lookup = {study.key(t): t for t in base["cases"]+extra["cases"]}
original = study.evaluations(lookup, m)
fine = lookup[(96,96,256,"base")]
initial = study.primitives(fine, dict(q=fine["initialQ"],solidK=fine["initialSolidK"]))
response = []
for key in ((48,48,256,"base"),(64,64,256,"base")):
    coarse = lookup[key]
    ci = study.primitives(coarse, dict(q=coarse["initialQ"],solidK=coarse["initialSolidK"]))
    for ce,fe in zip(coarse["cases"],fine["cases"]):
        cp, fp = study.primitives(coarse,ce), study.primitives(fine,fe)
        for name in ("solid","omega"):
            region = "wall" if name == "solid" else "r"
            cr,fr = [np.asarray(t["setup"][region]) for t in (coarse,fine)]
            weight = np.diff(fine["setup"]["z"])[:,None]*np.diff(fr*fr)[None,:]
            delta = fp[name]-initial[name]
            cd = study.restrict_linear(cp[name]-ci[name],fine["setup"]["z"],
                    coarse["setup"]["z"],fr*fr,cr*cr)
            err = cd-delta
            response.append(dict(coarse=list(key),reference=[96,96,256,"base"],
                timeS=fe["timeS"],field=name,
                referencePeakResponse=float(abs(delta).max()),
                maximumErrorAbsolute=float(abs(err).max()),
                rmsErrorAbsolute=float(np.sqrt(np.sum(weight*err*err)/weight.sum())),
                maximumOverPeakResponse=float(abs(err).max()/abs(delta).max()),
                rmsOverPeakResponse=float(np.sqrt(np.sum(weight*err*err)/weight.sum())/abs(delta).max())))
frozen_wall=[]
for endpoint in fine["cases"]:
    bad=deepcopy(endpoint)
    bad["solidK"]=deepcopy(fine["initialSolidK"])
    p=compare_profiles(fine,bad,fine,endpoint,m)["solid"]
    frozen_wall.append(dict(timeS=endpoint["timeS"],
        fieldGatePassed=p["rmsNormalized"]<.02 and p["maxNormalized"]<.05,
        absoluteMetric=p,lostTemperatureResponseFraction=1.,
        scope="Profile metric only. Modified state not PDE-generated, not ledger-admitted; observables are not compared."))
exemptions = {}
for name,value in original.items():
    exemptions[name] = [g for g in value["gates"] if "decreasing" in g["name"]
        and max(g["values"])<.002 and g["values"][1]>g["values"][0]]
observable_pointwise=[]
for name,v in original.items():
    if name!="commonSpace": continue
    for level,coarse in enumerate((lookup[(48,48,256,"base")],lookup[(64,64,256,"base")])):
        for c,f in zip(coarse["cases"],fine["cases"]):
            for field in f["observables"]:
                den=abs(f["observables"][field])
                if den>0:
                    observable_pointwise.append(dict(level=level,timeS=f["timeS"],observable=field,
                        relativeToInstantaneousReference=abs(c["observables"][field]-f["observables"][field])/den))
result=dict(schemaVersion=1,kind="Read-only adversarial metric sensitivity; not new PDE solve",
    sourceHashes={str(p.relative_to(ROOT)):sha(p) for p in [
        ROOT/"scientific/mixture-axial-v75/analyze.py",
        ROOT/"scientific/spatial-v76/common_space.py",
        ROOT/"scientific/spatial-v77/study.py",manifest_path]},
    inputHashes={str(p):sha(p) for p in [base_path,raw_path]},
    originalMetrics={n:dict(passed=v["passed"],gateCount=len(v["gates"])) for n,v in original.items()},
    responseRelativeDiagnostics=response,syntheticFrozenWallProfile=frozen_wall,
    risingErrorsAcceptedBySmallErrorExemption=exemptions,
    maximumInstantaneousObservableRelativeError=max(observable_pointwise,key=lambda x:x["relativeToInstantaneousReference"]),
    experimentalQualified=False,liveQualified=False,
    interpretation="Published absolute-temperature tolerance passes, but its 1 K scale floor does not establish convergence relative to a microKelvin wall-heating signal. Response-relative diagnostics use peak reference evolution, without changing existing gates. No threshold tuning or frozen source edits performed.")
output=OUT/"result.json"
assert not output.exists()
output.write_text(json.dumps(result,indent=2,allow_nan=False)+"\n")
print(json.dumps(dict(output=str(output),sha256=sha(output),results=result),indent=2))
