import {guideActions,guideTopics} from './guide-topics.js';

const steps=[
 {title:'Meet the centrifuge',intro:'Separate lighter and heavier atoms by spinning a gas. The default feed is lithium: ⁶Li and ⁷Li are the same element with different masses.',
  do:'Drag the apparatus to orbit; scroll or pinch to zoom. Open the cutaway, then click a component to inspect its role and material.',
  notice:'Current J crosses the axial magnetic field B. The J × B force turns the ions; collisions transfer rotation to neutral atoms.',
  note:'Colors are diagnostics, not a photograph of glowing plasma. Tracers represent populations, not every atom.',actions:[['look','Show gas & drive'],['coils','Inspect the coils']]},
 {title:'Change current; watch rotation',intro:'Does turning up the electrical drive actually spin the gas faster? Change one input and compare at the same physical time.',
  do:'1. Press Start from rest & edit current. Set Radial discharge current to 0 A. Wait for Updating to finish, then Show end-of-run speeds. 2. Press Start from rest & edit current again. Set 0.03 A, wait, then show the speeds again. Keep the other inputs unchanged.',
  notice:'At 0 A, a run from rest stays at zero rotation. At 0.03 A, ions turn and collisions accelerate the neutrals. Read the Ions and Neutrals values below the plot; a higher speed does not mean temperature has risen.',
  note:'Each preparation starts from rest and clears earlier drive steps, keeping your other inputs. A current edit later in a run instead inserts a drive step; cutting power then does not instantly stop moving gas. On a phone, reopen Start here to continue these instructions.',actions:[['currentExperiment','Start from rest & edit current'],['endSpin','Show end-of-run speeds']]},
 {title:'Find the lighter atoms',intro:'A radial composition profile answers: “At this distance from the axis, what percentage of the atoms are each species?”',
  do:'Show the end of the computed trajectory. Compare the axis and wall probes, or click the gas cutaway to choose your own radius.',
  notice:'In a rotating mixture, both species favor the wall. The heavier species favors it more, so the lighter species can be enriched toward the axis. Compare against the feed percentage, not 50%.',
  note:'Composition is a local number percentage. It is different from density, the number of atoms per volume. No resolved density means the percentage is undefined.',actions:[['composition','Show end-of-run composition'],['axis','Probe axis'],['wall','Probe wall']]},
 {title:'Separate temperature from rotation',intro:'Faster rotation strengthens centrifugal sorting. Random thermal motion works against it.',
  do:'Compare T with 2T at fixed rotation, then Ω with 2Ω at fixed temperature. These buttons make reference curves without changing your run.',
  notice:'The equilibrium mass bias scales as Ω²/T. Doubling temperature halves that bias; doubling rotation multiplies it by four. A percentage or purity does not itself change by that factor.',
  note:'These are ideal, uniform-temperature equilibrium comparisons. They are not a new time evolution or a prediction of the heating needed to reach that speed.',actions:[['temperature','Compare 2× temperature'],['rotation','Compare 2× rotation']]},
 {title:'Account for work and heat',intro:'Spinning faster costs energy. Drive work becomes rotation and losses; resistive current also deposits heat.',
  do:'Open Drive & work. Then inspect Thermal model in Controls. To try heating, explicitly enable Evolve gas & liner temperature and choose Temperature in Plots.',
  notice:'Rotation, ion–neutral slip and wall losses have separate energy curves. Gas redistribution also changes inertia. Numerical dissipation is solver damping, not physical heat.',
  note:'The default temperature is fixed by an assumed bath. A work plot alone does not mean temperature is evolving. Thermal conductances and several transport properties remain assumed.',actions:[['work','Show drive work'],['thermal','Open thermal controls']]},
 {title:'Choose purity or recovery',intro:'Purity is the light-species share in your selected inner region. Recovery is the fraction of all light atoms that lies in that region.',
  do:'Open the collection plot. Sweep across its horizontal axis: zero is the axis; one is the wall. Probe with a click or arrow keys; Home and End select the axis and wall. Read the values below the curve.',
  notice:'For a separated mixture, a smaller inner region generally trades higher light purity for lower recovery. At the full radius, purity equals the feed and all light atoms are recovered. With no light atoms, recovery is undefined.',
  note:'The probe keeps the same gas and time; it does not move the 3D cut marker. The setup collection slider starts a new run. These cuts partition a closed inventory. They do not simulate an extraction flow, product throughput or a real collector’s efficiency. Equilibrium opens a separate prescribed-speed calculator.',actions:[['collection','Show end-of-run cuts'],['cut','Probe collection curve'],['equilibrium','Open equilibrium calculator']]},
 {title:'Make your own comparison',intro:'Pick one question: what happens if I increase wall drag, change the feed, or run longer?',
  do:'Pin the accepted run as A in View. Change one physical input in Controls, then choose New run. Compare A and B at the same physical time, using Plots and the synchronized 3D views.',
  notice:'First predict the direction of the change, then inspect the result. A surprising curve is a reason to check the assumptions and time scale.',
  note:'Matching screened inputs is a narrow numerical check, not experimental accuracy. Other settings are exploratory. Reset ↺ restores the playground defaults.',actions:[['pin','Pin this run as A'],['controls','Open controls']]},
];

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
 // Only this embedded reader may request one of the explicitly listed native actions.
 win.addEventListener('message',event=>{
  if(event.origin!==win.location.origin||event.source!==frame.contentWindow)return;
  const data:unknown=event.data;
  if(!data||typeof data!=='object'||!('type' in data))return;
  if(data.type==='mass-spinner:guide-action'&&'action' in data&&typeof data.action==='string')action(data.action);
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
  const blocks=[el('p',step.intro)];
  for(const [title,text]of [['Try this',step.do],['Watch for',step.notice]]){const p=el('p'),strong=el('strong',`${title}. `);p.append(strong,doc.createTextNode(text));blocks.push(p);}
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
 return {showPhysics,showExplore,launch};
}
