"""Independent velocity-coordinate FV for prescribed source-theory current rings.

Only the physical mesh is shared. Arithmetic radial centers, face-frozen metric
resistances, u-coordinate shear and source quadrature are assembled here without
importing the primary solver or any measured velocity/voltage target.
"""
import math
import numpy as np
from scipy.sparse import bmat, coo_matrix, diags
from scipy.sparse.linalg import spsolve
from mesh84 import grid


def _field(value,rc,zc,name,nonnegative=False):
    shape=(len(zc),len(rc)); callback=callable(value)
    raw=np.asarray(value(rc[None,:],zc[:,None]) if callback else value,dtype=float)
    if not callback and raw.ndim and raw.shape!=shape:
        raise ValueError(name+' array must have the full cell shape')
    result=np.broadcast_to(raw,shape).copy()
    if not np.isfinite(result).all() or np.any(result<0 if nonnegative else result<=0):
        raise ValueError(name+' must be finite and '+('nonnegative' if nonnegative else 'positive'))
    return result.ravel()


def _weights(coordinates,target):
    """Own conservative first-moment interpolation, not producer quadrature."""
    x=np.asarray(coordinates,dtype=float)
    if x.ndim!=1 or len(x)<2 or not np.isfinite(x).all() or not np.all(np.diff(x)>0) or not np.isfinite(target):
        raise ValueError('Need finite strictly increasing source coordinates')
    exact=np.flatnonzero(x==target)
    if len(exact): return exact,np.array([1.])
    right=int(np.searchsorted(x,target)); left=right-1
    if left<0 or right>=len(x): raise ValueError('Ring source must be bracketed by cell centers')
    fraction=(target-x[left])/(x[right]-x[left])
    return np.array([left,right]),np.array([1-fraction,fraction])


