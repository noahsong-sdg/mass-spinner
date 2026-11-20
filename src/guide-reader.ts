/** Links in the separate reader work without this script. Embedded readers use application actions. */
export function setupGuideReader(win:Pick<Window,'document'|'parent'|'opener'|'location'|'matchMedia'|'addEventListener'|'open'>=window){
 const doc=win.document,embedded=win.parent!==win;doc.body.classList.toggle('embedded',embedded);
 const origin=win.location.origin,status=doc.getElementById('reader-status'),browser=doc.defaultView!;
 let requestId='';
 win.addEventListener('message',event=>{
  if(!embedded||event.origin!==origin||event.source!==win.parent)return;
  const data:unknown=event.data;
  if(!data||typeof data!=='object'||!('type' in data))return;
  if(data.type==='mass-spinner:guide-ready')return;
  if(data.type==='mass-spinner:guide-result'&&requestId&&'requestId' in data&&data.requestId===requestId&&'status' in data&&['waiting','executed','rejected'].includes(String(data.status))&&status){
   if(data.status!=='waiting')requestId='';
   status.textContent=data.status==='waiting'?'Waiting for the calculated run and controls…':data.status==='executed'?'':('message' in data&&typeof data.message==='string'?data.message:'The simulator cannot apply this action.');
  }
 });

 for(const figure of doc.querySelectorAll<HTMLElement>('[data-concept-example]')){
  const motion=figure.querySelector<HTMLButtonElement>('[data-concept-motion]');
  const showMotion=()=>{if(motion)motion.hidden=!figure.querySelector('[data-concept-panel]:not([hidden])')?.querySelector('.concept-flow,.concept-trace');};
  for(const button of figure.querySelectorAll<HTMLButtonElement>('[data-concept-select]')){
   button.disabled=false;button.addEventListener('click',()=>{
    const selected=button.dataset.conceptSelect!;figure.dataset.state=selected;
    for(const choice of figure.querySelectorAll('[data-concept-select]'))choice.setAttribute('aria-pressed',String(choice===button));
    for(const panel of figure.querySelectorAll<SVGElement>('[data-concept-panel]'))panel.toggleAttribute('hidden',panel.dataset.conceptPanel!==selected);
    figure.querySelector('[data-concept-reading]')!.textContent=figure.querySelector<HTMLTemplateElement>(`[data-concept-description="${selected}"]`)!.content.textContent;
    showMotion();
   });
  }
  showMotion();
  if(motion){
   const pause=(paused:boolean)=>{figure.dataset.motion=paused?'paused':'running';motion.textContent=paused?'Play motion':'Pause motion';};
   pause(win.matchMedia?.('(prefers-reduced-motion: reduce)').matches??false);motion.disabled=false;
   motion.addEventListener('click',()=>pause(figure.dataset.motion!=='paused'));
  }
 }
 const density=doc.querySelector<HTMLElement>('[data-density-example]');
 if(density)for(const button of density.querySelectorAll<HTMLButtonElement>('[data-density-select]'))button.addEventListener('click',()=>{
  density.dataset.case=button.dataset.densitySelect;
  for(const choice of density.querySelectorAll('[data-density-select]'))choice.setAttribute('aria-pressed',String(choice===button));
 });
 const heat=doc.querySelector<HTMLElement>('[data-heat-example]');
 if(heat){
  const descriptions={gas:'Temperature decreases outward → heat flows outward by conduction.',wall:'Temperature increases outward → heat flows inward by conduction.',equal:'Uniform temperature → no heat flow by conduction.'};
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
  const amount=(value:number)=>value>0&&value<.1?'<0.1':value.toFixed(1);
  const percent=(value:number|null)=>value===null?'undefined':`${amount(value*100)}%`;
  radius.disabled=false;radius.addEventListener('input',()=>{
   const index=radius.valueAsNumber,r=index/100,[light,heavy,purity,recovery]=samples[index];
   collection.querySelector('[data-cut-radius-label]')!.textContent=`${r.toFixed(2)} R`;
   for(const circle of collection.querySelectorAll('[data-cut-area],[data-cut-boundary]'))circle.setAttribute('r',String(110*r));
   for(const dot of collection.querySelectorAll<SVGElement>('[data-cut-particle]'))dot.classList.toggle('cut-outside',Number(dot.dataset.cutParticle)>r);
   collection.querySelector('[data-cut-light]')!.textContent=amount(light);collection.querySelector('[data-cut-heavy]')!.textContent=amount(heavy);
   collection.querySelector<HTMLElement>('[data-cut-light-bar]')!.style.transform=`scaleX(${light/50})`;
   collection.querySelector<HTMLElement>('[data-cut-heavy-bar]')!.style.transform=`scaleX(${heavy/50})`;
   collection.querySelector('[data-cut-purity]')!.textContent=percent(purity);collection.querySelector('[data-cut-recovery]')!.textContent=percent(recovery);
   collection.querySelector('[data-cut-reading]')!.textContent=index===0?'The cut contains no gas. Its purity is undefined.':index===100?'The whole vessel has the 50% feed purity. It contains all light atoms.':`Keep ${amount(light)} light + ${amount(heavy)} heavy units: ${percent(purity)} purity, ${percent(recovery)} light recovery.`;
  });
 }
 const drive=doc.querySelector<HTMLElement>('[data-drive-diagram]');
 if(drive){
  const descriptions={
   current:'Current flows through the gas from the outer electrode to the inner electrode. The magnetic field points to you.',
   ions:'With this axial magnetic field, J × B causes a tangential force. This force turns the charged gas counterclockwise.',
   gas:'Ion–neutral collisions transfer rotation to the neutral gas. The electrodes stay still.',
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
 doc.addEventListener('click',event=>{
  const link=(event.target as Element).closest<HTMLAnchorElement>('a[data-guide-action],a[data-guide-view],a[data-guide-simulator]');if(!link)return;
  if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  event.preventDefault();
  if(!embedded){
   const section=[...doc.querySelectorAll('h2[id]')].filter(heading=>heading.compareDocumentPosition(link)&browser.Node.DOCUMENT_POSITION_FOLLOWING).at(-1)?.id;
   const lesson=new URL(browser.location.href);if(section)lesson.hash=section;
   const target=new URL(link.href);target.searchParams.set('lesson',lesson.pathname+lesson.hash);
   browser.location.assign(target.href);return;
  }
  const instruction=link.closest('p,li,.try-actions')??link;
  if(status){instruction.after(status);status.textContent='';}
  requestId=browser.crypto.randomUUID();
  if(link.dataset.guideAction)win.parent.postMessage({type:'mass-spinner:guide-action',action:link.dataset.guideAction,requestId},origin);
  else if(link.dataset.guideView)win.parent.postMessage({type:'mass-spinner:guide-view',view:'experiments',requestId},origin);
  else win.parent.postMessage({type:'mass-spinner:guide-close'},origin);
 });
 doc.addEventListener('keydown',event=>{if(embedded&&event.key==='Escape'){event.preventDefault();win.parent.postMessage({type:'mass-spinner:guide-close'},win.location.origin);}});
}
if(typeof window!=='undefined')setupGuideReader();
