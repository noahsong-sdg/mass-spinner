import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {setupExperience} from '../src/experience-ui.js';
import {setupFuelCentrifuge} from '../src/fuel-centrifuge-ui.js';
import {simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {simulateFuelOperation} from '../src/fuel-operation.js';
import {sampleFuelTransport} from '../src/fuel-transport.js';
import {readScenario,scenarioLink} from '../src/scenario-state.js';

const identity={schemaVersion:1,algorithm:'sha256',sourceHash:'a'.repeat(64),sourceFiles:{'src/fuel-operation.ts':'b'.repeat(64)}};
const flush=async()=>{for(let i=0;i<40;i++)await Promise.resolve();};
async function accepted(f:any,previous:any){
 for(let i=0;i<200;i++){
  await flush();
  if(f.fuel.latest&&f.fuel.latest!==previous&&!f.node('fuel-export').disabled)return;
  await new Promise(resolve=>setTimeout(resolve,10));
 }
 assert.fail('No newly accepted centrifuge run.');
}
function fixture(t:any){
 const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'),{url:'https://example.org/?level=2'}),doc=dom.window.document;
 Object.defineProperty(dom.window,'matchMedia',{value:()=>({matches:true,addEventListener(){},removeEventListener(){}})});
 let copied='',animation:any;
 const globals={document:doc,location:dom.window.location,history:dom.window.history,navigator:{clipboard:{async writeText(value:string){copied=value;}}}};
 for(const [key,value]of Object.entries(globals)){
  const previous=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{value,configurable:true});
  t.after(()=>{if(previous)Object.defineProperty(globalThis,key,previous);else Reflect.deleteProperty(globalThis,key);});
 }
 const graphics=[{createApparatusViewer:(_frame:any,options:any)=>({load:async(asset:any)=>options.loader.loadAsync(asset.model),select(){},refresh(){},setAnimation(fn:any){animation=fn;},dispose(){}})},
  {FUEL_COMPONENTS:[{id:'supply',name:'Discharge supply',purpose:'Drive',material:'Metal',basis:'Prescribed source'}],buildFuelCentrifugeGeometry:()=>({motion:{group:{visible:true},setSpecies(){},update:()=>({secondsPerScreenSecond:.001,speeds:{ion:0,neutral:0}})}})}];
 const fuel=setupFuelCentrifuge({document:doc,loadGraphics:async()=>graphics,request:async(r:any)=>{
  const rotor=simulateFuelCentrifuge(r.config,r.operation?.events);return {result:{...rotor,transport:simulateFuelOperation(rotor,r.operation,{},r.resume)},producingCode:identity};
 }});
 const ui=setupExperience({fuelCentrifuge:fuel,selectMode(){},invalidate(){},showView(){},showResearch(){},onLevelChange:(level:string)=>fuel.setActive(level==='2')});
 t.after(()=>{ui.dispose();fuel.dispose();dom.window.close();});
 const node=(id:string)=>doc.getElementById(id) as any;
 const change=(id:string,value:number|string)=>{node(id).value=String(value);node(id).dispatchEvent(new dom.window.Event('input',{bubbles:true}));};
 return {ui,fuel,node,change,get copied(){return copied;},advance(dt:number){assert.equal(typeof animation,'function');animation(dt);}};
}

