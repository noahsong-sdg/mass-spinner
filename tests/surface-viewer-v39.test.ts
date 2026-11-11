import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import * as THREE from 'three';
import {surfaceState} from '../src/surface-state.js';
import {buildSurfaceOverlay,createSurfaceLayer,releaseSurfaceGroup,surfaceColour} from '../src/surface-layer.js';
import {createApparatusViewer,screenSpacePointHit} from '../src/apparatus-viewer.js';
import {DEFAULT_CONFIG,simulate} from '../src/physics.js';
import {DEFAULT_GEOMETRY,geometry} from '../src/geometries.js';
import {DEFAULT_COUPLED_TARGET,simulateCoupledTarget} from '../src/coupled-target.js';
import {DEFAULT_FUSION_BEAM} from '../src/fusion-reactor.js';
import {modelComponents} from '../src/tutorial-insights.js';
import {buildEngineeringGeometry} from '../src/engineering-geometry.js';
import {simulateDoublewell,DEFAULT_DOUBLEWELL} from '../src/doublewell-dynamics.js';

const config={...DEFAULT_CONFIG,length:.02,particlesPerSpecies:4,dt:2e-8,duration:1e-5};
const packet=()=>surfaceState({model:'rotating',settings:config,result:simulate(config),acceptedModel:'rotating',acceptedSettings:config});
function ready(){const p=packet();assert.equal(p.status,'ready');return (p as any).snapshot;}
function setup(){const dom=new JSDOM('<main></main>'),frame=dom.window.document.querySelector('main')!;return {dom,frame,layer:createSurfaceLayer(frame)};}
function change(h:any,label:string,value:string){const control=h.frame.querySelector(`select[aria-label="${label}"]`) as HTMLSelectElement;control.value=value;control.dispatchEvent(new h.dom.window.Event('change'));return control;}

test('actual accepted orbit mesh uses one batched quantitative draw, exact SI supports and raw sample picking',()=>{
 const h=setup(),s=ready();h.layer.update({status:'ready',snapshot:s},config);
 assert.ok(h.layer.group.getObjectByName('engineering-rotating'));
 const overlay=h.layer.group.getObjectByName('Accepted numerical surfaces')!;
 assert.equal(overlay.children.length,1);const mesh=overlay.children[0] as THREE.Mesh;
 const field=s.fields[0],samples=mesh.geometry.getAttribute('sampleIndex'),positions=mesh.geometry.getAttribute('position'),colours=mesh.geometry.getAttribute('color');
 const sample=20,vertex=Array.from(samples.array).findIndex(v=>v===sample);assert.ok(vertex>=0);
 const colour=surfaceColour(field.values[sample],field.domain);
 for(let axis=0;axis<3;axis++)assert.ok(Math.abs(colours.array[vertex*3+axis]-colour.toArray()[axis])<1e-6);
 assert.ok(Math.abs(positions.getZ(vertex)-config.length/2)<1e-8);
 h.layer.pick({object:mesh,face:{a:vertex}});assert.match(h.frame.textContent!,new RegExp(`${Number(field.values[sample].toPrecision(5))} V/m`));
 assert.equal((h.frame.querySelector('select[aria-label="Inspect an exact surface sample"]') as HTMLSelectElement).value,String(sample));
 h.layer.dispose();assert.equal(h.frame.children.length,0);
});

test('tracks and impacts use actual positions and all events, with no invented radial-event locations',()=>{
 const s=ready(),tracks=buildSurfaceOverlay(s,'','tracks');assert.equal(tracks.children.length,s.tracks.length);
 const p=(tracks.children[0] as THREE.Line).geometry.getAttribute('position');
 for(let i=0;i<3;i++)assert.ok(Math.abs(p.array[i]-s.tracks[0].positionsM[0][i])<1e-7);
 const impacts=buildSurfaceOverlay(s,'','impacts'),points=impacts.children[0] as THREE.Points;
 assert.equal(impacts.children.length,1);assert.equal(points.geometry.getAttribute('position').count,s.impacts.length);
 const radial={...s,impacts:s.impacts.map((e:any)=>({...e,positionM:undefined,radiusM:.1,scope:'radial-event-only'}))};
 const missing=buildSurfaceOverlay(radial,'','impacts');assert.equal(missing.children.length,0);
 for(const g of [tracks,impacts,missing])releaseSurfaceGroup(g);
});

