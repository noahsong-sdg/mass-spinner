"""Prospective native-LoKI resolution/domain controls; no solver implementation."""
import json
import math
from pathlib import Path
import subprocess
import time
import adapter as a

KEYS=('meanEnergyEV','mobilityM2VS','diffusionM2S','ionizationRateM3S')

def relative(x,y): return abs(x-y)/max(abs(x),abs(y)) if x or y else 0

def main():
    root=a.ROOT; out=root/'extension-results'
    if out.exists(): raise ValueError('Extension output already exists')
    out.mkdir()
    sealed={p:a.digest(root/p) for p in ('PROTOCOL-EXTENSION.md','extension.py','adapter.py')}
    original=json.loads((root/'results/receipt.json').read_text())
    exe=root/'build/app/loki'
    if a.digest(exe)!=original['executableSHA256']: raise ValueError('Stale executable')
    receipt=dict(protocolHashes=sealed,originalReceiptSHA256=a.digest(root/'results/receipt.json'),
                 executableSHA256=a.digest(exe),cases=[],refinements=[],domainControls=[])
    template=(root/'upstream/input/Argon/Ar_swarm_setup.in').read_text()
    for maximum,cells in ((80,1600),(80,3200),(80,6400),(40,3200),(160,6400)):
        for tg in (300,1000):
            for td in (10,30):
                label=f'v88-ext-{td}Td-{tg}K-{maximum}eV-n{cells}'
                config=root/'upstream/input/Argon'/(label+'.in')
                text=a.make_input(template,td,tg,cells,label).replace('maxEnergy: 200','maxEnergy: '+str(maximum))
                config.write_text(text); (root/'inputs'/config.name).write_text(text)
                row=dict(label=label,maxEnergyEV=maximum,inputSHA256=a.digest(config),completed=False)
                start=time.monotonic()
                with (out/(label+'.log')).open('w') as log:
                    p=subprocess.run([str(exe),str(config)],cwd=root,stdout=log,stderr=subprocess.STDOUT,timeout=120)
                row['exitCode']=p.returncode
                if p.returncode==0:
                    row.update(completed=True,**read_case(root/'output'/label,td,tg,cells,maximum))
                row['elapsedS']=time.monotonic()-start; receipt['cases'].append(row)
                (out/'receipt.json').write_text(json.dumps(receipt,indent=2,allow_nan=False)+'\n')
                print(label,row.get('checks',p.returncode),flush=True)
    for tg in (300,1000):
        for td in (10,30):
            def get(maximum,n):
                return next(r for r in receipt['cases'] if r['gasTemperatureK']==tg and r['reducedFieldTd']==td and r['maxEnergyEV']==maximum and r['cells']==n)
            for key in KEYS:
                x,y,z=[get(80,n)[key] for n in (1600,3200,6400)]
                receipt['refinements'].append(dict(td=td,tg=tg,key=key,relative=relative(y,z),
                    passGate=relative(y,z)<.02 and (abs(z-y)<abs(y-x) or x==y==z)))
                for maximum,n,base in ((40,3200,6400),(160,6400,3200)):
                    change=relative(get(maximum,n)[key],get(80,base)[key])
                    receipt['domainControls'].append(dict(td=td,tg=tg,key=key,maxEnergyEV=maximum,relative=change,passGate=change<.005))
    if any(a.digest(root/p)!=v for p,v in sealed.items()): raise ValueError('Changed producer')
    receipt['passGate']=all(r['completed'] and all(r['checks'].values()) for r in receipt['cases']) and all(r['passGate'] for r in receipt['refinements']+receipt['domainControls'])
    (out/'receipt.json').write_text(json.dumps(receipt,indent=2,allow_nan=False)+'\n')
    return 0 if receipt['passGate'] else 1

def read_case(folder,td,tg,cells,maximum):
    swarm=next(folder.rglob('swarmParameters.txt')).read_text()
    power=next(folder.rglob('powerBalance.txt')).read_text()
    values=[tuple(map(float,line.split()[:2])) for line in next(folder.rglob('eedf.txt')).read_text().splitlines()[1:] if line.strip()]
    if len(values)!=cells: raise ValueError('EEDF grid count mismatch')
    du=maximum/cells
    norm=sum(f*(2/3)*(((i+1)*du)**1.5-(i*du)**1.5) for i,(u,f) in enumerate(values))
    energy=sum(f*(2/5)*(((i+1)*du)**2.5-(i*du)**2.5) for i,(u,f) in enumerate(values))
    tail=values[-1][1]*(2/3)*(maximum**1.5-(maximum-du)**1.5)
    rates=next(folder.rglob('rateCoefficients.txt')).read_text().splitlines()
    ion_rows=[line for line in rates if 'ionization' in line.lower()]
    if not ion_rows: raise ValueError('Missing ionization channel')
    ion=sum(float(line.split()[0]) for line in ion_rows)
    mu=a.term(swarm,'Reduced mobility coefficient'); dn=a.term(swarm,'Reduced diffusion coefficient')
    mean=a.term(swarm,'Mean energy'); te=a.term(swarm,'Electron temperature'); drift=a.term(swarm,'Drift velocity')
    number=133.32/(a.KB*tg); balance=a.term(power,'Relative Power Balance')/100
    checks=dict(normalization=abs(norm-1)<.005,meanEnergy=abs(energy/norm/mean-1)<.005,
        positiveEedf=all(math.isfinite(u) and math.isfinite(f) and f>=0 and abs(u-(i+.5)*du)<1e-10 for i,(u,f) in enumerate(values)),
        tail=tail<1e-8,power=abs(balance)<1e-6,temperature=abs(te/(2*mean/3)-1)<1e-10,
        drift=abs(drift/(mu*td*1e-21)-1)<1e-10,positiveTransport=mu>0 and dn>0 and ion>=0)
    return dict(reducedFieldTd=td,gasTemperatureK=tg,cells=cells,numberDensityM3=number,
        mobilityM2VS=mu/number,diffusionM2S=dn/number,mobilityTimesNPerMSV=mu,
        diffusionTimesNPerMS=dn,meanEnergyEV=mean,electronTemperatureEV=te,driftMPS=drift,
        ionizationRateM3S=ion,normalization=norm,integratedMeanEnergyEV=energy/norm,
        tailProbability=tail,powerRelativeResidual=balance,checks=checks,
        nativeHashes={str(p.relative_to(folder)):a.digest(p) for p in folder.rglob('*') if p.is_file()})

if __name__=='__main__': raise SystemExit(main())
