"""Read-only frozen-Ar heat projection probe; no electrical or trajectory solve."""
import gc
import gzip
import json
from pathlib import Path
import resource
import sys
import time
import numpy as np

producer = Path('/work/project/v107-candidate01')
sys.path.insert(0, str(producer/'scientific/refinement-v107'))
import campaign107 as campaign
from force105 import SourceFlow
from diffusion86 import M_AR
from heat106 import FVDiffusion
from ring_flux107 import read_case, sha
from source_response107 import STEPS
import moment108 as diagnostic

AUDIT = 'f63ed0efb04ad2a632ffddc4b2074755d5424b5d2d5490ad6f00ea9a3661cbd5'
SEALS = {4:'2bf3bb52b5667feab7d02e51f98665446b9f185c4cf09ba3dd2a3a61963f2ff9',
    8:'05b1dd693327557767ae4bc8f14211d874323acc53dac343e254849626ac476f',
    16:'786b52edf45d1436665bab421b8131f60b932accdb240ad475b9acbbfb8e9a61'}
audit = Path('/work/project/v107-entry02/results-full-radial01/stable-audit.json')
summary = json.loads(audit.with_name('summary.json').read_bytes())
if sha(audit.read_bytes()) != AUDIT or summary['caseAdmissionPass'] is not True or summary['stableAuditSHA256'] != AUDIT:
    raise ValueError('Wrong canonical case admission')


def admitted(n):
    return read_case(producer/'results'/f'full-r{n}-z2-cfl0.1'/'predictions.json', SEALS[n], producer)


def flow(state, n):
    expected = campaign.geometry(n, 2)
    for actual, geometry in zip((state['radialEdgesM'], state['axialEdgesM']), expected):
        np.testing.assert_array_equal(actual, geometry)
    f = SourceFlow(*expected, [M_AR, M_AR], noSlipWalls=True)
    for s in state['snapshots']:
        for key, value in f.primitive(np.asarray(s['q'], dtype=float)).items():
            np.testing.assert_array_equal(value, s[key])
    return f


rows = []
for cn, fn in ((8, 16), (4, 8)):
    start = time.monotonic()
    pf, sf = admitted(fn); ff = flow(sf, fn)
    # No unrelated electromagnetic initialization or solve. Native D heat
    # construction is retained; its Q1 stress matrix is never advanced here.
    df = FVDiffusion(ff, pf['manifest']['viscosityPaS'])
    cache = {(s['timeS'], h): diagnostic.heat_response(ff, df, np.asarray(s['q'], dtype=float), h)
             for s in sf['snapshots'] for h in STEPS}
    del df; gc.collect()
    pc, sc = admitted(cn); fc = flow(sc, cn)
    if pc['scenario'] != pf['scenario'] or pc['manifest'] != pf['manifest']:
        raise ValueError('Changed physical inputs')
    dc = FVDiffusion(fc, pc['manifest']['viscosityPaS'])
    records = []
    for s in sf['snapshots']:
        for h in STEPS:
            result = diagnostic.diagnose(fc, dc, ff, np.asarray(s['q'], dtype=float), cache[s['timeS'], h], h)
            result.update(timeS=s['timeS'], dtS=h)
            records.append(result)
    result = dict(scope='Nonconservative thermal companion; diagnostic only; not qualified',
        radialPair=[cn*20, fn*20], axialCells=48, snapshots=records,
        canonicalAuditSHA256=AUDIT, predictionSHA256={str(n): SEALS[n] for n in (cn, fn)},
        producerSourceSHA256=pf['sourceSHA256'], physicalManifest=pf['manifest'], scenario=pf['scenario'],
        primitiveAndGeometryBitwiseMatch=True, electricalInitialized=False, trajectoryEvolved=False,
        elapsedS=time.monotonic()-start, peakResidentKiB=resource.getrusage(resource.RUSAGE_SELF).ru_maxrss)
    raw = json.dumps(result, separators=(',', ':'), allow_nan=False).encode()
    packed = gzip.compress(raw, mtime=0); name = f'moment-r{cn}-r{fn}.json.gz'
    with Path(name).open('xb') as stream:
        stream.write(packed)
    row = dict(path=name, sha256=sha(packed), rawSHA256=sha(raw),
               elapsedS=result['elapsedS'], peakResidentKiB=result['peakResidentKiB'])
    rows.append(row); print('MOMENT_DIAGNOSED', json.dumps(row), flush=True)
    admitted(cn); admitted(fn)
    del pc, sc, pf, sf, ff, fc, dc, cache, result, raw, packed; gc.collect()
with Path('moment-summary.json').open('x') as stream:
    json.dump(dict(scope='Diagnostic; original density gate unchanged', cases=rows), stream, indent=2)
