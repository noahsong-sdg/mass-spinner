import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import * as THREE from 'three';
import {targetSceneState,targetFieldDomain} from '../src/apparatus-state.js';
import {createTargetStateLayer} from '../src/apparatus-state-layer.js';
import {componentDestination,appendComponentActions} from '../src/component-actions.js';

const snapshot=()=>({result:{config:{depthCells:2,filmThicknessM:1e-6}},source:{beamEnergyKeV:100,beamAreaM2:1e-3},state:{timeS:3,depthM:[.25e-6,.75e-6],temperatureK:[400,350,300],tritiumFraction:[.4,.8],deuteriumFraction:[.5,.1],vacancyFraction:[.1,.1],beamOn:true,neutronRateS:1e10,assemblyHeatW:100}});
test('apparatus state is copied from the exact accepted finite-volume sample, with source units',()=>{
 const value=snapshot(),state=targetSceneState(value)!;
 assert.equal(state.cells[1].temperatureK,350);assert.equal(state.cells[1].depthM,.75e-6);assert.equal(state.beamAreaM2,.001);
 value.state.temperatureK[0]=900;assert.equal(state.cells[0].temperatureK,400);
 assert.deepEqual(targetFieldDomain(state,'temperatureK'),[350,400]);assert.deepEqual(targetFieldDomain(state,'tritiumFraction'),[0,1]);
 assert.throws(()=>targetFieldDomain(state,'glow'));assert.match(state.scope,/not to scale/);
});
test('invalid or mismatched sample never becomes a 3D state',()=>{
 for(const change of [(v:any)=>v.result.config.depthCells=3,(v:any)=>v.state.temperatureK[0]=NaN,(v:any)=>v.state.tritiumFraction[0]=2,(v:any)=>v.state.depthM.reverse(),(v:any)=>v.state.deuteriumFraction[0]=0]){
  const value=snapshot();change(value);assert.equal(targetSceneState(value),null);
 }
 assert.equal(targetSceneState(null),null);
});
test('state cutaway has one pickable strip per cell, exact keyboard-equivalent selection and no hardware edits',()=>{
 const dom=new JSDOM('<div id="frame"></div>'),frame=dom.window.document.querySelector('#frame')!,scene=new THREE.Scene(),root=new THREE.Group();
 const hardware=new THREE.Mesh(new THREE.BoxGeometry(2,.2,.5),new THREE.MeshStandardMaterial());hardware.userData.componentId='target';root.add(hardware);scene.add(root);
 let selected='';const layer=createTargetStateLayer(frame,scene,{render(){},onSelect:(id:string)=>selected=id});layer.setRoot(root);layer.update(snapshot());
 assert.equal(layer.group.children.length,2);assert.notEqual(layer.group.children[0].material,hardware.material);assert.match(frame.textContent!,/10 cm²/);
 layer.selectCell(1);assert.equal(selected,'target');assert.match(frame.textContent!,/0.75 µm · 350 K/);
 const control=frame.querySelector('select[aria-label="Target field"]') as HTMLSelectElement;control.value='tritiumFraction';control.dispatchEvent(new dom.window.Event('change'));
 assert.match(frame.textContent!,/0.75 µm · 0.8 fraction/);layer.setPending(true);assert.match(frame.textContent!,/previous run, updating/);
 layer.update(null);assert.equal(layer.group.children.length,0);assert.equal((frame.querySelector('details') as HTMLDetailsElement).hidden,true);
 layer.dispose();assert.equal(scene.children.includes(layer.group),false);assert.equal(frame.children.length,0);
});
test('component actions navigate original panels without editing model configuration',()=>{
 assert.deepEqual(componentDestination('target',{level:'2'}),{panel:'target',selector:'#coupled-filmThicknessM',settings:true});
 assert.equal(componentDestination('coils',{level:'3',model:'centrifuge',closure:'corotating'}).selector,null);
 assert.equal(componentDestination('coils',{level:'3',model:'centrifuge',closure:'magnetic-gaussian'}).selector,'#gaussian-field');
 assert.equal(componentDestination('electrodes',{level:'3',model:'centrifuge'}).selector,'#rotation');
 assert.equal(componentDestination('electrodes',{level:'3',model:'icr'}).selector,'#rf-amplitude');
 assert.equal(componentDestination('source',{level:'3',model:'icr'}).selector,'#energy');
 for(const id of ['vessel','insulators','seals','fittings','supports'])for(const model of ['rotating','icr','doublewell','doublewell-dynamics','gyro','curved'])assert.equal(componentDestination(id,{level:'3',model}).selector,null,`${model}: ${id}`);
 for(const id of ['beamline','support'])assert.deepEqual(componentDestination(id,{level:'2'}),{panel:'controls',selector:null});
 assert.equal(componentDestination('rf-source',{level:'2'}).selector,'#fusion-beamCurrentA');assert.equal(componentDestination('accelerator',{level:'2'}).selector,'#fusion-beamEnergyKeV');
 const dom=new JSDOM('<div id="readout"></div>'),node=dom.window.document.querySelector('#readout')!;let parameters=0,results=0;
 appendComponentActions(node,{parameters:()=>parameters++,results:()=>results++});appendComponentActions(node,{parameters:()=>parameters++,results:()=>results++});
 const buttons=node.querySelectorAll('button');assert.equal(buttons.length,2);buttons[0].click();buttons[1].click();assert.equal(parameters,1);assert.equal(results,1);
});
