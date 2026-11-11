import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {setupFuelCentrifuge} from '../src/fuel-centrifuge-ui.js';
import {setupWorkspace} from '../src/workspace-ui.js';
import {captureScenario,restoreScenario,readScenario,scenarioLink} from '../src/scenario-state.js';
import {DEFAULT_FUEL_CENTRIFUGE,simulateFuelCentrifuge} from '../src/fuel-centrifuge.ts';

function fixture(t:any){
 const dom=new JSDOM(readFileSync('index.html','utf8'),{url:'https://example.org/'}),doc=dom.window.document;
 const fuel=setupFuelCentrifuge({document:doc});
 const contexts:any[]=[];const workspace=setupWorkspace({document:doc,storage:null,matchMedia:()=>({matches:false,addEventListener(){}}),onContextChange:context=>contexts.push(context)});
 t.after(()=>{fuel.dispose();dom.window.close();});
 return {doc,fuel,workspace,contexts,input:(id:string)=>doc.getElementById(id) as HTMLInputElement,select:(id:string)=>doc.getElementById(id) as HTMLSelectElement};
}
test('Marathon starts on its own centrifuge with persistent controls in the workspace',t=>{
 const f=fixture(t);f.workspace.setLevel('2');
 assert.deepEqual(f.contexts.at(-1),{level:'2',marathon:'centrifuge'});
 for(const id of ['fuel-render','fuel-controls','fuel-plots','fuel-inspect','fuel-info'])assert.equal(f.doc.getElementById(id)!.closest('[hidden]')?.id.startsWith('window-')??false,id==='fuel-render'?false:true);
 assert.equal(f.doc.getElementById('fuel-render')!.closest('[hidden]'),null);
 assert.equal(f.doc.getElementById('fusion-apparatus')!.parentElement!.hidden,true);
 f.workspace.open('controls');assert.equal(f.input('fuel-currentA').closest('[hidden]'),null);
 f.workspace.open('plots');assert.equal(f.select('fuel-plot').closest('[hidden]'),null);
 assert.equal(f.doc.querySelector('[aria-controls="window-target"]')!.hidden,true);
});
test('native slider steps preserve scientific default composition and logarithmic coordinates',t=>{
 const f=fixture(t),actual=f.fuel.read();
 for(const [key,value]of Object.entries(DEFAULT_FUEL_CENTRIFUGE))if(typeof value==='number')assert.ok(Math.abs(actual[key]-value)<=1e-14*Math.max(1,value),key);
 for(const input of f.doc.querySelectorAll<HTMLInputElement>('#fuel-controls input[data-range-scale="log10"]'))assert.equal(input.step,'any','native Chromium must not quantize a declared log default before the worker reads it');
 assert.equal(Number(f.input('fuel-lightFraction').step),.0001);
});
test('thermal setup roundtrips while older links restore bath semantics without overriding the chosen plot',t=>{
 const f=fixture(t);restoreScenario(f.doc,{version:2,level:'2',controls:{'marathon-apparatus':'centrifuge','fuel-pair':'lithium','fuel-thermal-enabled':true,'fuel-thermal-wallCapacityJK':23,'fuel-thermal-coolingWK':.023,'fuel-plot':'spin'}});
 const saved=captureScenario(f.doc,'2');assert.equal(saved.controls['fuel-thermal-enabled'],true);assert.equal(saved.controls['fuel-thermal-coolingWK'],.023);assert.equal(f.select('fuel-plot').value,'spin');
 restoreScenario(f.doc,{version:2,level:'2',controls:{'marathon-apparatus':'centrifuge','fuel-pair':'dt','fuel-plot':'profile'}});
 assert.equal(f.input('fuel-thermal-enabled').checked,false);assert.equal(f.select('fuel-plot').value,'profile');
 restoreScenario(f.doc,readScenario(new URL(scenarioLink('https://example.org',saved)).search).scenario);assert.equal(f.input('fuel-thermal-enabled').checked,true);assert.equal(f.select('fuel-plot').value,'spin');
 assert.throws(()=>restoreScenario(f.doc,{version:2,level:'2',controls:{'fuel-pair':'molecular','fuel-thermal-enabled':true}}),/Atomic thermal/);
 assert.equal(f.input('fuel-thermal-enabled').checked,true,'Invalid incoming thermal data must not partly mutate the current setup.');
});
test('pre-centrifuge v2 Marathon links restore beam-target instead of changing their meaning',t=>{
 const f=fixture(t);f.workspace.setLevel('2');
 restoreScenario(f.doc,{version:2,level:'2',controls:{'fusion-beam-enabled':false}});
 assert.equal(f.select('marathon-apparatus').value,'source');
 assert.deepEqual(f.contexts.at(-1),{level:'2',marathon:'source'});
 assert.equal(f.input('fusion-beam-enabled').checked,false);
 assert.equal(f.doc.getElementById('fusion-apparatus')!.parentElement!.hidden,false);
});
test('spatial thermal links retain thickness while old enabled links restore lumped semantics',t=>{
 const f=fixture(t),spatial={version:2,level:'2',controls:{'marathon-apparatus':'centrifuge','fuel-thermal-enabled':true,'fuel-thermal-model':'spatial','fuel-thermal-thicknessMm':4,'fuel-plot':'thermalProfile'}};
 restoreScenario(f.doc,spatial);f.input('fuel-thermal-wallCapacityJK').value='';
 const saved=captureScenario(f.doc,'2');assert.equal(saved.controls['fuel-thermal-model'],'spatial');assert.equal(saved.controls['fuel-thermal-thicknessMm'],4);
 assert.equal(saved.controls['fuel-thermal-wallCapacityJK'],undefined,'Material-derived capacity must not capture a hidden lumped draft.');
 restoreScenario(f.doc,{version:2,level:'2',controls:{'marathon-apparatus':'centrifuge','fuel-thermal-enabled':true,'fuel-thermal-wallCapacityJK':23}});
 assert.equal(f.select('fuel-thermal-model').value,'lumped');assert.equal(f.input('fuel-thermal-thicknessMm').value,'1');assert.equal(f.input('fuel-thermal-wallCapacityJK').disabled,false);
 restoreScenario(f.doc,readScenario(new URL(scenarioLink('https://example.org/',saved)).search).scenario);
 assert.equal(f.select('fuel-thermal-model').value,'spatial');assert.equal(f.input('fuel-thermal-thicknessMm').value,'4');assert.equal(f.select('fuel-plot').value,'thermalProfile');
 const before=captureScenario(f.doc,'2');assert.throws(()=>restoreScenario(f.doc,{version:2,level:'2',controls:{'fuel-thermal-model':'spatial','fuel-thermal-thicknessMm':-1}}),/Out-of-domain/);
 assert.deepEqual(captureScenario(f.doc,'2'),before);
});
test('new share links restore coupled stage bounds and exact log coordinates atomically',t=>{
 const f=fixture(t);const scenario={version:2,level:'2',controls:{'marathon-apparatus':'centrifuge','fuel-application':'enrichment','fuel-pair':'dt','fuel-plot':'cascade','fuel-lightFraction':.43219,'fuel-feedStage':9,'fuel-stages':10,'fuel-ionFraction':Math.log10(.00314159)}};
 const decoded=readScenario(new URL(scenarioLink('https://example.org/',scenario)).search);assert.equal(decoded.invalid,false);
 restoreScenario(f.doc,decoded.scenario);
 assert.equal(f.fuel.read().feedStage,9);assert.equal(f.fuel.read().stages,10);assert.equal(f.fuel.read().lightFraction,.43219);
 assert.ok(Math.abs(f.fuel.read().ionFraction-.00314159)<1e-16);
 assert.equal(f.input('fuel-feedStage').max,'10');assert.equal(f.select('fuel-plot').value,'cascade');
 assert.deepEqual(captureScenario(f.doc,'2').controls['fuel-feedStage'],9);
 const before=captureScenario(f.doc,'2');
 assert.throws(()=>restoreScenario(f.doc,{version:2,level:'2',controls:{'fuel-stages':3,'fuel-feedStage':7,'fuel-currentA':.1}}),/Stage feed/);
 assert.deepEqual(captureScenario(f.doc,'2'),before,'invalid shared state must not partly mutate any controls');
});

