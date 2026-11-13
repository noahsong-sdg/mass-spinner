"""Guest-only directional controls using unchanged expert viscous operators."""
import json,os,sys,time
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scientific/swirl-control-v94'))
from control94 import (geometry,make_control,native_packet,own_packet,read_field,
    native_order,field,command,environment,sha,verify_sources,AMP,R,H,RATE,TIMES,mode)

JOBS=tuple(('decay',r,z,'Gauss linear') for r,z in ((32,128),(64,128),(128,128),(64,64),(64,256)))
JOBS+=(('decay',64,128,'leastSquares'),)
JOBS+=tuple(('rigid',r,2*r,'Gauss linear') for r in (16,32,64))+(('rigid',64,128,'leastSquares'),)
MODEL='directional-viscous-v95'
label=lambda kind,n,nz,scheme:f'{kind}-r{n}-z{nz}-'+('gauss' if scheme=='Gauss linear' else 'ls')


def configure(case,n,nz,kind,scheme):
    calls=make_control(case,n,256,1.,axialCells=nz)
    path=case/'system/fvSchemes';path.write_text(path.read_text().replace('default Gauss linear;}',f'default {scheme};}}',1))
    if kind=='rigid':
        f=geometry(n,axialGrade=4.,axialCells=nz);c=read_field(case/'0/C',f.count,3)
        omega=AMP/R;u=np.column_stack((-omega*c[:,1],omega*c[:,0],np.zeros(f.count)))
        common='midplane {type symmetryPlane;} minus {type wedge;} plus {type wedge;} axis {type empty;}'
        wall=f'walls {{type rotatingWallVelocity; origin (0 0 0); axis (0 0 1); omega {omega:.17g};}} '
        field(case/'0/U',u,'0 1 -1 0 0 0 0',wall+common,'volVectorField')
        field(case/'0/p',.5*omega**2*(c[:,0]**2+c[:,1]**2),'0 2 -2 0 0 0 0','walls {type zeroGradient;} '+common,'volScalarField')
        path=case/'system/controlDict'
        path.write_text(path.read_text()+'functions {gradient {type grad; libs ("libfieldFunctionObjects.so"); field U; result gradU;}}\n')
        calls.append(command(case,['foamPostProcess','-case',str(case),'-func','grad(U)','-time','0'],environment(),'initial-gradient'))
    return calls


def gradients(case,n,nz):
    f=geometry(n,axialGrade=4.,axialCells=nz);c=read_field(case/'0/C',f.count,3);order=native_order(f,c)
    result=[]
    for t in TIMES:
        directories=[p for p in case.iterdir() if p.is_dir() and p.name[0].isdigit() and abs(float(p.name)-t)<1e-16]
        if len(directories)!=1:raise ValueError('Gradient clock mismatch')
        path=directories[0]/('grad(U)' if t==0 else 'gradU')
        result.append(read_field(path,f.count,9)[order].reshape(nz,n,3,3))
    return np.array(result)


def main(out):
    verify_sources();out.mkdir(exist_ok=False)
    old=Path('/work/project/v94-swirl-source01/scientific/swirl-control-v94/study-results/predictions.json')
    native=json.loads(old.read_text())['nativeSHA256'];prefix=Path(environment()['WM_PROJECT_DIR'])
    for p in ('src/finiteVolume/fields/fvPatchFields/derived/rotatingWallVelocity/rotatingWallVelocityFvPatchVectorField.C',
              'src/finiteVolume/finiteVolume/gradSchemes/leastSquaresGrad/leastSquaresGrad.C',
              'platforms/linuxArm64GccDPInt32Opt/lib/libfiniteVolume.so'):
        native[p]=sha(prefix/p)
    def verify_native():
        if any(sha(prefix/k)!=v for k,v in native.items()):raise ValueError('Native implementation drift')
    verify_native()
    result=dict(model=MODEL,timesS=TIMES.tolist(),steps=256,axialGrade=4.,halfAngleDeg=.5,
        sourceSHA256=json.loads((ROOT/'transfer.json').read_text()),referenceSHA256=json.loads((ROOT/'references.json').read_text()),
        nativeSHA256=native,runtime=dict(python=sys.version,numpy=np.__version__,scipy=__import__('scipy').__version__,skfem=__import__('skfem').__version__),
        cases=[],experimentalQualification=False,livePlaygroundQualified=False)
    for kind,n,nz,scheme in JOBS:
        name=label(kind,n,nz,scheme);print('START',name,flush=True);start=time.monotonic()
        row=dict(label=name,kind=kind,n=n,nz=nz,gradient=scheme)
        try:
            case=out/name;row['commands']=configure(case,n,nz,kind,scheme)
            row['inputSHA256']={str(p.relative_to(case)):sha(p) for p in case.rglob('*') if p.is_file()}
            row['commands'].append(command(case,['foamRun','-case',str(case)],environment(),'solver'))
            a,r,z,row['native']=native_packet(case,n,256,1.,axialCells=nz)
            fields=dict(native=a,nativeR=r,nativeZ=z)
            print('NATIVE COMPLETE',name,flush=True)
            if kind=='decay' and scheme=='Gauss linear':
                fields['v86'],row['v86']=own_packet(n,256,1.,axialCells=nz)
            if kind=='rigid':fields['gradU']=gradients(case,n,nz)
            packet=out/(name+'.npz');np.savez_compressed(packet,**fields)
            row.update(completed=True,packet=packet.name,packetSHA256=sha(packet))
        except Exception as error:row.update(completed=False,error=type(error).__name__+': '+str(error))
        row['wallSeconds']=time.monotonic()-start;result['cases'].append(row)
        (out/'predictions.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
        print('END',name,row.get('error','complete'),row['wallSeconds'],flush=True)
        verify_sources();verify_native()
        if not row['completed']:return 1
    return 0


if __name__=='__main__':
    if sys.platform!='linux' or os.getuid()!=1000:raise RuntimeError('Execute only inside safe-dev')
    raise SystemExit(main(Path(sys.argv[1])))
