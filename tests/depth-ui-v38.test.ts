import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {setupCollectorAcceptance} from '../src/collector-acceptance-ui.js';
import {setupResearchDistributions} from '../src/research-distribution-ui.js';
function dom(t:any){
 const window=new JSDOM('<main></main>').window,previous=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'document',{configurable:true,value:window.document});
 t.after(()=>{window.close();if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');});return window;
}
test('collector controls update accepted output and reject old unpositioned results',t=>{
 const window=dom(t),root=window.document.querySelector('main')!,viewer=setupCollectorAcceptance(root);
 const species=[40,84].map(massU=>({massU,chargeState:1,injected:1,end:1,wall:0,source:0,remaining:0,impacts:[{destination:'end',position:[.25,0,2]}]}));
 viewer.update({config:{radius:.5},species});assert.match(root.textContent!,/1\/1 accepted/);
 const ranges=root.querySelectorAll('input');(ranges[1] as HTMLInputElement).value='.4';ranges[1].dispatchEvent(new window.Event('input'));
 assert.match(root.textContent!,/0\/1 accepted/);assert.match(root.textContent!,/undefined \(empty collector\)/);assert.match(root.textContent!,/0.200 m/);
 viewer.update({config:{radius:.5},species:species.map(s=>({...s,impacts:s.impacts.map(({position,...hit})=>hit)}))});assert.equal(viewer.element.hidden,true);assert.equal(root.querySelector('[role="status"]')!.textContent,'');
});
test('research distributions are lazy, retry failure, change exact saved keys and do not retain stale plots',async t=>{
 const window=dom(t),root=window.document.querySelector('main')!,packet=JSON.parse(readFileSync('web-assets/research-depth/recorded-distributions.json','utf8'));let requests=0;
 const viewer=setupResearchDistributions(async()=>({ok:++requests>1,json:async()=>packet}));root.append(viewer.element);viewer.update(packet.cases[0].id,0);assert.equal(requests,0);
 const button=root.querySelector('button')!;button.click();await new Promise(setImmediate);assert.match(root.textContent!,/could not be loaded/);assert.equal(button.disabled,false);
 button.click();await new Promise(setImmediate);assert.equal(requests,2);assert.equal(root.querySelectorAll('figure').length,2);assert.match(root.textContent!,/Qualification withheld/);
 const axis=root.querySelector('select')!;axis.value='2';axis.dispatchEvent(new window.Event('change'));assert.match(root.textContent!,/vz \/ V₀/);
 const comparison=root.querySelectorAll('select')[1];comparison.value=String(packet.refinements.findIndex((g:any)=>g.study==='v16 isotropic'));comparison.dispatchEvent(new window.Event('change'));assert.match(root.textContent!,/noneq-n128-a0015625 → noneq-n256-a0015625/);
 viewer.update(packet.cases[1].id,20);assert.match(root.textContent!,new RegExp(packet.cases[1].id));
 viewer.update(packet.cases[1].id,20.5);assert.equal(root.querySelectorAll('figure').length,0);assert.match(root.textContent!,/exact case/);
});
test('an unavailable distribution disconnects existing responsive plot observers',async t=>{
 const window=dom(t),root=window.document.querySelector('main')!,observers:{disconnected:boolean}[]=[];
 class Observer{disconnected=false;constructor(_callback:unknown){observers.push(this);}observe(){}disconnect(){this.disconnected=true;}}
 Object.defineProperty(window,'ResizeObserver',{value:Observer});
 const packet=JSON.parse(readFileSync('web-assets/research-depth/recorded-distributions.json','utf8'));
 const viewer=setupResearchDistributions(async()=>({ok:true,json:async()=>packet}));root.append(viewer.element);viewer.update(packet.cases[0].id,0);
 root.querySelector('button')!.click();await new Promise(setImmediate);assert.equal(observers.length,2);
 viewer.update(packet.cases[0].id,0.5);assert.equal(root.querySelectorAll('figure').length,0);assert.ok(observers.every(o=>o.disconnected));
 viewer.update(packet.cases[0].id,1);assert.equal(observers.length,4);assert.ok(observers.slice(2).every(o=>!o.disconnected));
 viewer.update('missing-case',1);assert.ok(observers.every(o=>o.disconnected));
});
