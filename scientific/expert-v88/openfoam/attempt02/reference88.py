"""Guest-only native OpenFOAM cylindrical controls; independent analytic scoring."""
import hashlib,json,os,re,resource,subprocess,time,zipfile,sys
from pathlib import Path
import numpy as np
from scipy.special import jn_zeros,jv
import scipy

HERE=Path(__file__).resolve().parent
R,H,RHO,MU=.06,.24,.001,.000114
KB,M=1.380649e-23,39.948*1.66053906660e-27
CV=1.5*KB/M; K=15*KB*MU/(4*M); NU=MU/RHO; ALPHA=K/(RHO*CV)
CHI=float(jn_zeros(1,1)[0]); LAMBDA=(CHI/R)**2+(np.pi/H)**2
END=.2/(NU*LAMBDA); AMP=1e-4*NU/R
NUMBER=r'[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?'


def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()


def read_field(path,count,width=1):
    raw=path.read_text()
    found=re.search(r'internalField\s+nonuniform\s+List<\w+>\s+(\d+)\s*\((.*?)\)\s*;',raw,re.S)
    if found:
        values=np.array([float(v) for v in re.findall(NUMBER,found[2])])
        if int(found[1])!=count or values.size!=count*width: raise ValueError('Field count mismatch: '+str(path))
        return values.reshape(count,width).squeeze() if width==1 else values.reshape(count,width)
    found=re.search(r'internalField\s+uniform\s+([^;]+);',raw)
    if found:
        values=np.array([float(v) for v in re.findall(NUMBER,found[1])])
        if values.size==width: return np.tile(values,(count,1)).squeeze() if width==1 else np.tile(values,(count,1))
    raise ValueError('Unsupported field: '+str(path))


def dictionary(path,body,kind='dictionary'):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(f'FoamFile {{ format ascii; class {kind}; object {path.name}; }}\n'+body+'\n')


def field(path,value,dimensions,boundary,kind):
    values=np.asarray(value); vector=values.ndim==2
    entries=['('+ ' '.join(f'{v:.17g}' for v in row)+')' if vector else f'{row:.17g}' for row in values]
    body=f'dimensions [{dimensions}];\ninternalField nonuniform List<{"vector" if vector else "scalar"}>\n{len(values)}\n(\n'
    dictionary(path,body+'\n'.join(entries)+'\n);\nboundaryField { '+boundary+' }',kind)


def environment():
    prefix=Path('/work/project/tools/opt/openfoam14'); binary=prefix/'platforms/linuxArm64GccDPInt32Opt'
    env=os.environ.copy(); env.update(WM_PROJECT_DIR=str(prefix),WM_PROJECT_VERSION='14',FOAM_ETC=str(prefix/'etc'),
        FOAM_LIBBIN=str(binary/'lib'),LD_LIBRARY_PATH=str(binary/'lib/dummy')+':'+str(binary/'lib'),
        PATH=str(binary/'bin')+':'+str(prefix/'bin')+':'+env['PATH'])
    return env


def command(case,args,env,name):
    start=time.monotonic(); proc=subprocess.run(args,env=env,capture_output=True,text=True)
    (case/(name+'.log')).write_text(proc.stdout+proc.stderr)
    receipt=dict(args=args,exitCode=proc.returncode,wallSeconds=time.monotonic()-start)
    if proc.returncode: raise RuntimeError(json.dumps(receipt)+' see '+name+'.log')
    return receipt


