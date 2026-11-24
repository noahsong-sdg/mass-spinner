import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import * as THREE from 'three';
import {setupFuelCentrifuge} from '../src/fuel-centrifuge-ui.js';
import * as geometry from '../src/fuel-centrifuge-geometry.js';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.ts';
import {simulateFuelTransport,sampleFuelTransport,fuelTransportCDF} from '../src/fuel-transport.ts';
import {comparisonDomain,computeFuelOperatingMap} from '../src/fuel-experiments.ts';
import {sampleFuelField} from '../src/fuel-field.js';
import {publicInputCoverage} from '../src/public-sensitivity.ts';
import {setupPlaygroundGuide} from '../src/playground-guide.js';
import {fuelMotionState} from '../src/fuel-motion.js';
import {setupPreciseControls} from '../src/precise-controls.js';

const identity={schemaVersion:1,algorithm:'sha256',sourceHash:'a'.repeat(64),sourceFiles:{'src/fuel-centrifuge.ts':'b'.repeat(64)}};
const clone=<T>(value:T):T=>structuredClone(value);
const close=(a:number,b:number,tolerance=1e-9)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(1,Math.abs(b)),`${a} ≠ ${b}`);
const flush=async()=>{for(let i=0;i<40;i++)await Promise.resolve();};

/** Only browser display I/O is fake. Geometry, tracers, diagnostic adapters and worker calculations are real. */
function fixture(t:any,nativeRangePrecision=false,reducedMotion=true){
 const dom=new JSDOM('<!doctype html><main></main>',{url:'https://example.org/?level=2'}),{window}=dom;
 if(nativeRangePrecision){
  const descriptor=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value')!;
  Object.defineProperty(window.HTMLInputElement.prototype,'value',{...descriptor,set(value){
   descriptor.set!.call(this,this.type==='range'&&Number.isFinite(Number(value))?Number(value).toPrecision(15):value);
  }});
 }
 Object.defineProperty(window,'matchMedia',{value:()=>({matches:reducedMotion,addEventListener(){},removeEventListener(){}})});
 const old=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:window.document,configurable:true});
 const requests:any[]=[],viewers:any[]=[],builds:any[]=[];let failNext=false;
 function release(scene:THREE.Group|undefined){
  if(!scene)return;const resources=new Set<any>();scene.traverse((object:any)=>{if(object.geometry)resources.add(object.geometry);for(const material of object.material?Array.isArray(object.material)?object.material:[object.material]:[]){resources.add(material);for(const value of Object.values(material) as any[])if(value?.isTexture)resources.add(value);}});for(const resource of resources)resource.dispose();
 }
 const graphics=[{createApparatusViewer:(frame:any,options:any)=>{
  const record:any={frame,options,asset:null,built:null,pose:{position:[0,0,0],target:[0,0,0],up:[0,1,0]},cameraSets:[],loads:[],animation:null,disposed:false,selection:null};
  record.api={async load(asset:any){
   record.animation=null;release(record.built?.scene);record.asset=asset;record.loads.push(asset);
   record.built=await options.loader.loadAsync(asset.model);
   // Model the viewer's post-load fit rather than pretending its uninitialized origin is a usable pose.
   const c=asset.model.config;record.pose={position:[c.lengthM*1.5,c.radiusM*6,c.lengthM],target:[0,0,0],up:[0,1,0]};
  },cameraPose:()=>clone(record.pose),setCamera:(pose:any)=>{if(pose){record.cameraSets.push(clone(pose));record.pose=clone(pose);}},
   setAnimation:(fn:any)=>{record.animation=fn;},refresh(){},resize(){},select:(id:any)=>{record.selection=id;},reset(){},
   dispose(){if(record.disposed)return;record.disposed=true;release(record.built?.scene);}};
  record.userCamera=(pose:any)=>{record.pose=clone(pose);options.onCamera?.(clone(pose));};viewers.push(record);return record.api;
 }},{...geometry,buildFuelCentrifugeGeometry:(value:any)=>{const built=geometry.buildFuelCentrifugeGeometry(value);builds.push({value,...built});return built;}}];
 const request=async(record:any,signal:any)=>{
  requests.push({record:clone(record),signal});
  if(failNext){failNext=false;throw new Error('Explicit worker failure');}
  if(record.kind==='fuel-operating-map')return {result:computeFuelOperatingMap(record.config,record.options),producingCode:identity};
  assert.equal(record.kind,'fuel-centrifuge');const result=simulateFuelCentrifuge(record.config);
  return {result:{...result,...(record.includeTransport?{transport:simulateFuelTransport(result,{cells:64,steps:128})}:{})},producingCode:identity};
 };
 const ui=setupFuelCentrifuge({document:window.document,request,loadGraphics:async()=>graphics});
 const node=(id:string)=>{const n=window.document.getElementById(id);assert.ok(n,id);return n as any;};
 const change=(id:string,value:string|number,type='input')=>{node(id).value=String(value);node(id).dispatchEvent(new window.Event(type,{bubbles:true}));};
 const check=(id:string,value:boolean)=>{node(id).checked=value;node(id).dispatchEvent(new window.Event('change',{bubbles:true}));};
 const start=async()=>{ui.setActive(true);await flush();assert.ok(ui.latest,ui.nodes.render.textContent);assert.equal(viewers.length,1);assert.ok(viewers[0].built.tools);};
 t.after(()=>{ui.dispose();window.close();if(old)Object.defineProperty(globalThis,'document',old);else Reflect.deleteProperty(globalThis,'document');});
 return {ui,window,requests,viewers,builds,node,change,check,start,failOnce(){failNext=true;}};
}

test('native range serialization preserves exact log defaults without masking genuine slider changes',async t=>{
 const f=fixture(t,true);await f.start();
 const coverage=()=>publicInputCoverage({config:f.ui.read(),transport:{cells:64,steps:512,operation:f.requests[0].record.operation}} as any);
 assert.deepEqual(f.ui.read(),DEFAULT_FUEL_CENTRIFUGE);assert.equal(coverage().historicalInputMatch,true);
 for(const key of ['radialDiffusivityM2S','conductanceM3S','dragHz'] as const){
  const initial=f.node(`fuel-${key}`).value;
  assert.equal(f.ui.read()[key],DEFAULT_FUEL_CENTRIFUGE[key]);assert.equal(f.requests[0].record.config[key],DEFAULT_FUEL_CENTRIFUGE[key]);
  assert.notEqual(10**Number(initial),DEFAULT_FUEL_CENTRIFUGE[key],'fixture must actually round the logarithmic coordinate');
  f.change(`fuel-${key}`,Number(initial)+.1);assert.equal(f.ui.read()[key],10**Number(f.node(`fuel-${key}`).value));
  assert.equal(coverage().historicalInputMatch,false);
  f.change(`fuel-${key}`,initial);assert.equal(f.ui.read()[key],DEFAULT_FUEL_CENTRIFUGE[key]);assert.equal(coverage().historicalInputMatch,true);
 }
});

