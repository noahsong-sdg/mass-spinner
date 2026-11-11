"""Execute the complete frozen qualification inside the offline safe-dev guest."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

folder = Path(sys.argv[1]); folder.mkdir(parents=True, exist_ok=False)
python = sys.executable
scripts = Path('scientific/momentum-v65')
commands = [
    [python, str(scripts/'fixtures.py'), str(folder/'cases.json')],
    ['node_modules/.bin/tsx', str(scripts/'campaign.ts'), str(folder/'cases.json'), str(folder/'production.json')],
    [python, str(scripts/'reference_fipy.py'), str(folder/'cases.json'), str(folder/'fipy.json')],
    [python, str(scripts/'independent_check.py'), str(folder/'cases.json'), str(folder/'production.json'), str(folder/'audit.json')],
    [python, str(scripts/'diagnostic_reference.py'), str(folder/'production.json'), 'scientific/experimental-v64/data/markers-corrected.json', str(folder/'diagnostic.json')],
    [python, str(scripts/'analyze.py'), str(folder)],
]
for i, command in enumerate(commands):
    result = subprocess.run(command, capture_output=True, text=True, timeout=600)
    (folder/f'command-{i}.log').write_text(result.stdout+'\n'+result.stderr)
    if result.returncode:
        print(result.stdout+'\n'+result.stderr)
        raise SystemExit(result.returncode)
manifest = json.loads(Path('v43-last-manifest.json').read_text())
(folder/'tested-inputs.json').write_text(json.dumps(manifest, sort_keys=True, indent=2)+'\n')
analysis = json.loads((folder/'analysis.json').read_text())
print(json.dumps({'cases': len(analysis['cases']), 'gates': analysis['gates'],
                  'sourceSHA256': hashlib.sha256(json.dumps(manifest, sort_keys=True, separators=(',', ':')).encode()).hexdigest(),
                  'allNumericalGatesPassed': analysis['allNumericalGatesPassed']}, indent=2))
if not analysis['allNumericalGatesPassed']:
    raise SystemExit(1)
