import test,{type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {setupGuideReader} from '../src/guide-reader.js';
import {setupPlaygroundGuide} from '../src/playground-guide.js';
import {setupFuelCentrifuge} from '../src/fuel-centrifuge-ui.js';

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
 const simulator=peer(),opener=peer();Object.defineProperty(dom.window,'parent',{value:simulator.window});Object.defineProperty(dom.window,'opener',{value:opener.window});
 dom.window.open=()=>{throw new Error('Embedded actions must not open a tab');};setupGuideReader(dom.window);
 const click=(action:string)=>dom.window.document.querySelector<HTMLAnchorElement>(`[data-guide-action="${action}"]`)!.click();
 const receive=(data:Packet,source=simulator.window,from=origin)=>dom.window.dispatchEvent(new dom.window.MessageEvent('message',{source,data,origin:from}));
 return {dom,simulator,opener,click,receive,status:()=>dom.window.document.getElementById('reader-status')!.textContent};
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

test('coils wait for the asynchronously populated component options before acknowledging execution',async t=>{
 const f=app(t),r=peer();f.dom.window.open=()=>r.window;f.guide.openStandalone();
 const component=f.dom.window.document.createElement('select');component.id='fuel-component';f.dom.window.document.body.append(component);
 f.send(r.window,{type:'mass-spinner:guide-action',action:'coils',requestId:'coils'});
 assert.equal(r.packets.at(-1)?.status,'waiting');assert.deepEqual(f.opened,[]);
 component.innerHTML='<option value="vessel">Vessel</option><option value="coils">Coils</option>';
 await new Promise<void>(resolve=>setImmediate(resolve));
 assert.equal(component.value,'coils');assert.deepEqual(f.opened,['inspect']);assert.equal(r.packets.at(-1)?.status,'executed');
});

test('a failed calculation rejects its pending reader action without a late replay and a new request can recover',async t=>{
 const f=app(t),r=peer();f.dom.window.open=()=>r.window;f.guide.openStandalone();
 const doc=f.dom.window.document;
 doc.body.insertAdjacentHTML('beforeend','<button id="fuel-export" data-calculation-state="pending" disabled></button><button id="fuel-new-run"></button>');
 const accepted=doc.getElementById('fuel-export') as HTMLButtonElement;
 let runs=0;doc.getElementById('fuel-new-run')!.addEventListener('click',()=>runs++);
 f.send(r.window,{type:'mass-spinner:guide-action',action:'newRun',requestId:'failed-run'});
 assert.equal(r.packets.at(-1)?.status,'waiting');
 await new Promise<void>(resolve=>setImmediate(resolve));
 assert.equal(r.packets.at(-1)?.status,'waiting','an unfinished calculation is not a failure');
 accepted.dataset.calculationError='The thermal solve did not converge.';accepted.dataset.calculationState='failed';
 await new Promise<void>(resolve=>setImmediate(resolve));
 assert.equal(r.packets.at(-1)?.status,'rejected');assert.match(r.packets.at(-1)?.message??'',/thermal solve did not converge.*Open Controls/);
 assert.deepEqual(f.opened,['controls']);assert.equal(runs,0);
 const receipts=r.packets.length;
 accepted.dataset.calculationState='pending';delete accepted.dataset.calculationError;
 accepted.dataset.calculationState='accepted';accepted.disabled=false;
 await new Promise<void>(resolve=>setImmediate(resolve));
 assert.equal(r.packets.length,receipts,'recovery cannot replay a rejected request');assert.equal(runs,0);
 f.send(r.window,{type:'mass-spinner:guide-action',action:'newRun',requestId:'recovered-run'});
 assert.equal(r.packets.at(-1)?.status,'executed');assert.equal(runs,1);
});

test('a reader action rejects an existing calculation failure and still permits control actions',t=>{
 const f=app(t),r=peer();f.dom.window.open=()=>r.window;f.guide.openStandalone();
 f.dom.window.document.body.insertAdjacentHTML('beforeend','<button id="fuel-export" data-calculation-state="failed" data-calculation-error="Invalid thermal settings." disabled></button>');
 f.send(r.window,{type:'mass-spinner:guide-action',action:'thermalPlot',requestId:'failed-before-click'});
 assert.equal(r.packets.length,1);assert.equal(r.packets[0].status,'rejected');assert.match(r.packets[0].message??'',/Invalid thermal settings/);
 f.send(r.window,{type:'mass-spinner:guide-action',action:'current',requestId:'edit-input'});
 assert.equal(r.packets.at(-1)?.status,'executed');assert.deepEqual(f.opened,['controls','controls']);
});

test('the actual worker rejection publishes its failed state to the waiting tutorial action',async t=>{
 const f=app(t),r=peer();f.dom.window.open=()=>r.window;f.guide.openStandalone();
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:f.dom.window.document,configurable:true});
 const reject:((reason:Error)=>void)[]=[];
 const ui=setupFuelCentrifuge({document:f.dom.window.document,request:()=>new Promise<never>((_resolve,fail)=>{reject.push(fail);})});
 try{
  f.dom.window.document.body.append(...Object.values(ui.nodes));
  const accepted=f.dom.window.document.getElementById('fuel-export') as HTMLButtonElement;
  assert.equal(accepted.dataset.calculationState,'pending');
  const superseded=ui.run(),run=ui.run();
  f.send(r.window,{type:'mass-spinner:guide-action',action:'thermalPlot',requestId:'worker-failure'});
  assert.equal(r.packets.at(-1)?.status,'waiting');
  reject[0](new Error('An older run failed.'));await superseded;await new Promise<void>(resolve=>setImmediate(resolve));
  assert.equal(accepted.dataset.calculationState,'pending');assert.equal(r.packets.at(-1)?.status,'waiting','an obsolete request cannot reject the current calculation');
  reject[1](new Error('The energy solver failed.'));await run;await new Promise<void>(resolve=>setImmediate(resolve));
  assert.equal(accepted.dataset.calculationState,'failed');assert.equal(accepted.disabled,true);
  assert.equal(r.packets.at(-1)?.status,'rejected');assert.match(r.packets.at(-1)?.message??'',/energy solver failed.*Open Controls/);
 }finally{ui.dispose();if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');}
});