def solve(m,refinement,fields,current=None,magnetic=None,gauge=0.):
    """Published current is input; contact voltage is a singular-model diagnostic."""
    I=m['branchCurrentA'] if current is None else current
    B=m['magneticT'] if magnetic is None else magnetic
    R,L,a,z_a=(m[k] for k in ('radiusM','halfLengthM','cathodeRadiusM','anodeCenterM'))
    if not np.isfinite([I,B,gauge,R,L,a,z_a]).all() or not 0<a<R or not 0<z_a<L:
        raise ValueError('Need finite drive and ordered apparatus geometry')
    r,z=grid(m,refinement); rc=(r[:-1]+r[1:])/2; zc=(z[:-1]+z[1:])/2
    nr,nz=len(rc),len(zc); n=nr*nz; radii=np.tile(rc,nz)
    mu=_field(fields.get('viscosity',m['viscosityPaS']),rc,zc,'Viscosity')
    parallel=1070.*_field(fields.get('conductivity_shape',1.),rc,zc,'Conductivity')
    beta=_field(fields.get('beta_field',0.),rc,zc,'Hall parameter',True)
    perpendicular=parallel/(1+beta**2)
    if not np.isfinite(perpendicular).all() or np.any(perpendicular<=0):
        raise ValueError('Conductivity must remain finite and positive')
    edges=[]; shear=[]; ports=[]
    cathode_i,cathode_w=_weights(rc**2,a*a); anode_j,anode_w=_weights(zc,z_a)
    for i,w in zip(cathode_i,cathode_w):
        cell=(nz-1)*nr+i; area=math.pi*(r[i+1]**2-r[i]**2)
        ports.append((cell,I*w,(L-zc[-1])/(area*parallel[cell]),0.,'cathode'))
    for j,w in zip(anode_j,anode_w):
        cell=j*nr+nr-1; dz=z[j+1]-z[j]
        ports.append((cell,-I*w,(R-rc[-1])/(2*math.pi*R*dz*perpendicular[cell]),
                      B*(R*R-rc[-1]**2)/(2*rc[-1]),'anode'))
    for j in range(nz):
        dz=z[j+1]-z[j]
        for i in range(nr):
            cell=j*nr+i; area=math.pi*(r[i+1]**2-r[i]**2)
            moment=math.pi*(r[i+1]**4-r[i]**4)/2
            if i+1<nr:
                other=cell+1; face=r[i+1]; da=face-rc[i]; db=rc[i+1]-face
                resistance=(da/perpendicular[cell]+db/perpendicular[other])/(2*math.pi*face*dz)
                emf=((cell,B*(face*face-rc[i]**2)/(2*rc[i])),
                     (other,B*(rc[i+1]**2-face*face)/(2*rc[i+1])))
                edges.append((cell,other,1/resistance,emf))
                shear.append((cell,other,2*math.pi*dz*face*rc[i]*rc[i+1]/(da/mu[cell]+db/mu[other])))
            if j+1<nz:
                other=cell+nr; da=z[j+1]-zc[j]; db=zc[j+1]-z[j+1]
                edges.append((cell,other,area/(da/parallel[cell]+db/parallel[other]),()))
                shear.append((cell,other,moment/(da/mu[cell]+db/mu[other])))
            if i==nr-1:
                shear.append((cell,None,2*math.pi*mu[cell]*R*R*dz*rc[i]/(R-rc[i])))
            if j==nz-1: shear.append((cell,None,mu[cell]*moment/(L-zc[j])))
    dr,dc,dv,er,ec,ev=[],[],[],[],[],[]
    for k,(left,right,_,parts) in enumerate(edges):
        dr.extend([k,k]); dc.extend([left,right]); dv.extend([1.,-1.])
        for cell,weight in parts: er.append(k); ec.append(cell); ev.append(weight)
    D=coo_matrix((dv,(dr,dc)),shape=(len(edges),n)).tocsr()
    E=coo_matrix((ev,(er,ec)),shape=(len(edges),n)).tocsr()
    sr,sc,sv=[],[],[]
    for left,right,g in shear:
        sr.append(left); sc.append(left); sv.append(g/radii[left]**2)
        if right is not None:
            sr.extend([right,left,right]); sc.extend([right,right,left])
            sv.extend([g/radii[right]**2,-g/(radii[left]*radii[right]),-g/(radii[left]*radii[right])])
    S=coo_matrix((sv,(sr,sc)),shape=(n,n)).tocsr(); conductance=np.array([edge[2] for edge in edges])
    G=diags(conductance); A=D.T@G@D; C=D.T@G@E
    flux=np.zeros(n); boundary_force=np.zeros(n)
    for cell,amp,_,emf,_ in ports:
        flux[cell]+=amp; boundary_force[cell]-=emf*amp
    if abs(sum(flux))>1e-13*max(abs(I),1.): raise ValueError('Incompatible Neumann source flux')
    system=bmat([[A,C],[C.T,S+E.T@G@E]],format='csc'); rhs=np.r_[-flux,boundary_force]
    # Remove exactly one constant-potential degree of freedom, not a boundary
    # current link. The omitted charge equation follows from flux compatibility.
    keep=np.arange(1,2*n); reduced=system[keep,:][:,keep]
    scale=diags(1/np.sqrt(reduced.diagonal())); answer=np.zeros(2*n)
    answer[keep]=scale@spsolve((scale@reduced@scale).tocsc(),scale@rhs[keep])
    if not np.isfinite(answer).all(): raise ArithmeticError('Independent Neumann solve is nonfinite')
    phi=answer[:n]+gauge; velocity=answer[n:]; omega=velocity/radii
    amps=conductance*(D@phi+E@velocity)
    force=-np.asarray(E.T@amps).ravel()+boundary_force
    charge=np.asarray(D.T@amps).ravel()+flux; momentum=np.asarray(S@velocity).ravel()-force
    boundary_potential=np.array([phi[cell]+emf*velocity[cell]-resistance*amp for cell,amp,resistance,emf,_ in ports])
    boundary_amps=np.array([port[1] for port in ports]); boundary_joule=sum(amp**2*res for _,amp,res,_,_ in ports)
    internal_joule=float(np.sum(amps**2/conductance)); joule=internal_joule+boundary_joule
    viscous=float(velocity@(S@velocity)); power=-float(boundary_potential@boundary_amps)
    torque=float(radii@force); expected=I*B*(R*R-a*a)/2
    wall_torque=-sum(g*omega[cell] for cell,other,g in shear if other is None)
    chords=[]; midplane=omega.reshape(nz,nr)[0]
    for chord in m['chordsM']:
        if not np.isfinite(chord) or not 0<=chord<R: raise ValueError('Chord must intersect gas')
        path=np.diff(np.sqrt(np.maximum(r*r-chord*chord,0.)))
        chords.append(float(chord*np.dot(path,midplane)/sum(path)))
    tscale=max(abs(expected),sum(abs(radii*force)),1e-30)
    iscale=max(abs(I),1e-30); fscale=max(float(max(abs(force))),1e-30)
    pscale=max(abs(power),abs(joule)+abs(viscous),1e-30)
    return dict(method='Independent u-coordinate all-Neumann ring FV; shared physical mesh',
        currentConditioning=True,experimentalQualification=False,contactVoltageExperimental=False,
        currentA=float(I),branchCurrentA=float(I),anodeCurrentA=-float(I),
        r=r,z=z,radialEdgesM=r.tolist(),axialEdgesM=z.tolist(),radialCentersM=rc.tolist(),axialCentersM=zc.tolist(),
        potentialV=phi.reshape(nz,nr),velocityMS=velocity.reshape(nz,nr),omegaRadS=omega.reshape(nz,nr),
        chordsM=list(m['chordsM']),chordVelocityMS=chords,localMidplaneVelocityMS=(rc*midplane).tolist(),
        electrodePowerW=power,jouleW=float(joule),internalJouleW=internal_joule,boundaryJouleW=float(boundary_joule),
        shearW=viscous,driveTorqueNm=torque,wallTorqueNm=float(wall_torque),sourceMomentTorqueNm=float(expected),
        contactVoltEquivalentV=power/I if I else None,
        cathodeRadialMomentM2=float(np.dot(cathode_w,rc[cathode_i]**2)),
        anodeAxialCentroidM=float(np.dot(anode_w,zc[anode_j])),
        chargeResidualRelative=float(max(abs(charge)))/iscale,
        momentumResidualRelative=float(max(abs(momentum)))/fscale,
        powerResidualRelative=abs(power-joule-viscous)/pscale,
        torqueResidualRelative=abs(torque+wall_torque)/tscale,
        torqueMomentResidualRelative=abs(torque-expected)/tscale,
        linearResidualRelative=float(np.linalg.norm(system@answer-rhs))/max(float(np.linalg.norm(rhs)),1e-30))
