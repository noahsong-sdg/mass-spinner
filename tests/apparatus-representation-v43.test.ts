import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import * as THREE from 'three';
import {setupApparatus} from '../src/apparatus-ui.js';
import {setupComponentInspectors} from '../src/component-inspector.js';
import {fusionComponents} from '../src/component-catalog.ts';
import {buildEngineeringGeometry} from '../src/engineering-geometry.js';

async function settle(){for(let i=0;i<8;i++)await Promise.resolve();}
function fixture(t:any,{inspectors=false,failImport=false}={}){
 const dom=new JSDOM('<div id="apparatus"></div><div id="separator-inspector"></div><div id="fusion-inspector"></div><svg class="beam-schematic"></svg><canvas></canvas>');
 const doc=dom.window.document,host=doc.getElementById('apparatus')!;
 const previous=Object.getOwnPropertyDescriptor(globalThis,'IntersectionObserver');let visible!:(entries:any)=>void;
 Object.defineProperty(globalThis,'IntersectionObserver',{configurable:true,value:class{constructor(callback:any){visible=callback;}observe(){}disconnect(){}}});
 t.after(()=>{if(previous)Object.defineProperty(globalThis,'IntersectionObserver',previous);else Reflect.deleteProperty(globalThis,'IntersectionObserver');dom.window.close();});
 let callbacks:any,ui:any;const inspected:string[]=[];
 const generic=inspectors?setupComponentInspectors({THREE,canvas:doc.querySelector('canvas'),getHardware:()=>null,getCamera:()=>null,canPick:()=>false,document:doc,onFusionSelect:(id:string)=>ui.syncSelection(id)}):null;
 ui=setupApparatus(host,{components:fusionComponents,onSelect:generic?(id:string)=>generic.fusion.select(id):undefined,onInspect:()=>inspected.push(ui.readout.textContent),
  viewerModuleLoader:async()=>{if(failImport)throw new Error('import failed');return {createApparatusViewer:(_:any,options:any)=>{callbacks=options;return {
   load:async()=>{callbacks.onRepresentation({geometry:'reference',status:'reference',numerical:false});return true;},select(){},updateSurfaceState(){},setPending(){},dispose(){},
  };}};}});
 t.after(()=>ui.dispose());ui.show('beam-target');
 return {doc,ui,host,inspected,get callbacks(){return callbacks;},visible:()=>visible([{isIntersecting:true}]),caption:()=>host.querySelector('.apparatus-provenance p')!.textContent!};
}

test('apparatus caption follows reported displayed geometry through reference, ready, hardware, pending and error states',async t=>{
 const f=fixture(t);assert.match(f.caption(),/layer thickness exaggerated/);
 f.visible();assert.equal(f.caption(),'Loading 3D geometry.');await settle();
 assert.match(f.caption(),/layer thickness exaggerated/);
 // A ready input alone does not establish that an asynchronous viewer has displayed it.
 f.ui.updateSurfaceState({status:'ready'});assert.match(f.caption(),/layer thickness exaggerated/);
 f.callbacks.onRepresentation({geometry:'accepted',status:'ready',layer:'state',numerical:true});
 assert.match(f.caption(),/True-scale SI hardware; accepted numerical fields shown/);
 assert.match(f.caption(),/material choices are illustrative assumptions/);
 assert.doesNotMatch(f.caption(),/layer thickness exaggerated|Hardware only/);
 for(const [layer,word]of [['tracks','trajectories'],['impacts','impacts']]){
  f.callbacks.onRepresentation({geometry:'accepted',status:'ready',layer,numerical:true});assert.match(f.caption(),new RegExp(`accepted ${word} shown`));
 }
 f.callbacks.onRepresentation({geometry:'accepted',status:'ready',layer:'hardware',numerical:false});
 assert.match(f.caption(),/hardware only; numerical layers hidden/);
 f.callbacks.onRepresentation({geometry:'reference',status:'pending',numerical:false});
 assert.match(f.caption(),/Updating; numerical surfaces withheld/);assert.match(f.caption(),/layer thickness exaggerated/);
 f.callbacks.onRepresentation({geometry:'none',status:'error',numerical:false});
 assert.equal(f.caption(),'3D unavailable; no geometry is displayed.');
});

test('failed viewer import discloses unavailable geometry rather than retaining an asset-only caption',async t=>{
 const f=fixture(t,{failImport:true});f.visible();await settle();
 assert.equal(f.caption(),'3D unavailable; no geometry is displayed.');
});

test('real engineering part callbacks survive the generic inspector sync and keyboard selection clears stale part details',async t=>{
 const f=fixture(t,{inspectors:true});f.visible();await settle();
 const assembly=buildEngineeringGeometry({mode:'beam-target',beamAreaM2:.001,filmThicknessM:2e-6,backingThicknessM:.002});t.after(()=>assembly.dispose());
 for(const name of ['Extraction electrode','RF induction winding','LiT film','Target backing','Vacuum flange']){
  const part=assembly.group.getObjectByName(name)!;assert.ok(part,name);
  const before=f.inspected.length;f.callbacks.onSelect(part.userData.componentId,part.userData,part.name);
  assert.equal(f.ui.readout.querySelector('h3').textContent,name);
  assert.equal(f.ui.readout.querySelectorAll('p')[1].textContent,part.userData.materialBasis);
  assert.equal(f.ui.readout.querySelector('details p:last-child').textContent,part.userData.geometryBasis);
  assert.equal(f.ui.readout.querySelector('details').open,false);
  assert.equal(f.inspected.length,before+1,'one final inspection callback per selected part');
  assert.match(f.inspected.at(-1)!,new RegExp(name));
 }
 const choice=f.host.querySelector('select')!;choice.value='substrate';choice.dispatchEvent(new f.doc.defaultView!.Event('change'));
 assert.equal(f.ui.readout.querySelector('h3').textContent,fusionComponents.find(c=>c.id==='substrate')!.name);
 assert.match(f.ui.readout.textContent,/publicly unspecified/);assert.doesNotMatch(f.ui.readout.textContent,/Vacuum flange/);
});
