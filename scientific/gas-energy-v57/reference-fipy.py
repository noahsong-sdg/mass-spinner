"""Independent actual FiPy linearized closed-vessel gas/solid reference.

Gas storage n0 Cp*dtheta/dt - dp/dt, dp=n0*kB*volume_mean(dtheta).
Fixed reference geometry/properties; only the small-perturbation limit applies.
No import of the nonlinear model, its coefficients or its matrices.
"""
import os
os.environ['FIPY_SOLVERS']='scipy'
import math
import numpy as np
import fipy
from fipy import CellVariable,FaceVariable,CylindricalGrid1D,TransientTerm,DiffusionTerm,ImplicitSourceTerm
from fipy.solvers.scipy import LinearLUSolver


def run(case):
    c=case['config'];ng=c['gasCells'];nw=c['wallCells'];r=c['radiusM'];length=c['lengthM']
    assert c['gas']=='helium4' and c['referenceK']==500 and c['wallMaterial']=='constant'
    kb=1.380649e-23;mass=4.00260325413*1.66053906660e-27
    mu,k=28.344e-6,.221707;factor=2*math.pi*length
    ge=np.linspace(0,r,ng+1);we=np.linspace(r,r+c['thicknessM'],nw+1)
    edges=np.r_[ge,we[1:]];mesh=CylindricalGrid1D(dx=np.diff(edges))
    volumes=factor*np.asarray(mesh.cellVolumes)
    x=np.r_[np.sqrt((ge[:-1]**2+ge[1:]**2)/2),np.sqrt(we[:-1]*we[1:])]
    fx=np.asarray(mesh.faceCenters[0]);mx=np.asarray(mesh.cellCenters[0]);n0=c['pressurePa']/(kb*500)
    capacity=np.r_[np.full(ng,2.5*n0*kb),np.full(nw,c['wallDensityKgM3']*c['wallCpJKgK'])]
    lam=mu/c['pressurePa']*math.sqrt(math.pi*kb*500/(2*mass));pr=2.5*kb/mass*mu/k
    jump=math.inf if c['alpha']==0 else (2-c['alpha'])/c['alpha']*1.25*lam/pr
    links=[]
    for j in range(ng+nw-1):
        if j<ng-1:resistance=math.log(x[j+1]/x[j])/(factor*k)
        elif j==ng-1:
            resistance=math.log(r/x[j])/(factor*k)+jump/(factor*r*k)+math.log(x[j+1]/r)/(factor*c['wallKWMK'])
        else:resistance=math.log(x[j+1]/x[j])/(factor*c['wallKWMK'])
        links.append(1/resistance)
    links=np.asarray(links);outer=0. if c['coolingWK']==0 else 1/(1/c['coolingWK']+math.log(we[-1]/x[-1])/(factor*c['wallKWMK']))
    coeff=np.zeros(ng+nw+1);coeff[1:-1]=links*np.diff(mx)/(factor*fx[1:-1])
    sink=np.zeros(ng+nw);sink[-1]=outer/volumes[-1]
    delta=CellVariable(mesh=mesh,value=0.,hasOld=True);source=CellVariable(mesh=mesh,value=0.)
    eq=TransientTerm(coeff=CellVariable(mesh=mesh,value=capacity))==DiffusionTerm(coeff=FaceVariable(mesh=mesh,value=coeff))-ImplicitSourceTerm(coeff=CellVariable(mesh=mesh,value=sink))+source
    solver=LinearLUSolver(tolerance=1e-13,iterations=1000);dt=c['durationS']/c['steps']
    old=np.r_[np.broadcast_to(case['initial']['gasK'],(ng,)),np.broadcast_to(case['initial']['solidK'],(nw,))].copy()
    states=[{'timeS':0.,'gasK':old[:ng].tolist(),'solidK':old[ng:].tolist()}]
    # Pressure forcing response is constant: solve it once with actual FiPy.
    delta.setValue(0.);delta.updateOld();source.setValue(np.r_[np.full(ng,1/dt),np.zeros(nw)])
    eq.solve(var=delta,dt=dt,solver=solver);response=np.asarray(delta.value).copy()
    weights=np.r_[n0*kb*volumes[:ng]/sum(volumes[:ng]),np.zeros(nw)]
    for i in range(c['steps']):
        forcing=np.zeros(ng+nw);flux=links*(old[:-1]-old[1:]);forcing[:-1]-=flux;forcing[1:]+=flux
        forcing[-1]+=outer*(c['coolantK']-old[-1])
        delta.setValue(0.);delta.updateOld();source.setValue(forcing/volumes)
        eq.solve(var=delta,dt=dt,solver=solver);base=np.asarray(delta.value).copy()
        dp=np.dot(weights,base)/(1-np.dot(weights,response));old+=base+response*dp
        states.append({'timeS':(i+1)*dt,'gasK':old[:ng].tolist(),'solidK':old[ng:].tolist()})
    return {'name':case['name'],'fipyVersion':fipy.__version__,'states':states}
