import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createEquilibriumCalculator} from '../src/fuel-equilibrium-ui.js';
import {createFuelLearningTools} from '../src/fuel-learning-ui.js';
import {DEFAULT_FUEL_CENTRIFUGE} from '../src/fuel-centrifuge.ts';
import {equilibriumProducingCode} from '../src/equilibrium-identity.ts';
import {equilibriumIdentityPlugin} from '../scripts/equilibrium-identity-plugin.mjs';
import {equilibriumPage} from '../scripts/equilibrium-page.mjs';
import {readFileSync} from 'node:fs';

function freeze<T>(value:T):T{
 if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;
}

test('calculator identity binds its own sources and the published equation page renders math',()=>{
 const plugin=equilibriumIdentityPlugin(process.cwd()),source=plugin.transform('',`${process.cwd()}/src/equilibrium-identity.ts`)!;
 assert.match(source,/sourceHash/);assert.match(source,/fuel-equilibrium.ts/);assert.match(source,/array-shape.ts/);assert.doesNotMatch(source,/workerProducingCode/);
 const page=equilibriumPage(readFileSync('docs/EQUILIBRIUM-COMPOSITION.md','utf8'));assert.match(page,/class="katex/);assert.doesNotMatch(page,/```math|katex-error/);
 assert.match(page,/try=equilibrium/);assert.match(page,/do not give continuous extraction yields/);
});
function accepted(){
 return freeze({config:{...DEFAULT_FUEL_CENTRIFUGE},samples:[{neutralRadS:6000}]});
}
function fixture(t:any,learning=false){
 const {window}=new JSDOM('<main></main><input id="physical-current" value="0.03"><input id="timeline" value="0.4">',{url:'https://example.org'}),doc=window.document;
 const oldDocument=Object.getOwnPropertyDescriptor(globalThis,'document'),oldWorker=Object.getOwnPropertyDescriptor(globalThis,'Worker');
 Object.defineProperty(globalThis,'document',{value:doc,configurable:true});
 let comparisons=0,workers=0;Object.defineProperty(globalThis,'Worker',{configurable:true,value:class {constructor(){workers++;throw new Error('Independent calculator must not launch a worker.');}}});
 const tools=learning?createFuelLearningTools({document:doc,host:doc.querySelector('main'),onCompare:()=>comparisons++})
  :createEquilibriumCalculator({document:doc,host:doc.querySelector('main')});
 const node=(id:string)=>{const n=doc.getElementById(id);assert.ok(n,id);return n;};
 const panel=node('fuel-equilibrium-calculator') as HTMLDetailsElement;
 const input=(key:string)=>node(`equilibrium-${key}`) as HTMLInputElement;
 const set=(key:string,value:string|number)=>{const n=input(key);n.value=String(value);n.dispatchEvent(new window.Event('input',{bubbles:true}));};
 const buttons=()=>[...panel.querySelectorAll('button')] as HTMLButtonElement[];
 const sample=()=>buttons().find(n=>n.textContent==='Use sampled state')!;
 const save=()=>buttons().find(n=>n.textContent==='Export JSON')!;
 const metrics=()=>Object.fromEntries([...node('equilibrium-metrics').querySelectorAll('dt')].map(n=>[n.textContent,n.nextElementSibling?.textContent]));
 const open=()=>{panel.open=true;panel.dispatchEvent(new window.Event('toggle'));};
 const exports:any[]=[],revoked:string[]=[],downloads:any[]=[];
 class CaptureBlob {parts:unknown[];type:string;constructor(parts:unknown[],options:{type:string}){this.parts=parts;this.type=options.type;}}
 Object.defineProperty(window,'Blob',{configurable:true,value:CaptureBlob});
 Object.defineProperty(window.URL,'createObjectURL',{configurable:true,value:(blob:CaptureBlob)=>{exports.push(JSON.parse(blob.parts.join('')));return `blob:equilibrium-${exports.length}`;}});
 Object.defineProperty(window.URL,'revokeObjectURL',{configurable:true,value:(url:string)=>revoked.push(url)});
 window.HTMLAnchorElement.prototype.click=function(){downloads.push({href:this.href,download:this.download});};
 let disposed=false;
 function dispose(){if(!disposed){tools.dispose();disposed=true;}}
 t.after(()=>{dispose();window.close();if(oldDocument)Object.defineProperty(globalThis,'document',oldDocument);else Reflect.deleteProperty(globalThis,'document');
  if(oldWorker)Object.defineProperty(globalThis,'Worker',oldWorker);else Reflect.deleteProperty(globalThis,'Worker');});
 return {doc,panel,tools,node,input,set,sample,save,metrics,open,exports,revoked,downloads,dispose,
  get comparisons(){return comparisons;},get workers(){return workers;}};
}

test('prescribed calculator is lazy and can run before any accepted trajectory',t=>{
 const f=fixture(t);
 assert.equal(f.node('equilibrium-pair').getAttribute('aria-label'),'Mixture','option text must not enter the accessible field name');
 assert.equal(f.panel.open,false);assert.equal(f.panel.querySelectorAll('svg').length,0);
 assert.equal(f.sample().disabled,true);assert.equal(f.save().disabled,true);
 f.open();assert.equal(f.panel.querySelectorAll('svg').length,2);assert.equal(f.save().disabled,false);
 assert.match(f.panel.textContent!,/3D timeline does not change these inputs/);
 assert.match(f.panel.querySelector('p')!.textContent!,/Ideal neutral-gas reference/);
 assert.equal(f.workers,0);
});

test('sampled cuts preserve their exact accepted radius and zero-speed recovery in exports',t=>{
 const f=fixture(t);f.open();
 for(const cutFraction of [.333,1-1e-8]){
  const r=freeze({...accepted(),config:{...DEFAULT_FUEL_CENTRIFUGE,cutFraction}});
  f.tools.update(r,{neutralRadS:0});f.sample().click();
  assert.equal(Number(f.input('cutFraction').value),cutFraction);
  assert.equal(f.save().disabled,false,'native step mismatch must not invalidate a valid imported cut');
  f.save().click();const result=f.exports.at(-1).result;
  assert.equal(result.inputs.cutFraction,cutFraction);assert.equal(result.selected.inner.lightRecovery,cutFraction**2);
  assert.ok(result.selected.outer.heavyRecovery>0,'a thin nonempty outer cut must not be rounded away');
 }
});

test('manual prescribed inputs and output survive accepted redraws and pending work without physical side effects',t=>{
 const f=fixture(t,true),r=accepted(),state=freeze({neutralRadS:7000,timeS:.4,thermal:{gasK:650}}),before=JSON.stringify({r,state});
 f.tools.update(r,state,'composition');f.open();f.set('edgeSpeedMS',1200);f.set('temperatureK',700);f.set('cutFraction',.35);
 const previous=f.node('equilibrium-metrics').textContent;
 f.tools.update(r,{neutralRadS:9000,timeS:.6},'spin');
 assert.equal(f.input('edgeSpeedMS').value,'1200');assert.equal(f.input('temperatureK').value,'700');assert.equal(f.input('cutFraction').value,'0.35');
 assert.equal(f.node('equilibrium-metrics').textContent,previous);
 f.tools.setPending();assert.equal(f.sample().disabled,true);f.sample().click();
 assert.equal(f.node('equilibrium-metrics').textContent,previous);assert.equal(f.save().disabled,false);
 f.set('edgeSpeedMS',1300);assert.equal(f.save().disabled,false,'prescribed calculations remain usable during unrelated work');
 assert.equal(f.comparisons,0);assert.equal(f.workers,0);
 assert.equal((f.node('physical-current') as HTMLInputElement).value,'0.03');assert.equal((f.node('timeline') as HTMLInputElement).value,'0.4');
 assert.equal(JSON.stringify({r,state}),before);
});

test('explicit sampled import uses accepted speed and mean temperature but initial PVT inventory',t=>{
 const f=fixture(t),r=accepted(),state=freeze({neutralRadS:-7000,timeS:.4,thermal:{gasK:800,gas:{temperatureK:[600,1000]}}}),before=JSON.stringify({r,state});
 f.tools.update(r,state,'composition');f.open();f.sample().click();
 assert.equal(Number(f.input('edgeSpeedMS').value),7000*r.config.radiusM);
 assert.equal(Number(f.input('temperatureK').value),800);
 const inventory=r.config.pressurePa*Math.PI*r.config.radiusM**2*r.config.lengthM/(1.380649e-23*r.config.gasK);
 assert.equal(Number(f.input('totalParticles').value),inventory);
 assert.equal(Number(f.input('lightFraction').value),r.config.lightFraction);
 assert.match(f.node('equilibrium-status').textContent!,/this reference uses the mean gas temperature/);
 assert.equal(JSON.stringify({r,state}),before);
 f.tools.setPending();f.set('edgeSpeedMS',900);f.sample().dispatchEvent(new f.doc.defaultView!.Event('click'));
 assert.equal(f.input('edgeSpeedMS').value,'900','handler itself rejects stale imports, independently of disabled-button behavior');
});

test('invalid input and out-of-screen scenarios clear all results and prevent stale export',t=>{
 const f=fixture(t);f.open();f.save().click();assert.equal(f.exports.length,1);
 for(const [key,value,pattern]of [
  ['temperatureK','',/valid values/],['edgeSpeedMS',200000,/screened numerical domain/],['temperaturePercent',50,/Temperature.*\[100, 10000\]/],
 ] as const){
  f.set('edgeSpeedMS',1000);f.set('temperatureK',100);f.set('temperaturePercent',0);
  f.set(key,value);assert.equal(f.save().disabled,true);assert.equal(f.panel.querySelectorAll('svg').length,0);
  assert.equal(f.node('equilibrium-metrics').children.length,0);assert.match(f.node('equilibrium-status').textContent!,pattern);
  const count=f.exports.length;f.save().dispatchEvent(new f.doc.defaultView!.Event('click'));assert.equal(f.exports.length,count);
 }
 assert.deepEqual(f.revoked,['blob:equilibrium-1']);
 f.set('temperaturePercent',0);f.set('temperatureK',500);assert.equal(f.save().disabled,false);assert.equal(f.panel.querySelectorAll('svg').length,2);
});

test('empty cuts and absent species show undefined values, preserve plot gaps and remain finite',t=>{
 const f=fixture(t);f.open();f.set('cutFraction',0);
 assert.equal(f.metrics()['⁶Li inner purity'],'—');assert.equal(f.metrics()['⁶Li recovery'],'0%');assert.equal(f.metrics()['Inner particles'],'0');
 f.set('cutFraction',1);assert.equal(f.metrics()['⁷Li outer purity'],'—');assert.equal(f.metrics()['⁷Li recovery'],'0%');assert.equal(f.metrics()['⁶Li recovery'],'100%');
 for(const fraction of [0,1]){
  f.set('cutFraction',.5);f.set('lightFraction',fraction);
  assert.equal(f.metrics()[fraction===0?'⁶Li recovery':'⁷Li recovery'],'—');
  const collection=f.panel.querySelectorAll('svg')[1],series=collection.querySelectorAll('path[stroke-width="2"][stroke-opacity]');
  assert.equal(series.length,4);assert.equal(series[fraction===0?1:3].getAttribute('d'),'','undefined recovery is an empty path, not a fabricated zero curve');
  assert.match(collection.nextElementSibling!.textContent!,/—/);
  for(const path of f.panel.querySelectorAll('path'))assert.doesNotMatch(path.getAttribute('d')??'',/NaN|Infinity/);
 }
});

test('export retains reproducible inputs, model, scenario cases, selected counts and releases download URLs',t=>{
 const f=fixture(t);f.open();f.set('speedPercent',10);f.set('temperaturePercent',20);f.set('cutFraction',.4);f.save().click();
 const data=f.exports[0];assert.equal(data.schemaVersion,1);assert.equal(data.pair,'lithium');
 // The source module is an explicit null placeholder; the deployment build injects its identity.
 assert.deepEqual(data.producingCode,equilibriumProducingCode);assert.equal(data.result.model.version,'neutral-cylinder-equilibrium-v1');
 assert.match(data.units,/number fractions/);assert.match(data.result.model.scope,/closed cylinder/);
 assert.equal(data.result.inputs.cutFraction,.4);assert.equal(data.result.inputs.edgeSpeedMS,1000);assert.equal(data.result.inputs.temperatureK,500);
 assert.equal(data.result.selected.radiusFraction,.4);assert.ok(data.result.profiles.length>200);
 assert.ok(data.result.selected.inner.totalParticles>0);assert.ok(data.result.selected.outer.totalParticles>0);
 assert.deepEqual(data.result.inputs.massesU,[6.0151228874,7.0160034366]);
 assert.equal(data.inputScenarios.cases.length,4);assert.equal(data.inputScenarios.speedPercent,10);assert.equal(data.inputScenarios.temperaturePercent,20);
 assert.deepEqual(data.inputScenarios.cases.map((c:any)=>[c.inputs.edgeSpeedMS,c.inputs.temperatureK]),[[900,400],[900,600],[1100,400],[1100,600]]);
 assert.match(data.scenarioScope,/not guaranteed bounds or a confidence interval/);
 assert.deepEqual(f.downloads,[{href:'blob:equilibrium-1',download:'mass-spinner-equilibrium.json'}]);
 f.set('cutFraction',.6);assert.deepEqual(f.revoked,['blob:equilibrium-1']);f.save().click();f.save().click();
 assert.deepEqual(f.revoked,['blob:equilibrium-1','blob:equilibrium-2']);
 f.dispose();assert.deepEqual(f.revoked,['blob:equilibrium-1','blob:equilibrium-2','blob:equilibrium-3']);assert.equal(f.doc.getElementById('fuel-equilibrium-calculator'),null);
});
