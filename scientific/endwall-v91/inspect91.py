"""Analytical zero-advection wall-shear witness, not a new physical model."""
import json
from pathlib import Path
import sys
import numpy as np

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scientific/coupled-openfoam-v90'))
from reference90 import geometry,R,H,RHO,MU


def main():
    out=Path(sys.argv[1]);out.mkdir(exist_ok=False)
    result=[]
    for n in (16,32,64,128):
        f=geometry(n)
        r,z=np.meshgrid(f.mean_r,(f.z[:-1]+f.z[1:])/2)
        # Exact zero axial advection, linear tangential shear at the endwall.
        q=f.state(RHO,2900.,.5,0.,vr=10*(r/R)*(H-z)/H)
        p=f.primitive(q);a,b=f._face_states(p,1)
        axial=f._fluxes(q,p)[1]
        i=n//2;dz=f.z[-1]-f.z[-2]
        exact=10*(f.mean_r[i]/R)*dz/H
        per_area=axial[1,-2,i]/f.axial_area[-2,i]
        shear=MU*10*(f.mean_r[i]/R)/H
        result.append(dict(n=n,exactTangentialVelocityAtLastInteriorFace=exact,
            reconstructedLeft=float(a[2,-2,i]),reconstructedRight=float(b[2,-2,i]),
            physicalAxialRadialMomentumFluxPa=0.,numericalFluxPa=float(per_area),
            physicalWallShearMagnitudePa=float(shear),
            artificialFluxOverPhysicalShear=float(abs(per_area)/shear)))
    (out/'wall-shear-witness.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result),flush=True)


if __name__=='__main__':
    main()
