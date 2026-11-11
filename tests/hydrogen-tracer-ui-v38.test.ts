import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {setupHydrogenTracer} from '../src/hydrogen-tracer-ui.js';
import {setupPreciseControls} from '../src/precise-controls.js';
function dom(t:any){
 const window=new JSDOM('<main></main>').window,previous=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'document',{configurable:true,value:window.document});
 t.after(()=>{window.close();if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');});return window;
}
test('restricted H-1 experiment renders actual equal-scale footprint and recomputes controls without altering generic model',t=>{
 const window=dom(t),root=window.document.querySelector('main')!;let latest:any;
 const view=setupHydrogenTracer(root,{onResult:(r:any)=>{latest=r;}});assert.equal(latest,undefined);
 const result=view.run()!;assert.equal(root.querySelectorAll('figure').length,2);assert.match(root.textContent!,/First tracer transverse footprint/);
 assert.equal(latest.kind,'restricted-H1-first-capture-tracer');assert.equal(result.config.atomicIdentity,'H-1');
 const density=root.querySelector<HTMLInputElement>('#h1-neutral-density')!;density.value='0';density.dispatchEvent(new window.Event('input'));
 assert.equal(latest.primary.neutralOut,0);assert.equal(latest.primary.chargedOut,latest.primary.injected);
 density.value='100000000000000000000';density.dispatchEvent(new window.Event('input'));
 assert.ok(latest.primary.neutralOut>0);assert.match(root.textContent!,/Fast neutral after capture/);assert.ok(root.querySelectorAll('circle').length>0);
 assert.equal(root.querySelectorAll('input[id^="h1-"]').length,8);assert.equal(root.querySelector('#system'),null);
});
test('H-1 exact entry accepts off-grid physical values and blank seed clears stale plots',t=>{
 const window=dom(t),root=window.document.querySelector('main')!,view=setupHydrogenTracer(root);view.run();setupPreciseControls(root);
 const control=root.querySelector('#h1-energy')!.closest('.control')!;(control.querySelector('output') as HTMLElement).click();
 const exact=control.querySelector<HTMLInputElement>('.precise-editor input')!;exact.value='7.35';
 [...control.querySelectorAll('button')].find(button=>button.textContent==='Apply')!.click();assert.equal(view.result!.config.energyEVPerU,7.35);
 const seed=root.querySelector<HTMLInputElement>('#h1-seed')!;seed.value='';seed.dispatchEvent(new window.Event('input'));
 assert.equal(view.result,null);assert.equal(root.querySelectorAll('figure').length,0);assert.match(root.textContent!,/uint32 seed/);
 seed.value='42';seed.dispatchEvent(new window.Event('input'));assert.equal(view.result,null,'Closed invalid experiment waits for an explicit run/open');
 assert.ok(view.run());assert.equal(root.querySelectorAll('figure').length,2);
});
