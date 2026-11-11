import {FUEL_MAP_AXES,FUEL_MAP_METRICS,pinFuelExperiment} from './fuel-experiments.ts';
import {sampleFuelTransport} from './fuel-transport.ts';

/** Accepted-state tools only; this module never reads in-flight slider values. */
export function createFuelComparisonTools({document:doc=document,host,request,onApply=()=>{},onPin=()=>{},onClear=()=>{}}){
 const el=(tag,text)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 const root=el('section');root.className='fuel-comparison-tools';host.append(root);
 const bar=el('div'),pinButton=el('button','Pin A'),clearButton=el('button','Clear'),summary=el('output');
 bar.className='fuel-comparison-bar';pinButton.type=clearButton.type='button';pinButton.disabled=true;clearButton.disabled=true;
 pinButton.setAttribute('aria-label','Pin accepted experiment as comparison A');summary.setAttribute('aria-live','polite');
 bar.append(pinButton,clearButton,summary);root.append(bar);
 const delta=el('output');delta.className='fuel-comparison-delta';delta.hidden=true;root.append(delta);
 const details=el('details'),heading=el('summary','Operating map'),choices=el('div');choices.className='fuel-map-choices';
 details.append(heading,el('p','Uniform-inertia equilibrium reference; not the coupled transient.'),choices);root.append(details);
 const select=(name,entries,value)=>{
  const label=el('label',name),input=el('select');input.setAttribute('aria-label',`Operating map ${name.toLowerCase()}`);
  for(const [key,definition]of entries){const option=el('option',definition.label);option.value=key;input.append(option);}
  input.value=value;label.append(input);choices.append(label);return input;
 };
 const x=select('Horizontal',Object.entries(FUEL_MAP_AXES),'magneticT'),y=select('Vertical',Object.entries(FUEL_MAP_AXES),'currentA');
 const metric=select('Color',Object.entries(FUEL_MAP_METRICS),'purity'),run=el('button','Generate'),status=el('p'),grid=el('div'),legend=el('p'),axes=el('div'),scroll=el('div');
 run.type='button';run.disabled=true;status.setAttribute('role','status');grid.className='fuel-map-grid';grid.setAttribute('aria-label','Operating map');
 axes.className='fuel-map-axes';scroll.className='fuel-map-scroll';scroll.append(grid);
 legend.className='fuel-map-legend';details.append(run,status,axes,scroll,legend);
 let latest=null,pinned=null,controller=null,revision=0,disposed=false;
 const fmt=v=>v===null?'Undefined':Number(v).toLocaleString(undefined,{maximumSignificantDigits:3});
 const configKey=s=>s?JSON.stringify(Object.entries(s.result.config).sort(([a],[b])=>a.localeCompare(b))):null;
 function showDifference(){
  delta.hidden=!pinned||!latest;if(delta.hidden){delta.textContent='';return;}
  const a=pinned.result,b=latest.result,mode=latest.mode??'equilibrium';
  const transient=['spin','transport'].includes(mode),timeS=Math.min(latest.timeS??0,a.config.durationS,b.config.durationS);
  if(transient&&(!a.transport||!b.transport)){delta.textContent='Transient comparison unavailable';return;}
  const sa=transient?sampleFuelTransport(a.transport,timeS):null,sb=transient?sampleFuelTransport(b.transport,timeS):null;
  const speedA=sa?sa.neutralRadS*a.config.radiusM:a.samples.at(-1).neutralMS;
  const speedB=sb?sb.neutralRadS*b.config.radiusM:b.samples.at(-1).neutralMS;
  const purityA=sa?sa.collection.innerLightPurity:a.collection.innerLightPurity,purityB=sb?sb.collection.innerLightPurity:b.collection.innerLightPurity;
  const sameCut=a.config.pair===b.config.pair&&a.config.cutFraction===b.config.cutFraction;
  const signed=value=>`${value>0?'+':''}${fmt(value)}`;
  const purity=sameCut&&purityA!==null&&purityB!==null?`Δ inner light ${signed(100*(purityB-purityA))} pp`:'Inventory cuts/species differ';
  delta.textContent=`${purity} · Δ gas ${signed(speedB-speedA)} m/s · ${transient?`${fmt(timeS)} s`:'final reference'}`;
  delta.title=`B minus A. ${transient?'Matched physical time; closed-wall inventory, not extracted product.':'Uniform-inertia final-equilibrium inventory reference.'}`;
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
 function renderMap(map){
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
   button.dataset.status=point.status;button.dataset.diagnostics=String(point.diagnostics.length);button.dataset.ix=point.ix;button.dataset.iy=point.iy;
   button.tabIndex=point.ix===0&&point.iy===0?0:-1;button.setAttribute('aria-pressed','false');
   button.textContent=point.status!=='valid'?'×':point.value===null?'—':point.diagnostics.length?'·':'';
   if(point.status==='valid'&&point.value!==null){
    const fraction=hi>lo?Math.max(0,Math.min(1,(point.value-lo)/(hi-lo))):0;
    button.style.backgroundColor=`hsl(${220-185*fraction} 52% ${19+26*fraction}%)`;
   }
   button.addEventListener('focus',()=>{for(const cell of grid.children)cell.tabIndex=cell===button?0:-1;status.textContent=`${label}${notes?` · ${notes}`:''}`;});
   button.addEventListener('keydown',event=>{
    const {ix,iy}=point,targets={ArrowLeft:iy*map.size+Math.max(0,ix-1),ArrowRight:iy*map.size+Math.min(map.size-1,ix+1),
     ArrowUp:Math.max(0,iy-1)*map.size+ix,ArrowDown:Math.min(map.size-1,iy+1)*map.size+ix,
     Home:event.ctrlKey?0:iy*map.size,End:event.ctrlKey?map.points.length-1:(iy+1)*map.size-1};
    if(Object.hasOwn(targets,event.key)){event.preventDefault();grid.children[targets[event.key]].focus();}
   });
   button.addEventListener('pointerenter',()=>{status.textContent=`${label}${notes?` · ${notes}`:''}`;});
   button.addEventListener('click',()=>{
    if(point.status==='valid'){
     for(const cell of grid.children)cell.setAttribute('aria-pressed',String(cell===button));
     status.textContent=`Applying ${label}`;onApply(structuredClone(point.config));
    }else status.textContent=`${label} · ${notes}`;
   });
   grid.append(button);
  }
  status.textContent=`${map.x.label} → · ${map.y.label} ↓ · Select a point to apply`;
 }
 run.addEventListener('click',async()=>{
  if(!latest||x.value===y.value||disposed)return;
  cancel();controller=new AbortController();const id=revision,accepted=latest;
  run.disabled=true;status.textContent='Computing…';
  try{
   const reply=await request({kind:'fuel-operating-map',schemaVersion:1,id,config:structuredClone(accepted.result.config),
    options:{xKey:x.value,yKey:y.value,metric:metric.value,size:7}},controller.signal);
   if(disposed||id!==revision)return;
   const acceptedHash=accepted.producingCode?.sourceHash,mapHash=reply.producingCode?.sourceHash;
   if(acceptedHash&&mapHash&&acceptedHash!==mapHash)throw new Error('Simulation code changed. Run the experiment again before mapping.');
   const map=reply.result;
   if(map?.schemaVersion!==1||!Array.isArray(map.points))throw new Error('Unsupported operating-map result.');
   renderMap(map);
  }catch(error){if(!disposed&&id===revision&&error.name!=='AbortError')status.textContent=error.message;}
  finally{if(!disposed&&id===revision)ready();}
 });
 return {accept(snapshot){
  if(disposed)return;
  if(configKey(latest)!==configKey(snapshot)||latest?.producingCode?.sourceHash!==snapshot?.producingCode?.sourceHash)cancel();
  latest=snapshot;ready();showDifference();
 },get pinned(){return pinned;},dispose(){disposed=true;cancel();root.remove();}};
}
