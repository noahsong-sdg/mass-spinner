"""Independent saved-state arithmetic, stdlib only; run in the existing guest."""
import gzip
import hashlib
import json
import math
from pathlib import Path

root=Path('scientific/collision-v38')
directory=root/'execution'
protocol_bytes=(root/'protocol.json').read_bytes()
protocol=json.loads(protocol_bytes)
ledger=json.loads((directory/'execution-status.json').read_text())
assert ledger['protocolSha256']==hashlib.sha256(protocol_bytes).hexdigest()
expected={(level['id'],seed) for level in protocol['levels'] for seed in protocol['seeds']}
terminals={(row['level'],row['seed']):row for row in ledger['runs']}
assert len(terminals)==len(ledger['runs']) and set(terminals)==expected
assert all(row['status']=='complete' and type(row['exitCode']) is int and row['exitCode']==0 for row in terminals.values())
runs={}
max_exposure_difference=0.
max_momentum_difference=0.
for path in sorted((directory/'results').glob('*.json.gz')):
    run=json.loads(gzip.decompress(path.read_bytes()))
    key=(run['level'],run['seed'])
    assert key in expected and key not in runs and run['status']=='complete'
    raw=run['raw']; history=raw['history']; regime=raw['regimeHistory']
    assert len(history)==len(regime)>1
    assert history[0]['time']==0 and history[-1]['time']==protocol['durationSeconds']
    numerator=denominator=0.
    for index in range(1,len(history)):
        dt=history[index]['time']-history[index-1]['time']
        assert dt>0
        for endpoint in (index-1,index):
            assert history[endpoint]['time']==regime[endpoint]['time']
            active=sum(species['active'] for species in history[endpoint]['species'])
            fraction=regime[endpoint]['assessment']['observed']['unresolvedRepresentativeFraction']
            if active:
                assert type(fraction) in (int,float) and math.isfinite(fraction) and 0<=fraction<=1
                denominator+=active*dt/2
                numerator+=active*fraction*dt/2
    exposure=numerator/denominator
    momentum=max(abs(frame['momentumResidual']) for frame in history)
    max_exposure_difference=max(max_exposure_difference,abs(exposure-run['diagnostics']['unresolvedExposure']))
    max_momentum_difference=max(max_momentum_difference,abs(momentum-run['diagnostics']['maxRawMomentumResidual']))
    assert abs(exposure-run['diagnostics']['unresolvedExposure'])<1e-14
    assert abs(momentum-run['diagnostics']['maxRawMomentumResidual'])<1e-14
    run['independentExposure']=exposure;run['independentMomentum']=momentum
    runs[key]=run
assert set(runs)==expected
collisional=[run for run in runs.values() if run['config']['collisions']]
differences=[]
control,collision=protocol['effect']
for seed in protocol['seeds']:
    def end_fraction(level):
        species=runs[(level,seed)]['raw']['species'][0]
        return species['end']/species['injected']
    differences.append(end_fraction(collision)-end_fraction(control))
mean=sum(differences)/len(differences)
se=math.sqrt(sum((value-mean)**2 for value in differences)/(len(differences)*(len(differences)-1)))
report=json.loads((directory/'reconciled-readout.json').read_text())
assert abs(report['effects']['A.fraction.end']['mean']-mean)<1e-15
assert abs(report['effects']['A.fraction.end']['standardError']-se)<1e-15
counts={status:0 for status in ('pass','fail','unknown')}
for comparison in report['comparisons']:
    for observable in comparison['observables'].values():
        if observable['budget'] is not None:counts[observable['status']]+=1
print(json.dumps({'scope':'Saved-data recomputation only; no new physical simulation',
 'terminalCases':len(terminals),'uniqueRawCases':len(runs),'collisionalCases':len(collisional),
 'unresolvedExposureAbove1Percent':sum(run['independentExposure']>.01 for run in collisional),
 'rawAngularAbovePoint1Percent':sum(run['independentMomentum']>.001 for run in collisional),
 'sampledOutsideRuns':sum(any(frame['assessment']['status']=='outside-supported-domain' for frame in run['raw']['regimeHistory']) for run in collisional),
 'maxExposureReconstructionDifference':max_exposure_difference,'maxAngularReconstructionDifference':max_momentum_difference,
 'pairedEndADifferences':differences,'pairedEndAMean':mean,'pairedEndAStandardError':se,
 'pairedEndAHalfWidth95':2.570582*se,'recordedComparisonCounts':counts},indent=2))
