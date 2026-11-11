import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {setupFuelCentrifuge} from '../src/fuel-centrifuge-ui.js';
import {simulateFuelCentrifuge} from '../src/fuel-centrifuge.ts';
import {fuelMotionState} from '../src/fuel-motion.js';
import {simulateFuelTransport} from '../src/fuel-transport.ts';

const identity={schemaVersion:1,algorithm:'sha256',sourceHash:'a'.repeat(64),sourceFiles:{'src/fuel-centrifuge.ts':'b'.repeat(64)}};
const reply=(record:any)=>{const result=simulateFuelCentrifuge(record.config);return {result:{...result,...(record.includeTransport?{transport:simulateFuelTransport(result)}:{})},producingCode:identity};};
const settle=()=>new Promise(resolve=>setTimeout(resolve,160));
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};

function fixture(t:any,options:any={}){
 const {window}=new JSDOM('<!doctype html><html><body><main></main></body></html>',{url:'https://example.org/?level=2'});
 let reduceListener:any;Object.defineProperty(window,'matchMedia',{value:()=>({matches:!!options.reducedMotion,addEventListener:(_key:any,fn:any)=>{reduceListener=fn;},removeEventListener:()=>{reduceListener=null;}})});
 const old=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:window.document,configurable:true});
 const requests:any[]=[],loaded:any[]=[],selected:any[]=[],built:any[]=[],motionCalls:any[]=[];let animation:any,viewerOptions:any,inspected=0,resets=0,disposed=0;
 const geometry={FUEL_COMPONENTS:[{id:'source',name:'Hollow cathode',purpose:'Drive discharge',material:'Tungsten jacket',basis:'Illustrative disclosed material'},
  {id:'coils',name:'Field coils',purpose:'Axial field',material:'Copper winding',basis:'Illustrative winding'},
  {id:'liner',name:'Hot lithium sub-vessel',purpose:'Control lithium surfaces',material:'Refractory tungsten liner',basis:'Illustrative lithium embodiment'},
  {id:'light-outlet',name:'Inner product outlet',purpose:'Extract inner stream',material:'Metal duct',basis:'Conditional enrichment topology'},
  {id:'heavy-outlet',name:'Outer outlet',purpose:'Extract outer stream',material:'Metal duct',basis:'Common outer outlet'},
  {id:'stages',name:'Cascade partitions',purpose:'Route interstage streams',material:'Metal dividers',basis:'Conditional cascade topology'}],
  buildFuelCentrifugeGeometry:(value:any)=>{built.push(value);return {scene:{name:'verified fixture geometry'},motion:options.motion?{update:(time:number,mode:string,scale?:number)=>{motionCalls.push({time,mode,scale,result:value.result});return {...fuelMotionState(value.result,time,mode),...(scale===undefined?{}:{secondsPerScreenSecond:scale})};}}:undefined};}};
 const graphics=[{createApparatusViewer:(_frame:any,config:any)=>{
  viewerOptions=config;return {load:async(asset:any)=>{animation=null;loaded.push(asset);await config.loader.loadAsync(asset.model);},setAnimation(fn:any){animation=fn;},refresh(){},select:(id:string)=>selected.push(id),reset:()=>resets++,dispose:()=>disposed++};
 }},geometry];
 const ui=setupFuelCentrifuge({document:window.document,
  request:(record:any,signal:any)=>{requests.push({record,signal});return options.request?options.request(record,signal):Promise.resolve(reply(record));},
  loadGraphics:options.loadGraphics??(async()=>graphics),onInspect:()=>inspected++});
 const node=(id:string)=>window.document.getElementById(id)! as any;
 const change=(id:string,value:string|number,type='input')=>{node(id).value=String(value);node(id).dispatchEvent(new window.Event(type,{bubbles:true}));};
 t.after(()=>{ui.dispose();window.close();if(old)Object.defineProperty(globalThis,'document',old);else Reflect.deleteProperty(globalThis,'document');});
 return {window,ui,node,change,requests,loaded,selected,built,motionCalls,get animation(){return animation;},reduce:()=>reduceListener?.({matches:true}),get viewerOptions(){return viewerOptions;},inspected:()=>inspected,resets:()=>resets,disposed:()=>disposed};
}

