import gc, gzip, json, resource, sys, time
from pathlib import Path
import numpy as np

producer=Path('/work/project/v107-candidate01')
sys.path.insert(0,str(producer/'scientific/refinement-v107'))
import campaign107 as campaign
import transport108 as diagnostic
from ring_flux107 import read_case,sha
from source_response107 import STEPS,statistics

audit_path=Path('/work/project/v107-entry02/results-full-radial01/stable-audit.json')
audit_sha=sha(audit_path.read_bytes())
summary=json.loads(audit_path.with_name('summary.json').read_bytes())
if audit_sha!='f63ed0efb04ad2a632ffddc4b2074755d5424b5d2d5490ad6f00ea9a3661cbd5' or summary['caseAdmissionPass'] is not True or summary['stableAuditSHA256']!=audit_sha:
    raise ValueError('Wrong admission')
seals={4:'2bf3bb52b5667feab7d02e51f98665446b9f185c4cf09ba3dd2a3a61963f2ff9',
       8:'05b1dd693327557767ae4bc8f14211d874323acc53dac343e254849626ac476f',
       16:'786b52edf45d1436665bab421b8131f60b932accdb240ad475b9acbbfb8e9a61'}
def admitted(rn):
    return read_case(producer/'results'/f'full-r{rn}-z2-cfl0.1'/'predictions.json',seals[rn],producer)
def initialize(packet,state,rn):
    prior=campaign.old.mesh
    try:
        campaign.old.mesh=lambda _:campaign.geometry(rn,2)
        f,d,e,q=campaign.old.initialize(packet['scenario'],packet['manifest'],1)
    finally:campaign.old.mesh=prior
    if not np.array_equal(q,np.asarray(state['snapshots'][0]['q'])):
        raise ValueError('Wrong initialized q0')
    if d.__class__.__name__!='FVDiffusion':raise ValueError('Wrong heat operator')
    del e
    return f,d

rows=[]
for cn,fn in ((8,16),(4,8)):
    started=time.monotonic();print('START_PAIR',cn,fn,flush=True)
    pf,sf=admitted(fn);ff,df=initialize(pf,sf,fn)
    cache={}
    for snapshot in sf['snapshots']:
        q=np.asarray(snapshot['q'],dtype=float)
        for h in STEPS:cache[snapshot['timeS'],h]=diagnostic.split(ff,df,q,h)
    del df;gc.collect()
    pc,sc=admitted(cn)
    if pc['scenario']!=pf['scenario'] or pc['manifest']!=pf['manifest']:
        raise ValueError('Physical input mismatch')
    fc,dc=initialize(pc,sc,cn);records=[]
    for cs,fs in zip(sc['snapshots'],sf['snapshots']):
        for h in STEPS:
            result=diagnostic.compare(fc,dc,np.asarray(cs['q']),ff,np.asarray(fs['q']),cache[fs['timeS'],h],h)
            result.update(timeS=cs['timeS'],dtS=h)
            records.append(result)
    result=dict(scope='Frozen stress/conduction commutators; no trajectory or qualification',
        radialPair=[cn*20,fn*20],axialCells=48,snapshots=records,
        predictionSHA256={str(n):seals[n] for n in (cn,fn)},
        producerSourceSHA256=pf['sourceSHA256'],canonicalAuditSHA256=audit_sha,
        physicalManifest=pf['manifest'],scenario=pf['scenario'],initializedQ0BitwiseMatch=True,
        elapsedS=time.monotonic()-started,peakResidentKiB=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss)
    raw=json.dumps(result,separators=(',',':'),allow_nan=False).encode();packed=gzip.compress(raw,mtime=0)
    name=f'r{cn}-r{fn}.json.gz'
    with Path(name).open('xb') as stream:stream.write(packed)
    row=dict(path=name,sha256=sha(packed),rawSHA256=sha(raw),elapsedS=result['elapsedS'],peakResidentKiB=result['peakResidentKiB'])
    rows.append(row);print('DIAGNOSED',json.dumps(row),flush=True)
    admitted(cn);admitted(fn)
    del pf,sf,pc,sc,ff,fc,dc,cache,result,raw,packed;gc.collect()
with Path('summary.json').open('x') as stream:
    json.dump(dict(scope='Stress/conduction isolation, not qualification',canonicalAuditSHA256=audit_sha,cases=rows),stream,indent=2)
