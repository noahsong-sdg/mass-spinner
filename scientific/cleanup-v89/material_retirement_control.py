"""Reviewed host-only data maintenance; scientific code is never executed here.

Only inventory/preserve/verify. Native volume retirement is root-owned and absent.
Every guest call uses unchanged safe-dev, offline, and <=256 MiB payload chunks.
"""
import argparse
from datetime import datetime, timezone
import gzip
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import platform
import shutil
import stat
import subprocess
import sys
import tarfile
import tempfile

VOLUME = 'safe-dev-91df66bcebf94022'
STAGE = '/private/tmp/mass-spinner-material-v38-agent'
SOURCE = 'f50ae199ef879238abd60b1e4fd978f856b9151868b4cbbb74fa98355fac5f04'
SAFE = '/Users/noahs/.local/bin/safe-dev'
STATE = Path('/Users/noahs/.config/safe-dev')/(VOLUME+'.json')
OLD = Path('/Users/noahs/Scientific Backups/material-v38-v43-20261109')
OLD_SHA = 'cbb3cbabd0df1a74fbe6c79f386fd8f87837b47db2251d9c9ad9e1e4208c2f9a'
DEST = Path('/Users/noahs/Scientific Backups/material-v38-retirement-v89-20261113')
CAP = 256*1024**2
ENV = {'HOME': '/Users/noahs', 'PATH': '/usr/bin:/bin:/opt/homebrew/bin', 'LANG': 'en_US.UTF-8'}

INVENTORY = r'''
import hashlib,json,os,platform,stat,sys
from pathlib import Path
root=Path('/work');files=[];links=[];directories=[];blocked=[]
assert platform.system()=='Linux' and os.getuid()==1000
def secret(parts):
 names={'.config','.ssh','.aws','.azure','.kube','.gnupg'}
 n=parts[-1].lower()
 return (any(p.lower() in names for p in parts) or n.startswith(('.env','id_rsa','id_ed25519'))
  or n in {'credentials','credentials.json','secrets','secrets.json','.npmrc','.netrc','.pypirc','.gitconfig'}
  or n.endswith(('.key','.pem','.p12','.pfx')))
def err(e):raise e
for parent,ds,fs in os.walk(root,followlinks=False,onerror=err):
 for n in sorted(list(ds)):
  p=Path(parent)/n;rel=p.relative_to(root)
  if rel.as_posix()=='lost+found':ds.remove(n);continue
  if secret(rel.parts):blocked.append(rel.as_posix());ds.remove(n);continue
  s=p.lstat()
  if stat.S_ISLNK(s.st_mode):links.append(dict(path=rel.as_posix(),target=os.readlink(p)));ds.remove(n)
  elif stat.S_ISDIR(s.st_mode):directories.append(dict(path=rel.as_posix(),mode=stat.S_IMODE(s.st_mode)))
  else:raise RuntimeError('Unexpected directory type: '+str(rel))
 for n in sorted(fs):
  p=Path(parent)/n;rel=p.relative_to(root)
  if secret(rel.parts):blocked.append(rel.as_posix());continue
  before=p.lstat()
  if stat.S_ISLNK(before.st_mode):links.append(dict(path=rel.as_posix(),target=os.readlink(p)));continue
  if not stat.S_ISREG(before.st_mode):raise RuntimeError('Special file: '+str(rel))
  fd=os.open(p,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
  with os.fdopen(fd,'rb') as f:
   opened=os.fstat(f.fileno());h=hashlib.sha256()
   assert (before.st_ino,before.st_size,before.st_mtime_ns)==(opened.st_ino,opened.st_size,opened.st_mtime_ns)
   for block in iter(lambda:f.read(1024**2),b''):h.update(block)
   after=os.fstat(f.fileno())
  assert (opened.st_size,opened.st_mtime_ns)==(after.st_size,after.st_mtime_ns)
  files.append(dict(path=rel.as_posix(),size=opened.st_size,sha256=h.hexdigest(),mode=stat.S_IMODE(opened.st_mode),mtimeNS=opened.st_mtime_ns))
  if len(files)>100000:raise RuntimeError('Inventory limit exceeded')
result=dict(root='/work',uid=os.getuid(),platform=platform.system(),files=sorted(files,key=lambda r:r['path']),
 links=sorted(links,key=lambda r:r['path']),directories=sorted(directories,key=lambda r:r['path']),
 blockedSensitivePaths=sorted(blocked),excludedFilesystemDirectory='lost+found')
raw=json.dumps(result,sort_keys=True,separators=(',',':')).encode()
if len(raw)>32*1024**2:raise RuntimeError('Inventory JSON exceeds32MiB')
sys.stdout.buffer.write(raw)
raise SystemExit(1 if blocked else 0)
'''

