import {DEFAULT_SPATIAL_EXPERIMENT,validateFuelSpatialExperiment,type FuelSpatialExperimentConfig,type simulateFuelSpatialExperiment} from './fuel-spatial-experiment.js';
import {requestSimulationWithIdentity} from './worker-client.js';
import {producingCode,type ProducingCodeIdentity} from './producing-code.js';
import {renderPlots} from './laboratory.js';

type SpatialResult = ReturnType<typeof simulateFuelSpatialExperiment>;
type SpatialExport = {schemaVersion: 1;kind: 'fuel-spatial-experiment-export';result: SpatialResult;producingCode: ProducingCodeIdentity};
type SpatialControlKey = 'contactVoltageV'|'magneticT'|'numberDensityM3'|'temperatureK'|'durationS';

/** Optional common-fluid experiment; its controls never modify the live rotors. */
export function mountFuelSpatialExperiment(host: HTMLElement,{request=requestSimulationWithIdentity}: {request?: typeof requestSimulationWithIdentity}={}){
 const doc=host.ownerDocument,el=<K extends keyof HTMLElementTagNameMap>(tag: K,text?: string)=>{const node=doc.createElement(tag);if(text!==undefined)node.textContent=text;return node;};
 const detail=el('details');detail.className='fuel-spatial-experiment';
 detail.append(el('summary','Spatial rotation · research experiment'));
 detail.append(el('p','This closed argon calculation includes local rotation, species transport and gas/liner heat. Its numerical and experimental accuracy are unknown. It does not replace the live two-rotor model.'));
 detail.append(el('p','The assumed cylinder has a 1 cm radius and 10 cm length. The grounded upper disk covers the inner half-area. Outer-cylinder voltage is relative to this disk. The model calculates current from voltage. Equal-mass argon labels share one fluid velocity. There is no ion–neutral slip control.'));
 detail.append(el('p',`Fixed research grid: ${DEFAULT_SPATIAL_EXPERIMENT.radialCells} radial × ${DEFAULT_SPATIAL_EXPERIMENT.axialCells} axial electrical cells, ${DEFAULT_SPATIAL_EXPERIMENT.steps} time steps. Positive conventional current leaves the gas through the outer contact.`));
 detail.append(el('p','Prior startup surface errors were 4.63712% in time and 2.88464% in space, above the 1%/2% limits. Those conditions differ from this short run and do not show its accuracy. The density control limits do not show where continuum equations apply. At low density, rarefaction can make local viscosity, Fourier heat conduction and gas–wall film relations invalid. The model puts Joule heat directly into the common gas without separate electron and heavy-particle energy equations. It does not calculate electron energy, chemistry, axial shear, meridional flow or feed/exhaust.'));
 const controls=el('div');controls.className='fuel-spatial-controls';detail.append(controls);
 const inputs=new Map<SpatialControlKey,{input: HTMLInputElement;scale: number}>();
 for(const [key,label,unit,min,max,step,scale]of [
  ['contactVoltageV','Outer contact potential','V',-10,10,.1,1],
  ['magneticT','Axial magnetic field','T',0,1,.05,1],
  ['numberDensityM3','Initial argon number density','m⁻³',1e18,1e24,'any',1],
  ['temperatureK','Initial gas and liner temperature','K',300,1800,10,1],
  ['durationS','Experiment window','μs',.1,10,.1,1e6],
 ] as const){
  const labelNode=el('label',`${label} (${unit})`),input=el('input');
  input.type='number';input.id=`spatial-${key}`;labelNode.htmlFor=input.id;
  input.min=String(min);input.max=String(max);input.step=String(step);input.value=String(DEFAULT_SPATIAL_EXPERIMENT[key]*scale);
  controls.append(labelNode,input);inputs.set(key,{input,scale});
 }
 const pulseLabel=el('label','Driven fraction of window'),pulse=el('select');
 pulse.id='spatial-drive-fraction';pulseLabel.htmlFor=pulse.id;
 for(const [value,label]of [[1,'Full window'],[.5,'First half, then shorted'],[0,'Grounded throughout']] as const){
  const option=el('option',label);option.value=String(value);pulse.append(option);
 }
 pulse.value=String(DEFAULT_SPATIAL_EXPERIMENT.driveFraction);controls.append(pulseLabel,pulse);
 detail.append(el('p','At zero voltage, the contacts form a short circuit. This state does not show an open circuit or discharge extinction.'));
 const run=el('button','Run research window'),cancel=el('button','Cancel'),download=el('button','Export research JSON');
 run.type=cancel.type=download.type='button';cancel.hidden=true;download.disabled=true;
 const status=el('p','Use Run research window to start a separate short calculation.');status.setAttribute('role','status');
 const plots=el('div');plots.className='live-plots';
 const identity=el('p');identity.className='fuel-spatial-identity';
 detail.append(run,cancel,download,status,identity,plots);host.append(detail);
 let revision=0,controller: AbortController | null=null,accepted: SpatialExport | null=null,disposed=false,exportURL: string | null=null,exportTimer: ReturnType<typeof setTimeout> | undefined;
 const read=()=>validateFuelSpatialExperiment({...DEFAULT_SPATIAL_EXPERIMENT,
  ...Object.fromEntries([...inputs].map(([key,{input,scale}])=>[key,Number(input.value)/scale])),
  driveFraction:Number(pulse.value)});
 const clearExport=()=>{clearTimeout(exportTimer);if(exportURL){URL.revokeObjectURL(exportURL);exportURL=null;}};
 const clear=()=>{clearExport();accepted=null;download.disabled=true;identity.textContent='';renderPlots(plots,[]);};
 const ready=()=>{
  run.disabled=disposed||Boolean(controller)||[...inputs.values()].some(({input})=>input.value===''||!input.checkValidity());
 };
 const invalidate=()=>{revision++;controller?.abort();controller=null;cancel.hidden=true;clear();ready();};
 const changed=()=>{invalidate();status.textContent='Inputs changed. Previous results are no longer available. Run the calculation again.';};
 for(const {input}of inputs.values())input.addEventListener('input',changed);
 pulse.addEventListener('change',changed);
 function checkedResult(result: SpatialResult,config: FuelSpatialExperimentConfig){
  if(result?.schemaVersion!==1||result.kind!=='spatial-argon-experiment'
   ||result.numericallyQualified!==false||result.experimentallyQualified!==false
   ||result.liveDefaultReplaced!==false
   ||!Object.entries(config).every(([key,value])=>result.config?.[key as keyof FuelSpatialExperimentConfig]===value)
   ||!Array.isArray(result.snapshots)||result.snapshots.length<2)throw new Error('Unsupported spatial research result.');
  const history=result.snapshots;
  for(const [i,row]of history.entries()){
   if(!Number.isFinite(row.timeS)||(i?row.timeS<=history[i-1].timeS:row.timeS!==0)
    ||!Number.isFinite(row.electrodeCurrentA)||!Array.isArray(row.radiusM)||row.radiusM.length!==config.radialCells
    ||!Array.isArray(row.omegaRadS)||!Array.isArray(row.temperatureK)
    ||row.omegaRadS.length!==row.radiusM.length||row.temperatureK.length!==row.radiusM.length
    ||row.radiusM.some((r,j)=>!Number.isFinite(r)||r<=0||(j&&r<=row.radiusM[j-1]))
    ||row.omegaRadS.some(v=>!Number.isFinite(v))||row.temperatureK.some(v=>!Number.isFinite(v)||v<=0))
    throw new Error('Incomplete or nonfinite spatial research trajectory.');
  }
  if(history.at(-1)!.timeS!==config.durationS)throw new Error('Incomplete spatial research window.');
  return result;
 }
 async function start(){
  if(disposed||!detail.open||run.disabled)return;
  invalidate();const id=revision;
  try{
   const config=read();controller=new AbortController();ready();cancel.hidden=false;status.textContent='Separate spatial calculation in progress…';
   const reply=await request({kind:'fuel-spatial-experiment',schemaVersion:1,id,config},controller.signal);
   if(disposed||id!==revision)return;
   const source=producingCode(reply.producingCode);
   if(!source)throw new Error('Spatial research source identity is unavailable.');
   const result=checkedResult(reply.result,config),last=result.snapshots.at(-1)!;
   accepted={schemaVersion:1,kind:'fuel-spatial-experiment-export',result,producingCode:source};
   renderPlots(plots,[
    {label:'Endpoint local angular speed',x:last.radiusM.map(r=>r*100),y:last.omegaRadS,xLabel:'Radius (cm)',yLabel:'Common-fluid angular speed (rad/s)'},
    {label:'Endpoint local gas temperature',x:last.radiusM.map(r=>r*100),y:last.temperatureK,xLabel:'Radius (cm)',yLabel:'Gas temperature (K)'},
    {label:'Solved outward electrode current',x:result.snapshots.map(s=>s.timeS*1e6),y:result.snapshots.map(s=>s.electrodeCurrentA),xLabel:'Time (μs)',yLabel:'Signed outer-contact current (A)'},
   ]);
   identity.textContent=`Worker source SHA-256: ${source.sourceHash}`;download.disabled=false;
   status.textContent='Calculation complete. Numerical and experimental accuracy are unknown. Lines connect stored samples.';
  }catch(error){
   const failure=error as Error;
   if(!disposed&&id===revision){clear();status.textContent=failure.name==='AbortError'?'Research calculation canceled.':`Research calculation failed: ${failure.message}`;}
  }finally{if(!disposed&&id===revision){controller=null;cancel.hidden=true;ready();}}
 }
 const cancelled=()=>{invalidate();status.textContent='Research calculation canceled.';};
 const toggled=()=>{if(!detail.open){invalidate();status.textContent='Use Run research window to start a separate short calculation.';}};
 const exportResult=()=>{
  if(!accepted)return;
  clearExport();
  const url=URL.createObjectURL(new Blob([JSON.stringify(accepted,null,2)+'\n'],{type:'application/json'}));
  exportURL=url;const link=el('a');link.href=url;link.download='spatial-argon-research.json';link.click();
  exportTimer=setTimeout(()=>{if(exportURL===url){URL.revokeObjectURL(url);exportURL=null;}},1000);
 };
 const clicked=()=>{void start();};
 run.addEventListener('click',clicked);cancel.addEventListener('click',cancelled);download.addEventListener('click',exportResult);detail.addEventListener('toggle',toggled);ready();
 return {element:detail,run:start,get snapshot(){return accepted?structuredClone(accepted):null;},dispose(){
  disposed=true;invalidate();
  for(const {input}of inputs.values())input.removeEventListener('input',changed);
  pulse.removeEventListener('change',changed);run.removeEventListener('click',clicked);cancel.removeEventListener('click',cancelled);
  download.removeEventListener('click',exportResult);detail.removeEventListener('toggle',toggled);detail.remove();
 }};
}