test('target actual beam-target alias maps both materials with separate true-depth and explicit magnification',()=>{
 const source={...DEFAULT_FUSION_BEAM,beamCurrentA:0,stoppingModel:'geant4-bragg' as const,materialColumnM2:1e22,exposureS:.001};
 const c={...DEFAULT_COUPLED_TARGET,depthCells:4,backingCells:2,samples:10,cooldownS:0,maxStepS:.001};
 const result=simulateCoupledTarget(source,c),value=surfaceState({model:'beam-target',settings:c,result,acceptedModel:'beam-target',acceptedSettings:c,selectedState:result.final,source,acceptedSource:source});
 assert.equal(value.status,'ready');const h=setup();h.layer.update(value,c);
 change(h,'Surface quantity','temperature-backing');
 assert.match(h.frame.textContent!,/backing only/);assert.match(h.frame.textContent!,/Hardware is true scale/);
 const hardware=h.layer.group.getObjectByName('engineering-beam-target')!,microscope=h.layer.group.getObjectByName('Depth microscope: backing')!;
 h.layer.group.updateWorldMatrix(true,true);
 assert.ok(new THREE.Box3().setFromObject(microscope).min.y>new THREE.Box3().setFromObject(hardware).max.y,'depth microscope must clear housing occlusion');
 const physical=h.layer.group.getObjectByName('Accepted numerical surfaces')!.children[0] as THREE.Mesh;
 physical.geometry.computeBoundingBox();const bounds=physical.geometry.boundingBox!;
 assert.ok(Math.abs(bounds.min.z-c.filmThicknessM)<1e-9);assert.ok(Math.abs(bounds.max.z-c.filmThicknessM-c.backingThicknessM)<1e-9);
 change(h,'Surface quantity','tritiumFraction');assert.ok(h.layer.group.getObjectByName('Depth microscope: film'));
 assert.equal(h.layer.group.getObjectByName('Depth microscope: backing'),undefined);
 change(h,'Inspect an exact surface sample','2');assert.match(h.frame.textContent!,/fraction/);
 h.layer.update({status:'pending',reason:'Changed source'});assert.equal(h.layer.group.children.length,0);
 for(const select of h.frame.querySelectorAll('select'))assert.equal(select.hidden,true);
 assert.doesNotMatch(h.frame.textContent!,/backing only|Hardware is true scale|fraction/);
 h.layer.dispose();
});

test('all engineering parts are inspectable and illustrative construction is separate from numerical surfaces',()=>{
 for(const mode of ['rotating','icr','centrifuge','gyro','doublewell','doublewell-dynamics','curved']){
  const m=buildEngineeringGeometry({mode,radiusM:.2,lengthM:1,curvatureRadiusM:2,boundary:'open'}),ids=new Set(modelComponents(mode).map(c=>c.id));
  m.group.traverse((node:any)=>{if(node.isMesh){assert.ok(ids.has(node.userData.componentId),`${mode}: ${node.name}`);assert.ok(node.userData.geometryBasis);assert.ok(node.userData.materialBasis);}});m.dispose();
 }
});

test('a 5px impact is rejected outside its screen footprint independent of physical apparatus scale',()=>{
 for(const distance of [.001,1,100]){
  const camera=new THREE.PerspectiveCamera(35,4/3,distance/100,distance*10);camera.position.z=distance;camera.lookAt(0,0,0);camera.updateMatrixWorld();
  const points=new THREE.Points(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0,0,0)]));points.updateMatrixWorld();
  const hit={object:points,index:0};assert.equal(screenSpacePointHit(hit,camera,new THREE.Vector2(0,0),{width:800,height:600}),true);
  assert.equal(screenSpacePointHit(hit,camera,new THREE.Vector2(.02,0),{width:800,height:600}),false);
  points.geometry.dispose();(points.material as THREE.Material).dispose();
 }
});

