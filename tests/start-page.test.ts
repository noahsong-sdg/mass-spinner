import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {startPage} from '../scripts/start-page.mjs';
import {setupGuideReader} from '../src/guide-reader.js';
import {guideActions} from '../src/guide-topics.js';

function acknowledge(win:JSDOM['window'],source:Window,sent:unknown[][]){
 win.dispatchEvent(new win.MessageEvent('message',{origin:'https://example.org',source,data:{type:'mass-spinner:guide-ready',capability:'authorized-reader',instance:'simulator-1'}}));
 const request=sent.at(-1)![0] as {type:string;action:string;requestId:string};
 assert.equal(request.type,'mass-spinner:guide-action');
 win.dispatchEvent(new win.MessageEvent('message',{origin:'https://example.org',source,data:{type:'mass-spinner:guide-result',requestId:request.requestId,status:'executed'}}));
 return request;
}

test('standalone walkthrough motivates each experiment before instructions and identifies expected outputs',t=>{
 const dom=new JSDOM(startPage(),{url:'https://example.org/start.html'});t.after(()=>dom.window.close());const doc=dom.window.document;
 assert.equal(doc.querySelectorAll('iframe').length,0);
 assert.equal(doc.querySelector('h1')!.textContent,'Tutorial 1 · Using the simulator');
 assert.equal(doc.querySelectorAll('.guide-contents a').length,7);
 assert.doesNotMatch(doc.body.textContent!,/How to try it|Predictions are optional|Choose any question|Next:/);
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
 const simulator={closed:false,postMessage:(...args:unknown[])=>sent.push(args),focus:()=>focuses++} as unknown as Window;
 Object.defineProperty(win,'opener',{value:simulator});
 win.open=()=>{opened++;return null;};setupGuideReader(win);
 win.document.querySelector<HTMLAnchorElement>('[data-guide-action="currentExperiment"]')!.click();
 assert.equal((sent[0][0] as {type:string}).type,'mass-spinner:guide-hello');
 assert.equal(acknowledge(win,simulator,sent).action,'currentExperiment');
 assert.equal(focuses,1);assert.equal(opened,0);assert.equal(win.location.pathname,'/start.html');
 assert.match(win.document.getElementById('reader-status')!.textContent!,/Opened in the simulator/);
});

test('a direct or stale reader opens one simulator and reuses it for subsequent actions',t=>{
 for(const stale of [false,true]){
  const dom=new JSDOM(startPage(),{url:'https://example.org/start.html'});t.after(()=>dom.window.close());const win=dom.window;
  if(stale)Object.defineProperty(win,'opener',{value:{closed:true}});
  const sent:unknown[][]=[],opened:unknown[][]=[],navigated:string[]=[],simulator={closed:false,location:{href:'about:blank',replace:(url:string)=>navigated.push(url)},postMessage:(...args:unknown[])=>sent.push(args),focus(){}};
  win.open=(...args)=>{opened.push(args);return simulator as unknown as Window;};setupGuideReader(win);
  win.document.querySelector<HTMLAnchorElement>('[data-guide-action="currentExperiment"]')!.click();
  assert.equal(opened.length,1);assert.equal(opened[0][0],'');assert.match(String(opened[0][1]),/^mass-spinner-reader-[0-9a-f-]+-simulator$/);
  assert.deepEqual(navigated,['https://example.org/?level=2']);
  assert.equal(acknowledge(win,simulator as unknown as Window,sent).action,'currentExperiment','the first action must receive an execution result');
  win.document.querySelector<HTMLAnchorElement>('[data-guide-action="endSpin"]')!.click();
  assert.equal(opened.length,1);assert.equal(acknowledge(win,simulator as unknown as Window,sent).action,'endSpin');
 }
});

