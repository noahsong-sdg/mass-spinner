import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {floatingPlayback} from '../src/floating-playback.js';
import {fuelCutGeometry} from '../src/fuel-cut-faces.js';
import {annulus} from '../src/engineering-geometry.js';
import {buildFuelCentrifugeGeometry,FUEL_COMPONENTS} from '../src/fuel-centrifuge-geometry.js';
import {createFuelCircuit} from '../src/fuel-circuit.js';
import {visibleFuelHit} from '../src/fuel-scene-tools.js';
import {createFuelViewTools} from '../src/fuel-view-ui.js';
import {DEFAULT_FUEL_CENTRIFUGE as defaults,simulateFuelCentrifuge} from '../src/fuel-centrifuge.ts';

const bytes=readFileSync('web-assets/models/centrifuge-assembly.glb');
const template=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
test('external source clears the vessel and display base and describes inward conventional current',()=>{
 const circuit=createFuelCircuit(defaults),body=circuit.getObjectByName('Prescribed discharge current source')!,box=new THREE.Box3().setFromObject(body),R=defaults.radiusM;
 assert.ok(box.max.x<-1.3*R,'source outside the vessel radius on the camera-facing side');assert.ok(box.min.y>-1.3*R,'source above the display base');
 const description=FUEL_COMPONENTS.find(c=>c.id==='electrodes')!.purpose;assert.match(description,/inward from the wall anode/);
 for(const sign of [-1,1]){const pin=circuit.getObjectByName(sign>0?'Positive supply terminal':'Negative supply terminal')!;assert.ok(pin.position.x>box.min.x&&pin.position.x<box.max.x);assert.ok(pin.position.y>box.max.y);}
 circuit.traverse((o:any)=>{o.geometry?.dispose();o.material?.dispose();});
});
const rectangle=(left:number,top:number,width:number,height:number)=>({left,top,width,height,right:left+width,bottom:top+height,x:left,y:top,toJSON(){}});
function floating(saved?:string){
 const dom=new JSDOM('<main><div><input type="range"></div></main>',{url:'https://example.org'}),doc=dom.window.document,parent=doc.querySelector('main')!,panel=doc.querySelector('div')!;let width=800,height=600;
 if(saved)dom.window.localStorage.setItem('mass-spinner-playback-v1',saved);
 parent.getBoundingClientRect=()=>rectangle(20,30,width,height);
 panel.getBoundingClientRect=()=>rectangle(20+(parseFloat(panel.style.left)||16),30+(parseFloat(panel.style.top)||400),Math.min(400,width-16),120);
 const ui=floatingPlayback(panel),grip=panel.querySelector('button')!;
 const pointer=(type:string,x:number,y:number,id=7)=>{const e=new dom.window.MouseEvent(type,{clientX:x,clientY:y,button:0,bubbles:true,cancelable:true});Object.defineProperty(e,'pointerId',{value:id});grip.dispatchEvent(e);};
 return {dom,doc,parent,panel,grip,ui,pointer,resize(w:number,h:number){width=w;height=h;dom.window.dispatchEvent(new dom.window.Event('resize'));}};
}

test('playback grip drags, persists fractions and remains reachable after mobile resize',()=>{
 const f=floating();f.pointer('pointerdown',40,440);f.pointer('pointermove',5000,-5000);f.pointer('pointerup',5000,-5000);
 assert.equal(f.panel.style.left,'392px');assert.equal(f.panel.style.top,'8px');
 const saved=f.dom.window.localStorage.getItem('mass-spinner-playback-v1');assert.deepEqual(JSON.parse(saved!),{version:1,x:1,y:0});
 f.resize(320,600);assert.equal(f.panel.style.left,'8px');assert.ok(parseFloat(f.panel.style.top)>=8);
 const restored=floating(saved!);assert.equal(restored.panel.style.left,'392px');
 f.grip.dispatchEvent(new f.dom.window.KeyboardEvent('keydown',{key:'Home',bubbles:true,cancelable:true}));assert.equal(f.panel.style.left,'');assert.equal(f.dom.window.localStorage.getItem('mass-spinner-playback-v1'),null);
 f.ui.dispose();restored.ui.dispose();f.dom.window.close();restored.dom.window.close();
});

test('keyboard, cancellation, stale positions and slider input do not interfere with dragging',()=>{
 for(const saved of ['{"version":0,"x":1,"y":1}','{"version":1,"x":99,"y":0}','invalid']){
  const f=floating(saved);assert.equal(f.panel.style.left,'');let inputs=0;f.panel.querySelector('input')!.addEventListener('input',()=>inputs++);
  f.panel.querySelector('input')!.dispatchEvent(new f.dom.window.Event('input',{bubbles:true}));assert.equal(inputs,1);assert.equal(f.panel.style.left,'');
  f.grip.dispatchEvent(new f.dom.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));assert.equal(f.panel.style.left,'40px');
  f.pointer('pointerdown',40,440);f.pointer('pointermove',100,440,9);assert.equal(f.panel.style.left,'40px');f.pointer('pointercancel',40,440);f.pointer('pointermove',200,440);assert.equal(f.panel.style.left,'40px');
  f.ui.dispose();f.dom.window.close();
 }
});

