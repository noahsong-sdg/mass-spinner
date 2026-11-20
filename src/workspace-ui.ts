import {clamp,defaultWorkspaceLayout,readWorkspaceLayout,workspaceGeometry,workspaceLayoutKey,type WorkspaceStorage} from './workspace-layout.js';
import {tutorialPresentation} from './tutorial-presentation.js';
import {setupPlaygroundGuide} from './playground-guide.js';

import type {ExperienceLevel} from './experience-state.js';
export type WorkspaceWindowKey='controls'|'plots'|'target'|'inspect'|'view'|'info'|'guide';
type Side='left'|'right';
type WorkspaceWindow={panel:HTMLElement;button:HTMLButtonElement;body:HTMLDivElement;heading:HTMLHeadingElement;side:Side;group:string};
export type WorkspaceOptions={document?:Document;matchMedia?:Window['matchMedia'];storage?:WorkspaceStorage|null;onContextChange?:(context:{level:ExperienceLevel;marathon:string})=>void};

/** Reuse the live simulation nodes: opening a window never rebuilds its controls. */
export function setupWorkspace({document:doc=document,matchMedia=window.matchMedia.bind(window),storage,onContextChange=()=>{}}:WorkspaceOptions={}){
 const make=<K extends keyof HTMLElementTagNameMap>(tag:K,cls:string,text?:string)=>{const el=doc.createElement(tag);el.className=cls;if(text)el.textContent=text;return el;};
 const win=doc.defaultView!;
 const originalMain=doc.querySelector('main')!;
 const shell=make('main','sim-workspace'),top=make('div','world-top'),stage=make('div','world-stage'),dock=make('nav','world-dock');
 shell.setAttribute('aria-labelledby','level-title');
 dock.setAttribute('aria-label','Simulation windows');
 const header=doc.querySelector<HTMLElement>('.masthead')!,navigation=doc.querySelector<HTMLElement>('.level-navigation')!,heading=doc.querySelector<HTMLElement>('#level-title')!;
 header.append(navigation);
 top.append(header,doc.querySelector<HTMLElement>('.learning-path')!);
 shell.append(heading,top,stage,dock);doc.body.append(shell);
 let level:ExperienceLevel='1',marathon='centrifuge';
 const windows=new Map<string,WorkspaceWindow>(),groups:{wrapper:HTMLDivElement;levels:readonly ExperienceLevel[];context?:string}[]=[];
 // Both rails and handles are constructed before refresh or any resize callback runs.
 const rails={} as Record<Side,HTMLDivElement>,handles={} as Record<Side,HTMLDivElement>;
 const mobile=matchMedia('(max-width: 740px)');
 // Storage can be unavailable in private/embedded browsing; geometry remains usable.
 if(storage===undefined)try{storage=win.localStorage;}catch{storage=null;}
 let layout=readWorkspaceLayout(storage);
 const persist=()=>{try{storage?.setItem(workspaceLayoutKey,JSON.stringify(layout));}catch{}};
 const reset=make('button','world-layout-reset','↺');reset.type='button';reset.setAttribute('aria-label','Reset window layout');
 reset.addEventListener('click',()=>{layout={...defaultWorkspaceLayout};try{storage?.removeItem(workspaceLayoutKey);}catch{}arrange();});
 const isOpen=(side:Side)=>[...windows.entries()].some(([key,item])=>key!=='guide'&&item.side===side&&!item.panel.hidden);
 function arrange(){
  const dockHeight=dock.getBoundingClientRect().height;
  if(dockHeight>0)shell.style.setProperty('--world-bottom',`${Math.ceil(dockHeight+(parseFloat(win.getComputedStyle(dock).bottom)||0)+12)}px`);
  const tutorial=!windows.get('guide')?.panel.hidden;shell.classList.toggle('tutorial-open',tutorial);
  const leftOpen=isOpen('left'),rightOpen=isOpen('right'),width=win.innerWidth;
  shell.classList.toggle('tutorial-deck',tutorial&&(leftOpen||rightOpen));shell.classList.toggle('tutorial-pair',leftOpen&&rightOpen);
  const sizes=workspaceGeometry(layout,width,leftOpen,rightOpen);
  for(const side of ['left','right'] as const){
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
 function separator(label:string,orientation:'vertical'|'horizontal',change:(delta:number|'min'|'max',input:'keyboard'|'pointer')=>void){
  const handle=make('div',`world-resizer world-resizer-${orientation}`);handle.tabIndex=0;handle.setAttribute('role','separator');
  handle.setAttribute('aria-label',label);handle.setAttribute('aria-orientation',orientation);handle.setAttribute('aria-valuemin','20');handle.setAttribute('aria-valuemax','80');
  handle.title='Drag or use the arrow keys to change the size. Home and End select the limits.';
  handle.addEventListener('keydown',event=>{
   if(event.key==='Escape'){
    event.preventDefault();if(handle.parentElement?.id==='window-guide'){close('guide',true);return;}
    const side=handle.parentElement===rails.left?'left':'right';
    for(const [key,item]of windows)if(item.side===side)close(key,true);return;
   }
   const delta:Record<string,number>=orientation==='vertical'?{ArrowLeft:-24,ArrowRight:24}:{ArrowUp:-.05,ArrowDown:.05};
   if(event.key in delta||event.key==='Home'||event.key==='End'){
    event.preventDefault();change(event.key==='Home'?'min':event.key==='End'?'max':delta[event.key],'keyboard');persist();
   }
  });
  handle.addEventListener('pointerdown',event=>{
   if(event.button!==0)return;event.preventDefault();handle.focus();handle.setPointerCapture?.(event.pointerId);
   let position=orientation==='vertical'?event.clientX:event.clientY;
   const move=(next:PointerEvent)=>{const at=orientation==='vertical'?next.clientX:next.clientY;change(at-position,'pointer');position=at;};
   const finish=()=>{handle.removeEventListener('pointermove',move);for(const type of ['pointerup','pointercancel','lostpointercapture'] as const)handle.removeEventListener(type,finish);persist();};
   handle.addEventListener('pointermove',move);for(const type of ['pointerup','pointercancel','lostpointercapture'] as const)handle.addEventListener(type,finish);
  });return handle;
 }
 for(const side of ['left','right'] as const){
  const rail=make('div',`world-rail world-rail-${side}`);rail.hidden=true;rails[side]=rail;
  handles[side]=separator(`Resize ${side} windows`,'vertical',delta=>{
   const width=win.innerWidth,current=workspaceGeometry(layout,width,isOpen('left'),isOpen('right'))[side];
   layout[side]=delta==='min'?.15:delta==='max'?.5:clamp((current+delta*(side==='right'?-1:1))/width,.15,.5);arrange();
  });rail.append(handles[side]);shell.append(rail);
 }
 const split=separator('Resize results and target','horizontal',(delta,input)=>{
  const height=Math.max(1,rails.right.getBoundingClientRect().height-12);
  layout.split=delta==='min'?.2:delta==='max'?.8:clamp(layout.split+(input==='keyboard'?delta:delta/height),.2,.8);arrange();
 });split.classList.add('world-results-split');split.hidden=true;rails.right.append(split);
 function close(key:string,restore=false){
  const item=windows.get(key);if(!item||item.panel.hidden)return;
  const focused=item.panel.contains(doc.activeElement);item.panel.hidden=true;item.button.setAttribute('aria-expanded','false');
  arrange();
  if(restore||focused)(key==='guide'?docsButton:item.button).focus();
 }
 function open(key:string,focus=false){
  const item=windows.get(key);if(!item||item.button.hidden)return;
  for(const [other,entry]of windows)if(other!==key&&other!=='guide'&&key!=='guide'&&(mobile.matches&&windows.get('guide')!.panel.hidden||entry.group===item.group))close(other);
  item.panel.hidden=false;item.button.setAttribute('aria-expanded','true');
  arrange();
  if(focus)item.heading.focus();
 }
 function windowPanel(key:WorkspaceWindowKey,title:string,side:Side){
  const panel=make('section',`world-window world-${side}`),bar=make('div','world-window-bar'),heading=make('h2','',title),dismiss=make('button','world-close','×'),body=make('div','world-window-body'),button=make('button','',title);
  panel.id=`window-${key}`;heading.id=`window-title-${key}`;heading.tabIndex=-1;
  panel.setAttribute('aria-labelledby',heading.id);dismiss.type='button';dismiss.setAttribute('aria-label',`Close ${title}`);
  button.type='button';button.setAttribute('aria-controls',panel.id);button.setAttribute('aria-expanded','false');
  button.addEventListener('click',()=>{if(key==='guide')guide.showReader();else if(panel.hidden)open(key,true);else close(key,true);});dismiss.addEventListener('click',()=>close(key,true));
  panel.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();close(key,true);}});
  bar.append(heading,dismiss);panel.append(bar,body);panel.hidden=true;rails[side].append(panel);if(key!=='guide')dock.append(button);
  windows.set(key,{panel,button,body,heading,side,group:key==='target'?'target':side});return body;
 }
 const panels={controls:windowPanel('controls','Controls','left'),plots:windowPanel('plots','Plots','right'),target:windowPanel('target','Target','right'),inspect:windowPanel('inspect','Examine','left'),view:windowPanel('view','View','left'),info:windowPanel('info','Model info','right'),guide:windowPanel('guide','Tutorials','left')};
 const reading=make('div','world-reading'),docsButton=make('button','','Docs & tutorials');
 docsButton.id='open-docs';docsButton.type='button';docsButton.setAttribute('aria-label','Docs & tutorials');docsButton.title='Read beside the live simulator';docsButton.setAttribute('aria-controls','window-guide');
 docsButton.addEventListener('click',()=>{if(windows.get('guide')!.panel.hidden)guide.showReader();else close('guide',true);});
 reading.append(docsButton);header.append(reading);
 const guide=setupPlaygroundGuide({document:doc,host:panels.guide,open,close,focusRelated,canUseApparatus:apparatus=>level==='2'&&marathon===apparatus,present});
 const tutorialPanel=windows.get('guide')!.panel;shell.append(tutorialPanel);
 const readFull=make('a','','Reading page ↗');readFull.href='/learn.html';readFull.target='_blank';readFull.rel='noopener';
 const readerFrame=panels.guide.querySelector<HTMLIFrameElement>('iframe')!;
 const syncReadingPage=()=>{const path=readerFrame.contentDocument?.location;readFull.href=path?path.pathname+path.hash:'/learn.html';};
 readerFrame.addEventListener('load',syncReadingPage);readFull.addEventListener('click',syncReadingPage);
 tutorialPanel.querySelector('.world-window-bar')!.append(readFull);
 let readerWidth=.4;const readerHandle=separator('Resize tutorial and simulator','vertical',delta=>{readerWidth=delta==='min'?.28:delta==='max'?.6:clamp(readerWidth+delta/win.innerWidth,.28,.6);shell.style.setProperty('--tutorial-width',`${readerWidth*100}vw`);readerHandle.setAttribute('aria-valuenow',String(Math.round(readerWidth*100)));win.dispatchEvent(new win.Event('resize'));});
 readerHandle.setAttribute('aria-valuemin','28');readerHandle.setAttribute('aria-valuemax','60');readerHandle.setAttribute('aria-valuenow','40');tutorialPanel.append(readerHandle);
 const cue=make('aside','tutorial-focus'),watch=make('p',''),note=make('p',''),stages=make('div','tutorial-drive-stages');cue.hidden=true;cue.setAttribute('aria-label','What to watch');cue.append(watch,note,stages);shell.append(cue);const dismissCue=make('button','tutorial-focus-close','×');dismissCue.type='button';dismissCue.setAttribute('aria-label','Close learning prompt');dismissCue.addEventListener('click',()=>{cue.hidden=true;});cue.append(dismissCue);
 for(const [label,layer,text]of [['Field','B','The magnetic field points along the cylinder axis.'],['Current','J','Current crosses the gas toward the inner electrode.'],['Force','force','Current across the field gives a tangential force.'],['Gas','all','Collisions transfer rotation from ions to neutral gas.']] as const){const button=make('button','',label);button.type='button';button.addEventListener('click',()=>{const input=doc.getElementById('fuel-view-drive') as HTMLSelectElement;input.value=layer;input.dispatchEvent(new win.Event('change'));note.textContent=text;for(const sibling of stages.querySelectorAll('button'))sibling.setAttribute('aria-pressed',String(sibling===button));});stages.append(button);}
 const replay=make('button','','Replay motion');replay.type='button';replay.addEventListener('click',()=>guide.launch('spin'));stages.append(replay);
 function present(key:string){
  for(const name of ['controls','plots','target','inspect','view','info'])close(name);
  const view=tutorialPresentation(key);cue.hidden=!view;if(!view)return;watch.textContent=view.watch;note.textContent=view.note;stages.hidden=key!=='look';
  for(const button of stages.querySelectorAll('button'))button.setAttribute('aria-pressed',String(button.textContent==='Gas'));
 }

 dock.append(reset);
 const methods=make('a','world-methods','?');methods.href='/how-it-works.html';methods.target='_blank';methods.rel='noopener';methods.setAttribute('aria-label','How Mass Spinner works');methods.title='How Mass Spinner works';dock.append(methods);
 function group(parent:HTMLElement,levels:readonly ExperienceLevel[],selectors:readonly string[],context?:string){
  const wrapper=make('div','world-group');wrapper.dataset.levels=levels.join(' ');if(context)wrapper.dataset.context=context;
  for(const selector of selectors){const node=doc.querySelector(selector);if(node)wrapper.append(node);}
  parent.append(wrapper);groups.push({wrapper,levels,context});return wrapper;
 }
 group(stage,['1','3'],['#stage']);
 group(stage,['2'],['#fusion-apparatus'],'source');
 group(stage,['2'],['#blanket-render'],'blanket');
 group(stage,['2'],['#fuel-render'],'centrifuge');
 for(const key of ['controls','plots','inspect','view','info'] as const)group(panels[key],['2'],[`#fuel-${key}`],'centrifuge');
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
 const role=make('details','world-component-role');role.append(make('summary','','Component role'),doc.querySelector<HTMLElement>('#fusion-inspector')!);sourceInspect.append(role);
 group(panels.inspect,['2'],['#blanket-render .apparatus-toolbar','#blanket-render .component-description'],'blanket');
 for(const inspector of panels.inspect.querySelectorAll<HTMLDetailsElement>('.component-inspector'))inspector.open=true;
 group(panels.info,['2'],['.live-schematic','#fusion-lab>.fusion-model-notes'],'source');
 const blanket=doc.querySelector<HTMLDetailsElement>('#blanket-explorer>details');
 if(blanket){blanket.open=true;group(panels.plots,['2'],['#blanket-explorer'],'blanket');}
 group(panels.controls,['4'],['.replay-controls']);
 group(stage,['4'],['.research-bench']);
 // Keep the original chooser and its listeners visible while model settings are closed.
 const mechanism=group(shell,['3'],['.system-bar label','#system']);mechanism.classList.add('world-context');
 mechanism.querySelector('label')!.classList.add('visually-hidden');
 mechanism.querySelector('select')!.setAttribute('aria-label','Separation mechanism');
 // The recording viewer is data, not a simulated apparatus.
 const context=make('div','world-context world-reactor-context'),label=make('label','visually-hidden','Marathon systems'),switcher=make('select','');switcher.id='marathon-apparatus';switcher.setAttribute('aria-label','Marathon apparatus');label.htmlFor=switcher.id;
 for(const [value,label]of [['centrifuge','Centrifuge'],['source','Beam reactor'],['blanket','Power reactor · reference']]){const option=make('option','',label);option.value=value;switcher.append(option);}
 context.append(label,switcher);shell.append(context);
 switcher.addEventListener('change',()=>{marathon=switcher.value;refresh();});
 function refresh(){
  shell.dataset.level=level;shell.dataset.context=marathon;
  context.hidden=level!=='2'||marathon==='centrifuge';
  for(const {wrapper,levels,context}of groups)wrapper.hidden=!levels.includes(level)||(!!context&&context!==marathon);
  const allowed=level==='4'?['controls']:level==='2'?(marathon==='source'?['controls','plots','target','inspect','info']:marathon==='centrifuge'?['controls','plots','inspect','view','info','guide']:['plots','inspect']):level==='1'?['controls','plots','inspect','view']:['controls','plots','inspect','view','info'];
  for(const [key,{button}]of windows){const available=(key==='guide'||allowed.includes(key))&&(key!=='view'||level==='2'&&marathon==='centrifuge'||!doc.querySelector<HTMLElement>('.viewport-tools')!.hidden);if(!available)close(key);button.hidden=!available;}
  if(doc.activeElement?.closest('[hidden]'))(context.hidden?[...windows.values()].find(item=>!item.button.hidden)?.button:switcher)?.focus();
  arrange();
  onContextChange({level,marathon});
 }
 const onMobile=()=>{if(mobile.matches&&windows.get('guide')!.panel.hidden){let kept=false;for(const [key,{panel}]of windows)if(key!=='guide'&&!panel.hidden){if(kept)close(key);kept=true;}}arrange();};
 mobile.addEventListener('change',onMobile);
 win.addEventListener('resize',arrange);
 if(win.ResizeObserver)new win.ResizeObserver(arrange).observe(dock);
 doc.body.classList.add('immersive');
 // Everything interactive was moved into the workspace before hiding the document shell.
 originalMain.hidden=true;refresh();
 function focusRelated(key:string,selector?:string|null){
  open(key,true);const item=windows.get(key);if(!item||item.panel.hidden)return;
  const node=selector?item.body.querySelector<HTMLElement>(selector):null;
  if(node){for(let parent=node.parentElement;parent&&parent!==item.body;parent=parent.parentElement)if(parent.tagName==='DETAILS')(parent as HTMLDetailsElement).open=true;node.scrollIntoView?.({block:'nearest'});node.focus?.({preventScroll:true});}
 }
 return {open,close,focusRelated,openTutorial:guide.showReader,openPhysics(topic?:string){open('guide');guide.showPhysics(topic);},launchGuideAction:guide.launch,refreshMode:refresh,setLevel(next:ExperienceLevel){for(const key of windows.keys())close(key);level=next;refresh();}};
}