def create_case(case,mode,n,steps,angle,amplitude,env):
    delta=np.deg2rad(angle); x,y=R*np.cos(delta),R*np.sin(delta)
    vertices=[(0,0,0),(x,-y,0),(x,y,0),(0,0,0),(0,0,H),(x,-y,H),(x,y,H),(0,0,H)]
    text='vertices ('+' '.join('('+' '.join(f'{x:.17g}' for x in v)+')' for v in vertices)+');\n'
    text+=f'blocks (hex (0 1 2 3 4 5 6 7) ({n} 1 {2*n}) simpleGrading (1 1 1));\n'
    text+='boundary (walls {type wall; faces ((1 5 6 2)(0 3 2 1)(4 5 6 7));}'
    text+=' minus {type wedge; faces ((0 1 5 4));} plus {type wedge; faces ((3 7 6 2));}'
    text+=' axis {type empty; faces ((0 4 7 3));});'
    dictionary(case/'system/blockMeshDict',text)
    funcs='centres {type writeCellCentres; libs ("libfieldFunctionObjects.so");}'
    funcs+=' volumes {type writeCellVolumes; libs ("libfieldFunctionObjects.so");}'
    if mode=='swirl':
        funcs+=' gradient {type grad; libs ("libfieldFunctionObjects.so"); field U; result gradU;}'
        funcs+=f' torque {{type forces; libs ("libforces.so"); patches (walls); rho rhoInf; rhoInf {RHO}; CofR (0 0 0);}}'
    dictionary(case/'system/controlDict',f'application {"laplacianFoam" if mode=="heat" else "foamRun"}; solver incompressibleFluid;'
        f' startFrom startTime; startTime 0; stopAt endTime; endTime {END:.17g}; deltaT {END/steps:.17g};'
        ' writeControl timeStep; writeInterval 1; writeFormat ascii; writePrecision 16; writeCompression off;'
        ' timeFormat general; timePrecision 16; runTimeModifiable false; adjustTimeStep no; functions {'+funcs+'}')
    dictionary(case/'system/fvSchemes','ddtSchemes {default Euler;} gradSchemes {default Gauss linear;}'
        ' divSchemes {default none; div(phi,U) Gauss linear; div((nuEff*dev2(T(grad(U))))) Gauss linear;}'
        ' laplacianSchemes {default Gauss linear corrected;} interpolationSchemes {default linear;} snGradSchemes {default corrected;}')
    dictionary(case/'system/fvSolution','solvers { p {solver PCG; preconditioner DIC; tolerance 1e-14; relTol 0;}'
        ' pFinal {$p;} U {solver smoothSolver; smoother symGaussSeidel; tolerance 1e-14; relTol 0;}'
        ' T {solver PCG; preconditioner DIC; tolerance 1e-14; relTol 0;} }'
        ' PIMPLE {nCorrectors 2; nNonOrthogonalCorrectors 1; pRefCell 0; pRefValue 0;}'
        ' SIMPLE {nNonOrthogonalCorrectors 1;}')
    dictionary(case/'constant/physicalProperties',f'DT [0 2 -1 0 0 0 0] {ALPHA:.17g};' if mode=='heat'
               else f'viscosityModel constant; nu {NU:.17g} [m^2/s];')
    dictionary(case/'constant/momentumTransport','simulationType laminar;')
    common='minus {type wedge;} plus {type wedge;} axis {type empty;}'
    count=n*2*n
    field(case/'0/T',np.full(count,2900.),'0 0 0 1 0 0 0','walls {type zeroGradient;} '+common,'volScalarField')
    field(case/'0/p',np.zeros(count),'0 2 -2 0 0 0 0','walls {type zeroGradient;} '+common,'volScalarField')
    field(case/'0/U',np.zeros((count,3)),'0 1 -1 0 0 0 0','walls {type fixedValue; value uniform (0 0 0);} '+common,'volVectorField')
    calls=[command(case,['blockMesh','-case',str(case)],env,'mesh'),command(case,['checkMesh','-case',str(case)],env,'check-mesh')]
    for fun in ('writeCellCentres','writeCellVolumes'):
        calls.append(command(case,['foamPostProcess','-case',str(case),'-func',fun,'-time','0'],env,fun))
    c=read_field(case/'0/C',count,3); volume=read_field(case/'0/Vc',count); radial=np.hypot(c[:,0],c[:,1])
    if mode=='heat':
        values=2900+100*jv(0,CHI*radial/R)*np.cos(np.pi*c[:,2]/H)
        field(case/'0/T',values,'0 0 0 1 0 0 0','walls {type zeroGradient;} '+common,'volScalarField')
    else:
        speed=amplitude*jv(1,CHI*radial/R)*np.sin(np.pi*c[:,2]/H)
        values=np.column_stack((-speed*c[:,1]/radial,speed*c[:,0]/radial,np.zeros(count)))
        field(case/'0/U',values,'0 1 -1 0 0 0 0','walls {type fixedValue; value uniform (0 0 0);} '+common,'volVectorField')
    return c,volume,calls


