"""Reviewed host transfer only; dependencies are installed offline inside safe-dev."""
from pathlib import Path
import hashlib, io, json, subprocess, tarfile

base = Path(__file__).resolve().parents[2]
wheels = base / 'scientific/marathon-v35/thermal/wheelhouse'
files = {p.name: p.read_bytes() for p in wheels.glob('*.whl') if not p.is_symlink()}
assert files and sum(map(len, files.values())) < 128 * 1024**2
manifest = {name: hashlib.sha256(value).hexdigest() for name, value in files.items()}
archive = io.BytesIO()
with tarfile.open(fileobj=archive, mode='w') as tar:
    for name, content in {'manifest.json': json.dumps(manifest).encode(), **files}.items():
        info = tarfile.TarInfo(name); info.size = len(content)
        tar.addfile(info, io.BytesIO(content))
guest = r'''
from pathlib import Path
import hashlib, io, json, subprocess, sys, tarfile
wheelhouse = Path('/work/home/thermal-v53-wheelhouse')
wheelhouse.mkdir(exist_ok=False)
with tarfile.open(fileobj=io.BytesIO(sys.stdin.buffer.read())) as tar:
    manifest = json.load(tar.extractfile('manifest.json'))
    for name, digest in manifest.items():
        assert Path(name).name == name and name.endswith('.whl')
        content = tar.extractfile(name).read()
        assert hashlib.sha256(content).hexdigest() == digest
        (wheelhouse/name).write_bytes(content)
venv = '/work/home/thermal-v53-venv'
subprocess.run(['python3', '-m', 'venv', venv], check=True)
subprocess.run([venv+'/bin/python', '-m', 'pip', 'install', '--no-index', '--find-links', str(wheelhouse), 'fipy==4.0.3'], check=True)
subprocess.run([venv+'/bin/python', '-c', 'import fipy,scipy; print(fipy.__version__, scipy.__version__)'], check=True)
print(json.dumps({'wheelSHA256':manifest, 'environment':venv, 'offline':True}))
'''
r = subprocess.run(['/Users/noahs/.local/bin/safe-dev', '-C', '/private/tmp/mass-spinner-marathon-v35-final',
                    'run', '--', 'python3', '-I', '-c', guest], input=archive.getvalue(), capture_output=True)
(base/'scientific/thermal-v53/setup-reference.log').write_bytes(r.stdout+r.stderr)
print((r.stdout+r.stderr).decode()[-6000:])
raise SystemExit(r.returncode)
