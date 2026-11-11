import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {setupMarathonModels} from '../src/marathon-ui.js';
import {setupMaterialRealism} from '../src/material-realism-ui.js';
import {setupWorkspace} from '../src/workspace-ui.js';
import {setupApparatus} from '../src/apparatus-ui.js';
import {setupBaseline} from '../src/baseline-ui.js';
import {targetSceneState} from '../src/apparatus-state.js';
import {simulateCoupledTarget} from '../src/coupled-target.js';
import {setupPreciseControls} from '../src/precise-controls.js';

const settle=()=>new Promise(resolve=>setTimeout(resolve,400));
async function microtasks(){for(let i=0;i<8;i++)await Promise.resolve();}
function deferred(){let resolve!:(value:any)=>void;const promise=new Promise<any>(done=>resolve=done);return {promise,resolve};}
function documentFixture(t:any,html=readFileSync('index.html','utf8')){
 const dom=new JSDOM(html,{url:'https://example.org/?level=2'}),doc=dom.window.document;
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{value:doc,configurable:true});
 t.after(()=>{dom.window.close();if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');});
 const node=(id:string)=>doc.getElementById(id)! as any;
 const change=(id:string,value:string|number,event='input')=>{node(id).value=String(value);node(id).dispatchEvent(new dom.window.Event(event,{bubbles:true}));};
 return {dom,doc,node,change};
}
function marathonFixture(t:any,options:any={}){
 const f=documentFixture(t),models=setupMarathonModels({requestTarget:async(request:any)=>simulateCoupledTarget(request.beam,request.config),...options});
 t.after(()=>models.target.update(null));f.change('fusion-exposureS',1);f.change('coupled-cooldownS',0);f.change('coupled-depthCells',4,'change');
 return {...f,models};
}

test('accepted scene samples use the exact selected time/plain source; pending retains them and invalid clears them',async t=>{
 let displayed:any=null,pending=false;
 const f=marathonFixture(t,{onState:(value:any)=>displayed=targetSceneState(value),onStatus:(value:any)=>pending=value.phase==='pending'});
 f.change('fusion-stopping-model','geant4-bragg','change');await settle();assert.ok(displayed,f.node('coupled-status').textContent);
 assert.equal(displayed.beamEnergyKeV,100);assert.equal(displayed.beamAreaM2,f.models.source.read().beamAreaM2);
 assert.equal(displayed.cells.length,4);assert.equal(displayed.cells[0].temperatureK,f.models.target.result.history[0].temperatureK[0]);
 f.change('coupled-time',f.models.target.result.history.length-1);assert.equal(displayed.timeS,1);
 const previous=displayed;f.change('coupled-replacementProbability',.5);
 assert.equal(pending,true);assert.equal(displayed,previous);assert.equal(f.node('coupled-export').disabled,true);
 f.change('coupled-diffusivityM2S','');assert.equal(displayed,null);assert.equal(pending,false);assert.equal(f.models.neutrons.read(),null);
});

test('linked material edits and rejected out-of-domain edits never notify solvers of a density-inconsistent pair',t=>{
 const f=marathonFixture(t);setupMaterialRealism({document:f.doc,readSource:()=>f.models.source.read()});
 f.change('material-geometry-mode','number-density','change');
 const expected=f.node('material-number-density').valueAsNumber,seen:number[]=[];
 const ratio=()=>10**Number(f.node('fusion-materialColumnM2').value)/10**Number(f.node('coupled-filmThicknessM').value);
 for(const id of ['fusion-materialColumnM2','coupled-filmThicknessM'])f.node(id).addEventListener('input',()=>seen.push(ratio()));
 f.change('coupled-filmThicknessM',-6);assert.ok(Math.abs(ratio()/expected-1)<1e-12);
 const previous=[f.node('fusion-materialColumnM2').value,f.node('coupled-filmThicknessM').value];
 f.change('fusion-materialColumnM2',18);
 assert.deepEqual([f.node('fusion-materialColumnM2').value,f.node('coupled-filmThicknessM').value],previous);
 assert.ok(seen.length>=3);for(const density of seen)assert.ok(Math.abs(density/expected-1)<1e-12);
 assert.match(f.doc.querySelector('.material-realism [role="alert"]')!.textContent!,/outside the solver control domain/);
});

test('uncommitted precision drafts are not registered target inputs; real invalid solver inputs still clear',async t=>{
 const f=marathonFixture(t);setupPreciseControls(f.doc);f.change('fusion-stopping-model','geant4-bragg','change');await settle();
 assert.equal(f.models.target.status.phase,'accepted',f.node('coupled-status').textContent);
 const draft=f.doc.querySelector('.precise-editor input') as HTMLInputElement;assert.ok(draft);draft.value='';
 f.change('coupled-replacementProbability',.25);await settle();assert.equal(f.models.target.status.phase,'accepted');
 f.change('coupled-diffusivityM2S','');assert.equal(f.models.target.status.phase,'invalid');assert.equal(f.models.target.result,null);
});

test('real precision commits produce exact target requests and atomic acceptance while stale requests stay obsolete',async t=>{
 const requests:any[]=[],states:any[]=[];
 const f=marathonFixture(t,{onState:(value:any)=>states.push(value),requestTarget:(request:any,signal:AbortSignal)=>new Promise(resolve=>requests.push({request,signal,resolve}))});
 setupPreciseControls(f.doc);f.change('fusion-stopping-model','geant4-bragg','change');await settle();assert.equal(requests.length,1);
 const finish=async(index:number)=>{const pending=requests[index];pending.resolve(simulateCoupledTarget(pending.request.beam,pending.request.config));await microtasks();};
 await finish(0);assert.equal(f.models.target.status.phase,'accepted');const accepted=f.models.target.result,acceptedState=states.at(-1);
 const editor=(id:string)=>{
  const control=f.node(id).closest('.control')!;
  return {output:control.querySelector('output') as HTMLElement,input:control.querySelector('.precise-editor input') as HTMLInputElement,apply:control.querySelector('.precise-editor button') as HTMLButtonElement};
 };
 const target=editor('coupled-replacementProbability');assert.equal(target.input.closest<HTMLElement>('.precise-editor')!.hidden,true);
 target.input.value='';target.input.dispatchEvent(new f.dom.window.Event('input',{bubbles:true}));assert.equal(f.models.target.status.phase,'accepted');
 target.output.click();target.input.value='-1';target.apply.click();
 assert.equal(target.input.getAttribute('aria-invalid'),'true');assert.equal(f.models.target.status.phase,'accepted');assert.equal(requests.length,1);
 target.input.value='.123456';target.apply.click();assert.equal(Number(f.node('coupled-replacementProbability').value),.123456);
 assert.equal(f.models.target.status.phase,'pending');assert.equal(f.models.target.result,accepted);assert.equal(f.node('coupled-export').disabled,true);
 await settle();assert.equal(requests.length,2);assert.equal(requests[1].request.config.replacementProbability,.123456);
 const energy=editor('fusion-beamEnergyKeV');energy.output.click();energy.input.value='123.456';energy.apply.click();
 await settle();assert.equal(requests.length,3);assert.equal(requests[1].signal.aborted,true);
 assert.equal(requests[1].request.beam.beamEnergyKeV,100);assert.equal(requests[2].request.beam.beamEnergyKeV,123.456);
 assert.equal(requests[2].request.config.replacementProbability,.123456);
 await finish(1);assert.equal(f.models.target.status.phase,'pending');assert.equal(f.models.target.result,accepted);assert.equal(states.at(-1),acceptedState);
 await finish(2);assert.equal(f.models.target.status.phase,'accepted');assert.notEqual(f.models.target.result,accepted);
 assert.equal(f.models.target.result.config.replacementProbability,.123456);assert.equal(states.at(-1).source.beamEnergyKeV,123.456);
 assert.equal(f.node('coupled-export').disabled,false);
 f.change('coupled-diffusivityM2S','');assert.equal(f.models.target.status.phase,'invalid');assert.equal(f.models.target.result,null);assert.equal(states.at(-1),null);
});

test('component Parameters can expose and focus original neutron controls through every collapsed details',t=>{
 const f=marathonFixture(t),workspace=setupWorkspace({document:f.doc,matchMedia:()=>({matches:false,addEventListener(){}})});workspace.setLevel('2');
 const apparatus=f.node('marathon-apparatus');apparatus.value='source';apparatus.dispatchEvent(new f.dom.window.Event('change'));
 const input=f.node('neutron-transport-thickness'),ancestors:HTMLDetailsElement[]=[];
 for(let parent=input.parentElement;parent;parent=parent.parentElement)if(parent.tagName==='DETAILS'){ancestors.push(parent);parent.open=false;}
 assert.ok(ancestors.length>=2);workspace.focusRelated('plots','#neutron-transport-thickness');
 assert.equal(f.node('neutron-transport-thickness'),input);assert.equal(f.doc.activeElement,input);
 assert.ok(ancestors.every(node=>node.open));assert.equal(f.node('window-plots').hidden,false);
});

test('late model completion cannot repopulate state or selection after apparatus disposal',async t=>{
 const f=documentFixture(t,'<div id="apparatus"></div>'),load=deferred(),calls:string[]=[];
 const previous=Object.getOwnPropertyDescriptor(globalThis,'IntersectionObserver');let visible!:(entries:any)=>void;
 Object.defineProperty(globalThis,'IntersectionObserver',{configurable:true,value:class{constructor(callback:any){visible=callback;}observe(){}disconnect(){}}});
 t.after(()=>{if(previous)Object.defineProperty(globalThis,'IntersectionObserver',previous);else Reflect.deleteProperty(globalThis,'IntersectionObserver');});
 const ui=setupApparatus(f.node('apparatus'),{viewerModuleLoader:async()=>({createApparatusViewer:()=>({load:()=>load.promise,select:()=>calls.push('select'),updateState:()=>calls.push('state'),setPending:()=>calls.push('pending'),dispose:()=>calls.push('dispose')})})});
 ui.show('gyro');visible([{isIntersecting:true}]);await microtasks();ui.select('coils');calls.length=0;ui.dispose();
 load.resolve(false);await microtasks();assert.deepEqual(calls,['dispose']);
});

test('pinning preserves the accepted curves scenario even if the capture callback now describes a draft',t=>{
 const f=documentFixture(t,'<div id="plots"></div>');let scenario:any={version:2,level:'2',controls:{'fusion-beamEnergyKeV':100}},restored:any=null;
 const baseline=setupBaseline(f.node('plots'),{capture:()=>scenario,restore:(value:any)=>restored=value});
 baseline.update([{label:'D–T',x:[0,1],y:[1,2],xLabel:'Time (s)',yLabel:'D–T neutrons (s⁻¹)'}],{model:'coupled',observable:'rate',xUnit:'s',yUnit:'s^-1',version:1});
 scenario={version:2,level:'2',controls:{'fusion-beamEnergyKeV':200}};
 const buttons=f.doc.querySelectorAll<HTMLButtonElement>('.baseline-bar button');buttons[0].click();buttons[1].click();
 assert.equal(baseline.pinned.scenario.controls['fusion-beamEnergyKeV'],100);assert.equal(restored.controls['fusion-beamEnergyKeV'],100);
});
