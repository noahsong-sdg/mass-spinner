/** The standalone reader links work without this enhancement; embeds use native app actions. */
export function setupGuideReader(win:Pick<Window,'document'|'parent'|'opener'|'location'|'matchMedia'|'addEventListener'|'open'>=window){
 const doc=win.document,embedded=win.parent!==win;doc.body.classList.toggle('embedded',embedded);
 let simulatorWindow:Window|null=embedded?win.parent:win.opener as Window|null;

 const learningMode=doc.querySelector<HTMLSelectElement>('#learning-mode');
 if(learningMode){
  const descriptions={
   show:'Follow a worked experiment, then try a new case. You can close any explanation.',
   investigate:'Predict, choose an action, then compare with the explanation. Hints and answers are optional.',
   explore:'Choose any question or control. Instructions and explanations remain available when you want them.',
  };
  function setLearningMode(){
   const mode=learningMode!.value as keyof typeof descriptions;
   doc.body.dataset.learningMode=mode;
   for(const detail of doc.querySelectorAll<HTMLDetailsElement>('details[data-learning-hint],details[data-learning-explanation]'))detail.open=mode==='show';
   doc.getElementById('learning-mode-description')!.textContent=descriptions[mode];
  }
  doc.querySelector<HTMLElement>('[data-learning-controls]')!.hidden=false;
  learningMode.addEventListener('change',setLearningMode);setLearningMode();
 }

 const density=doc.querySelector<HTMLElement>('[data-density-example]');
 if(density)for(const button of density.querySelectorAll<HTMLButtonElement>('[data-density-select]'))button.addEventListener('click',()=>{
  density.dataset.case=button.dataset.densitySelect;
  for(const choice of density.querySelectorAll('[data-density-select]'))choice.setAttribute('aria-pressed',String(choice===button));
 });
 const heat=doc.querySelector<HTMLElement>('[data-heat-example]');
 if(heat){
  const descriptions={gas:'Temperature falls outward → conductive heat flows outward.',wall:'Temperature rises outward → conductive heat flows inward.',equal:'No temperature gradient → no conductive heat flow.'};
  for(const button of heat.querySelectorAll<HTMLButtonElement>('[data-heat-select]')){
   button.disabled=false;button.addEventListener('click',()=>{
    const choice=button.dataset.heatSelect as keyof typeof descriptions;heat.dataset.case=choice;
    for(const candidate of heat.querySelectorAll('[data-heat-select]'))candidate.setAttribute('aria-pressed',String(candidate===button));
    heat.querySelector('[data-heat-reading]')!.textContent=descriptions[choice];
   });
  }
  const motion=heat.querySelector<HTMLButtonElement>('[data-heat-motion]')!;
  const pause=(paused:boolean)=>{heat.dataset.motion=paused?'paused':'running';motion.textContent=paused?'Play motion':'Pause motion';};
  pause(win.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false);motion.disabled=false;
  motion.addEventListener('click',()=>pause(heat.dataset.motion!=='paused'));
 }
 const collection=doc.querySelector<HTMLElement>('[data-collection-example]');
 if(collection){
  const samples=JSON.parse(collection.dataset.cutValues!) as [number,number,number|null,number|null][];
  const radius=collection.querySelector<HTMLInputElement>('#example-cut-radius')!;
  const percent=(value:number|null)=>value===null?'undefined':`${(value*100).toFixed(1)}%`;
  radius.disabled=false;radius.addEventListener('input',()=>{
   const index=radius.valueAsNumber,r=index/100,[light,heavy,purity,recovery]=samples[index];
   collection.querySelector('[data-cut-radius-label]')!.textContent=`${r.toFixed(2)} R`;
   for(const circle of collection.querySelectorAll('[data-cut-area],[data-cut-boundary]'))circle.setAttribute('r',String(110*r));
   for(const dot of collection.querySelectorAll<SVGElement>('[data-cut-particle]'))dot.classList.toggle('cut-outside',Number(dot.dataset.cutParticle)>r);
   collection.querySelector('[data-cut-light]')!.textContent=light.toFixed(1);collection.querySelector('[data-cut-heavy]')!.textContent=heavy.toFixed(1);
   collection.querySelector<HTMLElement>('[data-cut-light-bar]')!.style.transform=`scaleX(${light/50})`;
   collection.querySelector<HTMLElement>('[data-cut-heavy-bar]')!.style.transform=`scaleX(${heavy/50})`;
   collection.querySelector('[data-cut-purity]')!.textContent=percent(purity);collection.querySelector('[data-cut-recovery]')!.textContent=percent(recovery);
   collection.querySelector('[data-cut-reading]')!.textContent=index===0?'Empty cut: no sample, so purity is undefined.':index===100?'Whole vessel: purity equals the 50% feed; all light inventory is kept.':`Keep ${light.toFixed(1)} light + ${heavy.toFixed(1)} heavy units: ${percent(purity)} purity, ${percent(recovery)} light recovery.`;
  });
 }
 const drive=doc.querySelector<HTMLElement>('[data-drive-diagram]');
 if(drive){
  const descriptions={
   current:'Current crosses the gas from the outer electrode to the inner electrode. The magnetic field points toward you.',
   ions:'With the axial magnetic field, J × B pushes the charged gas sideways all around the cylinder: counterclockwise.',
   gas:'Ion–neutral collisions pass rotation to the neutral gas. The electrodes stay still.',
  };
  const stages=drive.querySelectorAll<HTMLButtonElement>('[data-drive-stage]');
  for(const button of stages)button.addEventListener('click',()=>{
   const stage=button.dataset.driveStage as keyof typeof descriptions;
   drive.dataset.stage=stage;
   for(const candidate of stages)candidate.setAttribute('aria-pressed',String(candidate===button));
   drive.querySelector<HTMLElement>('#drive-explanation')!.textContent=descriptions[stage];
  });
  const motion=drive.querySelector<HTMLButtonElement>('[data-drive-motion]')!;
  const pause=(paused:boolean)=>{
   drive.dataset.motion=paused?'paused':'running';
   motion.textContent=paused?'Play motion':'Pause motion';
  };
  pause(win.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false);
  motion.addEventListener('click',()=>pause(drive.dataset.motion!=='paused'));
 }
 const chapters=doc.getElementById('guide-chapter') as HTMLSelectElement;
 function sync(){if([...chapters.options].some(option=>`#${option.value}`===win.location.hash))chapters.value=win.location.hash.slice(1);}
 chapters.addEventListener('change',()=>{win.location.hash=chapters.value;});win.addEventListener('hashchange',sync);sync();
 doc.addEventListener('click',event=>{
  const link=(event.target as Element).closest<HTMLAnchorElement>('a[data-guide-action],a[data-guide-view],a[data-guide-simulator]');if(!link)return;
  if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  event.preventDefault();
  const status=doc.getElementById('reader-status');
  // Looking up a named window with a URL would navigate it and discard its current run.
  if(!simulatorWindow||simulatorWindow.closed){
   simulatorWindow=win.open('','mass-spinner-simulator');
   if(!simulatorWindow){if(status)status.textContent='Allow the simulator window to open, then try this action again.';return;}
   try{
    const url=simulatorWindow.location.href;
    if(url==='about:blank'){simulatorWindow.location.replace(link.href);return;}
    if(new URL(url).origin!==win.location.origin){if(status)status.textContent='The named simulator tab is on another site. Close it or open Mass Spinner there, then try again.';simulatorWindow=null;return;}
   }catch{
    // Cross-origin window locations are intentionally unreadable; never navigate that tab.
    if(status)status.textContent='The named simulator tab is on another site. Close it or open Mass Spinner there, then try again.';
    simulatorWindow=null;return;
   }
  }
  if(link.dataset.guideAction)simulatorWindow.postMessage({type:'mass-spinner:guide-action',action:link.dataset.guideAction},win.location.origin);
  else if(link.dataset.guideView)simulatorWindow.postMessage({type:'mass-spinner:guide-view',view:'experiments'},win.location.origin);
  if(status)status.textContent='Sent to the simulator. Switch to its tab to see the result, then return here for the next step.';
  if(!embedded)simulatorWindow.focus();
 });
 doc.addEventListener('keydown',event=>{if(embedded&&event.key==='Escape'){event.preventDefault();win.parent.postMessage({type:'mass-spinner:guide-close'},win.location.origin);}});
}
if(typeof window!=='undefined')setupGuideReader();
