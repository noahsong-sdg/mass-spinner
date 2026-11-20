import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {setupFuelCentrifuge} from '../src/fuel-centrifuge-ui.js';
import {simulateFuelCentrifuge} from '../src/fuel-centrifuge.js';
import {simulateFuelOperation} from '../src/fuel-operation.js';
import {sampleFuelTransport} from '../src/fuel-transport.js';
import {restoreScenario} from '../src/scenario-state.js';

const identity={schemaVersion:1,algorithm:'sha256',sourceHash:'a'.repeat(64),sourceFiles:{'src/fuel-operation.ts':'b'.repeat(64)}};
const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
const settle=async()=>{await new Promise(resolve=>setTimeout(resolve,160));await flush();};
function fixture(t:any,hold=false,graphicsReady=Promise.resolve()){
 const dom=new JSDOM('<main></main>',{url:'https://example.org/?level=2'}),doc=dom.window.document,requests:any[]=[],pending:any[]=[];let selected:any,animation:any,opened=0;const focused:string[]=[],focusedComponents:string[]=[];
 Object.defineProperty(dom.window,'matchMedia',{value:()=>({matches:true,addEventListener(){},removeEventListener(){}})});
 const old=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:doc,configurable:true});
 const solve=(r:any)=>{const rotor=simulateFuelCentrifuge(r.config);return {result:{...rotor,transport:simulateFuelOperation(rotor,r.operation,{},r.resume)},producingCode:identity};};
 const graphics=[{createApparatusViewer:(_frame:any,options:any)=>{selected=options;return {load:async(asset:any)=>options.loader.loadAsync(asset.model),select(){},focus(id:string){focusedComponents.push(id);},refresh(){},setAnimation(fn:any){animation=fn;},dispose(){}};}},
  {FUEL_COMPONENTS:[{id:'supply',name:'Discharge supply',purpose:'Inward radial current',material:'Metal and ceramic',basis:'Prescribed source'},...['coils','liner','light-outlet','pump','feed'].map(id=>({id,name:id,purpose:'Fixture component',material:'Illustrative',basis:'Not engineering CAD'}))],buildFuelCentrifugeGeometry:()=>({motion:{group:{visible:true},setSpecies(){},update:()=>({secondsPerScreenSecond:.001,speeds:{ion:0,neutral:0}})}})}];
 const ui=setupFuelCentrifuge({document:doc,loadGraphics:async()=>{await graphicsReady;return graphics;},onResults:()=>opened++,onControls:selector=>focused.push(selector),request:(r:any)=>{requests.push(structuredClone(r));return hold?new Promise((resolve,reject)=>pending.push(()=>{try{resolve(solve(r));}catch(error){reject(error);}})):Promise.resolve(solve(r));}});
 const node=(id:string)=>doc.getElementById(id) as any;
 const change=(id:string,value:string|number,type='input')=>{node(id).value=String(value);node(id).dispatchEvent(new dom.window.Event(type,{bubbles:true}));};
 const start=async()=>{ui.setActive(true);if(hold)pending.shift()();await flush();assert.ok(ui.latest);};
 t.after(()=>{ui.dispose();dom.window.close();if(old)Object.defineProperty(globalThis,'document',old);else Reflect.deleteProperty(globalThis,'document');});
 return {ui,doc,node,change,start,requests,pending,focused,focusedComponents,get selected(){return selected;},get animation(){return animation;},get opened(){return opened;}};
}

