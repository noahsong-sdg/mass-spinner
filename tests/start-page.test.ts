import test,{type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {startPage} from '../scripts/start-page.mjs';
import {setupGuideReader} from '../src/guide-reader.js';
import {guideActions} from '../src/guide-topics.js';

const origin='https://example.org';
type Request={type:string;action?:string;requestId?:string};
function embedded(t:TestContext,html=startPage()){
 const dom=new JSDOM(html,{url:`${origin}/start.html`});t.after(()=>dom.window.close());const win=dom.window;
 const sent:{packet:Request;origin:string}[]=[],foreign:Request[]=[];
 const parent={postMessage:(packet:Request,target:string)=>sent.push({packet,origin:target})} as unknown as Window;
 const opener={postMessage:(packet:Request)=>foreign.push(packet)} as unknown as Window;
 Object.defineProperty(win,'parent',{value:parent});Object.defineProperty(win,'opener',{value:opener});
 win.open=()=>{throw new Error('Reader actions must not open a tab');};setupGuideReader(win);
 const result=(requestId:string,status:string,source=parent,from=origin,message?:string)=>win.dispatchEvent(new win.MessageEvent('message',{origin:from,source,data:{type:'mass-spinner:guide-result',requestId,status,message}}));
 const click=(action:string)=>win.document.querySelector<HTMLAnchorElement>(`[data-guide-action="${action}"]`)!.click();
 return {win,sent,foreign,parent,opener,result,click,status:()=>win.document.getElementById('reader-status')!};
}
function standalone(t:TestContext,stale=false){
 const dom=new JSDOM(startPage(),{url:`${origin}/start.html`});t.after(()=>dom.window.close());const win=dom.window;
 let external=0;const navigated:string[]=[];
 if(stale){
  win.name='mass-spinner-start';win.sessionStorage.setItem('mass-spinner:reader-simulator','old-global-window');win.sessionStorage.setItem('mass-spinner:reader-capability','previous-token');
  Object.defineProperty(win,'opener',{value:{closed:false,get location(){throw new win.DOMException('Cross-origin access denied','SecurityError');},postMessage(){external++;},focus(){external++;}}});
 }
 win.open=()=>{external++;return null;};
 // Exercise real DOM clicks and route construction. jsdom cannot perform top-level navigation.
 const browser={Node:win.Node,crypto:win.crypto,location:{href:win.location.href,assign:(url:string)=>navigated.push(url)}};
 const document=new Proxy(win.document,{get(target,key){if(key==='defaultView')return browser;const value=Reflect.get(target,key,target);return typeof value==='function'?value.bind(target):value;}});
 const reader={document,location:win.location,opener:win.opener,open:win.open,matchMedia:win.matchMedia,addEventListener:win.addEventListener.bind(win),parent:null as unknown as Window};
 reader.parent=reader as unknown as Window;setupGuideReader(reader);
 return {win,navigated,external:()=>external};
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

test('standalone actions navigate this tab with the clicked section and ignore old opener and storage state',t=>{
 for(const stale of [false,true]){
  const {win,navigated,external}=standalone(t,stale);
  assert.deepEqual(navigated,[]);assert.equal(external(),0);
  for(const [action,section]of [['currentExperiment','current'],['look','machine']] as const){
   win.document.querySelector<HTMLAnchorElement>(`[data-guide-action="${action}"]`)!.click();
   const target=new URL(navigated.at(-1)!);
   assert.equal(target.origin,origin);assert.equal(target.pathname,'/');assert.equal(target.searchParams.get('level'),'2');
   assert.equal(target.searchParams.get('try'),action);assert.equal(target.searchParams.get('lesson'),`/start.html#${section}`);
  }
  assert.equal(navigated.length,2);assert.equal(external(),0);assert.equal(win.document.getElementById('reader-status')!.textContent,'');
 }
});

test('modified clicks keep native link behavior instead of sending or navigating this tab',t=>{
 const {win,navigated,external}=standalone(t),observed:boolean[]=[];
 win.document.addEventListener('click',event=>{observed.push(event.defaultPrevented);event.preventDefault();});
 const link=win.document.querySelector<HTMLAnchorElement>('[data-guide-action="look"]')!;
 for(const modifier of ['ctrlKey','metaKey','shiftKey','altKey'])link.dispatchEvent(new win.MouseEvent('click',{bubbles:true,cancelable:true,[modifier]:true}));
 assert.deepEqual(observed,[false,false,false,false]);assert.deepEqual(navigated,[]);assert.equal(external(),0);
});

test('embedded actions send only to their parent, without a handshake or popup, and keep feedback beside the instruction',t=>{
 const reader=embedded(t);assert.equal(reader.sent.length,0);assert.equal(reader.status().textContent,'');
 reader.click('currentExperiment');const first=reader.sent[0];
 assert.equal(first.origin,origin);assert.equal(first.packet.type,'mass-spinner:guide-action');assert.equal(first.packet.action,'currentExperiment');assert.ok(first.packet.requestId);
 assert.equal(reader.win.document.querySelector('[data-guide-action="currentExperiment"]')!.closest('.try-actions')!.nextElementSibling,reader.status());
 reader.result(first.packet.requestId!,'waiting');assert.match(reader.status().textContent!,/Waiting/);
 reader.result(first.packet.requestId!,'executed');assert.equal(reader.status().textContent,'');
 reader.click('endSpin');assert.notEqual(reader.sent[1].packet.requestId,first.packet.requestId);
 assert.equal(reader.sent[1].packet.action,'endSpin');assert.deepEqual(reader.foreign,[]);assert.equal(reader.win.location.pathname,'/start.html');
});

test('embedded feedback rejects wrong origin, wrong source, stale requests and late receipts',t=>{
 const reader=embedded(t);reader.click('coils');const first=reader.sent[0].packet.requestId!;
 reader.result(first,'waiting');const waiting=reader.status().textContent;
 reader.result(first,'executed',reader.opener);reader.result(first,'executed',reader.parent,'https://other.example');reader.result('stale','executed');
 assert.equal(reader.status().textContent,waiting);
 reader.click('look');const second=reader.sent[1].packet.requestId!;
 reader.result(second,'waiting');reader.result(first,'rejected',reader.parent,origin,'Old rejection');assert.equal(reader.status().textContent,waiting);
 reader.result(second,'rejected',reader.parent,origin,'The selected action is unavailable.');assert.equal(reader.status().textContent,'The selected action is unavailable.');
 reader.result(second,'executed');reader.result(second,'waiting');assert.equal(reader.status().textContent,'The selected action is unavailable.');
 assert.deepEqual(reader.foreign,[]);
});

test('action feedback stays inside its ordered instruction and Escape closes only the embedded reader',t=>{
 const reader=embedded(t,'<p id="reader-status" role="status"></p><ol><li><a href="/?level=2&try=coils" data-guide-action="coils">Show the coils</a></li></ol>');
 reader.click('coils');reader.result(reader.sent[0].packet.requestId!,'waiting');
 assert.equal(reader.win.document.querySelector('ol')!.children.length,1);assert.equal(reader.status().parentElement!.tagName,'LI');assert.match(reader.status().textContent!,/Waiting/);
 reader.win.document.dispatchEvent(new reader.win.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
 assert.equal(reader.sent.at(-1)!.packet.type,'mass-spinner:guide-close');assert.deepEqual(reader.foreign,[]);
 const direct=standalone(t);direct.win.document.dispatchEvent(new direct.win.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
 assert.deepEqual(direct.navigated,[]);assert.equal(direct.external(),0);
});
