import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {setupWorkspace} from '../src/workspace-ui.js';

function fixture(t:any,mobile=false){
 const {window}=new JSDOM(readFileSync('index.html','utf8'),{url:'https://example.org/?level=2'}),doc=window.document;
 const workspace=setupWorkspace({document:doc,matchMedia:()=>({matches:mobile,addEventListener(){}}),storage:null});
 const node=(id:string)=>doc.getElementById(id)! as any;
 t.after(()=>window.close());
 workspace.setLevel('2');
 return {doc,window,workspace,node,step(index:number){node('guide-step').value=String(index);node('guide-step').dispatchEvent(new window.Event('change'));}};
}

/** Native controls mounted by the centrifuge after the workspace exists. */
function acceptedFuel(f:ReturnType<typeof fixture>){
 const make=(tag:string,id:string)=>{const node=f.doc.createElement(tag) as any;node.id=id;f.doc.body.append(node);return node;};
 const mode=make('select','fuel-motion-mode');mode.innerHTML='<option value="transport">Coupled separation</option><option value="equilibrium">Equilibrium reference</option>';
 const time=make('input','fuel-motion-time');time.type='range';time.min='0';time.max='1';time.step='any';time.value='.4';
 const plot=make('select','fuel-plot');
 for(const value of ['spin','composition','separation','thermalProfile','gasEnergy','gasPressure','field','cascade','pump','inventory','lithium']){const option=f.doc.createElement('option');option.value=value;option.textContent=value;plot.append(option);}
 const plotHost=make('div','fuel-plots');plotHost.innerHTML='<div class="live-plots"></div>';
 make('output','fuel-composition-readout');
 make('details','fuel-learning-comparisons');const accepted=make('button','fuel-export'),newRun=make('button','fuel-new-run'),power=make('button','fuel-power');
 power.setAttribute('aria-pressed','true');
 return {mode,time,plot,accepted,newRun,power};
}

test('Start here opens a separate reader without changing panels, inputs or the current run',t=>{
 const f=fixture(t),input=f.node('field');input.value='.17';
 let focuses=0;const reader={closed:false,focus:()=>focuses++} as unknown as Window,opened:unknown[][]=[];f.window.open=(...args)=>{opened.push(args);return reader;};
 f.workspace.open('controls');f.node('start-here').click();
 assert.deepEqual(opened,[['/start.html','mass-spinner-start']]);
 assert.equal(f.node('window-guide').hidden,true);assert.equal(f.node('window-controls').hidden,false);
 assert.equal(f.node('field'),input);assert.equal(input.value,'.17');
 assert.equal(f.node('start-here').getAttribute('aria-controls'),null);
 f.node('start-here').click();assert.equal(opened.length,1);assert.equal(focuses,1,'focus the existing reader without reloading its reading position');
 f.workspace.close('controls');
 const send=(origin:string,source:any,action:string)=>f.window.dispatchEvent(new f.window.MessageEvent('message',{origin,source,data:{type:'mass-spinner:guide-action',action}}));
 send('https://unrelated.example',reader,'current');send('https://example.org',f.window,'current');send('https://example.org',reader,'invalid');
 assert.equal(f.node('window-controls').hidden,true);
 send('https://example.org',reader,'current');assert.equal(f.node('window-controls').hidden,false);
});

test('all seven steps have a live action and retain the physical scope distinctions',t=>{
 const f=fixture(t);f.workspace.open('guide');
 for(let i=0;i<7;i++){
  f.step(i);assert.ok(f.doc.querySelectorAll('.guide-actions button').length>=2);
  assert.equal(f.node('window-guide').querySelector('h3').nextElementSibling.className,'guide-actions','put the action before the explanation');
  assert.equal(f.node('window-guide').querySelectorAll('ol li').length,2);assert.match(f.node('window-guide').textContent,/Watch for/);
 }
 f.step(3);assert.match(f.node('window-guide').textContent,/percentage or purity does not itself change by that factor/i);
 f.step(5);assert.match(f.node('window-guide').textContent,/do not simulate an extraction flow/);
 f.step(6);assert.match(f.node('window-guide').textContent,/not experimental accuracy/);
 f.node('window-guide').querySelector('.guide-navigation button:nth-child(2)').click();
 assert.equal(f.node('window-guide').hidden,true);assert.equal(f.doc.activeElement,f.node('start-here'));
});