test('actual power control continues accepted momenta/distributions, branches past history and extends at the end',async t=>{
 const f=fixture(t);await f.start();f.change('fuel-motion-time',.423456);
 const old=f.ui.latest.result.transport,before=sampleFuelTransport(old,.423456);
 f.node('fuel-power').click();await f.ui.run();
 const request=f.requests.at(-1);assert.equal(request.config.currentA,.03);assert.equal(request.operation.events.at(-1).currentA,0);assert.equal(request.resume.timeS,.423456);
 const branch=sampleFuelTransport(f.ui.latest.result.transport,.423456);assert.deepEqual(branch.lightMass,before.lightMass);assert.equal(branch.neutralAngularMomentumKgM2S,before.neutralAngularMomentumKgM2S);assert.equal(branch.currentA,0);
 assert.equal(f.node('fuel-power').textContent,'Power on');assert.equal(Number(f.node('fuel-motion-time').value),.423456);
 f.change('fuel-motion-time',.8);f.node('fuel-power').click();await f.ui.run();assert.equal(f.ui.latest.result.transport.operation.events.length,2);
 f.change('fuel-motion-time',.6);f.change('fuel-currentA',.02);await f.ui.run();assert.deepEqual(f.ui.latest.result.transport.operation.events,[{timeS:.423456,currentA:0},{timeS:.6,currentA:.02}]);
 f.change('fuel-motion-time',1);f.node('fuel-power').click();await f.ui.run();assert.equal(f.ui.latest.result.config.durationS,2);assert.ok(f.ui.latest.result.transport.snapshots.at(-1).neutralRadS>0,'Cutting drive must not immediately stop the gas.');
 f.node('fuel-motion-restart').click();assert.equal(Number(f.node('fuel-motion-time').value),0);assert.equal(f.ui.latest.result.transport.operation.events.length,3,'Rewind retains history.');
 f.node('fuel-new-run').click();await f.ui.run();assert.equal(f.ui.latest.result.transport.operation.events.length,0);assert.equal(f.ui.latest.result.transport.snapshots[0].neutralRadS,0);
});

test('thermal setup resets explicitly; compact selected instrument exposes response and collapsed materials',async t=>{
 const f=fixture(t);await f.start();f.change('fuel-motion-time',.4);
 f.node('fuel-thermal-enabled').checked=true;f.node('fuel-thermal-enabled').dispatchEvent(new f.doc.defaultView!.Event('change'));await f.ui.run();
 assert.equal(Number(f.node('fuel-motion-time').value),0);assert.ok(f.ui.latest.result.transport.snapshots.at(-1).thermal);f.change('fuel-plot','thermal','change');assert.match(f.ui.nodes.plots.textContent,/Temperature \(K\)/);
 f.selected.onSelect('supply',{},'Discharge supply');
 const inspect=f.ui.nodes.inspect,link=inspect.querySelector('[data-control=currentA]'),details=inspect.querySelector('details');assert.ok(link&&details);assert.equal(details.open,false);assert.equal(inspect.querySelectorAll('input').length,0);assert.ok(link.compareDocumentPosition(details)&f.doc.defaultView!.Node.DOCUMENT_POSITION_FOLLOWING);assert.match(inspect.querySelector('[data-response]').textContent,/m\/s.*A/);
 [...inspect.querySelectorAll('button')].find((b:any)=>b.textContent==='Show end-of-run speeds')!.click();assert.equal(f.opened,1);assert.equal(f.node('fuel-plot').value,'spin');
 f.selected.onSelect('slice',{},'Gas');assert.equal(f.opened,2);assert.equal(f.node('fuel-plot').value,'composition');
 f.change('fuel-view-layer','temperature','change');f.selected.onSelect('slice',{},'Gas');assert.equal(f.node('fuel-plot').value,'thermal','A lumped temperature surface opens the scalar thermal history.');
 f.change('fuel-view-layer','enrichment','change');f.selected.onSelect('slice',{},'Gas');assert.equal(f.node('fuel-plot').value,'composition','Composition opens the percentage profile.');
 f.change('fuel-magneticT',1);await f.ui.run();assert.equal(Number(f.node('fuel-motion-time').value),0);assert.equal(f.requests.at(-1).resume,undefined);
});

test('late worker replies cannot overwrite newer intervention histories',async t=>{
 const f=fixture(t,true);await f.start();f.change('fuel-motion-time',.4);f.change('fuel-currentA',.04);const a=f.ui.run();
 f.change('fuel-currentA',.05);const b=f.ui.run();f.pending[1]();await b;const accepted=f.ui.latest;
 f.pending[0]();await a;assert.equal(f.ui.latest,accepted);assert.equal(f.ui.latest.result.transport.operation.events.at(-1).currentA,.05);
});

