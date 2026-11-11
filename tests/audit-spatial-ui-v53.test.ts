import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {setupFuelCentrifuge} from '../src/fuel-centrifuge-ui.js';
import {simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {simulateFuelOperation} from '../src/fuel-operation.js';
import {sampleFuelTransport} from '../src/fuel-transport.js';

const identity={schemaVersion:1,algorithm:'sha256',sourceHash:'a'.repeat(64),sourceFiles:{'src/fuel-operation.ts':'b'.repeat(64)}};
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
function fixture(t:any){
 const dom=new JSDOM('<main></main>',{url:'https://example.org/?level=2'}),doc=dom.window.document,requests:any[]=[],focused:string[]=[];let viewerOptions:any;
 Object.defineProperty(dom.window,'matchMedia',{value:()=>({matches:true,addEventListener(){},removeEventListener(){}})});
 const old=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:doc,configurable:true});
 const graphics=[{createApparatusViewer:(_frame:any,value:any)=>{viewerOptions=value;return {load:async(asset:any)=>value.loader.loadAsync(asset.model),select(){},focus(id:string){focused.push(id);},refresh(){},resize(){},setAnimation(){},dispose(){}};}},
  {FUEL_COMPONENTS:[{id:'liner',name:'Liner',purpose:'Solid boundary',material:'Illustrative tungsten',basis:'Concept model'}],buildFuelCentrifugeGeometry:()=>({motion:{group:{visible:true},setSpecies(){},update:()=>({secondsPerScreenSecond:.001,speeds:{ion:0,neutral:0}})}})}];
 const ui=setupFuelCentrifuge({document:doc,loadGraphics:async()=>graphics,request:async(r:any)=>{requests.push(r);const rotor=simulateFuelCentrifuge(r.config,r.operation?.events);return {result:{...rotor,transport:simulateFuelOperation(rotor,r.operation,{cells:8,steps:32},r.resume)},producingCode:identity};}});
 const node=(id:string)=>doc.getElementById(id) as any;
 const change=(id:string,value:string|number,type='input')=>{node(id).value=String(value);node(id).dispatchEvent(new dom.window.Event(type,{bubbles:true}));};
 const thermal=(enabled:boolean)=>{node('fuel-thermal-enabled').checked=enabled;node('fuel-thermal-enabled').dispatchEvent(new dom.window.Event('change',{bubbles:true}));};
 t.after(()=>{ui.dispose();dom.window.close();if(old)Object.defineProperty(globalThis,'document',old);else Reflect.deleteProperty(globalThis,'document');});
 return {ui,doc,node,change,thermal,requests,focused,get viewerOptions(){return viewerOptions;},async start(){ui.setActive(true);await flush();assert.ok(ui.latest);},async spatial(){thermal(true);change('fuel-thermal-model','spatial','change');await ui.run();assert.ok(ui.latest);}};
}

test('spatial liner UI serializes geometry and disables the prescribed lumped heat capacity',async t=>{
 const f=fixture(t);await f.start();assert.equal(f.requests.at(-1).operation.thermal.spatial,undefined);
 assert.equal(f.node('fuel-thermal-model').disabled,true);assert.equal(f.node('fuel-thermal-thicknessMm').disabled,true);
 f.thermal(true);f.change('fuel-thermal-wallCapacityJK','');f.change('fuel-thermal-model','spatial','change');f.change('fuel-thermal-thicknessMm',1.5);await f.ui.run();
 assert.ok(f.ui.latest,'An inactive lumped-capacity draft cannot invalidate a material-derived capacity.');
 const thermal=f.requests.at(-1).operation.thermal;
 assert.deepEqual(thermal.spatial,{material:'tungsten',thicknessM:.0015,cells:16});assert.equal(thermal.wallCapacityJK,10);
 assert.equal(f.node('fuel-thermal-wallCapacityJK').disabled,true);assert.equal(f.node('fuel-thermal-thicknessMm').disabled,false);
 assert.ok(f.ui.latest.result.transport.snapshots.at(-1).thermal.spatial);
});

