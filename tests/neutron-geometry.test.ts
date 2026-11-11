import test from 'node:test';
import assert from 'node:assert/strict';
import {isotropicDiskReference} from '../src/neutron-geometry.js';
import {setupNeutronGeometry} from '../src/neutron-geometry-ui.js';
import {setupFusionLaboratory} from '../src/fusion-ui.js';
import {DEFAULT_FUSION_BEAM,simulateFusionBeam} from '../src/fusion-reactor.js';

const reference=(distanceM:number,sampleAreaM2=1,neutronRateS=1)=>isotropicDiskReference({distanceM,sampleAreaM2,neutronRateS});
test('disk solid angle has hemisphere, zero-source and stable far-field limits',()=>{
 assert.equal(reference(0).interceptedFraction,.5);
 assert.equal(reference(0,1,6).interceptedRateS,3);
 assert.equal(reference(.1,1,0).interceptedRateS,0);
 assert.equal(reference(.1,1,0).meanPlaneCurrentM2S,0);
 const far=reference(1e9,.01,1e12),pointCurrent=1e12/(4*Math.PI*1e18);
 assert.ok(far.interceptedFraction>0,'far-field subtraction must not cancel to zero');
 assert.ok(Math.abs(far.meanPlaneCurrentM2S/pointCurrent-1)<1e-14);
});
test('finite disk agrees with independent radial quadrature and conserves its geometric fraction',()=>{
 const distance=.1,area=.02,radius=Math.sqrt(area/Math.PI),n=20000,dr=radius/n;
 let integral=0;
 for(let i=0;i<n;i++){
  const r=(i+.5)*dr;
  integral+=distance*r/(2*(distance*distance+r*r)**1.5)*dr;
 }
 const a=reference(distance,area,1234);
 assert.ok(Math.abs(a.interceptedFraction/integral-1)<1e-8);
 assert.ok(a.interceptedFraction>0&&a.interceptedFraction<.5);
 assert.equal(a.meanPlaneCurrentM2S,a.interceptedRateS/area);
 assert.ok(a.interceptedRateS<1234);
 assert.ok(reference(distance,area*2).interceptedFraction>a.interceptedFraction);
 assert.ok(reference(distance*2,area).interceptedFraction<a.interceptedFraction);
});
test('geometric domain rejects undefined areas and nonfinite inputs without inventing flux',()=>{
 for(const c of [{distanceM:-1},{distanceM:Infinity},{sampleAreaM2:0},{sampleAreaM2:-1},{neutronRateS:NaN},{neutronRateS:-1}])
  assert.throws(()=>isotropicDiskReference({distanceM:1,sampleAreaM2:1,neutronRateS:1,...c}),/requires/);
 assert.throws(()=>reference(0,1e-300,1e300),/representable/);
});

