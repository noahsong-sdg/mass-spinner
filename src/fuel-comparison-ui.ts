import {FUEL_MAP_AXES,FUEL_MAP_METRICS,pinFuelExperiment,computeFuelOperatingMap} from './fuel-experiments.js';
import {sampleFuelTransport,type FuelTransportResult} from './fuel-transport.js';
import {FUEL_PAIRS,type FuelConfig,type simulateFuelCentrifuge} from './fuel-centrifuge.js';
import type {ProducingCodeIdentity} from './producing-code.js';
import type {requestSimulationWithIdentity} from './worker-client.js';

export type AcceptedFuelSnapshot = {
 result: ReturnType<typeof simulateFuelCentrifuge> & {transport?: FuelTransportResult};
 producingCode?: ProducingCodeIdentity | null;
 camera?: NonNullable<Parameters<typeof pinFuelExperiment>[1]>['camera'];
 timeS?: number;mode?: string;
};
export type PinnedFuelSnapshot = ReturnType<typeof pinFuelExperiment>;
type FuelOperatingMap = ReturnType<typeof computeFuelOperatingMap>;
export type FuelComparisonOptions = {document?: Document;host: HTMLElement;request: typeof requestSimulationWithIdentity;
 onApply?: (config: FuelConfig)=>void;onPin?: (snapshot: PinnedFuelSnapshot)=>void;onClear?: ()=>void};

const inputLabels={
 pair:['Feed',''],application:['Application',''],radiusM:['Vessel radius','m'],lengthM:['Vessel length','m'],
 magneticT:['Axial magnetic field','T'],currentA:['Initial discharge current','A'],gasK:['Initial / bath gas temperature','K'],
 pressurePa:['Initial gas pressure','Pa'],ionFraction:['Ionized number fraction',''],collisionHz:['Ion → neutral collision rate','s⁻¹'],
 dragHz:['Neutral wall drag rate','s⁻¹'],conductivitySm:['Effective perpendicular conductivity','S/m'],
 driveInnerFraction:['Drive annulus inner radius / a',''],durationS:['Run duration','s'],cutFraction:['Collection radius / a',''],
 stages:['Stages',''],feedStage:['Feed stage',''],pumpSpeedM3S:['Pump speed','m³/s'],conductanceM3S:['Inlet conductance','m³/s'],
 lightFraction:['Feed light fraction',''],linerK:['Initial liner temperature','K'],linerConductanceWK:['Liner conductance','W/K'],
 lithiumSeed:['Lithium-seeded CIV reference',''],radialDiffusivityM2S:['Radial diffusivity','m²/s'],
 fusionMW:['Fusion power reference','MW'],burnFraction:['Burn fraction',''],loopTimeS:['Fuel processing delay','s'],
} satisfies Record<keyof FuelConfig,[string,string]>;

