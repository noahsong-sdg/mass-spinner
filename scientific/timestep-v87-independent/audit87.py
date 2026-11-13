"""Independent active-CFL, saved-state and exact-panel temporal admission."""
import hashlib
import json
from pathlib import Path
import sys
import numpy as np

HERE=Path(__file__).resolve().parent; SCIENTIFIC=HERE.parent
sys.path.insert(0,str(SCIENTIFIC/'meridional-v86'))
sys.path.insert(0,str(SCIENTIFIC/'meridional-v86-independent'))
import audit86 as old
import panel86 as panel

BASELINE='70e0923e8ac9a53a476e439a9df3e670fb52467ee9d3d6ab5aa62ad9eae5e5c7'
CFLS=(.2,.1,.05)
SOURCE_FILES=('scientific/timestep-v87/study87.py','scientific/timestep-v87/PROTOCOL.md',
    'scientific/meridional-v86/campaign86.py','scientific/meridional-v86/diffusion86.py',
    'scientific/meridional-v86/electro86.py','scientific/mixture-axial-v75/flow.py',
    'scientific/electrical-v82/transport82.py','scientific/flow-v81/transport.py',
    'scientific/flow-v81/argon-viscosity-source.json')


def sha(raw): return hashlib.sha256(raw).hexdigest()


def acoustic_bound(state,snapshot,cfl):
    """Reconstruct cylindrical characteristic-volume CFL without Flow import."""
    r,z=[np.asarray(state[k]) for k in ('radialEdgesM','axialEdgesM')]
    p=old.primitive(r,z,snapshot['q']); sound=p['soundMPS']
    sr,sz=abs(p['vrMPS'])+sound,abs(p['vzMPS'])+sound
    radial=np.concatenate((sr[:,:1],np.maximum(sr[:,:-1],sr[:,1:]),sr[:,-1:]),axis=1)
    axial=np.concatenate((sz[:1],np.maximum(sz[:-1],sz[1:]),sz[-1:]),axis=0)
    ar=2*np.pi*np.diff(z)[:,None]*r[None,:]; az=np.pi*np.diff(r*r)[None,:]
    volume=np.pi*np.diff(z)[:,None]*np.diff(r*r)[None,:]
    departure=ar[:,:-1]*radial[:,:-1]+ar[:,1:]*radial[:,1:]+az*(axial[:-1]+axial[1:])
    return float(cfl*np.min(volume/departure))


def check_schedule(case,state):
    schedule,history=case['schedule'],state['history']
    old.require(len(schedule)==len(history)==case['stepCount'],'Missing accepted-step schedule')
    elapsed=0.; acoustic_nonterminal=0; nonterminal=0; snapshots=[]
    for index,(s,h) in enumerate(zip(schedule,history)):
        values=[s[k] for k in ('timeBeforeS','acousticBoundS','remainingToReportS','acceptedDtS')]
        before,bound,remaining,dt=values
        old.require(np.isfinite(values).all() and bound>0 and remaining>0 and dt>0,'Invalid CFL schedule')
        target=next((t for t in old.TIMES if t>before),None)
        old.require(target is not None and abs(before-elapsed)<1e-16
            and abs(remaining-(target-before))<1e-16,'Schedule reporting target changed')
        expected=min(bound,remaining,case['maxDtS'])
        old.require(abs(dt-expected)<=2e-12*expected,'Accepted timestep is not declared minimum')
        old.require(abs(dt-h['dtS'])<1e-16 and abs(h['timeS']-before-dt)<1e-16,'Schedule/history mismatch')
        terminal=remaining<=min(bound,case['maxDtS'])*(1+2e-12)
        if not terminal:
            nonterminal+=1; acoustic_nonterminal+=int(bound<=case['maxDtS']*(1+2e-12))
        for snapshot in state['snapshots'][:-1]:
            if snapshot['timeS']==before:
                actual=acoustic_bound(state,snapshot,case['cfl'])
                defect=abs(actual-bound)/actual
                old.require(defect<2e-12,'Independent reporting-state CFL mismatch')
                snapshots.append(dict(timeS=before,relativeDefect=defect))
        elapsed=h['timeS']
    old.require(abs(elapsed-old.TIMES[-1])<1e-16 and len(snapshots)==3,'Incomplete CFL trajectory')
    fraction=acoustic_nonterminal/nonterminal if nonterminal else 0.
    return dict(cfl=case['cfl'],stepCount=len(schedule),maximumAcceptedDtS=max(s['acceptedDtS'] for s in schedule),
        acousticLimitedNonterminalFraction=fraction,nonterminalSteps=nonterminal,
        independentSnapshotCFLChecks=snapshots,passed=bool(fraction>=.95))


def check_inventory(cases,scenario):
    old.require(len(cases)==3 and [c['cfl'] for c in cases]==list(CFLS),'CFL inventory/order changed')
    for c in cases:
        old.require(c['completed'] is True and 'error' not in c,'Failed trajectory cannot qualify')
        old.require(c['nr']==64 and c['nz']==96 and c['maxDtS']==1e-7
            and c['scenario']==scenario and c['anodeCenterM']==.07,'Physical/schedule slice changed')


