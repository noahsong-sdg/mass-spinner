"""Independent coupled ODE assembly/Radau; shared atomic and depth closures."""
import hashlib
import json
from pathlib import Path
import re
import sys
import numpy as np
import scipy
from scipy.integrate import solve_ivp

HERE=Path(__file__).resolve().parent; ROOT=HERE.parents[2]
E=1.602176634e-19; KEV=1000*E; KB=8.617333262145e-5
LEDGERS=('fused','incident','retained','unretained','releasedT','releasedD','addedT','addedD',
    'beamOnS','incidentEnergy','nuclearEnergy','depositedEnergy','neutronEnergy','escapingAlphaEnergy','coolantEnergy')
NATIVE='scientific/marathon-v35/material/reference/atomic-reference.cpp'
PRODUCER=('src/coupled-target.ts','src/target-conduction.ts','src/target-material.ts','src/deuteron-stopping.ts',
    'src/fusion-reactor.ts','src/physics.ts','src/material-realism.ts',
    *('scientific/expert-v88/target-radau/'+n for n in ('export.ts','cases.json','PROTOCOL.md')))


def sha(raw): return hashlib.sha256(raw).hexdigest()


def require(ok,message):
    if not ok: raise ValueError(message)


def native_tables(path=ROOT/NATIVE):
    text=path.read_text(); tables=[]
    for name in ('a[92][5]','nuca[104][2]'):
        body=text.split(name+' = {',1)[1].split('};',1)[0]
        tables.append(np.array([[float(v.strip().rstrip('f')) for v in row.split(',')]
            for row in re.findall(r'\{([^{}]+)\}',body)]))
    return tables


COEFFICIENTS,NUCLEAR=native_tables()


def atomic(energy,z,mass):
    require(np.isfinite(energy) and .5/.6<=energy<=500,'Atomic energy outside sourced domain')
    per=energy/2; t=max(10,per); factor=np.sqrt(per/10) if per<10 else 1.
    a,b,c,d=np.asarray(COEFFICIENTS[z-1,1:],dtype=np.float32).astype(float)
    low=a*t**.45; high=b/t*np.log(1+c/t+d*t)
    electronic=low*high/(low+high)*factor
    rm=(2+mass)*np.cbrt(z); reduced=32.536*mass*energy/(z*rm)
    nuclear=np.interp(reduced,NUCLEAR[::-1,0],NUCLEAR[::-1,1])*8.462*z*2/rm
    return (electronic+nuclear)*1e-22


def sigma(energy):
    require(np.isfinite(energy) and .5<=energy<=550,'D-T fit outside sourced domain')
    s=(6.927e4+energy*(7.454e8+energy*(2.050e6+energy*5.2002e4)))/(1+energy*(6.38e1+energy*(-.995+energy*(6.981e-5+energy*1.728e-4))))
    return s/energy*np.exp(-34.3827/np.sqrt(energy))*1e-31


