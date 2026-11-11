"""Standalone scientific campaign figures, using existing matplotlib in safe-dev."""
from pathlib import Path
import json
import sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

cases_path, directory, summary_path, output = map(Path, sys.argv[1:5])
packet = json.loads(cases_path.read_text())
summary = json.loads(summary_path.read_text())
tau = packet['gasFilmTimeS']
load = lambda name: json.loads((directory/(name+'.json')).read_text())
fine = load('joint-n128-steps10240')
uniform = load('uniform-control-n128-steps10240')
plt.rcParams.update({'font.family': 'DejaVu Sans', 'font.size': 9,
                     'axes.spines.top': False, 'axes.spines.right': False,
                     'axes.grid': True, 'grid.alpha': .18, 'svg.fonttype': 'none'})
fig, axes = plt.subplots(2, 3, figsize=(13, 7.5), constrained_layout=True)

for record, label, style in ((uniform,'Uniform 128', '--'),(fine,'Graded 128','-')):
    times = [s['timeS']/tau for s in record['samples']]
    axes[0,0].plot(times,[s['gasK'] for s in record['samples']],style,label=label)
    axes[0,1].plot(times,[1000-s['innerSurfaceK'] for s in record['samples']],style,label=label)
    axes[0,2].plot(times,[s['interfacePowerW']/1e6 for s in record['samples']],style,label=label)
axes[0,0].set(title='Gas heating',xlabel='Time / nominal gas-film time',ylabel='Gas temperature (K)')
axes[0,1].set(title='Inner solid surface',xlabel='Time / nominal gas-film time',ylabel='Cooling from initial 1000 K (K)')
axes[0,2].set(title='Interface heat flow',xlabel='Time / nominal gas-film time',ylabel='Power, positive gas → solid (MW)')
for ax in axes[0]:
    ax.legend(frameon=False)

depths = [d*1e6 for d in fine['profileDepthsM']]
for time in (.125,1.,5.):
    state = min(fine['samples'],key=lambda s:abs(s['timeS']/tau-time))
    assert abs(state['timeS']/tau-time) < 1e-12
    axes[1,0].plot(depths,[1000-t for t in state['depthProfileK']],'-o',ms=3,label=f'{time:g} τ')
axes[1,0].set(title='Wall layer: graded 128',xlabel='Depth from inner surface (µm)',ylabel='Cooling from initial 1000 K (K)')
axes[1,0].set_xscale('symlog',linthresh=.25)
axes[1,0].legend(frameon=False,title='Physical sample time')

metrics = [('gasDifferenceK','Gas'),('surfaceDifferenceK','Inner surface'),
           ('profileDifferenceK','Wall profile'),('outerSurfaceDifferenceK','Outer surface')]
for key,label in metrics:
    rows = summary['spatial']['10240']['rows']
    n = [load(row['coarse'])['config']['cells'] for row in rows]
    values = [row[key] for row in rows]
    axes[1,1].loglog(n,values,'-o',ms=3,label=label)
    rows = summary['temporal']['128']['rows']
    dt = [load(row['coarse'])['study']['dtS']/tau for row in rows]
    values = [row[key] for row in rows]
    axes[1,2].loglog(dt,values,'-o',ms=3,label=label)
axes[1,1].set(title='Spatial refinement at 10,240 steps',xlabel='Coarser radial cell count',ylabel='Maximum sampled-history difference (K)')
axes[1,2].set(title='Timestep refinement on graded 128',xlabel='Coarser timestep / nominal gas-film time',ylabel='Maximum sampled-history difference (K)')
for ax in axes[1,1:]:
    ax.legend(frameon=False)
fig.suptitle('Fast thermal transient — full 12 mm radial solid with lumped gas',fontsize=14)
fig.supxlabel('Surface and depth values use the disclosed finite-volume reconstruction. Differences are refinement evidence, not calibrated hardware error bounds.',fontsize=8)
output.parent.mkdir(parents=True,exist_ok=True)
fig.savefig(output.with_suffix('.png'),dpi=200)
fig.savefig(output.with_suffix('.svg'))
plt.close(fig)
print(json.dumps({'png':str(output.with_suffix('.png')),'svg':str(output.with_suffix('.svg')),
                  'refinementAllPass':summary['allPass']}))