def weighted_error(a,b,volume):
    return float(np.sqrt(np.sum(volume*(a-b)**2)/np.sum(volume*b*b)))


def inspect(case,mode,c,volume,steps,angle,amplitude):
    dirs=sorted((p for p in case.iterdir() if p.is_dir() and re.fullmatch(NUMBER,p.name)),key=lambda p:float(p.name))
    if len(dirs)!=steps+1: raise ValueError('Unexpected saved timestep count')
    radius=np.hypot(c[:,0],c[:,1]); times=np.array([float(p.name) for p in dirs])
    if not np.allclose(np.diff(times),END/steps,rtol=1e-10,atol=0) or abs(times[-1]/END-1)>1e-12: raise ValueError('Clock mismatch')
    rows=[]; previous=None; integrated=0.; damping=0.
    for directory,t in zip(dirs,times):
        if mode=='heat':
            value=read_field(directory/'T',len(volume)); exact=100*jv(0,CHI*radius/R)*np.cos(np.pi*c[:,2]/H)*np.exp(-ALPHA*LAMBDA*t)
            row=dict(timeS=t,heatJ=float(RHO*CV*np.sum(volume*value)),minimumK=float(value.min()),error=weighted_error(value-2900,exact,volume))
        else:
            u=read_field(directory/'U',len(volume),3); value=(-u[:,0]*c[:,1]+u[:,1]*c[:,0])/radius
            exact=amplitude*jv(1,CHI*radius/R)*np.sin(np.pi*c[:,2]/H)*np.exp(-NU*LAMBDA*t)
            if previous is not None:
                grad=read_field(directory/'gradU',len(volume),9).reshape(-1,3,3)
                strain=(grad+grad.transpose(0,2,1))/2; strain-=np.eye(3)*np.trace(strain,axis1=1,axis2=2)[:,None,None]/3
                integrated+=float(2*MU*np.sum(volume*np.sum(strain*strain,axis=(1,2)))*END/steps)
                damping+=float(.5*RHO*np.sum(volume*np.sum((u-previous)**2,axis=1)))
            row=dict(timeS=t,kineticJ=float(.5*RHO*np.sum(volume*np.sum(u*u,axis=1))),
                angularKgM2S=float(RHO*np.sum(volume*radius*value)),dissipationJ=integrated,numericalDefectJ=damping,
                meridionalOverAmplitude=float(np.max(np.sqrt((u[:,0]*c[:,0]/radius+u[:,1]*c[:,1]/radius)**2+u[:,2]**2))/amplitude),
                error=weighted_error(value,exact,volume))
            previous=u
        if not all(np.isfinite(v) for v in row.values()): raise ValueError('Nonfinite result')
        rows.append(row)
    result=dict(history=rows,finalField=value.tolist(),volume=volume.tolist(),positions=c.tolist(),analyticError=rows[-1]['error'])
    if mode=='heat': result['heatRelativeDrift']=max(abs(r['heatJ']/rows[0]['heatJ']-1) for r in rows)
    else:
        force=next((case/'postProcessing/torque').rglob('forces.dat'))
        data=[np.array([float(v) for v in re.findall(NUMBER,line)]) for line in force.read_text().splitlines() if line and not line.startswith('#')]
        if len(data)!=steps or any(len(v)!=13 for v in data): raise ValueError('Unexpected native force columns/count')
        torque=np.array([v[-1]+v[-4] for v in data]); impulse=float(np.sum(torque)*END/steps)
        loss=rows[0]['angularKgM2S']-rows[-1]['angularKgM2S']; keloss=rows[0]['kineticJ']-rows[-1]['kineticJ']
        analyticL=RHO*2*np.deg2rad(angle)*amplitude*R**3*jv(2,CHI)/CHI*2*H/np.pi
        analyticK=RHO*2*np.deg2rad(angle)*amplitude**2*R**2*H*jv(2,CHI)**2/8
        result.update(wallImpulseKgM2S=impulse,angularBudgetRelative=abs(impulse-loss)/abs(loss),
            energyBudgetRelative=abs(integrated+damping-keloss)/abs(keloss),energyMonotone=all(b['kineticJ']<=a['kineticJ']*(1+1e-12) for a,b in zip(rows,rows[1:])),
            maxMeridionalOverAmplitude=max(r['meridionalOverAmplitude'] for r in rows),
            analyticInitialAngularKgM2S=float(analyticL),analyticInitialKineticJ=float(analyticK),
            initialAngularRelativeError=float(rows[0]['angularKgM2S']/analyticL-1),initialKineticRelativeError=float(rows[0]['kineticJ']/analyticK-1))
    result['wedgeVolumeRelativeError']=float(np.sum(volume)/(2*np.deg2rad(angle)*R*R*H/2)-1)
    return result


