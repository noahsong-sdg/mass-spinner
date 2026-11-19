import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {startPage} from '../scripts/start-page.mjs';
import {setupGuideReader} from '../src/guide-reader.js';
import {guideActions} from '../src/guide-topics.js';

test('standalone walkthrough motivates each experiment before instructions and identifies expected outputs',t=>{
 const dom=new JSDOM(startPage(),{url:'https://example.org/start.html'});t.after(()=>dom.window.close());const doc=dom.window.document;
 assert.equal(doc.querySelectorAll('iframe').length,0);
 assert.equal(doc.querySelector('h1')!.textContent,'Tutorial 1 · Using the simulator');
 assert.equal(doc.querySelectorAll('.guide-contents a').length,7);
 assert.doesNotMatch(doc.body.textContent!,/How to try it|Predictions are optional|Choose any question/);
 assert.equal(doc.querySelectorAll('.walkthrough-step').length,7);
 for(const step of doc.querySelectorAll('.walkthrough-step')){
  assert.equal(step.querySelector('h2')!.nextElementSibling!.tagName,'P');
  assert.equal(step.querySelector('[data-learning-hint],textarea,.learning-transfer'),null);
  assert.equal(step.querySelector<HTMLDetailsElement>('[data-learning-explanation]')!.open,false);
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
  const sent:unknown[][]=[],opened:unknown[][]=[],navigated:string[]=[],simulator={closed:false,location:{href:'about:blank',replace:(url:string)=>navigated.push(url)},postMessage:(...args:unknown[])=>sent.push(args),focus(){}};
  win.open=(...args)=>{opened.push(args);return simulator as unknown as Window;};setupGuideReader(win);
  win.document.querySelector<HTMLAnchorElement>('[data-guide-action="currentExperiment"]')!.click();
  assert.deepEqual(opened,[['','mass-spinner-simulator']]);
  assert.deepEqual(navigated,['https://example.org/?level=2&try=currentExperiment']);
  win.document.querySelector<HTMLAnchorElement>('[data-guide-action="endSpin"]')!.click();
  assert.equal(opened.length,1);assert.deepEqual(sent,[[{type:'mass-spinner:guide-action',action:'endSpin'},'https://example.org']]);
 }
});

test('a direct reader reconnects after page navigation without navigating the existing simulator',t=>{
 const sent:unknown[][]=[],opened:unknown[][]=[],navigated:string[]=[];
 const simulator={closed:false,location:{href:'https://example.org/?level=2',replace:(url:string)=>navigated.push(url)},postMessage:(...args:unknown[])=>sent.push(args),focus(){}};
 // A new document has no page-local simulator reference, as after navigating between guides.
 for(const path of ['/start.html','/guide.html']){
  const dom=new JSDOM(startPage(),{url:`https://example.org${path}`});t.after(()=>dom.window.close());
  dom.window.open=(...args)=>{opened.push(args);return simulator as unknown as Window;};setupGuideReader(dom.window);
  dom.window.document.querySelector<HTMLAnchorElement>('[data-guide-action="endSpin"]')!.click();
 }
 assert.deepEqual(opened,[['','mass-spinner-simulator'],['','mass-spinner-simulator']]);
 assert.equal(navigated.length,0);assert.equal(sent.length,2);
 assert.deepEqual(sent[1],[{type:'mass-spinner:guide-action',action:'endSpin'},'https://example.org']);
});

test('reconnecting never navigates or sends an action to a cross-origin named tab',t=>{
 const dom=new JSDOM(startPage(),{url:'https://example.org/start.html'});t.after(()=>dom.window.close());let sent=0;
 const simulator={closed:false,get location():Location{throw new DOMException('Cross-origin access denied','SecurityError');},postMessage:()=>sent++,focus(){}};
 dom.window.open=(_url,target)=>{assert.equal(_url,'');assert.equal(target,'mass-spinner-simulator');return simulator as unknown as Window;};
 setupGuideReader(dom.window);dom.window.document.querySelector<HTMLAnchorElement>('[data-guide-action="endSpin"]')!.click();
 assert.equal(sent,0);assert.match(dom.window.document.getElementById('reader-status')!.textContent!,/another site/);
});

test('blocked simulator popups leave a useful instruction instead of claiming an action was sent',t=>{
 const dom=new JSDOM(startPage(),{url:'https://example.org/start.html'});t.after(()=>dom.window.close());dom.window.open=()=>null;
 setupGuideReader(dom.window);dom.window.document.querySelector<HTMLAnchorElement>('[data-guide-action="endSpin"]')!.click();
 assert.match(dom.window.document.getElementById('reader-status')!.textContent!,/Allow the simulator window/);
});
