import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {setupFuelCentrifuge} from '../src/fuel-centrifuge-ui.js';
import {simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {simulateFuelOperation} from '../src/fuel-operation.js';
import {sampleFuelTransport} from '../src/fuel-transport.js';

const identity={schemaVersion:1,algorithm:'sha256',sourceHash:'a'.repeat(64),sourceFiles:{'src/fuel-operation.ts':'b'.repeat(64)}};
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
function fixture(t:any,transportOptions={}){
 const dom=new JSDOM('<main></main>',{url:'https://example.org/?level=2'}),doc=dom.window.document,focused:string[]=[];let options:any,animation:any;
 Object.defineProperty(dom.window,'matchMedia',{value:()=>({matches:true,addEventListener(){},removeEventListener(){}})});
 const old=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:doc,configurable:true});
 const graphics=[{createApparatusViewer:(_frame:any,value:any)=>{options=value;return {load:async(asset:any)=>value.loader.loadAsync(asset.model),select(){},focus(id:string){focused.push(id);},refresh(){},resize(){},setAnimation(fn:any){animation=fn;},dispose(){}};}},
  {FUEL_COMPONENTS:['supply','liner'].map(id=>({id,name:id,purpose:id,material:'Assumed',basis:'Concept model'})),buildFuelCentrifugeGeometry:()=>({motion:{group:{visible:true},setSpecies(){},update:()=>({secondsPerScreenSecond:.001,speeds:{ion:0,neutral:0}})}})}];
 const ui=setupFuelCentrifuge({document:doc,loadGraphics:async()=>graphics,request:async(r:any)=>{const rotor=simulateFuelCentrifuge(r.config,r.operation?.events);return {result:{...rotor,transport:simulateFuelOperation(rotor,r.operation,transportOptions,r.resume)},producingCode:identity};}});
 const node=(id:string)=>doc.getElementById(id) as any;
 const change=(id:string,value:string|number,type='input')=>{node(id).value=String(value);node(id).dispatchEvent(new dom.window.Event(type,{bubbles:true}));};
 const thermal=(checked:boolean)=>{node('fuel-thermal-enabled').checked=checked;node('fuel-thermal-enabled').dispatchEvent(new dom.window.Event('change',{bubbles:true}));};
 t.after(()=>{ui.dispose();dom.window.close();if(old)Object.defineProperty(globalThis,'document',old);else Reflect.deleteProperty(globalThis,'document');});
 return {ui,doc,node,change,thermal,focused,get options(){return options;},get animation(){return animation;},async start(){ui.setActive(true);await flush();assert.ok(ui.latest);}};
}

test('disabling thermal evolution recovers an isothermal run even when its inactive draft is invalid',async t=>{
 const f=fixture(t);await f.start();assert.equal(f.node('fuel-thermal-wallCapacityJK').disabled,true);
 f.thermal(true);assert.equal(f.node('fuel-thermal-wallCapacityJK').disabled,false);assert.equal(f.node('fuel-linerConductanceWK').disabled,true);await f.ui.run();assert.ok(f.ui.latest.result.transport.snapshots.at(-1).thermal);
 f.change('fuel-thermal-wallCapacityJK','');f.thermal(false);await f.ui.run();
 assert.ok(f.ui.latest,'A disabled thermal draft must not erase the accepted apparatus.');
 assert.equal(f.ui.latest.result.transport.snapshots.at(-1).thermal,undefined);
 assert.equal(f.node('fuel-thermal-wallCapacityJK').disabled,true);assert.equal(Number(f.node('fuel-thermal-wallCapacityJK').value),10);
 assert.equal(f.node('fuel-linerConductanceWK').disabled,false);
 assert.doesNotMatch(f.ui.nodes.render.textContent,/Thermal capacities\/temperatures must be positive/);
});

test('seeking and rewinding operating history shows the accepted current in both current instruments',async t=>{
 const f=fixture(t);await f.start();f.change('fuel-motion-time',.4);f.node('fuel-power').click();await f.ui.run();
 f.change('fuel-motion-time',.2);f.options.onSelect('supply',{},'Discharge supply');
 assert.equal(Number(f.node('fuel-currentA').value),.03,'Main current control must agree with the sampled historical current.');
 assert.equal(Number(f.node('fuel-component-currentA').value),.03,'Component control must agree with its accepted current response.');
 f.change('fuel-motion-time',.6);assert.equal(Number(f.node('fuel-currentA').value),0);
 assert.equal(Number(f.node('fuel-component-currentA').value),0);
 f.node('fuel-motion-restart').click();assert.equal(Number(f.node('fuel-currentA').value),.03);
 const toggle=f.ui.nodes.inspect.querySelector('[data-power]');assert.equal(toggle.textContent,'Cut power');assert.equal(toggle.getAttribute('aria-pressed'),'true');assert.equal(toggle.disabled,false);
 f.change('fuel-motion-mode','equilibrium','change');assert.equal(toggle.disabled,true);
 f.change('fuel-motion-mode','transport','change');f.change('fuel-currentA',.07);f.change('fuel-motion-time',.2);
 assert.equal(Number(f.node('fuel-currentA').value),.07,'An accepted historical sample must not overwrite a pending draft.');assert.equal(toggle.disabled,true);
});

