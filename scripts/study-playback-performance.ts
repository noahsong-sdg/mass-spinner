/** Run only inside the isolated development guest, after typecheck/tests.
 * npm exec tsx scripts/study-playback-performance.ts -- --baseline-dir /tmp/playback-head
 * The baseline directory contains HEAD copies of the four source files below and REVISION.
 * Temporary baseline modules are removed in finally; do not commit baseline copies.
 */
import assert from 'node:assert/strict';
import {readFile,writeFile,rm} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {cpus} from 'node:os';
import {JSDOM} from 'jsdom';
import * as THREE from 'three';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {simulateFuelTransport,sampleFuelTransport,type FuelTransportCheckpoint} from '../src/fuel-transport.js';
import {createFuelMotion,fuelMotionState} from '../src/fuel-motion.js';
import {releaseSurfaceGroup} from '../src/surface-layer.js';
import * as currentUI from '../src/fuel-centrifuge-ui.js';
import * as currentGeometry from '../src/fuel-centrifuge-geometry.js';
import type {FuelRenderResult} from '../src/fuel-field.js';
import type {SetupFuelCentrifugeOptions} from '../src/fuel-centrifuge-ui.js';
import type {CameraPose} from '../src/apparatus-viewer.js';

const arguments_=process.argv.slice(2),argument=(name:string)=>arguments_.find(value=>value.startsWith(`--${name}=`))?.slice(name.length+3)
 ??(arguments_.includes(`--${name}`)?arguments_[arguments_.indexOf(`--${name}`)+1]:undefined);
