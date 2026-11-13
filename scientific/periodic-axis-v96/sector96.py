"""Guest-only native boundary diagnostics; no custom CFD operator."""
import json,os,re,sys,time
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scientific/radial-axis-v95'))
from study95 import (geometry,make_control,native_packet,own_packet,read_field,native_order,
    field,command,environment,sha,verify_sources,AMP,R,H,RATE,TIMES,mode)
from score95 import strain,error

CANDIDATE='cyclic'
MODEL='periodic-axis-v96'
SCHEMES=('Gauss linear','leastSquares')
PROBES=tuple((b,s,a) for b,angles in [('wedge',(.5,.25,.125)),('cyclic',(.5,)),('exact',(.5,))]
             for a in angles for s in SCHEMES)
JOBS=tuple(('rigid',n,2*n,256) for n in (16,32,64))+tuple(('rigid',64,128,s) for s in (128,512))
JOBS+=tuple(('decay',n,128,256) for n in (32,64,128))+tuple(('decay',64,128,s) for s in (128,512))
label=lambda kind,n,nz,steps:f'{kind}-r{n}-z{nz}-s{steps}'


def face_values(case,patch):
    raw=(case/'0/C').read_text().split('boundaryField',1)[1]
    block=re.search(r'\b'+patch+r'\s*\{([^}]+)\}',raw,re.S)
    if not block:raise ValueError('Missing face-centre patch')
    values=re.search(r'value\s+nonuniform\s+List<vector>\s+(\d+)\s*\((.*?)\)\s*;',block[1],re.S)
    if not values:raise ValueError('Need native face-centre values')
    vectors=np.array([float(v) for v in re.findall(r'[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?',values[2])])
    return vectors.reshape(int(values[1]),3)


def configure(case,n,nz,steps,kind,boundary,scheme,angle=.5):
    if boundary not in ('wedge','cyclic','exact') or scheme not in SCHEMES or kind not in ('rigid','decay'):
        raise ValueError('Unknown registered configuration')
    if boundary=='exact' and kind!='rigid':raise ValueError('Prescribed faces are diagnostic only')
    calls=make_control(case,n,steps,1.,axialCells=nz)
    path=case/'system/blockMeshDict';raw=path.read_text();delta=np.deg2rad(angle);x,y=R*np.cos(delta),R*np.sin(delta)
    vertices=[(0,0,0),(x,-y,0),(x,y,0),(0,0,0),(0,0,H),(x,-y,H),(x,y,H),(0,0,H)]
    raw=re.sub(r'vertices\s*\(.*?\);','vertices ('+' '.join('('+' '.join(map(str,v))+')' for v in vertices)+');',raw,flags=re.S)
    for patch,other in [('minus','plus'),('plus','minus')]:
        mesh_type=('cyclic; neighbourPatch '+other+'; transformType rotational; rotationAxis (0 0 1); rotationCentre (0 0 0);'
                   if boundary=='cyclic' else 'patch;' if boundary=='exact' else 'wedge;')
        raw=raw.replace(patch+' {type wedge;',patch+' {type '+mesh_type)
        for name in ('U','p','T','rho'):
            f=case/'0'/name
            f.write_text(f.read_text().replace(patch+' {type wedge;}',patch+' {type '+('cyclic' if boundary=='cyclic' else 'zeroGradient' if boundary=='exact' else 'wedge')+';}'))
    path.write_text(raw)
    for args,name in [(['blockMesh'],'sector-mesh'),(['checkMesh'],'sector-check'),(['foamPostProcess','-func','writeCellCentres','-time','0'],'sector-centres'),(['foamPostProcess','-func','writeCellVolumes','-time','0'],'sector-volumes')]:
        calls.append(command(case,[args[0],'-case',str(case),*args[1:]],environment(),name))
    f=geometry(n,axialGrade=4.,axialCells=nz);c=read_field(case/'0/C',f.count,3);r=np.hypot(c[:,0],c[:,1]);omega=AMP/R
    speed=omega*r if kind=='rigid' else AMP*mode(r,c[:,2])
    u=np.column_stack((-speed*c[:,1]/r,speed*c[:,0]/r,np.zeros(f.count)))
    common='midplane {type symmetryPlane;} axis {type empty;} '
    for patch in ('minus','plus'):
        if boundary=='exact':
            cf=face_values(case,patch);uf=np.column_stack((-omega*cf[:,1],omega*cf[:,0],np.zeros(len(cf))))
            values=' '.join('('+' '.join(f'{v:.17g}' for v in row)+')' for row in uf)
            common+=f'{patch} {{type fixedValue; value nonuniform List<vector> {len(uf)} ({values});}} '
        else:common+=patch+' {type '+boundary+';} '
    wall=(f'walls {{type rotatingWallVelocity; origin (0 0 0); axis (0 0 1); omega {omega:.17g};}} '
          if kind=='rigid' else 'walls {type fixedValue; value uniform (0 0 0);} ')
    field(case/'0/U',u,'0 1 -1 0 0 0 0',wall+common,'volVectorField')
    pcommon='midplane {type symmetryPlane;} axis {type empty;} '+''.join(p+' {type '+('cyclic' if boundary=='cyclic' else 'zeroGradient' if boundary=='exact' else 'wedge')+';} ' for p in ('minus','plus'))
    field(case/'0/p',.5*omega**2*r**2 if kind=='rigid' else np.zeros(f.count),'0 2 -2 0 0 0 0','walls {type zeroGradient;} '+pcommon,'volScalarField')
    path=case/'system/fvSchemes';path.write_text(path.read_text().replace('default Gauss linear;}',f'default {scheme};}}',1))
    path=case/'system/controlDict'
    path.write_text(path.read_text()+'functions {gradient {type grad; libs ("libfieldFunctionObjects.so"); field U; result gradU; executeControl writeTime; writeControl writeTime;}}\n')
    calls.append(command(case,['foamPostProcess','-case',str(case),'-func','grad(U)','-time','0'],environment(),'initial-gradient'))
    return calls


