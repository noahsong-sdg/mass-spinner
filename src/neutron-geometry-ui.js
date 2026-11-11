import {isotropicDiskReference} from './neutron-geometry.ts';
import {renderPlots} from './laboratory.js';

const element=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const format=n=>n===0?'0':Number(n.toPrecision(4)).toString();

/** Optional geometric reference; receives current source output, never changes it. */
export function setupNeutronGeometry(host){
 const details=element('details'),summary=element('summary','Sample geometry');
 const controls=element('div'),metrics=element('div'),plot=element('div'),status=element('p');
 details.className='fusion-model-notes';controls.className='instrument-controls';metrics.className='fusion-readouts';plot.className='live-plots';
 status.setAttribute('role','status');
 const note=element('p','Isotropic point source → circular sample normal to its axis, in free flight. This reference does not solve the actual D–T angular spectrum, attenuation, scattering, detector response or isotope yield. Sample area differs from the beam footprint.');
 const info=element('details');info.append(element('summary','Model info'),note);
 const rate=element('output','—'),current=element('output','—');
 for(const [label,out]of [['Neutrons crossing sample / s',rate],['Mean current through plane · n/m²/s',current]]){
  const row=element('div');row.append(element('span',label),out);metrics.append(row);
 }
 let latest=null;const reads=new Map();
 const update=()=>{
  rate.textContent='—';current.textContent='—';plot.replaceChildren();
  if(!latest){status.textContent='No valid source.';return;}
  try{
   const distanceM=reads.get('distance')(),sampleAreaM2=reads.get('area')()/1e4;
   const config={neutronRateS:latest.neutronRateS,distanceM,sampleAreaM2};
   const result=isotropicDiskReference(config);
   rate.textContent=format(result.interceptedRateS);current.textContent=format(result.meanPlaneCurrentM2S);
   const x=[...new Set([...Array.from({length:30},(_,i)=>(i+1)/10),distanceM])].sort((a,b)=>a-b);
   const y=x.map(d=>isotropicDiskReference({...config,distanceM:d}).meanPlaneCurrentM2S);
   renderPlots(plot,[{label:'Isotropic disk reference',x,y,xLabel:'Source to sample plane (m)',yLabel:'Mean incident current through plane (n/m²/s)',selectedX:distanceM,yDomain:[0,Math.max(...y)||1]}]);
   const ratio=Math.sqrt(latest.config.beamAreaM2/Math.PI)/distanceM;
   status.textContent=ratio>.1?'Point-source limit: spot radius / distance > 0.1; finite-source geometry unresolved.':'';
  }catch(error){rate.textContent='—';current.textContent='—';plot.replaceChildren();status.textContent=error.message;}
 };
 for(const [key,title,unit,min,max,step,value]of [['distance','Source to sample plane','m',.1,3,.05,.5],['area','Circular sample area','cm²',1,100,1,10]]){
  const box=element('div'),label=element('label'),out=element('output'),input=element('input');box.className='control';
  input.id='neutron-sample-'+key;input.type='range';input.min=min;input.max=max;input.step=step;input.value=value;
  label.htmlFor=input.id;label.append(element('span',title),out);box.append(label,input);controls.append(box);
  reads.set(key,()=>Number(input.value));
  const readout=()=>out.textContent=`${format(Number(input.value))} ${unit}`;
  input.addEventListener('input',()=>{readout();update();});readout();
 }
 details.append(summary,controls,metrics,status,plot,info);host.append(details);update();
 return {update:result=>{latest=result;update();}};
}
