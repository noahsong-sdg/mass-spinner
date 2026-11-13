import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {setupWorkspace} from '../src/workspace-ui.js';
import {setupExperience} from '../src/experience-ui.js';
import {scenarioLink} from '../src/scenario-state.js';

test('help page keeps density linear in centrifugal radial force balance',()=>{
 const doc=new JSDOM(readFileSync('web-assets/how-it-works.html','utf8')).window.document;
 const balance=[...doc.querySelectorAll('.equation')].find(node=>node.textContent?.startsWith('dp/dr'))!;
 assert.ok(balance);assert.match(balance.textContent!,/^dp\/dr = ρΩ²r/);
 assert.equal(balance.querySelectorAll('var')[2].textContent,'ρ','density must not be grouped under the square');
 assert.match(balance.nextElementSibling!.textContent!,/equilibrium references/);
 assert.match(balance.nextElementSibling!.textContent!,/does not solve radial fluid momentum or extraction/);
 assert.match(doc.querySelector('#physics')!.textContent!,/optional thermal evolution/);
});

function fixture(t:any,search='',mobile=false){
 const {window}=new JSDOM(readFileSync('index.html','utf8'),{url:'https://example.org/'+search}),doc=window.document;
 for(const [key,value]of Object.entries({document:doc,location:window.location,history:window.history})){
  const previous=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{value,configurable:true});
  t.after(()=>{if(previous)Object.defineProperty(globalThis,key,previous);else Reflect.deleteProperty(globalThis,key);});
 }
 t.after(()=>window.close());
 const contexts:any[]=[];
 const workspace=setupWorkspace({document:doc,matchMedia:()=>({matches:mobile,addEventListener(){}}),onContextChange:value=>contexts.push(value)});
 const ui=setupExperience({selectMode(){},invalidate(){},showView(){},showResearch(){},onLevelChange:level=>workspace.setLevel(level)});
 const node=(id:string)=>doc.getElementById(id)!;
 return {window,doc,ui,node,contexts,workspace,apparatus:node('marathon-apparatus') as HTMLSelectElement,advanced:node('advanced-simulators') as HTMLDetailsElement};
}

for(const mobile of [false,true])test(`centrifuge-first navigation preserves advanced scenes and controls (${mobile?'mobile':'desktop'})`,t=>{
 const f=fixture(t,'',mobile),primary=f.doc.querySelector<HTMLButtonElement>('.level-navigation>button')!;
 assert.equal(f.ui.level,'2');assert.equal(f.contexts.at(-1).marathon,'centrifuge');
 assert.equal(primary.dataset.level,'2');assert.equal(f.advanced.open,false);
 assert.equal(f.node('level-title').textContent,'Marathon centrifuge');
 assert.ok(f.advanced.contains(f.apparatus));assert.equal(f.apparatus.closest('[hidden]'),null);
 for(const level of ['1','3','4'])assert.ok(f.advanced.contains(f.doc.querySelector(`[data-level="${level}"]`)));
 const models=f.doc.querySelector<HTMLButtonElement>('[data-level="3"]')!;
 models.click();const field=f.node('field') as HTMLInputElement;field.value='.17';
 primary.click();
 for(const scene of ['source','blanket']){
  f.advanced.open=true;f.apparatus.value=scene;f.apparatus.dispatchEvent(new f.window.Event('change'));
  assert.equal(f.ui.level,'2');assert.equal(f.contexts.at(-1).marathon,scene);assert.equal(primary.getAttribute('aria-pressed'),'false');
  assert.equal(f.advanced.open,false);assert.equal(f.doc.activeElement,f.advanced.querySelector('summary'));
  primary.click();assert.equal(f.contexts.at(-1).marathon,'centrifuge');assert.equal(f.apparatus.value,'centrifuge');assert.equal(f.advanced.open,false);
 }
 models.click();
 assert.equal(f.ui.level,'3');assert.equal(f.node('field'),field);assert.equal(Number(field.value),.17);
 f.apparatus.value='source';f.apparatus.dispatchEvent(new f.window.Event('change'));
 assert.equal(f.ui.level,'2','choosing another Marathon system from an advanced playground enters its scene');
 assert.equal(f.contexts.at(-1).marathon,'source');
 f.advanced.open=true;const escape=new f.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true});
 f.apparatus.dispatchEvent(escape);assert.equal(f.advanced.open,false);assert.equal(f.doc.activeElement,f.advanced.querySelector('summary'));
});

test('same-level apparatus changes preserve compatible panels and close unavailable target controls',t=>{
 const f=fixture(t),primary=f.doc.querySelector<HTMLButtonElement>('.level-navigation>button')!;
 f.workspace.open('controls');f.workspace.open('plots');
 const select=(value:string)=>{f.advanced.open=true;f.apparatus.value=value;f.apparatus.dispatchEvent(new f.window.Event('change'));};
 select('source');
 for(const id of ['window-controls','window-plots'])assert.equal(f.node(id).hidden,false,id+' remains open');
 f.workspace.open('target');assert.equal(f.node('window-target').hidden,false);
 select('centrifuge');
 for(const id of ['window-controls','window-plots'])assert.equal(f.node(id).hidden,false,id+' remains open');
 assert.equal(f.node('window-target').hidden,true,'target-only panel cannot remain in the centrifuge');
 select('source');f.workspace.open('target');primary.click();
 for(const id of ['window-controls','window-plots'])assert.equal(f.node(id).hidden,false,id+' remains open through the primary shortcut');
 assert.equal(f.node('window-target').hidden,true);assert.equal(f.apparatus.value,'centrifuge');
});

test('legacy beam-target links retain their original apparatus while new centrifuge links round-trip',t=>{
 const old={version:2,level:'2',controls:{'fusion-beam-enabled':false}};
 const f=fixture(t,new URL(scenarioLink('https://example.org/',old)).search);
 assert.equal(f.apparatus.value,'source','pre-centrifuge v2 links omit the apparatus and still mean beam target');
 assert.equal(f.contexts.at(-1).marathon,'source');
 assert.equal((f.node('fusion-beam-enabled') as HTMLInputElement).checked,false);
 assert.equal(f.ui.restore({version:2,level:'2',controls:{'marathon-apparatus':'centrifuge'}}),true);
 assert.equal(f.contexts.at(-1).marathon,'centrifuge');
 assert.equal(f.ui.capture().controls['marathon-apparatus'],'centrifuge');
 f.advanced.open=true;const summary=f.advanced.querySelector('summary')!;summary.focus();
 assert.equal(f.ui.restore({version:2,level:'2',controls:{'marathon-apparatus':'source'}}),true);
 assert.equal(f.advanced.open,true,'programmatic scenario hydration does not dismiss the disclosure');
 assert.equal(f.doc.activeElement,summary);
 assert.equal(f.ui.restore({version:2,level:'2',controls:{'marathon-apparatus':'centrifuge'}}),true);
 assert.equal(f.ui.restore({version:2,level:'2',controls:{'marathon-apparatus':'obsolete'}}),false);
 assert.equal(f.apparatus.value,'centrifuge');assert.equal(f.contexts.at(-1).marathon,'centrifuge');
});
