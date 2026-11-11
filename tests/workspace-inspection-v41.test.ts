import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {setupApparatus} from '../src/apparatus-ui.js';
import {setupWorkspace} from '../src/workspace-ui.js';
import {appendComponentActions,componentDestination} from '../src/component-actions.js';

function fixture(t:any,mobile:boolean){
 const dom=new JSDOM(readFileSync('index.html','utf8'),{url:'https://example.org/?level=1'}),doc=dom.window.document;
 const previous=Object.getOwnPropertyDescriptor(globalThis,'IntersectionObserver');
 Object.defineProperty(globalThis,'IntersectionObserver',{configurable:true,value:class{observe(){}disconnect(){}}});
 t.after(()=>{dom.window.close();if(previous)Object.defineProperty(globalThis,'IntersectionObserver',previous);else Reflect.deleteProperty(globalThis,'IntersectionObserver');});
 let workspace:any,level='1';
 const model=setupApparatus(doc.getElementById('model-apparatus'),{onInspect:(id:string)=>{
  workspace.open('inspect');
  const destination=componentDestination(id,{level,model:'rotating'});
  appendComponentActions(model.readout,{
   parameters:()=>workspace.focusRelated(destination.panel,destination.selector),
   results:()=>workspace.focusRelated('plots'),
  });
 }});
 model.show('rotating');
 workspace=setupWorkspace({document:doc,matchMedia:()=>({matches:mobile,addEventListener(){}}),storage:null});
 return {doc,model,setLevel(next:string){level=next;doc.body.dataset.level=next;doc.body.dataset.view='render';workspace.setLevel(next);doc.getElementById('separator-inspector')!.hidden=true;}};
}

function visible(node:Element){return node.closest('[hidden]')===null;}

for(const mobile of [false,true])test(`rendered component inspection and shortcuts survive workspace reparenting (${mobile?'mobile':'desktop'})`,t=>{
 const f=fixture(t,mobile),readout=f.model.readout;
 assert.ok(readout,'apparatus exposes the persistent description independently of its parent');
 assert.equal(f.doc.querySelector('#model-apparatus .component-description'),null,'workspace really moved the readout');
 for(const level of ['1','3','1']){
  f.setLevel(level);f.model.select('coils');
  assert.equal(visible(readout),true,`component description is visible in level ${level}`);
  assert.match(readout.textContent!,/magnet|coil/i);
  const toolbar=readout.parentElement!.querySelector('.apparatus-toolbar')!;
  assert.equal(visible(toolbar),true);
  assert.equal((toolbar.querySelector('[aria-label="Focus selected component"]') as HTMLButtonElement).disabled,false);
  assert.ok(toolbar.querySelector('[aria-label="Reset 3D view"]'));
  assert.equal(readout.querySelectorAll('.component-actions').length,1);
  (readout.querySelector('.component-actions button') as HTMLButtonElement).click();
  assert.equal(f.doc.getElementById('window-controls')!.hidden,false);
  assert.equal(f.doc.activeElement,f.doc.getElementById('field'),'coil parameters focus the actual magnetic-field control');
  (readout.querySelector('.component-actions button:last-child') as HTMLButtonElement).click();
  assert.equal(f.doc.getElementById('window-plots')!.hidden,false);
  assert.equal(f.doc.activeElement,f.doc.getElementById('window-title-plots'));
  const choice=toolbar.querySelector('select')!;choice.value='source';choice.dispatchEvent(new f.doc.defaultView!.Event('change'));
  assert.equal(visible(readout),true);assert.equal(readout.querySelectorAll('.component-actions').length,1);
  (readout.querySelector('.component-actions button') as HTMLButtonElement).click();
  assert.equal(f.doc.activeElement,f.doc.getElementById('energy'),'a new component replaces the previous parameter destination');
  assert.equal(f.model.readout,readout,'selection and navigation preserve description identity');
 }
});
