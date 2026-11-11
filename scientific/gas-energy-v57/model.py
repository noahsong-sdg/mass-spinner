"""Closed, nonrotating, pure monatomic low-Mach gas + radial solid reference.

Lagrangian gas shells keep particle number, not density, fixed. Pressure is
spatially uniform and evolves; p*dV work transports energy between shells.
No gravity, plasma, chemistry, isotope diffusion, axial flow or acoustic waves.
Execute only in safe-dev. This reference is not the live rotor thermal model.
"""
import math
import numpy as np
from scipy.linalg import solve_banded

KB, AMU = 1.380649e-23, 1.66053906660e-27
# Hurly/Moldover2000 TableA1: dilute pure4He. Sparse log interpolation only.
HE = np.array([[300,19.919e-6,.155863],[500,28.344e-6,.221707],
               [1000,46.378e-6,.362590],[2000,77.286e-6,.603905]])


def transport(gas, temperatures, constant=False, reference=500.):
    t = np.asarray(temperatures, dtype=float)
    if not np.all(np.isfinite(t)):
        raise ValueError('Finite gas temperatures required')
    if gas == 'helium4':
        if np.any(t < 300-1e-9) or np.any(t > 2000+1e-9):
            raise ValueError('He transport:300–2000K; no extrapolation')
        evaluate = np.full_like(t,reference) if constant else t
        if not 300 <= reference <= 2000:
            raise ValueError('He reference outside table domain')
        mu,k = (np.exp(np.interp(np.log(evaluate),np.log(HE[:,0]),np.log(HE[:,i]))) for i in (1,2))
        return mu,k,4.00260325413*AMU
    if gas == 'lithium':
        if np.any(t < 100) or np.any(t > 3000) or not 100 <= reference <= 3000:
            raise ValueError('Li fit:100–3000K; no extrapolation')
        evaluate = np.full_like(t,reference) if constant else t
        # Bouledroua2006 dilute Li fit;7u is explicit mass sensitivity, not isotope data.
        return 3.14e-8*evaluate**.863,1.398e-4*evaluate**.863,7.*AMU
    raise ValueError('Only pure monatomic He4 and Li proxy supported')


def solid_change(new, old, c):
    d = new-old
    if c['wallMaterial'] == 'constant':
        return c['wallCpJKgK']*d
    if np.any(new < 300-1e-9) or np.any(new > 1900+1e-9):
        raise ValueError('Tungsten solid:300–1900K')
    return d*(23.95930+.002639680*(new+old)/2+1.257750e-6*(new*new+new*old+old*old)/3
              -.254642e-9*(new**3+new*new*old+new*old*old+old**3)/4-48407/(new*old))/.18384


def solid_k(t,c):
    solid_change(t,t,c)  # Enforce the same material domain for all property calls.
    if c['wallMaterial'] == 'constant':
        return np.full_like(t,c['wallKWMK'])
    return 149.441-.045466*t+13.193e-6*t*t-1.484e-9*t**3+3.866e6/(t*t)


def solid_cp(t,c):
    solid_change(t,t,c)
    if c['wallMaterial']=='constant':
        return np.full_like(t,c['wallCpJKgK'])
    return (23.95930+.002639680*t+1.257750e-6*t*t-.254642e-9*t**3-48407/(t*t))/.18384


def geometry(t, numbers, c):
    volume=math.pi*c['radiusM']**2*c['lengthM']
    p=KB*np.dot(numbers,t)/volume
    volumes=numbers*KB*t/p
    edges=np.sqrt(np.r_[0.,np.cumsum(volumes)]/(math.pi*c['lengthM']))
    return p,volumes,edges,np.sqrt((edges[:-1]**2+edges[1:]**2)/2)


