"""Guest-only analytic diagnostic; reuse the native and V86 viscous operators."""
import json, os, sys, time
from pathlib import Path
import numpy as np
from scipy.special import jv

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scientific/coupled-openfoam-v90'))
from reference90 import (geometry,make_case,native_order,read_field,field,dictionary,
                         command,environment,sha,Diffusion,R,H,RHO,MU,CHI,END)
sys.path.insert(0,str(ROOT/'scientific/wall-transient-v92'))
from score92 import verify_sources

NU=MU/RHO
AMP=1e-4*NU/R
RATE=NU*((CHI/R)**2+(np.pi/(2*H))**2)
TIMES=np.array([0.,5e-6,1e-5,2e-5])
JOBS=((16,256,1.),(32,256,1.),(64,256,1.),(64,128,1.),(64,512,1.),(64,256,.5))
MODEL='graded-small-amplitude-viscous-v94'
label=lambda n,s,a:f'n{n}-s{s}-x{a:g}'


def mode(r,z):
    return jv(1,CHI*r/R)*np.cos(np.pi*z/(2*H))


def make_control(case,n,steps,scale, *, axialCells=None):
    calls=make_case(case,n,steps,.5,axialGrade=4.,axialCells=axialCells)
    dictionary(case/'system/controlDict',
        f'application foamRun; solver incompressibleFluid; startFrom startTime; startTime 0; stopAt endTime;'
        f' endTime {END:.17g}; deltaT {END/steps:.17g}; writeControl timeStep; writeInterval {steps//4};'
        ' writeFormat ascii; writePrecision 16; writeCompression off; timeFormat general;'
        ' timePrecision 16; runTimeModifiable false; adjustTimeStep no;')
    dictionary(case/'system/fvSchemes',
        'ddtSchemes {default Euler;} gradSchemes {default Gauss linear;}'
        ' divSchemes {default none; div(phi,U) Gauss linear; div((nuEff*dev2(T(grad(U))))) Gauss linear;}'
        ' laplacianSchemes {default Gauss linear corrected;}'
        ' interpolationSchemes {default linear;} snGradSchemes {default corrected;}')
    dictionary(case/'system/fvSolution',
        'solvers {p {solver PCG; preconditioner DIC; tolerance 1e-14; relTol 0;} pFinal {$p;}'
        ' U {solver smoothSolver; smoother symGaussSeidel; tolerance 1e-14; relTol 0;} UFinal {$U;}}'
        ' PIMPLE {nCorrectors 2; nNonOrthogonalCorrectors 1; pRefCell 0; pRefValue 0;}')
    dictionary(case/'constant/physicalProperties',f'viscosityModel constant; nu {NU:.17g} [m^2/s];')
    dictionary(case/'constant/fvModels','')
    f=geometry(n,axialGrade=4.,axialCells=axialCells);c=read_field(case/'0/C',f.count,3)
    radius=np.hypot(c[:,0],c[:,1]);speed=AMP*scale*mode(radius,c[:,2])
    common='midplane {type symmetryPlane;} minus {type wedge;} plus {type wedge;} axis {type empty;}'
    field(case/'0/p',np.zeros(f.count),'0 2 -2 0 0 0 0','walls {type zeroGradient;} '+common,'volScalarField')
    u=np.column_stack((-speed*c[:,1]/radius,speed*c[:,0]/radius,np.zeros(f.count)))
    field(case/'0/U',u,'0 1 -1 0 0 0 0','walls {type fixedValue; value uniform (0 0 0);} '+common,'volVectorField')
    return calls


