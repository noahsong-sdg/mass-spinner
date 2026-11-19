import './style.css';
import './component-inspector.css';
import './apparatus.css';
import './marathon-layout.css';
import './target-exposure.css';
import './target-loading.css';
import './minimal.css';
import './workspace.css';
import {setupWorkspace} from './workspace-ui.js';
import './coupled-target.css';
import './precise-controls.css';
import {setupPreciseControls} from './precise-controls.js';
import {setupCollectorAcceptance} from './collector-acceptance-ui.js';
import {assessCollisionObservableEvidence} from './observable-evidence.js';
import {setupHydrogenTracer} from './hydrogen-tracer-ui.js';
import {setupBaseline} from './baseline-ui.js';
import {setupMaterialRealism} from './material-realism-ui.js';
import './exploration.css';
import {componentDestination,appendComponentActions} from './component-actions.js';
import {setupMarathonModels} from './marathon-ui.js';
import {setupFuelCentrifuge} from './fuel-centrifuge-ui.js';
import './fuel-comparison.css';
import './fuel-playground.css';
import {setupApparatus} from './apparatus-ui.js';
import {sourceMotionState,targetMotionState} from './reactor-motion.js';
import {surfaceState} from './surface-state.js';
import {fusionComponents} from './component-catalog.js';
import {setupTutorialInsights} from './tutorial-insights-ui.js';
import {LITHIUM_PRESET_VALUES,LITHIUM_PRESET_NOTE} from './tutorial-insights.js';
import {setupBlanketExplorer} from './blanket-ui.js';
import {blanketComponents} from './blanket-reference.js';
import {setupComponentInspectors} from './component-inspector.js';
import {setupExperience} from './experience-ui.js';
import {rendererPresentation} from './view-state.js';
import {requestSimulation,requestSimulationWithIdentity} from './worker-client.js';
import {serializeRun} from './producing-code.js';
import {createLazyScene,needsLegacyScene} from './legacy-scene.js';
import {radialRefinementSettings} from './radial-refinement.js';
import {setupLaboratory,showLaboratory,reducedConfig,isReduced,isInfo,guide,geometryModes,transportModes,coreModes,renderPlots} from './laboratory.js';
import {equilibriumPresentation,rotatingPresentation} from './focused-diagnostics.js';
import {equilibriumConfig} from './equilibrium-controls.js';
import {setupDoublewellControls,doublewellConfig} from './doublewell-ui.js';
import {setupStudies} from './study-ui.js';
import {arrivalCurves,collectionSummary} from './ensemble.js';
import {setupReferenceAtlas} from './reference-atlas.js';
import {setupFailureLaboratory,modelValidity} from './limitations-ui.js';
import {createResearchLoader} from './research-ui.js';
import {renderConvergenceEvidence} from './convergence-evidence.js';
import convergenceEvidence from '../web-assets/convergence/display.json' with {type:'json'};
import type {ConvergenceEvidence} from './convergence-evidence.js';
import * as THREE from 'three';
import { DEFAULT_CONFIG, cutoffMassU, E_CHARGE, AMU } from './physics.js';

import {mainElement as $} from './main-elements.js';
import type {RunConfig,simulate} from './physics.js';
import type {EquilibriumConfig,solveEquilibrium} from './equilibrium-model.js';
import type {GeometryConfig,geometry} from './geometries.js';
import type {TransportConfig,transport} from './transport.js';
import type {DoublewellConfig,simulateDoublewell} from './doublewell-dynamics.js';
import type {ProducingCodeIdentity} from './producing-code.js';
import type {Scenario} from './scenario-state.js';
import type {PlotCurve} from './laboratory.js';
import type {CoupledPlotContext} from './coupled-target-ui.js';
import type {SimulationRequest} from './worker-types.js';
import type {GeometryMode} from './geometries.js';
import type {TransportMode} from './transport.js';
import type {CollisionObservableEvidence} from './observable-evidence.js';
type OrbitResult=ReturnType<typeof simulate>;
type EquilibriumResult=ReturnType<typeof solveEquilibrium>;
type GeometryResult=ReturnType<typeof geometry>;
type TransportResult=ReturnType<typeof transport>;
type DoublewellResult=ReturnType<typeof simulateDoublewell>;
type OrbitMode='rotating'|'icr';
type GeometryUiMode=GeometryMode|'centrifugal';
type ReducedMode=GeometryUiMode|TransportMode;
type ModelMode=OrbitMode|ReducedMode|'centrifuge'|'doublewell-dynamics';
type Settings=RunConfig|EquilibriumConfig|GeometryConfig|TransportConfig|DoublewellConfig;
type EquilibriumSettings=EquilibriumConfig&{bins:number};
type RunMetadata={producingCode:ProducingCodeIdentity|null;diagnostics?:unknown;evidence?:CollisionObservableEvidence};
type AcceptedRun={ [K in ModelMode]:RunMetadata&{kind:K;settings:SettingsByMode[K];result:ResultsByMode[K]} }[ModelMode];
const errorMessage=(error:unknown)=>error instanceof Error?error.message:String(error);
const guideQuery=new URL(location.href).searchParams;
const guideOnLoad=guideQuery.get('guide'),guideTopic=guideQuery.get('topic'),guideAction=guideQuery.get('try');
const inputs = ['field','voltage','energy','parallel','source-radius','distribution','axial-temperature','particles','resolution','mass-a','mass-b','charge-a','charge-b','neutral-density','neutral-cross-section','neutral-mass','rf-amplitude','rf-frequency','rf-handedness','rotation','ion-temperature','electron-temperature','axis-fraction','radial-cut','radial-resolution','random-seed','centrifuge-closure','magnetic-boundary','composition-boundary','gaussian-field','gaussian-width','gaussian-density'];
const ions = () => (['a','b'] as const).map(k=>({massU:+$(`mass-${k}`).value,chargeState:+$(`charge-${k}`).value}));
const mode = () => $('system').value;
const equilibriumLabel=()=>({'corotating':'Bounded common-corotation benchmark','gaussian':'Prescribed density · required current','magnetic-gaussian':'Coupled B(r) · current and radial force balance'} as Record<string,string>)[$('centrifuge-closure').value];
const orbitConfig = (selected:OrbitMode) => ({...DEFAULT_CONFIG,seed:Number($('random-seed').value),mode:selected,dt:+$('resolution').value,magneticT:+$('field').value,
  voltage:selected==='rotating'?+$('voltage').value:0,perpendicularEV:+$('energy').value,
  parallelEV:+$('parallel').value,sourceRadius:+$('source-radius').value/100,
  distribution:$('distribution').value as 'fixed'|'thermal',axialTemperatureEV:+$('axial-temperature').value,
  particlesPerSpecies:+$('particles').value,species:ions(),rfAmplitudeVM:+$('rf-amplitude').value,
  rfFrequencyHz:+$('rf-frequency').value,rfHandedness:Number($('rf-handedness').value) as -1|1,
  neutralDensityM3:+$('neutral-density').value,neutralCrossSectionM2:+$('neutral-cross-section').value,
  neutralMassU:+$('neutral-mass').value});
