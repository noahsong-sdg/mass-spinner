import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {setupFuelCentrifuge} from '../src/fuel-centrifuge-ui.js';
import {simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {simulateFuelOperation} from '../src/fuel-operation.js';

const flush=async()=>{for(let i=0;i<40;i++)await Promise.resolve();};

function fixture(t:any){
 const dom=new JSDOM('<main></main>',{url:'https://example.org/?level=2'}),doc=dom.window.document;
 Object.defineProperty(dom.window,'matchMedia',{value:()=>({matches:true,addEventListener(){},removeEventListener(){}})});
 const old=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:doc,configurable:true});
 const graphics=[{createApparatusViewer:(_frame:any,options:any)=>({load:async(asset:any)=>options.loader.loadAsync(asset.model),select(){},refresh(){},resize(){},setAnimation(){},dispose(){}})},
  {FUEL_COMPONENTS:[{id:'supply',name:'Supply',purpose:'Drive',material:'Concept',basis:'Prescribed'}],buildFuelCentrifugeGeometry:()=>({motion:{group:{visible:true},setSpecies(){},update:()=>({secondsPerScreenSecond:.001,speeds:{ion:0,neutral:0}})}})}];
 const ui=setupFuelCentrifuge({document:doc,loadGraphics:async()=>graphics,request:async(r:any)=>{
  const rotor=simulateFuelCentrifuge(r.config);return {result:{...rotor,transport:simulateFuelOperation(rotor,r.operation,{},r.resume)},producingCode:null};
 }});
 t.after(()=>{ui.dispose();dom.window.close();if(old)Object.defineProperty(globalThis,'document',old);else Reflect.deleteProperty(globalThis,'document');});
 const change=(id:string,value:number|string)=>{const node=doc.getElementById(id) as HTMLInputElement;node.value=String(value);node.dispatchEvent(new dom.window.Event('input',{bubbles:true}));};
 return {ui,doc,change};
}

test('pinned and current time curves both reach their shared physical horizon',async t=>{
 const {ui,doc,change}=fixture(t);
 ui.setActive(true);await flush();assert.ok(ui.latest);
 change('fuel-motion-time',1);
 (doc.querySelector('[aria-label="Pin accepted experiment as comparison A"]') as HTMLButtonElement).click();await flush();
 change('fuel-durationS',2);await ui.run();await flush();
 assert.equal(ui.latest.result.config.durationS,2);
 change('fuel-motion-time',1);
 const readout=ui.nodes.plots.querySelector('.live-plots figure p')!.textContent;
 assert.match(readout,/A · Ions: 1,/);
 assert.match(readout,/B · Ions: 1,/,'The current curve must reach the same 1-second endpoint as the pinned run and timeline.');
});

test('an invalid inactive thermal field cannot destroy the accepted bath result',async t=>{
 const {ui,doc,change}=fixture(t);ui.setActive(true);await flush();const accepted=ui.latest;assert.ok(accepted);
 assert.equal((doc.getElementById('fuel-thermal-enabled') as HTMLInputElement).checked,false);
 change('fuel-thermal-wallCapacityJK','');
 change('fuel-currentA',.04);await ui.run();
 assert.ok(ui.latest,'A disabled thermal model must not send an invalid latent thermal setup and clear the accepted bath result.');
 if(ui.latest===accepted)assert.match(ui.nodes.render.textContent,/valid thermal settings/,'Invalid supplied settings should retain the old result with an actionable status.');
 else assert.equal(ui.latest.result.config.currentA,.04,'Ignoring disabled thermal values should still apply the valid bath change.');
});