test('embedded reader sends each action once to its exact parent without a readiness handshake',t=>{
 const f=reader(t);assert.equal(f.status(),'');assert.equal(f.simulator.packets.length,0);
 f.click('spin');f.click('current');
 assert.deepEqual(f.simulator.packets.map(packet=>[packet.type,packet.action]),[['mass-spinner:guide-action','spin'],['mass-spinner:guide-action','current']]);
 const [first,second]=f.simulator.packets;assert.ok(first.requestId);assert.ok(second.requestId);assert.notEqual(first.requestId,second.requestId);
 assert.deepEqual(f.opener.packets,[],'the standalone page opener is not the active simulator');
 f.receive({type:'mass-spinner:guide-ready',capability:'old-capability',instance:'old-receiver'});
 assert.equal(f.simulator.packets.length,2,'an old handshake cannot replay an action');
 assert.equal(f.dom.window.location.pathname,'/guide.html');assert.equal(f.status(),'');
});

test('embedded reader ignores unsolicited, foreign and stale action receipts',t=>{
 const f=reader(t);
 f.receive({type:'mass-spinner:guide-result',requestId:'',status:'rejected',message:'Unsolicited receipt'});
 assert.equal(f.status(),'','a receipt needs an active nonempty request');
 f.click('spin');const older=f.simulator.packets.at(-1)!;
 f.receive({type:'mass-spinner:guide-result',requestId:older.requestId,status:'waiting'});assert.match(f.status()!,/calculated run/);
 f.click('current');const current=f.simulator.packets.at(-1)!;assert.equal(f.status(),'');
 f.receive({type:'mass-spinner:guide-result',requestId:older.requestId,status:'rejected',message:'Older request'});assert.equal(f.status(),'');
 const waiting={type:'mass-spinner:guide-result',requestId:current.requestId,status:'waiting'};
 f.receive(waiting,peer().window);f.receive(waiting,f.simulator.window,'https://wrong.example');f.receive(waiting,f.opener.window);
 assert.equal(f.status(),'','only the exact same-origin parent can report an action outcome');
 f.receive({...waiting,status:'not-a-status',message:'Invalid outcome'});assert.equal(f.status(),'');
 f.receive(waiting);assert.match(f.status()!,/calculated run/);
 f.receive({...waiting,status:'executed'});assert.equal(f.status(),'','success leaves the reading view clear');
 f.receive(waiting);assert.equal(f.status(),'','a late waiting receipt cannot reopen a completed request');
});

test('embedded reader preserves rejection details and ignores later receipts for that request',t=>{
 const f=reader(t);f.click('current');const request=f.simulator.packets.at(-1)!;
 const rejection='Select an atomic feed before thermal evolution.';
 f.receive({type:'mass-spinner:guide-result',requestId:request.requestId,status:'waiting'});assert.match(f.status()!,/calculated run/);
 f.receive({type:'mass-spinner:guide-result',requestId:request.requestId,status:'rejected',message:rejection});assert.equal(f.status(),rejection);
 f.receive({type:'mass-spinner:guide-result',requestId:request.requestId,status:'executed'});assert.equal(f.status(),rejection);
 f.click('spin');assert.equal(f.status(),'','a new action clears the previous rejection');
 const next=f.simulator.packets.at(-1)!;
 f.receive({type:'mass-spinner:guide-result',requestId:next.requestId,status:'rejected'});
 assert.equal(f.status(),'The simulator cannot apply this action.');
});

test('embedded reader Escape closes reading without navigating or opening another simulator',t=>{
 const f=reader(t),event=new f.dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true});
 f.dom.window.document.dispatchEvent(event);
 assert.equal(event.defaultPrevented,true);assert.deepEqual(f.simulator.packets,[{type:'mass-spinner:guide-close'}]);
 assert.equal(f.dom.window.location.pathname,'/guide.html');assert.deepEqual(f.opener.packets,[]);
});

test('the simulator accepts commands only from its own reader frame and returns deduplicated outcomes',t=>{
 const f=app(t);f.guide.showReader('/start.html');
 const frame=f.dom.window.document.getElementById('physics-guide-frame') as HTMLIFrameElement;
 const source=frame.contentWindow!,responses:Packet[]=[];Object.defineProperty(source,'postMessage',{value:(data:Packet,target:string)=>{assert.equal(target,origin);responses.push(data);}});
 const request={type:'mass-spinner:guide-action',action:'current',requestId:'frame-current'};
 f.send(peer().window,request);f.send(source,request,'https://wrong.example');assert.deepEqual(f.opened,['guide']);assert.equal(responses.length,0);
 f.send(source,request);assert.equal(responses.at(-1)?.status,'executed');assert.deepEqual(f.opened,['guide','controls']);
 f.send(source,request);assert.deepEqual(f.opened,['guide','controls'],'a repeated request must not repeat the control action');
 assert.equal(responses.length,2);assert.deepEqual(responses[0],responses[1]);
});
