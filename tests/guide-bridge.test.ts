import test,{type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {setupGuideReader} from '../src/guide-reader.js';
import {setupPlaygroundGuide} from '../src/playground-guide.js';

const origin='https://example.org';
type Packet={type:string;capability?:string;instance?:string;requestId?:string;action?:string;status?:string;message?:string};
function peer(){
 const packets:Packet[]=[];
 const window={closed:false,postMessage:(data:Packet,target:string)=>{assert.equal(target,origin);packets.push(data);},focus(){}} as unknown as Window;
 return {window,packets};
}
function app(t:TestContext,capability?:string){
 const dom=new JSDOM('<body><div id="guide"></div></body>',{url:origin});t.after(()=>dom.window.close());
 if(capability)dom.window.sessionStorage.setItem('mass-spinner:guide-capability',capability);
 dom.window.document.body.insertAdjacentHTML('beforeend','<input id="fuel-currentA">');
 const opened:string[]=[];
 const guide=setupPlaygroundGuide({document:dom.window.document,host:dom.window.document.getElementById('guide')!,open:key=>opened.push(key),close(){},focusRelated:key=>opened.push(key)});
 const send=(source:Window,data:Packet,from=origin)=>dom.window.dispatchEvent(new dom.window.MessageEvent('message',{source,data,origin:from}));
 return {dom,guide,send,opened};
}
function reader(t:TestContext){
 const dom=new JSDOM('<body><a href="/?level=2&try=spin" data-guide-action="spin">Spin</a><a href="/?level=2&try=current" data-guide-action="current">Current</a><p id="reader-status"></p></body>',{url:`${origin}/guide.html`});t.after(()=>dom.window.close());
 let tick=()=>{},probing=false;
 dom.window.setInterval=handler=>{assert.equal(typeof handler,'function');tick=handler as ()=>void;probing=true;return 1;};
 dom.window.clearInterval=()=>{probing=false;};
 const simulator=peer();Object.defineProperty(dom.window,'opener',{value:simulator.window});setupGuideReader(dom.window);
 const click=(action:string)=>dom.window.document.querySelector<HTMLAnchorElement>(`[data-guide-action="${action}"]`)!.click();
 const receive=(data:Packet,source=simulator.window,from=origin)=>dom.window.dispatchEvent(new dom.window.MessageEvent('message',{source,data,origin:from}));
 return {dom,simulator,click,receive,probe:()=>{assert.ok(probing);tick();},isProbing:()=>probing,status:()=>dom.window.document.getElementById('reader-status')!.textContent};
}

test('reload reconnects only a previously authorized reader, never an unknown same-origin hello',t=>{
 const first=app(t),reader=peer();first.dom.window.open=()=>reader.window;first.guide.openStandalone();
 first.send(reader.window,{type:'mass-spinner:guide-hello'});
 const capability=reader.packets[0].capability!,instance=reader.packets[0].instance;assert.ok(capability);assert.ok(instance);
 const reloaded=app(t,capability),unknown=peer();
 reloaded.send(unknown.window,{type:'mass-spinner:guide-hello'});
 reloaded.send(unknown.window,{type:'mass-spinner:guide-hello',capability:'wrong'});
 reloaded.send(reader.window,{type:'mass-spinner:guide-hello',capability},'https://wrong.example');
 reloaded.send(unknown.window,{type:'mass-spinner:guide-action',action:'current',requestId:'unauthorized'});
 assert.equal(unknown.packets.length,0);assert.deepEqual(reloaded.opened,[]);
 reloaded.send(reader.window,{type:'mass-spinner:guide-hello',capability});
 assert.notEqual(reader.packets.at(-1)?.instance,instance,'reload creates a distinct receiver instance');
 reloaded.send(reader.window,{type:'mass-spinner:guide-action',action:'current',requestId:'current-1'});
 assert.equal(reader.packets.at(-1)?.status,'executed');assert.deepEqual(reloaded.opened,['controls']);
 reloaded.send(reader.window,{type:'mass-spinner:guide-hello',capability});
 reloaded.send(reader.window,{type:'mass-spinner:guide-action',action:'current',requestId:'current-1'});
 assert.deepEqual(reloaded.opened,['controls'],'hello and duplicate request cannot repeat an action');
});

test('reader retains only the latest startup action and never resends it on repeated readiness',t=>{
 const f=reader(t);f.click('spin');f.click('current');
 assert.equal(f.simulator.packets.filter(data=>data.type==='mass-spinner:guide-action').length,0);
 assert.match(f.status()!,/Waiting/);
 const ready={type:'mass-spinner:guide-ready',capability:'authorized-token',instance:'simulator-1'};
 f.receive(ready,peer().window);f.receive(ready,f.simulator.window,'https://wrong.example');
 assert.equal(f.simulator.packets.filter(data=>data.type==='mass-spinner:guide-action').length,0);
 f.receive(ready);f.receive(ready);
 const requests=f.simulator.packets.filter(data=>data.type==='mass-spinner:guide-action');
 assert.equal(requests.length,1);assert.equal(requests[0].action,'current');
 assert.equal(f.dom.window.sessionStorage.getItem('mass-spinner:reader-capability'),'authorized-token');
 f.receive({type:'mass-spinner:guide-result',requestId:requests[0].requestId,status:'waiting'});assert.match(f.status()!,/calculated run/);
 // Keep the rejection text from an older receiver unchanged.
 const rejection='Choose Coupled separation before cutting power.';
 f.receive({type:'mass-spinner:guide-result',requestId:requests[0].requestId,status:'rejected',message:rejection});
 assert.equal(f.status(),rejection);assert.doesNotMatch(f.status()!,/Opened|Sent/);
});

test('receiver returns rejected conditions and invalid allowlist actions to the requesting reader',t=>{
 const f=app(t),r=peer();f.dom.window.open=()=>r.window;f.guide.openStandalone();
 f.dom.window.document.body.insertAdjacentHTML('beforeend','<button id="fuel-export"></button><select id="fuel-motion-mode"><option value="equilibrium">Equilibrium</option></select><button id="fuel-power" aria-pressed="true"></button>');
 let cuts=0;f.dom.window.document.getElementById('fuel-power')!.addEventListener('click',()=>cuts++);
 f.send(r.window,{type:'mass-spinner:guide-action',action:'cutPower',requestId:'cut'});
 assert.equal(r.packets.at(-1)?.status,'rejected');assert.match(r.packets.at(-1)?.message??'',/Before you cut power, select Coupled separation/);assert.equal(cuts,0);
 f.send(r.window,{type:'mass-spinner:guide-action',action:'not-an-action',requestId:'invalid'});
 assert.equal(r.packets.at(-1)?.status,'rejected');assert.match(r.packets.at(-1)?.message??'',/not available/);
});

test('an action arriving before live controls mount waits for their accepted state',async t=>{
 const f=app(t),r=peer();f.dom.window.open=()=>r.window;f.guide.openStandalone();
 f.send(r.window,{type:'mass-spinner:guide-action',action:'newRun',requestId:'new'});
 assert.equal(r.packets.at(-1)?.status,'waiting');
 f.dom.window.document.body.insertAdjacentHTML('beforeend','<button id="fuel-export" disabled></button><button id="fuel-new-run"></button>');
 let runs=0;f.dom.window.document.getElementById('fuel-new-run')!.addEventListener('click',()=>runs++);
 await new Promise<void>(resolve=>setImmediate(resolve));assert.equal(runs,0);
 (f.dom.window.document.getElementById('fuel-export') as HTMLButtonElement).disabled=false;
 await new Promise<void>(resolve=>setImmediate(resolve));
 assert.equal(runs,1);assert.equal(r.packets.at(-1)?.status,'executed');
 f.send(r.window,{type:'mass-spinner:guide-hello'});f.send(r.window,{type:'mass-spinner:guide-action',action:'newRun',requestId:'new'});
 assert.equal(runs,1);
});

test('a receiver reload interrupts both waiting and unacknowledged requests without replay',t=>{
 for(const waiting of [false,true]){
  const f=reader(t);f.click('spin');
  const ready={type:'mass-spinner:guide-ready',capability:'authorized-token',instance:'before-reload'};
  f.receive(ready);
  const request=f.simulator.packets.find(packet=>packet.type==='mass-spinner:guide-action')!;
  if(waiting)f.receive({type:'mass-spinner:guide-result',requestId:request.requestId,status:'waiting'});
  assert.equal(f.isProbing(),true,'readiness probes continue until a terminal action outcome');
  const before=f.simulator.packets.length;f.probe();
  assert.equal(f.simulator.packets.length,before+1);assert.equal(f.simulator.packets.at(-1)?.type,'mass-spinner:guide-hello');
  f.receive({...ready,instance:'after-reload'});
  assert.match(f.status()!,/The simulator reloaded.*action status is unknown/);assert.equal(f.isProbing(),false);
  f.receive({...ready,instance:'after-reload'});
  assert.match(f.status()!,/The simulator reloaded/,'an in-flight ready cannot erase the warning');
  assert.equal(f.simulator.packets.filter(packet=>packet.type==='mass-spinner:guide-action').length,1);
  f.receive({type:'mass-spinner:guide-result',requestId:request.requestId,status:'executed'});
  assert.match(f.status()!,/The simulator reloaded/,'an outcome from the abandoned request is ignored');
 }
});

test('an ambiguous action has a bounded probe lifetime and never claims execution',t=>{
 const f=reader(t);f.click('spin');f.receive({type:'mass-spinner:guide-ready',capability:'authorized-token',instance:'simulator-1'});
 for(let i=0;i<120;i++)f.probe();
 assert.equal(f.isProbing(),false);assert.match(f.status()!,/sent no final action result.*can finish later/);
 const requests=f.simulator.packets.filter(packet=>packet.type==='mass-spinner:guide-action');assert.equal(requests.length,1);
 f.receive({type:'mass-spinner:guide-result',requestId:requests[0].requestId,status:'waiting'});
 assert.match(f.status()!,/sent no final action result.*can finish later/,'a late waiting receipt must not erase the timeout warning');
});

test('an old receiver without readiness support offers recovery without sending or replaying',t=>{
 const f=reader(t);f.click('spin');
 for(let i=0;i<120;i++)f.probe();
 assert.equal(f.isProbing(),false);assert.match(f.status()!,/did not reply.*Open a new simulator/);
 assert.equal(f.simulator.packets.filter(packet=>packet.type==='mass-spinner:guide-action').length,0);
 f.receive({type:'mass-spinner:guide-ready',capability:'authorized-token',instance:'updated-simulator'});
 assert.equal(f.simulator.packets.filter(packet=>packet.type==='mass-spinner:guide-action').length,0,'late readiness must not execute the expired action');
 assert.match(f.status()!,/did not reply/);
});

test('an unresponsive older simulator offers a direct action without waiting for background timers',t=>{
 const f=reader(t);let focuses=0;f.simulator.window.focus=()=>{focuses++;};
 f.click('spin');
 const reconnect=f.dom.window.document.querySelector<HTMLAnchorElement>('[data-guide-reconnect]')!;
 assert.ok(reconnect);assert.equal(reconnect.hidden,false);
 assert.equal(reconnect.href,`${origin}/?level=2&try=spin`);
 assert.equal(reconnect.target,'_blank');assert.equal(reconnect.rel,'noopener');
 assert.equal(focuses,0,'keep the recovery link visible until the action succeeds');
 assert.equal(f.simulator.packets.filter(packet=>packet.type==='mass-spinner:guide-action').length,0);
 for(let i=0;i<120;i++)f.probe();
 assert.equal(reconnect.hidden,false,'recovery remains available after the connection expires');
 const current=peer();f.dom.window.open=(url,target)=>{assert.equal(url,`${origin}/?level=2`);assert.equal(target,'_blank');return current.window;};reconnect.click();
 assert.equal(f.isProbing(),true);assert.equal(reconnect.hidden,true);
 f.receive({type:'mass-spinner:guide-ready',capability:'late-token',instance:'old-tab'});
 assert.equal(f.simulator.packets.filter(packet=>packet.type==='mass-spinner:guide-action').length,0,'recovery cancels the older pending action');
 f.receive({type:'mass-spinner:guide-ready',capability:'current-token',instance:'current-tab'},current.window);
 const request=current.packets.find(packet=>packet.type==='mass-spinner:guide-action')!;assert.equal(request.action,'spin');
 f.receive({type:'mass-spinner:guide-result',requestId:request.requestId,status:'executed'},current.window);
 assert.equal(f.status(),'Opened in the simulator.');
 f.click('current');assert.equal(reconnect.hidden,false);f.receive({type:'mass-spinner:guide-ready',capability:'current-token',instance:'current-tab'},current.window);
 assert.equal(current.packets.filter(packet=>packet.type==='mass-spinner:guide-action').at(-1)?.action,'current');
});

test('an authorized action hides recovery before it can execute twice',t=>{
 const f=reader(t);let focuses=0;f.simulator.window.focus=()=>{focuses++;};f.click('current');
 const reconnect=f.dom.window.document.querySelector<HTMLAnchorElement>('[data-guide-reconnect]')!;
 f.receive({type:'mass-spinner:guide-ready',capability:'authorized-token',instance:'simulator-1'});
 assert.equal(reconnect.hidden,true);assert.equal(focuses,0);
 const request=f.simulator.packets.find(packet=>packet.type==='mass-spinner:guide-action')!;
 f.receive({type:'mass-spinner:guide-result',requestId:request.requestId,status:'executed'});
 assert.equal(focuses,1);
});
