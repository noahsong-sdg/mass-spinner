import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {setupWorkspace} from '../src/workspace-ui.js';

function fixture(t:any,mobile=false){
 const {window}=new JSDOM(readFileSync('index.html','utf8'),{url:'https://example.org/?level=2'}),doc=window.document;
 const workspace=setupWorkspace({document:doc,matchMedia:()=>({matches:mobile,addEventListener(){}}),storage:null});
 const node=(id:string)=>doc.getElementById(id)! as any;
 t.after(()=>window.close());
 workspace.setLevel('2');
 return {doc,window,workspace,node,step(index:number){node('guide-step').value=String(index);node('guide-step').dispatchEvent(new window.Event('change'));}};
}

test('a visible start point opens optional guidance without opening or rebuilding the simulation controls',t=>{
 const f=fixture(t),input=f.node('field');input.value='.17';
 assert.equal(f.node('start-here').hidden,false);
 assert.ok(f.node('start-here').closest('.masthead'));
 assert.equal(f.node('window-guide').hidden,true);
 f.node('start-here').click();
 assert.equal(f.node('window-guide').hidden,false);assert.equal(f.node('window-controls').hidden,true);
 assert.equal(f.node('field'),input);assert.equal(input.value,'.17');
 assert.equal(f.node('guide-step').options.length,7);
 assert.match(f.node('window-guide').textContent,/nothing is reset/);
 f.step(5);f.node('window-guide').querySelector('.world-close').click();f.node('start-here').click();
 assert.equal(f.node('guide-step').value,'5','reopening must keep the reader’s place');
});

test('all seven steps have a live action and retain the physical scope distinctions',t=>{
 const f=fixture(t);f.workspace.open('guide');
 for(let i=0;i<7;i++){
  f.step(i);assert.ok(f.doc.querySelectorAll('.guide-actions button').length>=2);
  assert.equal(f.node('window-guide').querySelector('h3').nextElementSibling.className,'guide-actions','put the action before the explanation');
  assert.match(f.node('window-guide').textContent,/Try this/);assert.match(f.node('window-guide').textContent,/Watch for/);
 }
 f.step(3);assert.match(f.node('window-guide').textContent,/percentage or purity does not itself change by that factor/);
 f.step(5);assert.match(f.node('window-guide').textContent,/do not simulate an extraction flow/);
 f.step(6);assert.match(f.node('window-guide').textContent,/not experimental accuracy/);
 f.node('window-guide').querySelector('.guide-navigation button:nth-child(2)').click();
 assert.equal(f.node('window-guide').hidden,true);assert.equal(f.doc.activeElement,f.node('start-here'));
});

test('pending or missing results explain what to do instead of inventing a successful experiment',t=>{
 const f=fixture(t);f.workspace.open('guide');f.step(1);
 f.doc.querySelector<HTMLButtonElement>('.guide-actions button')!.click();
 assert.match(f.node('guide-status').textContent,/Wait for the run to finish/);
 assert.equal(f.node('window-plots').hidden,true);
});

test('the walkthrough respects the one-sheet mobile layout, Escape and context availability',t=>{
 const f=fixture(t,true);f.node('start-here').click();f.workspace.open('plots');
 assert.equal(f.node('window-guide').hidden,true);assert.equal(f.node('window-plots').hidden,false);
 f.node('start-here').click();assert.equal(f.node('window-plots').hidden,true);
 f.node('window-guide').dispatchEvent(new f.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
 assert.equal(f.doc.activeElement,f.node('start-here'));assert.equal(f.node('window-guide').hidden,true);
 for(const level of ['1','3','4']){f.workspace.setLevel(level);assert.equal(f.node('start-here').hidden,true);}
 f.workspace.setLevel('2');assert.equal(f.node('start-here').hidden,false);
 f.node('marathon-apparatus').value='source';f.node('marathon-apparatus').dispatchEvent(new f.window.Event('change'));
 assert.equal(f.node('start-here').hidden,true);assert.equal(f.node('window-guide').hidden,true);
});

test('physics reading loads on demand and preserves its place while controls or experiments are open',t=>{
 const f=fixture(t);f.workspace.open('guide');const frame=f.node('physics-guide-frame');
 assert.equal(frame.hasAttribute('src'),false,'do not load the full reading and math fonts before requested');
 f.workspace.openPhysics('energy');assert.equal(frame.getAttribute('src'),'/guide.html#energy');
 assert.equal(f.doc.querySelector('.guide-physics').hidden,false);assert.equal(f.doc.querySelector('.guide-reading').hidden,true);
 f.workspace.open('controls');f.node('start-here').click();
 assert.equal(f.doc.querySelector('.guide-physics').hidden,false);assert.equal(frame.getAttribute('src'),'/guide.html#energy');
 const buttons=[...f.doc.querySelectorAll<HTMLButtonElement>('.guide-views button')];
 buttons[0].click();assert.equal(f.doc.querySelector('.guide-reading').hidden,false);
 buttons[1].click();assert.equal(frame.getAttribute('src'),'/guide.html#energy');
 assert.equal(buttons[1].getAttribute('aria-pressed'),'true');
});

test('the mobile physics reader has a panel height instead of the iframe intrinsic height',t=>{
 const f=fixture(t,true);f.workspace.openPhysics('drive');
 const selector='#window-guide:has(.guide-physics:not([hidden]))';
 assert.equal(f.doc.querySelector(selector),f.node('window-guide'));
 const style=f.doc.createElement('style');style.textContent=readFileSync('src/workspace.css','utf8');f.doc.head.append(style);
 const mobile=[...style.sheet!.cssRules].find(rule=>rule instanceof f.window.CSSMediaRule&&rule.conditionText==='(max-width:740px)') as CSSMediaRule;
 const reader=[...mobile.cssRules].find(rule=>(rule as CSSStyleRule).selectorText===selector) as CSSStyleRule;
 assert.equal(reader.style.height,'58dvh');
 f.doc.querySelector<HTMLButtonElement>('.guide-views button')!.click();
 assert.equal(f.doc.querySelector(selector),null,'short experiment cards must retain their intrinsic size');
});

test('only messages from the same-origin guide frame can operate native controls or close the guide',t=>{
 const f=fixture(t);f.workspace.openPhysics('drive');const frame=f.node('physics-guide-frame');
 const send=(origin:string,source:any,action:string,type='mass-spinner:guide-action')=>f.window.dispatchEvent(new f.window.MessageEvent('message',{origin,source,data:{type,action}}));
 send('https://unrelated.example',frame.contentWindow,'current');assert.equal(f.node('window-controls').hidden,true);
 send('https://example.org',f.window,'current');assert.equal(f.node('window-controls').hidden,true);
 send('https://example.org',frame.contentWindow,'not-an-action');assert.equal(f.node('window-controls').hidden,true);
 send('https://example.org',frame.contentWindow,'current');assert.equal(f.node('window-controls').hidden,false);
 f.workspace.open('guide');send('https://example.org',frame.contentWindow,'','mass-spinner:guide-close');
 assert.equal(f.node('window-guide').hidden,true);assert.equal(f.doc.activeElement,f.node('start-here'));
});
