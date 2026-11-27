import {evaluateNeutronResponse,type NeutronResponsePacket} from './neutron-response.js';
import {renderPlots} from './laboratory.js';
const make=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string):HTMLElementTagNameMap[K]=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
const fmt=(x:number)=>x===0?'0':Number(x.toPrecision(4)).toString();
/** Independent reference family; deliberately does not consume a target mean energy as a full spectrum. */
export function setupNeutronResponse(host:HTMLElement,packet:NeutronResponsePacket,{active=true,deferWhenClosed=false}:{active?:boolean;deferWhenClosed?:boolean}={}){
 const panel=make('details'),controls=make('div'),plot=make('div'),metrics=make('div'),status=make('p'),info=make('details'),uncertainty=make('p');
 panel.className='fusion-model-notes';controls.className='instrument-controls';plot.className='live-plots';metrics.className='fusion-readouts';status.setAttribute('role','status');
 info.append(make('summary','Data & uncertainty'),make('p','OpenMC 0.16 · NJOY2016 · ENDF/B-VIII.1 H1. This reference emits 14.1 MeV neutrons equally in all directions. It uses free H1 at 293.6 K and a specified density of 6×10²⁸ atoms/m³. The cylinder radius and front gap are each 10 cm. This separate reference does not give experimental calibration for LiT, the live source spectrum, shielding, dose or activation.'),make('p','MC SE means Monte Carlo standard error from separate transport runs. Holdout residuals measure interpolation errors at test points unused in the interpolation. They do not give guaranteed error bounds or nuclear-data uncertainty.'));
 info.append(uncertainty);
 info.append(make('p','The original 4 cm test point failed its interpolation limits. The interpolation now includes that point and uses five new test points. The original failure remains in the records. The synthetic scattering control includes the minimum cross section specified by OpenMC.'));
 const exportButton=make('button','Export response ↓');exportButton.type='button';exportButton.className='text-button';exportButton.disabled=true;
 panel.append(make('summary','Multiple scattering · H1 reference'),controls,metrics,plot,status,info,exportButton);host.append(panel);
 const reads=new Map<string,()=>number>();let latest:ReturnType<typeof evaluateNeutronResponse>|null=null,dirty=true;
 function calculate(){
  dirty=false;latest=null;metrics.replaceChildren();renderPlots(plot,[]);uncertainty.textContent='';exportButton.disabled=true;
  try{
   const thicknessM=reads.get('thickness')!()/100,sourceRateS=reads.get('rate')!();
   const result=evaluateNeutronResponse(packet,thicknessM,14.1,sourceRateS);latest=result;
   for(const [key,title]of [['absorption','Absorptions'],['total','Collisions']] as const){
    const s=result.scores[key],row=make('div');row.append(make('span',title),make('output',`${fmt(s.rateS)} s⁻¹`));metrics.append(row);
   }
   const x=Array.from({length:41},(_,i)=>2+i*.4),scan=x.map(cm=>evaluateNeutronResponse(packet,cm/100,14.1,sourceRateS));
   renderPlots(plot,([['absorption','Absorptions per emitted neutron'],['total','Collisions per emitted neutron']] as const).map(([key,label])=>({label:'Full transport · MC ±1 SE',x,y:scan.map(r=>r.scores[key].mean),low:scan.map(r=>r.scores[key].mean-r.scores[key].stdError),high:scan.map(r=>r.scores[key].mean+r.scores[key].stdError),xLabel:'H1 thickness (cm)',yLabel:label,selectedX:thicknessM*100})));
   uncertainty.textContent='Per emitted neutron · '+(['absorption','total'] as const).map(key=>`${key}: MC SE ${fmt(result.scores[key].stdError)}; maximum observed holdout residual ${fmt(result.scores[key].maxObservedHoldoutResidual)}`).join(' · ');status.textContent='';
   exportButton.disabled=false;
  }catch(error){latest=null;metrics.replaceChildren();renderPlots(plot,[]);status.textContent=error instanceof Error?error.message:String(error);}
 }
 function refresh(){if(active&&dirty&&(!deferWhenClosed||panel.open))calculate();}
 function invalidate(){dirty=true;exportButton.disabled=true;refresh();}
 for(const [key,label,min,max,step,value]of [['thickness','H1 thickness (cm)',2,18,.1,10],['rate','Reference births (s⁻¹)',0,1e12,1e9,1e10]] as const){
  const box=make('div'),caption=make('label'),output=make('output'),input=make('input');box.className='control';Object.assign(input,{id:`neutron-response-${key}`,type:'range',min,max,step,value});caption.htmlFor=input.id;caption.append(make('span',label),output);box.append(caption,input);controls.append(box);reads.set(key,()=>Number(input.value));
  input.dataset.rangeScale='linear';input.dataset.unit=key==='thickness'?'cm':'s⁻¹';
  const update=()=>{output.textContent=fmt(Number(input.value));input.setAttribute('aria-valuetext',`${output.textContent} ${key==='thickness'?'cm':'s⁻¹'}`);invalidate();};input.addEventListener('input',update);output.textContent=fmt(value);
 }
 exportButton.addEventListener('click',()=>{
  if(dirty||!latest)return;const url=URL.createObjectURL(new Blob([JSON.stringify({packet,result:latest},null,2)],{type:'application/json'})),a=make('a');a.href=url;a.download='mass-spinner-h1-response.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 });
 panel.addEventListener('toggle',refresh);refresh();return {read:()=>dirty?null:latest,setActive(value:boolean){active=value;refresh();}};
}