def coefficients(t, numbers, wall_edges, c):
    ng=len(numbers);g=t[:ng];w=t[ng:]
    p,v,e,x=geometry(g,numbers,c)
    mu,k,mass=transport(c['gas'],g,c['constantTransport'],c['referenceK'])
    factor=2*math.pi*c['lengthM'];wx=np.sqrt(wall_edges[:-1]*wall_edges[1:]);wk=solid_k(w,c)
    gas_links=factor/(np.log(e[1:-1]/x[:-1])/k[:-1]+np.log(x[1:]/e[1:-1])/k[1:])
    # Hadjiconstantinou2006 Eq8–11, Smoluchowski approximation, viscosity lambda.
    mean_free=mu/p*np.sqrt(math.pi*KB*g/(2*mass));pr=2.5*KB/mass*mu/k
    jump=(2-c['alpha'])/c['alpha']*1.25*mean_free[-1]/pr[-1] if c['alpha'] else math.inf
    gas_half=math.log(c['radiusM']/x[-1])/(factor*k[-1])
    solid_half=math.log(wx[0]/c['radiusM'])/(factor*wk[0])
    jump_r=jump/(factor*c['radiusM']*k[-1])
    interface=1/(gas_half+jump_r+solid_half)
    wall_links=factor/(np.log(wall_edges[1:-1]/wx[:-1])/wk[:-1]+np.log(wx[1:]/wall_edges[1:-1])/wk[1:])
    outer=0. if c['coolingWK']==0 else 1/(1/c['coolingWK']+math.log(wall_edges[-1]/wx[-1])/(factor*wk[-1]))
    return np.r_[gas_links,interface,wall_links],outer,(p,v,e,mean_free,jump,interface,mass,gas_half,jump_r,solid_half)


