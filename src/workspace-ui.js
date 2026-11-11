import {clamp,defaultWorkspaceLayout,readWorkspaceLayout,workspaceGeometry,workspaceLayoutKey} from './workspace-layout.js';

/** Reuse the live simulation nodes: opening a window never rebuilds its controls. */
export function setupWorkspace({document:doc=document,matchMedia=window.matchMedia.bind(window),storage,onContextChange=()=>{}}={}){
 const make=(tag,cls,text)=>{const el=doc.createElement(tag);el.className=cls;if(text)el.textContent=text;return el;};
 const originalMain=doc.querySelector('main');
 const shell=make('main','sim-workspace'),top=make('div','world-top'),stage=make('div','world-stage'),dock=make('nav','world-dock');
 shell.setAttribute('aria-labelledby','level-title');
 dock.setAttribute('aria-label','Simulation windows');
 const header=doc.querySelector('.masthead'),navigation=doc.querySelector('.level-navigation'),heading=doc.querySelector('#level-title');
 header.append(navigation);
 top.append(header,doc.querySelector('.learning-path'));
 shell.append(heading,top,stage,dock);doc.body.append(shell);
 let level='1',marathon='centrifuge';const windows=new Map(),groups=[],rails={},handles={};
 const mobile=matchMedia('(max-width: 740px)');
 // Storage can be unavailable in private/embedded browsing; geometry remains usable.
 if(storage===undefined)try{storage=doc.defaultView.localStorage;}catch{storage=null;}
 let layout=readWorkspaceLayout(storage);
 const persist=()=>{try{storage?.setItem(workspaceLayoutKey,JSON.stringify(layout));}catch{}};
 const reset=make('button','world-layout-reset','↺');reset.type='button';reset.setAttribute('aria-label','Reset window layout');
 reset.addEventListener('click',()=>{layout={...defaultWorkspaceLayout};try{storage?.removeItem(workspaceLayoutKey);}catch{}arrange();});
 const isOpen=side=>[...windows.values()].some(item=>item.side===side&&!item.panel.hidden);
 function arrange(){
  const dockHeight=dock.getBoundingClientRect().height;
  if(dockHeight>0)shell.style.setProperty('--world-bottom',`${Math.ceil(dockHeight+(parseFloat(doc.defaultView.getComputedStyle(dock).bottom)||0)+12)}px`);
  const leftOpen=isOpen('left'),rightOpen=isOpen('right'),width=doc.defaultView.innerWidth;
  const sizes=workspaceGeometry(layout,width,leftOpen,rightOpen);
  for(const side of ['left','right']){
   const visible=isOpen(side);rails[side].hidden=!visible;
   rails[side].style.width=`${sizes[side]}px`;handles[side].hidden=mobile.matches;
   const lower=workspaceGeometry({...layout,[side]:.15},width,leftOpen,rightOpen)[side];
   const upper=workspaceGeometry({...layout,[side]:.5},width,leftOpen,rightOpen)[side];
   handles[side].setAttribute('aria-valuemin',String(lower));handles[side].setAttribute('aria-valuemax',String(upper));
   handles[side].setAttribute('aria-valuenow',String(sizes[side]));
   handles[side].setAttribute('aria-valuetext',`${sizes[side]} pixels`);
   shell.style.setProperty(`--world-${side}-reserve`,`${!mobile.matches&&visible?sizes[side]+32:0}px`);
  }
  const pair=!mobile.matches&&!windows.get('target')?.panel.hidden&&['plots','info'].some(key=>!windows.get(key)?.panel.hidden);
  split.hidden=!pair;split.setAttribute('aria-valuenow',String(Math.round(layout.split*100)));
  split.setAttribute('aria-valuetext',`${Math.round(layout.split*100)}% results, ${Math.round((1-layout.split)*100)}% target`);
  for(const [key,item]of windows)if(item.side==='right')item.panel.style.flex=`${pair?(key==='target'?1-layout.split:layout.split):1} 1 0px`;
  if(doc.activeElement?.matches('.world-resizer[hidden]'))[...windows.values()].find(item=>!item.panel.hidden)?.heading.focus();
 }
 function separator(label,orientation,change){
  const handle=make('div',`world-resizer world-resizer-${orientation}`);handle.tabIndex=0;handle.setAttribute('role','separator');
  handle.setAttribute('aria-label',label);handle.setAttribute('aria-orientation',orientation);handle.setAttribute('aria-valuemin','20');handle.setAttribute('aria-valuemax','80');
  handle.title='Drag or use arrow keys to resize; Home and End set the bounds';
  handle.addEventListener('keydown',event=>{
   if(event.key==='Escape'){
    event.preventDefault();const side=handle.parentElement===rails.left?'left':'right';
    for(const [key,item]of windows)if(item.side===side)close(key,true);return;
   }
   const delta=orientation==='vertical'?{ArrowLeft:-24,ArrowRight:24}:{ArrowUp:-.05,ArrowDown:.05};
   if(event.key in delta||event.key==='Home'||event.key==='End'){
    event.preventDefault();change(event.key==='Home'?'min':event.key==='End'?'max':delta[event.key],'keyboard');persist();
   }
  });
  handle.addEventListener('pointerdown',event=>{
   if(event.button!==0)return;event.preventDefault();handle.focus();handle.setPointerCapture?.(event.pointerId);
   let position=orientation==='vertical'?event.clientX:event.clientY;
   const move=next=>{const at=orientation==='vertical'?next.clientX:next.clientY;change(at-position,'pointer');position=at;};
   const finish=()=>{handle.removeEventListener('pointermove',move);for(const type of ['pointerup','pointercancel','lostpointercapture'])handle.removeEventListener(type,finish);persist();};
   handle.addEventListener('pointermove',move);for(const type of ['pointerup','pointercancel','lostpointercapture'])handle.addEventListener(type,finish);
  });return handle;
 }
 for(const side of ['left','right']){
  const rail=make('div',`world-rail world-rail-${side}`);rail.hidden=true;rails[side]=rail;
  handles[side]=separator(`Resize ${side} windows`,'vertical',delta=>{
   const width=doc.defaultView.innerWidth,current=workspaceGeometry(layout,width,isOpen('left'),isOpen('right'))[side];
   layout[side]=delta==='min'?.15:delta==='max'?.5:clamp((current+delta*(side==='right'?-1:1))/width,.15,.5);arrange();
  });rail.append(handles[side]);shell.append(rail);
 }
 const split=separator('Resize results and target','horizontal',(delta,input)=>{
  const height=Math.max(1,rails.right.getBoundingClientRect().height-12);
  layout.split=delta==='min'?.2:delta==='max'?.8:clamp(layout.split+(input==='keyboard'?delta:delta/height),.2,.8);arrange();
 });split.classList.add('world-results-split');split.hidden=true;rails.right.append(split);
 function close(key,restore=false){
  const item=windows.get(key);if(!item||item.panel.hidden)return;
  const focused=item.panel.contains(doc.activeElement);item.panel.hidden=true;item.button.setAttribute('aria-expanded','false');
  arrange();
  if(restore||focused)item.button.focus();
 }
 function open(key,focus=false){
  const item=windows.get(key);if(!item||item.button.hidden)return;
  for(const [other,entry]of windows)if(other!==key&&(mobile.matches||entry.group===item.group))close(other);
  item.panel.hidden=false;item.button.setAttribute('aria-expanded','true');
  arrange();
  if(focus)item.heading.focus();
 }
 function windowPanel(key,title,side){
  const panel=make('section',`world-window world-${side}`),bar=make('div','world-window-bar'),heading=make('h2','',title),dismiss=make('button','world-close','×'),body=make('div','world-window-body'),button=make('button','',title);
  panel.id=`window-${key}`;heading.id=`window-title-${key}`;heading.tabIndex=-1;
  panel.setAttribute('aria-labelledby',heading.id);dismiss.type='button';dismiss.setAttribute('aria-label',`Close ${title}`);
  button.type='button';button.setAttribute('aria-controls',panel.id);button.setAttribute('aria-expanded','false');
  button.addEventListener('click',()=>panel.hidden?open(key,true):close(key,true));dismiss.addEventListener('click',()=>close(key,true));
  panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close(key,true);}});
  bar.append(heading,dismiss);panel.append(bar,body);panel.hidden=true;rails[side].append(panel);dock.append(button);
  windows.set(key,{panel,button,body,heading,side,group:key==='target'?'target':side});return body;
 }
 const panels={controls:windowPanel('controls','Controls','left'),plots:windowPanel('plots','Plots','right'),target:windowPanel('target','Target','right'),inspect:windowPanel('inspect','Inspect','left'),view:windowPanel('view','View','left'),info:windowPanel('info','Model info','right')};
 dock.append(reset);
 const methods=make('a','world-methods','?');methods.href='/how-it-works.html';methods.target='_blank';methods.rel='noopener';methods.setAttribute('aria-label','How Mass Spinner works');methods.title='How Mass Spinner works';dock.append(methods);
 function group(parent,levels,selectors,context){
  const wrapper=make('div','world-group');wrapper.dataset.levels=levels.join(' ');if(context)wrapper.dataset.context=context;
  for(const selector of selectors){const node=doc.querySelector(selector);if(node)wrapper.append(node);}
  parent.append(wrapper);groups.push({wrapper,levels,context});return wrapper;
 }
 group(stage,['1','3'],['#stage']);
 group(stage,['2'],['#fusion-apparatus'],'source');
 group(stage,['2'],['#blanket-render'],'blanket');
 group(stage,['2'],['#fuel-render'],'centrifuge');
 for(const key of ['controls','plots','inspect','view','info'])group(panels[key],['2'],[`#fuel-${key}`],'centrifuge');
 group(panels.controls,['1','3'],['.system-bar','.controls']);
 group(panels.plots,['1','3'],['#equilibrium-view','#reduced-view','.species-legend','.live-plot-panel','.diagnostics','#study-panel','#comparison']);
 group(panels.view,['1','3'],['.viewport-tools']);
 group(panels.inspect,['1','3'],['#separator-inspector']);
 const modelInspect=group(panels.inspect,['1','3'],['#model-apparatus .apparatus-toolbar','#model-apparatus .component-description']);modelInspect.classList.add('model-inspect');
 group(panels.info,['3'],['#tutorial-insights','.method-guide-panel','#failure-lab','#model','.method-directory','.reference-atlas']);
 group(panels.controls,['2'],['.fusion-inputs'],'source');
 group(panels.plots,['2'],['#neutron-transport','#initial-source-reference'],'source');
 group(panels.target,['2'],['#coupled-target'],'source');
 const sourceInspect=group(panels.inspect,['2'],['#fusion-apparatus .apparatus-toolbar','#fusion-apparatus .component-description'],'source');
 const role=make('details','world-component-role');role.append(make('summary','','Component role'),doc.querySelector('#fusion-inspector'));sourceInspect.append(role);
 group(panels.inspect,['2'],['#blanket-render .apparatus-toolbar','#blanket-render .component-description'],'blanket');
 for(const inspector of panels.inspect.querySelectorAll('.component-inspector'))inspector.open=true;
 group(panels.info,['2'],['.live-schematic','#fusion-lab>.fusion-model-notes'],'source');
 const blanket=doc.querySelector('#blanket-explorer>details');
 if(blanket){blanket.open=true;group(panels.plots,['2'],['#blanket-explorer'],'blanket');}
 group(panels.controls,['4'],['.replay-controls']);
 group(stage,['4'],['.research-bench']);
 // Keep the original chooser and its listeners visible while model settings are closed.
 const mechanism=group(shell,['3'],['.system-bar label','#system']);mechanism.classList.add('world-context');
 mechanism.querySelector('label').classList.add('visually-hidden');
 mechanism.querySelector('select').setAttribute('aria-label','Separation mechanism');
 // The recording viewer is data, not a simulated apparatus.
 const context=make('div','world-context'),switcher=make('select','');switcher.id='marathon-apparatus';switcher.setAttribute('aria-label','Marathon apparatus');
 for(const [value,label]of [['centrifuge','Centrifuge'],['source','Beam target'],['blanket','Future blanket']]){const option=make('option','',label);option.value=value;switcher.append(option);}
 context.append(switcher);shell.append(context);
 switcher.addEventListener('change',()=>{marathon=switcher.value;refresh();});
 function refresh(){
  shell.dataset.level=level;shell.dataset.context=marathon;context.hidden=level!=='2';
  for(const {wrapper,levels,context}of groups)wrapper.hidden=!levels.includes(level)||(!!context&&context!==marathon);
  const allowed=level==='4'?['controls']:level==='2'?(marathon==='source'?['controls','plots','target','inspect','info']:marathon==='centrifuge'?['controls','plots','inspect','view','info']:['plots','inspect']):level==='1'?['controls','plots','inspect','view']:['controls','plots','inspect','view','info'];
  for(const [key,{button}]of windows){const available=allowed.includes(key)&&(key!=='view'||level==='2'&&marathon==='centrifuge'||!doc.querySelector('.viewport-tools').hidden);if(!available)close(key);button.hidden=!available;}
  if(doc.activeElement?.closest('[hidden]'))(context.hidden?[...windows.values()].find(item=>!item.button.hidden)?.button:switcher)?.focus();
  arrange();
  onContextChange({level,marathon});
 }
 const onMobile=()=>{if(mobile.matches){let kept=false;for(const [key,{panel}]of windows)if(!panel.hidden){if(kept)close(key);kept=true;}}arrange();};
 mobile.addEventListener('change',onMobile);
 doc.defaultView.addEventListener('resize',arrange);
 if(doc.defaultView.ResizeObserver)new doc.defaultView.ResizeObserver(arrange).observe(dock);
 doc.body.classList.add('immersive');
 // Everything interactive was moved into the workspace before hiding the document shell.
 originalMain.hidden=true;refresh();
 return {open,close,focusRelated(key,selector){
  open(key,true);const item=windows.get(key);if(!item||item.panel.hidden)return;
  const node=selector?item.body.querySelector(selector):null;
  if(node){for(let parent=node.parentElement;parent&&parent!==item.body;parent=parent.parentElement)if(parent.tagName==='DETAILS')parent.open=true;node.scrollIntoView?.({block:'nearest'});node.focus?.({preventScroll:true});}
 },refreshMode:refresh,setLevel(next){for(const key of windows.keys())close(key);level=next;refresh();}};
}