test('invalid thermal input retains accepted state and cutaway does not advertise hidden tracers',async t=>{
 const f=fixture(t);await f.start();const accepted=f.ui.latest,count=f.requests.length;
 assert.match(f.doc.querySelector('.fuel-motion-legend')!.textContent!,/weighted/);
 f.change('fuel-view-representation','field','change');
 assert.doesNotMatch(f.doc.querySelector('.fuel-motion-legend')!.textContent!,/weighted/);
 f.node('fuel-thermal-enabled').checked=true;f.change('fuel-thermal-wallCapacityJK','');await f.ui.run();
 assert.equal(f.ui.latest,accepted);assert.equal(f.requests.length,count);assert.match(f.ui.nodes.render.textContent,/permitted thermal settings/);
 f.change('fuel-thermal-wallCapacityJK',10);await f.ui.run();assert.ok(f.ui.latest.result.transport.snapshots.at(-1).thermal);
 f.change('fuel-view-representation','tracers','change');assert.match(f.doc.querySelector('.fuel-motion-legend')!.textContent!,/weighted/);
});

test('enabled thermal number edits invalidate accepted ownership before validation and recover through input events',async t=>{
 const f=fixture(t);await f.start();
 f.change('fuel-currentA',0);f.change('fuel-durationS',.01);f.change('fuel-linerK',500);
 f.node('fuel-thermal-enabled').checked=true;f.node('fuel-thermal-enabled').dispatchEvent(new f.doc.defaultView!.Event('change'));await settle();
 assert.ok(f.ui.latest.result.transport.operation.thermal.enabled);
 for(const [key,value]of [['wallCapacityJK',''],['gasWallWK',-1],['coolingWK',1000001],['coolantK','']] as const){
  const input=f.node(`fuel-thermal-${key}`),valid=input.value,accepted=f.ui.latest,count=f.requests.length;
  f.change(input.id,value);
  assert.equal(f.node('fuel-export').disabled,true,key);assert.equal(f.node('fuel-power').disabled,true,key);
  assert.match(f.ui.nodes.render.textContent,/previous accepted state/,key);
  assert.equal(f.node('fuel-input-coverage').dataset.match,'pending',key);
  await settle();assert.equal(f.requests.length,count,key);assert.equal(f.ui.latest,accepted,key);
  assert.equal(input.value,String(value),key);assert.match(f.ui.nodes.render.textContent,/permitted thermal settings.*Previous accepted state/,key);
  assert.match(f.node('fuel-result-scope').textContent,/Invalid settings.*previous accepted result/,key);
  f.change(input.id,valid);await settle();assert.equal(f.requests.length,count+1,key);assert.notEqual(f.ui.latest,accepted,key);assert.equal(f.node('fuel-export').disabled,false,key);
 }
 f.change('fuel-thermal-model','spatial','change');f.change('fuel-thermal-gasModel','spatial','change');await settle();
 for(const [id,value]of [['fuel-thermal-thicknessMm',21],['fuel-thermal-gasConductivityWMK','']] as const){
  const input=f.node(id),valid=input.value,accepted=f.ui.latest,count=f.requests.length;
  assert.equal(input.disabled,false,id);f.change(id,value);assert.equal(f.node('fuel-export').disabled,true,id);
  await settle();assert.equal(f.requests.length,count,id);assert.equal(f.ui.latest,accepted,id);assert.equal(input.value,String(value),id);
  f.change(id,valid);await settle();assert.equal(f.requests.length,count+1,id);assert.notEqual(f.ui.latest,accepted,id);assert.equal(f.node('fuel-export').disabled,false,id);
 }
});

test('Inspect contains no physical editors and old setup links retain canonical Controls and reject unknown inspector fields',async t=>{
 const f=fixture(t);await f.start();const accepted=f.ui.latest,count=f.requests.length;
 for(const id of ['supply','coils','liner','light-outlet','pump','feed']){
  f.change('fuel-component',id,'change');assert.equal(f.ui.nodes.inspect.querySelectorAll('input').length,0,id);
  const link=f.ui.nodes.inspect.querySelector<HTMLButtonElement>('[data-control]')!;assert.ok(link,id);link.click();
  assert.equal(f.focused.at(-1),`#fuel-${link.dataset.control}`);
 }
 assert.equal(f.ui.latest,accepted);assert.equal(f.requests.length,count,'inspecting and locating controls must not submit physics');
 assert.throws(()=>restoreScenario(f.doc,{version:2,level:'2',controls:{'fuel-currentA':.04,'fuel-component-currentA':.15}}),/Unsupported scenario/);
 assert.equal(f.ui.latest,accepted);restoreScenario(f.doc,{version:2,level:'2',controls:{'fuel-currentA':.04}});await settle();
 assert.equal(f.ui.latest.result.config.currentA,.04);assert.equal(f.node('fuel-component-currentA'),null);
});

