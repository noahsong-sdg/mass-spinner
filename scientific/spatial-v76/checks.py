"""Record the final source-bound gate commands; execute offline in safe-dev."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import time

sys.path.insert(0, str(Path(__file__).resolve().parents[1]/'mixture-axial-v75'))
from run import hashes


if __name__ == '__main__':
    output = Path(sys.argv[1])
    assert not output.exists(), 'Preserve prior gate receipts'
    source = hashes()
    extra = {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in Path(__file__).parent.glob('*.py')}
    commands = [
        [sys.executable, '-m', 'unittest', 'discover', '-s', 'scientific/mixture-axial-v75'],
        [sys.executable, '-m', 'unittest', 'discover', '-s', 'scientific/spatial-v76'],
        [sys.executable, '-m', 'unittest', 'discover', '-s', 'scientific/coupled-axial-v74'],
        ['node_modules/.bin/tsx', '--test', *['tests/'+name+'.test.ts' for name in (
            'fuel-current-precision-v74', 'fuel-current-v66', 'fuel-current-axis-v66',
            'fuel-current-reuse-v68', 'fuel-spatial-operation-v66')]],
        *[['npm', 'run', name] for name in ('typecheck', 'build', 'check:site', 'check:assets')],
        *[[sys.executable, 'scientific/mixture-axial-v75/'+name+'.py', '--output',
           'scientific/mixture-axial-v75/'+filename+'-05.json'] for name, filename in (
            ('controls', 'controls'), ('diffusion_controls', 'diffusion-controls'), ('audit', 'audit'))],
    ]
    rows = []
    for command in commands:
        start = time.monotonic()
        result = subprocess.run(command, text=True, capture_output=True)
        rows.append(dict(command=command, exitCode=result.returncode, wallSeconds=time.monotonic()-start,
                         stdout=result.stdout, stderr=result.stderr))
        assert hashes() == source, 'Source changed during gate execution'
        assert extra == {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
                         for p in Path(__file__).parent.glob('*.py')}, 'Study tools changed during gates'
        output.write_text(json.dumps(dict(sourceHashes=source,
            extraSourceHashes=extra,
            driverSha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), checks=rows,
            passed=all(r['exitCode'] == 0 for r in rows)), indent=2)+'\n')
        print(json.dumps(dict(command=command, exitCode=result.returncode)), flush=True)
        if result.returncode:
            print(result.stdout+result.stderr, flush=True)
            raise SystemExit(result.returncode)