CHUNK = r'''
import os,stat,sys
from pathlib import Path,PurePosixPath
name,offset,size,total,mtime=sys.argv[1],*[int(x) for x in sys.argv[2:]]
rel=PurePosixPath(name)
assert not rel.is_absolute() and '..' not in rel.parts and rel.parts[0] in ('home','project')
assert 0<=offset<=total and 0<=size<=256*1024**2 and offset+size<=total
p=Path('/work')
for part in rel.parts:
 p=p/part
 assert not p.is_symlink()
fd=os.open(p,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
with os.fdopen(fd,'rb') as f:
 before=os.fstat(f.fileno());assert stat.S_ISREG(before.st_mode)
 assert before.st_size==total and before.st_mtime_ns==mtime
 f.seek(offset);left=size
 while left:
  block=f.read(min(1024**2,left));assert block
  sys.stdout.buffer.write(block);left-=len(block)
 after=os.fstat(f.fileno())
 assert (before.st_ino,before.st_size,before.st_mtime_ns)==(after.st_ino,after.st_size,after.st_mtime_ns)
'''

BATCH = r'''
import json,os,stat,sys,tarfile
from pathlib import Path,PurePosixPath
rows=json.load(sys.stdin);assert rows and len(rows)<=100000
assert sum(r['size']+4096+len(r['path'].encode()) for r in rows)+20480<=256*1024**2
names=set()
with tarfile.open(fileobj=sys.stdout.buffer,mode='w|',format=tarfile.GNU_FORMAT) as archive:
 for row in rows:
  rel=PurePosixPath(row['path']);assert not rel.is_absolute() and '..' not in rel.parts
  assert rel.parts[0] in ('home','project') and row['path'] not in names;names.add(row['path'])
  p=Path('/work')
  for part in rel.parts:
   p=p/part;assert not p.is_symlink()
  fd=os.open(p,os.O_RDONLY|os.O_NOFOLLOW|os.O_NONBLOCK)
  with os.fdopen(fd,'rb') as stream:
   before=os.fstat(stream.fileno());assert stat.S_ISREG(before.st_mode)
   assert (before.st_size,before.st_mtime_ns)==(row['size'],row['mtimeNS'])
   entry=tarfile.TarInfo(row['path']);entry.size=row['size'];entry.mode=row['mode'];entry.mtime=0
   archive.addfile(entry,stream)
   after=os.fstat(stream.fileno())
   assert (before.st_ino,before.st_size,before.st_mtime_ns)==(after.st_ino,after.st_size,after.st_mtime_ns)
'''


def stamp():
    return datetime.now(timezone.utc).isoformat()


def digest(path):
    h=hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda:stream.read(1024**2),b''):
            h.update(block)
    return h.hexdigest()


def durable_json(path,value):
    path=Path(path); path.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
    fd,tmp=tempfile.mkstemp(prefix=path.name+'.',dir=path.parent)
    try:
        with os.fdopen(fd,'w') as stream:
            json.dump(value,stream,sort_keys=True,indent=2);stream.write('\n');stream.flush();os.fsync(stream.fileno())
        os.replace(tmp,path)
        directory=os.open(path.parent,os.O_RDONLY)
        try:os.fsync(directory)
        finally:os.close(directory)
    finally:
        if os.path.exists(tmp):os.unlink(tmp)


def identity():
    raw=STATE.read_bytes(); data=json.loads(raw)
    assert data['project']==STAGE and data['volume']==VOLUME and data['source_sha256']==SOURCE
    rows=json.loads(subprocess.check_output(['container','list','--all','--format','json'],env=ENV))
    for row in rows:
        for mount in row.get('configuration',{}).get('mounts',[]):
            assert mount.get('type',{}).get('volume',{}).get('name')!=VOLUME,'Candidate has an active/stopped attachment'
    return raw


def guest_args(code,*args):
    return [SAFE,'--memory','2G','-C',STAGE,'run','--','python3','-I','-c',code,*map(str,args)]