test('invalid thermal edits abort pending ownership and late replies cannot make export current',async t=>{
 const f=fixture(t,true);await f.start();
 f.node('fuel-thermal-enabled').checked=true;f.node('fuel-thermal-enabled').dispatchEvent(new f.doc.defaultView!.Event('change'));
 const pending=f.ui.run(),accepted=f.ui.latest,count=f.requests.length;
 f.change('fuel-thermal-coolantK','');assert.equal(f.node('fuel-export').disabled,true);
 f.pending[0]();await pending;await settle();
 assert.equal(f.requests.length,count);assert.equal(f.ui.latest,accepted);assert.equal(f.node('fuel-export').disabled,true);
 assert.match(f.ui.nodes.render.textContent,/permitted thermal settings.*Previous accepted state/);
});

test('late graphics completion cannot revive playback or current-result scope after an invalid edit',async t=>{
 let ready!:()=>void;const graphicsReady=new Promise<void>(resolve=>{ready=resolve;});
 const f=fixture(t,false,graphicsReady);await f.start();
 f.node('fuel-thermal-enabled').checked=true;f.node('fuel-thermal-enabled').dispatchEvent(new f.doc.defaultView!.Event('change'));
 f.change('fuel-thermal-coolantK','');ready();await settle();
 assert.equal(f.animation,undefined);assert.equal(f.ui.nodes.render.querySelector('.fuel-motion').hidden,true);
 assert.equal(f.node('fuel-export').disabled,true);assert.match(f.ui.nodes.render.textContent,/permitted thermal settings.*Previous accepted state/);
});

test('spatial mixture controls reach the solver and accepted gas profiles follow the shared cursor',async t=>{
 const f=fixture(t);await f.start();
 f.node('fuel-thermal-enabled').checked=true;f.node('fuel-thermal-enabled').dispatchEvent(new f.doc.defaultView!.Event('change'));
 f.change('fuel-currentA',.001);f.change('fuel-durationS',.05);f.change('fuel-linerK',700);f.change('fuel-thermal-model','spatial','change');f.change('fuel-thermal-gasModel','spatial','change');f.change('fuel-thermal-gasConductivityWMK',.23);await f.ui.run();
 assert.ok(f.ui.latest, f.ui.nodes.render.textContent);assert.deepEqual(f.requests.at(-1).operation.thermal.gas,{conductivityWMK:.23});assert.ok(f.ui.latest.result.transport.snapshots.at(-1).thermal.gas);
 f.change('fuel-motion-time',.025);
 for(const topic of ['thermalProfile','gasEnergy','gasPressure']){
  f.change('fuel-plot',topic,'change');assert.ok(f.ui.nodes.plots.querySelector('svg'),topic);assert.equal(f.ui.nodes.plots.querySelector('.fuel-metrics strong').textContent,'0.025 s');
  for(const path of f.ui.nodes.plots.querySelectorAll('path'))assert.doesNotMatch(path.getAttribute('d')??'',/NaN|Infinity/,topic);
 }
 f.change('fuel-plot','thermalProfile','change');assert.match(f.ui.nodes.plots.textContent,/Neutral gas/);f.node('fuel-locate-plot').click();assert.equal(f.node('fuel-view-layer').value,'temperature');
 f.change('fuel-plot','spin','change');f.selected.onSelect('slice',{},'Gas');assert.equal(f.node('fuel-plot').value,'thermalProfile','A resolved temperature surface opens its accepted radial profile.');
 const solvedCount=f.requests.length;
 f.node('fuel-plot').dispatchEvent(new f.doc.defaultView!.Event('mass-spinner:focus-plot',{bubbles:true}));
 assert.equal(f.node('fuel-motion-mode').value,'transport');assert.equal(Number(f.node('fuel-motion-time').value),.025);assert.equal(f.focusedComponents.at(-1),'slice');
 for(const mode of ['equilibrium','flow']){
  f.change('fuel-motion-mode',mode,'change');f.change('fuel-plot','thermalProfile','change');assert.equal(f.ui.nodes.plots.querySelector('.fuel-metrics strong').textContent,'0.05 s');
  const time=f.node('fuel-motion-time').value;
  f.node('fuel-plot').dispatchEvent(new f.doc.defaultView!.Event('mass-spinner:focus-plot',{bubbles:true}));
  assert.equal(f.node('fuel-motion-mode').value,mode);assert.equal(f.node('fuel-motion-time').value,time);assert.equal(f.focusedComponents.at(-1),'liner','A reference mode cannot show a finite-time gas temperature surface.');
  f.node('fuel-locate-plot').click();assert.equal(f.node('fuel-motion-mode').value,'transport');assert.equal(Number(f.node('fuel-motion-time').value),.05);assert.equal(f.node('fuel-motion-play').textContent,'Play');assert.equal(f.ui.nodes.plots.querySelector('.fuel-metrics strong').textContent,'0.05 s');
  assert.equal(f.requests.length,solvedCount,'Locating an accepted profile must not recompute physics.');
 }
 const accepted=f.ui.latest,count=f.requests.length;f.change('fuel-thermal-gasConductivityWMK','');await f.ui.run();assert.equal(f.ui.latest,accepted);assert.equal(f.requests.length,count);assert.match(f.ui.nodes.render.textContent,/permitted thermal settings/);
});