def gradient(case,n,nz,t):
    f=geometry(n,axialGrade=4.,axialCells=nz);c=read_field(case/'0/C',f.count,3);order=native_order(f,c)
    dirs=[p for p in case.iterdir() if p.is_dir() and p.name[0].isdigit() and abs(float(p.name)-t)<1e-16]
    if len(dirs)!=1:raise ValueError('Gradient clock mismatch')
    return read_field(dirs[0]/('grad(U)' if not t else 'gradU'),f.count,9)[order].reshape(nz,n,3,3)


def gradient_metrics(g,n,nz):
    f=geometry(n,axialGrade=4.,axialCells=nz);omega=AMP/R
    exact=omega*np.array([[0.,1.,0.],[-1.,0.,0.],[0.,0.,0.]])
    q=np.sqrt(np.sum(strain(g)**2,axis=(-2,-1)))/omega
    return dict(maxStrainOverOmega=float(q.max()),rmsStrainOverOmega=float(np.sqrt(np.sum(f.volume*q*q)/f.volume.sum())),
        axisStrainOverOmega=float(q[:,0].max()),maxGradientErrorOverOmega=float(np.max(np.sqrt(np.sum((g-exact)**2,axis=(-2,-1))))/omega))


def native_identity():
    p=Path(environment()['WM_PROJECT_DIR'])
    old=Path('/work/project/v95-axis-source03/scientific/radial-axis-v95/study-results/predictions.json')
    result=json.loads(old.read_text())['nativeSHA256']
    extra=['src/finiteVolume/fields/fvPatchFields/constraint/wedge/wedgeFvPatchField.C',
        'src/finiteVolume/fvMesh/fvPatches/constraint/cyclic/cyclicFvPatch.C',
        'src/finiteVolume/fields/fvPatchFields/constraint/cyclic/cyclicFvPatchField.C',
        'src/finiteVolume/finiteVolume/gradSchemes/gaussGrad/gaussGrad.C',
        'src/finiteVolume/finiteVolume/gradSchemes/leastSquaresGrad/leastSquaresVectors.C']
    if any(sha(p/k)!=v for k,v in result.items()):raise ValueError('Native V95 identity drift')
    return result|{k:sha(p/k) for k in extra}


def probes(out):
    verify_sources();out.mkdir(exist_ok=False);native=native_identity()
    result=dict(model=MODEL,cases=[],nativeSHA256=native,sourceSHA256=json.loads((ROOT/'transfer.json').read_text()))
    for boundary,scheme,angle in PROBES:
        name=boundary+'-'+scheme.replace(' ','-')+'-'+str(angle);row=dict(label=name,boundary=boundary,scheme=scheme,halfAngleDeg=angle)
        case=out/name
        try:
            row['commands']=configure(case,16,32,256,'rigid',boundary,scheme,angle)
            g=gradient(case,16,32,0.);np.savez_compressed(out/(name+'.npz'),gradient=g)
            row.update(completed=True,**gradient_metrics(g,16,32))
        except Exception as e:row.update(completed=False,error=type(e).__name__+': '+str(e))
        result['cases'].append(row);(out/'probes.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
        print(json.dumps({k:v for k,v in row.items() if k!='commands'}),flush=True);verify_sources()
        if native_identity()!=native:raise ValueError('Native implementation drift')
    return int(not all(r['completed'] for r in result['cases']))


if __name__=='__main__':
    if sys.platform!='linux' or os.getuid()!=1000:raise RuntimeError('Execute only inside safe-dev')
    raise SystemExit(probes(Path(sys.argv[1])))
