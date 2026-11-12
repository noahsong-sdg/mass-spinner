"""Independent FiPy disk-access verification; no measured inputs or device fit.

Newman UCRL-16498: https://escholarship.org/content/qt96z6t5r3/qt96z6t5r3.pdf
FiPy tensor syntax: https://pages.nist.gov/fipy/en/stable/FAQ.html
Mixed BC: https://pages.nist.gov/fipy/en/stable/USAGE.html
Execute only inside safe-dev. The truncated box uses exact exterior potentials;
it is a mathematical disk benchmark, not a model of the experimental anodes.
"""
import hashlib
import importlib.metadata
import json
from pathlib import Path
import sys

import numpy as np
from fipy import CellVariable,CylindricalGrid2D,DiffusionTerm,FaceVariable
from fipy.solvers.scipy import LinearLUSolver

REFINEMENTS=(16,32,64,128)


def exact_potential(r,z,a,voltage,sigma_r,sigma_z):
    r,z=np.broadcast_arrays(np.asarray(r,dtype=float),np.asarray(z,dtype=float))
    if (not np.isfinite([a,voltage,sigma_r,sigma_z]).all() or min(a,sigma_r,sigma_z)<=0
            or not np.isfinite(r).all() or not np.isfinite(z).all() or np.any(r<0) or np.any(z<0)):
        raise ValueError('Positive disk/conductivities and finite half-space coordinates required')
    zp=z*np.sqrt(sigma_r/sigma_z)
    denominator=np.hypot(r+a,zp)+np.hypot(r-a,zp)
    # Roundoff may put the mathematical sine argument just above one on disk.
    argument=np.minimum(1.,2*a/denominator)
    return (2*voltage/np.pi)*np.arcsin(argument)


def grid(a,sigma_r,sigma_z,n):
    if not isinstance(n,int) or isinstance(n,bool) or n<4:
        raise ValueError('At least four declared near-contact cells required')
    t=np.linspace(0.,1.,n+1); outside=np.linspace(0.,1.,2*n+1)
    radial=np.r_[a*(1-(1-t)**2),a+7*a*outside[1:]**2]
    axial=8*a*outside**2*np.sqrt(sigma_z/sigma_r)
    return radial,axial


def solve(n,a=.004,sigma_r=1070./197.,sigma_z=1070.,voltage=18.5):
    exact_potential(0.,0.,a,voltage,sigma_r,sigma_z)  # Enforce physical domain.
    r,z=grid(a,sigma_r,sigma_z,n); nr,nz=len(r)-1,len(z)-1
    mesh=CylindricalGrid2D(dr=np.diff(r),dz=np.diff(z))
    rf,zf=np.asarray(mesh.faceCenters.value); rc,zc=np.asarray(mesh.cellCenters.value)
    exterior=np.asarray(mesh.exteriorFaces.value,dtype=bool)
    disk=np.asarray(mesh.facesBottom.value,dtype=bool)&(rf<a)
    far=np.asarray((mesh.facesRight|mesh.facesTop).value,dtype=bool)
    phi=CellVariable(mesh=mesh,value=0.,name='disk potential')
    phi.constrain(voltage,where=disk)
    phi.constrain(exact_potential(rf,zf,a,voltage,sigma_r,sigma_z),where=far)
    # Remaining bottom and zero-area axis use FiPy's default zero normal flux.
    tensor=np.zeros((2,2,mesh.numberOfFaces)); tensor[0,0]=sigma_r; tensor[1,1]=sigma_z
    equation=DiffusionTerm(coeff=FaceVariable(mesh=mesh,rank=2,value=tensor))
    equation.solve(var=phi,solver=LinearLUSolver(tolerance=1e-12,iterations=2000))
    values=np.asarray(phi.value); normals=np.asarray(mesh.faceNormals)
    gradient=np.asarray(phi.faceGrad.value)
    current_density=np.array([-sigma_r*gradient[0],-sigma_z*gradient[1]])
    normal_current=np.sum(normals*current_density,axis=0)
    ri=np.clip(np.searchsorted(r,rf,side='right')-1,0,nr-1)
    zi=np.clip(np.searchsorted(z,zf,side='right')-1,0,nz-1)
    area=np.where(abs(normals[0])>.5,2*np.pi*rf*np.diff(z)[zi],
                  np.pi*(r[ri+1]**2-r[ri]**2))
    face_current=normal_current*area
    contact=-float(sum(face_current[disk])); expected=float(4*a*voltage*np.sqrt(sigma_r*sigma_z))
    charge=np.asarray(FaceVariable(mesh=mesh,rank=1,value=current_density).divergence.value)
    volume=2*np.pi*np.asarray(mesh.cellVolumes)
    residual=charge*volume
    field_error=values-exact_potential(rc,zc,a,voltage,sigma_r,sigma_z)
    vscale=float(max(abs(voltage),np.finfo(float).tiny)); iscale=float(max(abs(expected),np.finfo(float).tiny))
    if not np.isfinite(values).all() or not np.isfinite(face_current).all():
        raise ArithmeticError('Nonfinite FiPy disk-access solution')
    return dict(nearContactCells=n,radialCells=nr,axialCells=nz,radiusM=float(a),
        sigmaRadialSM=float(sigma_r),sigmaAxialSM=float(sigma_z),voltageV=float(voltage),
        contactCurrentA=contact,analyticCurrentA=expected,
        currentRelativeError=abs(contact-expected)/iscale,
        fieldMaxOverVoltage=float(max(abs(field_error)))/vscale,
        fieldVolumeRmsOverVoltage=float(np.sqrt(np.sum(field_error**2*volume)/sum(volume)))/vscale,
        chargeResidualRelative=float(max(abs(residual)))/iscale,
        boundaryChargeResidualRelative=abs(float(sum(face_current[exterior])))/iscale,
        insulatingCurrentRelative=float(max(abs(face_current[exterior&~(disk|far)])))/iscale,
        cellPotentialV=values.tolist(),experimentalQualification=False)


def main():
    rows=[]
    for n in REFINEMENTS:
        row=solve(n); row.pop('cellPotentialV'); rows.append(row)
        print('FiPy disk access',n,row['contactCurrentA'],row['currentRelativeError'],flush=True)
    for old,new in zip(rows,rows[1:]):
        new['refinementRelativeChange']=abs(new['contactCurrentA']-old['contactCurrentA'])/abs(new['contactCurrentA'])
    fine=rows[-1]
    output=dict(method='Actual NIST FiPy cylindrical tensor diffusion; exact exterior potential',
        sourceSHA256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        versions={p:importlib.metadata.version(p) for p in ('fipy','numpy','scipy')},
        domain='r/a<=8, z*sqrt(sigma_r/sigma_z)/a<=8; quadratic mesh grading fixed before execution',
        rows=rows,analyticCurrentGate=bool(fine['currentRelativeError']<.05),
        currentRefinementGate=bool(fine['refinementRelativeChange']<.05),
        chargeGate=all(max(r['chargeResidualRelative'],r['boundaryChargeResidualRelative'],r['insulatingCurrentRelative'])<1e-8 for r in rows),
        experimentalQualification=False)
    Path(sys.argv[1]).write_text(json.dumps(output,indent=2,allow_nan=False)+'\n')


if __name__=='__main__': main()