test('viewer consumes accepted states, preserves camera on field/time update and rejects stale model lifecycle',async t=>{
 const h=setup(),old=(globalThis as any).ResizeObserver;
 (globalThis as any).ResizeObserver=class{observe(){}disconnect(){}};t.after(()=>{(globalThis as any).ResizeObserver=old;h.layer.dispose();});
 h.frame.getBoundingClientRect=()=>({width:800,height:600,left:0,top:0,right:800,bottom:600,x:0,y:0,toJSON(){}});
 let scene:any,camera:any,viewControls:any,complete!:(v:any)=>void;const reference=new THREE.Group();reference.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial()));
 const viewer=createApparatusViewer(h.frame,{loader:{loadAsync:()=>new Promise(resolve=>{complete=resolve;})},displayFactory:()=>({renderer:{render(s:any){scene=s;},clear(){},setSize(){}},dispose(){}}),controlsFactory:(c:any)=>{camera=c;return viewControls={target:new THREE.Vector3(),addEventListener(){},removeEventListener(){},update(){camera.lookAt(this.target);},dispose(){}};}});
 const loading=viewer.load({model:'test.glb'});viewer.updateSurfaceState(packet(),config);complete({scene:reference});await loading;assert.equal(reference.visible,false);
 const expectedCenter=new THREE.Box3().setFromObject(scene.getObjectByName('SI engineering assembly')).getCenter(new THREE.Vector3());
 assert.ok(viewControls.target.distanceTo(expectedCenter)<1e-12,'a result arriving during GLB loading must fit SI bounds rather than reference bounds');
 const distance=camera.position.length();viewer.focus('source');assert.ok(camera.position.length()<distance,'component focus must let small parts be inspected');
 camera.position.add(new THREE.Vector3(.03,.01,0));const before=camera.position.clone();viewer.updateSurfaceState(packet(),config);
 assert.ok(camera.position.distanceTo(before)<1e-12,'accepted state refresh must preserve orbit camera');
 viewer.setPending(true);assert.equal(reference.visible,true);assert.equal(scene.getObjectByName('engineering-rotating'),undefined);
 viewer.updateSurfaceState(packet(),config);assert.equal(reference.visible,false);
 viewer.updateSurfaceState(null);assert.equal(reference.visible,true);assert.equal(scene.getObjectByName('engineering-rotating'),undefined);
 viewer.dispose();assert.equal(h.frame.children.length,0);
});

test('curved reduced diagnostic never invents a 3D transport path or silently clamps an unsupported bend',()=>{
 const h=setup(),c={...DEFAULT_GEOMETRY,length:10,curvatureRadius:.2},r=geometry('curved',c);
 const state=surfaceState({model:'curved',settings:c,result:r,acceptedModel:'curved',acceptedSettings:c});
 h.layer.update(state,c);assert.equal(h.layer.group.children.length,0);assert.match(h.frame.textContent!,/Geometry outside display domain/);
 h.layer.update(packet(),config);assert.ok(h.layer.group.getObjectByName('engineering-rotating'));h.layer.dispose();
});

test('closed equilibrium does not label an unused pulse source radius as its populated support',()=>{
 const c={...DEFAULT_DOUBLEWELL,initialState:'equilibrium' as const,boundary:'closed' as const,rotationMode:'common' as const,beamEV:0,collisions:false,particlesPerSpecies:8,dt:1e-8,duration:1e-8};
 const result=simulateDoublewell(c),p=surfaceState({model:'doublewell-dynamics',settings:c,result,acceptedModel:'doublewell-dynamics',acceptedSettings:c});
 const h=setup();h.layer.update(p,c);const source=h.layer.group.getObjectByName('Source body')!;
 assert.notEqual(source.userData.sourceOpeningRadiusM,c.sourceRadius);h.layer.dispose();
});
