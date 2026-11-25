import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {setupPreciseControls} from '../src/precise-controls.js';
import {setupWorkspace} from '../src/workspace-ui.js';
import {guideActions,guideExperiments,type GuideExperiment} from '../src/guide-topics.js';
import type {GuideExampleAccess} from '../src/guide-examples.js';
import type {Scenario} from '../src/scenario-state.js';

function fixture(t:any,mobile=false,examples?:GuideExampleAccess){
 const {window}=new JSDOM(readFileSync('index.html','utf8'),{url:'https://example.org/?level=2'}),doc=window.document;
 const workspace=setupWorkspace({examples,document:doc,matchMedia:()=>({matches:mobile,addEventListener(){}}),storage:null});
 const node=(id:string)=>doc.getElementById(id)! as any;
 t.after(()=>window.close());
 workspace.setLevel('2');
 // Canonical current input is mounted by the live centrifuge before a control action is ready.
 const control=doc.createElement('div');control.className='control';
 control.innerHTML='<label for="fuel-currentA"><span>Radial discharge current</span><output>0.03 A</output></label><input id="fuel-currentA" type="range" min="0" max="0.2" step="0.001" value="0.03" data-unit="A">';
 doc.querySelector('#window-controls .world-window-body')!.append(control);setupPreciseControls(control);
 return {doc,window,workspace,node};
}

/** Native controls mounted by the centrifuge after the workspace exists. */
function acceptedFuel(f:ReturnType<typeof fixture>){
 const make=(tag:string,id:string)=>{const node=f.doc.createElement(tag) as any;node.id=id;f.doc.body.append(node);return node;};
 const mode=make('select','fuel-motion-mode');mode.innerHTML='<option value="transport">Coupled separation</option><option value="equilibrium">Equilibrium reference</option>';
 const time=make('input','fuel-motion-time');time.type='range';time.min='0';time.max='1';time.step='any';time.value='.4';
 const plot=make('select','fuel-plot');
 for(const value of ['spin','composition','separation','thermal','heat','cut','momentum','inertia','thermalProfile','gasEnergy','gasPressure','field','cascade','pump','inventory','lithium']){const option=f.doc.createElement('option');option.value=value;option.textContent=value;plot.append(option);}
 const plotHost=make('div','fuel-plots');plotHost.innerHTML='<div class="live-plots"></div>';
 make('output','fuel-composition-readout');
 make('details','fuel-learning-comparisons');const accepted=make('button','fuel-export'),newRun=make('button','fuel-new-run'),power=make('button','fuel-power');
 power.setAttribute('aria-pressed','true');
 return {mode,time,plot,accepted,newRun,power};
}

test('Docs opens a persistent reader beside the same native controls and run',t=>{
 const f=fixture(t),input=f.node('field');input.value='.17';
 let popups=0;f.window.open=()=>{popups++;return null;};
 f.workspace.open('controls');f.node('open-docs').click();
 assert.equal(popups,0);assert.equal(f.node('window-guide').hidden,false);assert.equal(f.node('window-controls').hidden,false);
 assert.equal(f.node('physics-guide-frame').getAttribute('src'),'/learn.html');assert.equal(input.value,'.17');
 assert.equal(f.node('open-docs').getAttribute('aria-controls'),'window-guide');
 f.workspace.openTutorial('/tutorial-03.html#budget');f.workspace.close('guide');f.node('open-docs').click();
 assert.equal(f.node('physics-guide-frame').getAttribute('src'),'/tutorial-03.html#budget');
 assert.equal(f.node('window-guide').hidden,false);assert.equal(f.doc.getElementById('start-here'),null);
});

test('the same reader remains available in every playground without changing physical inputs',t=>{
 const f=fixture(t),input=f.node('field');input.value='.17';
 for(const level of ['1','2','3','4'] as const){f.workspace.setLevel(level);f.node('open-docs').click();assert.equal(f.node('window-guide').hidden,false);f.workspace.close('guide');}
 f.workspace.setLevel('2');f.workspace.openTutorial('/start.html');
 const frame=f.node('physics-guide-frame');
 const send=(origin:string,source:any,action:string)=>f.window.dispatchEvent(new f.window.MessageEvent('message',{origin,source,data:{type:'mass-spinner:guide-action',action}}));
 send('https://unrelated.example',frame.contentWindow,'current');send('https://example.org',f.window,'current');
 assert.equal(f.node('window-controls').hidden,true);
 send('https://example.org',frame.contentWindow,'current');assert.equal(f.node('window-controls').hidden,false);assert.equal(f.node('window-guide').hidden,false);
 assert.equal(input.value,'.17');
 f.node('marathon-apparatus').value='source';f.node('marathon-apparatus').dispatchEvent(new f.window.Event('change'));
 assert.equal(f.node('window-guide').hidden,false);
});