test('gas playback pauses, seeks exact physical time, respects reduced motion and never recalculates physics for display controls',async t=>{
 const f=fixture(t,{motion:true,reducedMotion:true});f.ui.setActive(true);await flush();
 assert.equal(f.animation,null);assert.equal(f.node('fuel-motion-play').textContent,'Play');assert.equal(f.ui.nodes.render.querySelector('.fuel-motion')!.hasAttribute('hidden'),false);
 f.node('fuel-motion-play').click();assert.equal(typeof f.animation,'function');f.animation(.5);
 assert.ok(f.motionCalls.at(-1).time>0);assert.equal(f.motionCalls.at(-1).mode,'transport');assert.match(f.node('fuel-motion-clock').textContent,/ms.*ions.*gas.*m\/s/);
 const before=f.motionCalls.at(-1).time;f.node('fuel-motion-play').click();assert.equal(f.animation,null);assert.equal(f.motionCalls.at(-1).time,before);
 f.change('fuel-motion-mode','spin','change');assert.equal(f.node('fuel-motion-time').hidden,false);
 f.change('fuel-motion-time',.3);assert.equal(f.motionCalls.at(-1).time,.3);assert.equal(f.motionCalls.at(-1).mode,'spin');assert.equal(f.animation,null);
 f.change('fuel-motion-mode','flow','change');assert.equal(f.node('fuel-motion-time').hidden,true);assert.equal(f.motionCalls.at(-1).mode,'flow');assert.match(f.node('fuel-motion-clock').textContent,/^Final reference · ions.*gas.*m\/s/);
 f.node('fuel-motion-restart').click();assert.equal(f.motionCalls.at(-1).time,0);
 f.node('fuel-motion-play').click();f.reduce();assert.equal(f.animation,null);assert.equal(f.requests.length,1);
});

test('pending, failed and inactive states stop gas playback and accepted results replace its source atomically',async t=>{
 const pending:any[]=[];const f=fixture(t,{motion:true,request:(record:any)=>new Promise(resolve=>pending.push({record,resolve}))});
 f.ui.setActive(true);pending[0].resolve(reply(pending[0].record));await flush();assert.equal(typeof f.animation,'function');
 const previous=f.motionCalls.at(-1).result,scale=f.motionCalls.at(-1).scale;f.change('fuel-currentA',.05);assert.equal(f.animation,null);assert.equal(f.ui.nodes.render.querySelector('.fuel-motion')!.hasAttribute('hidden'),true);
 const updating=f.ui.run();pending[1].resolve(reply(pending[1].record));await updating;
 assert.notEqual(f.motionCalls.at(-1).result,previous);assert.equal(f.motionCalls.at(-1).result.config.currentA,.05);assert.equal(f.motionCalls.at(-1).time,0);
 assert.equal(f.motionCalls.at(-1).scale,scale,'ordinary drive changes must not normalize away the visual speed response');
 f.ui.setActive(false);assert.equal(f.animation,null);
});

test('flow clock preserves pump-speed comparisons and bounds extreme packet sampling rates',async t=>{
 const f=fixture(t,{motion:true});f.ui.setActive(true);await flush();f.change('fuel-motion-mode','flow','change');
 const scale=f.motionCalls.at(-1).scale;
 f.change('fuel-pumpSpeedM3S',Math.log10(.04));await f.ui.run();assert.equal(f.motionCalls.at(-1).scale,scale);
 const doubled=fuelMotionState(f.motionCalls.at(-1).result,0,'flow').turnoverHz*scale;assert.ok(Math.abs(doubled-.5)<1e-12);
 f.change('fuel-pumpSpeedM3S',0);await f.ui.run();const last=f.motionCalls.at(-1);
 assert.ok(last.scale<scale);assert.ok(fuelMotionState(last.result,0,'flow').turnoverHz*last.scale<=.500000000001);
});

