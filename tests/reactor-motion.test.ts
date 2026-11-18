import test,{type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {JSDOM} from 'jsdom';
import {DEFAULT_FUSION_BEAM,simulateFusionBeam} from '../src/fusion-reactor.js';
import {DEFAULT_COUPLED_TARGET,simulateCoupledTarget} from '../src/coupled-target.js';
import {ionSpeedMS,motionPopulation,neutronDirection,sourceMotionState,targetMotionState,type BeamMotionState} from '../src/reactor-motion.js';
import {createReactorMotionLayer} from '../src/reactor-motion-layer.js';
import {createApparatusViewer} from '../src/apparatus-viewer.js';

test('beam visuals follow calculated current, energy, loading and stopping without inventing fusion events',()=>{
 const initial=sourceMotionState(simulateFusionBeam(DEFAULT_FUSION_BEAM))!;
 assert.ok(ionSpeedMS(initial)>3e6&&ionSpeedMS(initial)<3.2e6);
 const faster=sourceMotionState(simulateFusionBeam({...DEFAULT_FUSION_BEAM,beamEnergyKeV:400}))!;
 assert.equal(ionSpeedMS(faster)/ionSpeedMS(initial),2);
 const off=sourceMotionState(simulateFusionBeam({...DEFAULT_FUSION_BEAM,beamCurrentA:0}))!;
 assert.equal(off.particleRateS,0);assert.equal(off.neutronRateS,0);assert.equal(off.depositedPowerW,0);assert.equal(off.neutronEnergyMeV,null);
 const noT=sourceMotionState(simulateFusionBeam({...DEFAULT_FUSION_BEAM,targetColumnM2:0}))!;
 assert.equal(noT.neutronRateS,0);assert.ok(noT.depositedPowerW>0);assert.equal(noT.particleRateS,initial.particleRateS);
 assert.equal(sourceMotionState(null),null);assert.deepEqual(initial.temperatureK,[],'initial source does not predict temperatures');
 for(const rate of [0,1,1e12,1e20])assert.ok(motionPopulation(rate,1e11,64)<=64);
 assert.equal(motionPopulation(0,1e11,64),0);assert.ok(motionPopulation(1e10,1e11,64)<motionPopulation(1e12,1e11,64));
});

test('neutron directions cover solid angle without an artificial forward beam',()=>{
 const directions=Array.from({length:64},(_,i)=>neutronDirection(i,64));
 for(const d of directions)assert.ok(Math.abs(Math.hypot(...d)-1)<1e-14);
 for(let axis=0;axis<3;axis++){
  assert.ok(Math.abs(directions.reduce((s,d)=>s+d[axis],0)/64)<.005);
  assert.ok(Math.abs(directions.reduce((s,d)=>s+d[axis]**2,0)/64-1/3)<.005);
 }
});

function selectedTarget(){
 const source={...DEFAULT_FUSION_BEAM,stoppingModel:'geant4-bragg' as const,materialColumnM2:1e22,beamCurrentA:0,exposureS:.01};
 const config={...DEFAULT_COUPLED_TARGET,depthCells:2,backingCells:2,cooldownS:0,samples:10,contactResistanceM2KPerW:.001};
 const result=simulateCoupledTarget(source,config),state={...result.history[0],temperatureK:[700,600,450,400]};
 return {source,result,state};
}
test('selected thermal arrows reproduce Fourier/contact/Robin fluxes, including cooling after beam shutoff',()=>{
 const snapshot=selectedTarget(),s=targetMotionState(snapshot),c=snapshot.result.config;
 assert.equal(s.particleRateS,0);assert.equal(s.neutronRateS,0);assert.ok(s.heatFacesWM2.at(-1)!>0);
 const filmHalf=c.filmThicknessM/2/(2*c.filmConductivityWMK),backHalf=c.backingThicknessM/2/(2*c.backingConductivityWMK);
 assert.equal(s.heatFacesWM2[0],0,'front thermal boundary is insulated');
 assert.ok(Math.abs(s.heatFacesWM2[1]-(700-600)/(2*filmHalf))<1e-5);
 assert.ok(Math.abs(s.heatFacesWM2[2]-(600-450)/(filmHalf+c.contactResistanceM2KPerW+backHalf))<1e-8);
 assert.ok(Math.abs(s.heatFacesWM2.at(-1)!-(400-c.coolantK)/(backHalf+1/c.backHeatTransferWM2K))<1e-8);
 snapshot.state.temperatureK=[200,210,220,230];assert.ok(targetMotionState(snapshot).heatFacesWM2.at(-1)!<0,'hot coolant heats the target');
 snapshot.result.config.backHeatTransferWM2K=0;assert.ok(targetMotionState(snapshot).heatFacesWM2.at(-1)===0,'adiabatic back has no coolant heat');
});

function fixture(t:TestContext,reducedMotion=false){
 const dom=new JSDOM('<div id="frame"></div>');t.after(()=>dom.window.close());
 Object.defineProperty(dom.window,'matchMedia',{value:()=>({matches:reducedMotion,addEventListener(){},removeEventListener(){}})});
 const frame=dom.window.document.querySelector<HTMLDivElement>('#frame')!,root=new THREE.Group();root.name='SI engineering assembly';
 for(const [id,x,depth]of [['target',.0000005,.000001],['accelerator',-.3,.02]] as const){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(depth,.12,.12),new THREE.MeshBasicMaterial());mesh.userData.componentId=id;mesh.position.x=x;root.add(mesh);
 }
 let changes=0;const layer=createReactorMotionLayer(frame,()=>changes++);t.after(()=>{layer.dispose();root.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m.dispose();}});});
 const state=sourceMotionState(simulateFusionBeam(DEFAULT_FUSION_BEAM))!;layer.update(state,root);
 const panel=frame.querySelector<HTMLDetailsElement>('.reactor-processes')!;
 const positions=(index:number)=>Array.from((layer.group.children[index] as THREE.Points).geometry.getAttribute('position').array);
 const count=(index:number)=>(layer.group.children[index] as THREE.Points).geometry.drawRange.count;
 return {layer,root,state,frame,panel,positions,count,get changes(){return changes;}};
}
test('live scene moves particles toward target and hides reactions independently of beam heating',t=>{
 const f=fixture(t),before=f.positions(0);f.layer.tick(.05);assert.notDeepEqual(f.positions(0),before);assert.ok(f.count(0)>0&&f.count(1)>0&&f.count(4)>0);
 const beam=(f.layer.group.children[0] as THREE.Points).geometry.getAttribute('position');
 for(let i=0;i<f.count(0);i++)assert.ok(beam.getX(i)>=-.29&&beam.getX(i)<=1e-8);
 f.layer.update({...f.state,neutronRateS:0,neutronEnergyMeV:null},f.root);assert.ok(f.count(0)>0);assert.equal(f.count(1),0);assert.equal(f.count(4),0);assert.ok(f.count(3)>0);
 f.layer.update({...f.state,particleRateS:0,neutronRateS:0,depositedPowerW:0},f.root);assert.equal(f.count(0),0);assert.equal(f.count(3),0);
});
test('pending, invalid, paused and reduced-motion states never keep moving stale quantitative output',t=>{
 const f=fixture(t);f.layer.update(f.state,f.root,true);assert.equal(f.layer.group.visible,false);assert.equal(f.layer.running,false);assert.match(f.panel.textContent!,/Waiting/);
 f.layer.update(null,f.root);assert.equal(f.panel.hidden,true);assert.equal(f.layer.group.visible,false);
 f.layer.update(f.state,f.root);f.panel.querySelector<HTMLButtonElement>('button')!.click();const before=f.positions(0);f.layer.tick(.05);assert.deepEqual(f.positions(0),before);assert.equal(f.layer.running,false);assert.ok(f.changes>0);
 const reduced=fixture(t,true),still=reduced.positions(0);reduced.layer.tick(.05);assert.deepEqual(reduced.positions(0),still);assert.equal(reduced.layer.running,false);assert.ok(reduced.count(0)>0,'static equivalent remains visible');
});
test('area changes beam radius; refinement cannot exceed fixed GPU buffers; reverse heat stays signed',t=>{
 const f=fixture(t),radius=()=>{const p=(f.layer.group.children[0] as THREE.Points).geometry.getAttribute('position');return Math.max(...Array.from({length:f.count(0)},(_,i)=>Math.hypot(p.getY(i),p.getZ(i))));};
 const before=radius();f.layer.update({...f.state,areaM2:f.state.areaM2*4},f.root);assert.ok(Math.abs(radius()/before-2)<1e-6);
 const many:BeamMotionState={...f.state,heatFacesWM2:Array.from({length:1025},()=>-1000)};f.layer.update(many,f.root);
 const heat=f.layer.group.children[3] as THREE.LineSegments;assert.ok(heat.geometry.drawRange.count<=heat.geometry.getAttribute('position').count);assert.equal(f.panel.dataset.heatDirection,'toward target');
 f.layer.update({kind:'power-reference'},f.root);assert.equal(f.panel.dataset.basis,'power-reference');assert.equal(f.count(0),0);assert.match(f.panel.textContent!,/not calculated/);
});

