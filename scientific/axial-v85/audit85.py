"""Independent saved-ledger/source/refinement audit; no diagnostic producer imports."""
import hashlib
import json
from pathlib import Path
import sys
import numpy as np

sys.path.insert(0,str(Path(__file__).parents[1]/'boundary-v84'))
import audit84

BASELINE='f328e73864378179280f14495fa0963613b9954ddce576dabe91c052f4ea6d74'
LABEL='Published uniform neutral-Ar 1.14e-4 Pa s; historical control'
SOURCES={'scientific/axial-v85/'+n for n in ('PROTOCOL.md','campaign85.py','diagnostics85.py')}
WORK=('radialInteriorW','axialInteriorW','radialWallW','endWallW')
TORQUE=('radialWallTorqueNm','endWallTorqueNm')
LOOPS=('centrifugalPa','hallPa','totalPa')
require=audit84.require


def sha(raw): return hashlib.sha256(raw).hexdigest()


def supplemental(packet,baseline,records):
    """Post hoc explanation only: fixed-domain directional work, never a gate replacement."""
    gates=[]; decay=[]
    for label,data in [('published-uniform',packet),('radial-viscosity',baseline)]:
        for scenario in audit84.NAMES:
            for center in (.07,.08):
                context=(label,scenario,center)
                coarse,fine=(records[label,scenario,center,n] for n in (4,8))
                for direction,names in [('radial',('radialInteriorW','radialWallW')),('axial',('axialInteriorW','endWallW'))]:
                    x,y=(sum(row['workW'][k] for k in names) for row in (coarse,fine))
                    value=abs(x-y)/abs(y) if y else (0. if x==0 else None)
                    gates.append(dict(metric=direction+' total shear work',value=value,limit=.05,context=context,
                        final=True,passed=bool(value is not None and value<.05)))
                widths=[]
                for n in (4,8):
                    r,z=audit84.edges({**data['manifest'],'anodeCenterM':center},n)
                    widths.append(dict(radialWallW=float(r[-1]-np.sqrt((r[-1]**2+r[-2]**2)/2)),
                                       endWallW=float((z[-1]-z[-2])/2)))
                totals=[sum(row['workW'].values()) for row in (coarse,fine)]
                for name in ('radialWallW','endWallW'):
                    x,y=(row['workW'][name] for row in (coarse,fine))
                    decay.append(dict(context=context,metric=name,coarseWorkW=x,fineWorkW=y,
                        coarseShareOfShearWork=x/totals[0],fineShareOfShearWork=y/totals[1],
                        absoluteChangeOverFineTotalShear=abs(x-y)/totals[1],
                        coarseToFineWorkRatio=x/y if y else None,
                        coarseHalfCellWidthM=widths[0][name],fineHalfCellWidthM=widths[1][name],
                        coarseToFineWidthRatio=widths[0][name]/widths[1][name]))
    return dict(supplementalDirectionalWorkPass=all(g['passed'] for g in gates),supplementalGates=gates,
        supplementalHalfCellDecay=decay,
        supplementalScope='Post hoc fixed-whole-domain directional shear-work assessment and shrinking boundary-half-cell diagnostics. Original partition gates, their failures and allRequiredNumericalPass are unchanged. Not experimental qualification.')


