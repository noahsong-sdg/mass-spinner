import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,mkdir,rm,readdir,symlink} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import {productionSource,productionFunctions,productionEvent,productionScopeTail} from './helpers/production-code.js';
import {createHash} from 'node:crypto';
import {build} from 'vite';
import {workerIdentityPlugin} from '../scripts/worker-identity-plugin.mjs';
import {geometryModes,transportModes} from '../src/laboratory.js';
import {requestSimulationWithIdentity} from '../src/worker-client.ts';
import {serializeRun} from '../src/producing-code.ts';
import {createLazyScene,needsLegacyScene} from '../src/legacy-scene.ts';
import * as THREE from 'three';

test('real Vite worker graph binds emitted result identity to transitive source and locked dependencies',async()=>{
 const root=await mkdtemp(resolve(tmpdir(),'worker-identity-'));
 try{
  await mkdir(resolve(root,'src'));await mkdir(resolve(root,'scripts'));
  for(const [file,text]of Object.entries({
   'package.json':'{"type":"module"}', 'package-lock.json':'{"lockfileVersion":3}',
   'vite.config.mjs':'// fixture build config', 'scripts/worker-identity-plugin.mjs':'// fixture build plugin',
   'index.html':'<script type="module" src="/src/main.js"></script>',
   'src/main.js':`new Worker(new URL('./worker.js',import.meta.url),{type:'module'});`,
   'src/worker-identity.ts':'export const workerProducingCode=null;',
   'src/solver.js':'export const solve=()=>41;',
   'src/reference.js':'export const project=value=>value;',
   'src/worker.js':`import {solve} from './solver.js';import {workerProducingCode} from './worker-identity.ts';self.onmessage=()=>self.postMessage({result:solve(),producingCode:workerProducingCode});`,
  }))await writeFile(resolve(root,file),text);
  const alias=resolve(root,'project-alias');
  await symlink(root,alias,'dir');
  const run=async()=>{
   await build({root,configFile:false,logLevel:'silent',worker:{format:'es',plugins:()=>[workerIdentityPlugin(alias,['src/reference.js'])]},build:{outDir:'out',emptyOutDir:true}});
   const worker=(await readdir(resolve(root,'out/assets'))).find(file=>file.startsWith('worker-'))!;
   const emitted=await readFile(resolve(root,'out/assets',worker),'utf8');
   let reply:any;const self={onmessage:null as any,postMessage:(value:unknown)=>{reply=value;}};
   // Execute the emitted worker handler, not a source-text expectation or mocked identity.
   new Function('self',emitted)(self);self.onmessage({data:{}});
   assert.equal(reply.result,41);return reply.producingCode;
  };
  const first=await run();assert.equal(first.schemaVersion,1);
  assert.equal(first.sourceFiles['src/solver.js'],createHash('sha256').update(await readFile(resolve(root,'src/solver.js'))).digest('hex'));
  assert.ok(first.sourceFiles['src/worker.js']);assert.ok(first.sourceFiles['package-lock.json']);
  assert.equal(first.sourceFiles['src/reference.js'],createHash('sha256').update(await readFile(resolve(root,'src/reference.js'))).digest('hex'));
  assert.equal(first.sourceHash,createHash('sha256').update(JSON.stringify(first.sourceFiles)).digest('hex'));
  assert.deepEqual(await run(),first);
  await writeFile(resolve(root,'src/solver.js'),'export const solve=()=>41; // changed producing solver');
  const second=await run();assert.notEqual(second.sourceHash,first.sourceHash);
  await writeFile(resolve(root,'package-lock.json'),'{"lockfileVersion":3,"packages":{}}');
  const third=await run();assert.notEqual(third.sourceHash,second.sourceHash);
  await writeFile(resolve(root,'src/reference.js'),'export const project=value=>value; // changed projection');
  assert.notEqual((await run()).sourceHash,third.sourceHash);
 }finally{await rm(root,{recursive:true,force:true});}
});

