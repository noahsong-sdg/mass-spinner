"""Unchanged V90 gates plus a separate matched-clock 128-cell comparison."""
import json
from pathlib import Path
import sys

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'scientific/coupled-openfoam-v90'))
from score90 import audit,require_packets,difference
from candidate91 import OLD, BASE


def fine_audit(extension,fine):
    packets={};rows=[]
    for path in (extension,fine):
        data=json.loads((path/'predictions.json').read_text())
        rows.extend(data['cases']);packets.update(require_packets(path,data['cases']))
    expected={f'n{n}-s{s}-a0.5-work1' for n,s in [(64,256),(64,512),(64,1024),(32,1024),(128,1024)]}
    if len(rows)!=5 or {r['label'] for r in rows}!=expected:
        raise ValueError('Complete matched-clock fine comparison required')
    gates=[];comparisons={}
    def gate(name,value,limit):
        gates.append(dict(name=name,value=value,limit=limit,passed=value is not None and value<limit))
    base=[packets[f'n{n}-s1024-a0.5-work1'] for n in (32,64,128)]
    for inc in (False,True):
        suffix='increment' if inc else 'whole'
        cross=[difference(p['native'],p['v86'],inc) for p in base]
        comparisons['cross-'+suffix]=cross
        for key in cross[-1]:
            a,b=[c[key]['relative'] for c in cross[-2:]]
            gate('cross-'+suffix+'/'+key+'/fine',b,.05)
            gate('cross-'+suffix+'/'+key+'/contraction',None if not a or b is None else b/a,1.)
        for solver in ('native','v86'):
            space=[difference(base[i][solver],base[i+1][solver],inc) for i in (0,1)]
            comparisons[solver+'/'+suffix]=space
            for key in space[0]:
                a,b=[c[key]['relative'] for c in space]
                gate(solver+'/'+suffix+'/'+key+'/fine',b,.05)
                gate(solver+'/'+suffix+'/'+key+'/contraction',None if not a or b is None else b/a,1.)
    for row in rows:
        for solver in ('native','v86'):
            history=row[solver]['history']
            for key,limit in [('massKg',1e-8),('energyJ',1e-6)]:
                gate(row['label']+'/'+solver+'/'+key,max(abs(h[key]/history[0][key]-1) for h in history),limit)
        h=row['native']['history']
        gate(row['label']+'/wall-angular-budget',abs((h[-1]['angularKgM2S']-h[0]['angularKgM2S']+
             row['native']['wallImpulseKgM2S'])/h[0]['angularKgM2S']),.01)
    return dict(gates=gates,comparisons=comparisons,spatialMeshes=[32,64,128],steps=1024,
        allSpatialGatesPass=all(g['passed'] for g in gates),finestTemporalQualification=False,
        numericalComparisonPass=False,experimentalQualification=False)


def main():
    out=Path(sys.argv[1]);out.mkdir(exist_ok=False)
    root=Path('candidate-results')
    original=audit(root/'campaign-results')
    extended=audit(root/'campaign-results',root/'extension-results')
    fine=fine_audit(root/'extension-results',root/'fine-results')
    baseline=fine_audit(OLD/'extension-results',BASE)
    for name,data in [('original',original),('extended',extended),('fine',fine),('baseline-fine',baseline)]:
        (out/(name+'.json')).write_text(json.dumps(data,indent=2,allow_nan=False)+'\n')
        print(name,json.dumps(dict(gates=len(data['gates']),failed=[g for g in data['gates'] if not g['passed']])),flush=True)
    return 0 if extended['numericalComparisonPass'] and fine['allSpatialGatesPass'] else 1


if __name__=='__main__':
    raise SystemExit(main())