class Model:
    def __init__(self,beam,config):
        self.b,self.c=dict(beam),dict(config); b,c=self.b,self.c
        self.n=n=c['depthCells']; self.m=m=n+c['backingCells']; self.offset=3*n+m
        require(n in (2,4,8) and c['backingCells']>=1,'Bounded reference cell domain')
        positive=('filmThicknessM','backingThicknessM','filmConductivityWMK','backingConductivityWMK',
            'filmHeatCapacityJm3K','backingHeatCapacityJm3K','coolantK','initialK','pulsePeriodS')
        require(all(np.isfinite(c[k]) and c[k]>0 for k in positive),'Invalid material geometry')
        nonnegative=('contactResistanceM2KPerW','backHeatTransferWM2K','diffusivityM2S','diffusionActivationEV',
            'releaseAttemptRateS','releaseActivationEV','surfaceReleaseVelocityMS','surfaceReleaseActivationEV',
            'backPermeationVelocityMS','backPermeationActivationEV','renewalRateS','cooldownS')
        require(all(np.isfinite(c[k]) and c[k]>=0 for k in nonnegative),'Invalid transport coefficient')
        require(all(0<=c[k]<=1 for k in ('replacementProbability','renewalTritiumFraction','pulseDuty')),'Invalid fraction')
        require(b['stoppingModel']=='geant4-bragg' and b['materialColumnM2']>0 and b['beamAreaM2']>0
            and 0<=b['targetColumnM2']<=b['materialColumnM2'] and b['beamCurrentA']>=0
            and 20<=b['beamEnergyKeV']<=500 and 0<=b['alphaDepositedFraction']<=1 and b['exposureS']>=0,'Invalid beam domain')
        weights=np.asarray(c['implantationWeights'],float)
        require(len(weights)==n and np.isfinite(weights).all() and min(weights)>=0 and sum(weights)>0,'Invalid weights')
        self.weights=weights/sum(weights); self.flux=b['beamCurrentA']/E/b['beamAreaM2']; self.column=b['materialColumnM2']
        self.dz=c['filmThicknessM']/n
        widths=np.r_[np.full(n,self.dz),np.full(m-n,c['backingThicknessM']/(m-n))]
        self.capacity=widths*np.r_[np.full(n,c['filmHeatCapacityJm3K']),np.full(m-n,c['backingHeatCapacityJm3K'])]
        half=widths/(2*np.r_[np.full(n,c['filmConductivityWMK']),np.full(m-n,c['backingConductivityWMK'])])
        contact=np.zeros(m-1); contact[n-1]=c['contactResistanceM2KPerW']
        self.g=1/(half[:-1]+half[1:]+contact); h=c['backHeatTransferWM2K']
        self.back=0 if h==0 else 1/(half[-1]+1/h)
        left=half[n-1]+contact[n-1]; right=half[n]; self.split=right/(left+right)
        f=b['targetColumnM2']/self.column
        self.initial=np.r_[np.full(n,f),np.full(n,1-f),np.zeros(n),np.full(m,c['initialK']),np.zeros(len(LEDGERS))]
        dose=self.flux*b['exposureS']/self.column; energy=self.flux*b['exposureS']*b['beamEnergyKeV']*KEV
        self.scale=np.r_[np.ones(3*n),np.full(m,c['initialK']),
            [max(1,energy) if 'Energy' in k else max(1,dose) for k in LEDGERS]]
        initial_probability=sum(self.beam(self.initial)[0])
        self.reaction_probability=max(initial_probability,-np.expm1(-self.column*sigma(.6*b['beamEnergyKeV'])))
        self.fusion_scale=dose*self.reaction_probability
        self.atol_scale=self.scale.copy()
        if self.fusion_scale: self.atol_scale[self.offset]=self.fusion_scale
        require(self.budgets(self.initial)['passed'],'Invalid initial state')

    def on_at(self,time):
        c,b=self.c,self.b
        return self.flux>0 and any(k*c['pulsePeriodS']<=time<min(b['exposureS'],k*c['pulsePeriodS']+c['pulseDuty']*c['pulsePeriodS'])
            for k in range(int(np.ceil(b['exposureS']/c['pulsePeriodS']))))

    def clock(self):
        c,b=self.c,self.b; total=b['exposureS']+c['cooldownS']
        times={0,b['exposureS'],total,*[total*i/c['samples'] for i in range(c['samples']+1)]}
        if c['pulseDuty']>0:
            for k in range(int(np.ceil(b['exposureS']/c['pulsePeriodS']))):
                start=k*c['pulsePeriodS']; times.update((start,min(b['exposureS'],start+c['pulseDuty']*c['pulsePeriodS'])))
        return sorted(times)

    def rates(self,states,times):
        return np.array([sum(self.beam(y)[0]) if self.on_at(t) else 0. for y,t in zip(states,times)])

    def beam(self,y):
        n=self.n; t,d,v=y[:n],y[n:2*n],y[2*n:3*n]
        reaction=np.zeros(n); heat=np.zeros(self.m); energy=self.b['beamEnergyKeV']; survival=1.; neutron=escape=0.
        step=self.column/n/4
        for i in range(n):
            total=t[i]+d[i]+v[i]; ft,fd=t[i]/total,d[i]/total
            stopping=lambda e:atomic(e,3,7)+fd*atomic(e,1,2)+ft*atomic(e,1,3)
            for _ in range(4):
                left=energy; a=stopping(left); b=stopping(left-step*a/2); c=stopping(left-step*b/2); f=stopping(left-step*c)
                energy=left-step*(a+2*b+2*c+f)/6; stopping(energy)
                tau=step*t[i]*sigma(.6*(left+energy)/2); attenuation=-np.expm1(-tau); reacted=survival*attenuation
                stopped=(left-energy)*survival*(attenuation/tau if tau else 1)
                position=.5-tau/12+tau**3/720 if tau<1e-3 else 1/tau-1/np.expm1(tau)
                reaction_energy=reacted*(left-(left-energy)*position); alpha=.2*17600*reacted+.44*reaction_energy
                reaction[i]+=reacted; heat[i]+=stopped+self.b['alphaDepositedFraction']*alpha
                neutron+=.8*17600*reacted+.56*reaction_energy; escape+=(1-self.b['alphaDepositedFraction'])*alpha
                survival*=np.exp(-tau)
        heat[n-1]+=survival*energy*self.split; heat[n]=survival*energy*(1-self.split)
        return reaction,heat,neutron,escape

    def rhs(self,y,on):
        n,c=self.n,self.c; t,d,v=y[:n],y[n:2*n],y[2*n:3*n]; T=y[3*n:self.offset]
        j=self.flux if on else 0.
        reaction,heat,neutron,escape=self.beam(y) if j else (np.zeros(n),np.zeros(self.m),0.,0.)
        probability=sum(reaction); fusion=j*reaction*n/self.column
        b=j*(1-probability)*c['replacementProbability']*self.weights*n/self.column
        release=c['releaseAttemptRateS']*np.exp(-c['releaseActivationEV']/(KB*T[:n]))
        release[0]+=c['surfaceReleaseVelocityMS']/self.dz*np.exp(-c['surfaceReleaseActivationEV']/(KB*T[0]))
        release[-1]+=c['backPermeationVelocityMS']/self.dz*np.exp(-c['backPermeationActivationEV']/(KB*T[n-1]))
        D=c['diffusivityM2S']*np.exp(-c['diffusionActivationEV']/(KB*T[:n])); faces=np.zeros(n-1)
        np.divide(2*D[:-1]*D[1:],D[:-1]+D[1:],out=faces,where=D[:-1]+D[1:]>0); faces/=self.dz**2
        def diffuse(x):
            flux=faces*np.diff(x); return np.r_[flux,0]-np.r_[0,flux]
        renewal=c['renewalRateS']; ft=c['renewalTritiumFraction']; loss=b+release+renewal
        rates=[-fusion-loss*t+renewal*ft+diffuse(t),b-loss*d+renewal*(1-ft)+diffuse(d),
            fusion+release*(t+d)-(b+renewal)*v+diffuse(v)]
        power=j*heat*KEV; flux=self.g*np.diff(T); cooling=self.back*(T[-1]-c['coolantK'])
        thermal=(power+np.r_[flux,0]-np.r_[0,flux]); thermal[-1]-=cooling
        ledger=[np.mean(fusion),j/self.column,np.mean(b),j*(1-probability)*(1-c['replacementProbability'])/self.column,
            np.mean(loss*t),np.mean(loss*d),renewal*ft,renewal*(1-ft),float(j>0),j*self.b['beamEnergyKeV']*KEV,
            j*probability*17600*KEV,sum(power),j*neutron*KEV,j*escape*KEV,cooling]
        return np.r_[*rates,thermal/self.capacity,ledger]

    def browser_vector(self,s):
        counts=self.column*self.b['beamAreaM2']; area=self.b['beamAreaM2']; e=s['energy']
        ledger=[s[k]/counts for k in ('cumulativeNeutrons','incidentD','retainedD','unretainedD','releasedT','releasedD','addedT','addedD')]
        ledger+=[s['beamOnS']]+[e[k]/area for k in ('incidentBeamJ','nuclearJ','depositedJ','neutronJ','escapingAlphaJ','coolantJ')]
        return np.r_[s['tritiumFraction'],s['deuteriumFraction'],s['vacancyFraction'],s['temperatureK'],ledger]

    def budgets(self,y):
        n=self.n; t,d,v=y[:n],y[n:2*n],y[2*n:3*n]; q=dict(zip(LEDGERS,y[self.offset:])); f=self.initial[0]
        species=max(abs(f+q['addedT']-np.mean(t)-q['fused']-q['releasedT']),
            abs(1-f+q['addedD']+q['retained']-np.mean(d)-q['releasedD']),
            abs(q['incident']-q['fused']-q['retained']-q['unretained']))
        energy_scale=max(1,abs(q['incidentEnergy']+q['nuclearEnergy']))
        beam=q['incidentEnergy']+q['nuclearEnergy']-q['depositedEnergy']-q['neutronEnergy']-q['escapingAlphaEnergy']
        stored=self.capacity@(y[3*n:self.offset]-self.c['initialK'])
        thermal=q['depositedEnergy']-stored-q['coolantEnergy']
        packing=float(max(abs(t+d+v-1))); minimum=float(min(t.min(),d.min(),v.min()))
        return dict(species=float(species),energy=float(max(abs(beam),abs(thermal))/energy_scale),packing=packing,
            minimumPopulation=minimum,minimumTemperatureK=float(min(y[3*n:self.offset])),
            passed=bool(species<1e-8 and max(abs(beam),abs(thermal))/energy_scale<1e-8 and packing<1e-8 and minimum>=-1e-10 and min(y[3*n:self.offset])>0))


