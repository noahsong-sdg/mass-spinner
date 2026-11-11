"""Final v64 execution/verification, offline safe-dev only."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import time

root = Path('/work/home/fix-v43-source')
assert Path.cwd() == root
study = Path('/work/home/experimental-v64')
out = Path(sys.argv[1])
assert out.parent == study and out.name.startswith('final-')
out.mkdir(exist_ok=False)
python = '/work/home/gas-regime-v56-venv/bin/python'
commands = [
    ('benchmark-tests', ['node_modules/.bin/tsx', '--test', 'tests/experimental-v64.test.ts',
                         'tests/fuel-centrifuge-independent-v44.test.ts', 'tests/fuel-centrifuge-scenario-v44.test.ts']),
    ('independent-tests', [python, '-m', 'unittest', 'discover', '-s', 'scientific/experimental-v64', '-p', 'test_*.py']),
    ('comparison', ['node_modules/.bin/tsx', 'scientific/experimental-v64/compare.ts',
                    str(study/'extracted-corrected.json'), str(out/'primary')]),
    ('independent-comparison', [python, 'scientific/experimental-v64/independent_check.py',
                                str(out/'primary/comparison.json'), str(out/'independent.json')]),
    ('extraction-sensitivity', ['node_modules/.bin/tsx', 'scientific/experimental-v64/extraction_sensitivity.ts',
                                str(out/'primary/comparison.json'), str(out/'extraction-sensitivity.json')]),
    ('typecheck', ['npm', 'run', 'typecheck']), ('build', ['npm', 'run', 'build']),
    ('site', ['npm', 'run', 'check:site']), ('assets', ['npm', 'run', 'check:assets'])]
records = []
for name, command in commands:
    started = time.monotonic()
    result = subprocess.run(command, capture_output=True, text=True, timeout=180)
    (out/(name+'.log')).write_text(result.stdout+'\n'+result.stderr)
    records.append({'name': name, 'command': command, 'exitCode': result.returncode,
                    'seconds': time.monotonic()-started})
    print(name, result.returncode, result.stdout[-350:], result.stderr[-350:], flush=True)
    if result.returncode:
        raise SystemExit(result.returncode)

packet = json.loads((out/'primary/comparison.json').read_text())
independent = json.loads((out/'independent.json').read_text())
assert not independent['matchedExperimentalValidation']
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
fig, axes = plt.subplots(2, 2, figsize=(12, 8), layout='constrained')
points = packet['profile']['points']
for split, color in [('train', '#737373'), ('test', '#b45309')]:
    selected = [p for p in points if p['split'] == split]
    axes[0, 0].scatter([p['rCm'] for p in selected], [p['vMS'] for p in selected],
                        c=color, label='Measured '+split, zorder=3)
axes[0, 0].plot([p['rCm'] for p in points], [p['predictedMS'] for p in points],
                 color='#0f766e', label='Rigid fit to inner points')
axes[0, 0].axvline(3, color='#737373', linestyle=':', alpha=.5)
axes[0, 0].set(title='Doppler profile: held-out outer region', xlabel='Chord position (cm)', ylabel='Apparent velocity (m/s)')
axes[0, 0].legend(fontsize=8)
p_ratio = [1+i*.02 for i in range(101)]
axes[0, 1].plot(p_ratio, [1/p for p in p_ratio], color='#0f766e', label='Fixed-rate production reference')
axes[0, 1].scatter([1, 3], [1, 2/3], c=['#737373', '#b45309'], zorder=3, label='Reported normalized trend')
axes[0, 1].set(title='Pressure trend: filling-pressure proxy', xlabel='Filling pressure / 3 Torr', ylabel='Peak apparent speed / baseline')
axes[0, 1].legend(fontsize=8)
magnetic = packet['magneticScaling']['points']
axes[1, 0].plot([p['B'] for p in magnetic], [p['predictedMS'] for p in magnetic], color='#0f766e', label='Fixed rates + Tmax inventory proxy')
axes[1, 0].scatter([p['B'] for p in magnetic], [p['velocityMS'] for p in magnetic], c='#b45309', zorder=3, label='Measured maxima')
training = next(p for p in magnetic if p['split'] == 'train')
axes[1, 0].scatter([training['B']], [training['velocityMS']], marker='*', s=130, c='#737373', zorder=4, label='Calibration point')
axes[1, 0].set(title='Magnetic trend: conditioned structural test', xlabel='Magnetic field (T)', ylabel='Peak apparent speed (m/s)')
axes[1, 0].legend(fontsize=8)
maxima = packet['mechanism']['maximaUncertainty']
axes[1, 1].errorbar([p['B'] for p in maxima], [p['lambda'] for p in maxima],
                    yerr=[[p['lambda']-p['lambdaEnvelope'][0] for p in maxima],
                          [p['lambdaEnvelope'][1]-p['lambda'] for p in maxima]],
                    fmt='o', color='#b45309', capsize=4)
axes[1, 1].set(title='Input sensitivity, not a confidence interval', xlabel='Magnetic field (T)',
               ylabel='mAr Vmax² / (2 kB Tmax)')
for axis in axes.flat:
    axis.grid(alpha=.2)
fig.suptitle('Public experiments challenge the reduced model\nConditioned structural comparisons; no Marathon device validation', fontsize=13)
fig.savefig(out/'benchmarks.png', dpi=160)
fig.savefig(out/'benchmarks.svg')

expected = json.loads(Path('/work/home/features-v44-adaptive61d-final/release-sha256.json').read_text())
release = {str(p.relative_to(root/'release')): hashlib.sha256(p.read_bytes()).hexdigest()
           for p in sorted((root/'release').rglob('*')) if p.is_file()}
assert release == expected
receipt = {'commands': records, 'releaseFiles': len(release),
           'extractedDataSHA256': packet['extractedDataSHA256'],
           'releaseByteIdenticalToDeployedFinalD': True,
           'releaseSHA256': hashlib.sha256(json.dumps(release, sort_keys=True, separators=(',', ':')).encode()).hexdigest(),
           'matchedExperimentalValidation': False, 'newProductionLaw': False,
           'freshBrowserTest': False, 'sourceSnapshot': 'See matching control.py receipt/input manifest'}
(out/'receipt.json').write_text(json.dumps(receipt, indent=2)+'\n')
print(json.dumps(receipt, indent=2))
