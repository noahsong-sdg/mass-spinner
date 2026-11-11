"""Independent FiPy refinement; spatial and time changes are never mixed.

No production output is input. Requires reference-fipy.py beside this script.
Run only in safe-dev; results qualify these cases, not the entire slider domain.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import numpy as np
from scipy.optimize import brentq
from scipy.special import jv,yv

path = Path(__file__).with_name('reference-fipy.py')
spec = importlib.util.spec_from_file_location('thermal_fipy_reference', path)
reference = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reference)


def case(cells, steps):
    config = {'radiusM':.12, 'lengthM':.5, 'thicknessM':.03,
              'cells':cells, 'gasCapacityJK':30., 'gasWallWK':400.,
              'coolingWK':10000., 'coolantK':400.}
    return {'name':f'nonlinear-cooling-n{cells}-steps{steps}', 'config':config,
            'initial':{'gasK':700., 'wallK':[1400.]*cells},
            'steps':[{'dtS':2./steps, 'gasEnergyJ':(2./steps)*2500.,
                      'linerEnergyJ':(2./steps)*10000.} for _ in range(steps)]}


def endpoint(result):
    state = result['states'][-1]
    return np.array([state['gasK'], *state['wallK']])


def bessel_checks():
    """Annular insulated eigenmode: exact continuum eigenfunction/time law.

    We compare spatial refinement with the exact backward-Euler amplification
    of the continuum eigenmode, so its time truncation error cannot masquerade
    as a spatial-convergence floor. The separate temporal study uses fixed mesh.
    """
    ri,ro=.12,.15
    determinant=lambda mu:jv(1,mu*ro)*yv(1,mu*ri)-yv(1,mu*ro)*jv(1,mu*ri)
    mu=brentq(determinant,.5*np.pi/(ro-ri),1.5*np.pi/(ro-ri),xtol=1e-12)
    shape=lambda r:jv(0,mu*r)*yv(1,mu*ri)-yv(0,mu*r)*jv(1,mu*ri)
    normal=float(np.max(np.abs(shape(np.linspace(ri,ro,1001)))))
    duration,steps=2.,64
    dt=duration/steps
    decay=(1+120/(19250*150)*mu**2*dt)**(-steps)
    rows=[]
    for n in (8,16,32,64):
        edges=np.linspace(ri,ro,n+1)
        centers=np.sqrt(edges[:-1]*edges[1:])
        initial=1000+50*shape(centers)/normal
        c={'name':f'Bessel-eigenmode-n{n}',
           'config':{'radiusM':ri,'lengthM':.5,'thicknessM':ro-ri,'cells':n,
                     'gasCapacityJK':1.,'gasWallWK':0.,'coolingWK':0.,'coolantK':1000.,
                     'material':{'kind':'constant','densityKgM3':19250.,'cpJKgK':150.,'kWMK':120.}},
           'initial':{'gasK':1000.,'wallK':initial.tolist()},
           'steps':[{'dtS':dt} for _ in range(steps)]}
        got=endpoint(reference.run_case(c))[1:]
        exact=1000+50*shape(centers)/normal*decay
        rows.append({'cells':n,'errorK':float(np.max(np.abs(got-exact)))})
    errors=[r['errorK'] for r in rows]
    assert all(b/a<.85 for a,b in zip(errors,errors[1:])), ('Bessel spatial convergence',rows)
    assert errors[-1]<.02, ('Bessel finest error',rows)
    return {'eigenvaluePerM':mu,'durationS':duration,'fixedSteps':steps,
            'boundary':'zero flux at both annular surfaces; exact J0/Y0 eigenmode',
            'comparison':'continuum eigenfunction with exact backward-Euler amplification',
            'rows':rows,'differenceRatios':[b/a for a,b in zip(errors,errors[1:])]}


def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('output', type=Path)
    args=parser.parse_args()
    runs={}
    for n, steps in [(8,256),(16,256),(32,256),(64,256),
                     (64,16),(64,32),(64,64),(64,128)]:
        runs[(n,steps)]=reference.run_case(case(n,steps))

    spatial=[]
    for n in (8,16,32):
        edges=np.linspace(.12,.15,n+1)
        fine_edges=np.linspace(.12,.15,2*n+1)
        centers=np.sqrt(edges[:-1]*edges[1:])
        fine_centers=np.sqrt(fine_edges[:-1]*fine_edges[1:])
        coarse=endpoint(runs[(n,256)])
        fine=endpoint(runs[(2*n,256)])
        error=max(abs(coarse[0]-fine[0]),
                  float(np.max(np.abs(coarse[1:]-np.interp(centers,fine_centers,fine[1:])))))
        spatial.append({'cells':n,'fineCells':2*n,'fixedSteps':256,
                        'maximumEndpointDifferenceK':error})
    temporal=[]
    for steps in (16,32,64,128):
        coarse=endpoint(runs[(64,steps)])
        fine=endpoint(runs[(64,2*steps)])
        temporal.append({'steps':steps,'fineSteps':2*steps,'fixedCells':64,
                         'maximumEndpointDifferenceK':float(np.max(np.abs(coarse-fine)))})
    se=[x['maximumEndpointDifferenceK'] for x in spatial]
    te=[x['maximumEndpointDifferenceK'] for x in temporal]
    assert all(e>1e-8 for e in se+te), 'Refinement signal must exceed solver roundoff'
    assert all(b/a<.85 for a,b in zip(se,se[1:])), ('spatial nonconvergence',se)
    assert all(b/a<.85 for a,b in zip(te,te[1:])), ('time nonconvergence',te)
    finest=endpoint(runs[(64,256)])
    assert float(np.max(finest[1:])-np.min(finest[1:]))>5, 'Case must resolve a real wall gradient'
    assert min(finest)>300 and max(finest)<1900
    out={'solver':'Actual FiPy/SciPy independent nonlinear heat solve',
         'scope':'One nonlinear gas/liner cooling/deposition case; separate space/time refinement, not global qualification',
         'spatial':spatial,'temporal':temporal,
         'spatialDifferenceRatios':[b/a for a,b in zip(se,se[1:])],
         'temporalDifferenceRatios':[b/a for a,b in zip(te,te[1:])],
         'finestEndpoint':{'gasK':float(finest[0]),'linerInnerCellK':float(finest[1]),
                           'linerOuterCellK':float(finest[-1]),'wallK':finest[1:].tolist()},
         'maxRelativeEnergyBalance':max(r['maximumRelativeEnergyBalance'] for r in runs.values()),
         'analyticBessel':bessel_checks(),
         'allPass':True,
         'scriptSHA256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
         'oracleSHA256':hashlib.sha256(path.read_bytes()).hexdigest()}
    args.output.write_text(json.dumps(out,indent=2)+'\n')
    print(json.dumps(out,indent=2))


if __name__=='__main__':
    main()
