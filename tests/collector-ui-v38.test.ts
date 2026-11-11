import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
import {setupCollectorAcceptance} from '../src/collector-acceptance-ui.js';
import {captureScenario,readScenario,restoreScenario,scenarioLink} from '../src/scenario-state.js';
import {setupExperience} from '../src/experience-ui.js';

function fixture(t:any,html='<div id="host"></div>'){
 const dom=new JSDOM(html,{url:'https://example.org/?level=3'}),document=dom.window.document,previous=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'document',{value:document,configurable:true});
 t.after(()=>{dom.window.close();if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');});
 return {dom,document,ui:setupCollectorAcceptance(document.getElementById('host')??document.body.appendChild(document.createElement('div')))};
}
const result=()=>({config:{radius:.5},species:[{massU:40,chargeState:1,injected:3,end:2,wall:0,source:0,remaining:1,impacts:[
 {destination:'end',position:[.1,0,2],time:1,kineticEV:1},{destination:'end',position:[.4,0,2],time:1,kineticEV:1}]}]});
test('collector is hidden for null or non-positioned models and retains live passive aperture behavior',t=>{
 const {ui,document,dom}=fixture(t),output=ui.element.querySelector('[role=status]');
 assert.equal(ui.element.hidden,true);assert.equal(output.textContent,'');ui.update(result());assert.equal(ui.element.hidden,false);assert.match(output.textContent,/2\/3 accepted/);
 const inner=document.getElementById('collector-inner-fraction') as HTMLInputElement;inner.value='.5';inner.dispatchEvent(new dom.window.Event('input'));assert.match(output.textContent,/1\/3 accepted/);
 const stale=result();delete (stale.species[0].impacts[0] as any).position;ui.update(stale);assert.equal(ui.element.hidden,true);assert.equal(output.textContent,'');
 ui.update(null);assert.equal(ui.element.hidden,true);ui.update(result());assert.equal(ui.element.hidden,false);assert.match(output.textContent,/1\/3 accepted/);
});
test('01 and Models preserve independent masks across navigation and Reset',t=>{
 const {document,dom}=fixture(t,readFileSync(new URL('../index.html',import.meta.url),'utf8'));
 for(const key of ['location','history']){
  const previous=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
  t.after(()=>{if(previous)Object.defineProperty(globalThis,key,previous);else Reflect.deleteProperty(globalThis,key);});
 }
 const experience=setupExperience({selectMode(){},invalidate(){},showView(){},showResearch(){}});
 const mask=()=>[document.getElementById('collector-inner-fraction'),document.getElementById('collector-outer-fraction')].map(node=>Number((node as HTMLInputElement).value));
 const set=(level:string,inner:number,outer:number)=>restoreScenario(document,{version:2,level,controls:{'collector-inner-fraction':inner,'collector-outer-fraction':outer}});
 const enter=(level:string)=>(document.querySelector(`[data-level="${level}"]`) as HTMLButtonElement).click();
 set('3',.25,.75);enter('1');assert.deepEqual(mask(),[0,1]);set('1',.1,.9);enter('3');assert.deepEqual(mask(),[.25,.75]);enter('1');assert.deepEqual(mask(),[.1,.9]);experience.reset();assert.deepEqual(mask(),[0,1]);
});
test('01 and Models links roundtrip exact collector surface and aperture with ordered-domain checks',t=>{
 const {ui,document}=fixture(t);ui.update(result());
 const expected={'collector-inner-fraction':.123456789,'collector-outer-fraction':.876543211,'collector-surface':'wall'};
 for(const level of ['1','3']){
  restoreScenario(document,{version:2,level,controls:expected});
  const scenario=captureScenario(document,level),read=readScenario(new URL(scenarioLink('https://example.org/',scenario)).search);
  assert.equal(read.invalid,false);assert.deepEqual(read.scenario.controls,expected);
  restoreScenario(document,{version:2,level,controls:{'collector-inner-fraction':0,'collector-outer-fraction':1,'collector-surface':'end'}});
  restoreScenario(document,read.scenario);assert.deepEqual(captureScenario(document,level).controls,expected);
  assert.throws(()=>restoreScenario(document,{version:2,level,controls:{'collector-inner-fraction':.9,'collector-outer-fraction':.1}}),/ordered collector/);
  assert.deepEqual(captureScenario(document,level).controls,expected);
 }
});
