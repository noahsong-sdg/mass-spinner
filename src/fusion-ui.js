import {DEFAULT_FUSION_BEAM,simulateFusionBeam} from './fusion-reactor.ts';
import {renderPlots} from './laboratory.js';
import {fusionPlaygroundData} from './fusion-playground.ts';

const element=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
const format=value=>value===null||!Number.isFinite(value)?'—':value===0?'0':Math.abs(value)<.001||Math.abs(value)>=1e5?value.toExponential(3):Number(value.toPrecision(4)).toString();
const fields=[
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
export function setupFusionLaboratory({onUpdate=()=>{},exposureHost}={}){
 const reads=new Map(),host=document.getElementById('fusion-controls');let latest=null;
 const model=element('select'),modelLabel=element('label','Stopping model');model.id='fusion-stopping-model';modelLabel.htmlFor=model.id;
 for(const [value,label]of [['linear','Illustrative linear slowing'],['geant4-bragg','Geant4-derived Li/T estimate']]){const option=element('option',label);option.value=value;model.append(option);}model.value='linear';
 const assumptions=document.getElementById('fusion-assumption-controls');assumptions.append(modelLabel,model);
 const boxes=new Map();
 const readConfig=()=>{
  const c={...DEFAULT_FUSION_BEAM};for(const [key,read]of reads)c[key]=read();
  c.stoppingModel=model.value;
  if(model.value==='geant4-bragg')c.targetColumnM2=document.getElementById('fusion-target-enabled').checked?c.materialColumnM2*c.tritiumSiteFraction:0;
  delete c.tritiumSiteFraction;return c;
 };
 const update=()=>{
  try{
   const c=readConfig();latest=simulateFusionBeam(c);
   const playground=fusionPlaygroundData(latest);
   renderPlots(document.getElementById('fusion-plots'),playground.profiles);
   renderPlots(document.getElementById('marathon-energy-plots'),playground.curves);
   document.getElementById('fusion-readouts').replaceChildren(...playground.metrics.map(([title,value,unit])=>{
    const row=element('div');row.append(element('span',title),element('strong',`${format(value)} ${unit}`));return row;
   }));
   document.getElementById('fusion-spot').setAttribute('r',String(playground.spotRadiusM/.2*72));
   document.getElementById('fusion-spot').setAttribute('fill-opacity',c.beamCurrentA>0?'.35':'0');
   document.getElementById('fusion-beam').setAttribute('visibility',c.beamCurrentA>0?'visible':'hidden');
   document.getElementById('fusion-neutrons').setAttribute('visibility',latest.neutronRateS>0?'visible':'hidden');
   document.getElementById('fusion-spot-size').textContent=`Circular footprint · ${(2*playground.spotRadiusM*100).toPrecision(3)} cm diameter`;
   document.getElementById('fusion-current-label').textContent=`${format(c.beamCurrentA*1000)} mA D⁺`;
   const metrics=[['D–T reactions',latest.neutronRateS,'s⁻¹'],['Nuclear Q power',latest.nuclearPowerW,'W'],
    ['Incident beam power',latest.beamPowerW,'W'],['Accelerator wall-plug input',latest.wallPlugPowerW,'W'],
    ['Fusion / incident beam power',latest.beamGain,''],['Reaction probability / deuteron',latest.fusionProbability,''],
    ['Target-layer heat',latest.targetLayerHeatW,'W'],['Transmitted beam power',latest.transmittedBeamPowerW,'W'],
    ['Layer heat / illuminated area',latest.targetLayerHeatFluxWM2,'W/m²'],['D–T neutrons over exposure',latest.totalNeutrons,''],
    ['If substrate stops remaining beam',latest.assemblyHeatIfTransmittedBeamStoppedW,'W'],['Energy ledger residual',latest.energyResidualW,'W']];
   document.getElementById('fusion-metrics').replaceChildren(...metrics.map(([title,value,unit])=>{
    const row=element('div');row.append(element('span',title),element('strong',`${format(value)} ${unit}`));return row;
   }));
   document.getElementById('fusion-notes').replaceChildren(...latest.assumptions.map(note=>element('li',note)));
   document.getElementById('fusion-status').textContent=playground.excludedEnergiesKeV.length?`Scan omits ${playground.excludedEnergiesKeV.length} energies outside the fit domain; starts at ${playground.curves[0].x[0]} keV.`:'';
   document.getElementById('fusion-energy-label').textContent=`D⁺ · ${format(c.beamEnergyKeV)} keV`;
   document.getElementById('fusion-target-label').textContent=`Assumed T column ${format(c.targetColumnM2)} m⁻²`;
   document.getElementById('export-fusion').disabled=false;
   onUpdate(latest);
  }catch(error){
   latest=null;for(const id of ['fusion-plots','marathon-energy-plots'])renderPlots(document.getElementById(id),[]);
   for(const id of ['fusion-metrics','fusion-readouts'])document.getElementById(id).replaceChildren();
   document.getElementById('fusion-spot').setAttribute('r','0');for(const id of ['fusion-beam','fusion-neutrons'])document.getElementById(id).setAttribute('visibility','hidden');
   for(const id of ['fusion-spot-size','fusion-current-label','fusion-energy-label','fusion-target-label'])document.getElementById(id).textContent='—';
   document.getElementById('fusion-status').textContent=error.message;document.getElementById('export-fusion').disabled=true;onUpdate(null);
  }
 };
 for(const [key,title,unit,min,max,step,log]of fields){
  const box=element('div'),label=element('label'),output=element('output'),input=element('input');box.className='control';
  const value=DEFAULT_FUSION_BEAM[key]??({materialColumnM2:1e21,tritiumSiteFraction:1})[key];
  input.type='range';input.id='fusion-'+key;input.min=min;input.max=max;input.step=step;input.value=log?Math.log10(value):value;
  input.setAttribute('data-range-scale',log?'log10':'linear');input.setAttribute('data-unit',unit);
  boxes.set(key,box);
  label.htmlFor=input.id;label.append(element('span',title),output);box.append(label,input);
  let controls=['beamEnergyKeV','beamCurrentA','beamAreaM2'].includes(key)?host:document.getElementById('fusion-assumption-controls');
  if(key==='exposureS'&&exposureHost)controls=exposureHost;
  controls.append(box);
  const read=()=>log?10**Number(input.value):Number(input.value);reads.set(key,read);
  const readout=()=>{output.textContent=`${format(read())} ${unit}`;input.setAttribute('aria-valuetext',output.textContent.trim());};readout();input.addEventListener('input',()=>{readout();update();});
 }
 const setMode=()=>{
  const material=model.value==='geant4-bragg';
  for(const key of ['targetColumnM2','stoppingFraction'])boxes.get(key).hidden=material;
  for(const key of ['materialColumnM2','tritiumSiteFraction'])boxes.get(key).hidden=!material;
 };
 model.addEventListener('change',()=>{setMode();update();});setMode();
 for(const [id,key]of [['fusion-beam-enabled','beamCurrentA'],['fusion-target-enabled','targetColumnM2']]){
  const toggle=document.getElementById(id),input=document.getElementById('fusion-'+key),read=reads.get(key);toggle.checked=true;
  reads.set(key,()=>toggle.checked?read():0);
  toggle.addEventListener('change',()=>{input.disabled=!toggle.checked;if(key==='targetColumnM2')document.getElementById('fusion-tritiumSiteFraction').disabled=!toggle.checked;update();});
 }
 document.getElementById('export-fusion').addEventListener('click',()=>{
  if(!latest)return;const url=URL.createObjectURL(new Blob([JSON.stringify({schemaVersion:1,...latest},null,2)],{type:'application/json'}));
  const a=element('a');a.href=url;a.download='mass-spinner-beam-target.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 update();return {read:readConfig,update};
}
