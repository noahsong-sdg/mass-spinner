"""Independent stdlib replay of a frozen live numerical-screen artifact.

Run inside safe-dev: python3 tests/audit-live-qualification.py REPORT.json
This reconstructs common-clock observables and witness budgets, not the omitted
full accepted histories, the time integrator, or experimental accuracy.
"""
import copy
import hashlib
import json
import math
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
CLOCKS = [0, 1e-5, 3e-5, 1e-4, 3e-4, 1e-3, .01, .1, .5, 1]
DEFAULT = dict(pair="lithium", application="enrichment", radiusM=.12, lengthM=.8,
    magneticT=.5, currentA=.03, gasK=500, pressurePa=10, ionFraction=.01,
    collisionHz=10000, dragHz=2, conductivitySm=1, driveInnerFraction=.3,
    durationS=1, cutFraction=.65, stages=5, feedStage=3, pumpSpeedM3S=.02,
    conductanceM3S=.05, lightFraction=.0759, linerK=1000, linerConductanceWK=.1,
    lithiumSeed=False, radialDiffusivityM2S=.02, fusionMW=1000,
    burnFraction=.05, loopTimeS=100)
OPERATION = dict(schemaVersion=1, events=[], thermal=dict(enabled=False,
    wallCapacityJK=10, gasWallWK=.1, coolingWK=1, coolantK=500))
RESOLUTIONS = {(n, t) for n in [64, 128, 256] for t in [512, 1024, 2048]}
COMPARISONS = [
    ("joint coarse", (64, 512), (128, 1024), False),
    ("joint fine", (128, 1024), (256, 2048), True),
    ("interactive to reference", (64, 512), (256, 2048), True),
    ("spatial coarse", (64, 2048), (128, 2048), False),
    ("spatial fine", (128, 2048), (256, 2048), True),
    ("temporal coarse", (256, 512), (256, 1024), False),
    ("temporal fine", (256, 1024), (256, 2048), True),
]


def require(condition, message):
    if not condition:
        raise AssertionError(message)


def close(actual, expected, label, atol=1e-12):
    require(isinstance(actual, (float, int)) and math.isfinite(actual), label + " nonfinite")
    require(math.isclose(actual, expected, rel_tol=2e-11, abs_tol=atol),
            f"{label}: {actual} != {expected}")


def finite_tree(value):
    if isinstance(value, dict):
        return all(finite_tree(v) for v in value.values())
    if isinstance(value, list):
        return all(finite_tree(v) for v in value)
    return not isinstance(value, (int, float)) or math.isfinite(value)


def cdf(mass, radius):
    q = radius * radius * len(mass)
    i = min(math.floor(q), len(mass) - 1)
    return sum(mass[:i]) + (q - i) * mass[i]


