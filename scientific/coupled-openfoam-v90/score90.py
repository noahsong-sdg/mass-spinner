"""Independent conservative common-grid scoring; prospective gates stay fixed."""
import json
from pathlib import Path
import sys

import numpy as np
from reference90 import geometry, sha


def restrict(q,n):
    fine = q.shape[-1]
    if fine%n or q.shape[-2]!=2*fine or q.shape[0]!=6:
        raise ValueError('Need nested cylindrical integrated states')
    factor = fine//n
    return q.reshape(6,2*n,factor,n,factor).sum(axis=(2,4))


def fields(q):
    flow = geometry(q.shape[-1])
    p = flow.primitive(q)
    return dict(rho=p['densityKgM3'],T=p['temperatureK'],
                swirl=p['omegaRadS']*flow.mean_r[None,:],
                meridional=np.array([p['vrMPS'],p['vzMPS']]))


def rms(value,volume):
    return float(np.sqrt(np.sum(volume*value**2)/np.sum(volume)))


def difference(a,b,increment=False):
    n = min(a.shape[-1],b.shape[-1])
    a0,af,b0,bf = [fields(restrict(q,n)) for q in (a[0],a[-1],b[0],b[-1])]
    volume = geometry(n).volume
    rows = {}
    for key in af:
        av,bv = (af[key]-a0[key],bf[key]-b0[key]) if increment else (af[key],bf[key])
        scale = max(rms(av,volume),rms(bv,volume))
        rows[key] = dict(absoluteRMS=rms(av-bv,volume),scaleRMS=scale,
                         relative=None if scale==0 else rms(av-bv,volume)/scale)
    return rows


def require_packets(root,rows):
    packets = {}
    for row in rows:
        if not row['completed']:
            raise ValueError('Incomplete physical case: '+row['label'])
        path = root/row['packet']
        if sha(path)!=row['packetSHA256']:
            raise ValueError('Packet hash mismatch')
        with np.load(path,allow_pickle=False) as data:
            if set(data.files)!={'native','v86'}:
                raise ValueError('Unexpected packet field inventory')
            packets[row['label']] = {k:data[k].copy() for k in data.files}
        for packet in packets[row['label']].values():
            if packet.shape!=(4,6,2*row['n'],row['n']) or not np.all(np.isfinite(packet)):
                raise ValueError('Incomplete/nonfinite state history')
            for q in packet:
                geometry(row['n']).primitive(q)
    return packets


def audit(root,extension=None):
    data = json.loads((root/'predictions.json').read_text())
    rows = data['cases']
    expected = {f'n{n}-s{s}-a{a}-work{int(w)}' for n,s,a,w in
                [(n,512,.5,True) for n in (8,16,32)]+[(16,s,.5,True) for s in (256,1024)]+
                [(16,512,.25,True),(16,512,.5,False)]}
    if len(rows)!=len(expected) or {r['label'] for r in rows}!=expected:
        raise ValueError('Full prospective campaign is required')
    packets = require_packets(root,rows)
    ns,temporal_n = (8,16,32),16
    if extension is not None:
        extra = json.loads((extension/'predictions.json').read_text())['cases']
        required = {f'n64-s{s}-a0.5-work1' for s in (256,512,1024)}
        if len(extra)!=3 or {r['label'] for r in extra}!=required:
            raise ValueError('Complete prospective refinement extension required')
        packets.update(require_packets(extension,extra))
        rows = rows+extra
        ns,temporal_n = (16,32,64),64
    gates = []
    def gate(name,value,limit):
        gates.append(dict(name=name,value=value,limit=limit,
                          passed=value is not None and np.isfinite(value) and value<limit))
    def refinement(name,first,second,limit):
        for key in first:
            a,b = first[key]['relative'],second[key]['relative']
            gate(name+'/'+key+'/fine',b,limit)
            gate(name+'/'+key+'/contraction',None if a is None or a==0 or b is None else b/a,1.)
    for row in rows:
        for solver in ('native','v86'):
            history = row[solver]['history']
            if len(history)!=4 or not np.allclose([h['timeS'] for h in history],[0,5e-6,1e-5,2e-5],rtol=1e-12,atol=0):
                raise ValueError('Reporting clock mismatch')
            for key,limit in [('massKg',1e-8),('energyJ',1e-6)]:
                gate(row['label']+'/'+solver+'/'+key,
                     max(abs(h[key]/history[0][key]-1) for h in history),limit)
        history = row['native']['history']
        residual = history[-1]['angularKgM2S']-history[0]['angularKgM2S']+row['native']['wallImpulseKgM2S']
        gate(row['label']+'/wall-angular-budget',abs(residual/history[0]['angularKgM2S']),.01)
    base = [packets[f'n{n}-s512-a0.5-work1'] for n in ns]
    comparisons = {}
    for inc in (False,True):
        label = 'increment' if inc else 'whole'
        cross = [difference(p['native'],p['v86'],inc) for p in base]
        comparisons['cross-'+label] = cross
        refinement('cross-'+label,cross[1],cross[2],.05)
        for solver in ('native','v86'):
            space = [difference(base[i][solver],base[i+1][solver],inc) for i in (0,1)]
            refinement(solver+'/space-'+label,*space,.05)
            clock = [packets[f'n{temporal_n}-s{s}-a0.5-work1'][solver] for s in (256,512,1024)]
            temporal = [difference(clock[i],clock[i+1],inc) for i in (0,1)]
            refinement(solver+'/time-'+label,*temporal,.02)
            comparisons[solver+'/'+label] = dict(space=space,time=temporal)
    for key,row in difference(packets['n16-s512-a0.5-work1']['native'],packets['n16-s512-a0.25-work1']['native']).items():
        gate('wedge/'+key,row['relative'],.001)
    negative = difference(packets['n16-s512-a0.5-work1']['native'],packets['n16-s512-a0.5-work0']['native'],True)
    return dict(gates=gates,comparisons=comparisons,stressWorkNegativeControl=negative,
                spatialMeshes=list(ns),timestepMesh=temporal_n,
                numericalComparisonPass=all(g['passed'] for g in gates),experimentalQualification=False)


if __name__=='__main__':
    root = Path(sys.argv[1])
    extension = Path(sys.argv[2]) if len(sys.argv)>2 else None
    result = audit(root,extension)
    target = root/('audit-extension.json' if extension else 'audit.json')
    if target.exists():
        raise FileExistsError(target)
    target.write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    print(json.dumps(dict(gates=len(result['gates']),failures=sum(not g['passed'] for g in result['gates']))))
    raise SystemExit(not result['numericalComparisonPass'])
