"""Report admitted V87 temporal evidence without promoting its scope."""
import hashlib
import json
from pathlib import Path
import sys
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

HERE=Path(__file__).resolve().parent; ROOT=HERE.parent.parent
sys.path.insert(0,str(HERE.parent/'tooling-v87'))
from check_report87 import validate_inputs


def sha(raw): return hashlib.sha256(raw).hexdigest()


def finite_time_summary(gates):
    rows=[g for g in gates if g['timeS']>0]
    defined=[g for g in rows if g['fineChange'] is not None]
    return rows,len(rows)-len(defined),max(defined,key=lambda g:g['fineChange']) if defined else None


def admitted_panel(path,expected):
    raw=path.read_bytes()
    if sha(raw)!=expected: raise ValueError('V86 panel changed after admission')
    return json.loads(raw)


def main():
    directory=HERE/'results'
    raw={name:(directory/name).read_bytes() for name in ('predictions.json','audit.json')}
    packet,audit=[json.loads(raw[name]) for name in ('predictions.json','audit.json')]
    if sha(raw['predictions.json'])!=audit['predictionSHA256']:
        raise ValueError('Stale temporal audit')
    for hashes in (audit['sourceSHA256'],audit['checkerSHA256']):
        for name,digest in hashes.items():
            if sha((ROOT/name).read_bytes())!=digest: raise ValueError('Stale audit source: '+name)
    prior=HERE.parent/'meridional-v86/results'
    admission=validate_inputs(prior,HERE.parent/'profile-v79/results/score.json')
    if admission['predictionSHA256']!=packet['baselinePredictionSHA256']:
        raise ValueError('Wrong V86 report baseline')
    old=admitted_panel(prior/'panel-audit.json',admission['artifactSHA256']['panel-audit.json'])
    if any(audit[k] is not False for k in ('fullModelNumericallyQualified','experimentalQualification','allRequiredNumericalPass')):
        raise ValueError('Temporal slice cannot qualify full model')
    finite,unresolved,largest=finite_time_summary(audit['gates'])
    summary=dict(predictionSHA256=sha(raw['predictions.json']),auditSHA256=sha(raw['audit.json']),
        reportSourceSHA256={str(p.relative_to(ROOT)):sha(p.read_bytes()) for p in
            (Path(__file__).resolve(),HERE.parent/'tooling-v87/check_report87.py')},
        baselineReportAdmission=admission,baselineBitwiseReplay=audit['baselineBitwiseReplay'],
        temporalSliceNumericalPass=audit['temporalSliceNumericalPass'],
        temporalGateCount=len(audit['gates']),temporalFailureCount=len(audit['failures']),
        quadratureCheckCount=len(audit['quadratureChecks']),quadratureFailureCount=len(audit['quadratureFailures']),
        largestFineChange=largest,unresolvedFiniteTimeComparisons=unresolved,activity=audit['activity'],
        activityRefinements=audit['activityRefinements'],ledger=audit['ledger'],
        retainedV86FieldFailures=len(old['supplementalFailures']),
        retainedV86SpatialFailures=sum(g['kind']=='spatial' for g in old['supplementalFailures']),
        fullModelNumericallyQualified=False,experimentalQualification=False,
        scope='One fixed-grid temporal slice only. No optical re-scoring, physical-closure correction or experimental validation.')
    (directory/'summary.json').write_text(json.dumps(summary,indent=2,allow_nan=False)+'\n')
    fields=list(dict.fromkeys(g['field'] for g in finite))
    fig,axes=plt.subplots(2,4,figsize=(13,6),layout='constrained')
    for ax,name in zip(axes.flat,fields):
        rows=[g for g in finite if g['field']==name]
        for term,label,style in (('coarseChange','CFL .2 vs .1','o--'),('fineChange','CFL .1 vs .05','s-')):
            ax.plot([g['timeS']*1e6 for g in rows],[100*g[term] if g[term] is not None else float('nan') for g in rows],style,label=label)
        ax.axhline(2,color='0.5',linewidth=.8); ax.set(title=name,xlabel='Time (microseconds)',ylabel='Relative RMS change (%)')
        ax.grid(alpha=.2)
    axes.flat[-1].axis('off'); axes.flat[0].legend(fontsize=8)
    fig.suptitle('Active-CFL temporal refinement: one spatially unresolved conditional slice')
    fig.savefig(directory/'temporal-refinement.png',dpi=180); plt.close(fig)
    print(json.dumps({k:summary[k] for k in ('temporalSliceNumericalPass','temporalFailureCount',
        'quadratureFailureCount','largestFineChange','retainedV86SpatialFailures')},indent=2))


if __name__=='__main__': main()
