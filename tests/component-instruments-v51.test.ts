import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {setupApparatus} from '../src/apparatus-ui.js';
import {appendComponentActions} from '../src/component-actions.js';
import {fusionComponents} from '../src/component-catalog.ts';
import {createFuelComparisonTools} from '../src/fuel-comparison-ui.js';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.ts';
import {simulateFuelTransport} from '../src/fuel-transport.ts';

test('component instruments show actions first and preserve part-specific material facts behind a closed disclosure',t=>{
 const dom=new JSDOM('<main></main>'),doc=dom.window.document;
 const prior=Object.getOwnPropertyDescriptor(globalThis,'IntersectionObserver');
 Object.defineProperty(globalThis,'IntersectionObserver',{configurable:true,value:class{observe(){}disconnect(){}}});
 t.after(()=>{if(prior)Object.defineProperty(globalThis,'IntersectionObserver',prior);else Reflect.deleteProperty(globalThis,'IntersectionObserver');dom.window.close();});
 const ui=setupApparatus(doc.querySelector('main'),{components:fusionComponents});t.after(()=>ui.dispose());
 ui.show('beam-target');ui.select('target',true,{materialBasis:'Specific film material',geometryBasis:'Specific film geometry'},'LiT film');
 let changed=0;const actions={parameters:()=>changed++,results:()=>changed++};
 appendComponentActions(ui.readout,actions);appendComponentActions(ui.readout,actions);
 assert.equal(ui.readout.children[0].textContent,'LiT film');
 assert.equal(ui.readout.children[1].className,'component-actions');
 assert.equal(ui.readout.querySelectorAll('.component-actions').length,1);
 const details=ui.readout.querySelector('details');assert.equal(details.open,false);
 assert.equal(details.querySelector('summary').textContent,'Materials & model');
 assert.match(details.textContent,/Specific film material.*Specific film geometry/);
 for(const button of ui.readout.querySelectorAll('button'))button.click();assert.equal(changed,2);
 details.open=true;ui.select('substrate');
 assert.equal(ui.readout.querySelector('details').open,false);
 assert.doesNotMatch(ui.readout.textContent,/Specific film/);
 assert.match(ui.readout.querySelector('details').textContent,/publicly unspecified/);
});

function comparison(t:any){
 const dom=new JSDOM('<main></main>'),doc=dom.window.document;
 const tools=createFuelComparisonTools({document:doc,host:doc.querySelector('main'),request:()=>{throw new Error('No map request expected.');}});
 t.after(()=>{tools.dispose();dom.window.close();});
 const pin=()=>doc.querySelector('button')!.click(),delta=()=>doc.querySelector('.fuel-comparison-delta') as HTMLOutputElement;
 return {doc,tools,pin,delta};
}
function experiment(currentA:number){
 const result=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,currentA});
 return {result:{...result,transport:simulateFuelTransport(result,{cells:16,steps:32})},producingCode:null,mode:'transport',timeS:0};
}

test('A/B difference follows the shared physical time and withholds stale in-flight state',t=>{
 const f=comparison(t),a=experiment(.01),b=experiment(.03);
 f.tools.accept(a);f.pin();f.tools.accept(b);
 assert.match(f.delta().textContent!,/Δ inner light 0 pp · Δ gas 0 m\/s · 0 s/);
 const timeS=b.result.config.durationS;f.tools.accept({...b,timeS});
 const sa=a.result.transport.snapshots.at(-1)!,sb=b.result.transport.snapshots.at(-1)!;
 const value=100*(sb.collection.innerLightPurity!-sa.collection.innerLightPurity!);
 const fmt=(v:number)=>`${v>0?'+':''}${v.toLocaleString(undefined,{maximumSignificantDigits:3})}`;
 assert.match(f.delta().textContent!,new RegExp(`Δ inner light ${fmt(value).replace(/[+.*]/g,'\\$&')} pp`));
 assert.equal(f.delta().hidden,false);assert.match(f.delta().title,/Matched physical time/);
 f.tools.accept(null);assert.equal(f.delta().hidden,true);assert.equal(f.delta().textContent,'');
 assert.ok(f.tools.pinned,'pending input must not discard the accepted baseline');
 f.tools.accept({...b,timeS:0});assert.match(f.delta().textContent!,/Δ gas 0 m\/s/);
 (f.doc.querySelectorAll('button')[1] as HTMLButtonElement).click();assert.equal(f.delta().hidden,true);
});

test('comparison labels reference-only scope and rejects unlike cuts as a purity difference',t=>{
 const f=comparison(t),a=experiment(.01),b=experiment(.03);
 f.tools.accept(a);f.pin();
 f.tools.accept({...b,mode:'equilibrium'});assert.match(f.delta().textContent!,/final reference/);
 assert.match(f.delta().title,/Uniform-inertia final-equilibrium/);
 f.tools.accept({...b,result:{...b.result,config:{...b.result.config,cutFraction:.9}}});
 assert.match(f.delta().textContent!,/Inventory cuts\/species differ/);assert.doesNotMatch(f.delta().textContent!,/Δ inner light/);
 const {transport,...legacy}=b.result;f.tools.accept({...b,result:legacy});
 assert.equal(f.delta().textContent,'Transient comparison unavailable');
});