test('a direct reader reconnects after page navigation without navigating the existing simulator',t=>{
 const sent:unknown[][]=[],opened:unknown[][]=[],navigated:string[]=[];let windowName='';
 const simulator={closed:false,location:{href:'https://example.org/?level=2',replace:(url:string)=>navigated.push(url)},postMessage:(...args:unknown[])=>sent.push(args),focus(){}};
 // A new document has no page-local simulator reference, as after navigating between guides.
 for(const path of ['/start.html','/guide.html']){
  const dom=new JSDOM(startPage(),{url:`https://example.org${path}`});t.after(()=>dom.window.close());
  if(windowName)dom.window.name=windowName;
  dom.window.open=(...args)=>{opened.push(args);return simulator as unknown as Window;};setupGuideReader(dom.window);
  windowName=dom.window.name;
  dom.window.document.querySelector<HTMLAnchorElement>('[data-guide-action="endSpin"]')!.click();
  assert.equal(acknowledge(dom.window,simulator as unknown as Window,sent).action,'endSpin');
 }
 assert.equal(opened.length,2);for(const args of opened){assert.equal(args[0],'');assert.match(String(args[1]),/^mass-spinner-reader-[0-9a-f-]+-simulator$/);}
 assert.equal(opened[0][1],opened[1][1],"navigation must reuse only this reader's simulator");
 assert.equal(navigated.length,0);assert.equal(sent.filter(([packet])=>(packet as {type:string}).type==='mass-spinner:guide-action').length,2);
});

test('reconnecting never navigates or sends an action to a cross-origin named tab',t=>{
 const dom=new JSDOM(startPage(),{url:'https://example.org/start.html'});t.after(()=>dom.window.close());let sent=0;
 const simulator={closed:false,get location():Location{throw new DOMException('Cross-origin access denied','SecurityError');},postMessage:()=>sent++,focus(){}};
 dom.window.open=(_url,target)=>{assert.equal(_url,'');assert.match(String(target),/^mass-spinner-reader-[0-9a-f-]+-simulator$/);return simulator as unknown as Window;};
 setupGuideReader(dom.window);dom.window.document.querySelector<HTMLAnchorElement>('[data-guide-action="endSpin"]')!.click();
 assert.equal(sent,0);assert.match(dom.window.document.getElementById('reader-status')!.textContent!,/another site/);
});

test('blocked simulator popups leave a useful instruction instead of claiming an action was sent',t=>{
 const dom=new JSDOM(startPage(),{url:'https://example.org/start.html'});t.after(()=>dom.window.close());dom.window.open=()=>null;
 setupGuideReader(dom.window);dom.window.document.querySelector<HTMLAnchorElement>('[data-guide-action="endSpin"]')!.click();
 assert.match(dom.window.document.getElementById('reader-status')!.textContent!,/Allow the simulator window/);
});


test('initial authorization stays silent and action feedback stays beside the selected instruction',t=>{
 const dom=new JSDOM(startPage(),{url:'https://example.org/start.html'});t.after(()=>dom.window.close());
 let messages=0;Object.defineProperty(dom.window,'opener',{value:{closed:false,postMessage(){messages++;},focus(){}}});
 setupGuideReader(dom.window);
 const status=dom.window.document.getElementById('reader-status')!;
 assert.equal(status.textContent,'');assert.equal(messages,1);
 const link=dom.window.document.querySelector<HTMLAnchorElement>('[data-guide-action="coils"]')!;
 link.click();assert.equal(messages,2);assert.equal(link.closest('.try-actions')!.nextElementSibling,status);
});

test("independent direct readers cannot reuse each other's simulator window name",t=>{
 const names:string[]=[];
 for(let i=0;i<2;i++){
  const dom=new JSDOM(startPage(),{url:'https://example.org/start.html'});t.after(()=>dom.window.close());
  dom.window.open=(_url,name)=>{names.push(name!);return null;};setupGuideReader(dom.window);
  dom.window.document.querySelector<HTMLAnchorElement>('[data-guide-action="look"]')!.click();
 }
 assert.equal(names.length,2);assert.notEqual(names[0],names[1]);
});


test("an old global reader name and copied storage cannot join a different reader's simulator",t=>{
 const dom=new JSDOM(startPage(),{url:'https://example.org/start.html'});t.after(()=>dom.window.close());
 dom.window.name='mass-spinner-start';
 dom.window.sessionStorage.setItem('mass-spinner:reader-simulator','old-global-window');
 dom.window.sessionStorage.setItem('mass-spinner:reader-capability','previous-token');
 let target='';dom.window.open=(_url,name)=>{target=name!;return null;};setupGuideReader(dom.window);
 dom.window.document.querySelector<HTMLAnchorElement>('[data-guide-action="look"]')!.click();
 assert.match(target,/^mass-spinner-reader-[0-9a-f-]+-simulator$/);assert.notEqual(target,'old-global-window');
});