test('the temperature plot Show in 3D action focuses its thermal component instead of doing nothing',async t=>{
 const f=fixture(t);await f.start();f.change('fuel-plot','thermal','change');f.node('fuel-locate-plot').click();
 assert.equal(f.focused.at(-1),'liner');
 f.change('fuel-pair','dt','change');await f.ui.run();f.node('fuel-locate-plot').click();assert.equal(f.focused.at(-1),'vessel');
});

test('reference instruments use the final scheduled current after a power cut',async t=>{
 const f=fixture(t);await f.start();f.change('fuel-motion-time',.4);f.node('fuel-power').click();await f.ui.run();
 const end=f.ui.latest.result.samples.at(-1);assert.equal(end.currentA,0);assert.ok(end.neutralMS>0,'The unpowered reference still coasts.');
 f.options.onSelect('supply',{},'Supply');f.change('fuel-plot','heat','change');
 for(const mode of ['equilibrium','flow']){
  f.change('fuel-motion-mode',mode,'change');
  assert.equal(Number(f.node('fuel-currentA').value),0);assert.equal(f.node('fuel-currentA').getAttribute('aria-valuetext'),'0 A');
  assert.equal(Number(f.node('fuel-component-currentA').value),0);
  assert.equal(f.node('fuel-power').textContent,'Power on');assert.equal(f.node('fuel-power').getAttribute('aria-pressed'),'false');assert.equal(f.node('fuel-power').disabled,true);
  const toggle=f.ui.nodes.inspect.querySelector('[data-power]');assert.equal(toggle.textContent,'Power on');assert.equal(toggle.getAttribute('aria-pressed'),'false');assert.equal(toggle.disabled,true);
  assert.equal(f.ui.nodes.inspect.querySelector('[data-response]').textContent,`Gas ${end.neutralMS.toLocaleString(undefined,{maximumSignificantDigits:4})} m/s · 0 A`);
  assert.equal(f.ui.nodes.plots.querySelector('.fuel-metrics strong').textContent,'0 W');
 }
 f.change('fuel-motion-mode','transport','change');assert.equal(Number(f.node('fuel-currentA').value),.03,'Re-entering transport rewinds to its initial powered state.');
});

test('reference playback does not present its visual phase as physical time, including pinned comparisons',async t=>{
 const f=fixture(t);await f.start();f.change('fuel-motion-time',.4);
 const cursor=()=>f.ui.nodes.plots.querySelector('path[pointer-events="none"][stroke-dasharray="4 4"]');
 assert.ok(cursor().getAttribute('d'));assert.equal(f.node('fuel-motion-time').hidden,false);
 (f.doc.querySelector('[aria-label="Pin accepted experiment as comparison A"]') as HTMLButtonElement).click();await flush();
 f.change('fuel-durationS',2);await f.ui.run();
 for(const mode of ['equilibrium','flow']){
  f.change('fuel-motion-mode',mode,'change');assert.equal(f.node('fuel-motion-time').hidden,true);
  assert.equal(cursor().getAttribute('d'),'');assert.match(f.node('fuel-motion-clock').textContent,/^Final reference · ions/);assert.doesNotMatch(f.node('fuel-motion-clock').textContent,/screen =|^0 s/);
  assert.match(f.ui.nodes.render.querySelector('.fuel-comparison-label').textContent,/^A\/B final references · shared SI camera\/colors/);
  for(const topic of ['separation','momentum','inertia']){
   f.change('fuel-plot',topic,'change');const card=f.ui.nodes.plots.querySelector('.fuel-metrics div');
   assert.equal(card.querySelector('span').textContent,'Trajectory endpoint');assert.equal(card.querySelector('strong').textContent,'1 s','Endpoint follows the common plotted horizon, not the animation phase or B full duration.');
   if(f.node('fuel-motion-play').textContent==='Play')f.node('fuel-motion-play').click();f.animation(.1);
   assert.equal(card.querySelector('strong').textContent,'1 s');assert.equal(cursor().getAttribute('d'),'');
  }
 }
 f.change('fuel-motion-mode','transport','change');assert.equal(f.node('fuel-motion-time').hidden,false);assert.ok(cursor().getAttribute('d'));assert.match(f.node('fuel-motion-clock').textContent,/^0 s/);
 assert.match(f.ui.nodes.render.querySelector('.fuel-comparison-label').textContent,/^A pinned · B current · 0 s/);
});

