import {evaluateNeutronResponse} from './neutron-response.ts';
import {renderPlots} from './laboratory.js';
const make=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const fmt=x=>x===0?'0':Number(x.toPrecision(4)).toString();
/** Independent reference family; deliberately does not consume a target mean energy as a full spectrum. */
export function setupNeutronResponse(host,packet){
 const panel=make('details'),controls=make('div'),plot=make('div'),metrics=make('div'),status=make('p'),info=make('details'),uncertainty=make('p');
 panel.className='fusion-model-notes';controls.className='instrument-controls';plot.className='live-plots';metrics.className='fusion-readouts';status.setAttribute('role','status');
 info.append(make('summary','Data & uncertainty'),make('p','OpenMC 0.16 · NJOY2016 · ENDF/B-VIII.1 H1. Isotropic 14.1 MeV births; free H1 at 293.6 K and assumed 6×10²⁸ atoms/m³. Cylinder radius 10 cm, front gap 10 cm. This separate reference does not calibrate LiT, the live source spectrum, shielding, dose or activation.'),make('p','MC SE is statistical error from independent transport runs. Holdout residuals are observed midpoint interpolation discrepancies, not guaranteed error bounds or nuclear-data uncertainty.'));
 info.append(uncertainty);
 info.append(make('p','The original 4 cm midpoint failed its interpolation gates. It became a training node; this refinement uses five fresh holdouts. The original failure remains archived. The synthetic scatter control accounts explicitly for OpenMC’s documented zero-cross-section floor.'));
 const exportButton=make('button','Export response ↓');exportButton.type='button';exportButton.className='text-button';exportButton.disabled=true;
 panel.append(make('summary','Multiple scattering · H1 reference'),controls,metrics,plot,status,info,exportButton);host.append(panel);
 const reads=new Map();let latest=null;
 function calculate(){
  latest=null;metrics.replaceChildren();renderPlots(plot,[]);uncertainty.textContent='';exportButton.disabled=true;
  try{
   const thicknessM=reads.get('thickness')()/100,sourceRateS=reads.get('rate')();
   latest=evaluateNeutronResponse(packet,thicknessM,14.1,sourceRateS);
   for(const [key,title]of [['absorption','Absorptions'],['total','Collisions']]){
    const s=latest.scores[key],row=make('div');row.append(make('span',title),make('output',`${fmt(s.rateS)} s⁻¹`));metrics.append(row);
   }
   const x=Array.from({length:41},(_,i)=>2+i*.4),scan=x.map(cm=>evaluateNeutronResponse(packet,cm/100,14.1,sourceRateS));
   renderPlots(plot,[['absorption','Absorptions per emitted neutron'],['total','Collisions per emitted neutron']].map(([key,label])=>({label:'Full transport · MC ±1 SE',x,y:scan.map(r=>r.scores[key].mean),low:scan.map(r=>r.scores[key].mean-r.scores[key].stdError),high:scan.map(r=>r.scores[key].mean+r.scores[key].stdError),xLabel:'H1 thickness (cm)',yLabel:label,selectedX:thicknessM*100})));
   uncertainty.textContent='Per emitted neutron · '+['absorption','total'].map(key=>`${key}: MC SE ${fmt(latest.scores[key].stdError)}; max observed holdout residual ${fmt(latest.scores[key].maxObservedHoldoutResidual)}`).join(' · ');status.textContent='';
   exportButton.disabled=false;
  }catch(error){latest=null;metrics.replaceChildren();renderPlots(plot,[]);status.textContent=error.message;}
 }
 for(const [key,label,min,max,step,value]of [['thickness','H1 thickness (cm)',2,18,.1,10],['rate','Reference births (s⁻¹)',0,1e12,1e9,1e10]]){
  const box=make('div'),caption=make('label'),output=make('output'),input=make('input');box.className='control';Object.assign(input,{id:`neutron-response-${key}`,type:'range',min,max,step,value});caption.htmlFor=input.id;caption.append(make('span',label),output);box.append(caption,input);controls.append(box);reads.set(key,()=>Number(input.value));
  input.dataset.rangeScale='linear';input.dataset.unit=key==='thickness'?'cm':'s⁻¹';
  const update=()=>{output.textContent=fmt(Number(input.value));input.setAttribute('aria-valuetext',`${output.textContent} ${key==='thickness'?'cm':'s⁻¹'}`);calculate();};input.addEventListener('input',update);output.textContent=fmt(value);
 }
 exportButton.addEventListener('click',()=>{
  if(!latest)return;const url=URL.createObjectURL(new Blob([JSON.stringify({packet,result:latest},null,2)],{type:'application/json'})),a=make('a');a.href=url;a.download='mass-spinner-h1-response.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 calculate();return {read:()=>latest};
}
