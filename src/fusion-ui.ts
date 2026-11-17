import {DEFAULT_FUSION_BEAM,simulateFusionBeam,type FusionBeamConfig} from './fusion-reactor.js';
import {renderPlots} from './laboratory.js';
import {fusionPlaygroundData} from './fusion-playground.js';

const element=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
const format=(value:number|null)=>value===null||!Number.isFinite(value)?'—':value===0?'0':Math.abs(value)<.001||Math.abs(value)>=1e5?value.toExponential(3):Number(value.toPrecision(4)).toString();
type BeamNumericKey = Exclude<keyof FusionBeamConfig,'stoppingModel'> | 'tritiumSiteFraction';
export type FusionBeamResult = ReturnType<typeof simulateFusionBeam>;
export interface FusionLaboratoryOptions {onUpdate?:(result:FusionBeamResult|null)=>void;exposureHost?:HTMLElement}
const byId=(id:string)=>document.getElementById(id)!;
const fields:[BeamNumericKey,string,string,number,number,number,boolean?][]=[
 ['beamEnergyKeV','D⁺ laboratory energy','keV',20,500,5],
 ['beamCurrentA','D⁺ beam current','A',-5,0,.1,true],
 ['targetColumnM2','Tritium nuclei column','m⁻²',19,25,.1,true],
 ['stoppingFraction','Imposed fractional energy loss','',0,.9,.01],
 ['beamAreaM2','Illuminated target area','m²',-5,-1,.1,true],
 ['alphaDepositedFraction','Alpha energy deposited in target layer','',0,1,.05],
 ['acceleratorEfficiency','Assumed accelerator efficiency','',.1,1,.05],
 ['exposureS','Exposure duration','s',0,100,1],
 ['materialColumnM2','Fixed Li/T formula-unit column','m⁻²',18,23,.1,true],
 ['tritiumSiteFraction','Initial tritium site fraction','',0,1,.05],
];