const baselineDir=argument('baseline-dir');
if(!baselineDir)throw new Error('Supply --baseline-dir with four HEAD source files and REVISION; run in the isolated guest.');
const positive=(name:string,defaultValue:number)=>{const n=Number(argument(name)??defaultValue);if(!Number.isSafeInteger(n)||n<1)throw new Error(`${name} must be a positive integer`);return n;};
const historySize=positive('history',10_000),rounds=positive('rounds',5),frames=positive('frames',8),warmup=positive('warmup',4),microFrames=positive('micro-frames',128);
if(historySize<2)throw new Error('history must contain at least two checkpoints');
const files=['fuel-motion.ts','laboratory.ts','fuel-centrifuge-geometry.ts','fuel-centrifuge-ui.ts'] as const;
const root=resolve(import.meta.dirname,'..'),prefix=`.playback-study-${process.pid}-`,temporary:string[]=[];
const originalDocument=Object.getOwnPropertyDescriptor(globalThis,'document');
const median=(values:number[])=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
function paired(a:()=>void,b:()=>void,count:number){
 for(let i=0;i<warmup;i++){a();b();}
 const batches:{baseline:number;current:number}[]=[];
 for(let round=0;round<rounds;round++){
  const measured={baseline:0,current:0};
  for(const key of round%2?['current','baseline'] as const:['baseline','current'] as const){
   const update=key==='baseline'?a:b,start=performance.now();for(let i=0;i<count;i++)update();measured[key]=(performance.now()-start)/count;
  }batches.push(measured);
 }
 return {unit:'milliseconds per CPU update',batches,baselineMedian:median(batches.map(batch=>batch.baseline)),currentMedian:median(batches.map(batch=>batch.current))};
}
function release(group:THREE.Object3D){
 const textures=new Set<THREE.Texture>();group.traverse(node=>{
  if(node instanceof THREE.InstancedMesh)node.dispose();
  if(node instanceof THREE.Mesh||node instanceof THREE.Line||node instanceof THREE.Points)for(const material of [node.material].flat())for(const value of Object.values(material))if(value instanceof THREE.Texture)textures.add(value);
 });for(const texture of textures)texture.dispose();releaseSurfaceGroup(group);
}
function syntheticHistory(currentA:number){
 const rotor=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,currentA});
 const solved=simulateFuelTransport(rotor,{cells:16,steps:128});
 // Oversample a short solved history. This stresses playback; it is not a new solution or convergence study.
 const checkpoints:FuelTransportCheckpoint[]=Array.from({length:historySize},(_,i)=>{
  const state=sampleFuelTransport(solved,solved.durationS*i/(historySize-1));
  const {profiles:_profiles,lightCDF:_lightCDF,heavyCDF:_heavyCDF,...checkpoint}=state;return checkpoint;
 });return {...rotor,transport:{...solved,checkpoints}};
}
const settle=async()=>{for(let i=0;i<60;i++)await Promise.resolve();};
async function harness(uiModule:typeof currentUI,geometryModule:typeof currentGeometry,a:FuelRenderResult,b:FuelRenderResult){
 const dom=new JSDOM('<!doctype html><main></main>',{url:'https://example.org/?level=2'}),doc=dom.window.document;
 Object.defineProperty(dom.window,'matchMedia',{value:()=>({matches:true,addEventListener(){},removeEventListener(){}})});
 const enter=()=>Object.defineProperty(globalThis,'document',{value:doc,configurable:true});enter();
 let renders=0,worldNodes=0;
 const viewers:{animation:((dt:number)=>void)|null;scene:THREE.Object3D|null;pose:CameraPose}[]=[];
 // Real UI, SVG renderer, geometry, field tools and tracers; display I/O is the only adapter.
 const graphics=[{createApparatusViewer:(_frame:HTMLElement,options:{loader:{loadAsync:(model:unknown)=>Promise<{scene:THREE.Object3D}>}})=>{
  const state={animation:null as ((dt:number)=>void)|null,scene:null as THREE.Object3D|null,pose:{position:[.8,.8,.8],target:[0,0,0],up:[0,1,0]} as CameraPose};viewers.push(state);
  return {async load(asset:{model:unknown}){state.animation=null;if(state.scene)release(state.scene);state.scene=(await options.loader.loadAsync(asset.model)).scene;},
   setAnimation(callback:((dt:number)=>void)|null){state.animation=callback;},refresh(){renders++;state.scene?.updateMatrixWorld(true);},
   cameraPose:()=>state.pose,setCamera(pose:CameraPose|undefined){if(pose)state.pose=pose;},resize(){},select(){},reset(){},dispose(){if(state.scene)release(state.scene);state.scene=null;}};
 }},geometryModule];
 const request=(async(record:{kind:string;config?:{currentA:number}})=>{
  assert.equal(record.kind,'fuel-centrifuge');return {result:record.config?.currentA===b.config.currentA?b:a,producingCode:null};
 }) as NonNullable<SetupFuelCentrifugeOptions['request']>;
 const ui=uiModule.setupFuelCentrifuge({document:doc,request,loadGraphics:async()=>graphics as unknown as Awaited<ReturnType<NonNullable<SetupFuelCentrifugeOptions['loadGraphics']>>>});
 const node=(id:string)=>{const found=doc.getElementById(id);assert.ok(found,id);return found as HTMLInputElement;};
 const change=(id:string,value:string)=>{node(id).value=value;node(id).dispatchEvent(new dom.window.Event(id==='fuel-currentA'||id==='fuel-motion-time'?'input':'change',{bubbles:true}));};
 ui.setActive(true);await settle();assert.ok(ui.latest);assert.ok(viewers[0].scene);
 doc.querySelector<HTMLButtonElement>('[aria-label="Pin accepted experiment as comparison A"]')!.click();await settle();
 change('fuel-currentA',String(b.config.currentA));await ui.run();await settle();assert.equal(ui.latest?.result,b);assert.equal(viewers.length,2);
 viewers[0].scene!.traverse(()=>worldNodes++);
 return {async prepare(topic:string){enter();if(node('fuel-motion-play').getAttribute('aria-pressed')==='true')node('fuel-motion-play').click();change('fuel-motion-mode',topic==='spin'?'spin':'transport');change('fuel-plot',topic);change('fuel-motion-time','.31');node('fuel-motion-play').click();assert.equal(typeof viewers[0].animation,'function');},
  frame(){enter();assert.ok(viewers[0].animation);viewers[0].animation(.016);},
  evidence(){return {elapsedS:Number(node('fuel-motion-time').value),svgSeries:doc.querySelectorAll('#fuel-plots [data-series]').length,svgVisibleUntil:[...doc.querySelectorAll('#fuel-plots svg')].map(svg=>svg.getAttribute('data-visible-until')),worldNodes,renderCalls:renders};},
  dispose(){enter();ui.dispose();dom.window.close();}};
}

