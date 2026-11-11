import test from 'node:test';
import assert from 'node:assert/strict';
import {setupFailureLaboratory} from '../src/limitations-ui.js';
import {setupFusionLaboratory} from '../src/fusion-ui.js';
import {setupDoublewellControls,doublewellConfig} from '../src/doublewell-ui.js';
import {solveEquilibrium} from '../src/equilibrium-model.js';
import {equilibriumPresentation} from '../src/focused-diagnostics.js';
import {simulateDoublewell} from '../src/doublewell-dynamics.js';

// Source-unit DOM only: no browser, native worker, origin request or GPU.
const registry=new Map<string,Element>();
class Element{
 private identifier='';value:string|number='';type='';disabled=false;textContent='';className='';
 min:string|number='';max:string|number='';step:string|number='';htmlFor='';open=false;
 href='';download='';children:Element[]=[];attributes:Record<string,string>={};dataset:Record<string,string>={};events=new Map<string,()=>void>();
 constructor(public tag='div'){}
 set id(id:string){this.identifier=id;registry.set(id,this);}get id(){return this.identifier;}
 append(...children:Element[]){this.children.push(...children);}add(child:Element){this.children.push(child);}
 replaceChildren(...children:Element[]){this.children=children;}
 setAttribute(key:string,value:string){this.attributes[key]=value;}
 addEventListener(key:string,listener:()=>void){this.events.set(key,listener);}
 click(){}fire(key:string){this.events.get(key)!();}
}
function dom(t:{after:(callback:()=>void)=>void}){
 const previous=(globalThis as unknown as {document?:unknown}).document;registry.clear();
 for(const id of ['failure-coverage','failure-controls','failure-plots','failure-metrics','failure-notes','failure-status','export-failure',
  'fusion-controls','fusion-assumption-controls','fusion-readouts','fusion-spot','fusion-spot-size','fusion-current-label','fusion-beam','fusion-neutrons','fusion-beam-enabled','fusion-target-enabled','marathon-energy-plots','fusion-plots','fusion-metrics','fusion-notes','fusion-status','fusion-energy-label','fusion-target-label','export-fusion',
  'doublewell-controls','doublewell-initial-note']){const e=new Element();e.id=id;}
 (globalThis as unknown as {document:unknown}).document={getElementById:(id:string)=>registry.get(id),
  createElement:(tag:string)=>new Element(tag),createElementNS:(_namespace:string,tag:string)=>new Element(tag)};
 t.after(()=>{(globalThis as unknown as {document?:unknown}).document=previous;});
}
const get=(id:string)=>registry.get(id)!;
const all=(element:Element):Element[]=>[element,...element.children.flatMap(all)];

test('every independent-workbench slider endpoint produces finite plotted outputs and a current export',async t=>{
 dom(t);const budgets=setupFailureLaboratory(),fusion=setupFusionLaboratory();
 const previous=URL.createObjectURL,previousRevoke=URL.revokeObjectURL;let exported:Blob|undefined;
 URL.createObjectURL=blob=>{assert.ok(blob instanceof Blob);exported=blob;return 'blob:source-unit';};
 URL.revokeObjectURL=()=>{};t.after(()=>{URL.createObjectURL=previous;URL.revokeObjectURL=previousRevoke;});
 for(const [prefix,lab]of [['failure',budgets],['fusion',fusion]] as const){
  for(const input of [...registry.values()].filter(e=>e.id.startsWith(prefix+'-')&&e.type==='range')){
   const initial=input.value;
   for(const boundary of [input.min,input.max]){
    input.value=boundary;input.fire('input');
    assert.equal(get('export-'+prefix).disabled,false,input.id+' must remain inside its model domain');
    assert.ok(get(prefix+'-plots').children.length>0);
    for(const e of all(get(prefix+'-plots')))for(const value of Object.values(e.attributes))
     assert.doesNotMatch(value,/NaN|Infinity/,input.id+' produced nonfinite SVG coordinates');
    get('export-'+prefix).fire('click');assert.ok(exported);
    const data=JSON.parse(await exported.text());
    for(const [key,value]of Object.entries(lab.read()))assert.equal(data.config[key],value,input.id+' exported a stale input');
    assert.ok(data.assumptions.length>0);assert.ok(data.curves.length>0);
   }
   input.value=initial;input.fire('input');
  }
 }
});

test('adaptive controls disable the ignored cell-grid setting and preserve integer targets into the actual engine',t=>{
 dom(t);setupDoublewellControls(()=>{});
 assert.equal(get('dw-collisionTarget').disabled,true);assert.equal(get('dw-cellsAcross').disabled,false);
 get('dw-collisionMethod').value='adaptive';get('dw-collisionMethod').fire('change');
 assert.equal(get('dw-collisionTarget').disabled,false);assert.equal(get('dw-cellsAcross').disabled,true);
 get('dw-collisionTarget').value='16';get('dw-collisionTarget').fire('change');
 const c={...doublewellConfig([{massU:40,chargeState:1},{massU:84,chargeState:1}]),particlesPerSpecies:16,duration:1e-6};
 const a=simulateDoublewell(c),b=simulateDoublewell({...c,cellsAcross:12});
 assert.equal(a.spatialCollision.method,'adaptive');assert.equal(a.spatialCollision.target,16);
 assert.deepEqual(a.curves,b.curves);assert.deepEqual(a.collisions,b.collisions);
 get('dw-collisionMethod').value='fixed';get('dw-collisionMethod').fire('change');
 assert.equal(get('dw-collisionTarget').disabled,true);assert.equal(get('dw-cellsAcross').disabled,false);
});

test('all coupled field/composition boundary combinations retain the declared B boundary and generalized potential in plotted data',()=>{
 const c={radius:.48,rotationRadS:10000,ionTemperatureEV:5,electronTemperatureEV:5,bins:100,
  species:[{massU:40,chargeState:1,axisFraction:.5},{massU:84,chargeState:1,axisFraction:.5}],
  closure:'magnetic-gaussian' as const,magneticT:.1,densityWidthM:.25,axisDensityM3:1e17,bulkFractionA:.35};
 for(const magneticBoundary of ['axis','wall'] as const)for(const compositionBoundary of ['central','bulk'] as const){
  const r=solveEquilibrium({...c,magneticBoundary,compositionBoundary});assert.equal(r.model,'coupled-magnetic-gaussian');
  if(r.model!=='coupled-magnetic-gaussian')throw new Error('Wrong closure');
  assert.ok(Math.abs((magneticBoundary==='axis'?r.axisMagneticT:r.wallMagneticT)-c.magneticT)<1e-14);
  const p=equilibriumPresentation(r,.7),field=p.curves.find(curve=>curve.yLabel==='Axial magnetic field (T)');
  assert.deepEqual(field?.y,r.gaussianProfiles.map(point=>point.magneticFieldT));
  const potential=p.curves.find(curve=>curve.label==='ψ = φ − Ω ∫ B(r)r dr');
  r.gaussianProfiles.forEach((point,i)=>assert.ok(Math.abs(point.laboratoryPotentialV-c.rotationRadS*point.magneticFluxTM2-potential!.y[i])<1e-12));
  if(compositionBoundary==='bulk')assert.ok(Math.abs(p.diagnostics.bulkNumberFractions[0]!-c.bulkFractionA)<1e-9);
  else assert.equal(r.species[0].axisFraction,.5);
 }
});
