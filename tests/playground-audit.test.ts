import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {renderPlots} from '../src/laboratory.js';
import {simulate,DEFAULT_CONFIG} from '../src/physics.js';
import {geometry,DEFAULT_GEOMETRY} from '../src/geometries.js';
import {modelValidity} from '../src/limitations-ui.js';
import {setupResearchViewer} from '../src/research-ui.js';
import * as THREE from 'three';

class Node{
 children:Node[]=[];attributes:Record<string,string>={};events:Record<string,(e?:any)=>unknown>={};textContent='';value='';disabled=false;
 constructor(public tag='div'){}
 append(...nodes:Node[]){this.children.push(...nodes);}replaceChildren(...nodes:Node[]){this.children=nodes;}
 setAttribute(k:string,v:string){this.attributes[k]=v;}addEventListener(k:string,f:(e?:any)=>unknown){this.events[k]=f;}
}
function dom(t:any){
 const nodes=new Map<string,Node>();const $=(id:string)=>{if(!nodes.has(id))nodes.set(id,new Node());return nodes.get(id)!;};
 const document={createElement:(tag:string)=>new Node(tag),createElementNS:(_ns:string,tag:string)=>new Node(tag),getElementById:$};
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:document,configurable:true});
 t.after(()=>{if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');});
 return {$,document};
}
test('survival scales are physical and exact samples can be inspected with the keyboard',t=>{
 dom(t);const host=new Node();renderPlots(host,[{label:'Survival',x:[0,1,2],y:[1,.999998,.999995],xLabel:'Depth',yLabel:'Fraction',yDomain:[0,1],selectedX:1}]);
 const svg=host.children[0].children[1],readout=host.children[0].children[2];
 assert.deepEqual(svg.children.filter(n=>n.tag==='text'&&n.attributes.x==='65').map(n=>n.textContent),['0','0.25','0.5','0.75','1']);
 assert.equal(svg.attributes.tabindex,'0');assert.match(readout.textContent,/Survival: 1,/);
 let prevented=0;const key=(key:string)=>svg.events.keydown({key,preventDefault(){prevented++;}});
 key('End');assert.match(readout.textContent,/Survival: 2,/);key('ArrowRight');assert.match(readout.textContent,/Survival: 2,/);
 key('Home');assert.match(readout.textContent,/Survival: 0,/);key('ArrowRight');assert.match(readout.textContent,/Survival: 1,/);
 assert.equal(prevented,4);key('Tab');assert.equal(prevented,4);
});
test('production resize observer preserves camera validity across hidden levels',()=>{
 const source=readFileSync('src/main.js','utf8'),endMarker="observer.observe($('stage'));";
 const start=source.indexOf('observer=new ResizeObserver('),end=source.indexOf(endMarker,start);
 assert.ok(start>=0&&end>start,'Production scene owns and registers its resize observer');
 let bounds={width:0,height:0},projections=0;
 let callback:()=>void=()=>assert.fail('Resize callback was not registered');
 const sizes:unknown[][]=[],observed:unknown[]=[];
 const camera=new THREE.PerspectiveCamera(33,1,.05,100);camera.position.set(3.5,2.35,4.1);
 const project=camera.updateProjectionMatrix.bind(camera);camera.updateProjectionMatrix=()=>{projections++;project();};
 const controls={target:new THREE.Vector3(),minDistance:2,maxDistance:10,update(){camera.lookAt(this.target);camera.updateMatrixWorld();}};
 const renderer={setSize:(...size:unknown[])=>sizes.push(size)};
 const stage={getBoundingClientRect:()=>bounds},$=(id:string)=>{assert.equal(id,'stage');return stage;};
 class Observer {constructor(notify:()=>void){callback=notify;}observe(target:unknown){observed.push(target);}}
 const helpers=source.slice(source.indexOf('function legacyFitDistance()'),source.indexOf('async function initScene()'));
 new Function('$','renderer','camera','controls','THREE','ResizeObserver',`let observer;const legacyRadius=2;${helpers}${source.slice(start,end+endMarker.length)}`)($,renderer,camera,controls,THREE,Observer);
 assert.deepEqual(observed,[stage]);callback();assert.equal(camera.aspect,1);assert.equal(sizes.length,0);assert.equal(projections,0);
 bounds={width:640,height:480};callback();assert.equal(camera.aspect,4/3);assert.deepEqual(sizes,[[640,480,false]]);assert.equal(projections,1);
 for(const hidden of [{width:0,height:0},{width:0,height:480},{width:640,height:0}]){
  bounds=hidden;callback();assert.equal(camera.aspect,4/3);assert.equal(sizes.length,1);assert.equal(projections,1);
 }
});

test('actual legacy first-use fit contains the hardware at narrow aspect and resize preserves user framing',()=>{
 const source=readFileSync('src/main.js','utf8');
 const helpers=source.slice(source.indexOf('function legacyFitDistance()'),source.indexOf('async function initScene()'));
 const hardware=new THREE.Group();hardware.add(new THREE.Mesh(new THREE.BoxGeometry(4,1.8,1.6),new THREE.MeshBasicMaterial()));hardware.position.set(.2,.1,-.1);hardware.updateMatrixWorld(true);
 const box=new THREE.Box3().setFromObject(hardware),sphere=box.getBoundingSphere(new THREE.Sphere()),legacyCenter=sphere.center,legacyRadius=sphere.radius;
 const camera=new THREE.PerspectiveCamera(33,1,.05,100),controls={target:new THREE.Vector3(),minDistance:2,maxDistance:10,update(){camera.lookAt(this.target);camera.updateMatrixWorld();}};
 let bounds={width:460,height:840};const $=()=>({getBoundingClientRect:()=>bounds});
 const app=new Function('$','renderer','camera','controls','THREE','hardware','legacyCenter','legacyRadius',`${helpers}return {resetCamera,resizeScene};`)($,{setSize(){}},camera,controls,THREE,hardware,legacyCenter,legacyRadius);
 app.resizeScene();app.resetCamera();
 const inside=()=>{for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){const point=new THREE.Vector3(x,y,z).project(camera);assert.ok(Math.abs(point.x)<1&&Math.abs(point.y)<1,`legacy hardware clipped at ${bounds.width}x${bounds.height}: ${point.toArray()}`);}};
 inside();assert.ok(controls.maxDistance>=camera.position.distanceTo(controls.target)-1e-12);
 assert.ok(camera.position.distanceTo(controls.target)>10,'narrow first-use fit exceeds the former fixed keyboard limit');
 const keyStart=source.indexOf('keyboard=event=>{'),keyEnd=source.indexOf("};$('scene').addEventListener",keyStart);
 assert.ok(keyStart>=0&&keyEnd>keyStart);
 const key=new Function('camera','controls','THREE',`let keyboard;${source.slice(keyStart,keyEnd+2)}return keyboard;`)(camera,controls,THREE);
 const resetDistance=camera.position.distanceTo(controls.target);key({key:'-',preventDefault(){}});
 assert.ok(camera.position.distanceTo(controls.target)>resetDistance,'minus immediately zooms outward after a narrow reset');
 assert.ok(camera.position.distanceTo(controls.target)<=controls.maxDistance+1e-12);assert.ok(camera.far>controls.maxDistance);
 key({key:'+',preventDefault(){}});const zoomed=camera.position.distanceTo(controls.target);
 key({key:'-',preventDefault(){}});assert.ok(camera.position.distanceTo(controls.target)>zoomed,'minus zooms outward at fitted distances above 10');
 // Simulate an intentional pan, orbit and zoom before reallocating the stage.
 controls.target.add(new THREE.Vector3(.3,-.2,.1));camera.position.sub(controls.target).applyAxisAngle(new THREE.Vector3(0,1,0),.3).multiplyScalar(.8).add(controls.target);controls.update();
 const target=controls.target.clone(),offset=camera.position.clone().sub(target),oldAspect=camera.aspect;
 const limitingSine=(aspect:number)=>Math.sin(Math.min(THREE.MathUtils.degToRad(camera.fov)/2,Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov)/2)*aspect)));
 const oldMin=controls.minDistance,oldMax=controls.maxDistance;
 bounds={width:1200,height:700};app.resizeScene();const ratio=limitingSine(oldAspect)/limitingSine(camera.aspect);
 assert.ok(controls.target.distanceTo(target)<1e-12);assert.ok(camera.position.clone().sub(target).distanceTo(offset.clone().multiplyScalar(ratio))<1e-12);
 assert.ok(Math.abs(controls.minDistance-oldMin*ratio)<1e-12);assert.ok(Math.abs(controls.maxDistance-oldMax*ratio)<1e-12);
 bounds={width:460,height:840};app.resizeScene();assert.ok(camera.position.clone().sub(target).distanceTo(offset)<1e-12);
 app.resetCamera();inside();hardware.traverse((item:any)=>{item.geometry?.dispose();item.material?.dispose();});
});
test('offered 8ns resolves the supported high charge/mass orbit point without weakening budgets',()=>{
 const c={...DEFAULT_CONFIG,particlesPerSpecies:1,magneticT:.25,species:[{massU:20,chargeState:3},{massU:84,chargeState:1}]};
 assert.throws(()=>simulate({...c,dt:1e-8}),/Timestep must resolve/);
 assert.match(readFileSync('index.html','utf8'),/<option value="8e-9">/);
 assert.doesNotThrow(()=>simulate({...c,dt:8e-9}));
});
test('grossly invalid curved-drift settings are labeled as extrapolation',()=>{
 const c={...DEFAULT_GEOMETRY,massA:200,magneticT:.02,temperatureEV:30,beamEV:2000,curvatureRadius:.2,length:.1};
 const result=geometry('curved',c);assert.match(modelValidity('curved',c,result),/Outside guiding-centre approximation/);
 assert.match(modelValidity('curved',DEFAULT_GEOMETRY,geometry('curved',DEFAULT_GEOMETRY)),/Requires rho/);
});
test('comparison cards retain the actual independent operating points and model boundaries',async t=>{
 const {$,document}=dom(t),source=readFileSync('src/main.js','utf8');
 const marker="$('compare').addEventListener('click',async()=>{",start=source.indexOf(marker)+marker.length;
 const body=source.slice(start,source.indexOf("\n});\n$('export')",start));
 const AsyncFunction=Object.getPrototypeOf(async()=>{}).constructor;
 const handler=new AsyncFunction('revision','comparisonController','coreModes','config','calculate','isReduced','guide','numeric','modelValidity','$','document','workspace',body);
 const modes=['curved','doublewell'],configs=modes.map((_,i)=>({...DEFAULT_GEOMETRY,magneticT:.1+i*.1}));
 const opened:string[]=[];
 await handler(0,undefined,modes,(s:string)=>configs[modes.indexOf(s)],(s:any,c:any)=>Promise.resolve(geometry(s,c)),()=>true,(s:string)=>({title:s,fidelity:'limits'}),String,modelValidity,$,document,{open:(key:string)=>opened.push(key)});
 assert.deepEqual(opened,['plots']);
 const cards=$('comparison-results').children;assert.equal(cards.length,2);
 for(let i=0;i<2;i++){
  assert.equal(JSON.parse(cards[i].children[3].children[1].textContent).magneticT,configs[i].magneticT);
  assert.ok(cards[i].children[2].textContent.length>30);
 }
 const html=readFileSync('index.html','utf8');assert.doesNotMatch(html,/<button id="preset-(?:separate|control)"[^>]*aria-pressed/);
});
test('recorded case and time controls display exact saved tensors and prevent failed-packet replay',async t=>{
 const {$}=dom(t),data=JSON.parse(readFileSync('web-assets/research-recordings.json','utf8'));
 const viewer=await setupResearchViewer(async()=>({ok:true,json:async()=>data}));assert.ok(viewer);
 $('replay-case').value=data.cases[2].id;$('replay-case').events.change();
 $('replay-time').value='20';$('replay-time').events.input();
 assert.match($('replay-status').textContent,/Recorded Julia run/);assert.match($('replay-status').textContent,/WITHHELD/);
 assert.equal($('replay-tensors').children[0].children[1].textContent,data.cases[2].states[20].temperatureTensorEV[0].map((row:number[])=>row.map(v=>v.toPrecision(5).padStart(11)).join(' ')).join('\n'));
 assert.equal($('replay-plots').children.length,3);
 await setupResearchViewer(async()=>({ok:false}));assert.equal($('replay-case').disabled,true);assert.equal($('replay-plots').children.length,0);
});
