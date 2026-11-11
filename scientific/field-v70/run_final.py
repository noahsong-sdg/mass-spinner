"""Execute bounded field hypothesis study and final gates inside safe-dev."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import time

out = Path(sys.argv[1])
if out.parent != Path('/work/home') or not out.name.startswith('field70-'):
    raise ValueError('Use an explicitly owned new field70 output directory')
out.mkdir(exist_ok=False)
python = '/work/home/thermal-v53-venv/bin/python'
markers = 'scientific/experimental-v64/data/markers-corrected.json'
protocol = 'scientific/field-v70/PROTOCOL.md'
def release_hashes():
    return {str(p.relative_to('release')): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in sorted(Path('release').rglob('*')) if p.is_file()}

# Compare the actual pre-study build, not an older deployed release whose
# identity and asset inventory predate later research snapshots.
prior = release_hashes()
(out/'pre-build-release.json').write_text(json.dumps(prior, indent=2)+'\n')
commands = [
    ('narrow-tests', ['node_modules/.bin/tsx', '--test', 'tests/field-v70.test.ts',
                     'tests/experimental-v64.test.ts', 'tests/fuel-momentum-v65.test.ts',
                     'tests/fuel-momentum-volume-v66.test.ts']),
    ('independent-tests', [python, '-m', 'unittest', 'discover', '-s', 'scientific/field-v70', '-p', 'test_*.py', '-v']),
    ('comparison', ['node_modules/.bin/tsx', 'scientific/field-v70/compare.ts', markers, str(out/'comparison.json')]),
    ('independent-reference', [python, 'scientific/field-v70/reference.py', str(out/'comparison.json'), markers,
                               protocol, str(out/'independent.json')]),
    ('typecheck', ['npm', 'run', 'typecheck']), ('build', ['npm', 'run', 'build']),
    ('site', ['npm', 'run', 'check:site']), ('assets', ['npm', 'run', 'check:assets'])]
records = []
for name, command in commands:
    started = time.monotonic()
    result = subprocess.run(command, capture_output=True, text=True, timeout=240)
    (out/(name+'.log')).write_text(result.stdout+'\n'+result.stderr)
    records.append({'name': name, 'command': command, 'exitCode': result.returncode,
                    'seconds': time.monotonic()-started})
    print(name, result.returncode, result.stdout[-200:], result.stderr[-200:], flush=True)
    if result.returncode:
        (out/'incomplete.json').write_text(json.dumps(records, indent=2)+'\n')
        raise SystemExit(result.returncode)

packet = json.loads((out/'comparison.json').read_text())
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
fig, axes = plt.subplots(1, 2, figsize=(11, 4.2), layout='constrained')
colors = ['#b45309', '#64748b', '#0f766e']
labels = ['Old inventory proxy', 'Constant-viscosity limit', 'Sourced neutral Ar viscosity']
for case, color, label in zip(packet['cases'][:3], colors, labels):
    rows = case['points']
    axes[0].plot([p['B'] for p in rows], [p['predictedMS'] for p in rows], color=color, label=label)
    heldout = [p for p in rows if p['split'] == 'test']
    axes[1].plot([p['B'] for p in heldout], [100*p['relativeError'] for p in heldout], 'o-', color=color, label=label)
observed = packet['cases'][0]['points']
axes[0].errorbar([p['B'] for p in observed], [p['velocityMS'] for p in observed],
                 yerr=[p['velocityHalfWidth'] for p in observed], fmt='ko', capsize=3, label='Extracted measurements')
train = observed[1]
axes[0].scatter([train['B']], [train['velocityMS']], marker='*', s=110, c='#ea580c', zorder=5, label='One calibration')
axes[0].set(xlabel='Axial magnetic field (T)', ylabel='Apparent peak speed (m/s)')
axes[1].axhline(20, color='black', linestyle=':', label='Nominal screen')
axes[1].set(xlabel='Held-out field (T)', ylabel='Relative speed error (%)')
for ax in axes:
    ax.grid(alpha=.2)
    ax.legend(fontsize=8)
fig.suptitle('Temperature-conditioned field scaling\nRadial profile, pressure response and full simulator accuracy remain unqualified', fontsize=11)
fig.savefig(out/'field-scaling.png', dpi=160)
fig.savefig(out/'field-scaling.svg')

release = release_hashes()
if release != prior:
    raise ValueError('Research-only change unexpectedly modified public release bytes')
summary = {'commands': records, 'releaseFiles': len(release), 'releaseByteIdenticalToPreStudyBuild': True,
           'releaseSHA256': hashlib.sha256(json.dumps(release, sort_keys=True, separators=(',', ':')).encode()).hexdigest(),
           'markersSHA256': packet['markersSHA256'], 'protocolSHA256': packet['protocolSHA256'],
           'goalAchieved': False, 'matchedExperimentalValidation': False, 'liveQualified': False,
           'freshBrowserTest': False, 'unresolved': packet['unresolved'],
           'scope': 'Conditional field-hypothesis comparison. Passing software/reference gates is not a device qualification.'}
(out/'receipt.json').write_text(json.dumps(summary, indent=2)+'\n')
print(json.dumps(summary, indent=2))
