"""Execute independent prescribed-current studies offline in safe-dev."""
from pathlib import Path
import subprocess
import sys

folder = Path(sys.argv[1]); folder.mkdir(exist_ok=False)
python = sys.executable
scripts = Path('scientific/current-v66')
commands = [[python, str(scripts/'fixtures.py'), str(folder/'cases.json')],
            ['node_modules/.bin/tsx', str(scripts/'campaign.ts'), str(folder/'cases.json'), str(folder/'production.json')],
            [python, str(scripts/'reference_fipy.py'), str(folder/'cases.json'), str(folder/'fipy.json')],
            [python, str(scripts/'analyze.py'), str(folder/'cases.json'), str(folder/'production.json'), str(folder/'fipy.json'), str(folder/'analysis.json')],
            ['node_modules/.bin/tsx', str(scripts/'transport.ts'), str(folder/'transport.json')],
            [python, str(scripts/'check_transport.py'), '--xml', '/work/home/current66-data/collisions.xml', '--predictions', str(folder/'transport.json'), '--output', str(folder/'transport-validation.json')]]
for i, command in enumerate(commands):
    result = subprocess.run(command, capture_output=True, text=True, timeout=600)
    (folder/f'command-{i}.log').write_text(result.stdout+'\n'+result.stderr)
    print(i, result.returncode, result.stdout[-1500:], result.stderr[-1500:], flush=True)
    if result.returncode:
        raise SystemExit(result.returncode)
