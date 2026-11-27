"""Download a pinned official Julia runtime into this scientific workspace."""
import hashlib
from pathlib import Path
import subprocess
import urllib.request

VERSION = "1.13.3"
URL = f"https://julialang-s3.julialang.org/bin/linux/aarch64/1.13/julia-{VERSION}-linux-aarch64.tar.gz"
SHA256 = "9ceb053bee6dfb8189bd40afd6925de3a9b7ff8fac8d01a5fcdd84af171ddf03"
target = Path(".cache")
target.mkdir(exist_ok=True)
archive = target / f"julia-{VERSION}.tar.gz"
urllib.request.urlretrieve(URL, archive)
digest = hashlib.file_digest(archive.open("rb"), "sha256").hexdigest()
if digest != SHA256:
    raise RuntimeError(f"Julia archive checksum mismatch: {digest}")
# Extraction follows checksum verification; use tar available in the VM because
# the pinned runtime's Python predates tarfile's extraction-filter interface.
subprocess.run(["tar", "-xzf", str(archive), "-C", str(target)], check=True)
archive.unlink()
print(f"Installed Julia {VERSION}; official archive SHA256 {digest}")