test('mode selection reveals its diagnostic geometry without rerunning physics or replacing the user camera',async t=>{
 const f=fixture(t);await f.start();const result=f.ui.latest.result,requests=f.requests.length,v=f.viewers[0],pose=clone(v.pose);
 for(const [mode,representation,reading]of [['equilibrium','both','Ideal equilibrium'],['spin','tracers','Blue arrows show ions'],['flow','tracers','Dashed routes'],['transport','both','slower display clock']] as const){
  f.change('fuel-motion-mode',mode,'change');
  assert.equal(f.node('fuel-view-representation').value,representation);assert.equal(v.built.motion.group.visible,true);
  assert.equal(v.built.tools.group.getObjectByName('Axially uniform gas field').visible,representation==='both');
  assert.match(f.node('fuel-mode-reading').textContent,new RegExp(reading));
  assert.equal(f.node('fuel-mode-reading').hidden,false);
  f.change('fuel-view-representation','field','change');assert.equal(f.node('fuel-mode-reading').hidden,true);
  f.change('fuel-view-representation',representation,'change');assert.equal(f.node('fuel-mode-reading').hidden,false);
  assert.equal(f.requests.length,requests);assert.equal(f.ui.latest.result,result);assert.deepEqual(v.pose,pose);
 }
});

test('guided equilibrium calculator changes no worker input, accepted timeline or 3D geometry, including pending work',async t=>{
 const f=fixture(t);await f.start();const host=f.window.document.createElement('div');f.window.document.body.append(host);
 const opened:string[]=[],guide=setupPlaygroundGuide({document:f.window.document,host,open:key=>opened.push(key),close(){},focusRelated(){}});
 const inputs=JSON.stringify(f.ui.read()),requests=f.requests.length,time=f.node('fuel-motion-time').value,built=f.viewers[0].built;
 guide.launch('equilibrium');const panel=f.node('fuel-equilibrium-calculator');panel.dispatchEvent(new f.window.Event('toggle'));
 assert.equal(panel.open,true);assert.equal(opened.at(-1),'plots');assert.equal(panel.querySelectorAll('svg').length,2);
 f.change('equilibrium-edgeSpeedMS',1500);f.change('equilibrium-temperatureK',600);f.change('equilibrium-cutFraction',.3);
 assert.equal(JSON.stringify(f.ui.read()),inputs);assert.equal(f.requests.length,requests);assert.equal(f.node('fuel-motion-time').value,time);assert.equal(f.viewers[0].built,built);
 f.change('fuel-currentA',.04);assert.equal(f.node('fuel-export').disabled,true);
 panel.open=false;guide.launch('equilibrium');assert.equal(panel.open,true,'independent inputs work without an accepted fresh worker result');
 assert.equal(f.node('equilibrium-edgeSpeedMS').value,'1500');assert.equal(f.requests.length,requests);assert.equal(f.viewers[0].built,built);
});

test('a stronger drive keeps resolved rotation within the shared angular sampling budget',async t=>{
 const f=fixture(t);await f.start();f.change('fuel-motion-mode','spin','change');
 const oldScale=fuelMotionState(f.ui.latest.result,0,'spin').secondsPerScreenSecond;
 f.change('fuel-currentA',.12);await f.ui.run();await flush();
 const rotationClock=fuelMotionState(f.ui.latest.result,0,'spin').secondsPerScreenSecond;
 assert.ok(rotationClock<oldScale/2,'the prior display clock would exceed the angular sampling budget');
 const expected=f.ui.latest.result.config.durationS/8;
 if(f.node('fuel-motion-play').getAttribute('aria-pressed')!=='true')f.node('fuel-motion-play').click();
 f.viewers[0].animation(1);close(Number(f.node('fuel-motion-time').value),expected);
 const arrow=f.viewers[0].built.motion.group.getObjectByName('Ion rotation arrow');close(arrow.userData.exposureS,expected/2);
 const cloud=f.viewers[0].built.motion.group.children.find((o:THREE.Object3D)=>o.userData.tracers&&o.userData.ion);
 assert.ok(cloud.userData.rotationPhaseScale<1);
 close(cloud.userData.rotationPhaseScale,rotationClock/expected);
});

test('equilibrium import samples the visible playback state even when the time-history plot has not redrawn',async t=>{
 const f=fixture(t);await f.start();f.change('fuel-motion-mode','transport','change');f.change('fuel-plot','spin','change');
 const panel=f.node('fuel-equilibrium-calculator');panel.open=true;panel.dispatchEvent(new f.window.Event('toggle'));
 const sample=[...panel.querySelectorAll('button')].find((b:any)=>b.textContent==='Use sampled state') as HTMLButtonElement;
 const count=f.requests.length,result=f.ui.latest.result;
 f.node('fuel-motion-play').click();assert.ok(f.viewers[0].animation);f.viewers[0].animation(1);
 const time=Number(f.node('fuel-motion-time').value);assert.ok(time>0);assert.equal(f.node('fuel-plot').value,'spin');
 const state=sampleFuelTransport(result.transport,time);sample.click();
 close(Number(f.node('equilibrium-edgeSpeedMS').value),state.neutralRadS*result.config.radiusM);
 assert.ok(Number(f.node('equilibrium-edgeSpeedMS').value)>0,'must not import the cached t=0 state');
 assert.equal(f.node('fuel-motion-play').getAttribute('aria-pressed'),'true','sampling must not pause playback');
 assert.equal(Number(f.node('fuel-motion-time').value),time);assert.equal(f.requests.length,count,'sampling must neither pause/rerun nor replace the trajectory');
});

test('guided experiments use the real accepted plots, timeline and probes without changing physical inputs',async t=>{
 const f=fixture(t);await f.start();const host=f.window.document.createElement('div');f.window.document.body.append(host);
 const apparatus=f.window.document.createElement('select');apparatus.id='marathon-apparatus';apparatus.innerHTML='<option value="centrifuge">Centrifuge</option><option value="source">Beam reactor</option>';f.window.document.body.append(apparatus);
 const opened:string[]=[],focused:any[]=[];
 const guide=setupPlaygroundGuide({document:f.window.document,host,open:key=>opened.push(key),close(){},focusRelated:(...args)=>focused.push(args)});
 const before=JSON.stringify(f.ui.read()),requests=f.requests.length;
 const action=(step:number,label:string)=>{
  const choice=f.node('guide-step');choice.value=String(step);choice.dispatchEvent(new f.window.Event('change'));
  const button=[...host.querySelectorAll<HTMLButtonElement>('.guide-actions button')].find(b=>b.textContent===label);assert.ok(button,label);button.click();
 };
 guide.launch('spin');assert.equal(f.node('fuel-plot').value,'spin');assert.equal(f.node('fuel-motion-play').getAttribute('aria-pressed'),'true');
 assert.equal(f.node('fuel-motion-mode').value,'spin','use the same accepted run with resolved slow-motion rotation');
 action(1,'Show end-of-run speeds');assert.equal(f.node('fuel-plot').value,'spin');assert.equal(f.node('fuel-motion-play').getAttribute('aria-pressed'),'false');
 assert.equal(f.node('fuel-view-representation').value,'tracers');assert.equal(f.node('fuel-view-drive').value,'off');
 assert.equal(f.node('fuel-motion-time').value,f.node('fuel-motion-time').max);
 action(2,'Show end-of-run composition');assert.equal(f.node('fuel-plot').value,'composition');assert.equal(f.node('fuel-motion-time').value,f.node('fuel-motion-time').max);
 assert.equal(f.node('fuel-motion-play').getAttribute('aria-pressed'),'false');
 action(2,'Probe axis');assert.equal(f.node('fuel-composition-readout').dataset.radiusM,'0');
 action(2,'Probe wall');close(Number(f.node('fuel-composition-readout').dataset.radiusM),f.ui.latest.result.config.radiusM);
 for(const [label,key]of [['Compare 2× temperature','temperature'],['Compare 2× rotation','rotation']]){
  action(3,label);assert.equal(f.node(`fuel-compare-${key}`).getAttribute('aria-pressed'),'true');
  assert.equal(f.node('fuel-learning-comparisons').open,true,'the computed comparison must be visible, not hidden in a closed disclosure');
  assert.match(f.node('fuel-learning-comparisons').textContent,/Isothermal equilibrium references/);
 }
 guide.launch('work');assert.equal(f.node('fuel-plot').value,'heat');
 assert.equal(f.node('fuel-learning-comparisons').open,false,'a new guided plot must not leave an unrelated comparison in front');
 action(4,'Open heat experiment');assert.deepEqual(focused.at(-1),['controls','#fuel-thermal-enabled']);assert.equal(f.node('fuel-thermal-enabled').checked,false);
 assert.equal(f.node('fuel-plot').value,'thermal');
 const time=f.node('fuel-motion-time').value;
 action(4,'Pin A');assert.equal(opened.at(-1),'view');
 action(4,'Show temperature');assert.equal(f.node('fuel-plot').value,'thermal');
 action(4,'Compare composition');assert.equal(f.node('fuel-plot').value,'composition');
 assert.equal(f.node('fuel-motion-time').value,time,'heating comparisons keep the selected physical time');
 action(5,'Open collection experiment');assert.equal(f.node('fuel-plot').value,'cut');
 action(6,'Open controls');assert.deepEqual(focused.at(-1),['controls',null]);
 assert.equal(JSON.stringify(f.ui.read()),before);assert.equal(f.requests.length,requests,'guidance must never rerun or replace the accepted simulation');
 assert.ok(opened.includes('plots'));
 f.change('fuel-application','pump','change');await f.ui.run();action(5,'Open collection experiment');
 assert.match(f.node('guide-status').textContent,/select Isotope separation/);assert.notEqual(f.node('fuel-plot').value,'cut');
});

