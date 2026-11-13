"""Trusted host transfer/readback; guest hashes and streams only V90 outputs."""
import hashlib,json,pathlib,subprocess,tarfile
P=pathlib.Path('/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6/scientific/coupled-openfoam-v90')
OUT=P/'evidence';OUT.mkdir(exist_ok=False)
archive=P/'evidence.tar.gz';assert not archive.exists()
code=r'''
import hashlib,io,json,pathlib,sys,tarfile
root=pathlib.Path('/work/project');rows=[];paths={}
for name in ['v90-coupled-source'+f'{n:02}' for n in range(1,6)]:
 for p in sorted((root/name).rglob('*')):
  if p.is_symlink():raise RuntimeError('Unexpected evidence symlink')
  if not p.is_file() or '__pycache__' in p.parts:continue
  rel=p.relative_to(root).as_posix();b=p.read_bytes()
  rows.append(dict(path=rel,size=len(b),sha256=hashlib.sha256(b).hexdigest()));paths[rel]=p
p=pathlib.Path('/work/home/v90-pip-report.json');b=p.read_bytes()
rows.append(dict(path='runtime/pip-report.json',size=len(b),sha256=hashlib.sha256(b).hexdigest()));paths['runtime/pip-report.json']=p
assert sum(r['size'] for r in rows)<512*1024**2
manifest=json.dumps(dict(files=rows,rawBytes=sum(r['size'] for r in rows)),indent=2).encode()+b'\n'
with tarfile.open(fileobj=sys.stdout.buffer,mode='w|gz') as tar:
 info=tarfile.TarInfo('ARCHIVE-MANIFEST.json');info.size=len(manifest);tar.addfile(info,io.BytesIO(manifest))
 for row in rows:
  p=paths[row['path']];assert hashlib.sha256(p.read_bytes()).hexdigest()==row['sha256']
  tar.add(p,arcname=row['path'],recursive=False)
'''
cmd=['/Users/noahs/.local/bin/safe-dev','--memory','2G','-C','/private/tmp/mass-spinner-openfoam-v87-20261112','run','--','python3','-I','-']
with archive.open('xb') as target,(P/'export.log').open('xb') as err:
 run=subprocess.run(cmd,input=code.encode(),stdout=target,stderr=err)
assert run.returncode==0
h=hashlib.sha256()
with archive.open('rb') as f:
 for block in iter(lambda:f.read(1024**2),b''):h.update(block)
with tarfile.open(archive) as tar:
 members=tar.getmembers();assert all(m.isfile() for m in members)
 assert len({m.name for m in members})==len(members)
 manifest=json.load(tar.extractfile('ARCHIVE-MANIFEST.json'))
 expected={r['path']:r for r in manifest['files']}
 assert {m.name for m in members}==set(expected)|{'ARCHIVE-MANIFEST.json'}
 for name,row in expected.items():
  rel=pathlib.PurePosixPath(name);assert not rel.is_absolute() and '..' not in rel.parts
  raw=tar.extractfile(name).read();assert len(raw)==row['size'] and hashlib.sha256(raw).hexdigest()==row['sha256']
  # Native raw fields and exact source copies stay in the downloadable archive.
  if name.endswith(('.json','.npz','.log')):
   target=OUT/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(raw)
(OUT/'ARCHIVE-MANIFEST.json').write_text(json.dumps(manifest,indent=2)+'\n')
receipt=dict(command=cmd,exitCode=run.returncode,archive=archive.name,bytes=archive.stat().st_size,
 sha256=h.hexdigest(),members=len(members),rawBytes=manifest['rawBytes'],allMembersRehashed=True,
 jobSHA256=hashlib.sha256(code.encode()).hexdigest(),nativeFieldsAndSource='retained in archive')
(P/'export.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(receipt))
