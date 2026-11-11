import {renderPlots} from './laboratory.js';
import {setupResearchDistributions} from './research-distribution-ui.js';

const $=id=>document.getElementById(id);
const element=(tag,text)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;};

/** Deduplicate an active request; only successful loads are remembered. */
export function createResearchLoader(load=setupResearchViewer){
 let viewer,pending;
 return ()=>{
  if(viewer)return Promise.resolve(viewer);
  if(!pending)pending=Promise.resolve().then(load).then(result=>{viewer=result;return result;}).finally(()=>{pending=null;});
  return pending;
 };
}

/** Replay exact saved moments; no interpolation, collision solve or new inputs. */
export async function setupResearchViewer(fetcher=fetch){
 try{
  const response=await fetcher('/research-recordings.json');if(!response.ok)throw new Error('Recorded data could not be loaded.');
  const data=await response.json();
  if(data.schemaVersion!=='mass-spinner-recorded-moments-v1'||data.kind!=='recorded-offline-data'||!data.cases.length)throw new Error('Unsupported recording packet.');
  const select=$('replay-case'),time=$('replay-time');
  const distributions=setupResearchDistributions(fetcher);
  select.replaceChildren(...data.cases.map(c=>{const option=element('option',c.label);option.value=c.id;return option;}));
  select.value=data.cases[0].id;
  function update(){
   const c=data.cases.find(c=>c.id===select.value),state=c.states[Number(time.value)];
   $('replay-time-value').textContent=`${(state.timeS*1e6).toPrecision(4)} µs · saved step ${state.step}`;
   $('replay-status').textContent=`Recorded Julia run · ${c.id} · qualification WITHHELD. No solver runs when you scrub.`;
   $('replay-scale').textContent=`40/84 u ions · V₀ = ${data.normalization.velocityMS.toPrecision(6)} m/s · density ${data.normalization.densityM3.toExponential(1)} m⁻³ per species · n=${c.config.nAxis}, q=${c.config.cubatureAxis}, α=${c.config.alpha}.`;
   const tensors=data.species.map((s,i)=>{
    const box=element('div'),pre=element('pre',state.temperatureTensorEV[i].map(row=>row.map(v=>v.toPrecision(5).padStart(11)).join(' ')).join('\n'));
    box.append(element('strong',s.label+' · temperature tensor (eV)'),pre);return box;
   });$('replay-tensors').replaceChildren(...tensors);
   distributions.update(c.id,state.step);$('replay-tensors').append(distributions.element);
   const curves=[],axes=['x','y','z'],x=c.states.map(s=>s.timeS*1e6);
   for(let species=0;species<2;species++)for(let axis=0;axis<3;axis++){
    const label=`${species?'84':'40'} u · ${axes[axis]}`,base={x,xLabel:'Saved time (µs)',selectedX:state.timeS*1e6,
     color:species?'#d2956b':'#a4c4b1',dash:['','7 4','2 4'][axis]};
    curves.push({...base,label,y:c.states.map(s=>s.means[species][axis]),yLabel:'Mean velocity / V₀'});
    curves.push({...base,label,y:c.states.map(s=>s.temperatureTensorEV[species][axis][axis]),yLabel:'Diagonal temperature tensor (eV)'});
    const [i,j]=[[0,1],[0,2],[1,2]][axis];
    curves.push({...base,label:`${species?'84':'40'} u · ${axes[i]}${axes[j]}`,y:c.states.map(s=>s.temperatureTensorEV[species][i][j]),yLabel:'Off-diagonal temperature tensor (eV)'});
   }
   renderPlots($('replay-plots'),curves);
  }
  function choose(){const c=data.cases.find(c=>c.id===select.value);time.min='0';time.max=String(c.states.length-1);time.step='1';time.value='0';update();}
  select.addEventListener('change',choose);time.addEventListener('input',update);select.disabled=false;time.disabled=false;choose();
  return {data,update};
 }catch(error){
  $('replay-status').textContent=error.message;$('replay-case').disabled=true;$('replay-time').disabled=true;
  $('replay-time-value').textContent='—';$('replay-scale').textContent='';
  $('replay-tensors').replaceChildren();$('replay-plots').replaceChildren();return null;
 }
}
