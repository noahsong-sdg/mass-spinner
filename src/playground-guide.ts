import {guideActions,guideTopics} from './guide-topics.js';

import {playgroundSteps as steps} from './playground-guide-steps.js';

export type PlaygroundGuideOptions={document?:Document;host:HTMLElement;open:(key:string,focus?:boolean)=>void;close:(key:string,restore?:boolean)=>void;focusRelated:(key:string,selector?:string|null)=>void};
type GuideElements={
 'fuel-plot':HTMLSelectElement;'fuel-learning-comparisons':HTMLDetailsElement;'fuel-motion-mode':HTMLSelectElement;
 'fuel-motion-time':HTMLInputElement;'fuel-motion-play':HTMLButtonElement;'fuel-export':HTMLButtonElement;'fuel-new-run':HTMLButtonElement;
 'fuel-equilibrium-calculator':HTMLDetailsElement;'fuel-locate-plot':HTMLButtonElement;'start-here':HTMLButtonElement;
 'fuel-view-representation':HTMLSelectElement;'fuel-view-cutaway':HTMLInputElement;'fuel-view-drive':HTMLSelectElement;
 'fuel-component':HTMLSelectElement;'fuel-view-radius':HTMLInputElement;'fuel-compare-temperature':HTMLButtonElement;'fuel-compare-rotation':HTMLButtonElement;
};
type GuideValueId='fuel-plot'|'fuel-motion-mode'|'fuel-motion-time'|'fuel-view-representation'|'fuel-view-cutaway'|'fuel-view-drive'|'fuel-component'|'fuel-view-radius';

