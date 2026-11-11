import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {setupWorkspace} from '../src/workspace-ui.js';
import {setupExperience} from '../src/experience-ui.js';
import {setupApparatus} from '../src/apparatus-ui.js';
import {setupComponentInspectors} from '../src/component-inspector.js';
import {fusionComponents} from '../src/component-catalog.ts';
import {setupBlanketExplorer} from '../src/blanket-ui.js';
import {blanketComponents} from '../src/blanket-reference.ts';
import {setupMarathonModels} from '../src/marathon-ui.js';
import {simulateCoupledTarget} from '../src/coupled-target.ts';
import {defaultWorkspaceLayout,workspaceLayoutKey} from '../src/workspace-layout.js';
import * as THREE from 'three';

function fixture(t:any,mobile=false,storage?:any){
 const {window}=new JSDOM(readFileSync('index.html','utf8'),{url:'https://example.com/?level=2'});const {document}=window;
 const globals={document,location:window.location,history:window.history,IntersectionObserver:class{observe(){}disconnect(){}}};
 for(const [key,value]of Object.entries(globals)){
  const previous=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{value,configurable:true});
  t.after(()=>{if(previous)Object.defineProperty(globalThis,key,previous);else Reflect.deleteProperty(globalThis,key);});
 }
 let resize:()=>void=()=>{};
 const media={matches:mobile,addEventListener(_type:string,callback:()=>void){resize=callback;}};
 const before=[...document.querySelectorAll('button,input,select')];let workspace:any;
 const model=setupApparatus(document.getElementById('model-apparatus'),{onInspect:()=>workspace?.open('inspect')});model.show('centrifuge');
 const inspectors=setupComponentInspectors({THREE,canvas:document.getElementById('scene'),getHardware:()=>null,getCamera:()=>null,canPick:()=>false,onInspect:()=>workspace?.open('inspect')});
 setupApparatus(document.getElementById('fusion-apparatus'),{components:fusionComponents,onSelect:id=>inspectors.fusion.select(id)}).show('beam-target');
 const blanket=setupBlanketExplorer(document.getElementById('blanket-explorer'));
 const blanketModel=setupApparatus(blanket.render,{components:blanketComponents,onInspect:()=>workspace?.open('inspect')});blanketModel.show('blanket');
 setupMarathonModels({requestTarget:async(request:any)=>simulateCoupledTarget(request.beam,request.config)});
 const allInputs=[...document.querySelectorAll('button,input,select')];
 workspace=setupWorkspace({document,matchMedia:()=>media,storage});
 // These existing tests exercise the beam-target workflow, now selected explicitly.
 const apparatus=document.getElementById('marathon-apparatus') as HTMLSelectElement;apparatus.value='source';apparatus.dispatchEvent(new window.Event('change'));
 const node=(id:string)=>document.getElementById(id)!;
 return {document,window,workspace,node,before,allInputs,media,resize,model,blanketModel,inspectors,setLevel(level:string){document.body.dataset.level=level;workspace.setLevel(level);}};
}

test('boot moves every existing control into the workspace without replacing controls or event state',t=>{
 const f=fixture(t);const shell=f.document.querySelector('.sim-workspace')!;
 for(const node of f.allInputs)assert.ok(shell.contains(node),`control left in hidden document: ${node.id||node.textContent}`);
 for(const node of f.before)assert.ok(f.document.contains(node));
 const field=f.node('field');let events=0;field.addEventListener('input',()=>events++);field.value='0.17';
 for(const level of ['2','3','4','1'])f.setLevel(level);
 assert.equal(f.node('field'),field);assert.equal(field.value,'0.17');field.dispatchEvent(new f.window.Event('input'));assert.equal(events,1);
 assert.equal(f.document.querySelector('main')!.hidden,true);
 assert.equal(f.document.querySelector('.world-stage #stage')?.getAttribute('id'),'stage');
 assert.equal(f.document.querySelector('.world-stage #fusion-apparatus')?.getAttribute('id'),'fusion-apparatus');
});

test('nonmodal desktop panels preserve scene access, opposite windows and keyboard focus',t=>{
 const f=fixture(t);f.workspace.open('controls',true);f.workspace.open('plots');
 assert.equal(f.node('window-controls').hidden,false);assert.equal(f.node('window-plots').hidden,false);
 assert.equal(f.document.activeElement,f.node('window-title-controls'));
 f.workspace.open('view');assert.equal(f.node('window-controls').hidden,true);assert.equal(f.node('window-plots').hidden,false);
 const event=new f.window.Event('keydown',{bubbles:true,cancelable:true});Object.defineProperty(event,'key',{value:'Escape'});
 f.node('window-view').dispatchEvent(event);assert.equal(f.node('window-view').hidden,true);
 assert.equal(f.document.activeElement,f.document.querySelector('[aria-controls="window-view"]'));
 assert.equal(f.document.querySelectorAll('[aria-modal=true]').length,0);
});

