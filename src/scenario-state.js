/** Shareable control coordinates, not raw solver results or executable settings. */
const ids = text => text.split(/\s+/).filter(Boolean);
const separator = ids(`system live-update field voltage energy parallel source-radius distribution axial-temperature particles resolution mass-a mass-b charge-a charge-b neutral-density neutral-cross-section neutral-mass rf-amplitude rf-frequency rf-handedness rotation ion-temperature electron-temperature axis-fraction radial-cut radial-resolution random-seed centrifuge-closure magnetic-boundary composition-boundary gaussian-field gaussian-width gaussian-density diffusion-closure study-batches scan-parameter scan-min scan-max scan-points`);
const prefixed = (prefix, text) => ids(text).map(key => prefix + key);
const collector=ids('collector-inner-fraction collector-outer-fraction collector-surface');
const model = [...separator,...collector,
 ...prefixed('h1-', `energy field pitch neutral-density radius length particles seed`),
 ...prefixed('parameter-', `magneticT voltage quadraticShape canonicalMomentum plotInnerFraction temperatureEV beamEV radius length curvatureRadius mirrorRatio endRadiusRatio pitchDeg rotationRadS collisionHz electricVM duration densityM3 electronTemperatureEV thresholdAEV thresholdBEV ionizationCrossSectionA ionizationCrossSectionB backgroundMassU coulombLog energySpreadFraction pulseWidthS`),
 ...prefixed('dw-', `radius length magneticT voltage quadraticShape ionTemperatureEV rotationRadS beamEV sourceRadiusFraction pulseLengthFraction densityM3 electronTemperatureEV coulombLog boundary initialState rotationMode collisions collisionScattering collisionMethod collisionSourceAligned collisionTarget particlesPerSpecies cellsAcross collisionAxialCells dt duration seed`),
 ...prefixed('failure-', `neutralDensityM3 cxCrossSectionM2 pathLengthM residenceS electronDensityM3 recombinationM3S diffusionM2S ionDensityM3 impurityFraction coolingCoefficientWM3 electronTemperatureEV heatTransmission wallFluxM2S`)];
const marathon = [
 'marathon-apparatus',...prefixed('fuel-',`application pair magneticT currentA gasK durationS ionFraction collisionHz dragHz conductivitySm driveInnerFraction radiusM lengthM pressurePa lightFraction radialDiffusivityM2S cutFraction stages feedStage pumpSpeedM3S conductanceM3S linerK linerConductanceWK fusionMW burnFraction loopTimeS lithiumSeed thermal-enabled thermal-model thermal-thicknessMm thermal-wallCapacityJK thermal-gasWallWK thermal-coolingWK thermal-coolantK thermal-gasModel thermal-gasConductivityWMK thermal-resolution plot`),
 ...prefixed('fusion-', `beam-enabled target-enabled stopping-model beamEnergyKeV beamCurrentA targetColumnM2 stoppingFraction beamAreaM2 alphaDepositedFraction acceleratorEfficiency exposureS materialColumnM2 tritiumSiteFraction`),
 ...prefixed('coupled-', `replacementProbability pulseDuty pulsePeriodS cooldownS coolantK initialK backHeatTransferWM2K filmThicknessM filmConductivityWMK filmHeatCapacityJm3K backingThicknessM backingConductivityWMK backingHeatCapacityJm3K contactResistanceM2KPerW diffusivityM2S diffusionActivationEV releaseAttemptRateS releaseActivationEV surfaceReleaseVelocityMS surfaceReleaseActivationEV backPermeationVelocityMS backPermeationActivationEV renewalRateS renewalTritiumFraction depthCells backingCells maxStepS relativeTolerance plot depth-range time`),
 ...prefixed('neutron-transport-', `material distance area thickness total absorption efficiency density`),
 ...prefixed('neutron-sample-', `distance area`),
 ...prefixed('decay-', `parent daughter production beam cool`),
 ...prefixed('neutron-response-', `thickness rate`),
 ...prefixed('target-', `arealHeatCapacityJm2K heatTransferWM2K coolantK initialK cooldownS`),
 ...ids(`loading-replacement loading-tolerance implantation-reference-case finite-film-reference-case blanket-cooldown-hours blanket-isomer-fraction blanket-optical-depth material-geometry-mode material-number-density coating-deposition coating-erosion coating-incoming-t coating-incoming-d coating-temperature coating-duration`)];
