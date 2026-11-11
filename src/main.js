import './style.css';
import './component-inspector.css';
import './apparatus.css';
import './marathon-layout.css';
import './target-exposure.css';
import './target-loading.css';
import './minimal.css';
import './workspace.css';
import {setupWorkspace} from './workspace-ui.js';
import {fieldGraphics} from './field-graphics.ts';
import './coupled-target.css';
import './precise-controls.css';
import {setupPreciseControls} from './precise-controls.js';
import {setupCollectorAcceptance} from './collector-acceptance-ui.js';
import {assessCollisionObservableEvidence} from './observable-evidence.ts';
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
import {surfaceState} from './surface-state.ts';
import {fusionComponents} from './component-catalog.ts';
import {setupTutorialInsights} from './tutorial-insights-ui.js';
import {LITHIUM_PRESET_VALUES,LITHIUM_PRESET_NOTE} from './tutorial-insights.ts';
import {setupBlanketExplorer} from './blanket-ui.js';
import {blanketComponents} from './blanket-reference.ts';
import {setupComponentInspectors} from './component-inspector.js';
import {setupExperience} from './experience-ui.js';
import {rendererPresentation} from './view-state.ts';
import {requestSimulation,requestSimulationWithIdentity} from './worker-client.ts';
import {serializeRun} from './producing-code.ts';
import {createLazyScene,needsLegacyScene} from './legacy-scene.ts';
import {radialRefinementSettings} from './radial-refinement.ts';
import {setupLaboratory,showLaboratory,reducedConfig,isReduced,isInfo,guide,geometryModes,transportModes,coreModes,renderPlots} from './laboratory.js';
import {equilibriumPresentation,rotatingPresentation} from './focused-diagnostics.js';
import {equilibriumConfig} from './equilibrium-controls.js';
import {setupDoublewellControls,doublewellConfig} from './doublewell-ui.js';
import {setupStudies} from './study-ui.js';
import {arrivalCurves,collectionSummary} from './ensemble.ts';
import {setupReferenceAtlas} from './reference-atlas.js';
import {setupFailureLaboratory,modelValidity} from './limitations-ui.js';
import {createResearchLoader} from './research-ui.js';
import {renderConvergenceEvidence} from './convergence-evidence.js';
import convergenceEvidence from '../web-assets/convergence/display.json';
import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { DEFAULT_CONFIG, cutoffMassU, E_CHARGE, AMU } from './physics.ts';

const $ = id => document.getElementById(id);
const colors = [0xa4c4b1, 0xd2956b];
const inputs = ['field','voltage','energy','parallel','source-radius','distribution','axial-temperature','particles','resolution','mass-a','mass-b','charge-a','charge-b','neutral-density','neutral-cross-section','neutral-mass','rf-amplitude','rf-frequency','rf-handedness','rotation','ion-temperature','electron-temperature','axis-fraction','radial-cut','radial-resolution','random-seed','centrifuge-closure','magnetic-boundary','composition-boundary','gaussian-field','gaussian-width','gaussian-density'];
const ions = () => ['a','b'].map(k=>({massU:+$('mass-'+k).value,chargeState:+$('charge-'+k).value}));
const mode = () => $('system').value;
const equilibriumLabel=()=>({'corotating':'Bounded common-corotation benchmark','gaussian':'Prescribed density · required current','magnetic-gaussian':'Coupled B(r) · current and radial force balance'})[$('centrifuge-closure').value];
const config = (selected=mode()) => selected==='doublewell-dynamics'?doublewellConfig(ions()):isReduced(selected)?reducedConfig(selected,ions()):selected==='centrifuge'
 ? equilibriumConfig(id=>$(id).value,ions(),DEFAULT_CONFIG.radius)
 : ({...DEFAULT_CONFIG,seed:Number($('random-seed').value),mode:selected,dt:+$('resolution').value,magneticT:+$('field').value,
  voltage:selected==='rotating'?+$('voltage').value:0,perpendicularEV:+$('energy').value,
  parallelEV:+$('parallel').value,sourceRadius:+$('source-radius').value/100,
  distribution:$('distribution').value,axialTemperatureEV:+$('axial-temperature').value,
  particlesPerSpecies:+$('particles').value,species:ions(),rfAmplitudeVM:+$('rf-amplitude').value,
  rfFrequencyHz:+$('rf-frequency').value,rfHandedness:+$('rf-handedness').value,
  neutralDensityM3:+$('neutral-density').value,neutralCrossSectionM2:+$('neutral-cross-section').value,
  neutralMassU:+$('neutral-mass').value});