test('Inspect links to the canonical solver input and response buttons show the accepted endpoint without another solve',async t=>{
 const f=fixture(t);await f.start();f.change('fuel-component','coils','change');
 const before=f.ui.latest.result.mechanics.torque,button=f.ui.nodes.inspect.querySelector('[data-show-response]');
 f.ui.nodes.inspect.querySelector<HTMLButtonElement>('[data-control=magneticT]')!.click();assert.equal(f.focused.at(-1),'#fuel-magneticT');
 f.change('fuel-magneticT',.75);assert.equal(button.disabled,true);
 assert.match(f.ui.nodes.inspect.textContent,/Calculation in progress/);await f.ui.run();
 assert.equal(f.ui.latest.result.config.magneticT,.75);assert.equal(f.node('fuel-magneticT').value,'0.75');
 assert.ok(Math.abs(f.ui.latest.result.mechanics.torque/before-1.5)<1e-12);
 const count=f.requests.length;button.click();assert.equal(f.requests.length,count);
 assert.equal(f.node('fuel-plot').value,'spin');assert.equal(Number(f.node('fuel-motion-time').value),1);
 assert.equal(f.node('fuel-motion-play').getAttribute('aria-pressed'),'false');
 assert.match(f.ui.nodes.plots.querySelector('.plot-readout').textContent,/Ions: 1,/);
});

test('liner response distinguishes a fixed bath from enabled thermal evolution and marks the exact reference temperature',async t=>{
 const f=fixture(t);await f.start();f.change('fuel-component','liner','change');
 f.change('fuel-linerK',1200);await f.ui.run();
 const count=f.requests.length;
 assert.equal(f.ui.latest.result.transport.operation.thermal.enabled,false);
 assert.match(f.ui.nodes.inspect.textContent,/does not change the fixed gas temperature/);
 f.ui.nodes.inspect.querySelector('[data-show-response]').click();assert.equal(f.node('fuel-plot').value,'lithium');
 assert.equal(f.requests.length,count,'viewing a response must not submit another calculation');
 assert.match(f.ui.nodes.plots.querySelector('.plot-readout').textContent,/1200,/);
 assert.equal(f.ui.latest.result.config.gasK,500);
 f.change('fuel-currentA',0);f.change('fuel-linerK',600);f.change('fuel-durationS',.01);
 f.node('fuel-thermal-enabled').checked=true;f.node('fuel-thermal-enabled').dispatchEvent(new f.doc.defaultView.Event('change'));await f.ui.run();
 f.ui.nodes.inspect.querySelector('[data-show-response]').click();assert.equal(f.node('fuel-plot').value,'thermal');
 assert.ok(f.ui.latest.result.transport.snapshots.at(-1).thermal.gasK>500);
 assert.equal(Number(f.node('fuel-motion-time').value),.01);assert.match(f.ui.nodes.plots.textContent,/Neutral gas/);
});

