import {guideExperiments} from './guide-topics.js';
import {captureScenario,validateScenario,type Scenario,type ScenarioControls} from './scenario-state.js';

export type GuideExampleKey=keyof typeof guideExperiments;
export type GuideExampleAccess={defaults:Scenario;capture:()=>Scenario;restore:(scenario:Scenario)=>boolean};

/** Capture defaults before a shared scenario changes the controls. */
export function captureGuideDefaults(doc:Document):Scenario{
 const scenario=captureScenario(doc,'2');
 // These thermal inputs are not captured while their model is disabled.
 for(const id of ['fuel-thermal-thicknessMm','fuel-thermal-gasConductivityWMK','fuel-thermal-resolution']){
  const input=doc.getElementById(id) as HTMLInputElement|HTMLSelectElement|null;
  if(input)scenario.controls[id]=input.tagName==='SELECT'?input.value:Number(input.value);
 }
 return scenario;
}
const overrides:Record<GuideExampleKey,ScenarioControls>={
 heatExperiment:{'fuel-plot':'thermal','fuel-thermal-enabled':false},
 spatialHeatExperiment:{'fuel-plot':'thermalProfile','fuel-thermal-enabled':true,'fuel-thermal-model':'spatial','fuel-thermal-gasModel':'spatial'},
 collectionExperiment:{'fuel-plot':'cut'},stageExperiment:{'fuel-plot':'cascade'},
 pumpingExperiment:{'fuel-application':'pump','fuel-plot':'pump'},inventoryExperiment:{'fuel-plot':'inventory'},
 diffusionExperiment:{'fuel-plot':'separation'},dragExperiment:{'fuel-plot':'spin'},fieldExperiment:{'fuel-plot':'field'},surfaceExperiment:{'fuel-plot':'lithium'},
 beamSource:{'marathon-apparatus':'source','fusion-stopping-model':'geant4-bragg'},
 beamTarget:{'marathon-apparatus':'source','fusion-stopping-model':'geant4-bragg','coupled-plot':'source','coupled-time':0},
};
/** A complete default input set prevents retained settings from changing an example. */
export function guideExample(key:GuideExampleKey,defaults:Scenario):Scenario{
 if(defaults.level!=='2')throw new Error('Tutorial examples require Marathon defaults.');
 const controls:ScenarioControls={...defaults.controls,'marathon-apparatus':'centrifuge',...overrides[key]};
 const scenario:Scenario=controls['marathon-apparatus']==='source'?{version:2,level:'2',controls}:{version:3,level:'2',controls,fuelRun:{initialCurrentA:Number(controls['fuel-currentA']),events:[],mode:'transport',timeS:0}};
 validateScenario(scenario);return scenario;
}
