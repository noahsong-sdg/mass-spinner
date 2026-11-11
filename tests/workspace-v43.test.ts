import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import * as THREE from 'three';
import {setupWorkspace} from '../src/workspace-ui.js';
import {setupApparatus} from '../src/apparatus-ui.js';
import {setupComponentInspectors} from '../src/component-inspector.js';
import {setupExperience} from '../src/experience-ui.js';
import {setupResearchViewer} from '../src/research-ui.js';
import {buildEngineeringGeometry} from '../src/engineering-geometry.js';
import {fusionComponents} from '../src/component-catalog.ts';
import {workspaceLayoutKey} from '../src/workspace-layout.js';

function fixture(t:any,mobile=false,stored:string|null=null){
 const dom=new JSDOM(readFileSync('index.html','utf8'),{url:'https://example.org/?level=3'}),{window}=dom,doc=window.document;
 const globals={document:doc,location:window.location,history:window.history,IntersectionObserver:class{constructor(private callback:any){}observe(){this.callback([{isIntersecting:true}]);}disconnect(){}}};
 for(const [key,value]of Object.entries(globals)){
  const previous=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{value,configurable:true});
  t.after(()=>{if(previous)Object.defineProperty(globalThis,key,previous);else Reflect.deleteProperty(globalThis,key);});
 }
 t.after(()=>window.close());
 const observers:Array<()=>void>=[];
 Object.defineProperty(window,'ResizeObserver',{value:class{constructor(callback:()=>void){observers.push(callback);}observe(){}disconnect(){}}});
 const media={matches:mobile,addEventListener(){}};
 let workspace:any,fusion:any,pick:any;
 const inspectors=setupComponentInspectors({document:doc,THREE,canvas:doc.getElementById('scene'),getHardware:()=>null,getCamera:()=>null,canPick:()=>false,
  onFusionSelect:(id:string)=>fusion?.syncSelection(id),onInspect:()=>workspace?.open('inspect')});
 fusion=setupApparatus(doc.getElementById('fusion-apparatus'),{components:fusionComponents,onSelect:(id:string)=>inspectors.fusion.select(id,false),onInspect:()=>workspace?.open('inspect'),
  viewerModuleLoader:async()=>({createApparatusViewer(_frame:any,options:any){pick=options.onSelect;return {async load(){},select(){}};}})});
 fusion.show('beam-target');
 const originalMain=doc.querySelector('main'),heading=doc.getElementById('level-title'),system=doc.getElementById('system');
 workspace=setupWorkspace({document:doc,matchMedia:()=>media,storage:{getItem(key:string){assert.equal(key,workspaceLayoutKey);return stored;}}});
 return {doc,window,workspace,fusion,inspectors,originalMain,heading,system,observers,pick:(...args:any[])=>pick(...args)};
}

for(const mobile of [false,true])test(`physical beam-part readout stays primary after real workspace relocation (${mobile?'mobile':'desktop'})`,async t=>{
 const f=fixture(t,mobile);f.workspace.setLevel('2');
 const apparatus=f.doc.getElementById('marathon-apparatus') as HTMLSelectElement;apparatus.value='source';apparatus.dispatchEvent(new f.window.Event('change'));
 await new Promise(resolve=>setImmediate(resolve));
 const geometry=buildEngineeringGeometry({mode:'beam-target',beamAreaM2:1e-4,filmThicknessM:1e-6,backingThicknessM:1e-3});t.after(()=>geometry.dispose());
 const readout=f.fusion.readout;
 assert.equal(readout.closest('#window-inspect')?.id,'window-inspect');
 assert.equal(f.doc.querySelector('#fusion-apparatus .component-description'),null);
 for(const name of ['Extraction electrode','RF induction winding','Vacuum flange','LiT film','Target backing']){
  const part=geometry.group.getObjectByName(name)!;
  f.pick(part.userData.componentId,part.userData,part.name);
  assert.equal(f.doc.getElementById('window-inspect')!.hidden,false);
  assert.equal(readout.querySelector('h3')!.textContent,name);
  assert.ok(readout.textContent!.includes(part.userData.materialBasis));
  assert.ok(readout.textContent!.includes(part.userData.geometryBasis));
  assert.equal(readout.closest('details'),null,'clicked physical metadata is visible without opening generic context');
  const role=f.doc.querySelector<HTMLDetailsElement>('.world-component-role')!;
  assert.equal(role.open,false);assert.ok(role.contains(f.doc.getElementById('fusion-inspector')));
 }
 const choice=f.doc.querySelector<HTMLSelectElement>('#window-inspect .apparatus-toolbar select')!;
 choice.value='accelerator';choice.dispatchEvent(new f.window.Event('change'));
 assert.equal(readout.querySelector('h3')!.textContent,fusionComponents.find(c=>c.id==='accelerator')!.name);
 assert.doesNotMatch(readout.textContent!,/Target backing/,'generic keyboard/dropdown selection replaces the last precise part');
 assert.equal(f.fusion.readout,readout);
});

