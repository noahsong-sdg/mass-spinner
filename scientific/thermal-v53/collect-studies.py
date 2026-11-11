"""Reviewed host artifact transfer; only the named study directory is exported."""
from pathlib import Path
import hashlib, io, json, subprocess, sys, tarfile

candidate = sys.argv[1]
assert candidate in ['thermal53','thermal53b','thermal53c']
base = Path(__file__).resolve().parents[2]
destination = base/f'scientific/centrifuge-v44/{candidate}/studies'
destination.mkdir(parents=True, exist_ok=False)
guest = f'''
from pathlib import Path
import hashlib, io, json, sys, tarfile
root=Path('/work/home/thermal-v53-final-studies-{candidate}')
files={{p.name:p.read_bytes() for p in root.iterdir() if p.is_file() and not p.is_symlink()}}
assert files and sum(map(len,files.values()))<8*1024**2
files['export-manifest.json']=json.dumps({{n:hashlib.sha256(b).hexdigest() for n,b in files.items()}}).encode()
with tarfile.open(fileobj=sys.stdout.buffer,mode='w|') as tar:
 for name,content in files.items():
  info=tarfile.TarInfo(name);info.size=len(content);tar.addfile(info,io.BytesIO(content))
'''
r = subprocess.run(['/Users/noahs/.local/bin/safe-dev','-C','/private/tmp/mass-spinner-marathon-v35-final',
                    'run','--','python3','-I','-c',guest], capture_output=True, check=True)
assert len(r.stdout)<8*1024**2
with tarfile.open(fileobj=io.BytesIO(r.stdout)) as tar:
    manifest=json.load(tar.extractfile('export-manifest.json'))
    for name,digest in manifest.items():
        assert Path(name).name==name
        content=tar.extractfile(name).read()
        assert hashlib.sha256(content).hexdigest()==digest
        (destination/name).write_bytes(content)
(destination/'export-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(json.dumps({'destination':str(destination),'files':len(manifest),'verified':True}))
