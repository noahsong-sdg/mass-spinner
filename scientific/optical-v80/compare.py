"""Score already-produced optical predictions. Never modifies or fits flow."""
import hashlib
import json
from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt

HERE = Path(__file__).parent


def score(predictions, points):
    y = np.array([p['velocityMS'] for p in points])
    eligible = np.array([p['extractionUnderFivePercent'] for p in points])
    if [p['id'] for p in predictions['locations']] != [p['id'] for p in points]:
        raise ValueError('Prediction and target locations differ')
    if [p['radiusM'] for p in predictions['locations']] != [p['radiusM'] for p in points]:
        raise ValueError('Scoring must preserve the fixed prediction geometry')
    rows = []
    for case in predictions['cases']:
        for closure in case['closures']:
            for temp in (1400,1800,2900,5950,7250,'linear'):
                for instrument in (0.,500.,1000.):
                    selected = [s for s in closure['spectra'] if s['temperatureK']==temp and s['instrumentSigmaMS']==instrument]
                    for estimator in ('centroidMS','modeMS'):
                        v = np.array([s['refinements'][-1][estimator] for s in selected])
                        error = abs(v-y)/abs(y)
                        coarse, fine = closure['centroidMeshes'][-2:]
                        mesh_change = max(abs(np.array(fine['velocityMS'])-coarse['velocityMS'])/np.maximum(abs(np.array(fine['velocityMS'])),1e-12))
                        rows.append(dict(beta=case['beta'],voltageV=case['voltageV'],edgeClosure=closure['edgeClosure'],
                            temperatureK=temp,instrumentSigmaMS=instrument,estimator=estimator,predictionMS=v.tolist(),
                            errorRelative=error.tolist(),worstRelative=float(max(error)),
                            rmsOverMeasuredPeak=float(np.sqrt(np.mean((v-y)**2))/max(y)),
                            eligiblePointGate=bool(np.all(error[eligible]<=.2)),allPointGate=bool(np.all(error<=.2)),
                            opticalCentroidMeshChange=float(mesh_change),opticalCentroidMeshGate=bool(mesh_change<.01),
                            spectralGate=all(s['spectralGate'] and s['fluxGate'] for s in selected),
                            opticalSpectrumMeshGate=all(s['opticalSpectrumMeshGate'] for s in selected)))
    return dict(experimentalQualification=False,points=points,cases=rows,
                anyAllPointPass=any(r['allPointGate'] for r in rows),
                anyEligiblePointPass=any(r['eligiblePointGate'] for r in rows))


def figures(predictions, result):
    fig, axes = plt.subplots(1,3,figsize=(14,4.5),layout='constrained')
    bright = predictions['brightness']
    b = np.array([p['radiusM'] for p in bright])*100
    intensity = np.array([p['brightness'] for p in bright])
    lo,hi = np.array([p['brightnessExtractionRange'] for p in bright]).T
    axes[0].errorbar(b,intensity,yerr=[intensity-lo,hi-intensity],fmt='.',color='black',label='4702 Å; extraction ranges')
    for rec in predictions['reconstructions']:
        if rec['mesh']==256:
            axes[0].plot(b,rec['originalReprojectedBrightness'],label=rec['edgeClosure'])
            axes[1].plot(np.array(rec['radialCentersM'])*100,rec['emissivity'],label=rec['edgeClosure'])
    points=result['points']; x=np.array([p['radiusM'] for p in points])*100
    y=np.array([p['velocityMS'] for p in points]); bars=np.array([p['plottedBarRangeMS'] for p in points]).T
    axes[2].errorbar(x,y,yerr=[y-bars[0],bars[1]-y],fmt='o',color='black',label='Ar I; published bars')
    for beta,color in ((3,'#247d8b'),(9,'#ba7137')):
        for closure,ls in (('linear','-'),('sqrt','--')):
            row=next(r for r in result['cases'] if r['beta']==beta and r['voltageV']==18.5 and r['edgeClosure']==closure
                     and r['temperatureK']==2900 and r['instrumentSigmaMS']==0 and r['estimator']=='centroidMS')
            axes[2].plot(x,row['predictionMS'],ls,color=color,label=f'β={beta}; {closure}')
    for ax,title,ylabel in zip(axes,['Measured chord brightness','Nonnegative Abel inversion','Frozen flow + optical centroid'],
                              ['Relative intensity','Relative emissivity / m','Speed (m/s)']):
        ax.set(xlabel='Sightline offset / radius (cm)',ylabel=ylabel,title=title,xlim=(0,6))
        ax.grid(alpha=.15); ax.legend(fontsize=7)
    fig.savefig(HERE/'results/optical-comparison.png',dpi=180); plt.close(fig)
    s=predictions['selectedSpectrum']; fig,ax=plt.subplots(figsize=(7,4),layout='constrained')
    ax.plot(s['binCentersMS'],np.array(s['photonFractions'])/2.5)
    for key,color in (('centroidMS','#247d8b'),('modeMS','#ba7137')):
        ax.axvline(s[key],color=color,label=f'{key}: {s[key]:.1f} m/s')
    ax.set(xlabel='Doppler velocity (m/s)',ylabel='Normalized photons / (m/s)',xlim=(-4000,4000),
           title='Conditional spectrum; β=9, b≈3 cm, prescribed T(r)')
    ax.legend(); fig.savefig(HERE/'results/example-spectrum.png',dpi=180); plt.close(fig)


def main():
    path=HERE/'results/optical-predictions.json'; before=hashlib.sha256(path.read_bytes()).hexdigest()
    predictions=json.loads(path.read_text())
    target=HERE.parent/'profile-v79/results/score.json'
    points=json.loads(target.read_text())['points']
    result=score(predictions,points); result['opticalPredictionSHA256']=before
    result['targetFileSHA256']=hashlib.sha256(target.read_bytes()).hexdigest()
    (HERE/'results/comparison.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    figures(predictions,result)
    assert hashlib.sha256(path.read_bytes()).hexdigest()==before
    print(json.dumps({k:v for k,v in result.items() if k not in ('points','cases')},indent=2))


if __name__=='__main__':
    main()
