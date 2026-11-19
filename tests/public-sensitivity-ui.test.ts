import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {mountPublicSensitivity} from '../src/public-sensitivity-ui.js';
import {setupFuelCentrifuge} from '../src/fuel-centrifuge-ui.js';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.ts';
import {DEFAULT_FUEL_THERMAL,simulateFuelOperation} from '../src/fuel-operation.ts';
const identity={schemaVersion:1,algorithm:'sha256',sourceHash:'a'.repeat(64),sourceFiles:{'src/worker.ts':'b'.repeat(64)}};
const config={...DEFAULT_FUEL_CENTRIFUGE,durationS:.001};
const operation={schemaVersion:1 as const,events:[],thermal:{...DEFAULT_FUEL_THERMAL}};
const flush=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
function solve(record:any={config,operation}){
 const rotor=simulateFuelCentrifuge(record.config,record.operation.events);
 return {result:{...rotor,transport:simulateFuelOperation(rotor,record.operation)},producingCode:identity};
}
function fixture(t:any){
 const {window}=new JSDOM('<main></main>',{url:'https://example.org'}),doc=window.document;
 const old=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:doc,configurable:true});
 const requests:any[]=[];
 const request=(record:any,signal:any)=>new Promise((resolve,reject)=>requests.push({record,signal,resolve,reject}));
 const view=mountPublicSensitivity(doc.querySelector('main'),{request});
 t.after(()=>{view.dispose();window.close();if(old)Object.defineProperty(globalThis,'document',old);else Reflect.deleteProperty(globalThis,'document');});
 const edit=(id:string,value:any)=>{const node=doc.getElementById(id) as HTMLInputElement;node.value=String(value);node.dispatchEvent(new window.Event(node.tagName==='SELECT'?'change':'input'));};
 const resolve=(i:number)=>requests[i].resolve(solve(requests[i].record));
 return {window,doc,view,requests,request,edit,resolve};
}

test('optional panel stays idle, samples actual coupled workers sequentially and labels the sampled range honestly',async t=>{
 const f=fixture(t);assert.equal(f.view.element.open,false);await f.view.run();assert.equal(f.requests.length,0);
 assert.equal(f.view.element.querySelector('a')!.getAttribute('href'),'/qualification.html');
 const accepted=solve();f.view.update(accepted);assert.equal(f.requests.length,0);
 f.view.element.open=true;f.edit('public-sensitivity-lower',1);f.edit('public-sensitivity-upper',3);
 const pending=f.view.run();assert.equal(f.requests.length,1);assert.equal(f.requests[0].record.config.dragHz,1);
 assert.equal(f.requests[0].record.includeTransport,true);assert.deepEqual(f.requests[0].record.operation,operation);
 f.resolve(0);await flush();assert.equal(f.requests.length,2);assert.equal(f.requests[1].record.config.dragHz,2);
 f.resolve(1);await flush();assert.equal(f.requests.length,3);assert.equal(f.requests[2].record.config.dragHz,3);
 f.resolve(2);await pending;
 assert.equal(f.view.samples!.length,3);assert.equal(f.doc.querySelectorAll('svg').length,3);
 assert.ok(f.view.samples!.every((s:any)=>s.rows.length===41&&!s.experimentallyQualified&&!s.numericallyQualified));
 assert.match(f.view.element.textContent!,/sample limits, not all possible results/);
 assert.match(f.view.element.textContent!,/Numerical and experimental accuracy are not established/);
 assert.equal(accepted.result.config.dragHz,2,'sensitivity leaves the accepted scenario unchanged');
});

