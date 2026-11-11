"""Locate flux refinement errors and run controlled refinements in safe-dev."""
from pathlib import Path
import gzip,json,sys
import numpy as np
from model import run_case

directory=Path(sys.argv[1]);packet=json.loads((directory/'packet.json').read_text())
prefix=sys.argv[2] if len(sys.argv)>2 else 'diagnostic'
with gzip.open(directory/'results.json.gz','rt') as stream:results=json.load(stream)['cases']
by={r['name']:r for r in results}
controls=[]
cached={}
if '--analyze-only' in sys.argv:
    with gzip.open(directory/f'{prefix}-results.json.gz','rt') as stream:cached={c['name']:c for c in json.load(stream)['cases']}
    assert len(cached)==4, 'Analyze-only requires the complete four-case study'
for name,template,changes in [('fixed-gas-time2560','smooth-256',{'steps':2560}),
                            ('fixed-gas-time5120','smooth-256',{'steps':5120}),
                            ('fixed-gas-wall128','smooth-256',{'wallCells':128}),
                            ('resolved-space-time','smooth-512',{'steps':5120})]:
    base=next(c for c in packet['cases'] if c['name']==template)
    case={**base,'name':name,'config':{**base['config'],**changes}}
    if cached:
        assert cached[name]['config']==case['config']
        controls.append(cached[name])
    else:controls.append(run_case(case))
by.update({c['name']:c for c in controls})
pairs=[('smooth-256','smooth-512'),('smooth-256','fixed-gas-time2560'),
       ('fixed-gas-time2560','fixed-gas-time5120'),('smooth-256','fixed-gas-wall128')]
pairs += [('fixed-gas-time5120','resolved-space-time'),('smooth-512','resolved-space-time')]
records=[]
for a,b in pairs:
    sa,sb=by[a]['states'],by[b]['states'];stride=(len(sb)-1)//(len(sa)-1)
    def power(s):return s['interfaceConductanceWK']*(s['gasK'][-1]-s['solidK'][0])
    peak=max(abs(power(s)) for s in sb)
    errors=[abs(power(s)-power(sb[i*stride])) for i,s in enumerate(sa)];index=int(np.argmax(errors))
    records.append({'coarse':a,'fine':b,'maximumPowerDifferenceOverPeak':max(errors)/peak,
                    'timeOfMaximumErrorS':sa[index]['timeS'],'coarsePowerAtMaximumW':power(sa[index]),
                    'finePowerAtMaximumW':power(sb[index*stride]),'initialPowerDifferenceOverPeak':errors[0]/peak})
    profile=surface=pressure=exchange=0.;ea=np.cumsum([s['interfaceEnergyJ'] for s in sa]);eb=np.cumsum([s['interfaceEnergyJ'] for s in sb])
    for i,s in enumerate(sa):
        f=sb[i*stride];curves=[]
        for value in (s,f):
            e=np.array(value['gasEdgesM']);x=np.sqrt((e[:-1]**2+e[1:]**2)/2)
            curves.append(np.interp(np.linspace(0,by[a]['config']['radiusM'],101),x,value['gasK']))
        profile=max(profile,float(max(abs(curves[0]-curves[1]))))
        surface=max(surface,abs(s['gasSurfaceK']-f['gasSurfaceK']),abs(s['solidSurfaceK']-f['solidSurfaceK']))
        pressure=max(pressure,abs(s['pressurePa']-f['pressurePa'])/f['pressurePa'])
        exchange=max(exchange,abs(ea[i]-eb[i*stride])/abs(eb[-1]))
    records[-1].update(maximumProfileDifferenceK=profile,maximumSurfaceDifferenceK=surface,
                       maximumRelativePressureDifference=pressure,maximumExchangeDifferenceOverFinalExchange=exchange,
                       onePercentScreen=bool(profile/300<.01 and surface/300<.01 and max(errors)/peak<.01 and exchange<.01 and pressure<.01))
if not cached:
    with gzip.open(directory/f'{prefix}-results.json.gz','wt') as stream:json.dump({'cases':controls},stream,separators=(',',':'),allow_nan=False)
(directory/f'{prefix}-summary.json').write_text(json.dumps({'controlledComparisons':records},indent=2,allow_nan=False))
print(json.dumps(records,indent=2))
assert all(r['onePercentScreen'] for r in records[-2:]),records[-2:]
