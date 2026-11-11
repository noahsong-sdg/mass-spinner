from pathlib import Path
import hashlib, json, subprocess, sys, time
root=Path("/work/home/mass-spinner-v77-full01")
output=Path("/work/home/overfit-v78-parent-checks01.json")
assert not output.exists()
summary=json.loads((root/"scientific/spatial-v77/summary-01.json").read_text())
sources=dict(summary["sourceHashes"])
sources["scientific/spatial-v77/study.py"]=summary["supplementalSourceSha256"]
sources["scientific/spatial-v77/test_study.py"]=summary["testSourceSha256"]
for name,digest in sources.items():
    assert hashlib.sha256((root/name).read_bytes()).hexdigest()==digest, name
checks=[]
for command in ([sys.executable,"-m","unittest","discover","-s","scientific/spatial-v77","-v"],
                ["npm","run","typecheck"],["npm","run","build"]):
    start=time.monotonic()
    result=subprocess.run(command,cwd=root,text=True,capture_output=True)
    checks.append(dict(command=command,exitCode=result.returncode,stdout=result.stdout,stderr=result.stderr,seconds=time.monotonic()-start))
report=dict(scope="Read-only audit final checks on unchanged frozen v77 producer and study source. Host audit documentation is outside this source copy.",
    sourceSnapshotSha256="53d63424c15f1090f64e2963d0715542d69b8c6f208790e5e0c67554b4170c72",
    sourceHashes=sources,scriptSha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    checks=checks,passed=all(c["exitCode"]==0 for c in checks))
output.write_text(json.dumps(report,indent=2)+"\n")
print(json.dumps(dict(passed=report["passed"],checks=[dict(command=c["command"],exitCode=c["exitCode"]) for c in checks])))
raise SystemExit(0 if report["passed"] else 1)