test('centrifuge stays idle until activated and physical logarithmic coordinates reach the worker',async t=>{
 const f=fixture(t);assert.equal(f.requests.length,0);assert.equal(f.node('fuel-export').disabled,true);
 f.change('fuel-pressurePa',1.5);f.change('fuel-ionFraction',-2.5);await settle();assert.equal(f.requests.length,0);
 f.ui.setActive(true);await flush();
 assert.equal(f.requests.length,1);assert.equal(f.requests[0].record.kind,'fuel-centrifuge');
 assert.ok(Math.abs(f.requests[0].record.config.pressurePa-10**1.5)<1e-12);
 assert.ok(Math.abs(f.requests[0].record.config.ionFraction-10**-2.5)<1e-16);
 assert.match(f.node('fuel-pressurePa').getAttribute('aria-valuetext'),/31\.62 Pa/);
 assert.ok(f.ui.latest);assert.equal(f.node('fuel-export').disabled,false);
 assert.equal(f.built.length,1);assert.equal(f.built[0].result,f.ui.latest.result);assert.deepEqual(f.built[0].config,f.ui.latest.result.config);
 assert.equal(f.ui.nodes.plots.querySelectorAll('svg').length,1);
});

test('changing all declared parameters dispatches their actual values without touching beam-target state',async t=>{
 const f=fixture(t);f.ui.setActive(true);await flush();
 const controls=[...f.ui.nodes.controls.querySelectorAll('input[type=range]')] as HTMLInputElement[];
 assert.equal(controls.length,24);
 for(const input of controls){
  const key=input.id.slice(5),old=f.ui.read()[key],next=key==='stages'?6:key==='feedStage'?2:Number(input.min)+(Number(input.max)-Number(input.min))*.4;
  if(input.dataset.integer==='true')f.change(input.id,Math.round(next));else f.change(input.id,next);
  await f.ui.run();
  const requested=f.requests.at(-1).record.config[key],coordinate=Number(input.value);
  assert.equal(requested,input.dataset.rangeScale==='log10'?10**coordinate:coordinate,key);
  assert.notEqual(requested,old,key);
  assert.ok(f.ui.latest,`${key}: ${f.ui.nodes.render.textContent}`);
 }
 assert.equal(f.requests.every(({record})=>record.kind==='fuel-centrifuge'),true);
 assert.equal(f.window.document.querySelector('[id^=fusion-]'),null);
});

test('plot topics render finite SVG paths and disclose conditional equilibrium and thermal semantics',async t=>{
 const f=fixture(t);f.ui.setActive(true);await flush();
 const topics=[...f.node('fuel-plot').options].map((option:any)=>option.value);
 assert.deepEqual(topics,['separation','spin','heat','thermal','thermalProfile','gasEnergy','gasPressure','momentum','inertia','profile','cut','cascade','pump','field','inventory','lithium']);
 for(const topic of topics){
  f.change('fuel-plot',topic,'change');
  assert.equal(f.ui.nodes.plots.querySelectorAll('svg').length>0,!['thermalProfile','gasEnergy','gasPressure'].includes(topic),topic);
  assert.ok(f.ui.nodes.plots.querySelector('.fuel-explanation')!.textContent!.length>30,topic);
  for(const path of f.ui.nodes.plots.querySelectorAll('path'))assert.doesNotMatch(path.getAttribute('d')??'',/NaN|Infinity/,topic);
  assert.doesNotMatch(f.ui.nodes.plots.querySelector('.fuel-metrics')!.textContent!,/NaN|Infinity/,topic);
 }
 f.change('fuel-plot','profile','change');assert.match(f.ui.nodes.plots.textContent!,/Closed-wall transport/);
 f.change('fuel-motion-mode','equilibrium','change');assert.match(f.ui.nodes.plots.textContent!,/not finite-time separation/);
 f.change('fuel-plot','heat','change');assert.match(f.ui.nodes.plots.textContent!,/not a thermal solution/);
 f.change('fuel-plot','field','change');assert.match(f.ui.nodes.plots.textContent!,/matched torque|Matched torque/);
 f.change('fuel-plot','inventory','change');assert.match(f.ui.nodes.plots.textContent!,/not a prediction of burn fraction/);
});

