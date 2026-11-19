import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {learningPages} from '../scripts/learning-pages.mjs';
import {startPage} from '../scripts/start-page.mjs';
import {setupGuideReader} from '../src/guide-reader.js';

test('every reader has ordinary contents links and omits repetitive learning scaffolding',t=>{
 for(const [name,html] of Object.entries({'start.html':startPage(),...learningPages()})){
  const dom=new JSDOM(html,{url:`https://example.org/${name}`});t.after(()=>dom.window.close());const doc=dom.window.document;
  assert.equal(doc.querySelector('#guide-chapter,#learning-mode,textarea,[data-learning-hint],.learning-transfer'),null,name);
  assert.doesNotMatch(doc.body.textContent!,/How to try it|Predictions are optional|Choose any question or control/);
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
 let opened=0;win.open=()=>{opened++;return null;};setupGuideReader(win);
 const explanation=doc.querySelector<HTMLDetailsElement>('[data-learning-explanation]')!;
 explanation.open=true;assert.equal(explanation.open,true);assert.equal(opened,0);
 assert.equal(win.location.pathname,'/start.html');
 assert.match(doc.getElementById('composition')!.parentElement!.textContent!,/finite-time run may differ.*unpowered or short run/);
});

test('the enhanced reader remains compatible with guide pages without experiment markup',t=>{
 const dom=new JSDOM('<nav aria-label="Contents"><a href="#goal">Goal</a></nav><h1 id="goal">Goal</h1><a href="/?level=2&try=spin" data-guide-action="spin">Try spin-up</a>',{url:'https://example.org/guide.html'});
 t.after(()=>dom.window.close());const win=dom.window,sent:unknown[][]=[];
 Object.defineProperty(win,'opener',{value:{closed:false,postMessage:(...args:unknown[])=>sent.push(args),focus(){}}});
 setupGuideReader(win);win.document.querySelector<HTMLAnchorElement>('[data-guide-action]')!.click();
 assert.deepEqual(sent,[[{type:'mass-spinner:guide-action',action:'spin'},'https://example.org']]);
 assert.equal(win.document.body.dataset.learningMode,undefined);
});
