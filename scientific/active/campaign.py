"""Content-addressed public diagnostic replay; no PDE or experimental qualification."""

import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from admission import admit
from campaign_inputs import ROOT, sha, sources


def produce(destination):
    destination = Path(destination).absolute()
    if destination.is_symlink():
        raise ValueError("Result destination must not be a symlink")
    destination.parent.mkdir(parents=True, exist_ok=True)
    identity = sources()
    with tempfile.TemporaryDirectory(dir=destination.parent) as stage:
        work = Path(stage) / "diagnostic"
        subprocess.run(
            [sys.executable, str(ROOT / "scientific/public-data-campaign/study.py"), str(work)],
            check=True,
        )
        manifest = {
            "schemaVersion": 1,
            "sources": identity,
            "files": {name: sha(work / name) for name in ("diagnosis.json", "comparison.png")},
        }
        (work / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
        if destination.is_dir() and not destination.is_symlink():
            # Snakemake creates output parents; rmdir refuses nonempty evidence.
            destination.rmdir()
        shutil.move(work, destination)
    admit(destination)




if __name__ == "__main__":
    if sys.argv[1] == "produce":
        produce(sys.argv[2])
    elif sys.argv[1] == "admit":
        admit(sys.argv[2])
    else:
        raise SystemExit("Usage: campaign.py produce|admit directory")
