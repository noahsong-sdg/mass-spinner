import test from 'node:test';
import assert from 'node:assert/strict';
import {setupFusionLaboratory} from '../src/fusion-ui.js';
import {setupTargetExposure} from '../src/target-exposure-ui.js';
import {setupTargetLoading} from '../src/target-loading-ui.js';
import {setupNeutronGeometry} from '../src/neutron-geometry-ui.js';

// Source-unit DOM only: runs production handlers, not a browser/GPU substitute.
class El{
 private identifier='';value:string|number='';type='';checked=false;disabled=false;hidden=false;open=false;textContent='';className='';
 min:string|number='';max:string|number='';step:string|number='';htmlFor='';children:El[]=[];
 attributes:Record<string,string>={};events=new Map<string,()=>void>();
 constructor(private registry:Map<string,El>){}
 set id(id:string){this.identifier=id;this.registry.set(id,this);}get id(){return this.identifier;}
 append(...children:El[]){this.children.push(...children);}replaceChildren(...children:El[]){this.children=children;}
 setAttribute(k:string,v:string){this.attributes[k]=v;}addEventListener(k:string,fn:()=>void){this.events.set(k,fn);}
 fire(k:string){this.events.get(k)!();}
}
const descendants=(e:El):El[]=>[e,...e.children.flatMap(descendants)];
const text=(e:El)=>descendants(e).map(e=>e.textContent).join(' ');
function dom(t:{after:(fn:()=>void)=>void}){
 const registry=new Map<string,El>(),previous=(globalThis as unknown as {document?:unknown}).document;
 for(const id of ['fusion-controls','fusion-assumption-controls','fusion-readouts','fusion-spot','fusion-spot-size',
  'fusion-current-label','fusion-beam','fusion-neutrons','fusion-beam-enabled','fusion-target-enabled',
  'marathon-energy-plots','fusion-plots','fusion-metrics','fusion-notes','fusion-status','fusion-energy-label',
  'fusion-target-label','export-fusion']){const e=new El(registry);e.id=id;}
 (globalThis as unknown as {document:unknown}).document={getElementById:(id:string)=>registry.get(id),
  createElement:()=>new El(registry),createElementNS:()=>new El(registry),
  createTextNode:(text:string)=>Object.assign(new El(registry),{textContent:text})};
 t.after(()=>{(globalThis as unknown as {document?:unknown}).document=previous;});
 const get=(id:string)=>registry.get(id)!;
 return {get,change:(id:string,value:string|number,event='input')=>{get(id).value=value;get(id).fire(event);},
  box:(id:string)=>descendants(get('fusion-assumption-controls')).find(e=>e.children.includes(get(id)))!,
  host:()=>new El(registry)};
}
function panel(host:El,name:string){
 const all=()=>descendants(host);
 return {plot:all().find(e=>e.className==='live-plots')!,status:all().find(e=>e.attributes.role==='status')!,
  export:all().find(e=>e.textContent===`Export ${name} calculation ↓`)!};
}

