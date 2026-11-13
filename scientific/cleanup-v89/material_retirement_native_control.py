"""Reviewed host maintenance: retire one independently preserved native volume."""
import datetime,fcntl,hashlib,json,os,pathlib,shutil,subprocess
P=pathlib.Path('/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6')
B=pathlib.Path('/Users/noahs/Scientific Backups/material-v38-retirement-v89-20261113')
V='safe-dev-91df66bcebf94022'
STATE=pathlib.Path('/Users/noahs/.config/safe-dev')
OUT=P/'scientific/cleanup-v89/material-retirement'
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1024**2),b''):h.update(b)
 return h.hexdigest()
def seal(path,data):
 with path.open('xb') as f:f.write(data);f.flush();os.fsync(f.fileno())
def syncdir(p):
 fd=os.open(p,os.O_RDONLY)
 try:os.fsync(fd)
 finally:os.close(fd)
def native(*args):return subprocess.check_output(['container',*args])
def volumes():return {r['id']:r for r in json.loads(native('volume','list','--format','json'))}
def idle():
 for c in json.loads(native('list','--all','--format','json')):
  for m in c.get('configuration',{}).get('mounts',[]):
   assert m.get('type',{}).get('volume',{}).get('name')!=V,'Volume attached'
with (STATE/(V+'.lock')).open('a') as lock:
 fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
 idle();metadata=(STATE/(V+'.json')).read_bytes()
 assert metadata==(B/'original-safe-dev-metadata.json').read_bytes()
 mapping=json.loads(metadata)
 assert mapping['volume']==V and mapping['project']=='/private/tmp/mass-spinner-material-v38-agent'
 assert mapping['source_sha256']=='f50ae199ef879238abd60b1e4fd978f856b9151868b4cbbb74fa98355fac5f04'
 proof=json.loads((B/'verified-preservation-receipt.json').read_text())
 assert proof['allAdditionalPayloadsRestored'] and proof['beforeAfterInventoriesEqual']
 assert proof['restoredFiles']==3744 and proof['restoredBytes']==6542419673
 assert proof['restoreManifestSHA256']==sha(B/'restore-manifest.json')=='5d152fcc7cde55833d40ca1b16f1440a9c7a6da0dd84d02c7564407dd3d077a4'
 assert (B/'inventory-before.stdout.json').read_bytes()==(B/'inventory-after.stdout.json').read_bytes()
 review=P/'scientific/cleanup-v89/MATERIAL-PRESERVATION-REVIEW.md'
 assert review.is_file(),'Independent review required'
 independent=B/'independent-preservation-review.json'
 assert sha(independent)=='a9c97854edbfed974ec01caebe9b178014349cd78662d6f2ea64fca1d542cf62'
 checked=json.loads(independent.read_text())
 assert checked['volume']==V and checked['restoreManifestSHA256']==proof['restoreManifestSHA256']
 assert checked['inventoryFiles']==3744 and checked['regularBytes']==6542419673
 assert all(checked[k] is True for k in ['originalBackupRehashed','allNewArchiveMembersAndChunksRehashed','completePathMembership','beforeAfterInventoriesEqual'])
 assert checked['sensitivePathsBlocked']==[]
 for p in sorted(B.rglob('*')):
  assert not p.is_symlink()
  if p.is_file():
   with p.open('rb') as f:os.fsync(f.fileno())
 for p in sorted([p for p in B.rglob('*') if p.is_dir()],key=lambda p:len(p.parts),reverse=True):syncdir(p)
 syncdir(B);syncdir(B.parent)
 before=volumes();assert V in before
 image=pathlib.Path(before[V]['configuration']['source'])
 assert image==pathlib.Path('/Users/noahs/Library/Application Support/com.apple.container/volumes')/V/'volume.img'
 allocated=image.stat().st_blocks*512
 backup_allocated=sum(p.stat().st_blocks*512 for p in B.rglob('*') if p.is_file())
 OUT.mkdir(exist_ok=False)
 for name in ['verified-preservation-receipt.json','independent-preservation-review.json','inventory-before.execution.json','inventory-after.execution.json','original-safe-dev-metadata.json']:
  seal(OUT/name,(B/name).read_bytes())
 receipt=dict(utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),volume=V,
  ownerRelease='/root/v38_material conditionally released after complete preservation; root accepts after fresh inventory and independent full readback',
  independentReviewSHA256=sha(review),independentJSONSHA256=sha(independent),proofSHA256=sha(B/'verified-preservation-receipt.json'),
  backup=str(B),backupAllocatedBytes=backup_allocated,volumeAllocatedBytesBefore=allocated,
  metadataSHA256=hashlib.sha256(metadata).hexdigest(),backupFilesAndDirectoriesFsynced=True,
  allFileBytesAndModesLinksPreserved=True,volumesBefore=sorted(before),dataFreeBytesBefore=shutil.disk_usage(B).free,
  action=['container','volume','delete',V],guestOwnershipReleased=True,volumeRetired=False)
 seal(OUT/'retirement-admission.json',(json.dumps(receipt,indent=2)+'\n').encode());syncdir(OUT)
 idle();assert (STATE/(V+'.json')).read_bytes()==metadata
 deleted=subprocess.run(receipt['action'],capture_output=True)
 receipt.update(deleteExitCode=deleted.returncode,deleteStdout=deleted.stdout.decode(),deleteStderr=deleted.stderr.decode())
 assert deleted.returncode==0,'Native deletion failed; keep registration'
 after=volumes();assert V not in after
 assert all(after.get(k)==v for k,v in before.items() if k!=V),'Protected volume inventory changed'
 assert (STATE/(V+'.json')).read_bytes()==metadata
 (STATE/(V+'.json')).unlink();syncdir(STATE)
 receipt.update(volumeRetired=True,registrationRemoved=True,otherVolumesPreserved=True,
  volumesAfter=sorted(after),dataFreeBytesAfter=shutil.disk_usage(B).free,
  finishedUTC=datetime.datetime.now(datetime.timezone.utc).isoformat())
 seal(OUT/'retirement-receipt.json',(json.dumps(receipt,indent=2)+'\n').encode());syncdir(OUT)
 print(json.dumps({k:receipt[k] for k in ['volumeRetired','volumeAllocatedBytesBefore','backupAllocatedBytes','dataFreeBytesBefore','dataFreeBytesAfter','otherVolumesPreserved']}))
