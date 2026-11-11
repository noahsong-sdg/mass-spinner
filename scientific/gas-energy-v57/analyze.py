"""Observable convergence and qualification screens, not device validation."""
from pathlib import Path
import gzip,json,sys
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

directory=Path(sys.argv[1])
with gzip.open(directory/'results.json.gz','rt') as f:cases=json.load(f)['cases']
if (directory/'resolved-results.json.gz').exists():
    with gzip.open(directory/'resolved-results.json.gz','rt') as f:cases.extend(json.load(f)['cases'])
by={c['name']:c for c in cases};reference=json.loads((directory/'fipy.json').read_text())['cases']
amplitudes=[]
for ref in reference:
    case=by[ref['name']];amplitude=case['states'][0]['gasK'][0]-500.
    errors=[max(np.max(abs(np.array(a['gasK'])-b['gasK'])),np.max(abs(np.array(a['solidK'])-b['solidK'])))
            for a,b in zip(case['states'],ref['states'],strict=True)]
    amplitudes.append({'amplitudeK':amplitude,'maximumErrorK':float(max(errors)),
                       'errorPerAmplitude':float(max(errors)/amplitude)})
assert amplitudes[-1]['errorPerAmplitude']<1e-4,amplitudes
assert all(a['errorPerAmplitude']>b['errorPerAmplitude'] for a,b in zip(amplitudes,amplitudes[1:])),amplitudes


def observables(case):
    s=case['states'][-1];r=case['config']['radiusM'];e=np.array(s['gasEdgesM']);x=np.sqrt((e[:-1]**2+e[1:]**2)/2)
    profile=np.interp(np.linspace(0,r,101),x,s['gasK'])
    return profile,float(sum(s0['interfaceEnergyJ'] for s0 in case['states'])),s['interfaceConductanceWK']*(s['gasK'][-1]-s['solidK'][0])


def differences(names):
    pairs=[]
    for a,b in zip(names,names[1:]):
        pa,qa,fa=observables(by[a]);pb,qb,fb=observables(by[b])
        pairs.append({'coarse':a,'fine':b,'maximumProfileDifferenceK':float(max(abs(pa-pb))),
                      'profileFractionOfInitialContrast':float(max(abs(pa-pb))/300),
                      'exchangeRelativeDifference':abs(qa-qb)/abs(qb),'powerRelativeDifference':abs(fa-fb)/abs(fb)})
    return pairs


def histories(names):
    pairs=[]
    for a,b in zip(names,names[1:]):
        ca,cb=by[a],by[b];stride=cb['config']['steps']//ca['config']['steps'];assert stride>=1
        ea=np.cumsum([s['interfaceEnergyJ'] for s in ca['states']]);eb=np.cumsum([s['interfaceEnergyJ'] for s in cb['states']])
        profile=surface=pressure=power=exchange=absolute_power=0.
        peak_power=max(abs(s['interfaceConductanceWK']*(s['gasK'][-1]-s['solidK'][0])) for s in cb['states'])
        for i,sa in enumerate(ca['states']):
            sb=cb['states'][i*stride];assert abs(sa['timeS']-sb['timeS'])<1e-12
            curves=[]
            for s in (sa,sb):
                e=np.array(s['gasEdgesM']);x=np.sqrt((e[:-1]**2+e[1:]**2)/2)
                curves.append(np.interp(np.linspace(0,ca['config']['radiusM'],101),x,s['gasK']))
            profile=max(profile,float(max(abs(curves[0]-curves[1]))))
            surface=max(surface,abs(sa['gasSurfaceK']-sb['gasSurfaceK']),abs(sa['solidSurfaceK']-sb['solidSurfaceK']))
            pressure=max(pressure,abs(sa['pressurePa']-sb['pressurePa'])/sb['pressurePa'])
            qa=sa['interfaceConductanceWK']*(sa['gasK'][-1]-sa['solidK'][0]);qb=sb['interfaceConductanceWK']*(sb['gasK'][-1]-sb['solidK'][0])
            power=max(power,abs(qa-qb)/max(abs(qa),abs(qb),1e-30));exchange=max(exchange,abs(ea[i]-eb[i*stride])/abs(eb[-1]))
            absolute_power=max(absolute_power,abs(qa-qb))
        pairs.append(dict(coarse=a,fine=b,maximumProfileDifferenceK=profile,maximumSurfaceDifferenceK=surface,
                          maximumRelativePressureDifference=pressure,maximumRelativePowerDifference=power,
                          maximumPowerDifferenceOverPeakPower=absolute_power/peak_power,
                          maximumExchangeDifferenceOverFinalExchange=exchange,
                          onePercentCommonTimeScreen=profile/300<.01 and surface/300<.01 and absolute_power/peak_power<.01 and exchange<.01))
    return pairs


