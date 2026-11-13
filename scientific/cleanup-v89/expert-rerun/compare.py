"""Descriptive replay comparison; original scientific gates remain authoritative."""
import json
import math
from pathlib import Path


def projected(name, root):
    read = lambda path: json.loads((root/path).read_text())
    if name == "openfoam":
        packet = read("results/predictions.json")
        return {"constants": packet["constants"], "cases": [
            {k: v for k, v in r.items() if k not in ("commands", "inputSHA256", "archive")}
            for r in packet["cases"]], "gates": read("results/audit.json")["gates"]}
    if name == "electrons":
        result = {}
        for family, path in (("original", "results/receipt.json"), ("extension", "extension-results/receipt.json")):
            result[family] = [{k: v for k, v in r.items() if k not in ("nativeHashes", "elapsedS")}
                              for r in read(path)["cases"]]
        result["refinements"] = read("results/transport-table.json")["refinements"]
        extension = read("extension-results/receipt.json")
        result["extensionGates"] = extension["refinements"]+extension["domainControls"]
        return result
    if name == "festim":
        packet = read("results.json")
        return {k: packet[k] for k in ("sampleCoordinates", "oracles", "runs", "checks", "qualified")}
    if name == "warpx":
        protocol = read("protocol.json")
        paths = {n: "results/"+n+"/result.json" for n in protocol["cases"]}
        paths["warm-off"] = "supplemental-warm-off/results/warm-off/result.json"
        return {n: {k: read(p)[k] for k in ("config", "initial", "final", "history", "metrics", "ledgers", "exitLedger")}
                for n, p in paths.items()}
    if name == "target-radau":
        prefix = "scientific/expert-v88/target-radau/results/"
        return {"browser": read(prefix+"browser.json")["rows"], "reference": read(prefix+"reference.json")["records"]}
    fields = list(root.glob("results/*/field.json"))
    if len(fields) != 1:
        raise ValueError("Exactly one workflow fine field required")
    packet = json.loads(fields[0].read_text())
    return {k: v for k, v in packet.items() if k not in ("runtime", "sourceSHA256")}


def compare(name, root):
    baseline = root/"baseline"
    a, b = projected(name, root), projected(name, baseline)
    result = dict(physicalProjection=name, comparedNumericScalars=0, exactlyEqualNumericScalars=0,
                  changedNumericScalars=0, maxAbsoluteDifference=0., maxRelativeDifferenceOverNonzeroBaseline=0.,
                  changedNonNumericScalars=0, structuralDifferences=[], firstChangedNumbers=[],
                  experimentalQualification=False,
                  interpretation="Descriptive equality of the explicitly selected physics fields only. Distribution/archive/runtime provenance, native logs and wall time are outside this projection; original frozen gates are unchanged.")

    def visit(path, x, y):
        if isinstance(x, (int, float)) and not isinstance(x, bool) and isinstance(y, (int, float)) and not isinstance(y, bool):
            if not math.isfinite(x) or not math.isfinite(y):
                raise ValueError("Nonfinite physical scalar: "+path)
            result["comparedNumericScalars"] += 1
            if x == y:
                result["exactlyEqualNumericScalars"] += 1
            else:
                result["changedNumericScalars"] += 1
                delta = abs(x-y)
                if delta > result["maxAbsoluteDifference"]:
                    result["maxAbsoluteDifference"] = delta
                    result["maximumAbsolutePath"] = path
                if y and delta/abs(y) > result["maxRelativeDifferenceOverNonzeroBaseline"]:
                    result["maxRelativeDifferenceOverNonzeroBaseline"] = delta/abs(y)
                    result["maximumRelativePath"] = path
                if len(result["firstChangedNumbers"]) < 100:
                    result["firstChangedNumbers"].append(dict(path=path, current=x, baseline=y, difference=x-y))
        elif isinstance(x, dict) and isinstance(y, dict):
            if x.keys() != y.keys():
                result["structuralDifferences"].append(dict(path=path, currentKeys=sorted(x), baselineKeys=sorted(y)))
            for key in sorted(x.keys() & y.keys()):
                visit(path+"."+key, x[key], y[key])
        elif isinstance(x, list) and isinstance(y, list):
            if len(x) != len(y):
                result["structuralDifferences"].append(dict(path=path, currentLength=len(x), baselineLength=len(y)))
            for i in range(min(len(x), len(y))):
                visit(path+f"[{i}]", x[i], y[i])
        elif x != y:
            result["changedNonNumericScalars"] += 1
    visit("$", a, b)
    result["physicalProjectionExactlyEqual"] = a == b
    (root/"replay-comparison.json").write_text(json.dumps(result, indent=2, allow_nan=False)+"\n")
    return result