test('viewer publishes pre-load reactor state and stops RAF while hidden, pending or disposed',async t=>{
 const f=fixture(t),win=f.frame.ownerDocument.defaultView!,frames=new Map<number,FrameRequestCallback>();let next=0;
 Object.defineProperty(win.document,'hidden',{value:false});
 win.requestAnimationFrame=fn=>{const id=++next;frames.set(id,fn);return id;};win.cancelAnimationFrame=id=>{frames.delete(id);};
 f.frame.getBoundingClientRect=()=>({x:0,y:0,left:0,top:0,right:800,bottom:600,width:800,height:600,toJSON(){return {};}});
 const old=globalThis.ResizeObserver;globalThis.ResizeObserver=class{observe(){}unobserve(){}disconnect(){}};
 t.after(()=>{globalThis.ResizeObserver=old;});
 const viewer=createApparatusViewer(f.frame,{loader:{loadAsync:async()=>({scene:f.root})},
  displayFactory:()=>({renderer:{render(){},clear(){},setSize(){}},dispose(){}}),
  controlsFactory:camera=>({target:new THREE.Vector3(),minDistance:0,maxDistance:100,addEventListener(){},removeEventListener(){},update(){camera.lookAt(this.target);},dispose(){}})});
 t.after(()=>viewer.dispose());viewer.updateReactorState(f.state);
 await viewer.load({model:'beam.glb',reactor:'beam'});assert.equal(frames.size,1);
 assert.equal(f.frame.querySelector<HTMLElement>('.reactor-processes')!.dataset.basis,'initial source');
 viewer.setActive(false);assert.equal(frames.size,0);viewer.setActive(true);assert.equal(frames.size,1);
 viewer.setPending(true);assert.equal(frames.size,0);viewer.setPending(false);assert.equal(frames.size,1);
 viewer.updateReactorState(null);assert.equal(frames.size,0);viewer.updateReactorState(f.state);assert.equal(frames.size,1);
 viewer.dispose();assert.equal(frames.size,0);assert.equal(f.frame.children.length,0);
});