function config(selected:'centrifuge'):EquilibriumSettings;
function config(selected:'doublewell-dynamics'):DoublewellConfig;
function config(selected:OrbitMode):RunConfig;
function config(selected?:string):Settings;
function config(selected=mode()):Settings {
 if(selected==='doublewell-dynamics')return doublewellConfig(ions());
 if(isReduced(selected))return reducedConfig(selected,ions());
 if(selected==='centrifuge')return {...equilibriumConfig(id=>($(id) as HTMLInputElement|HTMLSelectElement).value,ions(),DEFAULT_CONFIG.radius),bins:Number($('radial-resolution').value)};
 return orbitConfig(selected as OrbitMode);
}
let studyUI:ReturnType<typeof setupStudies>|undefined,experience:ReturnType<typeof setupExperience>|undefined,inspectors:ReturnType<typeof setupComponentInspectors>,apparatus:ReturnType<typeof setupApparatus>|undefined,tutorialInsights:ReturnType<typeof setupTutorialInsights>|undefined,fusionApparatus:ReturnType<typeof setupApparatus>|undefined,workspace:ReturnType<typeof setupWorkspace>,collector:ReturnType<typeof setupCollectorAcceptance>|undefined,baseline:ReturnType<typeof setupBaseline>|undefined;
const targetBaselines=new Map<HTMLElement,ReturnType<typeof setupBaseline>>();
const baselineOptions={capture:()=>{if(!experience)throw new Error('Scenario is not ready.');return experience.capture();},restore:(value:Scenario)=>experience!.restore(value)};
function plotSimulation(curves:PlotCurve[]){
 const identity={model:mode(),observable:'prescribed-model-response',xUnit:'per-curve',yUnit:'per-curve',version:1};
 if(baseline)baseline.update(curves,identity,{seed:latest&&'seed' in latest.settings?latest.settings.seed:undefined});else renderPlots($('live-plots'),curves);
}
function targetPlots(curves:PlotCurve[],{host,observable}:CoupledPlotContext){
 let control=targetBaselines.get(host);if(!control){control=setupBaseline(host,baselineOptions);targetBaselines.set(host,control);}
 return control.update(curves,{model:'coupled-depth-target-scenario',observable,xUnit:'per-curve',yUnit:'per-curve',version:1});
}
function inspectComponent(id:string){
 workspace?.open('inspect');
 const level=experience?.level??'1';
 const readout=level==='2'?fusionApparatus?.readout:apparatus?.hasMode(mode())&&view==='render'?apparatus.readout:document.querySelector('#separator-inspector .component-description');
 const destination=componentDestination(id,{level,model:mode(),closure:$('centrifuge-closure').value});
 appendComponentActions(readout,{parameters:()=>{workspace.focusRelated(destination.panel,destination.selector);if(destination.settings&&destination.selector)marathon.target.focusSetting(destination.selector);},results:()=>workspace.focusRelated(level==='2'&&['target','substrate'].includes(id)?'target':'plots')});
}
const loadResearch=createResearchLoader();
async function showResearch(){
 const button=$('replay-retry');button.disabled=true;
 try{const viewer=await loadResearch();button.hidden=!!viewer;}
 finally{button.disabled=false;}
}
let latest:AcceptedRun|null = null, revision = 0, busy = false, legacyRenderer:ReturnType<typeof import('./legacy-renderer.js').createLegacyRenderer>|null|undefined;
let view = 'hardware', gpuReady=false, gpuFailed=false, runController:AbortController|undefined, comparisonController:AbortController|undefined, refinementController:AbortController|undefined, liveTimer:ReturnType<typeof setTimeout>|undefined;
const legacyNeeded=()=>needsLegacyScene(document.body.dataset.level??'1',mode(),view);
const legacyScene=createLazyScene(legacyNeeded,initScene,rendererFailure);
function sceneVisibility(){
 const rendered=view==='render'&&apparatus?.hasMode(mode());
 const state=rendererPresentation(mode(),gpuReady,gpuFailed,!!legacyRenderer?.webGPU,rendered||!legacyNeeded());
 $('model-apparatus').hidden=!rendered;
 $('scene').hidden=state.canvasHidden;$('poster').hidden=state.posterHidden;$('load-state').hidden=state.loadingHidden;$('renderer-status').textContent=state.status;
 $('separator-inspector').hidden=!legacyNeeded();
  $('field-scale').hidden=view!=='fields'||state.canvasHidden;
 if($('separator-inspector').hidden)inspectors?.clear();
}
function rendererFailure(error:unknown){
 console.error(error);legacyScene.reset();gpuReady=false;gpuFailed=true;sceneVisibility();
 $('load-state').textContent='3D unavailable. Simulation controls remain available.';
}
function equilibriumControls(){
 const coupled=$('centrifuge-closure').value==='magnetic-gaussian';
 $('gaussian-controls').hidden=$('centrifuge-closure').value==='corotating';
 $('magnetic-boundary-control').hidden=!coupled;
 $('gaussian-field-label').textContent=coupled?'Magnetic boundary B':'Imposed axial B';
 $('gaussian-closure-note').textContent=coupled?'Equal charges are required. Density and ion rotation are inputs. The model calculates B(r), current and potential together. A wall boundary can have no regular nonzero-B solution. Electron inertia and discharge dynamics are not calculated.':'Equal charge states are required. Density width and B are inputs. Results show required current, its magnetic perturbation estimate and the neglected electron-inertia force ratio.';
 if(mode()==='centrifuge')$('experiment-subtitle').textContent=equilibriumLabel();
 $('composition-label').textContent=$('composition-boundary').value==='bulk'?'Whole-cylinder A number fraction':'Central A number fraction';
}
function changed(){experience?.sync();equilibriumControls();invalidate();clearTimeout(liveTimer);if($('live-update').checked)liveTimer=setTimeout(run,250);}
function showView(next:string) {
 inspectors?.clear();document.body.dataset.view=next;view=next;
 document.querySelectorAll<HTMLElement>('[data-view]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===next)));
 legacyRenderer?.showView(next);sceneVisibility();void legacyScene.ensure();
}
async function initScene(){
 gpuFailed=false;$('load-state').textContent='Loading 3D…';sceneVisibility();
 const {createLegacyRenderer}=await import('./legacy-renderer.js');
 if(!legacyNeeded())return null;
 const current=createLegacyRenderer({$,config:()=>orbitConfig(mode()==='icr'?'icr':'rotating'),mode,getLatest:()=>latest,getView:()=>view,isActive:legacyNeeded,onFailure:rendererFailure});
 legacyRenderer=current;
 try{
  await current.initScene();gpuReady=true;sceneVisibility();
  return {dispose(){inspectors?.clear();current.dispose();if(legacyRenderer===current){legacyRenderer=null;gpuReady=false;}}};
 }catch(error){if(legacyRenderer===current)legacyRenderer=null;throw error;}
}

function updateReadouts() {
  const c=orbitConfig(mode()==='icr'?'icr':'rotating'),cutoff=cutoffMassU(c);
  for(const [id,value] of Object.entries({'field-value':`${c.magneticT.toFixed(2)} T`,
    'voltage-value':`${c.voltage} V`,'energy-value':`${c.perpendicularEV} eV`,
    'parallel-value':`${c.parallelEV} eV`,'source-radius-value':`${Math.round(c.sourceRadius*100)} cm`,
    'axial-temperature-value':`${c.axialTemperatureEV} eV`,'rf-amplitude-value':`${c.rfAmplitudeVM} V/m`,
    'rotation-value':`${$('rotation').value} rad/s`,'ion-temperature-value':`${$('ion-temperature').value} eV`,
    'electron-temperature-value':`${$('electron-temperature').value} eV`,'axis-fraction-value':`${$('axis-fraction').value}%`,'radial-cut-value':Number($('radial-cut').value).toFixed(2),
    'gaussian-field-value':`${$('gaussian-field').value} T`,'gaussian-width-value':`${$('gaussian-width').value} m`,
    'gaussian-density-value':`${(10**Number($('gaussian-density').value)).toExponential(1)} m⁻³`,'seed-label':`Seed ${mode()==='doublewell-dynamics'?doublewellConfig(ions()).seed:$('random-seed').value}`}))$(id).textContent=value;
  $('energy-label').textContent=c.distribution==='thermal'?'Transverse ion temperature':'Transverse ion energy';
  ions().forEach((ion,i)=>$('species-'+['a','b'][i]+'-label').textContent=`${['A','B'][i]} · ${ion.massU} u · +${ion.chargeState}`);
  $('cutoff').innerHTML=cutoff===null?'∞ <small>u / e</small>':`${cutoff.toFixed(1)} <small>u / e</small>`;
  $('cutoff-context').textContent=ions().map((s,i)=>`${['A','B'][i]} ${cutoff===null||s.massU/s.chargeState<cutoff?'below':'at/above'}`).join(' · ');
  $('cutoff-mark').style.left=`${Math.min(100,Math.max(0,(cutoff??150)-20))}%`;
  legacyRenderer?.updateFields();
  const frequencies=ions().map(s=>E_CHARGE*c.magneticT*s.chargeState/(s.massU*AMU)/(2*Math.PI));
  $('frequency-readout').textContent=mode()==='centrifuge'?'Static composition boundary. This calculation has no flowing feed or extraction.':
    `Cyclotron: A ${frequencies[0].toFixed(0)} Hz · B ${frequencies[1].toFixed(0)} Hz · `+
    (mode()==='icr'?`RF ${c.rfFrequencyHz.toFixed(0)} Hz`:`E×B drift limit ${ (-2*c.voltage/(c.radius**2*c.magneticT)/(2*Math.PI)).toFixed(0)} Hz (signed, with exact ion branches below)`);
}
function invalidate() {
  clearTimeout(liveTimer);
  apparatus?.updateSurfaceState(null);
  $('model-validity').textContent=modelValidity(mode(),null,null);
  studyUI?.invalidate();
  baseline?.clearCurrent();collector?.update(null);
  runController?.abort();comparisonController?.abort();refinementController?.abort();revision++; latest=null; $('export').disabled=true; $('refine').disabled=true; legacyRenderer?.drawPaths(null);
  $('impact-diagnostics').replaceChildren();$('equilibrium-results').replaceChildren();renderPlots($('equilibrium-chart'),[]);
  $('comparison').hidden=true;$('compare').disabled=false;$('refinement-status').textContent='Run an experiment to compare Δt with Δt/2.';
  $('run-status').textContent=busy?'Inputs changed · run again after calculation':'Inputs changed · run to update collection';
  for(const id of ['end-purity','end-recovery','wall-purity','wall-recovery'])$(id).textContent='—';
  for(const id of ['end-stack','wall-stack','deposition'])$(id).replaceChildren();
  $('ledger').innerHTML='<tr><td>Run required</td><td>—</td><td>—</td></tr>';
  $('energy-error').textContent='Results cleared after input change.';
  $('sampling-uncertainty').textContent='';renderPlots($('live-plots'),[]);$('model-metrics').replaceChildren();$('model-assumptions').replaceChildren();$('plot-status').textContent='Inputs changed. Enable live updates to recalculate automatically.';
  updateReadouts();
}
const percent=(a:number,b:number)=>b?`${(100*a/b).toFixed(1)}%`:'—';
function drawResults(result:OrbitResult) {
  const [ar,kr]=result.species;
  for(const destination of ['end','wall'] as const) {
    const counts=[ar[destination],kr[destination]],sum=counts[0]+counts[1];
    $(destination+'-stack').replaceChildren(...counts.map((n,i)=>{
      const span=document.createElement('span');span.className=i?'kr':'ar';span.style.width=`${sum?100*n/sum:0}%`;span.textContent=n?String(n):'';return span;
    }));
    const target=destination==='end'?ar:kr;
    $(destination+'-purity').textContent=percent(target[destination],sum);
    $(destination+'-recovery').textContent=percent(target[destination],target.injected);
  }
  $('ledger').innerHTML=(['injected','end','wall','source','remaining'] as const).map(key=>`<tr><td>${{injected:'Injected',end:'Axial end',wall:'Wall',source:'Source return',remaining:'Still in chamber'}[key]}</td><td>${ar[key]}</td><td>${kr[key]}</td></tr>`).join('');
  $('energy-error').textContent=`Maximum relative energy error: ${Math.max(ar.maxRelativeEnergyError,kr.maxRelativeEnergyError).toExponential(2)}`;
  const max=Math.max(1,...ar.wallAxialBins,...kr.wallAxialBins);
  const bars=result.species.map((s,j)=>s.wallAxialBins.map((n,i)=>`<rect x="${30+i*31+j*13}" y="${110-90*n/max}" width="12" height="${90*n/max}" fill="${j?'#d2956b':'#a4c4b1'}"><title>${s.massU} u · bin ${i+1}: ${n} ions</title></rect>`).join('')).join('');
  $('deposition').innerHTML=`<path d="M30 110H775" stroke="#4d5753"/>${bars}<g fill="#9eaaa4" font-size="12"><text x="30" y="135">Source · 0 m</text><text x="690" y="135">End · 2.8 m</text><text x="5" y="25">${max}</text></g>`;
  const summary=collectionSummary(result);
  $('sampling-uncertainty').textContent=summary.species.map((s,i)=>`${['A','B'][i]}: `+(['end','wall','source','remaining'] as const).map(d=>`${d} ${(100*s.outcomes[d].fraction).toFixed(1)}% [${(100*s.outcomes[d].low).toFixed(1)}, ${(100*s.outcomes[d].high).toFixed(1)}]%`).join(' · ')).join(' | ')+'. Pointwise Wilson 95% intervals for sampled fractions. Purity needs paired-batch resampling below. Model and timestep errors are separate.';
  $('export').disabled=false;legacyRenderer?.drawPaths(result);
}
type SettingsByMode={rotating:RunConfig;icr:RunConfig;centrifuge:EquilibriumSettings;'doublewell-dynamics':DoublewellConfig}&Record<GeometryUiMode,GeometryConfig>&Record<TransportMode,TransportConfig>;
type ResultsByMode={rotating:OrbitResult;icr:OrbitResult;centrifuge:EquilibriumResult;'doublewell-dynamics':DoublewellResult}&Record<GeometryUiMode,GeometryResult>&Record<TransportMode,TransportResult>;
function calculate<M extends ModelMode>(selected:M,settings:SettingsByMode[M],signal:AbortSignal,withIdentity?:false):Promise<ResultsByMode[M]>;
function calculate<M extends ModelMode>(selected:M,settings:SettingsByMode[M],signal:AbortSignal,withIdentity:true):Promise<{result:ResultsByMode[M];producingCode:ProducingCodeIdentity|null}>;
function calculate(selected:string,settings:Settings,signal:AbortSignal,withIdentity=false){
 // Each branch is the existing bundled worker protocol; the UI model owns its configuration.
 const request:SimulationRequest=selected==='doublewell-dynamics'?{id:0,kind:'doublewell-dynamics',config:settings as DoublewellConfig}
  :geometryModes.includes(selected)?{id:0,kind:'geometry',model:(selected==='centrifugal'?'mirror':selected) as GeometryMode,config:settings as GeometryConfig}
  :transportModes.includes(selected)?{id:0,kind:'transport',model:selected as TransportMode,config:settings as TransportConfig}
  :selected==='centrifuge'?{id:0,kind:'centrifuge',config:settings as EquilibriumConfig}
  :{id:0,kind:'orbit',config:settings as RunConfig};
 return withIdentity?requestSimulationWithIdentity(request,signal):requestSimulation(request,signal);
}
type PreparedRun={ [K in ModelMode]:{kind:K;settings:SettingsByMode[K]} }[ModelMode];
function prepareRun(selected:string):PreparedRun{
 if(selected==='centrifuge')return {kind:selected,settings:config(selected)};
 if(selected==='doublewell-dynamics')return {kind:selected,settings:config(selected)};
 if(geometryModes.includes(selected))return {kind:selected as GeometryUiMode,settings:reducedConfig(selected,ions()) as GeometryConfig};
 if(transportModes.includes(selected)){const kind=selected as TransportMode;return {kind,settings:reducedConfig(kind,ions())};}
 return {kind:selected as OrbitMode,settings:orbitConfig(selected as OrbitMode)};
}
async function calculateRun(prepared:PreparedRun,signal:AbortSignal):Promise<AcceptedRun>{
 const response=await calculate(prepared.kind,prepared.settings,signal,true);
 // prepareRun and the dispatcher retain the same model/config/result identity across the worker boundary.
 return {...prepared,...response} as AcceptedRun;
}
const mean=(values:number[])=>values.length?values.reduce((s,v)=>s+v,0)/values.length:NaN;
const numeric=(n:number|null,d=2)=>n===null||!Number.isFinite(n)?'—':n!==0&&(Math.abs(n)<.001||Math.abs(n)>=1e6)?n.toExponential(d):n.toFixed(d);
function presentDiagnostics(presentation:{metrics:string;notes:string[];diagnostics:unknown}){
  $('model-metrics').textContent=presentation.metrics;$('model-assumptions').replaceChildren();
  for(const note of presentation.notes){const li=document.createElement('li');li.textContent=note;$('model-assumptions').append(li);}
  if(latest)latest.diagnostics=presentation.diagnostics;
}
function equilibrium(result:EquilibriumResult) {
  const points=result.profiles.map(p=>p.ionDensities[1]/(p.ionDensities[0]+p.ionDensities[1]));
  renderPlots($('equilibrium-chart'),[{label:'B number fraction',x:result.profiles.map(p=>p.radius),y:points,xLabel:'Radius (m)',yLabel:'Number fraction',yDomain:[0,1]}]);
  $('equilibrium-caption').textContent=`Local number fractions · central A ${(100*result.species[0].axisFraction).toPrecision(4)}% · ${equilibriumLabel()}`;
  const wall=result.profiles.at(-1)!;
  $('equilibrium-results').textContent=`Wall B number fraction: ${(100*points.at(-1)!).toFixed(2)}% · log enrichment B/A: ${numeric(wall.logSeparationFactors[1])} · maximum relative charge residual: ${result.maxRelativeChargeResidual.toExponential(2)}. Not per-pass recovery.`;
}
async function run() {
  clearTimeout(liveTimer);runController?.abort();
  comparisonController?.abort();if(comparisonController){$('compare-status').textContent='A new run replaced the comparison.';$('compare').disabled=false;}
  const selected=mode();if(isInfo(selected)){$('run-status').textContent='Overview only · no quantitative solver for this variant.';return;}
  const prepared=prepareRun(selected),id=++revision,controller=new AbortController();runController=controller;
  busy=true;latest=null;$('export').disabled=true;$('refine').disabled=true;$('run').disabled=true;
  $('run-status').textContent=selected==='centrifuge'?'Solving radial quasineutral equilibrium…':selected==='doublewell-dynamics'?'Advancing coupled quartic orbits and ion–ion collisions…':'Integrating ion orbits…';
  try {
    const accepted=await calculateRun(prepared,controller.signal);
    const {kind:selected,settings,result}=accepted;
    if(id!==revision)return;
    latest=accepted;
    apparatus?.updateSurfaceState(surfaceState({model:selected,settings,result,acceptedModel:selected,acceptedSettings:settings}),settings);
    collector?.update(accepted.kind==='rotating'||accepted.kind==='icr'?accepted.result:null);
    $('model-validity').textContent=modelValidity(selected,settings,result);
    if(selected!=='centrifuge'&&selected!=='rotating'&&selected!=='icr'){
      $('model-assumptions').replaceChildren();
      plotSimulation(result.curves);$('model-metrics').textContent=result.metrics.map(m=>`${m.label}: ${numeric(m.value,4)} ${m.unit}`).join(' · ');
      for(const note of result.assumptions){const li=document.createElement('li');li.textContent=note;$('model-assumptions').append(li);}
    }else if(selected==='centrifuge'){
      equilibrium(result);const p=equilibriumPresentation(result,Number($('radial-cut').value));presentDiagnostics(p);plotSimulation(p.curves);
      const radialFine=radialRefinementSettings(settings);$('refine').disabled=!radialFine;$('refinement-status').textContent=radialFine?`Compare equilibrium inventories at ${settings.bins} → ${radialFine.bins} radial intervals.`:'No finer grid is supported. Radial convergence is not established.';
    }
    else {
      drawResults(result);const p=selected==='rotating'?rotatingPresentation(settings,result):null;
      if(p)presentDiagnostics(p);plotSimulation([...arrivalCurves(result),...(p?.curves??[])]);
      const canRefine=settings.duration/(settings.dt/2)<=100000;$('refine').disabled=!canRefine;if(!canRefine)$('refinement-status').textContent='The half-step run exceeds the browser step limit. First select a larger timestep.';
      $('energy-error').textContent=`Maximum work/loss-corrected energy residual: ${Math.max(...result.species.map(s=>s.maxRelativeEnergyError)).toExponential(2)} · impact residual ${Math.max(...result.species.map(s=>s.maxRelativeImpactEnergyError)).toExponential(2)}`;
      $('impact-diagnostics').textContent=result.species.map((s,i)=>`${['A','B'][i]}: ${s.collisions} elastic events · mean collected transit ${numeric(1e6*mean(s.impacts.map(p=>p.time)))} µs · mean impact ${numeric(mean(s.impacts.map(p=>p.kineticEV)))} eV · RF work/injected ion ${numeric(s.rfWorkEV/s.injected)} eV`).join(' | ');
    }
    $('plot-status').textContent='Calculated from the current settings. Point at the curves to see values.';
    if(selected==='doublewell-dynamics'){
     accepted.evidence=assessCollisionObservableEvidence(result,'outlet-fraction');
     $('model-validity').textContent=`Collisions: ${accepted.evidence.status} · continuum ${accepted.evidence.continuum}`;
     for(const text of accepted.evidence.reasons){const li=document.createElement('li');li.textContent=text;$('model-assumptions').append(li);}
     const study=document.createElement('li'),link=document.createElement('a');link.href='/convergence/browser-v38.summary.json';link.textContent='Browser-resolution study · qualification unresolved';study.append(link);$('model-assumptions').append(study);
    }
    $('export').disabled=false;$('run-status').textContent=selected==='doublewell-dynamics'?`Complete · ${settings.particlesPerSpecies} particles per species · ${(settings.duration*1e6).toFixed(0)} µs · examine torque and resolution results`:selected==='centrifuge'?`Complete · ${settings.bins+1} radial samples`:selected==='rotating'||selected==='icr'?`Complete · ${settings.particlesPerSpecies} ions per species · ${(settings.dt*1e9).toFixed(0)} ns step`:'Complete · reduced model diagnostics';
  } catch(error) {if(id===revision)$('run-status').textContent=errorMessage(error);}
  finally {if(runController===controller){busy=false;$('run').disabled=false;}}
}
function selectMode(){
 const selected=mode(),orbital=['rotating','icr'].includes(selected),reduced=isReduced(selected),info=isInfo(selected),g=guide(selected)!;
 for(const name of ['orbit','rotating','icr','centrifuge'])document.querySelectorAll<HTMLElement>('[data-'+name+']').forEach(el=>el.hidden=name==='orbit'?!orbital:selected!==name);
 $('orbit-presets').hidden=selected!=='rotating';$('equilibrium-view').hidden=selected!=='centrifuge';
 $('reduced-view').hidden=orbital||selected==='centrifuge';$('reduced-controls').hidden=!reduced;$('doublewell-controls').hidden=selected!=='doublewell-dynamics';$('doublewell-initial-note').hidden=selected!=='doublewell-dynamics';$('diffusion-settings').hidden=selected!=='diffusion';
 $('reduced-title').textContent=g.title;$('reduced-description').textContent=g.mechanism;
 $('orbit-results').hidden=!orbital;$('equilibrium-results').hidden=selected!=='centrifuge';
 $('deposition-panel').hidden=!orbital;$('refine').hidden=!orbital&&selected!=='centrifuge';
 $('sampling-uncertainty').hidden=!orbital;
 $('refine').textContent=selected==='centrifuge'?'Compare radial grids ↗':'Compare timesteps ↗';
 document.querySelector<HTMLElement>('.viewport-tools')!.hidden=!orbital;
 workspace?.refreshMode();
 document.querySelector<HTMLElement>('.legend-note')!.hidden=!orbital;
 $('experiment-label').textContent='SECTION '+g.section;$('experiment-title').textContent=g.title;$('experiment-subtitle').textContent=info?'Overview · no quantitative solver':orbital?'Finite-device full ion orbits':selected==='centrifuge'?equilibriumLabel():selected==='doublewell-dynamics'?'Coupled kinetic model · prescribed fields':'Reduced physics diagnostics';
 $('system-scope').textContent=selected==='doublewell-dynamics'?'Collision model · accuracy not established':info?'Overview only':reduced?'Reduced model · see model limits':selected==='centrifuge'?'Equilibrium closure':'Prescribed-field orbits';
 $('field-key').hidden=!orbital;
 $('field-key').textContent=selected==='icr'?'Copper = prescribed RF electric field at t = 0 · sage = axial B.':'Copper = radial E · sage = axial B · wire cylinder = ideal absorbing wall.';
 apparatus?.show(selected);tutorialInsights?.show(selected);
 showView('render');
 equilibriumControls();studyUI?.show(selected);showLaboratory(selected);sceneVisibility();invalidate();
 $('run').hidden=info;$('plot-status').textContent=info?g.fidelity:'Adjust sliders to recalculate.';
 clearTimeout(liveTimer);if(!info&&$('live-update').checked)liveTimer=setTimeout(run,0);
}
inputs.forEach(id=>$(id).addEventListener('input',changed));
$('diffusion-closure').addEventListener('change',()=>{showLaboratory(mode());changed();});
$('live-update').addEventListener('change',()=>{if($('live-update').checked)void run();else clearTimeout(liveTimer);});
$('system').addEventListener('change',selectMode);$('run').addEventListener('click',()=>{workspace?.open('plots');void run();});
$('lithium-preset').setAttribute('aria-description',LITHIUM_PRESET_NOTE);
$('lithium-preset').addEventListener('click',()=>{
 for(const [id,value]of Object.entries(LITHIUM_PRESET_VALUES))($(id) as HTMLInputElement|HTMLSelectElement).value=value;
 experience?.sync();selectMode();
 $('plot-status').textContent=LITHIUM_PRESET_NOTE;
});
$('reset-camera').addEventListener('click',()=>legacyRenderer?.resetCamera());
document.querySelectorAll<HTMLElement>('[data-view]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view!)));
function preset(voltage:number) {
  $('field').value='.10';$('voltage').value=String(voltage);$('energy').value='.5';$('parallel').value='20';$('source-radius').value='4';
  experience?.sync();invalidate();void run();
}
$('preset-separate').addEventListener('click',()=>preset(400));$('preset-control').addEventListener('click',()=>preset(0));
$('tune-rf').addEventListener('click',()=>{
  const ion=ions()[0];$('rf-frequency').value=String(Math.round(E_CHARGE*(+$('field').value)*ion.chargeState/(ion.massU*AMU)/(2*Math.PI)));changed();
});
$('refine').addEventListener('click',()=>{void (async()=>{
  if(!latest||(latest.kind!=='centrifuge'&&latest.kind!=='rotating'&&latest.kind!=='icr'))return;
  const finerSettings=latest.kind==='centrifuge'?radialRefinementSettings(latest.settings):{...latest.settings,dt:latest.settings.dt/2};
  if(!finerSettings){$('refine').disabled=true;$('refinement-status').textContent='No finer grid is supported. Radial convergence is not established.';return;}
  const snapshot=latest,id=revision,controller=new AbortController();refinementController?.abort();refinementController=controller;$('refine').disabled=true;$('refinement-status').textContent=snapshot.kind==='centrifuge'?'Running finer radial grid…':'Running half-timestep comparison…';
  try {
    if(snapshot.kind==='centrifuge'){
      const fineSettings=radialRefinementSettings(snapshot.settings)!;
      const fine=await calculate('centrifuge',fineSettings,controller.signal);
      if(id!==revision)return;
      const cut=Number($('radial-cut').value),a=equilibriumPresentation(snapshot.result,cut).diagnostics,b=equilibriumPresentation(fine,cut).diagnostics;
      $('refinement-status').textContent=`${snapshot.settings.bins} → ${fineSettings.bins} radial intervals · `+a.volumeMeanIonDensities.map((n,i)=>`${['A','B'][i]}: inventory relative change ${numeric(Math.abs(n-b.volumeMeanIonDensities[i])/b.volumeMeanIonDensities[i],5)} · bulk fraction change ${numeric(Math.abs(a.bulkNumberFractions[i]!-b.bulkNumberFractions[i]!),5)}`).join(' | ')+'. Radial quadrature check only. This does not establish experimental accuracy.';
      return;
    }
    const fine=await calculate(snapshot.kind,{...snapshot.settings,dt:snapshot.settings.dt/2},controller.signal);
    if(id!==revision)return;
    $('refinement-status').textContent=snapshot.result.species.map((s,i)=>`${['A','B'][i]}: |Δ wall| ${Math.abs(s.wall-fine.species[i].wall)}, |Δ end| ${Math.abs(s.end-fine.species[i].end)}, |Δ RF work/ion| ${numeric(Math.abs(s.rfWorkEV-fine.species[i].rfWorkEV)/s.injected,4)} eV`).join(' · ')+(snapshot.settings.neutralDensityM3?' · Stochastic collision paths need ensemble convergence as well.':' · Counts alone do not establish trajectory convergence.');
  } catch(e){if(id===revision)$('refinement-status').textContent=errorMessage(e);}
  finally{if(id===revision)$('refine').disabled=snapshot.kind==='centrifuge'&&!radialRefinementSettings(snapshot.settings);}
 })().catch(error=>{$('refinement-status').textContent=errorMessage(error);$('refine').disabled=false;});});
$('compare').addEventListener('click',()=>{void (async()=>{
  workspace?.open('plots');
  const id=revision,controller=new AbortController();comparisonController?.abort();comparisonController=controller;$('comparison').hidden=false;$('comparison-results').replaceChildren();$('compare-status').textContent='Running independent models…';$('compare').disabled=true;
  const modes=coreModes;
  const prepared=modes.map(prepareRun);
  const settings=prepared.map(value=>value.settings);
  const results=await Promise.allSettled(prepared.map(value=>calculateRun(value,controller.signal)));
  if(id===revision) {
    $('compare-status').textContent='Separate operating points. Models give different observables. Examine each configuration.';
    results.forEach((entry,i)=>{
      const card=document.createElement('div'),heading=document.createElement('h3'),p=document.createElement('p');heading.textContent=guide(modes[i])!.title;
      if(entry.status==='rejected')p.textContent=errorMessage(entry.reason);
      else if(entry.value.kind!=='centrifuge'&&entry.value.kind!=='rotating'&&entry.value.kind!=='icr')p.textContent=entry.value.result.metrics.map(m=>`${m.label}: ${numeric(m.value)} ${m.unit}`).join(' · ');
      else if(entry.value.kind==='centrifuge'){const r=entry.value.result,w=r.profiles.at(-1)!;p.textContent=`Wall B fraction ${(100*w.ionDensities[1]/w.ionDensities.reduce((a,b)=>a+b,0)).toFixed(1)}% · log enrichment ${numeric(w.logSeparationFactors[1])}. Equilibrium, not collection efficiency.`;}
      else p.textContent=entry.value.result.species.map((s,j)=>`${['A','B'][j]}: end ${s.end}/${s.injected}, wall ${s.wall}/${s.injected}, RF work/ion ${numeric(s.rfWorkEV/s.injected)} eV`).join(' · ');
      const scope=document.createElement('p');scope.className='comparison-scope';scope.textContent=entry.status==='fulfilled'?modelValidity(modes[i],settings[i],entry.value.result):guide(modes[i])!.fidelity;
      const detail=document.createElement('details'),summary=document.createElement('summary'),pre=document.createElement('pre');summary.textContent='Operating point';pre.textContent=JSON.stringify(settings[i],null,2);detail.append(summary,pre);
      card.append(heading,p,scope,detail);$('comparison-results').append(card);
    });
  }
  if(comparisonController===controller)$('compare').disabled=false;
 })().catch(error=>{$('compare-status').textContent=errorMessage(error);$('compare').disabled=false;});});
$('export').addEventListener('click',()=>{
  if(!latest)return;
  const blob=new Blob([serializeRun(latest)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='mass-spinner-run.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
inspectors=setupComponentInspectors({THREE:{Raycaster:THREE.Raycaster,Vector2:THREE.Vector2},canvas:$('scene'),getHardware:()=>legacyRenderer?.hardware,getCamera:()=>legacyRenderer?.camera,onFusionSelect:id=>fusionApparatus?.syncSelection(id),onInspect:inspectComponent,
 canPick:()=>gpuReady&&['rotating','icr'].includes(mode())&&['1','3'].includes(experience?.level??'1')});
apparatus=setupApparatus($('model-apparatus'),{onInspect:inspectComponent});
tutorialInsights=setupTutorialInsights($('tutorial-insights'));
fusionApparatus=setupApparatus($('fusion-apparatus'),{components:fusionComponents,onSelect:id=>inspectors.fusion.select(id,false),onInspect:inspectComponent});fusionApparatus.show('beam-target');
const blanketExplorer=setupBlanketExplorer($('blanket-explorer'));
setupApparatus(blanketExplorer.render,{components:blanketComponents,onInspect:()=>workspace?.open('inspect')}).show('blanket');
setupLaboratory(changed);setupDoublewellControls(changed);setupReferenceAtlas();setupFailureLaboratory();
setupHydrogenTracer($('failure-lab'));
const marathon=setupMarathonModels({transformPlots:targetPlots,onSource:value=>fusionApparatus.updateReactorState(sourceMotionState(value)),onState:value=>{
 fusionApparatus.updateSurfaceState(value?surfaceState({model:'beam-target',settings:value.result.config,result:value.result,acceptedModel:'beam-target',acceptedSettings:value.result.config,selectedState:value.state,source:value.source,acceptedSource:value.source}):null);
 if(value)fusionApparatus.updateReactorState(targetMotionState(value));
},onStatus:value=>{
 fusionApparatus.setPending(value.phase==='pending');for(const control of targetBaselines.values()){if(value.phase==='invalid')control.clearCurrent();else control.setPending(value.phase==='pending');}
}});
setupMaterialRealism({readSource:()=>marathon.source.read()});
const fuelCentrifuge=setupFuelCentrifuge({onInspect:()=>workspace?.open('inspect'),onResults:()=>workspace?.open('plots'),onControls:selector=>workspace?.focusRelated('controls',selector)});
const collectorHost=document.createElement('div');$('orbit-results').after(collectorHost);collector=setupCollectorAcceptance(collectorHost);
setupPreciseControls(document,{describeRange:range=>range.id==='gaussian-density'?{scale:'log10',unit:'m⁻³',label:'Axis ion density'}:{unit:({'field':'T','voltage':'V','energy':'eV','parallel':'eV','source-radius':'cm','axial-temperature':'eV','rf-amplitude':'V/m','gaussian-field':'T','gaussian-width':'m','rotation':'rad/s','ion-temperature':'eV','electron-temperature':'eV','axis-fraction':'%','play-mass-b':'u'} as Record<string,string>)[range.id]??range.dataset.unit}});renderConvergenceEvidence(convergenceEvidence as ConvergenceEvidence);studyUI=setupStudies(mode,()=>orbitConfig(mode()==='icr'?'icr':'rotating'),(selected,settings,signal)=>calculate(selected as OrbitMode,settings,signal));
baseline=setupBaseline($('live-plots'),baselineOptions);
$('replay-retry').addEventListener('click',()=>{void showResearch();});
workspace=setupWorkspace({onContextChange:({level,marathon})=>fuelCentrifuge.setActive(level==='2'&&marathon==='centrifuge')});
experience=setupExperience({fuelCentrifuge,selectMode,invalidate,showView,showResearch:()=>{void showResearch();},onLevelChange:level=>{workspace.setLevel(level);sceneVisibility();void legacyScene.ensure();}});
if(guideAction)workspace.launchGuideAction(guideAction);
else if(guideOnLoad==='start'||guideOnLoad==='physics'){
 workspace.open('guide');
 if(guideOnLoad==='physics')workspace.openPhysics(guideTopic??undefined);
}
