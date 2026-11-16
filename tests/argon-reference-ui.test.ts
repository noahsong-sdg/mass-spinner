import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {mountArgonReference} from '../src/argon-reference-ui.js';
const bytes=readFileSync(new URL('../web-assets/argon-reference/v98.json',import.meta.url));

function setup(t:any,fetcher:any){
 const {window}=new JSDOM('<main></main>',{url:'https://example.org'}),doc=window.document;
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:doc,configurable:true});
 const view=mountArgonReference(doc.querySelector('main'),{fetcher});
 t.after(()=>{view.dispose();window.close();if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');});
 return {window,doc,view};
}

test('reference loads on demand, exposes every condition and plots actual stored samples independently of sliders',async t=>{
 let calls=0;const {window,doc,view}=setup(t,async()=>{calls++;return new Response(bytes);});
 assert.equal(calls,0);assert.equal(view.element.open,false);assert.equal(doc.querySelectorAll('svg').length,0);
 view.element.open=true;await view.load();assert.equal(calls,1);
 const select=doc.querySelector('select')!;assert.equal(select.options.length,8);assert.equal(select.disabled,false);
 assert.equal(doc.querySelectorAll('svg').length,1);assert.match(doc.querySelector('svg')!.getAttribute('aria-label')!,/apparent speed.*Sightline offset/);
 select.value=select.options[7].value;select.dispatchEvent(new window.Event('change'));
 assert.match(view.element.textContent,/experimental accuracy unqualified/);assert.match(view.element.textContent,/not local gas speeds/);
 assert.match(view.element.textContent,/Lithium sliders do not change/);assert.match(view.element.textContent,/Ideal ring contacts/);
 assert.equal(doc.querySelector('code')!.textContent,'scientific/nonrigid-v98/evidence.tar.gz');
 await view.load();assert.equal(calls,1);view.dispose();assert.equal(doc.querySelector('.argon-reference'),null);
});

test('failed load stays unqualified and can retry; failed bytes never render as reference data',async t=>{
 let calls=0;const {doc,view}=setup(t,async()=>new Response(++calls===1?'{}':bytes));
 view.element.open=true;assert.equal(await view.load(),null);
 assert.match(doc.querySelector('[role=status]')!.textContent!,/source identity/);assert.equal(doc.querySelectorAll('svg').length,0);
 assert.equal(doc.querySelector('button')!.hidden,false);assert.equal(doc.querySelector('select')!.disabled,true);
 await view.load();assert.equal(calls,2);assert.equal(doc.querySelector('button')!.hidden,true);assert.equal(doc.querySelector('select')!.disabled,false);
});

test('disposing an outstanding request aborts it and prevents a late response from rebuilding the UI',async t=>{
 let resolve!:(response:Response)=>void,signal:AbortSignal;
 const {doc,view}=setup(t,async(_url:any,options:any)=>{signal=options.signal;return new Promise<Response>(r=>{resolve=r;});});
 view.element.open=true;const pending=view.load();view.dispose();assert.equal(signal!.aborted,true);
 resolve(new Response(bytes));assert.equal(await pending,null);assert.equal(doc.querySelectorAll('svg').length,0);assert.equal(doc.querySelector('.argon-reference'),null);
});