test('thermal cards in reference mode show the trajectory endpoint without phase-zero overwrites',async t=>{
 const f=fixture(t);await f.start();f.thermal(true);await f.ui.run();f.change('fuel-motion-mode','equilibrium','change');f.change('fuel-plot','thermal','change');
 const endpoint=sampleFuelTransport(f.ui.latest.result.transport,1),cards=f.ui.nodes.plots.querySelectorAll('.fuel-metrics div'),format=(n:number)=>n.toLocaleString(undefined,{maximumSignificantDigits:4});
 assert.equal(cards[0].querySelector('span').textContent,'Endpoint pressure');assert.equal(cards[0].querySelector('strong').textContent,`${format(endpoint.thermal.pressurePa)} Pa`);
 assert.equal(cards[1].querySelector('span').textContent,'Endpoint cooling energy');assert.equal(cards[1].querySelector('strong').textContent,`${format(endpoint.thermal.coolingEnergyJ)} J`);
 const before=[...cards].map(card=>card.textContent);f.node('fuel-motion-play').click();f.animation(.1);assert.deepEqual([...cards].map(card=>card.textContent),before);
});

test('a full current history rejects the next edit without losing its accepted experiment',async t=>{
 // Coarse numerical resolution suffices for this UI event-count invariant.
 const f=fixture(t,{cells:8,steps:16});await f.start();
 for(let i=1;i<=128;i++){f.change('fuel-motion-time',i/200);f.change('fuel-currentA',i%2?.04:.02);await f.ui.run();assert.ok(f.ui.latest);}
 const accepted=f.ui.latest;assert.equal(accepted.result.transport.operation.events.length,128);
 f.change('fuel-motion-time',.8);f.options.onSelect('supply',{},'Supply');f.change('fuel-currentA',.1);
 assert.equal(f.ui.latest,accepted);assert.equal(Number(f.node('fuel-currentA').value),.02);assert.equal(Number(f.node('fuel-component-currentA').value),.02);
 assert.match(f.ui.nodes.render.querySelector('[role="status"]').textContent,/Start a new run/);
 assert.equal(f.node('fuel-export').disabled,false);
 f.node('fuel-new-run').click();await flush();assert.ok(f.ui.latest);assert.equal(f.ui.latest.result.transport.operation.events.length,0);
});

test('a current edit at another cursor branches from accepted history rather than a pending draft',async t=>{
 const f=fixture(t);await f.start();f.change('fuel-motion-time',.2);f.change('fuel-currentA',.08);
 f.change('fuel-motion-time',.6);f.change('fuel-currentA',.04);await f.ui.run();
 assert.ok(f.ui.latest,'Pending edits must not create an impossible continuation prefix.');
 assert.deepEqual(f.ui.latest.result.transport.operation.events,[{timeS:.6,currentA:.04}]);
});

test('thermal trajectory explanations scope the reference and distinguish work from heat',async t=>{
 const f=fixture(t);await f.start();f.thermal(true);await f.ui.run();
 f.change('fuel-plot','separation','change');assert.match(f.ui.nodes.plots.querySelector('.fuel-explanation').textContent,/evolving gas temperature/);assert.match(f.ui.nodes.plots.querySelector('.fuel-explanation').textContent,/reference retains its initial fixed temperature/);
 f.change('fuel-plot','heat','change');assert.match(f.ui.nodes.plots.querySelector('.fuel-explanation').textContent,/Mechanical ledger/);assert.match(f.ui.nodes.plots.querySelector('.fuel-explanation').textContent,/numerical dissipation is not heat/);
 assert.match(f.ui.nodes.info.querySelector('ul').textContent,/Uniform-inertia reference:/);assert.match(f.ui.nodes.info.querySelector('ul').textContent,/Coupled trajectory:/);
});

test('unchanged playback status does not repeatedly mutate the live region',async t=>{
 const f=fixture(t);await f.start();const status=f.ui.nodes.render.querySelector('[role="status"]');let mutations=0;
 const observer=new f.doc.defaultView.MutationObserver(records=>{mutations+=records.length;});observer.observe(status,{childList:true,characterData:true,subtree:true});t.after(()=>observer.disconnect());
 f.change('fuel-motion-time',.2);f.change('fuel-motion-time',.3);f.change('fuel-motion-time',.4);await flush();assert.equal(mutations,0);
});