def state(s, config, cells):
    """Rebuild mechanics, collection and residuals directly from inventories."""
    require(finite_tree(s), "nonfinite retained state")
    a, b = s["lightMass"], s["heavyMass"]
    require(len(a) == len(b) == cells, "incorrect inventory dimensions")
    require(min(a + b) >= 0, "negative retained inventory")
    x, r = config["lightFraction"], config["radiusM"]
    ml, mh = 6.0151228874 * 1.66053906892e-27, 7.0160034366 * 1.66053906892e-27
    mean = x * ml + (1 - x) * mh
    count = config["pressurePa"] * math.pi * r*r * config["lengthM"] / (1.380649e-23 * config["gasK"])
    initial_neutral = .5 * count * mean * r*r
    ion = initial_neutral * config["ionFraction"] / (1 - config["ionFraction"])
    w = x * ml / mean
    moment = lambda p: sum(v * (i + .5) / cells for i, v in enumerate(p))
    neutral = 2 * initial_neutral * (w * moment(a) + (1-w) * moment(b))
    li, ln = s["ionAngularMomentumKgM2S"], s["neutralAngularMomentumKgM2S"]
    wi, wn = li / ion, ln / neutral
    close(s["neutralInertiaKgM2"], neutral, "neutral inertia", 1e-30)
    close(s["neutralInertiaRatio"], neutral / initial_neutral, "neutral inertia ratio")
    close(s["ionRadS"], wi, "ion angular speed")
    close(s["neutralRadS"], wn, "neutral angular speed")
    l, h = cdf(a, config["cutFraction"]), cdf(b, config["cutFraction"])
    purity = x * l / (x * l + (1-x) * h)
    close(s["collection"]["innerLightPurity"], purity, "purity")
    close(s["collection"]["lightRecovery"], l, "recovery")
    for name, expected in [("light", sum(a)), ("heavy", sum(b)), ("minimumMass", min(a+b)), ("boundaryFlux", 0)]:
        close(s["balances"][name], expected, "inventory " + name)
    am, en = s["angularMomentum"], s["energy"]
    torque = config["currentA"] * config["magneticT"] * r*r * (1-config["driveInnerFraction"]**2) / 2
    close(am["driveImpulseKgM2S"], torque*s["timeS"], "constant-current drive impulse", 1e-30)
    close(en["driveWorkJ"], torque*s["ionPhaseRad"], "constant-current drive work", 1e-30)
    ar = li + ln - am["driveImpulseKgM2S"] + am["dragImpulseKgM2S"]
    az = abs(li) + abs(ln) + abs(am["driveImpulseKgM2S"]) + abs(am["dragImpulseKgM2S"])
    kinetic = .5 * (li * wi + ln * wn)
    er = kinetic - en["driveWorkJ"] + en["slipDissipationJ"] + en["dragDissipationJ"] + en["redistributionWorkJ"] + en["numericalDissipationJ"]
    ez = kinetic + abs(en["driveWorkJ"]) + en["slipDissipationJ"] + en["dragDissipationJ"] + abs(en["redistributionWorkJ"]) + en["numericalDissipationJ"]
    close(en["kineticJ"], kinetic, "kinetic energy", max(1e-30, abs(kinetic)*1e-12))
    close(am["residualKgM2S"], ar, "angular residual", max(1e-30, az*1e-12))
    close(en["residualJ"], er, "energy residual", max(1e-30, ez*1e-12))
    relative = lambda residual, scale: abs(residual)/scale if scale else 0 if residual == 0 else math.inf
    angular, energy = relative(ar, az), relative(er, ez)
    close(am["relativeResidual"], angular, "angular relative residual")
    close(en["relativeResidual"], energy, "energy relative residual")
    for name in ["slipDissipationJ", "dragDissipationJ", "numericalDissipationJ"]:
        require(en[name] >= 0, name + " is negative")
    return dict(ionMS=wi*r, neutralMS=wn*r, ionPhaseRad=s["ionPhaseRad"],
        neutralPhaseRad=s["neutralPhaseRad"], purity=purity, recovery=l), dict(
        inventory=max(abs(sum(a)-1), abs(sum(b)-1)), angularMomentum=angular,
        energy=energy, minimumMass=min(a+b))


def check_sources(report):
    extra = {"scripts/qualify-live-centrifuge.mjs", "docs/reviews/live-numerical-protocol.md",
             "docs/reviews/live-benchmark-protocol.md", "package.json", "package-lock.json"}
    expected = extra | {p.relative_to(ROOT).as_posix() for p in (ROOT / "src").rglob("*") if p.is_file()}
    files = report["sourceFiles"]
    require(set(files) == expected, "source manifest does not match expected source set")
    require(list(files) == sorted(files), "source manifest order is not canonical")
    digest = lambda b: hashlib.sha256(b).hexdigest()
    close_hash = digest(json.dumps(files, separators=(",", ":"), ensure_ascii=False).encode())
    require(report["sourceHash"] == close_hash, "aggregate source hash mismatch")
    for path, sha in files.items():
        require(digest((ROOT / path).read_bytes()) == sha, "source snapshot mismatch: " + path)


