import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {setupDecayNetwork} from '../src/decay-network-ui.js';
import {setupNeutronTransport} from '../src/neutron-transport-ui.js';
test('irradiation controls update live inventory, handle beam off and clear invalid results',t=>{
 const dom=new JSDOM('<main></main>'),previous=globalThis.document;Object.assign(globalThis,{document:dom.window.document});
 t.after(()=>{Object.assign(globalThis,{document:previous});dom.window.close();});
 const host=dom.window.document.querySelector('main')!,ui=setupDecayNetwork(host),initial=ui.read()!;
 assert.ok(host.querySelectorAll('svg').length>=1);assert.ok(initial.rows.at(-1).populations[2]>0);
 const beam=host.querySelector<HTMLInputElement>('#decay-beam')!;beam.value='0';beam.dispatchEvent(new dom.window.Event('input'));
 assert.equal(ui.read()!.rows.at(-1).populations.reduce((s:number,x:number)=>s+x,0),0);assert.doesNotMatch(host.innerHTML,/NaN|Infinity/);
 const parent=host.querySelector<HTMLInputElement>('#decay-parent')!;parent.type='number';parent.value='0';parent.dispatchEvent(new dom.window.Event('input'));
 assert.equal(ui.read(),null);assert.equal(host.querySelectorAll('svg').length,0);
});
test('pending neutron source retains completed snapshot and disables stale export',t=>{
 const dom=new JSDOM('<main></main>'),previous=globalThis.document;Object.assign(globalThis,{document:dom.window.document});
 t.after(()=>{Object.assign(globalThis,{document:previous});dom.window.close();});
 const host=dom.window.document.querySelector('main')!,ui=setupNeutronTransport(host);ui.update({sourceRateS:2e10,sourceEnergyMeV:14.1});const accepted=ui.read();
 ui.setPending(true);assert.equal(ui.read(),accepted);assert.ok(host.querySelector<HTMLButtonElement>('button')!.disabled);assert.match(host.textContent!,/last completed source snapshot/);
 ui.setPending(false);assert.equal(host.querySelector<HTMLButtonElement>('button')!.disabled,false);ui.update(null);assert.equal(ui.read(),null);assert.ok(host.querySelector<HTMLButtonElement>('button')!.disabled);
});
test('neutron and irradiation plot refresh disconnect observers before clearing',t=>{
 const dom=new JSDOM('<main></main>'),previous=globalThis.document,previousObserver=globalThis.ResizeObserver,active=new Set();
 class Observer {observe(){active.add(this);}disconnect(){active.delete(this);}}
 Object.assign(globalThis,{document:dom.window.document,ResizeObserver:Observer});
 t.after(()=>{Object.assign(globalThis,{document:previous,ResizeObserver:previousObserver});dom.window.close();});
 const host=dom.window.document.querySelector('main')!,ui=setupNeutronTransport(host);
 const baseline=active.size;assert.ok(baseline>=1);ui.update({sourceRateS:1e10,sourceEnergyMeV:14.1});assert.equal(active.size,baseline+1);
 ui.update(null);assert.equal(active.size,baseline);ui.update({sourceRateS:1e10,sourceEnergyMeV:14.1});assert.equal(active.size,baseline+1);
 const input=host.querySelector<HTMLInputElement>('#neutron-transport-absorption')!;input.value='1';input.dispatchEvent(new dom.window.Event('input'));assert.equal(ui.read(),null);assert.equal(active.size,baseline);
 const beam=host.querySelector<HTMLInputElement>('#decay-beam')!;beam.value='0';beam.dispatchEvent(new dom.window.Event('input'));assert.equal(active.size,baseline);
 const parent=host.querySelector<HTMLInputElement>('#decay-parent')!;parent.type='number';parent.value='0';parent.dispatchEvent(new dom.window.Event('input'));assert.equal(active.size,baseline-1);
});
