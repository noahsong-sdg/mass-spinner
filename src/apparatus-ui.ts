import manifest from '../web-assets/renders/manifest.json' with {type:'json'};
import {modelComponents} from './tutorial-insights.js';

import type {Component} from './component-catalog.js';
import type {ApparatusViewerOptions, ViewerAsset, ViewerRepresentation} from './apparatus-viewer.js';
import type {SurfaceSettings} from './surface-layer.js';
import type {SurfaceState} from './surface-state.js';
import type {ReactorMotionState} from './reactor-motion.js';

type ApparatusAsset = ViewerAsset<string> & {caption:string;geometryLabel?:string;dimensionSource?:string};
const assets: Record<string, ApparatusAsset | undefined> = manifest.assets;
type SelectionPart = Record<string, unknown>;
export interface ApparatusDisplay {
 load(asset: ApparatusAsset): Promise<unknown>;
 select(id: string): void;
 reset(): void;
 dispose(): void;
 focus?(id: string): void;
 updateState?(value: unknown): void;
 updateReactorState?(value:ReactorMotionState|null):void;
 setActive?(value:boolean):void;
 updateSurfaceState?(packet: SurfaceState | null | undefined, settings?: SurfaceSettings): void;
 setPending?(value: boolean): void;
}
type ViewerModule = {createApparatusViewer(frame: HTMLElement, options: Pick<ApparatusViewerOptions, 'onSelect' | 'onRepresentation' | 'onError'>): ApparatusDisplay};
export type SetupApparatusOptions = {
 components?: Component[];
 onSelect?: (id: string) => void;
 onInspect?: (id: string) => void;
 viewerModuleLoader?: () => Promise<ViewerModule>;
};
/** Load the actual Blender mesh only when its playground is visible. */
export function setupApparatus(host: HTMLElement,{components,onSelect,onInspect,viewerModuleLoader=()=>import('./apparatus-viewer.js')}: SetupApparatusOptions={}){
 const doc=host.ownerDocument,figure=doc.createElement('figure'),frame=doc.createElement('div');
 const toolbar=doc.createElement('div'),choices=doc.createElement('select'),reset=doc.createElement('button'),retry=doc.createElement('button'),readout=doc.createElement('div');
 const provenance=doc.createElement('details'),provenanceTitle=doc.createElement('summary'),provenanceText=doc.createElement('p'),dimensionSource=doc.createElement('a');
 provenance.className='apparatus-provenance';provenanceTitle.textContent='Concept model';
 provenanceTitle.setAttribute('aria-label','Geometry and material fidelity');dimensionSource.textContent='Dimension source ↗';dimensionSource.target='_blank';dimensionSource.rel='noopener';dimensionSource.hidden=true;provenance.append(provenanceTitle,provenanceText,dimensionSource);
 figure.className='apparatus';frame.className='apparatus-frame';toolbar.className='apparatus-toolbar';
 choices.setAttribute('aria-label','Select a component');reset.type='button';reset.textContent='↺';reset.setAttribute('aria-label','Reset 3D view');
 readout.className='component-description';readout.setAttribute('aria-live','polite');
 retry.type='button';retry.textContent='Retry 3D';retry.hidden=true;retry.addEventListener('click',()=>{void start();});
 toolbar.append(choices,retry,reset);figure.append(frame,toolbar,readout,provenance);host.replaceChildren(figure);
 const focus=doc.createElement('button');focus.type='button';focus.textContent='⌖';focus.disabled=true;focus.setAttribute('aria-label','Focus on the selected component');toolbar.append(focus);
 let records: Component[]=[],asset: ApparatusAsset | null | undefined=null,viewer: ApparatusDisplay | null=null,pending: Promise<ViewerModule> | null=null,visible=false,disposed=false,selected='',acceptedState: unknown=null,statePending=false,surface: {packet: SurfaceState | null | undefined; settings?: SurfaceSettings} | null=null;
 let reactorState:ReactorMotionState|null=null;
 let loadedAsset:ApparatusAsset|null=null,loadingAsset:ApparatusAsset|null=null;
 function describeRepresentation({geometry,status,layer,numerical=false}: Pick<ViewerRepresentation, 'geometry' | 'status'> & Partial<Pick<ViewerRepresentation, 'layer' | 'numerical'>>){
  if(disposed||!asset)return;
  if(geometry==='none'){provenanceText.textContent=status==='loading'?'Loading 3D geometry.':'3D is not available. No geometry is shown.';return;}
  if(geometry==='reference'){
   provenanceText.textContent=(status==='pending'?'Calculation in progress. Numerical surfaces are hidden. ':'')+asset.caption;return;
  }
  const content=numerical?layer==='tracks'?'Completed ion paths are shown':layer==='impacts'?'Completed impact results are shown':'Completed numerical fields are shown':'Only hardware is shown. Numerical layers are hidden';
  provenanceText.textContent=`Dimensions follow the simulation inputs in SI units. ${content}. Construction and materials are for illustration. Marathon hardware dimensions are not verified here.`;
 }
 function publish(current: ApparatusDisplay){current.updateState?.(acceptedState);if(surface)current.updateSurfaceState?.(surface.packet,surface.settings);current.updateReactorState?.(reactorState);current.setPending?.(statePending);current.setActive?.(visible);if(selected)current.select(selected);}
 function select(id: string,notify=true,part: SelectionPart | null=null,name=''){
  const c=records.find(c=>c.id===id);if(!c)return;
  selected=id;choices.value=id;viewer?.select(id);focus.disabled=false;
  if(notify)onSelect?.(id);
  const title=doc.createElement('h3'),purpose=doc.createElement('p'),material=doc.createElement('p'),info=doc.createElement('details'),summary=doc.createElement('summary'),basis=doc.createElement('p');
  title.textContent=name||c.name;purpose.textContent=c.purpose;material.textContent=typeof part?.materialBasis==='string'?part.materialBasis:c.material;
  summary.textContent='Materials & model';basis.textContent=typeof part?.geometryBasis==='string'?part.geometryBasis:c.basis;info.append(summary,material,basis);readout.replaceChildren(title,purpose,info);
  if(notify)onInspect?.(id);
 }
 async function load(current:ApparatusDisplay,requested:ApparatusAsset){
  if(loadedAsset===requested){publish(current);return;}
  if(loadingAsset===requested)return;
  loadingAsset=requested;
  try{
   const success=await current.load(requested);if(disposed||viewer!==current)return;
   if(success!==false&&asset===requested)loadedAsset=requested;
   publish(current);
  }finally{if(loadingAsset===requested)loadingAsset=null;}
 }
 async function start(){
  if(disposed||!visible||!asset||pending)return;
  retry.hidden=true;
  if(viewer){await load(viewer,asset);return;}
  describeRepresentation({geometry:'none',status:'loading'});
  pending=viewerModuleLoader();
  let loaded: ApparatusAsset | null=null;
  try{
   const module=await pending;if(disposed||!visible||!asset?.model)return;
   viewer=module.createApparatusViewer(frame,{onSelect:(id,part,name)=>select(id,true,part??null,name),onRepresentation:describeRepresentation,onError:()=>{retry.hidden=false;}});
   loaded=asset;if(loaded?.model)await load(viewer,loaded);
  }catch{
   describeRepresentation({geometry:'none',status:'error'});
   const status=doc.createElement('p');status.textContent='3D unavailable';frame.replaceChildren(status);retry.hidden=false;
  }finally{pending=null;if(!disposed&&asset?.model&&loaded&&loaded!==asset)void start();}
 }
 const observer=new IntersectionObserver(entries=>{visible=entries.some(entry=>entry.isIntersecting);viewer?.setActive?.(visible);if(visible)void start();});observer.observe(frame);
 choices.addEventListener('change',()=>select(choices.value));reset.addEventListener('click',()=>viewer?.reset());
 focus.addEventListener('click',()=>viewer?.focus?.(selected));
 function show(mode: string){
  acceptedState=null;surface=null;statePending=false;viewer?.updateSurfaceState?.(null);
  const original=assets[mode];asset=original?{...original,...(mode==='beam-target'?{reactor:'beam' as const}:mode==='blanket'?{reactor:'power-reference' as const}:{})}:null;
  reactorState=mode==='blanket'?{kind:'power-reference'}:null;
  host.hidden=!asset?.model;if(!asset?.model)return;
  provenanceTitle.textContent=asset.geometryLabel??'Concept model';dimensionSource.hidden=!asset.dimensionSource;dimensionSource.href=asset.dimensionSource??'';
  provenance.open=false;describeRepresentation({geometry:'reference',status:'reference'});
  records=components??modelComponents(mode);selected='';focus.disabled=true;choices.replaceChildren();readout.replaceChildren();
  const prompt=doc.createElement('option');prompt.value='';prompt.textContent='Select a component…';prompt.disabled=true;choices.append(prompt);
  for(const c of records){const option=doc.createElement('option');option.value=c.id;option.textContent=c.name;choices.append(option);}choices.value='';
  if(visible)void start();
 }
 return {readout,show,select,syncSelection:(id: string)=>select(id,false),hasMode:(mode: string)=>!!assets[mode]?.model,
  updateState(value: unknown){acceptedState=value;viewer?.updateState?.(value);},setPending(value: boolean){statePending=!!value;viewer?.setPending?.(statePending);},
  updateReactorState(value:ReactorMotionState|null){reactorState=value;viewer?.updateReactorState?.(value);},
  updateSurfaceState(packet: SurfaceState | null | undefined,settings?: SurfaceSettings){surface={packet,settings};statePending=packet?.status==='pending';viewer?.updateSurfaceState?.(packet,settings);},
  dispose(){disposed=true;observer.disconnect();viewer?.dispose();host.replaceChildren();}};
}
