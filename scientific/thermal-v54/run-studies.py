"""Thick-wall qualification orchestration; run only inside offline safe-dev."""
from pathlib import Path
import json
import subprocess
import sys

out = Path(sys.argv[1])
out.mkdir(exist_ok=False)
root = Path('scientific/thermal-v54')
python = '/work/home/thermal-v53-venv/bin/python'
cases, fipy = out/'cases.json', out/'fipy.json'
commands = [
    [python, str(root/'refinement-cases.py'), str(cases)],
    [python, str(root/'refinement-fipy.py'), str(cases), str(fipy)],
    ['node', '--import', 'tsx', str(root/'refinement-production.ts'),
     str(cases), str(fipy), str(out/'production.json')],
]
for index, command in enumerate(commands):
    result = subprocess.run(command, capture_output=True, text=True, timeout=180)
    (out/f'command-{index}.log').write_text(result.stdout+'\n'+result.stderr)
    if result.returncode:
        print(result.stdout)
        print(result.stderr)
        raise SystemExit(result.returncode)
fi = json.loads(fipy.read_text())
production = json.loads((out/'production.json').read_text())
summary = {'allPass': fi['allPass'] and production['allPass'],
           'qualificationPass': fi['qualificationPass'] and production['allPass'],
           'commands': commands,
           'cases': len(fi['cases']),
           'states': sum(len(c['states']) for c in fi['cases'].values()),
           'maximumNonlinearResidual': max(c['maximumNonlinearResidual'] for c in fi['cases'].values()),
           'refinement': fi['refinement'], 'production': production}
(out/'summary.json').write_text(json.dumps(summary, indent=2)+'\n')
print(json.dumps(summary, indent=2))