/** Accepted-state tools only; this module never reads in-flight slider values. */
export function createFuelComparisonTools({document:doc=document,host,request,onApply=()=>{},onPin=()=>{},onClear=()=>{}}: FuelComparisonOptions){
 const el=<K extends keyof HTMLElementTagNameMap>(tag: K,text?: string)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const root=el('section');root.className='fuel-comparison-tools';host.append(root);
 const bar=el('div'),pinButton=el('button','Pin A'),clearButton=el('button','Clear'),summary=el('output');
 bar.className='fuel-comparison-bar';pinButton.type=clearButton.type='button';pinButton.disabled=true;clearButton.disabled=true;
 pinButton.setAttribute('aria-label','Pin accepted experiment as comparison A');summary.setAttribute('aria-live','polite');
 bar.append(pinButton,clearButton,summary);root.append(bar);
 const delta=el('output');delta.className='fuel-comparison-delta';delta.hidden=true;root.append(delta);
 const inputs=el('output');inputs.className='fuel-comparison-inputs fuel-comparison-delta';inputs.hidden=true;
 inputs.setAttribute('aria-label','Accepted inputs: A to B');root.append(inputs);
 const details=el('details'),heading=el('summary','Operating map'),choices=el('div');choices.className='fuel-map-choices';
 details.append(heading,el('p','Equilibrium reference with fixed uniform inertia. This map does not use the coupled time-dependent model.'),choices);root.append(details);
 const select=(name: string,entries: [string,{label: string}][],value: string)=>{
  const label=el('label',name),input=el('select');input.setAttribute('aria-label',`Operating map ${name.toLowerCase()}`);
  for(const [key,definition]of entries){const option=el('option',definition.label);option.value=key;input.append(option);}
  input.value=value;label.append(input);choices.append(label);return input;
 };
 const x=select('Horizontal',Object.entries(FUEL_MAP_AXES),'magneticT'),y=select('Vertical',Object.entries(FUEL_MAP_AXES),'currentA');
 const metric=select('Color',Object.entries(FUEL_MAP_METRICS),'purity'),run=el('button','Calculate'),status=el('p'),grid=el('div'),legend=el('p'),axes=el('div'),scroll=el('div');
 run.type='button';run.disabled=true;status.setAttribute('role','status');grid.className='fuel-map-grid';grid.setAttribute('aria-label','Operating map');
 axes.className='fuel-map-axes';scroll.className='fuel-map-scroll';scroll.append(grid);
 legend.className='fuel-map-legend';details.append(run,status,axes,scroll,legend);
 let latest: AcceptedFuelSnapshot | null=null,pinned: PinnedFuelSnapshot | null=null,controller: AbortController | null=null,revision=0,disposed=false;
 const fmt=(v: number | null)=>v===null?'Undefined':Number(v).toLocaleString(undefined,{maximumSignificantDigits:3});
 const configKey=(s: AcceptedFuelSnapshot | null)=>s?JSON.stringify(Object.entries(s.result.config).sort(([a],[b])=>a.localeCompare(b))):null;
 function showInputs(){
  inputs.hidden=!pinned||!latest;if(!pinned||!latest){inputs.textContent='';return;}
  const a=pinned.result,b=latest.result,changes:string[]=[];
  const value=(key:keyof FuelConfig,c:FuelConfig)=>key==='pair'?FUEL_PAIRS[c.pair].label:
   typeof c[key]==='boolean'?(c[key]?'on':'off'):`${c[key]}${inputLabels[key][1]?` ${inputLabels[key][1]}`:''}`;
  for(const key of Object.keys(inputLabels) as (keyof FuelConfig)[])
   if(a.config[key]!==b.config[key])changes.push(`${inputLabels[key][0]}: ${value(key,a.config)} → ${value(key,b.config)}`);
  const oa=a.transport?.operation,ob=b.transport?.operation;
  if(oa&&ob){
   if(oa.events.length!==ob.events.length||oa.events.some((event,i)=>event.timeS!==ob.events[i].timeS||event.currentA!==ob.events[i].currentA))
    changes.push('The current-switch history changed');
   const ta=oa.thermal,tb=ob.thermal;
   for(const [key,label,unit]of [
    ['enabled','Temperature evolution',''],['wallCapacityJK','Liner heat capacity','J/K'],
    ['gasWallWK','Gas–wall conductance','W/K'],['coolingWK','Cooling conductance','W/K'],['coolantK','Coolant temperature','K'],
   ] as const)if(ta[key]!==tb[key]){
    const describe=(v:boolean|number)=>typeof v==='boolean'?(v?'on':'off'):`${v}${unit?` ${unit}`:''}`;
    changes.push(`${label}: ${describe(ta[key])} → ${describe(tb[key])}`);
   }
   const spatial=(t:typeof ta)=>t.spatial?`${t.spatial.material}, ${t.spatial.thicknessM} m, ${t.spatial.cells} cells`:'lumped';
   if(spatial(ta)!==spatial(tb))changes.push(`Liner model: ${spatial(ta)} → ${spatial(tb)}`);
   const gas=(t:typeof ta)=>t.gas?`spatial, ${t.gas.conductivityWMK} W/(m K)`:'lumped';
   if(gas(ta)!==gas(tb))changes.push(`Gas model: ${gas(ta)} → ${gas(tb)}`);
   const accuracy=(t:typeof ta)=>t.gas?.accuracy;
   if(accuracy(ta)?.relativeTolerance!==accuracy(tb)?.relativeTolerance||accuracy(ta)?.temperatureToleranceK!==accuracy(tb)?.temperatureToleranceK)
    changes.push('Gas timestep accuracy changed');
  }
  inputs.textContent=changes.length?`Changed A → B: ${changes.join('; ')}.`:'Same accepted base inputs.';
  if(!oa||!ob)inputs.textContent+=' Drive and thermal histories are not available for this comparison.';
 }
 function showDifference(){
  showInputs();
  delta.hidden=!pinned||!latest;if(!pinned||!latest){delta.textContent='';return;}
  const a=pinned.result,b=latest.result,mode=latest.mode??'equilibrium';
  const transient=['spin','transport'].includes(mode),timeS=Math.min(latest.timeS??0,a.config.durationS,b.config.durationS);
  if(transient&&(!a.transport||!b.transport)){delta.textContent='The time-dependent comparison is not available';return;}
  const sa=transient?sampleFuelTransport(a.transport!,timeS):null,sb=transient?sampleFuelTransport(b.transport!,timeS):null;
  const speedA=sa?sa.neutralRadS*a.config.radiusM:a.samples.at(-1)!.neutralMS;
  const speedB=sb?sb.neutralRadS*b.config.radiusM:b.samples.at(-1)!.neutralMS;
  const purityA=sa?sa.collection.innerLightPurity:a.collection.innerLightPurity,purityB=sb?sb.collection.innerLightPurity:b.collection.innerLightPurity;
  const sameCut=a.config.pair===b.config.pair&&a.config.cutFraction===b.config.cutFraction;
  const signed=(value: number)=>`${value>0?'+':''}${fmt(value)}`;
  const purity=sameCut&&purityA!==null&&purityB!==null?`Δ inner light ${signed(100*(purityB-purityA))} pp`:'Inventory cuts/species differ';
  delta.textContent=`${purity} · Δ gas ${signed(speedB-speedA)} m/s · ${transient?`${fmt(timeS)} s`:'final reference'}`;
  delta.title=`B minus A. ${transient?'Same physical time. Closed-wall inventory, not extracted product.':'Final equilibrium inventory with fixed uniform inertia.'}`;
 }
 const cancel=()=>{revision++;controller?.abort();controller=null;grid.replaceChildren();axes.replaceChildren();legend.textContent='';status.textContent='';};
 const ready=()=>{run.disabled=!latest||x.value===y.value;pinButton.disabled=!latest;};
 for(const select of [x,y,metric])select.addEventListener('change',()=>{cancel();ready();});
 pinButton.addEventListener('click',()=>{
  if(!latest)return;
  pinned=pinFuelExperiment(latest,{camera:latest.camera,timeS:latest.timeS??0,mode:latest.mode??'equilibrium'});
  const c=pinned.config;
  summary.textContent=`A · ${fmt(c.magneticT)} T · ${fmt(c.currentA)} A · ${fmt(c.gasK)} K`;
  summary.title=`Accepted configuration · ${pinned.producingCode?.sourceHash??'source identity unavailable'}`;
  clearButton.disabled=false;showDifference();onPin(pinned);
 });
 clearButton.addEventListener('click',()=>{pinned=null;summary.textContent='';clearButton.disabled=true;showDifference();onClear();});
 function renderMap(map: FuelOperatingMap){
  grid.replaceChildren();grid.style.gridTemplateColumns=`repeat(${map.size}, minmax(44px, 1fr))`;
  grid.style.minWidth=`${map.size*44+(map.size-1)*3}px`;
  axes.replaceChildren(...[map.x,map.y].map((axis,index)=>el('span',`${axis.label}: ${fmt(axis.domain[0])} ${axis.unit} ${index?'↓':'→'} ${fmt(axis.domain[1])} ${axis.unit}`)));
  const [lo,hi]=map.domain;
  legend.textContent=`${map.label} · ${map.unit} · ${fmt(lo)} – ${fmt(hi)}`;
  legend.title=map.scope;
  for(const point of map.points){
   const button=el('button');button.type='button';button.className='fuel-map-cell';button.setAttribute('aria-disabled',String(point.status!=='valid'));
   const label=`${map.x.label}: ${fmt(point.x)} ${map.x.unit}; ${map.y.label}: ${fmt(point.y)} ${map.y.unit}; ${map.label}: ${fmt(point.value)} ${map.unit}`;
   const notes=point.error??point.diagnostics.join('; ');
   button.setAttribute('aria-label',`${label}${notes?`; ${notes}`:''}`);button.title=`${label}${notes?`\n${notes}`:''}`;
   button.dataset.status=point.status;button.dataset.diagnostics=String(point.diagnostics.length);button.dataset.ix=String(point.ix);button.dataset.iy=String(point.iy);
   button.tabIndex=point.ix===0&&point.iy===0?0:-1;button.setAttribute('aria-pressed','false');
   button.textContent=point.status!=='valid'?'×':point.value===null?'—':point.diagnostics.length?'·':'';
   if(point.status==='valid'&&point.value!==null){
    const fraction=hi>lo?Math.max(0,Math.min(1,(point.value-lo)/(hi-lo))):0;
    button.style.backgroundColor=`hsl(${220-185*fraction} 52% ${19+26*fraction}%)`;
   }
   button.addEventListener('focus',()=>{for(const cell of grid.querySelectorAll<HTMLButtonElement>('button'))cell.tabIndex=cell===button?0:-1;status.textContent=`${label}${notes?` · ${notes}`:''}`;});
   button.addEventListener('keydown',event=>{
    const {ix,iy}=point,targets: Record<string,number>={ArrowLeft:iy*map.size+Math.max(0,ix-1),ArrowRight:iy*map.size+Math.min(map.size-1,ix+1),
     ArrowUp:Math.max(0,iy-1)*map.size+ix,ArrowDown:Math.min(map.size-1,iy+1)*map.size+ix,
     Home:event.ctrlKey?0:iy*map.size,End:event.ctrlKey?map.points.length-1:(iy+1)*map.size-1};
    if(Object.hasOwn(targets,event.key)){event.preventDefault();(grid.children[targets[event.key]] as HTMLElement).focus();}
   });
   button.addEventListener('pointerenter',()=>{status.textContent=`${label}${notes?` · ${notes}`:''}`;});
   button.addEventListener('click',()=>{
    if(point.status==='valid'){
     for(const cell of grid.children)cell.setAttribute('aria-pressed',String(cell===button));
     status.textContent=`Input selection: ${label}`;onApply(structuredClone(point.config));
    }else status.textContent=`${label} · ${notes}`;
   });
   grid.append(button);
  }
  status.textContent=`${map.x.label} → · ${map.y.label} ↓ · Select a point to use its inputs`;
 }
 run.addEventListener('click',()=>{void (async()=>{
  if(!latest||x.value===y.value||disposed)return;
  cancel();controller=new AbortController();const id=revision,accepted=latest;
  run.disabled=true;status.textContent='Calculation in progress…';
  try{
   const reply=await request({kind:'fuel-operating-map',schemaVersion:1,id,config:structuredClone(accepted.result.config),
    options:{xKey:x.value as keyof typeof FUEL_MAP_AXES,yKey:y.value as keyof typeof FUEL_MAP_AXES,metric:metric.value as keyof typeof FUEL_MAP_METRICS,size:7}},controller.signal);
   if(disposed||id!==revision)return;
   const acceptedHash=accepted.producingCode?.sourceHash,mapHash=reply.producingCode?.sourceHash;
   if(acceptedHash&&mapHash&&acceptedHash!==mapHash)throw new Error('The simulation code changed. Before the operating-map calculation, run the experiment again.');
   const map=reply.result;
   if(map?.schemaVersion!==1||!Array.isArray(map.points))throw new Error('Unsupported operating-map result.');
   renderMap(map);
  }catch(error){const failure=error as Error;if(!disposed&&id===revision&&failure.name!=='AbortError')status.textContent=failure.message;}
  finally{if(!disposed&&id===revision)ready();}
 })();});
 return {accept(snapshot: AcceptedFuelSnapshot | null){
  if(disposed)return;
  if(configKey(latest)!==configKey(snapshot)||latest?.producingCode?.sourceHash!==snapshot?.producingCode?.sourceHash)cancel();
  latest=snapshot;ready();showDifference();
 },get pinned(){return pinned;},dispose(){disposed=true;cancel();root.remove();}};
}
