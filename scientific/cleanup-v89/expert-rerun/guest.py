"""V89 replay orchestration; frozen producers remain byte-for-byte unchanged."""
import base64
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess
import tarfile
import time


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def stamp():
    return datetime.now(timezone.utc).isoformat()


def write(path, value):
    path.write_text(json.dumps(value, indent=2, allow_nan=False)+"\n")


def receive(root, files):
    for name, record in files.items():
        path = Path(name)
        if path.is_absolute() or ".." in path.parts:
            raise ValueError("Invalid transferred path")
        destination = root/path
        destination.parent.mkdir(parents=True, exist_ok=True)
        raw = base64.b64decode(record["base64"], validate=True)
        if hashlib.sha256(raw).hexdigest() != record["sha256"]:
            raise ValueError("Transfer digest mismatch")
        destination.write_bytes(raw)


def inventory(root):
    return {str(p.relative_to(root)): sha(p) for p in sorted(root.rglob("*"))
            if p.is_file() and p != root/"execution.json" and not p.is_symlink() and "__pycache__" not in p.parts
            and not any(x in p.relative_to(root).parts for x in (".cache", ".snakemake", "upstream", "build", "baseline"))}


def coverage(name, root):
    read = lambda path: json.loads((root/path).read_text())
    if name == "openfoam":
        packet, audit = read("results/predictions.json"), read("results/audit.json")
        baseline = read("baseline/results/predictions.json")
        if packet["executedBinarySHA256"] != baseline["executedBinarySHA256"]:
            raise ValueError("Executed OpenFOAM native binaries differ from baseline")
        assert len(packet["cases"]) == 13 and all(r["completed"] for r in packet["cases"])
        assert len(audit["gates"]) == 86
        return dict(completedCases=13, passedGates=sum(g["passed"] for g in audit["gates"]), totalGates=86,
                    numericalControlPass=audit["allPassed"])
    if name == "electrons":
        packet, extension = read("results/receipt.json"), read("extension-results/receipt.json")
        table, admission = read("results/transport-table.json"), read("results/bulk-admission-v2.json")
        original = read("baseline/results/receipt.json")
        for path, expected in original["sourceHashes"].items():
            if sha(root/"upstream"/path) != expected:
                raise ValueError("Frozen LoKI native source/input differs: "+path)
        assert len(packet["cases"]) == 24 and all(r["completed"] for r in packet["cases"])
        assert len(extension["cases"]) == 20 and all(r["completed"] for r in extension["cases"])
        assert len(admission["rows"]) == 8
        return dict(completedCases=44, bulkRows=8, originalQualified=table["qualifiedUnmagnetizedGrid"],
                    extensionQualified=extension["passGate"],
                    admittedBulkRows=[{k: r[k] for k in ("reducedFieldTd", "gasTemperatureK", "qualifiedObservables")}
                                      for r in admission["rows"]],
                    originalFailedRefinements=[g for g in table["refinements"] if not g["passGate"]],
                    extensionFailedRefinements=[g for g in extension["refinements"] if not g["passGate"]])
    if name == "festim":
        packet = read("results.json")
        old = read("baseline/results.json")["provenance"]
        actual = packet["provenance"]
        for key in ("python", "festim", "dolfinx", "petsc", "scipy", "sourceSHA256"):
            if actual[key] != old[key]:
                raise ValueError("FESTIM native runtime drift: "+key)
        if sorted(actual["conda"], key=lambda r: r["name"]) != sorted(old["conda"], key=lambda r: r["name"]):
            raise ValueError("FESTIM native distribution changed")
        assert len(packet["runs"]) == 36 and len(packet["checks"]) == 94
        return dict(completedCases=36, passedGates=sum(g["passed"] for g in packet["checks"]),
                    totalGates=94, numericalControlPass=packet["qualified"])
    if name == "warpx":
        packet = read("summary.json")
        assert len(packet["cases"]) == 12
        warm = read("supplemental-warm-off/results/warm-off/result.json")
        return dict(completedCases=13, orbitErrorContraction=packet["orbitErrorContraction"],
                    failedGates={n: {k: g for k, g in r["gates"].items() if not g["passed"]}
                                 for n, r in packet["cases"].items()},
                    failedStrictEnergyCases=[n for n, r in packet["cases"].items() if not r["strictEnergyGate"]["passed"]],
                    warmOffMetrics=warm["metrics"],
                    warmOffFreeOrbitEligible=read("supplemental-warm-off/eligibility-v89.json")["analyticOrbitComparisonApplicable"])
    if name == "target-radau":
        prefix = "scientific/expert-v88/target-radau/results/"
        browser, reference = read(prefix+"browser.json"), read(prefix+"reference.json")
        assert len(browser["rows"]) == 9 and len(reference["records"]) == 3
        return dict(requestedBrowserCases=9, completedBrowserCases=sum(r["completed"] for r in browser["rows"]),
                    fullReferenceCases=3, numericalControlPass=reference["numericalControlPass"],
                    cases={r["id"]: r["passed"] for r in reference["records"]},
                    zeroBeam=read(prefix+"zero-beam-admission.json"))
    fields = list(root.glob("results/*/field.json"))
    assert len(fields) == 1
    return dict(freshFinePhysicalCases=1, fieldSHA256=sha(fields[0]),
                integrationReceiptFiles=[str(p.relative_to(root)) for p in root.glob("verification/*/receipts.json")])


