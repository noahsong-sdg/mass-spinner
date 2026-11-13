"""Single-variable follow-ups; failed fields and solver logs are preserved."""
from sector96 import *


def main(out):
    verify_sources();native=native_identity();out.mkdir(exist_ok=False);rows=[]
    for steps,outer in ((512,1),(1024,1),(256,2),(256,4)):
        name=f's{steps}-o{outer}';row=dict(label=name,steps=steps,outer=outer);case=out/name
        try:
            row['commands']=configure(case,16,32,steps,'rigid','cyclic','leastSquares')
            path=case/'system/fvSolution';path.write_text(path.read_text().replace('PIMPLE {',f'PIMPLE {{nOuterCorrectors {outer};'))
            row['commands'].append(command(case,['foamRun','-case',str(case)],environment(),'solver'))
            a,r,z,row['native']=native_packet(case,16,steps,1.,axialCells=32)
            g=np.array([gradient(case,16,32,t) for t in TIMES]);np.savez_compressed(out/(name+'.npz'),native=a,nativeR=r,nativeZ=z,gradU=g)
            row.update(completed=True,frames=[dict(timeS=float(t),**gradient_metrics(g[i],16,32),maxSwirlChangeOverA=float(np.max(np.abs(a[i]-a[0]))/AMP)) for i,t in enumerate(TIMES)])
        except Exception as e:row.update(completed=False,error=type(e).__name__+': '+str(e))
        log=case/'solver.log'
        row['iterationLimitOccurrences']=log.read_text().count('No Iterations 1000') if log.exists() else None
        rows.append(row);(out/'stability.json').write_text(json.dumps(dict(sourceSHA256=json.loads((ROOT/'transfer.json').read_text()),nativeSHA256=native,cases=rows),indent=2,allow_nan=False)+'\n')
        print(json.dumps({k:v for k,v in row.items() if k!='commands'}),flush=True);verify_sources()
        if native_identity()!=native:raise ValueError('Native implementation drift')
    return 0


if __name__=='__main__':
    if sys.platform!='linux' or os.getuid()!=1000:raise RuntimeError('Execute only inside safe-dev')
    raise SystemExit(main(Path(sys.argv[1])))