test('real power intervention survives Copy link and production restoration at common clock times',async t=>{
 const f=fixture(t);await accepted(f,null);
 let previous=f.fuel.latest;f.change('fuel-motion-time',1);f.node('fuel-power').click();await accepted(f,previous);
 const original=f.fuel.latest.result.transport;
 assert.deepEqual(original.operation.events,[{timeS:1,currentA:0}]);
 f.node('share-playground').click();await flush();
 assert.match(f.node('share-status').textContent,/Copied run link.*fresh solve.*calculator separate/);
 const shared=readScenario(new URL(f.copied).search).scenario;
 assert.equal(shared.version,3);assert.equal(shared.fuelRun.initialCurrentA,.03);
 assert.equal(shared.controls['fuel-currentA'],0);
 assert.deepEqual(shared.fuelRun.events,[{timeS:1,currentA:0}]);
 assert.equal(shared.fuelRun.mode,'transport');assert.equal(shared.fuelRun.timeS,1);
 previous=f.fuel.latest;f.node('fuel-new-run').click();await accepted(f,previous);
 assert.equal(f.fuel.latest.result.transport.operation.events.length,0);
 previous=f.fuel.latest;assert.equal(f.ui.restore(shared),true);await accepted(f,previous);
 assert.equal(f.node('fuel-motion-mode').value,'transport');assert.equal(Number(f.node('fuel-motion-time').value),1);
 const restored=f.fuel.latest.result.transport;
 assert.equal(restored.operation.initialCurrentA,.03);assert.deepEqual(restored.operation.events,original.operation.events);
 // Links rerun canonical inputs from rest; they do not serialize the original
 // continuation's retained numerical knots. Compare the same fresh-solve path.
 const expected=simulateFuelOperation(simulateFuelCentrifuge(f.fuel.latest.result.config,original.operation.events),{schemaVersion:1,events:original.operation.events});
 const worst={speedMS:0,speedAllowanceRatio:0,phaseRad:0,phaseAllowanceRatio:0,fraction:0,fractionAllowanceRatio:0,speciesL1:0};
 for(const timeS of [0,1e-5,1e-4,.01,.5,1,1.00001,1.5,2]){
  const a=sampleFuelTransport(expected,timeS),b=sampleFuelTransport(restored,timeS);
  assert.deepEqual(b,a,`restored canonical solve at ${timeS} s`);
  const retained=sampleFuelTransport(original,timeS);assert.equal(b.currentA,retained.currentA);
  // Common-clock gates from docs/reviews/live-numerical-protocol.md, scaled
  // by the smaller magnitude so neither replay direction gets extra allowance.
  // This is a replay regression, not a new convergence/experimental qualification.
  for(const key of ['ionRadS','neutralRadS']){
   const radius=f.fuel.latest.result.config.radiusM,difference=Math.abs(b[key]-retained[key])*radius,limit=.01+.01*Math.min(Math.abs(b[key]),Math.abs(retained[key]))*radius;
   worst.speedMS=Math.max(worst.speedMS,difference);worst.speedAllowanceRatio=Math.max(worst.speedAllowanceRatio,difference/limit);
   assert.ok(difference<=limit,`${key} replay speed at ${timeS}`);
  }
  for(const key of ['ionPhaseRad','neutralPhaseRad']){
   const difference=Math.abs(b[key]-retained[key]),limit=.001+.01*Math.min(Math.abs(b[key]),Math.abs(retained[key]));
   worst.phaseRad=Math.max(worst.phaseRad,difference);worst.phaseAllowanceRatio=Math.max(worst.phaseAllowanceRatio,difference/limit);
   assert.ok(difference<=limit,`${key} replay phase at ${timeS}`);
  }
  for(const key of ['innerLightPurity','lightRecovery']){
   const difference=Math.abs(b.collection[key]-retained.collection[key]),limit=1e-4+.01*Math.min(Math.abs(b.collection[key]),Math.abs(retained.collection[key]));
   worst.fraction=Math.max(worst.fraction,difference);worst.fractionAllowanceRatio=Math.max(worst.fractionAllowanceRatio,difference/limit);
   assert.ok(difference<=limit,`${key} replay fraction at ${timeS}`);
  }
  for(const key of ['lightMass','heavyMass']){
   const difference=b[key].reduce((sum:number,v:number,i:number)=>sum+Math.abs(v-retained[key][i]),0);
   worst.speciesL1=Math.max(worst.speciesL1,difference);assert.ok(difference<=.01,`${key} replay L1 at ${timeS}`);
  }
 }
 t.diagnostic(`Retained-prefix versus fresh shared run: ${JSON.stringify(worst)}`);
 assert.ok(sampleFuelTransport(restored,2).neutralRadS>0,'Restored gas must coast after power is cut.');
 assert.equal(f.ui.restore({...shared,version:2,controls:shared.controls,fuelRun:undefined}),false,'v2 must not smuggle a history payload');
 const legacy={version:2,level:'2',controls:shared.controls};
 previous=f.fuel.latest;assert.equal(f.ui.restore(legacy),true);await accepted(f,previous);
 assert.equal(f.fuel.latest.result.config.currentA,0);
 assert.deepEqual(f.fuel.latest.result.transport.operation.events,[]);
 assert.equal(f.fuel.latest.result.transport.snapshots.at(-1).neutralRadS,0);
});

test('sharing refuses pending or invalid edits; rejected restoration retains accepted history',async t=>{
 const f=fixture(t);await accepted(f,null);let previous=f.fuel.latest;
 f.change('fuel-motion-time',.4);f.node('fuel-power').click();await accepted(f,previous);
 const shared=f.ui.capture();
 previous=f.fuel.latest;assert.equal(f.ui.restore({...shared,controls:{...shared.controls,'fuel-magneticT':99}}),false);await accepted(f,previous);
 assert.deepEqual(f.fuel.latest.result.transport.operation.events,shared.fuelRun.events);
 assert.equal(f.fuel.latest.result.config.currentA,.03);
 f.change('fuel-magneticT',.6);
 f.node('share-playground').click();await flush();
 assert.equal(f.copied,'');assert.match(f.node('share-status').textContent,/accepted centrifuge run/);
 f.node('fuel-thermal-enabled').checked=true;
 const EventType=f.node('fuel-thermal-enabled').ownerDocument.defaultView.Event;
 f.node('fuel-thermal-enabled').dispatchEvent(new EventType('change',{bubbles:true}));
 f.change('fuel-thermal-coolantK','');f.node('share-playground').click();await flush();
 assert.equal(f.copied,'');assert.match(f.node('share-status').textContent,/accepted centrifuge run/);
 const link=scenarioLink('https://example.org/',shared);
 assert.equal(readScenario(new URL(link).search).invalid,false);
});

test('reference animation beyond the run shares its view without serializing a physical time',async t=>{
 const f=fixture(t);await accepted(f,null);
 for(const mode of ['equilibrium','flow']){
  f.node('fuel-motion-mode').value=mode;
  const EventType=f.node('fuel-motion-mode').ownerDocument.defaultView.Event;
  f.node('fuel-motion-mode').dispatchEvent(new EventType('change',{bubbles:true}));
  f.node('fuel-motion-play').click();f.advance(10000);
  const shared=f.ui.capture();assert.equal(shared.fuelRun.mode,mode);assert.equal(shared.fuelRun.timeS,0);
  const restored=readScenario(new URL(scenarioLink('https://example.org/',shared)).search).scenario;
  const previous=f.fuel.latest;assert.equal(f.ui.restore(restored),true);await accepted(f,previous);
  assert.equal(f.node('fuel-motion-mode').value,mode);assert.equal(f.node('fuel-motion-time').hidden,true);
 }
});
