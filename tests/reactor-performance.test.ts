import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {JSDOM} from 'jsdom';
import {DEFAULT_FUSION_BEAM,simulateFusionBeam} from '../src/fusion-reactor.js';
import {createFusionPlaygroundData,fusionPlaygroundData} from '../src/fusion-playground.js';
import {setupFusionLaboratory,type FusionBeamResult} from '../src/fusion-ui.js';
import {setupMarathonModels} from '../src/marathon-ui.js';
import {setupNeutronTransport} from '../src/neutron-transport-ui.js';

function fixture(t:{after:(fn:()=>void)=>void},html=readFileSync('index.html','utf8')){
 const dom=new JSDOM(html),previous=Object.getOwnPropertyDescriptor(globalThis,'document');
 Object.defineProperty(globalThis,'document',{value:dom.window.document,configurable:true});
 t.after(()=>{dom.window.close();if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');});
 const node=(id:string)=>dom.window.document.getElementById(id)!;
 const change=(id:string,value:string,event='input')=>{
  (node(id) as HTMLInputElement).value=value;node(id).dispatchEvent(new dom.window.Event(event,{bubbles:true}));
 };
 return {dom,node,change};
}

test('one probability scan survives scaling edits and invalidates for physical trajectory edits',()=>{
 const display=createFusionPlaygroundData(),initial=display(simulateFusionBeam(DEFAULT_FUSION_BEAM));
 for(const config of [{beamCurrentA:.02},{beamAreaM2:.02},{exposureS:20},{alphaDepositedFraction:.5},{acceleratorEfficiency:.4}]){
  const source=simulateFusionBeam({...DEFAULT_FUSION_BEAM,...config}),view=display(source);
  assert.equal(view.curves[0].y,initial.curves[0].y);
  assert.deepEqual(view,fusionPlaygroundData(source));
 }
 for(const config of [{beamEnergyKeV:115},{targetColumnM2:2e22},{stoppingFraction:.4},{intervals:200},
  {stoppingModel:'geant4-bragg' as const,materialColumnM2:1e21,targetColumnM2:1e21}]){
  const source=simulateFusionBeam({...DEFAULT_FUSION_BEAM,...config}),view=display(source);
  assert.notEqual(view.curves[0].y,initial.curves[0].y);
  assert.deepEqual(view,fusionPlaygroundData(source));
 }
});

test('inactive source registers controls, retains restored values, and calculates only on activation',t=>{
 const f=fixture(t),sources:(FusionBeamResult|null)[]=[],source=setupFusionLaboratory({active:false,onUpdate:value=>sources.push(value)});
 assert.ok(f.node('fusion-beamEnergyKeV'));assert.equal(sources.length,0);assert.equal(f.node('fusion-metrics').children.length,0);
 assert.equal((f.node('export-fusion') as HTMLButtonElement).disabled,true);
 f.change('fusion-beamEnergyKeV','120');f.change('fusion-beamCurrentA','-1');assert.equal(sources.length,0);
 source.setActive(true);assert.equal(sources.length,1);assert.equal(sources[0]!.config.beamEnergyKeV,120);assert.equal(sources[0]!.config.beamCurrentA,.1);
 source.setActive(true);assert.equal(sources.length,1);
 source.setActive(false);f.change('fusion-beamEnergyKeV','140');assert.equal(sources.length,1);
 source.setActive(true);assert.equal(sources.length,2);assert.equal(sources[1]!.config.beamEnergyKeV,140);
});

test('source inputs from separate tasks share one frame; explicit updates and deactivation cancel scheduled work',async t=>{
 const f=fixture(t),frames=new Map<number,FrameRequestCallback>(),sources:(FusionBeamResult|null)[]=[];let next=0;
 f.dom.window.requestAnimationFrame=callback=>{frames.set(++next,callback);return next;};
 f.dom.window.cancelAnimationFrame=id=>{frames.delete(id);};
 const flush=()=>{const callbacks=[...frames.values()];frames.clear();for(const callback of callbacks)callback(0);};
 const source=setupFusionLaboratory({coalesceInputs:true,onUpdate:value=>sources.push(value)});
 f.change('fusion-beamEnergyKeV','120');await new Promise(resolve=>setTimeout(resolve,0));
 f.change('fusion-beamCurrentA','-1');assert.equal(sources.length,1);assert.equal(frames.size,1);
 assert.equal((f.node('export-fusion') as HTMLButtonElement).disabled,true);assert.match(f.node('fusion-status').textContent!,/Calculation in progress/);
 flush();assert.equal(sources.length,2);assert.equal(sources[1]!.config.beamEnergyKeV,120);assert.equal(sources[1]!.config.beamCurrentA,.1);
 f.change('fusion-beamEnergyKeV','160');source.setActive(false);assert.equal(frames.size,0);flush();assert.equal(sources.length,2);
 source.setActive(true);assert.equal(sources.length,3);assert.equal(sources[2]!.config.beamEnergyKeV,160);
 f.change('fusion-beamEnergyKeV','180');assert.equal(frames.size,1);source.update();assert.equal(frames.size,0);
 assert.equal(sources.length,4);assert.equal(sources[3]!.config.beamEnergyKeV,180);flush();assert.equal(sources.length,4);
});

test('collapsed neutron diagnostics retain the latest source and withhold obsolete exports',t=>{
 const f=fixture(t,'<main id="host"></main>'),host=f.node('host'),ui=setupNeutronTransport(host,{deferWhenClosed:true});
 const panel=host.querySelector<HTMLDetailsElement>('.neutron-transport-panel')!,plot=panel.querySelector<HTMLElement>(':scope > div > .live-plots')!;
 const button=panel.querySelector<HTMLButtonElement>('button')!;
 ui.update({sourceRateS:1e10,sourceEnergyMeV:14.1});ui.update({sourceRateS:2e10,sourceEnergyMeV:14.2});
 assert.equal(ui.read(),null);assert.equal(plot.children.length,0);assert.equal(button.disabled,true);
 panel.open=true;panel.dispatchEvent(new f.dom.window.Event('toggle'));
 assert.equal(ui.read()!.source.sourceRateS,2e10);assert.equal(ui.read()!.source.sourceEnergyMeV,14.2);assert.ok(plot.querySelector('svg'));
 panel.open=false;panel.dispatchEvent(new f.dom.window.Event('toggle'));
 const oldPlot=plot.firstChild;ui.update({sourceRateS:3e10,sourceEnergyMeV:14.3});
 assert.equal(ui.read(),null);assert.equal(plot.firstChild,oldPlot);assert.equal(button.disabled,true);
 ui.setPending(false);assert.equal(button.disabled,true);
 panel.open=true;panel.dispatchEvent(new f.dom.window.Event('toggle'));
 assert.equal(ui.read()!.config.sourceRateS,3e10);assert.equal(button.disabled,false);
 ui.update(null);assert.equal(ui.read(),null);assert.equal(plot.children.length,0);assert.equal(button.disabled,true);
});

test('inactive Marathon restoration schedules no target worker and activation uses the final source',async t=>{
 const f=fixture(t),sources:(FusionBeamResult|null)[]=[],requests:{energy:number;signal:AbortSignal}[]=[];
 const models=setupMarathonModels({active:false,onSource:value=>sources.push(value),requestTarget:(request,signal)=>new Promise((_resolve,reject)=>{
  requests.push({energy:request.beam.beamEnergyKeV,signal});signal.addEventListener('abort',()=>reject(new Error('Aborted')),{once:true});
 })});
 t.after(()=>models.setActive(false));
 assert.equal(f.dom.window.document.querySelectorAll('.live-plots svg').length,0);
 assert.ok(f.node('decay-beam'));assert.ok(f.node('neutron-response-thickness'));assert.ok(f.node('implantation-reference-case'));
 f.change('fusion-stopping-model','geant4-bragg','change');f.change('fusion-beamEnergyKeV','180');f.change('coupled-cooldownS','0');
 await new Promise(resolve=>setTimeout(resolve,300));assert.equal(sources.length,0);assert.equal(requests.length,0);
 models.setActive(true);assert.equal(sources.length,1);assert.equal(sources[0]!.config.beamEnergyKeV,180);
 await new Promise(resolve=>setTimeout(resolve,300));assert.equal(requests.length,1);assert.equal(requests[0].energy,180);
 models.setActive(false);assert.equal(requests[0].signal.aborted,true);
 f.change('fusion-beamEnergyKeV','200');await new Promise(resolve=>setTimeout(resolve,300));assert.equal(requests.length,1);
 models.setActive(true);await new Promise(resolve=>setTimeout(resolve,300));assert.equal(requests.length,2);assert.equal(requests[1].energy,200);
});

test('nested neutron references stay idle while inactive and calculate restored controls when opened',t=>{
 const f=fixture(t,'<main id="host"></main>'),host=f.node('host'),ui=setupNeutronTransport(host,{active:false,deferWhenClosed:true});
 const panel=host.querySelector<HTMLDetailsElement>('.neutron-transport-panel')!;
 const decay=f.node('decay-beam').closest('details')!,response=f.node('neutron-response-rate').closest('details')!;
 const open=(details:HTMLDetailsElement,value:boolean)=>{details.open=value;details.dispatchEvent(new f.dom.window.Event('toggle'));};
 f.change('decay-beam','0');f.change('neutron-response-rate','0');ui.update({sourceRateS:1e10,sourceEnergyMeV:14.1});
 open(decay,true);open(response,true);open(panel,true);assert.equal(host.querySelectorAll('svg').length,0);
 ui.setActive(true);
 assert.ok(decay.querySelector('svg'));assert.match(decay.querySelector('[role=status]')!.textContent!,/Cooldown begins at 0 s/);
 assert.ok(response.querySelector('svg'));for(const out of response.querySelectorAll('.fusion-readouts output'))assert.equal(out.textContent,'0 s⁻¹');
 ui.setActive(false);const oldPlot=decay.querySelector('svg');f.change('decay-beam','120');assert.equal(decay.querySelector('svg'),oldPlot);
 open(panel,false);ui.setActive(true);assert.equal(decay.querySelector('svg'),oldPlot);
 open(panel,true);assert.match(decay.querySelector('[role=status]')!.textContent!,/Cooldown begins at 120 s/);assert.notEqual(decay.querySelector('svg'),oldPlot);
});

test('recorded implantation plots wait for active reference disclosures and retain the selected case',t=>{
 const f=fixture(t),models=setupMarathonModels({active:false});t.after(()=>models.setActive(false));
 const select=f.node('implantation-reference-case') as HTMLSelectElement,recorded=select.closest('details')!;
 const open=(details:HTMLDetailsElement)=>{details.open=true;details.dispatchEvent(new f.dom.window.Event('toggle'));};
 open(models.target.references);open(recorded);f.change(select.id,'1','change');assert.equal(recorded.querySelector('svg'),null);
 models.setActive(true);assert.ok(recorded.querySelector('svg'));
 const sample=recorded.querySelector('svg')!;models.setActive(false);f.change(select.id,'2','change');assert.equal(recorded.querySelector('svg'),sample);
 models.setActive(true);assert.equal(select.value,'2');
 const data=JSON.parse(readFileSync('web-assets/marathon-reference/implantation-v35.json','utf8'));
 assert.match(recorded.querySelector('.live-plots')!.textContent!,new RegExp(`seed ${data.cases[2].seed}`));
});
