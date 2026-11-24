/** Move presentation controls without intercepting inputs or changing simulation state. */
export function floatingPlayback(panel:HTMLElement,{details=[]}:{details?:readonly HTMLElement[]}={}){
 const doc=panel.ownerDocument,win=doc.defaultView!,parent=panel.parentElement!;
 const grip=doc.createElement('button');grip.type='button';grip.className='fuel-motion-grip';grip.textContent='⠿';
 grip.setAttribute('aria-label','Move playback panel');grip.title='Drag the panel or use the arrow keys. To reset its position, press Home or double-click.';panel.prepend(grip);
 const disclosure=details.length?doc.createElement('details'):null;
 if(disclosure){
  const summary=doc.createElement('summary'),body=doc.createElement('div');
  disclosure.className='fuel-motion-details';summary.textContent='Details';summary.setAttribute('aria-label','Playback details');body.className='fuel-motion-details-body';
  panel.insertBefore(disclosure,details[0]);body.append(...details);disclosure.append(summary,body);
 }
 let compact:boolean|undefined;
 const key='mass-spinner-playback-v1';
 type Position={x:number;y:number};
 type Drag={id:number;x:number;y:number;left:number;top:number};
 let position:Position|null=null,drag:Drag|null=null,storage:Storage|undefined;
 try{storage=win.localStorage;const saved:unknown=JSON.parse(storage.getItem(key)??'null');if(saved&&typeof saved==='object'&&'version' in saved&&saved.version===1&&'x' in saved&&typeof saved.x==='number'&&Number.isFinite(saved.x)&&saved.x>=0&&saved.x<=1&&'y' in saved&&typeof saved.y==='number'&&Number.isFinite(saved.y)&&saved.y>=0&&saved.y<=1)position={x:saved.x,y:saved.y};}catch{}
 function bounds(){
  const p=parent.getBoundingClientRect(),workspace=parent.closest('.sim-workspace');
  const d=workspace?.querySelector('.world-dock')?.getBoundingClientRect(),top=workspace?64:8;
  const bottom=d&&d.height>0&&d.bottom>p.top&&d.top<p.bottom?Math.max(8,p.bottom-d.top+12):8;
  if(position)panel.style.maxHeight=`${Math.max(0,p.height-top-bottom)}px`;
  const b=panel.getBoundingClientRect();
  return {top,x:Math.max(0,p.width-b.width-16),y:Math.max(0,p.height-b.height-top-bottom)};
 }
 function reservePlayback(){
  let inset=0;
  const mobile=parent.getBoundingClientRect().width<=520||(win.matchMedia?.('(max-width:600px)').matches??win.innerWidth<=600);
  if(mobile&&!position&&!panel.hidden&&!parent.classList.contains('fuel-comparing')){
   const p=parent.getBoundingClientRect(),b=panel.getBoundingClientRect();
   // Reserve the entire bottom footprint, including the dock below the panel.
   if(p.height>0&&b.height>0)inset=Math.max(0,Math.min(p.height,p.bottom-b.top+8));
  }
  const value=`${inset}px`;if(parent.style.getPropertyValue('--fuel-playback-inset')!==value)parent.style.setProperty('--fuel-playback-inset',value);
 }
 function apply(){
  const p=parent.getBoundingClientRect(),narrow=p.width<=520||(win.matchMedia?.('(max-width:600px)').matches??win.innerWidth<=600);
  if(disclosure&&narrow!==compact){
   const summary=disclosure.querySelector('summary')!;
   if(narrow){panel.classList.add('fuel-motion-compact');if(disclosure.contains(doc.activeElement))summary.focus({preventScroll:true});disclosure.open=false;}
   else{disclosure.open=true;if(doc.activeElement===summary)(disclosure.querySelector<HTMLButtonElement>('button:not([disabled])')??grip).focus({preventScroll:true});panel.classList.remove('fuel-motion-compact');}
   compact=narrow;
  }
  if(disclosure&&!position){
   if(narrow&&!panel.hidden&&p.height>0){const bottom=parent.classList.contains('fuel-comparing')?8:Math.max(8,p.bottom-panel.getBoundingClientRect().bottom);panel.style.maxHeight=`${Math.max(0,p.height-bottom-8)}px`;}
   else panel.style.removeProperty('max-height');
  }
  const dock=parent.closest('.sim-workspace')?.querySelector('.world-dock');if(dock)observer?.observe(dock);
  if(position&&!panel.hidden){const b=bounds();panel.classList.add('fuel-motion-moved');
   panel.style.left=`${8+position.x*b.x}px`;panel.style.top=`${b.top+position.y*b.y}px`;
  }
  reservePlayback();
 }
 function save(){try{if(position)storage?.setItem(key,JSON.stringify({version:1,...position}));else storage?.removeItem(key);}catch{}}
 function reset(){position=null;panel.classList.remove('fuel-motion-moved');panel.style.removeProperty('left');panel.style.removeProperty('top');panel.style.removeProperty('max-height');save();apply();}
 function move(x:number,y:number){const b=bounds();position={x:b.x?Math.max(0,Math.min(1,(x-8)/b.x)):0,y:b.y?Math.max(0,Math.min(1,(y-b.top)/b.y)):0};apply();}
 const down=(e:PointerEvent)=>{
  if(e.button!==0||e.isPrimary===false||drag)return;
  const p=parent.getBoundingClientRect(),b=panel.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:b.left-p.left,top:b.top-p.top};
  e.preventDefault();grip.focus({preventScroll:true});grip.setPointerCapture?.(e.pointerId);grip.classList.add('is-dragging');
 };
 const moving=(e:PointerEvent)=>{if(drag?.id===e.pointerId)move(drag.left+e.clientX-drag.x,drag.top+e.clientY-drag.y);};
 const end=(e:PointerEvent)=>{if(drag?.id!==e.pointerId)return;drag=null;grip.classList.remove('is-dragging');save();};
 const keyboard=(e:KeyboardEvent)=>{
  if(e.key==='Home'){e.preventDefault();reset();return;}
  const directions:Record<string,[number,number]>={ArrowLeft:[-24,0],ArrowRight:[24,0],ArrowUp:[0,-24],ArrowDown:[0,24]};const d=directions[e.key];if(!d)return;
  e.preventDefault();const p=parent.getBoundingClientRect(),b=panel.getBoundingClientRect();move(b.left-p.left+d[0],b.top-p.top+d[1]);save();
 };
 grip.addEventListener('pointerdown',down);grip.addEventListener('pointermove',moving);
 for(const type of ['pointerup','pointercancel','lostpointercapture'] as const)grip.addEventListener(type,end);
 grip.addEventListener('keydown',keyboard);grip.addEventListener('dblclick',reset);win.addEventListener('resize',apply);
 disclosure?.addEventListener('toggle',apply);
 const observer=win.ResizeObserver?new win.ResizeObserver(apply):null;observer?.observe(parent);observer?.observe(panel);apply();
 const visibility=new win.MutationObserver(apply);visibility.observe(panel,{attributes:true,attributeFilter:['hidden']});visibility.observe(parent,{attributes:true,attributeFilter:['class']});
 return {refresh:apply,reset,dispose(){observer?.disconnect();visibility.disconnect();win.removeEventListener('resize',apply);disclosure?.removeEventListener('toggle',apply);parent.style.removeProperty('--fuel-playback-inset');panel.classList.remove('fuel-motion-compact');grip.remove();if(disclosure){disclosure.replaceWith(...details);}}};
}
