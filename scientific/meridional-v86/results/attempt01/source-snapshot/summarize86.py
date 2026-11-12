"""Describe all retained conditional results, never select a fitting clock."""
import gzip
import json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from campaign86 import sha
from compare86 import load

HERE=Path(__file__).resolve().parent


def main():
    directory=HERE/'results'; raw=(directory/'predictions.json').read_bytes(); flow=json.loads(raw)
    audit=json.loads((directory/'audit.json').read_text()); optical=json.loads((directory/'comparison-summary.json').read_text())
    if any(p['predictionSHA256']!=sha(raw) for p in (audit,optical)): raise ValueError('Stale result summary')
    cases=[]
    for c in flow['cases']:
        if not c['completed']: cases.append(c); continue
        state=load(directory,c['fieldPacket']); final=state['snapshots'][-1]
        cases.append({k:c[k] for k in ('label','nr','nz','maxDtS','scenario','anodeCenterM')} | dict(
            maxTemperatureK=max(h['maximumTemperatureK'] for h in state['history']),
            maxTotalMach=max(h['maximumTotalMach'] for h in state['history']),
            maxMeridionalSpeedMS=float(np.max(np.hypot(final['vrMPS'],final['vzMPS']))),
            numericalHeatJ=sum(h['emNumericalHeatJ']+h['viscousNumericalHeatJ'] for h in state['history']),
            ohmicHeatJ=sum(h['ohmicJ'] for h in state['history']),
            totalElectricalWorkJ=state['history'][-1]['electricalWorkJ']))
    result=dict(predictionSHA256=sha(raw),experimentalQualification=False,conditionalRelease=True,
        allRequiredNumericalPass=audit['allRequiredNumericalPass'],fieldGateFailures=len(audit['failures']),
        quadratureGateFailures=len(audit['quadratureFailures']),optical=optical,cases=cases,
        thermalReference=json.loads((directory/'thermal-reference.json').read_text())['gates'])
    (directory/'summary.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    fig,axes=plt.subplots(2,2,figsize=(11,7),layout='constrained')
    for c in flow['cases']:
        if c['nr']!=64 or c['maxDtS']!=1e-7 or c['anodeCenterM']!=.07 or not c['completed']: continue
        state=load(directory,c['fieldPacket']); h=state['history']; t=np.array([v['timeS'] for v in h])*1e6
        axes[0,0].plot(t,[v['maximumTemperatureK'] for v in h],label=c['scenario'])
        r=np.asarray(state['radialEdgesM']); rc=(2/3)*np.diff(r**3)/np.diff(r*r)
        final=state['snapshots'][-1]
        axes[0,1].plot(rc*100,np.asarray(final['omegaRadS'])[0]*rc,label=c['scenario'])
        axes[1,0].plot(rc*100,np.asarray(final['vrMPS'])[0],label=c['scenario'])
    axes[0,0].set(xlabel='Release time (microseconds)',ylabel='Maximum heavy-control T (K)',yscale='log',title='Adiabatic one-temperature failure, not a plasma prediction')
    axes[0,1].set(xlabel='Radius (cm)',ylabel='Midplane rotation speed (m/s)',title='All four scenarios, anode 7 cm, fixed 4 microseconds')
    axes[1,0].set(xlabel='Radius (cm)',ylabel='Midplane radial speed (m/s)',title='Conditional meridional response')
    for i,t in enumerate((0.,1e-6,2e-6,4e-6)):
        rows=[g for g in audit['gates'] if g['kind']=='spatial' and g['timeS']==t and g['fineChange'] is not None]
        axes[1,1].plot(i,max(g['fineChange'] for g in rows),'o',color='C0')
    axes[1,1].axhline(.05,color='C3',ls='--',label='5% field screen')
    axes[1,1].set(xticks=range(4),xticklabels=['0','1','2','4'],xlabel='Release time (microseconds)',ylabel='Worst finest-grid field change',title='All fields and density/temperature increments')
    for ax in axes.ravel(): ax.grid(alpha=.15)
    axes[0,0].legend(fontsize=6); axes[1,1].legend(fontsize=7)
    fig.savefig(directory/'conditional-release.png',dpi=170); plt.close(fig)


if __name__=='__main__': main()
