import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {setupFuelCentrifuge} from '../src/fuel-centrifuge-ui.js';
import {captureScenario,restoreScenario,readScenario,scenarioLink} from '../src/scenario-state.js';
import {simulateFuelCentrifuge,DEFAULT_FUEL_CENTRIFUGE} from '../src/fuel-centrifuge.js';
import {simulateFuelOperation} from '../src/fuel-operation.js';

const accuracy={relativeTolerance:6.25e-7,temperatureToleranceK:1e-7};
const spatialControls={'fuel-pair':'dt','fuel-thermal-enabled':true,'fuel-thermal-model':'spatial','fuel-thermal-gasModel':'spatial'};
const scenario=(controls:Record<string,unknown>)=>({version:2,level:'2',controls});

function fixture(t:any){
 const dom=new JSDOM('<main></main>',{url:'https://example.org/?level=2'}),doc=dom.window.document,requests:any[]=[];
 const old=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:doc,configurable:true});
 // This fixture checks UI ownership and messages, not adaptive physics. Return
 // a cheap accepted trajectory while retaining the requested operation metadata.
 const rotor=simulateFuelCentrifuge(DEFAULT_FUEL_CENTRIFUGE),transport=simulateFuelOperation(rotor,{schemaVersion:1,events:[]},{cells:4,steps:4});
 const ui=setupFuelCentrifuge({document:doc,request:async(request:any)=>{
  requests.push(structuredClone(request));
  const timeControl=request.operation.thermal.gas?.accuracy?{method:'BE step doubling',...request.operation.thermal.gas.accuracy,startTimeS:request.resume?.timeS??0,acceptedPairs:7,rejectedSteps:3,maxErrorRatio:.5}:undefined;
  return {result:{...rotor,transport:{...transport,timeControl,operation:{...transport.operation,thermal:request.operation.thermal,events:request.operation.events}}}};
 },loadGraphics:async()=>{throw new Error('Graphics are outside this message-contract fixture.');}});
 const node=(id:string)=>doc.getElementById(id) as any;
 const change=(id:string,value:string|boolean,type='change')=>{if(typeof value==='boolean')node(id).checked=value;else node(id).value=value;node(id).dispatchEvent(new dom.window.Event(type,{bubbles:true}));};
 t.after(()=>{ui.dispose();dom.window.close();if(old)Object.defineProperty(globalThis,'document',old);else Reflect.deleteProperty(globalThis,'document');});
 return {ui,doc,node,change,requests};
}

test('refined resolution is opt-in for spatial gas and owns the operation sent to the worker',async t=>{
 const f=fixture(t),resolution=f.node('fuel-thermal-resolution');
 assert.equal(resolution.value,'interactive');assert.equal(resolution.disabled,true);assert.equal(resolution.parentElement.hidden,true);
 restoreScenario(f.doc,scenario(spatialControls));assert.equal(resolution.disabled,false);assert.equal(resolution.parentElement.hidden,false);
 await f.ui.run();assert.deepEqual(f.requests.at(-1).operation.thermal.gas,{conductivityWMK:.1});
 f.change('fuel-thermal-resolution','refined');await f.ui.run();
 const request=f.requests.at(-1);assert.deepEqual(request.operation.thermal.gas,{conductivityWMK:.1,accuracy});assert.equal(request.operation.thermal.spatial.cells,16);
 assert.equal(request.kind,'fuel-centrifuge');assert.equal(request.schemaVersion,1);assert.equal(request.includeTransport,true);
 assert.deepEqual(request.operation.thermal.gas.accuracy,{relativeTolerance:6.25e-7,temperatureToleranceK:1e-7});
 assert.equal(request.options,undefined);assert.match(f.ui.nodes.controls.textContent,/temporal error estimate; spatial refinement remains necessary/);
 assert.match(f.ui.nodes.controls.textContent,/Refined runs are slower/);
 assert.match(f.ui.nodes.info.textContent,/Temporal error estimate: BE step doubling; relative tolerance/);
 assert.match(f.ui.nodes.info.textContent,/temperature tolerance.*K; 7 accepted pairs, 3 rejected steps, maximum accepted ratio 0.5/);
 assert.match(f.ui.nodes.info.textContent,/Counters since 0 s; retained prefix excluded/);
 f.change('fuel-motion-time','.4','input');f.change('fuel-currentA','.02','input');await f.ui.run();
 assert.equal(f.requests.at(-1).resume.timeS,.4);assert.deepEqual(f.requests.at(-1).operation.thermal.gas.accuracy,accuracy);
 assert.match(f.ui.nodes.info.textContent,/Counters since 0.4 s; retained prefix excluded/);
 f.change('fuel-thermal-resolution','interactive');await f.ui.run();
 assert.equal(f.requests.at(-1).resume,undefined);assert.equal(f.requests.at(-1).operation.events.length,0);assert.equal(f.requests.at(-1).operation.thermal.gas.accuracy,undefined);
 assert.doesNotMatch(f.ui.nodes.info.textContent,/Temporal error estimate:/);
 f.change('fuel-thermal-gasModel','lumped');assert.equal(resolution.disabled,true);assert.equal(resolution.parentElement.hidden,true);
});

