import test from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {readFileSync} from 'node:fs';
import {setupCoupledTarget} from '../src/coupled-target-ui.js';
import {DEFAULT_FUSION_BEAM,simulateFusionBeam} from '../src/fusion-reactor.ts';
import {simulateCoupledTarget} from '../src/coupled-target.ts';

const source=(overrides={})=>simulateFusionBeam({...DEFAULT_FUSION_BEAM,stoppingModel:'geant4-bragg' as const,
 materialColumnM2:1e21,targetColumnM2:7e20,exposureS:.1,...overrides});
const settle=()=>new Promise(resolve=>setTimeout(resolve,300));

function fixture(t:any,request=(record:any)=>Promise.resolve(simulateCoupledTarget(record.beam,record.config)),implantationReference?:any,plotOptions={}){
 const {window}=new JSDOM('<!doctype html><html><head></head><body><div id="target"></div></body></html>',{url:'https://example.com/'});
 const old=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:window.document,configurable:true});
 t.after(()=>{if(old)Object.defineProperty(globalThis,'document',old);else Reflect.deleteProperty(globalThis,'document');window.close();});
 const updates:any[]=[],statuses:any[]=[];let materialActions=0;const host=window.document.getElementById('target')!;
 const ui=setupCoupledTarget(host,{...plotOptions,onUpdate:(update:any)=>updates.push(update),onStatus:(status:any)=>statuses.push(status),onMaterialMode:()=>materialActions++,request,implantationReference});
 const node=(id:string)=>window.document.getElementById(id)! as any;
 const change=(id:string,value:string|number,type='input')=>{node(id).value=String(value);node(id).dispatchEvent(new window.Event(type,{bubbles:true}));};
 change('coupled-cooldownS',0);change('coupled-depthCells',4,'change');
 return {window,host,ui,node,change,updates,statuses,materialActions:()=>materialActions};
}

test('coupled UI requires explicit material mode and preserves the reference mount',async t=>{
 const f=fixture(t),reference=f.window.document.createElement('button');reference.textContent='Reference control';f.ui.referenceHost.append(reference);
 f.ui.update(simulateFusionBeam(DEFAULT_FUSION_BEAM));await settle();
 assert.equal(f.ui.result,null);assert.equal(f.node('coupled-export').disabled,true);
 assert.match(f.node('coupled-status').textContent,/Material stopping required/);
 f.host.querySelector('.target-mode-prompt button')!.click();assert.equal(f.materialActions(),1);
 assert.equal(f.ui.referenceHost.contains(reference),true);
 f.ui.update(source());await settle();
 assert.ok(f.ui.result);assert.equal(f.node('coupled-status').textContent,'');
 assert.equal(f.node('coupled-export').disabled,false);
 assert.equal(f.host.querySelector('.target-mode-prompt')!.hidden,true);
 assert.equal(f.ui.referenceHost.contains(reference),true);
});