test('the current tutorial opens exact current entry without changing physical inputs',async t=>{
 const f=fixture(t);await f.start();const host=f.window.document.createElement('div');f.window.document.body.append(host);
 const guide=setupPlaygroundGuide({document:f.window.document,host,open(){},close(){},focusRelated(){}});
 setupPreciseControls(f.window.document);
 const inputs=JSON.stringify(f.ui.read());
 guide.launch('currentExperiment');await flush();
 assert.equal(f.node('fuel-view-representation').value,'tracers');
 assert.equal(f.node('fuel-view-drive').value,'off');
 assert.equal(f.node('fuel-motion-time').value,'0');
 assert.equal(JSON.stringify(f.ui.read()),inputs);
 const editor=f.node('fuel-currentA').closest('.control').querySelector('.precise-editor'),input=editor.querySelector('input');
 assert.equal(editor.hidden,false);assert.equal(f.window.document.activeElement,input);assert.equal(input.value,'0.03');
 input.value='0.025';editor.querySelector('button').click();await f.ui.run();
 assert.equal(f.ui.read().currentA,.025);assert.equal(f.ui.latest.result.config.currentA,.025);assert.equal(editor.hidden,true);
 guide.launch('currentExperiment');await flush();
 assert.equal(editor.hidden,false);assert.equal(input.value,'0.025');assert.equal(f.window.document.activeElement,input);
 input.value='0.3';editor.querySelector('button').click();
 assert.equal(input.getAttribute('aria-invalid'),'true');assert.equal(f.ui.read().currentA,.025);
 input.value='0';editor.querySelector('button').click();await f.ui.run();
 assert.equal(f.ui.latest.result.transport.snapshots.at(-1).neutralRadS,0);
});

test('reading links use accepted physics results and focus the real collision, drag and heat controls',async t=>{
 const f=fixture(t);await f.start();const host=f.window.document.createElement('div');f.window.document.body.append(host);
 const focused:any[]=[];
 const guide=setupPlaygroundGuide({document:f.window.document,host,open(){},close(){},focusRelated:(...args)=>focused.push(args)});
 guide.showPhysics('momentum');const frame=host.querySelector<HTMLIFrameElement>('iframe')!;
 const before=JSON.stringify(f.ui.read()),requests=f.requests.length;
 const send=(action:string)=>f.window.dispatchEvent(new f.window.MessageEvent('message',{origin:'https://example.org',source:frame.contentWindow,data:{type:'mass-spinner:guide-action',action}}));
 for(const [key,id]of [['current','currentA'],['collisions','collisionHz'],['drag','dragHz'],['diffusion','radialDiffusivityM2S'],['duration','durationS']]){
  send(key);assert.deepEqual(focused.at(-1),['controls',`#fuel-${id}`]);assert.ok(f.node(`fuel-${id}`));
 }
 send('composition');assert.equal(f.node('fuel-plot').value,'composition');
 f.change('fuel-motion-time',.37);
 for(const [key,topic]of [['axis','composition'],['wall','composition'],['temperature','composition'],['rotation','composition'],['momentum','momentum'],['inertia','inertia'],['density','profile'],['cut','cut']]){
  send(key);assert.equal(f.node('fuel-plot').value,topic);close(Number(f.node('fuel-motion-time').value),.37);
  if(key==='axis'||key==='wall')close(Number(f.node('fuel-composition-readout').dataset.timeS),.37);
 }
 f.node('fuel-motion-play').click();assert.equal(f.node('fuel-motion-play').getAttribute('aria-pressed'),'true');
 send('cut');assert.equal(f.node('fuel-motion-play').getAttribute('aria-pressed'),'false');
 const graph=f.ui.nodes.plots.querySelector('svg')!;
 assert.equal(f.window.document.activeElement,graph,'collection shortcut focuses the diagnostic, not the setup slider');
 const accepted=f.ui.latest.result,originalCut=f.node('fuel-cutFraction').value;
 graph.dispatchEvent(new f.window.KeyboardEvent('keydown',{key:'Home',bubbles:true,cancelable:true}));
 assert.match(f.ui.nodes.plots.querySelector('.plot-readout')!.textContent!,/Inner light purity: 0, —.*Light recovery: 0, 0/);
 graph.dispatchEvent(new f.window.KeyboardEvent('keydown',{key:'End',bubbles:true,cancelable:true}));
 assert.match(f.ui.nodes.plots.querySelector('.plot-readout')!.textContent!,/Light recovery: 1, 100.*Outer heavy purity: 1, —/);
 assert.equal(f.ui.latest.result,accepted);assert.equal(f.node('fuel-cutFraction').value,originalCut);
 close(Number(f.node('fuel-motion-time').value),.37);
 send('collection');close(Number(f.node('fuel-motion-time').value),Number(f.node('fuel-motion-time').max));

 send('thermalPlot');assert.equal(f.node('fuel-plot').value,'thermal');assert.equal(f.node('fuel-thermal-enabled').checked,false);
 assert.match(f.ui.nodes.plots.textContent,/fixed-temperature bath/);
 send('work');assert.equal(f.node('fuel-plot').value,'heat');
 assert.equal(JSON.stringify(f.ui.read()),before);assert.equal(f.requests.length,requests);
});