test('one named mechanism chooser remains visible and preserves its real change listener with Controls closed',t=>{
 const f=fixture(t,true);let changes=0;
 f.system!.addEventListener('change',()=>changes++);
 setupExperience({selectMode(){},invalidate(){},showView(){},showResearch(){},onLevelChange:level=>f.workspace.setLevel(level)});
 for(const value of ['icr','centrifuge','rotating']){
  f.workspace.open('controls');f.workspace.close('controls');
  const select=f.doc.querySelector<HTMLSelectElement>('[aria-label="Separation mechanism"]')!;
  assert.equal(select,f.system);assert.equal(f.doc.querySelectorAll('#system').length,1);
  assert.equal(select.closest('[hidden]'),null);assert.equal(select.closest('#window-controls'),null);
  select.value=value;select.dispatchEvent(new f.window.Event('change'));
  assert.equal(select.value,value);
 }
 assert.equal(changes,3);
 f.workspace.setLevel('4');assert.ok(f.system!.closest('[hidden]'));
 f.workspace.setLevel('3');assert.equal(f.system!.value,'rotating');assert.equal(f.system!.closest('[hidden]'),null);
});

test('the live workspace exposes one current named main landmark and reuses the existing playground heading',t=>{
 const f=fixture(t);
 const shell=f.doc.querySelector('.sim-workspace')!;
 assert.equal(shell.firstChild,f.heading,'startup captures the h1 before its learning-path parent is detached');
 assert.deepEqual([...shell.childNodes].filter(node=>node.nodeType===f.window.Node.TEXT_NODE&&node.textContent!.trim()),[],'append never stringifies an absent document query as null');
 setupExperience({selectMode(){},invalidate(){},showView(){},showResearch(){},onLevelChange:level=>f.workspace.setLevel(level)});
 for(const [level,title]of [['1','Mass Spinner'],['2','Marathon'],['3','Models'],['4','Research']]){
  f.doc.querySelector<HTMLButtonElement>(`button[data-level="${level}"]`)!.click();
  const mains=[...f.doc.querySelectorAll('main')].filter(main=>!main.closest('[hidden]'));
  assert.equal(mains.length,1);assert.ok(mains[0].classList.contains('sim-workspace'));
  assert.equal(mains[0].getAttribute('aria-labelledby'),'level-title');
  assert.equal(f.doc.querySelectorAll('h1').length,1);assert.equal(f.doc.getElementById('level-title'),f.heading);
  assert.equal(f.heading!.closest('[hidden]'),null);assert.ok(mains[0].contains(f.heading));assert.equal(f.heading!.textContent,title);
  assert.equal(mains[0].firstChild,f.heading);assert.deepEqual([...mains[0].childNodes].filter(node=>node.nodeType===f.window.Node.TEXT_NODE&&node.textContent!.trim()),[]);
  assert.equal(f.originalMain!.hidden,true);
  assert.ok([...f.doc.querySelectorAll('.world-window-bar>h2')].every(heading=>heading.tagName==='H2'));
 }
});

test('dock footprint is measured after button/context changes and ignores stale persisted layout fields',t=>{
 const f=fixture(t,false,JSON.stringify({version:0,left:900,right:900,split:900,dockHeight:9999}));
 const dock=f.doc.querySelector<HTMLElement>('.world-dock')!,shell=f.doc.querySelector<HTMLElement>('.sim-workspace')!;
 let height=52;dock.getBoundingClientRect=()=>({height} as DOMRect);
 const computed=f.window.getComputedStyle.bind(f.window);
 f.window.getComputedStyle=((node:Element)=>node===dock?{bottom:'12px'}:computed(node)) as typeof f.window.getComputedStyle;
 f.workspace.setLevel('3');assert.equal(shell.style.getPropertyValue('--world-bottom'),'76px');
 height=104;f.observers.forEach(callback=>callback());assert.equal(shell.style.getPropertyValue('--world-bottom'),'128px');
 f.workspace.open('controls');f.workspace.close('controls');assert.equal(shell.style.getPropertyValue('--world-bottom'),'128px');
 height=44;f.workspace.setLevel('4');assert.equal(shell.style.getPropertyValue('--world-bottom'),'68px');
 assert.equal(shell.style.getPropertyValue('--world-left-reserve'),'0px');
});

