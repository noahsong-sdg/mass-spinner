import test from 'node:test';
import assert from 'node:assert/strict';
import {setupFusionLaboratory} from '../src/fusion-ui.js';
import {setupTargetExposure} from '../src/target-exposure-ui.js';
import {setupNeutronGeometry} from '../src/neutron-geometry-ui.js';

// Source-unit DOM: invokes the production handlers, no browser or GPU substitute.
class El{
 private identifier='';value:string|number='';type='';checked=false;disabled=false;open=false;textContent='';className='';
 min:string|number='';max:string|number='';step:string|number='';htmlFor='';children:El[]=[];
 attributes:Record<string,string>={};events=new Map<string,()=>void>();
 constructor(private registry:Map<string,El>){}
 set id(id:string){this.identifier=id;this.registry.set(id,this);}get id(){return this.identifier;}
 append(...children:El[]){this.children.push(...children);}replaceChildren(...children:El[]){this.children=children;}
 setAttribute(k:string,v:string){this.attributes[k]=v;}addEventListener(k:string,fn:()=>void){this.events.set(k,fn);}
 fire(k:string){this.events.get(k)!();}
}
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
 return (id:string)=>registry.get(id)!;
}

test('actual source ranges expose physical values rather than logarithmic internal coordinates',t=>{
 const get=dom(t),lab=setupFusionLaboratory(),current=get('fusion-beamCurrentA');
 assert.equal(current.value,-2);assert.equal(current.attributes['aria-valuetext'],'0.01 A');
 current.value=-1;current.fire('input');assert.equal(lab.read().beamCurrentA,.1);
 assert.equal(current.attributes['aria-valuetext'],'0.1 A');
 assert.equal(get('fusion-targetColumnM2').attributes['aria-valuetext'],'1.000e+22 m⁻²');
 assert.equal(get('fusion-beamAreaM2').attributes['aria-valuetext'],'0.01 m²');
 get('fusion-beamAreaM2').value=-3;get('fusion-beamAreaM2').fire('input');
 assert.equal(get('fusion-beamAreaM2').attributes['aria-valuetext'],'0.001 m²');
 get('fusion-beam-enabled').checked=false;get('fusion-beam-enabled').fire('change');
 assert.equal(lab.read().beamCurrentA,0);assert.equal(current.disabled,true);
 assert.equal(current.attributes['aria-valuetext'],'0.1 A'); // Disabled stored setpoint survives.
 get('fusion-beam-enabled').checked=true;get('fusion-beam-enabled').fire('change');
 assert.equal(lab.read().beamCurrentA,.1);assert.equal(current.disabled,false);
});

test('actual source, geometry and thermal handlers isolate local failure and recover shared source duration',t=>{
 const get=dom(t),targetHost=new El(new Map()),geometryHost=new El(new Map());
 const target=setupTargetExposure(targetHost),geometry=setupNeutronGeometry(geometryHost);
 let source:any;setupFusionLaboratory({exposureHost:target.durationHost,onUpdate:(r:any)=>{
  source=r;geometry.update(r);target.update(r);
 }});
 const descendants=(e:El):El[]=>[e,...e.children.flatMap(descendants)];
 const inTarget=(predicate:(e:El)=>boolean)=>descendants(targetHost).find(predicate)!;
 const targetPlot=inTarget(e=>e.className==='live-plots');
 const targetExport=inTarget(e=>e.textContent==='Export exposure calculation ↓');
 const targetStatus=inTarget(e=>e.attributes.role==='status');
 const geometryPlot=descendants(geometryHost).find(e=>e.className==='live-plots')!;
 assert.ok(source.neutronRateS>0);assert.ok(targetPlot.children.length>0);
 assert.ok(geometryPlot.children.length>0);assert.equal(targetExport.disabled,false);
 const validSource=source,validGeometryPlot=geometryPlot.children[0];
 get('target-coolantK').value=-274;
 assert.doesNotThrow(()=>get('target-coolantK').fire('input'));
 assert.equal(source,validSource);assert.equal(get('export-fusion').disabled,false);
 assert.equal(geometryPlot.children[0],validGeometryPlot);
 assert.equal(targetPlot.children.length,0);assert.equal(targetExport.disabled,true);
 assert.match(targetStatus.textContent,/positive heat capacity\/absolute temperatures/);
 get('target-coolantK').value=20;get('target-coolantK').fire('input');
 assert.ok(targetPlot.children.length>0);assert.equal(targetExport.disabled,false);
 get('fusion-stoppingFraction').value=1;get('fusion-stoppingFraction').fire('input');
 assert.equal(source,null);assert.equal(targetPlot.children.length,0);
 assert.equal(geometryPlot.children.length,0);assert.equal(targetExport.disabled,true);
 get('fusion-stoppingFraction').value=.2;get('fusion-stoppingFraction').fire('input');
 assert.ok(source.neutronRateS>0);assert.ok(targetPlot.children.length>0);
 assert.ok(geometryPlot.children.length>0);assert.equal(targetExport.disabled,false);
 get('fusion-exposureS').value=25;get('fusion-exposureS').fire('input');
 assert.equal(source.config.exposureS,25);assert.equal(targetStatus.textContent,'');assert.ok(targetPlot.children.length>0);
});

test('actual source observer receives invalidation and current recovered source, with exact off limits',t=>{
 const get=dom(t);const received:any[]=[];setupFusionLaboratory({onUpdate:(r:any)=>received.push(r)});
 assert.ok(received.at(-1).neutronRateS>0);
 get('fusion-stoppingFraction').value=1;get('fusion-stoppingFraction').fire('input');
 assert.equal(received.at(-1),null);assert.equal(get('export-fusion').disabled,true);
 assert.equal(get('fusion-readouts').children.length,0);assert.equal(get('marathon-energy-plots').children.length,0);
 get('fusion-stoppingFraction').value=.2;get('fusion-stoppingFraction').fire('input');
 assert.ok(received.at(-1).neutronRateS>0);assert.equal(get('export-fusion').disabled,false);
 get('fusion-beam-enabled').checked=false;get('fusion-beam-enabled').fire('change');
 assert.equal(received.at(-1).neutronRateS,0);assert.equal(received.at(-1).beamPowerW,0);
 get('fusion-beam-enabled').checked=true;get('fusion-beam-enabled').fire('change');
 get('fusion-target-enabled').checked=false;get('fusion-target-enabled').fire('change');
 assert.equal(received.at(-1).neutronRateS,0);assert.ok(received.at(-1).beamPowerW>0);
});

test('optional duration mount relocates the one existing source control without splitting exposure state',t=>{
 const get=dom(t),durationHost=new El(new Map());let result:any;
 const lab=setupFusionLaboratory({exposureHost:durationHost,onUpdate:(r:any)=>{result=r;}});
 const descendants=(e:El):El[]=>[e,...e.children.flatMap(descendants)];
 const input=get('fusion-exposureS');assert.ok(descendants(durationHost).includes(input));
 assert.equal(descendants(get('fusion-assumption-controls')).some(e=>e.id==='fusion-exposureS'),false);
 assert.equal(descendants(durationHost).filter(e=>e.id==='fusion-exposureS').length,1);
 const rate=result.neutronRateS;input.value=25;input.fire('input');
 assert.equal(lab.read().exposureS,25);assert.equal(result.config.exposureS,25);
 assert.equal(result.totalNeutrons,rate*25);assert.equal(input.attributes['aria-valuetext'],'25 s');
});
