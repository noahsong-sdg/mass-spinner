import {PLAY_DEFAULTS,readExperience} from './experience-state.js';
import {captureScenario,readScenario,restoreScenario,scenarioLink,type Scenario,type ScenarioDraft,type FuelRunState} from './scenario-state.js';
import type {ExperienceLevel,PlaySettings} from './experience-state.js';
export type SetupExperienceOptions={selectMode:()=>void;invalidate:()=>void;showView:(view:string)=>void;showResearch?:()=>void;onLevelChange?:(level:ExperienceLevel)=>void;fuelCentrifuge?:{captureRun:(options?:{validate?:boolean})=>FuelRunState;restoreRun:(run?:FuelRunState)=>void}};

type ExperienceElements={
 'advanced-simulators':HTMLDetailsElement;'marathon-apparatus':HTMLSelectElement;'system':HTMLSelectElement;'replay-case':HTMLSelectElement;
 'field':HTMLInputElement;'voltage':HTMLInputElement;'energy':HTMLInputElement;'mass-b':HTMLInputElement;'play-mass-b':HTMLInputElement;'live-update':HTMLInputElement;'share-link':HTMLInputElement;
 'play-mass-b-value':HTMLElement;'share-status':HTMLElement;'level-title':HTMLElement;'share-playground':HTMLButtonElement;'reset-playground':HTMLButtonElement;
};
const $=<K extends keyof ExperienceElements>(id:K)=>document.getElementById(id) as ExperienceElements[K];
const valueControl=(id:string)=>document.getElementById(id) as HTMLInputElement|HTMLSelectElement;
const copy={'1':'Mass Spinner','2':'Marathon','3':'Models','4':'Research'};
const fixedPlay={parallel:'20','source-radius':'4',distribution:'thermal','axial-temperature':'1',particles:'96',resolution:'2e-8',
 'mass-a':'40','charge-a':'1','charge-b':'1','neutral-density':'0','neutral-cross-section':'1e-19','neutral-mass':'40','random-seed':'42'};

