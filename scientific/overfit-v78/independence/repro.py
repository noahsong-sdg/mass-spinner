import sys,json
from pathlib import Path
root=Path('/work/home/mass-spinner-v77-full01')
sys.path.insert(0,str(root/'scientific/spatial-v77'))
import study
raw=json.loads((root/'scientific/spatial-v77/study-01.json').read_text())
row=raw['cases'][0]['stepChecks'][0]
row['checks']['hydro']['massResidualKg']=1e20
for s in row['transportAudits']:
    if s['kind']=='hydro': s['metrics']['massResidualKg']=1e20
rawpath=Path('/work/home/overfit_independence_mutant_REPLAY.json')
output=Path('/work/home/overfit_independence_analysis_REPLAY.json')
assert not rawpath.exists() and not output.exists()
rawpath.write_text(json.dumps(raw))
passed=study.analyze_study(Path('/work/home/mass-spinner-v76-study05.json'),root/'scientific/spatial-v77/plan-01.json',rawpath,output)
print(json.dumps(dict(mutatedReportPassed=passed,mutatedHydroMassResidualKg=1e20)))
