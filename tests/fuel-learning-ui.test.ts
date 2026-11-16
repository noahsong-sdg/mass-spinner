import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.ts';
import {createFuelLearningTools} from '../src/fuel-learning-ui.js';

// These are view/coverage metadata fixtures, not generated or qualified trajectories.
function result(overrides:any={}){
 const r=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,...overrides});
 return {...r,transport:{cells:64,steps:512,operation:{schemaVersion:1,initialCurrentA:r.config.currentA,events:[],thermal:{enabled:false}}}};
}
function freeze<T>(value:T):T{
 if(value&&typeof value==='object'){Object.values(value).forEach(freeze);Object.freeze(value);}
 return value;
}
function fixture(t:any){
 const {window}=new JSDOM('<main></main>',{url:'https://example.org'}),doc=window.document;
 const old=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:doc,configurable:true});
 let comparisons=0;
 const tools=createFuelLearningTools({document:doc,host:doc.querySelector('main'),onCompare:()=>comparisons++});
 const node=(id:string)=>{const value=doc.getElementById(id);assert.ok(value,id);return value;};
 const buttons=()=>[...doc.querySelectorAll('.fuel-learning-actions button')] as HTMLButtonElement[];
 t.after(()=>{tools.dispose();window.close();if(old)Object.defineProperty(globalThis,'document',old);else Reflect.deleteProperty(globalThis,'document');});
 return {doc,tools,node,buttons,get comparisons(){return comparisons;}};
}

test('learning controls start pending without calculations, plots or a qualification claim',t=>{
 const f=fixture(t);
 assert.equal(f.doc.querySelectorAll('svg').length,0);assert.equal(f.comparisons,0);
 assert.equal(f.node('fuel-input-coverage').dataset.match,'pending');
 assert.match(f.node('fuel-result-scope').textContent!,/Run the simulator/);
 for(const button of f.buttons()){assert.equal(button.disabled,true);button.click();}
 assert.equal(f.comparisons,0);
 assert.equal(f.node('fuel-input-coverage').querySelector('a')!.getAttribute('href'),'/qualification');
 assert.match(f.node('fuel-input-coverage').textContent!,/Three input nodes, not a slider range/);
});

test('coverage identifies only explicit historical input nodes and retains the independent-refinement limitation',t=>{
 const f=fixture(t);
 for(const currentA of [.015,.03,.06]){
  f.tools.update(result({currentA}),{},'composition');
  assert.equal(f.node('fuel-input-coverage').dataset.match,'true');
  assert.match(f.node('fuel-input-coverage').querySelector('summary')!.textContent!,/Matches screened inputs/);
  assert.match(f.node('fuel-input-coverage').textContent!,/this run has not been independently refined/);
  assert.match(f.node('fuel-input-coverage').textContent!,/No experimental accuracy claim/);
 }
 const candidates:any[]=[result({currentA:.04}),result({gasK:501}),result()];
 candidates[2].transport.cells=256;
 const heated:any=result();heated.transport.operation.thermal.enabled=true;candidates.push(heated);
 const switched:any=result();switched.transport.operation.events=[{timeS:.5,currentA:.06}];candidates.push(switched);
 for(const candidate of candidates){
  f.tools.update(candidate,{},'composition');
  assert.equal(f.node('fuel-input-coverage').dataset.match,'false');
  assert.match(f.node('fuel-input-coverage').querySelector('summary')!.textContent!,/Exploratory inputs/);
  assert.match(f.node('fuel-input-coverage').textContent!,/numerical accuracy for these settings is unqualified/);
 }
});

test('legacy results without operating metadata never inherit historical coverage from matching configuration values',t=>{
 const f=fixture(t),legacy:any=result();delete legacy.transport.operation;
 for(const candidate of [legacy,simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE})]){
  f.tools.update(candidate,{},'composition');
  assert.equal(f.node('fuel-input-coverage').dataset.match,'false');
  assert.doesNotMatch(f.node('fuel-input-coverage').querySelector('summary')!.textContent!,/Matches screened/);
  assert.match(f.node('fuel-input-coverage').textContent!,/No experimental accuracy claim/);
 }
});

test('local composition, density and inventory cuts distinguish evolving samples from equilibrium references',t=>{
 const f=fixture(t),r:any=result(),sample={neutralRadS:7000,timeS:.4,lightMass:[.2,.8],heavyMass:[.8,.2]};
 for(const topic of ['composition','profile','cut']){
  f.tools.update(r,sample,topic);
  assert.match(f.node('fuel-result-scope').textContent!,/Evolving trajectory/);
  assert.match(f.node('fuel-result-scope').textContent!,/Temperature fixed.*500 K/);
  assert.match(f.node('fuel-result-scope').textContent!,/Closed inventory.*no extraction/);
  f.tools.update(r,{},topic);
  assert.match(f.node('fuel-result-scope').textContent!,/Equilibrium.*reference/);
  assert.doesNotMatch(f.node('fuel-result-scope').textContent!,/Temperature evolves/);
 }
 r.transport.operation.thermal.enabled=true;
 f.tools.update(r,{...sample,thermal:{gasK:650}},'composition');
 assert.match(f.node('fuel-result-scope').textContent!,/Temperature evolves/);
});

