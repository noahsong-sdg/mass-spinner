import {PUBLIC_SENSITIVITY_COEFFICIENTS,publicInputCoverage,publicSensitivityPlan,publicSensitivitySample} from './public-sensitivity.js';
import type {requestSimulationWithIdentity} from './worker-client.js';
import type {PlotCurve} from './laboratory.js';
import {renderPlots} from './laboratory.js';

type SensitivityAccepted = Parameters<typeof publicSensitivityPlan>[0];
type SensitivitySample = ReturnType<typeof publicSensitivitySample>;
type Coefficient = keyof typeof PUBLIC_SENSITIVITY_COEFFICIENTS;

/** Optional explicit reruns: one worker and one full trajectory resident at a time. */
export function mountPublicSensitivity(host: HTMLElement,{request}: {request?: typeof requestSimulationWithIdentity}={}){
 const doc=host.ownerDocument,el=<K extends keyof HTMLElementTagNameMap>(tag: K,text?: string)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const detail=el('details');detail.className='public-sensitivity';detail.append(el('summary','Sensitivity & tested inputs'));
 const coverage=el('p','Run the current setup to inspect its input coverage.');detail.append(coverage);
 detail.append(el('p','Choose your own coefficient bounds. Up to three coupled trajectories start from rest with the accepted setup and drive history. These are illustrative one-coefficient samples, not measured uncertainty or confidence bounds.'));
 const evidence=el('a','Evidence & limits ↗');evidence.href='/qualification.html';evidence.target='_blank';evidence.rel='noopener';const record=el('p');record.append(evidence);detail.append(record);
 const label=el('label','Prescribed coefficient'),coefficient=el('select');coefficient.id='public-sensitivity-coefficient';label.htmlFor=coefficient.id;
 for(const [key,d]of Object.entries(PUBLIC_SENSITIVITY_COEFFICIENTS)){const option=el('option',`${d.label} (${d.unit})`);option.value=key;coefficient.append(option);}
 detail.append(label,coefficient);
 const bounds=['Lower','Upper'].map(name=>{const label=el('label',name),input=el('input');input.type='number';input.step='any';input.min='0';input.id=`public-sensitivity-${name.toLowerCase()}`;label.htmlFor=input.id;detail.append(label,input);return input;});
 const run=el('button','Run samples'),cancel=el('button','Cancel'),status=el('p'),plots=el('div');
 run.type=cancel.type='button';run.disabled=true;cancel.hidden=true;status.setAttribute('role','status');plots.className='live-plots';detail.append(run,cancel,status,plots);host.append(detail);
 let accepted: SensitivityAccepted | null=null,controller: AbortController | null=null,revision=0,disposed=false,samples: SensitivitySample[] | null=null;
 const coefficientKey=()=>coefficient.value as Coefficient;
 const clear=()=>{revision++;controller?.abort();controller=null;cancel.hidden=true;samples=null;renderPlots(plots,[]);};
 const ready=()=>{run.disabled=disposed||!accepted||!accepted.producingCode||!accepted.result.transport?.operation||Boolean(controller)||bounds.some(i=>i.value===''||!i.checkValidity());};
 const resetBounds=()=>{if(accepted)for(const input of bounds)input.value=String(accepted.result.config[coefficientKey()]);};
 const edited=()=>{clear();status.textContent='Bounds changed. Run samples again.';ready();};
 for(const input of bounds)input.addEventListener('input',edited);
 coefficient.addEventListener('change',()=>{resetBounds();edited();});
 function render(){
  if(!samples||!accepted||!detail.open)return;
  const currentSamples=samples,currentAccepted=accepted;
  const curves: PlotCurve[]=[];
  for(const [field,title,unit]of [['speedMS','Neutral wall speed','m/s'],['purity','Inner light inventory fraction','fraction'],['gasK','Mean gas temperature','K']] as const){
   if(currentSamples.some(s=>s.rows.some(r=>r[field]===null)))continue;
   const nominal=currentSamples.find(s=>s.config[coefficientKey()]===currentAccepted.result.config[coefficientKey()])!;
   curves.push({label:title,x:nominal.rows.map(r=>r.timeS),y:nominal.rows.map(r=>r[field]),
    low:nominal.rows.map((_,i)=>Math.min(...currentSamples.map(s=>s.rows[i][field]!))),
    high:nominal.rows.map((_,i)=>Math.max(...currentSamples.map(s=>s.rows[i][field]!))),xLabel:'Time (s)',yLabel:unit});
  }
  renderPlots(plots,curves);
 }
 async function start(){
  if(disposed||!detail.open||run.disabled||!accepted)return;
  clear();const id=revision,base=accepted;
  try{
   const plan=publicSensitivityPlan(base,coefficientKey(),Number(bounds[0].value),Number(bounds[1].value));
   controller=new AbortController();cancel.hidden=false;ready();status.textContent=`Computing ${plan.configs.length} samples…`;
   const next: SensitivitySample[]=[];
   for(const config of plan.configs){
    const reply=await request!({kind:'fuel-centrifuge',schemaVersion:1,id,config,includeTransport:true,operation:plan.operation},controller.signal);
    if(disposed||id!==revision)return;
    next.push(publicSensitivitySample(reply,base,config,plan.clocks));
   }
   samples=next;controller=null;cancel.hidden=true;ready();render();
   status.textContent=`${samples.length} sampled settings · line = current coefficient; shading = sampled minimum/maximum, not an exhaustive envelope. Numerical and experimental accuracy remain unqualified.`;
  }catch(error){const failure=error as Error;if(!disposed&&id===revision){clear();ready();status.textContent=`Samples unavailable: ${failure.message}`;}}
 }
 run.addEventListener('click',()=>{void start();});cancel.addEventListener('click',()=>{clear();ready();status.textContent='Cancelled. No partial sample range retained.';});
 detail.addEventListener('toggle',()=>{if(!detail.open&&controller){clear();ready();status.textContent='Cancelled.';}else render();});
 return {element:detail,run:start,get samples(){return samples;},
  update(value: SensitivityAccepted){if(disposed)return;clear();accepted=value;coverage.textContent=publicInputCoverage(accepted.result).text+' Experimental accuracy: unqualified.';resetBounds();status.textContent='Bounds initially equal the current assumption; choose a range to explore.';ready();},
  invalidate(){if(disposed)return;clear();accepted=null;coverage.textContent='Setup changed; awaiting an accepted result.';status.textContent='Previous sensitivity samples cleared.';ready();},
  cancelPending(){if(controller){clear();ready();status.textContent='Cancelled. No partial sample range retained.';}},
  dispose(){disposed=true;clear();accepted=null;detail.remove();}};
}