test('accepted worker identity survives export while legacy artifacts stay unidentified',async()=>{
 const identity={schemaVersion:1,algorithm:'sha256',sourceHash:'a'.repeat(64),sourceFiles:{'src/solver.ts':'b'.repeat(64)}};
 const worker={onmessage:null as any,onerror:null as any,postMessage(){},terminate(){}};
 const pending=requestSimulationWithIdentity({id:4,kind:'orbit'},undefined,()=>worker);
 worker.onmessage({data:{id:4,kind:'orbit',result:{answer:42},producingCode:identity}});
 const accepted=await pending;identity.sourceHash='c'.repeat(64);
 const output=JSON.parse(serializeRun({kind:'rotating',settings:{seed:4},...accepted}));
 assert.equal(output.producingCode.sourceHash,'a'.repeat(64));assert.equal(output.modelVersion,10);assert.deepEqual(output.result,{answer:42});
 assert.equal(JSON.parse(serializeRun({modelVersion:10,result:{answer:1}})).producingCode,null);
 const legacy=requestSimulationWithIdentity({id:5},undefined,()=>worker);worker.onmessage({data:{result:17}});
 assert.equal((await legacy).producingCode,null);
});

test('legacy views allocate once on first use, share pending initialization and retry failures',async()=>{
 let level='1',model='rotating',view='render',created=0,disposed=0,failures=0,finish:()=>void=()=>{};
 const lazy=createLazyScene(()=>needsLegacyScene(level,model,view),async()=>{created++;await new Promise<void>(resolve=>{finish=resolve;});return {dispose(){disposed++;}};},()=>{failures++;});
 await lazy.ensure();assert.equal(created,0);
 for(const hidden of ['2','4']){level=hidden;view='hardware';await lazy.ensure();}assert.equal(created,0);
 level='3';model='centrifuge';await lazy.ensure();assert.equal(created,0);
 model='icr';view='fields';const a=lazy.ensure(),b=lazy.ensure();assert.equal(a,b);await Promise.resolve();assert.equal(created,1);
 view='render';finish();await a;view='orbits';await lazy.ensure();assert.equal(created,1);
 lazy.reset();assert.equal(disposed,1);
 let attempt=0;const retry=createLazyScene(()=>true,async()=>{if(++attempt===1)throw new Error('GPU unavailable');return {dispose(){}};},()=>{failures++;});
 await retry.ensure();assert.equal(failures,1);await retry.ensure();await retry.ensure();assert.equal(attempt,2);
});

test('a first-use view hidden before its queued initialization allocates nothing',async()=>{
 let needed=true,created=0;const lazy=createLazyScene(()=>needed,async()=>{created++;return {dispose(){}};},()=>{});
 const pending=lazy.ensure();needed=false;await pending;assert.equal(created,0);
});

