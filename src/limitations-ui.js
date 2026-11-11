import {section3Coverage} from './failure-catalog.js';
import {DEFAULT_FAILURE_BUDGETS,failureBudgets} from './failure-budgets.ts';
import {renderPlots} from './laboratory.js';

const format=n=>n===null||!Number.isFinite(n)?'—':n===0?'0':Math.abs(n)<.001||Math.abs(n)>=1e5?n.toExponential(3):Number(n.toPrecision(4)).toString();
const element=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const fields=[
 ['neutralDensityM3','Neutral density','m⁻³',14,21,.1,true],
 ['cxCrossSectionM2','Assumed CX cross section','m²',-22,-17,.1,true],
 ['pathLengthM','Actual assumed ion path','m',0,10,.1],
 ['residenceS','Assumed residence time','s',-6,-2,.1,true],
 ['electronDensityM3','Electron density','m⁻³',14,21,.1,true],
 ['recombinationM3S','Assumed recombination coefficient','m³/s',-22,-12,.1,true],
 ['diffusionM2S','Prescribed perpendicular diffusivity','m²/s',0,100,.1],
 ['ionDensityM3','Ion density','m⁻³',14,21,.1,true],
 ['impurityFraction','Radiating impurity number fraction','',0,1,.01],
 ['coolingCoefficientWM3','Assumed impurity cooling coefficient','W·m³',-36,-27,.1,true],
 ['electronTemperatureEV','Prescribed electron temperature','eV',0,30,.5],
 ['heatTransmission','Assumed heat transmission γ','',0,20,.5],
 ['wallFluxM2S','Assumed incident wall ion flux','m⁻²s⁻¹',17,24,.1,true],
];

/** Status is attached to the current result; integration success is not validation. */
export function modelValidity(selected,settings,result){
 if(!result)return 'No current result. Physical assumptions and numerical convergence must be assessed separately.';
 if(selected==='doublewell-dynamics')return `Exploratory ${settings.collisionMethod??'fixed'}-cell kinetics · local regime ${result.regimeSummary.status} · ${result.regimeSummary.unresolvedSnapshots}/${result.regimeHistory.length} unresolved snapshots · max raw Pθ residual ${format(result.conservation.maxMomentumResidual)} of positive scale. Counts are not calibrated purity. Corrected torque bookkeeping does not repair paths.`;
 if(selected==='centrifuge'&&result.model==='coupled-magnetic-gaussian')return `Bounded magnetic equilibrium · ${result.magneticBoundary} B boundary · Ampère residual ${format(result.maxRelativeAmpereResidual)} · omitted electron-inertia ratio ${format(result.maxElectronInertiaRatio)}. Density and rotation are prescribed; stability and discharge evolution are unsolved.`;
 if(selected==='centrifuge')return 'Static prescribed equilibrium. Inventory enrichment is not extracted recovery; relaxation, instability, source and loss budgets are unsolved.';
 if(selected==='curved'){
  const outside=result.metrics.some(m=>m.label.endsWith('rho / curvature radius')?m.value>=1:m.label.endsWith('gyroperiods during bend')&&m.value<=1);
  return (outside?'Outside guiding-centre approximation: rho/R ≥ 1 or at most one gyroperiod in the bend. Plotted deflection is an extrapolation. ':'Guiding-centre approximation; inspect the scale ratios below. ')+ 'Requires rho ≪ R and many gyroperiods. This is not a full-orbit collection calculation.';
 }
 return 'Prescribed-field model. Finite-device trajectories and source sampling do not establish atomic, turbulent or experimental validity. See the Section III coverage below.';
}

export function setupFailureLaboratory(){
 const host=document.getElementById('failure-coverage');host.replaceChildren();
 for(const issue of section3Coverage){
  const detail=element('details'),summary=element('summary'),title=element('span',`${issue.subsection} · ${issue.title}`);
  const badge=element('span',({partial:'Partly modeled',diagnostic:'Diagnostics only',omitted:'Not coupled'})[issue.status]);badge.className='coverage-status';
  summary.append(title,badge);detail.append(summary,element('p',issue.mechanism));
  for(const [label,text]of [['II C',issue.iic],['II D',issue.iid],['Still required',issue.nextRequirement]]){
   const p=element('p'),strong=element('strong',label+' · ');p.append(strong,element('span',text));detail.append(p);
  }
  host.append(detail);
 }
 const reads=new Map(),controls=document.getElementById('failure-controls');let latest;
 const update=()=>{
  try{
   const c={...DEFAULT_FAILURE_BUDGETS};for(const [key,read]of reads)c[key]=read();
   latest=failureBudgets(c);renderPlots(document.getElementById('failure-plots'),latest.curves);
   document.getElementById('failure-metrics').textContent=latest.metrics.map(m=>`${m.label}: ${format(m.value)} ${m.unit}`).join(' · ');
   document.getElementById('failure-notes').replaceChildren(...latest.assumptions.map(note=>element('li',note)));
   document.getElementById('failure-status').textContent='Independent estimates updated. These inputs do not change the separator runs above.';
   document.getElementById('export-failure').disabled=false;
  }catch(error){latest=null;document.getElementById('failure-plots').replaceChildren();document.getElementById('failure-metrics').textContent='';document.getElementById('failure-status').textContent=error.message;document.getElementById('export-failure').disabled=true;}
 };
 for(const [key,title,unit,min,max,step,log]of fields){
  const box=element('div'),label=element('label'),input=element('input'),output=element('output');box.className='control';
  input.type='range';input.id='failure-'+key;input.min=min;input.max=max;input.step=step;input.value=log?Math.log10(DEFAULT_FAILURE_BUDGETS[key]):DEFAULT_FAILURE_BUDGETS[key];
  input.setAttribute('data-range-scale',log?'log10':'linear');input.setAttribute('data-unit',unit);
  label.htmlFor=input.id;label.append(element('span',title),output);box.append(label,input);controls.append(box);
  const read=()=>log?10**Number(input.value):Number(input.value);reads.set(key,read);
  const readout=()=>output.textContent=`${format(read())} ${unit}`;readout();input.addEventListener('input',()=>{readout();update();});
 }
 document.getElementById('export-failure').addEventListener('click',()=>{
  if(!latest)return;const url=URL.createObjectURL(new Blob([JSON.stringify({schemaVersion:1,kind:'independent-failure-budgets',...latest},null,2)],{type:'application/json'}));
  const a=element('a');a.href=url;a.download='mass-spinner-failure-budgets.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 update();return {read:()=>Object.fromEntries([...reads].map(([key,read])=>[key,read()])),update};
}