test('the guide has one reader and no hidden legacy controls',t=>{
 const f=fixture(t);f.node('open-docs').click();
 const host=f.node('window-guide');
 assert.equal(host.querySelectorAll('iframe').length,1);
 for(const selector of ['#guide-step','.guide-actions','.guide-views','.guide-reading','.guide-navigation'])assert.equal(host.querySelector(selector),null,selector);
 assert.equal(f.node('physics-guide-frame').getAttribute('src'),'/learn.html');
 assert.equal(host.querySelector('#guide-status').textContent,'');
});

test('a missing accepted run waits without claiming a successful experiment',t=>{
 const f=fixture(t);f.workspace.openTutorial('/start.html#current');
 f.workspace.launchGuideAction('endSpin');
 assert.match(f.node('guide-status').textContent,/Waiting for the calculated run/);
 assert.equal(f.node('window-plots').hidden,true);
});

test('the mobile reader remains open beside active controls and supports Escape',t=>{
 const f=fixture(t,true);f.workspace.open('guide');f.workspace.open('plots');
 assert.equal(f.node('window-guide').hidden,false);assert.equal(f.node('window-plots').hidden,false);
 f.workspace.open('guide');assert.equal(f.node('window-plots').hidden,false);
 f.node('window-guide').dispatchEvent(new f.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true}));
 assert.equal(f.doc.activeElement,f.node('open-docs'));assert.equal(f.node('window-guide').hidden,true);
 for(const level of ['1','3','4']){f.workspace.setLevel(level);assert.equal(f.node('open-docs').hidden,false);f.workspace.open('guide');assert.equal(f.node('window-guide').hidden,false);}
 f.workspace.setLevel('2');assert.equal(f.node('open-docs').hidden,false);
 f.node('marathon-apparatus').value='source';f.node('marathon-apparatus').dispatchEvent(new f.window.Event('change'));
 assert.equal(f.node('open-docs').hidden,false);assert.equal(f.node('window-guide').hidden,true);
 f.workspace.launchGuideAction('current');assert.equal(f.node('window-controls').hidden,true,'centrifuge actions remain unavailable in the source model');
});

test('physics reading loads on demand and preserves its place while controls or experiments are open',t=>{
 const f=fixture(t);f.workspace.open('guide');const frame=f.node('physics-guide-frame');
 assert.equal(frame.hasAttribute('src'),false,'do not load the full reading and math fonts before requested');
 f.workspace.openPhysics('energy');assert.equal(frame.getAttribute('src'),'/guide.html#energy');
 assert.equal(f.doc.querySelector('.guide-physics').hidden,false);
 f.workspace.open('controls');f.workspace.open('guide');
 assert.equal(f.doc.querySelector('.guide-physics').hidden,false);assert.equal(frame.getAttribute('src'),'/guide.html#energy');
 f.workspace.openTutorial('/start.html#current');assert.equal(frame.getAttribute('src'),'/start.html#current');
 f.workspace.openPhysics('energy');assert.equal(frame.getAttribute('src'),'/guide.html#energy');
});

test('the mobile physics reader has a panel height instead of the iframe intrinsic height',t=>{
 const f=fixture(t,true);f.workspace.openPhysics('drive');
 const selector='#window-guide:has(.guide-physics:not([hidden]))';
 assert.equal(f.doc.querySelector(selector),f.node('window-guide'));
 const style=f.doc.createElement('style');style.textContent=readFileSync('src/workspace.css','utf8');f.doc.head.append(style);
 const mobile=[...style.sheet!.cssRules].find(rule=>rule instanceof f.window.CSSMediaRule&&rule.conditionText.replace(/\s/g,'')==='(max-width:740px)') as CSSMediaRule;
 const reader=[...mobile.cssRules].find(rule=>(rule as CSSStyleRule).selectorText===selector) as CSSStyleRule;
 assert.equal(reader.style.height,'58dvh');
 f.workspace.openTutorial('/start.html#current');
 assert.equal(f.doc.querySelector(selector),f.node('window-guide'),'every tutorial uses the same full-height reader');
});

