"""Describe sealed numerical refinement; never reads measured velocities."""
import hashlib
import json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

HERE=Path(__file__).parent


def relative(old,new):
    old,new=np.asarray(old),np.asarray(new)
    if np.any((new==0)&(old!=0)): return None
    return float(np.max(np.divide(abs(old-new),abs(new),out=np.zeros_like(new,dtype=float),where=new!=0)))


def main():
    directory=HERE/'results'; raw=(directory/'predictions.json').read_bytes(); data=json.loads(raw)
    groups=[]; fig,axes=plt.subplots(1,2,figsize=(11,4.5),layout='constrained')
    for scenario in data['scenarios']:
        for center in (.07,.08):
            rows=[r for r in data['cases'] if r['scenario']==scenario['name'] and r['anodeCenterM']==center
                  and r['radialRefinement']==r['axialRefinement']]
            rows.sort(key=lambda r:r['radialRefinement']); old,new=rows[-2:]
            powers=('electrodePowerW','jouleW','viscousW')
            global_changes={k:relative(old['prediction'][k],new['prediction'][k]) for k in powers}
            global_changes.update(current=relative(old['prediction']['currentsA']['cathode'],new['prediction']['currentsA']['cathode']),
                                  chords=relative(old['chordVelocityMS'],new['chordVelocityMS']))
            regional=[]
            for a,b in zip(old['regions'],new['regions']):
                if a['axialEdgesM']!=b['axialEdgesM']: raise ValueError('Comparison domain moved')
                regional.append(dict(name=b['name'],axialEdgesM=b['axialEdgesM'],
                    jouleRelative=relative(a['jouleVoltEquivalent'],b['jouleVoltEquivalent']),
                    workRelative=relative(a['rotorWorkVoltEquivalent'],b['rotorWorkVoltEquivalent'])))
            group=dict(scenario=scenario['name'],anodeCenterM=center,shape=new['shape'],accessDepthM=new['accessDepthM'],
                currentA=new['prediction']['currentsA']['cathode'],required100AVoltage=18.5*100/new['prediction']['currentsA']['cathode'],
                globalFinalRelativeChanges=global_changes,regionalFinalRelativeChanges=regional)
            groups.append(group); label=scenario['name']+f' {center:g}m'
            axes[0].plot([r['radialRefinement'] for r in rows],[r['prediction']['currentsA']['cathode'] for r in rows],'o-',label=label)
            changes=[]
            for a,b in zip(rows,rows[1:]):
                values=[relative(x[k],y[k]) for x,y in zip(a['regions'],b['regions']) for k in ('jouleVoltEquivalent','rotorWorkVoltEquivalent')]
                changes.append(max(v for v in values if v is not None))
            axes[1].plot([2,4,8],np.array(changes)*100,'o-')
    axes[0].set(xlabel='Joint mesh refinement',ylabel='Current at18.5 V (A)')
    axes[1].set(xlabel='Fine refinement in each pair',ylabel='Worst regional budget change (%)',yscale='log')
    axes[1].axhline(5,color='black',ls='--',label='5% criterion'); axes[1].legend(fontsize=8)
    axes[0].legend(fontsize=6)
    for ax in axes: ax.grid(alpha=.15); ax.set_xticks([1,2,4,8])
    fig.savefig(directory/'convergence.png',dpi=170); plt.close(fig)
    result=dict(predictionSHA256=hashlib.sha256(raw).hexdigest(),experimentalQualification=False,groups=groups,
        summarySourceSHA256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest())
    (directory/'summary.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    if (directory/'predictions.json').read_bytes()!=raw: raise ValueError('Summary changed predictions')
    print(json.dumps(result,indent=2))


if __name__=='__main__': main()
