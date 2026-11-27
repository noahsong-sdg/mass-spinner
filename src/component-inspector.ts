import {separatorComponents,fusionComponents,separatorComponentId} from './component-catalog.js';

import type {Component} from './component-catalog.js';
import type {Camera, Color, Material, Mesh, Object3D, Raycaster, Vector2} from 'three';

type InspectorSelection = (id: string, notify: boolean) => void;
export type ComponentInspectorOptions = {
 THREE: {Raycaster: typeof Raycaster; Vector2: typeof Vector2};
 canvas: HTMLCanvasElement;
 getHardware: () => Object3D | null | undefined;
 getCamera: () => Camera | null | undefined;
 canPick: () => boolean;
 onFusionSelect?: (id: string) => void;
 onInspect?: (id: string) => void;
 document?: Document;
};
type HighlightMaterial = Material & {emissive?: Color; emissiveIntensity?: number};
function isMesh(node: Object3D): node is Mesh {return 'isMesh' in node && node.isMesh === true;}
const make=<K extends keyof HTMLElementTagNameMap>(doc: Document,tag: K,text?: string)=>{const el=doc.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
function inspector(doc: Document,host: HTMLElement,components: Component[],onSelect?: InspectorSelection){
 const root=make(doc,'details'),summary=make(doc,'summary','Component'),buttons=make(doc,'div'),readout=make(doc,'div');
 root.className='component-inspector';buttons.className='component-choices';readout.className='component-description';
 readout.setAttribute('aria-live','polite');
 const choices=new Map<string, HTMLButtonElement>();
 for(const component of components){
  const button=make(doc,'button',component.name);button.type='button';button.setAttribute('aria-pressed','false');
  button.addEventListener('click',()=>select(component.id));buttons.append(button);choices.set(component.id,button);
 }
 function select(id: string,notify=true){
  const c=components.find(c=>c.id===id);if(!c)return;
  root.open=true;
  for(const [key,button]of choices)button.setAttribute('aria-pressed',String(key===id));
  const basis=make(doc,'details');basis.append(make(doc,'summary','Materials & model'),make(doc,'p',c.material),make(doc,'p',c.basis));basis.className='component-basis';
  readout.replaceChildren(make(doc,'h3',c.name),make(doc,'p',c.purpose),basis);
  if(components===fusionComponents){const link=make(doc,'a','Published source ↗');link.href=c.source??'https://www.marathonfusion.com/beam-driven-fusion/';readout.append(link);}
  onSelect?.(id,notify);
 }
 root.append(summary,buttons,readout);host.replaceChildren(root);return {select};
}

/** Pointer picking has no effect on the physics, camera or shared source materials. */
export function setupComponentInspectors({THREE,canvas,getHardware,getCamera,canPick,onFusionSelect,onInspect,document:doc=document}: ComponentInspectorOptions){
 let highlights: [Mesh, Material, HighlightMaterial][]=[],pointer: {id: number; x: number; y: number} | undefined;
 function clear(){
  for(const [mesh,original,highlight]of highlights){
   // View changes may update opacity while a part is selected; retain the current view.
   original.opacity=highlight.opacity;original.transparent=highlight.transparent;original.depthWrite=highlight.depthWrite;
   mesh.material=original;original.needsUpdate=true;highlight.dispose();
  }
  highlights=[];
 }
 const separator=inspector(doc,doc.getElementById('separator-inspector')!,separatorComponents,id=>{
  onInspect?.(id);
  clear();getHardware()?.traverse(mesh=>{
   if(!isMesh(mesh)||separatorComponentId(mesh.name)!==id||Array.isArray(mesh.material))return;
   const original=mesh.material,highlight: HighlightMaterial=original.clone();
   highlight.emissive?.setHex(0x8c582e);highlight.emissiveIntensity=.65;mesh.material=highlight;highlights.push([mesh,original,highlight]);
  });
 });
 const fusion=inspector(doc,doc.getElementById('fusion-inspector')!,fusionComponents,(id,notify)=>{
  for(const [key,region]of regions)region.setAttribute('aria-pressed',String(key===id));
  onFusionSelect?.(id);
  if(notify)onInspect?.(id);
 });
 const regions=new Map<string, SVGRectElement>(),svg=doc.querySelector<SVGSVGElement>('.beam-schematic')!;
 svg.setAttribute('role','group');svg.setAttribute('aria-label','Beamline illustration. Select a component to examine its function and materials.');
 for(const [id,x,y,width,height]of [['rf-source',58,65,154,125],['accelerator',260,60,172,135],['beam',437,110,217,34],['target',660,60,25,134],['substrate',687,54,65,148],['neutrons',770,60,160,145]] satisfies [string, number, number, number, number][]){
  const region=doc.createElementNS('http://www.w3.org/2000/svg','rect');
  for(const [key,value]of Object.entries({x,y,width,height,rx:4,fill:'transparent',class:'component-hotspot',tabindex:0,role:'button','aria-label':fusionComponents.find(c=>c.id===id)!.name,'aria-pressed':'false'}))region.setAttribute(key,String(value));
  region.addEventListener('click',()=>fusion.select(id));
  region.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();fusion.select(id);}});
  regions.set(id,region);svg.append(region);
 }
 const ray=new THREE.Raycaster(),point=new THREE.Vector2();
 canvas.addEventListener('pointerdown',event=>{pointer=event.isPrimary!==false&&event.button===0?{id:event.pointerId,x:event.clientX,y:event.clientY}:undefined;});
 canvas.addEventListener('pointermove',event=>{if(pointer?.id===event.pointerId&&Math.hypot(event.clientX-pointer.x,event.clientY-pointer.y)>5)pointer=undefined;});
 canvas.addEventListener('pointercancel',()=>{pointer=undefined;});
 canvas.addEventListener('pointerup',event=>{
  const start=pointer;pointer=undefined;
  if(!start||start.id!==event.pointerId||Math.hypot(event.clientX-start.x,event.clientY-start.y)>5||!canPick())return;
  const hardware=getHardware(),camera=getCamera(),bounds=canvas.getBoundingClientRect();
  if(!hardware||!camera||bounds.width<=0||bounds.height<=0)return;
  point.set((event.clientX-bounds.left)/bounds.width*2-1,1-(event.clientY-bounds.top)/bounds.height*2);
  camera.updateMatrixWorld();hardware.updateWorldMatrix(true,true);ray.setFromCamera(point,camera);
  // The nearest visible solid surface wins; decorative trajectories are never pick targets.
  const hit=ray.intersectObject(hardware,true).find(hit=>{for(let node: Object3D | null=hit.object;node;node=node.parent)if(!node.visible)return false;return true;});
  const id=hit&&separatorComponentId(hit.object.name);if(id)separator.select(id);
 });
 return {clear,separator,fusion};
}
