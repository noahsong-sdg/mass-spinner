import {tutorialPresentation,tutorialRoute} from './tutorial-presentation.js';
import {guideActions,guideTopics,guideExperiments} from './guide-topics.js';
import type {GuideExperiment} from './guide-topics.js';

import {playgroundSteps as steps} from './playground-guide-steps.js';

export type PlaygroundGuideOptions={document?:Document;host:HTMLElement;canUseApparatus?:(apparatus:'centrifuge'|'source')=>boolean;open:(key:string,focus?:boolean)=>void;close:(key:string,restore?:boolean)=>void;focusRelated:(key:string,selector?:string|null)=>void;present?:(key:string)=>void;prepareReaderAction?:(key:string)=>void};
type GuideElements={
 'fuel-plot':HTMLSelectElement;'fuel-learning-comparisons':HTMLDetailsElement;'fuel-motion-mode':HTMLSelectElement;
 'fuel-motion-time':HTMLInputElement;'fuel-motion-play':HTMLButtonElement;'fuel-export':HTMLButtonElement;'fuel-new-run':HTMLButtonElement;
 'fuel-equilibrium-calculator':HTMLDetailsElement;'fuel-locate-plot':HTMLButtonElement;
 'fuel-view-representation':HTMLSelectElement;'fuel-view-cutaway':HTMLInputElement;'fuel-view-explode':HTMLInputElement;'fuel-view-drive':HTMLSelectElement;
 'fuel-component':HTMLSelectElement;'fuel-view-radius':HTMLInputElement;'fuel-compare-temperature':HTMLButtonElement;'fuel-compare-rotation':HTMLButtonElement;
 'fuel-power':HTMLButtonElement;
};
type GuideValueId='fuel-plot'|'fuel-motion-mode'|'fuel-motion-time'|'fuel-view-representation'|'fuel-view-cutaway'|'fuel-view-explode'|'fuel-view-drive'|'fuel-component'|'fuel-view-radius';

