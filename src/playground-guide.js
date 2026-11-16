const steps=[
 {title:'Meet the centrifuge',intro:'Separate lighter and heavier atoms by spinning a gas. The default feed is lithium: ⁶Li and ⁷Li are the same element with different masses.',
  do:'Drag the apparatus to orbit; scroll or pinch to zoom. Open the cutaway, then click a component to inspect its role and material.',
  notice:'Current J crosses the axial magnetic field B. The J × B force turns the ions; collisions transfer rotation to neutral atoms.',
  note:'Colors are diagnostics, not a photograph of glowing plasma. Tracers represent populations, not every atom.',actions:[['look','Show gas & drive'],['coils','Inspect the coils']]},
 {title:'Watch the gas spin up',intro:'Ions are charged atoms. Neutrals have no net charge: the drive reaches them through collisions.',
  do:'Replay spin-up. Follow the time cursor on the Ions and Neutrals speed curves. Pause or drag the playback slider to inspect a moment.',
  notice:'With the default drive, ions lead and neutrals follow. Friction transfers angular momentum; wall drag removes it.',
  note:'Fast rotation is averaged so the full run plays in seconds; use the physical-time readout. Try a small change to Radial discharge current: during playback it changes the drive at that time. New run starts from rest with the displayed settings.',actions:[['spin','Replay spin-up'],['current','Adjust drive current']]},
 {title:'Find the lighter atoms',intro:'A radial composition profile answers: “At this distance from the axis, what percentage of the atoms are each species?”',
  do:'Show the end of the computed trajectory. Compare the axis and wall probes, or click the gas cutaway to choose your own radius.',
  notice:'In a rotating mixture, both species favor the wall. The heavier species favors it more, so the lighter species can be enriched toward the axis. Compare against the feed percentage, not 50%.',
  note:'Composition is a local number percentage. It is different from density, the number of atoms per volume. No resolved density means the percentage is undefined.',actions:[['composition','Show composition'],['axis','Probe axis'],['wall','Probe wall']]},
 {title:'Separate temperature from rotation',intro:'Faster rotation strengthens centrifugal sorting. Random thermal motion works against it.',
  do:'Compare T with 2T at fixed rotation, then Ω with 2Ω at fixed temperature. These buttons make reference curves without changing your run.',
  notice:'The equilibrium mass bias scales as Ω²/T. Doubling temperature halves that bias; doubling rotation multiplies it by four. A percentage or purity does not itself change by that factor.',
  note:'These are ideal, uniform-temperature equilibrium comparisons. They are not a new time evolution or a prediction of the heating needed to reach that speed.',actions:[['temperature','Compare 2× temperature'],['rotation','Compare 2× rotation']]},
 {title:'Account for work and heat',intro:'Spinning faster costs energy. Drive work becomes rotation and losses; resistive current also deposits heat.',
  do:'Open Drive & work. Then inspect Thermal model in Controls. To try heating, explicitly enable Evolve gas & liner temperature and choose Temperature in Plots.',
  notice:'Rotation, ion–neutral slip and wall losses have separate energy curves. Gas redistribution also changes inertia. Numerical dissipation is solver damping, not physical heat.',
  note:'The default temperature is fixed by an assumed bath. A work plot alone does not mean temperature is evolving. Thermal conductances and several transport properties remain assumed.',actions:[['work','Show drive work'],['thermal','Open thermal controls']]},
 {title:'Choose purity or recovery',intro:'Purity is the light-species share in your selected inner region. Recovery is the fraction of all light atoms that lies in that region.',
  do:'Open the collection plot. Sweep across its horizontal axis: zero is the axis; one is the wall. Adjust Inner collection radius / a to move the selected cut.',
  notice:'For a separated mixture, a smaller inner region generally trades higher light purity for lower recovery. At the full radius you recover all light atoms, at the original feed purity.',
  note:'These cuts partition a closed inventory. They do not simulate an extraction flow, product throughput or a real collector’s efficiency.',actions:[['collection','Show purity & recovery'],['cut','Adjust collection radius']]},
 {title:'Make your own comparison',intro:'Pick one question: what happens if I increase wall drag, change the feed, or run longer?',
  do:'Pin the accepted run as A in View. Change one physical input in Controls. Compare A and B at the same physical time, using Plots and the synchronized 3D views.',
  notice:'First predict the direction of the change, then inspect the result. A surprising curve is a reason to check the assumptions and time scale.',
  note:'Matching screened inputs is a narrow numerical check, not experimental accuracy. Other settings are exploratory. Reset ↺ restores the playground defaults.',actions:[['pin','Pin this run as A'],['controls','Open controls']]},
];