/** Optional guidance over existing live controls; no alternate simulation or physical presets. */
export function setupPlaygroundGuide({document:doc=document,host,open,close,focusRelated}:PlaygroundGuideOptions){
 const win=doc.defaultView!;
 let readerWindow:Window|null=win.opener;
 function openStandalone(){if(readerWindow&&!readerWindow.closed){readerWindow.focus();return;}readerWindow=win.open('/start.html','mass-spinner-start');}

 const el=<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 host.classList.add('playground-guide');
 const intro=el('p','Seven small experiments. Your inputs stay as they are; Start from rest explicitly restarts the run.'),label=el('label','Explore'),choice=el('select');
 choice.id='guide-step';label.htmlFor=choice.id;
 steps.forEach((step,i)=>{const option=el('option',`${i+1}. ${step.title}`);option.value=String(i);choice.append(option);});
 const reading=el('div'),content=el('div'),status=el('p'),nav=el('nav'),previous=el('button','Back'),next=el('button','Next →'),leave=el('button','Scene');reading.className='guide-reading';
 status.id='guide-status';status.setAttribute('role','status');nav.setAttribute('aria-label','Walkthrough steps');nav.className='guide-navigation';leave.className='guide-leave';
 for(const button of [previous,next,leave])button.type='button';
 leave.setAttribute('aria-label','Back to the scene');
 const methods=el('a','Equations & accuracy limits ↗');methods.href='/how-it-works.html';methods.target='_blank';methods.rel='noopener';
 const views=el('div'),explore=el('button','Experiments'),physics=el('button','Physics & equations'),reader=el('div'),frame=el('iframe');
 views.className='guide-views';views.setAttribute('role','group');views.setAttribute('aria-label','Guide view');
 reader.className='guide-physics';reader.hidden=true;frame.title='Mass Spinner physical guide with equations and diagrams';frame.id='physics-guide-frame';reader.append(frame);
 for(const button of [explore,physics])button.type='button';
 explore.setAttribute('aria-pressed','true');physics.setAttribute('aria-pressed','false');views.append(explore,physics);
 function showPhysics(topic?:string){
  reading.hidden=true;reader.hidden=false;previous.hidden=true;next.hidden=true;
  explore.setAttribute('aria-pressed','false');physics.setAttribute('aria-pressed','true');
  if(!frame.hasAttribute('src')||topic){const id=guideTopics.find(entry=>entry.id===topic)?.id??'goal';frame.src=`/guide.html#${id}`;}
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
  if(option!.disabled){status.textContent='Choose Isotope separation in Controls to use this plot.';return false;}
  set('fuel-plot',value);node('fuel-learning-comparisons').open=false;open('plots');
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
 function composition(){transient();plot('composition');node('fuel-locate-plot').click();}
 const allowed=new Set([...guideActions,...steps.flatMap(step=>step.actions.map(([key])=>key))]);
 const controlFocus:Record<string,string|null>={current:'#fuel-currentA',collisions:'#fuel-collisionHz',drag:'#fuel-dragHz',diffusion:'#fuel-radialDiffusivityM2S',thermal:'#fuel-thermal-enabled',duration:'#fuel-durationS',controls:null};
 const pinButton=()=>doc.querySelector<HTMLButtonElement>('[aria-label="Pin accepted experiment as comparison A"]');
 const pending=(key:string)=>!node('fuel-export')||node('fuel-export').disabled||key==='pin'&&(!pinButton()||pinButton()!.disabled);
 let cancelLaunch=()=>{};
 function action(key:string){
  if(!allowed.has(key))return;
  cancelLaunch();
  status.textContent='';
  if(Object.hasOwn(controlFocus,key)){focusRelated('controls',controlFocus[key]);return;}
  if(key==='equilibrium'){open('plots');const calculator=node('fuel-equilibrium-calculator');calculator.open=true;calculator.scrollIntoView?.({block:'nearest'});calculator.querySelector('input')?.focus();return;}
  // Pending/failed results must not be presented as a fresh experiment.
  if(pending(key)){status.textContent='Wait for the run to finish. If it failed, open Controls and adjust the settings to retry.';return;}
  if(key==='currentExperiment'){
   index=1;render();showExplore();set('fuel-motion-mode','transport');set('fuel-motion-time',0,'input');plot('spin');node('fuel-new-run').click();focusRelated('controls','#fuel-currentA');
  }else if(key==='endSpin'){
   endpoint();plot('spin');
  }else if(key==='look'){
   set('fuel-view-representation','both');set('fuel-view-cutaway',.62,'input');set('fuel-view-drive','all');close('guide',true);
  }else if(key==='coils'){
   set('fuel-component','coils');open('inspect',true);
  }else if(key==='spin'){
   set('fuel-motion-mode','transport');set('fuel-motion-time',0,'input');plot('spin');
   if(node('fuel-motion-play').getAttribute('aria-pressed')!=='true')node('fuel-motion-play').click();
  }else if(['composition','axis','wall','temperature','rotation'].includes(key)){
   if(key==='composition')endpoint();
   composition();
   if(key==='axis'||key==='wall')set('fuel-view-radius',key==='axis'?0:1,'input');
   if(key==='temperature'||key==='rotation'){
    const comparison=node('fuel-learning-comparisons');comparison.open=true;node(`fuel-compare-${key}`).click();
    comparison.scrollIntoView?.({block:'nearest'});
   }
  }else if(['momentum','inertia','density'].includes(key)){transient();plot(key==='density'?'profile':key);if(key==='density')node('fuel-locate-plot').click();}
  else if(key==='work')plot('heat');
  else if(key==='thermalPlot')plot('thermal');
  else if(key==='collection'){endpoint();plot('cut');}
  else if(key==='cut'){transient();set('fuel-motion-time',node('fuel-motion-time').value,'input');if(plot('cut'))doc.querySelector<SVGSVGElement>('#fuel-plots > .live-plots svg')?.focus();}
  else if(key==='pin'){
   pinButton()!.click();open('view',true);
  }
 }
 // Only a known same-origin reader window may request an explicitly listed action.
 win.addEventListener('message',event=>{
  if(event.origin!==win.location.origin||(event.source!==frame.contentWindow&&(!readerWindow||event.source!==readerWindow)))return;
  const data:unknown=event.data;
  if(!data||typeof data!=='object'||!('type' in data))return;
  if(data.type==='mass-spinner:guide-action'&&'action' in data&&typeof data.action==='string')launch(data.action);
  else if(data.type==='mass-spinner:guide-view'&&'view' in data&&data.view==='experiments')showExplore();
  else if(data.type==='mass-spinner:guide-close')close('guide',true);
 });
 function launch(key:string){
  if(!allowed.has(key))return;
  cancelLaunch();const accepted=node('fuel-export');
  if(key==='equilibrium'||Object.hasOwn(controlFocus,key)||!accepted||!pending(key)){action(key);return;}
  status.textContent='Waiting for the computed run and controls…';
  const observer=new win.MutationObserver(()=>{
   if(!pending(key)){cancelLaunch();if(!node('start-here')?.hidden)action(key);}
  });
  cancelLaunch=()=>{observer.disconnect();cancelLaunch=()=>{};};
  observer.observe(accepted,{attributes:true,attributeFilter:['disabled']});
  const pin=pinButton();if(key==='pin'&&pin)observer.observe(pin,{attributes:true,attributeFilter:['disabled']});
 }
 function render(focus=false){
  const step=steps[index];choice.value=String(index);status.textContent='';
  const heading=el('h3',step.title);heading.tabIndex=-1;
  const actions=el('div');actions.className='guide-actions';
  for(const [key,text]of step.actions){const button=el('button',text);button.type='button';button.addEventListener('click',()=>action(key));actions.append(button);}
  const blocks:HTMLElement[]=[el('p',step.intro)];
  const instructions=el('ol');for(const text of step.do)instructions.append(el('li',text));blocks.push(instructions);
  const observation=el('p');observation.append(el('strong','Watch for. '),doc.createTextNode(step.notice));blocks.push(observation);
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
 return {showPhysics,showExplore,openStandalone,launch};
}
