"""Trusted bounded inventory exports; guest data and each archive are rehashed."""
import hashlib,json,pathlib,subprocess,sys,tarfile
P=pathlib.Path('/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6/scientific/radial-axis-v95')
CMD=['/Users/noahs/.local/bin/safe-dev','--memory','2G','-C','/private/tmp/mass-spinner-openfoam-v87-20261112','run','--','python3','-I','-']
LIMIT=80*1024**2


def partition(rows,limit):
    groups=[];group=[];size=0
    for row in rows:
        if not 0<=row['size']<=limit:raise ValueError('File exceeds bounded transfer')
        if size+row['size']>limit:
            groups.append(group);group=[];size=0
        group.append(row);size+=row['size']
    if group:groups.append(group)
    return groups


def test():
    source=pathlib.Path(__file__).read_bytes()
    code='source='+repr(source)+'\n'+r'''
import hashlib,json
scope={'__name__':'export_controls'};exec(compile(source,'export.py','exec'),scope);p=scope['partition']
rows=lambda sizes:[dict(path=str(i),size=v) for i,v in enumerate(sizes)]
assert p([],5)==[]
for sizes,counts in [([2,3],1),([2,4],2),([0,5,0],1),([5,5,1],3)]:
 r=rows(sizes);g=p(r,5);assert len(g)==counts and sum(g,[])==r and all(sum(v['size'] for v in a)<=5 for a in g)
for size in (-1,6):
 try:p(rows([size]),5)
 except ValueError:pass
 else:raise AssertionError('Invalid bound admitted')
print(json.dumps(dict(controls=7,passed=True,sourceSHA256=hashlib.sha256(source).hexdigest())))
'''
    run=subprocess.run(CMD,input=code.encode(),capture_output=True);assert run.returncode==0,run.stderr.decode()
    record=json.loads(run.stdout);record.update(command=CMD,exitCode=run.returncode,jobSHA256=hashlib.sha256(code.encode()).hexdigest())
    path=P/'export-controls.json';assert not path.exists();path.write_text(json.dumps(record,indent=2)+'\n');print(json.dumps(record))


def main():
    out=P/'evidence';out.mkdir(exist_ok=True);assert not any(out.iterdir()) and not (P/'export.json').exists()
    code=r'''
import hashlib,json,pathlib
root=pathlib.Path('/work/project');rows=[]
for source in sorted(root.glob('v95-axis-source[0-9][0-9]')):
 for p in sorted(source.rglob('*')):
  if p.is_symlink():raise ValueError('Unexpected evidence symlink')
  if p.is_file() and '__pycache__' not in p.parts:
   raw=p.read_bytes();rows.append(dict(path=p.relative_to(root).as_posix(),size=len(raw),sha256=hashlib.sha256(raw).hexdigest()))
print(json.dumps(rows))
'''
    run=subprocess.run(CMD,input=code.encode(),capture_output=True);assert run.returncode==0,run.stderr.decode()
    rows=json.loads(run.stdout);assert rows and len({r['path'] for r in rows})==len(rows)
    groups=partition(rows,LIMIT);parts=[]
    for i,group in enumerate(groups,1):
        name=f'evidence-part{i:02d}.tar.gz';archive=P/name
        job='rows='+repr(group)+'\n'+r'''
import hashlib,io,json,pathlib,sys,tarfile
root=pathlib.Path('/work/project');assert sum(r['size'] for r in rows)<=80*1024**2<512*1024**2
manifest=json.dumps(dict(files=rows),indent=2).encode()
with tarfile.open(fileobj=sys.stdout.buffer,mode='w|gz') as tar:
 info=tarfile.TarInfo('ARCHIVE-PART.json');info.size=len(manifest);tar.addfile(info,io.BytesIO(manifest))
 for row in rows:
  rel=pathlib.PurePosixPath(row['path']);assert not rel.is_absolute() and '..' not in rel.parts
  p=root/rel;assert p.is_file() and not p.is_symlink();raw=p.read_bytes()
  assert len(raw)==row['size'] and hashlib.sha256(raw).hexdigest()==row['sha256']
  tar.add(p,arcname=row['path'],recursive=False)
'''
        with archive.open('xb') as f,(P/(name+'.stderr.log')).open('xb') as err:run=subprocess.run(CMD,input=job.encode(),stdout=f,stderr=err)
        assert run.returncode==0
        with tarfile.open(archive) as tar:
            members=tar.getmembers();assert all(m.isfile() for m in members)
            expected={r['path']:r for r in group};assert len(members)==len(expected)+1
            assert {m.name for m in members}==set(expected)|{'ARCHIVE-PART.json'}
            assert json.load(tar.extractfile('ARCHIVE-PART.json'))['files']==group
            for name,row in expected.items():
                rel=pathlib.PurePosixPath(name);assert not rel.is_absolute() and '..' not in rel.parts
                raw=tar.extractfile(name).read();assert len(raw)==row['size'] and hashlib.sha256(raw).hexdigest()==row['sha256']
                if name.endswith(('.json','.npz','.log')):
                    p=out/rel;p.parent.mkdir(parents=True,exist_ok=True);assert not p.exists();p.write_bytes(raw)
        assert archive.stat().st_size<100*1024**2
        parts.append(dict(path=archive.name,bytes=archive.stat().st_size,sha256=hashlib.sha256(archive.read_bytes()).hexdigest(),rawBytes=sum(r['size'] for r in group),files=len(group),exitCode=run.returncode,jobSHA256=hashlib.sha256(job.encode()).hexdigest()))
        print('VERIFIED',archive.name,flush=True)
    (out/'ARCHIVE-MANIFEST.json').write_text(json.dumps(dict(files=rows),indent=2)+'\n')
    receipt=dict(command=CMD,parts=parts,rawBytes=sum(r['size'] for r in rows),files=len(rows),allMembersRehashed=True,rawByteLimitPerTransfer=LIMIT)
    (P/'export.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))


if __name__=='__main__':
    if sys.argv[1:]==['--test']:test()
    else:main()
