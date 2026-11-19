import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {learningPages} from '../scripts/learning-pages.mjs';
import {startPage} from '../scripts/start-page.mjs';
import {setupGuideReader} from '../src/guide-reader.js';

test('without JavaScript every experiment has usable instructions, optional notes and an answer reveal',t=>{
 const dom=new JSDOM(startPage(),{url:'https://example.org/start.html'});t.after(()=>dom.window.close());const doc=dom.window.document;
 assert.equal(doc.querySelector('#learning-mode'),null);
 for(const step of doc.querySelectorAll('.walkthrough-step')){
  const prediction=step.querySelector('textarea')!,label=step.querySelector<HTMLLabelElement>('.learning-prediction label')!;
  assert.equal(label.htmlFor,prediction.id);assert.equal(prediction.required,false);
  assert.ok(doc.getElementById(prediction.getAttribute('aria-describedby')!));
  assert.equal(step.querySelector<HTMLDetailsElement>('[data-learning-hint]')!.open,true);
  assert.equal(step.querySelector<HTMLDetailsElement>('[data-learning-explanation]')!.open,false);
  assert.ok(step.querySelector('.learning-measure')!.textContent!.trim());
  assert.ok(step.querySelector('.learning-transfer details p')!.textContent!.trim());
 }
 assert.match(doc.getElementById('learning-notes')!.textContent!,/disappear on reload/);
});

test('every reader uses one flow with visible instructions and optional explanations, with or without JavaScript',t=>{
 for(const [name,html] of Object.entries({'start.html':startPage(),...learningPages()})){
  const dom=new JSDOM(html,{url:`https://example.org/${name}`});t.after(()=>dom.window.close());const doc=dom.window.document;
  const before=[...doc.querySelectorAll<HTMLDetailsElement>('details')].map(detail=>detail.open);
  setupGuideReader(dom.window);
  assert.equal(doc.querySelector('#learning-mode,[data-learning-controls]'),null,name);
  assert.equal(doc.body.dataset.learningMode,undefined,name);
  assert.deepEqual([...doc.querySelectorAll<HTMLDetailsElement>('details')].map(detail=>detail.open),before,'enhancement must preserve native disclosure defaults');
  for(const step of doc.querySelectorAll('.walkthrough-step')){
   const hint=step.querySelector<HTMLDetailsElement>('[data-learning-hint]');
   if(!hint)continue;
   assert.equal(hint.open,true,`${name}: instructions visible`);
   assert.equal(step.querySelector<HTMLDetailsElement>('[data-learning-explanation]')!.open,false,`${name}: explanation optional`);
   assert.equal(step.querySelector<HTMLTextAreaElement>('textarea')!.required,false);
  }
 }
});

test('opening optional help preserves notes and never launches a run',t=>{
 const dom=new JSDOM(startPage(),{url:'https://example.org/start.html'});t.after(()=>dom.window.close());const win=dom.window,doc=win.document;
 let opened=0;win.open=()=>{opened++;return null;};setupGuideReader(win);
 const prediction=doc.getElementById('prediction-current') as HTMLTextAreaElement;
 prediction.value='The neutrals will lag behind.';
 const hint=doc.querySelector<HTMLDetailsElement>('[data-learning-hint]')!,answer=doc.querySelector<HTMLDetailsElement>('[data-learning-explanation]')!;
 hint.open=false;answer.open=true;
 assert.equal(hint.open,false);assert.equal(answer.open,true);
 assert.equal(doc.querySelector<HTMLDetailsElement>('.learning-transfer details')!.open,false);
 assert.equal(prediction.value,'The neutrals will lag behind.');assert.equal(opened,0);
 assert.equal(win.location.pathname,'/start.html');
 const composition=doc.getElementById('composition')!.parentElement!;
 assert.match(composition.querySelector('.walkthrough-observation')!.textContent!,/finite-time run may differ.*unpowered or short run/);
});

test('the enhanced reader remains compatible with guide pages without experiment markup',t=>{
 const dom=new JSDOM('<select id="guide-chapter"><option value="goal">Goal</option></select><a href="/?level=2&try=spin" data-guide-action="spin">Try spin-up</a>',{url:'https://example.org/guide.html'});
 t.after(()=>dom.window.close());const win=dom.window,sent:unknown[][]=[];
 Object.defineProperty(win,'opener',{value:{closed:false,postMessage:(...args:unknown[])=>sent.push(args),focus(){}}});
 setupGuideReader(win);win.document.querySelector<HTMLAnchorElement>('[data-guide-action]')!.click();
 assert.deepEqual(sent,[[{type:'mass-spinner:guide-action',action:'spin'},'https://example.org']]);
 assert.equal(win.document.body.dataset.learningMode,undefined);
});
