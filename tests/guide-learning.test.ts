import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {startPage} from '../scripts/start-page.mjs';
import {setupGuideReader} from '../src/guide-reader.js';

test('without JavaScript every experiment has usable instructions, optional notes and an answer reveal',t=>{
 const dom=new JSDOM(startPage(),{url:'https://example.org/start.html'});t.after(()=>dom.window.close());const doc=dom.window.document;
 assert.equal(doc.querySelector<HTMLElement>('[data-learning-controls]')!.hidden,true);
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

test('a novice starts with worked examples and can choose investigation without causal spoilers',t=>{
 const dom=new JSDOM(startPage(),{url:'https://example.org/start.html'});t.after(()=>dom.window.close());const doc=dom.window.document;
 setupGuideReader(dom.window);
 assert.equal(doc.body.dataset.learningMode,'show');
 assert.equal(doc.querySelector<HTMLDetailsElement>('[data-learning-hint]')!.open,true);
 assert.equal(doc.querySelector<HTMLDetailsElement>('[data-learning-explanation]')!.open,true);
 const mode=doc.getElementById('learning-mode') as HTMLSelectElement;
 mode.value='investigate';mode.dispatchEvent(new dom.window.Event('change'));
 assert.equal(doc.body.dataset.learningMode,'investigate');
 assert.equal(doc.querySelector<HTMLElement>('[data-learning-controls]')!.hidden,false);
 for(const step of doc.querySelectorAll('.walkthrough-step')){
  assert.equal(step.querySelector<HTMLDetailsElement>('[data-learning-hint]')!.open,false);
  assert.equal(step.querySelector<HTMLDetailsElement>('[data-learning-explanation]')!.open,false);
  assert.equal(step.querySelector('.learning-measure')!.closest('details'),null);
  assert.equal(step.querySelector('.walkthrough-observation')!.closest('details'),step.querySelector('[data-learning-explanation]'));
 }
 const composition=doc.getElementById('composition')!.parentElement!;
 assert.match(composition.querySelector('.walkthrough-observation')!.textContent!,/finite-time run may differ.*unpowered or short run/);
});

test('guidance can change freely without launching a run or losing a learner prediction',t=>{
 const dom=new JSDOM(startPage(),{url:'https://example.org/start.html'});t.after(()=>dom.window.close());const win=dom.window,doc=win.document;
 let opened=0;win.open=()=>{opened++;return null;};setupGuideReader(win);
 const mode=doc.getElementById('learning-mode') as HTMLSelectElement;
 const prediction=doc.getElementById('prediction-current') as HTMLTextAreaElement;
 prediction.value='The neutrals will lag behind.';
 const hint=doc.querySelector<HTMLDetailsElement>('[data-learning-hint]')!,answer=doc.querySelector<HTMLDetailsElement>('[data-learning-explanation]')!;
 mode.value='show';mode.dispatchEvent(new win.Event('change'));
 assert.equal(doc.body.dataset.learningMode,'show');assert.equal(hint.open,true);assert.equal(answer.open,true);
 assert.equal(doc.querySelector<HTMLDetailsElement>('.learning-transfer details')!.open,false);
 mode.value='explore';mode.dispatchEvent(new win.Event('change'));
 assert.equal(doc.body.dataset.learningMode,'explore');assert.equal(hint.open,false);assert.equal(answer.open,false);
 hint.open=true;answer.open=true;
 assert.equal(hint.open,true);assert.equal(answer.open,true,'the learner can request help in Explore');
 mode.value='investigate';mode.dispatchEvent(new win.Event('change'));
 assert.equal(prediction.value,'The neutrals will lag behind.');assert.equal(opened,0);
 assert.equal(win.location.pathname,'/start.html');
});

test('the enhanced reader remains compatible with guide pages without learning-mode markup',t=>{
 const dom=new JSDOM('<select id="guide-chapter"><option value="goal">Goal</option></select><a href="/?level=2&try=spin" data-guide-action="spin">Try spin-up</a>',{url:'https://example.org/guide.html'});
 t.after(()=>dom.window.close());const win=dom.window,sent:unknown[][]=[];
 Object.defineProperty(win,'opener',{value:{closed:false,postMessage:(...args:unknown[])=>sent.push(args),focus(){}}});
 setupGuideReader(win);win.document.querySelector<HTMLAnchorElement>('[data-guide-action]')!.click();
 assert.deepEqual(sent,[[{type:'mass-spinner:guide-action',action:'spin'},'https://example.org']]);
 assert.equal(win.document.body.dataset.learningMode,undefined);
});
