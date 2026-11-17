import {collectorAcceptance} from './collector-acceptance.js';
import type {Destination, RunConfig, SpeciesResult} from './physics.js';
export type CollectorResult = {config: Pick<RunConfig,'radius'>; species: SpeciesResult[]};

/** Mount in an existing diagnostics tab; update only with a completed orbit result. */
export function setupCollectorAcceptance(container: HTMLElement){
 const make=<K extends keyof HTMLElementTagNameMap>(tag: K,text?: string): HTMLElementTagNameMap[K]=>{const node=document.createElement(tag);if(text)node.textContent=text;return node;};
 const panel=make('details'),summary=make('summary','Collector aperture'),controls=make('div'),output=make('p');
 panel.className='model-info';output.setAttribute('role','status');
 const inner=make('input'),outer=make('input'),destination=make('select'),values: HTMLOutputElement[]=[];
 inner.id='collector-inner-fraction';outer.id='collector-outer-fraction';destination.id='collector-surface';
 for(const name of ['end','wall','source'] as const){const option=make('option',name==='end'?'Axial outlet':name==='wall'?'Outer wall':'Source return');option.value=name;destination.append(option);}
 for(const [input,label,value] of [[inner,'Inner radius',0],[outer,'Outer radius',1]] satisfies [HTMLInputElement,string,number][]){
  input.type='range';input.min='0';input.max='1';input.step='.01';input.value=String(value);
  const row=make('label',label),valueText=make('output');row.htmlFor=input.id;row.append(valueText,input);values.push(valueText);controls.append(row);
 }
 const kind=make('label','Surface');kind.htmlFor=destination.id;kind.append(destination);controls.prepend(kind);
 const info=make('p','Passive aperture · saved impacts only. Recovery uses all injected ions; purity uses accepted simulated counts. No field feedback or throughput prediction.');info.className='instrument-note';
 panel.append(summary,controls,output,info);container.append(panel);let result: CollectorResult | null | undefined;
 function render(){
  const radius=result?.config?.radius;
  const positioned=typeof radius==='number'&&Number.isFinite(radius)&&radius>0&&Array.isArray(result?.species)&&result.species.length>0&&result.species.every(s=>Array.isArray(s.impacts)&&s.impacts.every(hit=>Array.isArray(hit.position)&&hit.position.length===3&&hit.position.every(Number.isFinite)));
  panel.hidden=!positioned;
  if(!positioned||!result){output.textContent='';for(const value of values)value.textContent='';return;}
  for(const [i,input] of [inner,outer].entries())values[i].textContent=` ${(Number(input.value)*radius).toPrecision(3)} m`;
  try{
   const value=collectorAcceptance(result.species,{destination:destination.value as Destination,innerRadiusM:Number(inner.value)*radius,outerRadiusM:Number(outer.value)*radius});
   output.textContent=value.species.map(s=>`${s.massU} u: ${s.accepted}/${s.injected} accepted · recovery ${(100*s.recovery).toFixed(1)}% · purity ${s.purity===null?'undefined (empty collector)':(100*s.purity).toFixed(1)+'%'}`).join(' | ');
  }catch(error){output.textContent=`Collection unavailable: ${error instanceof Error?error.message:String(error)}`;}
 }
 for(const input of [inner,outer,destination])input.addEventListener(input===destination?'change':'input',()=>{
  if(Number(inner.value)>Number(outer.value)){if(input===inner)outer.value=inner.value;else inner.value=outer.value;}render();
 });
 render();return {update(value: CollectorResult | null){result=value;render();},element:panel};
}