test('keyboard plot inspection reports the actual computed endpoint and returns to rest',async t=>{
 const f=fixture(t);f.ui.setActive(true);await flush();
 const svg=f.ui.nodes.plots.querySelector('svg')!,r=f.ui.latest.result,end=r.transport.snapshots.at(-1);
 svg.dispatchEvent(new f.window.KeyboardEvent('keydown',{key:'End',bubbles:true,cancelable:true}));
 const text=f.ui.nodes.plots.querySelector('.plot-readout')!.textContent!;
 const ion=text.match(/Ions: ([^,]+), ([^·]+)/)!,neutral=text.match(/Neutrals: ([^,]+), ([^·]+)/)!;
 assert.equal(Number(ion[1]),end.timeS);assert.equal(Number(neutral[1]),end.timeS);
 assert.ok(Math.abs(Number(ion[2])/(end.ionRadS*r.config.radiusM)-1)<.001);
 assert.ok(Math.abs(Number(neutral[2])/(end.neutralRadS*r.config.radiusM)-1)<.001);
 svg.dispatchEvent(new f.window.KeyboardEvent('keydown',{key:'Home',bubbles:true,cancelable:true}));
 assert.equal(f.ui.nodes.plots.querySelector('.plot-readout')!.textContent,'Ions: 0, 0 · Neutrals: 0, 0');
});

test('pump and molecular feed retain independent composition while disabling incompatible plot choices',async t=>{
 const f=fixture(t);f.ui.setActive(true);await flush();
 f.change('fuel-lightFraction',.37);f.change('fuel-pair','molecular','change');f.change('fuel-plot','cascade','change');
 f.change('fuel-application','pump','change');await f.ui.run();
 assert.equal(f.ui.latest.result.config.application,'pump');assert.equal(f.ui.latest.result.config.pair,'molecular');
 assert.equal(f.ui.latest.result.config.lightFraction,.37);assert.equal(f.node('fuel-plot').value,'pump');
 assert.equal(f.node('fuel-plot').querySelector('option[value=cascade]').disabled,true);
 assert.equal(f.node('fuel-plot').querySelector('option[value=lithium]').disabled,true);
 const sections=[...f.ui.nodes.controls.querySelectorAll('details')];
 assert.equal(sections.find((d:any)=>d.querySelector('summary').textContent==='Collection & stages')!.hidden,true);
 assert.equal(sections.find((d:any)=>d.querySelector('summary').textContent==='Lithium surfaces')!.hidden,true);
 assert.equal(f.built.at(-1).config.application,'pump');assert.equal(f.built.at(-1).result,f.ui.latest.result);
 f.change('fuel-application','enrichment','change');f.change('fuel-pair','lithium','change');await f.ui.run();
 assert.equal(f.node('fuel-plot').querySelector('option[value=cascade]').disabled,false);
 assert.equal(f.node('fuel-plot').querySelector('option[value=lithium]').disabled,false);
 assert.equal(f.ui.latest.result.config.lightFraction,.37);
});