const levels = {'1':[...ids('field voltage energy mass-b'),...collector], '2':marathon, '3':model, '4':ids('replay-case replay-time')};
const selectedTimes = new Set(['coupled-time', 'replay-time']);
const maxLength = 24000;

function known(level, id) { return levels[level]?.includes(id); }
function control(document, id) {
 const node=document.getElementById(id);
 return node && (node.tagName==='SELECT'||node.tagName==='INPUT'&&['range','number','checkbox'].includes(node.type)) ? node : null;
}
function accepts(node, value) {
 if(node.type==='checkbox')return typeof value==='boolean';
 if(node.tagName==='SELECT')return typeof value==='string'&&[...node.options].some(option=>option.value===value&&!option.disabled);
 if(typeof value!=='number'||!Number.isFinite(value))return false;
 if((node.dataset.integer==='true'||['charge-a','charge-b','random-seed','dw-seed','h1-particles','h1-seed'].includes(node.id))&&!Number.isInteger(value))return false;
 return (node.min===''||value>=Number(node.min))&&(node.max===''||value<=Number(node.max));
}
function dispatch(node) {
 const EventType=node.ownerDocument.defaultView.Event;
 node.dispatchEvent(new EventType(node.tagName==='SELECT'||node.type==='checkbox'?'change':'input',{bubbles:true}));
}
function validateMask(document, controls){
 const [inner,outer]=collector;
 if(!Object.hasOwn(controls,inner)&&!Object.hasOwn(controls,outer))return;
 const lo=Number(controls[inner]??control(document,inner)?.value),hi=Number(controls[outer]??control(document,outer)?.value);
 if(!Number.isFinite(lo)||!Number.isFinite(hi)||lo>hi)throw new Error('An ordered collector aperture is required.');
}
function validateFuel(document, controls){
 const value=id=>controls[id]??control(document,id)?.value;
 if(!Object.keys(controls).some(id=>id.startsWith('fuel-')))return;
 if(Number(value('fuel-feedStage'))>Number(value('fuel-stages')))throw new Error('Stage feed must lie in the cascade.');
 const topic=value('fuel-plot');
 if(value('fuel-application')==='pump'&&['cut','cascade'].includes(topic)||value('fuel-pair')!=='lithium'&&topic==='lithium')throw new Error('Plot is unavailable for this centrifuge configuration.');
 if(value('fuel-pair')==='molecular'&&controls['fuel-thermal-enabled']===true)throw new Error('Atomic thermal model cannot be used with D₂.');
 if(controls['fuel-thermal-gasModel']==='spatial'&&(value('fuel-pair')==='molecular'||controls['fuel-thermal-enabled']!==true||controls['fuel-thermal-model']!=='spatial'))throw new Error('Spatial gas requires enabled atomic thermal evolution and a radial tungsten liner.');
 if(controls['fuel-thermal-resolution']==='refined'&&(value('fuel-pair')==='molecular'||controls['fuel-thermal-enabled']!==true||controls['fuel-thermal-model']!=='spatial'||controls['fuel-thermal-gasModel']!=='spatial'))throw new Error('Refined resolution requires enabled atomic spatial gas and a radial tungsten liner.');
}
export function captureScenario(document, level, {validate=true}={}) {
 const controls={};
 for(const id of levels[level]??[]){
  const node=control(document,id);if(!node||(selectedTimes.has(id)||id==='replay-case')&&node.disabled)continue;
  if(node.disabled&&(id==='fuel-thermal-thicknessMm'||id==='fuel-thermal-gasConductivityWMK'||id==='fuel-thermal-resolution'||id==='fuel-thermal-wallCapacityJK'&&control(document,'fuel-thermal-model')?.value==='spatial'))continue;
  const phase=id==='coupled-time'?node.closest('.coupled-target')?.dataset.status:null;
  if(phase&&phase!=='accepted')continue;
  const value=node.type==='checkbox'?node.checked:node.tagName==='SELECT'?node.value:node.value.trim()===''?(validate?NaN:''):Number(node.value);
  if(validate&&(!accepts(node,value)||level==='1'&&id==='mass-b'&&value<20))throw new Error(`Invalid setting: ${id}`);
  controls[id]=value;
 }
 if(validate){validateMask(document,controls);validateFuel(document,controls);}
 return {version:2,level,controls};
}
export function scenarioLink(href, scenario) {
 validateScenario(scenario);
 const url=new URL(href);url.search='';url.hash='';
 url.searchParams.set('level',scenario.level);url.searchParams.set('v','2');url.searchParams.set('scenario',JSON.stringify(scenario));
 if(url.href.length>maxLength)throw new Error('Scenario link exceeds the supported size.');
 return url.href;
}
export function validateScenario(value) {
 if(!value||value.version!==2||!['1','2','3','4'].includes(value.level)||!value.controls||typeof value.controls!=='object'||Array.isArray(value.controls)||Object.keys(value).sort().join()!=='controls,level,version')throw new Error('Unsupported scenario.');
 const entries=Object.entries(value.controls);
 if(entries.length>200||entries.some(([id,v])=>!known(value.level,id)||!['string','number','boolean'].includes(typeof v)||typeof v==='string'&&v.length>160||typeof v==='number'&&!Number.isFinite(v)))throw new Error('Unsupported scenario settings.');
}
/** v1 is deliberately left to readExperience, preserving its original bounds. */
export function readScenario(search) {
 const query=new URLSearchParams(search);
 if(query.get('v')!=='2'&&!query.has('scenario'))return {scenario:null,invalid:query.has('v')&&query.get('v')!=='1'};
 try{
  if(search.length>maxLength||query.get('v')!=='2'||query.getAll('scenario').length!==1||query.getAll('level').length!==1||query.getAll('v').length!==1)throw new Error();
  const scenario=JSON.parse(query.get('scenario'));validateScenario(scenario);
  if(query.get('level')!==scenario.level)throw new Error();
  return {scenario,invalid:false};
 }catch{return {scenario:null,invalid:true};}
}
/** Model selection is handled by the caller first. Validate the whole batch before mutation. */
export function restoreScenario(document, scenario, {includeModel=false, validateDomains=true, dispatchEvents=true, onDeferredError=()=>{}}={}) {
 validateScenario(scenario);
 const immediate=[],deferred=[];let acceptedSelection;
 // Older setup links predate the thermal extension; they represent a bath run.
 if(scenario.level==='2'&&!Object.hasOwn(scenario.controls,'fuel-thermal-enabled')){
  const thermal=control(document,'fuel-thermal-enabled');if(thermal)immediate.push([thermal,false]);
 }
 // Pre-spatial thermal links describe a lumped liner, even in an already-open spatial workspace.
 if(scenario.level==='2')for(const [id,value]of [['fuel-thermal-model','lumped'],['fuel-thermal-thicknessMm',1],['fuel-thermal-gasModel','lumped'],['fuel-thermal-gasConductivityWMK',.1],['fuel-thermal-resolution','interactive']]){
  const node=control(document,id);if(node&&!Object.hasOwn(scenario.controls,id))immediate.push([node,value]);
 }
 // Pre-centrifuge v2 links describe the original beam-target playground.
 if(scenario.level==='2'&&!Object.hasOwn(scenario.controls,'marathon-apparatus')){
  const apparatus=control(document,'marathon-apparatus');if(apparatus)immediate.push([apparatus,'source']);
 }
 for(const [id,value]of Object.entries(scenario.controls)){
  if(id==='system'&&!includeModel)continue;
  const node=control(document,id);
  if(!node)throw new Error(`Unavailable scenario setting: ${id}`);
  if(id==='coupled-time'){
   if(typeof value!=='number'||!Number.isInteger(value)||value<0||value>100000)throw new Error(`Invalid time: ${id}`);
   acceptedSelection=[node,value];continue;
  }
  if(id==='replay-time'){
   if(typeof value!=='number'||!Number.isInteger(value)||value<0||value>100000)throw new Error(`Invalid time: ${id}`);
   deferred.push([node,value]);continue;
  }
  if((selectedTimes.has(id)||id==='replay-case')&&node.disabled){
   if(selectedTimes.has(id)&&(typeof value!=='number'||!Number.isInteger(value)||value<0||value>100000))throw new Error(`Invalid time: ${id}`);
   deferred.push([node,value]);continue;
  }
  const valid=id==='fuel-feedStage'?Number.isInteger(value)&&value>=1&&value<=12:id==='fuel-plot'?typeof value==='string'&&[...node.options].some(option=>option.value===value):accepts(node,value);
  if(validateDomains&&(!valid||scenario.level==='1'&&id==='mass-b'&&value<20))throw new Error(`Out-of-domain scenario setting: ${id}`);
  immediate.push([node,value]);
 }
 if(validateDomains){validateMask(document,scenario.controls);validateFuel(document,scenario.controls);}
 const apply=entries=>{
  const stages=entries.find(([node])=>node.id==='fuel-stages');
  if(stages&&control(document,'fuel-feedStage'))control(document,'fuel-feedStage').max=String(stages[1]);
  // Set every coordinate before notifications: linked listeners see a coherent configuration.
  for(const [node,value]of entries)if(node.type==='checkbox')node.checked=value;else{
   // Precision controllers retain their declared gesture step before hydration.
   if(node.type==='range'&&!selectedTimes.has(node.id))node.step='any';
   node.value=String(value);
  }
  const priority=['material-geometry-mode','material-number-density','fusion-stopping-model'];
  const rank=node=>priority.includes(node.id)?priority.indexOf(node.id):100;
  if(dispatchEvents)for(const [node]of [...entries].sort(([a],[b])=>rank(a)-rank(b)))dispatch(node);
 };
 const accepted=()=>{
  const [node,value]=acceptedSelection;
  if(accepts(node,value))apply([[node,value]]);else onDeferredError(`Unavailable saved selection: ${node.id}`);
  node.removeEventListener('coupled-accepted',accepted);
 };
 // Install before configuration notifications can request/accept new work.
 if(acceptedSelection)acceptedSelection[0].addEventListener('coupled-accepted',accepted);
 apply(immediate);
 let observer;
 const remaining=[...deferred].sort(([a],[b])=>Number(a.id==='replay-time')-Number(b.id==='replay-time'));
 const ready=()=>{
  for(let i=0;i<remaining.length;){
   const [node,value]=remaining[i];if(node.disabled||node.id==='replay-time'&&remaining.some(([other])=>other.id==='replay-case')){i++;continue;}
   remaining.splice(i,1);
   if(accepts(node,value))apply([[node,value]]);else{
    if(node.id==='replay-case')remaining.splice(0,remaining.length);
    onDeferredError(`Unavailable saved selection: ${node.id}`);
   }
  }
  if(!remaining.length)observer?.disconnect();
 };
 if(remaining.length){
  observer=new document.defaultView.MutationObserver(ready);
  for(const [node]of remaining)observer.observe(node,{attributes:true,childList:true,subtree:true});
  ready();
 }
 return ()=>{observer?.disconnect();if(acceptedSelection)acceptedSelection[0].removeEventListener('coupled-accepted',accepted);};
}