test('actual source stopping selector couples formula column and loading, preserving legacy setpoints',t=>{
 const {get,change,box}=dom(t);let source:any;
 const lab=setupFusionLaboratory({onUpdate:(r:any)=>{source=r;}});
 assert.equal(lab.read().stoppingModel,'linear');assert.ok(source.neutronRateS>0);
 assert.equal(box('fusion-materialColumnM2').hidden,true);assert.equal(box('fusion-tritiumSiteFraction').hidden,true);
 assert.equal(box('fusion-targetColumnM2').hidden,false);assert.equal(box('fusion-stoppingFraction').hidden,false);
 change('fusion-targetColumnM2',22.3);change('fusion-stoppingFraction',.35);
 change('fusion-stopping-model','geant4-bragg','change');
 assert.ok(source);assert.equal(lab.read().stoppingModel,'geant4-bragg');
 assert.equal(box('fusion-targetColumnM2').hidden,true);assert.equal(box('fusion-stoppingFraction').hidden,true);
 assert.equal(box('fusion-materialColumnM2').hidden,false);assert.equal(box('fusion-tritiumSiteFraction').hidden,false);
 assert.equal(get('fusion-materialColumnM2').attributes['aria-valuetext'],'1.000e+21 m⁻²');
 change('fusion-tritiumSiteFraction',.25);
 assert.equal(source.config.targetColumnM2,2.5e20);assert.equal(source.siteColumnM2,1e21);
 assert.equal(lab.read().targetColumnM2,2.5e20);assert.equal('tritiumSiteFraction'in lab.read(),false);
 assert.equal(get('fusion-tritiumSiteFraction').attributes['aria-valuetext'],'0.25');
 assert.equal(get('fusion-status').textContent,'');assert.match(text(get('fusion-notes')),/fixed.*matrix/i);
 const exit=source.exitEnergyKeV;
 get('fusion-target-enabled').checked=false;get('fusion-target-enabled').fire('change');
 assert.equal(source.config.targetColumnM2,0);assert.equal(source.neutronRateS,0);
 assert.equal(source.siteColumnM2,1e21);assert.equal(source.exitEnergyKeV,exit);
 assert.equal(get('fusion-tritiumSiteFraction').disabled,true);assert.ok(source.beamStoppingPowerW>0);
 get('fusion-target-enabled').checked=true;get('fusion-target-enabled').fire('change');
 assert.equal(source.config.targetColumnM2,2.5e20);assert.equal(get('fusion-tritiumSiteFraction').disabled,false);
 change('fusion-stopping-model','linear','change');
 assert.equal(source.config.targetColumnM2,10**22.3);assert.equal(source.config.stoppingFraction,.35);
 assert.equal(box('fusion-materialColumnM2').hidden,true);assert.equal(box('fusion-targetColumnM2').hidden,false);
 assert.ok(source.neutronRateS>0);
});

test('actual loading observer keeps its errors local, resolution live, and shared exposure synchronized',t=>{
 const {get,change,host}=dom(t),loadingHost=host(),thermalHost=host(),geometryHost=host();
 const loading=setupTargetLoading(loadingHost),thermal=setupTargetExposure(thermalHost),geometry=setupNeutronGeometry(geometryHost);
 const l=panel(loadingHost,'loading'),h=panel(thermalHost,'exposure');
 const geometryPlot=descendants(geometryHost).find(e=>e.className==='live-plots')!;
 let source:any;setupFusionLaboratory({exposureHost:thermal.durationHost,onUpdate:(r:any)=>{
  source=r;geometry.update(r);thermal.update(r);loading.update(r);
 }});
 change('fusion-stopping-model','geant4-bragg','change');
 assert.ok(source);assert.equal(l.export.disabled,false);assert.ok(l.plot.children.length>0);
 const priorSource=source,priorThermal=h.plot.children[0],priorGeometry=geometryPlot.children[0];
 assert.doesNotThrow(()=>change('loading-replacement',1.1));
 assert.equal(source,priorSource);assert.equal(h.plot.children[0],priorThermal);
 assert.equal(geometryPlot.children[0],priorGeometry);assert.equal(get('export-fusion').disabled,false);
 assert.equal(l.export.disabled,true);assert.equal(l.plot.children.length,0);assert.match(l.status.textContent,/replacement probability 0–1/);
 change('loading-replacement',.2);assert.equal(l.export.disabled,false);assert.ok(l.plot.children.length>0);
 const priorLoading=l.plot.children[0];change('loading-tolerance',1e-9,'change');
 assert.notEqual(l.plot.children[0],priorLoading);assert.equal(l.status.textContent,'');assert.match(text(loadingHost),/Relative tolerance 1.000e-9 → 1.000e-10/);
 assert.equal(get('loading-replacement').attributes['aria-valuetext'],'0.2 replacement probability');
 change('fusion-exposureS',25);
 assert.equal(source.config.exposureS,25);assert.equal(l.status.textContent,'');assert.equal(h.status.textContent,'');
 assert.equal(descendants(thermal.durationHost).filter(e=>e.id==='fusion-exposureS').length,1);
 assert.equal(descendants(get('fusion-assumption-controls')).some(e=>e.id==='fusion-exposureS'),false);
 // Both settings are inside native bounds; a thick slab at 20 keV exits the fit trajectory domain.
 change('fusion-beamEnergyKeV',20);assert.ok(source);
 change('fusion-materialColumnM2',23);
 assert.ok(source===null,'thick low-energy slab must invalidate source');assert.equal(get('export-fusion').disabled,true);
 assert.equal(l.export.disabled,true);assert.equal(l.plot.children.length,0);
 assert.equal(h.export.disabled,true);assert.equal(h.plot.children.length,0);assert.equal(geometryPlot.children.length,0);
 assert.match(get('fusion-status').textContent,/exits the D–T fit domain/);
 change('fusion-materialColumnM2',21);
 assert.ok(source);assert.equal(l.export.disabled,false);assert.equal(h.export.disabled,false);
 assert.ok(l.plot.children.length>0);assert.ok(h.plot.children.length>0);assert.ok(geometryPlot.children.length>0);
 assert.match(text(loadingHost),/Relative tolerance 1.000e-9 → 1.000e-10/);
});

