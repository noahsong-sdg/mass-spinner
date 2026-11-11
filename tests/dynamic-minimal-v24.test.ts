import test from 'node:test';
import assert from 'node:assert/strict';
import {setupFusionLaboratory} from '../src/fusion-ui.js';
import {setupTargetExposure} from '../src/target-exposure-ui.js';
import {setupNeutronGeometry} from '../src/neutron-geometry-ui.js';
import {setupBlanketExplorer} from '../src/blanket-ui.js';

// Source-unit DOM: production event handlers and plots, not browser/GPU verification.
class El{
 private identifier='';value:string|number='';type='';checked=false;disabled=false;hidden=false;open=false;textContent='';className='';
 min:string|number='';max:string|number='';step:string|number='';htmlFor='';children:El[]=[];
 attributes:Record<string,string>={};events=new Map<string,()=>void>();
 constructor(readonly tag:string,private registry:Map<string,El>){}
 set id(id:string){this.identifier=id;this.registry.set(id,this);}get id(){return this.identifier;}
 append(...children:El[]){this.children.push(...children);}replaceChildren(...children:El[]){this.children=children;}
 setAttribute(k:string,v:string){this.attributes[k]=v;}addEventListener(k:string,fn:()=>void){this.events.set(k,fn);}
 fire(k:string){this.events.get(k)!();}
}
const descendants=(e:El):El[]=>[e,...e.children.flatMap(descendants)];
const text=(e:El):string=>e.textContent+e.children.map(text).join(' ');
const info=(host:El)=>descendants(host).filter(e=>e.tag==='details'&&e.children[0]?.textContent==='Model info');
function dom(t:{after:(fn:()=>void)=>void}){
 const registry=new Map<string,El>(),previous=(globalThis as unknown as {document?:unknown}).document;
 for(const id of ['fusion-controls','fusion-assumption-controls','fusion-readouts','fusion-spot','fusion-spot-size',
  'fusion-current-label','fusion-beam','fusion-neutrons','fusion-beam-enabled','fusion-target-enabled',
  'marathon-energy-plots','fusion-plots','fusion-metrics','fusion-notes','fusion-status','fusion-energy-label',
  'fusion-target-label','export-fusion']){const e=new El('div',registry);e.id=id;}
 (globalThis as unknown as {document:unknown}).document={getElementById:(id:string)=>registry.get(id),
  createElement:(tag:string)=>new El(tag,registry),createElementNS:(_:string,tag:string)=>new El(tag,registry),
  createTextNode:(value:string)=>Object.assign(new El('#text',registry),{textContent:value})};
 t.after(()=>{(globalThis as unknown as {document?:unknown}).document=previous;});
 const get=(id:string)=>registry.get(id)!;
 return {get,change:(id:string,value:string|number,event='input')=>{get(id).value=value;get(id).fire(event);},
  host:()=>new El('div',registry)};
}
const status=(host:El)=>descendants(host).find(e=>e.attributes.role==='status')!;
const plots=(host:El)=>descendants(host).filter(e=>e.className==='live-plots');

test('source success is quiet while fit exclusions and invalid-source errors remain visible',t=>{
 const {get,change}=dom(t);let source:any;
 setupFusionLaboratory({onUpdate:(r:any)=>{source=r;}});
 assert.ok(source.neutronRateS>0);assert.equal(get('fusion-status').textContent,'');
 assert.ok(get('marathon-energy-plots').children.length>0);
 change('fusion-stopping-model','geant4-bragg','change');
 assert.ok(source.neutronRateS>0);assert.match(text(get('fusion-notes')),/fixed|Bragg|additivity/i);
 // A thick high-energy material slab is valid, but some scan energies leave the fit domain.
 change('fusion-beamEnergyKeV',500);change('fusion-materialColumnM2',23);
 assert.ok(source);assert.match(get('fusion-status').textContent,/Scan omits .*outside the fit domain/);
 assert.ok(get('marathon-energy-plots').children.length>0);
 change('fusion-beamEnergyKeV',20);
 assert.equal(source,null);assert.match(get('fusion-status').textContent,/exits the D–T fit domain/);
 assert.equal(get('export-fusion').disabled,true);assert.equal(get('marathon-energy-plots').children.length,0);
 change('fusion-materialColumnM2',21);
 assert.ok(source);assert.equal(get('export-fusion').disabled,false);
});