test('actual main accepted-run and download callbacks retain the producing worker identity',async()=>{
 const source=productionSource(new URL('../src/main.ts',import.meta.url));
 const run=productionFunctions(source,['prepareRun','calculateRun','run']);
 const download=productionEvent(source,'export');
 const nodes=new Map<string,any>();let exported:Blob|undefined;
 const $=(id:string)=>{if(!nodes.has(id))nodes.set(id,{checked:true,replaceChildren(){},append(){},addEventListener(_event:string,fn:any){this.click=fn;}});return nodes.get(id);};
 const identity={schemaVersion:1,algorithm:'sha256',sourceHash:'d'.repeat(64),sourceFiles:{'src/worker.ts':'e'.repeat(64)}};
 let deferred:null|Array<(reply:unknown)=>void>=null;
 const calculate=async(_model:any,_settings:any,_signal:any,withIdentity:any)=>{
  assert.equal(withIdentity,true);if(deferred)return new Promise(resolve=>deferred!.push(resolve));
  return {result:{curves:[],metrics:[],assumptions:[]},producingCode:identity};
 };
 const execute=new Function('$','calculate','serializeRun','URL','document','plotSimulation','geometryModes','transportModes',`
 let latest=null,revision=0,liveTimer,busy,runController,comparisonController,apparatus,collector;
 const mode=()=> 'advection',isInfo=()=>false,isReduced=()=>true,config=()=>({seed:19}),ions=()=>[],reducedConfig=()=>config();
 const surfaceState=()=>null,modelValidity=()=>'',numeric=String,errorMessage=error=>{throw error;};
 ${run}
 ${download}
 return {run,getLatest:()=>latest};`);
 const app=execute($,calculate,serializeRun,{createObjectURL:(blob:Blob)=>{exported=blob;return 'blob:fixture';},revokeObjectURL(){}},{createElement:()=>({click(){}})},()=>{},geometryModes,transportModes);
 await app.run();assert.equal(app.getLatest().producingCode.sourceHash,identity.sourceHash);
 $('export').click();const result=JSON.parse(await exported!.text());
 assert.deepEqual(result.producingCode,identity);assert.equal(result.settings.seed,19);assert.equal(result.kind,'advection');
 deferred=[];
 const obsolete=app.run(),current=app.run();
 assert.equal(app.getLatest(),null);assert.equal($('export').disabled,true);
 const reply=(hash:string)=>({result:{curves:[],metrics:[],assumptions:[],tag:hash},producingCode:{...identity,sourceHash:hash.repeat(64)}});
 deferred[1](reply('f'));await current;deferred[0](reply('a'));await obsolete;
 $('export').click();const newest=JSON.parse(await exported!.text());
 assert.equal(newest.producingCode.sourceHash,'f'.repeat(64));assert.equal(newest.result.tag,'f');
});

test('actual deferred renderer cleans environment/model/compile failures and hydrates latest accepted paths',async()=>{
 const source=productionSource(new URL('../src/legacy-renderer.ts',import.meta.url));
 const initialize=productionScopeTail(source,'legacyFitDistance');
 for(const failure of ['environment','model','compile',null]){
  const counts={renderer:0,studio:0,pmrem:0,environment:0,controls:0,observed:0,disconnected:0,paths:0,fields:0,keyboard:0};
  class Renderer {setPixelRatio(){}async init(){}setSize(){}setAnimationLoop(){}render(){}async compileAsync(){if(failure==='compile')throw Error('compile');}dispose(){counts.renderer++;}}
  class PMREM {fromScene(){if(failure==='environment')throw Error('environment');return {texture:{},dispose(){counts.environment++;}};}dispose(){counts.pmrem++;}}
  class Room {dispose(){counts.studio++;}}
  const originalMaterials:THREE.Material[]=[];
  class Loader {async loadAsync(){if(failure==='model')throw Error('model');const scene=new THREE.Group();
   const single=new THREE.MeshBasicMaterial(),array=[new THREE.MeshBasicMaterial(),new THREE.MeshBasicMaterial()];originalMaterials.push(...array,single);
   scene.add(new THREE.Mesh(new THREE.BoxGeometry(3,1,1),array),new THREE.Mesh(new THREE.BoxGeometry(3,1,1),single));return {scene};}}
  class Controls {target=new THREE.Vector3();constructor(public camera:THREE.Camera){}update(){this.camera.lookAt(this.target);this.camera.updateMatrixWorld();}dispose(){counts.controls++;}}
  class Observer {observe(){counts.observed++;}disconnect(){counts.disconnected++;}}
  const handlers=new Map<string,(event:any)=>void>();
  const canvas={addEventListener(event:string,handler:(event:any)=>void){counts.keyboard++;handlers.set(event,handler);},removeEventListener(event:string){counts.keyboard--;handlers.delete(event);}};
  const $=(id:string)=>id==='scene'?canvas:id==='stage'?{getBoundingClientRect:()=>({width:460,height:840})}:{};
  const build=new Function('THREE','RoomEnvironment','GLTFLoader','OrbitControls','ResizeObserver','$','updateFields','drawPaths',`
   let scene,camera,renderer,controls,hardware;
   const devicePixelRatio=1,trajectories=new THREE.Group(),fieldGroup=new THREE.Group(),legacyCenter=new THREE.Vector3(),latest={kind:'rotating',result:{accepted:true}},view='orbits';let legacyRadius=0;
   const clear=group=>group.clear(),showView=()=>{},getView=()=>view,getLatest=()=>latest,isActive=()=>true,onFailure=()=>{};
   ${initialize}
   return {initScene,dispose,state:()=>({scene,camera,hardware,controls})};`);
  const app=build({...THREE,WebGPURenderer:Renderer,PMREMGenerator:PMREM},Room,Loader,Controls,Observer,$,()=>{counts.fields++;},(result:any)=>{assert.equal(result.accepted,true);counts.paths++;});
  if(failure){await assert.rejects(app.initScene(),new RegExp(failure));assert.equal(app.state().scene,undefined);}
  else{
   await app.initScene();assert.equal(counts.paths,1);assert.equal(counts.fields,1);assert.ok(app.state().hardware);
   const {hardware,camera,controls}=app.state(),box=new THREE.Box3().setFromObject(hardware);
   const clones:THREE.Material[]=[];hardware.traverse((item:THREE.Object3D)=>{if(item instanceof THREE.Mesh)clones.push(...(Array.isArray(item.material)?item.material:[item.material]));});
   assert.equal(clones.length,3);clones.forEach((material,index)=>{assert.ok(material instanceof THREE.Material);assert.notEqual(material,originalMaterials[index],'initialization clones both legal single and array materials');});
   const resetDistance=camera.position.distanceTo(controls.target);
   assert.ok(resetDistance>10,'actual narrow first-use initializer fits beyond the former distance cap');
   handlers.get('keydown')!({key:'-',preventDefault(){}});
   const outwardDistance=camera.position.distanceTo(controls.target);
   assert.ok(outwardDistance>resetDistance,'immediate minus after actual narrow initialization retains outward zoom headroom');
   assert.ok(outwardDistance<=controls.maxDistance+1e-12);assert.ok(camera.far>controls.maxDistance);
   for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z]){
    const point=new THREE.Vector3(x,y,z).project(camera);assert.ok(Math.abs(point.x)<1&&Math.abs(point.y)<1,`actual first-use bounds ${point.toArray()}`);
   }
   app.dispose();app.dispose();
  }
  assert.equal(counts.renderer,1);assert.equal(counts.studio,1);assert.equal(counts.pmrem,1);assert.equal(counts.keyboard,0);
  assert.equal(counts.environment,failure==='environment'?0:1);
  assert.equal(counts.controls,failure==='environment'?0:1);
  assert.equal(counts.disconnected,counts.observed);
 }
});

