#!/usr/bin/env python3
"""Verify neutral transport against pinned raw data and independent SI formulas.

Run in safe-dev after exporting TypeScript predictions. No third-party packages
are required. This checks constitutive implementation, not plasma validity or
experimental agreement.
"""

import argparse
from bisect import bisect_right
import hashlib
import json
import math
from pathlib import Path
import sys
import xml.etree.ElementTree as ET


ARGON_T = [300, 500, 1750, 8000, 10000, 12867, 20000]
LITHIUM_T = [100, 500, 1500, 3000]
KB = 1.380649e-23  # Exact SI definition, J/K.
ATOMIC_MASS_KG = 1.66053906892e-27  # CODATA 2022, kg.
RELATIVE_TOLERANCE = 2e-12


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def require(condition, message):
    if not condition:
        raise ValueError(message)


def xml_table(element):
    require(element is not None, "Missing collision-integral table")
    rows = (element.text or "").split(",")
    require(len(rows) == 2, "Expected two XML table rows separated by comma")
    temperatures, values = [[float(v) for v in row.split()] for row in rows]
    require(len(temperatures) == len(values) > 1, "Invalid table dimensions")
    require(all(math.isfinite(v) and v > 0 for v in temperatures + values),
            "Collision table contains nonpositive/nonfinite entries")
    require(all(a < b for a, b in zip(temperatures, temperatures[1:])),
            "Collision table temperatures are not strictly increasing")
    return temperatures, values


def check_sources(xml_path, data):
    root = ET.parse(xml_path).getroot()
    pairs = [pair for pair in root.findall("pair")
             if pair.get("s1") == "Ar" and pair.get("s2") == "Ar"]
    require(len(pairs) == 1, "Expected exactly one explicit Ar-Ar pair")
    pair = pairs[0]
    ar = data["argonNeutral"]
    source = ar["source"]
    require(source["version"] == "v1.0.5", "Unexpected Mutation++ version")
    require(source["url"] == "https://raw.githubusercontent.com/mutationpp/Mutationpp/"
            "v1.0.5/data/transport/collisions.xml", "Unpinned XML source URL")
    for name, key in [("Q22", "q22BeforePiAngstromSquared"),
                      ("Q11", "q11BeforePiAngstromSquared")]:
        integral = pair.find(name)
        require(integral is not None, f"Missing Ar-Ar {name}")
        require(integral.get("type") == "table", f"{name} is not tabulated")
        require(integral.get("units") == "K,Å-Å", f"Unexpected {name} units")
        require(integral.get("multpi") == "yes", f"Missing {name} pi multiplier")
        require(integral.get("ref") == "Wright2005", f"Unexpected {name} reference")
        require(float(integral.get("accuracy", "nan")) == 5,
                f"Unexpected {name} estimated accuracy")
        temperatures, values = xml_table(integral)
        require(temperatures == ar["temperatureK"], f"{name} temperature transcription mismatch")
        require(values == ar[key], f"{name} value transcription mismatch")
    require(ar["allowedTemperatureRangeK"] == [temperatures[0], temperatures[-1]],
            "Ar domain differs from raw table")
    require(ar["massUForNaturalArgon"] == 39.948, "Unexpected natural Ar mass")
    require(ar["sourceEstimatedCollisionIntegralAccuracyPercent"] == 5,
            "Ar accuracy metadata mismatch")
    options = root.find("global-options/integral[@type='table']")
    require(options is not None and options.get("interpolator") == "Linear",
            "Source interpolation is not explicitly Linear")
    li = data["lithiumNeutral"]
    require(li["allowedTemperatureRangeK"] == [100, 3000], "Li domain mismatch")
    require(li["viscosityCoefficientSI"] == 3.14e-8, "Li micropoise conversion mismatch")
    require(li["thermalConductivityCoefficientSI"] == 1.398e-4,
            "Li conductivity conversion mismatch")
    require(li["temperaturePower"] == 0.863, "Li exponent mismatch")
    return xml_table(pair.find("Q22"))


def argon_oracle(temperature, grid, values):
    require(grid[0] <= temperature <= grid[-1], "Oracle called outside Ar table")
    index = min(bisect_right(grid, temperature) - 1, len(grid) - 2)
    q22 = values[index] + (values[index + 1] - values[index]) * (
        temperature - grid[index]) / (grid[index + 1] - grid[index])
    area = math.pi * q22 * 1e-20
    mass = 39.948 * ATOMIC_MASS_KG
    viscosity = 5 * math.sqrt(math.pi * mass * KB * temperature) / (16 * area)
    return {"collisionIntegralM2": area, "viscosityPaS": viscosity,
            "conductivityWmK": 15 * KB * viscosity / (4 * mass)}


def compare_predictions(predictions, grid, values):
    comparisons = []
    for material, required_temperatures in [("argon", ARGON_T), ("lithium", LITHIUM_T)]:
        rows = predictions[material]
        require([row["temperatureK"] for row in rows] == required_temperatures,
                f"Expected ordered {material} temperatures {required_temperatures}")
        for row in rows:
            temperature = row["temperatureK"]
            expected = (argon_oracle(temperature, grid, values) if material == "argon"
                        else {"viscosityPaS": 3.14e-8 * temperature ** 0.863,
                              "conductivityWmK": 1.398e-4 * temperature ** 0.863})
            for field, value in expected.items():
                actual = row[field]
                require(isinstance(actual, (int, float)) and not isinstance(actual, bool)
                        and math.isfinite(actual) and actual > 0,
                        f"Invalid {material} {field} at {temperature} K")
                relative_error = abs(actual / value - 1)
                comparisons.append({"material": material, "temperatureK": temperature,
                                    "field": field, "expectedSI": value, "actualSI": actual,
                                    "relativeError": relative_error,
                                    "passed": relative_error <= RELATIVE_TOLERANCE})
    return comparisons


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--xml", type=Path, required=True)
    parser.add_argument("--data", type=Path,
                        default=Path(__file__).with_name("transport-data.json"))
    parser.add_argument("--predictions", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    report = {
        "study": "v66 neutral transport raw-data and independent-formula oracle",
        "passed": False,
        "relativeTolerance": RELATIVE_TOLERANCE,
        "qualification": "Implementation verification only; not neutral-plasma or experimental qualification.",
        "sourceAccuracy": "Mutation++ estimated collision-integral accuracy 5%; not a confidence interval.",
        "inputs": {},
    }
    try:
        report["inputs"] = {name: {"path": str(path), "sha256": sha256(path)}
                            for name, path in [("rawXml", args.xml), ("sourceJson", args.data),
                                               ("typescriptPredictions", args.predictions)]}
        data = json.loads(args.data.read_text())
        predictions = json.loads(args.predictions.read_text())
        grid, values = check_sources(args.xml, data)
        report["sourceTranscriptionPassed"] = True
        report["comparisons"] = compare_predictions(predictions, grid, values)
        report["maxRelativeError"] = max(row["relativeError"] for row in report["comparisons"])
        report["passed"] = all(row["passed"] for row in report["comparisons"])
    except (ValueError, KeyError, TypeError, OSError, ET.ParseError) as error:
        report["error"] = f"{type(error).__name__}: {error}"
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2, allow_nan=False) + "\n")
    print(json.dumps({"passed": report["passed"], "report": str(args.output)}))
    return 0 if report["passed"] else 1


if __name__ == "__main__":
    sys.exit(main())