def check(packet,baseline,diagnostics,root):
    """Validate provenance and accounting independently of the diagnostic implementation."""
    require(packet['baselinePredictionSHA256']==diagnostics['baselinePredictionSHA256']==BASELINE,'Baseline binding changed')
    require(packet['viscosityModel']==LABEL,'Uniform source viscosity control changed')
    sources=packet['v85SourceSHA256']; require(set(sources)==SOURCES,'New source receipt incomplete')
    for name,value in sources.items(): require(sha((root/name).read_bytes())==value,'Stale new source receipt: '+name)
    require(diagnostics['targetVelocityRead'] is False and diagnostics['circulationVelocityPredicted'] is False,'False diagnostic qualification')
    key=lambda r:(r['scenario'],r['anodeCenterM'],r['refinement'])
    expected={(s,c,n) for s in audit84.NAMES for c in (.07,.08) for n in (1,2,4,8)}
    families={'published-uniform':packet,'radial-viscosity':baseline}; records={}
    rows=diagnostics['cases']; require(len(rows)==64,'Diagnostic inventory changed')
    gates=[]
    def gate(category,metric,value,context,limit,final=True):
        require(np.isfinite(value) and value>=0,'Invalid gate statistic')
        gates.append(dict(category=category,metric=metric,value=float(value),limit=limit,context=context,final=final,passed=bool(value<limit)))
    for label,data in families.items():
        available={key(r):r for r in data['cases']}
        require(len(available)==len(data['cases'])==32 and set(available)==expected,'Flow family inventory changed')
        for context in expected:
            selected=[r for r in rows if key(r)==context and r['viscosityModel']==label]
            require(len(selected)==1,'Missing or duplicate diagnostic')
            row=selected[0]; source=available[context]; d=row['diagnostic']; records[label,*context]=d
            require(row['sourceFieldSHA256']==source['fieldPacket']['sha256'],'Diagnostic field binding changed')
            require(row['reportedViscousW']==source['prediction']['viscousW'],'Reported work binding changed')
            require(d['circulationVelocityPredicted'] is False,'Circulation cannot be claimed from force compatibility')
            require(d['pressureRectangleM']==[.01,.05,.02,.12],'Physical loop domain changed')
            work=d['workW']; require(set(work)==set(WORK),'Work partition changed')
            require(all(np.isfinite(work[k]) and work[k]>=0 for k in WORK),'Invalid shear work')
            total=row['reportedViscousW']; require(np.isfinite(total) and total>0,'Invalid total work')
            tagged=(label,*context)
            gate('identity','shear work',abs(sum(work.values())-total)/total,tagged,1e-8)
            z,flux,drive,wall=[np.asarray(d[k],dtype=float) for k in
                ('axialEdgesM','axialViscousTorqueFluxNm','sourceTorqueBySlabNm','radialWallTorqueBySlabNm')]
            require(z.ndim==flux.ndim==drive.ndim==wall.ndim==1 and len(z)==len(flux)==len(drive)+1
                and len(drive)==len(wall) and z[0]==0 and z[-1]==data['manifest']['halfLengthM']
                and np.all(np.diff(z)>0) and all(np.isfinite(x).all() for x in (z,flux,drive,wall)),'Invalid axial ledger')
            m=data['manifest']; scale=abs(m['magneticT']*m['branchCurrentA']*(m['radiusM']**2-m['cathodeRadiusM']**2)/2)
            for metric,a,b in [('source torque',sum(drive),scale),('source receipt',sum(drive),d['sourceTorqueNm']),
                ('radial wall receipt',sum(wall),d['radialWallTorqueNm']),('endwall receipt',flux[-1],d['endWallTorqueNm']),
                ('symmetry flux',flux[0],0.),('global torque',sum(wall)+flux[-1],sum(drive))]:
                gate('identity',metric,abs(a-b)/scale,tagged,1e-8)
            residual=float(max(abs(drive-wall-np.diff(flux)))/scale)
            gate('identity','axial slab balance',residual,tagged,1e-8)
            require(abs(residual-d['slabBalanceRelative'])<1e-12,'Slab residual receipt changed')
            loops=d['pressureLoopPa']; curl=d['rectangleMeanForceCurlNM4']
            require(set(loops)==set(curl)==set(LOOPS) and all(np.isfinite(loops[k]) for k in LOOPS),'Invalid pressure loop')
            pscale=max(abs(loops['centrifugalPa'])+abs(loops['hallPa']),np.finfo(float).tiny)
            gate('identity','pressure components',abs(loops['totalPa']-loops['centrifugalPa']-loops['hallPa'])/pscale,tagged,1e-8)
            for name in LOOPS: gate('identity','mean force curl/'+name,abs(curl[name]*.004-loops[name])/pscale,tagged,1e-8)
        for scenario in audit84.NAMES:
            for center in (.07,.08):
                for coarse,fine in ((1,2),(2,4),(4,8)):
                    a,b=records[label,scenario,center,coarse],records[label,scenario,center,fine]
                    context=(label,scenario,center,fine)
                    for name in WORK+TORQUE:
                        x,y=(q['workW'][name] if name in WORK else q[name] for q in (a,b))
                        value=abs(x-y)/abs(y) if y else (0. if x==0 else float('inf'))
                        gate('partition','mesh/'+name,value,context,.05,fine==8)
                    # Normalize signed/cancelling loops by the sum of component magnitudes.
                    scale=max(abs(b['pressureLoopPa']['centrifugalPa'])+abs(b['pressureLoopPa']['hallPa']),np.finfo(float).tiny)
                    for name in LOOPS:
                        value=abs(a['pressureLoopPa'][name]-b['pressureLoopPa'][name])/scale
                        gate('pressure','mesh/'+name,value,context,.05,fine==8)
    passed=lambda category:all(g['passed'] for g in gates if g['category']==category and g['final'])
    return dict(diagnosticCaseCount=64,diagnosticIdentityPass=passed('identity'),partitionNumericalPass=passed('partition'),
        pressureNumericalPass=passed('pressure'),diagnosticGates=gates,diagnosticFailures=[g for g in gates if not g['passed']],
        v85SourceSHA256=sources,baselinePredictionSHA256=BASELINE,circulationVelocityPredicted=False,
        diagnosticScope='Source seals and saved torque/work/loop identities and refinement. No independent force reconstruction, PDE assembly, circulation speed or experimental qualification.',
        **supplemental(packet,baseline,records))


def audit(path,root=None):
    path=Path(path).resolve(); root=Path(root).resolve() if root else path.parents[3]
    raw=path.read_bytes(); packet=json.loads(raw); baseline_raw=(root/'scientific/boundary-v84/results/predictions.json').read_bytes()
    require(sha(baseline_raw)==BASELINE,'Frozen V84 packet changed')
    diagnostic_raw=(path.parent/'diagnostics.json').read_bytes(); diagnostics=json.loads(diagnostic_raw)
    require(diagnostics['predictionSHA256']==sha(raw),'Diagnostic/prediction seal changed')
    result=audit84.audit(path,root)
    result.update(check(packet,json.loads(baseline_raw),diagnostics,root),diagnosticSHA256=sha(diagnostic_raw))
    result['allRequiredNumericalPass']=all(result[k] for k in ('identityPass','flowNumericalPass','diagnosticIdentityPass','partitionNumericalPass','pressureNumericalPass'))
    return result


def main():
    result=audit(sys.argv[1]); Path(sys.argv[2]).write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    return 0 if result['allRequiredNumericalPass'] else 1


if __name__=='__main__': raise SystemExit(main())
