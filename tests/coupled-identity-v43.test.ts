import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {setupCoupledTarget} from '../src/coupled-target-ui.js';
import {DEFAULT_FUSION_BEAM,simulateFusionBeam} from '../src/fusion-reactor.ts';
import {simulateCoupledTarget} from '../src/coupled-target.ts';

const identity=(letter:string)=>({schemaVersion:1,algorithm:'sha256',sourceHash:letter.repeat(64),sourceFiles:{'src/worker.ts':'f'.repeat(64)}});
const source=()=>simulateFusionBeam({...DEFAULT_FUSION_BEAM,stoppingModel:'geant4-bragg',materialColumnM2:1e21,targetColumnM2:7e20,exposureS:.01});
const settle=()=>new Promise(resolve=>setTimeout(resolve,300));
function fixture(t:any,options={}){
 const dom=new JSDOM('<div id="host"></div>'),doc=dom.window.document;
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:doc,configurable:true});
 t.after(()=>{dom.window.close();if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');});
 let blob:Blob|undefined;
 t.mock.method(URL,'createObjectURL',(value:Blob)=>{blob=value;return 'blob:coupled-identity';});t.mock.method(URL,'revokeObjectURL',()=>{});
 t.mock.method(dom.window.HTMLAnchorElement.prototype,'click',()=>{});
 const ui=setupCoupledTarget(doc.getElementById('host'),options);
 const change=(id:string,value:number)=>{const range=doc.getElementById(id) as HTMLInputElement;range.value=String(value);range.dispatchEvent(new dom.window.Event('input',{bubbles:true}));};
 change('coupled-cooldownS',0);
 return {ui,doc,change,async exported(){(doc.getElementById('coupled-export') as HTMLButtonElement).click();return JSON.parse(await blob!.text());}};
}

test('default target worker path binds producing identity to accepted history and exported selected time',async t=>{
 let code=identity('a');
 class TargetWorker {
  onmessage:any;onerror:any;terminate(){}
  postMessage(record:any){queueMicrotask(()=>this.onmessage({data:{id:record.id,kind:record.kind,schemaVersion:1,
   result:simulateCoupledTarget(record.beam,record.config),producingCode:code}}));}
 }
 const previous=Object.getOwnPropertyDescriptor(globalThis,'Worker');Object.defineProperty(globalThis,'Worker',{value:TargetWorker,configurable:true});
 t.after(()=>{if(previous)Object.defineProperty(globalThis,'Worker',previous);else Reflect.deleteProperty(globalThis,'Worker');});
 const f=fixture(t);f.ui.update(source());await settle();assert.ok(f.ui.result);
 assert.deepEqual(f.ui.result.producingCode,identity('a'));code=identity('b');
 f.change('coupled-time',f.ui.result.history.length-1);
 let saved=await f.exported();assert.equal(saved.producingCode.sourceHash,'a'.repeat(64));assert.equal(saved.selectedTimeS,f.ui.result.final.timeS);
 f.change('coupled-replacementProbability',.2);assert.equal((f.doc.getElementById('coupled-export') as HTMLButtonElement).disabled,true);
 await settle();saved=await f.exported();assert.equal(saved.producingCode.sourceHash,'b'.repeat(64));assert.equal(saved.config.replacementProbability,.2);
 f.ui.update(null);assert.equal(f.ui.result,null);
});

test('legacy or malformed target provenance stays explicitly unknown rather than acquiring current build identity',async t=>{
 let metadata:any=undefined;
 const f=fixture(t,{request:async(record:any)=>({...simulateCoupledTarget(record.beam,record.config),producingCode:metadata})});
 for(const value of [undefined,{schemaVersion:1,sourceHash:'old'},{...identity('a'),sourceFiles:{}}]){
  metadata=value;f.ui.update(source());await settle();assert.equal((await f.exported()).producingCode,null);
 }
 f.ui.update(null);
});