/** Optional instructions for the existing controls. These instructions do not add simulation modes or physical presets. */
export function setupPlaygroundGuide({document:doc=document,host,open,close,focusRelated,present=()=>{},prepareReaderAction=()=>{},canUseApparatus=()=>true}:PlaygroundGuideOptions){
 const win=doc.defaultView!;
 let readerWindow=win.opener as Window|null;
 const capabilityKey='mass-spinner:guide-capability',instance=win.crypto.randomUUID();
 let capability='';
 try{capability=win.sessionStorage.getItem(capabilityKey)??'';}catch{/* After reload, the caller must authorize a new connection. */}
 if(!capability)capability=win.crypto.randomUUID();
 try{win.sessionStorage.setItem(capabilityKey,capability);}catch{/* Keep the same authorization boundary without storage. */}
 function openStandalone(){readerWindow=win.open('/learn.html','_blank');}
 function showReader(route?:string){const safe=tutorialRoute(route??frame.getAttribute('src')??'/learn.html');if(!safe)return;reading.hidden=true;reader.hidden=false;views.hidden=true;nav.hidden=true;if(frame.getAttribute('src')!==safe)frame.src=safe;open('guide');}

 const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 host.classList.add('playground-guide');
 const intro=el('p','Seven experiments. The controls keep your inputs. Start from rest starts a new run.'),label=el('label','Explore'),choice=el('select');
 choice.id='guide-step';label.htmlFor=choice.id;
 steps.forEach((step,i)=>{const option=el('option',`${i+1}. ${step.title}`);option.value=String(i);choice.append(option);});
 const reading=el('div'),content=el('div'),status=el('p'),nav=el('nav'),previous=el('button','Back'),next=el('button','Next →'),leave=el('button','Scene');reading.className='guide-reading';
 status.id='guide-status';status.setAttribute('role','status');nav.setAttribute('aria-label','Walkthrough steps');nav.className='guide-navigation';leave.className='guide-leave';
 for(const button of [previous,next,leave])button.type='button';
 leave.setAttribute('aria-label','Back to the scene');
 const methods=el('a','Equations & accuracy limits ↗');methods.href='/how-it-works.html';methods.target='_blank';methods.rel='noopener';
 const views=el('div'),explore=el('button','Tutorial 1'),physics=el('button','Physics & equations'),reader=el('div'),frame=el('iframe');
 views.className='guide-views';views.setAttribute('role','group');views.setAttribute('aria-label','Guide view');
 reader.className='guide-physics';reader.hidden=true;frame.title='Mass Spinner physical guide with equations and diagrams';frame.id='physics-guide-frame';reader.append(frame);
 for(const button of [explore,physics])button.type='button';
 explore.setAttribute('aria-pressed','true');physics.setAttribute('aria-pressed','false');views.append(explore,physics);
 function showPhysics(topic?:string){
  reading.hidden=true;reader.hidden=false;previous.hidden=true;next.hidden=true;
  explore.setAttribute('aria-pressed','false');physics.setAttribute('aria-pressed','true');
  const id=guideTopics.find(entry=>entry.id===topic)?.id??'goal';showReader(topic||!frame.hasAttribute('src')?`/guide.html#${id}`:frame.getAttribute('src')!);
 }
 function showExplore(){
  reading.hidden=false;reader.hidden=true;previous.hidden=false;next.hidden=false;
  explore.setAttribute('aria-pressed','true');physics.setAttribute('aria-pressed','false');
 }
 explore.addEventListener('click',showExplore);physics.addEventListener('click',()=>showPhysics());
 nav.append(previous,next,leave);reading.append(intro,label,choice,content,methods);host.append(views,reading,reader,status,nav);
 let index=0;
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
  if(!['spin','transport'].includes(node('fuel-motion-mode').value))endpoint();
 }
 function composition(){transient();plot('composition');}
 const allowed=new Set([...guideActions,...steps.flatMap(step=>step.actions.map(([key])=>key))]);
 const controlFocus:Record<string,string|null>={current:'#fuel-currentA',collisions:'#fuel-collisionHz',drag:'#fuel-dragHz',diffusion:'#fuel-radialDiffusivityM2S',thermal:'#fuel-thermal-enabled',gasTemperature:'#fuel-gasK',duration:'#fuel-durationS',stageControls:'#fuel-stages',pumpControls:'#fuel-pumpSpeedM3S',inventoryControls:'#fuel-burnFraction',controls:null};
 const tutorialPlots:Readonly<Record<string,string>>={spinPlot:'spin',compositionPlot:'composition',separationPlot:'separation',thermalProfile:'thermalProfile',gasEnergy:'gasEnergy',gasPressure:'gasPressure',magneticLeverage:'field',cascade:'cascade',pumping:'pump',fuelInventory:'inventory',lithiumSurfaces:'lithium'};
 const pinButton=()=>doc.querySelector<HTMLButtonElement>('[aria-label="Pin accepted experiment as comparison A"]');
 const pending=(key:string)=>!node('fuel-export')||node('fuel-export').disabled||key==='pin'&&(!pinButton()||pinButton()!.disabled);
 let cancelLaunch=()=>{};
 const experimentNote=el('aside'),experimentTitle=el('strong'),experimentHint=el('p'),experimentResult=el('button'),experimentStatus=el('p');
 experimentNote.className='guide-experiment';experimentNote.setAttribute('aria-label','Current tutorial experiment');
 experimentResult.type='button';experimentStatus.setAttribute('role','status');experimentNote.append(experimentTitle,experimentHint,experimentResult,experimentStatus);
 let experimentResultAction='';
 experimentResult.addEventListener('click',()=>{launch(experimentResultAction);experimentStatus.textContent=status.textContent;});
 function showExperiment(key:string){
  const experiment:GuideExperiment=guideExperiments[key as keyof typeof guideExperiments],apparatus=doc.getElementById('marathon-apparatus') as HTMLSelectElement;
  const context=experiment.apparatus??'centrifuge';
  if(apparatus.value!==context||!canUseApparatus(context)){apparatus.value=context;apparatus.dispatchEvent(new win.Event('change',{bubbles:true}));}
  if(['thermalPlot','thermalProfile','separationPlot','spinPlot'].includes(experiment.result)&&!['spin','transport'].includes(node('fuel-motion-mode').value))set('fuel-motion-mode','transport');
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
  if(Object.hasOwn(controlFocus,key)){const view=tutorialPresentation(key);if(view?.plot&&!pending(key))plot(view.plot);focusRelated('controls',controlFocus[key]);return;}
  if(key==='inspect'||key==='view'||key==='modelInfo'){focusRelated(key==='modelInfo'?'info':key,key==='inspect'?'#fuel-component':null);return;}
  if(key==='equilibrium'){open('plots');const calculator=node('fuel-equilibrium-calculator');calculator.open=true;calculator.scrollIntoView?.({block:'nearest'});calculator.querySelector('input')?.focus();return;}
  if(key==='look'){
   set('fuel-view-representation','tracers');set('fuel-view-cutaway',.62,'input');set('fuel-view-explode',0,'input');set('fuel-view-drive','all');doc.getElementById('fuel-reset-view')?.click();doc.getElementById('fuel-camera-axial')?.click();return;
  }
  if(key==='coils'){set('fuel-component','coils');open('inspect',true);doc.getElementById('fuel-focus-component')?.click();return;}
  // Do not show pending or failed results as a new experiment.
  if(pending(key)){status.textContent='Wait for the run to finish. If it fails, open Controls. Change the settings to start the calculation again.';return;}
  if(Object.hasOwn(tutorialPlots,key)){plot(tutorialPlots[key]);return;}
  if(key==='newRun'){node('fuel-new-run').click();return;}
  if(key==='cutPower'){
   const power=node('fuel-power');
   if(!['spin','transport'].includes(node('fuel-motion-mode').value)){status.textContent='Before you cut power, select Coupled separation or Coupled spin-up. The selected physical time sets when the current changes.';return;}
   if(power.disabled){status.textContent='To change power, select a time below 60 s in an accepted coupled run.';return;}
   if(power.getAttribute('aria-pressed')!=='true'){status.textContent='The discharge is already off. The gas can continue to turn while wall drag decreases its angular momentum.';return;}
   plot('spin');power.click();return;
  }
  if(key==='currentExperiment'){
   set('fuel-motion-mode','transport');set('fuel-motion-time',0,'input');plot('spin');node('fuel-new-run').click();focusRelated('controls','#fuel-currentA');
  }else if(key==='endSpin'){
   endpoint();plot('spin');
  }else if(key==='spin'){
   set('fuel-motion-mode','spin');set('fuel-motion-time',0,'input');plot('spin');set('fuel-view-representation','tracers');
   if(node('fuel-motion-play').getAttribute('aria-pressed')!=='true')node('fuel-motion-play').click();
  }else if(['composition','axis','wall','temperature','rotation'].includes(key)){
   if(key==='composition')endpoint();
   composition();
   if(key==='axis'||key==='wall')set('fuel-view-radius',key==='axis'?0:1,'input');
   if(key==='temperature'||key==='rotation'){
    const comparison=node('fuel-learning-comparisons');comparison.open=true;node(`fuel-compare-${key}`).click();
    comparison.scrollIntoView?.({block:'nearest'});
   }
  }else if(['momentum','inertia','density'].includes(key)){transient();plot(key==='density'?'profile':key);}
  else if(key==='work')plot('heat');
  else if(key==='thermalPlot')plot('thermal');
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
   if(allowed.has(data.action)){prepareReaderAction(data.action);launch(data.action,reply);}
   else reply({status:'rejected',message:'This tutorial action is not available.'});
  }else if(data.type==='mass-spinner:guide-view'&&'view' in data&&data.view==='experiments'){showReader('/start.html');reply({status:'executed'});}
  else if(data.type==='mass-spinner:guide-close')close('guide',true);
 });
 function launch(key:string,reply:(outcome:Outcome)=>void=()=>{}){
  if(!allowed.has(key))return;
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
  status.textContent='Waiting for the calculated run and controls…';reply({status:'waiting'});
  const observer=new win.MutationObserver(()=>{
   if(ready()){observer.disconnect();cancelLaunch=()=>{};execute();}
  });
  cancelLaunch=()=>{observer.disconnect();cancelLaunch=()=>{};reply({status:'rejected',message:'A new tutorial action replaced this request.'});};
  // The application adds controls asynchronously. Watch for new controls and accepted results.
  observer.observe(doc.body,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled']});
 }
 function render(focus=false){
  const step=steps[index];choice.value=String(index);status.textContent='';
  const heading=el('h3',step.title);heading.tabIndex=-1;
  const actions=el('div');actions.className='guide-actions';
  for(const [key,text]of step.actions){const button=el('button',text);button.type='button';button.addEventListener('click',()=>action(key));actions.append(button);}
  const blocks:HTMLElement[]=[el('p',step.intro)];
  const instructions=el('ol');for(const text of step.do)instructions.append(el('li',text));blocks.push(instructions);
  for(const text of step.notice.split('\n\n'))blocks.push(el('p',text));
  const note=el('p',step.note);note.className='guide-note';
  content.replaceChildren(heading,actions,...blocks,note);
  previous.disabled=index===0;next.textContent=index===steps.length-1?'Finish':'Next →';
  if(focus){heading.focus();heading.scrollIntoView?.({block:'nearest'});}
 }
 choice.addEventListener('change',()=>{index=Number(choice.value);render(true);});
 previous.addEventListener('click',()=>{index--;render(true);});
 next.addEventListener('click',()=>{if(index===steps.length-1)close('guide',true);else{index++;render(true);}});
 leave.addEventListener('click',()=>close('guide',true));
 render();
 return {showPhysics,showExplore,showReader,openStandalone,launch};
}
