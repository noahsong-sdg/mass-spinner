"""Human-readable summaries of all retained gates and declared scenarios."""
import json
from collections import Counter
from pathlib import Path

HERE=Path(__file__).parent/'results'


def main():
    flow=json.loads((HERE/'flow-predictions.json').read_text())
    comparison=json.loads((HERE/'comparison.json').read_text())
    audit=json.loads((HERE/'flow-audit.json').read_text())
    optics=json.loads((HERE/'optical-audit.json').read_text())
    rows=comparison['cases']
    result=dict(flowCases=len(flow['cases']),opticalAlternatives=len(rows),
        eligiblePassCount=sum(r['eligiblePointGate'] for r in rows),allPointPassCount=sum(r['allPointGate'] for r in rows),
        flowNumericalPass=audit['flowNumericalPass'],meridionalAssessmentNumericalPass=audit['meridionalAssessmentNumericalPass'],
        opticalNumericalPass=optics['finalNumericalPass'],
        finalFlowFailures=[g for g in audit['failures'] if g['final'] and g['group']=='flow'],
        finalAssessmentFailures=[g for g in audit['failures'] if g['final'] and g['group']=='assessment'],
        finalOpticalFailureCounts=dict(Counter(f['metric'] for f in optics['failures'] if f['final'])),
        opticalLPUnavailable=len(optics['lpUnavailable']),
        nominalCentroids=[r for r in rows if r['voltageV']==18.5 and r['edgeClosure']=='linear'
            and r['temperatureK']==2900 and r['instrumentSigmaMS']==0 and r['estimator']=='centroidMS'],
        sourceAbsoluteElectrical=audit['sourceAbsoluteElectrical'],
        nominalMeridional=[dict(transportCase=c['transportCase'],beta=c['beta'],**c['prediction']['meridional'])
            for c in flow['cases'] if c['refinement']==4 and c['voltageV']==18.5],
        maximaByGateMetric={name:max(g['value'] for g in audit['gates'] if g['metric']==name and g['value'] is not None)
            for name in {g['metric'] for g in audit['gates']}},
        experimentalQualification=False)
    (HERE/'summary.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    print(json.dumps({k:v for k,v in result.items() if k not in ('nominalCentroids','nominalMeridional','finalFlowFailures','finalAssessmentFailures','sourceAbsoluteElectrical')},indent=2))


if __name__=='__main__': main()