try{
 const baselineRevision=(await readFile(join(baselineDir,'REVISION'),'utf8')).trim();
 const sourceHashes:Record<string,{baseline:string;current:string}>={};
 for(const file of files){
  const baseline=await readFile(join(baselineDir,file),'utf8'),current=await readFile(join(root,'src',file),'utf8');
  sourceHashes[file]={baseline:createHash('sha256').update(baseline).digest('hex'),current:createHash('sha256').update(current).digest('hex')};
  const path=join(root,'src',prefix+file);temporary.push(path);
  let content=baseline;
  for(const dependency of files)content=content.replaceAll(`'./${dependency.replace(/\.ts$/,'.js')}'`,`'./${prefix+dependency.replace(/\.ts$/,'.js')}'`);
  await writeFile(path,content);
 }
 const oldUI=await import(pathToFileURL(join(root,'src',prefix+'fuel-centrifuge-ui.ts')).href) as typeof currentUI;
 const oldGeometry=await import(pathToFileURL(join(root,'src',prefix+'fuel-centrifuge-geometry.ts')).href) as typeof currentGeometry;
 const a=syntheticHistory(DEFAULT_FUEL_CENTRIFUGE.currentA),b=syntheticHistory(.001),memoryBefore=process.memoryUsage();
 const motion=createFuelMotion(a);motion.group.visible=false;const timeS=a.config.durationS*.314159;
 assert.deepEqual(motion.update(timeS,'spin'),fuelMotionState(a,timeS,'spin'));
 const sampler=paired(()=>{fuelMotionState(a,timeS,'spin');},()=>{motion.update(timeS,'spin');},microFrames);release(motion.group);
 let scans=0,reads=0;
 const checkpoints=new Proxy(a.transport.checkpoints,{get(target,key,receiver){
  if(key===Symbol.iterator)return function*(){scans++;for(const checkpoint of target){reads++;yield checkpoint;}};return Reflect.get(target,key,receiver);
 }});
 const monitored={...a,transport:{...a.transport,checkpoints}},counted=createFuelMotion(monitored);counted.group.visible=false;
 const construction={scans,reads};scans=0;reads=0;
 for(let i=0;i<5;i++)counted.update(timeS,'spin');const cachedReads={scans,reads};scans=0;reads=0;
 for(let i=0;i<5;i++)fuelMotionState(monitored,timeS,'spin');const uncachedReads={scans,reads};release(counted.group);
 const baseline=await harness(oldUI,oldGeometry,a,b),current=await harness(currentUI,currentGeometry,a,b),scenarios=[];
 try{
  for(const topic of ['spin','heat','separation']){
   await baseline.prepare(topic);await current.prepare(topic);
   scenarios.push({topic,...paired(()=>baseline.frame(),()=>current.frame(),frames),baselineEvidence:baseline.evidence(),currentEvidence:current.evidence()});
  }
 }finally{baseline.dispose();current.dispose();}
 console.log(JSON.stringify({schemaVersion:1,scope:'Synthetic immutable-history stress study; CPU adapter timings, not a physics benchmark or GPU/browser-frame measurement.',
  baselineRevision,sourceHashes,environment:{node:process.version,platform:process.platform,arch:process.arch,cpu:cpus()[0]?.model},
  options:{historySize,cells:16,solvedSteps:128,rounds,frames,warmup,microFrames},
  excluded:['worker solve and initial setup','Blender asset loading','GPU rasterization/shadows','browser layout/paint','apparatus viewer event handling'],
  hiddenSameSampler:{...sampler,readCounts:{construction,cachedFiveUpdates:cachedReads,uncachedFiveUpdates:uncachedReads}},
  completeUIPlotAndScene:scenarios,memory:{before:memoryBefore,after:process.memoryUsage()}},null,2));
}finally{
 for(const path of temporary)await rm(path,{force:true});
 if(originalDocument)Object.defineProperty(globalThis,'document',originalDocument);else Reflect.deleteProperty(globalThis,'document');
}
