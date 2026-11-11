"""Final checks in the existing offline safe-dev copy; preserve earlier evidence."""
from pathlib import Path
import hashlib,json,os,signal,shutil,subprocess,sys,time
root=Path('/work/home/fix-v43-source')
assert Path.cwd()==root
candidate=sys.argv[1] if len(sys.argv)>1 else 'scan'
final_adaptive=candidate in ('adaptive61','adaptive61b','adaptive61c','adaptive61d')
assert final_adaptive or candidate in ['scan','render45','render45b','render45c','motion46','motion46b','motion46c','motion46d','motion46e','playground47','playground47b','playground47c','playground47d','playground47e','playground47f','coupled48','coupled48b','drive49','drive49b','drive49c','drive49d','render50','render50b','render50c','render50d','render50e','operate51','operate51b','operate51c','audit52','audit52b','audit52c','audit52d','audit52e','thermal53','thermal53b','thermal53c','thermal54','thermal55','gas56','gas57','mixture58','hotwall59','boundary60']
output=Path(f'/work/home/features-v44-{candidate}-final');output.mkdir(exist_ok=False)
manifest=json.loads((root/'v43-last-manifest.json').read_text())
def digest(path):
 with path.open('rb') as stream:return hashlib.file_digest(stream,'sha256').hexdigest()
def verify():
 for name,sha in manifest.items():assert digest(root/name)==sha,name
def canonical(value):return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':')).encode()).hexdigest()
verify()
if (root/'release').exists():shutil.move(root/'release',output/'prior-generated-release')
commands=[('tests',['npm','test']),('typecheck',['npm','run','typecheck']),('build',['npm','run','build']),
 ('site',['npm','run','check:site']),('assets',['npm','run','check:assets']),
 ('release-worker',['node','--import','tsx','scientific/fixes-v43/verify-release-worker.mjs']),
 ('fuel-release-worker',['node','--import','tsx','scripts/verify-fuel-release-v44.mjs']),
 ('collision-data',['python3','docs/reviews/v42-collision-data-probe.py'])]
if candidate.startswith('thermal53') or candidate in ('thermal54','thermal55'):
 commands.append(('thermal-studies',['python3','scientific/thermal-v53/run-studies.py',f'/work/home/thermal-v53-final-studies-{candidate}']))
if candidate in ('thermal54','thermal55'):
 commands.append(('thickwall-regression',['/work/home/thermal-v53-venv/bin/python','tests/test_fipy_thickwall_v54.py']))
if candidate == 'thermal55':
 commands.append(('liner-grid-regression',['/work/home/thermal-v53-venv/bin/python','tests/test_fipy_grid_v55.py']))
if candidate in ('gas56','gas57'):
 commands.append(('gas-regime-regression',['/work/home/gas-regime-v56-venv/bin/python','tests/test_gas_regime_v56.py']))
if candidate == 'gas57':
 commands.extend([
  ('gas-energy-regression',['/work/home/thermal-v53-venv/bin/python','tests/test_gas_energy_v57.py']),
  ('gas-energy-geometry-regression',['/work/home/thermal-v53-venv/bin/python','tests/test_gas_energy_geometry_v57.py']),
  ('gas-energy-compile',['/work/home/thermal-v53-venv/bin/python','-m','compileall','-q','scientific/gas-energy-v57']),
  ('gas-energy-report-regression',['/work/home/thermal-v53-venv/bin/python','scientific/gas-energy-v57/diagnose.py','/work/home/gas-energy-v57-studies-5','resolved','--analyze-only'])])
if candidate=='mixture58':
 commands.extend([
  ('mixture-studies',['node','--import','tsx','scientific/mixture-energy-v58/campaign.ts','/work/home/mixture-energy-v58-final-studies']),
  ('mixture-fourier-input',['node','--import','tsx','scientific/mixture-energy-v58/emit-fipy.ts','/work/home/mixture58-final-fipy-input.json']),
  ('mixture-fourier-fipy',['/work/home/thermal-v53-venv/bin/python','scientific/mixture-energy-v58/fipy-reference.py','/work/home/mixture58-final-fipy-input.json','/work/home/mixture58-final-fipy-result.json'])])
if candidate in ('hotwall59','boundary60') or final_adaptive:
 commands.extend([
  ('mixture-studies',['node','--import','tsx','scientific/mixture-energy-v58/campaign.ts',f'/work/home/{candidate}-final-mixture-studies']),
  ('mixture-fourier-input',['node','--import','tsx','scientific/mixture-energy-v58/emit-fipy.ts',f'/work/home/{candidate}-final-fipy-input.json']),
  ('mixture-fourier-fipy',['/work/home/thermal-v53-venv/bin/python','scientific/mixture-energy-v58/fipy-reference.py',f'/work/home/{candidate}-final-fipy-input.json',f'/work/home/{candidate}-final-fipy-result.json']),
  ('hotwall-studies',['node','--import','tsx','scientific/hotwall-timestep-v59/campaign.ts',f'/work/home/{candidate}-final-studies'])])