test('actual legacy opacity and disposal support both legal Three material shapes',t=>{
 const source=productionSource(new URL('../src/legacy-renderer.ts',import.meta.url));
 const materials=[new THREE.MeshBasicMaterial(),new THREE.MeshBasicMaterial(),new THREE.MeshBasicMaterial()];
 const geometries=[new THREE.BoxGeometry(),new THREE.BoxGeometry()],hardware=new THREE.Group();
 hardware.add(new THREE.Mesh(geometries[0],[materials[0],materials[1]]),new THREE.Mesh(geometries[1],materials[2]));
 const disposed:number[]=[],geometryDisposed:number[]=[];
 materials.forEach((material,index)=>t.mock.method(material,'dispose',()=>{disposed.push(index);}));
 geometries.forEach((geometry,index)=>t.mock.method(geometry,'dispose',()=>{geometryDisposed.push(index);}));
 const construct=new Function('THREE','hardware',`const trajectories=new THREE.Group(),fieldGroup=new THREE.Group();${productionFunctions(source,['materials','clear','showView'])}return {clear,showView};`);
 const app=construct(THREE,hardware);
 app.showView('fields');
 for(const material of materials){assert.equal(material.transparent,true);assert.equal(material.opacity,.12);assert.equal(material.depthWrite,false);}
 app.showView('hardware');
 for(const material of materials){assert.equal(material.transparent,false);assert.equal(material.opacity,1);assert.equal(material.depthWrite,true);}
 app.clear(hardware);assert.deepEqual(disposed,[0,1,2]);assert.deepEqual(geometryDisposed,[0,1]);assert.equal(hardware.children.length,0);
});
