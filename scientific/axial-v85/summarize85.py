"""Report every frozen viscosity comparison; no parameter choice or fitting."""
import gzip
import hashlib
import json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

HERE=Path(__file__).resolve().parent


def sha(raw): return hashlib.sha256(raw).hexdigest()


def scores(directory):
    summary=json.loads((directory/'summary.json').read_text()); raw=(directory/'comparison.json.gz').read_bytes()
    if sha(raw)!=summary['comparisonSHA256']: raise ValueError('Comparison seal changed')
    result=json.loads(gzip.decompress(raw))
    if sha(gzip.decompress(raw))!=summary['comparisonRawSHA256']: raise ValueError('Raw comparison seal changed')
    if result['predictionSHA256']!=sha((directory/'predictions.json').read_bytes()): raise ValueError('Score/flow binding changed')
    return result['cases']


def main():
    out=HERE/'results'; original=HERE.parent/'boundary-v84/results'
    packet=(out/'predictions.json').read_bytes(); flow=json.loads(packet)
    diagnostics=json.loads((out/'diagnostics.json').read_text()); audit=json.loads((out/'audit.json').read_text())
    if diagnostics['predictionSHA256']!=audit['predictionSHA256'] or audit['predictionSHA256']!=sha(packet):
        raise ValueError('Diagnostic/audit seal changed')
    families={'radial-viscosity':scores(original),'published-uniform':scores(out)}
    result=dict(predictionSHA256=sha(packet),baselinePredictionSHA256=flow['baselinePredictionSHA256'],
        experimentalQualification=False,currentFitted=False,circulationVelocityPredicted=False,
        flowAndDiagnosticNumericalPass=audit['allRequiredNumericalPass'],families={},cases=[])
    for label,rows in families.items():
        result['families'][label]=dict(alternatives=len(rows),allPointMatches=sum(r['allPointGate'] for r in rows),
            resolvedMatches=sum(r['resolvedOpticalPointMatch'] for r in rows),
            worstRelativeErrorRange=[min(r['worstRelative'] for r in rows),max(r['worstRelative'] for r in rows)])
    for row in diagnostics['cases']:
        if row['refinement']!=8: continue
        d=row['diagnostic']; torque=d['sourceTorqueNm']; work=sum(d['workW'].values())
        result['cases'].append({k:row[k] for k in ('scenario','anodeCenterM','viscosityModel')}|
            dict(radialWallTorqueFraction=d['radialWallTorqueNm']/torque,endWallTorqueFraction=d['endWallTorqueNm']/torque,
                 axialShearWorkFraction=(d['workW']['axialInteriorW']+d['workW']['endWallW'])/work,
                 pressureLoopPa=d['pressureLoopPa']))
    for category,field in [('identity','diagnosticIdentityPass'),('partition','partitionNumericalPass'),('pressure','pressureNumericalPass')]:
        gates=[g for g in audit['diagnosticGates'] if g['category']==category and g['final']]
        result[category+'Assessment']=dict(passed=audit[field],maxFinalRelative=max(g['value'] for g in gates),
                                          finalFailures=sum(not g['passed'] for g in gates))
    result['postHocFixedDomainAssessment']=dict(passed=audit['supplementalDirectionalWorkPass'],
        maxRelative=max(g['value'] for g in audit['supplementalGates']),
        maxFineHalfCellWorkShare=max(g['fineShareOfShearWork'] for g in audit['supplementalHalfCellDecay']),
        maxHalfCellChangeOverTotalWork=max(g['absoluteChangeOverFineTotalShear'] for g in audit['supplementalHalfCellDecay']),
        scope=audit['supplementalScope'])
    fig,axes=plt.subplots(1,2,figsize=(13,5.5),layout='constrained')
    rows=result['cases']; x=np.arange(len(rows)); radial=[r['radialWallTorqueFraction'] for r in rows]
    axes[0].bar(x,radial,label='Cylindrical wall',color='#548b93')
    axes[0].bar(x,[r['endWallTorqueFraction'] for r in rows],bottom=radial,label='Endwall',color='#c58a4d')
    tags=[r['scenario'].replace('-finite-','\n')+f"\na={r['anodeCenterM']:.2f} {'R' if r['viscosityModel']=='radial-viscosity' else 'U'}" for r in rows]
    axes[0].set(xticks=x,xticklabels=tags,ylabel='Fraction of fixed Lorentz torque',title='Where angular momentum leaves the gas')
    axes[0].tick_params(axis='x',labelsize=6,rotation=90); axes[0].legend(fontsize=8)
    for label,style in [('radial-viscosity','-'),('published-uniform','--')]:
        for scenario in flow['scenarios']:
            for center in (.07,.08):
                d=next(r['diagnostic'] for r in diagnostics['cases'] if r['viscosityModel']==label
                       and r['scenario']==scenario['name'] and r['anodeCenterM']==center and r['refinement']==8)
                axes[1].plot(np.asarray(d['axialEdgesM'])*100,np.asarray(d['axialViscousTorqueFluxNm'])/d['sourceTorqueNm'],style,linewidth=1.)
    axes[1].set(xlabel='Distance from midplane (cm)',ylabel='Axial viscous torque flux / total drive',
                title='All cases: radial viscosity solid, uniform dashed')
    for ax in axes: ax.grid(axis='y',alpha=.15)
    fig.savefig(out/'axial-torque.png',dpi=160); plt.close(fig)
    (out/'paired-summary.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    if (out/'predictions.json').read_bytes()!=packet: raise ValueError('Summary changed predictions')
    print(json.dumps({k:v for k,v in result.items() if k!='cases'},indent=2))


if __name__=='__main__': main()
