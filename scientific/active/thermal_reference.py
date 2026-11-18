"""Independent Radau/BDF time integration of the same bounded gas/solid FV equations.

No species redistribution, local flow, plasma kinetics or experimental validation.
The spatial grid and logarithmic half-cell resistances match the exported live case.
"""

import hashlib
import importlib.metadata
import json
import sys
from pathlib import Path

import numpy as np
from scipy.integrate import solve_ivp


def properties(t):
    cp = (
        23.95930 + 2.639680e-3 * t + 1.257750e-6 * t**2 - 0.254642e-9 * t**3 - 0.048407e6 / t**2
    ) / 0.18384
    k = 149.441 - 0.045466 * t + 13.193e-6 * t**2 - 1.484e-9 * t**3 + 3.866e6 / t**2
    return cp, k


def enthalpy(t):
    a = 300.0
    mean = (
        23.95930
        + 2.639680e-3 * (t + a) / 2
        + 1.257750e-6 * (t * t + t * a + a * a) / 3
        - 0.254642e-9 * (t**3 + t * t * a + t * a * a + a**3) / 4
        - 0.048407e6 / (t * a)
    ) / 0.18384
    return (t - a) * mean


def solve(config, cells, times, method):
    r0, length = config["radiusM"], config["lengthM"]
    edges = np.linspace(r0, r0 + config["thicknessM"], cells + 1)
    centers = np.sqrt(edges[:-1] * edges[1:])
    masses = 19250 * np.pi * length * np.diff(edges) * (edges[1:] + edges[:-1])
    factor = 2 * np.pi * length
    boundary = config["boundary"]

    def rhs(_time, y):
        gas, wall = y[0], y[1:-1]
        cp, k = properties(wall)
        links = factor / (
            np.log(edges[1:-1] / centers[:-1]) / k[:-1] + np.log(centers[1:] / edges[1:-1]) / k[1:]
        )
        inner = (
            0
            if boundary["gasWallWK"] == 0
            else 1 / (1 / boundary["gasWallWK"] + np.log(centers[0] / edges[0]) / (factor * k[0]))
        )
        outer = (
            0
            if boundary["coolingWK"] == 0
            else 1
            / (1 / boundary["coolingWK"] + np.log(edges[-1] / centers[-1]) / (factor * k[-1]))
        )
        flux = links * np.diff(wall) * -1
        gas_heat = inner * (gas - wall[0])
        cooling = outer * (wall[-1] - boundary["coolantK"])
        heat = np.r_[gas_heat, flux] - np.r_[flux, cooling]
        return np.r_[
            (config["gasPowerW"] - gas_heat) / config["gasCapacityJK"],
            heat / (masses * cp),
            cooling,
        ]

    initial = np.r_[config["initialGasK"], np.full(cells, config["initialWallK"]), 0.0]
    result = solve_ivp(
        rhs, (0, config["durationS"]), initial, method=method, t_eval=times, rtol=1e-10, atol=1e-9
    )
    if not result.success or not np.isfinite(result.y).all():
        raise ValueError("Independent stiff integration failed")
    balance = config["gasCapacityJK"] * (result.y[0] - initial[0])
    balance += np.sum(
        masses[:, None] * (enthalpy(result.y[1:-1]) - enthalpy(initial[1:-1, None])), axis=0
    )
    balance += result.y[-1] - config["gasPowerW"] * np.asarray(times)
    scale = max(np.max(abs(result.y[-1])), 1.0)
    if np.max(abs(balance)) / scale > 1e-8:
        raise ValueError("Independent energy gate failed")
    return result.y, float(np.max(abs(balance)) / scale)


def assess(packet):
    root = Path(__file__).resolve().parents[2]
    files = [
        "src/fuel-thermal.ts",
        "src/array-shape.ts",
        "scripts/export-thermal-toolchain.ts",
        "package-lock.json",
    ]
    identity = {name: hashlib.sha256((root / name).read_bytes()).hexdigest() for name in files}
    if packet["sourceSHA256"] != identity:
        raise ValueError("Live thermal source identity mismatch")
    for name in [
        "scientific/active/thermal_reference.py",
        "scientific/active/uv.lock",
        "scientific/active/pyproject.toml",
        "scientific/active/.python-version",
    ]:
        identity[name] = hashlib.sha256((root / name).read_bytes()).hexdigest()
    config = packet["config"]
    rows = []
    for cells in (8, 16, 32):
        cases = [c for c in packet["cases"] if c["cells"] == cells]
        times = [r["timeS"] for r in cases[0]["history"]]
        radau, energy = solve(config, cells, times, "Radau")
        bdf, bdf_energy = solve(config, cells, times, "BDF")
        reference_difference = float(np.max(abs(radau[:-1] - bdf[:-1])))
        if reference_difference > 1e-4:
            raise ValueError("Radau/BDF reference disagreement")
        errors = []
        for case in cases:
            live = np.array([[r["gasK"], *r["temperatureK"]] for r in case["history"]]).T
            if (
                live.shape != radau[:-1].shape
                or not np.isfinite(live).all()
                or np.min(live) < 300
                or np.max(live) > 1900
            ):
                raise ValueError("Live thermal state left its material domain")
            error = float(np.max(abs(live - radau[:-1])))
            errors.append(error)
            rows.append(
                {
                    "cells": cells,
                    "steps": case["steps"],
                    "maxTemperatureDifferenceK": error,
                    "relativeImposedTemperatureDifference": error
                    / (config["initialWallK"] - config["initialGasK"]),
                    "referenceAgreementK": reference_difference,
                    "referenceEnergyResidual": max(energy, bdf_energy),
                }
            )
        if (
            not errors[2] < errors[1] < errors[0]
            or errors[-1] / (config["initialWallK"] - config["initialGasK"]) > 0.01
        ):
            raise ValueError("Live temporal contraction or existing 1% temperature gate failed")
    return {
        "schemaVersion": 1,
        "kind": "bounded-variable-property-thermal-toolchain",
        "experimentalQualification": False,
        "wholeReactorQualification": False,
        "sourceSHA256": identity,
        "runtime": {name: importlib.metadata.version(name) for name in ("numpy", "scipy")},
        "referenceMethods": ["SciPy Radau", "SciPy BDF"],
        "rows": rows,
        "scope": "Same finite-volume gas/wall equations at each mesh; time-integration comparison only. This does not establish spatial convergence or gas-regime validity.",
    }


if __name__ == "__main__":
    report = assess(json.loads(Path(sys.argv[1]).read_text()))
    Path(sys.argv[2]).write_text(json.dumps(report, indent=2, allow_nan=False) + "\n")
    print(json.dumps(report))
