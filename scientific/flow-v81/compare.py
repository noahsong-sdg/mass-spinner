"""Post-seal comparison; never conditions transport on measured velocities."""
import hashlib
import gzip
import importlib.util
import json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

HERE=Path(__file__).parent
spec=importlib.util.spec_from_file_location('v80_score',HERE.parent/'optical-v80/compare.py')
previous=importlib.util.module_from_spec(spec); spec.loader.exec_module(previous)


def sha(raw): return hashlib.sha256(raw).hexdigest()


def compare(flow_raw,index,groups,points):
    flow_sha=sha(flow_raw)
    if index['flowPredictionSHA256']!=flow_sha:
        raise ValueError('Scoring requires sealed new flow')
    rows=[]
    for entry in index['groups']:
        raw=groups[entry['path']]; group=json.loads(raw)
        if sha(raw)!=entry['sha256'] or group['flowPredictionSHA256']!=flow_sha:
            raise ValueError('Optical group does not match sealed flow')
        rows.extend(dict(transportCase=entry['transportCase'],**row)
                    for row in previous.score(group,points)['cases'])
    return dict(experimentalQualification=False,flowPredictionSHA256=flow_sha,points=points,cases=rows,
                betaConvention=index['betaConvention'],
                anyEligiblePointPass=any(r['eligiblePointGate'] for r in rows),
                anyAllPointPass=any(r['allPointGate'] for r in rows),
                scoreScope='Unchanged V79 targets/masks and V80 20% rule; development-data diagnosis, not held-out validation')


def figures(result,flow_raw):
    points=result['points']; x=np.array([p['radiusM'] for p in points])*100
    y=np.array([p['velocityMS'] for p in points]); bars=np.array([p['plottedBarRangeMS'] for p in points]).T
    fig,axes=plt.subplots(1,3,figsize=(14,6.2),layout='constrained')
    for ax,beta in zip(axes,(3,9,0)):
        ax.errorbar(x,y,yerr=[y-bars[0],bars[1]-y],fmt='o',color='black',label='Published neutral-Ar speeds')
        names=('source-linear','source-quadratic') if beta==0 else ('legacy','nist-2900','linear-nominal','quadratic-nominal')
        for name in names:
            row=next(r for r in result['cases'] if r['transportCase']==name and r['beta']==beta
                     and r['voltageV']==18.5 and r['edgeClosure']=='linear' and r['temperatureK']==2900
                     and r['instrumentSigmaMS']==0 and r['estimator']=='centroidMS')
            ax.plot(x,row['predictionMS'],label=name)
        if beta:
            sensitivity=np.array([r['predictionMS'] for r in result['cases'] if r['beta']==beta
                and r['transportCase'].startswith(('linear-','quadratic-')) and r['voltageV']==18.5
                and r['edgeClosure']=='linear' and r['temperatureK']==2900 and r['instrumentSigmaMS']==0
                and r['estimator']=='centroidMS'])
            ax.fill_between(x,sensitivity.min(axis=0),sensitivity.max(axis=0),alpha=.12,color='gray',label='Prescribed T-map range; not confidence bounds')
        ax.set(xlabel='Sightline offset (cm)',ylabel='Doppler centroid (m/s)',ylim=(0,850),
               title=f'Uniform effective β={beta}' if beta else 'Source collision-shape sensitivities')
        ax.grid(alpha=.15); ax.legend(fontsize=7,loc='upper center',bbox_to_anchor=(.5,-.18))
    fig.savefig(HERE/'results/flow-comparison.png',dpi=170); plt.close(fig)
    flow=json.loads(flow_raw)
    nominal=[c for c in flow['cases'] if c['transportCase']=='quadratic-nominal' and c['voltageV']==18.5 and c['refinement']==4]
    fig,ax=plt.subplots(figsize=(7,4),layout='constrained')
    for case in nominal:
        ax.plot(np.array(case['prediction']['radialCentersM'])*100,case['prediction']['localMidplaneVelocityMS'],label=f"β={case['beta']}")
    ax.set(xlabel='Radius (cm)',ylabel='Local azimuthal speed (m/s)',title='Conditional midplane flow; no secondary velocity predicted')
    ax.legend(); ax.grid(alpha=.15)
    fig.savefig(HERE/'results/local-flow.png',dpi=170); plt.close(fig)
    case=next(c for c in nominal if c['beta']==9)
    payload=(HERE/'results'/case['fieldPacket']['path']).read_bytes()
    if sha(payload)!=case['fieldPacket']['sha256']: raise ValueError('Plot field seal changed')
    field=json.loads(gzip.decompress(payload)); r,z,w=[np.array(field[k]) for k in ('r','z','omegaRadS')]
    rc=np.sqrt((r[:-1]**2+r[1:]**2)/2); zc=(z[:-1]+z[1:])/2
    curl=np.gradient(rc[None,:]*w*w,zc,axis=0,edge_order=2)
    fig,axes=plt.subplots(1,2,figsize=(10,4),layout='constrained')
    for ax,values,title,unit in zip(axes,(w/1000,curl/1e6),
            ('Azimuthal angular speed','Centrifugal-only compatibility'),('10³ rad/s','10⁶ s⁻²')):
        picture=ax.pcolormesh(r*100,z*100,values,shading='flat',cmap='viridis')
        ax.set(xlabel='Radius (cm)',ylabel='Distance from midplane (cm)',title=title)
        fig.colorbar(picture,ax=ax,label=unit)
    fig.savefig(HERE/'results/spatial-assessment.png',dpi=170); plt.close(fig)


def main():
    directory=HERE/'results'; flow=(directory/'flow-predictions.json').read_bytes()
    index_raw=(directory/'optical-index.json').read_bytes(); index=json.loads(index_raw)
    groups={g['path']:(directory/g['path']).read_bytes() for g in index['groups']}
    target=HERE.parent/'profile-v79/results/score.json'; target_raw=target.read_bytes()
    result=compare(flow,index,groups,json.loads(target_raw)['points'])
    result.update(targetFileSHA256=sha(target_raw),opticalIndexSHA256=sha(index_raw))
    (directory/'comparison.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    figures(result,flow)
    if (directory/'flow-predictions.json').read_bytes()!=flow:
        raise ValueError('Scoring changed flow')
    print(json.dumps(dict(alternatives=len(result['cases']),anyEligiblePointPass=result['anyEligiblePointPass'],
                          anyAllPointPass=result['anyAllPointPass']),indent=2))


if __name__=='__main__': main()