/** This independent panel does not reuse the mass separator's hardware or state. */
export function setupFusionLaboratory({onUpdate=()=>{},exposureHost}:FusionLaboratoryOptions={}){
 const reads=new Map<BeamNumericKey,()=>number>(),host=byId('fusion-controls');let latest:FusionBeamResult|null=null;
 const model=element('select'),modelLabel=element('label','Stopping model');model.id='fusion-stopping-model';modelLabel.htmlFor=model.id;
 for(const [value,label]of [['linear','Illustrative linear slowing'],['geant4-bragg','Geant4-derived Li/T estimate']]){const option=element('option',label);option.value=value;model.append(option);}model.value='linear';
 const assumptions=byId('fusion-assumption-controls');assumptions.append(modelLabel,model);
 const boxes=new Map<BeamNumericKey,HTMLDivElement>();
 const readConfig=()=>{
  const c:FusionBeamConfig & {tritiumSiteFraction?:number}={...DEFAULT_FUSION_BEAM};for(const [key,read]of reads)c[key]=read();
  c.stoppingModel=model.value as FusionBeamConfig['stoppingModel'];
  if(model.value==='geant4-bragg')c.targetColumnM2=(byId('fusion-target-enabled') as HTMLInputElement).checked?c.materialColumnM2!*c.tritiumSiteFraction!:0;
  delete c.tritiumSiteFraction;return c;
 };
 const update=()=>{
  try{
   const c=readConfig();latest=simulateFusionBeam(c);
   const playground=fusionPlaygroundData(latest);
   renderPlots(byId('fusion-plots'),playground.profiles);
   renderPlots(byId('marathon-energy-plots'),playground.curves);
   byId('fusion-readouts').replaceChildren(...playground.metrics.map(([title,value,unit])=>{
    const row=element('div');row.append(element('span',title),element('strong',`${format(value)} ${unit}`));return row;
   }));
   byId('fusion-spot').setAttribute('r',String(playground.spotRadiusM/.2*72));
   byId('fusion-spot').setAttribute('fill-opacity',c.beamCurrentA>0?'.35':'0');
   byId('fusion-beam').setAttribute('visibility',c.beamCurrentA>0?'visible':'hidden');
   byId('fusion-neutrons').setAttribute('visibility',latest.neutronRateS>0?'visible':'hidden');
   byId('fusion-spot-size').textContent=`Circular footprint · ${(2*playground.spotRadiusM*100).toPrecision(3)} cm diameter`;
   byId('fusion-current-label').textContent=`${format(c.beamCurrentA*1000)} mA D⁺`;
   const metrics: [string,number|null,string][]=[['D–T reactions',latest.neutronRateS,'s⁻¹'],['Nuclear Q power',latest.nuclearPowerW,'W'],
    ['Incident beam power',latest.beamPowerW,'W'],['Accelerator wall-plug input',latest.wallPlugPowerW,'W'],
    ['Fusion / incident beam power',latest.beamGain,''],['Reaction probability / deuteron',latest.fusionProbability,''],
    ['Target-layer heat',latest.targetLayerHeatW,'W'],['Transmitted beam power',latest.transmittedBeamPowerW,'W'],
    ['Layer heat / illuminated area',latest.targetLayerHeatFluxWM2,'W/m²'],['D–T neutrons over exposure',latest.totalNeutrons,''],
    ['If substrate stops remaining beam',latest.assemblyHeatIfTransmittedBeamStoppedW,'W'],['Energy ledger residual',latest.energyResidualW,'W']];
   byId('fusion-metrics').replaceChildren(...metrics.map(([title,value,unit])=>{
    const row=element('div');row.append(element('span',title),element('strong',`${format(value)} ${unit}`));return row;
   }));
   byId('fusion-notes').replaceChildren(...latest.assumptions.map(note=>element('li',note)));
   byId('fusion-status').textContent=playground.excludedEnergiesKeV.length?`Scan omits ${playground.excludedEnergiesKeV.length} energies outside the fit domain; starts at ${playground.curves[0].x[0]} keV.`:'';
   byId('fusion-energy-label').textContent=`D⁺ · ${format(c.beamEnergyKeV)} keV`;
   byId('fusion-target-label').textContent=`Assumed T column ${format(c.targetColumnM2)} m⁻²`;
   (byId('export-fusion') as HTMLButtonElement).disabled=false;
   onUpdate(latest);
  }catch(error){
   latest=null;for(const id of ['fusion-plots','marathon-energy-plots'])renderPlots(byId(id),[]);
   for(const id of ['fusion-metrics','fusion-readouts'])byId(id).replaceChildren();
   byId('fusion-spot').setAttribute('r','0');for(const id of ['fusion-beam','fusion-neutrons'])byId(id).setAttribute('visibility','hidden');
   for(const id of ['fusion-spot-size','fusion-current-label','fusion-energy-label','fusion-target-label'])byId(id).textContent='—';
   byId('fusion-status').textContent=error instanceof Error?error.message:String(error);(byId('export-fusion') as HTMLButtonElement).disabled=true;onUpdate(null);
  }
 };
 for(const [key,title,unit,min,max,step,log]of fields){
  const box=element('div'),label=element('label'),output=element('output'),input=element('input');box.className='control';
  const defaults:Partial<Record<BeamNumericKey,number>>={...DEFAULT_FUSION_BEAM,materialColumnM2:1e21,tritiumSiteFraction:1};
  const value=defaults[key]!;
  input.type='range';input.id='fusion-'+key;input.min=String(min);input.max=String(max);input.step=String(step);input.value=String(log?Math.log10(value):value);
  input.setAttribute('data-range-scale',log?'log10':'linear');input.setAttribute('data-unit',unit);
  boxes.set(key,box);
  label.htmlFor=input.id;label.append(element('span',title),output);box.append(label,input);
  let controls=['beamEnergyKeV','beamCurrentA','beamAreaM2'].includes(key)?host:byId('fusion-assumption-controls');
  if(key==='exposureS'&&exposureHost)controls=exposureHost;
  controls.append(box);
  const read=()=>log?10**Number(input.value):Number(input.value);reads.set(key,read);
  const readout=()=>{output.textContent=`${format(read())} ${unit}`;input.setAttribute('aria-valuetext',output.textContent.trim());};readout();input.addEventListener('input',()=>{readout();update();});
 }
 const setMode=()=>{
  const material=model.value==='geant4-bragg';
  for(const key of ['targetColumnM2','stoppingFraction'])boxes.get(key as BeamNumericKey)!.hidden=material;
  for(const key of ['materialColumnM2','tritiumSiteFraction'])boxes.get(key as BeamNumericKey)!.hidden=!material;
 };
 model.addEventListener('change',()=>{setMode();update();});setMode();
 for(const [id,key]of [['fusion-beam-enabled','beamCurrentA'],['fusion-target-enabled','targetColumnM2']] as const){
  const toggle=byId(id) as HTMLInputElement,input=byId('fusion-'+key) as HTMLInputElement,read=reads.get(key)!;toggle.checked=true;
  reads.set(key,()=>toggle.checked?read():0);
  toggle.addEventListener('change',()=>{input.disabled=!toggle.checked;if(key==='targetColumnM2')(byId('fusion-tritiumSiteFraction') as HTMLInputElement).disabled=!toggle.checked;update();});
 }
 byId('export-fusion').addEventListener('click',()=>{
  if(!latest)return;const url=URL.createObjectURL(new Blob([JSON.stringify({schemaVersion:1,...latest},null,2)],{type:'application/json'}));
  const a=element('a');a.href=url;a.download='mass-spinner-beam-target.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 update();return {read:readConfig,update};
}
