import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {guideExperiments} from '../src/guide-topics.js';
import {captureGuideDefaults,guideExample,type GuideExampleKey} from '../src/guide-examples.js';
import {validateScenario,type Scenario} from '../src/scenario-state.js';

const defaults:Scenario={version:2,level:'2',controls:{'fuel-currentA':.03,'fuel-durationS':1,'fuel-gasK':500,'fuel-application':'enrichment','fuel-pair':'lithium','fuel-thermal-enabled':false,'fuel-thermal-model':'lumped','fuel-thermal-gasModel':'lumped','fuel-thermal-resolution':'interactive','fuel-thermal-coolantK':500,'fuel-failure-pressurePa':1000}};

test('all twelve examples are validated complete copies of the same default input set',()=>{
 const before=structuredClone(defaults);
 for(const key of Object.keys(guideExperiments) as GuideExampleKey[]){
  const scenario=guideExample(key,defaults);validateScenario(scenario);
  for(const id of Object.keys(defaults.controls))assert.ok(Object.hasOwn(scenario.controls,id),`${key}: ${id}`);
  assert.equal(scenario.controls['fuel-gasK'],500);assert.equal(scenario.controls['fuel-failure-pressurePa'],1000);
  if(key==='beamSource'||key==='beamTarget'){
   assert.equal(scenario.version,2);assert.equal(scenario.controls['marathon-apparatus'],'source');assert.equal(scenario.controls['fusion-stopping-model'],'geant4-bragg');
  }else{
   assert.equal(scenario.version,3);if(scenario.version===3)assert.deepEqual(scenario.fuelRun,{initialCurrentA:.03,events:[],mode:'transport',timeS:0});
  }
  scenario.controls['fuel-gasK']=999;
 }
 assert.deepEqual(defaults,before);
 assert.equal(guideExample('spatialHeatExperiment',defaults).controls['fuel-thermal-enabled'],true);
 assert.equal(guideExample('spatialHeatExperiment',defaults).controls['fuel-thermal-gasModel'],'spatial');
 assert.equal(guideExample('pumpingExperiment',defaults).controls['fuel-application'],'pump');
});

test('default capture includes inactive thermal inputs needed by the spatial example',()=>{
 const dom=new JSDOM('<input id="fuel-currentA" type="number" value="0.03"><input id="fuel-durationS" type="number" value="1"><input id="fuel-thermal-thicknessMm" type="number" value="1" disabled><input id="fuel-thermal-gasConductivityWMK" type="number" value="0.1" disabled><select id="fuel-thermal-resolution" disabled><option value="interactive">Interactive</option></select>');
 try{
  const snapshot=captureGuideDefaults(dom.window.document);
  assert.equal(snapshot.controls['fuel-thermal-thicknessMm'],1);assert.equal(snapshot.controls['fuel-thermal-gasConductivityWMK'],.1);assert.equal(snapshot.controls['fuel-thermal-resolution'],'interactive');
 }finally{dom.window.close();}
});
