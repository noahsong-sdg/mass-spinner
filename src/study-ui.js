import {runOrbitStudy} from './experiments.ts';
import {studyCurves} from './study-presentation.ts';
import {renderPlots} from './laboratory.js';
const $=id=>document.getElementById(id);
const pct=n=>n===null?'undefined':`${(100*n).toFixed(1)}%`;
export function setupStudies(getMode,getConfig,compute){
 let active,latest;
 const resetButtons=()=>{$('repeat-study').disabled=false;$('scan-study').disabled=false;$('cancel-study').disabled=true;};
 const invalidate=()=>{active?.abort();active=null;latest=null;resetButtons();$('export-study').disabled=true;$('study-plots').replaceChildren();$('study-metrics').textContent='';$('study-status').textContent='Settings changed · study results cleared.';};
 const range=()=>{
  const [a,b]=({voltage:[200,600],magneticT:[.06,.16],massB:[40,120]})[$('scan-parameter').value];
  $('scan-min').value=a;$('scan-max').value=b;
 };
 $('scan-parameter').addEventListener('change',()=>{invalidate();range();});
 for(const id of ['study-batches','scan-min','scan-max','scan-points'])$(id).addEventListener('input',invalidate);
 async function start(kind){
  invalidate();const controller=new AbortController();active=controller;
  const selected=getMode(),settings=getConfig(),study={kind,batches:Number($('study-batches').value),parameter:$('scan-parameter').value,
   minimum:Number($('scan-min').value),maximum:Number($('scan-max').value),points:Number($('scan-points').value)};
  $('repeat-study').disabled=true;$('scan-study').disabled=true;$('cancel-study').disabled=false;
  $('study-status').textContent='Running independent worker jobs…';
  try{
   const result=await runOrbitStudy(settings,study,controller.signal,(c,signal)=>compute(selected,c,signal),
    (n,total)=>{if(active===controller)$('study-status').textContent=`Completed ${n}/${total} worker jobs · snapshot of current settings`;});
   if(active!==controller)return;
   latest={modelVersion:6,kind:selected,settings,result};renderPlots($('study-plots'),studyCurves(result));
   const p=result.points[0].summary.purity;
   $('study-metrics').textContent=kind==='ensemble'?Object.entries(p).map(([key,v])=>`${key}: ${pct(v.fraction)} · ${v.intervalUnavailableReason?`interval unresolved: ${v.intervalUnavailableReason}`:`95% paired-batch interval ${pct(v.low)}–${pct(v.high)}`}`).join(' | '):'Each point pools its independent seed batches; bands show the specified sampling interval. Missing purity bands mean the sampled batches cannot resolve that interval.';
   $('study-status').textContent=`Complete · ${study.batches} independent batches per operating point. Purity intervals resample paired whole batches; bounds are unresolved when either species is unobserved in a collector. Few batches limit uncertainty resolution; model and discretization errors are separate. Cold stability excludes source temperature and collisions and does not predict finite-device recovery; exported references include wall and axial flight times.`;
   $('export-study').disabled=false;
  }catch(error){if(active===controller)$('study-status').textContent=error.name==='AbortError'?'Study cancelled.':error.message;}
  finally{if(active===controller){active=null;resetButtons();}}
 }
 $('repeat-study').addEventListener('click',()=>start('ensemble'));$('scan-study').addEventListener('click',()=>start('scan'));
 $('cancel-study').addEventListener('click',()=>{invalidate();$('study-status').textContent='Study cancelled; no partial result published.';});
 $('export-study').addEventListener('click',()=>{if(!latest)return;const url=URL.createObjectURL(new Blob([JSON.stringify(latest,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='mass-spinner-study.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 return {invalidate,show(mode){$('study-panel').hidden=!['rotating','icr'].includes(mode);if(mode==='icr'&&$('scan-parameter').value==='voltage'){$('scan-parameter').value='magneticT';range();}}};
}