test('pending or missing results explain what to do instead of inventing a successful experiment',t=>{
 const f=fixture(t);f.workspace.open('guide');f.step(1);
 f.doc.querySelector<HTMLButtonElement>('.guide-actions button')!.click();
 assert.match(f.node('guide-status').textContent,/Wait for the run to finish/);
 assert.equal(f.node('window-plots').hidden,true);
});

test('the walkthrough respects the one-sheet mobile layout, Escape and context availability',t=>{
 const f=fixture(t,true);f.workspace.open('guide');f.workspace.open('plots');
 assert.equal(f.node('window-guide').hidden,true);assert.equal(f.node('window-plots').hidden,false);
 f.workspace.open('guide');assert.equal(f.node('window-plots').hidden,true);
 f.node('window-guide').dispatchEvent(new f.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
 assert.equal(f.doc.activeElement,f.node('start-here'));assert.equal(f.node('window-guide').hidden,true);
 for(const level of ['1','3','4']){f.workspace.setLevel(level);assert.equal(f.node('start-here').hidden,true);}
 f.workspace.setLevel('2');assert.equal(f.node('start-here').hidden,false);
 f.node('marathon-apparatus').value='source';f.node('marathon-apparatus').dispatchEvent(new f.window.Event('change'));
 assert.equal(f.node('start-here').hidden,true);assert.equal(f.node('window-guide').hidden,true);
});

test('physics reading loads on demand and preserves its place while controls or experiments are open',t=>{
 const f=fixture(t);f.workspace.open('guide');const frame=f.node('physics-guide-frame');
 assert.equal(frame.hasAttribute('src'),false,'do not load the full reading and math fonts before requested');
 f.workspace.openPhysics('energy');assert.equal(frame.getAttribute('src'),'/guide.html#energy');
 assert.equal(f.doc.querySelector('.guide-physics').hidden,false);assert.equal(f.doc.querySelector('.guide-reading').hidden,true);
 f.workspace.open('controls');f.workspace.open('guide');
 assert.equal(f.doc.querySelector('.guide-physics').hidden,false);assert.equal(frame.getAttribute('src'),'/guide.html#energy');
 const buttons=[...f.doc.querySelectorAll<HTMLButtonElement>('.guide-views button')];
 buttons[0].click();assert.equal(f.doc.querySelector('.guide-reading').hidden,false);
 buttons[1].click();assert.equal(frame.getAttribute('src'),'/guide.html#energy');
 assert.equal(buttons[1].getAttribute('aria-pressed'),'true');
});

test('the mobile physics reader has a panel height instead of the iframe intrinsic height',t=>{
 const f=fixture(t,true);f.workspace.openPhysics('drive');
 const selector='#window-guide:has(.guide-physics:not([hidden]))';
 assert.equal(f.doc.querySelector(selector),f.node('window-guide'));
 const style=f.doc.createElement('style');style.textContent=readFileSync('src/workspace.css','utf8');f.doc.head.append(style);
 const mobile=[...style.sheet!.cssRules].find(rule=>rule instanceof f.window.CSSMediaRule&&rule.conditionText.replace(/\s/g,'')==='(max-width:740px)') as CSSMediaRule;
 const reader=[...mobile.cssRules].find(rule=>(rule as CSSStyleRule).selectorText===selector) as CSSStyleRule;
 assert.equal(reader.style.height,'58dvh');
 f.doc.querySelector<HTMLButtonElement>('.guide-views button')!.click();
 assert.equal(f.doc.querySelector(selector),null,'short experiment cards must retain their intrinsic size');
});

test('only messages from the same-origin guide frame can operate native controls or close the guide',t=>{
 const f=fixture(t);f.workspace.openPhysics('drive');const frame=f.node('physics-guide-frame');
 const send=(origin:string,source:any,action:string,type='mass-spinner:guide-action')=>f.window.dispatchEvent(new f.window.MessageEvent('message',{origin,source,data:{type,action}}));
 send('https://unrelated.example',frame.contentWindow,'current');assert.equal(f.node('window-controls').hidden,true);
 send('https://example.org',f.window,'current');assert.equal(f.node('window-controls').hidden,true);
 send('https://example.org',frame.contentWindow,'not-an-action');assert.equal(f.node('window-controls').hidden,true);
 send('https://example.org',frame.contentWindow,'current');assert.equal(f.node('window-controls').hidden,false);
 f.workspace.open('guide');send('https://example.org',frame.contentWindow,'','mass-spinner:guide-close');
 assert.equal(f.node('window-guide').hidden,true);assert.equal(f.doc.activeElement,f.node('start-here'));
});

test('the current experiment rewinds before editing and compares endpoints without silently changing inputs',t=>{
 const f=fixture(t);f.workspace.open('guide');f.step(1);
 const input=f.doc.createElement('input');input.id='fuel-currentA';input.value='.07';f.node('window-controls').querySelector('.world-window-body').append(input);
 const make=(tag:string,id:string,value:string)=>{const n=f.doc.createElement(tag) as any;n.id=id;n.value=value;f.doc.body.append(n);return n;};
 const mode=make('select','fuel-motion-mode','');mode.innerHTML='<option value="equilibrium">Reference</option><option value="transport">Coupled</option>';mode.value='equilibrium';
 const time=make('input','fuel-motion-time','.6');time.type='range';time.min='0';time.max='1';time.step='any';time.value='.6';
 const plot=make('select','fuel-plot','');plot.innerHTML='<option value="composition">Composition</option><option value="spin">Spin-up</option>';
 const plotHost=make('div','fuel-plots','');plotHost.innerHTML='<div class="live-plots"></div>';
 make('details','fuel-learning-comparisons','');make('button','fuel-export','');
 let restarted=0;make('button','fuel-new-run','').addEventListener('click',()=>restarted++);
 const seen:number[]=[];time.addEventListener('input',()=>seen.push(Number(time.value)));
 f.doc.querySelector<HTMLButtonElement>('.guide-actions button')!.click();
 assert.equal(mode.value,'transport');assert.equal(time.value,'0');assert.equal(input.value,'.07');
 assert.equal(restarted,1,'preparation explicitly clears old drive history through New run');
 assert.equal(f.doc.activeElement,input);assert.equal(f.node('window-controls').hidden,false);
 assert.match(f.node('window-guide').textContent,/0 A.*0.03 A/);
 f.doc.querySelectorAll<HTMLButtonElement>('.guide-actions button')[1].click();
 assert.equal(time.value,'1');assert.equal(plot.value,'spin');assert.deepEqual(seen,[0,1]);
});

test('temperature equation term focuses the temperature input without changing its value',t=>{
 const f=fixture(t),input=f.doc.createElement('input');input.id='fuel-gasK';input.value='500';
 f.node('window-controls').querySelector('.world-window-body').append(input);
 f.workspace.launchGuideAction('gasTemperature');
 assert.equal(f.node('window-controls').hidden,false);assert.equal(f.doc.activeElement,input);assert.equal(input.value,'500');
});

test('numbered tutorial process links expand their section and focus the canonical input without editing',t=>{
 const f=fixture(t),body=f.node('window-controls').querySelector('.world-window-body');
 for(const [action,id]of Object.entries({stageControls:'fuel-stages',pumpControls:'fuel-pumpSpeedM3S',inventoryControls:'fuel-fusionMW'})){
  const section=f.doc.createElement('details'),input=f.doc.createElement('input');input.id=id;input.value='3';section.append(input);body.append(section);
  let edits=0;input.addEventListener('input',()=>edits++);
  f.workspace.launchGuideAction(action);
  assert.equal(f.node('window-controls').hidden,false);assert.equal(section.open,true);
  assert.equal(f.doc.activeElement,input);assert.equal(input.value,'3');assert.equal(edits,0);
  f.workspace.close('controls');
 }
});

test('investigation actions open the actual existing plots without changing inputs or physical time',t=>{
 const f=fixture(t),fuel=acceptedFuel(f),time=fuel.time.value;f.node('field').value='.17';
 for(const [action,value]of Object.entries({spinPlot:'spin',compositionPlot:'composition',separationPlot:'separation',thermalProfile:'thermalProfile',gasEnergy:'gasEnergy',gasPressure:'gasPressure',magneticLeverage:'field',cascade:'cascade',pumping:'pump',fuelInventory:'inventory',lithiumSurfaces:'lithium'})){
  f.workspace.launchGuideAction(action);
  assert.equal(fuel.plot.value,value);assert.equal(f.node('window-plots').hidden,false);
  assert.equal(fuel.time.value,time);assert.equal(fuel.mode.value,'transport');assert.equal(f.node('field').value,'.17');
 }
 fuel.mode.value='equilibrium';f.workspace.launchGuideAction('spinPlot');
 assert.equal(fuel.time.value,time);assert.equal(fuel.mode.value,'equilibrium','opening a speed plot must not switch or replay a reference view');assert.equal(f.node('field').value,'.17');
 fuel.plot.querySelector('option[value="lithium"]')!.disabled=true;fuel.plot.value='spin';
 f.workspace.launchGuideAction('lithiumSurfaces');
 assert.equal(fuel.plot.value,'spin');assert.match(f.node('guide-status').textContent,/lithium feed/);
 fuel.plot.querySelector('option[value="cascade"]')!.disabled=true;
 f.workspace.launchGuideAction('cascade');assert.match(f.node('guide-status').textContent,/Isotope separation/);
});

test('new plot links wait for accepted results and panel links remain available while updating',async t=>{
 const f=fixture(t),fuel=acceptedFuel(f);fuel.accepted.disabled=true;
 f.workspace.launchGuideAction('separationPlot');assert.equal(fuel.plot.value,'spin');
 assert.equal(f.node('window-plots').hidden,true);assert.match(f.node('guide-status').textContent,/Waiting for the computed run/);
 fuel.accepted.disabled=false;await Promise.resolve();
 assert.equal(fuel.plot.value,'separation');assert.equal(f.node('window-plots').hidden,false);
 fuel.accepted.disabled=true;
 f.workspace.launchGuideAction('view');assert.equal(f.node('window-view').hidden,false);
 f.workspace.launchGuideAction('inspect');assert.equal(f.node('window-inspect').hidden,false);
 f.workspace.launchGuideAction('modelInfo');assert.equal(f.node('window-info').hidden,false);
});

test('cut power is a single explicit intervention, never a power-on or hidden rewind',t=>{
 const f=fixture(t),fuel=acceptedFuel(f),time=fuel.time.value;let cuts=0,restarts=0;
 fuel.power.addEventListener('click',()=>{cuts++;fuel.power.setAttribute('aria-pressed','false');});
 fuel.newRun.addEventListener('click',()=>restarts++);
 f.workspace.launchGuideAction('cutPower');assert.equal(cuts,1);assert.equal(fuel.time.value,time);assert.equal(restarts,0);
 f.workspace.launchGuideAction('cutPower');assert.equal(cuts,1);assert.match(f.node('guide-status').textContent,/already off/);
 fuel.mode.value='equilibrium';fuel.power.setAttribute('aria-pressed','true');
 f.workspace.launchGuideAction('cutPower');assert.equal(cuts,1);assert.equal(fuel.mode.value,'equilibrium');assert.match(f.node('guide-status').textContent,/Choose Coupled separation/);
 fuel.mode.value='transport';fuel.power.disabled=true;
 f.workspace.launchGuideAction('cutPower');assert.equal(cuts,1);assert.match(f.node('guide-status').textContent,/cannot be changed here/);
 f.workspace.launchGuideAction('newRun');assert.equal(restarts,1);
});

test('new investigation actions preserve origin restrictions and cannot modify an inactive centrifuge',t=>{
 const f=fixture(t),fuel=acceptedFuel(f);let restarts=0;
 fuel.newRun.addEventListener('click',()=>restarts++);f.workspace.openPhysics('drive');
 const frame=f.node('physics-guide-frame');
 const send=(origin:string,source:any)=>f.window.dispatchEvent(new f.window.MessageEvent('message',{origin,source,data:{type:'mass-spinner:guide-action',action:'newRun'}}));
 send('https://foreign.example',frame.contentWindow);send('https://example.org',f.window);assert.equal(restarts,0);
 f.node('marathon-apparatus').value='source';f.node('marathon-apparatus').dispatchEvent(new f.window.Event('change'));
 send('https://example.org',frame.contentWindow);assert.equal(restarts,0);assert.match(f.node('guide-status').textContent,/Choose Centrifuge/);
});