test('spatial gas links roundtrip, reject invalid combinations atomically, and old links restore lumped gas',t=>{
 const f=fixture(t),spatial={version:2,level:'2',controls:{'marathon-apparatus':'centrifuge','fuel-pair':'dt','fuel-thermal-enabled':true,'fuel-thermal-model':'spatial','fuel-thermal-gasModel':'spatial','fuel-thermal-gasConductivityWMK':.23,'fuel-plot':'gasPressure'}};
 restoreScenario(f.doc,spatial);assert.equal(f.select('fuel-thermal-gasModel').disabled,false);assert.equal(f.input('fuel-thermal-gasConductivityWMK').disabled,false);
 const saved=captureScenario(f.doc,'2');assert.equal(saved.controls['fuel-thermal-gasModel'],'spatial');assert.equal(saved.controls['fuel-thermal-gasConductivityWMK'],.23);
 for(const controls of [{...spatial.controls,'fuel-pair':'molecular'},{...spatial.controls,'fuel-thermal-model':'lumped'},{...spatial.controls,'fuel-thermal-enabled':false},{...spatial.controls,'fuel-thermal-gasConductivityWMK':-1}]){
  assert.throws(()=>restoreScenario(f.doc,{version:2,level:'2',controls}));assert.deepEqual(captureScenario(f.doc,'2'),saved);
 }
 restoreScenario(f.doc,{version:2,level:'2',controls:{'marathon-apparatus':'centrifuge','fuel-thermal-enabled':true,'fuel-thermal-model':'spatial'}});
 assert.equal(f.select('fuel-thermal-gasModel').value,'lumped');assert.equal(f.input('fuel-thermal-gasConductivityWMK').disabled,true);assert.equal(captureScenario(f.doc,'2').controls['fuel-thermal-gasConductivityWMK'],undefined);
 restoreScenario(f.doc,readScenario(new URL(scenarioLink('https://example.org/',saved)).search).scenario);assert.equal(f.select('fuel-thermal-gasModel').value,'spatial');assert.equal(f.input('fuel-thermal-gasConductivityWMK').value,'0.23');assert.equal(f.select('fuel-plot').value,'gasPressure');
});
test('a restore can select a currently disabled topic when its incoming application permits it',t=>{
 const f=fixture(t);
 restoreScenario(f.doc,{version:2,level:'2',controls:{'marathon-apparatus':'centrifuge','fuel-application':'pump','fuel-plot':'pump','fuel-pair':'dt'}});
 assert.equal(f.select('fuel-plot').querySelector<HTMLOptionElement>('option[value="cascade"]')!.disabled,true);
 restoreScenario(f.doc,{version:2,level:'2',controls:{'marathon-apparatus':'centrifuge','fuel-application':'enrichment','fuel-plot':'cascade'}});
 assert.equal(f.select('fuel-plot').value,'cascade');
 const before=captureScenario(f.doc,'2');
 assert.throws(()=>restoreScenario(f.doc,{version:2,level:'2',controls:{'fuel-application':'pump','fuel-plot':'cut'}}),/Plot is unavailable/);
 assert.deepEqual(captureScenario(f.doc,'2'),before);
});
test('species pumping obeys separate and total pressure/throughput balances and vanishing-feed limits',()=>{
 const r=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,pair:'the',application:'pump',lightFraction:.8});
 for(const key of ['axisPa','wallPa','upstreamPa','gasLoadPaM3S'] as const){const sum=r.pumping.species.reduce((a,s)=>a+s[key],0);assert.ok(Math.abs(sum-r.pumping[key])<=1e-12*Math.max(1,sum));}
 assert.ok(r.pumping.heavyLightSpeedRatio!>=1);
 assert.ok(r.pumping.outerLightFraction!<.8);
 for(const s of r.pumping.species){assert.ok(s.effectiveSpeedM3S!<=r.config.conductanceM3S);assert.ok(Math.abs(s.gasLoadPaM3S/s.upstreamPa-s.effectiveSpeedM3S!)<1e-14);}
 for(const lightFraction of [0,1]){const pure=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,lightFraction});assert.equal(pure.pumping.heavyLightSpeedRatio,null);assert.equal(pure.pumping.outerLightFraction,lightFraction);}
 const off=simulateFuelCentrifuge({...r.config,currentA:0});assert.equal(off.pumping.heavyLightSpeedRatio,1);
});
test('adding stages in a parameter scan holds feed location fixed instead of changing two inputs',()=>{
 const r=simulateFuelCentrifuge({...DEFAULT_FUEL_CENTRIFUGE,stages:6,feedStage:4});
 assert.deepEqual(r.cascades.map(p=>[p.stages,p.feedStage]),[[4,4],[5,4],[6,4]]);
 assert.equal(r.cascades.at(-1)!.recovery,r.cascade.lightRecovery);
 assert.equal(r.cascades.at(-1)!.purity,r.cascade.productLightPurity);
 assert.ok(r.cascades[1].recovery<r.cascades[0].recovery);
 const single=simulateFuelCentrifuge({...r.config,stages:1,feedStage:1});assert.equal(single.cascades.length,1);
});