let studyUI,experience,inspectors,apparatus,tutorialInsights,fusionApparatus,workspace,collector,baseline;
const targetBaselines=new Map();
const baselineOptions={capture:()=>{if(!experience)throw new Error('Scenario is not ready.');return experience.capture();},restore:value=>experience.restore(value)};
function plotSimulation(curves){
 const identity={model:mode(),observable:'prescribed-model-response',xUnit:'per-curve',yUnit:'per-curve',version:1};
 if(baseline)baseline.update(curves,identity,{seed:latest.settings.seed});else renderPlots($('live-plots'),curves);
}
function targetPlots(curves,{host,observable}){
 let control=targetBaselines.get(host);if(!control){control=setupBaseline(host,baselineOptions);targetBaselines.set(host,control);}
 return control.update(curves,{model:'coupled-depth-target-scenario',observable,xUnit:'per-curve',yUnit:'per-curve',version:1});
}
function inspectComponent(id){
 workspace?.open('inspect');
 const level=experience?.level??'1';
 const readout=level==='2'?fusionApparatus?.readout:apparatus?.hasMode(mode())&&view==='render'?apparatus.readout:document.querySelector('#separator-inspector .component-description');
 const destination=componentDestination(id,{level,model:mode(),closure:$('centrifuge-closure').value});
 appendComponentActions(readout,{parameters:()=>{workspace.focusRelated(destination.panel,destination.selector);if(destination.settings)marathon.target.focusSetting(destination.selector);},results:()=>workspace.focusRelated(level==='2'&&['target','substrate'].includes(id)?'target':'plots')});
}
const loadResearch=createResearchLoader();
async function showResearch(){
 const button=$('replay-retry');button.disabled=true;
 try{const viewer=await loadResearch();button.hidden=!!viewer;}
 finally{button.disabled=false;}
}
let latest = null, revision = 0, busy = false, hardware, renderer, controls, scene, camera;
let view = 'hardware', gpuReady=false, gpuFailed=false, runController, comparisonController, refinementController, liveTimer;
const legacyNeeded=()=>needsLegacyScene(document.body.dataset.level??'1',mode(),view);
const legacyScene=createLazyScene(legacyNeeded,initScene,rendererFailure);
function sceneVisibility(){
 const rendered=view==='render'&&apparatus?.hasMode(mode());
 const state=rendererPresentation(mode(),gpuReady,gpuFailed,!!renderer?.backend?.isWebGPUBackend,rendered||!legacyNeeded());
 $('model-apparatus').hidden=!rendered;
 $('scene').hidden=state.canvasHidden;$('poster').hidden=state.posterHidden;$('load-state').hidden=state.loadingHidden;$('renderer-status').textContent=state.status;
 $('separator-inspector').hidden=!legacyNeeded();
  $('field-scale').hidden=view!=='fields'||state.canvasHidden;
 if($('separator-inspector').hidden)inspectors?.clear();
}
function rendererFailure(error){
 console.error(error);legacyScene.reset();gpuReady=false;gpuFailed=true;sceneVisibility();
 $('load-state').textContent='3D unavailable. Simulation controls remain available.';
}
function equilibriumControls(){
 const coupled=$('centrifuge-closure').value==='magnetic-gaussian';
 $('gaussian-controls').hidden=$('centrifuge-closure').value==='corotating';
 $('magnetic-boundary-control').hidden=!coupled;
 $('gaussian-field-label').textContent=coupled?'Magnetic boundary B':'Imposed axial B';
 $('gaussian-closure-note').textContent=coupled?'Equal charges. Density and ion rotation are prescribed; B(r), current and potential are solved together. A wall boundary may have no regular nonzero-B solution. Electron inertia and discharge dynamics remain omitted.':'Equal charge states required. Density width and B are imposed. Required current, its estimated magnetic perturbation and omitted electron inertia are diagnostics.';
 if(mode()==='centrifuge')$('experiment-subtitle').textContent=equilibriumLabel();
 $('composition-label').textContent=$('composition-boundary').value==='bulk'?'Whole-cylinder A number fraction':'Central A number fraction';
}
function changed(){experience?.sync();equilibriumControls();invalidate();clearTimeout(liveTimer);if($('live-update').checked)liveTimer=setTimeout(run,250);}
const trajectories = new THREE.Group(), fieldGroup = new THREE.Group();
const legacyCenter=new THREE.Vector3();let legacyRadius=0;
const toScene = p => new THREE.Vector3(p[2]-DEFAULT_CONFIG.length/2,p[0],p[1]);

