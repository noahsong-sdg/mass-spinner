import test from 'node:test';
import assert from 'node:assert/strict';
import {setupFailureLaboratory,modelValidity} from '../src/limitations-ui.js';
import {setupFusionLaboratory} from '../src/fusion-ui.js';
import {solveEquilibrium} from '../src/equilibrium-model.js';
import {equilibriumPresentation} from '../src/focused-diagnostics.js';
import {DEFAULT_DOUBLEWELL,simulateDoublewell} from '../src/doublewell-dynamics.js';
import {magneticCentrifuge} from '../src/magnetic-centrifuge.js';
import {centrifugeDiagnostics} from '../src/centrifuge-diagnostics.js';
import {renderConvergenceEvidence} from '../src/convergence-evidence.js';
import {readFileSync} from 'node:fs';

// Source-unit DOM exercise; no browser, origin request, native worker or GPU.
const registry=new Map<string,Element>();
class Element{
 private identifier='';children:Element[]=[];attributes:Record<string,string>={};value:string|number='';
 textContent='';className='';type='';disabled=false;checked=true;min:number|string='';max:number|string='';step:number|string='';htmlFor='';
 events=new Map<string,()=>void>();
 constructor(public tag='div'){}
 set id(id:string){this.identifier=id;registry.set(id,this);}get id(){return this.identifier;}
 append(...children:Element[]){this.children.push(...children);}replaceChildren(...children:Element[]){this.children=children;}
 setAttribute(key:string,value:string){this.attributes[key]=value;}
 addEventListener(key:string,listener:()=>void){this.events.set(key,listener);}
}
function dom(t:{after:(fn:()=>void)=>void}){
 const before=(globalThis as unknown as {document?:unknown}).document;registry.clear();
 for(const id of ['failure-coverage','failure-controls','failure-plots','failure-metrics','failure-notes','failure-status','export-failure',
  'fusion-controls','fusion-assumption-controls','fusion-readouts','fusion-spot','fusion-spot-size','fusion-current-label','fusion-beam','fusion-neutrons','fusion-beam-enabled','fusion-target-enabled','marathon-energy-plots','fusion-plots','fusion-metrics','fusion-notes','fusion-status','fusion-energy-label','fusion-target-label','export-fusion']){
  const e=new Element();e.id=id;
 }
 (globalThis as unknown as {document:unknown}).document={getElementById:(id:string)=>registry.get(id),
  createElement:(tag:string)=>new Element(tag),createElementNS:(_ns:string,tag:string)=>new Element(tag)};
 t.after(()=>{(globalThis as unknown as {document?:unknown}).document=before;});
}
const text=(e:Element):string=>e.textContent+e.children.map(text).join(' ');

test('actual failure controls update plotted estimates without pretending to update separator dynamics',t=>{
 dom(t);const lab=setupFailureLaboratory();
 assert.equal(registry.get('failure-coverage')!.children.length,11);
 const before=text(registry.get('failure-metrics')!),plots=registry.get('failure-plots')!.children;
 registry.get('failure-neutralDensityM3')!.value=20;registry.get('failure-neutralDensityM3')!.events.get('input')!();
 assert.equal(lab.read().neutralDensityM3,1e20);
 assert.notEqual(text(registry.get('failure-metrics')!),before);
 assert.notDeepEqual(registry.get('failure-plots')!.children,plots);
 assert.match(registry.get('failure-status')!.textContent,/do not change the separator/);
 registry.get('failure-residenceS')!.value=NaN;lab.update();
 assert.equal(registry.get('failure-plots')!.children.length,0);assert.equal(registry.get('export-failure')!.disabled,true);
});

test('bulk composition inversion does not reject a valid magnetic mixture because an unused pure-species trial fails',()=>{
 const base={radius:.2,rotationRadS:10000,ionTemperatureEV:5,electronTemperatureEV:5,bins:100,
  species:[{massU:40,chargeState:1,axisFraction:.5},{massU:84,chargeState:1,axisFraction:.5}],
  magneticBoundary:'axis' as const,magneticT:.06,densityWidthM:.1,axisDensityM3:1e18};
 const target=solveEquilibrium({...base,closure:'gaussian',compositionBoundary:'bulk',bulkFractionA:.5});
 const mixture=magneticCentrifuge({...base,species:target.species});
 const pure=magneticCentrifuge({...base,species:base.species.map((s,i)=>({...s,axisFraction:i?1:0}))});
 const rise=(r:typeof mixture)=>r.wallMagneticT**2-r.axisMagneticT**2;
 const wallB=Math.sqrt((rise(mixture)+rise(pure))/2);
 assert.throws(()=>magneticCentrifuge({...base,magneticBoundary:'wall',magneticT:wallB,
  species:pure.species}),/No regular nonzero-B/);
 const actual=solveEquilibrium({...base,magneticT:wallB,magneticBoundary:'wall',
  closure:'magnetic-gaussian',compositionBoundary:'bulk',bulkFractionA:.5});
 assert.ok(Math.abs(centrifugeDiagnostics(actual).bulkNumberFractions[0]!-.5)<1e-9);
 assert.equal(actual.model,'coupled-magnetic-gaussian');
});