def inventory(name):
    before=identity(); started=stamp()
    run=subprocess.run(guest_args(INVENTORY),env=ENV,capture_output=True)
    (DEST/(name+'.stdout.json')).write_bytes(run.stdout)
    (DEST/(name+'.stderr.log')).write_bytes(run.stderr)
    durable_json(DEST/(name+'.execution.json'),dict(startedUTC=started,finishedUTC=stamp(),exitCode=run.returncode,
                 stage=STAGE,volume=VOLUME,helperSHA256=hashlib.sha256(INVENTORY.encode()).hexdigest(),metadataSHA256=hashlib.sha256(before).hexdigest()))
    assert run.returncode==0,'Inventory failed; preserve volume and inspect retained logs'
    value=json.loads(run.stdout)
    assert value['uid']==1000 and value['platform']=='Linux' and not value['blockedSensitivePaths']
    assert all(PurePosixPath(row['path']).parts[0] in ('home','project') for row in value['files'])
    assert STATE.read_bytes()==before
    return value


def old_backup():
    assert digest(OLD/'restore-manifest.json')==OLD_SHA
    manifest=json.loads((OLD/'restore-manifest.json').read_text()); rows=manifest['files']
    assert len(rows)==160 and manifest['rawBytes']==5330275010
    assert {p.relative_to(OLD/'cases').as_posix() for p in (OLD/'cases').rglob('*') if p.is_file()}=={r['name'] for r in rows}
    by_content={}
    for row in rows:
        path=OLD/'cases'/row['name']; assert not path.is_symlink()
        assert path.stat().st_size==row['size'] and digest(path)==row['sha256']
        by_content[(row['sha256'],row['size'])]='cases/'+row['name']
    for name,expected in manifest['metadata'].items():
        assert digest(OLD/'metadata'/name)==expected
    return by_content


def read_chunk(path,expected):
    assert digest(path)==expected['compressedSHA256']
    h=hashlib.sha256();total=0
    with gzip.open(path,'rb') as stream:
        for block in iter(lambda:stream.read(1024**2),b''):
            total+=len(block);h.update(block)
    assert total==expected['size'] and h.hexdigest()==expected['sha256']


def batches(rows):
    """Conservative GNU-tar overhead bound, including final record padding."""
    group=[]; size=20480
    for row in rows:
        cost=row['size']+4096+len(row['path'].encode())
        assert cost+20480<=CAP
        if size+cost>CAP:
            yield group;group=[];size=20480
        group.append(row);size+=cost
    if group:yield group


def check_tar(archive,rows):
    expected={r['path']:r for r in rows};seen=set()
    for member in archive:
        assert member.isfile() and member.name in expected and member.name not in seen
        row=expected[member.name];assert member.size==row['size'] and member.mode==row['mode']
        h=hashlib.sha256()
        with archive.extractfile(member) as stream:
            for block in iter(lambda:stream.read(1024**2),b''):h.update(block)
        assert h.hexdigest()==row['sha256'];seen.add(member.name)
    assert seen==set(expected)


def transfer_batch(rows,index):
    name=f'batch-{index:04d}.tar.gz';target=DEST/'blobs'/name
    assert not target.exists(),'Existing batch requires explicit review'
    fd,tmp=tempfile.mkstemp(prefix='batch-',dir=target.parent);started=stamp()
    class Tee:
        def __init__(self,source,output):self.source=source;self.output=output;self.size=0
        def read(self,size=-1):
            block=self.source.read(size);self.size+=len(block);assert self.size<=CAP
            self.output.write(block);return block
    with tempfile.TemporaryFile() as request,os.fdopen(fd,'wb') as raw,(DEST/f'{name}.stderr.log').open('xb') as errors:
        request.write(json.dumps(rows).encode());request.seek(0)
        process=subprocess.Popen(guest_args(BATCH),env=ENV,stdin=request,stdout=subprocess.PIPE,stderr=errors)
        try:
            with gzip.GzipFile(filename='',mode='wb',fileobj=raw,mtime=0) as compressed:
                tee=Tee(process.stdout,compressed)
                with tarfile.open(fileobj=tee,mode='r|') as archive:check_tar(archive,rows)
                while tee.read(1024**2):pass
            code=process.wait();raw.flush();os.fsync(raw.fileno())
        except BaseException:
            process.terminate();process.wait();raise
    durable_json(DEST/f'{name}.execution.json',dict(startedUTC=started,finishedUTC=stamp(),exitCode=code,
                 files=len(rows),payloadBytes=sum(r['size'] for r in rows),tarBytes=tee.size,
                 helperSHA256=hashlib.sha256(BATCH.encode()).hexdigest()))
    assert code==0,'Batch transfer failed; temporary archive retained'
    with tarfile.open(tmp,'r:gz') as archive:check_tar(archive,rows)
    record=dict(path='blobs/'+name,compressedSHA256=digest(tmp),members=rows)
    os.rename(tmp,target);return record