def run_case(case):
    c=case['config'];ng=c['gasCells'];nw=c['wallCells']
    positive=['radiusM','lengthM','thicknessM','pressurePa','referenceK','durationS']
    if any(not math.isfinite(c[k]) or c[k]<=0 for k in positive) or not 0<=c['alpha']<=1:
        raise ValueError('Positive finite geometry/state and0≤alpha≤1 required')
    if c['wallMaterial'] not in ('constant','tungsten') or c['coolingWK']<0 or not math.isfinite(c['coolingWK']):
        raise ValueError('Invalid wall or cooling')
    if c['wallMaterial']=='constant' and any(not math.isfinite(c[k]) or c[k]<=0 for k in ('wallDensityKgM3','wallCpJKgK','wallKWMK')):
        raise ValueError('Positive finite solid properties required')
    if any(not isinstance(v,int) or v<2 for v in (ng,nw,c['steps'])) or not math.isfinite(c['coolantK']) or c['coolantK']<=0:
        raise ValueError('At least two cells, positive step count and coolant required')
    ge=np.linspace(0,c['radiusM'],ng+1);gv=math.pi*c['lengthM']*np.diff(ge**2)
    numbers=c['pressurePa']*gv/(KB*c['referenceK'])
    we=np.linspace(c['radiusM'],c['radiusM']+c['thicknessM'],nw+1)
    masses=(19250. if c['wallMaterial']=='tungsten' else c['wallDensityKgM3'])*math.pi*c['lengthM']*np.diff(we**2)
    old=np.r_[np.broadcast_to(case['initial']['gasK'],(ng,)),np.broadcast_to(case['initial']['solidK'],(nw,))].astype(float)
    if not np.all(np.isfinite(old)) or np.min(old)<=0:
        raise ValueError('Positive finite initial temperatures required')
    transport(c['gas'],old[:ng],c['constantTransport'],c['referenceK']);solid_change(old[ng:],old[ng:],c)
    dt=c['durationS']/c['steps'];states=[];max_residual=0.;max_iterations=0
    zero=np.zeros(ng+nw)

    def state(values,time,heat,source,previous,iteration,residual):
        links,outer,detail=coefficients(values,numbers,we,c)
        p,v,e,mfp,jump,interface,mass,rg,rj,rw=detail
        prior_edges=geometry(previous[:ng],numbers,c)[2]
        velocity=(e-prior_edges)/dt if time else np.zeros_like(e)
        sound=math.sqrt((5/3)*KB*min(values[:ng])/mass)
        power=links[ng-1]*(values[ng-1]-values[ng])
        mu,k,_=transport(c['gas'],values[:ng],c['constantTransport'],c['referenceK'])
        centers=np.sqrt((e[:-1]**2+e[1:]**2)/2)
        gradient=np.max((mfp[:-1]+mfp[1:])/2*np.abs(np.diff(np.log(values[:ng])))/np.diff(centers))
        boundary_gradient=mfp[-1]*abs(power)/(2*math.pi*c['lengthM']*c['radiusM']*k[-1]*values[ng-1])
        log_rate=np.abs(np.log(values[:ng]/previous[:ng]))/dt if time else np.zeros(ng)
        return {'timeS':time,'gasK':values[:ng].tolist(),'solidK':values[ng:].tolist(),'gasEdgesM':e.tolist(),
                'pressurePa':p,'interfaceEnergyJ':float(heat[ng-1]),'coolingEnergyJ':float(dt*outer*(values[-1]-c['coolantK'])) if time else 0.,
                'gasSourceJ':source[:ng].tolist(),'solidSourceJ':source[ng:].tolist(),
                'gasFaceEnergyJ':heat[:ng-1].tolist(),'solidFaceEnergyJ':heat[ng:].tolist(),
                'maxMach':float(np.max(np.abs(velocity))/sound),'maxKn':float(np.max(mfp)/c['radiusM']),
                'maxThermalGradientKn':float(max(gradient,boundary_gradient)),
                'maxStressTimeRate':float(np.max(mu/p*log_rate)),
                'maxAcousticTimeRate':float(c['radiusM']/sound*np.max(log_rate)),
                'jumpLengthM':None if not math.isfinite(jump) else float(jump),'interfaceConductanceWK':float(interface),
                'gasSurfaceK':float(values[ng-1]-power*rg),'solidSurfaceK':float(values[ng]+power*rw),
                'jumpResistanceKW':None if not math.isfinite(rj) else float(rj),
                'nonlinearIterations':iteration,'scaledResidual':residual}

    states.append(state(old,0.,np.zeros(ng+nw-1),zero,old,0,0.))
    for step in range(c['steps']):
        pold,vold,_,_=geometry(old[:ng],numbers,c)
        source=np.r_[np.broadcast_to(case.get('gasPowerW',0.),(ng,)),np.broadcast_to(case.get('solidPowerW',0.),(nw,))]*dt
        if not np.all(np.isfinite(source)):
            raise ValueError('Finite cell powers required')
        values=old.copy()
        for iteration in range(100):
            links,outer,detail=coefficients(values,numbers,we,c)
            capacities=np.r_[2.5*KB*numbers,masses*solid_cp(values[ng:],c)]
            d=values[ng:]-old[ng:];mask=np.abs(d)>1e-7
            capacities[ng:][mask]=masses[mask]*solid_change(values[ng:][mask],old[ng:][mask],c)/d[mask]
            # Tridiagonal enthalpy system minus uniform-pressure rank-one term.
            diagonal=capacities+dt*np.r_[links,outer]+dt*np.r_[0.,links]
            band=np.zeros((3,ng+nw));band[1]=diagonal;band[0,1:]=-dt*links;band[2,:-1]=-dt*links
            old_flux=dt*links*(old[:-1]-old[1:]);rhs=source.copy();rhs[:-1]-=old_flux;rhs[1:]+=old_flux
            rhs[-1]+=dt*outer*(c['coolantK']-old[-1])
            u=np.r_[vold,np.zeros(nw)];v=np.r_[KB*numbers/(math.pi*c['radiusM']**2*c['lengthM']),np.zeros(nw)]
            solved=solve_banded((1,1),band,np.column_stack([rhs,u]));a,b=solved.T
            increment=a+b*np.dot(v,a)/(1-np.dot(v,b))
            new=old+increment
            if np.min(new)<=0 or not np.all(np.isfinite(new)):
                raise ValueError('Low-Mach solve left positive-temperature domain')
            new_links,new_outer,new_detail=coefficients(new,numbers,we,c)
            heat=dt*new_links*(new[:-1]-new[1:])
            residual=np.r_[1.5*KB*numbers*(new[:ng]-old[:ng])+new_detail[0]*(new_detail[1]-vold),
                           masses*solid_change(new[ng:],old[ng:],c)]-source
            residual[:-1]+=heat;residual[1:]-=heat;residual[-1]+=dt*new_outer*(new[-1]-c['coolantK'])
            scale=np.r_[2.5*KB*numbers*old[:ng],capacities[ng:]*old[ng:]]+np.abs(source)
            rel=float(np.max(np.abs(residual)/scale))
            if rel<2e-12 and np.max(np.abs(new-values))<1e-8:
                break
            values=new
        else:
            raise RuntimeError(f'Nonlinear gas/solid solve did not converge:{case["name"]},{rel}')
        states.append(state(new,(step+1)*dt,heat,source,old,iteration+1,rel));old=new
        max_residual=max(max_residual,rel);max_iterations=max(max_iterations,iteration+1)
    return {'name':case['name'],'config':c,'particleNumbers':numbers.tolist(),'solidEdgesM':we.tolist(),
            'states':states,'maximumScaledResidual':max_residual,'maximumIterations':max_iterations,'caseKind':case['caseKind']}
