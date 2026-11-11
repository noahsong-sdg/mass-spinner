import {PLAY_DEFAULTS,readExperience} from './experience-state.ts';
import {captureScenario,readScenario,restoreScenario,scenarioLink} from './scenario-state.js';

const $=id=>document.getElementById(id);
const copy={'1':'Mass Spinner','2':'Marathon','3':'Models','4':'Research'};
const fixedPlay={parallel:'20','source-radius':'4',distribution:'thermal','axial-temperature':'1',particles:'96',resolution:'2e-8',
 'mass-a':'40','charge-a':'1','charge-b':'1','neutral-density':'0','neutral-cross-section':'1e-19','neutral-mass':'40','random-seed':'42'};

export function setupExperience({selectMode,invalidate,showView,showResearch,onLevelChange}){
 const shared=readScenario(location.search),initial=readExperience(location.search);
 const levelButtons=[...document.querySelectorAll('button[data-level]')],navigation=levelButtons[0]?.closest?.('.level-navigation'),view=document.defaultView;
 let level,savedPlay=initial.settings,shareRevision=0,hydrating=false,cancelDeferred=()=>{};
 const defaults=Object.fromEntries(['2','3','4'].map(key=>[key,captureScenario(document,key)]));
 let savedModels=defaults['3'];
 const mask=()=>Object.fromEntries(Object.entries(captureScenario(document,'1',{validate:false}).controls).filter(([id])=>id.startsWith('collector-')));
 const defaultMask=mask();let savedMask={...defaultMask};
 const read=()=>({field:Number($('field').value),voltage:Number($('voltage').value),energy:Number($('energy').value),massB:Number($('mass-b').value)});
 const sync=()=>{
  $('play-mass-b').value=$('mass-b').value;
  $('play-mass-b-value').textContent=`${$('mass-b').value} u`;
  if(level==='1'&&!hydrating)savedPlay=read();
  shareRevision++;$('share-link').hidden=true;$('share-status').textContent='';
 };
 function revealActiveLevel(){
  if(!navigation)return;
  const button=levelButtons.find(button=>button.dataset.level===level),bounds=navigation.getBoundingClientRect(),item=button.getBoundingClientRect();
  const left=bounds.left+navigation.clientLeft,right=left+navigation.clientWidth;
  if(item.right-item.left>navigation.clientWidth||item.left<left)navigation.scrollLeft+=item.left-left;
  else if(item.right>right)navigation.scrollLeft+=item.right-right;
 }
 function refresh(){
  document.body.dataset.level=level;
  for(const button of levelButtons)button.setAttribute('aria-pressed',String(button.dataset.level===level));
  $('level-title').textContent=copy[level];$('share-playground').hidden=false;
  sync();onLevelChange?.(level);revealActiveLevel();
 }
 function enter(next,reset=false,dispatchEvents=true){
  if(level==='1'&&!reset){savedPlay=read();savedMask=mask();}
  if(level==='3'&&!reset)savedModels=captureScenario(document,'3',{validate:false});
  cancelDeferred();level=next;invalidate();
  $('live-update').checked=level!=='4'&&level!=='2';
  if(level==='1'){
   for(const [id,value]of Object.entries(fixedPlay))$(id).value=value;
   for(const [key,value]of Object.entries(savedPlay))$(key==='massB'?'mass-b':key).value=String(value);
   restoreScenario(document,{version:2,level:'1',controls:savedMask},{validateDomains:false,dispatchEvents});
   $('system').value='rotating';selectMode();showView('render');
  }else if(level==='3'){
   $('system').value=savedModels.controls.system??'centrifuge';selectMode();
   // Local editing state may be unfinished; only shared/pinned scenarios require valid domains.
   restoreScenario(document,savedModels,{validateDomains:false,dispatchEvents});
  }else if(level==='4')showResearch?.();
  refresh();
  const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('level',level);
  history.replaceState(null,'',url);
 }
 function capture(){return captureScenario(document,level);}
 function restore(scenario){
  try{scenarioLink(location.href,scenario);}catch{$('share-status').textContent='Unsupported scenario.';return false;}
  const previous=captureScenario(document,level,{validate:false}),previousModels=savedModels;
  hydrating=true;
  try{
   // The incoming batch owns notifications; do not recompute the intermediate saved context.
   enter(scenario.level,false,false);
   if(scenario.level==='3'&&scenario.controls.system!==undefined){
    const select=$('system');
    if(![...select.options].some(option=>option.value===scenario.controls.system))throw new Error('Unsupported model.');
    select.value=scenario.controls.system;selectMode();
   }
   cancelDeferred=restoreScenario(document,scenario,{onDeferredError:message=>$('share-status').textContent=message});
   if(level==='1'){savedPlay=read();$('system').value='rotating';selectMode();showView('render');}
   if(level==='3')savedModels=capture();
   refresh();return true;
  }catch{
   savedModels=previousModels;enter(previous.level,true,false);
   cancelDeferred=restoreScenario(document,previous,{validateDomains:false});
   $('share-status').textContent='Unsupported scenario; previous settings retained.';return false;
  }finally{hydrating=false;}
 }
 for(const button of levelButtons)button.addEventListener('click',()=>enter(button.dataset.level));
 view?.addEventListener('resize',revealActiveLevel);
 $('play-mass-b').addEventListener('input',()=>{
  $('mass-b').value=$('play-mass-b').value;$('mass-b').dispatchEvent(new Event('input'));
 });
 $('share-playground').addEventListener('click',async()=>{
  let href;
  try{href=scenarioLink(location.href,capture());}catch(error){$('share-status').textContent=error.message;return;}
  const revision=shareRevision;$('share-link').value=href;$('share-link').hidden=false;
  try{await navigator.clipboard.writeText(href);if(revision===shareRevision)$('share-status').textContent='Copied current settings.';}
  catch{if(revision===shareRevision)$('share-status').textContent='Select and copy the experiment link below.';}
 });
 function reset(){
  if(level==='1'){savedPlay={...PLAY_DEFAULTS};savedMask={...defaultMask};enter('1',true);}
  else if(level==='4'){
   const choice=$('replay-case');
   if(!choice.disabled&&choice.options.length)restore({version:2,level:'4',controls:{'replay-case':choice.options[0].value,'replay-time':0}});
  }
  else restore(defaults[level]);
 }
 $('reset-playground').addEventListener('click',reset);
 for(const node of document.querySelectorAll('input[id],select[id]'))if(['INPUT','SELECT'].includes(node.tagName)){
  node.addEventListener(node.tagName==='SELECT'||node.type==='checkbox'?'change':'input',sync);
 }
 enter(shared.scenario?.level??initial.level);
 if(shared.scenario)restore(shared.scenario);
 if(shared.invalid||initial.invalid)$('share-status').textContent='Unsupported experiment link; the default settings are loaded.';
 return {refresh,sync,capture,restore,reset,dispose(){view?.removeEventListener('resize',revealActiveLevel);cancelDeferred();},get level(){return level;}};
}