// Actual production UI callbacks with a source-unit DOM; no browser/GPU claim.
const registry=new Map<string,Element>();
class Element{
 private identifier='';children:Element[]=[];attributes:Record<string,string>={};value:string|number='';
 textContent='';className='';type='';disabled=false;checked=true;min:string|number='';max:string|number='';step:string|number='';htmlFor='';open=false;
 events=new Map<string,()=>void>();
 constructor(public tag='div'){}
 set id(id:string){this.identifier=id;registry.set(id,this);}get id(){return this.identifier;}
 append(...children:Element[]){this.children.push(...children);}replaceChildren(...children:Element[]){this.children=children;}
 setAttribute(key:string,value:string){this.attributes[key]=value;}
 addEventListener(key:string,listener:()=>void){this.events.set(key,listener);}
 fire(key:string){this.events.get(key)!();}
}
const all=(e:Element):Element[]=>[e,...e.children.flatMap(all)];
const text=(e:Element):string=>e.textContent+e.children.map(text).join(' ');
const get=(id:string)=>registry.get(id)!;
function dom(t:{after:(f:()=>void)=>void}){
 const previous=(globalThis as unknown as {document?:unknown}).document;registry.clear();
 (globalThis as unknown as {document:unknown}).document={createElement:(tag:string)=>new Element(tag),
  createElementNS:(_ns:string,tag:string)=>new Element(tag),getElementById:(id:string)=>registry.get(id)};
 t.after(()=>{(globalThis as unknown as {document?:unknown}).document=previous;});
}
test('collapsed geometry controls drive finite plots, warn for source size, and clear stale invalid output',t=>{
 dom(t);const host=new Element(),panel=setupNeutronGeometry(host),source=simulateFusionBeam(DEFAULT_FUSION_BEAM);
 assert.equal(host.children[0].tag,'details');assert.equal(host.children[0].open,false);
 assert.equal(host.children[0].className,'fusion-model-notes');
 assert.ok(host.children[0].children.some(e=>e.className==='live-plots'));
 assert.equal(host.children[0].children.at(-1)!.children[0].textContent,'Model info');
 assert.match(text(host),/No valid source/);panel.update(source);
 const before=text(host);get('neutron-sample-distance').value=.1;get('neutron-sample-distance').fire('input');
 assert.notEqual(text(host),before);assert.match(text(host),/radius \/ distance > 0\.1/);
 for(const id of ['neutron-sample-distance','neutron-sample-area']){
  const input=get(id);
  for(const endpoint of [input.min,input.max]){
   input.value=endpoint;input.fire('input');
   assert.ok(all(host).some(e=>e.tag==='svg'));
   for(const e of all(host))for(const value of Object.values(e.attributes))assert.doesNotMatch(value,/NaN|Infinity/);
  }
 }
 panel.update(null);assert.match(text(host),/No valid source/);assert.ok(!all(host).some(e=>e.tag==='svg'));
 panel.update(source);get('neutron-sample-area').value=0;get('neutron-sample-area').fire('input');
 assert.match(text(host),/positive finite sample area/);assert.ok(!all(host).some(e=>e.tag==='svg'));
 get('neutron-sample-area').value=10;get('neutron-sample-area').fire('input');assert.ok(all(host).some(e=>e.tag==='svg'));
});
test('actual fusion callback updates geometry on beam/target toggles, invalidation and recovery',t=>{
 dom(t);
 for(const id of ['fusion-controls','fusion-assumption-controls','fusion-readouts','fusion-spot','fusion-spot-size','fusion-current-label','fusion-beam','fusion-neutrons','fusion-beam-enabled','fusion-target-enabled','marathon-energy-plots','fusion-plots','fusion-metrics','fusion-notes','fusion-status','fusion-energy-label','fusion-target-label','export-fusion']){
  const e=new Element();e.id=id;
 }
 const host=new Element(),panel=setupNeutronGeometry(host);let last:any=null;
 const lab=setupFusionLaboratory({onUpdate:(r:any)=>{last=r;panel.update(r);}});
 const sourceRate=last.neutronRateS;assert.ok(sourceRate>0);
 get('neutron-sample-area').value=100;get('neutron-sample-area').fire('input');assert.equal(last.neutronRateS,sourceRate);
 get('fusion-beam-enabled').checked=false;get('fusion-beam-enabled').fire('change');
 assert.equal(last.neutronRateS,0);
 const outputs=all(host).filter(e=>e.tag==='output');assert.equal(outputs[2].textContent,'0');assert.equal(outputs[3].textContent,'0');
 get('fusion-beam-enabled').checked=true;get('fusion-beam-enabled').fire('change');assert.equal(last.neutronRateS,sourceRate);
 get('fusion-target-enabled').checked=false;get('fusion-target-enabled').fire('change');assert.equal(last.neutronRateS,0);
 get('fusion-target-enabled').checked=true;get('fusion-target-enabled').fire('change');
 get('fusion-stoppingFraction').value=1;lab.update();assert.equal(last,null);assert.match(text(host),/No valid source/);
 get('fusion-stoppingFraction').value=.2;get('fusion-stoppingFraction').fire('input');assert.equal(last.neutronRateS,sourceRate);
});
