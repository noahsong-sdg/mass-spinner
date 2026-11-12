"""Prescribed-property charge/azimuthal shear; no meridional velocity closure."""
import importlib.util
from pathlib import Path
import numpy as np
from scipy.optimize import brentq
from scipy.sparse import bmat,coo_matrix,diags
from scipy.sparse.linalg import spsolve

spec=importlib.util.spec_from_file_location('frozen_v79',Path(__file__).parents[1]/'profile-v79/solver.py')
legacy=importlib.util.module_from_spec(spec); spec.loader.exec_module(legacy)
grid,observe=legacy.grid,legacy.observe


def field(value,rc,zc,nonnegative=False):
    callback=callable(value); shape=(len(zc),len(rc))
    raw=np.asarray(value(rc[None,:],zc[:,None]) if callback else value,dtype=float)
    if not callback and raw.ndim and raw.shape!=shape:
        raise ValueError('Transport arrays must have the full cell shape')
    result=np.broadcast_to(raw,shape).copy()
    if not np.isfinite(result).all() or np.any(result<0 if nonnegative else result<=0):
        raise ValueError('Finite positive transport fields required; beta may equal zero')
    return result.ravel()


def radial_electric(a,f,b,dz,ka,kb):
    return (np.log(f/a)/ka+np.log(b/f)/kb)/(2*np.pi*dz)


def radial_shear(a,f,b,dz,ka,kb):
    return ((a**-2-f**-2)/ka+(f**-2-b**-2)/kb)/(4*np.pi*dz)


def axial_series(a,f,b,area,ka,kb):
    return ((f-a)/ka+(b-f)/kb)/area


