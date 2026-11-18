import {DEFAULT_FUEL_CENTRIFUGE,FUEL_PAIRS,lithiumVaporPressurePa,rotorResponse,validateFuelCurrentEvents} from './fuel-centrifuge.js';
import {requestSimulationWithIdentity} from './worker-client.js';
import {producingCode} from './producing-code.js';
import {fuelExportBlob,fuelExportGzipBlob} from './fuel-export.js';
import {renderPlots} from './laboratory.js';
import {sampleFuelTransport,fuelTransportCollection} from './fuel-transport.js';
import {comparisonFrame,comparisonDomain} from './fuel-experiments.js';
import {createFuelComparisonTools} from './fuel-comparison-ui.js';
import {createFuelViewTools} from './fuel-view-ui.js';
import {FUEL_COMPONENT_CONTROLS} from './fuel-scene-tools.js';
import {floatingPlayback} from './floating-playback.js';
import {DEFAULT_FUEL_THERMAL,fuelCurrentIntervention} from './fuel-operation.js';
import {mountFuelQualification} from './fuel-qualification-ui.js';
import {mountArgonReference} from './argon-reference-ui.js';
import {mountFuelSpatialExperiment} from './fuel-spatial-experiment-ui.js';
import {mountPublicSensitivity} from './public-sensitivity-ui.js';
import {sampleFuelField} from './fuel-field.js';
import {fuelCompositionCurves,fuelDensityCurves,zoomCompositionCurves} from './fuel-learning.js';
import {createFuelLearningTools} from './fuel-learning-ui.js';

import type {FuelConfig} from './fuel-centrifuge.js';
import type {FuelTransportSnapshot} from './fuel-transport.js';
import type {FuelCurrentEvent, FuelResume, FuelThermalOptions} from './fuel-operation.js';
import type {FuelRunState} from './scenario-state.js';
import type {ApparatusViewer} from './apparatus-viewer.js';
import type {PlotCurve} from './laboratory.js';
import type {AcceptedFuelSnapshot,PinnedFuelSnapshot} from './fuel-comparison-ui.js';
import type {CameraVector,CameraPose} from './apparatus-viewer.js';
import type {FuelMotionMode} from './fuel-motion.js';

type FuelResult = AcceptedFuelSnapshot['result'];
type AcceptedFuel = Pick<AcceptedFuelSnapshot,'result'|'producingCode'>;
type DiagnosticState = Partial<FuelTransportSnapshot> & {neutralRadS:number;timeS:number;scope:string};
type NumericFuelKey = {[K in keyof FuelConfig]: FuelConfig[K] extends number ? K : never}[keyof FuelConfig];
type NumericControl = {input:HTMLInputElement;read:()=>number;refresh:()=>void};
type FuelField = readonly [NumericFuelKey,string,string,number,number,number,boolean?,string?];
type FuelNodes = Record<'render'|'controls'|'plots'|'inspect'|'view'|'info',HTMLDivElement>;
type Graphics = Awaited<ReturnType<typeof loadFuelGraphics>>;
type Geometry = ReturnType<Graphics[1]['buildFuelCentrifugeGeometry']>;
type FuelModel = {config:FuelConfig;result:FuelResult;diagnostics?:boolean};
export type SetupFuelCentrifugeOptions = {
 document?:Document;request?:typeof requestSimulationWithIdentity;onInspect?:()=>void;onResults?:()=>void;
 loadGraphics?:typeof loadFuelGraphics;
};
const message = (error:unknown) => error instanceof Error ? error.message : String(error);
const fmt=(value:number|null)=>value===null?'—':Number(value).toLocaleString(undefined,{maximumSignificantDigits:4});
const temperatureDomain=(results:FuelResult[]):[number,number]=>{let lo=Infinity,hi=0;for(const result of results){lo=Math.min(lo,result.config.gasK);hi=Math.max(hi,result.config.gasK);for(const s of result.transport?.checkpoints??result.transport?.snapshots??[]){if(s.thermal){lo=Math.min(lo,s.thermal.gas?.minK??s.thermal.gasK);hi=Math.max(hi,s.thermal.gas?.maxK??s.thermal.gasK);}}}return [lo,hi];};
const fields: readonly FuelField[]=[
 ['magneticT','Axial magnetic field','T',.05,2,.05],['currentA','Radial discharge current','A',0,.2,.001],
 ['gasK','Initial / bath gas temperature','K',300,2000,10],['durationS','Run duration','s',.01,60,.01],
 ['ionFraction','Ionized number fraction','',-4,-.31,.05,true,'Mechanical assumptions'],
 ['collisionHz','Ion → neutral collision rate','s⁻¹',1,6,.1,true,'Mechanical assumptions'],
 ['dragHz','Neutral wall drag rate','s⁻¹',-2,2,.1,true,'Mechanical assumptions'],
 ['conductivitySm','Effective perpendicular conductivity','S/m',-2,2,.1,true,'Mechanical assumptions'],
 ['driveInnerFraction','Drive annulus inner radius / a','',.05,.95,.01,false,'Mechanical assumptions'],
 ['radiusM','Vessel radius','m',.05,.3,.01,false,'Geometry & gas'],['lengthM','Vessel length','m',.2,2,.05,false,'Geometry & gas'],
 ['pressurePa','Volume-mean neutral pressure','Pa',0,2,.05,true,'Geometry & gas'],['lightFraction','Reference light-species fraction','',0,1,.0001,false,'Geometry & gas'],
 ['radialDiffusivityM2S','Assumed radial diffusivity','m²/s',-4,1,.1,true,'Geometry & gas'],
 ['cutFraction','Inner collection radius / a','',0,1,.01,false,'Collection & stages'],
 ['stages','Ideal countercurrent stages','',1,12,1,false,'Collection & stages'],['feedStage','Feed stage','',1,12,1,false,'Collection & stages'],
 ['pumpSpeedM3S','Outer pump speed','m³/s',-3,0,.1,true,'Pumping'],['conductanceM3S','Inlet conductance','m³/s',-3,0,.1,true,'Pumping'],
 ['linerK','Initial / reference liner temperature','K',300,1500,10,false,'Lithium surfaces'],
 ['linerConductanceWK','Reference-only liner → gas conductance','W/K',0,2,.01,false,'Lithium surfaces'],
 ['fusionMW','Fusion thermal power','MW',0,3000,50,false,'Fuel inventory'],['burnFraction','Single-pass tritium burn fraction','',.001,1,.001,false,'Fuel inventory'],
 ['loopTimeS','Exhaust processing time','s',0,1000,10,false,'Fuel inventory'],
];
const topics: Record<string,readonly[string,string]>={
 separation:['Separation over time','Closed-wall radial transport changes neutral inertia and feeds back on rotation through conserved angular momentum. Temperature and diffusivity are imposed; local fluid momentum and extraction are not solved.'],
 composition:['Composition','Left is the axis; right is the wall. The line shows the light-isotope percentage; the rest is heavy. The vertical scale is zoomed to reveal small differences. The dashed line is the original feed percentage.'],
 spin:['Ion–neutral spin-up','L̇ᵢ = τ − Γ(Ωᵢ−Ωₙ); L̇ₙ = Γ(Ωᵢ−Ωₙ) − IₙνΩₙ. Ωₙ = Lₙ/Iₙ uses the evolving gas distribution; ion inertia and integrated friction remain prescribed.'],
 heat:['Drive & work','Drive work supplies rotation, slip and wall losses, and redistribution work ½Ωₙ² dIₙ. Backward Euler adds separately reported numerical dissipation. Fixed gas temperature is not a thermal solution.'],
 thermal:['Temperature','Closed atomic-gas and liner energy balance. Slip, resistive heating and signed redistribution work enter the neutral gas; wall drag enters the liner. Deposition and conductances are prescribed; numerical dissipation is not heat.'],
 thermalProfile:['Temperature profile','Accepted gas and tungsten cell-average temperatures. Early wall-layer detail needs joint mesh/time refinement; no axial temperature is solved.'],
 gasEnergy:['Species energy profile','Species internal energy in each equal-volume gas cell at a common local temperature; separate species temperatures are not solved.'],
 gasPressure:['Gas pressure profile','Local ideal-gas pressure from accepted species inventories and temperature; no radial fluid momentum equation is solved.'],
 momentum:['Angular momentum','Lᵢ + Lₙ = ∫τ dt − ∫IₙνΩₙ dt, from rest. Reciprocal ion–neutral torque cancels; radial redistribution changes inertia rather than creating angular momentum.'],
 inertia:['Gas inertia','Iₙ = Σₛ mₛ ∫r²nₛ dV. Outward redistribution increases inertia, so the same angular momentum produces a lower angular speed. The driven ion population retains its prescribed uniform inertia.'],
 profile:['Species density','nₛ ∝ exp(mₛΩₙ²r² / 2kT), normalized to each species’ total inventory. These are equilibrium references at the selected speed, not finite-time separation.'],
 cut:['Purity & recovery','A smaller inner cut can enrich the light product while discarding most of it. These are inventory cuts; outlet flow requires a transport model.'],
 cascade:['Countercurrent stages','The inner fraction moves forward and the outer fraction returns to the preceding stage. The scan holds feed stage fixed. Both final streams are retained; routing assumes equal turnover.'],
 pump:['Differential pumping','One outer outlet: Q = S p_wall, p_up = p_axis + Q/C. Even an ideal rotor cannot beat the inlet-conductance ceiling. Flow back-reaction on rotation is not solved.'],
 field:['Magnetic leverage','At matched torque, I ∝ 1/B and resistive heating ∝ 1/B², with fixed geometry and conductivity. This does not hold at fixed current.'],
 inventory:['D–T fuel inventory','Separate steady fuel-loop scenario: unburned exhaust = burn×(1/β−1). Delay multiplies processing inventory. This is not a prediction of burn fraction from this centrifuge.'],
 lithium:['Lithium vapor & surfaces','NIST/Hicks equilibrium vapor-pressure fit at the chosen surface temperature. Saturation is a phase-equilibrium diagnostic, not a condensation rate or proof of operating lifetime. No extrapolation beyond 298.14–1599.99 K.'],
};
const scanInputs:Readonly<Record<string,NumericFuelKey>>={cut:'cutFraction',cascade:'stages',field:'magneticT',inventory:'burnFraction',lithium:'linerK'};