function clear(group) {
  for(const child of [...group.children]) {
    child.traverse(item => { item.geometry?.dispose(); if(item.material) item.material.dispose(); });
    group.remove(child);
  }
}
function line(points, color, opacity=1) {
  return new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({color,transparent:opacity<1,opacity}));
}
function showView(next) {
  inspectors?.clear();
  document.body.dataset.view=next;
  view=next;
  document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===next)));
  trajectories.visible=next==='orbits'; fieldGroup.visible=next==='fields';
  hardware?.traverse(item=>{
    if(!item.isMesh) return;
    item.material.transparent=next!=='hardware';
    item.material.opacity=next==='hardware'?1:.12;
    item.material.depthWrite=next==='hardware';
    item.material.needsUpdate=true;
  });
  sceneVisibility();
  void legacyScene.ensure();
}
function updateFields() {
  clear(fieldGroup);
  if(!scene||!['rotating','icr'].includes(mode()))return;
  const c=config(),{radius:a,length:l}=c;
  let samples;
  try{samples=fieldGraphics(c);}catch{ $('field-scale').textContent='Enter finite field parameters.';return; }
  const ring = x => Array.from({length:97},(_,i)=>new THREE.Vector3(x,a*Math.cos(i*Math.PI/48),a*Math.sin(i*Math.PI/48)));
  for(const x of [-l/2,l/2]) fieldGroup.add(line(ring(x),0xb1b5ad,.8));
  for(let i=0;i<12;i++) {
    const t=i*Math.PI/6,y=a*Math.cos(t),z=a*Math.sin(t);
    fieldGroup.add(line([new THREE.Vector3(-l/2,y,z),new THREE.Vector3(l/2,y,z)],0x717c7a,.45));
  }
  for(const [glyphs,reference,color]of [[samples.electric,samples.electricReferenceVM,0xd2956b],[samples.magnetic,samples.magneticReferenceT,0xa4c4b1]]){
    for(const {position,vector}of glyphs){
      const direction=new THREE.Vector3(vector[2],vector[0],vector[1]),magnitude=direction.length();
      if(magnitude===0)continue;
      const length=.42*a*magnitude/reference;
      fieldGroup.add(new THREE.ArrowHelper(direction.normalize(),toScene(position),length,color,length*.24,length*.12));
    }
  }
  $('field-scale').textContent=`E (copper) ≤ ${samples.electricReferenceVM.toPrecision(3)} V/m · B (sage) ${c.magneticT.toPrecision(3)} T · arrows scaled separately${c.mode==='icr'?' · RF snapshot t = 0':''}`;
}
function drawPaths(result) {
  clear(trajectories);
  if(!scene)return;
  result.species.forEach((s,i)=>s.paths.forEach(path=>{
    trajectories.add(line(path.positions.map(toScene),colors[i],.88));
    const dot=new THREE.Mesh(new THREE.SphereGeometry(.009,8,6),new THREE.MeshBasicMaterial({color:colors[i]}));
    dot.position.copy(toScene(path.positions.at(-1))); trajectories.add(dot);
  }));
}
function legacyFitDistance(){
  const vertical=THREE.MathUtils.degToRad(camera.fov),horizontal=2*Math.atan(Math.tan(vertical/2)*camera.aspect);
  return 1.12*legacyRadius/Math.sin(Math.min(vertical,horizontal)/2);
}
function resetCamera() {
  if(!hardware||!camera||!controls)return;
  const distance=legacyFitDistance();
  controls.target.copy(legacyCenter);camera.position.copy(legacyCenter).addScaledVector(new THREE.Vector3(3.5,2.35,4.1).normalize(),distance);
  controls.minDistance=2;controls.maxDistance=Math.max(10,2*distance);
  camera.far=Math.max(100,controls.maxDistance+legacyRadius*20);camera.updateProjectionMatrix();controls.update();
}
function resizeScene(){
  const {width,height}=$('stage').getBoundingClientRect();
  if(width<=0||height<=0)return;
  const previousFit=legacyFitDistance();
  renderer.setSize(width,height,false);camera.aspect=width/height;
  const ratio=legacyFitDistance()/previousFit;
  camera.position.sub(controls.target).multiplyScalar(ratio).add(controls.target);
  controls.minDistance*=ratio;controls.maxDistance*=ratio;controls.update();
  camera.far=Math.max(100,controls.maxDistance+legacyRadius*20);camera.updateProjectionMatrix();
}
async function initScene() {
  let environment,observer,keyboard;
  const dispose=()=>{
    observer?.disconnect();if(keyboard)$('scene').removeEventListener('keydown',keyboard);
    renderer?.setAnimationLoop(null);controls?.dispose();environment?.dispose();
    clear(trajectories);clear(fieldGroup);if(scene)clear(scene);renderer?.dispose();
    renderer=controls=hardware=camera=scene=undefined;gpuReady=false;
  };
  try {
    gpuFailed=false;$('load-state').textContent='Loading 3D…';sceneVisibility();
    scene=new THREE.Scene(); scene.background=new THREE.Color('#151919');
    camera=new THREE.PerspectiveCamera(33,1,.05,100);
    renderer=new THREE.WebGPURenderer({canvas:$('scene'),antialias:true,alpha:false});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.25;
    await renderer.init();
    const studio=new RoomEnvironment();
    let pmrem;
    try{pmrem=new THREE.PMREMGenerator(renderer);environment=pmrem.fromScene(studio,.04);}finally{studio.dispose();pmrem?.dispose();}
    scene.environment=environment.texture; scene.environmentIntensity=1.15;
    scene.add(new THREE.HemisphereLight(0xeaf0ed,0x242b29,1.5));
    const key=new THREE.DirectionalLight(0xffe4c8,3); key.position.set(0,5,4); scene.add(key);
    const fill=new THREE.DirectionalLight(0xa6c3d0,2); fill.position.set(-3,2,-3); scene.add(fill);
    controls=new OrbitControls(camera,$('scene')); controls.enableDamping=true;
    controls.minDistance=2; controls.maxDistance=10; controls.maxPolarAngle=Math.PI*.85;
    const gltf=await new GLTFLoader().loadAsync('/separator.glb');
    hardware=gltf.scene; scene.add(hardware,trajectories,fieldGroup);
    // Keep independently adjustable opacity per mesh when inspecting the interior.
    hardware.traverse(item=>{if(item.isMesh) item.material=item.material.clone();});
    hardware.updateWorldMatrix(true,true);const bounds=new THREE.Box3().setFromObject(hardware);
    bounds.getCenter(legacyCenter);legacyRadius=bounds.getBoundingSphere(new THREE.Sphere()).radius;
    if(!Number.isFinite(legacyRadius)||legacyRadius<=0)throw new Error('3D model has no finite geometry.');
    updateFields();if(latest&&['rotating','icr'].includes(latest.kind))drawPaths(latest.result);showView(view);
    observer=new ResizeObserver(resizeScene);observer.observe($('stage'));
    resizeScene();resetCamera();
    await renderer.compileAsync(scene,camera);renderer.render(scene,camera);gpuReady=true;sceneVisibility();
    renderer.setAnimationLoop(()=>{if($('scene').hidden||!['rotating','icr'].includes(mode())||!['1','3'].includes(experience?.level??'1'))return;try{controls.update();renderer.render(scene,camera);}catch(error){rendererFailure(error);}});
    keyboard=event=>{
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','='].includes(event.key))return;
      event.preventDefault();
      const offset=camera.position.clone().sub(controls.target),s=new THREE.Spherical().setFromVector3(offset);
      if(event.key==='ArrowLeft')s.theta-=.1;if(event.key==='ArrowRight')s.theta+=.1;
      if(event.key==='ArrowUp')s.phi=Math.max(.1,s.phi-.1);if(event.key==='ArrowDown')s.phi=Math.min(Math.PI*.85,s.phi+.1);
      if(event.key==='+'||event.key==='=')s.radius=Math.max(controls.minDistance,s.radius*.9);if(event.key==='-')s.radius=Math.min(controls.maxDistance,s.radius*1.1);
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));controls.update();
    };$('scene').addEventListener('keydown',keyboard);
    return {dispose};
  } catch(error) {
    dispose();throw error;
  }
}

