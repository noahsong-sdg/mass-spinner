import {DEFAULT_TARGET_EXPOSURE,simulateTargetExposure} from './target-exposure.ts';
import {renderPlots} from './laboratory.js';

const make=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
const number=n=>n===null?'—':n===0?'0':Math.abs(n)<.001||Math.abs(n)>=1e5?n.toExponential(3):Number(n.toPrecision(4)).toString();

export function setupTargetExposure(host,{active=true,simulate=simulateTargetExposure}={}){
 const panel=make('section'),heading=make('div'),title=make('h3','Exposure');panel.className='target-exposure-panel';
 heading.append(title);
 const body=make('div'),controls=make('div'),durationHost=make('div'),plot=make('div'),metrics=make('div'),status=make('p');
 body.className='target-exposure-body';controls.className='target-exposure-controls';plot.className='live-plots';metrics.className='target-exposure-metrics';
 status.setAttribute('role','status');status.className='instrument-note';durationHost.className='target-duration';controls.append(durationHost);
 const advanced=make('details'),advancedBody=make('div');advanced.append(make('summary','Initial state & cooldown'),advancedBody);
 const reads=new Map();let beam=null,latest=null,dirty=true;
 const fields=[
  ['arealHeatCapacityJm2K','Areal heat capacity','J m⁻² K⁻¹',2,6,.01,4,true],
  ['heatTransferWM2K','Effective cooling conductance','W m⁻² K⁻¹',0,20000,100,5000,false],
  ['coolantK','Coolant bath','°C',-20,200,1,20,false],
  ['initialK','Initial bulk temperature','°C',-20,200,1,20,false],
  ['cooldownS','After beam shutoff','s',0,200,1,20,false],
 ];
 for(const [key,label,unit,min,max,step,value,log]of fields){
  const celsius=key==='coolantK'||key==='initialK';
  const box=make('div'),caption=make('label'),output=make('output'),input=make('input');box.className='control';
  Object.assign(input,{id:`target-${key}`,type:'range',min,max,step,value});caption.htmlFor=input.id;caption.append(make('span',label),output);box.append(caption,input);
  input.setAttribute('data-range-scale',log?'log10':'linear');input.setAttribute('data-unit',unit);
  (['arealHeatCapacityJm2K','heatTransferWM2K'].includes(key)?controls:advancedBody).append(box);
  const read=()=>{const value=Number(input.value);return log?10**value:celsius?value+273.15:value;};reads.set(key,read);
  const readout=()=>{const physical=read(),display=celsius?physical-273.15:physical;output.textContent=`${number(display)} ${unit}`;input.setAttribute('aria-valuetext',output.textContent);};
  input.addEventListener('input',()=>{readout();invalidate();});readout();
 }
 controls.append(advanced);
 const ledger=make('details'),ledgerPlot=make('div'),ledgerText=make('p');ledgerPlot.className='live-plots';ledger.append(make('summary','Thermal energy & fuel budget'),ledgerText,ledgerPlot);
 const notes=make('details'),list=make('ul');notes.append(make('summary','Model info'),make('p','Bulk thermal scenario with assumed properties; source yield stays fixed. Cₐ d(T − Tcool)/dt = q″ − h(T − Tcool). τ = Cₐ/h. Beam heat acts for the source exposure, then q″ = 0. h = 0 gives the exact adiabatic limit. Dashed plot marker = beam shutoff.'),list);
 const exportButton=make('button','Export exposure calculation ↓');exportButton.type='button';exportButton.className='text-button';exportButton.disabled=true;
 const sources=make('p');for(const [name,url]of [['Thermal approximation','https://arxiv.org/abs/2412.16357'],['Target transport & lifetime','https://www.sandia.gov/research/publications/details/optimization-of-target-lifetime-for-production-of-14-mev-neutrons-2020-12-15/'],['Model scope','/MARATHON-TARGET-EXPOSURE.md']]){const a=make('a',name+' ↗');a.href=url;sources.append(a,document.createTextNode(' · '));}notes.append(sources);
 function calculate(){
  dirty=false;
  latest=null;plot.replaceChildren();ledgerPlot.replaceChildren();metrics.replaceChildren();ledgerText.textContent='';list.replaceChildren();exportButton.disabled=true;
  if(!beam){status.textContent='No valid source.';return;}
  try{
   const config={...DEFAULT_TARGET_EXPOSURE};for(const [key,read]of reads)config[key]=read();latest=simulate(beam,config);
   const temperature={...latest.curves[0],y:latest.curves[0].y.map(k=>k-273.15),yLabel:'Bulk assembly temperature (°C)'};renderPlots(plot,[temperature]);
   // Energy curves are available only when requested, keeping the primary view compact.
   if(ledger.open)renderPlots(ledgerPlot,latest.curves.slice(1));
   for(const [label,value]of [['Peak bulk temperature',`${number(latest.peakTemperatureK-273.15)} °C`],['Thermal time constant',latest.thermalTimeConstantS===null?'Adiabatic':`${number(latest.thermalTimeConstantS)} s`]]){const row=make('div');row.append(make('span',label),make('strong',value));metrics.append(row);}
   const f=latest.final,fraction=latest.fusionOnlyConsumedFraction;
   ledgerText.textContent=`Deposited ${number(f.depositedEnergyJ)} J · stored change ${number(f.storedEnergyJ)} J · heat to coolant ${number(f.heatToCoolantJ)} J (signed) · residual ${number(f.energyResidualJ)} J. Initial T inventory ${number(latest.initialTritiumNuclei)} nuclei; fusion consumes ${number(latest.fusionConsumedTritium)} (${fraction===null?'no loaded inventory':number(100*fraction)+'%'}). This omits exchange, diffusion and renewal; it is not target lifetime.`;
   list.replaceChildren(...latest.assumptions.map(text=>make('li',text)));
   status.textContent='';exportButton.disabled=false;
  }catch(error){latest=null;status.textContent=error.message;}
 }
 function refresh(){if(active&&dirty)calculate();}
 function invalidate(){dirty=true;latest=null;exportButton.disabled=!beam;refresh();}
 ledger.addEventListener('toggle',()=>{ledgerPlot.replaceChildren();if(ledger.open&&latest)renderPlots(ledgerPlot,latest.curves.slice(1));});
 exportButton.addEventListener('click',()=>{if(dirty)calculate();if(!latest)return;const url=URL.createObjectURL(new Blob([JSON.stringify({schemaVersion:1,source:beam.config,...latest},null,2)],{type:'application/json'})),a=make('a');a.href=url;a.download='mass-spinner-target-exposure.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 body.append(controls,plot);panel.append(heading,metrics,body,status,ledger,notes,exportButton);host.append(panel);refresh();
 return {durationHost,update(value){beam=value;invalidate();},setActive(value){active=value;refresh();}};
}