def integrate(model,history,rtol):
    y=model.initial.copy(); states=[y.copy()]; stats=dict(nfev=0,njev=0,nlu=0)
    for a,b in zip(history[:-1],history[1:]):
        on=model.on_at((a['timeS']+b['timeS'])/2)
        sol=solve_ivp(lambda _,x:model.rhs(x,on),(a['timeS'],b['timeS']),y,
            method='Radau',rtol=rtol,atol=rtol/100*model.atol_scale,t_eval=[b['timeS']])
        require(sol.success,'Radau failure: '+sol.message); y=sol.y[:,-1]; states.append(y.copy())
        for key in stats: stats[key]+=getattr(sol,key)
    return np.asarray(states),stats


def admit(packet,fixture,root=ROOT):
    for name,digest in packet['sourceSHA256'].items(): require(sha((root/name).read_bytes())==digest,'Stale source: '+name)
    require(set(packet['sourceSHA256'])==set(PRODUCER),'Incomplete producer source inventory')
    expected=[(c['id'],h) for c in fixture['cases'] for h in fixture['stepsS']]
    require([(r['id'],r['stepS']) for r in packet['rows']]==expected,'Incomplete/changed browser inventory')
    require(packet['experimentalQualification'] is False,'False qualification')
    for row,(case,_) in zip(packet['rows'],[(c,h) for c in fixture['cases'] for h in fixture['stepsS']]):
        require(isinstance(row['completed'],bool) and (row['completed'] or bool(row.get('error'))),'Missing browser failure evidence')
        require(row['beam']==fixture['beam']|case['beam'] and row['config']==fixture['config']|case['config']|{'maxStepS':row['stepS']},'Changed declared inputs')