test('stage count constrains feed stage before dispatch and exact component metadata is inspectable',async t=>{
 const f=fixture(t);f.ui.setActive(true);await flush();
 f.change('fuel-stages',2);await f.ui.run();
 assert.equal(f.node('fuel-feedStage').max,'2');assert.equal(f.ui.latest.result.config.feedStage,2);
 f.viewerOptions.onSelect('source',{purpose:'Hot electron injection',materialBasis:'Perforated tungsten body'},'Perforated cathode');
 assert.equal(f.inspected(),1);assert.equal(f.node('fuel-component').value,'source');
 assert.match(f.ui.nodes.inspect.textContent!,/Perforated cathode/);assert.match(f.ui.nodes.inspect.textContent!,/Perforated tungsten body/);
 assert.match(f.ui.nodes.inspect.textContent!,/Illustrative disclosed material/);
 f.change('fuel-component','coils','change');assert.equal(f.selected.at(-1),'coils');assert.match(f.ui.nodes.inspect.textContent!,/Copper winding/);
 [...f.ui.nodes.inspect.querySelectorAll('button')].find(button=>button.textContent==='Reset 3D view')!.click();assert.equal(f.resets(),1);
});

test('default inspector description does not recolor the apparatus before a user selects a component',async t=>{
 const f=fixture(t);f.ui.setActive(true);await flush();
 assert.equal(f.node('fuel-component').value,'source');assert.match(f.ui.nodes.inspect.textContent!,/Hollow cathode/);
 assert.deepEqual(f.selected,[null]);
 f.change('fuel-currentA',.04);await f.ui.run();assert.equal(f.selected.at(-1),null);
 f.change('fuel-component','coils','change');assert.equal(f.selected.at(-1),'coils');
 f.change('fuel-currentA',.05);await f.ui.run();assert.equal(f.selected.at(-1),'coils','explicit selection survives accepted geometry updates');
});

test('component menu describes only accepted topology and clears a removed lithium selection',async t=>{
 const pending:any[]=[];const f=fixture(t,{request:(record:any)=>new Promise(resolve=>pending.push({record,resolve}))});
 const ids=()=>[...f.node('fuel-component').options].map((option:any)=>option.value);
 f.ui.setActive(true);pending[0].resolve(reply(pending[0].record));await flush();
 assert.deepEqual(ids(),['source','coils','liner','light-outlet','heavy-outlet','stages']);
 f.change('fuel-component','liner','change');assert.match(f.ui.nodes.inspect.textContent!,/Refractory tungsten liner/);
 f.change('fuel-pair','dt','change');
 // Pending controls do not relabel the still-visible accepted lithium apparatus.
 assert.ok(ids().includes('liner'));assert.equal(f.node('fuel-component').value,'liner');
 assert.match(f.ui.nodes.inspect.textContent!,/Refractory tungsten liner/);
 const updating=f.ui.run();assert.equal(pending.length,2);pending[1].resolve(reply(pending[1].record));await updating;
 assert.equal(ids().includes('liner'),false);assert.equal(f.node('fuel-component').value,'source');
 assert.doesNotMatch(f.ui.nodes.inspect.textContent!,/Refractory tungsten liner/);assert.match(f.ui.nodes.inspect.textContent!,/Tungsten jacket/);
 assert.equal(f.built.at(-1).config.pair,'dt');assert.equal(f.selected.at(-1),'source');
});

test('single-stage, closed-inner-cut and pumping configurations remove their absent components',async t=>{
 const f=fixture(t),ids=()=>[...f.node('fuel-component').options].map((option:any)=>option.value);
 f.ui.setActive(true);await flush();f.change('fuel-component','stages','change');
 f.change('fuel-stages',1);await f.ui.run();
 assert.equal(ids().includes('stages'),false);assert.notEqual(f.node('fuel-component').value,'stages');
 assert.doesNotMatch(f.ui.nodes.inspect.textContent!,/Metal dividers/);assert.equal(ids().includes('light-outlet'),true);
 f.change('fuel-component','light-outlet','change');f.change('fuel-cutFraction',0);await f.ui.run();
 assert.equal(ids().includes('light-outlet'),false);assert.notEqual(f.node('fuel-component').value,'light-outlet');
 assert.equal(ids().includes('heavy-outlet'),true);
 f.change('fuel-cutFraction',.65);f.change('fuel-stages',3);await f.ui.run();
 assert.equal(ids().includes('light-outlet'),true);assert.equal(ids().includes('stages'),true);
 f.change('fuel-component','stages','change');f.change('fuel-application','pump','change');await f.ui.run();
 assert.equal(ids().includes('light-outlet'),false);assert.equal(ids().includes('stages'),false);
 assert.equal(ids().includes('heavy-outlet'),true);assert.equal(ids().includes('liner'),true);
 assert.notEqual(f.node('fuel-component').value,'stages');assert.doesNotMatch(f.ui.nodes.inspect.textContent!,/Metal dividers/);
 f.change('fuel-component','heavy-outlet','change');f.change('fuel-currentA',.04);await f.ui.run();
 assert.equal(f.node('fuel-component').value,'heavy-outlet');assert.match(f.ui.nodes.inspect.textContent!,/Common outer outlet/);
});

