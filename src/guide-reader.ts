/** The standalone reader links work without this enhancement; embeds use native app actions. */
export function setupGuideReader(win=window){
 const doc=win.document,embedded=win.parent!==win;doc.body.classList.toggle('embedded',embedded);
 let simulatorWindow:Window|null=embedded?win.parent:win.opener;

 const density=doc.querySelector<HTMLElement>('[data-density-example]');
 if(density)for(const button of density.querySelectorAll<HTMLButtonElement>('[data-density-select]'))button.addEventListener('click',()=>{
  density.dataset.case=button.dataset.densitySelect;
  for(const choice of density.querySelectorAll('[data-density-select]'))choice.setAttribute('aria-pressed',String(choice===button));
 });
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
  if(event instanceof win.MouseEvent&&(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey))return;
  event.preventDefault();
  if(!simulatorWindow||simulatorWindow.closed){simulatorWindow=win.open(link.href,'mass-spinner-simulator');return;}
  if(link.dataset.guideAction)simulatorWindow.postMessage({type:'mass-spinner:guide-action',action:link.dataset.guideAction},win.location.origin);
  else if(link.dataset.guideView)simulatorWindow.postMessage({type:'mass-spinner:guide-view',view:'experiments'},win.location.origin);
  const status=doc.getElementById('reader-status');if(status)status.textContent='Sent to the simulator. Switch to its tab to see the result, then return here for the next step.';
  if(!embedded)simulatorWindow.focus();
 });
 doc.addEventListener('keydown',event=>{if(embedded&&event.key==='Escape'){event.preventDefault();win.parent.postMessage({type:'mass-spinner:guide-close'},win.location.origin);}});
}
if(typeof window!=='undefined')setupGuideReader();