export function setupExperience({selectMode,invalidate,showView,showResearch,onLevelChange,fuelCentrifuge}:SetupExperienceOptions){
 const shared=readScenario(location.search),initial=readExperience(location.search);
 const levelButtons=[...document.querySelectorAll<HTMLButtonElement>('button[data-level]')],navigation=levelButtons[0]?.closest?.('.level-navigation'),view=document.defaultView;
 const advanced=$('advanced-simulators'),apparatus=$('marathon-apparatus'),reactor=document.getElementById('show-reactor') as HTMLButtonElement|null;
 let level:ExperienceLevel,savedPlay:PlaySettings=initial.settings,shareRevision=0,hydrating=false,cancelDeferred=()=>{};
 const defaults={
 '2':captureScenario(document,'2'),'3':captureScenario(document,'3'),'4':captureScenario(document,'4'),
 };
 let savedModels:ScenarioDraft=defaults['3'];
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
  const button=level==='2'?(apparatus?.value!=='centrifuge'?reactor:levelButtons.find(button=>button.dataset.level===level)):advanced?.querySelector('summary');
  if(!button)return;
  const bounds=navigation.getBoundingClientRect(),item=button.getBoundingClientRect();
  const left=bounds.left+navigation.clientLeft,right=left+navigation.clientWidth;
  if(item.right-item.left>navigation.clientWidth||item.left<left)navigation.scrollLeft+=item.left-left;
  else if(item.right>right)navigation.scrollLeft+=item.right-right;
 }
 function refresh(notifyLevel=true){
  document.body.dataset.level=level;
  const centrifuge=level==='2'&&(!apparatus||apparatus.value==='centrifuge');
  for(const button of levelButtons)button.setAttribute('aria-pressed',String(button.dataset.level===level&&(level!=='2'||centrifuge)));
  reactor?.setAttribute('aria-pressed',String(level==='2'&&!centrifuge));
  if(advanced)advanced.dataset.active=String(level!=='2');
  $('level-title').textContent=centrifuge?'Marathon centrifuge':level==='2'?(apparatus?.value==='blanket'?'Fusion power reference':'Marathon beam reactor'):copy[level];$('share-playground').hidden=false;
  $('share-playground').title=centrifuge?'Rerun inputs and drive history at the selected time. Camera and independent equilibrium calculator are separate.':'';
  sync();if(notifyLevel)onLevelChange?.(level);revealActiveLevel();
 }
 function enter(next:ExperienceLevel,reset=false,dispatchEvents=true){
  if(level==='1'&&!reset){savedPlay=read();savedMask=mask();}
  if(level==='3'&&!reset)savedModels=captureScenario(document,'3',{validate:false});
  cancelDeferred();level=next;invalidate();
  $('live-update').checked=level!=='4'&&level!=='2';
  if(level==='1'){
   for(const [id,value]of Object.entries(fixedPlay))valueControl(id).value=value;
   for(const [key,value]of Object.entries(savedPlay))valueControl(key==='massB'?'mass-b':key).value=String(value);
   restoreScenario(document,{version:2,level:'1',controls:savedMask},{validateDomains:false,dispatchEvents});
   $('system').value='rotating';selectMode();showView('render');
  }else if(level==='3'){
   $('system').value=String(savedModels.controls.system??'centrifuge');selectMode();
   // Local editing state may be unfinished; only shared/pinned scenarios require valid domains.
   restoreScenario(document,savedModels,{validateDomains:false,dispatchEvents});
  }else if(level==='4')showResearch?.();
  refresh();
  const url=new URL(location.href);url.search='';url.hash='';url.searchParams.set('level',level);
  history.replaceState(null,'',url);
 }
 function capture(options:{validate:false}):ScenarioDraft;
 function capture(options?:{validate?:true}):Scenario;
 function capture(options:{validate:boolean}):ScenarioDraft;
 function capture({validate=true}:{validate?:boolean}={}):ScenarioDraft{
  const fuelRun=level==='2'&&apparatus?.value==='centrifuge'?fuelCentrifuge?.captureRun({validate}):undefined;
  return captureScenario(document,level,{validate,fuelRun});
 }
 function shareable(value:unknown):asserts value is Scenario {scenarioLink(location.href,value);}
 function restore(scenario:unknown){
  try{shareable(scenario);}catch{$('share-status').textContent='Unsupported scenario.';return false;}
  const previous=capture({validate:false}),previousModels=savedModels;
  hydrating=true;
  try{
   // The incoming batch owns notifications; do not recompute the intermediate saved context.
   enter(scenario.level,false,false);
   if(scenario.level==='3'&&scenario.controls.system!==undefined){
    const select=$('system');
    if(![...select.options].some(option=>option.value===scenario.controls.system))throw new Error('Unsupported model.');
    select.value=String(scenario.controls.system);selectMode();
   }
   cancelDeferred=restoreScenario(document,scenario,{onDeferredError:message=>$('share-status').textContent=message});
   if(level==='2'&&apparatus?.value==='centrifuge')fuelCentrifuge?.restoreRun(scenario.version===3?scenario.fuelRun:undefined);
   if(level==='1'){savedPlay=read();$('system').value='rotating';selectMode();showView('render');}
   if(level==='3')savedModels=capture();
   refresh();return true;
  }catch{
   savedModels=previousModels;enter(previous.level,true,false);
   cancelDeferred=restoreScenario(document,previous,{validateDomains:false});
   if(previous.level==='2'&&apparatus?.value==='centrifuge')fuelCentrifuge?.restoreRun(previous.fuelRun);
   $('share-status').textContent='Unsupported scenario; previous settings retained.';return false;
  }finally{hydrating=false;}
 }
 for(const button of levelButtons)button.addEventListener('click',()=>{
  const primary=button.dataset.level==='2'&&apparatus;
  if(primary)apparatus.value='centrifuge';
  if(!primary||level!=='2')enter(button.dataset.level as ExperienceLevel);
  if(primary)apparatus.dispatchEvent(new (view?.Event??Event)('change'));
  if(advanced){advanced.open=false;if(advanced.contains?.(button))advanced.querySelector('summary')!.focus();}
 });
 apparatus?.addEventListener('change',()=>{
  if(!hydrating&&level!=='2')enter('2');else refresh(false);
  if(!hydrating&&advanced?.open){advanced.open=false;advanced.querySelector('summary')!.focus();}
 });
 reactor?.addEventListener('click',()=>{if(apparatus){apparatus.value='source';apparatus.dispatchEvent(new (view?.Event??Event)('change'));}});
 advanced?.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&advanced.open){event.preventDefault();advanced.open=false;advanced.querySelector('summary')!.focus();}
 });
 view?.addEventListener('resize',revealActiveLevel);
 $('play-mass-b').addEventListener('input',()=>{
  $('mass-b').value=$('play-mass-b').value;$('mass-b').dispatchEvent(new Event('input'));
 });
 $('share-playground').addEventListener('click',()=>{void (async()=>{
  let href;
  try{href=scenarioLink(location.href,capture());}catch(error){$('share-status').textContent=error&&typeof error==='object'&&'message' in error?String(error.message):'';return;}
  const revision=shareRevision;$('share-link').value=href;$('share-link').hidden=false;
  try{await navigator.clipboard.writeText(href);if(revision===shareRevision)$('share-status').textContent=level==='2'&&apparatus?.value==='centrifuge'?'Copied run link · fresh solve; camera and calculator separate.':'Copied experiment link.';}
  catch{if(revision===shareRevision)$('share-status').textContent='Select and copy the experiment link below.';}
 })();});
 function reset(){
  if(level==='1'){savedPlay={...PLAY_DEFAULTS};savedMask={...defaultMask};enter('1',true);}
  else if(level==='4'){
   const choice=$('replay-case');
   if(!choice.disabled&&choice.options.length)restore({version:2,level:'4',controls:{'replay-case':choice.options[0].value,'replay-time':0}});
  }
  else restore(defaults[level]);
 }
 $('reset-playground').addEventListener('click',reset);
 for(const node of document.querySelectorAll<HTMLInputElement|HTMLSelectElement>('input[id],select[id]'))if(['INPUT','SELECT'].includes(node.tagName)){
  node.addEventListener(node.tagName==='SELECT'||node.type==='checkbox'?'change':'input',sync);
 }
 enter(shared.scenario?.level??initial.level);
 if(shared.scenario)restore(shared.scenario);
 if(shared.invalid||initial.invalid)$('share-status').textContent='Unsupported experiment link; the default settings are loaded.';
 return {refresh,sync,capture,restore,reset,dispose(){view?.removeEventListener('resize',revealActiveLevel);cancelDeferred();},get level(){return level;}};
}