test('published convergence table displays the frozen failed case and preserves withheld intervals',t=>{
 dom(t);for(const id of ['convergence-status','convergence-identity','convergence-rows','convergence-checks']){
  const e=new Element();e.id=id;
 }
 const evidence=JSON.parse(readFileSync('web-assets/convergence/display.json','utf8'));
 const compact=JSON.parse(readFileSync('web-assets/convergence/convergence-default-200us-v1.summary.json','utf8'));
 assert.equal(evidence.sourceHash,compact.sourceHash);assert.equal(evidence.status,compact.summary.status);
 renderConvergenceEvidence(evidence);
 assert.match(registry.get('convergence-status')!.textContent,/gate FAIL/);
 assert.match(registry.get('convergence-status')!.textContent,/Static audit evidence/);
 assert.equal(registry.get('convergence-rows')!.children.length,compact.plan.levels.length);
 assert.match(registry.get('convergence-identity')!.textContent,/not independent-ion|No independent-ion/);
 const altered=structuredClone(evidence);altered.levels[0].endA.halfWidth95=null;
 renderConvergenceEvidence(altered);assert.match(text(registry.get('convergence-rows')!),/interval withheld/);
});

test('beam controls drive computed power and curves; invalid settings clear old outputs and export',t=>{
 dom(t);const lab=setupFusionLaboratory(),before=text(registry.get('fusion-metrics')!);
 registry.get('fusion-beamCurrentA')!.value=-1;registry.get('fusion-beamCurrentA')!.events.get('input')!();
 assert.equal(lab.read().beamCurrentA,.1);assert.notEqual(text(registry.get('fusion-metrics')!),before);
 registry.get('fusion-beamEnergyKeV')!.value=200;registry.get('fusion-beamEnergyKeV')!.events.get('input')!();
 assert.match(registry.get('fusion-energy-label')!.textContent,/200/);
 const config=lab.read();assert.equal(config.beamEnergyKeV,200);
 registry.get('fusion-beam-enabled')!.checked=false;registry.get('fusion-beam-enabled')!.events.get('change')!();
 assert.equal(lab.read().beamCurrentA,0);assert.equal(registry.get('fusion-beam')!.attributes.visibility,'hidden');
 registry.get('fusion-beam-enabled')!.checked=true;registry.get('fusion-beam-enabled')!.events.get('change')!();
 registry.get('fusion-target-enabled')!.checked=false;registry.get('fusion-target-enabled')!.events.get('change')!();
 assert.equal(lab.read().targetColumnM2,0);assert.equal(registry.get('fusion-neutrons')!.attributes.visibility,'hidden');
 registry.get('fusion-stoppingFraction')!.value=1;lab.update();
 assert.equal(registry.get('fusion-plots')!.children.length,0);assert.equal(registry.get('fusion-metrics')!.children.length,0);
 assert.equal(registry.get('export-fusion')!.disabled,true);assert.match(registry.get('fusion-status')!.textContent,/finite physical/);
 assert.equal(registry.get('fusion-beam')!.attributes.visibility,'hidden');
});

test('coupled closure routes through equilibrium adapter and exposes actual B and generalized potential',()=>{
 const c={radius:.2,rotationRadS:10000,ionTemperatureEV:5,electronTemperatureEV:5,bins:100,
  species:[{massU:40,chargeState:1,axisFraction:.5},{massU:84,chargeState:1,axisFraction:.5}],
  closure:'magnetic-gaussian' as const,magneticBoundary:'axis' as const,magneticT:.06,densityWidthM:.1,axisDensityM3:1e18};
 const result=solveEquilibrium(c),p=equilibriumPresentation(result,.7);
 assert.equal(result.model,'coupled-magnetic-gaussian');
 assert.ok(p.curves.some(curve=>curve.yLabel==='Axial magnetic field (T)'));
 assert.ok(p.curves.some(curve=>curve.label==='ψ = φ − Ω ∫ B(r)r dr'));
 assert.match(modelValidity('centrifuge',c,result),/stability and discharge evolution are unsolved/);
});

test('kinetic status reports the actual run regime and raw residual, without claiming validity',()=>{
 const c={...DEFAULT_DOUBLEWELL,particlesPerSpecies:8,duration:1e-6,collisions:false};
 const r=simulateDoublewell(c),message=modelValidity('doublewell-dynamics',c,r);
 assert.match(message,/Exploratory/);assert.match(message,/raw Pθ residual/);assert.match(message,/not calibrated purity/);
 assert.match(modelValidity('centrifuge',null,null),/No current result/);
});