test('coefficient edits, changed accepted settings and late replies cannot restore stale plots',async t=>{
 const f=fixture(t);f.view.update(solve());f.view.element.open=true;
 const pending=f.view.run();assert.equal(f.requests.length,1);
 f.view.invalidate();assert.equal(f.requests[0].signal.aborted,true);assert.equal(f.view.samples,null);
 f.resolve(0);await pending;assert.equal(f.doc.querySelectorAll('svg').length,0);
 const next=solve({config:{...config,gasK:600},operation});f.view.update(next);
 const current=f.view.run();assert.equal(f.requests[1].record.config.gasK,600);f.resolve(1);await current;
 assert.equal(f.doc.querySelectorAll('svg').length,3);
 f.edit('public-sensitivity-coefficient','conductivitySm');
 assert.equal(f.view.samples,null);assert.equal(f.doc.querySelectorAll('svg').length,0);
 assert.equal((f.doc.getElementById('public-sensitivity-lower') as HTMLInputElement).value,'1');
 f.view.update(solve());assert.equal(f.doc.querySelectorAll('svg').length,0);
});

test('invalid bounds, missing identity and errors retain no partial range or qualification claim',async t=>{
 const f=fixture(t);f.view.update(solve());f.view.element.open=true;
 f.edit('public-sensitivity-lower',0);await f.view.run();assert.equal(f.requests.length,0);
 assert.match(f.view.element.textContent!,/drag\/conductivity positive/);
 f.edit('public-sensitivity-lower',1);f.edit('public-sensitivity-upper',3);
 const pending=f.view.run();f.resolve(0);await flush();f.requests[1].reject(new Error('Property domain exceeded'));await pending;
 assert.equal(f.view.samples,null);assert.equal(f.doc.querySelectorAll('svg').length,0);
 assert.match(f.view.element.textContent!,/Property domain exceeded/);
 const missing={...solve(),producingCode:null};f.view.update(missing);await f.view.run();assert.equal(f.requests.length,2);
});

test('hidden, cancelled and disposed panels abort outstanding work and suppress late replies',async t=>{
 const f=fixture(t);f.view.update(solve());f.view.element.open=true;
 let pending=f.view.run();f.view.cancelPending();assert.equal(f.requests[0].signal.aborted,true);f.resolve(0);await pending;
 pending=f.view.run();f.view.element.open=false;f.view.element.dispatchEvent(new f.window.Event('toggle'));
 assert.equal(f.requests[1].signal.aborted,true);f.resolve(1);await pending;
 f.view.element.open=true;pending=f.view.run();f.view.dispose();assert.equal(f.requests[2].signal.aborted,true);f.resolve(2);await pending;
 assert.equal(f.requests.length,3);assert.equal(f.doc.querySelector('.public-sensitivity'),null);
});

test('parent playground invalidates on sliders and cancels on deactivation and disposal',async t=>{
 const f=fixture(t);f.view.dispose();
 const ui=setupFuelCentrifuge({document:f.doc,request:f.request,loadGraphics:async()=>{throw new Error('No GPU in this control test');}});
 t.after(()=>ui.dispose());
 let pending=ui.run();f.resolve(0);await pending;
 const detail=f.doc.querySelector('.public-sensitivity') as HTMLDetailsElement;detail.open=true;
 const button=[...detail.querySelectorAll('button')].find(b=>b.textContent==='Run samples')!;button.click();
 assert.equal(f.requests.length,2);ui.setActive(false);assert.equal(f.requests[1].signal.aborted,true);f.resolve(1);await flush();
 button.click();assert.equal(f.requests.length,3);
 const gas=f.doc.getElementById('fuel-gasK') as HTMLInputElement;gas.value='600';gas.dispatchEvent(new f.window.Event('input'));
 assert.equal(f.requests[2].signal.aborted,true);f.resolve(2);await flush();assert.equal(detail.querySelectorAll('svg').length,0);
 assert.match(detail.textContent!,/setup changed/);
 pending=ui.run();f.resolve(3);await pending;button.click();assert.equal(f.requests.length,5);
 ui.dispose();assert.equal(f.requests[4].signal.aborted,true);f.resolve(4);await flush();
 assert.equal(f.doc.querySelector('.public-sensitivity'),null);assert.equal(f.requests.length,5);
});
