"""Independent velocity-coordinate FV with prescribed spatial transport.

Adapts V79's independent reference. Face-frozen metric factors and arithmetic
radial centers differ from the primary logarithmic/Couette resistance method.
Shared continuum limits, not same-grid equality, are the comparison target.
No primary-solver imports, velocity targets, or inferred transport closures.
"""
import math
import numpy as np
from scipy.sparse import bmat, coo_matrix, diags
from scipy.sparse.linalg import spsolve


def _segments(points, counts):
    return np.concatenate([np.linspace(a,b,n,endpoint=False)
                           for a,b,n in zip(points[:-1],points[1:],counts)]
                          + [np.array([points[-1]])])


def _field(value, rc, zc, name, nonnegative=False):
    """Raw arrays are cell-shaped; callbacks may broadcast physical coordinates."""
    shape=(len(zc),len(rc))
    callback=callable(value)
    raw=np.asarray(value(rc[None,:],zc[:,None]) if callback else value,dtype=float)
    if not callback and raw.ndim and raw.shape!=shape:
        raise ValueError(name+' array must have shape '+str(shape))
    try:
        result=np.array(np.broadcast_to(raw,shape),copy=True)
    except ValueError as error:
        raise ValueError(name+' callback is not broadcastable to cells') from error
    if not np.isfinite(result).all() or np.any(result<0 if nonnegative else result<=0):
        raise ValueError(name+' must be finite and '+('nonnegative' if nonnegative else 'positive'))
    return result.ravel()


def _radial_shear(ra,face,rb,dz,mu_a,mu_b):
    """Face-centered vector shear with series half-cell viscosity."""
    return 2*math.pi*dz*face*ra*rb/((face-ra)/mu_a+(rb-face)/mu_b)