function updateReadouts() {
  const c=config(mode()==='icr'?'icr':'rotating'),cutoff=cutoffMassU(c);
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
  updateFields();
  const frequencies=ions().map(s=>E_CHARGE*c.magneticT*s.chargeState/(s.massU*AMU)/(2*Math.PI));
  $('frequency-readout').textContent=mode()==='centrifuge'?'Static composition boundary; this is not a flowing-feed or extraction calculation.':
    `Cyclotron: A ${frequencies[0].toFixed(0)} Hz · B ${frequencies[1].toFixed(0)} Hz · `+
    (mode()==='icr'?`RF ${c.rfFrequencyHz.toFixed(0)} Hz`:`E×B drift limit ${ (-2*c.voltage/(c.radius**2*c.magneticT)/(2*Math.PI)).toFixed(0)} Hz (signed; exact ion branches below)`);
}
function invalidate() {
  clearTimeout(liveTimer);
  apparatus?.updateSurfaceState(null);
  $('model-validity').textContent=modelValidity(mode(),null,null);
  studyUI?.invalidate();
  baseline?.clearCurrent();collector?.update(null);
  runController?.abort();comparisonController?.abort();refinementController?.abort();revision++; latest=null; $('export').disabled=true; $('refine').disabled=true; clear(trajectories);
  $('impact-diagnostics').replaceChildren();$('equilibrium-results').replaceChildren();renderPlots($('equilibrium-chart'),[]);
  $('comparison').hidden=true;$('compare').disabled=false;$('refinement-status').textContent='Run an experiment to compare Δt with Δt/2.';
  $('run-status').textContent=busy?'Inputs changed · run again after calculation':'Inputs changed · run to update collection';
  for(const id of ['end-purity','end-recovery','wall-purity','wall-recovery'])$(id).textContent='—';
  for(const id of ['end-stack','wall-stack','deposition'])$(id).replaceChildren();
  $('ledger').innerHTML='<tr><td>Run required</td><td>—</td><td>—</td></tr>';
  $('energy-error').textContent='Results cleared after input change.';
  $('sampling-uncertainty').textContent='';renderPlots($('live-plots'),[]);$('model-metrics').replaceChildren();$('model-assumptions').replaceChildren();$('plot-status').textContent='Inputs changed · calculating when live updates are enabled.';
  updateReadouts();
}
const percent=(a,b)=>b?`${(100*a/b).toFixed(1)}%`:'—';
function drawResults(result) {
  const [ar,kr]=result.species;
  for(const destination of ['end','wall']) {
    const counts=[ar[destination],kr[destination]],sum=counts[0]+counts[1];
    $(destination+'-stack').replaceChildren(...counts.map((n,i)=>{
      const span=document.createElement('span');span.className=i?'kr':'ar';span.style.width=`${sum?100*n/sum:0}%`;span.textContent=n?String(n):'';return span;
    }));
    const target=destination==='end'?ar:kr;
    $(destination+'-purity').textContent=percent(target[destination],sum);
    $(destination+'-recovery').textContent=percent(target[destination],target.injected);
  }
  $('ledger').innerHTML=['injected','end','wall','source','remaining'].map(key=>`<tr><td>${{injected:'Injected',end:'Axial end',wall:'Wall',source:'Source return',remaining:'Still in chamber'}[key]}</td><td>${ar[key]}</td><td>${kr[key]}</td></tr>`).join('');
  $('energy-error').textContent=`Maximum relative energy error: ${Math.max(ar.maxRelativeEnergyError,kr.maxRelativeEnergyError).toExponential(2)}`;
  const max=Math.max(1,...ar.wallAxialBins,...kr.wallAxialBins);
  const bars=result.species.map((s,j)=>s.wallAxialBins.map((n,i)=>`<rect x="${30+i*31+j*13}" y="${110-90*n/max}" width="12" height="${90*n/max}" fill="${j?'#d2956b':'#a4c4b1'}"><title>${s.massU} u · bin ${i+1}: ${n} ions</title></rect>`).join('')).join('');
  $('deposition').innerHTML=`<path d="M30 110H775" stroke="#4d5753"/>${bars}<g fill="#9eaaa4" font-size="12"><text x="30" y="135">Source · 0 m</text><text x="690" y="135">End · 2.8 m</text><text x="5" y="25">${max}</text></g>`;
  const summary=collectionSummary(result);
  $('sampling-uncertainty').textContent=summary.species.map((s,i)=>`${['A','B'][i]}: `+['end','wall','source','remaining'].map(d=>`${d} ${(100*s.outcomes[d].fraction).toFixed(1)}% [${(100*s.outcomes[d].low).toFixed(1)}, ${(100*s.outcomes[d].high).toFixed(1)}]%`).join(' · ')).join(' | ')+'. Pointwise Wilson 95% intervals for sampled fractions; purity needs paired-batch resampling below. Model and timestep errors are separate.';
  $('export').disabled=false;drawPaths(result);
}
function calculate(selected,settings,signal,withIdentity=false){
 const kind=selected==='doublewell-dynamics'?'doublewell-dynamics':geometryModes.includes(selected)?'geometry':transportModes.includes(selected)?'transport':selected==='centrifuge'?'centrifuge':'orbit';
 return (withIdentity?requestSimulationWithIdentity:requestSimulation)({id:0,kind,model:selected==='centrifugal'?'mirror':selected,config:settings},signal);
}
const mean=values=>values.length?values.reduce((s,v)=>s+v,0)/values.length:NaN;
const numeric=(n,d=2)=>!Number.isFinite(n)?'—':n!==0&&(Math.abs(n)<.001||Math.abs(n)>=1e6)?n.toExponential(d):n.toFixed(d);
function presentDiagnostics(presentation){
  $('model-metrics').textContent=presentation.metrics;$('model-assumptions').replaceChildren();
  for(const note of presentation.notes){const li=document.createElement('li');li.textContent=note;$('model-assumptions').append(li);}
  latest.diagnostics=presentation.diagnostics;
}
function equilibrium(result) {
  const points=result.profiles.map(p=>p.ionDensities[1]/(p.ionDensities[0]+p.ionDensities[1]));
  renderPlots($('equilibrium-chart'),[{label:'B number fraction',x:result.profiles.map(p=>p.radius),y:points,xLabel:'Radius (m)',yLabel:'Number fraction',yDomain:[0,1]}]);
  $('equilibrium-caption').textContent=`Local number fractions · central A ${(100*result.species[0].axisFraction).toPrecision(4)}% · ${equilibriumLabel()}`;
  const wall=result.profiles.at(-1);
  $('equilibrium-results').textContent=`Wall B number fraction: ${(100*points.at(-1)).toFixed(2)}% · log enrichment B/A: ${numeric(wall.logSeparationFactors[1])} · maximum relative charge residual: ${result.maxRelativeChargeResidual.toExponential(2)}. Not per-pass recovery.`;
}
async function run() {
  clearTimeout(liveTimer);runController?.abort();
  comparisonController?.abort();if(comparisonController){$('compare-status').textContent='Comparison superseded by a new run.';$('compare').disabled=false;}
  const selected=mode();if(isInfo(selected)){$('run-status').textContent='Overview only · no quantitative solver for this variant.';return;}
  const settings=config(),id=++revision,controller=new AbortController();runController=controller;
  busy=true;latest=null;$('export').disabled=true;$('refine').disabled=true;$('run').disabled=true;
  $('run-status').textContent=selected==='centrifuge'?'Solving radial quasineutral equilibrium…':selected==='doublewell-dynamics'?'Advancing coupled quartic orbits and ion–ion collisions…':'Integrating ion orbits…';
  try {
    const {result,producingCode}=await calculate(selected,settings,controller.signal,true);
    if(id!==revision)return;
    latest={kind:selected,settings,result,producingCode};
    apparatus?.updateSurfaceState(surfaceState({model:selected,settings,result,acceptedModel:selected,acceptedSettings:settings}),settings);
    collector?.update(selected==='rotating'||selected==='icr'?result:null);
    $('model-validity').textContent=modelValidity(selected,settings,result);
    if(isReduced(selected)||selected==='doublewell-dynamics'){
      $('model-assumptions').replaceChildren();
      plotSimulation(result.curves);$('model-metrics').textContent=result.metrics.map(m=>`${m.label}: ${numeric(m.value,4)} ${m.unit}`).join(' · ');
      for(const note of result.assumptions){const li=document.createElement('li');li.textContent=note;$('model-assumptions').append(li);}
    }else if(selected==='centrifuge'){
      equilibrium(result);const p=equilibriumPresentation(result,Number($('radial-cut').value));presentDiagnostics(p);plotSimulation(p.curves);
      const radialFine=radialRefinementSettings(settings);$('refine').disabled=!radialFine;$('refinement-status').textContent=radialFine?`Compare equilibrium inventories at ${settings.bins} → ${radialFine.bins} radial intervals.`:'No finer supported grid; radial convergence unassessed.';
    }
    else {
      drawResults(result);const p=selected==='rotating'?rotatingPresentation(settings,result):null;
      if(p)presentDiagnostics(p);plotSimulation([...arrivalCurves(result),...(p?.curves??[])]);
      const canRefine=settings.duration/(settings.dt/2)<=100000;$('refine').disabled=!canRefine;if(!canRefine)$('refinement-status').textContent='Half-step run exceeds the browser step budget; choose a coarser timestep first.';
      $('energy-error').textContent=`Maximum work/loss-corrected energy residual: ${Math.max(...result.species.map(s=>s.maxRelativeEnergyError)).toExponential(2)} · impact residual ${Math.max(...result.species.map(s=>s.maxRelativeImpactEnergyError)).toExponential(2)}`;
      $('impact-diagnostics').textContent=result.species.map((s,i)=>`${['A','B'][i]}: ${s.collisions} elastic events · mean collected transit ${numeric(1e6*mean(s.impacts.map(p=>p.time)))} µs · mean impact ${numeric(mean(s.impacts.map(p=>p.kineticEV)))} eV · RF work/injected ion ${numeric(s.rfWorkEV/s.injected)} eV`).join(' | ');
    }
    $('plot-status').textContent='Computed from the current settings · hover over curves to inspect values.';
    if(selected==='doublewell-dynamics'){
     latest.evidence=assessCollisionObservableEvidence(result,'outlet-fraction');
     $('model-validity').textContent=`Collisions: ${latest.evidence.status} · continuum ${latest.evidence.continuum}`;
     for(const text of latest.evidence.reasons){const li=document.createElement('li');li.textContent=text;$('model-assumptions').append(li);}
     const study=document.createElement('li'),link=document.createElement('a');link.href='/convergence/browser-v38.summary.json';link.textContent='Browser-resolution study · qualification unresolved';study.append(link);$('model-assumptions').append(study);
    }
    $('export').disabled=false;$('run-status').textContent=selected==='doublewell-dynamics'?`Complete · ${settings.particlesPerSpecies} particles per species · ${(settings.duration*1e6).toFixed(0)} µs · inspect torque and resolution diagnostics`:isReduced(selected)?'Complete · reduced model diagnostics':'Complete · '+(selected==='centrifuge'?`${settings.bins+1} radial samples`:`${settings.particlesPerSpecies} ions per species · ${(settings.dt*1e9).toFixed(0)} ns step`);
  } catch(error) {if(id===revision)$('run-status').textContent=error.message;}
  finally {if(runController===controller){busy=false;$('run').disabled=false;}}
}
function selectMode(){
 const selected=mode(),orbital=['rotating','icr'].includes(selected),reduced=isReduced(selected),info=isInfo(selected),g=guide(selected);
 for(const name of ['orbit','rotating','icr','centrifuge'])document.querySelectorAll('[data-'+name+']').forEach(el=>el.hidden=name==='orbit'?!orbital:selected!==name);
 $('orbit-presets').hidden=selected!=='rotating';$('equilibrium-view').hidden=selected!=='centrifuge';
 $('reduced-view').hidden=orbital||selected==='centrifuge';$('reduced-controls').hidden=!reduced;$('doublewell-controls').hidden=selected!=='doublewell-dynamics';$('doublewell-initial-note').hidden=selected!=='doublewell-dynamics';$('diffusion-settings').hidden=selected!=='diffusion';
 $('reduced-title').textContent=g.title;$('reduced-description').textContent=g.mechanism;
 $('orbit-results').hidden=!orbital;$('equilibrium-results').hidden=selected!=='centrifuge';
 $('deposition-panel').hidden=!orbital;$('refine').hidden=!orbital&&selected!=='centrifuge';
 $('sampling-uncertainty').hidden=!orbital;
 $('refine').textContent=selected==='centrifuge'?'Check radial refinement ↗':'Check timestep refinement ↗';
 document.querySelector('.viewport-tools').hidden=!orbital;
 workspace?.refreshMode();
 document.querySelector('.legend-note').hidden=!orbital;
 $('experiment-label').textContent='SECTION '+g.section;$('experiment-title').textContent=g.title;$('experiment-subtitle').textContent=info?'Overview · no quantitative solver':orbital?'Finite-device full ion orbits':selected==='centrifuge'?equilibriumLabel():selected==='doublewell-dynamics'?'Coupled kinetic model · prescribed fields':'Reduced physics diagnostics';
 $('system-scope').textContent=selected==='doublewell-dynamics'?'Exploratory collisional kinetics · inspect convergence':info?'Overview only':reduced?'Explicit reduced model · see fidelity notes':selected==='centrifuge'?'Equilibrium closure':'Prescribed-field orbits';
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
$('live-update').addEventListener('change',()=>{if($('live-update').checked)run();else clearTimeout(liveTimer);});
$('system').addEventListener('change',selectMode);$('run').addEventListener('click',()=>{workspace?.open('plots');run();});
$('lithium-preset').setAttribute('aria-description',LITHIUM_PRESET_NOTE);
$('lithium-preset').addEventListener('click',()=>{
 for(const [id,value]of Object.entries(LITHIUM_PRESET_VALUES))$(id).value=value;
 experience?.sync();selectMode();
 $('plot-status').textContent=LITHIUM_PRESET_NOTE;
});
$('reset-camera').addEventListener('click',resetCamera);
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
function preset(voltage) {
  $('field').value='.10';$('voltage').value=String(voltage);$('energy').value='.5';$('parallel').value='20';$('source-radius').value='4';
  experience?.sync();invalidate();run();
}
$('preset-separate').addEventListener('click',()=>preset(400));$('preset-control').addEventListener('click',()=>preset(0));
$('tune-rf').addEventListener('click',()=>{
  const ion=ions()[0];$('rf-frequency').value=String(Math.round(E_CHARGE*(+$('field').value)*ion.chargeState/(ion.massU*AMU)/(2*Math.PI)));changed();
});
$('refine').addEventListener('click',async()=>{
  if(!latest)return;
  const finerSettings=latest.kind==='centrifuge'?radialRefinementSettings(latest.settings):{...latest.settings,dt:latest.settings.dt/2};
  if(!finerSettings){$('refine').disabled=true;$('refinement-status').textContent='No finer supported grid; radial convergence unassessed.';return;}
  const snapshot=latest,id=revision,controller=new AbortController();refinementController?.abort();refinementController=controller;$('refine').disabled=true;$('refinement-status').textContent=snapshot.kind==='centrifuge'?'Running finer radial grid…':'Running half-timestep comparison…';
  try {
    const fine=await calculate(snapshot.kind,finerSettings,controller.signal);
    if(id!==revision)return;
    if(snapshot.kind==='centrifuge'){
      const cut=Number($('radial-cut').value),a=equilibriumPresentation(snapshot.result,cut).diagnostics,b=equilibriumPresentation(fine,cut).diagnostics;
      $('refinement-status').textContent=`${snapshot.settings.bins} → ${finerSettings.bins} radial intervals · `+a.volumeMeanIonDensities.map((n,i)=>`${['A','B'][i]}: inventory relative change ${numeric(Math.abs(n-b.volumeMeanIonDensities[i])/b.volumeMeanIonDensities[i],5)} · bulk fraction change ${numeric(Math.abs(a.bulkNumberFractions[i]-b.bulkNumberFractions[i]),5)}`).join(' | ')+'. Radial quadrature check only; not experimental validation.';
      return;
    }
    $('refinement-status').textContent=snapshot.result.species.map((s,i)=>`${['A','B'][i]}: |Δ wall| ${Math.abs(s.wall-fine.species[i].wall)}, |Δ end| ${Math.abs(s.end-fine.species[i].end)}, |Δ RF work/ion| ${numeric(Math.abs(s.rfWorkEV-fine.species[i].rfWorkEV)/s.injected,4)} eV`).join(' · ')+(snapshot.settings.neutralDensityM3?' · Stochastic collision paths need ensemble convergence as well.':' · Counts alone do not establish trajectory convergence.');
  } catch(e){if(id===revision)$('refinement-status').textContent=e.message;}
  finally{if(id===revision)$('refine').disabled=snapshot.kind==='centrifuge'&&!radialRefinementSettings(snapshot.settings);}
});
$('compare').addEventListener('click',async()=>{
  workspace?.open('plots');
  const id=revision,controller=new AbortController();comparisonController?.abort();comparisonController=controller;$('comparison').hidden=false;$('comparison-results').replaceChildren();$('compare-status').textContent='Running independent models…';$('compare').disabled=true;
  const modes=coreModes;
  const settings=modes.map(selected=>config(selected));
  const results=await Promise.allSettled(modes.map((selected,i)=>calculate(selected,settings[i],controller.signal)));
  if(id===revision) {
    $('compare-status').textContent='Independent operating points · observables differ by model; inspect each configuration.';
    results.forEach((entry,i)=>{
      const card=document.createElement('div'),heading=document.createElement('h3'),p=document.createElement('p');heading.textContent=guide(modes[i]).title;
      if(entry.status==='rejected')p.textContent=entry.reason.message;
      else if(isReduced(modes[i])||modes[i]==='doublewell-dynamics')p.textContent=entry.value.metrics.map(m=>`${m.label}: ${numeric(m.value)} ${m.unit}`).join(' · ');
      else if(modes[i]==='centrifuge'){const r=entry.value,w=r.profiles.at(-1);p.textContent=`Wall B fraction ${(100*w.ionDensities[1]/w.ionDensities.reduce((a,b)=>a+b,0)).toFixed(1)}% · log enrichment ${numeric(w.logSeparationFactors[1])}. Equilibrium, not collection efficiency.`;}
      else p.textContent=entry.value.species.map((s,j)=>`${['A','B'][j]}: end ${s.end}/${s.injected}, wall ${s.wall}/${s.injected}, RF work/ion ${numeric(s.rfWorkEV/s.injected)} eV`).join(' · ');
      const scope=document.createElement('p');scope.className='comparison-scope';scope.textContent=entry.status==='fulfilled'?modelValidity(modes[i],settings[i],entry.value):guide(modes[i]).fidelity;
      const detail=document.createElement('details'),summary=document.createElement('summary'),pre=document.createElement('pre');summary.textContent='Operating point';pre.textContent=JSON.stringify(settings[i],null,2);detail.append(summary,pre);
      card.append(heading,p,scope,detail);$('comparison-results').append(card);
    });
  }
  if(comparisonController===controller)$('compare').disabled=false;
});
$('export').addEventListener('click',()=>{
  if(!latest)return;
  const blob=new Blob([serializeRun(latest)],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='mass-spinner-run.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
inspectors=setupComponentInspectors({THREE:{Raycaster:THREE.Raycaster,Vector2:THREE.Vector2},canvas:$('scene'),getHardware:()=>hardware,getCamera:()=>camera,onFusionSelect:id=>fusionApparatus?.syncSelection(id),onInspect:inspectComponent,
 canPick:()=>gpuReady&&['rotating','icr'].includes(mode())&&['1','3'].includes(experience?.level??'1')});
apparatus=setupApparatus($('model-apparatus'),{onInspect:inspectComponent});
tutorialInsights=setupTutorialInsights($('tutorial-insights'));
fusionApparatus=setupApparatus($('fusion-apparatus'),{components:fusionComponents,onSelect:id=>inspectors.fusion.select(id,false),onInspect:inspectComponent});fusionApparatus.show('beam-target');
const blanketExplorer=setupBlanketExplorer($('blanket-explorer'));
setupApparatus(blanketExplorer.render,{components:blanketComponents,onInspect:()=>workspace?.open('inspect')}).show('blanket');
setupLaboratory(changed);setupDoublewellControls(changed);setupReferenceAtlas();setupFailureLaboratory();
setupHydrogenTracer($('failure-lab'));
const marathon=setupMarathonModels({transformPlots:targetPlots,onState:value=>{
 fusionApparatus.updateSurfaceState(value?surfaceState({model:'beam-target',settings:value.result.config,result:value.result,acceptedModel:'beam-target',acceptedSettings:value.result.config,selectedState:value.state,source:value.source,acceptedSource:value.source}):null,value?.result.config);
},onStatus:value=>{
 fusionApparatus.setPending(value.phase==='pending');for(const control of targetBaselines.values()){if(value.phase==='invalid')control.clearCurrent();else control.setPending(value.phase==='pending');}
}});
setupMaterialRealism({readSource:()=>marathon.source.read()});
const fuelCentrifuge=setupFuelCentrifuge({onInspect:()=>workspace?.open('inspect'),onResults:()=>workspace?.open('plots')});
const collectorHost=document.createElement('div');$('orbit-results').after(collectorHost);collector=setupCollectorAcceptance(collectorHost);
setupPreciseControls(document,{describeRange:range=>range.id==='gaussian-density'?{scale:'log10',unit:'m⁻³',label:'Axis ion density'}:{unit:({'field':'T','voltage':'V','energy':'eV','parallel':'eV','source-radius':'cm','axial-temperature':'eV','rf-amplitude':'V/m','gaussian-field':'T','gaussian-width':'m','rotation':'rad/s','ion-temperature':'eV','electron-temperature':'eV','axis-fraction':'%','play-mass-b':'u'})[range.id]??range.dataset.unit}});renderConvergenceEvidence(convergenceEvidence);studyUI=setupStudies(mode,config,calculate);
baseline=setupBaseline($('live-plots'),baselineOptions);
$('replay-retry').addEventListener('click',showResearch);
workspace=setupWorkspace({onContextChange:({level,marathon})=>fuelCentrifuge.setActive(level==='2'&&marathon==='centrifuge')});
experience=setupExperience({selectMode,invalidate,showView,showResearch,onLevelChange:level=>{workspace.setLevel(level);sceneVisibility();void legacyScene.ensure();}});
