"""Score sealed ring predictions; prescribed current is never a successful prediction."""
import gzip
import hashlib
import importlib.util
import json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

HERE=Path(__file__).parent
spec=importlib.util.spec_from_file_location('score84_frozen',HERE.parent/'optical-v80/compare.py')
scoring=importlib.util.module_from_spec(spec); spec.loader.exec_module(scoring)


def sha(raw): return hashlib.sha256(raw).hexdigest()


def paired(coarse,fine):
    from itertools import product
    key=lambda r:(r['edgeClosure'],r['temperatureK'],r['instrumentSigmaMS'],r['estimator'])
    expected=set(product(('linear','sqrt'),(1400,1800,2900,5950,7250,'linear'),(0.,500.,1000.),('centroidMS','modeMS')))
    old={key(r):r for r in coarse}; new={key(r):r for r in fine}
    if len(old)!=len(coarse) or len(new)!=len(fine) or set(old)!=set(new) or set(old)!=expected:
        raise ValueError('Incomplete or duplicate optical alternatives')
    return [(old[key(r)],r) for r in fine]


def main():
    directory=HERE/'results'; raw=(directory/'predictions.json').read_bytes(); flow=json.loads(raw)
    index_raw=(directory/'optical-index.json').read_bytes(); index=json.loads(index_raw)
    if index['predictionSHA256']!=sha(raw): raise ValueError('Optical/flow binding changed')
    target=(HERE.parent/'profile-v79/results/score.json').read_bytes(); points=json.loads(target)['points']
    groups={}; rows=[]
    for entry in index['groups']:
        zipped=(directory/entry['path']).read_bytes(); payload=gzip.decompress(zipped); value=json.loads(payload)
        if sha(zipped)!=entry['sha256'] or sha(payload)!=entry['rawSHA256'] or value['predictionSHA256']!=sha(raw):
            raise ValueError('Optical group seal changed')
        groups[entry['group']]=scoring.score(value,points)['cases']
    for case in flow['cases']:
        if case['refinement']!=8: continue
        label=f"{case['scenario']}-a{case['anodeCenterM']}-n"; coarse=groups[label+'4']; fine=groups[label+'8']
        for a,b in paired(coarse,fine):
            old,new=np.asarray(a['predictionMS']),np.asarray(b['predictionMS'])
            change=float(max(abs(old-new)/abs(new))) if np.all(new!=0) else None
            rows.append(dict(scenario=case['scenario'],anodeCenterM=case['anodeCenterM'],actualFlowRefinement=8,
                prescribedCurrentA=case['prediction']['currentA'],predictedCurrentA=None,
                flowOpticalRelativeChange=change,flowOpticalGate=bool(change is not None and change<.05),**b))
    audited=json.loads((directory/'audit.json').read_text())
    if audited['predictionSHA256']!=sha(raw): raise ValueError('Numerical audit seal changed')
    flow_pass=audited['identityPass'] and audited['flowNumericalPass']
    for row in rows:
        row['resolvedOpticalPointMatch']=bool(flow_pass and row['flowOpticalGate'] and row['allPointGate']
            and all(row[k] for k in ('opticalCentroidMeshGate','spectralGate','opticalSpectrumMeshGate')))
    result=dict(predictionSHA256=sha(raw),opticalIndexSHA256=sha(index_raw),targetFileSHA256=sha(target),
        experimentalQualification=False,currentFitted=False,absoluteCurrentPrediction=False,correctedVoltagePrediction=False,
        prescribedCurrent=True,points=points,cases=rows,alternatives=len(rows),
        anyAllPointPass=any(r['allPointGate'] for r in rows),anyEligiblePointPass=any(r['eligiblePointGate'] for r in rows),
        anyResolvedOpticalPointMatch=any(r['resolvedOpticalPointMatch'] for r in rows),
        scope='Development-data source-ring diagnosis. Prescribed current is not predicted. Ring cutoff-dependent contact voltage is not compared with corrected experimental voltage.')
    payload=json.dumps(result,indent=2,allow_nan=False).encode(); zipped=gzip.compress(payload,mtime=0)
    (directory/'comparison.json.gz').write_bytes(zipped)
    summary={k:v for k,v in result.items() if k not in ('points','cases')}
    summary.update(comparisonSHA256=sha(zipped),comparisonRawSHA256=sha(payload),flowNumericalPass=flow_pass,
        flowOpticalFailures=sum(not r['flowOpticalGate'] for r in rows),
        numericalOpticalFailures=sum(not all(r[k] for k in ('opticalCentroidMeshGate','spectralGate','opticalSpectrumMeshGate')) for r in rows))
    (directory/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
    fig,axes=plt.subplots(1,2,figsize=(12,4.5),layout='constrained')
    x=np.array([p['radiusM'] for p in points])*100; y=[p['velocityMS'] for p in points]
    axes[0].plot(x,y,'ko',label='Published neutral-Ar Doppler speeds')
    for scenario in flow['scenarios']:
        for center in (.07,.08):
            row=next(r for r in rows if r['scenario']==scenario['name'] and r['anodeCenterM']==center
                     and r['edgeClosure']=='linear' and r['temperatureK']==2900 and r['instrumentSigmaMS']==0 and r['estimator']=='centroidMS')
            axes[0].plot(x,row['predictionMS'],label=f"{scenario['name']} {center:g}m")
            cases=[c for c in flow['cases'] if c['scenario']==scenario['name'] and c['anodeCenterM']==center]
            axes[1].plot([c['refinement'] for c in cases],
                         [c['prediction']['electrodePowerW']/100 for c in cases],'o-')
    axes[0].set(xlabel='Sightline offset (cm)',ylabel='Doppler centroid (m/s)',title='Source ring: prescribed 100 A'); axes[0].legend(fontsize=6)
    axes[1].set(xlabel='Joint refinement (shrinking ring support)',ylabel='Numerical contact P/I (V)',title='Cutoff-dependent contact diagnostic; not experimental voltage')
    for ax in axes: ax.grid(alpha=.15)
    fig.savefig(directory/'comparison.png',dpi=160); plt.close(fig)
    if (directory/'predictions.json').read_bytes()!=raw: raise ValueError('Scoring changed predictions')
    print(json.dumps(summary,indent=2))


if __name__=='__main__': main()
