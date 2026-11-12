"""Saved-field torque accounting and conditional pressure compatibility; no flow fit."""
from pathlib import Path
import sys
import numpy as np

sys.path.insert(0,str(Path(__file__).parents[1]/'boundary-v84'))
from model84 import laws

AR_MASS=39.948*1.66053906660e-27


def pressure_loop(r,z,force,bounds=(.01,.05,.02,.12)):
    """Integral of Fr(z_hi)-Fr(z_lo) dr on an exact, declared rectangle (Pa)."""
    r,z,f=map(lambda x:np.asarray(x,dtype=float),(r,z,force)); lo,hi,bottom,top=bounds
    if (f.shape!=(len(z),len(r)) or not all(np.isfinite(a).all() for a in (r,z,f)) or not np.all(np.diff(r)>0)
            or not np.all(np.diff(z)>0) or not r[0]<=lo<hi<=r[-1] or not z[0]<=bottom<top<=z[-1]):
        raise ValueError('Ordered centers, finite force density and interior rectangle required')
    x=np.r_[lo,r[(r>lo)&(r<hi)],hi]
    at=lambda height:np.array([np.interp(height,z,f[:,i]) for i in range(len(r))])
    difference=np.interp(x,r,at(top)-at(bottom))
    return float(np.trapezoid(difference,x))


def analyze(m,state,fields,material):
    r,z,w,phi=[np.asarray(state[k],dtype=float) for k in ('r','z','omega','potential')]
    rc=np.sqrt((r[:-1]**2+r[1:]**2)/2); zc=(z[:-1]+z[1:])/2; nz,nr=w.shape
    if (w.shape!=phi.shape or w.shape!=(len(z)-1,len(r)-1) or not all(np.isfinite(a).all() for a in (r,z,w,phi))
            or r[0]!=0 or z[0]!=0 or not np.all(np.diff(r)>0) or not np.all(np.diff(z)>0)):
        raise ValueError('Finite axisymmetric saved fields required')
    mu=laws.field(fields['viscosity'],rc,zc).reshape(nz,nr)
    parallel=(1070*laws.field(fields['conductivity_shape'],rc,zc)).reshape(nz,nr)
    beta=laws.field(fields['beta_field'],rc,zc,True).reshape(nz,nr); pedersen=parallel/(1+beta**2)
    B=m['magneticT']; source=np.zeros((nz,nr)); jr=np.zeros((nz,nr+1)); wall=np.zeros(nz); axial=np.zeros(nz+1)
    work=dict(radialInteriorW=0.,axialInteriorW=0.,radialWallW=0.,endWallW=0.)
    for j in range(nz):
        dz=z[j+1]-z[j]
        for i in range(nr):
            moment=np.pi/2*(r[i+1]**4-r[i]**4)
            if i+1<nr:
                f=r[i+1]; a,b=rc[i:i+2]
                emf=-B*((f*f-a*a)*w[j,i]+(b*b-f*f)*w[j,i+1])/2
                resistance=laws.radial_electric(a,f,b,dz,pedersen[j,i],pedersen[j,i+1])
                amp=(phi[j,i]-phi[j,i+1]-emf)/resistance; jr[j,i+1]=amp/(2*np.pi*f*dz)
                source[j,i]+=-B*(f*f-a*a)*amp/2; source[j,i+1]+=-B*(b*b-f*f)*amp/2
                g=1/laws.radial_shear(a,f,b,dz,mu[j,i],mu[j,i+1])
                work['radialInteriorW']+=g*(w[j,i]-w[j,i+1])**2
            if j+1<nz:
                g=1/laws.axial_series(zc[j],z[j+1],zc[j+1],moment,mu[j,i],mu[j+1,i])
                axial[j+1]+=g*(w[j,i]-w[j+1,i]); work['axialInteriorW']+=g*(w[j,i]-w[j+1,i])**2
            if i==nr-1:
                g=1/laws.radial_shear(rc[i],r[-1],r[-1],dz,mu[j,i],mu[j,i])
                wall[j]=g*w[j,i]; work['radialWallW']+=g*w[j,i]**2
            if j==nz-1:
                g=mu[j,i]*moment/(z[-1]-zc[j]); axial[-1]+=g*w[j,i]; work['endWallW']+=g*w[j,i]**2
    for port in state.get('ports',[]):
        if port['kind']=='anode':
            j=port['cell']//nr; amp=port['amp']; jr[j,-1]+=amp/(2*np.pi*r[-1]*(z[j+1]-z[j]))
            source[j,-1]+=-B*(r[-1]**2-rc[-1]**2)*amp/2
    # Interpolate r*Jr in r²: regular Jr proportional to r is reproduced at the axis.
    fraction=(rc**2-r[:-1]**2)/np.diff(r**2)
    center_jr=((1-fraction)*r[:-1]*jr[:,:-1]+fraction*r[1:]*jr[:,1:])/rc
    density=AR_MASS*(np.asarray(material['neutralDensityM3'])+np.asarray(material['impliedElectronDensityM3']))
    hall_coefficient=np.asarray(material['hallSM']); material_pedersen=np.asarray(material['pedersenSM'])
    if (not np.isfinite(density).all() or np.any(density<=0) or not np.isfinite(hall_coefficient).all()
            or not np.isfinite(material_pedersen).all() or np.any(material_pedersen<=0)):
        raise ValueError('Positive source density/Pedersen and finite signed Hall ratio required')
    hall_ratio=hall_coefficient/material_pedersen
    # V82 stores positive Hall magnitude for B>0, while source Eq7 uses signed
    # sigma_H<0 in Eq3c's minus term. Standard Jtheta=+hallSM/Pedersen*Jr.
    centrifugal=density*rc*w*w; hall=B*hall_ratio*center_jr; total=centrifugal+hall
    loops={name:pressure_loop(rc,zc,value) for name,value in
           [('centrifugalPa',centrifugal),('hallPa',hall),('totalPa',total)]}
    scale=abs(B*m['branchCurrentA']*(m['radiusM']**2-m['cathodeRadiusM']**2)/2)
    summed=source.sum(axis=1); residual=summed-wall-np.diff(axial)
    return dict(workW={k:float(v) for k,v in work.items()},radialWallTorqueNm=float(sum(wall)),
        endWallTorqueNm=float(axial[-1]),sourceTorqueNm=float(sum(summed)),
        slabBalanceRelative=float(max(abs(residual))/max(scale,np.finfo(float).tiny)),
        axialEdgesM=z.tolist(),axialViscousTorqueFluxNm=axial.tolist(),sourceTorqueBySlabNm=summed.tolist(),
        radialWallTorqueBySlabNm=wall.tolist(),pressureLoopPa=loops,
        rectangleMeanForceCurlNM4={k:float(v/(.04*.10)) for k,v in loops.items()},
        pressureRectangleM=[.01,.05,.02,.12],circulationVelocityPredicted=False,
        densityClosure='Source nn+ne radial profile extended axially; conditional, not measured axial density',
        scope='Fixed-density no-meridional-force compatibility only; Hall included. No pressure/energy closure or experimental qualification.')