def main():
    path=HERE/'results/browser.json'; raw=path.read_bytes(); packet=json.loads(raw); fixture=json.loads((HERE/'cases.json').read_bytes())
    admit(packet,fixture); records=[]
    for case in fixture['cases']:
        jobs=[r for r in packet['rows'] if r['id']==case['id']]; rows=[r for r in jobs if r['completed']]
        failed=[dict(stepS=r['stepS'],error=r['error']) for r in jobs if not r['completed']]
        require(len(rows)>0,'No complete browser trajectory available')
        model=Model(rows[0]['beam'],rows[0]['config']); history=rows[0]['history']
        require(all([s['timeS'] for s in r['history']]==[s['timeS'] for s in history] for r in rows),'Changed reporting schedule')
        times=[s['timeS'] for s in history]; require(times==model.clock(),'Incomplete or changed pulse/report clock')
        coarse,_=integrate(model,history,2e-8); fine,stats=integrate(model,history,2e-10)
        self_error=float(np.max(abs(coarse-fine)/model.scale)); errors=[]; browser_budgets=[]
        rate_fine=model.rates(fine,times); rate_coarse=model.rates(coarse,times)
        def relative(a,b,scale):
            error=float(np.max(abs(a-b))); return error/scale if scale else (0. if error==0 else None)
        self_yield=relative(coarse[:,model.offset],fine[:,model.offset],model.fusion_scale)
        self_rate=relative(rate_coarse,rate_fine,model.reaction_probability)
        for row in rows:
            values=np.array([model.browser_vector(s) for s in row['history']]); difference=abs(values-fine)/model.scale
            probability=np.array([s['neutronRateS']/(model.flux*model.b['beamAreaM2']) if model.flux else 0. for s in row['history']])
            errors.append(dict(stepS=row['stepS'],maximumCoordinateError=float(difference.max()),
                population=float(difference[:,:3*model.n].max()),temperature=float(difference[:,3*model.n:model.offset].max()),
                ledger=float(difference[:,model.offset:].max()),acceptedSteps=row['solver']['acceptedSteps'],
                fusionYield=relative(values[:,model.offset],fine[:,model.offset],model.fusion_scale),
                neutronRate=relative(probability,rate_fine,model.reaction_probability)))
            browser_budgets.extend(model.budgets(y) for y in values)
        ref_budgets=[model.budgets(y) for y in fine]; es=[r['maximumCoordinateError'] for r in errors]
        def contracting(values): return all(a is not None and b is not None and (b<a or a==b==0) for a,b in zip(values[:-1],values[1:]))
        contraction=all(contracting([e[k] for e in errors]) for k in ('maximumCoordinateError','fusionYield','neutronRate'))
        active=all(b['acceptedSteps']>1.5*a['acceptedSteps'] for a,b in zip(errors[:-1],errors[1:]))
        passed=self_error<2e-6 and self_yield is not None and self_yield<2e-6 and self_rate is not None and self_rate<2e-6
        passed=passed and not failed and all(errors[-1][k] is not None and errors[-1][k]<.01 for k in ('maximumCoordinateError','fusionYield','neutronRate')) and contraction and active and all(b['passed'] for b in ref_budgets+browser_budgets)
        records.append(dict(id=case['id'],radauSelfDifference=self_error,radauYieldSelfDifference=self_yield,radauRateSelfDifference=self_rate,
            radauStats=stats,radauStates=fine.tolist(),
            timeS=[s['timeS'] for s in history],errors=errors,failedBrowserCases=failed,contraction=contraction,activeRefinement=active,
            referenceBudgets=ref_budgets,browserBudgets=browser_budgets,passed=bool(passed)))
        print(case['id'],json.dumps(errors),flush=True)
    sources=[HERE/'reference.py',HERE/'test_reference.py',HERE/'PROTOCOL.md',HERE/'cases.json',ROOT/NATIVE,
        ROOT/'scientific/marathon-v35/material/reference/atomic-reference.json']
    result=dict(browserSHA256=sha(raw),sourceSHA256={str(p.relative_to(ROOT)):sha(p.read_bytes()) for p in sources},
        scipyVersion=scipy.__version__,numpyVersion=np.__version__,records=records,
        numericalControlPass=all(r['passed'] for r in records),experimentalQualification=False,
        scope='Independent coupled Radau time integration; shared atomic stopping and fixed depth/space closures. Synthetic numerical controls only.')
    (HERE/'results/reference.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    return 0 if result['numericalControlPass'] else 1


if __name__=='__main__': raise SystemExit(main())