test('a standalone guide plot link waits for accepted results and cancels if another action is chosen',async t=>{
 const f=fixture(t);const host=f.window.document.createElement('div');f.window.document.body.append(host);
 const guide=setupPlaygroundGuide({document:f.window.document,host,open(){},close(){},focusRelated(){}});
 guide.launch('composition');assert.match(f.node('guide-status').textContent,/Waiting for the calculated run/);
 await f.start();await flush();assert.equal(f.node('fuel-plot').value,'composition');
 f.change('fuel-currentA',.04);guide.launch('composition');guide.launch('current');
 f.change('fuel-plot','spin','change');await f.ui.run();await flush();
 assert.equal(f.node('fuel-plot').value,'spin','the canceled opening must not override a newer user choice');
});

test('composition plot, precise radius, physical-time sampling and 3D ring share the accepted cell state',async t=>{
 const f=fixture(t);await f.start();f.change('fuel-motion-time',.37);f.change('fuel-plot','composition','change');
 const count=f.requests.length,r=f.ui.latest.result,tools=f.viewers[0].built.tools;
 const graph=f.ui.nodes.plots.querySelector('svg')!,readout=f.node('fuel-composition-readout');
 assert.match(graph.getAttribute('aria-label')!,/Local composition \(%\).*Radius \(cm\)/);
 graph.dispatchEvent(new f.window.KeyboardEvent('keydown',{key:'End',bubbles:true,cancelable:true}));
 close(Number(readout.dataset.radiusM),r.config.radiusM);close(Number(readout.dataset.timeS),.37);
 close(tools.group.getObjectByName('Composition probe').userData.radiusM,r.config.radiusM);
 graph.dispatchEvent(new f.window.KeyboardEvent('keydown',{key:'Home',bubbles:true,cancelable:true}));
 close(Number(readout.dataset.radiusM),0);assert.equal(tools.group.getObjectByName('Composition probe axis').visible,true);
 f.change('fuel-view-radius',.637);
 const state=sampleFuelTransport(r.transport,.37),expected=sampleFuelField(r,r.config.radiusM*.637,state);
 close(Number(readout.dataset.lightFraction),expected.lightFraction!);close(Number(readout.dataset.radiusM),expected.radiusM);
 close(tools.sampleAt(expected.radiusM).lightFraction!,expected.lightFraction!);
 assert.match(readout.textContent,/⁶Li.*%.*⁷Li.*%/);
 assert.equal(f.ui.nodes.plots.querySelector('.plot-readout')!.hasAttribute('hidden'),true,'nearest generic readout must not contradict exact cell probe');
 assert.equal(f.requests.length,count);close(Number(f.node('fuel-motion-time').value),.37);
});

test('touch-style slice selection retains radius and opens composition without changing physics or time',async t=>{
 const f=fixture(t);await f.start();f.change('fuel-motion-time',.4);const v=f.viewers[0],r=f.ui.latest.result,count=f.requests.length;
 const point=v.built.scene.localToWorld(new THREE.Vector3(.6*r.config.radiusM,0,.3*r.config.lengthM));
 v.options.onSelect('slice',{},'Gas',{point});
 assert.equal(f.node('fuel-plot').value,'composition');close(Number(f.node('fuel-view-radius').value),.6);
 close(Number(f.node('fuel-composition-readout').dataset.radiusM),.6*r.config.radiusM);
 close(Number(f.node('fuel-motion-time').value),.4);assert.equal(f.requests.length,count);assert.equal(v.animation,null);
});

test('beginner sample controls explain the exact accepted fraction without rerunning or changing time',async t=>{
 const f=fixture(t);await f.start();f.change('fuel-motion-time',.37);f.change('fuel-plot','composition','change');
 const requests=f.requests.length,r=f.ui.latest.result,readout=f.node('fuel-composition-readout');
 for(const [label,radius]of [['At axis',0],['At wall',1]] as const){
  [...f.node('fuel-sample-controls').querySelectorAll('button')].find((b:any)=>b.textContent===label).click();
  const sample=sampleFuelField(r,radius*r.config.radiusM,sampleFuelTransport(r.transport,.37));
  close(Number(readout.dataset.lightFraction),sample.lightFraction!);assert.match(readout.textContent,/In 1,000 atoms here, about/);assert.match(readout.textContent,/Feed:.*%/);assert.match(readout.textContent,radius?/At the wall/:/At the axis/);
  close(parseFloat(readout.querySelector('.fuel-sample-bar span').style.width),100*sample.lightFraction!,1e-5);
 }
 f.change('fuel-sample-radius',.32);close(Number(readout.dataset.radiusM),.32*r.config.radiusM);close(Number(readout.dataset.timeS),.37);assert.equal(f.requests.length,requests);
 assert.match(f.ui.nodes.plots.querySelector('svg')!.getAttribute('aria-label')!,/zoomed/);
 f.change('fuel-view-species','heavy','change');
 assert.equal(f.ui.nodes.plots.querySelector('svg path[stroke="#94d9cd"]')!.getAttribute('stroke-opacity'),'1','a 3D highlight must not obscure the sole light-percentage curve');
 f.change('fuel-plot','profile','change');assert.equal(f.node('fuel-sample-controls').hidden,true);assert.equal(f.node('fuel-density-reading').hidden,false);assert.match(f.node('fuel-density-reading').textContent,/axis.*average.*wall/);
});

test('pinned vessels probe the same physical radius and disclose a probe beyond A',async t=>{
 const f=fixture(t);await f.start();const originalRadius=f.ui.latest.result.config.radiusM;
 (f.ui.nodes.view.querySelector('button[aria-label="Pin accepted experiment as comparison A"]') as HTMLButtonElement).click();await flush();
 f.change('fuel-radiusM',.2);await f.ui.run();await flush();f.change('fuel-plot','composition','change');f.change('fuel-view-radius',.4);
 const probe=(index:number)=>f.viewers[index].built.tools.group.getObjectByName('Composition probe').userData.radiusM;
 close(probe(0),.08);close(probe(1),.08);
 f.change('fuel-view-radius',.8);close(probe(0),.16);close(probe(1),originalRadius);
 assert.match(f.node('fuel-composition-readout').textContent,/A probe at wall; selected radius is outside A/);
 f.change('fuel-view-layer','density','change');close(probe(1),originalRadius);
});

test('comparison snapshots pause at the displayed off-redraw time and probe announcements follow playback',async t=>{
 const f=fixture(t);await f.start();f.change('fuel-plot','composition','change');f.node('fuel-motion-play').click();
 const v=f.viewers[0];assert.ok(v.animation);v.animation(.08);v.animation(.001);
 const time=Number(f.node('fuel-motion-time').value),expected=sampleFuelTransport(f.ui.latest.result.transport,time).neutralRadS;
 assert.equal(f.node('fuel-composition-readout').getAttribute('aria-live'),'off');
 f.node('fuel-compare-temperature').click();
 assert.match(f.node('fuel-learning-comparisons').textContent,new RegExp(`rotation fixed at ${Number(expected.toPrecision(4))} rad/s`));
 assert.equal(f.node('fuel-composition-readout').getAttribute('aria-live'),'polite');assert.equal(v.animation,null);
});

test('conditional comparison buttons leave accepted drive history and pinned baseline unchanged',async t=>{
 const f=fixture(t);await f.start();f.change('fuel-motion-time',.8);
 const pin=f.ui.nodes.view.querySelector('[aria-label="Pin accepted experiment as comparison A"]') as HTMLButtonElement;pin.click();await flush();
 const before=JSON.stringify(f.ui.latest),count=f.requests.length,buildCount=f.builds.length;
 for(const kind of ['temperature','rotation','collection']){
  f.node(`fuel-compare-${kind}`).click();assert.ok(f.node('fuel-learning-comparisons').querySelector('svg'));
  assert.match(f.node('fuel-learning-comparisons').textContent,/Isothermal equilibrium references/);
  assert.match(f.node('fuel-learning-comparisons').textContent,/do not predict drive, heating or extraction/);
 }
 assert.equal(JSON.stringify(f.ui.latest),before);assert.equal(f.requests.length,count);assert.equal(f.builds.length,buildCount);
 assert.equal(f.ui.nodes.render.classList.contains('fuel-comparing'),true);
});