if candidate=='boundary60':
 commands.extend([
  ('boundary-oracle-tests',['/work/home/thermal-v53-venv/bin/python','-m','unittest','discover','-s','tests','-p','test_*reference_v60.py']),
  ('boundary-robin-input',['node','--import','tsx','scientific/hotwall-boundary-v60/emit-robin.ts','/work/home/boundary60-final-robin-input.json']),
  ('boundary-robin-reference',['/work/home/thermal-v53-venv/bin/python','scientific/hotwall-boundary-v60/robin-reference.py','/work/home/boundary60-final-robin-input.json','/work/home/boundary60-final-robin-result.json']),
  ('boundary-joint-analysis',['/work/home/thermal-v53-venv/bin/python','scientific/hotwall-boundary-v60/analyze-joint.py','/work/home/hotwall60-joint-matrix','/work/home/hotwall60-joint-fine','/work/home/hotwall60-extra','/work/home/boundary60-final-joint-result.json']),
  ('boundary-replay',['node','--import','tsx','scientific/hotwall-boundary-v60/campaign.ts','/work/home/boundary60-final-replay','wall']),
  ('boundary-state-identity',['python3','-c',"import json;from pathlib import Path;a=json.loads(Path('/work/home/hotwall60-joint-matrix/n64-t8192.json').read_text());b=json.loads(Path('/work/home/boundary60-final-replay/n64-w16-t8192.json').read_text());assert a['sampled']==b['sampled'];print('All common-time canonical fields identical before and after maximum hoist.')"])])
if final_adaptive:
 base=f'/work/home/{candidate}-final'
 commands.extend([
  ('adaptive-oracle-tests',['/work/home/thermal-v53-venv/bin/python','-m','unittest','discover','-s','scientific/hotwall-adaptive-v61','-p','test_*.py']),
  ('adaptive-full',['node','--import','tsx','scientific/hotwall-adaptive-v61/campaign.ts',base+'-full','candidate']),
  ('adaptive-early',['node','--import','tsx','scientific/hotwall-adaptive-v61/campaign.ts',base+'-early','early-candidate']),
  ('adaptive-robin',['node','--import','tsx','scientific/hotwall-adaptive-v61/campaign.ts',base+'-robin','robin']),
  ('adaptive-analysis',['/work/home/thermal-v53-venv/bin/python','scientific/hotwall-adaptive-v61/analyze.py',base+'-analysis.json',
   '/work/home/hotwall60-extra/long-ref-fixed/n512-w128-t32768.json','/work/home/hotwall60-extra/early/n512-w128-t16384.json',
   base+'-full',base+'-early',base+'-robin','/work/home/hotwall61-early-qualified','/work/home/hotwall61-fine-qualified','/work/home/hotwall61-spatial','/work/home/hotwall61-tight','/work/home/hotwall61-full']),
  ('legacy-replay',['node','--import','tsx','scientific/hotwall-boundary-v60/campaign.ts',base+'-legacy','wall']),
  ('legacy-state-identity',['python3','-c',f"import json;from pathlib import Path;a=json.loads(Path('/work/home/hotwall60-joint-matrix/n64-t8192.json').read_text());b=json.loads(Path('{base}-legacy/n64-w16-t8192.json').read_text());assert a['sampled']==b['sampled'];print('Legacy common-time canonical fields identical with adaptive mode absent.')"])])
records=[];logs={}
for label,command in commands:
 verify();start=time.monotonic()
 process=subprocess.Popen(command,cwd=root,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,start_new_session=True)
 try:
  stdout,stderr=process.communicate(timeout=180)
  result=subprocess.CompletedProcess(command,process.returncode,stdout,stderr)
 except subprocess.TimeoutExpired as error:
  os.killpg(process.pid,signal.SIGKILL);stdout,stderr=process.communicate()
  result=subprocess.CompletedProcess(command,124,stdout,stderr+'\nGate exceeded 180 seconds.\n')
 logs[label]=result.stdout+'\n'+result.stderr;(output/(label+'.log')).write_text(logs[label])
 records.append({'label':label,'command':command,'exitCode':result.returncode,'seconds':time.monotonic()-start});verify()
 if result.returncode:
  print(json.dumps({'commands':records,'logs':logs}));raise SystemExit(result.returncode)
release={str(path.relative_to(root/'release')):digest(path) for path in sorted((root/'release').rglob('*')) if path.is_file()}
receipt={'sourceRoot':str(root),'inputs':len(manifest),'inputSHA256':canonical(manifest),'releaseFiles':len(release),
 'releaseSHA256':canonical(release),'commands':records,'sourceVerifiedBeforeAndAfterEveryCommand':True,
 'browserVerified':False,'calibratedMarathonDevice':False}
(output/'receipt.json').write_text(json.dumps(receipt,indent=2));(output/'release-sha256.json').write_text(json.dumps(release,indent=2))
print(json.dumps({'receipt':receipt,'release':release,'logs':logs}))