test('exposure keeps units, live results and local errors with scientific scope behind Model info',t=>{
 const {host,get,change}=dom(t),h=host(),thermal=setupTargetExposure(h);let source:any;
 setupFusionLaboratory({exposureHost:thermal.durationHost,onUpdate:(r:any)=>{source=r;thermal.update(r);}});
 const exportButton=descendants(h).find(e=>e.textContent==='Export exposure calculation ↓')!;
 assert.equal(status(h).textContent,'');assert.ok(plots(h)[0].children.length>0);
 const modelInfo=info(h);assert.equal(modelInfo.length,1);assert.equal(modelInfo[0].open,false);
 assert.match(text(modelInfo[0]),/source yield stays fixed/);assert.match(text(modelInfo[0]),/Cₐ/);
 assert.match(text(modelInfo[0]),/lifetime/i);assert.ok(descendants(modelInfo[0]).some(e=>e.tag==='a'));
 assert.equal(descendants(h).find(e=>e.tag==='h3')!.textContent,'Exposure');
 assert.match(get('target-arealHeatCapacityJm2K').attributes['aria-valuetext'],/J m⁻² K⁻¹/);
 const previousPlot=plots(h)[0].children[0];change('fusion-exposureS',25);
 assert.equal(source.config.exposureS,25);assert.notEqual(plots(h)[0].children[0],previousPlot);
 assert.equal(status(h).textContent,'');assert.equal(exportButton.disabled,false);
 change('target-coolantK',-274);
 assert.match(status(h).textContent,/positive heat capacity\/absolute temperatures/);
 assert.equal(plots(h)[0].children.length,0);assert.equal(exportButton.disabled,true);
 change('target-coolantK',20);
 assert.equal(status(h).textContent,'');assert.ok(plots(h)[0].children.length>0);
 assert.equal(exportButton.disabled,false);
});

test('sample geometry stays quiet only inside its declared point-source regime',t=>{
 const {host,change}=dom(t),h=host(),geometry=setupNeutronGeometry(h);
 setupFusionLaboratory({onUpdate:(r:any)=>geometry.update(r)});
 assert.match(status(h).textContent,/Point-source limit/);
 change('neutron-sample-distance',1);
 assert.equal(status(h).textContent,'');assert.ok(plots(h)[0].children.length>0);
 const modelInfo=info(h);assert.equal(modelInfo.length,1);assert.equal(modelInfo[0].open,false);
 assert.match(text(modelInfo[0]),/does not solve.*angular spectrum/);
 assert.match(text(h),/n\/m²\/s/);
 change('neutron-sample-distance',.1);
 assert.match(status(h).textContent,/finite-source geometry unresolved/);
 change('neutron-sample-distance',-1);
 assert.match(status(h).textContent,/nonnegative source rate and distance/);
 assert.equal(plots(h)[0].children.length,0);
 change('neutron-sample-distance',1);
 assert.equal(status(h).textContent,'');assert.ok(plots(h)[0].children.length>0);
});

test('blanket numerical outputs remain live while scope is collapsed and errors remain visible',t=>{
 const {host,change}=dom(t),h=host(),{panel}=setupBlanketExplorer(h);
 assert.equal(panel.children[0].textContent,'Blanket');assert.equal(status(h).textContent,'');
 const modelInfo=info(h);assert.equal(modelInfo.length,2);assert.ok(modelInfo.every(e=>!e.open));
 const scope=modelInfo.find(e=>/compact LiT beamline/.test(text(e)))!;
 assert.ok(scope);assert.match(text(scope),/initial mixture is assumed/);
 assert.match(text(scope),/no product purity, usable yield or release date/);
 assert.ok(descendants(scope).some(e=>e.tag==='a'));
 assert.ok(!panel.children.some((e:El)=>e.tag==='p'&&e.attributes.role!=='status'),'only real status messages may appear outside disclosures');
 const mercury=descendants(h).find(e=>e.children[0]?.textContent==='¹⁹⁷Hg')!,gold=descendants(h).find(e=>e.children[0]?.textContent==='¹⁹⁷Au')!;
 assert.equal(mercury.children[1].textContent,'100.000%');assert.equal(gold.children[1].textContent,'0.000%');
 change('blanket-cooldown-hours',100);
 assert.notEqual(gold.children[1].textContent,'0.000%');assert.equal(status(h).textContent,'');
 assert.ok(plots(h)[0].children.length>0);
 change('blanket-isomer-fraction',1.1);
 assert.match(status(h).textContent,/must lie between zero and one/);assert.equal(plots(h)[0].children.length,0);
 change('blanket-isomer-fraction',.5);
 assert.equal(status(h).textContent,'');assert.ok(plots(h)[0].children.length>0);
 const opticalStatus=descendants(h).filter(e=>e.attributes.role==='status')[1];
 assert.match(opticalStatus.textContent,/Reaction fraction η = .*utilization Ξ/);
 change('blanket-optical-depth',-1);assert.match(opticalStatus.textContent,/finite nonnegative/);
 change('blanket-optical-depth',0);assert.match(opticalStatus.textContent,/0\.000%.*1\.0000/);
});
