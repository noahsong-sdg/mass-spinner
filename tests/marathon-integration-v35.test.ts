import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {setupMarathonModels} from '../src/marathon-ui.js';
import {setupWorkspace} from '../src/workspace-ui.js';
import {simulateCoupledTarget} from '../src/coupled-target.ts';

const settle=()=>new Promise(resolve=>setTimeout(resolve,400));
function fixture(t:any){
 const {window}=new JSDOM(readFileSync('index.html','utf8'),{url:'https://example.com/?level=2'});
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'document',{value:window.document,configurable:true});
 const states:any[]=[];const models=setupMarathonModels({onState:state=>states.push(state),
  requestTarget:async(request:any)=>simulateCoupledTarget(request.beam,request.config)});
 const node=(id:string)=>window.document.getElementById(id)! as any;
 const change=(id:string,value:string|number,event='input')=>{
  node(id).value=String(value);node(id).dispatchEvent(new window.Event(event,{bubbles:true}));
 };
 t.after(()=>{
  models.target.update(null);window.close();
  if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');
 });
 change('fusion-exposureS',1);change('coupled-cooldownS',1);change('coupled-depthCells',4,'change');
 return {window,models,states,node,change};
}

test('production Marathon orchestration preserves one exposure and explicit material admission',async t=>{
 const f=fixture(t),doc=f.window.document;
 assert.equal(doc.querySelectorAll('#fusion-exposureS').length,1);
 assert.ok(f.models.target.durationHost.contains(f.node('fusion-exposureS')));
 assert.ok(f.models.target.referenceHost.contains(f.node('target-loading')));
 assert.ok(f.models.target.referenceHost.contains(f.node('target-exposure')));
 assert.equal(f.node('implantation-reference-case').options.length,6);
 assert.match(f.node('coupled-target').textContent,/homogeneous half-space, uncalibrated LiT/);
 assert.equal(f.models.target.result,null);assert.equal(f.models.neutrons.read(),null);
 f.node('coupled-target').querySelector('.target-mode-prompt button').click();await settle();
 assert.equal(f.models.source.read().stoppingModel,'geant4-bragg');
 assert.ok(f.models.target.result,f.node('coupled-status').textContent);
 assert.equal(f.node('coupled-export').disabled,false);
 const state=f.states.at(-1).state,transport=f.models.neutrons.read();
 assert.ok(state.neutronRateS>0);assert.equal(transport.config.sourceRateS,state.neutronRateS);
 assert.equal(transport.config.sourceEnergyMeV,state.neutronMeanEnergyMeV);
 f.change('coupled-time',f.models.target.result.history.length-1);
 assert.equal(f.states.at(-1).state.beamOn,false);
 assert.equal(f.models.neutrons.read().config.sourceRateS,0);
 for(const rate of Object.values(f.models.neutrons.read().rates))assert.equal(rate,0);
 const initial=f.node('initial-source-reference');
 assert.equal(initial.querySelector('summary').textContent,'Initial source');
 for(const selector of ['.fusion-monitor','#fusion-response','#neutron-geometry','.fusion-ledger'])assert.ok(initial.contains(doc.querySelector(selector)));
 assert.ok(!initial.contains(f.node('neutron-transport')));
 const frozenReadouts=f.node('fusion-readouts').textContent;
 const accepted=f.models.target.result,acceptedTransport=f.models.neutrons.read();
 f.change('coupled-replacementProbability',.5);
 assert.equal(f.models.target.result,accepted);assert.equal(f.models.neutrons.read(),acceptedTransport);
 assert.equal(f.models.target.status.phase,'pending');assert.match(f.node('coupled-status').textContent,/last completed scenario/);
 assert.equal(f.node('coupled-export').disabled,true);
 assert.equal(f.node('fusion-readouts').textContent,frozenReadouts);
 await settle();assert.ok(f.models.target.result);assert.notEqual(f.models.target.result,accepted);assert.ok(f.models.neutrons.read());
 assert.equal(f.models.target.status.phase,'accepted');assert.equal(f.models.target.result.config.replacementProbability,.5);assert.equal(f.node('coupled-export').disabled,false);
 assert.equal(f.node('fusion-readouts').textContent,frozenReadouts);
});

test('shared source failure clears dependent models and recovery uses current controls',async t=>{
 const f=fixture(t);f.change('fusion-stopping-model','geant4-bragg','change');await settle();
 assert.ok(f.models.target.result);
 f.change('fusion-beamEnergyKeV',20);f.change('fusion-materialColumnM2',23);
 assert.equal(f.models.target.result,null);assert.equal(f.models.neutrons.read(),null);
 assert.equal(f.node('coupled-export').disabled,true);assert.equal(f.node('export-fusion').disabled,true);
 assert.equal(f.states.at(-1),null);
 f.change('fusion-beamEnergyKeV',100);f.change('fusion-materialColumnM2',21);await settle();
 assert.ok(f.models.target.result);assert.ok(f.models.neutrons.read());
 assert.equal(f.node('fusion-exposureS').value,'1');
 const source=f.models.source.read(),target=f.models.target.result;
 f.change('neutron-transport-absorption',10);
 assert.equal(f.models.neutrons.read(),null);assert.equal(f.models.target.result,target);
 assert.deepEqual(f.models.source.read(),source);
 f.change('neutron-transport-total',20);assert.ok(f.models.neutrons.read());
});

test('new target controls stay inside desktop windows and mobile sheets with references nested',t=>{
 const f=fixture(t),media={matches:false,addEventListener(){}};
 const workspace=setupWorkspace({document:f.window.document,matchMedia:()=>media});workspace.setLevel('2');
 const apparatus=f.node('marathon-apparatus');apparatus.value='source';apparatus.dispatchEvent(new f.window.Event('change'));
 const shell=f.window.document.querySelector('.sim-workspace')!;
 for(const control of f.window.document.querySelectorAll('button,input,select'))assert.ok(shell.contains(control),control.id||control.textContent!);
 assert.ok(f.node('window-target').contains(f.node('coupled-target')));
 assert.ok(f.models.target.referenceHost.contains(f.node('target-exposure')));
 assert.ok(f.node('window-plots').contains(f.node('neutron-transport')));
 assert.ok(f.node('window-plots').contains(f.node('initial-source-reference')));
 assert.ok(f.node('initial-source-reference').contains(f.node('neutron-geometry')));
 workspace.open('controls');workspace.open('target');
 assert.equal(f.node('window-controls').hidden,false);assert.equal(f.node('window-target').hidden,false);
 media.matches=true;workspace.open('plots');
 assert.equal(f.node('window-target').hidden,true);assert.equal(f.node('window-controls').hidden,true);
 assert.equal(f.node('window-plots').hidden,false);
 workspace.setLevel('3');assert.equal(f.node('window-plots').hidden,true);
 workspace.setLevel('2');assert.equal(f.node('fusion-exposureS').value,'1');
});
