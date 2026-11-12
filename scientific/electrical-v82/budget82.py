"""Reconstruct local electrical losses/work using the frozen FV face laws."""
import numpy as np
from model82 import solver


def reconstruct(m,state,voltage,fields,magnetic=None):
    r,z=state['r'],state['z']; rc=np.sqrt((r[:-1]**2+r[1:]**2)/2); zc=(z[:-1]+z[1:])/2
    nr,nz=len(rc),len(zc); phi=state['potential'].ravel(); omega=state['omega'].ravel()
    parallel=1070.*solver.field(fields['conductivity_shape'],rc,zc)
    beta=solver.field(fields['beta_field'],rc,zc,True); perpendicular=parallel/(1+beta**2)
    B=m['magneticT'] if magnetic is None else magnetic
    joule,work,inflow,charge=[np.zeros(nr*nz) for _ in range(4)]
    ports={'anode':0.,'cathode':0.}

    def face(a,b,halves,boundary=0.,label=None):
        resistance=sum(h[1] for h in halves); emf=sum(t*omega[c] for c,_,t in halves)
        amp=(phi[a]-(phi[b] if b is not None else boundary)-emf)/resistance
        surface=phi[a]-amp*halves[0][1]-halves[0][2]*omega[a] if b is not None else boundary
        inflow[a]-=surface*amp; charge[a]+=amp
        if b is not None: inflow[b]+=surface*amp; charge[b]-=amp
        else: ports[label]+=amp
        for cell,resistance,torque in halves:
            joule[cell]+=amp**2*resistance; work[cell]+=amp*torque*omega[cell]

    for j in range(nz):
        dz=z[j+1]-z[j]
        for i in range(nr):
            a=j*nr+i; area=np.pi*(r[i+1]**2-r[i]**2)
            if i+1<nr:
                b=a+1; f=r[i+1]
                face(a,b,[(a,np.log(f/rc[i])/(2*np.pi*dz*perpendicular[a]),-B*(f*f-rc[i]**2)/2),
                          (b,np.log(rc[i+1]/f)/(2*np.pi*dz*perpendicular[b]),-B*(rc[i+1]**2-f*f)/2)])
            if j+1<nz:
                b=a+nr; f=z[j+1]
                face(a,b,[(a,(f-zc[j])/(area*parallel[a]),0.),(b,(zc[j+1]-f)/(area*parallel[b]),0.)])
            if i==nr-1 and abs(zc[j]-m['anodeCenterM'])<m['anodeWidthM']/2:
                face(a,None,[(a,np.log(r[-1]/rc[i])/(2*np.pi*dz*perpendicular[a]),-B*(r[-1]**2-rc[i]**2)/2)],voltage,'anode')
            if j==nz-1 and r[i+1]<=m['cathodeRadiusM']*(1+1e-12):
                face(a,None,[(a,(z[-1]-zc[j])/(area*parallel[a]),0.)],0.,'cathode')
    shape=(nz,nr); arrays={k:v.reshape(shape) for k,v in [('jouleW',joule),('rotorWorkW',work),('electricalInW',inflow)]}
    current=ports['cathode']; total=float(sum(inflow))
    def region(name,mask):
        cells=np.broadcast_to(mask,shape); value={k:float(np.sum(v[cells])) for k,v in arrays.items()}
        rows=np.where(np.any(cells,axis=1))[0]
        value.update(name=name,axialEdgesM=[float(z[rows[0]]),float(z[rows[-1]+1])] if len(rows) else None,
                     jouleVoltEquivalent=value['jouleW']/current,rotorWorkVoltEquivalent=value['rotorWorkW']/current,
                     electricalBalanceRelative=abs(value['electricalInW']-value['jouleW']-value['rotorWorkW'])/max(abs(total),1e-30))
        return value
    upper=m['anodeCenterM']+m['anodeWidthM']/2; lower=upper-m['anodeWidthM']
    regions=[region('midplane-side',zc[:,None]<lower),region('anode-band',(zc[:,None]>=lower)&(zc[:,None]<upper)),
             region('cathode-side',zc[:,None]>=upper)]
    access=m['cathodeRadiusM']*np.sqrt(parallel[-nr]/perpendicular[-nr])
    nested=[region('within-'+str(depth)+'m-of-endwall',(z[-1]-zc[:,None])<=depth)
            for depth in (m['cathodeRadiusM'],.016,.04,.08,float(access))]
    return dict(currentsA=ports,jouleW=float(sum(joule)),rotorWorkW=float(sum(work)),electricalInW=total,
                chargeResidualRelative=float(max(abs(charge)))/max(abs(current),1e-30),
                cellElectricalBalanceRelative=float(max(abs(inflow-joule-work)))/max(abs(total),1e-30),
                globalBudgetRelative=max(abs(sum(joule)-state['jouleW']),abs(sum(work)-state['viscousW']),abs(total-state['electrodePowerW']))/max(abs(total),1e-30),
                regions=regions,nestedEndwallRegions=nested,nearAxisAccessLengthM=float(access),
                voltageScope='Regional power/current gives additive volt equivalents, not measured local voltage drops.'),arrays
