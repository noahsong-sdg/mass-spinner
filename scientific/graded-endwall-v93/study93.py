"""Five frozen pairs; only the mesh and declared timestep vary."""
import json,os,sys,time
from pathlib import Path
import numpy as np

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scientific/endwall-v91'))
from candidate91 import evolve
from reference90 import environment,make_case,command,native_packet,read_field,geometry,END,RHO,initial
from score93 import GRADE,JOBS,label,verify_sources,sha


def main():
    if sys.platform!='linux' or os.getuid()!=1000:raise RuntimeError('Scientific execution requires safe-dev')
    verify_sources()
    old=Path('/work/project/v92-wall-source02/scientific/wall-transient-v92/study-results/predictions.json')
    native=json.loads(old.read_text())['nativeSHA256'];prefix=Path(environment()['WM_PROJECT_DIR'])
    def verify_native():
        if any(sha(prefix/k)!=v for k,v in native.items()):raise ValueError('Native implementation drift')
    verify_native();out=Path(sys.argv[1]);out.mkdir(exist_ok=False)
    result=dict(sourceSHA256=json.loads((ROOT/'transfer.json').read_text()),
        referenceSHA256=json.loads((ROOT/'references.json').read_text()),nativeSHA256=native,
        runtime=dict(python=sys.version,numpy=np.__version__,scipy=__import__('scipy').__version__,skfem=__import__('skfem').__version__),
        cases=[],experimentalQualification=False)
    for n,steps in JOBS:
        name=label(n,steps);print('START',name,flush=True);start=time.monotonic()
        row=dict(label=name,n=n,steps=steps,axialGrade=GRADE,halfAngleDeg=.5,stressWork=True)
        try:
            f=geometry(n,axialGrade=GRADE,noSlipWalls=True)
            r,z=np.meshgrid(f.mean_r,(f.z[:-1]+f.z[1:])/2);t,u=initial(r,z)
            dt=END/steps;bound=f.stable_dt(f.state(RHO,t,.5,u/r),cfl=.5)
            if dt>bound:raise ValueError('Initial graded acoustic CFL violation')
            row.update(initialCFLMargin=float(bound/dt),endwallCellM=float(np.diff(f.z)[-1]))
            case=out/name;row['commands']=make_case(case,n,steps,.5,axialGrade=GRADE)
            centres=read_field(case/'0/C',f.count,3)
            from reference90 import native_order
            order=native_order(f,centres)
            np.testing.assert_allclose(centres[order,2].reshape(f.volume.shape),z,rtol=0,atol=1e-13)
            delta=np.deg2rad(.5);volume=read_field(case/'0/Vc',f.count)[order].reshape(f.volume.shape)*np.pi/delta
            np.testing.assert_allclose(volume,f.volume*np.sin(2*delta)/(2*delta),rtol=1e-11)
            row['inputSHA256']={str(p.relative_to(case)):sha(p) for p in case.rglob('*') if p.is_file()}
            row['commands'].append(command(case,['foamRun','-case',str(case)],environment(),'solver'))
            a,row['native']=native_packet(case,n,steps,.5,axialGrade=GRADE)
            print('NATIVE COMPLETE',name,flush=True)
            b,row['v86']=evolve(n,steps,axialGrade=GRADE)
            packet=out/(name+'.npz');np.savez_compressed(packet,native=a,v86=b)
            row.update(completed=True,packet=packet.name,packetSHA256=sha(packet))
        except Exception as error:row.update(completed=False,error=type(error).__name__+': '+str(error))
        row['wallSeconds']=time.monotonic()-start;result['cases'].append(row)
        (out/'predictions.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
        print('END',name,row.get('error','complete'),row['wallSeconds'],flush=True)
        verify_sources();verify_native()
        if not row['completed']:return 1
    return 0


if __name__=='__main__':raise SystemExit(main())
