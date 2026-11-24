import {renderPlots} from './laboratory.js';
import {setupResearchDistributions} from './research-distribution-ui.js';

export interface RecordedMomentState {step:number;timeS:number;means:number[][];temperatureTensorEV:number[][][]}
export interface RecordedMomentCase {id:string;label:string;config:{nAxis:number;cubatureAxis:number;alpha:number};states:RecordedMomentState[]}
export interface RecordedMoments {schemaVersion:string;kind:string;cases:RecordedMomentCase[];normalization:{velocityMS:number;densityM3:number};species:{label:string}[]}
const record=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const numbers=(value:unknown):value is number[]=>Array.isArray(value)&&value.every(v=>typeof v==='number');
const matrix=(value:unknown):value is number[][]=>Array.isArray(value)&&value.every(numbers);
function recordedMoments(value:unknown):value is RecordedMoments {
 return record(value)&&typeof value.schemaVersion==='string'&&typeof value.kind==='string'&&record(value.normalization)&&typeof value.normalization.velocityMS==='number'&&typeof value.normalization.densityM3==='number'&&
  Array.isArray(value.species)&&value.species.every(s=>record(s)&&typeof s.label==='string')&&
  Array.isArray(value.cases)&&value.cases.every(c=>record(c)&&typeof c.id==='string'&&typeof c.label==='string'&&record(c.config)&&typeof c.config.nAxis==='number'&&typeof c.config.cubatureAxis==='number'&&typeof c.config.alpha==='number'&&
   Array.isArray(c.states)&&c.states.every(s=>record(s)&&typeof s.step==='number'&&typeof s.timeS==='number'&&matrix(s.means)&&Array.isArray(s.temperatureTensorEV)&&s.temperatureTensorEV.every(matrix)));
}
const $=(id:string)=>document.getElementById(id)!;
const element=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};

/** Deduplicate an active request; only successful loads are remembered. */
export function createResearchLoader():()=>Promise<Awaited<ReturnType<typeof setupResearchViewer>>>;
export function createResearchLoader<T>(load:()=>T):()=>Promise<Awaited<T>>;
export function createResearchLoader(load:()=>unknown=setupResearchViewer){
 let viewer:unknown,pending:Promise<unknown>|null=null;
 return ()=>{
  if(viewer)return Promise.resolve(viewer);
  if(!pending)pending=Promise.resolve().then(load).then(result=>{viewer=result;return result;}).finally(()=>{pending=null;});
  return pending;
 };
}

/** Replay exact saved moments; no interpolation, collision solve or new inputs. */
export async function setupResearchViewer(fetcher=fetch){
 try{
  const response=await fetcher('/research-recordings.json');if(!response.ok)throw new Error('Recorded data could not be loaded.');
  const raw:unknown=await response.json();
  if(!recordedMoments(raw)||raw.schemaVersion!=='mass-spinner-recorded-moments-v1'||raw.kind!=='recorded-offline-data'||!raw.cases.length)throw new Error('This recording format is not supported.');
  const data=raw;
  const select=$('replay-case') as HTMLSelectElement,time=$('replay-time') as HTMLInputElement;
  const distributions=setupResearchDistributions(fetcher);
  select.replaceChildren(...data.cases.map(c=>{const option=element('option',c.label);option.value=c.id;return option;}));
  select.value=data.cases[0].id;
  function update(){
   const c=data.cases.find(c=>c.id===select.value)!,state=c.states[Number(time.value)];
   $('replay-time-value').textContent=`${(state.timeS*1e6).toPrecision(4)} µs · saved step ${state.step}`;
   $('replay-status').textContent=`Saved Julia run · ${c.id}. Accuracy is not established. Moving the timeline does not run the solver.`;
   $('replay-scale').textContent=`40/84 u ions · V₀ = ${data.normalization.velocityMS.toPrecision(6)} m/s · density ${data.normalization.densityM3.toExponential(1)} m⁻³ per species · n=${c.config.nAxis}, q=${c.config.cubatureAxis}, α=${c.config.alpha}.`;
   const tensors=data.species.map((s,i)=>{
    const box=element('div'),pre=element('pre',state.temperatureTensorEV[i].map(row=>row.map(v=>v.toPrecision(5).padStart(11)).join(' ')).join('\n'));
    box.append(element('strong',s.label+' · temperature tensor (eV)'),pre);return box;
   });$('replay-tensors').replaceChildren(...tensors);
   distributions.update(c.id,state.step);$('replay-tensors').append(distributions.element);
   const curves=[],axes=['x','y','z'],x=c.states.map(s=>s.timeS*1e6);
   for(let species=0;species<2;species++)for(let axis=0;axis<3;axis++){
    const label=`${species?'84':'40'} u · ${axes[axis]}`,base={x,xLabel:'Saved time (µs)',selectedX:state.timeS*1e6,
     color:species?'#d2956b':'#a4c4b1',dash:['','7 4','2 4'][axis]};
    curves.push({...base,label,y:c.states.map(s=>s.means[species][axis]),yLabel:'Mean velocity / V₀'});
    curves.push({...base,label,y:c.states.map(s=>s.temperatureTensorEV[species][axis][axis]),yLabel:'Diagonal temperature tensor (eV)'});
    const [i,j]=[[0,1],[0,2],[1,2]][axis];
    curves.push({...base,label:`${species?'84':'40'} u · ${axes[i]}${axes[j]}`,y:c.states.map(s=>s.temperatureTensorEV[species][i][j]),yLabel:'Off-diagonal temperature tensor (eV)'});
   }
   renderPlots($('replay-plots'),curves);
  }
  function choose(){const c=data.cases.find(c=>c.id===select.value)!;time.min='0';time.max=String(c.states.length-1);time.step='1';time.value='0';update();}
  select.addEventListener('change',choose);time.addEventListener('input',update);select.disabled=false;time.disabled=false;choose();
  return {data,update};
 }catch(error:unknown){
  $('replay-status').textContent=error instanceof Error?error.message:String(error);($('replay-case') as HTMLSelectElement).disabled=true;($('replay-time') as HTMLInputElement).disabled=true;
  $('replay-time-value').textContent='—';$('replay-scale').textContent='';
  $('replay-tensors').replaceChildren();renderPlots($('replay-plots'),[]);return null;
 }
}
