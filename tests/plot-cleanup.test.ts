import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {DEFAULT_FUSION_BEAM,simulateFusionBeam} from '../src/fusion-reactor.js';
import {setupTargetExposure} from '../src/target-exposure-ui.js';

test('closing a target ledger releases its plot observers, and source removal releases the primary plot',t=>{
 const {window}=new JSDOM('<div id="exposure"></div>'),previous=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'document',{value:window.document,configurable:true});
 const observers:Observer[]=[];
 class Observer{
  target:Element|undefined;disconnected=false;
  constructor(){observers.push(this);}
  observe(target:Element){this.target=target;}
  disconnect(){this.disconnected=true;}
 }
 Object.defineProperty(window,'ResizeObserver',{value:Observer});
 t.after(()=>{window.close();if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');});
 const host=window.document.getElementById('exposure')!,ui=setupTargetExposure(host);
 ui.update(simulateFusionBeam({...DEFAULT_FUSION_BEAM}));
 const primary=host.querySelector('.target-exposure-body > .live-plots')!;
 const primaryObserver=observers.find(observer=>observer.target?.parentElement===primary)!;
 assert.ok(primaryObserver);assert.equal(primaryObserver.disconnected,false);
 const ledger=[...host.querySelectorAll('details')].find(detail=>detail.firstElementChild?.textContent==='Thermal energy & fuel balance')!;
 ledger.open=true;ledger.dispatchEvent(new window.Event('toggle'));
 const ledgerPlot=ledger.querySelector('.live-plots')!;
 const ledgerObservers=observers.filter(observer=>observer.target?.parentElement===ledgerPlot);
 assert.ok(ledgerObservers.length>0);assert.ok(ledgerObservers.every(observer=>!observer.disconnected));
 ledger.open=false;ledger.dispatchEvent(new window.Event('toggle'));
 assert.equal(ledgerPlot.childElementCount,0);assert.ok(ledgerObservers.every(observer=>observer.disconnected));
 assert.equal(primaryObserver.disconnected,false,'closing the ledger retains the primary result');
 ui.update(null);
 assert.equal(primary.childElementCount,0);assert.equal(primaryObserver.disconnected,true);
 assert.equal(host.querySelector('button')!.disabled,true);
});