def main(payload):
    if platform.system() != "Linux" or os.getuid() != 1000:
        raise RuntimeError("Run only in nonroot safe-dev")
    name = payload["campaign"]
    root = Path("/work/project")/payload["freshName"]
    if root.exists():
        raise FileExistsError("Preserve prior rerun")
    root.mkdir()
    receive(root, payload["files"])
    baseline = root/"baseline"
    baseline.mkdir()
    receive(baseline, payload["baselines"])
    preflight = []
    for family, entries, parent in (("source", payload["files"], root),
                                    ("baseline", payload["baselines"], baseline)):
        for path, row in entries.items():
            if row.get("role") == "new replay orchestration":
                continue
            expected = row["expectedSHA256"]
            actual = sha(parent/path)
            if actual != expected:
                raise ValueError("Frozen baseline identity mismatch: "+path)
            preflight.append(dict(family=family, path=path, expectedSHA256=expected,
                                  actualSHA256=actual, proof=row["expectedProof"], passed=True))
    write(root/"frozen-preflight.json", dict(checkedBeforeNativeExecution=True, checks=preflight,
                                          allPassed=True))
    receipt = dict(startedUTC=stamp(), campaign=name, python=platform.python_version(),
                   platform=platform.platform(), uid=os.getuid(), commands=[],
                   sourceSHA256={n: r["sha256"] for n, r in payload["files"].items()},
                   baselineSHA256={n: r["sha256"] for n, r in payload["baselines"].items()},
                   experimentalQualification=False)
    work = root
    if name == "electrons":
        native = Path("/work/home/loki-runtime-v88")
        upstream = native/"upstream"
        build = native/"build"
        if not upstream.is_dir() or not build.is_dir():
            raise ValueError("Native LoKI runtime layout differs; inspect without fallback")
        shutil.copytree(upstream, root/"upstream", symlinks=False)
        (root/"build").symlink_to(build, target_is_directory=True)
        (root/"inputs").mkdir()
        if sha(build/"app/loki") != "b8e74938edaba606175bc9a70160a26e76a92a7745dca91246faef8bcadd3a66":
            raise ValueError("LoKI binary drift")
        if sha(root/"upstream/input/Argon/Ar_LXCat.txt") != "4bcb328eff01c147a1ebb9cb31e01253344ae10fc9fa4bff508d76bce0f9d444":
            raise ValueError("LoKI cross-section drift")
        receipt["nativeBinarySHA256"] = sha(build/"app/loki")
        receipt["privateDataSHA256"] = sha(root/"upstream/input/Argon/Ar_LXCat.txt")
    elif name == "festim":
        work = Path("/work/project")
        preserved = Path("/work/home")/(payload["freshName"]+"-prior-root")
        preserved.mkdir(exist_ok=False)
        old = {}
        for p in sorted(work.iterdir()):
            if p.is_file() or p.is_symlink():
                if p.is_symlink():
                    raise ValueError("Unexpected root symlink; explicit review required")
                old[p.name] = sha(p)
                p.rename(preserved/p.name)
        if {n: sha(preserved/n) for n in old} != old:
            raise ValueError("Prior FESTIM root preservation failed")
        write(root/"prior-root-preservation.json",
              dict(path=str(preserved), fileSHA256=old, allVerified=True))
        receive(work, payload["files"])
        if (work/"results.json").exists() or (work/"response.json").exists():
            raise ValueError("FESTIM output boundary not empty")
    if name == "target-radau":
        deps = Path("/work/home/v75-deps")
        if not deps.exists():
            deps.mkdir()
            (deps/"node_modules").symlink_to("/work/project/node_modules", target_is_directory=True)
        if not (deps/"node_modules/.bin/tsx").exists():
            raise ValueError("Frozen target tsx runtime unavailable")
    if name == "warpx":
        packages = list(Path("/work/home/warpx88-env/conda-meta").glob("warpx-*.json"))
        if len(packages) != 1:
            raise ValueError("Exactly one native WarpX distribution required")
        native = json.loads(packages[0].read_text())
        expected = {"version": "26.10", "build": "np2py312hded7337_0",
                    "sha256": "a442e121ea53b32cdd6443fd1aa413247496ab7b34da756bd067363e65b4348c"}
        if any(native.get(k) != v for k, v in expected.items()):
            raise ValueError("Native WarpX distribution drift")
        receipt["nativeDistribution"] = {k: native.get(k) for k in ("name", *expected, "url")}
    (root/"logs").mkdir()
    environment = os.environ | {"OPENBLAS_NUM_THREADS": "1", "OMP_NUM_THREADS": "1"}

    def execute(label, command, cwd=None, allowed=(0,)):
        log = root/"logs"/(label+".log")
        start = time.monotonic()
        print("RUN", name, label, flush=True)
        with log.open("x") as stream:
            code = subprocess.run(command, cwd=cwd or work, stdout=stream,
                                  stderr=subprocess.STDOUT, env=environment).returncode
        receipt["commands"].append(dict(name=label, command=command, cwd=str(cwd or work),
                                       exitCode=code, allowedStatuses=list(allowed),
                                       wallSeconds=time.monotonic()-start, logSHA256=sha(log)))
        write(root/"execution.json", receipt)
        print("EXIT", name, label, code, flush=True)
        if code not in allowed:
            raise RuntimeError("Unexpected command failure: "+label)
        return code

    execute("replay-comparison-controls", ["python3", "test_compare.py"], cwd=root)
    if name == "openfoam":
        py = "/work/project/.venv/bin/python"
        execute("tests", [py, "-m", "unittest", "-v", "test_reference88"])
        execute("producer", [py, "reference88.py"])
        execute("audit", [py, "audit88.py"], allowed=(0, 1))
    elif name == "electrons":
        for label, binary in (("upstream-grid", "test_grid"), ("upstream-eedf", "loki_test_eedf_utilities"),
                              ("upstream-transport", "test_trans_coefs")):
            execute(label, [str(root/"build/tests"/binary)])
        execute("upstream-example", [str(root/"build/app/loki"), str(root/"upstream/input/Argon/Ar_swarm_setup.in")])
        execute("producer", ["python3", "adapter.py"], allowed=(0, 1))
        execute("extension", ["python3", "extension.py"], allowed=(0, 1))
        execute("admission", ["python3", "admission.py"])
        execute("tests", ["python3", "-m", "unittest", "-v", "test_adapter", "test_admission"])
    elif name == "festim":
        prefix = ["/work/project/.cache/bootstrap/bin/micromamba", "run", "-p", "/work/project/.venv", "python"]
        execute("producer", prefix+["campaign.py"], allowed=(0, 1))
        execute("tests", prefix+["-m", "unittest", "test_campaign", "-v"])
        for n in ("results.json", "response.json"):
            shutil.copy2(work/n, root/n)
    elif name == "warpx":
        py = "/work/home/warpx88-env/bin/python"
        execute("tests", [py, "-m", "unittest", "-v", "test_reference"])
        execute("producer", [py, "reference.py", "campaign"])
        execute("audit", [py, "analyze.py"])
        execute("warm-off", [py, "reference.py", "campaign"], cwd=root/"supplemental-warm-off")
        execute("warm-eligibility", [py, "warm-eligibility.py"])
    elif name == "workflow":
        py = "/work/home/workflow-v88-venv/bin/python"
        execute("tests", [py, "-m", "unittest", "test_workflow", "-v"])
        command = [py, "-m", "snakemake", "--cores", "1", "--executor", "local",
                   "--scheduler", "greedy", "--printshellcmds"]
        execute("fresh-dag", command)
        execute("cached-admission", command)
    elif name == "target-radau":
        py = "/work/home/benchmark89-venv/bin/python"
        here = root/"scientific/expert-v88/target-radau"
        code = execute("producer", [py, str(here/"run.py")], allowed=(0, 1))
        if code:
            browser = json.loads((here/"results/browser.json").read_text())
            if not any(not r["completed"] for r in browser["rows"]):
                raise ValueError("Unexpected failure; not the documented partial-browser branch")
            execute("continuation", [py, str(here/"continue.py")], allowed=(0, 1))
        execute("zero-tests", [py, "-m", "unittest", "discover", "-s", str(here),
                               "-p", "test_audit_zero_beam.py", "-v"])
        execute("zero-audit", [py, str(here/"audit_zero_beam.py"), str(here/"results/browser.json"),
                               str(here/"results/zero-beam-admission.json")])
    else:
        raise ValueError("Unsupported campaign")
    for n, row in payload["files"].items():
        if sha(work/n) != row["sha256"]:
            raise ValueError("Transferred scientific source changed: "+n)
    write(root/"coverage.json", coverage(name, root))
    import importlib.util
    spec = importlib.util.spec_from_file_location("comparison", root/"compare.py")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.compare(name, root)
    receipt.update(finishedUTC=stamp(), executionCompleted=True, outputSHA256=inventory(root))
    write(root/"execution.json", receipt)
    archive = Path("/work/home")/(payload["freshName"]+".tar.gz")
    selected = [root/n for n in inventory(root)] + [root/"execution.json"]
    if len(selected) > 50000 or sum(p.stat().st_size for p in selected) > 512*1024*1024:
        raise ValueError("Evidence exceeds safe-dev transfer boundary; preserve and split explicitly")
    with tarfile.open(archive, "w:gz") as tar:
        for p in selected:
            tar.add(p, arcname=str(p.relative_to(root)), recursive=False)
    print(json.dumps(dict(bundlePath=str(archive), bundleSHA256=sha(archive),
                          bundleBytes=archive.stat().st_size, completed=True)), flush=True)

