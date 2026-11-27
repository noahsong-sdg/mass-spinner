"""No-fit finite boundary comparison with an explicitly unresolved voltage map."""
import gzip
import hashlib
import json
from pathlib import Path
import sys
import numpy as np
import dolfinx
from petsc4py import PETSc
from equipotential import ROOT,R,L,dolfinx_solve,skfem_solve
from contacts import CASES
from voltage_ledger import ledger
sys.path.insert(0,str(ROOT/'scientific/public-fenicsx-reference'))
from reference import sample as dolfinx_sample
sys.path.insert(0,str(ROOT/'scientific/nonrigid-v98'))
from fem98 import sample as skfem_sample

RESIDUALS = ('sourceResidualRelative','chargeResidualRelative','linearResidualRelative',
    'contactSpreadRelative','voltageResidualRelative','powerResidualRelative',
    'torqueResidualRelative','wallTorqueResidualRelative')
INTEGRALS = ('portVoltageV','jouleW','viscousW','cathodeMeanRadiusSquaredM2')
UNIFORM_PATH = ROOT/'scientific/finite-contact-reference/results/campaign.json.gz'
UNIFORM_SHA256 = '4131e5bfd6c1c0181e522cff169bed2b4bca5ed38c41514ca3023793b7e9c274'


def relative(a,b):
    return float(np.max(np.abs(np.asarray(a)-b))/max(float(np.max(np.abs(b))),1e-30))


def uniform_receipt(path=UNIFORM_PATH):
    raw = path.read_bytes()
    if hashlib.sha256(raw).hexdigest()!=UNIFORM_SHA256:
        raise ValueError('Frozen complete uniform-current receipt required')
    previous = json.loads(gzip.decompress(raw))
    for path,digest in previous['sourceSHA256'].items():
        if hashlib.sha256((ROOT/path).read_bytes()).hexdigest()!=digest:
            raise ValueError('Historical uniform-current source identity changed: '+path)
    return previous


def main(output):
    if output.exists():
        raise FileExistsError('Fresh output path required')
    previous_path = UNIFORM_PATH
    previous = uniform_receipt()
    uniform = {(c['name'],r['refinement']):r for c in previous['cases'] for r in c['meshes']}
    paths = [*Path(__file__).parent.glob('*.py'),Path(__file__).with_name('PROTOCOL.md'),
        ROOT/'scientific/finite-contact-reference/contacts.py',previous_path,
        ROOT/'scientific/public-fenicsx-reference/reference.py',ROOT/'scientific/nonrigid-v98/fem98.py']
    result = dict(schemaVersion=1,kind='equipotential-current-footprint-challenge',
        sourceSHA256={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(paths)},
        runtime=dict(dolfinx=dolfinx.__version__,numpy=np.__version__,petsc=PETSc.Sys.getVersion(),skfem=__import__('skfem').__version__),
        voltageLedger=ledger(),parametersRefitted=False,experimentalQualification=False,
        livePlaygroundQualified=False,transportIndependentlyIdentified=False,currentIsInput=True,
        floatingWallRedistributionIncluded=False,sheathModelIncluded=False,cases=[])
    r,z = np.meshgrid(np.linspace(0,R,41),np.linspace(0,L,31))
    probe_r = np.linspace(.04,.06,41)
    for name,(width,half_width) in CASES.items():
        rows = []
        for n in (1,2,4):
            o,p,m = dolfinx_solve(n,width,half_width,target_current=100.)
            other,independent = skfem_solve(n,width,half_width,target_current=100.)
            omega,phi = dolfinx_sample(o,r,z),dolfinx_sample(p,r,z)
            omega2 = skfem_sample(other,r,z)
            phi2 = skfem_sample(dict(other,omega=other['potential']),r,z)
            differences = dict(omega=relative(omega,omega2),potential=relative(phi,phi2),
                **{k:relative(m[k],independent[k]) for k in INTEGRALS})
            old = uniform[name,n]['dolfinx']
            minimum_work = m['electrodePowerW']<=old['electrodePowerW']*(1+1e-8)
            passed = (all(m[k]<1e-8 and independent[k]<1e-8 for k in RESIDUALS)
                and all(v<.05 for v in differences.values()) and minimum_work
                and all(m[k]>0 and independent[k]>0 for k in ('jouleW','viscousW','electrodePowerW')))
            proxy = dolfinx_sample(p,probe_r,0)-float(dolfinx_sample(p,.05,0))
            row = dict(refinement=n,dolfinx=m,skfem=independent,crossCodeRelative=differences,
                uniformFluxPortVoltageV=old['portVoltageV'],uniformFluxPowerW=old['electrodePowerW'],
                minimumWorkPass=minimum_work,omegaRadS=omega.tolist(),skfemOmegaRadS=omega2.tolist(),
                potentialV=phi.tolist(),skfemPotentialV=phi2.tolist(),
                probeProxyRelativeV=proxy.tolist(),passNumericalBudgets=passed)
            rows.append(row)
            result['inProgress'] = dict(name=name,cathodeWidthM=width,anodeHalfWidthM=half_width,meshes=rows)
            output.parent.mkdir(parents=True,exist_ok=True)
            output.write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
            print(json.dumps(dict(case=name,n=n,portV=m['portVoltageV'],uniformFluxV=old['portVoltageV'],passBudgets=passed)),flush=True)
        changes = dict(omega=[relative(a['omegaRadS'],np.asarray(b['omegaRadS'])) for a,b in zip(rows,rows[1:])])
        for key in INTEGRALS:
            changes[key] = [relative(a['dolfinx'][key],b['dolfinx'][key]) for a,b in zip(rows,rows[1:])]
        passed = all(row['passNumericalBudgets'] for row in rows) and all(v[1]<.05 and v[1]<v[0] for v in changes.values())
        result['cases'].append(dict(name=name,cathodeWidthM=width,anodeHalfWidthM=half_width,meshes=rows,
            refinementChanges=changes,numericalScreen=passed))
        del result['inProgress']
    result.update(radialM=r[0].tolist(),axialM=z[:,0].tolist(),probeRadiusM=probe_r.tolist(),
        numericalScreen=all(c['numericalScreen'] for c in result['cases']))
    output.write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    if not result['numericalScreen']:
        raise SystemExit('Boundary-model numerical gate failed; all cases retained')


if __name__=='__main__':
    main(Path(sys.argv[1]))