test('actual tab handlers implement keyboard selection and retain one visible target view',t=>{
 const f=fixture(t),first=f.node('coupled-tab-dynamics');first.focus();
 first.dispatchEvent(new f.window.KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
 assert.equal(f.window.document.activeElement,f.node('coupled-tab-depth'));
 assert.equal(f.node('coupled-tab-depth').getAttribute('aria-selected'),'true');
 assert.equal(f.node('coupled-view-depth').hidden,false);assert.equal(f.node('coupled-view-dynamics').hidden,true);
 f.node('coupled-tab-depth').dispatchEvent(new f.window.KeyboardEvent('keydown',{key:'End',bubbles:true}));
 assert.equal(f.node('coupled-view-settings').hidden,false);
 assert.equal([...f.host.querySelectorAll('[role=tabpanel]')].filter((node:any)=>!node.hidden).length,1);
 f.node('coupled-tab-settings').dispatchEvent(new f.window.KeyboardEvent('keydown',{key:'Home',bubbles:true}));
 assert.equal(f.window.document.activeElement,first);assert.equal(first.tabIndex,0);assert.equal(f.node('coupled-tab-depth').tabIndex,-1);
 const style=f.window.document.createElement('style');style.textContent=readFileSync('src/coupled-target.css','utf8');f.window.document.head.append(style);
 assert.equal(f.window.getComputedStyle(f.node('coupled-view-settings')).display,'none');
 assert.ok(style.textContent.includes('@media(max-width:740px)'));
});

test('source invalidation clears selected plots, metrics and exports immediately, then recovers',async t=>{
 const f=fixture(t);f.ui.update(source());await settle();
 assert.ok(f.ui.result);assert.ok(f.host.querySelectorAll('svg').length>0);
 f.change('coupled-time',f.ui.result.history.length-1);
 assert.equal(f.updates.at(-1).state.timeS,f.ui.result.final.timeS);
 f.ui.update(null);
 assert.equal(f.ui.result,null);assert.equal(f.host.querySelectorAll('svg').length,0);
 assert.equal(f.host.querySelector('.coupled-target-metrics')!.children.length,0);
 assert.equal(f.node('coupled-export').disabled,true);assert.equal(f.node('coupled-time').disabled,true);
 assert.equal(f.updates.at(-1),null);
 f.ui.update(source({beamCurrentA:0}));await settle();
 assert.ok(f.ui.result,f.node('coupled-status').textContent);assert.equal(f.updates.at(-1).state.neutronRateS,0);
 assert.equal(f.updates.at(-1).state.beamOn,false);
 assert.equal(f.node('coupled-export').disabled,false);assert.equal(f.node('coupled-time').value,'0');
});

test('selected depth and source output follow the actual history, including cooldown',async t=>{
 const f=fixture(t);f.change('coupled-cooldownS',1);f.ui.update(source());await settle();
 assert.ok(f.ui.result);const first=f.updates.at(-1).state;
 assert.ok(first.neutronRateS>0);assert.equal(first.beamOn,true);
 f.node('coupled-tab-depth').click();assert.ok(f.node('coupled-view-depth').querySelectorAll('svg').length>=2);
 const thermalPoints=()=>f.node('coupled-view-depth').querySelector('svg path[stroke-width="2"][fill="none"]').getAttribute('d').match(/[ML]/g).length;
 assert.equal(thermalPoints(),f.ui.result.config.depthCells);
 f.change('coupled-depth-range','assembly','change');assert.equal(thermalPoints(),first.temperatureK.length);
 const finalIndex=f.ui.result.history.length-1;f.change('coupled-time',finalIndex);
 const selected=f.updates.at(-1);
 assert.equal(selected.state,f.ui.result.final);assert.equal(selected.state.beamOn,false);assert.equal(selected.state.neutronRateS,0);
 assert.ok(selected.state.cumulativeNeutrons>0);assert.match(f.node('coupled-time').getAttribute('aria-valuetext'),/s$/);
 assert.match(f.host.querySelector('.target-snapshot')!.textContent!,/Beam off/);
 assert.ok(!f.node('coupled-view-depth').textContent.includes('NaN'));
 for(const path of f.node('coupled-view-depth').querySelectorAll('path'))assert.ok(!/NaN|Infinity/.test(path.getAttribute('d')??''));
});

test('local invalid settings clear outputs without mutating the source and recover',async t=>{
 const f=fixture(t),beam=source(),saved=JSON.stringify(beam);f.ui.update(beam);await settle();
 f.change('coupled-diffusivityM2S',-1);
 assert.equal(f.ui.result,null);assert.equal(f.updates.at(-1),null);assert.equal(f.node('coupled-export').disabled,true);
 await settle();assert.equal(f.ui.result,null);assert.ok(f.node('coupled-status').textContent.length>0);
 assert.equal(JSON.stringify(beam),saved);
 f.change('coupled-diffusivityM2S',0);await settle();assert.ok(f.ui.result);
 f.change('coupled-diffusivityM2S','');await settle();assert.equal(f.ui.result,null);
 assert.ok(f.node('coupled-status').textContent.length>0);
 f.change('coupled-diffusivityM2S',0);await settle();assert.ok(f.ui.result);
 f.change('coupled-replacementProbability',.2);await settle();
 assert.equal(f.ui.result.config.replacementProbability,.2);
 assert.equal(f.node('coupled-replacementProbability').getAttribute('aria-valuetext'),'0.2');
 assert.equal(JSON.stringify(beam),saved);
});

test('source changes supersede pending calculations, with physical logarithmic readouts',async t=>{
 const f=fixture(t);f.ui.update(source({beamCurrentA:.01}));await settle();const firstRate=f.updates.at(-1).state.neutronRateS;
 f.ui.update(source({beamCurrentA:.01}));f.ui.update(source({beamCurrentA:.02}));await settle();
 assert.equal(f.updates.at(-1).result,f.ui.result);
 assert.ok(Math.abs(f.updates.at(-1).state.neutronRateS/firstRate-2)<1e-12);
 assert.equal(f.node('coupled-filmThicknessM').getAttribute('aria-valuetext'),'1.000e-6 m');
 f.change('coupled-filmThicknessM',-5);await settle();assert.ok(Math.abs(f.ui.result.config.filmThicknessM/1e-5-1)<1e-14);
 assert.equal(f.node('coupled-filmThicknessM').getAttribute('aria-valuetext'),'1.000e-5 m');
 f.change('coupled-plot','isotopes','change');assert.match(f.node('coupled-view-dynamics').textContent,/Site fraction/);
 f.change('coupled-plot','energy','change');assert.match(f.node('coupled-view-dynamics').textContent,/Energy \(J\)/);
});

test('export retains the exact scenario, assumptions, selected time and raw balances',async t=>{
 const f=fixture(t);f.ui.update(source());await settle();
 let blob:Blob|undefined;const create=URL.createObjectURL,revoke=URL.revokeObjectURL;
 URL.createObjectURL=(value:Blob)=>{blob=value;return 'blob:target-test';};URL.revokeObjectURL=()=>{};
 const original=f.window.HTMLAnchorElement.prototype.click;f.window.HTMLAnchorElement.prototype.click=function(){};
 t.after(()=>{URL.createObjectURL=create;URL.revokeObjectURL=revoke;f.window.HTMLAnchorElement.prototype.click=original;});
 f.change('coupled-time',f.ui.result.history.length-1);f.node('coupled-export').click();assert.ok(blob);
 const exported=JSON.parse(await blob.text());assert.equal(exported.schemaVersion,1);
 assert.equal(exported.source.stoppingModel,'geant4-bragg');assert.equal(exported.source.materialColumnM2,1e21);
 assert.equal(exported.selectedTimeS,f.ui.result.final.timeS);assert.deepEqual(exported.config,f.ui.result.config);
 assert.deepEqual(exported.final.energy,f.ui.result.final.energy);assert.deepEqual(exported.final.atomResiduals,f.ui.result.final.atomResiduals);
 assert.deepEqual(exported.assumptions,f.ui.result.assumptions);assert.ok(exported.history.length>1);
});

test('superseded asynchronous results and errors cannot overwrite the current snapshot',async t=>{
 const requests:any[]=[];
 const f=fixture(t,(record:any,signal:any)=>new Promise((resolve,reject)=>requests.push({record,signal,resolve,reject})));
 f.ui.update(source({beamCurrentA:.01}));await settle();assert.equal(requests.length,1);
 f.ui.update(source({beamCurrentA:.02}));assert.equal(requests[0].signal.aborted,true);await settle();
 const current=simulateCoupledTarget(requests[1].record.beam,requests[1].record.config);requests[1].resolve(current);await Promise.resolve();
 assert.equal(f.ui.result,current);const selected=f.updates.at(-1).state;
 requests[0].reject(new Error('Obsolete worker error'));await Promise.resolve();
 assert.equal(f.ui.result,current);assert.equal(f.updates.at(-1).state,selected);assert.equal(f.node('coupled-status').textContent,'');
 f.ui.update(source({beamCurrentA:.03}));await settle();assert.equal(requests.length,3);
 f.ui.update(null);assert.equal(requests[2].signal.aborted,true);
 requests[2].resolve(simulateCoupledTarget(requests[2].record.beam,requests[2].record.config));await Promise.resolve();
 assert.equal(f.ui.result,null);assert.equal(f.updates.at(-1),null);assert.equal(f.node('coupled-export').disabled,true);
 assert.equal(f.host.querySelectorAll('svg').length,0);
});

test('worker failure stays explicit and a new input retries without a synchronous fallback',async t=>{
 let calls=0;const f=fixture(t,(record:any)=>++calls===1?Promise.reject(new Error('Target worker failed.')):Promise.resolve(simulateCoupledTarget(record.beam,record.config)));
 f.ui.update(source());await settle();assert.equal(f.ui.result,null);assert.equal(calls,1);
 assert.match(f.node('coupled-status').textContent,/Target worker failed/);assert.equal(f.node('coupled-export').disabled,true);
 f.change('coupled-replacementProbability',.1);await settle();
 assert.equal(calls,2);assert.ok(f.ui.result);assert.equal(f.ui.result.config.replacementProbability,.1);
 assert.equal(f.node('coupled-status').textContent,'');
});

test('pending settings retain a labeled completed snapshot and block stale exports',async t=>{
 const requests:any[]=[];
 const f=fixture(t,(record:any,signal:any)=>new Promise((resolve,reject)=>requests.push({record,signal,resolve,reject})));
 let acceptedEvents=0;f.node('coupled-time').addEventListener('coupled-accepted',()=>{acceptedEvents++;assert.equal(f.node('coupled-time').disabled,false);assert.equal(f.ui.status.phase,'accepted');});
 f.ui.update(source());await settle();requests[0].resolve(simulateCoupledTarget(requests[0].record.beam,requests[0].record.config));await Promise.resolve();
 assert.equal(acceptedEvents,1);
 const accepted=f.ui.result,acceptedUpdates=f.updates.length,plots=f.host.querySelectorAll('svg').length;
 f.ui.update(source({beamCurrentA:.02}));
 assert.equal(f.ui.status.phase,'pending');assert.equal(f.ui.result,accepted);assert.equal(f.updates.length,acceptedUpdates);
 assert.equal(f.statuses.at(-1).snapshot.source.beamCurrentA,.01);assert.equal(f.node('coupled-export').disabled,true);
 assert.equal(f.host.querySelectorAll('svg').length,plots);assert.match(f.node('coupled-status').textContent,/last completed scenario.*0\.01 A/);
 let exports=0;const create=URL.createObjectURL;URL.createObjectURL=()=>{exports++;return 'blob:unexpected';};t.after(()=>{URL.createObjectURL=create;});
 f.node('coupled-export').dispatchEvent(new f.window.Event('click'));assert.equal(exports,0);
 f.change('coupled-time',accepted.history.length-1);assert.match(f.node('coupled-status').textContent,new RegExp(`${accepted.final.timeS} s`));
 assert.equal(f.updates.length,acceptedUpdates);assert.equal(f.statuses.at(-1).snapshot.state,accepted.final);
 await settle();f.change('coupled-diffusivityM2S',-1);
 assert.equal(requests[1].signal.aborted,true);assert.equal(f.ui.status.phase,'invalid');assert.equal(f.ui.result,null);
 requests[1].resolve(simulateCoupledTarget(requests[1].record.beam,requests[1].record.config));await Promise.resolve();
 assert.equal(f.ui.result,null);assert.equal(f.statuses.at(-1).phase,'invalid');assert.equal(f.updates.at(-1),null);assert.equal(acceptedEvents,1);
});

test('plot observers receive selected physical curves and distinguish observable compatibility',async t=>{
 const observed:any[]=[],transformed:any[]=[];
 const f=fixture(t,undefined,undefined,{onPlot:(record:any)=>observed.push(record),transformPlots:(curves:any,context:any)=>{transformed.push(context);return curves.map((curve:any)=>({...curve,label:'Compared '+curve.label}));}});
 f.ui.update(source());await settle();assert.equal(observed.at(-1).observable,'target:source');
 assert.equal(observed.at(-1).curves[0].y[0],f.ui.result.history[0].neutronRateS);assert.match(observed.at(-1).host.textContent,/Compared D–T/);
 f.change('coupled-plot','isotopes','change');assert.equal(observed.at(-1).observable,'target:isotopes');
 f.node('coupled-tab-depth').click();assert.equal(observed.at(-1).observable,'target:depth:film');
 f.change('coupled-depth-range','assembly','change');assert.equal(observed.at(-1).observable,'target:depth:assembly');
 assert.equal(observed.at(-1).host,transformed.at(-1).host);assert.equal(observed.at(-1).curves[0].y.length,f.ui.result.history[0].temperatureK.length);
});

test('recorded half-space histograms retain incident denominators and never become live film weights',async t=>{
 const data={schemaVersion:1,geometry:'HOMOGENEOUS_HALFSPACE',experimentallyValidatedLiT:false,finiteFilmRetentionLaw:false,
  assumptions:{electronicStoppingMode:'INTERPOLATED'},upstreamExample:{roundedReferenceMatch:false},depthEdgesM:[0,1e-6,2e-6],
  cases:[{energyKeV:20,seed:3501,incidentCount:2048,perIncidentDepthFractions:[.1,.2],beyondHistogramFraction:.6,reflectedFraction:.1,unclassifiedFraction:0},
   {energyKeV:100,seed:3502,incidentCount:2048,perIncidentDepthFractions:[.2,.2],beyondHistogramFraction:.5,reflectedFraction:.1,unclassifiedFraction:0}]};
 const saved=JSON.stringify(data),f=fixture(t,undefined,data);f.ui.update(source());await settle();
 assert.ok(f.ui.result);assert.equal(f.ui.result.config.implantationWeights,undefined);
 const recorded=f.node('implantation-reference-case').parentElement;
 assert.match(recorded.textContent,/mismatch retained/);assert.match(recorded.textContent,/Not a film-retention law/);
 assert.match(recorded.textContent,/reflected 10%/);assert.match(recorded.textContent,/beyond validation grid 60%/);
 assert.match(recorded.querySelector('svg').getAttribute('aria-label'),/Fraction of incident ions per bin/);
 f.change('implantation-reference-case',1,'change');assert.match(recorded.textContent,/beyond validation grid 50%/);
 assert.equal(f.ui.result.config.implantationWeights,undefined);assert.equal(JSON.stringify(data),saved);
 f.ui.update(null);assert.ok(recorded.querySelector('svg')); // Historical evidence is independent of live validity.
});

test('extended reference display keeps frozen validation tails distinct and does not alter the live profile',async t=>{
 const data={schemaVersion:1,geometry:'HOMOGENEOUS_HALFSPACE',experimentallyValidatedLiT:false,finiteFilmRetentionLaw:false,
  assumptions:{electronicStoppingMode:'INTERPOLATED'},upstreamExample:{roundedReferenceMatch:false},depthEdgesM:[0,1e-6,2e-6],
  displayDepthEdgesM:[0,1e-6,2e-6,3e-6,4e-6],cases:[{energyKeV:500,seed:3501,incidentCount:2048,
   perIncidentDepthFractions:[0,0],beyondHistogramFraction:1,reflectedFraction:0,unclassifiedFraction:0,
   displayPerIncidentDepthFractions:[0,0,.6,.3],beyondDisplayHistogramFraction:.1}]};
 const saved=JSON.stringify(data),f=fixture(t,undefined,data);f.ui.update(source());await settle();
 const recorded=f.node('implantation-reference-case').parentElement;
 assert.match(recorded.textContent,/beyond validation grid 100%/);assert.match(recorded.textContent,/Extended display only/);
 assert.match(recorded.textContent,/beyond display 10%/);assert.match(recorded.textContent,/extended display/);
 const line=recorded.querySelector('svg path[stroke-width="2"][fill="none"]');assert.ok(line);assert.equal((line.getAttribute('d').match(/L/g)||[]).length,3);
 assert.equal(f.ui.result.config.implantationWeights,undefined);assert.equal(JSON.stringify(data),saved);
});