test('automatically selected plot and explanation remain coherent while a new application is pending',async t=>{
 const f=fixture(t);f.ui.setActive(true);await flush();const accepted=f.ui.latest;
 f.change('fuel-plot','cascade','change');assert.match(f.ui.nodes.plots.querySelector('.fuel-explanation')!.textContent!,/inner fraction moves forward/);
 f.change('fuel-application','pump','change');
 assert.equal(f.ui.latest,accepted);assert.equal(f.node('fuel-plot').value,'pump');
 assert.match(f.ui.nodes.plots.querySelector('.fuel-explanation')!.textContent!,/One outer outlet/);
 assert.match(f.ui.nodes.plots.querySelector('svg')!.getAttribute('aria-label')!,/Partial pressure/);
 assert.match(f.ui.nodes.render.textContent!,/previous accepted state/);
});

test('new settings disable stale exports and superseded responses cannot overwrite current physics or meshes',async t=>{
 const pending:any[]=[];const f=fixture(t,{request:(record:any,signal:any)=>new Promise((resolve,reject)=>pending.push({record,signal,resolve,reject}))});
 f.ui.setActive(true);assert.equal(pending.length,1);pending[0].resolve(reply(pending[0].record));await flush();
 const first=f.ui.latest;assert.ok(first);assert.equal(f.loaded.length,1);
 f.change('fuel-currentA',.02);assert.equal(f.node('fuel-export').disabled,true);assert.equal(f.ui.latest,first);
 assert.match(f.ui.nodes.render.textContent!,/previous accepted state/);await settle();assert.equal(pending.length,2);
 f.change('fuel-currentA',.04);assert.equal(pending[1].signal.aborted,true);await settle();assert.equal(pending.length,3);
 pending[2].resolve(reply(pending[2].record));await flush();const newest=f.ui.latest;
 assert.equal(newest.result.config.currentA,.04);assert.equal(f.built.at(-1).config.currentA,.04);assert.equal(f.loaded.length,2);
 pending[1].resolve(reply(pending[1].record));await flush();
 assert.equal(f.ui.latest,newest);assert.equal(f.loaded.length,2);assert.equal(f.node('fuel-export').disabled,false);
});

test('numerical failure clears accepted outputs and a later edit retries explicitly',async t=>{
 let fail=false;const f=fixture(t,{motion:true,request:(record:any)=>fail?Promise.reject(new Error('Numerical domain exceeded')):Promise.resolve(reply(record))});
 f.ui.setActive(true);await flush();assert.ok(f.ui.latest);
 fail=true;f.change('fuel-currentA',.02);await f.ui.run();
 assert.equal(f.ui.latest,null);assert.equal(f.node('fuel-export').disabled,true);
 assert.equal(f.animation,null);assert.equal(f.ui.nodes.render.querySelector('.fuel-motion')!.hasAttribute('hidden'),true);
 assert.equal(f.ui.nodes.plots.querySelectorAll('svg').length,0);assert.equal(f.ui.nodes.plots.querySelector('.fuel-metrics')!.children.length,0);
 assert.match(f.ui.nodes.render.textContent!,/Numerical domain exceeded/);assert.equal(f.ui.nodes.render.querySelector('.apparatus-frame')!.hidden,true);
 fail=false;f.change('fuel-currentA',.01);await f.ui.run();
 assert.ok(f.ui.latest);assert.equal(f.node('fuel-export').disabled,false);assert.equal(f.ui.nodes.render.querySelector('.apparatus-frame')!.hidden,false);
 assert.equal(typeof f.animation,'function');
});

