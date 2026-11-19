/** The standalone reader links work without this enhancement; embeds use native app actions. */
export function setupGuideReader(win:Pick<Window,'document'|'parent'|'opener'|'location'|'matchMedia'|'addEventListener'|'open'>=window){
 const doc=win.document,embedded=win.parent!==win;doc.body.classList.toggle('embedded',embedded);
 let simulatorWindow:Window|null=embedded?win.parent:win.opener as Window|null;
 const browser=doc.defaultView!,origin=win.location.origin,status=doc.getElementById('reader-status');
 const capabilityKey='mass-spinner:reader-capability';
 let capability='',instance='',probe:number|undefined,attempts=0;
 let pending:{type:string;action?:string;view?:string;requestId:string;sent:boolean}|undefined;
 const report=(message:string)=>{if(status)status.textContent=message;};
 try{capability=browser.sessionStorage.getItem(capabilityKey)??'';}catch{/* Storage can be disabled; the current authorized connection still works. */}
 const stopProbe=()=>{browser.clearInterval(probe);probe=undefined;};
 const hello=()=>{
  if(!simulatorWindow||simulatorWindow.closed){stopProbe();report('The simulator is closed. Try this action again to open it.');return;}
  if(attempts++>=120){stopProbe();report(pending?.sent?'The simulator has not confirmed this action. It may still finish; check its tab before trying again.':'The simulator did not become ready. Wait for it to load, then try again.');return;}
  simulatorWindow.postMessage({type:'mass-spinner:guide-hello',capability},origin);
 };
 const connect=()=>{stopProbe();attempts=0;report('Waiting for the simulator…');probe=browser.setInterval(hello,250);hello();};
 win.addEventListener('message',event=>{
  if(event.origin!==origin||event.source!==simulatorWindow)return;
  const data:unknown=event.data;
  if(!data||typeof data!=='object'||!('type' in data))return;
  if(data.type==='mass-spinner:guide-ready'&&'capability' in data&&typeof data.capability==='string'&&'instance' in data&&typeof data.instance==='string'){
   if(!pending&&probe===undefined)return;
   const interrupted=pending?.sent&&instance!==data.instance;
   instance=data.instance;capability=data.capability;
   try{browser.sessionStorage.setItem(capabilityKey,capability);}catch{/* Do not broaden authorization when persistence is unavailable. */}
   if(interrupted){pending=undefined;stopProbe();report('Interrupted by simulator reload. The action may have executed; check its tab before trying again.');return;}
   if(pending&&!pending.sent){pending.sent=true;report('Applying in the simulator…');simulatorWindow!.postMessage(pending,origin);}
   else if(!pending){stopProbe();report('Simulator ready.');}
  }else if(data.type==='mass-spinner:guide-result'&&'requestId' in data&&data.requestId===pending?.requestId&&'status' in data){
   if(data.status==='waiting'&&probe!==undefined)report('Waiting for the computed run and controls…');
   else if(data.status==='executed'||data.status==='rejected'){
    report(data.status==='executed'?'Opened in the simulator.':('message' in data&&typeof data.message==='string'?data.message:'The simulator could not apply this action.'));
    pending=undefined;stopProbe();
   }
  }
 });
 browser.addEventListener('pagehide',stopProbe);

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
   collection.querySelector('[data-cut-reading]')!.textContent=index===0?'Empty cut: no sample, so purity is undefined.':index===100?'Whole vessel: purity equals the 50% feed; all light inventory is kept.':`Keep ${amount(light)} light + ${amount(heavy)} heavy units: ${percent(purity)} purity, ${percent(recovery)} light recovery.`;
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
 doc.addEventListener('click',event=>{
  const link=(event.target as Element).closest<HTMLAnchorElement>('a[data-guide-action],a[data-guide-view],a[data-guide-simulator]');if(!link)return;
  if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  event.preventDefault();stopProbe();
  // Looking up a named window with a URL would navigate it and discard its current run.
  if(!simulatorWindow||simulatorWindow.closed){
   simulatorWindow=win.open('','mass-spinner-simulator');
   if(!simulatorWindow){if(status)status.textContent='Allow the simulator window to open, then try this action again.';return;}
   try{
    const url=simulatorWindow.location.href;
    if(url==='about:blank'){simulatorWindow.location.replace(link.href);pending=undefined;connect();return;}
    if(new URL(url).origin!==win.location.origin){if(status)status.textContent='The named simulator tab is on another site. Close it or open Mass Spinner there, then try again.';simulatorWindow=null;return;}
   }catch{
    // Cross-origin window locations are intentionally unreadable; never navigate that tab.
    if(status)status.textContent='The named simulator tab is on another site. Close it or open Mass Spinner there, then try again.';
    simulatorWindow=null;return;
   }
  }
  pending=link.dataset.guideAction?{type:'mass-spinner:guide-action',action:link.dataset.guideAction,requestId:browser.crypto.randomUUID(),sent:false}
   :link.dataset.guideView?{type:'mass-spinner:guide-view',view:'experiments',requestId:browser.crypto.randomUUID(),sent:false}:undefined;
  connect();
  if(!embedded)simulatorWindow.focus();
 });
 if(simulatorWindow&&!simulatorWindow.closed)connect();
 doc.addEventListener('keydown',event=>{if(embedded&&event.key==='Escape'){event.preventDefault();win.parent.postMessage({type:'mass-spinner:guide-close'},win.location.origin);}});
}
if(typeof window!=='undefined')setupGuideReader();
