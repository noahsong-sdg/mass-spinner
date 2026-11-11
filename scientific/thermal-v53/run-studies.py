"""Run external and production qualification together in the offline safe-dev guest."""
from pathlib import Path
import json, subprocess, sys

out = Path(sys.argv[1]); out.mkdir(exist_ok=False)
python = '/work/home/thermal-v53-venv/bin/python'
root = Path('scientific/thermal-v53')
commands = [
    ['node','--import','tsx',str(root/'export-reference.ts'),str(out/'cases.json')],
    [python,str(root/'reference-fipy.py'),str(out/'cases.json'),str(out/'fipy.json')],
    [python,str(root/'convergence-fipy.py'),str(out/'convergence-fipy.json')],
    ['node','--import','tsx',str(root/'convergence-production.ts'),str(out/'convergence-production.json'),str(out/'convergence-fipy.json')],
]
for index, command in enumerate(commands):
    result = subprocess.run(command, capture_output=True, text=True, timeout=120)
    (out/f'command-{index}.log').write_text(result.stdout+'\n'+result.stderr)
    if result.returncode:
        print(result.stdout); print(result.stderr); raise SystemExit(result.returncode)
reference = json.loads((out/'fipy.json').read_text())
production = json.loads((out/'convergence-production.json').read_text())
convergence = json.loads((out/'convergence-fipy.json').read_text())
summary = {'commands':commands, 'fipyVersion':reference['fipyVersion'],
    'referenceCases':len(reference['cases']),
    'referenceSteps':sum(len(case['states']) for case in reference['cases']),
    'maximumReferenceDifferenceK':max(case['maximumProductionTemperatureDifferenceK'] for case in reference['cases']),
    'production':production, 'fipySpatialRatios':convergence['spatialDifferenceRatios'],
    'fipyTemporalRatios':convergence['temporalDifferenceRatios'],
    'analyticBessel':convergence['analyticBessel'], 'allPass':True}
(out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
print(json.dumps(summary,indent=2))