test('real Research tensors/distribution disclosure use shrinkable tracks, mobile stacking and local numeric scrolling',async t=>{
 const f=fixture(t,true);f.workspace.setLevel('4');
 const packet=JSON.parse(readFileSync('web-assets/research-recordings.json','utf8'));
 const distributions=JSON.parse(readFileSync('web-assets/research-depth/recorded-distributions.json','utf8'));
 const viewer=await setupResearchViewer(async(path:string)=>({ok:true,json:async()=>path.includes('recorded-distributions')?distributions:packet}));assert.ok(viewer);
 const tensors=f.doc.getElementById('replay-tensors')!;
 assert.equal(tensors.children.length,3);assert.equal(tensors.querySelectorAll('pre').length,2);
 assert.match(tensors.lastElementChild!.textContent!,/Distributions & convergence/);
 const disclosure=tensors.lastElementChild as HTMLDetailsElement;disclosure.open=true;
 (disclosure.querySelector('button') as HTMLButtonElement).click();await new Promise(resolve=>setImmediate(resolve));
 assert.ok(disclosure.querySelector('table'),'loaded convergence evidence is part of the actual Research DOM');
 const choice=f.doc.getElementById('replay-case') as HTMLSelectElement;
 choice.value=[...choice.options].sort((a,b)=>b.textContent!.length-a.textContent!.length)[0].value;choice.dispatchEvent(new f.window.Event('change'));
 const time=f.doc.getElementById('replay-time') as HTMLInputElement;time.value=time.max;time.dispatchEvent(new f.window.Event('input'));
 assert.equal(tensors.querySelectorAll('pre').length,2);assert.ok(tensors.querySelector('table'));
 for(const file of ['style','apparatus','minimal','workspace']){
  const style=f.doc.createElement('style');style.textContent=readFileSync(`src/${file}.css`,'utf8');f.doc.head.append(style);
 }
 const track=(value:string)=>value.replace(/\s/g,'').replace(/0px/g,'0');
 assert.equal(track(f.window.getComputedStyle(tensors).gridTemplateColumns),'repeat(2,minmax(0,1fr))');
 for(const child of tensors.children)assert.equal(parseFloat(f.window.getComputedStyle(child).minWidth),0);
 for(const pre of tensors.querySelectorAll('pre'))assert.equal(f.window.getComputedStyle(pre).overflowX,'auto');
 const rules=[...f.doc.styleSheets[0].cssRules];
 const responsive=rules.filter(rule=>'conditionText' in rule&&String(rule.conditionText).replace(/\s/g,'')==='(max-width:740px)') as CSSMediaRule[];
 assert.ok(responsive.some(media=>[...media.cssRules].some(rule=>(rule as CSSStyleRule).selectorText==='.replay-tensors'&&track((rule as CSSStyleRule).style.getPropertyValue('grid-template-columns'))==='minmax(0,1fr)')));
 // JSDOM checks the actual DOM and cascade contracts; root's browser gate checks pixels/zoom.
 const workspaceRules=[...f.doc.styleSheets[3].cssRules] as CSSStyleRule[];
 const overlay=workspaceRules.find(rule=>rule.selectorText==='.world-stage .apparatus-state')!;
 assert.equal(overlay.style.bottom,'var(--world-bottom)');assert.equal(overlay.style.overflow,'auto');
 assert.match(overlay.style.getPropertyValue('max-height'),/100dvh.*--world-top.*--world-bottom/);
 const mobileWorkspace=workspaceRules.find(rule=>'conditionText' in rule&&String((rule as any).conditionText).replace(/\s/g,'')==='(max-width:740px)') as unknown as CSSMediaRule;
 assert.ok([...mobileWorkspace.cssRules].some(rule=>{
  const style=rule as CSSStyleRule,selector=style.selectorText?.replace(/[\s'"]/g,'')??'';
  return selector.includes('.apparatus-provenance')&&['2','3'].every(level=>selector.includes(`[data-level=${level}]`))&&style.style.getPropertyValue('top')==='72px';
 }),'persistent chooser and provenance use separate mobile bands');
});