def preserve(initial):
    old=old_backup(); metadata=identity()
    assert metadata==(DEST/'original-safe-dev-metadata.json').read_bytes()
    payloads={}; files=[]; blobs=DEST/'blobs';blobs.mkdir(exist_ok=True)
    unknown={r['sha256']:r for r in initial['files'] if (r['sha256'],r['size']) not in old}
    assert shutil.disk_usage(DEST).free>=sum(r['size'] for r in unknown.values())+1024**3,'Need extra-data bytes plus1GiB reserve'
    batch_records=[];small=[];large=[]
    for row in unknown.values():
        (small if row['size']+4096+len(row['path'].encode())+20480<=CAP else large).append(row)
    for index,group in enumerate(batches(small)):
        batch=transfer_batch(group,index);batch_records.append(batch)
        for row in group:payloads[row['sha256']]=dict(size=row['size'],batchPath=batch['path'],member=row['path'])
        durable_json(DEST/'preservation-progress.json',dict(batches=batch_records,payloads=payloads))
    for row in large:
        chunks=[]
        for offset in range(0,row['size'],CAP):
            size=min(CAP,row['size']-offset);name=f"{row['sha256']}-{offset}-{size}.gz";target=blobs/name
            assert not target.exists(),'Existing transfer blob requires explicit review'
            fd,tmp=tempfile.mkstemp(prefix='chunk-',dir=blobs);h=hashlib.sha256();total=0
            log=DEST/f"transfer-{row['sha256']}-{offset}.stderr.log";started=stamp()
            with os.fdopen(fd,'wb') as raw,log.open('xb') as errors:
                process=subprocess.Popen(guest_args(CHUNK,row['path'],offset,size,row['size'],row['mtimeNS']),env=ENV,stdin=subprocess.DEVNULL,stdout=subprocess.PIPE,stderr=errors)
                try:
                    with gzip.GzipFile(filename='',mode='wb',fileobj=raw,mtime=0) as compressed:
                        for block in iter(lambda:process.stdout.read(1024**2),b''):
                            total+=len(block);assert total<=size;h.update(block);compressed.write(block)
                    code=process.wait();raw.flush();os.fsync(raw.fileno())
                except BaseException:
                    process.terminate();process.wait();raise
            durable_json(DEST/f"transfer-{row['sha256']}-{offset}.execution.json",dict(startedUTC=started,finishedUTC=stamp(),exitCode=code,path=row['path'],offset=offset,size=size,received=total,helperSHA256=hashlib.sha256(CHUNK.encode()).hexdigest()))
            assert code==0 and total==size,'Transfer failed; incomplete temporary blob retained for review'
            record=dict(path='blobs/'+name,offset=offset,size=size,sha256=h.hexdigest(),compressedSHA256=digest(tmp))
            read_chunk(tmp,record);os.rename(tmp,target);chunks.append(record)
        payloads[row['sha256']]=dict(size=row['size'],chunks=chunks)
        durable_json(DEST/'preservation-progress.json',dict(batches=batch_records,payloads=payloads))
    for row in initial['files']:
        key=(row['sha256'],row['size']); entry=dict(row)
        if key in old:
            entry['storage']=dict(existingBackup=str(OLD),relativePath=old[key],manifestSHA256=OLD_SHA)
        else:
            entry['storage']=dict(payloadSHA256=row['sha256'])
        files.append(entry)
    manifest=dict(schema=1,stage=STAGE,volume=VOLUME,originalMetadataSHA256=digest(DEST/'original-safe-dev-metadata.json'),
                  inventorySHA256=digest(DEST/'inventory-before.stdout.json'),existingBackupManifestSHA256=OLD_SHA,
                  files=files,payloads=payloads,batches=batch_records,links=initial['links'],directories=initial['directories'],packageExclusions=[],
                  existingRawBackup=str(OLD),guestOwnershipReleased=False,volumeRetired=False)
    durable_json(DEST/'restore-manifest.json',manifest)


