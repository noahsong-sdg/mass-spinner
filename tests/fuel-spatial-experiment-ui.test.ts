import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {mountFuelSpatialExperiment} from '../src/fuel-spatial-experiment-ui.js';

const identity={schemaVersion:1,algorithm:'sha256',sourceHash:'a'.repeat(64),sourceFiles:{'src/worker.ts':'b'.repeat(64)}};
function fixture(t:any){
 const {window}=new JSDOM('<main></main>',{url:'https://example.org'}),doc=window.document;
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'document',{value:doc,configurable:true});
 const requests:{request:any;signal:AbortSignal;resolve:(value:any)=>void;reject:(error:Error)=>void}[]=[];
 const view=mountFuelSpatialExperiment(doc.querySelector('main'),{request:(request:any,signal:AbortSignal)=>
  new Promise((resolve,reject)=>requests.push({request,signal,resolve,reject}))});
 t.after(()=>{view.dispose();window.close();if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');});
 const reply=(index=0)=>{
  const config=requests[index].request.config;
  const row=(timeS:number)=>({timeS,radiusM:Array.from({length:config.radialCells},(_,i)=>.01*Math.sqrt((i+.5)/config.radialCells)),
   omegaRadS:Array.from({length:config.radialCells},(_,i)=>10-i),temperatureK:Array(config.radialCells).fill(1000),electrodeCurrentA:-.01});
  return {producingCode:identity,result:{schemaVersion:1,kind:'spatial-argon-experiment',config,
   numericallyQualified:false,experimentallyQualified:false,liveDefaultReplaced:false,
   snapshots:[row(0),row(config.durationS)]}};
 };
 return {window,doc,view,requests,reply};
}

test('research panel stays lazy and uses its own voltage boundary controls and actual worker samples',async t=>{
 const f=fixture(t);assert.equal(f.view.element.open,false);assert.equal(f.requests.length,0);
 await f.view.run();assert.equal(f.requests.length,0);
 f.view.element.open=true;assert.equal(f.requests.length,0);
 assert.match(f.view.element.textContent!,/Current is solved, not imposed/);
 assert.match(f.view.element.textContent!,/no ion–neutral slip control/);
 assert.match(f.view.element.textContent!,/4.63712%.*2.88464%/);
 assert.match(f.view.element.textContent!,/No electron energy/);
 assert.match(f.view.element.textContent!,/not validated continuum limits/);assert.match(f.view.element.textContent!,/low-density rarefaction/);
 assert.match(f.view.element.textContent!,/shorts the driven and grounded contacts/);
 assert.match(f.doc.querySelector('select')!.textContent!,/First half, then shorted/);
 const pending=f.view.run();assert.equal(f.requests.length,1);
 assert.equal(f.requests[0].request.kind,'fuel-spatial-experiment');
 assert.equal(f.requests[0].request.schemaVersion,1);
 assert.ok(f.requests[0].request.config.durationS<=1e-5);
 assert.equal(Object.hasOwn(f.requests[0].request.config,'currentA'),false);
 const reply=f.reply();f.requests[0].resolve(reply);await pending;
 assert.equal(f.doc.querySelectorAll('svg').length,3);
 const labels=[...f.doc.querySelectorAll('svg')].map(svg=>svg.getAttribute('aria-label'));
 assert.ok(labels.some(label=>label?.includes('Common-fluid angular speed')));
 assert.ok(labels.some(label=>label?.includes('Gas temperature')));
 assert.ok(labels.some(label=>label?.includes('Signed outer-contact current')));
 assert.deepEqual(f.view.snapshot!.result,reply.result);assert.deepEqual(f.view.snapshot!.producingCode,identity);
 assert.match(f.doc.querySelector('.fuel-spatial-identity')!.textContent!,/aaaa/);
 assert.equal(f.doc.querySelectorAll('button')[2].disabled,false);
});

test('a control edit aborts obsolete work, clears accepted plots and prevents late reconstruction',async t=>{
 const f=fixture(t);f.view.element.open=true;
 const first=f.view.run(),old=f.reply();
 const voltage=f.doc.querySelector<HTMLInputElement>('#spatial-contactVoltageV')!;
 voltage.value='2';voltage.dispatchEvent(new f.window.Event('input'));
 const pulse=f.doc.querySelector<HTMLSelectElement>('#spatial-drive-fraction')!;
 pulse.value='0.5';pulse.dispatchEvent(new f.window.Event('change'));
 assert.equal(f.requests[0].signal.aborted,true);assert.equal(f.view.snapshot,null);
 const second=f.view.run();assert.equal(f.requests[1].request.config.contactVoltageV,2);assert.equal(f.requests[1].request.config.driveFraction,.5);
 f.requests[1].resolve(f.reply(1));await second;
 f.requests[0].resolve(old);await first;
 assert.equal(f.view.snapshot!.result.config.contactVoltageV,2);
 voltage.value='3';voltage.dispatchEvent(new f.window.Event('input'));
 assert.equal(f.doc.querySelectorAll('svg').length,0);assert.equal(f.view.snapshot,null);
 assert.equal(f.doc.querySelectorAll('button')[2].disabled,true);
});

test('export retains exact result and source identity, defers URL release and cleans it on disposal',async t=>{
 const f=fixture(t);f.view.element.open=true;const pending=f.view.run();f.requests[0].resolve(f.reply());await pending;
 const create=URL.createObjectURL,revoke=URL.revokeObjectURL,click=f.window.HTMLAnchorElement.prototype.click;
 const later=globalThis.setTimeout,clear=globalThis.clearTimeout;
 let blob:Blob|undefined,clicked=0,callback:(()=>void)|undefined,delay:number|undefined;
 const revoked:string[]=[];
 URL.createObjectURL=(value:Blob)=>{blob=value;return 'blob:spatial-test';};
 URL.revokeObjectURL=(value:string)=>{revoked.push(value);};
 f.window.HTMLAnchorElement.prototype.click=function(){clicked++;assert.equal(this.download,'spatial-argon-research.json');};
 globalThis.setTimeout=((fn:()=>void,ms:number)=>{callback=fn;delay=ms;return 987;}) as any;
 globalThis.clearTimeout=(()=>{}) as any;
 t.after(()=>{URL.createObjectURL=create;URL.revokeObjectURL=revoke;f.window.HTMLAnchorElement.prototype.click=click;globalThis.setTimeout=later;globalThis.clearTimeout=clear;});
 f.doc.querySelectorAll('button')[2].click();assert.equal(clicked,1);assert.deepEqual(revoked,[]);assert.equal(delay,1000);
 assert.deepEqual(JSON.parse(await blob!.text()),f.view.snapshot);
 callback!();assert.deepEqual(revoked,['blob:spatial-test']);
 f.doc.querySelectorAll('button')[2].click();f.view.dispose();
 assert.deepEqual(revoked,['blob:spatial-test','blob:spatial-test']);
});

test('invalid controls cannot launch and model errors leave no fallback or export',async t=>{
 const f=fixture(t);f.view.element.open=true;
 const duration=f.doc.querySelector<HTMLInputElement>('#spatial-durationS')!;
 duration.value='';duration.dispatchEvent(new f.window.Event('input'));await f.view.run();
 assert.equal(f.requests.length,0);
 duration.value='1';duration.dispatchEvent(new f.window.Event('input'));
 const pending=f.view.run();f.requests[0].reject(new Error('Property domain exceeded'));await pending;
 assert.match(f.doc.querySelector('[role=status]')!.textContent!,/Property domain exceeded/);
 assert.equal(f.doc.querySelectorAll('svg').length,0);assert.equal(f.view.snapshot,null);
});

test('stale, promoted, nonfinite, truncated and unidentified results refuse before plotting',async t=>{
 const f=fixture(t);f.view.element.open=true;
 for(const mutate of [
  (reply:any)=>reply.producingCode=null,
  (reply:any)=>reply.result.schemaVersion=0,
  (reply:any)=>reply.result.experimentallyQualified=true,
  (reply:any)=>reply.result.config={...reply.result.config,contactVoltageV:9},
  (reply:any)=>reply.result.snapshots[1].temperatureK[0]=Infinity,
  (reply:any)=>reply.result.snapshots[1].timeS=0,
  (reply:any)=>reply.result.snapshots[1].radiusM.pop(),
 ]){
  const pending=f.view.run(),index=f.requests.length-1,reply=f.reply(index);mutate(reply);
  f.requests[index].resolve(reply);await pending;
  assert.equal(f.doc.querySelectorAll('svg').length,0);assert.equal(f.view.snapshot,null);
  assert.match(f.doc.querySelector('[role=status]')!.textContent!,/failed/);
 }
});

test('closing and disposing abort active requests and suppress late responses',async t=>{
 const f=fixture(t);f.view.element.open=true;
 const first=f.view.run(),old=f.reply();f.view.element.open=false;f.view.element.dispatchEvent(new f.window.Event('toggle'));
 assert.equal(f.requests[0].signal.aborted,true);f.requests[0].resolve(old);await first;
 assert.equal(f.doc.querySelectorAll('svg').length,0);
 f.view.element.open=true;const second=f.view.run(),late=f.reply(1);f.view.dispose();
 assert.equal(f.requests[1].signal.aborted,true);f.requests[1].resolve(late);await second;
 assert.equal(f.doc.querySelector('.fuel-spatial-experiment'),null);assert.equal(f.view.snapshot,null);
});
