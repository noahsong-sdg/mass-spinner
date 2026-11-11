// Audit witnesses: passing means the defect is present, not that behavior is correct.
// Copy this file to tests/ and execute only in the safe-dev checked source tree.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {setupWorkspace} from '../src/workspace-ui.js';
import {setupApparatus} from '../src/apparatus-ui.js';
import {appendComponentActions} from '../src/component-actions.js';

function fixture(t:any){
 const dom=new JSDOM(readFileSync('index.html','utf8'),{url:'https://example.org/?level=1'}),doc=dom.window.document;
 const previous=Object.getOwnPropertyDescriptor(globalThis,'IntersectionObserver');
 Object.defineProperty(globalThis,'IntersectionObserver',{configurable:true,value:class{observe(){}disconnect(){}}});
 t.after(()=>{dom.window.close();if(previous)Object.defineProperty(globalThis,'IntersectionObserver',previous);else Reflect.deleteProperty(globalThis,'IntersectionObserver');});
 let workspace:any;
 const model=setupApparatus(doc.getElementById('model-apparatus'),{onInspect:()=>workspace.open('inspect')});
 model.show('rotating');
 const readout=doc.querySelector('#model-apparatus .component-description')!;
 workspace=setupWorkspace({document:doc,matchMedia:()=>({matches:false,addEventListener(){}}),storage:null});
 const setLevel=(level:string)=>{doc.body.dataset.level=level;doc.body.dataset.view='render';workspace.setLevel(level);doc.getElementById('separator-inspector')!.hidden=true;};
 return {doc,model,readout,workspace,setLevel};
}

test('AUDIT DEFECT: level-one rendered component inspection opens a panel whose populated readout is hidden',t=>{
 const f=fixture(t);f.setLevel('1');f.model.select('coils');
 assert.equal(f.doc.getElementById('window-inspect')!.hidden,false);
 assert.ok(f.readout.textContent!.length>40,'component selection does create a useful description');
 assert.equal(f.readout.closest<HTMLElement>('.world-group')!.hidden,true,'the populated readout lives in a level-three-only group');
 assert.equal(f.doc.getElementById('separator-inspector')!.hidden,true,'render view hides the alternate inspector');
 assert.equal(f.readout.parentElement!.querySelector('.apparatus-toolbar')!.closest<HTMLElement>('.world-group')!.hidden,true);
});

test('AUDIT DEFECT: reparented separator description no longer matches production shortcut selector in level three',t=>{
 const f=fixture(t);f.setLevel('3');f.model.select('coils');
 assert.equal(f.readout.closest<HTMLElement>('.world-group')!.hidden,false);
 const source=readFileSync('src/main.js','utf8');
 assert.ok(source.includes("?'#model-apparatus .component-description'"),'witness tracks the current production selector');
 const selected=f.doc.querySelector('#model-apparatus .component-description');
 assert.equal(selected,null,'workspace moved the description out of this ancestor');
 appendComponentActions(selected,{parameters(){},results(){}});
 assert.equal(f.readout.querySelector('.component-actions'),null,'no Parameters/Results buttons are attached');
});
