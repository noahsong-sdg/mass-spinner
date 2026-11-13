"""Trusted hash-verified export; no solver executes on the host."""
import hashlib,json,pathlib,subprocess,tarfile
P=pathlib.Path('/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6/scientific/wall-transient-v92')
out=P/'evidence';out.mkdir(exist_ok=False);archive=P/'evidence.tar.gz';assert not archive.exists()
code=r'''
import hashlib,io,json,pathlib,sys,tarfile
root=pathlib.Path('/work/project');rows=[];paths={}
for source in sorted(root.glob('v92-wall-source[0-9][0-9]')):
 for p in sorted(source.rglob('*')):
  if p.is_symlink():raise RuntimeError('Unexpected evidence symlink')
  if not p.is_file() or '__pycache__' in p.parts:continue
  name=p.relative_to(root).as_posix();raw=p.read_bytes()
  rows.append(dict(path=name,size=len(raw),sha256=hashlib.sha256(raw).hexdigest()));paths[name]=p
assert rows and sum(r['size'] for r in rows)<512*1024**2
manifest=json.dumps(dict(files=rows,rawBytes=sum(r['size'] for r in rows)),indent=2).encode()+bytes([10])
with tarfile.open(fileobj=sys.stdout.buffer,mode='w|gz') as tar:
 info=tarfile.TarInfo('ARCHIVE-MANIFEST.json');info.size=len(manifest);tar.addfile(info,io.BytesIO(manifest))
 for row in rows:
  p=paths[row['path']];assert hashlib.sha256(p.read_bytes()).hexdigest()==row['sha256'];tar.add(p,arcname=row['path'],recursive=False)
'''
cmd=['/Users/noahs/.local/bin/safe-dev','--memory','2G','-C','/private/tmp/mass-spinner-openfoam-v87-20261112','run','--','python3','-I','-']
with archive.open('xb') as f,(P/'export.log').open('xb') as err:run=subprocess.run(cmd,input=code.encode(),stdout=f,stderr=err)
assert run.returncode==0
h=hashlib.sha256()
with archive.open('rb') as f:
 for chunk in iter(lambda:f.read(1024**2),b''):h.update(chunk)
with tarfile.open(archive) as tar:
 members=tar.getmembers();assert all(m.isfile() for m in members) and len({m.name for m in members})==len(members)
 manifest=json.load(tar.extractfile('ARCHIVE-MANIFEST.json'));expected={r['path']:r for r in manifest['files']}
 assert {m.name for m in members}==set(expected)|{'ARCHIVE-MANIFEST.json'}
 for name,row in expected.items():
  rel=pathlib.PurePosixPath(name);assert not rel.is_absolute() and '..' not in rel.parts
  raw=tar.extractfile(name).read();assert len(raw)==row['size'] and hashlib.sha256(raw).hexdigest()==row['sha256']
  if name.endswith(('.json','.npz','.log')):
   p=out/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(raw)
(out/'ARCHIVE-MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n')
receipt=dict(command=cmd,exitCode=run.returncode,archive=archive.name,bytes=archive.stat().st_size,sha256=h.hexdigest(),members=len(members),rawBytes=manifest['rawBytes'],allMembersRehashed=True,jobSHA256=hashlib.sha256(code.encode()).hexdigest())
(P/'export.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))
