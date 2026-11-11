"""Prespecified nonlinear/linear gas transport studies; execute in safe-dev."""
from pathlib import Path
import gzip,hashlib,importlib.util,json,platform,subprocess,sys
import numpy as np
from scipy.special import j1,jn_zeros
from model import run_case


def cases():
    base=dict(radiusM=.12,lengthM=.8,thicknessM=.001,pressurePa=1000.,referenceK=500.,
              gas='helium4',alpha=.5,wallMaterial='tungsten',coolingWK=0.,coolantK=500.,
              constantTransport=False,gasCells=32,wallCells=8,steps=160,durationS=.08)
    result=[]
    def add(name,kind,gasK=800.,solid=500.,**changes):
        c={**base,**changes};result.append(dict(name=name,caseKind=kind,config=c,initial=dict(gasK=gasK,solidK=solid)))
    add('equilibrium','invariant',gasK=500.)
    add('insulated','invariant',alpha=0.)
    for n,nt in ((16,80),(32,160),(64,320)):
        add(f'joint-{n}','refinement',gasCells=n,wallCells=n//4,steps=nt)
    for n,nt in ((16,80),(32,160),(64,320),(128,640),(256,1280),(512,2560)):
        edges=np.linspace(0,1,n+1)**2
        # Exact shell average of (1-a)^2 in reference enclosed-number fraction a.
        mode=1-(edges[:-1]+edges[1:])+(edges[:-1]**2+edges[:-1]*edges[1:]+edges[1:]**2)/3
        add(f'smooth-{n}','smooth-initial-profile',gasK=(500.+300.*mode).tolist(),gasCells=n,wallCells=n//4,steps=nt)
    for nt in (80,160,320):add(f'time-{nt}','timestep',gasCells=64,wallCells=16,steps=nt)
    for alpha in (.1,.5,1.):add(f'alpha-{alpha}','unknown-tungsten-accommodation',alpha=alpha,gasCells=64,steps=320)
    for alpha in (.44,.46,.48):
        add(f'ambient-ss-{alpha}','surface-specific-conditional',gasK=300.1,solid=300.,referenceK=300.,
            coolantK=300.,alpha=alpha,wallMaterial='constant',wallDensityKgM3=7900.,wallCpJKgK=477.,wallKWMK=14.9)
    for pressure in (10.,100.,1000.):
        add(f'pressure-{pressure}','regime-sensitivity',pressurePa=pressure,gasK=501.,constantTransport=True)
    add('lithium-proxy','unqualified-lithium-proxy',gasK=800.,gasCells=64,steps=320,gas='lithium')
    for amplitude in (.1,.01,.001):
        add(f'linear-{amplitude}','fipy-small-amplitude',gasK=500.+amplitude,wallMaterial='constant',
            wallDensityKgM3=7900.,wallCpJKgK=477.,wallKWMK=14.9,constantTransport=True,gasCells=32,steps=160)
    for n,nt in ((16,80),(32,160),(64,320)):
        c={**base,'gasCells':n,'steps':nt,'durationS':.01,'alpha':0.,'constantTransport':True}
        edges=np.linspace(0,c['radiusM'],n+1);z=float(jn_zeros(1,1)[0]);w=z/c['radiusM']
        mode=2*np.diff(edges*j1(w*edges))/(w*np.diff(edges**2))
        result.append(dict(name=f'eigen-{n}',caseKind='exact-neumann-small-amplitude',config=c,
                           initial=dict(gasK=(500.+.001*mode).tolist(),solidK=500.)))
    return result


if __name__=='__main__':
    out=Path(sys.argv[1]);out.mkdir(exist_ok=False)
    packet={'cases':cases(),'scope':'nonrotating pure monatomic low-Mach; not rotor coupling or device calibration'}
    (out/'packet.json').write_text(json.dumps(packet,indent=2,allow_nan=False))
    results=[run_case(case) for case in packet['cases']]
    with gzip.open(out/'results.json.gz','wt') as stream:json.dump({'cases':results},stream,allow_nan=False,separators=(',',':'))
    spec=importlib.util.spec_from_file_location('fipy_reference',Path(__file__).with_name('reference-fipy.py'))
    fipy=importlib.util.module_from_spec(spec);spec.loader.exec_module(fipy)
    references=[fipy.run(case) for case in packet['cases'] if case['caseKind']=='fipy-small-amplitude']
    (out/'fipy.json').write_text(json.dumps({'cases':references},allow_nan=False,separators=(',',':')))
    environment={'python':platform.python_version(),'fipy':fipy.fipy.__version__,
                 'pipFreeze':subprocess.check_output([sys.executable,'-m','pip','freeze'],text=True),
                 'sourceSHA256':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in Path(__file__).parent.glob('*.py')},
                 'inputSHA256':hashlib.sha256((out/'packet.json').read_bytes()).hexdigest(),
                 'resultsSHA256':hashlib.sha256((out/'results.json.gz').read_bytes()).hexdigest()}
    (out/'environment.json').write_text(json.dumps(environment,indent=2))
    print(json.dumps({'cases':len(results),'acceptedSteps':sum(len(r['states'])-1 for r in results),
                      'fipyCases':len(references),'maxScaledResidual':max(r['maximumScaledResidual'] for r in results),
                      'environment':environment},indent=2))
