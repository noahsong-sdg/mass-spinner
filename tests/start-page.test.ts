import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {startPage} from '../scripts/start-page.mjs';
import {setupGuideReader} from '../src/guide-reader.js';
import {guideActions} from '../src/guide-topics.js';

test('standalone walkthrough motivates each experiment before instructions and identifies expected outputs',t=>{
 const dom=new JSDOM(startPage(),{url:'https://example.org/start.html'});t.after(()=>dom.window.close());const doc=dom.window.document;
 assert.equal(doc.querySelectorAll('iframe').length,0);
 assert.equal(doc.querySelectorAll('.walkthrough-step').length,7);
 for(const step of doc.querySelectorAll('.walkthrough-step')){
  assert.equal(step.querySelector('h2')!.nextElementSibling!.tagName,'P');
  assert.equal(step.querySelectorAll('ol li').length,2);
  assert.ok(step.querySelector('.walkthrough-observation'));
  for(const link of step.querySelectorAll<HTMLAnchorElement>('[data-guide-action]')){
   assert.ok(guideActions.has(link.dataset.guideAction!)||['coils','controls'].includes(link.dataset.guideAction!));
   assert.equal(new URL(link.href).searchParams.get('try'),link.dataset.guideAction);
  }
 }
 assert.match(doc.querySelector('#current')!.parentElement!.textContent!,/0 A.*0.03 A/);
 assert.match(doc.querySelector('#composition')!.parentElement!.textContent!,/not with 50%/);
 assert.match(doc.querySelector('#collection')!.parentElement!.textContent!,/closed inventory/);
 for(const link of doc.querySelectorAll<HTMLAnchorElement>('a[href^="#"]'))assert.ok(doc.getElementById(link.hash.slice(1)));
});

test('a separate guide operates only its connected simulator without navigating or resetting either page',t=>{
 const dom=new JSDOM(startPage(),{url:'https://example.org/start.html'});t.after(()=>dom.window.close());const win=dom.window;
 const sent:unknown[][]=[];let focuses=0,opened=0;
 Object.defineProperty(win,'opener',{value:{closed:false,postMessage:(...args:unknown[])=>sent.push(args),focus:()=>focuses++}});
 win.open=()=>{opened++;return null;};setupGuideReader(win);
 win.document.querySelector<HTMLAnchorElement>('[data-guide-action="currentExperiment"]')!.click();
 assert.deepEqual(sent,[[{type:'mass-spinner:guide-action',action:'currentExperiment'},'https://example.org']]);
 assert.equal(focuses,1);assert.equal(opened,0);assert.equal(win.location.pathname,'/start.html');
 assert.match(win.document.getElementById('reader-status')!.textContent!,/Sent to the simulator/);
});

test('a direct or stale reader opens one simulator and reuses it for subsequent actions',t=>{
 for(const stale of [false,true]){
  const dom=new JSDOM(startPage(),{url:'https://example.org/start.html'});t.after(()=>dom.window.close());const win=dom.window;
  if(stale)Object.defineProperty(win,'opener',{value:{closed:true}});
  const sent:unknown[][]=[],opened:unknown[][]=[],simulator={closed:false,postMessage:(...args:unknown[])=>sent.push(args),focus(){}};
  win.open=(...args)=>{opened.push(args);return simulator as unknown as Window;};setupGuideReader(win);
  win.document.querySelector<HTMLAnchorElement>('[data-guide-action="currentExperiment"]')!.click();
  assert.deepEqual(opened,[['https://example.org/?level=2&try=currentExperiment','mass-spinner-simulator']]);
  win.document.querySelector<HTMLAnchorElement>('[data-guide-action="endSpin"]')!.click();
  assert.equal(opened.length,1);assert.deepEqual(sent,[[{type:'mass-spinner:guide-action',action:'endSpin'},'https://example.org']]);
 }
});