test('section caps intersect true triangles, conserve wall thickness and never fill the gas bore',()=>{
 const scene=new THREE.Group(),mesh=new THREE.Mesh(annulus(.1,.11,.8));scene.add(mesh);scene.rotation.y=Math.PI/2;scene.position.x=-.4;
 const cut=fuelCutGeometry(mesh,scene,0,.1),p=cut.getAttribute('position'),index=cut.index!;assert.ok(index.count>0);
 let area=0;for(let i=0;i<index.count;i+=3){const [a,b,c]=[0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(p,index.getX(i+j)));area+=b.clone().sub(a).cross(c.clone().sub(a)).length()/2;assert.ok(Math.abs(a.y)<1e-9);const center=a.add(b).add(c).multiplyScalar(1/3);assert.ok(Math.abs(center.x)>=.1-1e-7,'no fictitious cap across the gas');}
 assert.ok(area>.015&&area<=.01600001,`${area}`);cut.dispose();mesh.geometry.dispose();(mesh.material as THREE.Material).dispose();
});

test('actual Blender hardware gains owned finite texture coordinates, distinct finishes and closed cut faces',()=>{
 const result=simulateFuelCentrifuge(defaults),built=buildFuelCentrifugeGeometry({config:result.config,result,diagnostics:true,assembly:template.scene}),before=JSON.stringify(result),finishes=new Set(),maps=new Set();
 built.scene.traverse((o:any)=>{if(o.material?.userData.opticalFinish){finishes.add(o.material.userData.opticalFinish);assert.ok(o.material.isMeshPhysicalMaterial);for(const v of o.geometry.attributes.uv.array)assert.ok(Number.isFinite(v));maps.add(o.material.normalMap);maps.add(o.material.roughnessMap);}});
 assert.deepEqual([...finishes].sort(),['ceramic','copper','steel']);assert.equal(maps.size,6,'textures shared within one apparatus, never per bolt');
 built.tools.setStaging({cutaway:.62,ghost:false});const caps:any[]=[];built.scene.traverse(o=>{if(o.userData.displayCutFace)caps.push(o);});assert.equal(caps.length,2);for(const cap of caps)assert.ok(cap.geometry.index.count>0,cap.name);
 built.tools.circuit.visible=true;built.scene.updateMatrixWorld(true);
 const source=built.scene.getObjectByName('Prescribed discharge current source')!,target=source.getWorldPosition(new THREE.Vector3()),direction=new THREE.Vector3(0,1,.65).normalize(),ray=new THREE.Raycaster(target.clone().addScaledVector(direction,3),direction.negate());
 const foreground=ray.intersectObject(built.scene,true).find(hit=>{for(let node:THREE.Object3D|null=hit.object;node;node=node.parent)if(!node.visible)return false;return !(hit.object as any).material?.transparent&&visibleFuelHit(hit);});
 assert.equal(foreground?.object.parent?.name,built.tools.circuit.name,`source sightline is clear of vessel/base hardware; hit ${foreground?.object.name}`);
 const dom=new JSDOM('<main></main>'),host=dom.window.document.querySelector('main')!,view=createFuelViewTools({document:dom.window.document,host,onChange:()=>view.apply(built.tools)});
 const change=(id:string,value:string)=>{const select=host.querySelector(id) as HTMLSelectElement;select.value=value;select.dispatchEvent(new dom.window.Event('change'));};
 change('#fuel-view-representation','field');assert.equal(built.motion.group.visible,false);assert.equal(built.tools.group.visible,true);
 change('#fuel-view-layer','speed');assert.equal(built.tools.legend.unit,'m/s');
 const circuit=host.querySelector('#fuel-view-circuit') as HTMLInputElement;circuit.checked=true;circuit.dispatchEvent(new dom.window.Event('change'));assert.equal(built.tools.circuit.visible,true);assert.match(built.tools.circuit.userData.purpose,/supply \+/);
 change('#fuel-view-representation','both');assert.equal(built.motion.group.visible,true);assert.equal(built.tools.group.visible,true);assert.equal(JSON.stringify(result),before);
 built.tools.dispose();const resources=new Set<any>();built.scene.traverse((o:any)=>{if(o.geometry)resources.add(o.geometry);for(const m of o.material?[o.material]:[]){resources.add(m);for(const value of Object.values(m))if((value as any)?.isTexture)resources.add(value);}});for(const resource of resources)resource.dispose();dom.window.close();
});
