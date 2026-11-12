"""Score sealed electrical challenges using the unchanged V79/V80 criterion."""
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
spec=importlib.util.spec_from_file_location('score_v80',HERE.parent/'optical-v80/compare.py')
previous=importlib.util.module_from_spec(spec); spec.loader.exec_module(previous)


def sha(raw): return hashlib.sha256(raw).hexdigest()


def compare(raw,index,groups,points):
    seal=sha(raw); electrical=json.loads(raw)
    if index['predictionSHA256']!=seal: raise ValueError('Electrical prediction seal changed')
    rows=[]
    for entry in index['groups']:
        zipped=groups[entry['path']]; payload=gzip.decompress(zipped); group=json.loads(payload)
        if sha(zipped)!=entry['sha256'] or sha(payload)!=entry['rawSHA256'] or group['predictionSHA256']!=seal:
            raise ValueError('Optical group seal changed')
        candidates=[c for c in electrical['cases']+electrical['fixedCurrent'] if c['group']==entry['group'] and c['refinement']==4]
        for row in previous.score(group,points)['cases']:
            matches=[c for c in candidates if c['drive']==row['beta'] and c['voltageV']==row['voltageV']]
            if len(matches)!=1: raise ValueError('Optical case has no unique electrical state')
            case=matches[0]
            compatible=16.5<=case['voltageV']<=20.5
            numerical=all(row[k] for k in ('opticalCentroidMeshGate','spectralGate','opticalSpectrumMeshGate'))
            rows.append(dict(group=entry['group'],scenario=case['scenario'],anodeCenterM=case['anodeCenterM'],
                drive=case['drive'],currentA=case['prediction']['currentsA']['cathode'],
                voltageWithinReportedRange=compatible,
                opticallyResolvedVoltageCompatiblePointMatch=bool(compatible and numerical and row['allPointGate']),**row))
    return dict(predictionSHA256=seal,experimentalQualification=False,points=points,cases=rows,
        anyEligiblePointPass=any(r['eligiblePointGate'] for r in rows),anyAllPointPass=any(r['allPointGate'] for r in rows),
        anyOpticallyResolvedVoltageCompatiblePointMatch=any(r['opticallyResolvedVoltageCompatiblePointMatch'] for r in rows),
        scoreScope='Original any*PointPass flags measure optical point matching only. Additional conjunction requires optical gates and voltage compatibility, not current agreement or flow qualification. Development-data diagnosis, not held-out validation.')


def main():
    directory=HERE/'results'; raw=(directory/'predictions.json').read_bytes()
    iraw=(directory/'optical-index.json').read_bytes(); index=json.loads(iraw)
    target=(HERE.parent/'profile-v79/results/score.json').read_bytes()
    groups={g['path']:(directory/g['path']).read_bytes() for g in index['groups']}
    result=compare(raw,index,groups,json.loads(target)['points'])
    result.update(targetFileSHA256=sha(target),opticalIndexSHA256=sha(iraw))
    payload=json.dumps(result,indent=2,allow_nan=False).encode(); zipped=gzip.compress(payload,mtime=0)
    (directory/'comparison.json.gz').write_bytes(zipped)
    flow=json.loads(raw); nominal=[c for c in flow['cases'] if c['refinement']==4 and c['voltageV']==18.5]
    summary=dict(predictionSHA256=sha(raw),comparisonSHA256=sha(zipped),comparisonRawSHA256=sha(payload),
        alternatives=len(result['cases']),experimentalQualification=False,
        anyEligiblePointPass=result['anyEligiblePointPass'],anyAllPointPass=result['anyAllPointPass'],
        anyOpticallyResolvedVoltageCompatiblePointMatch=result['anyOpticallyResolvedVoltageCompatiblePointMatch'],scoreScope=result['scoreScope'],
        nominal=[dict(group=c['group'],currentA=c['prediction']['currentsA']['cathode'],
            fixedCurrentVoltageV=next(f['voltageV'] for f in flow['fixedCurrent'] if f['group']==c['group']),
            jouleW=c['budget']['jouleW'],rotorWorkW=c['budget']['rotorWorkW']) for c in nominal],
        driveSummaries={drive:dict(alternatives=sum(r['drive']==drive for r in result['cases']),
            anyEligiblePointPass=any(r['eligiblePointGate'] for r in result['cases'] if r['drive']==drive),
            anyAllPointPass=any(r['allPointGate'] for r in result['cases'] if r['drive']==drive))
            for drive in ('absolute-voltage','fixed-current')})
    (directory/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
    fig,axes=plt.subplots(1,2,figsize=(11,4.5),layout='constrained')
    p=result['points']; x=np.array([v['radiusM'] for v in p])*100; y=np.array([v['velocityMS'] for v in p])
    for ax,drive in zip(axes,('absolute-voltage','fixed-current')):
        ax.plot(x,y,'ko',label='Published neutral-Ar speeds')
        for scenario in ('linear-v81-leading-te1','linear-finite-te1','linear-finite-te2.5-source','quadratic-finite-te2.5-source'):
            row=next(r for r in result['cases'] if r['scenario']==scenario and r['anodeCenterM']==.07 and r['drive']==drive
                and (drive=='fixed-current' or r['voltageV']==18.5) and r['edgeClosure']=='linear'
                and r['temperatureK']==2900 and r['instrumentSigmaMS']==0 and r['estimator']=='centroidMS')
            ax.plot(x,row['predictionMS'],label=scenario)
        ax.set(xlabel='Sightline offset (cm)',ylabel='Doppler centroid (m/s)',title=drive); ax.grid(alpha=.15); ax.legend(fontsize=7)
    fig.savefig(directory/'comparison.png',dpi=170); plt.close(fig)
    fig,axes=plt.subplots(2,1,figsize=(12,7),sharex=True,layout='constrained')
    names=[s['name'] for s in flow['scenarios']]; x=np.arange(len(names))
    for center in flow['anodeCentersM']:
        selected=[next(c for c in nominal if c['scenario']==name and c['anodeCenterM']==center) for name in names]
        axes[0].plot(x,[c['prediction']['currentsA']['cathode'] for c in selected],'o-',label=f'Anode center {center*100:g} cm')
        axes[1].plot(x,[next(c['voltageV'] for c in flow['fixedCurrent'] if c['group']==s['group']) for s in selected],'o-')
    axes[0].axhline(100,color='black',ls='--',label='Reported branch current'); axes[0].legend(fontsize=8)
    axes[1].axhspan(16.5,20.5,color='gray',alpha=.2,label='Reported corrected voltage'); axes[1].legend(fontsize=8)
    axes[0].set(ylabel='Predicted current at 18.5 V (A)'); axes[1].set(ylabel='Required voltage for 100 A (V)')
    axes[1].set_xticks(x,names,rotation=35,ha='right',fontsize=8)
    for ax in axes: ax.grid(alpha=.15)
    fig.savefig(directory/'electrical-comparison.png',dpi=170); plt.close(fig)
    if (directory/'predictions.json').read_bytes()!=raw: raise ValueError('Scoring altered predictions')
    print(json.dumps({k:v for k,v in summary.items() if k!='nominal'},indent=2))


if __name__=='__main__': main()
