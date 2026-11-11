import manifest from '../web-assets/renders/manifest.json';
import {modelComponents} from './tutorial-insights.ts';

/** Load the actual Blender mesh only when its playground is visible. */
export function setupApparatus(host,{components,onSelect,onInspect,viewerModuleLoader=()=>import('./apparatus-viewer.js')}={}){
 const doc=host.ownerDocument,figure=doc.createElement('figure'),frame=doc.createElement('div');
 const toolbar=doc.createElement('div'),choices=doc.createElement('select'),reset=doc.createElement('button'),retry=doc.createElement('button'),readout=doc.createElement('div');
 const provenance=doc.createElement('details'),provenanceTitle=doc.createElement('summary'),provenanceText=doc.createElement('p');
 provenance.className='apparatus-provenance';provenanceTitle.textContent='Concept model';
 provenanceTitle.setAttribute('aria-label','Geometry and material fidelity');provenance.append(provenanceTitle,provenanceText);
 figure.className='apparatus';frame.className='apparatus-frame';toolbar.className='apparatus-toolbar';
 choices.setAttribute('aria-label','Inspect a component');reset.type='button';reset.textContent='↺';reset.setAttribute('aria-label','Reset 3D view');
 readout.className='component-description';readout.setAttribute('aria-live','polite');
 retry.type='button';retry.textContent='Retry 3D';retry.hidden=true;retry.addEventListener('click',()=>start());
 toolbar.append(choices,retry,reset);figure.append(frame,toolbar,readout,provenance);host.replaceChildren(figure);
 const focus=doc.createElement('button');focus.type='button';focus.textContent='⌖';focus.disabled=true;focus.setAttribute('aria-label','Focus selected component');toolbar.append(focus);
 let records=[],asset=null,viewer=null,pending=null,visible=false,disposed=false,selected='',acceptedState=null,statePending=false,surface=null;
 function describeRepresentation({geometry,status,layer,numerical=false}){
  if(disposed||!asset)return;
  if(geometry==='none'){provenanceText.textContent=status==='loading'?'Loading 3D geometry.':'3D unavailable; no geometry is displayed.';return;}
  if(geometry==='reference'){
   provenanceText.textContent=(status==='pending'?'Updating; numerical surfaces withheld. ':'')+asset.caption;return;
  }
  const content=numerical?layer==='tracks'?'accepted trajectories shown':layer==='impacts'?'accepted impacts shown':'accepted numerical fields shown':'hardware only; numerical layers hidden';
  provenanceText.textContent=`True-scale SI hardware; ${content}. Construction and material choices are illustrative assumptions.`;
 }
 function publish(current){current.updateState?.(acceptedState);if(surface)current.updateSurfaceState?.(surface.packet,surface.settings);current.setPending?.(statePending);if(selected)current.select(selected);}
 function select(id,notify=true,part=null,name=''){
  const c=records.find(c=>c.id===id);if(!c)return;
  selected=id;choices.value=id;viewer?.select(id);focus.disabled=false;
  if(notify)onSelect?.(id);
  const title=doc.createElement('h3'),purpose=doc.createElement('p'),material=doc.createElement('p'),info=doc.createElement('details'),summary=doc.createElement('summary'),basis=doc.createElement('p');
  title.textContent=name||c.name;purpose.textContent=c.purpose;material.textContent=part?.materialBasis??c.material;
  summary.textContent='Materials & model';basis.textContent=part?.geometryBasis??c.basis;info.append(summary,material,basis);readout.replaceChildren(title,purpose,info);
  if(notify)onInspect?.(id);
 }
 async function start(){
  if(disposed||!visible||!asset||pending)return;
  retry.hidden=true;
  if(viewer){const current=viewer;await current.load(asset);if(disposed||viewer!==current)return;publish(current);return;}
  describeRepresentation({geometry:'none',status:'loading'});
  pending=viewerModuleLoader();
  let loaded=null;
  try{
   const {createApparatusViewer}=await pending;if(disposed||!visible||!asset?.model)return;
   viewer=createApparatusViewer(frame,{onSelect:(id,part,name)=>select(id,true,part,name),onRepresentation:describeRepresentation,onError:()=>{retry.hidden=false;}});
   loaded=asset;if(loaded?.model)await viewer.load(loaded);if(disposed)return;publish(viewer);
  }catch{
   describeRepresentation({geometry:'none',status:'error'});
   const status=doc.createElement('p');status.textContent='3D unavailable';frame.replaceChildren(status);retry.hidden=false;
  }finally{pending=null;if(!disposed&&asset?.model&&loaded&&loaded!==asset)start();}
 }
 const observer=new IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting);if(visible)start();});observer.observe(frame);
 choices.addEventListener('change',()=>select(choices.value));reset.addEventListener('click',()=>viewer?.reset());
 focus.addEventListener('click',()=>viewer?.focus?.(selected));
 function show(mode){
  acceptedState=null;surface=null;statePending=false;viewer?.updateSurfaceState?.(null);
  asset=manifest.assets[mode];host.hidden=!asset?.model;if(!asset?.model)return;
  provenance.open=false;describeRepresentation({geometry:'reference',status:'reference'});
  records=components??modelComponents(mode);selected='';focus.disabled=true;choices.replaceChildren();readout.replaceChildren();
  const prompt=doc.createElement('option');prompt.value='';prompt.textContent='Inspect…';prompt.disabled=true;choices.append(prompt);
  for(const c of records){const option=doc.createElement('option');option.value=c.id;option.textContent=c.name;choices.append(option);}choices.value='';
  if(visible)start();
 }
 return {readout,show,select,syncSelection:id=>select(id,false),hasMode:mode=>!!manifest.assets[mode]?.model,
  updateState(value){acceptedState=value;viewer?.updateState?.(value);},setPending(value){statePending=!!value;viewer?.setPending?.(statePending);},
  updateSurfaceState(packet,settings){surface={packet,settings};statePending=packet?.status==='pending';viewer?.updateSurfaceState?.(packet,settings);},
  dispose(){disposed=true;observer.disconnect();viewer?.dispose();host.replaceChildren();}};
}