def verify():
    manifest=json.loads((DEST/'restore-manifest.json').read_text());old_backup();before=identity()
    assert hashlib.sha256(before).hexdigest()==manifest['originalMetadataSHA256']
    initial=json.loads((DEST/'inventory-before.stdout.json').read_text())
    assert digest(DEST/'inventory-before.stdout.json')==manifest['inventorySHA256']
    assert [(r['path'],r['size'],r['sha256'],r['mode'],r['mtimeNS']) for r in manifest['files']]==[(r['path'],r['size'],r['sha256'],r['mode'],r['mtimeNS']) for r in initial['files']]
    assert manifest['links']==initial['links'] and manifest['directories']==initial['directories']
    expected={c['path'] for p in manifest['payloads'].values() for c in p.get('chunks',[])}|{b['path'] for b in manifest['batches']}
    assert {p.relative_to(DEST).as_posix() for p in (DEST/'blobs').iterdir()}==expected
    verified_batch=set()
    for batch in manifest['batches']:
        path=DEST/batch['path'];assert digest(path)==batch['compressedSHA256']
        with tarfile.open(path,'r:gz') as archive:check_tar(archive,batch['members'])
        for row in batch['members']:
            payload=manifest['payloads'][row['sha256']]
            assert payload==dict(size=row['size'],batchPath=batch['path'],member=row['path'])
            assert row['sha256'] not in verified_batch;verified_batch.add(row['sha256'])
    for sha,payload in manifest['payloads'].items():
        if 'batchPath' in payload:
            assert sha in verified_batch;continue
        h=hashlib.sha256();size=0
        for chunk in payload['chunks']:
            assert chunk['offset']==size;read_chunk(DEST/chunk['path'],chunk)
            with gzip.open(DEST/chunk['path'],'rb') as stream:
                for block in iter(lambda:stream.read(1024**2),b''):
                    h.update(block);size+=len(block)
        assert size==payload['size'] and h.hexdigest()==sha
    for row in manifest['files']:
        storage=row['storage']
        if 'existingBackup' in storage:
            assert storage['existingBackup']==str(OLD) and storage['manifestSHA256']==OLD_SHA
            path=OLD/storage['relativePath'];assert path.is_relative_to(OLD/'cases')
            assert path.stat().st_size==row['size'] and digest(path)==row['sha256']
        else:
            assert storage['payloadSHA256']==row['sha256'] and manifest['payloads'][row['sha256']]['size']==row['size']
    final=inventory('inventory-after');assert initial==final,'Guest changed during preservation'
    durable_json(DEST/'verified-preservation-receipt.json',dict(verifiedUTC=stamp(),volume=VOLUME,stage=STAGE,
                 restoredFiles=len(manifest['files']),restoredBytes=sum(r['size'] for r in manifest['files']),
                 additionalPayloadBytes=sum(p['size'] for p in manifest['payloads'].values()),
                 restoreManifestSHA256=digest(DEST/'restore-manifest.json'),allAdditionalPayloadsRestored=True,
                 beforeAfterInventoriesEqual=True,guestOwnershipReleased=False,volumeRetired=False))


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('phase',choices=('inventory','preserve','verify'));args=parser.parse_args()
    assert platform.system()=='Darwin','Trusted host maintenance only; guest helpers are explicit strings'
    if args.phase=='inventory':
        metadata=identity();DEST.mkdir(mode=0o700,exist_ok=False)
        (DEST/'original-safe-dev-metadata.json').write_bytes(metadata)
        (DEST/'inventory-helper.py').write_text(INVENTORY);(DEST/'chunk-helper.py').write_text(CHUNK);(DEST/'batch-helper.py').write_text(BATCH)
        inventory('inventory-before')
    elif args.phase=='preserve':
        assert not (DEST/'restore-manifest.json').exists()
        preserve(json.loads((DEST/'inventory-before.stdout.json').read_text()))
    else:verify()
    print(json.dumps(dict(phase=args.phase,completed=True,evidence=str(DEST),volumeRetired=False)))


if __name__=='__main__':
    main()
