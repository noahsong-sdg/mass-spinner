import {evolveDecayNetwork} from './decay-network.ts';
import {renderPlots} from './laboratory.js';
const make=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};
/** Generic scenario rates; intentionally disconnected from absorption tallies and clinical workflows. */
export function setupDecayNetwork(host){
 const panel=make('details'),controls=make('div'),plot=make('div'),status=make('p');
 panel.className='fusion-model-notes';controls.className='instrument-controls';plot.className='live-plots';status.setAttribute('role','status');
 panel.append(make('summary','Irradiation & cooldown'),make('p','Generic parent → daughter → stable chain. Rates are scenario inputs, not isotope data or production yield.'),controls,plot,status);host.append(panel);
 const read=new Map();let latest=null;
 function calculate(){
  latest=null;renderPlots(plot,[]);
  try{
   const parent=read.get('parent')(),daughter=read.get('daughter')(),production=read.get('production')(),beam=read.get('beam')(),cool=read.get('cool')();
   const network={nodes:[{id:'Parent',decayRateS:Math.LN2/parent,products:[{to:'Daughter',fraction:1}]},{id:'Daughter',decayRateS:Math.LN2/daughter,products:[{to:'Stable',fraction:1}]},{id:'Stable',decayRateS:0}],productionAtomsS:[production,0,0]};
   const atEnd=evolveDecayNetwork(network,[0,0,0],beam,true),times=[...new Set([...Array.from({length:61},(_,i)=>(beam+cool)*i/60),beam])].sort((a,b)=>a-b);
   const rows=times.map(t=>t<=beam?evolveDecayNetwork(network,[0,0,0],t,true):evolveDecayNetwork(network,atEnd.populations,t-beam,false));
   renderPlots(plot,network.nodes.map((node,i)=>({label:node.id,x:times,y:rows.map(r=>r.populations[i]),xLabel:'Elapsed time (s)',yLabel:'Inventory (atoms)',selectedX:beam})));
   latest={network,beamDurationS:beam,cooldownS:cool,times,rows};status.textContent=`Cooldown begins at ${beam} s · final parent activity ${rows.at(-1).activitiesBq[0].toPrecision(3)} Bq`;
  }catch(error){renderPlots(plot,[]);status.textContent=error.message;}
 }
 for(const [key,label,min,max,value]of [['parent','Parent half-life (s)',1,10000,600],['daughter','Daughter half-life (s)',1,10000,1200],['production','Parent production (atoms/s)',0,100000,10000],['beam','Irradiation (s)',0,10000,1800],['cool','Cooldown (s)',0,10000,3600]]){
  const box=make('div'),caption=make('label'),output=make('output'),input=make('input');box.className='control';
  Object.assign(input,{id:`decay-${key}`,type:'range',min,max,step:1,value});caption.htmlFor=input.id;caption.append(make('span',label),output);box.append(caption,input);controls.append(box);read.set(key,()=>Number(input.value));
  input.dataset.rangeScale='linear';input.dataset.unit=key==='production'?'atoms/s':'s';
  const update=()=>{output.textContent=input.value;input.setAttribute('aria-valuetext',`${input.value} ${input.dataset.unit}`);calculate();};input.addEventListener('input',update);output.textContent=input.value;input.setAttribute('aria-valuetext',`${input.value} ${input.dataset.unit}`);
 }
 calculate();return {read:()=>latest};
}
