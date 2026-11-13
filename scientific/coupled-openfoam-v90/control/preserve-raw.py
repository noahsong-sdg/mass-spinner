"""Trusted immutable archive relocation; no project/scientific execution."""
import hashlib,json,os,pathlib,shutil
root=pathlib.Path('/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6/scientific/coupled-openfoam-v90')
source=root/'evidence.tar.gz'
target=pathlib.Path('/Users/noahs/.codex/archives/mass-spinner-v90-20261113/attempts01-05.tar.gz')
assert not target.exists();target.parent.mkdir(exist_ok=True)
def sha(p):
 h=hashlib.sha256()
 with p.open('rb') as f:
  for b in iter(lambda:f.read(1024**2),b''):h.update(b)
 return h.hexdigest()
expected='10d067b2e3c95321d532702210c834287fd2a8818dbbf3799050d0a4597d7aff'
assert sha(source)==expected
shutil.copyfile(source,target)
with target.open('rb') as f:os.fsync(f.fileno())
fd=os.open(target.parent,os.O_RDONLY);os.fsync(fd);os.close(fd)
assert sha(target)==sha(source)==expected
receipt=dict(originalProjectPath=source.name,localArchive=str(target),sha256=expected,bytes=target.stat().st_size,
 localOnly=True,all22273OriginalMembersVerifiedBy='export.json',secondCopyRehashed=True)
out=root/'RAW-ARCHIVES.json';assert not out.exists()
with out.open('x') as f:json.dump(receipt,f,indent=2);f.write('\n');f.flush();os.fsync(f.fileno())
source.unlink()
print(json.dumps(receipt))