def solve(m,beta,sigma,voltage,refinement,viscosity=None,conductivity_shape=None,beta_field=None,magnetic=None):
    if not np.isfinite([sigma,voltage,beta]).all() or sigma<=0 or beta<0:
        raise ValueError('Finite electrical inputs and positive conductivity required')
    B=m['magneticT'] if magnetic is None else magnetic
    if not np.isfinite(B): raise ValueError('Finite magnetic field required')
    r,z=grid(m,refinement); rc=np.sqrt((r[:-1]**2+r[1:]**2)/2); zc=(z[:-1]+z[1:])/2
    nr,nz=len(rc),len(zc); n=nr*nz
    mu=field(m['viscosityPaS'] if viscosity is None else viscosity,rc,zc)
    parallel=sigma*field(1. if conductivity_shape is None else conductivity_shape,rc,zc)
    beta_values=field(beta if beta_field is None else beta_field,rc,zc,True)
    perpendicular=parallel/(1+beta_values**2)
    if not np.isfinite(parallel).all() or not np.isfinite(perpendicular).all() or np.any(perpendicular<=0):
        raise ValueError('Conductivities must remain finite and positive')
    dr,dc,dv,tr,tc,tv,sr,sc,sv=[],[],[],[],[],[],[],[],[]
    resistance,boundary,labels=[],[],[]
    def wire(a,b,R,parts=(),potential=0.,label=None):
        k=len(resistance); dr.append(k); dc.append(a); dv.append(1.)
        if b is not None: dr.append(k); dc.append(b); dv.append(-1.)
        for cell,weight in parts: tr.append(k); tc.append(cell); tv.append(weight)
        resistance.append(R); boundary.append(potential); labels.append(label)
    def shear(a,b,g):
        sr.append(a); sc.append(a); sv.append(g)
        if b is not None:
            sr.extend([b,a,b]); sc.extend([b,b,a]); sv.extend([g,-g,-g])
    for j in range(nz):
        dz=z[j+1]-z[j]
        for i in range(nr):
            a=j*nr+i; area=np.pi*(r[i+1]**2-r[i]**2); moment=np.pi/2*(r[i+1]**4-r[i]**4)
            if i<nr-1:
                b=a+1; f=r[i+1]
                wire(a,b,radial_electric(rc[i],f,rc[i+1],dz,perpendicular[a],perpendicular[b]),
                     [(a,-B*(f*f-rc[i]**2)/2),(b,-B*(rc[i+1]**2-f*f)/2)])
                shear(a,b,1/radial_shear(rc[i],f,rc[i+1],dz,mu[a],mu[b]))
            if j<nz-1:
                b=a+nr; f=z[j+1]
                wire(a,b,axial_series(zc[j],f,zc[j+1],area,parallel[a],parallel[b]))
                shear(a,b,1/axial_series(zc[j],f,zc[j+1],moment,mu[a],mu[b]))
            if i==nr-1:
                shear(a,None,1/radial_shear(rc[i],r[-1],r[-1],dz,mu[a],mu[a]))
                if abs(zc[j]-m['anodeCenterM'])<m['anodeWidthM']/2:
                    wire(a,None,radial_electric(rc[i],r[-1],r[-1],dz,perpendicular[a],perpendicular[a]),
                         [(a,-B*(r[-1]**2-rc[i]**2)/2)],voltage,'anode')
            if j==nz-1:
                shear(a,None,mu[a]*moment/(z[-1]-zc[j]))
                if r[i+1]<=m['cathodeRadiusM']*(1+1e-12):
                    wire(a,None,(z[-1]-zc[j])/(area*parallel[a]),label='cathode')
    D=coo_matrix((dv,(dr,dc)),shape=(len(resistance),n)).tocsr()
    T=coo_matrix((tv,(tr,tc)),shape=(len(resistance),n)).tocsr()
    S=coo_matrix((sv,(sr,sc)),shape=(n,n)).tocsr(); G=diags(1/np.asarray(resistance)); v=np.array(boundary)
    A=D.T@G@D; C=D.T@G@T
    matrix=bmat([[A,-C],[-C.T,S+T.T@G@T]],format='csc')
    rhs=np.r_[D.T@G@v,-T.T@G@v]; scale=diags(1/np.sqrt(matrix.diagonal()))
    answer=scale@spsolve((scale@matrix@scale).tocsc(),scale@rhs)
    if not np.isfinite(answer).all(): raise ArithmeticError('Nonfinite transport solution')
    phi,omega=answer[:n],answer[n:]; amps=np.asarray(G@(D@phi-v-T@omega)); torque=np.asarray(T.T@amps)
    currents={name:float(sum(a for a,label in zip(amps,labels) if label==name)) for name in ('cathode','anode')}
    electrical=float(-v@amps); joule=float(np.asarray(resistance)@amps**2); viscous=float(omega@S@omega)
    isc=max(abs(currents['cathode']),abs(currents['anode']),np.finfo(float).tiny)
    tsc=max(float(sum(abs(torque))),np.finfo(float).tiny)
    cathode_moment=sum(amp*rc[cell%nr]**2 for amp,label,cell in zip(amps,labels,
                         np.asarray(D.argmax(axis=1)).ravel()) if label=='cathode')
    boundary_torque=-B/2*(currents['anode']*r[-1]**2+cathode_moment)
    return dict(r=r,z=z,omega=omega.reshape(nz,nr),potential=phi.reshape(nz,nr),currentsA=currents,
        electrodePowerW=electrical,jouleW=joule,viscousW=viscous,
        chargeResidualRelative=float(max(abs(D.T@amps)))/isc,boundaryResidualRelative=abs(sum(currents.values()))/isc,
        powerResidualRelative=abs(electrical-joule-viscous)/max(abs(electrical),abs(joule)+abs(viscous),np.finfo(float).tiny),
        angularResidualRelative=abs(float(sum(S@omega)-sum(torque)))/tsc if B else 0.,
        driveTorqueNm=float(sum(torque)),boundaryMomentTorqueNm=float(boundary_torque),
        torqueMomentResidualRelative=abs(float(sum(torque))-boundary_torque)/tsc if B else 0.,
        linearResidualRelative=float(np.linalg.norm(matrix@answer-rhs)/max(np.linalg.norm(rhs),np.finfo(float).tiny)),
        propertyRanges=dict(viscosityPaS=[float(min(mu)),float(max(mu))],sigmaParallelSM=[float(min(parallel)),float(max(parallel))],
                            effectiveBeta=[float(min(beta_values)),float(max(beta_values))]))


def calibrate(m,beta,voltage,refinement,**fields):
    """Condition only on measured branch current, with prescribed property shapes."""
    cache={}
    def residual(log_sigma):
        cache[log_sigma]=solve(m,beta,np.exp(log_sigma),voltage,refinement,**fields)
        return cache[log_sigma]['currentsA']['cathode']-m['branchCurrentA']
    root=brentq(residual,*np.log(m['sigmaBracketSM']),xtol=2e-10)
    result=cache[root] if root in cache else solve(m,beta,np.exp(root),voltage,refinement,**fields)
    return float(np.exp(root)),result
