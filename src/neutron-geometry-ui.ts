import {isotropicDiskReference} from './neutron-geometry.js';
import {renderPlots} from './laboratory.js';

const element=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string):HTMLElementTagNameMap[K]=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const format=(n:number)=>n===0?'0':Number(n.toPrecision(4)).toString();

export type NeutronGeometrySource={neutronRateS:number;config:{beamAreaM2:number}};

/** Optional geometric reference; receives current source output, never changes it. */
export function setupNeutronGeometry(host:HTMLElement){
 const details=element('details'),summary=element('summary','Sample geometry');
 const controls=element('div'),metrics=element('div'),plot=element('div'),status=element('p');
 details.className='fusion-model-notes';controls.className='instrument-controls';metrics.className='fusion-readouts';plot.className='live-plots';
 status.setAttribute('role','status');
 const note=element('p','An isotropic point source emits neutrons equally in all directions. This reference calculates direct paths to a circular sample perpendicular to the source-to-sample axis. It does not include the D–T angular spectrum, attenuation, scattering, detector response or isotope yield. The sample area is different from the beam area.');
 const info=element('details');info.append(element('summary','Model info'),note);
 const rate=element('output','—'),current=element('output','—');
 for(const [label,out]of [['Neutrons crossing sample / s',rate],['Mean current through plane · n/m²/s',current]] as const){
  const row=element('div');row.append(element('span',label),out);metrics.append(row);
 }
 let latest:NeutronGeometrySource|null=null;const reads=new Map<string,()=>number>();
 const update=()=>{
  rate.textContent='—';current.textContent='—';plot.replaceChildren();
  if(!latest){status.textContent='No source result is available.';return;}
  try{
   const distanceM=reads.get('distance')!(),sampleAreaM2=reads.get('area')!()/1e4;
   const config={neutronRateS:latest.neutronRateS,distanceM,sampleAreaM2};
   const result=isotropicDiskReference(config);
   rate.textContent=format(result.interceptedRateS);current.textContent=format(result.meanPlaneCurrentM2S);
   const x=[...new Set([...Array.from({length:30},(_,i)=>(i+1)/10),distanceM])].sort((a,b)=>a-b);
   const y=x.map(d=>isotropicDiskReference({...config,distanceM:d}).meanPlaneCurrentM2S);
   renderPlots(plot,[{label:'Isotropic disk reference',x,y,xLabel:'Source to sample plane (m)',yLabel:'Mean incident current through plane (n/m²/s)',selectedX:distanceM,yDomain:[0,Math.max(...y)||1]}]);
   const ratio=Math.sqrt(latest.config.beamAreaM2/Math.PI)/distanceM;
   status.textContent=ratio>.1?'Spot radius / distance > 0.1. The point-source approximation does not include the finite source size.':'';
  }catch(error){rate.textContent='—';current.textContent='—';plot.replaceChildren();status.textContent=error instanceof Error?error.message:String(error);}
 };
 for(const [key,title,unit,min,max,step,value]of [['distance','Source to sample plane','m',.1,3,.05,.5],['area','Circular sample area','cm²',1,100,1,10]] as const){
  const box=element('div'),label=element('label'),out=element('output'),input=element('input');box.className='control';
  input.id='neutron-sample-'+key;input.type='range';input.min=String(min);input.max=String(max);input.step=String(step);input.value=String(value);
  label.htmlFor=input.id;label.append(element('span',title),out);box.append(label,input);controls.append(box);
  reads.set(key,()=>Number(input.value));
  const readout=()=>out.textContent=`${format(Number(input.value))} ${unit}`;
  input.addEventListener('input',()=>{readout();update();});readout();
 }
 details.append(summary,controls,metrics,status,plot,info);host.append(details);update();
 return {update:(result:NeutronGeometrySource|null)=>{latest=result;update();}};
}