def solve(manifest,beta,sigma,voltage,refinement,viscosity=None,
          conductivity_shape=None,beta_field=None):
    """Prescribed-property half apparatus; sigma is an electrical normalization."""
    if (not isinstance(refinement,int) or refinement<1
            or not all(math.isfinite(x) for x in (beta,sigma,voltage))
            or beta<0 or sigma<=0):
        raise ValueError('Need positive integer refinement, conductivity and finite inputs')
    radius,length=manifest['radiusM'],manifest['halfLengthM']
    cathode=manifest['cathodeRadiusM']
    anode_lo=manifest['anodeCenterM']-manifest['anodeWidthM']/2
    anode_hi=manifest['anodeCenterM']+manifest['anodeWidthM']/2
    magnetic=manifest['magneticT']
    if (not all(math.isfinite(v) for v in (radius,length,cathode,anode_lo,anode_hi,magnetic))
            or not 0<cathode<radius or not 0<anode_lo<anode_hi<length):
        raise ValueError('Need ordered finite apparatus geometry and finite magnetic field')
    r=_segments([0.,cathode,radius],[4*refinement,28*refinement])
    z=_segments([0.,anode_lo,anode_hi,length],[12*refinement,4*refinement,32*refinement])
    rc,zc=(r[:-1]+r[1:])/2,(z[:-1]+z[1:])/2
    nr,nz=len(rc),len(zc); n=nr*nz; radii=np.tile(rc,nz)
    mu=_field(manifest['viscosityPaS'] if viscosity is None else viscosity,rc,zc,'Viscosity')
    shape=_field(1. if conductivity_shape is None else conductivity_shape,rc,zc,'Conductivity shape')
    hall=_field(beta if beta_field is None else beta_field,rc,zc,'Hall parameter',nonnegative=True)
    parallel=sigma*shape; perpendicular=parallel/(1+hall*hall)
    if not np.isfinite(parallel).all() or not np.isfinite(perpendicular).all() or np.any(perpendicular<=0):
        raise ValueError('Conductivity fields must remain finite and positive')
    electrical,shear=[],[]

    def wire(a,b,resistance,boundary=0.,parts=(),kind=None):
        electrical.append((a,b,1/resistance,boundary,tuple(parts),kind))

    def radial_part(cell,a,b):
        return cell,magnetic*(b*b-a*a)/(2*radii[cell])

    for j in range(nz):
        dz=z[j+1]-z[j]
        for i in range(nr):
            a=j*nr+i; area=math.pi*(r[i+1]**2-r[i]**2)
            moment=math.pi*(r[i+1]**4-r[i]**4)/2
            if i+1<nr:
                b,face=a+1,r[i+1]
                da,db=face-rc[i],rc[i+1]-face
                resistance=(da/perpendicular[a]+db/perpendicular[b])/(2*math.pi*face*dz)
                wire(a,b,resistance,parts=(radial_part(a,rc[i],face),radial_part(b,face,rc[i+1])))
                # Face-centered vector shear, with positive harmonic viscosity.
                shear.append((a,b,_radial_shear(rc[i],face,rc[i+1],dz,mu[a],mu[b])))
            if j+1<nz:
                b=a+nr; da,db=z[j+1]-zc[j],zc[j+1]-z[j+1]
                wire(a,b,(da/parallel[a]+db/parallel[b])/area)
                shear.append((a,b,moment/(da/mu[a]+db/mu[b])))
            if i==nr-1:
                distance=radius-rc[i]
                shear.append((a,None,2*math.pi*mu[a]*radius**2*dz*rc[i]/distance))
                if anode_lo<=zc[j]<=anode_hi:
                    wire(a,None,distance/(2*math.pi*radius*dz*perpendicular[a]),
                         voltage,(radial_part(a,rc[i],radius),),'anode')
            if j==nz-1:
                distance=length-zc[j]
                shear.append((a,None,mu[a]*moment/distance))
                if rc[i]<cathode:
                    wire(a,None,distance/(area*parallel[a]),kind='cathode')
    # D maps voltage drops; E maps velocity to EMF; force=-E.T@current.
    dr,dc,dv,er,ec,ev=[],[],[],[],[],[]
    conductance=np.array([link[2] for link in electrical])
    boundary=np.array([link[3] for link in electrical])
    for edge,(a,b,_,_,parts,_) in enumerate(electrical):
        dr.append(edge); dc.append(a); dv.append(1.)
        if b is not None:
            dr.append(edge); dc.append(b); dv.append(-1.)
        for cell,weight in parts:
            er.append(edge); ec.append(cell); ev.append(weight)
    d=coo_matrix((dv,(dr,dc)),shape=(len(electrical),n)).tocsr()
    e=coo_matrix((ev,(er,ec)),shape=(len(electrical),n)).tocsr()
    sr,sc,sv=[],[],[]
    for a,b,g in shear:
        sr.append(a); sc.append(a); sv.append(g/radii[a]**2)
        if b is not None:
            sr.extend([b,a,b]); sc.extend([b,b,a])
            sv.extend([g/radii[b]**2,-g/(radii[a]*radii[b]),-g/(radii[a]*radii[b])])
    s=coo_matrix((sv,(sr,sc)),shape=(n,n)).tocsr()
    g=diags(conductance); a,c=d.T@g@d,d.T@g@e
    system=bmat([[a,c],[c.T,s+e.T@g@e]],format='csc')
    rhs=np.concatenate([d.T@(conductance*boundary),e.T@(conductance*boundary)])
    # Potential and velocity have unlike units and diagonal scales. Symmetric
    # equilibration changes coordinates, not the FV equations or their adjoint.
    unit=diags(1/np.sqrt(system.diagonal()))
    answer=unit@spsolve((unit@system@unit).tocsc(),unit@rhs)
    if not np.isfinite(answer).all():
        raise ArithmeticError('Independent Stokes--Ohm solution is nonfinite')
    phi,velocity=answer[:n],answer[n:]; omega=velocity/radii
    current=conductance*(d@phi+e@velocity-boundary)
    charge=np.asarray(d.T@current).ravel()
    force=-np.asarray(e.T@current).ravel()
    momentum=np.asarray(s@velocity).ravel()-force
    joule=float(np.sum(current**2/conductance)); viscous=float(velocity@(s@velocity))
    power=-float(boundary@current); torque=float(radii@force)
    wall_torque=-sum(g*omega[a] for a,b,g in shear if b is None)
    cathode_current=sum(current[k] for k,link in enumerate(electrical) if link[-1]=='cathode')
    anode_current=sum(current[k] for k,link in enumerate(electrical) if link[-1]=='anode')
    midplane=omega.reshape(nz,nr)[0]; chords=np.asarray(manifest['chordsM'])
    chord_velocity=[]
    for chord in chords:
        if not 0<=chord<radius:
            raise ValueError('Chord must intersect modeled gas')
        path=np.sqrt(np.maximum(0.,r[1:]**2-chord**2))-np.sqrt(np.maximum(0.,r[:-1]**2-chord**2))
        chord_velocity.append(float(chord*np.dot(path,midplane)/sum(path)))
    summary=lambda field: dict(min=float(min(field)),max=float(max(field)))
    return dict(method='Independent velocity-coordinate FV, spatial prescribed transport',
        radialEdgesM=r.tolist(),axialEdgesM=z.tolist(),radialCentersM=rc.tolist(),axialCentersM=zc.tolist(),
        potentialV=phi.reshape(nz,nr).tolist(),velocityMS=velocity.reshape(nz,nr).tolist(),
        omegaRadS=omega.reshape(nz,nr).tolist(),branchCurrentA=float(cathode_current),anodeCurrentA=float(anode_current),
        chordsM=chords.tolist(),chordVelocityMS=chord_velocity,localMidplaneVelocityMS=(rc*midplane).tolist(),
        electrodePowerW=power,jouleW=joule,shearW=viscous,driveTorqueNm=torque,wallTorqueNm=float(wall_torque),
        chargeResidualRelative=float(max(abs(charge))/max(abs(current).max(),1e-30)),
        momentumResidualRelative=float(max(abs(momentum))/max(abs(force).max(),1e-30)),
        powerResidualRelative=abs(power-joule-viscous)/max(abs(power),1e-30),
        torqueResidualRelative=abs(torque+wall_torque)/max(abs(torque),abs(wall_torque),1e-30),
        sigmaParallelSM=sigma,effectiveBeta=beta,bulkVoltageV=voltage,refinement=refinement,
        transportRanges=dict(viscosityPaS=summary(mu),conductivityShape=summary(shape),
                             sigmaParallelSM=summary(parallel),effectiveBeta=summary(hall)))
