import {tutorialPresentation,tutorialRoute} from './tutorial-presentation.js';
import {guideActions,guideTopics,guideExperiments} from './guide-topics.js';
import type {GuideExperiment} from './guide-topics.js';
import {guideExample,type GuideExampleAccess,type GuideExampleKey} from './guide-examples.js';
import type {Scenario} from './scenario-state.js';


export type PlaygroundGuideOptions={examples?:GuideExampleAccess;document?:Document;host:HTMLElement;canUseApparatus?:(apparatus:'centrifuge'|'source')=>boolean;open:(key:string,focus?:boolean)=>void;close:(key:string,restore?:boolean)=>void;focusRelated:(key:string,selector?:string|null)=>void;present?:(key:string)=>void;prepareReaderAction?:(key:string)=>void};
type GuideElements={
 'fuel-plot':HTMLSelectElement;'fuel-learning-comparisons':HTMLDetailsElement;'fuel-motion-mode':HTMLSelectElement;
 'fuel-motion-time':HTMLInputElement;'fuel-motion-play':HTMLButtonElement;'fuel-export':HTMLButtonElement;'fuel-new-run':HTMLButtonElement;
 'fuel-equilibrium-calculator':HTMLDetailsElement;'fuel-locate-plot':HTMLButtonElement;
 'fuel-view-representation':HTMLSelectElement;'fuel-view-cutaway':HTMLInputElement;'fuel-view-explode':HTMLInputElement;'fuel-view-drive':HTMLSelectElement;
 'fuel-component':HTMLSelectElement;'fuel-view-radius':HTMLInputElement;'fuel-compare-temperature':HTMLButtonElement;'fuel-compare-rotation':HTMLButtonElement;
 'fuel-power':HTMLButtonElement;
};
type GuideValueId='fuel-plot'|'fuel-motion-mode'|'fuel-motion-time'|'fuel-view-representation'|'fuel-view-cutaway'|'fuel-view-explode'|'fuel-view-drive'|'fuel-component'|'fuel-view-radius';