test('a pinned larger vessel cannot send the composition probe outside the current vessel',async t=>{
 const f=fixture(t);await f.start();f.change('fuel-radiusM',.2);await f.ui.run();
 (f.ui.nodes.view.querySelector('[aria-label="Pin accepted experiment as comparison A"]') as HTMLButtonElement).click();await flush();
 f.change('fuel-radiusM',.1);await f.ui.run();f.change('fuel-plot','composition','change');
 f.ui.nodes.plots.querySelector('svg')!.dispatchEvent(new f.window.KeyboardEvent('keydown',{key:'End',bubbles:true,cancelable:true}));
 close(Number(f.node('fuel-composition-readout').dataset.radiusM),.1);
 assert.match(f.node('fuel-composition-readout').textContent,/outside B/);
});

test('pending and failed operations cannot present accepted-input coverage for new settings',async t=>{
 const f=fixture(t);await f.start();f.change('fuel-gasK',600);
 assert.equal(f.node('fuel-input-coverage').dataset.match,'pending');assert.equal(f.node('fuel-compare-temperature').disabled,true);
 const running=f.ui.run();f.change('fuel-plot','composition','change');
 assert.equal(f.node('fuel-input-coverage').dataset.match,'pending','redrawing the previous result while awaiting the worker stays pending');
 await running;assert.equal(f.node('fuel-input-coverage').dataset.match,'false');assert.equal(f.node('fuel-compare-temperature').disabled,false);
 f.failOnce();await f.ui.run();assert.match(f.node('fuel-result-scope').textContent,/No accepted result/);
 assert.equal(f.node('fuel-compare-temperature').disabled,true);assert.equal(f.node('fuel-composition-readout').hidden,true);
});

test('centimetre conversion preserves right-continuous cell-edge probing',async t=>{
 const f=fixture(t);await f.start();f.change('fuel-motion-time',.8);f.change('fuel-plot','composition','change');
 const r=f.ui.latest.result,state=sampleFuelTransport(r.transport,.8),n=state.lightMass.length;
 for(const i of [1,6,17,63]){
  const cm=100*r.config.radiusM*Math.sqrt(i/n);f.change('fuel-view-radius',cm/(100*r.config.radiusM));
  const light=r.config.lightFraction*state.lightMass[i],heavy=(1-r.config.lightFraction)*state.heavyMass[i];
  close(Number(f.node('fuel-composition-readout').dataset.lightFraction),light/(light+heavy));
 }
});

test('real apparatus initially keeps the viewer fit and preserves the user SI pose after a physical change',async t=>{
 const f=fixture(t);await f.start();const v=f.viewers[0];
 assert.equal(f.node('fuel-motion-mode').value,'transport');assert.equal(f.node('fuel-motion-time').hidden,false);
 assert.deepEqual(v.asset.modelCamera.position,[.55,1.25,.8]);assert.equal(v.built.tools.group.userData.staging.cutaway,.62);
 assert.equal(v.cameraSets.length,0,'first load must not restore the pre-fit origin');assert.ok(Math.hypot(...v.pose.position)>0);
 const pose={position:[.8,.5,-.7],target:[.03,.01,0],up:[0,1,0]};v.userCamera(pose);
 const first=v.built.scene;f.change('fuel-currentA',.05);await f.ui.run();
 assert.notEqual(v.built.scene,first);assert.equal(f.ui.latest.result.config.currentA,.05);assert.deepEqual(v.pose,pose);assert.deepEqual(v.cameraSets.at(-1),pose);
 assert.equal(v.built.scene.userData.gasRadiusM,f.ui.latest.result.config.radiusM);
});

test('picked pump stays read-only while its canonical control updates the engineering state',async t=>{
 const f=fixture(t);await f.start();const v=f.viewers[0],pump=v.built.scene.getObjectByName('Downstream exhaust pump');assert.ok(pump);
 v.options.onSelect('pump',pump.userData,pump.name);
 assert.equal(f.ui.nodes.inspect.querySelectorAll('input').length,0);
 const input=f.node('fuel-pumpSpeedM3S');input.focus();f.change(input.id,Math.log10(.04));await f.ui.run();
 close(f.requests.at(-1).record.config.pumpSpeedM3S,.04);close(f.ui.latest.result.config.pumpSpeedM3S,.04);
 assert.equal(f.window.document.activeElement,input);assert.ok(f.ui.nodes.inspect.querySelector('[data-control=pumpSpeedM3S]'));
 close(v.built.scene.getObjectByName('Downstream exhaust pump').userData.prescribedSpeedM3S,.04);
});

test('plot location reveals accepted SI fields without recomputing or changing shared physical time',async t=>{
 const f=fixture(t);await f.start();f.change('fuel-motion-time',.6);const count=f.requests.length,tools=f.viewers[0].built.tools;
 f.change('fuel-plot','inertia','change');f.node('fuel-locate-plot').click();assert.equal(f.requests.length,count);assert.equal(Number(f.node('fuel-motion-time').value),.6);
 assert.equal(tools.group.visible,true);assert.equal(tools.legend.layer,'density');assert.equal(tools.sampleAt(.06).timeS,.6);
 assert.equal(f.viewers[0].selection,'slice');assert.equal(f.node('fuel-view-representation').value,'both');
});

test('keyboard time-plot endpoints synchronize physical seek time, gas mode and real diagnostic fields',async t=>{
 const f=fixture(t);await f.start();const r=f.ui.latest.result,v=f.viewers[0],count=f.requests.length;
 const endpoint=(topic:string,key='End')=>{f.change('fuel-plot',topic,'change');f.ui.nodes.plots.querySelector('svg')!.dispatchEvent(new f.window.KeyboardEvent('keydown',{key,bubbles:true,cancelable:true}));};
 for(const topic of ['spin','heat']){
  endpoint(topic);assert.equal(f.node('fuel-motion-mode').value,topic==='spin'?'spin':'transport');close(Number(f.node('fuel-motion-time').value),r.config.durationS);
  const expected=r.transport.snapshots.at(-1).neutralRadS;
  close(v.built.tools.sampleAt(r.config.radiusM*.5).speedMS,expected*r.config.radiusM*.5);
 }
 endpoint('separation','Home');assert.equal(f.node('fuel-motion-mode').value,'transport');assert.equal(Number(f.node('fuel-motion-time').value),0);assert.equal(v.built.tools.sampleAt(0).timeS,0);
 endpoint('separation');assert.equal(f.node('fuel-motion-mode').value,'transport');close(Number(f.node('fuel-motion-time').value),r.config.durationS);assert.match(v.built.tools.legend.scope,/Coupled rotor and radial transport/);
 assert.equal(f.requests.length,count,'plot inspection is display-only');
});

