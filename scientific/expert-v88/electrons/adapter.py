"""Run an existing LoKI-B++ CLI and export explicit unmagnetized SI fixtures."""
import hashlib
import json
import math
from pathlib import Path
import re
import subprocess
import sys
import time

ROOT=Path(__file__).resolve().parent
PIN='add55181430adec223efcf56233c7139ed40b8d2'
KB=1.380649e-23
FILES=('PROTOCOL.md','adapter.py')

def digest(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def term(text,name):
    match=re.search(r'^\s*'+re.escape(name)+r'\s*=\s*([+\-\deE.]+)',text,re.M)
    if not match: raise ValueError('Missing native term: '+name)
    value=float(match[1])
    if not math.isfinite(value): raise ValueError('Nonfinite native term')
    return value

def make_input(template,td,tg,cells,label):
    text=template
    values={'reducedField':td,'gasTemperature':tg,'cellNumber':cells,'maxEnergy':200}
    for key,value in values.items():
        text,n=re.subn(r'(^\s*'+key+r':).*$',r'\g<1> '+str(value),text,flags=re.M)
        if n!=1: raise ValueError('Ambiguous upstream input '+key)
    text,n=re.subn(r'\s+smartGrid:.*?\n(?=\s+maxPowerBalanceRelError:)', '\n', text,flags=re.S)
    if n!=1: raise ValueError('Missing upstream smart grid')
    text=text.replace('gui: \n  isOn: true','gui: \n  isOn: false')
    text=text.replace('output: \n  isOn: false','output: \n  isOn: true')
    return text.replace('folder: ArSwarm_300K','folder: '+label)

def read_case(folder,td,tg,cells):
    swarm=next(folder.rglob('swarmParameters.txt')).read_text()
    power=next(folder.rglob('powerBalance.txt')).read_text()
    eedf=next(folder.rglob('eedf.txt')).read_text().splitlines()[1:]
    values=[tuple(map(float,line.split()[:2])) for line in eedf if line.strip()]
    if len(values)!=cells: raise ValueError('EEDF grid count mismatch')
    du=200/cells
    norm=sum(f*(2/3)*((i+1)*du)**1.5-f*(2/3)*(i*du)**1.5 for i,(u,f) in enumerate(values))
    energy=sum(f*(2/5)*(((i+1)*du)**2.5-(i*du)**2.5) for i,(u,f) in enumerate(values))
    tail=values[-1][1]*(2/3)*(200**1.5-(200-du)**1.5)
    rates=next(folder.rglob('rateCoefficients.txt')).read_text().splitlines()
    ion_rows=[line for line in rates if 'ionization' in line.lower()]
    if not ion_rows: raise ValueError('Missing native ionization channel')
    ion=sum(float(line.split()[0]) for line in ion_rows)
    mu=term(swarm,'Reduced mobility coefficient'); dn=term(swarm,'Reduced diffusion coefficient')
    mean=term(swarm,'Mean energy'); te=term(swarm,'Electron temperature'); drift=term(swarm,'Drift velocity')
    number=133.32/(KB*tg)
    checks=dict(normalization=abs(norm-1)<.005,meanEnergy=abs(energy/norm/mean-1)<.005,
        positiveEedf=all(math.isfinite(u) and math.isfinite(f) and f>=0 and abs(u-(i+.5)*du)<1e-10 for i,(u,f) in enumerate(values)),
        tail=tail<1e-8,power=abs(term(power,'Relative Power Balance'))/100<1e-6,
        temperature=abs(te/(2*mean/3)-1)<1e-10,drift=abs(drift/(mu*td*1e-21)-1)<1e-10,
        positiveTransport=mu>0 and dn>0 and ion>=0)
    return dict(reducedFieldTd=td,gasTemperatureK=tg,cells=cells,numberDensityM3=number,
        mobilityM2VS=mu/number,diffusionM2S=dn/number,mobilityTimesNPerMSV=mu,
        diffusionTimesNPerMS=dn,meanEnergyEV=mean,electronTemperatureEV=te,driftMPS=drift,
        ionizationRateM3S=ion,normalization=norm,integratedMeanEnergyEV=energy/norm,tailProbability=tail,
        powerRelativeResidual=term(power,'Relative Power Balance')/100,checks=checks,
        nativeHashes={str(p.relative_to(folder)):digest(p) for p in folder.rglob('*') if p.is_file()})

def lookup(path,expected,td,tg):
    if digest(path)!=expected: raise ValueError('Stale electron table')
    table=json.loads(Path(path).read_text())
    if not table['qualifiedUnmagnetizedGrid']: raise ValueError('Electron table is unqualified')
    rows=[r for r in table['rows'] if r['reducedFieldTd']==td and r['gasTemperatureK']==tg]
    if len(rows)!=1: raise ValueError('Outside executed electron-table grid')
    return rows[0]

def main():
    upstream=ROOT/'upstream'; exe=ROOT/'build/app/loki'; out=ROOT/'results'
    if out.exists(): raise ValueError('Use a fresh output directory')
    out.mkdir()
    if subprocess.check_output(['git','-C',str(upstream),'rev-parse','HEAD'],text=True).strip()!=PIN:
        raise ValueError('Stale upstream source pin')
    source={str(p.relative_to(upstream)):digest(p) for p in upstream.rglob('*')
        if p.is_file() and '.git' not in p.parts}
    sealed={name:digest(ROOT/name) for name in FILES}
    receipt=dict(upstreamCommit=PIN,sourceHashes=source,producerHashes=sealed,executableSHA256=digest(exe),
        dataSHA256=digest(upstream/'input/Argon/Ar_LXCat.txt'),targetVelocityRead=False,currentFitted=False,
        magneticFieldT=0,experimentalQualification=False,cases=[])
    template=(upstream/'input/Argon/Ar_swarm_setup.in').read_text()
    for cells in (1000,2000,4000):
        for tg in (300,1000):
            for td in (10,30,100,300):
                label=f'v88-{td}Td-{tg}K-n{cells}'; config=upstream/'input/Argon'/(label+'.in')
                config.write_text(make_input(template,td,tg,cells,label)); start=time.monotonic()
                row=dict(label=label,inputSHA256=digest(config),completed=False)
                try:
                    with (out/(label+'.log')).open('w') as log:
                        process=subprocess.run([str(exe),str(config)],cwd=ROOT,stdout=log,stderr=subprocess.STDOUT,timeout=120)
                    row['exitCode']=process.returncode
                    if process.returncode: raise ValueError('Native CLI failed')
                    row.update(completed=True,**read_case(ROOT/'output'/label,td,tg,cells))
                except (ValueError,StopIteration,subprocess.TimeoutExpired) as exc:
                    row['error']=type(exc).__name__+': '+str(exc)
                row['elapsedS']=time.monotonic()-start; receipt['cases'].append(row)
                (out/'receipt.json').write_text(json.dumps(receipt,indent=2,allow_nan=False)+'\n')
                print(label,row.get('checks',row.get('error')),flush=True)
    if any(digest(ROOT/k)!=v for k,v in sealed.items()): raise ValueError('Producer changed during campaign')
    rows=[]; refinements=[]
    for tg in (300,1000):
        for td in (10,30,100,300):
            trio=[next((r for r in receipt['cases'] if r.get('cells')==n and r.get('gasTemperatureK')==tg and r.get('reducedFieldTd')==td),None) for n in (1000,2000,4000)]
            if any(r is None for r in trio): continue
            for key in ('meanEnergyEV','mobilityM2VS','diffusionM2S','ionizationRateM3S'):
                a,b,c=[r[key] for r in trio]; coarse=abs(b-a); fine=abs(c-b)
                relative=fine/max(abs(c),abs(b)) if c or b else 0
                refinements.append(dict(td=td,tg=tg,key=key,relative=relative,passGate=relative<.02 and (fine<coarse or fine==coarse==0)))
            rows.append(trio[-1])
    accepted=len(rows)==8 and len(receipt['cases'])==24 and all(r['completed'] and all(r.get('checks',{}).values()) for r in receipt['cases']) and all(r['passGate'] for r in refinements)
    table=dict(upstreamCommit=PIN,dataSHA256=receipt['dataSHA256'],receiptSHA256=digest(out/'receipt.json'),
        domain=dict(reducedFieldTd=[10,30,100,300],gasTemperatureK=[300,1000],magneticFieldT=0,
            growth='temporal',composition='ground-state Ar, no electron-electron collisions',interpolationQualified=False),
        qualifiedUnmagnetizedGrid=accepted,experimentalQualification=False,refinements=refinements,rows=rows)
    (out/'transport-table.json').write_text(json.dumps(table,indent=2,allow_nan=False)+'\n')
    return 0 if accepted else 1

if __name__=='__main__': raise SystemExit(main())
