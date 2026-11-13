"""Registered native cyclic-sector evolution and unchanged custom comparison."""
from sector96 import *


def main(out):
    verify_sources();native=native_identity();out.mkdir(exist_ok=False)
    probe=json.loads(Path('probes-results/probes.json').read_text())
    candidate=[r for r in probe['cases'] if (r['boundary'],r['scheme'],r['halfAngleDeg'])==('cyclic','leastSquares',.5)]
    if len(candidate)!=1 or not candidate[0]['completed'] or candidate[0]['maxStrainOverOmega']>=1e-6:
        raise ValueError('Registered initial candidate gate must pass before evolution')
    if probe['sourceSHA256']!=json.loads((ROOT/'transfer.json').read_text()) or probe['nativeSHA256']!=native:
        raise ValueError('Probe identity mismatch')
    result=dict(model=MODEL,candidate=CANDIDATE,scheme='leastSquares',timesS=TIMES.tolist(),axialGrade=4.,halfAngleDeg=.5,
        sourceSHA256=json.loads((ROOT/'transfer.json').read_text()),referenceSHA256=json.loads((ROOT/'references.json').read_text()),nativeSHA256=native,
        runtime=dict(python=sys.version,numpy=np.__version__,scipy=__import__('scipy').__version__,skfem=__import__('skfem').__version__),
        cases=[],coupledReleaseQualified=False,experimentalQualification=False,livePlaygroundQualified=False)
    for kind,n,nz,steps in JOBS:
        name=label(kind,n,nz,steps);print('START',name,flush=True);start=time.monotonic()
        row=dict(label=name,kind=kind,n=n,nz=nz,steps=steps)
        try:
            case=out/name;row['commands']=configure(case,n,nz,steps,kind,CANDIDATE,'leastSquares')
            row['inputSHA256']={str(p.relative_to(case)):sha(p) for p in case.rglob('*') if p.is_file()}
            row['commands'].append(command(case,['foamRun','-case',str(case)],environment(),'solver'))
            a,r,z,row['native']=native_packet(case,n,steps,1.,axialCells=nz)
            fields=dict(native=a,nativeR=r,nativeZ=z)
            if kind=='rigid':fields['gradU']=np.array([gradient(case,n,nz,t) for t in TIMES])
            else:fields['v86'],row['v86']=own_packet(n,steps,1.,axialCells=nz)
            packet=out/(name+'.npz');np.savez_compressed(packet,**fields)
            row.update(completed=True,packet=packet.name,packetSHA256=sha(packet))
        except Exception as e:row.update(completed=False,error=type(e).__name__+': '+str(e))
        row['wallSeconds']=time.monotonic()-start;result['cases'].append(row)
        (out/'predictions.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
        print('END',name,row.get('error','complete'),row['wallSeconds'],flush=True)
        verify_sources()
        if native_identity()!=native:raise ValueError('Native implementation drift')
        if not row['completed']:return 1
    return 0


if __name__=='__main__':
    if sys.platform!='linux' or os.getuid()!=1000:raise RuntimeError('Execute only inside safe-dev')
    raise SystemExit(main(Path(sys.argv[1])))
