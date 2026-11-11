/** Move presentation controls without intercepting inputs or changing simulation state. */
export function floatingPlayback(panel){
 const doc=panel.ownerDocument,win=doc.defaultView,parent=panel.parentElement;
 const grip=doc.createElement('button');grip.type='button';grip.className='fuel-motion-grip';grip.textContent='⠿';
 grip.setAttribute('aria-label','Move playback panel');grip.title='Drag to move · arrow keys move · Home or double-click resets';panel.prepend(grip);
 const key='mass-spinner-playback-v1';let position=null,drag=null,storage;
 try{storage=win.localStorage;const saved=JSON.parse(storage.getItem(key));if(saved?.version===1&&['x','y'].every(k=>Number.isFinite(saved[k])&&saved[k]>=0&&saved[k]<=1))position=saved;}catch{}
 function bounds(){const p=parent.getBoundingClientRect(),b=panel.getBoundingClientRect(),workspace=parent.closest('.sim-workspace'),top=workspace?64:8,bottom=workspace?(parseFloat(win.getComputedStyle(workspace).getPropertyValue('--world-bottom'))||86):8;return {top,x:Math.max(0,p.width-b.width-16),y:Math.max(0,p.height-b.height-top-bottom)};}
 function reservePlayback(){
  let inset=0;
  const mobile=win.matchMedia?.('(max-width:600px)').matches??win.innerWidth<=600;
  if(mobile&&!position&&!panel.hidden&&!parent.classList.contains('fuel-comparing')){
   const p=parent.getBoundingClientRect(),b=panel.getBoundingClientRect();
   // Reserve the entire bottom footprint, including the dock below the panel.
   if(p.height>0&&b.height>0)inset=Math.max(0,Math.min(p.height,p.bottom-b.top+8));
  }
  const value=`${inset}px`;if(parent.style.getPropertyValue('--fuel-playback-inset')!==value)parent.style.setProperty('--fuel-playback-inset',value);
 }
 function apply(){
  if(position&&!panel.hidden){const b=bounds();panel.classList.add('fuel-motion-moved');
   panel.style.left=`${8+position.x*b.x}px`;panel.style.top=`${b.top+position.y*b.y}px`;
  }
  reservePlayback();
 }
 function save(){try{if(position)storage?.setItem(key,JSON.stringify({version:1,...position}));else storage?.removeItem(key);}catch{}}
 function reset(){position=null;panel.classList.remove('fuel-motion-moved');panel.style.removeProperty('left');panel.style.removeProperty('top');save();apply();}
 function move(x,y){const b=bounds();position={x:b.x?Math.max(0,Math.min(1,(x-8)/b.x)):0,y:b.y?Math.max(0,Math.min(1,(y-b.top)/b.y)):0};apply();}
 const down=e=>{
  if(e.button!==0||e.isPrimary===false||drag)return;
  const p=parent.getBoundingClientRect(),b=panel.getBoundingClientRect();drag={id:e.pointerId,x:e.clientX,y:e.clientY,left:b.left-p.left,top:b.top-p.top};
  e.preventDefault();grip.focus({preventScroll:true});grip.setPointerCapture?.(e.pointerId);grip.classList.add('is-dragging');
 };
 const moving=e=>{if(drag?.id===e.pointerId)move(drag.left+e.clientX-drag.x,drag.top+e.clientY-drag.y);};
 const end=e=>{if(drag?.id!==e.pointerId)return;drag=null;grip.classList.remove('is-dragging');save();};
 const keyboard=e=>{
  if(e.key==='Home'){e.preventDefault();reset();return;}
  const d={ArrowLeft:[-24,0],ArrowRight:[24,0],ArrowUp:[0,-24],ArrowDown:[0,24]}[e.key];if(!d)return;
  e.preventDefault();const p=parent.getBoundingClientRect(),b=panel.getBoundingClientRect();move(b.left-p.left+d[0],b.top-p.top+d[1]);save();
 };
 grip.addEventListener('pointerdown',down);grip.addEventListener('pointermove',moving);
 for(const type of ['pointerup','pointercancel','lostpointercapture'])grip.addEventListener(type,end);
 grip.addEventListener('keydown',keyboard);grip.addEventListener('dblclick',reset);win.addEventListener('resize',apply);
 const observer=win.ResizeObserver?new win.ResizeObserver(apply):null;observer?.observe(parent);observer?.observe(panel);apply();
 const visibility=new win.MutationObserver(apply);visibility.observe(panel,{attributes:true,attributeFilter:['hidden']});visibility.observe(parent,{attributes:true,attributeFilter:['class']});
 return {refresh:apply,reset,dispose(){observer?.disconnect();visibility.disconnect();win.removeEventListener('resize',apply);parent.style.removeProperty('--fuel-playback-inset');grip.remove();}};
}