test('only messages from the same-origin guide frame can operate native controls or close the guide',t=>{
 const f=fixture(t);f.workspace.openPhysics('drive');const frame=f.node('physics-guide-frame');
 const send=(origin:string,source:any,action:string,type='mass-spinner:guide-action')=>f.window.dispatchEvent(new f.window.MessageEvent('message',{origin,source,data:{type,action}}));
 send('https://unrelated.example',frame.contentWindow,'current');assert.equal(f.node('window-controls').hidden,true);
 send('https://example.org',f.window,'current');assert.equal(f.node('window-controls').hidden,true);
 send('https://example.org',frame.contentWindow,'not-an-action');assert.equal(f.node('window-controls').hidden,true);
 send('https://example.org',frame.contentWindow,'current');assert.equal(f.node('window-controls').hidden,false);
 f.workspace.open('guide');send('https://example.org',frame.contentWindow,'','mass-spinner:guide-close');
 assert.equal(f.node('window-guide').hidden,true);assert.equal(f.doc.activeElement,f.node('open-docs'));
});

test('the current experiment rewinds before editing and compares endpoints without silently changing inputs',t=>{
 const f=fixture(t);f.workspace.openTutorial('/start.html#current');
 const input=f.node('fuel-currentA');input.value='.07';
 const make=(tag:string,id:string,value:string)=>{const n=f.doc.createElement(tag) as any;n.id=id;n.value=value;f.doc.body.append(n);return n;};
 const mode=make('select','fuel-motion-mode','');mode.innerHTML='<option value="equilibrium">Reference</option><option value="transport">Coupled</option>';mode.value='equilibrium';
 const time=make('input','fuel-motion-time','.6');time.type='range';time.min='0';time.max='1';time.step='any';time.value='.6';
 const plot=make('select','fuel-plot','');plot.innerHTML='<option value="composition">Composition</option><option value="spin">Spin-up</option>';
 const plotHost=make('div','fuel-plots','');plotHost.innerHTML='<div class="live-plots"></div>';
 for(const [id,values]of [['fuel-view-representation',['both','tracers']],['fuel-view-drive',['all','off']]] as const){
  const select=make('select',id,'');select.innerHTML=values.map(value=>`<option>${value}</option>`).join('');
 }
 make('details','fuel-learning-comparisons','');make('button','fuel-export','');
 let restarted=0;make('button','fuel-new-run','').addEventListener('click',()=>restarted++);
 const seen:number[]=[];time.addEventListener('input',()=>seen.push(Number(time.value)));
 f.workspace.launchGuideAction('currentExperiment');
 assert.equal(mode.value,'transport');assert.equal(time.value,'0');assert.equal(input.valueAsNumber,.07);
 assert.equal(restarted,1,'preparation explicitly clears old drive history through New run');
 assert.equal(f.doc.activeElement,input.closest('.control').querySelector('.precise-editor input'));assert.equal(f.node('window-controls').hidden,false);
 f.workspace.launchGuideAction('endSpin');
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
 for(const [action,id]of Object.entries({stageControls:'fuel-stages',pumpControls:'fuel-pumpSpeedM3S',inventoryControls:'fuel-burnFraction'})){
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
 assert.equal(fuel.time.value,time);assert.equal(fuel.mode.value,'transport','a tutorial history selects the coupled scene');assert.equal(f.node('field').value,'.17');
 fuel.plot.querySelector('option[value="lithium"]')!.disabled=true;fuel.plot.value='spin';
 f.workspace.launchGuideAction('lithiumSurfaces');
 assert.equal(fuel.plot.value,'spin');assert.match(f.node('guide-status').textContent,/lithium feed/);
 fuel.plot.querySelector('option[value="cascade"]')!.disabled=true;
 f.workspace.launchGuideAction('cascade');assert.match(f.node('guide-status').textContent,/Isotope separation/);
});

test('new plot links wait for accepted results and panel links remain available while updating',async t=>{
 const f=fixture(t),fuel=acceptedFuel(f);fuel.accepted.disabled=true;
 f.workspace.launchGuideAction('separationPlot');assert.equal(fuel.plot.value,'spin');
 assert.equal(f.node('window-plots').hidden,true);assert.match(f.node('guide-status').textContent,/Waiting for the calculated run/);
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
 f.workspace.launchGuideAction('cutPower');assert.equal(cuts,1);assert.equal(fuel.time.value,time);assert.equal(restarts,0);assert.equal(fuel.plot.value,'spin');assert.equal(f.node('window-plots').hidden,false);
 f.workspace.launchGuideAction('cutPower');assert.equal(cuts,1);assert.match(f.node('guide-status').textContent,/already off/);
 fuel.mode.value='equilibrium';fuel.power.setAttribute('aria-pressed','true');
 f.workspace.launchGuideAction('cutPower');assert.equal(cuts,1);assert.equal(fuel.mode.value,'equilibrium');assert.match(f.node('guide-status').textContent,/Before you cut power, select Coupled separation/);
 fuel.mode.value='transport';fuel.power.disabled=true;
 f.workspace.launchGuideAction('cutPower');assert.equal(cuts,1);assert.match(f.node('guide-status').textContent,/select a time below 60 s in an accepted coupled run/);
 f.workspace.launchGuideAction('newRun');assert.equal(restarts,1);
});

test('new investigation actions preserve origin restrictions and cannot modify an inactive centrifuge',t=>{
 const f=fixture(t),fuel=acceptedFuel(f);let restarts=0;
 fuel.newRun.addEventListener('click',()=>restarts++);f.workspace.openPhysics('drive');
 const frame=f.node('physics-guide-frame');
 const send=(origin:string,source:any)=>f.window.dispatchEvent(new f.window.MessageEvent('message',{origin,source,data:{type:'mass-spinner:guide-action',action:'newRun'}}));
 send('https://foreign.example',frame.contentWindow);send('https://example.org',f.window);assert.equal(restarts,0);
 f.node('marathon-apparatus').value='source';f.node('marathon-apparatus').dispatchEvent(new f.window.Event('change'));
 f.workspace.launchGuideAction('newRun');assert.equal(restarts,0);assert.match(f.node('guide-status').textContent,/select Centrifuge/);
 send('https://example.org',frame.contentWindow);assert.equal(restarts,1);assert.equal(f.node('marathon-apparatus').value,'centrifuge');assert.equal(f.node('window-guide').hidden,false);
});

function experimentControls(f:ReturnType<typeof fixture>){
 const body=f.node('window-controls').querySelector('.world-window-body'),controls=f.doc.createElement('div');controls.id='fuel-controls';body.append(controls);
 const make=(tag:string,id:string)=>{const element=f.doc.createElement(tag) as any;element.id=id;return element;};
 const application=make('select','fuel-application');application.innerHTML='<option value="enrichment">Isotope separation</option><option value="pump">Differential pumping</option>';controls.append(application);
 const pair=make('select','fuel-pair');pair.innerHTML='<option value="lithium">Lithium</option><option value="molecular">Molecular</option>';controls.append(pair);
 for(const selector of new Set(Object.values(guideExperiments).filter((e:GuideExperiment)=>!e.apparatus).map(e=>e.control))){
  if(f.doc.querySelector(selector))continue;
  const section=f.doc.createElement('details'),summary=f.doc.createElement('summary'),input=make('input',selector.slice(1));summary.textContent=selector;
  input.value='0.03';if(selector==='#fuel-thermal-enabled')input.type='checkbox';section.append(summary,input);controls.append(section);
 }
 const pumping=f.doc.createElement('details'),summary=f.doc.createElement('summary'),pump=make('input','fuel-pumpSpeedM3S');summary.textContent='Pumping';pumping.append(summary,pump);controls.append(pumping);
 return {application,pair,controls};
}

test('every tutorial experiment reveals canonical controls and its result without editing physical inputs',t=>{
 const f=fixture(t),fuel=acceptedFuel(f),inputs=experimentControls(f);
 const plots:Record<string,string>={thermalPlot:'thermal',thermalProfile:'thermalProfile',collection:'cut',cascade:'cascade',pumping:'pump',fuelInventory:'inventory',separationPlot:'separation',spinPlot:'spin',magneticLeverage:'field',lithiumSurfaces:'lithium'};
 let edits=0,restarts=0;inputs.controls.addEventListener('input',()=>edits++);fuel.newRun.addEventListener('click',()=>restarts++);
 for(const [key,context]of Object.entries(guideExperiments) as [string,GuideExperiment][]){
  assert.ok(guideActions.has(context.result),`${key}: result action registered`);if(context.apparatus)continue;
  const input=f.doc.querySelector<HTMLInputElement>(context.control)!,before=input.value;
  f.workspace.launchGuideAction(key);
  assert.equal(f.node('window-controls').hidden,false);assert.equal(f.node('window-plots').hidden,false);
  assert.equal(fuel.plot.value,plots[context.result]);assert.equal(f.doc.activeElement,input);
  assert.equal(input.value,before);assert.equal(input.closest('details')?.open??true,true);
  assert.equal(f.doc.querySelectorAll('.guide-experiment').length,1,'replace the previous task instead of accumulating notes');
  assert.match(f.doc.querySelector('.guide-experiment')!.textContent!,new RegExp(context.title));
 }
 assert.equal(edits,0);assert.equal(restarts,0);assert.equal(f.node('fuel-thermal-enabled').checked,false,'model enabling stays explicit');
 assert.equal(inputs.application.value,'enrichment');assert.equal(inputs.pair.value,'lithium');
});

test('phone experiment links open controls first and give one direct route to the relevant plot',t=>{
 const f=fixture(t,true),fuel=acceptedFuel(f);experimentControls(f);
 f.workspace.launchGuideAction('inventoryExperiment');
 assert.equal(f.node('window-controls').hidden,false);assert.equal(f.node('window-plots').hidden,true);
 assert.equal(f.doc.activeElement,f.node('fuel-burnFraction'));
 f.doc.querySelector<HTMLButtonElement>('.guide-experiment button')!.click();
 assert.equal(f.node('window-controls').hidden,true);assert.equal(f.node('window-plots').hidden,false);assert.equal(fuel.plot.value,'inventory');
 f.workspace.open('controls');assert.match(f.doc.querySelector('.guide-experiment')!.textContent!,/burn fraction/);
});

test('tutorial experiments change apparatus only when a different apparatus is needed',t=>{
 const f=fixture(t,true);acceptedFuel(f);experimentControls(f);
 const apparatus=f.node('marathon-apparatus'),changes:string[]=[];
 apparatus.addEventListener('change',()=>changes.push(apparatus.value));
 for(const key of ['heatExperiment','spatialHeatExperiment','stageExperiment','pumpingExperiment','inventoryExperiment'])f.workspace.launchGuideAction(key);
 assert.deepEqual(changes,[],'opening controls in the current apparatus must not reload its geometry');
 assert.equal(f.doc.activeElement,f.node('fuel-burnFraction'));
 const current=f.doc.createElement('input');current.id='fusion-beamCurrentA';f.node('fusion-controls').append(current);
 f.workspace.launchGuideAction('beamSource');
 assert.deepEqual(changes,['source']);assert.equal(f.doc.activeElement,current);
 f.workspace.launchGuideAction('beamSource');assert.deepEqual(changes,['source']);
 f.workspace.launchGuideAction('inventoryExperiment');
 assert.deepEqual(changes,['source','centrifuge']);assert.equal(f.doc.activeElement,f.node('fuel-burnFraction'));
});

test('tutorial experiments reactivate a retained apparatus from every advanced playground',t=>{
 for(const level of ['1','3','4'] as const)for(const context of ['centrifuge','source'] as const){
  const f=fixture(t,true);acceptedFuel(f);experimentControls(f);
  const current=f.doc.createElement('input');current.id='fusion-beamCurrentA';f.node('fusion-controls').append(current);
  const apparatus=f.node('marathon-apparatus');apparatus.value=context;apparatus.dispatchEvent(new f.window.Event('change'));
  f.workspace.setLevel(level);
  let changes=0;
  // The experience controller uses this event to return from Advanced to Marathon.
  apparatus.addEventListener('change',()=>{changes++;f.workspace.setLevel('2');});
  const action=context==='source'?'beamSource':'inventoryExperiment';f.workspace.launchGuideAction(action);
  assert.equal(f.doc.querySelector<HTMLElement>('.sim-workspace')!.dataset.level,'2',`${level}: reactivate ${context}`);
  assert.equal(f.doc.activeElement,context==='source'?current:f.node('fuel-burnFraction'));
  assert.equal(changes,1);
  f.workspace.launchGuideAction(action);assert.equal(changes,1,'the active apparatus needs no second activation');
 }
});

test('experiment entrypoints are available while computing and their plot action waits for acceptance',async t=>{
 const f=fixture(t),fuel=acceptedFuel(f);experimentControls(f);fuel.accepted.disabled=true;
 f.workspace.launchGuideAction('spatialHeatExperiment');assert.equal(f.node('window-controls').hidden,false);
 assert.equal(f.node('window-plots').hidden,true);assert.equal(f.doc.activeElement,f.node('fuel-thermal-enabled'));
 f.doc.querySelector<HTMLButtonElement>('.guide-experiment button')!.click();
 assert.match(f.doc.querySelector('.guide-experiment [role=status]')!.textContent!,/Waiting for the calculated run/);
 fuel.accepted.disabled=false;await Promise.resolve();
 assert.equal(fuel.plot.value,'thermalProfile');assert.equal(f.node('window-plots').hidden,false);
 assert.equal(f.doc.querySelector('.guide-experiment [role=status]')!.textContent,'','clear the waiting note when the requested accepted plot opens');
});

test('transient tutorial entrypoints leave a reference view without changing physical inputs',t=>{
 const f=fixture(t),fuel=acceptedFuel(f);experimentControls(f);fuel.mode.value='equilibrium';
 f.workspace.launchGuideAction('diffusionExperiment');assert.equal(fuel.mode.value,'transport');assert.equal(fuel.plot.value,'separation');
 assert.equal(f.node('fuel-radialDiffusivityM2S').value,'0.03');
});

test('incompatible feed and application expose the prerequisite instead of focusing hidden or disabled controls',t=>{
 const f=fixture(t),fuel=acceptedFuel(f),inputs=experimentControls(f);
 inputs.application.value='pump';fuel.plot.querySelector('option[value="cut"]')!.disabled=true;
 f.node('fuel-cutFraction').closest('details').hidden=true;
 f.workspace.launchGuideAction('collectionExperiment');assert.equal(f.doc.activeElement,inputs.application);
 assert.equal(inputs.application.value,'pump');assert.match(f.doc.querySelector('.guide-experiment')!.textContent!,/Isotope separation/);
 f.node('fuel-thermal-enabled').disabled=true;inputs.pair.value='molecular';
 f.workspace.launchGuideAction('spatialHeatExperiment');assert.equal(f.doc.activeElement,inputs.pair);assert.equal(inputs.pair.value,'molecular');
 fuel.plot.querySelector('option[value="lithium"]')!.disabled=true;
 f.workspace.launchGuideAction('surfaceExperiment');assert.equal(f.doc.activeElement,inputs.pair);
 assert.match(f.doc.querySelector('.guide-experiment')!.textContent!,/atomic lithium feed/);
});

test('beam exercises switch apparatus and reveal actual source ledger or target settings without changing source inputs',t=>{
 const f=fixture(t);const current=f.doc.createElement('input');current.id='fusion-beamCurrentA';current.value='.01';f.node('fusion-controls').append(current);
 const initial=f.doc.createElement('details'),summary=f.doc.createElement('summary');initial.id='initial-source-reference';summary.textContent='Initial source';initial.append(summary,f.node('fusion-plots').closest('details'));f.node('window-plots').querySelector('.world-window-body').append(initial);
 const target=f.doc.createElement('div');target.id='coupled-target';target.innerHTML='<button id="coupled-tab-settings">Settings</button><button id="coupled-tab-dynamics">Dynamics</button><div id="coupled-view-settings" hidden><input id="coupled-pulseDuty" value="1"></div><div id="coupled-view-dynamics"><select id="coupled-plot"><option value="source">Neutrons &amp; temperature</option><option value="isotopes" selected>Isotopes</option></select></div>';
 f.node('window-target').querySelector('.world-window-body').append(target);
 const settings=f.node('coupled-view-settings'),dynamics=f.node('coupled-view-dynamics');
 f.node('coupled-tab-settings').addEventListener('click',()=>{settings.hidden=false;dynamics.hidden=true;});f.node('coupled-tab-dynamics').addEventListener('click',()=>{settings.hidden=true;dynamics.hidden=false;});
 let edits=0;current.addEventListener('input',()=>edits++);
 f.workspace.launchGuideAction('beamSource');assert.equal(f.node('marathon-apparatus').value,'source');assert.equal(f.doc.activeElement,current);
 assert.equal(initial.open,true);assert.equal(f.node('fusion-plots').closest('details').open,true);
 f.workspace.launchGuideAction('beamTarget');assert.equal(f.node('coupled-plot').value,'source');assert.equal(f.node('window-target').hidden,false);assert.equal(settings.hidden,false);assert.equal(f.doc.activeElement,f.node('coupled-pulseDuty'));
 f.doc.querySelector<HTMLButtonElement>('.guide-experiment button')!.click();assert.equal(settings.hidden,true);assert.equal(dynamics.hidden,false);assert.equal(f.doc.activeElement,f.node('coupled-plot'));
 assert.equal(current.value,'.01');assert.equal(edits,0);
});


test('gas tutorial uses the open side instead of looking through the end plate, without needing an accepted result',async t=>{
 const f=fixture(t),fuel=acceptedFuel(f);fuel.accepted.disabled=true;
 const camera:string[]=[];for(const id of ['fuel-reset-view','fuel-camera-cutaway','fuel-camera-axial']){const button=f.doc.createElement('button');button.id=id;button.addEventListener('click',()=>camera.push(id));f.doc.body.append(button);}
 f.workspace.launchGuideAction('look');
 assert.match(f.node('guide-status').textContent,/Waiting/);
 for(const [id,value]of [['fuel-view-representation','tracers'],['fuel-view-cutaway','.62'],['fuel-view-explode','0'],['fuel-view-drive','all'],['fuel-component','coils']]){
  const n=f.doc.createElement(['fuel-view-cutaway','fuel-view-explode'].includes(id)?'input':'select');n.id=id;
  if(n instanceof f.window.HTMLSelectElement){const option=f.doc.createElement('option');option.value=value;n.append(option);}
  f.doc.body.append(n);
 }
 await new Promise<void>(resolve=>setImmediate(resolve));
 assert.equal(f.node('guide-status').textContent,'');assert.equal(f.node('fuel-view-drive').value,'all');assert.deepEqual(camera,['fuel-reset-view','fuel-camera-cutaway']);
 f.workspace.launchGuideAction('coils');assert.equal(f.node('window-inspect').hidden,false);
 assert.equal(f.node('fuel-component').value,'coils');assert.equal(fuel.accepted.disabled,true);
});


test('the tutorial divider resizes the reader and Escape closes only the reader',t=>{
 const f=fixture(t);f.workspace.openTutorial('/start.html');f.workspace.open('plots');
 const handle=f.doc.querySelector<HTMLElement>('[aria-label="Resize tutorial and simulator"]')!;handle.focus();
 handle.dispatchEvent(new f.window.KeyboardEvent('keydown',{key:'End',bubbles:true,cancelable:true}));
 assert.equal(handle.getAttribute('aria-valuenow'),'60');
 handle.dispatchEvent(new f.window.KeyboardEvent('keydown',{key:'Home',bubbles:true,cancelable:true}));
 assert.equal(handle.getAttribute('aria-valuenow'),'28');
 handle.dispatchEvent(new f.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true}));
 assert.equal(f.node('window-guide').hidden,true);assert.equal(f.node('window-plots').hidden,false);
 assert.equal(f.doc.activeElement,f.node('open-docs'));
});