test('reference scans mark exact selected inputs while the closed-vessel gas remains unaffected by cut and pump controls',async t=>{
 const f=fixture(t);await f.start();
 const trajectory=f.ui.latest.result.transport.snapshots.map(s=>({time:s.timeS,light:s.lightMass,heavy:s.heavyMass,omega:s.neutralRadS}));
 f.change('fuel-cutFraction',.633);f.change('fuel-burnFraction',.037);await f.ui.run();
 for(const [plot,x]of [['cut','0.633'],['inventory','0.037'],['cascade','5'],['field','0.5']]){
  f.change('fuel-plot',plot,'change');assert.match(f.ui.nodes.plots.querySelector('.plot-readout').textContent,new RegExp(`${x.replace('.','\\.')},`),plot);
 }
 f.change('fuel-component','pump','change');f.change('fuel-pumpSpeedM3S',Math.log10(.04));await f.ui.run();
 assert.deepEqual(f.ui.latest.result.transport.snapshots.map(s=>({time:s.timeS,light:s.lightMass,heavy:s.heavyMass,omega:s.neutralRadS})),trajectory);
 assert.ok(Math.abs(f.ui.latest.result.config.pumpSpeedM3S-.04)<1e-15);
 f.ui.nodes.inspect.querySelector('[data-show-response]').click();assert.equal(f.node('fuel-plot').value,'pump');
 assert.match(f.ui.nodes.inspect.textContent,/Pumping reference only/);
 const previousSpeed=f.ui.latest.result.pumping.effectiveSpeedM3S;
 f.change('fuel-component','feed','change');f.change('fuel-conductanceM3S',Math.log10(.01));await f.ui.run();
 assert.ok(f.ui.latest.result.pumping.effectiveSpeedM3S<previousSpeed);
 assert.match(f.ui.nodes.inspect.querySelector('[data-response]').textContent,/Reference inlet speed/);
 f.ui.nodes.inspect.querySelector('[data-show-response]').click();assert.equal(f.node('fuel-plot').value,'pump');
 assert.deepEqual(f.ui.latest.result.transport.snapshots.map(s=>({time:s.timeS,light:s.lightMass,heavy:s.heavyMass,omega:s.neutralRadS})),trajectory);
});

test('collection plots name the products and show percentages for reference and transient inventories, including empty and pure feeds',async t=>{
 const f=fixture(t);await f.start();
 const columns=[['innerLightPurity','Inner light purity'],['lightRecovery','Light recovery'],['outerHeavyPurity','Outer heavy purity']] as const;
 for(const [lightFraction,cut]of [[.0759,.633],[.0759,0],[.0759,1],[0,.5],[1,.5]] as const){
  f.change('fuel-lightFraction',lightFraction);f.change('fuel-cutFraction',cut);await f.ui.run();
  const result=f.ui.latest.result;
  for(const mode of ['equilibrium','transport']){
   f.change('fuel-motion-mode',mode,'change');f.change('fuel-motion-time',.423456);f.change('fuel-plot','cut','change');
   const collection=mode==='transport'?sampleFuelTransport(result.transport,.423456).collection:result.collection;
   const metrics=[...f.ui.nodes.plots.querySelectorAll('.fuel-metrics>div')];
   assert.deepEqual(metrics.map(row=>row.querySelector('span')!.textContent),columns.map(([,label])=>label));
   assert.equal(f.ui.nodes.plots.querySelector('figcaption')!.textContent,'Inventory (%) against Inner cut radius / a');
   const readout=f.ui.nodes.plots.querySelector('.plot-readout')!.textContent!.split(' · ');
   assert.equal(readout.length,columns.length);
   columns.forEach(([key,label],index)=>{
    const fraction=collection[key],percent=fraction===null?null:100*fraction;
    const expectedMetric=percent===null?'—':percent.toLocaleString(undefined,{maximumSignificantDigits:4});
    assert.equal(metrics[index]!.querySelector('strong')!.textContent,`${expectedMetric} %`,`${mode}, feed ${lightFraction}, cut ${cut}: ${label}`);
    assert.ok(readout[index]!.startsWith(`${label}: `));
    const [radius,value]=readout[index]!.slice(label.length+2).split(', ');
    assert.equal(Number(radius),cut);
    if(percent===null)assert.equal(value,'—');
    else assert.equal(Number(value),Number(percent.toPrecision(4)),`${mode}: plotted ${label} must use percent`);
   });
   assert.doesNotMatch(f.ui.nodes.plots.textContent!,/innerLightPurity|lightRecovery|outerHeavyPurity|NaN|Infinity/);
  }
 }
});
