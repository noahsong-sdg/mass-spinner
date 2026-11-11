import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
import {setupHydrogenTracer} from '../src/hydrogen-tracer-ui.js';
import {setupExperience} from '../src/experience-ui.js';
import {captureScenario,restoreScenario,scenarioLink,readScenario} from '../src/scenario-state.js';

const exact={'h1-energy':1.23456789,'h1-field':-.0031415926,'h1-pitch':37.25,'h1-neutral-density':9.87654321e17,'h1-radius':.23456789,'h1-length':1.23456789,'h1-particles':16,'h1-seed':314159};
function fixture(t:any){
 const dom=new JSDOM(readFileSync(new URL('../index.html',import.meta.url),'utf8'),{url:'https://example.org/?level=3'}),document=dom.window.document;
 for(const [key,value]of Object.entries({document,location:dom.window.location,history:dom.window.history})){
  const previous=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{value,configurable:true});
  t.after(()=>{if(previous)Object.defineProperty(globalThis,key,previous);else Reflect.deleteProperty(globalThis,key);});
 }
 t.after(()=>dom.window.close());
 const tracer=setupHydrogenTracer(document.body.appendChild(document.createElement('div')));
 const experience=setupExperience({selectMode(){},invalidate(){},showView(){},showResearch(){}});
 const read=()=>Object.fromEntries(Object.keys(exact).map(id=>[id,Number((document.getElementById(id) as HTMLInputElement).value)]));
 return {dom,document,tracer,experience,read};
}
test('actual03 tracer controls share exact values and restore selected model atomically before native inputs',t=>{
 const {document,tracer,experience,read}=fixture(t),system=document.getElementById('system') as HTMLSelectElement;
 system.value='icr';restoreScenario(document,{version:2,level:'3',controls:exact});
 const shared=readScenario(new URL(scenarioLink('https://example.org/',experience.capture())).search);assert.equal(shared.invalid,false);
 experience.reset();assert.equal(system.value,'centrifuge');
 const observations:any[]=[];
 for(const id of [...Object.keys(exact),'field'])document.getElementById(id)!.addEventListener('input',()=>observations.push({model:system.value,controls:read()}));
 assert.equal(experience.restore(shared.scenario),true);assert.equal(observations.length,9,'intermediate saved context must not emit input events');
 for(const observed of observations){assert.equal(observed.model,'icr');assert.deepEqual(observed.controls,exact);}
 assert.deepEqual(read(),exact);assert.equal(tracer.element.open,false);assert.equal(tracer.result,undefined,'closed configuration restoration does not fabricate a tracer solve');
});
test('tracer reset uses pre-Experience mounted defaults and invalid integer/fit domains leave every value intact',t=>{
 const {document,experience,read}=fixture(t),defaults=read();restoreScenario(document,{version:2,level:'3',controls:exact});
 for(const controls of [{'h1-energy':20.01},{'h1-neutral-density':-1},{'h1-particles':16.5},{'h1-seed':42.5},{'h1-seed':4294967296}]){
  assert.throws(()=>restoreScenario(document,{version:2,level:'3',controls}));assert.deepEqual(read(),exact);
 }
 const invalid=new URLSearchParams({level:'1',v:'2',scenario:JSON.stringify({version:2,level:'1',controls:{'h1-energy':1}})});assert.equal(readScenario('?'+invalid).invalid,true);
 experience.reset();assert.deepEqual(read(),defaults);assert.equal(captureScenario(document,'3').controls['h1-seed'],42);
});