test('pinned real apparatus stays immutable while both viewers share camera, physical time and color domains',async t=>{
 const f=fixture(t);await f.start();f.change('fuel-motion-mode','transport','change');f.change('fuel-motion-time',.4);
 const pin=f.ui.nodes.view.querySelector('button[aria-label="Pin accepted experiment as comparison A"]') as HTMLButtonElement;assert.equal(pin.disabled,false);pin.click();await flush();assert.equal(f.viewers.length,2);
 const a=f.viewers[1],b=f.viewers[0],original=a.asset.model.result,config=clone(original.config);
 assert.ok(Object.isFrozen(original));assert.ok(Object.isFrozen(original.config));
 f.change('fuel-currentA',.06);await f.ui.run();await flush();
 assert.deepEqual(a.asset.model.config,config);assert.equal(a.asset.model.config.currentA,.03);assert.equal(b.asset.model.config.currentA,.06);
 f.change('fuel-motion-time',.7);close(a.built.tools.sampleAt(0).timeS,.7);close(b.built.tools.sampleAt(0).timeS,.7);
 const pose={position:[.7,1.1,.8],target:[0,.02,0],up:[0,1,0]};b.userCamera(pose);assert.deepEqual(a.pose,pose);
 const reverse={position:[.9,.8,.5],target:[0,0,0],up:[0,1,0]};a.userCamera(reverse);assert.deepEqual(b.pose,reverse);
 const axial=[...f.ui.nodes.view.querySelectorAll('button')].find(button=>button.textContent==='Axial')!;axial.click();assert.deepEqual(a.pose,b.pose);assert.equal(a.pose.position[1],a.pose.target[1]);assert.equal(a.pose.position[2],a.pose.target[2]);
 for(const layer of ['composition','density','speed']){
  f.change('fuel-view-layer',layer,'change');f.change('fuel-motion-time',.7);
  const expected=comparisonDomain([a.asset.model.result,b.asset.model.result],layer as any);
  assert.deepEqual(a.built.tools.legend.domain,expected);assert.deepEqual(b.built.tools.legend.domain,expected);
 }
 for(const mode of ['transport','flow'] as const){
  f.change('fuel-motion-mode',mode,'change');
  f.node('fuel-motion-play').click();b.animation(.1);
  const current=b.built.motion.group.children.find((o:THREE.Object3D)=>o.userData.tracers&&o.userData.ion);
  const baseline=a.built.motion.group.children.find((o:THREE.Object3D)=>o.userData.tracers&&o.userData.ion);
  close(current.userData.rotationPhaseScale,baseline.userData.rotationPhaseScale);
  const expected=current.userData.physicalPhaseRad/baseline.userData.physicalPhaseRad;
  close(current.rotation.z/baseline.rotation.z,expected);
  assert.match(f.node('fuel-motion-clock').textContent,/rotation: [\d.]+ (?:µs|ms)\/screen s/);
  f.node('fuel-motion-play').click();
 }
 assert.match(f.ui.nodes.render.querySelector('.fuel-comparison-label')!.textContent!,/shared SI camera\/colors/);
 assert.deepEqual(original.config,config);
});

test('presentation controls move only diagnostic/display geometry and never dispatch a solver calculation',async t=>{
 const f=fixture(t);await f.start();const v=f.viewers[0],r=f.ui.latest.result,before=JSON.stringify(r),count=f.requests.length;
 const cloud=v.built.motion.group.children.find((o:any)=>o.userData.tracers&&!o.userData.ion) as THREE.Group;
 const positions=(cloud.children[0] as THREE.InstancedMesh).geometry.attributes.samplePosition.array.slice();
 f.check('fuel-view-visible',true);f.change('fuel-view-slice',.2);f.change('fuel-view-cutaway',.8);f.change('fuel-view-explode',.7);f.check('fuel-view-ghost',true);f.change('fuel-view-layer','density','change');f.change('fuel-view-species','heavy','change');
 assert.equal(f.requests.length,count);assert.equal(JSON.stringify(f.ui.latest.result),before);assert.deepEqual((cloud.children[0] as THREE.InstancedMesh).geometry.attributes.samplePosition.array,positions);
 assert.equal(v.built.tools.group.visible,true);close(v.built.tools.group.position.z,r.config.lengthM*.2);
 const wall=v.built.scene.getObjectByName('Vessel pressure wall') as THREE.Mesh<any,THREE.Material>;assert.equal(wall.material.opacity,.14);assert.equal(wall.material.clippingPlanes!.length,1);
 const numericalRadius=v.built.tools.sampleAt(r.config.radiusM).radiusM;assert.equal(numericalRadius,r.config.radiusM);assert.ok(v.built.tools.legend.axialUniform);
});

test('transport seek updates the plotted profiles, cellwise probes and actual neutral cloud radii from the same snapshot',async t=>{
 const f=fixture(t);await f.start();const v=f.viewers[0],r=f.ui.latest.result,R=r.config.radiusM;
 f.change('fuel-view-representation','both','change');assert.equal(v.built.motion.group.visible,true);
 f.change('fuel-motion-mode','transport','change');f.change('fuel-plot','profile','change');f.change('fuel-motion-time',0);
 const curve=()=>f.ui.nodes.plots.querySelector('svg path[stroke-width="2"]')!.getAttribute('d'),initialCurve=curve();
 const clouds=v.built.motion.group.children.filter((o:any)=>o.userData.tracers&&!o.userData.ion) as THREE.Group[];
 const first=(clouds[0].children[0] as THREE.InstancedMesh).geometry.attributes.samplePosition,initialRadius=Math.hypot(first.getX(0),first.getY(0));
 f.change('fuel-motion-time',r.config.durationS);const sample=sampleFuelTransport(r.transport,r.config.durationS);
 assert.notEqual(curve(),initialCurve);assert.notEqual(Math.hypot(first.getX(0),first.getY(0)),initialRadius);
 for(const cloud of clouds){
  const species=cloud.userData.species,mass=species?sample.heavyMass:sample.lightMass,points=(cloud.children[0] as THREE.InstancedMesh).geometry.attributes.samplePosition,n=cloud.userData.tracers;
  for(let i=0;i<n;i+=Math.max(1,Math.floor(n/11))){const radius=Math.hypot(points.getX(i),points.getY(i));close(fuelTransportCDF(mass,Math.min(1,radius/R)),(i+.5)/n,2e-6);}
  assert.equal(cloud.children[0].visible,true,'rotating gas samples must use the transported radii');
  assert.equal(cloud.userData.azimuthAveraged,false);assert.equal(cloud.children.length,2);
 }
 const radius=R*.8,cell=Math.min(sample.lightMass.length-1,Math.floor((radius/R)**2*sample.lightMass.length)),x=r.config.lightFraction;
 const light=sample.lightMass[cell]*sample.lightMass.length,heavy=sample.heavyMass[cell]*sample.heavyMass.length,total=x*light+(1-x)*heavy,probe=v.built.tools.sampleAt(radius);
 close(probe.densityM3,r.config.pressurePa/(1.380649e-23*r.config.gasK)*total);close(probe.lightFraction,x*light/total);close(probe.timeS,sample.timeS);close(probe.speedMS,sample.neutralRadS*radius);
 assert.equal(v.built.motion.group.children.filter((o:any)=>o.name==='Schematic throughput packets').every(o=>!o.visible),true);
 assert.match(f.ui.nodes.plots.querySelector('.fuel-explanation')!.textContent!,/does not calculate local fluid momentum or extraction/);
});

