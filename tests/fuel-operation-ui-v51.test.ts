import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {setupFuelCentrifuge} from '../src/fuel-centrifuge-ui.js';
import {simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {simulateFuelOperation} from '../src/fuel-operation.js';
import {sampleFuelTransport} from '../src/fuel-transport.js';

const identity={schemaVersion:1,algorithm:'sha256',sourceHash:'a'.repeat(64),sourceFiles:{'src/fuel-operation.ts':'b'.repeat(64)}};
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
function fixture(t:any,hold=false){
 const dom=new JSDOM('<main></main>',{url:'https://example.org/?level=2'}),doc=dom.window.document,requests:any[]=[],pending:any[]=[];let selected:any,animation:any,opened=0;
 Object.defineProperty(dom.window,'matchMedia',{value:()=>({matches:true,addEventListener(){},removeEventListener(){}})});
 const old=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:doc,configurable:true});
 const solve=(r:any)=>{const rotor=simulateFuelCentrifuge(r.config);return {result:{...rotor,transport:simulateFuelOperation(rotor,r.operation,{},r.resume)},producingCode:identity};};
 const graphics=[{createApparatusViewer:(_frame:any,options:any)=>{selected=options;return {load:async(asset:any)=>options.loader.loadAsync(asset.model),select(){},refresh(){},setAnimation(fn:any){animation=fn;},dispose(){}};}},
  {FUEL_COMPONENTS:[{id:'supply',name:'Discharge supply',purpose:'Inward radial current',material:'Metal and ceramic',basis:'Prescribed source'}],buildFuelCentrifugeGeometry:()=>({motion:{group:{visible:true},setSpecies(){},update:()=>({secondsPerScreenSecond:.001,speeds:{ion:0,neutral:0}})}})}];
 const ui=setupFuelCentrifuge({document:doc,loadGraphics:async()=>graphics,onResults:()=>opened++,request:(r:any)=>{requests.push(structuredClone(r));return hold?new Promise((resolve,reject)=>pending.push(()=>{try{resolve(solve(r));}catch(error){reject(error);}})):Promise.resolve(solve(r));}});
 const node=(id:string)=>doc.getElementById(id) as any;
 const change=(id:string,value:string|number,type='input')=>{node(id).value=String(value);node(id).dispatchEvent(new dom.window.Event(type,{bubbles:true}));};
 const start=async()=>{ui.setActive(true);if(hold)pending.shift()();await flush();assert.ok(ui.latest);};
 t.after(()=>{ui.dispose();dom.window.close();if(old)Object.defineProperty(globalThis,'document',old);else Reflect.deleteProperty(globalThis,'document');});
 return {ui,doc,node,change,start,requests,pending,get selected(){return selected;},get animation(){return animation;},get opened(){return opened;}};
}

test('actual power control continues accepted momenta/distributions, branches past history and extends at the end',async t=>{
 const f=fixture(t);await f.start();f.change('fuel-motion-time',.423456);
 const old=f.ui.latest.result.transport,before=sampleFuelTransport(old,.423456);
 f.node('fuel-power').click();await f.ui.run();
 const request=f.requests.at(-1);assert.equal(request.config.currentA,.03);assert.equal(request.operation.events.at(-1).currentA,0);assert.equal(request.resume.timeS,.423456);
 const branch=sampleFuelTransport(f.ui.latest.result.transport,.423456);assert.deepEqual(branch.lightMass,before.lightMass);assert.equal(branch.neutralAngularMomentumKgM2S,before.neutralAngularMomentumKgM2S);assert.equal(branch.currentA,0);
 assert.equal(f.node('fuel-power').textContent,'Power on');assert.equal(Number(f.node('fuel-motion-time').value),.423456);
 f.change('fuel-motion-time',.8);f.node('fuel-power').click();await f.ui.run();assert.equal(f.ui.latest.result.transport.operation.events.length,2);
 f.change('fuel-motion-time',.6);f.change('fuel-currentA',.02);await f.ui.run();assert.deepEqual(f.ui.latest.result.transport.operation.events,[{timeS:.423456,currentA:0},{timeS:.6,currentA:.02}]);
 f.change('fuel-motion-time',1);f.node('fuel-power').click();await f.ui.run();assert.equal(f.ui.latest.result.config.durationS,2);assert.ok(f.ui.latest.result.transport.snapshots.at(-1).neutralRadS>0,'Cutting drive must not immediately stop the gas.');
 f.node('fuel-motion-restart').click();assert.equal(Number(f.node('fuel-motion-time').value),0);assert.equal(f.ui.latest.result.transport.operation.events.length,3,'Rewind retains history.');
 f.node('fuel-new-run').click();await f.ui.run();assert.equal(f.ui.latest.result.transport.operation.events.length,0);assert.equal(f.ui.latest.result.transport.snapshots[0].neutralRadS,0);
});

