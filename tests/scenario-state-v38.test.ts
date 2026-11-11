import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
import {captureScenario,readScenario,restoreScenario,scenarioLink} from '../src/scenario-state.js';
import {createBaselineStore} from '../src/baseline-state.js';
import {setupExperience} from '../src/experience-ui.js';

const fixture=()=>new JSDOM(`<select id="system"><option value="centrifuge">C</option><option value="doublewell-dynamics">D</option></select><input id="field" type="range" min=".04" max=".25" step=".01" value=".1"><input id="mass-b" type="number" min="20" max="200" value="84"><select id="dw-collisionMethod"><option value="fixed">F</option><option value="axisymmetric">A</option></select><input id="dw-seed" type="number" min="0" max="4294967295" value="42"><input id="fusion-beam-enabled" type="checkbox" checked><input id="fusion-beamEnergyKeV" type="range" min="20" max="500" step="5" value="100"><input id="coupled-time" type="range" min="0" max="0" disabled><select id="replay-case" disabled><option>Loading</option></select><input id="replay-time" type="range" min="0" max="20" disabled>`);
test('v2 share preserves exact control coordinates, disabled hidden choices and model numerics',()=>{
 const dom=fixture(),d=dom.window.document;
 (d.getElementById('field') as HTMLInputElement).value='.123456';
 (d.getElementById('dw-collisionMethod') as HTMLSelectElement).value='axisymmetric';
 (d.getElementById('dw-seed') as HTMLInputElement).value='314159';
 const s=captureScenario(d,'3'),url=scenarioLink('https://example.org/?private=old#discard',s),decoded=readScenario(new URL(url).search);
 assert.deepEqual(decoded,{scenario:s,invalid:false});assert.equal(s.controls.field,.123456);
 assert.equal(new URL(url).hash,'');assert.equal(new URL(url).searchParams.has('private'),false);
 (d.getElementById('dw-seed') as HTMLInputElement).value='1';restoreScenario(d,s);
 assert.equal((d.getElementById('dw-seed') as HTMLInputElement).value,'314159');
});
test('fresh linked linear and log controls retain off-grid coordinates and continuous step',()=>{
 const dom=fixture(),d=dom.window.document,log=d.createElement('input');
 Object.assign(log,{id:'fusion-beamCurrentA',type:'range',min:'-5',max:'0',step:'.1',value:'-2'});d.body.append(log);
 const scenario={version:2,level:'2',controls:{'fusion-beamEnergyKeV':123.456,'fusion-beamCurrentA':Math.log10(.00314159)}};
 const decoded=readScenario(new URL(scenarioLink('https://example.org/',scenario)).search).scenario;
 restoreScenario(d,decoded);
 const linear=d.getElementById('fusion-beamEnergyKeV') as HTMLInputElement;
 assert.equal(Number(linear.value),123.456);assert.equal(linear.step,'any');assert.equal(log.step,'any');assert.equal(Number(log.value),Math.log10(.00314159));
});
test('unknown ids, cross-playground ids, stale versions and oversized links fail closed',()=>{
 const base={version:2,level:'2',controls:{'fusion-beam-enabled':false}};
 for(const invalid of [{...base,version:3},{...base,level:'toString'},{...base,controls:1},{...base,controls:{'field':.1}},{...base,controls:{'fusion-injected-script':'bad'}},{...base,controls:{'fusion-beamEnergyKeV':{}}}]){
  const search=new URLSearchParams({level:'2',v:'2',scenario:JSON.stringify(invalid)}).toString();assert.equal(readScenario('?'+search).invalid,true);
 }
 assert.equal(readScenario('?v=1&scenario={}').invalid,true);
 assert.equal(readScenario('?v=2&level=2&scenario='+ 'a'.repeat(25000)).invalid,true);
 assert.deepEqual(readScenario('?v=1&field=.15'),{scenario:null,invalid:false});
});
test('restore validates every current domain before mutation and uses coherent native events',()=>{
 const {window}=fixture(),d=window.document,field=d.getElementById('field') as HTMLInputElement;
 let notifications=0;field.addEventListener('input',()=>{notifications++;assert.equal((d.getElementById('mass-b') as HTMLInputElement).value,'100');});
 restoreScenario(d,{version:2,level:'3',controls:{field:.13579,'mass-b':100}});
 assert.equal(notifications,1);assert.equal(Number(field.value),.13579);
 assert.throws(()=>restoreScenario(d,{version:2,level:'3',controls:{field:.2,'mass-b':-1}}));assert.equal(Number(field.value),.13579);
 assert.throws(()=>restoreScenario(d,{version:2,level:'2',controls:{'fusion-beam-enabled':'false'}}));
 assert.throws(()=>restoreScenario(d,{version:2,level:'3',controls:{'dw-collisionMethod':'obsolete'}}));
});
test('saved target time applies only to new accepted result; cancellation removes pending selection',()=>{
 const {window}=fixture(),d=window.document,time=d.getElementById('coupled-time') as HTMLInputElement;
 let selected=-1;time.addEventListener('input',()=>selected=Number(time.value));
 const cancel=restoreScenario(d,{version:2,level:'2',controls:{'coupled-time':7}});
 assert.equal(selected,-1);time.max='10';time.disabled=false;time.dispatchEvent(new window.Event('coupled-accepted'));assert.equal(selected,7);
 const cancel2=restoreScenario(d,{version:2,level:'2',controls:{'coupled-time':4}});cancel2();time.value='0';time.dispatchEvent(new window.Event('coupled-accepted'));assert.equal(selected,7);cancel();
});
test('linked material mode and density notify before source/target listeners',()=>{
 const {window}=fixture(),d=window.document;
 const create=(id:string,tag:string,markup:string)=>{const node=d.createElement(tag);node.id=id;node.innerHTML=markup;d.body.append(node);return node;};
 const mode=create('material-geometry-mode','select','<option value="independent">I</option><option value="number-density">N</option>') as HTMLSelectElement;
 const stopping=create('fusion-stopping-model','select','<option value="linear">L</option><option value="geant4-bragg">G</option>') as HTMLSelectElement;
 const density=create('material-number-density','input','') as HTMLInputElement;Object.assign(density,{type:'number',min:'1',value:'1e27'});
 const order:string[]=[];for(const node of [mode,density,stopping,d.getElementById('fusion-beamEnergyKeV')!])node.addEventListener(node.tagName==='SELECT'?'change':'input',()=>order.push(node.id));
 restoreScenario(d,{version:2,level:'2',controls:{'fusion-beamEnergyKeV':123,'material-geometry-mode':'number-density','material-number-density':1e28,'fusion-stopping-model':'geant4-bragg'}});
 assert.deepEqual(order,['material-geometry-mode','material-number-density','fusion-stopping-model','fusion-beamEnergyKeV']);
});
test('research hydrates case before validating saved time against that recording',async()=>{
 const {window}=fixture(),d=window.document,choice=d.getElementById('replay-case') as HTMLSelectElement,time=d.getElementById('replay-time') as HTMLInputElement;
 choice.addEventListener('change',()=>{time.max=choice.value==='short'?'2':'8';time.value='0';});
 const errors:string[]=[];
 restoreScenario(d,{version:2,level:'4',controls:{'replay-case':'long','replay-time':6}},{onDeferredError:(e:string)=>errors.push(e)});
 choice.innerHTML='<option value="short">short</option><option value="long">long</option>';choice.disabled=false;time.disabled=false;
 await new Promise(resolve=>window.queueMicrotask(resolve));assert.equal(choice.value,'long');assert.equal(time.value,'6');assert.deepEqual(errors,[]);
 choice.value='short';choice.dispatchEvent(new window.Event('change'));assert.equal(time.max,'2');
 restoreScenario(d,{version:2,level:'4',controls:{'replay-time':7,'replay-case':'long'}});
 assert.equal(choice.value,'long');assert.equal(time.value,'7','loaded case change must not reset the shared time');
});
test('baselines retain immutable seed/configuration/result and reject incompatible axes or observables',()=>{
 const store=createBaselineStore(),value={scenario:{version:2,level:'3',controls:{'dw-seed':42}},identity:{model:'doublewell-dynamics',observable:'outlet-count',xUnit:'s',yUnit:'fraction',version:1},curves:[{label:'A',x:[0,1],y:[0,.2],xLabel:'Time (s)',yLabel:'Count fraction'}]};
 const pin=store.pin(value);value.curves[0].y[1]=1;value.scenario.controls['dw-seed']=77;
 assert.equal(pin.curves[0].y[1],.2);assert.equal(store.scenario().controls['dw-seed'],42);assert.equal(Object.isFrozen(pin.curves[0].y),true);
 assert.equal(store.compare(value).compatible,true);
 assert.equal(store.compare({...value,identity:{...value.identity,observable:'inventory'}}).compatible,false);
 assert.equal(store.compare({...value,curves:[{...value.curves[0],yLabel:'Temperature (K)'}]}).compatible,false);
 assert.throws(()=>store.pin({...value,curves:[{...value.curves[0],x:[NaN,1]}]}));store.clear();assert.equal(store.read(),null);
 assert.throws(()=>store.pin({...value,curves:[{...value.curves[0],x:Array(2)}]}));
});
test('Models retains selected mechanism and source across 01; explicit reset restores initial model',()=>{
 const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'),{url:'https://example.org/?level=3'}),d=dom.window.document;
 const saved={document:globalThis.document,location:globalThis.location,history:globalThis.history};
 Object.assign(globalThis,{document:d,location:dom.window.location,history:dom.window.history});
 try{
  const system=d.getElementById('system') as HTMLSelectElement;
  const ui=setupExperience({selectMode(){},invalidate(){},showView(){},showResearch(){}});
  system.value='icr';(d.getElementById('mass-a') as HTMLInputElement).value='190';(d.getElementById('random-seed') as HTMLInputElement).value='987';
  (d.querySelector('[data-level="1"]') as HTMLButtonElement).click();assert.equal((d.getElementById('mass-a') as HTMLInputElement).value,'40');
  (d.querySelector('[data-level="3"]') as HTMLButtonElement).click();assert.equal(system.value,'icr');assert.equal((d.getElementById('mass-a') as HTMLInputElement).value,'190');assert.equal((d.getElementById('random-seed') as HTMLInputElement).value,'987');
  assert.equal(ui.restore({version:2,level:'3',controls:{system:'centrifuge',field:9}}),false);assert.equal(system.value,'icr');assert.equal((d.getElementById('mass-a') as HTMLInputElement).value,'190');
  (d.getElementById('mass-a') as HTMLInputElement).value='';(d.querySelector('[data-level="1"]') as HTMLButtonElement).click();(d.querySelector('[data-level="3"]') as HTMLButtonElement).click();assert.equal((d.getElementById('mass-a') as HTMLInputElement).value,'');assert.throws(()=>ui.capture());
  (d.getElementById('mass-a') as HTMLInputElement).value='190';
  assert.equal((d.getElementById('share-playground') as HTMLButtonElement).hidden,false);ui.reset();assert.equal(system.value,'centrifuge');assert.equal((d.getElementById('mass-a') as HTMLInputElement).value,'40');
 }finally{Object.assign(globalThis,saved);dom.window.close();}
});