test('mobile opens one sheet; resizing from desktop closes overlapping windows',t=>{
 const f=fixture(t);f.workspace.open('controls');f.workspace.open('plots');
 f.media.matches=true;f.resize();assert.equal([...f.document.querySelectorAll('.world-window')].filter(p=>!p.hidden).length,1);
 f.workspace.open('plots');f.workspace.open('controls');
 assert.equal(f.node('window-plots').hidden,true);assert.equal(f.node('window-controls').hidden,false);
 f.workspace.open('plots');assert.equal(f.node('window-controls').hidden,true);
});

test('level and Marathon scene changes close incompatible panels and keep separate physical models',t=>{
 const f=fixture(t);f.setLevel('2');f.workspace.open('target');assert.equal(f.node('window-target').hidden,false);
 const select=f.document.querySelector('[aria-label="Marathon apparatus"]')!;
 select.value='blanket';select.dispatchEvent(new f.window.Event('change'));
 assert.equal(f.node('window-target').hidden,true);assert.equal(f.document.querySelector('[aria-controls="window-target"]')!.hidden,true);
 assert.equal(f.node('fusion-apparatus').parentElement!.hidden,true);assert.equal(f.node('blanket-render').parentElement!.hidden,false);
 f.workspace.open('plots');assert.equal(f.node('blanket-explorer').parentElement!.hidden,false);
 f.setLevel('4');assert.equal(f.node('window-plots').hidden,true);assert.equal(f.document.querySelector('.research-bench')!.parentElement!.hidden,false);
 f.setLevel('2');select.value='source';select.dispatchEvent(new f.window.Event('change'));assert.equal(f.node('fusion-apparatus').parentElement!.hidden,false);
});

test('component selection opens its persistent inspector and shows material without replacing the stage',t=>{
 const f=fixture(t);f.setLevel('2');const stage=f.node('fusion-apparatus');f.inspectors.fusion.select('target');
 assert.equal(f.node('window-inspect').hidden,false);assert.match(f.node('fusion-inspector').textContent!,/tritium/i);
 assert.ok(f.node('fusion-inspector').querySelector('.component-description')!.textContent!.length>60);
 assert.equal(f.node('fusion-apparatus'),stage);
 const select=f.document.querySelector('[aria-label="Marathon apparatus"]')!;select.value='blanket';select.dispatchEvent(new f.window.Event('change'));
 f.blanketModel.select('breeder');assert.equal(f.node('window-inspect').hidden,false);assert.match(f.node('window-inspect').textContent!,/FLiBe/);
 f.setLevel('3');f.model.select('vessel');assert.equal(f.node('window-inspect').hidden,false);
});

test('real navigation drives the workspace from an initial deep link through all four playgrounds',t=>{
 const f=fixture(t);setupExperience({selectMode(){},invalidate(){},showView(){},showResearch(){},onLevelChange:level=>f.workspace.setLevel(level)});
 assert.equal(f.document.body.dataset.level,'2');assert.equal(f.node('fusion-apparatus').parentElement!.hidden,false);
 for(const level of ['3','4','1','2']){
  f.document.querySelector(`button[data-level="${level}"]`)!.click();
  assert.equal(f.document.querySelector('.sim-workspace')!.getAttribute('data-level'),level);
  assert.equal(f.document.body.dataset.level,level);
 }
});

test('playground navigation lives beside the brand and stays available in every playground',t=>{
 const f=fixture(t,true),header=f.document.querySelector('.world-top .masthead')!;
 const brand=header.querySelector('.brand')!,navigation=header.querySelector('.level-navigation')!;
 assert.equal(brand.textContent,'Mass Spinner');assert.equal(brand.nextElementSibling,navigation);
 assert.equal(f.document.querySelectorAll('.level-navigation').length,1);
 assert.equal(navigation.querySelectorAll('button[data-level]').length,4);
 const styles=['style','component-inspector','apparatus','marathon-layout','target-exposure','target-loading','minimal','workspace','coupled-target'];
 for(const file of styles){
  const style=f.document.createElement('style');style.textContent=readFileSync(`src/${file}.css`,'utf8');f.document.head.append(style);
 }
 setupExperience({selectMode(){},invalidate(){},showView(){},showResearch(){},onLevelChange:level=>f.workspace.setLevel(level)});
 for(const level of ['1','2','3','4']){
  const button=navigation.querySelector<HTMLButtonElement>(`button[data-level="${level}"]`)!;button.click();
  assert.equal(f.document.body.dataset.level,level);assert.equal(button.getAttribute('aria-pressed'),'true');
  assert.equal(f.window.getComputedStyle(navigation).display,'flex');
 }
 assert.equal(parseFloat(f.window.getComputedStyle(brand).letterSpacing),0);
 assert.equal(f.window.getComputedStyle(header).flexWrap,'nowrap');
 assert.equal(f.window.getComputedStyle(navigation).overflowX,'auto');
 // JSDOM has no layout engine: inspect the mobile cascade without claiming pixel verification.
 const sheet=f.document.styleSheets[styles.indexOf('workspace')];
 const mobile=[...sheet.cssRules].find(rule=>'conditionText' in rule&&String(rule.conditionText).replace(/\s/g,'')==='(max-width:740px)') as CSSMediaRule;
 assert.ok(mobile);
 for(const rule of [...mobile.cssRules] as CSSStyleRule[]){
  if(rule.selectorText==='.world-top')assert.notEqual(rule.style.display,'block');
  if(rule.selectorText==='.world-top header.masthead')assert.notEqual(rule.style.flexWrap,'wrap');
 }
});