test('thermal setup resets explicitly; compact selected instrument exposes response and collapsed materials',async t=>{
 const f=fixture(t);await f.start();f.change('fuel-motion-time',.4);
 f.node('fuel-thermal-enabled').checked=true;f.node('fuel-thermal-enabled').dispatchEvent(new f.doc.defaultView!.Event('change'));await f.ui.run();
 assert.equal(Number(f.node('fuel-motion-time').value),0);assert.ok(f.ui.latest.result.transport.snapshots.at(-1).thermal);f.change('fuel-plot','thermal','change');assert.match(f.ui.nodes.plots.textContent,/Temperature \(K\)/);
 f.selected.onSelect('supply',{},'Discharge supply');
 const inspect=f.ui.nodes.inspect,slider=inspect.querySelector('[data-key=currentA]'),details=inspect.querySelector('details');assert.ok(slider&&details);assert.equal(details.open,false);assert.ok(slider.compareDocumentPosition(details)&f.doc.defaultView!.Node.DOCUMENT_POSITION_FOLLOWING);assert.match(inspect.querySelector('[data-response]').textContent,/m\/s.*A/);
 [...inspect.querySelectorAll('button')].find((b:any)=>b.textContent==='Plot response')!.click();assert.equal(f.opened,1);assert.equal(f.node('fuel-plot').value,'spin');
 f.selected.onSelect('slice',{},'Gas');assert.equal(f.opened,2);assert.equal(f.node('fuel-plot').value,'profile');
 f.change('fuel-view-layer','temperature','change');f.selected.onSelect('slice',{},'Gas');assert.equal(f.node('fuel-plot').value,'thermal','A lumped temperature surface opens the scalar thermal history.');
 f.change('fuel-view-layer','enrichment','change');f.selected.onSelect('slice',{},'Gas');assert.equal(f.node('fuel-plot').value,'profile','Composition keeps its original radial-profile route.');
 f.change('fuel-magneticT',1);await f.ui.run();assert.equal(Number(f.node('fuel-motion-time').value),0);assert.equal(f.requests.at(-1).resume,undefined);
});

test('late worker replies cannot overwrite newer intervention histories',async t=>{
 const f=fixture(t,true);await f.start();f.change('fuel-motion-time',.4);f.change('fuel-currentA',.04);const a=f.ui.run();
 f.change('fuel-currentA',.05);const b=f.ui.run();f.pending[1]();await b;const accepted=f.ui.latest;
 f.pending[0]();await a;assert.equal(f.ui.latest,accepted);assert.equal(f.ui.latest.result.transport.operation.events.at(-1).currentA,.05);
});

test('invalid thermal input retains accepted state and cutaway does not advertise hidden tracers',async t=>{
 const f=fixture(t);await f.start();const accepted=f.ui.latest,count=f.requests.length;
 assert.doesNotMatch(f.doc.querySelector('.fuel-motion-legend')!.textContent!,/weighted/);
 f.node('fuel-thermal-enabled').checked=true;f.change('fuel-thermal-wallCapacityJK','');await f.ui.run();
 assert.equal(f.ui.latest,accepted);assert.equal(f.requests.length,count);assert.match(f.ui.nodes.render.textContent,/valid thermal settings/);
 f.change('fuel-thermal-wallCapacityJK',10);await f.ui.run();assert.ok(f.ui.latest.result.transport.snapshots.at(-1).thermal);
 f.change('fuel-view-representation','tracers','change');assert.match(f.doc.querySelector('.fuel-motion-legend')!.textContent!,/weighted/);
});

test('spatial mixture controls reach the solver and accepted gas profiles follow the shared cursor',async t=>{
 const f=fixture(t);await f.start();
 f.node('fuel-thermal-enabled').checked=true;f.node('fuel-thermal-enabled').dispatchEvent(new f.doc.defaultView!.Event('change'));
 f.change('fuel-currentA',.001);f.change('fuel-durationS',.05);f.change('fuel-linerK',700);f.change('fuel-thermal-model','spatial','change');f.change('fuel-thermal-gasModel','spatial','change');f.change('fuel-thermal-gasConductivityWMK',.23);await f.ui.run();
 assert.ok(f.ui.latest, f.ui.nodes.render.textContent);assert.deepEqual(f.requests.at(-1).operation.thermal.gas,{conductivityWMK:.23});assert.ok(f.ui.latest.result.transport.snapshots.at(-1).thermal.gas);
 f.change('fuel-motion-time',.025);
 for(const topic of ['thermalProfile','gasEnergy','gasPressure']){
  f.change('fuel-plot',topic,'change');assert.ok(f.ui.nodes.plots.querySelector('svg'),topic);assert.equal(f.ui.nodes.plots.querySelector('.fuel-metrics strong').textContent,'0.025 s');
  for(const path of f.ui.nodes.plots.querySelectorAll('path'))assert.doesNotMatch(path.getAttribute('d')??'',/NaN|Infinity/,topic);
 }
 f.change('fuel-plot','thermalProfile','change');assert.match(f.ui.nodes.plots.textContent,/Neutral gas/);f.node('fuel-locate-plot').click();assert.equal(f.node('fuel-view-layer').value,'temperature');
 f.change('fuel-plot','spin','change');f.selected.onSelect('slice',{},'Gas');assert.equal(f.node('fuel-plot').value,'thermalProfile','A resolved temperature surface opens its accepted radial profile.');
 const solvedCount=f.requests.length;
 for(const mode of ['equilibrium','flow']){
  f.change('fuel-motion-mode',mode,'change');f.change('fuel-plot','thermalProfile','change');assert.equal(f.ui.nodes.plots.querySelector('.fuel-metrics strong').textContent,'0.05 s');
  f.node('fuel-locate-plot').click();assert.equal(f.node('fuel-motion-mode').value,'transport');assert.equal(Number(f.node('fuel-motion-time').value),.05);assert.equal(f.node('fuel-motion-play').textContent,'Play');assert.equal(f.ui.nodes.plots.querySelector('.fuel-metrics strong').textContent,'0.05 s');
  assert.equal(f.requests.length,solvedCount,'Locating an accepted profile must not recompute physics.');
 }
 const accepted=f.ui.latest,count=f.requests.length;f.change('fuel-thermal-gasConductivityWMK','');await f.ui.run();assert.equal(f.ui.latest,accepted);assert.equal(f.requests.length,count);assert.match(f.ui.nodes.render.textContent,/valid thermal settings/);
});