joint=differences(['joint-16','joint-32','joint-64']);time=differences(['time-80','time-160','time-320'])
gates={name:all(rows[-1][k]<.01 for k in ('profileFractionOfInitialContrast','exchangeRelativeDifference','powerRelativeDifference'))
       and rows[1]['maximumProfileDifferenceK']<rows[0]['maximumProfileDifferenceK'] for name,rows in [('joint',joint),('timestep',time)]}
screens=[]
for case in cases:
    states=case['states'];s=states[-1]
    maxima={k:max(v[k] for v in states) for k in ('maxMach','maxKn','maxThermalGradientKn','maxStressTimeRate','maxAcousticTimeRate')}
    screens.append({'name':case['name'],'caseKind':case['caseKind'],'inventoryReferencePressurePa':case['config']['pressurePa'],
                    'actualInitialPressurePa':states[0]['pressurePa'],'finalPressurePa':s['pressurePa'],
                    'finalGasRangeK':[min(s['gasK']),max(s['gasK'])],**maxima,
                    'necessaryScreensNotExcluded':all(maxima[k]<bound for k,bound in [('maxMach',.01),('maxKn',.01),
                       ('maxThermalGradientKn',.01),('maxStressTimeRate',.01),('maxAcousticTimeRate',.01)]),
                    'physicallyQualified':False})
result={'fipyAmplitudeStudy':amplitudes,'joint':joint,'timestep':time,'endpointNumericalGates':gates,
        'allCommonTimesJoint':histories(['joint-16','joint-32','joint-64']),
        'allCommonTimesSmooth':histories(['smooth-16','smooth-32','smooth-64','smooth-128','smooth-256','smooth-512']),
        'allCommonTimesTimestep':histories(['time-80','time-160','time-320']),'cases':screens,
        'assumptions':'Pure nonrotating monatomic low-Mach; accommodation approximate and surface-specific; screens necessary, not qualification'}
if (directory/'resolved-summary.json').exists():
    result['controlledRefinements']=json.loads((directory/'resolved-summary.json').read_text())['controlledComparisons']
(directory/'summary.json').write_text(json.dumps(result,indent=2,allow_nan=False))
fig,axes=plt.subplots(2,2,figsize=(12,8),layout='constrained');ax=axes.flat
case=by.get('resolved-space-time',by['smooth-512'])
for index in [0,case['config']['steps']//20,case['config']['steps']//4,case['config']['steps']//2,case['config']['steps']]:
    s=case['states'][index];e=np.array(s['gasEdgesM']);x=np.sqrt((e[:-1]**2+e[1:]**2)/2)
    ax[0].plot(x*1000,s['gasK'],label=f'{s["timeS"]*1000:.0f} ms')
ax[0].set(xlabel='Radius (mm)',ylabel='Gas temperature (K)',title='Smooth-start gas cooling: conditional He/W');ax[0].legend()
for alpha in [.1,.5,1.]:
    states=by[f'alpha-{alpha}']['states'];ax[1].plot([s['timeS']*1000 for s in states],
        [s['gasSurfaceK']-s['solidSurfaceK'] for s in states],label=f'α = {alpha}')
ax[1].set(xlabel='Time (ms)',ylabel='Extrapolated interface jump (K)',title='Abrupt startup: unqualified α sensitivity');ax[1].legend()
for n in [16,64,512]:
    s=by[f'smooth-{n}']['states'][-1];e=np.array(s['gasEdgesM']);ax[2].plot(np.sqrt((e[:-1]**2+e[1:]**2)/2)*1000,s['gasK'],label=f'{n} gas cells')
ax[2].set(xlabel='Radius (mm)',ylabel='Gas temperature at 80 ms (K)',title='Joint space/time refinement');ax[2].legend()
ax[3].loglog([s['amplitudeK'] for s in amplitudes],[s['maximumErrorK'] for s in amplitudes],'o-')
ax[3].set(xlabel='Initial temperature perturbation (K)',ylabel='Maximum nonlinear − FiPy difference (K)',title='Independent small-amplitude limit')
for a in ax:a.grid(alpha=.2)
fig.suptitle('Spatial gas-energy reference · conditional physics, not calibrated hardware')
fig.savefig(directory/'findings.png',dpi=160);fig.savefig(directory/'findings.svg')
print(json.dumps(result,indent=2));assert all(gates.values()),gates
if 'controlledRefinements' in result:
    assert all(r['onePercentScreen'] for r in result['controlledRefinements'][-2:])