def main():
    env=environment(); result=HERE/'results'; result.mkdir(exist_ok=True)
    sealed={name:sha(HERE/name) for name in ('reference88.py','PROTOCOL.md','audit88.py','test_reference88.py')}
    binary=Path(env['WM_PROJECT_DIR'])/'platforms/linuxArm64GccDPInt32Opt/bin'
    output=dict(sourceSHA256=sealed,versions=dict(python=sys.version,numpy=np.__version__,scipy=scipy.__version__),
        executedBinarySHA256={name:sha(binary/name) for name in ('laplacianFoam','foamRun','blockMesh','checkMesh','foamPostProcess')},
        constants=dict(radiusM=R,lengthM=H,densityKgM3=RHO,muPaS=MU,cvJKgK=CV,kWmK=K,
        nuM2S=NU,alphaM2S=ALPHA,chi=CHI,lambdaM2=LAMBDA,endS=END,amplitudeMPS=AMP),cases=[],experimentalQualification=False,fullV86Qualified=False)
    jobs=[(n,128,.5,1.) for n in (8,16,32)]+[(32,s,.5,1.) for s in (64,256)]+[(16,128,.25,1.)]
    for mode in ('heat','swirl'):
        for n,steps,angle,scale in jobs+([(32,128,.5,.5)] if mode=='swirl' else []):
            label=f'{mode}-n{n}-s{steps}-a{angle}-x{scale}'; case=HERE/'.cache'/label
            row=dict(label=label,mode=mode,n=n,steps=steps,halfAngleDeg=angle,amplitudeScale=scale)
            print('START',label,flush=True)
            try:
                c,v,calls=create_case(case,mode,n,steps,angle,AMP*scale,env)
                row['inputSHA256']={str(p.relative_to(case)):sha(p) for p in case.rglob('*') if p.is_file()}
                row['commands']=calls+[command(case,[('laplacianFoam' if mode=='heat' else 'foamRun'),'-case',str(case)],env,'solver')]
                row.update(completed=True,**inspect(case,mode,c,v,steps,angle,AMP*scale))
            except Exception as error: row.update(completed=False,error=type(error).__name__+': '+str(error))
            archive=result/(label+'.zip')
            with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as packed:
                for p in sorted(case.rglob('*')):
                    if p.is_file(): packed.write(p,str(p.relative_to(case)))
            row['archive']=dict(path=archive.name,sha256=sha(archive),bytes=archive.stat().st_size)
            output['cases'].append(row)
            (result/'predictions.json').write_text(json.dumps(output,indent=2,allow_nan=False)+'\n')
            print('END',label,row.get('analyticError',row.get('error')),flush=True)
            if not row['completed']: break
    if sealed!={name:sha(HERE/name) for name in sealed}: raise ValueError('Producer source changed')
    output['peakChildRSSKiB']=resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss
    (result/'predictions.json').write_text(json.dumps(output,indent=2,allow_nan=False)+'\n')


if __name__=='__main__': main()