test('refined scenario roundtrips and old spatial-gas links reset a stale refined workspace',t=>{
 const f=fixture(t);restoreScenario(f.doc,scenario({...spatialControls,'fuel-thermal-resolution':'refined'}));
 const saved=captureScenario(f.doc,'2');assert.equal(saved.controls['fuel-thermal-resolution'],'refined');
 restoreScenario(f.doc,scenario(spatialControls));assert.equal(f.node('fuel-thermal-resolution').value,'interactive');assert.equal(f.node('fuel-thermal-gasModel').value,'spatial');
 const decoded=readScenario(new URL(scenarioLink('https://example.org/',saved)).search);assert.equal(decoded.invalid,false);
 restoreScenario(f.doc,decoded.scenario);assert.equal(f.node('fuel-thermal-resolution').value,'refined');
 f.change('fuel-thermal-gasModel','lumped');assert.equal(captureScenario(f.doc,'2').controls['fuel-thermal-resolution'],undefined);
});

test('invalid refined scenarios reject atomically without changing existing settings',t=>{
 const f=fixture(t);restoreScenario(f.doc,scenario({...spatialControls,'fuel-thermal-resolution':'refined'}));const before=captureScenario(f.doc,'2');
 for(const controls of [
  {...spatialControls,'fuel-thermal-resolution':'unknown'},
  {...spatialControls,'fuel-thermal-resolution':'refined','fuel-thermal-enabled':false},
  {...spatialControls,'fuel-thermal-resolution':'refined','fuel-thermal-model':'lumped'},
  {...spatialControls,'fuel-thermal-resolution':'refined','fuel-thermal-gasModel':'lumped'},
  {...spatialControls,'fuel-thermal-resolution':'refined','fuel-pair':'molecular'},
 ]){assert.throws(()=>restoreScenario(f.doc,scenario(controls)));assert.deepEqual(captureScenario(f.doc,'2'),before);}
});

test('refined Export prepares gzip asynchronously and releases its download URL on disposal',{timeout:5000},async t=>{
 const f=fixture(t);restoreScenario(f.doc,scenario({...spatialControls,'fuel-thermal-resolution':'refined'}));await f.ui.run();
 const create=URL.createObjectURL,revoke=URL.revokeObjectURL,anchors=f.doc.defaultView!.HTMLAnchorElement.prototype,anchor=anchors.click;
 let resolveDownload:(blob:Blob)=>void,filename='';const downloaded=new Promise<Blob>(resolve=>{resolveDownload=resolve;});const revoked:string[]=[];
 URL.createObjectURL=(blob:Blob)=>{resolveDownload(blob);return 'blob:refined-download';};URL.revokeObjectURL=url=>{revoked.push(String(url));};
 anchors.click=function(){filename=this.download;};
 t.after(()=>{URL.createObjectURL=create;URL.revokeObjectURL=revoke;anchors.click=anchor;});
 f.node('fuel-export').click();assert.equal(f.node('fuel-export').disabled,true);assert.equal(f.node('fuel-export').textContent,'Preparing…');
 assert.match(f.ui.nodes.render.textContent,/Preparing compressed export/);
 const blob=await downloaded;assert.equal(blob.type,'application/gzip');
 const payload=await new Response(blob.stream().pipeThrough(new DecompressionStream('gzip'))).text();
 assert.equal(payload,JSON.stringify({model:'marathon-centrifuge',...f.ui.latest}));assert.equal(filename,'mass-spinner-centrifuge.json.gz');
 assert.equal(f.node('fuel-export').disabled,false);assert.equal(f.node('fuel-export').textContent,'Export');
 f.ui.dispose();assert.deepEqual(revoked,['blob:refined-download']);
});

test('stale or disposed refined preparations cannot trigger a download',async t=>{
 const f=fixture(t);restoreScenario(f.doc,scenario({...spatialControls,'fuel-thermal-resolution':'refined'}));await f.ui.run();
 const create=URL.createObjectURL;let downloads=0;URL.createObjectURL=()=>{downloads++;return 'blob:unexpected';};t.after(()=>{URL.createObjectURL=create;});
 f.node('fuel-export').click();f.change('fuel-currentA','.02','input');
 await new Promise(resolve=>setTimeout(resolve,10));assert.equal(downloads,0);assert.equal(f.node('fuel-export').disabled,true);assert.equal(f.node('fuel-export').textContent,'Export');
 await f.ui.run();f.node('fuel-export').click();f.ui.dispose();
 await new Promise(resolve=>setTimeout(resolve,10));assert.equal(downloads,0);
});

test('refined compression errors appear in the existing status without a JSON fallback',async t=>{
 const f=fixture(t);restoreScenario(f.doc,scenario({...spatialControls,'fuel-thermal-resolution':'refined'}));await f.ui.run();
 const compression=globalThis.CompressionStream,create=URL.createObjectURL;let downloads=0;
 globalThis.CompressionStream=class{constructor(){throw new Error('codec failure');}} as any;
 URL.createObjectURL=()=>{downloads++;return 'blob:unexpected';};t.after(()=>{globalThis.CompressionStream=compression;URL.createObjectURL=create;});
 f.node('fuel-export').click();for(let i=0;i<5;i++)await Promise.resolve();
 assert.match(f.ui.nodes.render.textContent,/Export failed: codec failure/);assert.equal(downloads,0);assert.equal(f.node('fuel-export').disabled,false);
});