test('operating-map cells apply real accepted physical configurations and recompute meshes deliberately',async t=>{
 const f=fixture(t);await f.start();const generate=[...f.ui.nodes.view.querySelectorAll('button')].find(button=>button.textContent==='Calculate')!;generate.click();await flush();
 const request=f.requests.at(-1).record;assert.equal(request.kind,'fuel-operating-map');assert.equal(request.config.currentA,.03);
 const cells=[...f.ui.nodes.view.querySelectorAll('.fuel-map-cell')] as HTMLButtonElement[];assert.equal(cells.length,49);assert.equal(f.ui.latest.result.config.currentA,.03);
 const point=cells.find(button=>button.dataset.status==='valid'&&Number(button.dataset.ix)>0&&Number(button.dataset.iy)>0)!;assert.ok(point);assert.match(point.getAttribute('aria-label')!,/Magnetic field.*T.*Discharge current.*A/);
 point.click();await f.ui.run();const result=f.ui.latest.result;assert.equal(request.options.xKey,'magneticT');close(result.config.magneticT,.05+(2-.05)*Number(point.dataset.ix)/6);
 assert.equal(f.node('fuel-magneticT').step,'any','exact map axes must not be quantized by a native range step');
 close(result.config.currentA,.2*Number(point.dataset.iy)/6);assert.equal(f.viewers[0].asset.model.result,result);
 for(const path of f.ui.nodes.plots.querySelectorAll('path'))assert.doesNotMatch(path.getAttribute('d')??'',/NaN|Infinity/);
});
test('precise Controls entry preserves decimal drafts and bypasses native range-step rounding',async t=>{
 const f=fixture(t);await f.start();setupPreciseControls(f.window.document);
 const box=f.node('fuel-magneticT').closest('.control') as HTMLElement;
 box.querySelector('output')!.click();const input=box.querySelector('input[type=number]') as HTMLInputElement;
 input.value='0.5300';assert.equal(input.value,'0.5300');
 input.dispatchEvent(new f.window.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));
 assert.equal(f.node('fuel-magneticT').step,'any');await f.ui.run();assert.equal(f.ui.latest.result.config.magneticT,.53);
});
test('Clear remains safe after a failed current computation with a pinned accepted baseline',async t=>{
 const f=fixture(t);await f.start();const errors:any[]=[];f.window.addEventListener('error',event=>errors.push(event.error));
 (f.ui.nodes.view.querySelector('button[aria-label="Pin accepted experiment as comparison A"]') as HTMLButtonElement).click();await flush();
 f.failOnce();f.change('fuel-currentA',.05);await f.ui.run();assert.equal(f.ui.latest,null);
 [...f.ui.nodes.view.querySelectorAll('button')].find(button=>button.textContent==='Clear')!.click();assert.deepEqual(errors,[]);assert.equal(f.ui.nodes.render.querySelector('.fuel-baseline')!.hasAttribute('hidden'),true);
});
test('Transport cut plots show the current inventory rather than the final equilibrium cut',async t=>{
 const f=fixture(t);await f.start();f.change('fuel-motion-mode','transport','change');f.change('fuel-plot','cut','change');f.change('fuel-motion-time',0);
 const metric=()=>parseFloat([...f.ui.nodes.plots.querySelectorAll('.fuel-metrics > div')].find(row=>row.querySelector('span')!.textContent==='Inner light purity')!.querySelector('strong')!.textContent!);close(metric(),100*f.ui.latest.result.config.lightFraction,.001);
 f.change('fuel-motion-time',1);close(metric(),100*sampleFuelTransport(f.ui.latest.result.transport,1).collection.innerLightPurity!,.001);
 assert.match(f.ui.nodes.plots.querySelector('.fuel-explanation')!.textContent!,/Closed-wall inventory at the selected time/);
});


test('a standalone pin link waits for native comparison readiness after result export becomes available',async t=>{
 const f=fixture(t);await f.start();
 const host=f.window.document.createElement('div');f.window.document.body.append(host);
 const guide=setupPlaygroundGuide({document:f.window.document,host,open(){},close(){},focusRelated(){}});
 const pin=f.window.document.querySelector<HTMLButtonElement>('[aria-label="Pin accepted experiment as comparison A"]')!;
 const clear=f.window.document.querySelector<HTMLButtonElement>('.fuel-comparison-bar button:nth-child(2)')!;
 assert.ok(clear);assert.equal(f.node('fuel-export').disabled,false);
 pin.disabled=true;guide.launch('pin');
 assert.match(f.node('guide-status').textContent,/Waiting for the calculated run/);assert.equal(clear.disabled,true);
 pin.disabled=false;await flush();assert.equal(clear.disabled,false,'pin only after accepted comparison tools are ready');
 assert.equal(f.node('guide-status').textContent,'');
});


test('replayed histories draw only through shared physical time, including pinned comparisons',async t=>{
 const f=fixture(t);await f.start();const count=f.requests.length,accepted=f.ui.latest.result;
 const history=()=>f.ui.nodes.plots.querySelector<SVGSVGElement>('svg')!;
 const paths=()=>[...history().querySelectorAll('g[data-series] path')].map(p=>p.getAttribute('d'));
 f.change('fuel-motion-mode','transport','change');
 for(const topic of ['spin','heat','thermal','separation','momentum','inertia']){
  f.change('fuel-plot',topic,'change');f.change('fuel-motion-time',0);
  const svg=history(),initial=paths();assert.equal(svg.dataset.visibleUntil,'0');
  f.node('fuel-motion-play').click();assert.ok(f.viewers[0].animation);f.viewers[0].animation(1);
  const time=Number(f.node('fuel-motion-time').value);assert.ok(time>0&&time<accepted.config.durationS);
  assert.equal(history(),svg,'playback updates the existing graph, not its focusable element');
  close(Number(svg.dataset.visibleUntil),time);assert.notDeepEqual(paths(),initial);
  if(topic==='spin'){
   const current=Number(f.ui.nodes.plots.querySelector('.fuel-metrics strong')!.textContent!.split(' ')[0]);
   close(current,sampleFuelTransport(accepted.transport,time).neutralRadS*accepted.config.radiusM,.001);
  }
  f.node('fuel-motion-restart').click();assert.equal(svg.dataset.visibleUntil,'0');assert.deepEqual(paths(),initial);
  f.change('fuel-motion-time',accepted.config.durationS);assert.equal(history().dataset.visibleUntil,String(accepted.config.durationS));
 }
 const pin=f.ui.nodes.view.querySelector<HTMLButtonElement>('[aria-label="Pin accepted experiment as comparison A"]')!;pin.click();await flush();
 f.change('fuel-plot','momentum','change');f.change('fuel-motion-time',.37);
 const svg=history();assert.equal(svg.querySelectorAll('g[data-series]').length,8);
 assert.equal(svg.dataset.visibleUntil,'0.37');assert.ok(svg.textContent!.includes('A ·')&&svg.textContent!.includes('B ·'));
 assert.equal(f.requests.length,count);assert.equal(f.ui.latest.result,accepted);
});

