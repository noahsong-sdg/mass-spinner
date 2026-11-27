"""Retain every declared finite footprint and both independent assemblies."""
import hashlib
import json
from pathlib import Path
import sys
import numpy as np
import dolfinx
from petsc4py import PETSc
from contacts import R,L,A,C,MU,PARALLEL,TRANSVERSE,CASES
from solvers import dolfinx_solve,skfem_solve

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scientific/public-fenicsx-reference'))
from reference import sample as dolfinx_sample
sys.path.insert(0,str(ROOT/'scientific/nonrigid-v98'))
from fem98 import sample as skfem_sample

RESIDUALS = ('linearResidualRelative','sourceResidualRelative','sourceMomentResidualRelative',
             'voltageResidualRelative','powerResidualRelative','torqueResidualRelative',
             'wallTorqueResidualRelative')
OUTPUTS = ('portVoltageV','jouleW','viscousW')


def relative(a,b):
    return float(np.max(np.abs(np.asarray(a)-b))/max(float(np.max(np.abs(b))),1e-30))


def main(output):
    if output.exists():
        raise FileExistsError('Fresh output path required')
    local = Path(__file__).parent
    paths = list(local.glob('*.py'))+[local/'PROTOCOL.md',
        ROOT/'scientific/public-fenicsx-reference/reference.py',ROOT/'scientific/nonrigid-v98/fem98.py']
    result = dict(schemaVersion=1,kind='finite-prescribed-current-contact-verification',
        sourceSHA256={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(paths)},
        runtime=dict(dolfinx=dolfinx.__version__,numpy=np.__version__,petsc=PETSc.Sys.getVersion(),
                     skfem=__import__('skfem').__version__),
        parametersRefitted=False,experimentalQualification=False,livePlaygroundQualified=False,
        temperaturePredictionAvailable=False,localPeakHeatingQualified=False,
        currentIsInput=True,measuredVoltageMappingEstablished=False,
        modelInputs=dict(radiusM=R,halfLengthM=L,cathodeInnerRadiusM=A,anodeCenterM=C,
            branchCurrentA=100.,magneticT=.13,viscosityPaS=MU,
            parallelConductivitySm=PARALLEL,transverseConductivitySm=TRANSVERSE),
        transportIndependentlyIdentified=False,
        gates=dict(budgetRelative=1e-8,fieldAndIntegralFineChange=.05,crossCodeDifference=.05),cases=[])
    r,z = np.meshgrid(np.linspace(0,R,41),np.linspace(0,L,31))
    for name,(width,half_width) in CASES.items():
        rows = []
        for n in (1,2,4):
            angular,potential,metrics = dolfinx_solve(n,width,half_width)
            other,independent = skfem_solve(n,width,half_width)
            omega = dolfinx_sample(angular,r,z)
            phi = dolfinx_sample(potential,r,z)
            omega_other = skfem_sample(other,r,z)
            potential_other = dict(other,omega=other['potential'])
            phi_other = skfem_sample(potential_other,r,z)
            differences = dict(omega=relative(omega,omega_other),potential=relative(phi-phi[0,0],phi_other-phi_other[0,0]),
                **{k:relative(metrics[k],independent[k]) for k in OUTPUTS})
            passed = (all(metrics[k]<1e-8 and independent[k]<1e-8 for k in RESIDUALS)
                      and all(v<.05 for v in differences.values())
                      and all(metrics[k]>0 and independent[k]>0 for k in ('jouleW','viscousW','electrodePowerW')))
            row = dict(refinement=n,dolfinx=metrics,skfem=independent,crossCodeRelative=differences,
                       omegaRadS=omega.tolist(),skfemOmegaRadS=omega_other.tolist(),
                       potentialV=phi.tolist(),skfemPotentialV=phi_other.tolist(),
                       passNumericalBudgets=passed)
            rows.append(row)
            print(json.dumps(dict(case=name,refinement=n,portVoltageV=metrics['portVoltageV'],
                                  budgetPass=passed,crossCodeMax=max(differences.values()))),flush=True)
            # Persist incomplete campaigns too; process failure cannot erase earlier cases.
            result['inProgress'] = dict(name=name,cathodeWidthM=width,anodeHalfWidthM=half_width,meshes=rows)
            output.parent.mkdir(parents=True,exist_ok=True)
            output.write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
        changes = dict(omega=[relative(a['omegaRadS'],np.asarray(b['omegaRadS'])) for a,b in zip(rows,rows[1:])])
        for key in OUTPUTS:
            changes[key] = [relative(a['dolfinx'][key],b['dolfinx'][key]) for a,b in zip(rows,rows[1:])]
        passed = all(row['passNumericalBudgets'] for row in rows) and all(v[1]<.05 and v[1]<v[0] for v in changes.values())
        result['cases'].append(dict(name=name,cathodeWidthM=width,anodeHalfWidthM=half_width,
                                   meshes=rows,refinementChanges=changes,numericalScreen=passed))
        del result['inProgress']
    result.update(radialM=r[0].tolist(),axialM=z[:,0].tolist(),
                  numericalScreen=all(c['numericalScreen'] for c in result['cases']))
    output.write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    if not result['numericalScreen']:
        raise SystemExit('Finite-contact numerical gate failed; all cases retained')


if __name__ == '__main__':
    main(Path(sys.argv[1]))