/** Tutorial actions use native controls. Physical examples require an explicit load. */
export function setupPlaygroundGuide({document:doc=document,host,open,close,focusRelated,present=()=>{},prepareReaderAction=()=>{},canUseApparatus=()=>true,examples}:PlaygroundGuideOptions){
 const win=doc.defaultView!;
 let readerWindow=win.opener as Window|null;
 const capabilityKey='mass-spinner:guide-capability',instance=win.crypto.randomUUID();
 let capability='';
 try{capability=win.sessionStorage.getItem(capabilityKey)??'';}catch{/* After reload, the caller must authorize a new connection. */}
 if(!capability)capability=win.crypto.randomUUID();
 try{win.sessionStorage.setItem(capabilityKey,capability);}catch{/* Keep the same authorization boundary without storage. */}
 function openStandalone(){readerWindow=win.open('/learn.html','_blank');}
 function showReader(route?:string){const safe=tutorialRoute(route??frame.getAttribute('src')??'/learn.html');if(!safe)return;reader.hidden=false;if(frame.getAttribute('src')!==safe)frame.src=safe;open('guide');}

 const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 host.classList.add('playground-guide');
 const status=el('p'),reader=el('div'),frame=el('iframe');
 status.id='guide-status';status.setAttribute('role','status');
 reader.className='guide-physics';reader.hidden=true;frame.title='Mass Spinner physical guide with equations and diagrams';frame.id='physics-guide-frame';reader.append(frame);
 host.append(reader,status);
 function showPhysics(topic?:string){
  const id=guideTopics.find(entry=>entry.id===topic)?.id??'goal';
  showReader(topic||!frame.hasAttribute('src')?`/guide.html#${id}`:frame.getAttribute('src')!);
 }
 const node=<K extends keyof GuideElements>(id:K)=>doc.getElementById(id) as GuideElements[K];
 function set(id:GuideValueId,value:string|number,type='change'){
  const input=node(id);input.value=String(value);input.dispatchEvent(new win.Event(type,{bubbles:true}));
 }
 function plot(value:string){
  const select=node('fuel-plot'),option=[...select.options].find(option=>option.value===value);
  if(option!.disabled){status.textContent=value==='lithium'?'To use this plot, select a lithium feed in Controls.':'To use this plot, select Isotope separation in Controls.';return false;}
  set('fuel-plot',value);node('fuel-plot').dispatchEvent(new win.Event('mass-spinner:focus-plot',{bubbles:true}));node('fuel-learning-comparisons').open=false;open('plots');
  const target=value==='composition'?'#fuel-composition-readout':value==='profile'?'#fuel-density-reading':'#fuel-plots > .live-plots';
  doc.querySelector<HTMLElement>(target)!.scrollIntoView?.({block:'start'});return true;
 }
 function endpoint(){
  if(node('fuel-motion-mode').value!=='transport')set('fuel-motion-mode','transport');
  set('fuel-motion-time',node('fuel-motion-time').max,'input');
 }
 function transient(){
  if(node('fuel-motion-mode').value==='transport')return;
  const time=node('fuel-motion-time').value;set('fuel-motion-mode','transport');set('fuel-motion-time',time,'input');
 }
 function composition(){transient();plot('composition');}
 const allowed=new Set([...guideActions,'coils']);
 const controlFocus:Record<string,string|null>={current:'#fuel-currentA',collisions:'#fuel-collisionHz',drag:'#fuel-dragHz',diffusion:'#fuel-radialDiffusivityM2S',thermal:'#fuel-thermal-enabled',gasTemperature:'#fuel-gasK',duration:'#fuel-durationS',stageControls:'#fuel-stages',pumpControls:'#fuel-pumpSpeedM3S',inventoryControls:'#fuel-burnFraction',controls:null};
 function editCurrent(){
  focusRelated('controls','#fuel-currentA');
  const control=doc.querySelector<HTMLInputElement>('#fuel-currentA')!.closest<HTMLElement>('.control')!;
  control.querySelector('output')!.click();control.scrollIntoView?.({block:'nearest'});
 }
 const tutorialPlots:Readonly<Record<string,string>>={spinPlot:'spin',compositionPlot:'composition',separationPlot:'separation',thermalProfile:'thermalProfile',gasEnergy:'gasEnergy',gasPressure:'gasPressure',magneticLeverage:'field',cascade:'cascade',pumping:'pump',fuelInventory:'inventory',lithiumSurfaces:'lithium'};
 const pinButton=()=>doc.querySelector<HTMLButtonElement>('[aria-label="Pin accepted experiment as comparison A"]');
 const pending=(key:string)=>!node('fuel-export')||node('fuel-export').disabled||key==='pin'&&(!pinButton()||pinButton()!.disabled);
 let cancelLaunch=()=>{};
 const experimentNote=el('aside'),experimentTitle=el('strong'),experimentHint=el('p'),experimentResult=el('button'),experimentStatus=el('p');
 experimentNote.className='guide-experiment';experimentNote.setAttribute('aria-label','Current tutorial experiment');
 experimentResult.type='button';experimentStatus.setAttribute('role','status');experimentNote.append(experimentTitle,experimentHint,experimentResult,experimentStatus);
 const choices=el('div'),loadExample=el('button','Load example'),useRun=el('button','Use my run'),restoreRun=el('button','Restore previous run'),exampleInputs=el('details'),inputList=el('dl');
 choices.className='guide-example-actions';choices.hidden=!examples;exampleInputs.hidden=!examples;
 for(const button of [loadExample,useRun,restoreRun])button.type='button';restoreRun.disabled=true;
 choices.append(loadExample,useRun,restoreRun);exampleInputs.append(el('summary','Example inputs'),inputList);experimentNote.append(exampleInputs,choices);
 let selectedExample:GuideExampleKey|null=null,preparedKey:string|null=null,entryRun:Scenario|null=null,previousRun:Scenario|null=null;
 function prepareAction(key:string){
  if(!examples||!Object.hasOwn(guideExperiments,key))return;
  preparedKey=key;entryRun=null;
  try{entryRun=examples.capture();}catch{/* Invalid inputs cannot replace the existing restore point. */}
 }
 function describeExample(scenario:Scenario){
  inputList.replaceChildren();
  for(const [id,value]of Object.entries(scenario.controls)){
   const input=doc.getElementById(id) as HTMLInputElement|HTMLSelectElement|null;
   const label=doc.querySelector<HTMLLabelElement>(`label[for="${id}"]`);
   const name=label?.querySelector('span')?.textContent??label?.textContent??id;
   let display=String(value);
   if(input?.tagName==='SELECT')display=[...(input as HTMLSelectElement).options].find(option=>option.value===value)?.textContent??display;
   else if(input?.dataset.rangeScale==='log10'&&typeof value==='number')display=Number((10**value).toPrecision(5)).toString();
   inputList.append(el('dt',name),el('dd',`${display}${input?.dataset.unit?' '+input.dataset.unit:''}`));
  }
 }
 loadExample.addEventListener('click',()=>{
  if(!examples||!selectedExample)return;
  let before:Scenario;
  try{before=entryRun??examples.capture();}catch{experimentStatus.textContent='Cannot save the current inputs. Correct the settings before loading an example.';return;}
  const next=guideExample(selectedExample,examples.defaults);
  if(!examples.restore(next)){experimentStatus.textContent='The example did not load. The previous restore point remains.';return;}
  previousRun=before;entryRun=null;restoreRun.disabled=false;showReader();showExperiment(selectedExample);
  experimentStatus.textContent='Example loaded. The model uses the listed initial state and default inputs.';
 });
 useRun.addEventListener('click',()=>{entryRun=null;if(selectedExample)showExperiment(selectedExample);});
 restoreRun.addEventListener('click',()=>{
  if(!examples||!previousRun)return;
  if(!examples.restore(previousRun)){experimentStatus.textContent='The previous run did not restore.';return;}
  previousRun=null;restoreRun.disabled=true;entryRun=null;showReader();status.textContent='Previous inputs, drive history and physical time restored. The model calculates the run again.';experimentStatus.textContent=status.textContent;
 });
 let experimentResultAction='';
 experimentResult.addEventListener('click',()=>{launch(experimentResultAction);experimentStatus.textContent=status.textContent;});
 function showExperiment(key:string){
  selectedExample=key as GuideExampleKey;if(examples)describeExample(guideExample(selectedExample,examples.defaults));
  const experiment:GuideExperiment=guideExperiments[key as keyof typeof guideExperiments],apparatus=doc.getElementById('marathon-apparatus') as HTMLSelectElement;
  const context=experiment.apparatus??'centrifuge';
  if(apparatus.value!==context||!canUseApparatus(context)){apparatus.value=context;apparatus.dispatchEvent(new win.Event('change',{bubbles:true}));}
  if(['thermalPlot','thermalProfile','separationPlot','spinPlot'].includes(experiment.result))transient();
  // Beam references have their own accepted state. Centrifuge actions wait on fuel-export.
  if(experiment.apparatus||!pending(experiment.result))action(experiment.result);
  if(experiment.panel==='target')doc.getElementById('coupled-tab-settings')!.click();
  let selector=experiment.control;
  if(['#fuel-cutFraction','#fuel-stages'].includes(selector)&&(doc.getElementById('fuel-application') as HTMLSelectElement).value==='pump')selector='#fuel-application';
  if(selector==='#fuel-thermal-enabled'&&(doc.getElementById('fuel-thermal-enabled') as HTMLInputElement).disabled)selector='#fuel-pair';
  if(key==='surfaceExperiment'&&(doc.getElementById('fuel-pair') as HTMLSelectElement).value!=='lithium')selector='#fuel-pair';
  const target=doc.querySelector<HTMLElement>(selector)!;
  experimentTitle.textContent=experiment.title;experimentHint.textContent=experiment.hint;experimentResult.textContent=experiment.label;experimentResultAction=experiment.result;experimentStatus.textContent='';
  const section=target.closest('details');
  if(section)section.querySelector('summary')!.after(experimentNote);
  else target.closest('#fuel-controls,.fusion-inputs,#coupled-target')!.prepend(experimentNote);
  if(key==='pumpingExperiment')focusRelated('controls','#fuel-pumpSpeedM3S');
  focusRelated(experiment.panel??'controls',selector);
  experimentNote.scrollIntoView?.({block:'nearest'});
 }
 function action(key:string){
  if(!allowed.has(key))return;
  cancelLaunch();
  status.textContent='';experimentStatus.textContent='';
  if(Object.hasOwn(guideExperiments,key)){showExperiment(key);return;}
  if(key==='beamLedger'){focusRelated('plots','#fusion-metrics');return;}
  if(key==='beamDynamics'){doc.getElementById('coupled-tab-dynamics')!.click();const choice=doc.getElementById('coupled-plot') as HTMLSelectElement;choice.value='source';choice.dispatchEvent(new win.Event('change'));focusRelated('target','#coupled-plot');return;}
  if(!canUseApparatus('centrifuge')){status.textContent='To use these guide controls, select Centrifuge.';return;}
  if(Object.hasOwn(controlFocus,key)){const view=tutorialPresentation(key);if(view?.plot&&!pending(key)){if(['current','collisions','drag','diffusion','thermal','gasTemperature','duration'].includes(key))transient();plot(view.plot);}if(key==='current')editCurrent();else focusRelated('controls',controlFocus[key]);return;}
  if(key==='inspect'||key==='view'||key==='modelInfo'){focusRelated(key==='modelInfo'?'info':key,key==='inspect'?'#fuel-component':null);return;}
  if(key==='equilibrium'){open('plots');const calculator=node('fuel-equilibrium-calculator');calculator.open=true;calculator.scrollIntoView?.({block:'nearest'});calculator.querySelector('input')?.focus();return;}
  if(key==='look'){
   set('fuel-view-representation','tracers');set('fuel-view-cutaway',.62,'input');set('fuel-view-explode',0,'input');set('fuel-view-drive','all');doc.getElementById('fuel-reset-view')?.click();doc.getElementById('fuel-camera-cutaway')?.click();return;
  }
  if(key==='coils'){set('fuel-component','coils');open('inspect',true);doc.getElementById('fuel-focus-component')?.click();return;}
  // Do not show pending or failed results as a new experiment.
  if(pending(key)){status.textContent='Wait for the run to finish. If it fails, open Controls. Change the settings to start the calculation again.';return;}
  if(Object.hasOwn(tutorialPlots,key)){if(['spinPlot','compositionPlot','separationPlot','thermalProfile','gasEnergy','gasPressure'].includes(key))transient();plot(tutorialPlots[key]);return;}
  if(key==='newRun'){node('fuel-new-run').click();return;}
  if(key==='cutPower'){
   const power=node('fuel-power');
   if(!['spin','transport'].includes(node('fuel-motion-mode').value)){status.textContent='Before you cut power, select Coupled separation or Coupled spin-up. The selected physical time sets when the current changes.';return;}
   if(power.disabled){status.textContent='To change power, select a time below 60 s in an accepted coupled run.';return;}
   if(power.getAttribute('aria-pressed')!=='true'){status.textContent='The discharge is already off. The gas can continue to turn while wall drag decreases its angular momentum.';return;}
   plot('spin');power.click();return;
  }
  if(key==='currentExperiment'){
   set('fuel-motion-mode','transport');set('fuel-motion-time',0,'input');plot('spin');node('fuel-new-run').click();editCurrent();
   set('fuel-view-representation','tracers');set('fuel-view-drive','off');
  }else if(key==='endSpin'){
   endpoint();plot('spin');
   set('fuel-view-representation','tracers');set('fuel-view-drive','off');
  }else if(key==='spin'){
   set('fuel-motion-mode','spin');set('fuel-motion-time',0,'input');plot('spin');set('fuel-view-representation','tracers');
   if(node('fuel-motion-play').getAttribute('aria-pressed')!=='true')node('fuel-motion-play').click();
  }else if(['composition','axis','wall','temperature','rotation'].includes(key)){
   if(key==='composition')endpoint();
   composition();
   if(key==='axis'||key==='wall')set('fuel-view-radius',key==='axis'?0:1,'input');
   if(key==='temperature'||key==='rotation'){
    set('fuel-motion-mode','equilibrium');
    const comparison=node('fuel-learning-comparisons');comparison.open=true;node(`fuel-compare-${key}`).click();
    comparison.scrollIntoView?.({block:'nearest'});
   }
  }else if(['momentum','inertia','density'].includes(key)){transient();plot(key==='density'?'profile':key);}
  else if(key==='work'){transient();plot('heat');}
  else if(key==='thermalPlot'){transient();plot('thermal');}
  else if(key==='collection'){endpoint();plot('cut');}
  else if(key==='cut'){transient();set('fuel-motion-time',node('fuel-motion-time').value,'input');if(plot('cut'))doc.querySelector<SVGSVGElement>('#fuel-plots > .live-plots svg')?.focus();}
  else if(key==='pin'){
   pinButton()!.click();open('view',true);
  }
 }
 type Outcome={status:'waiting'|'executed'|'rejected';message?:string};
 const outcomes=new Map<string,Outcome>();
 // Give a capability only to an explicit opener, Docs window, or embedded reader.
 // The reader uses this capability for authorization after this page reloads.
 win.addEventListener('message',event=>{
  if(event.origin!==win.location.origin||!event.source)return;
  const data:unknown=event.data;
  if(!data||typeof data!=='object'||!('type' in data))return;
  const known=event.source===frame.contentWindow||event.source===readerWindow;
  if(data.type==='mass-spinner:guide-hello'){
   if(!known&&(!('capability' in data)||data.capability!==capability))return;
   if(event.source!==frame.contentWindow)readerWindow=event.source as Window;
   (event.source as Window).postMessage({type:'mass-spinner:guide-ready',capability,instance},event.origin);return;
  }
  if(!known)return;
  const requestId='requestId' in data&&typeof data.requestId==='string'?data.requestId:undefined;
  const reply=(outcome:Outcome)=>{
   if(!requestId)return;
   outcomes.set(requestId,outcome);
   if(outcomes.size>32)outcomes.delete(outcomes.keys().next().value!);
   (event.source as Window).postMessage({type:'mass-spinner:guide-result',requestId,...outcome},event.origin);
  };
  if(requestId&&outcomes.has(requestId)){reply(outcomes.get(requestId)!);return;}
  if(data.type==='mass-spinner:guide-action'&&'action' in data&&typeof data.action==='string'){
   if(allowed.has(data.action)){prepareAction(data.action);prepareReaderAction(data.action);launch(data.action,reply);}
   else reply({status:'rejected',message:'This tutorial action is not available.'});
  }else if(data.type==='mass-spinner:guide-view'&&'view' in data&&data.view==='experiments'){showReader('/start.html');reply({status:'executed'});}
  else if(data.type==='mass-spinner:guide-close')close('guide',true);
 });
 function launch(key:string,reply:(outcome:Outcome)=>void=()=>{}){
  if(!allowed.has(key))return;
  if(preparedKey!==key)prepareAction(key);preparedKey=null;
  cancelLaunch();
  const execute=()=>{present(key);action(key);reply(status.textContent?{status:'rejected',message:status.textContent}:{status:'executed'});};
  const immediate=Object.hasOwn(guideExperiments,key)||key==='equilibrium'||Object.hasOwn(controlFocus,key)||['inspect','view','modelInfo','beamLedger','beamDynamics'].includes(key);
  const ready=()=>{
   if(!canUseApparatus('centrifuge')&&!Object.hasOwn(guideExperiments,key))return true;
   if(Object.hasOwn(guideExperiments,key))return !!doc.getElementById('marathon-apparatus')&&!!doc.querySelector(guideExperiments[key as keyof typeof guideExperiments].control);
   if(key==='equilibrium')return !!node('fuel-equilibrium-calculator');
   if(Object.hasOwn(controlFocus,key))return !controlFocus[key]||!!doc.querySelector(controlFocus[key]);
   if(key==='look')return ['fuel-view-representation','fuel-view-cutaway','fuel-view-explode','fuel-view-drive'].every(id=>doc.getElementById(id))&&!!node('fuel-component')?.querySelector('option[value="coils"]');
   if(key==='coils')return !!node('fuel-component')?.querySelector('option[value="coils"]');
   return immediate||!pending(key);
  };
  if(ready()){execute();return;}
  const rejectFailure=()=>{
   const calculation=node('fuel-export');
   if(calculation?.dataset.calculationState!=='failed')return false;
   status.textContent=`Calculation failed. ${calculation.dataset.calculationError??'No accepted result is available.'} Open Controls. Correct the settings to start a new calculation.`;
   focusRelated('controls',null);reply({status:'rejected',message:status.textContent});return true;
  };
  if(rejectFailure())return;
  status.textContent='Waiting for the calculated run and controls…';reply({status:'waiting'});
  const observer=new win.MutationObserver(()=>{
   if(ready()){observer.disconnect();cancelLaunch=()=>{};execute();}
   else if(rejectFailure()){observer.disconnect();cancelLaunch=()=>{};}
  });
  cancelLaunch=()=>{observer.disconnect();cancelLaunch=()=>{};reply({status:'rejected',message:'A new tutorial action replaced this request.'});};
  // The application adds controls asynchronously. Watch for new controls and accepted results.
  observer.observe(doc.body,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','data-calculation-state']});
 }
 return {showPhysics,showReader,openStandalone,prepareAction,launch};
}