test('thermal endpoint profiles retain trajectory and evolving-temperature scope even outside animated gas modes',t=>{
 const f=fixture(t),r:any=result();r.transport.operation.thermal.enabled=true;
 for(const topic of ['thermalProfile','gasEnergy','gasPressure']){
  // An equilibrium/flow display state has no cell inventories, but these plots
  // still read the endpoint of the accepted thermal trajectory.
  f.tools.update(r,{neutralRadS:9000,timeS:1},topic);
  assert.match(f.node('fuel-result-scope').textContent!,/Evolving trajectory/);
  assert.match(f.node('fuel-result-scope').textContent!,/Temperature evolves/);
  assert.doesNotMatch(f.node('fuel-result-scope').textContent!,/Temperature fixed/);
 }
});

test('time-history and scenario labels follow the plotted calculation rather than the visual gas state',t=>{
 const f=fixture(t),r:any=result();r.transport.operation.thermal.enabled=true;
 for(const topic of ['separation','spin','heat','thermal','momentum','inertia']){
  f.tools.update(r,{},topic);
  assert.match(f.node('fuel-result-scope').textContent!,/Evolving trajectory/);
  assert.match(f.node('fuel-result-scope').textContent!,/Temperature evolves/);
 }
 f.tools.update(r,{},'pump');assert.match(f.node('fuel-result-scope').textContent!,/Conditional flow reference/);
 assert.doesNotMatch(f.node('fuel-result-scope').textContent!,/Closed inventory/);
 f.tools.update(r,{},'inventory');assert.match(f.node('fuel-result-scope').textContent!,/Fuel-loop scenario/);
 assert.doesNotMatch(f.node('fuel-result-scope').textContent!,/Closed inventory/);
});

test('one-click comparisons use accepted data, invoke pause deliberately and never alter inputs or sampled state',t=>{
 const f=fixture(t),r=freeze(result()),sample=freeze({neutralRadS:7000,timeS:.4,thermal:{gasK:650}});
 const before=JSON.stringify({r,sample});f.tools.update(r,sample,'composition');
 for(const [index,key]of ['temperature','rotation','collection'].entries()){
  const button=f.node(`fuel-compare-${key}`) as HTMLButtonElement;assert.equal(button.disabled,false);button.click();
  assert.equal(f.comparisons,index+1);assert.equal(button.getAttribute('aria-pressed'),'true');
  assert.equal(f.buttons().filter(b=>b.getAttribute('aria-pressed')==='true').length,1);
  assert.equal(f.node('fuel-learning-comparisons').querySelectorAll('svg').length,1);
  assert.match(f.node('fuel-learning-comparisons').textContent!,/Isothermal equilibrium references/);
  assert.match(f.node('fuel-learning-comparisons').textContent!,/no drive, heating or extraction prediction/);
  for(const path of f.node('fuel-learning-comparisons').querySelectorAll('path'))assert.doesNotMatch(path.getAttribute('d')??'',/NaN|Infinity/);
  assert.equal(JSON.stringify({r,sample}),before);
 }
});

test('pending or failed work clears comparison output, disables actions and cannot preserve a stale selected comparison',t=>{
 const f=fixture(t);f.tools.update(result(),{neutralRadS:7000},'composition');
 (f.node('fuel-compare-temperature') as HTMLButtonElement).click();assert.equal(f.comparisons,1);
 for(const message of ['Updating · previous accepted result','No accepted result']){
  f.tools.setPending(message);
  assert.equal(f.node('fuel-result-scope').textContent,message);
  assert.equal(f.node('fuel-input-coverage').dataset.match,'pending');
  assert.equal(f.doc.querySelectorAll('svg').length,0);
  for(const button of f.buttons()){assert.equal(button.disabled,true);assert.equal(button.getAttribute('aria-pressed'),'false');button.click();}
  assert.equal(f.comparisons,1);
 }
 f.tools.update(result({currentA:.04}),{neutralRadS:9000},'composition');
 assert.equal(f.node('fuel-input-coverage').dataset.match,'false');
 assert.equal(f.doc.querySelectorAll('svg').length,0,'a new accepted run must not resurrect a cleared comparison');
 for(const button of f.buttons())assert.equal(button.disabled,false);
});