def assessment(gates,quadrature,activity):
    refinements=[dict(coarseCFL=a['cfl'],fineCFL=b['cfl'],
        stepCountRatio=b['stepCount']/a['stepCount'],
        maximumDtRatio=b['maximumAcceptedDtS']/a['maximumAcceptedDtS'],
        passed=bool(b['stepCount']>1.5*a['stepCount'] and b['maximumAcceptedDtS']<a['maximumAcceptedDtS']))
        for a,b in zip(activity[:-1],activity[1:])]
    passed=all(g['passed'] for g in gates+quadrature+activity+refinements)
    return dict(temporalSliceNumericalPass=bool(passed),activityRefinements=refinements,
        fullModelNumericallyQualified=False,allRequiredNumericalPass=False,experimentalQualification=False)


def audit(path,root=None,expected_sha=None):
    path=Path(path).resolve(); root=Path(root).resolve() if root else path.parents[3]
    raw=path.read_bytes(); packet=json.loads(raw)
    old.require(expected_sha is None or sha(raw)==expected_sha,'Prediction seal mismatch')
    baseline_path=root/'scientific/meridional-v86/results/predictions.json'
    baseline_raw=baseline_path.read_bytes(); baseline=json.loads(baseline_raw)
    old.require(sha(baseline_raw)==packet['baselinePredictionSHA256']==BASELINE,'V86 baseline changed')
    old.require(packet['manifest']==baseline['manifest'],'Changed physical manifest')
    for name in ('targetVelocityRead','currentFitted','velocityFitted','experimentalQualification'):
        old.require(packet[name] is False,'Invalid target/fitting/qualification flag')
    old.require(packet['conditionalRelease'] is True,'Conditional scope lost')
    old.require(set(packet['sourceSHA256'])==set(SOURCE_FILES),'Incomplete or changed physical source inventory')
    for name,digest in packet['sourceSHA256'].items():
        file=(root/name).resolve(); old.require(file.is_relative_to(root),'Invalid source path')
        old.require(sha(file.read_bytes())==digest,'Stale producer/checker source: '+name)
        if name in baseline['sourceSHA256']:
            old.require(digest==baseline['sourceSHA256'][name],'Imported V86 physics changed')
    checkers=[HERE/'audit87.py',HERE/'test_audit87.py',Path(old.__file__),Path(panel.__file__),
        root/'scientific/meridional-v86-independent/test_panel86.py']
    checker_hashes={str(p.relative_to(root)):sha(p.read_bytes()) for p in checkers}
    cases=packet['cases']; scenario=baseline['scenarios'][0]['name']; check_inventory(cases,scenario)
    old_case=next(c for c in baseline['cases'] if c['scenario']==scenario and c['anodeCenterM']==.07
        and c['nr']==64 and c['maxDtS']==1e-7)
    old_state=panel.read_sealed(baseline_path.parent/old_case['fieldPacket']['path'],old_case['fieldPacket'])
    states=[]; activity=[]; ledgers=[]
    for case in cases:
        f=case['fieldPacket']; field=(path.parent/f['path']).resolve()
        old.require(field.parent==path.parent/'fields','Invalid new field path')
        state=panel.read_sealed(field,f)
        ledgers.append(old.check_state(state,case,packet['manifest']))
        activity.append(check_schedule(case,state)); states.append(state)
    old.require(cases[0]['fieldPacket']['rawSHA256']==old_case['fieldPacket']['rawSHA256']
        and cases[0]['fieldPacket']['sha256']==old_case['fieldPacket']['sha256'],
        'CFL .2 did not exactly reproduce frozen V86 state/history')
    old.require(states[0]==old_state,'Decoded baseline replay changed')
    gates=[]; checks=[]; differences=[]
    for ti,t in enumerate(old.TIMES):
        pairs=[{n:panel.metrics(a,b,ti,n) for n in (2,3,4)} for a,b in zip(states[:-1],states[1:])]
        differences.extend(dict(timeS=t,coarseCFL=CFLS[i],fineCFL=CFLS[i+1],fields=pair[2])
            for i,pair in enumerate(pairs))
        for name in pairs[0][2]:
            x,y=(pair[2][name]['value'] for pair in pairs)
            gates.append(dict(timeS=t,field=name,**panel.gate(x,y,.02)))
            for index,pair in enumerate(pairs):
                for term in ('errorIntegral','referenceIntegral'):
                    values=[pair[n][name][term] for n in (2,3,4)]; scale=max(abs(v) for v in values)
                    spread=(max(values)-min(values))/scale if scale else 0.
                    checks.append(dict(timeS=t,field=name,pair=index,term=term,values=values,
                        relativeSpread=float(spread),limit=1e-10,passed=bool(spread<1e-10)))
    return dict(predictionSHA256=sha(raw),baselinePredictionSHA256=sha(baseline_raw),
        baselineRawFieldSHA256=old_case['fieldPacket']['rawSHA256'],baselineBitwiseReplay=True,
        sourceSHA256=packet['sourceSHA256'],checkerSHA256=checker_hashes,ledger=ledgers,activity=activity,
        differences=differences,gates=gates,
        failures=[g for g in gates if not g['passed']],quadratureChecks=checks,
        quadratureFailures=[g for g in checks if not g['passed']],**assessment(gates,checks,activity),
        opticalScoringPerformed=False,scope='Prospective active-CFL temporal screen for one fixed spatially unqualified conditional slice. Independent saved-state/global-budget/reporting-state CFL checks; unsaved pre-step CFL bounds are producer claims. No experimental qualification.')


if __name__=='__main__':
    result=audit(sys.argv[1]); Path(sys.argv[2]).write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    raise SystemExit(0 if result['temporalSliceNumericalPass'] else 1)