test('mobile tutorial controls keep their result plot and preserve the run',t=>{
 const f=fixture(t,true),fuel=acceptedFuel(f),time=fuel.time.value;
 f.workspace.openTutorial('/start.html');f.workspace.launchGuideAction('current');
 assert.equal(f.node('window-guide').hidden,false);assert.equal(f.node('window-controls').hidden,false);assert.equal(f.node('window-plots').hidden,false);
 assert.equal(fuel.plot.value,'spin');assert.equal(fuel.time.value,time);
 f.workspace.close('guide');f.workspace.open('controls');assert.equal(f.node('window-plots').hidden,true,'ordinary phone windows retain one-sheet behavior');
});

const exampleDefaults:Scenario={version:2,level:'2',controls:{'marathon-apparatus':'centrifuge','fuel-currentA':.03,'fuel-durationS':1,'fuel-thermal-enabled':false,'fuel-thermal-model':'lumped','fuel-thermal-gasModel':'lumped','fuel-application':'enrichment','fuel-pair':'lithium','fuel-plot':'spin'}};
const guideButton=(doc:Document,text:string)=>[...doc.querySelectorAll<HTMLButtonElement>('.guide-experiment button')].find(button=>button.textContent===text)!;

test('an explicit example restores full defaults and can restore the prior history without silent replacement',t=>{
 let current:Scenario={version:3,level:'2',controls:{...exampleDefaults.controls,'fuel-currentA':.07,'fuel-thermal-enabled':true,'fuel-thermal-model':'spatial','fuel-thermal-gasModel':'spatial','fuel-thermal-coolantK':700,'fuel-failure-pressurePa':77},fuelRun:{initialCurrentA:.06,events:[{timeS:.2,currentA:.07}],mode:'spin',timeS:.4}};
 const previous=structuredClone(current),restored:Scenario[]=[];
 const f=fixture(t,false,{defaults:exampleDefaults,capture:()=>structuredClone(current),restore:value=>{current=structuredClone(value);restored.push(current);f.workspace.setLevel('2');return true;}});
 acceptedFuel(f);experimentControls(f);
 f.workspace.launchGuideAction('spatialHeatExperiment');
 assert.deepEqual(current,previous,'opening a link does not replace inputs or history');
 guideButton(f.doc,'Use my run').click();assert.equal(restored.length,0);
 assert.equal(guideButton(f.doc,'Restore previous run').disabled,true);
 guideButton(f.doc,'Load example').click();
 assert.equal(f.node('window-guide').hidden,false,'loading reopens the same reader after experience restoration closes panels');
 assert.equal(current.controls['fuel-currentA'],.03);assert.equal(current.controls['fuel-thermal-enabled'],true);
 assert.equal(current.controls['fuel-thermal-gasModel'],'spatial');assert.equal(current.controls['fuel-failure-pressurePa'],undefined);
 assert.equal(current.version,3);if(current.version===3)assert.deepEqual(current.fuelRun,{initialCurrentA:.03,events:[],mode:'transport',timeS:0});
 guideButton(f.doc,'Restore previous run').click();assert.deepEqual(current,previous);assert.equal(f.node('window-guide').hidden,false);
 assert.equal(guideButton(f.doc,'Restore previous run').disabled,true);
});

