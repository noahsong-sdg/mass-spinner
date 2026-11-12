"""Check every replayed field against the pre-acceleration frozen attempt."""
import gzip
import hashlib
import json
from pathlib import Path

HERE=Path(__file__).resolve().parent; RESULTS=HERE.parent/'meridional-v86/results'


def sha(raw): return hashlib.sha256(raw).hexdigest()


def main():
    oldraw=(RESULTS/'attempt01/predictions.json').read_bytes(); raw=(RESULTS/'predictions.json').read_bytes()
    old,new=map(json.loads,(oldraw,raw)); previous={c['label']:c for c in old['cases']}
    if set(previous)!={c['label'] for c in new['cases']} or len(new['cases'])!=26: raise ValueError('Changed replay inventory')
    for name in ('campaign86.py','diffusion86.py','electro86.py'):
        key='scientific/meridional-v86/'+name
        if old['sourceSHA256'][key]!=new['sourceSHA256'][key]: raise ValueError('Flow source changed: '+name)
    for case in new['cases']:
        other=previous[case['label']]
        if not case['completed'] or not other['completed']: raise ValueError('Incomplete replay')
        for base,c in ((RESULTS,case),(RESULTS/'attempt01',other)):
            p=c['fieldPacket']; packed=(base/p['path']).read_bytes()
            if sha(packed)!=p['sha256'] or sha(gzip.decompress(packed))!=p['rawSHA256']: raise ValueError('Stale replay field')
        if case['fieldPacket']['rawSHA256']!=other['fieldPacket']['rawSHA256']: raise ValueError('Field changed: '+case['label'])
    report=dict(oldPredictionSHA256=sha(oldraw),predictionSHA256=sha(raw),identicalFields=26,
        everySavedStateAndHistoryBitwiseIdentical=True,targetVelocityRead=False,
        sourceSHA256=sha(Path(__file__).read_bytes()))
    (RESULTS/'field-replay.json').write_text(json.dumps(report,indent=2)+'\n'); print(json.dumps(report,indent=2))


if __name__=='__main__': main()
