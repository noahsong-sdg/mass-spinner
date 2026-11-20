import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {documentationPage} from '../scripts/documentation-page.mjs';
import {startPage} from '../scripts/start-page.mjs';
import {setupGuideReader} from '../src/guide-reader.js';

test('every reader has ordinary contents links and omits repetitive learning scaffolding',t=>{
 for(const [name,html] of Object.entries({'start.html':startPage(),'learn.html':documentationPage()})){
  const dom=new JSDOM(html,{url:`https://example.org/${name}`});t.after(()=>dom.window.close());const doc=dom.window.document;
  assert.equal(doc.querySelector('#guide-chapter,#learning-mode,textarea,[data-learning-hint],.learning-transfer'),null,name);
  assert.doesNotMatch(doc.body.textContent!,/How to try it|Predictions are optional|Choose any question or control/);
  assert.ok(doc.querySelectorAll('.guide-contents a').length>0,`${name}: contents must be present`);
  for(const link of doc.querySelectorAll<HTMLAnchorElement>('.guide-contents a'))assert.ok(doc.getElementById(link.hash.slice(1)),`${name}: ${link.hash}`);
  const before=[...doc.querySelectorAll<HTMLDetailsElement>('details')].map(detail=>detail.open);
  setupGuideReader(dom.window);
  assert.deepEqual([...doc.querySelectorAll<HTMLDetailsElement>('details')].map(detail=>detail.open),before,'enhancement preserves native disclosure defaults');
  for(const step of doc.querySelectorAll('.walkthrough-step')){
   assert.ok(step.querySelector('[data-guide-action]'));
   assert.equal(step.querySelector<HTMLDetailsElement>('[data-learning-explanation]')!.open,false);
  }
 }
});

test('opening an optional explanation never launches a run',t=>{
 const dom=new JSDOM(startPage(),{url:'https://example.org/start.html'});t.after(()=>dom.window.close());const win=dom.window,doc=win.document;
 let opened=0,sent=0;win.open=()=>{opened++;return null;};
 Object.defineProperty(win,'parent',{value:{postMessage(){sent++;}}});setupGuideReader(win);
 const explanation=doc.querySelector<HTMLDetailsElement>('[data-learning-explanation]')!;
 explanation.open=true;assert.equal(explanation.open,true);assert.equal(opened,0);assert.equal(sent,0);
 assert.equal(win.location.pathname,'/start.html');
 assert.match(doc.getElementById('composition')!.parentElement!.textContent!,/finite-time run can differ.*short or unpowered run/);
});

test('the machine explanation separates the drum, charge force and neutral coupling',t=>{
 const dom=new JSDOM(startPage());t.after(()=>dom.window.close());
 const explanation=dom.window.document.getElementById('machine')!.parentElement!.querySelector<HTMLDetailsElement>('[data-learning-explanation]')!;
 const paragraphs=[...explanation.querySelectorAll('p')].map(p=>p.textContent!);
 const drum=paragraphs.findIndex(text=>text.includes('a cylinder whose wall turns'));
 const current=paragraphs.findIndex(text=>text.includes('current is charge in motion'));
 const force=paragraphs.findIndex(text=>text.includes('Lorentz force law'));
 const torque=paragraphs.findIndex(text=>text.includes('turning effect about the axis'));
 const collisions=paragraphs.findIndex(text=>text.includes('Collisions transfer some of this motion'));
 assert.ok(drum>=0&&current>drum&&force>current&&torque>force&&collisions>torque,'explain each step in its own paragraph');
 assert.match(paragraphs[current],/Electrons can move in the opposite direction/);
 assert.match(paragraphs[force],/right angles to both the charge motion and the field/);
 assert.match(paragraphs[force],/magnetic force alone does not increase the charge's speed/);
 assert.match(paragraphs[torque],/right of the end view.*inward current.*field toward you.*upward force/);
 assert.match(paragraphs[collisions],/electrical supply supplies energy/);
 assert.equal(explanation.open,false,'keep the detailed explanation optional');
});

test('the enhanced reader remains compatible with guide pages without experiment markup',t=>{
 const dom=new JSDOM('<nav aria-label="Contents"><a href="#goal">Goal</a></nav><h1 id="goal">Goal</h1><a href="/?level=2&try=spin" data-guide-action="spin">Try spin-up</a>',{url:'https://example.org/guide.html'});
 t.after(()=>dom.window.close());const win=dom.window,sent:unknown[][]=[];
 const parent={postMessage:(...args:unknown[])=>sent.push(args)} as unknown as Window;
 Object.defineProperty(win,'parent',{value:parent});Object.defineProperty(win,'opener',{value:{postMessage(){throw new Error('The opener is not this reader’s simulator');}}});
 win.open=()=>{throw new Error('An embedded reader must not open a tab');};
 setupGuideReader(win);assert.deepEqual(sent,[]);win.document.querySelector<HTMLAnchorElement>('[data-guide-action]')!.click();
 assert.equal(sent.length,1);const request=sent[0][0] as {type:string;action:string;requestId:string};
 assert.equal(request.type,'mass-spinner:guide-action');assert.equal(request.action,'spin');assert.ok(request.requestId);assert.equal(sent[0][1],'https://example.org');
 win.dispatchEvent(new win.MessageEvent('message',{origin:'https://example.org',source:parent,data:{type:'mass-spinner:guide-result',requestId:request.requestId,status:'executed'}}));
 assert.equal(win.location.pathname,'/guide.html');assert.equal(win.document.querySelector('#reader-status'),null);
 assert.equal(win.document.querySelector('nav a')!.getAttribute('href'),'#goal');
 assert.equal(win.document.body.dataset.learningMode,undefined);
});