test('interface typography has no tracked capitals',()=>{
 for(const file of ['style','minimal','workspace','coupled-target']){
  const css=readFileSync(`src/${file}.css`,'utf8');
  for(const match of css.matchAll(/letter-spacing\s*:\s*([+-]?[\d.]+)(?:em|px|rem)/g))assert.ok(Number(match[1])<=0,file);
  assert.doesNotMatch(css,/text-transform\s*:\s*uppercase/);
 }
});

test('mode-specific hidden controls stay hidden under the actual window stylesheet',t=>{
 const f=fixture(t);const style=f.document.createElement('style');style.textContent=readFileSync('src/workspace.css','utf8');f.document.head.append(style);
 const cutoff=f.document.querySelector('.cutoff-readout')!;
 cutoff.hidden=true;assert.equal(f.window.getComputedStyle(cutoff).display,'none');
 cutoff.hidden=false;assert.equal(f.window.getComputedStyle(cutoff).display,'block');
 f.workspace.open('controls');f.workspace.close('controls');assert.equal(f.window.getComputedStyle(f.node('window-controls')).display,'none');
});

test('mobile dismissal closes the sheet and returns focus to its dock button',t=>{
 const f=fixture(t,true);f.workspace.open('controls',true);
 f.document.querySelector('[aria-label="Close Controls"]')!.click();
 assert.equal(f.node('window-controls').hidden,true);
 const button=f.document.querySelector('[aria-controls="window-controls"]')!;
 assert.equal(button.getAttribute('aria-expanded'),'false');assert.equal(f.document.activeElement,button);
});

test('changing to a model without orbital view controls removes and closes the View action',t=>{
 const f=fixture(t);f.setLevel('3');f.workspace.open('view');assert.equal(f.node('window-view').hidden,false);
 f.document.querySelector('.viewport-tools')!.hidden=true;f.workspace.refreshMode();
 assert.equal(f.node('window-view').hidden,true);assert.equal(f.document.querySelector('[aria-controls="window-view"]')!.hidden,true);
 f.workspace.open('view');assert.equal(f.node('window-view').hidden,true);
 f.document.querySelector('.viewport-tools')!.hidden=false;f.workspace.refreshMode();
 assert.equal(f.document.querySelector('[aria-controls="window-view"]')!.hidden,false);
});

test('desktop compares target, neutron results and original controls in bounded independent tiles',t=>{
 const f=fixture(t);f.setLevel('2');
 const beam=f.node('fusion-beamEnergyKeV'),target=f.node('coupled-target');
 f.workspace.open('controls');f.workspace.open('target');f.workspace.open('plots');
 for(const key of ['controls','target','plots'])assert.equal(f.node(`window-${key}`).hidden,false,key);
 assert.equal(f.node('coupled-target'),target);assert.equal(f.node('fusion-beamEnergyKeV'),beam);
 const shell=f.document.querySelector<HTMLElement>('.sim-workspace')!;
 const reserved=['left','right'].map(side=>parseFloat(shell.style.getPropertyValue(`--world-${side}-reserve`)));
 assert.ok(reserved[0]+reserved[1]<=f.window.innerWidth*.68+2,'scene retains at least 32% of viewport');
 const split=f.document.querySelector<HTMLElement>('[aria-label="Resize results and target"]')!;
 assert.equal(split.hidden,false);assert.equal(split.getAttribute('aria-orientation'),'horizontal');
 f.workspace.open('info');assert.equal(f.node('window-plots').hidden,true);assert.equal(f.node('window-target').hidden,false);
 f.workspace.close('target');assert.equal(split.hidden,true);
});