test('graphics failure preserves valid worker results and plots while exposing the failure',async t=>{
 const f=fixture(t,{loadGraphics:async()=>{throw new Error('GPU context unavailable');}});
 f.ui.setActive(true);await flush();
 assert.ok(f.ui.latest);assert.equal(f.node('fuel-export').disabled,false);assert.ok(f.ui.nodes.plots.querySelectorAll('svg').length>0);
 assert.match(f.ui.nodes.render.textContent!,/3D unavailable.*GPU context unavailable/);
});

test('export retains the accepted result and producing worker identity, rather than current pending inputs',async t=>{
 const f=fixture(t);f.ui.setActive(true);await flush();
 let blob:Blob|undefined;const create=URL.createObjectURL,revoke=URL.revokeObjectURL,anchorClick=f.window.HTMLAnchorElement.prototype.click;
 URL.createObjectURL=(value:Blob)=>{blob=value;return 'blob:centrifuge-test';};URL.revokeObjectURL=()=>{};f.window.HTMLAnchorElement.prototype.click=function(){};
 t.after(()=>{URL.createObjectURL=create;URL.revokeObjectURL=revoke;f.window.HTMLAnchorElement.prototype.click=anchorClick;});
 f.node('fuel-export').click();assert.ok(blob);const payload=JSON.parse(await blob.text());
 assert.equal(payload.model,'marathon-centrifuge');assert.deepEqual(payload.result,f.ui.latest.result);assert.deepEqual(payload.producingCode,identity);
 f.change('fuel-currentA',.02);blob=undefined;f.node('fuel-export').dispatchEvent(new f.window.Event('click'));assert.equal(blob,undefined);
});

test('an export failure pauses active viewer frames so the error remains visible',async t=>{
 const f=fixture(t,{motion:true,request:(record:any)=>{
  const accepted:any=reply(record);accepted.result.transport.timeControl={method:'BE step doubling',relativeTolerance:6.25e-7,temperatureToleranceK:1e-7,startTimeS:0,acceptedPairs:1,rejectedSteps:0,maxErrorRatio:0};
  return Promise.resolve(accepted);
 }});
 f.ui.setActive(true);await flush();assert.equal(typeof f.animation,'function');f.animation(.01);
 assert.match(f.ui.nodes.render.textContent,/Closed vessel/);
 const compression=globalThis.CompressionStream;
 globalThis.CompressionStream=class{constructor(){throw new Error('codec failed during playback');}} as any;t.after(()=>{globalThis.CompressionStream=compression;});
 f.node('fuel-export').click();await flush();
 // This executes the real registered animation callback before the fix. Once
 // paused, the viewer has no frame callback that can overwrite the error.
 f.animation?.(.01);
 assert.match(f.ui.nodes.render.textContent,/Export failed: codec failed during playback/);
 assert.equal(f.animation,null);assert.equal(f.node('fuel-motion-play').textContent,'Play');assert.equal(f.requests.length,1);
});

test('disposing the playground prevents pending completion and further requests or graphics work',async t=>{
 let resolve:any;const f=fixture(t,{request:()=>new Promise(r=>resolve=r)});f.ui.setActive(true);
 const record=f.requests[0].record;f.ui.dispose();assert.equal(f.requests[0].signal.aborted,true);
 resolve(reply(record));await flush();assert.equal(f.ui.latest,null);assert.equal(f.loaded.length,0);
 f.ui.setActive(true);f.change('fuel-currentA',.02);await settle();assert.equal(f.requests.length,1);
});