test('an inactive spatial draft does not affect a lumped or disabled thermal run',async t=>{
 const f=fixture(t);await f.start();await f.spatial();f.change('fuel-thermal-thicknessMm','');
 const accepted=f.ui.latest,count=f.requests.length;await f.ui.run();assert.equal(f.requests.length,count);assert.equal(f.ui.latest,accepted);assert.match(f.ui.nodes.render.textContent,/Enter valid thermal settings/);
 f.change('fuel-thermal-model','lumped','change');await f.ui.run();assert.ok(f.ui.latest);assert.equal(f.requests.at(-1).operation.thermal.spatial,undefined);assert.equal(f.node('fuel-thermal-thicknessMm').disabled,true);
 assert.equal(f.ui.latest.result.transport.snapshots.at(-1).thermal.spatial,undefined);
 f.thermal(false);await f.ui.run();assert.ok(f.ui.latest);assert.equal(f.requests.at(-1).operation.thermal.enabled,false);assert.equal(f.requests.at(-1).operation.thermal.spatial,undefined);
});

test('thermal validation and serialization follow model selection even before disabled attributes refresh',async t=>{
 const f=fixture(t);await f.start();const accepted=f.ui.latest,count=f.requests.length;
 f.node('fuel-thermal-enabled').checked=true;
 f.node('fuel-thermal-coolingWK').value=-1;await f.ui.run();
 assert.equal(f.ui.latest,accepted);assert.equal(f.requests.length,count,'A stale disabled attribute cannot hide an active out-of-domain input.');
 f.node('fuel-thermal-coolingWK').value=.5;f.node('fuel-thermal-wallCapacityJK').value=23;await f.ui.run();
 assert.equal(f.requests.at(-1).operation.thermal.wallCapacityJK,23);assert.equal(f.requests.at(-1).operation.thermal.coolingWK,.5);
});

test('spatial temperature plots and liner instruments use the accepted physical cursor',async t=>{
 const f=fixture(t);await f.start();await f.spatial();f.change('fuel-motion-time',.5);
 f.change('fuel-plot','thermal','change');const text=f.ui.nodes.plots.textContent;
 assert.match(text,/Inner liner cell/);assert.match(text,/Outer liner cell/);assert.match(text,/Lumped neutral gas/);
 f.change('fuel-plot','thermalProfile','change');const sample=sampleFuelTransport(f.ui.latest.result.transport,.5),spatial=sample.thermal!.spatial!,format=(n:number)=>n.toLocaleString(undefined,{maximumSignificantDigits:4});
 const values=[...f.ui.nodes.plots.querySelectorAll('.fuel-metrics strong')].map(n=>n.textContent);
 assert.deepEqual(values,['0.5 s',`${format(spatial.innerK)} K`,`${format(spatial.outerK)} K`,`${format(sample.thermal!.gasK)} K`]);
 assert.match(f.ui.nodes.plots.querySelector('svg')!.getAttribute('aria-label')!,/Temperature \(K\) against Radius \(m\)/);
 f.node('fuel-locate-plot').click();assert.equal(f.focused.at(-1),'liner');
 f.viewerOptions.onSelect('liner',{},'Liner');assert.match(f.ui.nodes.inspect.querySelector('[data-response]').textContent,/tungsten .*–.* K/);
 f.change('fuel-motion-mode','equilibrium','change');f.change('fuel-plot','thermalProfile','change');assert.equal(f.ui.nodes.plots.querySelector('.fuel-metrics span').textContent,'Trajectory endpoint');assert.equal(f.ui.nodes.plots.querySelector('.fuel-metrics strong').textContent,'1 s');
});

test('a legacy lumped pin remains usable beside a spatial liner profile',async t=>{
 const f=fixture(t);await f.start();f.thermal(true);await f.ui.run();
 (f.doc.querySelector('[aria-label="Pin accepted experiment as comparison A"]') as HTMLButtonElement).click();await flush();
 await f.spatial();f.change('fuel-plot','thermalProfile','change');
 assert.ok(f.ui.latest);assert.match(f.ui.nodes.plots.textContent,/B · Tungsten liner/);assert.doesNotMatch(f.ui.nodes.render.textContent,/3D unavailable/);
 f.change('fuel-pair','molecular','change');assert.equal(f.node('fuel-thermal-enabled').checked,false);assert.equal(f.node('fuel-thermal-model').disabled,true);
});