/** Optional guidance over existing live controls; no alternate simulation or physical presets. */
export function setupPlaygroundGuide({document:doc=document,host,open,close,focusRelated}){
 const el=(tag,text)=>{const n=doc.createElement(tag);if(text!==undefined)n.textContent=text;return n;};
 host.classList.add('playground-guide');
 const intro=el('p','Seven small experiments. Your current settings stay as they are; nothing is reset.'),label=el('label','Explore'),choice=el('select');
 choice.id='guide-step';label.htmlFor=choice.id;
 steps.forEach((step,i)=>{const option=el('option',`${i+1}. ${step.title}`);option.value=String(i);choice.append(option);});
 const reading=el('div'),content=el('div'),status=el('p'),nav=el('nav'),previous=el('button','Back'),next=el('button','Next →'),leave=el('button','Scene');reading.className='guide-reading';
 status.id='guide-status';status.setAttribute('role','status');nav.setAttribute('aria-label','Walkthrough steps');nav.className='guide-navigation';leave.className='guide-leave';
 for(const button of [previous,next,leave])button.type='button';
 leave.setAttribute('aria-label','Back to the scene');
 const methods=el('a','Equations & accuracy limits ↗');methods.href='/how-it-works.html';methods.target='_blank';methods.rel='noopener';
 nav.append(previous,next,leave);reading.append(intro,label,choice,content,status,methods);host.append(reading,nav);
 let index=0;
 const node=id=>doc.getElementById(id);
 function set(id,value,type='change'){
  const input=node(id);input.value=String(value);input.dispatchEvent(new doc.defaultView.Event(type,{bubbles:true}));
 }
 function plot(value){
  const select=node('fuel-plot'),option=[...select.options].find(option=>option.value===value);
  if(option.disabled){status.textContent='Choose Isotope separation in Controls to use this plot.';return false;}
  set('fuel-plot',value);node('fuel-learning-comparisons').open=false;open('plots');
  doc.querySelector('#fuel-plots > .live-plots').scrollIntoView?.({block:'nearest'});return true;
 }
 function endpoint(){
  if(node('fuel-motion-mode').value!=='transport')set('fuel-motion-mode','transport');
  set('fuel-motion-time',node('fuel-motion-time').max,'input');
 }
 function composition(){endpoint();plot('composition');node('fuel-locate-plot').click();}
 function action(key){
  status.textContent='';
  const focus={current:'#fuel-currentA',thermal:'#fuel-thermal-enabled',cut:'#fuel-cutFraction',controls:null};
  if(Object.hasOwn(focus,key)){focusRelated('controls',focus[key]);return;}
  // Pending/failed results must not be presented as a fresh experiment.
  if(!node('fuel-export')||node('fuel-export').disabled){status.textContent='Wait for the run to finish. If it failed, check Controls and choose New run.';return;}
  if(key==='look'){
   set('fuel-view-representation','both');set('fuel-view-cutaway',.62,'input');set('fuel-view-drive','all');close('guide',true);
  }else if(key==='coils'){
   set('fuel-component','coils');open('inspect',true);
  }else if(key==='spin'){
   set('fuel-motion-mode','transport');set('fuel-motion-time',0,'input');plot('spin');
   if(node('fuel-motion-play').getAttribute('aria-pressed')!=='true')node('fuel-motion-play').click();
  }else if(['composition','axis','wall','temperature','rotation'].includes(key)){
   composition();
   if(key==='axis'||key==='wall')set('fuel-view-radius',key==='axis'?0:1,'input');
   if(key==='temperature'||key==='rotation'){
    const comparison=node('fuel-learning-comparisons');comparison.open=true;node(`fuel-compare-${key}`).click();
    comparison.scrollIntoView?.({block:'nearest'});
   }
  }else if(key==='work')plot('heat');
  else if(key==='collection'){endpoint();plot('cut');}
  else if(key==='pin'){
   doc.querySelector('[aria-label="Pin accepted experiment as comparison A"]').click();open('view',true);
  }
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
}