/** Dedicated playground; its physics, controls and geometry do not reuse the beam-target state. */
async function loadFuelGraphics(){
 const [viewer,geometry]=await Promise.all([import('./apparatus-viewer.js'),import('./fuel-centrifuge-geometry.js')]);
 const assembly=await geometry.loadFuelAssembly();
 return [viewer,{...geometry,buildFuelCentrifugeGeometry:(options:Parameters<typeof geometry.buildFuelCentrifugeGeometry>[0])=>geometry.buildFuelCentrifugeGeometry({...options,assembly})}] as const;
}
export function setupFuelCentrifuge({document:doc=document,request=requestSimulationWithIdentity,onInspect=()=>{},onResults=()=>{},
 loadGraphics=loadFuelGraphics}:SetupFuelCentrifugeOptions={}){
 const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string)=>{const node=doc.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
 const root=el('section'),nodes={} as FuelNodes;root.id='fuel-centrifuge';
 for(const key of ['render','controls','plots','inspect','view','info'] as const){nodes[key]=el('div');nodes[key].id=`fuel-${key}`;root.append(nodes[key]);}
 const qualification=mountFuelQualification(nodes.info);
 const argonReference=mountArgonReference(nodes.info);
 const spatialExperiment=mountFuelSpatialExperiment(nodes.info,{request});
 const sensitivity=mountPublicSensitivity(nodes.info,{request});
 (doc.querySelector('main')??doc.body).append(root);
 const frame=el('div');frame.className='apparatus-frame';nodes.render.className='apparatus';nodes.render.append(frame);
 const baselineFrame=el('div');baselineFrame.className='apparatus-frame fuel-baseline';baselineFrame.hidden=true;nodes.render.append(baselineFrame);
 const comparisonLabel=el('p');comparisonLabel.className='fuel-comparison-label';comparisonLabel.hidden=true;nodes.render.append(comparisonLabel);
 const status=el('p');status.setAttribute('role','status');status.className='fuel-status';nodes.render.append(status);
 const setStatus=(text:string)=>{if(status.textContent!==text)status.textContent=text;};
 const motionBar=el('div');motionBar.className='fuel-motion';motionBar.hidden=true;nodes.render.append(motionBar);
 const makeSelect=(host:HTMLElement,id:string,label:string,options:readonly(readonly[string,string])[])=>{
  const box=el('div'),title=el('label',label),select=el('select');select.id=id;title.htmlFor=id;
  for(const [value,text]of options){const option=el('option',text);option.value=value;select.append(option);}box.append(title,select);host.append(box);return select;
 };
 const application=makeSelect(nodes.controls,'fuel-application','Application',[['enrichment','Isotope separation'],['pump','Differential pumping']]);
 const controlHelp=el('details');controlHelp.id='fuel-control-help';
 controlHelp.append(el('summary','Which controls change physics?'),el('p','Start with current, magnetic field, gas temperature and duration. These rerun the physical model.'),el('p','View and playback only change how you inspect a computed run. Pumping, stages and fuel inventory are separate reference calculations; they do not feed flow back into the closed vessel.'),el('p','Temperature evolves only when Evolve gas & liner temperature is enabled. Otherwise the gas stays at its bath temperature.'));
 nodes.controls.prepend(controlHelp);
 const motionMode=makeSelect(motionBar,'fuel-motion-mode','Gas view',[['equilibrium','Equilibrium reference'],['transport','Coupled separation'],['spin','Coupled spin-up'],['flow','Flow · reference']]);
 motionMode.value='transport';
 const play=el('button','Pause'),restart=el('button','Rewind'),clock=el('output'),seek=el('input'),legend=el('span'),power=el('button','Drive on'),newRun=el('button','New run');legend.className='fuel-motion-legend';
 power.id='fuel-power';newRun.id='fuel-new-run';power.setAttribute('aria-label','Toggle discharge power');
 const driveKey=el('span');driveKey.className='fuel-drive-key';driveKey.setAttribute('aria-label','Prescribed drive directions');
 for(const [key,text]of [['B','B'],['J','J'],['force','J × B']]){const label=el('span',text);label.dataset.layer=key;driveKey.append(label);}
 play.id='fuel-motion-play';restart.id='fuel-motion-restart';clock.id='fuel-motion-clock';seek.id='fuel-motion-time';seek.type='range';seek.min='0';seek.max='1';seek.step='any';seek.value='0';seek.setAttribute('aria-label','Physical time');seek.hidden=true;
 motionBar.append(play,power,restart,newRun,seek,legend,driveKey,clock);
 const playbackPosition=floatingPlayback(motionBar);
 clock.setAttribute('aria-live','off');
 const pair=makeSelect(nodes.controls,'fuel-pair','Feed',Object.entries(FUEL_PAIRS).map(([id,p])=>[id,p.label]));
 const controls=new Map<NumericFuelKey,NumericControl>(),sections=new Map<string,HTMLDetailsElement>();
 for(const [key,title,unit,min,max,step,log,section]of fields){
  let host:HTMLElement=nodes.controls;
  if(section){if(!sections.has(section)){const detail=el('details');detail.append(el('summary',section));nodes.controls.append(detail);sections.set(section,detail);}host=sections.get(section)!;}
  const box=el('div'),label=el('label'),input=el('input'),output=el('output');box.className='control';
  input.type='range';input.id=`fuel-${key}`;input.min=String(min);input.max=String(max);input.step=String(log?'any':step);input.value=String(log?Math.log10(DEFAULT_FUEL_CENTRIFUGE[key]):DEFAULT_FUEL_CENTRIFUGE[key]);
  input.dataset.rangeScale=log?'log10':'linear';input.dataset.unit=unit;if(['stages','feedStage'].includes(key))input.dataset.integer='true';
  label.htmlFor=input.id;label.append(el('span',title),output);box.append(label,input);host.append(box);
  // Native range serialization rounds log coordinates; retain the exact physical default.
  const initialCoordinate=input.value;
  const read=()=>log?(input.value===initialCoordinate?DEFAULT_FUEL_CENTRIFUGE[key]:10**Number(input.value)):Number(input.value);
  const refresh=()=>{output.textContent=`${fmt(read())} ${unit}`;input.setAttribute('aria-valuetext',output.textContent);};refresh();
  controls.set(key,{input,read,refresh});input.addEventListener('input',changed);
 }
 const seed=el('input'),seedLabel=el('label','Lithium-seeded CIV reference');seed.id='fuel-lithiumSeed';seed.type='checkbox';seedLabel.htmlFor=seed.id;
 sections.get('Mechanical assumptions')!.append(seed,seedLabel);seed.addEventListener('change',changed);
 const thermalSetup=el('details'),thermalTitle=el('summary','Thermal model'),thermalEnable=el('input'),thermalLabel=el('label','Evolve gas & liner temperature');
 thermalEnable.type='checkbox';thermalEnable.id='fuel-thermal-enabled';thermalLabel.htmlFor=thermalEnable.id;thermalSetup.append(thermalTitle,thermalEnable,thermalLabel);nodes.controls.append(thermalSetup);
 const thermalModel=makeSelect(thermalSetup,'fuel-thermal-model','Liner model',[['lumped','Lumped reservoir'],['spatial','Radial tungsten liner']]);
 const gasModel=makeSelect(thermalSetup,'fuel-thermal-gasModel','Gas model',[['lumped','Lumped reservoir'],['spatial','Spatial mixture · experimental']]);
 const thermalResolution=makeSelect(thermalSetup,'fuel-thermal-resolution','Resolution',[['interactive','Interactive · 64 cells'],['refined','Refined · 256 cells']]);
 thermalResolution.addEventListener('change',changed);
 const gasConductivityLabel=el('label','Gas conductivity (W/m K)'),gasConductivity=el('input');gasConductivity.id='fuel-thermal-gasConductivityWMK';gasConductivityLabel.htmlFor=gasConductivity.id;gasConductivity.type='number';gasConductivity.min='0';gasConductivity.max='1000';gasConductivity.step='any';gasConductivity.value='0.1';
 const gasScope=el('p','Common local temperature · prescribed conductivity and wall film · no radial momentum closure');thermalSetup.append(gasConductivityLabel,gasConductivity,gasScope);
 gasModel.addEventListener('change',()=>{changed();draw();});gasConductivity.addEventListener('input',changed);
 const thicknessLabel=el('label','Liner thickness (mm)'),thickness=el('input');thickness.id='fuel-thermal-thicknessMm';thicknessLabel.htmlFor=thickness.id;thickness.type='number';thickness.min='0.1';thickness.max='20';thickness.step='any';thickness.value='1';
 const spatialScope=el('p','Tungsten: 300–1900 K · radial solid heat flow');thermalSetup.append(thicknessLabel,thickness,spatialScope);
 thermalModel.addEventListener('change',()=>{changed();draw();});thickness.addEventListener('input',changed);
 const thermalControls=new Map<keyof Pick<FuelThermalOptions,'wallCapacityJK'|'gasWallWK'|'coolingWK'|'coolantK'>,HTMLInputElement>();
 for(const [key,title,unit,min,max]of [['wallCapacityJK','Liner heat capacity','J/K',.001,1e6],['gasWallWK','Gas–liner conductance','W/K',0,1e6],['coolingWK','Liner cooling conductance','W/K',0,1e6],['coolantK','Coolant temperature','K',1,10000]] as const){
  const label=el('label',`${title} (${unit})`),input=el('input');input.type='number';input.id=`fuel-thermal-${key}`;label.htmlFor=input.id;input.min=String(min);input.max=String(max);input.step='any';input.value=String(DEFAULT_FUEL_THERMAL[key]);input.addEventListener('input',changed);thermalControls.set(key,input);thermalSetup.append(label,input);
 }
 thermalEnable.addEventListener('change',()=>{changed();draw();});
 thermalSetup.append(controls.get('linerK')!.input.closest('.control')!);
 const thermalRead=():FuelThermalOptions=>thermalEnable.checked?{...DEFAULT_FUEL_THERMAL,enabled:true,...Object.fromEntries([...thermalControls].map(([key,input])=>[key,key==='wallCapacityJK'&&thermalModel.value==='spatial'?DEFAULT_FUEL_THERMAL[key]:Number(input.value)])),...(thermalModel.value==='spatial'?{spatial:{material:'tungsten',thicknessM:Number(thickness.value)/1000,cells:16},...(gasModel.value==='spatial'?{gas:{conductivityWMK:Number(gasConductivity.value),...(thermalResolution.value==='refined'?{accuracy:{relativeTolerance:6.25e-7,temperatureToleranceK:1e-7}}:{})}}:{})}:{})}:{...DEFAULT_FUEL_THERMAL,enabled:false};
 const selector=makeSelect(nodes.plots,'fuel-plot','Plot',Object.entries(topics).map(([id,[title]])=>[id,title]));
 selector.value='spin';
 const metrics=el('div'),plotHost=el('div'),explanation=el('p'),exportButton=el('button','Export'),compositionReadout=el('output');
 compositionReadout.id='fuel-composition-readout';compositionReadout.hidden=true;compositionReadout.setAttribute('aria-live','off');
 const samplePosition=el('strong'),sampleCounts=el('p'),samplePercent=el('p'),sampleChange=el('p'),sampleBounds=el('p'),sampleBar=el('div'),sampleLight=el('span'),sampleHeavy=el('span');
 sampleBar.className='fuel-sample-bar';sampleBar.setAttribute('aria-hidden','true');sampleBar.append(sampleLight,sampleHeavy);
 compositionReadout.append(samplePosition,sampleCounts,sampleBar,samplePercent,sampleChange,sampleBounds);
 const probeControls=el('div'),probeRadius=el('input'),probeLabel=el('label','Sample position · center → outer wall'),densityReading=el('p');
 probeControls.id='fuel-sample-controls';probeControls.hidden=true;probeRadius.id='fuel-sample-radius';probeRadius.type='range';probeRadius.min='0';probeRadius.max='1';probeRadius.step='any';probeLabel.htmlFor=probeRadius.id;
 const probeEnds=el('div');probeEnds.className='fuel-sample-ends';
 for(const [value,title]of [[0,'At axis'],[1,'At wall']] as const){const button=el('button',title);button.type='button';button.addEventListener('click',()=>sampleRadius(value));probeEnds.append(button);}
 probeControls.append(probeLabel,probeRadius,probeEnds);probeRadius.addEventListener('input',()=>sampleRadius(Number(probeRadius.value)));
 function sampleRadius(fraction:number){playing=false;selectProbe(fraction);playback();}
 densityReading.id='fuel-density-reading';densityReading.hidden=true;
 metrics.className='fuel-metrics';plotHost.className='live-plots';explanation.className='fuel-explanation';exportButton.id='fuel-export';exportButton.disabled=true;
 nodes.plots.append(metrics,explanation,compositionReadout,probeControls,densityReading,plotHost,exportButton);selector.addEventListener('change',draw);
 const locate=el('button','Show in 3D');locate.id='fuel-locate-plot';nodes.plots.insertBefore(locate,metrics);
 locate.addEventListener('click',()=>{
  const layer={separation:'composition',composition:'composition',profile:'density',spin:'speed',momentum:'speed',inertia:'density'}[selector.value];
  if(layer){for(const [key,value]of [['representation','both'],['layer',layer]]){const input=nodes.view.querySelector<HTMLSelectElement>(`#fuel-view-${key}`)!;input.value=value;input.dispatchEvent(new doc.defaultView!.Event('change'));}viewer?.select('slice');viewer?.focus?.('slice',{animate:true});}
  else if(['thermalProfile','gasEnergy','gasPressure'].includes(selector.value)&&latest?.result.transport?.operation?.thermal?.gas){
   if(!['spin','transport'].includes(motionMode.value))elapsed=pinned?Math.min(latest.result.config.durationS,pinned.config.durationS):latest.result.config.durationS;
   motionMode.value='transport';playing=false;
   for(const [key,value]of [['representation','both'],['layer','temperature']]){const input=nodes.view.querySelector<HTMLSelectElement>(`#fuel-view-${key}`)!;input.value=value;input.dispatchEvent(new doc.defaultView!.Event('change'));}
   draw();playback();viewer?.select('slice');viewer?.focus?.('slice',{animate:true});
  }
  else{const id={heat:'electrodes',thermal:latest?.result.config.pair==='lithium'?'liner':'vessel',thermalProfile:latest?.result.config.pair==='lithium'?'liner':'vessel',cut:'light-outlet',cascade:'stages',pump:'pump',field:'coils',inventory:'pump',lithium:'liner'}[selector.value];if(id){viewer?.select(id);viewer?.focus?.(id,{animate:true});}}
 });
 nodes.inspect.append(el('p','Selecting a part highlights it. Its sliders edit the same inputs as Controls.'));
 const inspectSelect=makeSelect(nodes.inspect,'fuel-component','Component',[]),description=el('div'),reset=el('button','Reset 3D view');nodes.inspect.append(reset,description);
 reset.addEventListener('click',()=>viewer?.reset());inspectSelect.addEventListener('change',()=>describe(inspectSelect.value));
 const focus=el('button','Frame component');focus.id='fuel-focus-component';focus.addEventListener('click',()=>viewer?.focus?.(inspectSelect.value,{animate:true}));nodes.inspect.insertBefore(focus,description);
 nodes.info.append(el('h3','Published concept · conditional model'));
 const sources=[['Patent WO2026064411A1','https://patents.google.com/patent/WO2026064411A1/en'],['Newer patent text · mirror','https://eureka.patsnap.com/patent/WO2026136752A2'],['Marathon fuel cycle','https://www.marathonfusion.com/fusion-energy/'],['Tritium-Lean paper · §VII.2','https://arxiv.org/html/2410.05238v2#S7.SS2'],['External centrifuge thermal study','https://arxiv.org/abs/2607.28208'],['NIST lithium vapor pressure','https://webbook.nist.gov/cgi/cbook.cgi?ID=C7439932&Mask=4'],['NIST solid tungsten heat capacity','https://webbook.nist.gov/cgi/cbook.cgi?ID=C7440337&Mask=2'],['Tungsten thermal properties · Tolias','https://arxiv.org/abs/1703.06302']];
 for(const [title,url]of sources){const a=el('a',title);a.href=url;a.target='_blank';a.rel='noopener';const p=el('p');p.append(a);nodes.info.append(p);}
 for(const [title,text]of [
  ['Partial ionization','A small driven ion population transfers momentum to mostly neutral gas. Hot electrons can sustain ionization while cooler heavy gas improves separation. Ion fraction, conductivity and collision rate are independent assumed inputs; electron heating, ionization, recombination and dissociation kinetics are not solved.'],
  ['Current localization','Annular drive and a rigid interior are disclosed approaches to reduce shear. This model imposes rigid rotors; it does not resolve the velocity profile or qualify turbulence suppression.'],
  ['Lithium handling','A hot refractory sub-vessel and controlled outlets manage lithium transport. The newer disclosure gives ≥700 °C as an embodiment, not a universal condensation threshold. Vapor pressure, condensation, erosion and wall lifetime need material data.'],
  ['Molecular feed','D₂ and ⁴He have nearly equal mass. Compare atomic D/He with molecular He/D₂: dissociation matters before mass separation.'],
  ['CIV','Relative ion–neutral speed is the physical context. Both slip/CIV and nominal neutral-wall-speed/CIV are displayed; neither clips the dynamics or certifies discharge stability. Lithium seeding changes this reference only.'],
  ['Fuel inventory','For β = burned/injected, unburned exhaust is burn×(1/β−1). Processing inventory is that exhaust rate times delay. Gross fuel circulation is larger; neither is the whole plant inventory.'],
  ['Tradeoffs','Stronger drive increases the equilibrium mass bias and dissipated heat; more drag reduces spin. High B reduces resistive demand only at matched torque. Small product cuts raise purity at a recovery cost; stages increase internal circulation. Low gas temperature favors separation but lithium surfaces must manage vapor transport. Strong centrifugal pumping still meets the inlet-conductance ceiling.'],
 ]){const d=el('details');d.append(el('summary',title),el('p',text));nodes.info.append(d);}
 const assumptions=el('ul');nodes.info.append(assumptions);
 let active=false,dirty=true,updating=false,timer:ReturnType<typeof setTimeout>|undefined,controller:AbortController|undefined,revision=0,latest:AcceptedFuel|null=null,viewer:ApparatusViewer<FuelModel>|null=null,graphics:Graphics|null=null,disposed=false,hasSelection=false;
 let exportController:AbortController|null=null,exportURL:string|null=null,exportTimer:ReturnType<typeof setTimeout>|undefined;
 function cancelExport(){
  exportController?.abort();exportController=null;clearTimeout(exportTimer);
  if(exportURL){URL.revokeObjectURL(exportURL);exportURL=null;}
  exportButton.textContent='Export';
 }
 let currentEvents:FuelCurrentEvent[]=[],operatingConfig:FuelConfig|null=null,resume:FuelResume|null=null,lastPoweredCurrent=DEFAULT_FUEL_CENTRIFUGE.currentA;
 const eventHistory=el('details');eventHistory.append(el('summary','Drive history'));nodes.plots.append(eventHistory);
 let motion:Geometry['motion']|null=null,tools:Geometry['tools']|null=null,baselineViewer:ApparatusViewer<FuelModel>|null=null,baselineMotion:Geometry['motion']|null=null,baselineTools:Geometry['tools']|null=null,pinned:PinnedFuelSnapshot|null=null,plotCursor:ReturnType<typeof renderPlots>|null=null,lastProfileTime=-Infinity,dragCut:number|null=null,elapsed=0,playing=!doc.defaultView!.matchMedia?.('(prefers-reduced-motion: reduce)').matches;const timeScales:Record<string,number>={};
 const learning=createFuelLearningTools({document:doc,host:nodes.plots,sampleState:r=>diagnosticState(r),onCompare:()=>{playing=false;playback();draw();}});
 nodes.plots.insertBefore(nodes.plots.querySelector('#fuel-result-scope')!,metrics);
 nodes.plots.insertBefore(nodes.plots.querySelector('#fuel-input-coverage')!,metrics);
 const views=createFuelViewTools({document:doc,host:nodes.view,onChange:()=>{applyViews();draw();viewer?.refresh();baselineViewer?.refresh();},onCamera:direction=>{const pose=viewer?.cameraPose?.();if(!pose)return;const distance=Math.hypot(...pose.position.map((v,i)=>v-pose.target[i])),norm=Math.hypot(...direction),next:CameraPose={...pose,position:direction.map((v,i)=>pose.target[i]+v*distance/norm) as CameraVector};viewer!.setCamera(next);baselineViewer?.setCamera?.(next);}});
 const comparisons=createFuelComparisonTools({document:doc,host:nodes.view,request,onApply:applyConfig,onPin:value=>{pinned=value;void showBaseline();draw();},onClear:()=>{pinned=null;baselineTools?.dispose();baselineTools=null;baselineViewer?.dispose();baselineViewer=null;baselineMotion=null;baselineFrame.hidden=true;comparisonLabel.hidden=true;nodes.render.classList.remove('fuel-comparing');if(tools&&latest){tools.setDomains({...Object.fromEntries((['composition','density','speed'] as const).map(layer=>[layer,comparisonDomain([latest!.result],layer)])),temperature:temperatureDomain([latest.result])});views.updateLegend(tools);}viewer?.resize();draw();}});
 function acceptComparison(){comparisons.accept(latest?{...latest,camera:viewer?.cameraPose?.(),timeS:Math.min(elapsed,latest.result.config.durationS),mode:motionMode.value}:null);}
 function applyConfig(config:FuelConfig){for(const [key,c]of controls){if(c.input.dataset.integer!=='true')c.input.step='any';c.input.value=String(c.input.dataset.rangeScale==='log10'?Math.log10(config[key]):config[key]);}pair.value=config.pair;application.value=config.application;seed.checked=config.lithiumSeed;changed();}
 function syncProbes(){const radius=views.state.radius*(latest?.result.config.radiusM??tools?.radiusM??0);tools?.setProbe?.(views.state.radius);if(baselineTools)baselineTools.setProbe(Math.min(1,radius/baselineTools.radiusM));}
 function applyViews(){if(hasSelection)viewer?.select(null);for(const value of [tools,baselineTools])views.apply(value);syncProbes();if(hasSelection)viewer?.select(inspectSelect.value);for(const value of [motion,baselineMotion])value?.setSpecies?.(views.state.species);for(const label of driveKey.querySelectorAll<HTMLElement>('[data-layer]'))label.hidden=views.state.drive!=='all'&&views.state.drive!==label.dataset.layer;views.refreshSample(tools);refreshGasLegend();}
 function refreshComposition(state?:DiagnosticState){
  if(!latest||selector.value!=='composition')return;
  const r=latest.result,s=sampleFuelField(r,views.state.radius*r.config.radiusM,state??diagnosticState(r));
  compositionReadout.setAttribute('aria-live',playing?'off':'polite');
  samplePosition.textContent=`${views.state.radius===0?'At the axis (center)':views.state.radius===1?'At the wall (outer edge)':`Between axis and wall`} · r ${fmt(100*s.radiusM)} cm · ${fmt(s.timeS)} s`;
  const x=s.lightFraction,delta=x===null?null:Number((100*(x-r.config.lightFraction)).toFixed(3));
  sampleCounts.textContent=x===null?'Composition undefined · no resolved local density':`In 1,000 atoms here, about ${Math.round(1000*x)} are ${r.pair.light} and ${1000-Math.round(1000*x)} are ${r.pair.heavy}.`;
  samplePercent.textContent=x===null?'':`${r.pair.light} ${fmt(100*x)}% · ${r.pair.heavy} ${fmt(100*(1-x))}%`;
  sampleChange.textContent=`Feed: ${fmt(100*r.config.lightFraction)}% ${r.pair.light}. ${delta===null?'No local fraction to compare.':delta===0?'Same light percentage at displayed precision.':`${fmt(Math.abs(delta))} percentage points ${delta>0?'more':'less'} light than the feed.`}`;
  sampleBar.hidden=x===null;sampleLight.style.width=`${100*(x??0)}%`;sampleHeavy.style.width=`${100*(1-(x??0))}%`;
  probeRadius.value=String(views.state.radius);probeRadius.setAttribute('aria-valuetext',`${fmt(100*s.radiusM)} cm from the axis`);
  sampleBounds.textContent=pinned&&s.radiusM>pinned.result.config.radiusM?'A probe at wall; selected radius is outside A':'';
  compositionReadout.dataset.radiusM=String(s.radiusM);compositionReadout.dataset.timeS=String(s.timeS);
  compositionReadout.dataset.lightFraction=s.lightFraction===null?'':String(s.lightFraction);
  plotCursor?.setCursor(s.radiusM*100);
 }
 function selectProbe(fraction:number){views.selectRadius(fraction);syncProbes();views.refreshSample(tools);refreshComposition();viewer?.refresh();baselineViewer?.refresh();}
 function diagnosticState(result:FuelResult):DiagnosticState{
  if(['spin','transport'].includes(motionMode.value)&&result.transport)return {...sampleFuelTransport(result.transport,elapsed),scope:`Coupled rotor and radial transport · ${result.transport.operation?.thermal?.enabled?'evolving thermal reservoirs':'fixed temperature'}`};
  if(motionMode.value==='spin'){const m=result.mechanics,response=rotorResponse(m.ii,m.nn,m.gamma,m.drag,m.torque,elapsed);return {ionRadS:response.ion,profiles:result.profiles.map(p=>({...p,lightDensityRatio:1,heavyDensityRatio:1})),neutralRadS:response.neutral,timeS:elapsed,scope:'Spin-up only · uniform density'};}
  const end=result.samples.at(-1)!;
  return {timeS:end.timeS,ionRadS:end.ionRadS,neutralRadS:end.neutralRadS,currentA:end.currentA??result.config.currentA,scope:'Final equilibrium reference · not finite-time transport'};
 }
 function refreshGasLegend(){
  if(!latest)return;
  const field=views.state.representation==='field',l=tools?.legend;
  const labels=field?[l?`${l.label}: ${l.domain.map(n=>Number(n.toPrecision(3))).join(' → ')} ${l.unit}`:'Gas cutaway']:[`● ${latest.result.pair.light}`,`● ${latest.result.pair.heavy}`,`○ ions · weighted${['transport','flow'].includes(motionMode.value)?' · rotation averaged':''}`];
  const key=JSON.stringify(labels);if(legend.dataset.key===key)return;legend.dataset.key=key;
  legend.replaceChildren(...labels.map((text,i)=>{const node=el('span',text);if(field&&l){node.style.borderBottom='3px solid';node.style.borderImage=`linear-gradient(to right,${l.colors.join(',')}) 1`;}else node.className=`fuel-gas-${i}`;return node;}));
 }
 async function showBaseline(){
  if(!pinned||!graphics||!active)return;const accepted=pinned;
  baselineFrame.hidden=false;comparisonLabel.hidden=false;nodes.render.classList.add('fuel-comparing');
  baselineTools?.dispose();baselineTools=null;
  if(!baselineViewer)baselineViewer=graphics[0].createApparatusViewer<FuelModel>(baselineFrame,{loader:{loadAsync:(value:FuelModel)=>{const built=graphics![1].buildFuelCentrifugeGeometry({...value,diagnostics:true});baselineMotion=built.motion;baselineTools=built.tools;return Promise.resolve(built);}},onCamera:pose=>viewer?.setCamera?.(pose),onResize:()=>baselineViewer?.setCamera?.(viewer?.cameraPose?.(),{preserveOwnership:true}),pickFilter:hit=>baselineTools?.visibleHit(hit)??true,onError:error=>{comparisonLabel.textContent=message(error);}});
  await baselineViewer.load({model:{config:accepted.result.config,result:accepted.result},modelCamera:{position:[0,1,.65],portraitPosition:[1,.65,.45],target:[0,0,0],up:[0,1,0],fitScale:.78}},{preserveOwnership:true});
  if(pinned!==accepted||disposed)return;
  viewer?.resize();baselineViewer.setCamera?.(viewer!.cameraPose?.(),{preserveOwnership:true});applyViews();playback();
 }
 const reducedMotion=doc.defaultView!.matchMedia?.('(prefers-reduced-motion: reduce)');
 function animateGas(dt=0){
  if(!motion||!latest||dirty||updating)return;
  const mode=motionMode.value as FuelMotionMode,transient=mode==='spin'||mode==='transport';
  let suggested=motion.update(elapsed,mode).secondsPerScreenSecond;
  if(baselineMotion)suggested=Math.min(suggested,baselineMotion.update(elapsed,mode).secondsPerScreenSecond);
  // Fast real rotation is azimuthally averaged in transport mode so diffusion can be explored in seconds.
  if(mode==='transport')suggested=Math.min(latest.result.config.durationS/8,1);
  timeScales[motionMode.value]??=suggested;
  // Preserve slider comparisons; retime only outside the visual sampling budget.
  const scale=Math.min(timeScales[motionMode.value],suggested*(motionMode.value==='flow'?2:8));
  elapsed+=dt*scale;
  const c=latest.result.config,limit=pinned?Math.min(c.durationS,pinned.config.durationS):c.durationS;
  if((transient||pinned)&&elapsed>=limit){elapsed=limit;playing=false;}
  const state=motion.update(elapsed,mode,scale);
  play.textContent=playing?'Pause':'Play';play.setAttribute('aria-pressed',String(playing));seek.hidden=!transient;seek.max=String(limit);seek.value=String(elapsed);seek.setAttribute('aria-valuetext',`${fmt(elapsed)} s`);
  const diagnostic=diagnosticState(latest.result);tools?.update(diagnostic);views.refreshSample(tools);refreshComposition(diagnostic);
  const current=diagnostic.currentA??c.currentA;tools?.drive?.setCurrent?.(current);power.textContent=current>0?'Cut power':'Power on';power.setAttribute('aria-pressed',String(current>0));
  power.disabled=dirty||!transient||elapsed>=60;refreshInstrument(diagnostic);
  const readouts=metrics.querySelectorAll('strong');
  if(transient&&selector.value==='spin'&&readouts.length){readouts[0].textContent=`${fmt(state.speeds.neutral*c.radiusM)} m/s`;readouts[1].textContent=`${fmt(Math.abs(state.speeds.ion-state.speeds.neutral)*c.radiusM/latest.result.mechanics.criticalVelocityMS)} `;readouts[2].textContent=`${fmt(state.speeds.neutral*c.radiusM/latest.result.mechanics.criticalVelocityMS)} `;}
  if(transient&&selector.value==='heat'&&latest.result.transport&&readouts.length){const energy=sampleFuelTransport(latest.result.transport,elapsed).energy;readouts[1].textContent=`${fmt(energy.redistributionWorkJ)} J`;readouts[2].textContent=`${fmt(energy.numericalDissipationJ)} J`;}
  if(selector.value==='heat'&&readouts.length)readouts[0].textContent=`${fmt(current**2*Math.log(1/c.driveInnerFraction)/(2*Math.PI*c.lengthM*c.conductivitySm))} W`;
  if(selector.value==='thermal'&&diagnostic.thermal){readouts[0].textContent=`${fmt(diagnostic.thermal.pressurePa)} Pa`;readouts[1].textContent=`${fmt(diagnostic.thermal.coolingEnergyJ)} J`;}
  views.updateLegend(tools);
  refreshGasLegend();
  if(transient&&['separation','momentum','inertia'].includes(selector.value)&&latest.result.transport){const sample=sampleFuelTransport(latest.result.transport,elapsed),rows=metrics.querySelectorAll('strong');if(rows.length===3){rows[0].textContent=`${fmt(sample.timeS)} s`;rows[1].textContent=`${fmt(sample.neutralInertiaRatio)} × initial inertia`;}}
  if(pinned&&baselineMotion){
   const comparison=comparisonFrame(pinned,latest,elapsed);
   baselineMotion.update(comparison.timeS,mode,scale);const baselineState=diagnosticState(pinned.result);baselineTools?.update(baselineState);baselineTools?.drive?.setCurrent?.(baselineState.currentA??pinned.result.config.currentA);
   for(const value of [tools,baselineTools])value?.setDomains({...comparison.domains,temperature:temperatureDomain([pinned.result,latest.result])});
   views.updateLegend(tools);
   comparisonLabel.textContent=`${transient?`A pinned · B current · ${fmt(comparison.timeS)} s`:'A/B final references'} · shared SI camera/colors${comparison.sameGeometry?'':' · geometry differs'}${comparison.sameProducingCode?'':' · source identities differ/unavailable'}`;
   baselineViewer?.refresh();
  }
  const scanInput=scanInputs[selector.value];
  if(selector.value!=='composition')plotCursor?.setCursor(scanInput?c[scanInput]:transient&&['spin','heat','thermal','separation','momentum','inertia'].includes(selector.value)?elapsed:NaN);
  if(transient&&['composition','profile','cut','thermalProfile','gasEnergy','gasPressure'].includes(selector.value)&&Math.abs(elapsed-lastProfileTime)>=c.durationS/80){lastProfileTime=elapsed;draw();}
  acceptComparison();
  setStatus(transient?`Closed vessel · ${diagnostic.thermal?'evolving temperature':'thermal bath'}${(latest.result.transport?.maxCellExponent??0)>1?' · wall layer finer than radial grid':''}`:status.dataset.reference??status.textContent);
  const timeUnit=scale>=.001?`${fmt(scale*1000)} ms`:`${fmt(scale*1e6)} µs`;
  clock.textContent=`${transient?`${fmt(elapsed)} s · 1 s screen = ${timeUnit}`:'Final reference'} · ions ${fmt(state.speeds.ion*c.radiusM)} / gas ${fmt(state.speeds.neutral*c.radiusM)} m/s${diagnostic.thermal?` · ${fmt(diagnostic.thermal.gasK)} K`:''}`;
  if(!playing)viewer?.setAnimation(null);
 }
 function playback(){
  animateGas();viewer?.refresh();viewer?.setAnimation(active&&!dirty&&!updating&&playing&&motion?animateGas:null);
 }
 play.addEventListener('click',()=>{playing=!playing;playback();});
 restart.addEventListener('click',()=>{elapsed=0;playback();});
 newRun.addEventListener('click',()=>{changed();void run();});
 power.addEventListener('click',()=>{if(power.disabled||!latest)return;const current=sampleFuelTransport(latest.result.transport!,elapsed).currentA??latest.result.config.currentA;if(current>0)lastPoweredCurrent=current;controls.get('currentA')!.input.value=String(current>0?0:lastPoweredCurrent);changed({target:controls.get('currentA')!.input});});
 motionMode.addEventListener('change',()=>{elapsed=0;draw();playback();});
 seek.addEventListener('input',()=>{elapsed=Number(seek.value);playing=false;draw();playback();});
 const reduce=(event:MediaQueryListEvent)=>{if(event.matches){playing=false;playback();}};reducedMotion?.addEventListener('change',reduce);
 plotHost.addEventListener('focusin',()=>{if(playing){playing=false;playback();}});
 const read=():FuelConfig=>({...DEFAULT_FUEL_CENTRIFUGE,...Object.fromEntries([...controls].map(([key,c])=>[key,c.read()])),pair:pair.value as FuelConfig['pair'],application:application.value as FuelConfig['application'],lithiumSeed:seed.checked});
 function dependencies(){
  thermalEnable.disabled=pair.value==='molecular';if(thermalEnable.disabled)thermalEnable.checked=false;thermalEnable.title=thermalEnable.disabled?'Atomic thermal closure does not model D₂ internal modes.':'';
  const spatial=thermalEnable.checked&&thermalModel.value==='spatial';thermalModel.disabled=!thermalEnable.checked;thickness.disabled=!spatial;thickness.hidden=!spatial;thicknessLabel.hidden=!spatial;spatialScope.hidden=!spatial;
  gasModel.disabled=!spatial;if(!spatial)gasModel.value='lumped';
  const spatialGas=spatial&&gasModel.value==='spatial';gasConductivity.disabled=!spatialGas;gasConductivity.hidden=!spatialGas;gasConductivityLabel.hidden=!spatialGas;gasScope.hidden=!spatialGas;
  thermalResolution.disabled=!spatialGas;thermalResolution.parentElement!.hidden=!spatialGas;
  gasScope.textContent=`Common local temperature · prescribed conductivity and wall film · no radial momentum closure${spatialGas&&thermalResolution.value==='refined'?' · Refined runs are slower · temporal error estimate; spatial refinement remains necessary':''}`;
  for(const [key,input]of thermalControls){if(!thermalEnable.checked){const value=Number(input.value);if(input.value===''||!Number.isFinite(value)||value<Number(input.min)||value>Number(input.max))input.value=String(DEFAULT_FUEL_THERMAL[key]);}const materialCapacity=spatial&&key==='wallCapacityJK';input.disabled=!thermalEnable.checked||materialCapacity;input.hidden=materialCapacity;thermalSetup.querySelector<HTMLLabelElement>(`label[for="${input.id}"]`)!.hidden=materialCapacity;}
  controls.get('linerConductanceWK')!.input.disabled=thermalEnable.checked;
  const feed=controls.get('feedStage')!.input;feed.max=String(controls.get('stages')!.read());if(Number(feed.value)>Number(feed.max))feed.value=feed.max;
  for(const c of controls.values())c.refresh();
  sections.get('Collection & stages')!.hidden=application.value==='pump';sections.get('Lithium surfaces')!.hidden=pair.value!=='lithium';
  for(const option of selector.options)option.disabled=application.value==='pump'&&['cut','cascade'].includes(option.value)||pair.value!=='lithium'&&option.value==='lithium';
  if(selector.selectedOptions[0]?.disabled)selector.value=application.value==='pump'?'pump':'spin';
 }
 function changed(event?:Event|{target:HTMLInputElement},editedInput:EventTarget|null|undefined=event?.target){
  if(disposed)return;
  const intervention=event?.target===controls.get('currentA')!.input&&latest?.result.transport?.operation&&elapsed>0&&['spin','transport'].includes(motionMode.value);
  if(intervention){
   try{currentEvents=fuelCurrentIntervention(latest!.result.transport!.operation!.events,elapsed,controls.get('currentA')!.read());}
   catch(error){const control=controls.get('currentA')!,current=sampleFuelTransport(latest!.result.transport!,elapsed).currentA??latest!.result.config.currentA;control.input.value=String(current);control.refresh();for(const input of description.querySelectorAll<HTMLInputElement>('input[data-key="currentA"]'))input.value=String(current);playing=false;playback();setStatus(`${message(error)} Start a new run to reset drive history.`);return;}
   operatingConfig={...latest!.result.config};resume={transport:latest!.result.transport!,timeS:elapsed};
   if(elapsed>=operatingConfig.durationS){operatingConfig.durationS=Math.min(60,operatingConfig.durationS+Math.max(.1,latest!.result.config.durationS));controls.get('durationS')!.input.value=String(operatingConfig.durationS);}
  }else{currentEvents=[];operatingConfig=null;resume=null;elapsed=0;}
  dependencies();sensitivity.invalidate();
  for(const input of description.querySelectorAll<HTMLInputElement>('input[data-key]')){
   const control=controls.get(input.dataset.key as NumericFuelKey)!;if(input!==editedInput&&event?.target===control.input)input.value=String(input.type==='number'?control.read():control.input.value);
  }
  cancelExport();dirty=true;revision++;controller?.abort();exportButton.disabled=true;
  draw();
  status.textContent=latest?'Updating · previous accepted state':'Updating…';clearTimeout(timer);if(active)timer=setTimeout(run,120);
  viewer?.setAnimation(null);motionBar.hidden=true;
  comparisons.accept(null);power.disabled=true;refreshInstrument();
  learning.setPending();
 }
 pair.addEventListener('change',changed);application.addEventListener('change',changed);
 function componentResponse(id:string){
  if(id==='liner')return latest?.result.transport?.operation?.thermal?.enabled?'thermal':'lithium';
  return ({coils:'spin',supply:'spin',electrodes:'spin',pump:'pump',feed:'pump','light-outlet':'cut'})[id]??'separation';
 }
 function describe(id:string,part?:Record<string,unknown>,name?:string,highlight=true){
  const record=graphics?.[1].FUEL_COMPONENTS.find(c=>c.id===id);if(!record)return;
  if(highlight)hasSelection=true;
  inspectSelect.value=id;viewer?.select(hasSelection?id:null);
  if(description.dataset.component===id){description.querySelector('h3')!.textContent=name||record.name;[typeof part?.purpose==='string'?part.purpose:record.purpose,typeof part?.materialBasis==='string'?part.materialBasis:record.material,record.basis].forEach((text,i)=>description.querySelectorAll('details p')[i].textContent=text);for(const input of description.querySelectorAll<HTMLInputElement>('input[data-key]')){if(doc.activeElement!==input){const control=controls.get(input.dataset.key as NumericFuelKey)!;input.value=String(input.type==='number'?control.read():control.input.value);}}refreshInstrument();return;}
  description.dataset.component=id;description.replaceChildren(el('h3',name||record.name));
  if(['supply','electrodes'].includes(id)){const toggle=el('button');toggle.dataset.power='';toggle.addEventListener('click',()=>power.click());description.append(toggle);}
  for(const key of FUEL_COMPONENT_CONTROLS[id]??[]){
   const control=controls.get(key)!,box=el('div'),definition=fields.find(f=>f[0]===key)!,label=el('label',`${definition[1]} (${definition[2]||'fraction'})`),input=el('input'),number=el('input'),log=control.input.dataset.rangeScale==='log10';input.type='range';number.type='number';input.id=`fuel-component-${key}`;label.htmlFor=input.id;
   input.min=control.input.min;input.max=control.input.max;input.step=control.input.step;input.value=control.input.value;
   number.min=String(log?10**Number(input.min):input.min);number.max=String(log?10**Number(input.max):input.max);number.step='any';number.value=String(control.read());number.setAttribute('aria-label',`${definition[1]} (${definition[2]||'fraction'}) precisely`);
   for(const n of [input,number])n.dataset.key=key;
   let numberEdit:{text:string;coordinate:string}|null=null;
   const update=(event:Event)=>{
    const target=event.target as HTMLInputElement;
    // Blur commits the input event again; retain change-only edits without rerunning the same value.
    if(event.type==='change'&&numberEdit?.text===number.value&&numberEdit.coordinate===control.input.value)return;
    if(target.value===''||!target.checkValidity()){numberEdit=null;changed();return;}
    if(target===number&&control.input.dataset.integer!=='true')control.input.step=input.step='any';
    const value=Number(target.value);control.input.value=String(target===number&&log?Math.log10(value):value);input.value=control.input.value;
    if(target!==number)number.value=String(control.read());
    numberEdit=target===number?{text:number.value,coordinate:control.input.value}:null;
    changed({target:control.input},target);
   };
   input.addEventListener('input',update);number.addEventListener('input',update);number.addEventListener('change',update);box.className='fuel-view-control';box.append(label,input,number);description.append(box);
  }
  const effect=el('p');effect.dataset.effect='';description.append(effect);
  const response=el('output');response.dataset.response='';description.append(response);
  const resultButton=el('button');resultButton.dataset.showResponse='';resultButton.addEventListener('click',()=>{
   if(!latest||dirty||updating)return;
   selector.value=componentResponse(id);motionMode.value='transport';elapsed=latest.result.config.durationS;playing=false;
   draw();playback();onResults();
  });description.append(resultButton);
  const details=el('details');details.append(el('summary','Materials & model'),el('p',typeof part?.purpose==='string'?part.purpose:record.purpose),el('p',typeof part?.materialBasis==='string'?part.materialBasis:record.material),el('p',record.basis));description.append(details);refreshInstrument();
 }
 function refreshInstrument(state:DiagnosticState|null=latest?diagnosticState(latest.result):null){
  if(latest&&!dirty&&!exportButton.disabled){const control=controls.get('currentA')!,current=state?.currentA??latest.result.config.currentA;control.input.value=String(current);control.refresh();for(const input of description.querySelectorAll<HTMLInputElement>('input[data-key="currentA"]'))input.value=String(current);}
  for(const input of description.querySelectorAll<HTMLInputElement>('input[data-key]'))input.disabled=controls.get(input.dataset.key as NumericFuelKey)!.input.disabled;
  const toggle=description.querySelector<HTMLButtonElement>('[data-power]');if(toggle){toggle.textContent=power.textContent;toggle.disabled=power.disabled;toggle.setAttribute('aria-pressed',power.getAttribute('aria-pressed')??'false');}
  const id=description.dataset.component!,topic=componentResponse(id),button=description.querySelector<HTMLButtonElement>('[data-show-response]');
  if(button){button.disabled=!latest||dirty||updating;button.textContent=({spin:'Show end-of-run speeds',thermal:'Show end-of-run temperature',lithium:'Show liner vapor pressure',pump:'Show pumping reference',cut:'Show selected collection cut'})[topic]??'Show end-of-run separation';}
  const effect=description.querySelector<HTMLElement>('[data-effect]');
  if(effect)effect.textContent=id==='liner'?(topic==='thermal'?'Changes the initial liner temperature. Show the endpoint to see the evolved gas and wall.':'Thermal evolution is off: this changes liner vapor pressure, not the fixed gas temperature.'):
   id==='pump'||id==='feed'?'Pumping reference only. This does not change rotation or drive an inlet/outlet flow.':
   id==='light-outlet'?'Selects an inventory cut, not an extraction flow. The curve scans every cut; the marker shows yours.':
   ['coils','supply','electrodes'].includes(id)?'Changes the drive. A new run starts at 0 s; show its endpoint to compare speeds.':'';
  const output=description.querySelector<HTMLOutputElement>('[data-response]');if(!output||!latest)return;const r=latest.result;
  if(dirty||updating){output.textContent='Recomputing · previous result shown in plots';return;}
  const collection=state?.collection??r.collection,pct=(value:number|null)=>value===null?'—':fmt(100*value);
  const spatial=state?.thermal?.spatial;
  output.textContent=id==='liner'?`Gas ${fmt(state?.thermal?.gasK??r.config.gasK)} K · ${spatial?`tungsten ${fmt(spatial.minK)}–${fmt(spatial.maxK)} K`:`liner ${fmt(state?.thermal?.linerK??r.config.linerK)} K`}`:id==='light-outlet'?`Light ${pct(collection.innerLightPurity)}% · recovery ${pct(collection.lightRecovery)}%`:id==='pump'||id==='feed'?`Reference inlet speed ${fmt(r.pumping.effectiveSpeedM3S)} m³/s`:id==='coils'?`Prescribed field ${fmt(r.config.magneticT)} T`:`Gas ${fmt((state?.neutralRadS??0)*r.config.radiusM)} m/s · ${fmt(state?.currentA??r.config.currentA)} A`;
 }
 async function showGeometry(snapshot:AcceptedFuel){
  if(!active||disposed||dirty||updating||snapshot!==latest)return;
  graphics??=await loadGraphics();if(disposed||!active||dirty||updating||snapshot!==latest)return;
  if(!viewer){
   const [{createApparatusViewer},{buildFuelCentrifugeGeometry}]=graphics;
   viewer=createApparatusViewer<FuelModel>(frame,{loader:{loadAsync:(value:FuelModel)=>{const built=buildFuelCentrifugeGeometry({...value,diagnostics:true});motion=built.motion;tools=built.tools;return Promise.resolve(built);}},onCamera:pose=>baselineViewer?.setCamera?.(pose),onResize:pose=>baselineViewer?.setCamera?.(pose,{preserveOwnership:true}),pickFilter:hit=>tools?.visibleHit(hit)??true,onHover:hit=>{if(hit?.object.userData.componentId==='slice')views.showSample(tools!.sampleWorld(hit.point));},onDrag:event=>{
    if(event.phase==='start'){if(event.hits[0]?.object.userData.controlKey!=='cutFraction')return false;dragCut=tools!.projectCut(event.ray);return true;}
    if(event.phase==='move'&&dragCut!==null){const next=tools!.projectCut(event.ray);if(next!==null){dragCut=next;tools!.setCut(next);}return true;}
   if(event.phase==='cancel'){dragCut=null;tools?.setCut(latest!.result.config.cutFraction);return false;}
   if(event.phase==='end'&&dragCut!==null){controls.get('cutFraction')!.input.value=String(dragCut);dragCut=null;changed();}return false;
   },onSelect:(id,part,name,hit)=>{if(id==='slice'){const sample=hit&&tools?.sampleWorld(hit.point);if(sample)selectProbe(sample.radiusM/latest!.result.config.radiusM);playing=false;selector.value=views.state.layer==='temperature'?(latest?.result.transport?.operation?.thermal?.gas?'thermalProfile':'thermal'):'composition';draw();playback();onResults();return;}describe(id,part,name);onInspect();},onError:error=>{status.textContent=`3D unavailable: ${message(error)}`;}});
  }
  const pose=tools?viewer.cameraPose?.():null;if(tools)viewer.select(null);tools?.dispose();tools=null;
  await viewer.load({model:{config:snapshot.result.config,result:snapshot.result},modelCamera:{position:[0,1,.65],portraitPosition:[1,.65,.45],target:[0,0,0],up:[0,1,0],fitScale:.78}},{preserveOwnership:!!pose});
  if(pose&&snapshot.result.config.radiusM)viewer.setCamera?.(pose,{preserveOwnership:true});
  if(disposed||!active||dirty||updating||snapshot!==latest)return;
  // The asynchronous viewer loader installs tools before load resolves.
  const loadedTools=tools as Geometry['tools']|null;
  loadedTools?.setDomains(Object.fromEntries((['composition','density','speed'] as const).map(layer=>[layer,comparisonDomain([snapshot.result],layer)])));
  loadedTools?.setDomains({temperature:temperatureDomain([snapshot.result])});
  elapsed=Math.min(elapsed,snapshot.result.config.durationS);motionBar.hidden=!motion;playbackPosition.refresh();views.clearSample();applyViews();playback();if(pinned)await showBaseline();
  refreshGasLegend();
  const c=snapshot.result.config,previous=inspectSelect.value;
  inspectSelect.replaceChildren(...graphics[1].FUEL_COMPONENTS.filter(part=>!(part.id==='liner'&&c.pair!=='lithium'||part.id==='light-outlet'&&(c.application==='pump'||c.cutFraction===0)||part.id==='stages'&&(c.application==='pump'||c.stages===1))).map(part=>{const option=el('option',part.name);option.value=part.id;return option;}));
  if([...inspectSelect.options].some(option=>option.value===previous))inspectSelect.value=previous;
  describe(inspectSelect.value,undefined,undefined,false);
 }
 async function run(){
  if(disposed)return;
  sensitivity.invalidate();
  const invalid=(input:HTMLInputElement)=>input.value===''||!Number.isFinite(Number(input.value))||Number(input.value)<Number(input.min)||Number(input.value)>Number(input.max);
  const activeThermalInputs=thermalEnable.checked?[...thermalControls].filter(([key])=>key!=='wallCapacityJK'||thermalModel.value!=='spatial').map(([,input])=>input):[];
  if(thermalEnable.checked&&thermalModel.value==='spatial'){
   activeThermalInputs.push(thickness);if(gasModel.value==='spatial')activeThermalInputs.push(gasConductivity);
  }
  const invalidThermal=activeThermalInputs.some(invalid);
  if(invalidThermal||[...description.querySelectorAll<HTMLInputElement>('input[type="number"]')].some(input=>!input.disabled&&invalid(input))){
   if(!dirty){changed();clearTimeout(timer);}
   updating=false;status.textContent=`Enter valid ${invalidThermal?'thermal settings':'component values'} before running.${latest?' Previous accepted state.':''}`;
   learning.setPending(latest?'Invalid settings · previous accepted result':'Enter valid settings before running.');return;
  }
  cancelExport();clearTimeout(timer);controller?.abort();controller=new AbortController();const id=++revision;dirty=false;exportButton.disabled=true;status.textContent='Updating…';
  updating=true;
  learning.setPending();
  viewer?.setAnimation(null);motionBar.hidden=true;
  try{
   const operation={schemaVersion:1 as const,events:structuredClone(currentEvents),thermal:thermalRead()};
   const reply=await request({kind:'fuel-centrifuge',schemaVersion:1,id,config:operatingConfig??read(),includeTransport:true,operation,...(resume?{resume}:{} )},controller.signal);
   if(disposed||id!==revision)return;updating=false;latest={result:reply.result,producingCode:producingCode(reply.producingCode)};exportButton.disabled=false;sensitivity.update(latest);
   const r=latest.result,notes=['Uniform-inertia equilibrium reference'];
   eventHistory.replaceChildren(el('summary','Drive history'),...currentEvents.map(e=>el('p',`${fmt(e.timeS)} s → ${fmt(e.currentA)} A`)));if(!currentEvents.length)eventHistory.append(el('p',`Initial current ${fmt(r.config.currentA)} A`));
   if(r.config.durationS<r.mechanics.radialDiffusionTimeS)notes.push('spin time < a²/D');
   if(r.config.application==='pump'&&r.pumping.turnoverS!==null&&r.pumping.turnoverS<r.mechanics.radialDiffusionTimeS)notes.push('turnover < a²/D');
   if(r.mechanics.slipCIV>1)notes.push('slip exceeds CIV reference');
   status.textContent=notes.join(' · ');
   status.dataset.reference=status.textContent;
   const timeControl=r.transport?.timeControl;
   assumptions.replaceChildren(...[...r.assumptions.map(text=>`Uniform-inertia reference: ${text}`),...(r.transport?.assumptions??[]).map(text=>`Coupled trajectory: ${text}`),...(r.transport?[`Transport grid: ${r.transport.cells} equal-volume radial cells, ${r.transport.steps} nominal time intervals${r.transport.checkpoints?`, ${r.transport.checkpoints.length-1} retained intervals`:''}. Maximum centrifugal exponent per cell: ${fmt(r.transport.maxCellExponent)}; values above one indicate a wall layer finer than the grid. Refinement studies qualify tested cases, not every slider combination.`]:[]),...(timeControl?[`Temporal error estimate: ${timeControl.method}; relative tolerance ${fmt(timeControl.relativeTolerance)}, temperature tolerance ${fmt(timeControl.temperatureToleranceK)} K; ${timeControl.acceptedPairs} accepted pairs, ${timeControl.rejectedSteps} rejected steps, maximum accepted ratio ${fmt(timeControl.maxErrorRatio)}. Counters since ${fmt(timeControl.startTimeS)} s; retained prefix excluded.`]:[])].map(text=>el('li',text)));draw();
  }catch(error){if(disposed||id!==revision||(error instanceof Error?error.name:undefined)==='AbortError')return;updating=false;latest=null;frame.hidden=true;motion=null;exportButton.disabled=true;renderPlots(plotHost,[]);metrics.replaceChildren();compositionReadout.hidden=true;probeControls.hidden=true;densityReading.hidden=true;learning.setPending('No accepted result');status.textContent=message(error);}
  if(latest&&id===revision)try{await showGeometry(latest);}catch(error){if(!disposed&&id===revision)status.textContent=`3D unavailable: ${message(error)}`;}
 }
 function draw(source:AcceptedFuel|Event|null=latest,capture=false):PlotCurve[]|undefined{
  if(!source||!('result' in source)||!source.result)source=latest;if(!source)return;frame.hidden=false;const r=source.result,c=r.config,m=r.mechanics,end=r.samples.at(-1)!,topic=selector.value;
  const transient=['spin','transport'].includes(motionMode.value),transport=r.transport,limit=pinned?Math.min(latest!.result.config.durationS,pinned.config.durationS):c.durationS;
  const sampleTime=transient?elapsed:limit;
  const rows=transport?[...(transport.checkpoints??transport.snapshots).filter(s=>s.timeS<limit),sampleFuelTransport(transport,limit)]:null;
  const curve=<X extends string,Y extends string>(label:string,rows:readonly (Record<X,number>&Record<Y,number|null>)[],xKey:X,yKey:Y,xLabel:string,yLabel:string):PlotCurve=>({label,x:rows.map(v=>v[xKey]),y:rows.map(v=>v[yKey]),xLabel,yLabel});
  let curves:PlotCurve[]=[],values:[string,number|null,string][]=[];if(!capture)explanation.textContent=topics[topic][1];
  if(topic==='composition')curves=fuelCompositionCurves(r,diagnosticState(r)).filter((_,i)=>i!==1);
  if(topic==='separation'&&transport){const data=rows!.map(s=>({timeS:s.timeS,...s.collection}));curves=(['innerLightPurity','lightRecovery'] as const).map(k=>curve(k==='innerLightPurity'?'Light purity':'Light recovery',data,'timeS',k,'Time (s)','Inventory fraction'));curves.push({label:'Uniform-inertia equilibrium reference',x:[0,limit],y:[r.collection.innerLightPurity,r.collection.innerLightPurity],xLabel:'Time (s)',yLabel:'Inventory fraction',dash:'2 4'});const sample=sampleFuelTransport(transport,sampleTime);values=[[transient?'Time':'Trajectory endpoint',sample.timeS,'s'],['Neutral inertia',sample.neutralInertiaRatio,'× initial inertia'],['Species inventory error',transport.maxBalanceError,'']];if(sample.thermal&&!capture)explanation.textContent='Closed-wall transport and evolving gas temperature feed back on radial separation and gas inertia. Diffusivity is prescribed; local fluid momentum and extraction are not solved. The dashed equilibrium reference retains its initial fixed temperature and uniform-inertia mechanics.';}
  if(topic==='spin'){
   const data=rows?rows.map(s=>({timeS:s.timeS,ionMS:s.ionRadS*c.radiusM,neutralMS:s.neutralRadS*c.radiusM})):r.samples,last=transient?{ionMS:diagnosticState(r).ionRadS!*c.radiusM,neutralMS:diagnosticState(r).neutralRadS*c.radiusM}:data.at(-1)!;
   curves=(['ionMS','neutralMS'] as const).map((k,i)=>curve(i?'Neutrals':'Ions',data,'timeS',k,'Time (s)','Wall speed (m/s)'));values=[[transient?'Current neutral speed':'Final neutral speed',last.neutralMS,'m/s'],[transient?'Current slip / CIV':'Final slip / CIV',Math.abs(last.ionMS-last.neutralMS)/m.criticalVelocityMS,''],[transient?'Current wall speed / CIV':'Final wall speed / CIV',last.neutralMS/m.criticalVelocityMS,''],['a² / D',m.radialDiffusionTimeS,'s']];
   if(!transport&&!capture)explanation.textContent='Uniform-inertia reference: reciprocal friction drives neutral spin-up. No radial inertia feedback is included in this result.';
  }
  if(topic==='heat'&&transport){const data=rows!.map(s=>({timeS:s.timeS,...s.energy})),last=data.at(-1)!,sample=sampleFuelTransport(transport,sampleTime),current=transient?(sample.currentA??c.currentA):(end.currentA??c.currentA);curves=(['driveWorkJ','kineticJ','slipDissipationJ','dragDissipationJ','redistributionWorkJ','numericalDissipationJ'] as const).map(k=>curve(k.replace(/J$/,'').replace(/([A-Z])/g,' $1'),data,'timeS',k,'Time (s)','Energy (J)'));values=[[transient?'Current ohmic power':'Reference ohmic power',current**2*Math.log(1/c.driveInnerFraction)/(2*Math.PI*c.lengthM*c.conductivitySm),'W'],[transient?'Current redistribution work':'Final redistribution work',(transient?sample.energy:last).redistributionWorkJ,'J'],[transient?'Current numerical dissipation':'Final numerical dissipation',(transient?sample.energy:last).numericalDissipationJ,'J'],['Mechanical ledger error',transport.maxEnergyRelativeError,'relative']];if(sample.thermal&&!capture)explanation.textContent='Mechanical ledger: drive work supplies kinetic energy, slip and wall dissipation, signed redistribution work, and numerical dissipation. The thermal model deposits slip and resistive heat into gas and wall drag into liner; redistribution work enters gas with its sign. Ohmic deposition and cooling are in the Temperature budget; numerical dissipation is not heat.';}
  if(topic==='heat'&&!transport){curves=(['totalInputW','mechanicalW','slipW','dragW'] as const).map(k=>curve(k,r.samples,'timeS',k,'Time (s)','Power (W)'));values=[['Ohmic',m.ohmicW,'W'],['Reference thermal control',m.requiredCoolingW,'W']];if(!capture)explanation.textContent='Uniform-inertia mechanical reference. Fixed gas temperature is not a thermal solution.';}
  if(topic==='thermal'){
   const data=rows?.filter(s=>s.thermal).map(s=>({timeS:s.timeS,...s.thermal!}))??[];
   if(data.length){curves=data[0].spatial?[curve('Neutral gas',data,'timeS','gasK','Time (s)','Temperature (K)'),...(['innerK','outerK'] as const).map((key,i)=>curve(i?'Outer liner cell':'Inner liner cell',data.map(s=>({timeS:s.timeS,...s.spatial!})),'timeS',key,'Time (s)','Temperature (K)'))]:(['gasK','linerK'] as const).map(k=>curve(k==='gasK'?'Neutral gas':'Liner',data,'timeS',k,'Time (s)','Temperature (K)'));const sample=sampleFuelTransport(transport!,sampleTime);values=[[transient?'Current mean pressure':'Endpoint pressure',sample.thermal!.pressurePa,'Pa'],[transient?'Cooling energy':'Endpoint cooling energy',sample.thermal!.coolingEnergyJ,'J'],['Energy budget error',Math.max(...data.map(s=>s.relativeResidual)),'relative']];if(data[0].spatial&&!capture)explanation.textContent=data[0].gas?'Spatial mixture energy, species transport and signed rotor work share the gas budget. Common local temperature, prescribed gas conductivity and wall film; no radial fluid momentum closure.':'Lumped neutral gas exchanges heat with a radial tungsten liner. Solid properties depend on temperature. Wall drag enters the inner liner cell; numerical dissipation is not heat.';}
   else{curves=[{label:'Gas thermal bath',x:[0,limit],y:[c.gasK,c.gasK],xLabel:'Time (s)',yLabel:'Temperature (K)'}];if(!capture)explanation.textContent='Enable Thermal model in Controls to evolve atomic gas and liner temperature. The current run uses a fixed-temperature bath.';}
  }
  if(topic==='thermalProfile'){
   const sample=transport?sampleFuelTransport(transport,sampleTime):null,spatial=sample?.thermal?.spatial;
   if(spatial){curves=[{label:'Tungsten liner',x:spatial.radiusM,y:spatial.temperatureK,xLabel:'Radius (m)',yLabel:'Temperature (K)'}];const gas=sample.thermal!.gas;if(gas)curves.unshift({label:'Neutral gas',x:gas.radiusM,y:gas.temperatureK,xLabel:'Radius (m)',yLabel:'Temperature (K)'});values=[[transient?'Time':'Trajectory endpoint',sample.timeS,'s'],['Inner liner cell',spatial.innerK,'K'],['Outer liner cell',spatial.outerK,'K'],['Mean neutral gas',sample.thermal!.gasK,'K']];}
   else if(!capture)explanation.textContent='Choose Radial tungsten liner in Thermal model to resolve heat flow through the solid wall.';
  }
  if(topic==='gasEnergy'||topic==='gasPressure'){
   const sample=transport?sampleFuelTransport(transport,sampleTime):null,gas=sample?.thermal?.gas;
   if(gas){curves=topic==='gasPressure'?[{label:'Neutral gas',x:gas.radiusM,y:gas.pressurePa,xLabel:'Radius (m)',yLabel:'Pressure (Pa)'}]:gas.speciesEnergyJ.map((energy,i)=>({label:i?r.pair.heavy:r.pair.light,x:gas.radiusM,y:energy,xLabel:'Radius (m)',yLabel:'Cell internal energy (J)'}));values=[['Time',sample.timeS,'s'],['Gas energy',gas.energyJ,'J'],['Gas minimum',gas.minK,'K'],['Gas maximum',gas.maxK,'K']];}
   else if(!capture)explanation.textContent='Choose Spatial mixture under Thermal model to resolve species energy and local pressure.';
  }
  if(topic==='momentum'&&transport){const data=rows!.map(s=>({timeS:s.timeS,ions:s.ionAngularMomentumKgM2S,neutrals:s.neutralAngularMomentumKgM2S,total:s.ionAngularMomentumKgM2S+s.neutralAngularMomentumKgM2S,external:s.angularMomentum.driveImpulseKgM2S-s.angularMomentum.dragImpulseKgM2S}));curves=(['ions','neutrals','total','external'] as const).map(k=>curve(k==='external'?'Drive minus wall impulse':k,data,'timeS',k,'Time (s)','Angular momentum (kg m²/s)'));const sample=sampleFuelTransport(transport,sampleTime);values=[[transient?'Time':'Trajectory endpoint',sample.timeS,'s'],['Neutral inertia',sample.neutralInertiaRatio,'× initial inertia'],['Maximum momentum budget error',transport.maxAngularMomentumRelativeError,'relative']];}
  if(topic==='inertia'&&transport){const data=rows!.map(s=>({timeS:s.timeS,neutral:s.neutralInertiaKgM2,initial:m.nn}));curves=(['neutral','initial'] as const).map(k=>curve(k==='neutral'?'Evolving neutral inertia':'Initial uniform inertia',data,'timeS',k,'Time (s)','Moment of inertia (kg m²)'));const sample=sampleFuelTransport(transport,sampleTime);values=[[transient?'Time':'Trajectory endpoint',sample.timeS,'s'],['Neutral inertia',sample.neutralInertiaRatio,'× initial inertia'],['Maximum momentum budget error',transport.maxAngularMomentumRelativeError,'relative']];}
  if(topic==='profile'){
   curves=fuelDensityCurves(r,diagnosticState(r));values=[];
   if(!capture){explanation.textContent=`${transient&&transport?'Closed-wall transport at the selected time':'Equilibrium reference, not finite-time separation'}. Compare equal-size volumes: a value of 2 means twice that isotope’s own volume-average density. These curves are not mixture percentages; no local fluid momentum or extraction solution.`;
    densityReading.textContent=curves.map(line=>`${line.label}: axis ${line.y[0]===null?'absent':`${fmt(line.y[0])}× average`}; wall ${line.y.at(-1)===null?'absent':`${fmt(line.y.at(-1)!)}× average`}.`).join(' ');
   }
  }
  if(topic==='cut'){const data=[...r.cuts.filter(p=>p.radiusFraction!==c.cutFraction),{radiusFraction:c.cutFraction,lightPurity:r.collection.innerLightPurity,lightRecovery:r.collection.lightRecovery,outerHeavyPurity:r.collection.outerHeavyPurity}].sort((a,b)=>a.radiusFraction-b.radiusFraction);curves=(['lightPurity','lightRecovery','outerHeavyPurity'] as const).map(k=>curve(k,data,'radiusFraction',k,'Inner cut radius / a','Inventory fraction'));values=[['Light purity',r.collection.innerLightPurity,''],['Light recovery',r.collection.lightRecovery,''],['Heavy outer purity',r.collection.outerHeavyPurity,'']];}
  if(topic==='cut'&&transient&&transport){const sample=sampleFuelTransport(transport,elapsed),data=[...new Set([...r.cuts.map(p=>p.radiusFraction),c.cutFraction])].sort((a,b)=>a-b).map(radiusFraction=>({radiusFraction,...fuelTransportCollection(sample.lightMass,sample.heavyMass,c.lightFraction,radiusFraction)}));curves=(['innerLightPurity','lightRecovery','outerHeavyPurity'] as const).map(k=>curve(k,data,'radiusFraction',k,'Inner cut radius / a','Inventory fraction'));values=[['Current light purity',sample.collection.innerLightPurity,''],['Current light recovery',sample.collection.lightRecovery,''],['Current outer heavy purity',sample.collection.outerHeavyPurity,'']];if(!capture)explanation.textContent='Current closed-wall inventory at the shared time. Cuts partition inventory; no extraction flow is solved.';}
  if(topic==='cascade'){curves=(['purity','recovery'] as const).map(k=>curve(k,r.cascades,'stages',k,'Ideal stages','Fraction'));values=[['Product light purity',r.cascade.productLightPurity,''],['Light recovery',r.cascade.lightRecovery,''],['Internal circulation / feed',r.cascade.circulationPerFeed,''],['Worst species balance',Math.max(Math.abs(r.cascade.lightBalance),Math.abs(r.cascade.heavyBalance)),'']];}
  if(topic==='pump'){curves=r.pumping.species.map(s=>({label:s.name,x:[0,1,2],y:[s.upstreamPa,s.axisPa,s.wallPa],xLabel:'0 upstream · 1 axis · 2 outer outlet',yLabel:'Partial pressure (Pa)'}));values=[['Effective inlet speed',r.pumping.effectiveSpeedM3S,'m³/s'],['Without rotation',r.pumping.nonrotatingSpeedM3S,'m³/s'],['Heavy / light pumping speed',r.pumping.heavyLightSpeedRatio,''],['Outer outlet light fraction',r.pumping.outerLightFraction,''],['Gas load',r.pumping.gasLoadPaM3S,'Pa m³/s'],['Ideal turnover',r.pumping.turnoverS,'s']];}
  if(topic==='field'){const scan=[...new Set([...Array.from({length:40},(_,i)=>.05+i*.05),c.magneticT])].sort((a,b)=>a-b).map(field=>({field,power:m.ohmicW*(c.magneticT/field)**2}));curves=[curve('Matched torque · resistive only',scan,'field','power','Magnetic field (T)','Ohmic power (W)')];values=[['Applied torque',m.torque,'N m']];}
  if(topic==='inventory'){const scan=[...new Set([...Array.from({length:100},(_,i)=>(i+1)/100),c.burnFraction])].sort((a,b)=>a-b).map(burn=>{const scale=r.fuelCycle.grossTritiumKg*c.burnFraction*1000;return {burn,gross:scale/burn,exhaust:scale*(1/burn-1)};});curves=(['gross','exhaust'] as const).map(k=>curve(k,scan,'burn',k,'Burned / injected tritium','Processing inventory (g)'));values=[['Unburned exhaust inventory',r.fuelCycle.exhaustTritiumKg*1000,'g'],['Gross circulation inventory',r.fuelCycle.grossTritiumKg*1000,'g']];}
  if(topic==='lithium'){const scan=[...new Set([...Array.from({length:81},(_,i)=>298.14+(1599.99-298.14)*i/80),c.linerK])].sort((a,b)=>a-b).map(temperature=>({temperature,pressure:lithiumVaporPressurePa(temperature)}));curves=[curve('NIST equilibrium vapor pressure',scan,'temperature','pressure','Temperature (K)','Equilibrium vapor pressure (Pa)')];values=[['Reference outer gas pressure',r.pumping.wallPa,'Pa'],['Initial liner saturation pressure',r.lithium.wallVaporPressurePa,'Pa'],['Reference gas / initial saturation',r.lithium.wallSaturationRatio,'']];}
  curves=curves.map((curve,i)=>({...curve,color:['#94d9cd','#e5ab70','#95b3d4','#d1bc87','#c2a5d4','#dc9292'][i%6],muted:topic!=='composition'&&views.state.species!=='all'&&curve.label===(views.state.species==='light'?r.pair.heavy:r.pair.light)}));
  if(capture)return curves;
  if(pinned){const baseline=draw({result:pinned.result},true)!;curves=[...baseline.map(curve=>({...curve,label:`A · ${curve.label}`,dash:'5 4'})),...curves.map(curve=>({...curve,label:`B · ${curve.label}`}))];curves=curves.map(curve=>{if(curve.xLabel!=='Time (s)')return curve;const n=curve.x.findIndex(t=>t>limit);if(n<0)return {...curve,xDomain:[0,limit] as const};const x=curve.x.slice(0,n),y=curve.y.slice(0,n);if(n&&x.at(-1)!<limit){const f=(limit-x.at(-1)!)/(curve.x[n]-x.at(-1)!);y.push(Number(y.at(-1))+(Number(curve.y[n])-Number(y.at(-1)))*f);x.push(limit);}return {...curve,x,y,xDomain:[0,limit] as const};});}
  if(topic==='composition')curves=zoomCompositionCurves(curves);
  compositionReadout.hidden=topic!=='composition';
  probeControls.hidden=topic!=='composition';densityReading.hidden=topic!=='profile';
  metrics.replaceChildren(...values.map(([label,value,unit])=>{const row=el('div');row.append(el('span',label),el('strong',`${fmt(value)} ${unit}`));return row;}));plotCursor=renderPlots(plotHost,curves,{revealUntil:transient&&['spin','heat','thermal','separation','momentum','inertia'].includes(topic)?elapsed:undefined,announce:!(playing&&transient),onSelect:topic==='composition'?radius=>{const fraction=radius/(100*latest!.result.config.radiusM);playing=false;selectProbe(Math.min(1,fraction));playback();if(fraction>1)sampleBounds.textContent='Probe at B wall; selected radius is outside B';}:['spin','heat','thermal','separation','momentum','inertia'].includes(topic)?time=>{elapsed=time;playing=false;motionMode.value=topic==='spin'?'spin':'transport';playback();}:undefined});
  const scanInput=scanInputs[topic];if(scanInput)plotCursor?.setCursor(c[scanInput]);
  if(topic==='composition')for(const readout of plotHost.querySelectorAll<HTMLElement>('.plot-readout'))readout.hidden=true;
  refreshComposition();if(dirty||updating)learning.setPending();else learning.update(r,diagnosticState(r),topic);
 }
 exportButton.addEventListener('click',()=>{void (async()=>{
  if(disposed||!latest||exportButton.disabled)return;
  cancelExport();const accepted=latest,id=revision,preparation=new AbortController(),gzip=!!accepted.result.transport?.timeControl,previousStatus=status.textContent;
  exportController=preparation;exportButton.disabled=true;
  if(gzip){exportButton.textContent='Preparing…';setStatus('Preparing compressed export…');}
  try{
   const packet={model:'marathon-centrifuge',...accepted};
   const blob=gzip?await fuelExportGzipBlob(packet,{signal:preparation.signal}):fuelExportBlob(packet);
   if(disposed||preparation.signal.aborted||latest!==accepted||id!==revision)return;
   const url=URL.createObjectURL(blob),a=el('a');exportURL=url;a.href=url;a.download=`mass-spinner-centrifuge.json${gzip?'.gz':''}`;a.click();
   exportTimer=setTimeout(()=>{if(exportURL===url){URL.revokeObjectURL(url);exportURL=null;}},1000);
   if(gzip&&status.textContent==='Preparing compressed export…')setStatus(previousStatus);
  }catch(error){
   if(exportController===preparation&&exportURL){URL.revokeObjectURL(exportURL);exportURL=null;}
   if(!disposed&&!preparation.signal.aborted&&latest===accepted&&id===revision){playing=false;playback();setStatus(`Export failed: ${message(error)}`);}
  }finally{
   if(exportController===preparation){exportController=null;exportButton.textContent='Export';exportButton.disabled=disposed||dirty||latest!==accepted||id!==revision;}
  }
 })();});
 function captureRun({validate=true}:{validate?:boolean}={}):FuelRunState{
  if(validate&&(dirty||updating||!latest))throw new Error('Wait for an accepted centrifuge run before sharing.');
  return {initialCurrentA:operatingConfig?.currentA??read().currentA,events:structuredClone(currentEvents),mode:motionMode.value as FuelRunState['mode'],timeS:['spin','transport'].includes(motionMode.value)?elapsed:0};
 }
 function restoreRun(saved?:FuelRunState|null){
  const config=read(),events=saved?.events??[];validateFuelCurrentEvents(events,config.durationS);
  if(saved&&(!Number.isFinite(saved.initialCurrentA)||saved.initialCurrentA<0||saved.initialCurrentA>.2))throw new RangeError('Initial current must be between 0 and 0.2 A.');
  if(saved&&(!['equilibrium','transport','spin','flow'].includes(saved.mode)||!Number.isFinite(saved.timeS)||saved.timeS<0||saved.timeS>config.durationS))throw new RangeError('Saved gas view and time must lie in the run.');
  changed();currentEvents=structuredClone(events);operatingConfig=saved?{...read(),currentA:saved.initialCurrentA}:null;resume=null;
  motionMode.value=saved?.mode??'transport';elapsed=saved?.timeS??0;playing=false;playback();
 }
 dependencies();
 return {nodes,read,run,captureRun,restoreRun,get latest(){return latest;},setActive(value:boolean){if(disposed)return;active=!!value;if(active){if(dirty)void run();else if(latest)void showGeometry(latest).catch(error=>{if(!disposed)status.textContent=`3D unavailable: ${message(error)}`;});}else{clearTimeout(timer);viewer?.setAnimation(null);sensitivity.cancelPending();}},dispose(){disposed=true;active=false;revision++;cancelExport();clearTimeout(timer);controller?.abort();reducedMotion?.removeEventListener('change',reduce);playbackPosition.dispose();learning.dispose();comparisons.dispose();qualification.dispose();argonReference.dispose();spatialExperiment.dispose();sensitivity.dispose();if(tools)viewer?.select(null);tools?.dispose();baselineTools?.dispose();baselineViewer?.dispose();viewer?.dispose();}};
}
