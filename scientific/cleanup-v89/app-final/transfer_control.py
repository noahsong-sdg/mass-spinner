"""Trusted host transfer/control; project checks execute only in safe-dev."""
import base64,hashlib,json,pathlib,subprocess,datetime,tarfile
P=pathlib.Path("/Users/noahs/.codex/visualizations/2026/11/06/01a1b24c-d476-72f2-9877-6d32127334f6")
S=pathlib.Path("/private/tmp/mass-spinner-app-v88-clean-20261112")
OUT=P/"scientific/cleanup-v89/app-final"
OUT.mkdir(exist_ok=False)
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
expected={};overlay={};previous={}
for path in sorted(S.rglob("*")):
 if not path.is_file() or path.is_symlink():continue
 rel=path.relative_to(S).as_posix();current=P/rel
 if not current.is_file() or current.is_symlink():raise RuntimeError("Missing current source: "+rel)
 expected[rel]=sha(current)
 if sha(path)!=expected[rel]:
  overlay[rel]=base64.b64encode(current.read_bytes()).decode()
  previous[rel]=sha(path)
prior=OUT/'prior-stage-overlay.tar.gz'
with tarfile.open(prior,'w:gz') as archive:
 for name in sorted(overlay):archive.add(S/name,arcname=name,recursive=False)
with tarfile.open(prior) as archive:
 assert {m.name for m in archive}==set(overlay)
 for name in overlay:
  assert hashlib.sha256(archive.extractfile(name).read()).hexdigest()==previous[name]
manifest=dict(recipe="SHA256 of UTF8 JSON sorted path-to-SHA256 map, compact separators, no trailing newline",fileSHA256=expected,
 sourceTreeSHA256=hashlib.sha256(json.dumps(expected,sort_keys=True,separators=(",",":")).encode()).hexdigest(),
 sourceRoot=str(P),initialStage=str(S),overlayFiles=sorted(overlay),previousStageSHA256=previous,previousStageArchiveSHA256=sha(prior),
 safeDevMetadata=json.loads((pathlib.Path.home()/".config/safe-dev/safe-dev-8bed71533ca2cd54.json").read_text()))
(OUT/"expected-source.json").write_text(json.dumps(manifest,indent=2)+"\n")
guest=r'''
import base64,datetime,hashlib,json,os,pathlib,platform,subprocess,sys,time,tempfile
assert platform.system()=="Linux" and os.getuid()==1000
root=pathlib.Path("/work/project");out=root/"v89-app-final";out.mkdir(exist_ok=False)
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def stamp():return datetime.datetime.now(datetime.timezone.utc).isoformat()
def refresh(path,raw,wanted,prior):
 current=digest(path)
 if current==wanted:return
 assert current==prior,'Unpreserved guest edit: '+str(path)
 assert hashlib.sha256(raw).hexdigest()==wanted
 path.write_bytes(raw)
with tempfile.TemporaryDirectory(dir=out) as folder:
 q=pathlib.Path(folder)/'source';q.write_bytes(b'old')
 old=hashlib.sha256(b'old').hexdigest();new=hashlib.sha256(b'new').hexdigest()
 refresh(q,b'new',new,old);assert q.read_bytes()==b'new'
 refresh(q,b'new',new,old);assert q.read_bytes()==b'new'
 q.write_bytes(b'unpreserved')
 try:refresh(q,b'new',new,old)
 except AssertionError:pass
 else:raise RuntimeError('Unpreserved guest mutation was overwritten')
 assert q.read_bytes()==b'unpreserved'
(out/'overlay-controls.log').write_text('3/3: preserved-old refresh, already-current state, unpreserved-edit rejection passed.\n')
for name,data in overlay.items():
 q=root/name
 assert q.is_file() and not q.is_symlink()
 raw=base64.b64decode(data,validate=True)
 assert hashlib.sha256(raw).hexdigest()==expected[name]
 refresh(q,raw,expected[name],previous[name])
for name,sha in expected.items():assert digest(root/name)==sha,name
receipt=dict(startedUTC=stamp(),uid=os.getuid(),platform=platform.platform(),sourceTreeSHA256=source_tree,sourceFiles=len(expected),overlayControlsPassed=3,commands=[])
(out/"source.json").write_text(json.dumps(expected,indent=2)+"\n")
for key,cmd in [("test",["npm","test"]),("typecheck",["npm","run","typecheck"]),("build",["npm","run","build"]),("site",["npm","run","check:site"]),("assets",["npm","run","check:assets"])]:
 start=time.monotonic();print("RUN",key,flush=True)
 with (out/(key+".log")).open("xb") as log:run=subprocess.run(cmd,cwd=root,stdout=log,stderr=subprocess.STDOUT)
 receipt["commands"].append(dict(name=key,command=cmd,exitCode=run.returncode,wallSeconds=time.monotonic()-start,logSHA256=digest(out/(key+".log"))))
 (out/"execution.json").write_text(json.dumps(receipt,indent=2)+"\n")
 print("EXIT",key,run.returncode,flush=True)
 if run.returncode:raise RuntimeError("Required check failed:"+key)
for name,sha in expected.items():assert digest(root/name)==sha,name
receipt.update(finishedUTC=stamp(),allPassed=True,sourceUnchanged=True,nodeVersion=subprocess.check_output(["node","--version"],text=True).strip(),npmVersion=subprocess.check_output(["npm","--version"],text=True).strip())
(out/"execution.json").write_text(json.dumps(receipt,indent=2)+"\n")
data={p.name:dict(sha256=digest(p),base64=base64.b64encode(p.read_bytes()).decode()) for p in sorted(out.iterdir()) if p.is_file()}
print("EVIDENCE_JSON:"+json.dumps(data,separators=(",",":")),flush=True)
'''
job="expected="+repr(expected)+"\noverlay="+repr(overlay)+"\nprevious="+repr(previous)+"\nsource_tree="+repr(manifest["sourceTreeSHA256"])+"\n"+guest
command=["/Users/noahs/.local/bin/safe-dev","--memory","2G","-C",str(S),"run","--","python3","-"]
with (OUT/"launch.log").open("xb") as log:run=subprocess.run(command,input=job.encode(),stdout=log,stderr=subprocess.STDOUT)
raw=(OUT/"launch.log").read_text();prefix="EVIDENCE_JSON:"
if prefix in raw:
 payload=json.loads(raw.split(prefix,1)[1])
 for name,row in payload.items():
  assert pathlib.PurePosixPath(name).name==name
  b=base64.b64decode(row["base64"],validate=True);assert hashlib.sha256(b).hexdigest()==row["sha256"]
  (OUT/name).write_bytes(b)
 (OUT/"launch.log").write_text(raw.split(prefix,1)[0]+"Evidence payload transferred and independently SHA256 verified.\n")
(OUT/"launch.json").write_text(json.dumps(dict(command=command,exitCode=run.returncode,jobSHA256=hashlib.sha256(job.encode()).hexdigest(),sourceTreeSHA256=manifest["sourceTreeSHA256"]),indent=2)+"\n")
print(json.dumps({"exitCode":run.returncode,"sourceFiles":len(expected),"overlays":list(overlay),"sourceTreeSHA256":manifest["sourceTreeSHA256"],"out":str(OUT)}))
raise SystemExit(run.returncode)

