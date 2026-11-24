import {runOrbitStudy, type Study, type OrbitResult} from './experiments.js';
import {studyCurves} from './study-presentation.js';
import {renderPlots} from './laboratory.js';
import type {RunConfig} from './physics.js';
type StudyElements =
 Record<'repeat-study'|'scan-study'|'cancel-study'|'export-study',HTMLButtonElement> &
 Record<'study-batches'|'scan-min'|'scan-max'|'scan-points',HTMLInputElement> &
 Record<'scan-parameter',HTMLSelectElement> &
 Record<'study-panel'|'study-plots'|'study-metrics'|'study-status',HTMLElement>;
const $=<K extends keyof StudyElements>(id: K)=>document.getElementById(id) as StudyElements[K];
const pct=(n: number | null)=>n===null?'undefined':`${(100*n).toFixed(1)}%`;
export function setupStudies(getMode: () => string,getConfig: () => RunConfig,compute: (mode: string,config: RunConfig,signal: AbortSignal) => Promise<OrbitResult>){
 let active: AbortController | null | undefined,latest: {modelVersion: number; kind: string; settings: RunConfig; result: Awaited<ReturnType<typeof runOrbitStudy>>} | null | undefined;
 const resetButtons=()=>{$('repeat-study').disabled=false;$('scan-study').disabled=false;$('cancel-study').disabled=true;};
 const invalidate=()=>{active?.abort();active=null;latest=null;resetButtons();$('export-study').disabled=true;renderPlots($('study-plots'),[]);$('study-metrics').textContent='';$('study-status').textContent='Settings changed · study results cleared.';};
 const range=()=>{
  const [a,b]=({voltage:[200,600],magneticT:[.06,.16],massB:[40,120]})[$('scan-parameter').value as Study['parameter']];
  $('scan-min').value=String(a);$('scan-max').value=String(b);
 };
 $('scan-parameter').addEventListener('change',()=>{invalidate();range();});
 for(const id of ['study-batches','scan-min','scan-max','scan-points'] as const)$(id).addEventListener('input',invalidate);
 async function start(kind: Study['kind']){
  invalidate();const controller=new AbortController();active=controller;
  const selected=getMode(),settings=getConfig(),study: Study={kind,batches:Number($('study-batches').value),parameter:$('scan-parameter').value as Study['parameter'],
   minimum:Number($('scan-min').value),maximum:Number($('scan-max').value),points:Number($('scan-points').value)};
  $('repeat-study').disabled=true;$('scan-study').disabled=true;$('cancel-study').disabled=false;
  $('study-status').textContent='Running independent worker jobs…';
  try{
   const result=await runOrbitStudy(settings,study,controller.signal,(c,signal)=>compute(selected,c,signal),
    (n,total)=>{if(active===controller)$('study-status').textContent=`Completed ${n}/${total} worker jobs · snapshot of current settings`;});
   if(active!==controller)return;
   latest={modelVersion:6,kind:selected,settings,result};renderPlots($('study-plots'),studyCurves(result));
   const p=result.points[0].summary.purity;
   $('study-metrics').textContent=kind==='ensemble'?Object.entries(p).map(([key,v])=>`${key}: ${pct(v.fraction)} · ${v.intervalUnavailableReason?`interval unresolved: ${v.intervalUnavailableReason}`:`95% paired-batch interval ${pct(v.low)}–${pct(v.high)}`}`).join(' | '):'Each point combines its separate seed batches. Bands show the specified sampling interval. A missing purity band means these batches cannot give that interval.';
   $('study-status').textContent=`Complete · ${study.batches} separate batches per operating point. Purity intervals use resampling of paired whole batches. Bounds are unknown if a collector has no samples of either species. Few batches give limited uncertainty information, separate from model and discretization errors. Cold stability excludes source temperature and collisions and does not give finite-device recovery. Exported references include wall and axial flight times.`;
   $('export-study').disabled=false;
  }catch(error){if(active===controller)$('study-status').textContent=error instanceof Error?(error.name==='AbortError'?'Study cancelled.':error.message):String(error);}
  finally{if(active===controller){active=null;resetButtons();}}
 }
 $('repeat-study').addEventListener('click',()=>{void start('ensemble');});$('scan-study').addEventListener('click',()=>{void start('scan');});
 $('cancel-study').addEventListener('click',()=>{invalidate();$('study-status').textContent='Study cancelled. No partial result was saved.';});
 $('export-study').addEventListener('click',()=>{if(!latest)return;const url=URL.createObjectURL(new Blob([JSON.stringify(latest,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='mass-spinner-study.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
 return {invalidate,show(mode: string){$('study-panel').hidden=!['rotating','icr'].includes(mode);if(mode==='icr'&&$('scan-parameter').value==='voltage'){$('scan-parameter').value='magneticT';range();}}};
}
