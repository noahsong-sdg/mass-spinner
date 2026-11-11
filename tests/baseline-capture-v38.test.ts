import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {setupBaseline} from '../src/baseline-ui.js';

const curves=()=>[{label:'D–T',x:[0,1],y:[1,2],xLabel:'Time (s)',yLabel:'Neutrons (s⁻¹)'}];
const identity={model:'coupled',observable:'rate',xUnit:'s',yUnit:'s^-1',version:1};
test('unrelated invalid scenario capture preserves physical plots and an existing pinned baseline',t=>{
 const dom=new JSDOM('<div id="plots"></div>');t.after(()=>dom.window.close());const doc=dom.window.document,host=doc.querySelector('#plots')!;
 const old=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:doc,configurable:true});t.after(()=>{if(old)Object.defineProperty(globalThis,'document',old);else Reflect.deleteProperty(globalThis,'document');});
 let invalid=false;const scenario={version:2,level:'2',controls:{'fusion-beamEnergyKeV':100}},baseline=setupBaseline(host,{capture:()=>{if(invalid)throw new Error('Invalid setting: coating-duration');return scenario;},restore(){}});
 baseline.update(curves(),identity);const buttons=doc.querySelectorAll<HTMLButtonElement>('.baseline-bar button');buttons[0].click();const pinned=baseline.pinned;
 invalid=true;const physical=curves();assert.doesNotThrow(()=>assert.deepEqual(baseline.update(physical,identity),physical));
 assert.equal(baseline.pinned,pinned);assert.equal(buttons[0].disabled,true);assert.equal(buttons[1].disabled,false);assert.equal(buttons[2].disabled,false);
 assert.match(doc.querySelector('.baseline-bar')!.textContent!,/Baseline unavailable.*coating-duration/);assert.equal(host.querySelectorAll('figure').length,1);assert.ok(!host.textContent!.includes('Baseline ·'));
 buttons[0].dispatchEvent(new dom.window.Event('click'));assert.equal(baseline.pinned,pinned);
 invalid=false;assert.equal(baseline.update(curves(),identity).length,2);assert.equal(buttons[0].disabled,false);assert.match(doc.querySelector('.baseline-bar')!.textContent!,/Baseline pinned/);
 assert.throws(()=>baseline.update([{...curves()[0],x:null}],identity));
});
