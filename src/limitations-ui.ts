import type {simulateDoublewell,DoublewellConfig} from './doublewell-dynamics.js';
import type {MagneticCentrifugeResult} from './magnetic-centrifuge.js';
import type {GeometryResult} from './geometries.js';
import {section3Coverage} from './failure-catalog.js';
import {DEFAULT_FAILURE_BUDGETS,failureBudgets,type FailureBudgetConfig} from './failure-budgets.js';
import {renderPlots} from './laboratory.js';

const format=(n:number|null)=>n===null||!Number.isFinite(n)?'—':n===0?'0':Math.abs(n)<.001||Math.abs(n)>=1e5?n.toExponential(3):Number(n.toPrecision(4)).toString();
const element=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const fields: [keyof FailureBudgetConfig,string,string,number,number,number,boolean?][]=[
 ['neutralDensityM3','Neutral density','m⁻³',14,21,.1,true],
 ['cxCrossSectionM2','Assumed CX cross section','m²',-22,-17,.1,true],
 ['pathLengthM','Specified ion path length','m',0,10,.1],
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
/** The model dispatcher pairs the selected mechanism with its accepted result. */
export function modelValidity(selected:string,settings:unknown,result:unknown){
 if(!result)return 'No current result. Examine physical assumptions and numerical convergence separately.';
 if(selected==='doublewell-dynamics'){
  const c=settings as Pick<DoublewellConfig,'collisionMethod'>,r=result as Pick<ReturnType<typeof simulateDoublewell>,'regimeSummary'|'regimeHistory'|'conservation'>;
  return `Experimental ${c.collisionMethod??'fixed'}-cell kinetics. Local regime: ${r.regimeSummary.status}. Unresolved snapshots: ${r.regimeSummary.unresolvedSnapshots}/${r.regimeHistory.length}. Maximum raw Pθ residual: ${format(r.conservation.maxMomentumResidual)} of positive scale. Counts do not give calibrated purity. Torque-account corrections do not repair particle paths.`;
 }
 if(selected==='centrifuge'&&typeof result==='object'&&'model' in result&&result.model==='coupled-magnetic-gaussian'){
  const r=result as MagneticCentrifugeResult;
  return `Bounded magnetic equilibrium · ${r.magneticBoundary} B boundary · Ampère residual ${format(r.maxRelativeAmpereResidual)} · omitted electron-inertia ratio ${format(r.maxElectronInertiaRatio)}. Density and rotation are inputs. Stability and discharge evolution are not calculated.`;
 }
 if(selected==='centrifuge')return 'Static equilibrium with specified inputs. Inventory enrichment does not give extracted recovery. Relaxation, instability, source and loss accounts are not calculated.';
 if(selected==='curved'){
  const outside=(result as GeometryResult).metrics.some(m=>m.label.endsWith('rho / curvature radius')?m.value>=1:m.label.endsWith('gyroperiods during bend')&&m.value<=1);
  return (outside?'Outside the guiding-center approximation: rho/R ≥ 1, or at most one gyroperiod in the bend. The plotted deflection uses extrapolation. ':'Guiding-center approximation. Examine the scale ratios below. ')+ 'Requires rho ≪ R and many gyroperiods. This is not a full-orbit collection calculation.';
 }
 return 'Specified-field model. Finite-device paths and source sampling do not establish atomic, turbulent or experimental accuracy. See the Section III coverage below.';
}

export function setupFailureLaboratory(){
 const host=document.getElementById('failure-coverage')!;host.replaceChildren();
 for(const issue of section3Coverage){
  const detail=element('details'),summary=element('summary'),title=element('span',`${issue.subsection} · ${issue.title}`);
  const badge=element('span',({partial:'Partly modeled',diagnostic:'Diagnostics only',omitted:'Not coupled'})[issue.status]);badge.className='coverage-status';
  summary.append(title,badge);detail.append(summary,element('p',issue.mechanism));
  for(const [label,text]of [['II C',issue.iic],['II D',issue.iid],['Missing physics',issue.nextRequirement]]){
   const p=element('p'),strong=element('strong',label+' · ');p.append(strong,element('span',text));detail.append(p);
  }
  host.append(detail);
 }
 const reads=new Map<keyof FailureBudgetConfig,()=>number>(),controls=document.getElementById('failure-controls')!;let latest:ReturnType<typeof failureBudgets>|null=null;
 const update=()=>{
  try{
   const c={...DEFAULT_FAILURE_BUDGETS};for(const [key,read]of reads)c[key]=read();
   latest=failureBudgets(c);renderPlots(document.getElementById('failure-plots')!,latest.curves);
   document.getElementById('failure-metrics')!.textContent=latest.metrics.map(m=>`${m.label}: ${format(m.value)} ${m.unit}`).join(' · ');
   document.getElementById('failure-notes')!.replaceChildren(...latest.assumptions.map(note=>element('li',note)));
   document.getElementById('failure-status')!.textContent='Independent estimates updated. These inputs do not change the separator runs above.';
   (document.getElementById('export-failure') as HTMLButtonElement).disabled=false;
  }catch(error:unknown){latest=null;document.getElementById('failure-plots')!.replaceChildren();document.getElementById('failure-metrics')!.textContent='';document.getElementById('failure-status')!.textContent=error instanceof Error?error.message:String(error);(document.getElementById('export-failure') as HTMLButtonElement).disabled=true;}
 };
 for(const [key,title,unit,min,max,step,log]of fields){
  const box=element('div'),label=element('label'),input=element('input'),output=element('output');box.className='control';
  input.type='range';input.id='failure-'+key;input.min=String(min);input.max=String(max);input.step=String(step);input.value=String(log?Math.log10(DEFAULT_FAILURE_BUDGETS[key]):DEFAULT_FAILURE_BUDGETS[key]);
  input.setAttribute('data-range-scale',log?'log10':'linear');input.setAttribute('data-unit',unit);
  label.htmlFor=input.id;label.append(element('span',title),output);box.append(label,input);controls.append(box);
  const read=()=>log?10**Number(input.value):Number(input.value);reads.set(key,read);
  const readout=()=>output.textContent=`${format(read())} ${unit}`;readout();input.addEventListener('input',()=>{readout();update();});
 }
 (document.getElementById('export-failure') as HTMLButtonElement).addEventListener('click',()=>{
  if(!latest)return;const url=URL.createObjectURL(new Blob([JSON.stringify({schemaVersion:1,kind:'independent-failure-budgets',...latest},null,2)],{type:'application/json'}));
  const a=element('a');a.href=url;a.download='mass-spinner-failure-budgets.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 update();return {read:()=>Object.fromEntries([...reads].map(([key,read])=>[key,read()])),update};
}
