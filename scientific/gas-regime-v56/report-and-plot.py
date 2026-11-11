"""Standalone scientific figures/compact findings; execute in safe-dev."""
from pathlib import Path
import json
import sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

packet_path, results_path, output = map(Path,sys.argv[1:4])
packet, results = json.loads(packet_path.read_text()), json.loads(results_path.read_text())
inputs = {c['name']:c for c in packet['cases']}
records = results['cases']
def brief(row):
    if not row['supported']:
        return {'name':row['name'],'supported':False}
    return {'name':row['name'],'temperatureK':inputs[row['name']]['state']['gasK'],
            'nominalFilmTimeS':row['nominalFilmTimeS'],'radialAcousticTimeS':row['radialAcousticTimeS'],
            'axialAcousticTimeS':row['axialAcousticTimeS'],
            'radialDiffusionCpS':row['transport']['radialDiffusionCpS'],
            'radialCpOverFilmTime':row['transport']['radialCpOverFilmTime'],
            'maximumKnRadius':row['transport']['maximumKnRadius'],
            'maximumGradientKn':row['transport']['maximumGradientKn'],
            'wallMaxwellReferenceWK':row['wall']['maxwellReferenceWK'],
            'requiredAccommodationReference':row['wall']['requiredAccommodationReference'],
            'axisCellDensityOverMean':row['cells'][0]['numberDensityM3']/row['meanNumberDensityM3'],
            'wallCellDensityOverMean':row['cells'][-1]['numberDensityM3']/row['meanNumberDensityM3'],
            'screens':row['screens']}
initial = [r for r in records if r['family']=='initial-pair-reference' and r['supported']]
fast = [r for r in records if r['family']=='fast55-conditional-species']
li = [r for r in records if r['family']=='sampled-accepted-thermal' and inputs[r['name']]['config']['pair']=='lithium']
refine = [r for r in records if r['family']=='gas-profile-refinement']
findings = {'initial':[brief(r) for r in initial],'fastConditional':[brief(r) for r in fast],
            'lithiumThermalSamples':[brief(r) for r in li],'gasProfileRefinement':[brief(r) for r in refine],
            'counts':results['counts'],'scope':results['limits']}
output.with_suffix('.json').write_text(json.dumps(findings,indent=2,allow_nan=False)+'\n')
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':9,'axes.spines.top':False,
                     'axes.spines.right':False,'axes.grid':True,'grid.alpha':.2,'svg.fonttype':'none'})
fig, axes = plt.subplots(2,2,figsize=(12,8),constrained_layout=True)
for i,r in enumerate(initial):
    axes[0,0].scatter(i,r['nominalFilmTimeS'],marker='o',color='black',label='Film Cᵥ/G' if i==0 else None)
    axes[0,0].scatter(i,r['radialAcousticTimeS'],marker='x',color='#3484b8',label='Bulk radial acoustic' if i==0 else None)
    if r['transport']['radialDiffusionCpS'] is not None:
        axes[0,0].scatter(i,r['transport']['radialDiffusionCpS'],marker='s',color='#dc8a35',label='Bulk radial diffusion (Cₚ)' if i==0 else None)
axes[0,0].set_xticks(range(len(initial)),[inputs[r['name']]['config']['pair'] for r in initial])
axes[0,0].set(yscale='log',ylabel='Time (s)',title='Pair reference states: 10 Pa, 500 K, G=0.1 W/K')
axes[0,0].legend(frameon=False,fontsize=8)

for pair,label in [('lithium','Li fit proxy'),('dt','D/T Cantera proxy'),('helium','Equimolar He table')]:
    selected = [r for r in records if r['family']=='static-slider-grid' and r['supported'] and
                all(inputs[r['name']]['config'][k]==v for k,v in
                    [('pair',pair),('pressurePa',10),('gasK',500),('radiusM',.12),('lengthM',.8)]) and inputs[r['name']]['gasWallWK']>0]
    selected.sort(key=lambda r:inputs[r['name']]['gasWallWK'])
    axes[0,1].loglog([inputs[r['name']]['gasWallWK'] for r in selected],
                     [r['transport']['radialCpOverFilmTime'] for r in selected],'-o',ms=3,label=label)
axes[0,1].axhline(.1,color='#888888',ls=':',label='Heuristic 0.1 screen')
axes[0,1].set(xlabel='Prescribed film G (W/K)',ylabel='Bulk radial diffusion / film time',title='Film-based uniform-temperature screen')
axes[0,1].legend(frameon=False,fontsize=8)

times = [inputs[r['name']]['state']['timeS'] for r in li]
for key,label in [('maximumKnRadius','Worst λᵥ / radius'),('maximumGradientKn','Worst λᵥ × density log-gradient')]:
    axes[1,0].semilogy(times,[r['transport'][key] for r in li],'-o',ms=3,label=label)
axes[1,0].axhline(.01,color='#888888',ls=':',label='Heuristic 0.01 screen')
axes[1,0].set(xlabel='Accepted sample time (s)',ylabel='Transport-based Knudsen proxy',title='Li opted-in thermal trajectory: sampled gas fields')
axes[1,0].legend(frameon=False,fontsize=8)

axes[1,1].bar(range(len(fast)),[r['wall']['maxwellReferenceWK'] for r in fast],color='#3484b8')
axes[1,1].axhline(1000,color='#b44e42',ls='--',label='v55 imposed 1000 W/K')
axes[1,1].set_xticks(range(len(fast)),[inputs[r['name']]['config']['pair'] for r in fast])
axes[1,1].set(yscale='log',ylabel='Single-interface reference (W/K)',title='v55 conditional identities: α=1, uniform incident gas')
axes[1,1].legend(frameon=False,fontsize=8)
fig.suptitle('Neutral-gas regime assessment — conditional screens, not hardware qualification',fontsize=13)
fig.supxlabel('Transport proxies and missing mixtures are disclosed. Wall incidence assumes local Maxwellians; sound propagation does not establish thermal mixing.',fontsize=8)
fig.savefig(output.with_suffix('.png'),dpi=180)
fig.savefig(output.with_suffix('.svg'))
plt.close(fig)
print(json.dumps({'findings':str(output.with_suffix('.json')),'figure':str(output.with_suffix('.png')),
                  'initial':[brief(r) for r in initial],'fastConditional':[brief(r) for r in fast],
                  'gasProfileRefinement':[brief(r) for r in refine]},indent=2))
