"""Admit CLI completion separately from native electron-example numerical health."""
import hashlib
import json
from pathlib import Path
import re
import sys

NONFINITE = re.compile(r"(?<![A-Za-z0-9_])[-+]?(?:nan|inf(?:inity)?)(?![A-Za-z0-9_])", re.I)


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def audit(raw, execution):
    commands = [r for r in execution["commands"] if r["name"] == "upstream-example"]
    if len(commands) != 1:
        raise ValueError("Exactly one native example command required")
    command = commands[0]
    if command["logSHA256"] != digest(raw):
        raise ValueError("Native example log differs from sealed execution")
    lines = raw.decode().splitlines()
    nonfinite = [i for i, line in enumerate(lines, 1) if NONFINITE.search(line)]
    domain = [dict(line=i, text=line) for i, line in enumerate(lines, 1)
              if "maximum grid energy" in line and "lookup table" in line and "not reliable" in line]
    convergence = [dict(line=i, text=line) for i, line in enumerate(lines, 1)
                   if "did not converge" in line.lower()]
    completed = command["exitCode"] == 0
    return dict(exampleLogSHA256=digest(raw), cliExitCode=command["exitCode"],
                cliCompleted=completed, nonfiniteRows=len(nonfinite),
                nonfiniteTokenCount=sum(len(NONFINITE.findall(line)) for line in lines),
                firstNonfiniteLines=nonfinite[:10], lastNonfiniteLines=nonfinite[-10:],
                energyDomainWarnings=domain, nonconvergenceWarnings=convergence,
                numericalPass=completed and not nonfinite and not domain and not convergence,
                experimentalQualification=False,
                interpretation="Native CLI smoke only. Exit zero does not establish finite or reliable physics. This supplemental check does not alter the frozen example or the separate 44 bounded electron cases.")


def main():
    log, execution_path, destination = map(Path, sys.argv[1:4])
    if destination.exists():
        raise FileExistsError("Preserve prior admission")
    execution = execution_path.read_bytes()
    result = audit(log.read_bytes(), json.loads(execution))
    result.update(executionSHA256=digest(execution), auditorSHA256=digest(Path(__file__).read_bytes()))
    destination.write_text(json.dumps(result, indent=2, allow_nan=False)+"\n")
    print(json.dumps(result, indent=2))
    return 0 if result["numericalPass"] else 1


if __name__ == "__main__":
    raise SystemExit(main())

