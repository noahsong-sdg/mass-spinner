"""Run only inside the documented isolated render environment."""
import os
from pathlib import Path
import subprocess
import sys

binary = os.environ.get("MASS_SPINNER_BLENDER", "blender")
version = subprocess.run([binary, "--version"], check=True, capture_output=True, text=True).stdout
if not version.startswith("Blender 5.2.4"):
    raise SystemExit("Use the pinned Blender 5.2.4 LTS environment in ci/Dockerfile.blender.")
if len(sys.argv) < 2 or sys.argv[1] != "assembly":
    raise SystemExit("Usage: render.py assembly [new-output-directory]")
out = Path(sys.argv[2] if len(sys.argv) > 2 else "output/blender-5.2.4").resolve()
subprocess.run([binary, "--background", "--factory-startup", "--threads", "2",
                "--python-exit-code", "1", "--python", "blender/build_fuel_assembly.py",
                "--", str(out)], check=True)