test('a tutorial captures the previous apparatus before switching context',t=>{
 const original:Scenario={version:2,level:'2',controls:{...exampleDefaults.controls,'marathon-apparatus':'source','fusion-beamCurrentA':-2}};
 const restored:Scenario[]=[];let f:ReturnType<typeof fixture>;
 f=fixture(t,false,{defaults:exampleDefaults,capture:()=>({...structuredClone(original),controls:{...original.controls,'marathon-apparatus':f.node('marathon-apparatus').value}}),restore:value=>{restored.push(structuredClone(value));return true;}});
 acceptedFuel(f);experimentControls(f);f.node('marathon-apparatus').value='source';f.node('marathon-apparatus').dispatchEvent(new f.window.Event('change'));
 f.workspace.launchTutorialAction('collectionExperiment');assert.equal(f.node('marathon-apparatus').value,'centrifuge');
 guideButton(f.doc,'Load example').click();guideButton(f.doc,'Restore previous run').click();
 assert.deepEqual(restored.at(-1),original);
});

test('invalid input captures and rejected loads keep the last successful restore point',t=>{
 let pending=false,reject=false;const previous=structuredClone(exampleDefaults),restored:Scenario[]=[];
 const f=fixture(t,false,{defaults:exampleDefaults,capture:()=>{if(pending)throw new Error('pending');return structuredClone(previous);},restore:value=>{if(reject)return false;restored.push(structuredClone(value));return true;}});
 acceptedFuel(f);experimentControls(f);f.workspace.launchGuideAction('dragExperiment');guideButton(f.doc,'Load example').click();
 pending=true;f.workspace.launchGuideAction('collectionExperiment');guideButton(f.doc,'Load example').click();
 assert.match(f.doc.querySelector('.guide-experiment [role=status]')!.textContent!,/Cannot save the current inputs/);assert.equal(restored.length,1);
 pending=false;reject=true;guideButton(f.doc,'Load example').click();assert.equal(guideButton(f.doc,'Restore previous run').disabled,false);
 reject=false;guideButton(f.doc,'Restore previous run').click();assert.deepEqual(restored.at(-1),previous);
});

test('tutorial history actions synchronize the scene without changing physical time or replaying',t=>{
 const f=fixture(t),fuel=acceptedFuel(f);experimentControls(f);
 // Native mode changes rewind. The tutorial must restore the selected physical time.
 fuel.mode.addEventListener('change',()=>{fuel.time.value='0';});
 for(const key of ['spinPlot','compositionPlot','separationPlot','thermalProfile','gasEnergy','gasPressure','work','thermalPlot','current','drag','diffusion']){
  fuel.mode.value='equilibrium';fuel.time.value='.4';f.workspace.launchGuideAction(key);
  assert.equal(fuel.mode.value,'transport',key);assert.equal(fuel.time.valueAsNumber,.4,key);
 }
});