test('actual unloaded and beam-off material modes keep loading and thermal limits distinct',t=>{
 const {get,change,host}=dom(t),loadingHost=host(),thermalHost=host();
 const loading=setupTargetLoading(loadingHost),thermal=setupTargetExposure(thermalHost);
 const l=panel(loadingHost,'loading'),h=panel(thermalHost,'exposure');let source:any;
 setupFusionLaboratory({exposureHost:thermal.durationHost,onUpdate:(r:any)=>{source=r;thermal.update(r);loading.update(r);}});
 change('fusion-stopping-model','geant4-bragg','change');change('fusion-tritiumSiteFraction',.5);
 get('fusion-target-enabled').checked=false;get('fusion-target-enabled').fire('change');
 assert.ok(source);assert.equal(source.neutronRateS,0);assert.ok(source.assemblyHeatIfTransmittedBeamStoppedW>0);
 assert.equal(l.export.disabled,false);assert.equal(h.export.disabled,false);
 assert.match(text(loadingHost),/zero yield/);assert.equal(l.status.textContent,'');assert.ok(l.plot.children.length>0);
 get('fusion-target-enabled').checked=true;get('fusion-target-enabled').fire('change');
 assert.ok(source.neutronRateS>0);assert.equal(source.config.targetColumnM2,.5e21);
 get('fusion-beam-enabled').checked=false;get('fusion-beam-enabled').fire('change');
 assert.equal(source.neutronRateS,0);assert.equal(source.assemblyHeatIfTransmittedBeamStoppedW,0);
 assert.equal(l.export.disabled,false);assert.equal(h.export.disabled,false);assert.match(text(loadingHost),/zero yield/);
 get('fusion-beam-enabled').checked=true;get('fusion-beam-enabled').fire('change');
 assert.ok(source.neutronRateS>0);assert.equal(l.export.disabled,false);
});

test('actual loading tolerance controls simultaneous high-dose solve and refinement diagnostics',t=>{
 const {change,host}=dom(t),loadingHost=host(),loading=setupTargetLoading(loadingHost);
 const l=panel(loadingHost,'loading');let source:any;
 setupFusionLaboratory({onUpdate:(r:any)=>{source=r;loading.update(r);}});
 change('fusion-stopping-model','geant4-bragg','change');
 change('fusion-materialColumnM2',19);change('fusion-exposureS',100);change('loading-replacement',1);
 assert.ok(source);assert.equal(l.export.disabled,false);assert.ok(l.plot.children.length>0);
 assert.equal(l.status.textContent,'');assert.match(text(loadingHost),/Relative tolerance 1.000e-11 → 1.000e-12/);
 const previous=l.plot.children[0],previousSource=source;change('loading-tolerance',1e-7,'change');
 assert.notEqual(l.plot.children[0],previous);assert.equal(source,previousSource);
 assert.equal(l.status.textContent,'');assert.match(text(loadingHost),/Relative tolerance 1.000e-7 → 1.000e-8/);
 assert.equal(l.export.disabled,false);assert.ok(l.plot.children.length>0);
 assert.match(text(loadingHost),/Maximum scaled conservation residual/);
 assert.doesNotMatch(text(loadingHost),/First-order event splitting|10% per-interval/);
 change('fusion-beamCurrentA',0);change('fusion-beamAreaM2',-5);change('loading-replacement',.8);
 change('loading-tolerance',1e-11,'change');
 assert.ok(source);assert.equal(l.status.textContent,'');assert.match(text(loadingHost),/Relative tolerance 1.000e-11 → 1.000e-12/);
 assert.equal(l.export.disabled,false);assert.ok(l.plot.children.length>0);
 change('loading-tolerance',1e-15,'change');assert.equal(l.export.disabled,true);assert.equal(l.plot.children.length,0);
 assert.match(l.status.textContent,/relative tolerance/);
 change('loading-tolerance',1e-9,'change');assert.equal(l.export.disabled,false);assert.equal(l.status.textContent,'');
});