test('window geometry supports keyboard resizing, guarded persistence and reset without saving simulation data',t=>{
 const data=new Map<string,string>(),storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>data.set(key,value),removeItem:(key:string)=>data.delete(key)};
 const f=fixture(t,false,storage);f.setLevel('2');f.workspace.open('controls');f.workspace.open('target');f.workspace.open('plots');
 const left=f.document.querySelector<HTMLElement>('[aria-label="Resize left windows"]')!;
 const width=Number(left.getAttribute('aria-valuenow'));
 left.dispatchEvent(new f.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
 assert.ok(Number(left.getAttribute('aria-valuenow'))>width);
 const split=f.document.querySelector<HTMLElement>('[aria-label="Resize results and target"]')!;
 split.dispatchEvent(new f.window.KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}));
 assert.equal(split.getAttribute('aria-valuenow'),'55');
 const saved=JSON.parse(data.get(workspaceLayoutKey)!);assert.deepEqual(Object.keys(saved).sort(),['left','right','split','version']);
 const second=fixture(t,false,storage);second.setLevel('2');second.workspace.open('target');second.workspace.open('plots');
 assert.equal(second.document.querySelector('[aria-label="Resize results and target"]')!.getAttribute('aria-valuenow'),'55');
 const input=second.node('field');input.value='0.17';
 second.document.querySelector<HTMLButtonElement>('[aria-label="Reset window layout"]')!.click();
 assert.equal(data.has(workspaceLayoutKey),false);assert.equal(input.value,'0.17');
 assert.equal(second.document.querySelector('[aria-label="Resize results and target"]')!.getAttribute('aria-valuenow'),String(defaultWorkspaceLayout.split*100));
});

test('splitter pointer movement uses pixel geometry even for fractional pixels and stops after release',t=>{
 const f=fixture(t);f.setLevel('2');f.workspace.open('target');f.workspace.open('plots');
 const split=f.document.querySelector<HTMLElement>('[aria-label="Resize results and target"]')!;
 split.getBoundingClientRect=()=>({height:12} as DOMRect);
 const rail=split.parentElement!;rail.getBoundingClientRect=()=>({height:512} as DOMRect);
 const pointer=(type:string,y:number)=>split.dispatchEvent(new f.window.MouseEvent(type,{button:0,clientY:y,bubbles:true,cancelable:true}));
 pointer('pointerdown',100);pointer('pointermove',100.5);
 assert.equal(split.getAttribute('aria-valuenow'),'50');
 pointer('pointermove',150);assert.equal(split.getAttribute('aria-valuenow'),'60');
 pointer('pointerup',150);pointer('pointermove',300);assert.equal(split.getAttribute('aria-valuenow'),'60');
});

test('mobile comparison collapses to one sheet and removes desktop geometry reservations and resize focus targets',t=>{
 const f=fixture(t);f.setLevel('2');for(const key of ['controls','target','plots'])f.workspace.open(key);
 const resizer=f.document.querySelector<HTMLElement>('[aria-label="Resize results and target"]')!;resizer.focus();
 f.media.matches=true;f.resize();
 assert.equal([...f.document.querySelectorAll<HTMLElement>('.world-window')].filter(node=>!node.hidden).length,1);
 for(const side of ['left','right']){
  assert.equal(f.document.querySelector<HTMLElement>('.sim-workspace')!.style.getPropertyValue(`--world-${side}-reserve`),'0px');
  assert.equal(f.document.querySelector<HTMLElement>(`[aria-label="Resize ${side} windows"]`)!.hidden,true);
 }
 assert.ok(!f.document.activeElement?.closest('[hidden]'),'focus leaves the hidden desktop resizer');
 f.workspace.focusRelated('target','#coupled-duration');assert.equal(f.node('window-controls').hidden,true);assert.equal(f.node('window-target').hidden,false);
});

test('Escape on a resizer dismisses its rail, and unavailable actions cannot strand keyboard focus',t=>{
 const f=fixture(t);f.setLevel('2');f.workspace.open('target');f.workspace.open('plots');
 const handle=f.document.querySelector<HTMLElement>('[aria-label="Resize right windows"]')!;handle.focus();
 handle.dispatchEvent(new f.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
 assert.equal(f.node('window-target').hidden,true);assert.equal(f.node('window-plots').hidden,true);
 assert.equal(f.document.activeElement,f.document.querySelector('[aria-controls="window-target"]'));
 f.setLevel('3');f.workspace.open('view',true);f.document.querySelector<HTMLElement>('.viewport-tools')!.hidden=true;f.workspace.refreshMode();
 assert.ok(!f.document.activeElement?.closest('[hidden]'),'removing View moves focus to a visible action');
});
