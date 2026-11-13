import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {mountFuelQualification} from '../src/fuel-qualification-ui.js';

test('model evidence retains qualification limits and displays the measured-profile challenge on demand',async t=>{
 const {window}=new JSDOM('<main></main>',{url:'https://example.org'}),doc=window.document;
 const old=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:doc,configurable:true});
 const view=mountFuelQualification(doc.querySelector('main'));
 t.after(()=>{view.dispose();window.close();if(old)Object.defineProperty(globalThis,'document',old);else Reflect.deleteProperty(globalThis,'document');});
 const detail=doc.querySelector('details')!;
 assert.equal(detail.open,false);assert.equal(doc.querySelectorAll('svg').length,0);
 assert.match(doc.querySelector('h3')!.textContent!,/unqualified/);
 assert.match(detail.textContent!,/not a matched prediction/);
 assert.match(detail.textContent!,/retrospective/);
 assert.equal(doc.querySelectorAll('tbody tr').length,4);
 assert.ok([...doc.querySelectorAll('tbody td')].every(n=>n.textContent==='Excluded'));
 detail.open=true;detail.dispatchEvent(new window.Event('toggle'));
 assert.equal(doc.querySelectorAll('svg').length,1);assert.match(doc.querySelector('svg')!.getAttribute('aria-label')!,/rad\/s/);
 assert.match(detail.textContent!,/not a confidence band/);assert.match(detail.textContent!,/first and last/);
 assert.ok(doc.querySelector('a')!.href.startsWith('https://doi.org/'));
 view.dispose();assert.equal(doc.querySelector('.fuel-qualification'),null);
});