test('comparison color bounds update on pin, result acceptance and clear without repainting every frame',async t=>{
 const f=fixture(t);await f.start();f.change('fuel-view-layer','speed','change');
 const a=f.ui.latest.result;
 f.window.document.querySelector<HTMLButtonElement>('[aria-label="Pin accepted experiment as comparison A"]')!.click();await flush();
 assert.equal(f.viewers.length,2);
 f.change('fuel-currentA',.001);await f.ui.run();await flush();
 const b=f.ui.latest.result,shared=comparisonDomain([a,b],'speed');
 const current=f.viewers[0].built.tools,baseline=f.viewers[1].built.tools;
 assert.deepEqual(current.legend.domain,shared);assert.deepEqual(baseline.legend.domain,shared);
 let domainUpdates=0;
 for(const tools of [current,baseline]){
  const setDomains=tools.setDomains;tools.setDomains=(domains:any)=>{domainUpdates++;setDomains(domains);};
 }
 f.change('fuel-motion-mode','spin','change');f.change('fuel-view-layer','speed','change');f.node('fuel-motion-play').click();
 assert.equal(typeof f.viewers[0].animation,'function');
 for(let i=0;i<5;i++)f.viewers[0].animation(.01);
 assert.equal(domainUpdates,0,'accepted color domains must not rescan/repaint during playback');
 f.node('fuel-motion-play').click();
 f.window.document.querySelector<HTMLButtonElement>('.fuel-comparison-bar button:nth-child(2)')!.click();await flush();
 assert.equal(domainUpdates,1,'clear applies the single-run domain once');
 assert.deepEqual(current.legend.domain,comparisonDomain([b],'speed'));
 assert.ok(current.legend.domain[1]<shared[1],'clearing the faster pin must remove its color-range contribution');
});


test('Play at the end restarts each finite coupled run without rerunning the solver',async t=>{
 const f=fixture(t);await f.start();const requests=f.requests.length,result=f.ui.latest.result;
 for(const mode of ['transport','spin']){
  f.change('fuel-motion-mode',mode,'change');
  f.change('fuel-motion-time',result.config.durationS);
  f.node('fuel-motion-play').click();
  assert.equal(f.node('fuel-motion-play').getAttribute('aria-pressed'),'true');
  assert.equal(Number(f.node('fuel-motion-time').value),0);
  assert.equal(typeof f.viewers[0].animation,'function');f.viewers[0].animation(.1);
  close(Number(f.node('fuel-motion-time').value),result.config.durationS/80);
  const cloud=f.viewers[0].built.motion.group.children.find((o:THREE.Object3D)=>o.userData.tracers&&o.userData.ion);
  assert.ok(cloud.rotation.z>0,'the gas must turn during the first screen frame');
  f.viewers[0].animation(7.9);
  close(Number(f.node('fuel-motion-time').value),result.config.durationS);
  assert.equal(f.node('fuel-motion-play').getAttribute('aria-pressed'),'false');
 }
 assert.equal(f.requests.length,requests);assert.equal(f.ui.latest.result,result);
});

test('an exceeded load limit stops the shared timeline and bursts actual assembly parts; reference and reset restore them',async t=>{
 const f=fixture(t);await f.start();
 f.change('fuel-failure-pressurePa',1);await f.ui.run();
 const built=f.builds.at(-1),panel=f.node('fuel-failure');
 assert.equal(panel.hidden,false);assert.match(panel.textContent,/Pressure difference.*First stored state/);
 assert.equal(Number(f.node('fuel-motion-time').max),0);assert.equal(Number(f.node('fuel-motion-time').value),0);
 assert.equal(f.node('fuel-motion-play').textContent,'Play');assert.equal(f.node('fuel-power').disabled,true);
 assert.equal(built.burst.group.visible,true);assert.equal(built.burst.group.userData.elapsedS,1.6,'Reduced motion shows the final state without animation.');
 assert.equal(built.scene.getObjectByName('construction').visible,false);
 assert.equal(f.viewers[0].options.pickFilter({object:new THREE.Object3D()}),false);
 f.change('fuel-motion-mode','equilibrium','change');assert.equal(panel.hidden,true);assert.equal(built.burst.group.visible,false);assert.equal(built.scene.getObjectByName('construction').visible,true);
 f.change('fuel-motion-mode','transport','change');assert.equal(panel.hidden,false);
 f.change('fuel-failure-pressurePa',1000);await f.ui.run();assert.equal(panel.hidden,true);assert.equal(f.builds.at(-1).burst.group.visible,false);
 const count=f.requests.length;f.change('fuel-failure-pressurePa','');await f.ui.run();
 assert.equal(f.requests.length,count);assert.match(panel.textContent,/Check failure limits/);assert.equal(f.node('fuel-export').disabled,true);
 f.change('fuel-failure-pressurePa',1000);f.failOnce();await f.ui.run();
 assert.equal(panel.hidden,true);assert.equal(f.ui.latest,null);assert.match(f.ui.nodes.render.textContent,/Explicit worker failure/);
});


test('a later pressure crossing animates on display time while physics stops; rewind restores the intact vessel',async t=>{
 const f=fixture(t,false,false);await f.start();f.node('fuel-motion-play').click();
 const r=f.ui.latest.result,states=r.transport.snapshots,c=r.config,n=states[0].lightMass.length;
 const pressure=(s:any)=>c.pressurePa*n*(c.lightFraction*s.lightMass[n-1]+(1-c.lightFraction)*s.heavyMass[n-1]);
 const threshold=(pressure(states[0])+pressure(states.at(-1)))/2;
 assert.ok(threshold>c.pressurePa);
 f.change('fuel-failure-pressurePa',threshold);await f.ui.run();
 const v=f.viewers[0],built=f.builds.at(-1);
 assert.equal(f.node('fuel-failure').hidden,true);f.change('fuel-motion-time',1);
 const stopped=Number(f.node('fuel-motion-time').value);assert.ok(stopped>0&&stopped<1);
 assert.equal(built.burst.group.visible,true);assert.equal(built.burst.group.userData.elapsedS,0);
 assert.ok(v.animation);v.animation(.4);assert.equal(Number(f.node('fuel-motion-time').value),stopped);assert.equal(built.burst.group.userData.elapsedS,.4);
 v.animation(2);assert.equal(v.animation,null);assert.equal(built.burst.group.userData.elapsedS,1.6);
 f.change('fuel-view-drive','force','change');assert.equal(f.node('fuel-failure').hidden,false);assert.equal(built.burst.group.visible,true);
 f.node('fuel-motion-restart').click();assert.equal(Number(f.node('fuel-motion-time').value),0);assert.equal(f.node('fuel-failure').hidden,true);assert.equal(built.burst.group.visible,false);
 f.change('fuel-failure-pressurePa',1000);f.change('fuel-failure-linerK',900);await f.ui.run();
 assert.match(f.node('fuel-failure').textContent,/Liner.*1,000 K > 900 K/);
 assert.doesNotMatch(f.node('fuel-failure').textContent,/Pressure difference/);
});


test('the earliest pinned failure clips both runs and clearing the pin removes its failure state',async t=>{
 const f=fixture(t);await f.start();f.change('fuel-failure-pressurePa',5);await f.ui.run();
 f.ui.nodes.view.querySelector<HTMLButtonElement>('[aria-label="Pin accepted experiment as comparison A"]')!.click();await flush();
 f.change('fuel-pressurePa',0);await f.ui.run();
 assert.match(f.node('fuel-failure').textContent,/Pinned run stopped/);
 assert.equal(Number(f.node('fuel-motion-time').max),0);assert.equal(f.builds.at(-1).burst.group.visible,true);
 f.ui.nodes.view.querySelector<HTMLButtonElement>('.fuel-comparison-bar button:nth-child(2)')!.click();await flush();
 assert.equal(f.node('fuel-failure').hidden,true);assert.ok(Number(f.node('fuel-motion-time').max)>0);
});