def audit(report, verify_sources=True):
    require(report["schemaVersion"] == 1 and report["kind"] == "bounded-live-numerical-screen", "wrong report kind")
    require(report["experimentallyQualified"] is False, "numerical screen promoted to experimental qualification")
    benchmark = report["experimentalBenchmark"]
    require(benchmark["experimentallyQualified"] is False and benchmark["absolutePrediction"] == "unavailable", "experimental benchmark scope drift")
    require(benchmark["source"]["independence"] == "Retrospective development data; not an unseen operating condition.", "held-out claim drift")
    require(report["clocks"] == CLOCKS and len(report["cases"]) == 3, "wrong frozen matrix")
    if verify_sources:
        check_sources(report)
    case_results = []
    for case, current in zip(report["cases"], [.015, .03, .06]):
        config = {**DEFAULT, "currentA": current}
        require(case["config"] == config and case["operation"] == OPERATION, "configuration drift")
        runs = {(r["cells"], r["steps"]): r for r in case["runs"]}
        require(len(case["runs"]) == 9 and set(runs) == RESOLUTIONS, "missing or duplicate run")
        scalars, run_results = {}, []
        for resolution, run in runs.items():
            require("error" not in run, "cannot independently replay a failed trajectory")
            require(len(run["samples"]) == len(CLOCKS), "sample count")
            require(set(run["budgets"]) == {"inventory", "angularMomentum", "energy"}, "budget set")
            scalars[resolution] = []
            for s, t in zip(run["samples"], CLOCKS):
                close(s["timeS"], t, "common clock")
                if t == 0:
                    for v in s["lightMass"] + s["heavyMass"]:
                        close(v, 1/resolution[0], "uniform initial inventory")
                    for key in ["ionRadS", "neutralRadS", "ionPhaseRad", "neutralPhaseRad"]:
                        close(s[key], 0, "initial rest " + key)
                values, budget = state(s, config, resolution[0])
                scalars[resolution].append(values)
                require(all(budget[k] < 2e-8 for k in ["inventory", "angularMomentum", "energy"]), "sample budget failed")
            for name in ["inventory", "angularMomentum", "energy", "minimumMass"]:
                _, witness = state(run["budgetWitnesses"][name], config, resolution[0])
                reported = run["minAcceptedMass"] if name == "minimumMass" else run["budgets"][name]
                close(reported, witness[name], "witness " + name)
            require(run["finite"] is True and run["ordered"] is True, "accepted-history finite/order assertion failed")
            require(run["acceptedKnots"] >= resolution[1]+1, "implausible accepted-history size")
            passed = run["minAcceptedMass"] >= 0 and all(v < 2e-8 and math.isfinite(v) for v in run["budgets"].values())
            require(run["positive"] == (run["minAcceptedMass"] >= 0) and run["pass"] == passed, "run gate mismatch")
            run_results.append(passed)
        require(len(case["comparisons"]) == len(COMPARISONS), "comparison count")
        required_passes = []
        for comparison, (label, a, b, required) in zip(case["comparisons"], COMPARISONS):
            require((comparison["label"], comparison["required"]) == (label, required), "comparison identity")
            require(comparison["coarse"] == dict(cells=a[0], steps=a[1]) and comparison["fine"] == dict(cells=b[0], steps=b[1]), "comparison resolutions")
            require(len(comparison["rows"]) == len(CLOCKS), "comparison clock count")
            row_results = []
            for i, row in enumerate(comparison["rows"]):
                close(row["timeS"], CLOCKS[i], "comparison clock")
                rebuilt = {}
                for key, coarse in scalars[a][i].items():
                    fine = scalars[b][i][key]
                    limit = (.01 if key.endswith("MS") else .001 if key.endswith("Rad") else .0001) + .01*abs(fine)
                    rebuilt[key] = dict(coarse=coarse, fine=fine, difference=abs(coarse-fine), limit=limit)
                for key in ["lightMass", "heavyMass"]:
                    coarse, fine = runs[a]["samples"][i][key], runs[b]["samples"][i][key]
                    stride = len(fine)//len(coarse)
                    difference = sum(abs(v - sum(fine[j*stride:(j+1)*stride])) for j, v in enumerate(coarse))
                    rebuilt[key] = dict(difference=difference, limit=.01)
                require(set(row["metrics"]) == set(rebuilt), "metric set")
                passes = []
                for key, metrics in rebuilt.items():
                    for field, value in metrics.items():
                        close(row["metrics"][key][field], value, key + "." + field)
                    passed = metrics["difference"] <= metrics["limit"]
                    require(row["metrics"][key]["pass"] == passed, "metric gate mismatch")
                    passes.append(passed)
                require(row["pass"] == all(passes), "row gate mismatch")
                row_results.append(all(passes))
            require(comparison["pass"] == all(row_results), "comparison gate mismatch")
            if required:
                required_passes.append(all(row_results))
        passed = all(run_results + required_passes)
        require(case["pass"] == passed, "case gate mismatch")
        case_results.append(passed)
    numerical = "pass" if all(case_results) else "fail"
    require(report["numericalScreen"] == numerical, "aggregate gate mismatch")
    return numerical


if __name__ == "__main__":
    require(len(sys.argv) == 2, "provide exactly one frozen report path")
    report = json.loads(Path(sys.argv[1]).read_text())
    numerical = audit(report)
    mutations = [
        ("configuration", lambda r: r["cases"][0]["config"].update(currentA=.031)),
        ("inventory", lambda r: r["cases"][0]["runs"][0]["samples"][1]["lightMass"].__setitem__(0, .2)),
        ("gate", lambda r: r["cases"][0]["comparisons"][0]["rows"][0]["metrics"]["ionMS"].update(limit=999)),
        ("experimental_scope", lambda r: r.update(experimentallyQualified=True)),
    ]
    for label, mutate in mutations:
        bad = copy.deepcopy(report)
        mutate(bad)
        try:
            audit(bad, verify_sources=False)
        except (AssertionError, KeyError, ValueError):
            continue
        raise AssertionError("negative control escaped: " + label)
    print(json.dumps(dict(audit="pass", numericalScreen=numerical, cases=3, runs=27,
        comparisons=21, commonClockStates=270, negativeControls=len(mutations),
        experimentallyQualified=False,
        scope="Replayed canonical common-clock states and accepted-history budget/minimum witnesses; full accepted-history finiteness/order are producer assertions, not independently replayable.")))