def native_packet(case,n,steps,scale, *, axialCells=None):
    f=geometry(n,axialGrade=4.,axialCells=axialCells);c=read_field(case/'0/C',f.count,3)
    radius=np.hypot(c[:,0],c[:,1]);order=native_order(f,c);shape=f.volume.shape
    r=radius[order].reshape(shape);z=c[order,2].reshape(shape)
    np.testing.assert_allclose(z,np.broadcast_to(((f.z[:-1]+f.z[1:])/2)[:,None],shape),atol=1e-13,rtol=0)
    delta=np.deg2rad(.5)
    v=read_field(case/'0/Vc',f.count)[order].reshape(shape)*np.pi/delta
    np.testing.assert_allclose(v,f.volume*np.sin(2*delta)/(2*delta),rtol=1e-11)
    states=[];peak=0.
    for t in TIMES:
        directories=[p for p in case.iterdir() if p.is_dir() and p.name[0].isdigit() and abs(float(p.name)-t)<=1e-12*END]
        if len(directories)!=1:raise ValueError('Native reporting clock mismatch')
        u=read_field(directories[0]/'U',f.count,3)
        ur=(u[:,0]*c[:,0]+u[:,1]*c[:,1])/radius
        peak=max(peak,float(np.max(np.hypot(ur,u[:,2])))/(AMP*scale))
        states.append(((-u[:,0]*c[:,1]+u[:,1]*c[:,0])/radius)[order].reshape(shape))
    return np.array(states),r,z,dict(peakMeridionalOverAmplitude=peak,cellMapBijective=True)


def own_packet(n,steps,scale, *, axialCells=None):
    f=geometry(n,axialGrade=4.,noSlipWalls=True,axialCells=axialCells)
    r,z=np.meshgrid(f.mean_r,(f.z[:-1]+f.z[1:])/2)
    q=f.state(RHO,2900.,.5,AMP*scale*mode(r,z)/r)
    d=Diffusion(f,MU);states=[];history=[]
    for step in range(steps+1):
        if step in (0,steps//4,steps//2,steps):
            p=f.primitive(q);states.append(p['omegaRadS']*f.mean_r)
            history.append(dict(timeS=END*step/steps,massKg=float(q[0].sum()),energyJ=float(q[4].sum())))
        if step<steps:q,_=d.advance(q,END/steps)
    return np.array(states),dict(history=history)


def main(out):
    verify_sources();out.mkdir(exist_ok=False)
    prefix=Path(environment()['WM_PROJECT_DIR'])
    files=['applications/modules/incompressibleFluid/momentumPredictor.C',
           'applications/modules/incompressibleFluid/correctPressure.C']
    files+=['platforms/linuxArm64GccDPInt32Opt/'+p for p in ('bin/foamRun','bin/blockMesh','bin/checkMesh','bin/foamPostProcess','lib/libincompressibleFluidSolver.so')]
    native={k:sha(prefix/k) for k in files}
    result=dict(model=MODEL,timesS=TIMES.tolist(),amplitudeMPS=AMP,decayRatePerS=RATE,
        sourceSHA256=json.loads((ROOT/'transfer.json').read_text()),nativeSHA256=native,
        runtime=dict(python=sys.version,numpy=np.__version__,scipy=__import__('scipy').__version__,skfem=__import__('skfem').__version__),
        cases=[],experimentalQualification=False,livePlaygroundQualified=False)
    for n,steps,scale in JOBS:
        name=label(n,steps,scale);print('START',name,flush=True);start=time.monotonic()
        row=dict(label=name,n=n,steps=steps,scale=scale,axialGrade=4.,halfAngleDeg=.5)
        try:
            case=out/name;row['commands']=make_control(case,n,steps,scale)
            row['inputSHA256']={str(p.relative_to(case)):sha(p) for p in case.rglob('*') if p.is_file()}
            row['commands'].append(command(case,['foamRun','-case',str(case)],environment(),'solver'))
            a,r,z,row['native']=native_packet(case,n,steps,scale)
            print('NATIVE COMPLETE',name,flush=True)
            b,row['v86']=own_packet(n,steps,scale)
            packet=out/(name+'.npz');np.savez_compressed(packet,native=a,v86=b,nativeR=r,nativeZ=z)
            row.update(completed=True,packet=packet.name,packetSHA256=sha(packet))
        except Exception as error:row.update(completed=False,error=type(error).__name__+': '+str(error))
        row['wallSeconds']=time.monotonic()-start;result['cases'].append(row)
        (out/'predictions.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
        print('END',name,row.get('error','complete'),row['wallSeconds'],flush=True)
        verify_sources()
        if any(sha(prefix/k)!=v for k,v in native.items()):raise ValueError('Native implementation drift')
        if not row['completed']:return 1
    return 0


if __name__=='__main__':
    if sys.platform!='linux' or os.getuid()!=1000:raise RuntimeError('Execute only inside safe-dev')
    raise SystemExit(main(Path(sys.argv[1])))
