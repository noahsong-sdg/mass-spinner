import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveMaterialGeometry,stoppingDomainForFilm,DT_ONLY_OUTPUT} from '../src/material-realism.js';
import {advanceLithiumCoating,COATING_PACKING_ROUNDOFF_BOUND,type LithiumCoatingConfig} from '../src/lithium-coating.js';
import {DEFAULT_COUPLED_TARGET,simulateCoupledTarget} from '../src/coupled-target.js';
import {DEFAULT_FUSION_BEAM} from '../src/fusion-reactor.js';
import {stoppingForComposition} from '../src/target-material.js';

const close=(a:number,b:number,tol=2e-12)=>assert.ok(Math.abs(a-b)<=tol*Math.max(1,Math.abs(a),Math.abs(b)),`${a} != ${b}`);
const initial={lithiumColumnM2:1e22,tritiumColumnM2:3e21,deuteriumColumnM2:2e21,sensibleEnergyJm2:100};
const config:LithiumCoatingConfig={lithiumNumberDensityM3:1e28,heatCapacityPerLiJK:2e-22,referenceK:300,
 depositionFluxM2S:0,erosionFluxM2S:0,depositedTritiumPerLi:.1,depositedDeuteriumPerLi:.2,depositionTemperatureK:400};

test('independent material scenarios retain both supplied inputs and expose implied host density',()=>{
 const r=resolveMaterialGeometry({mode:'independent',materialColumnM2:1e22,filmThicknessM:2e-6});
 assert.equal(r.materialColumnM2,1e22);assert.equal(r.filmThicknessM,2e-6);assert.equal(r.numberDensityM3,5e27);
 assert.equal(r.calibration,'scenario');
});

test('number-density linking preserves the edited quantity and round-trips',()=>{
 const input={mode:'number-density' as const,materialColumnM2:1e22,filmThicknessM:2e-6,numberDensityM3:1e28};
 const thickness=resolveMaterialGeometry(input,'thickness');close(thickness.materialColumnM2,2e22);
 const column=resolveMaterialGeometry(input,'column');close(column.filmThicknessM,1e-6);
 const back=resolveMaterialGeometry({...column,filmThicknessM:2e-6},'thickness');close(back.materialColumnM2,2e22);
 for(const invalid of [0,-1,Infinity,NaN])assert.throws(()=>resolveMaterialGeometry({...input,numberDensityM3:invalid}),RangeError);
 assert.throws(()=>resolveMaterialGeometry({...input,filmThicknessM:1e-320,numberDensityM3:1e-320},'thickness'),RangeError);
});

test('coating zero flux exactly preserves fixed inventory, temperature and energy',()=>{
 const r=advanceLithiumCoating(initial,config,1e8);assert.deepEqual(r.state,initial);
 assert.equal(r.thicknessM,1e-6);assert.equal(r.temperatureK,350);
 assert.ok(Object.values(r.eroded).every(x=>x===0));assert.ok(Object.values(r.residuals).every(x=>x===0));
 assert.match(r.coupling,/not coupled/);
 assert.deepEqual(advanceLithiumCoating(initial,{...config,erosionFluxM2S:1e21},0).state,initial);
});

test('pure deposition adds the supplied Li and isotope inventory plus sensible energy',()=>{
 const r=advanceLithiumCoating(initial,{...config,depositionFluxM2S:1e21},2);
 close(r.state.lithiumColumnM2,1.2e22);close(r.state.tritiumColumnM2,3.2e21);close(r.state.deuteriumColumnM2,2.4e21);
 close(r.state.sensibleEnergyJm2,140);close(r.temperatureK,300+140/2.4);
 assert.equal(r.erodedMassKgm2,0);close(r.massKgm2,1.66053906892e-27*(7*1.2e22+3*3.2e21+2*2.4e21));
});

test('pure well-mixed erosion preserves isotope fractions and temperature with export ledgers',()=>{
 const r=advanceLithiumCoating(initial,{...config,erosionFluxM2S:1e21},2);
 close(r.state.lithiumColumnM2,8e21);close(r.state.tritiumColumnM2,2.4e21);close(r.state.deuteriumColumnM2,1.6e21);
 close(r.state.sensibleEnergyJm2,80);close(r.temperatureK,350);close(r.eroded.tritiumM2,6e20);
 close(r.eroded.sensibleEnergyJm2,20);
});

test('balanced deposition/erosion matches independent exponential washout and closes atom/mass/energy',()=>{
 const c={...config,depositionFluxM2S:2e21,erosionFluxM2S:2e21},r=advanceLithiumCoating(initial,c,3);
 const decay=Math.exp(-.6);
 close(r.state.tritiumColumnM2,1e22*(.1+(.3-.1)*decay));
 close(r.state.deuteriumColumnM2,2e21);close(r.state.sensibleEnergyJm2,1e22*(2e-20+(1e-20-2e-20)*decay));
 for(const key of ['lithiumM2','tritiumM2','deuteriumM2'] as const)assert.ok(Math.abs(r.residuals[key])<64*Number.EPSILON*1e22);
 close(r.residuals.sensibleEnergyJm2,0,1e-10);close(r.residuals.massKgm2,0,1e-12);
 close(r.massKgm2+r.erodedMassKgm2,r.depositedMassKgm2+1.66053906892e-27*(7e22+9e21+4e21));
});

test('unbalanced exact coating evolution has split-step consistency and remains a convex mixture',()=>{
 for(const [p,e] of [[2e21,1e21],[1e21,2e21],[2e21,2e21*(1+1e-12)]]){
  const c={...config,depositionFluxM2S:p,erosionFluxM2S:e},r=advanceLithiumCoating(initial,c,3);
  const first=advanceLithiumCoating(initial,c,1),split=advanceLithiumCoating(first.state,c,2);
  for(const key of Object.keys(initial) as (keyof typeof initial)[])close(r.state[key],split.state[key]);
  assert.ok(r.state.tritiumColumnM2>=.1*r.state.lithiumColumnM2&&r.state.tritiumColumnM2<=.3*r.state.lithiumColumnM2);
  close(r.deposited.tritiumM2,first.deposited.tritiumM2+split.deposited.tritiumM2);
  close(r.eroded.tritiumM2,first.eroded.tritiumM2+split.eroded.tritiumM2);
 }
});

test('coating model rejects exhaustion and malformed material states instead of inventing remapping',()=>{
 assert.throws(()=>advanceLithiumCoating(initial,{...config,erosionFluxM2S:1e22},1),/exhaustion/);
 assert.throws(()=>advanceLithiumCoating(initial,{...config,depositedTritiumPerLi:1},1),RangeError);
 assert.throws(()=>advanceLithiumCoating({...initial,tritiumColumnM2:1e22},config,1),RangeError);
 assert.throws(()=>advanceLithiumCoating({...initial,sensibleEnergyJm2:-601},config,1),RangeError);
 assert.throws(()=>advanceLithiumCoating(initial,{...config,depositionFluxM2S:-1},1),RangeError);
 assert.throws(()=>advanceLithiumCoating(initial,{...config,lithiumNumberDensityM3:1e-310},1),RangeError);
});

test('fully occupied coating can be advanced repeatedly without projecting isotope ledgers',()=>{
 for(const [p,e] of [[.2,.2],[.2,.3],[.3,.2],[0,.1]]){
  let s={lithiumColumnM2:1,tritiumColumnM2:.37,deuteriumColumnM2:.63,sensibleEnergyJm2:50};
  const c={...config,heatCapacityPerLiJK:1,depositionFluxM2S:p,erosionFluxM2S:e,depositedTritiumPerLi:.14,depositedDeuteriumPerLi:.86};
  for(let i=0;i<200;i++){
   const r=advanceLithiumCoating(s,c,.01);s=r.state;
   assert.ok(r.packing.relativeExcess<=COATING_PACKING_ROUNDOFF_BOUND);assert.equal(r.packing.populationsModified,false);
  }
  const one=advanceLithiumCoating({lithiumColumnM2:1,tritiumColumnM2:.37,deuteriumColumnM2:.63,sensibleEnergyJm2:50},c,2);
  for(const key of Object.keys(s) as (keyof typeof s)[])close(s[key],one.state[key]);
 }
 assert.throws(()=>advanceLithiumCoating({...initial,tritiumColumnM2:8e21*(1+1e-10)},config,0),RangeError);
});

test('tiny erosion exports stay positive instead of cancelling against a huge deposition inventory',()=>{
 const s={lithiumColumnM2:1,tritiumColumnM2:.7,deuteriumColumnM2:0,sensibleEnergyJm2:50};
 const c={...config,heatCapacityPerLiJK:1,depositionFluxM2S:1000,erosionFluxM2S:1e-30,
  depositedTritiumPerLi:.5,depositedDeuteriumPerLi:0,depositionTemperatureK:500};
 const r=advanceLithiumCoating(s,c,10);
 const expected=5e-30+.2*(-Math.expm1(-1e-33*Math.log(10001)));
 assert.ok(r.eroded.tritiumM2>0);assert.ok(Math.abs(r.eroded.tritiumM2/expected-1)<1e-12);
 close(r.residuals.tritiumM2,0,1e-11);
});

test('rare incoming isotope erosion is resolved without subtracting nearly equal gross exports',()=>{
 const s={lithiumColumnM2:1,tritiumColumnM2:0,deuteriumColumnM2:0,sensibleEnergyJm2:50};
 const c={...config,heatCapacityPerLiJK:1,depositionFluxM2S:1e-30,erosionFluxM2S:.1,
  depositedTritiumPerLi:1,depositedDeuteriumPerLi:0};
 const r=advanceLithiumCoating(s,c,1),expected=1e-30*(1+9*Math.log(.9));
 assert.ok(r.eroded.tritiumM2>0);assert.ok(Math.abs(r.eroded.tritiumM2/expected-1)<1e-12);
 assert.ok(Math.abs(r.state.tritiumColumnM2+r.eroded.tritiumM2-1e-30)<1e-44);
});

test('stopping map retains fit-edge boundary, unsupported tail and zero-film energy',()=>{
 const composition={tritiumFraction:1,deuteriumFraction:0};
 const r=stoppingDomainForFilm(100,0,composition);assert.equal(r.exitEnergyKeV,100);
 assert.equal(r.status,'within-fit-domain');assert.ok(r.supportedColumnM2>0);
 const thick=stoppingDomainForFilm(100,2*r.supportedColumnM2,composition);
 assert.equal(thick.exitEnergyKeV,null);assert.equal(thick.status,'stopped-tail-unresolved');close(thick.unsupportedColumnM2,r.supportedColumnM2);
 assert.throws(()=>stoppingDomainForFilm(.5,1e20,composition),RangeError);
 assert.throws(()=>stoppingDomainForFilm(100,1e20,{tritiumFraction:1,deuteriumFraction:1}),RangeError);
});

test('CSDA inverse-range map agrees with an independent fine explicit energy path and refines',()=>{
 const composition={tritiumFraction:.3,deuteriumFraction:.2},column=1e22;
 const coarse=stoppingDomainForFilm(100,column,composition,64),fine=stoppingDomainForFilm(100,column,composition,512);
 assert.ok(fine.refinementDeltaM2<coarse.refinementDeltaM2);
 let energy=100;const steps=20000,h=column/steps;
 for(let i=0;i<steps;i++)energy-=h*stoppingForComposition(energy-h/2*stoppingForComposition(energy,composition).totalKeVM2,composition).totalKeVM2;
 close(fine.exitEnergyKeV!,energy,1e-7);
 for(let i=1;i<fine.samples.length;i++)assert.ok(fine.samples[i].columnM2>fine.samples[i-1].columnM2&&fine.samples[i].energyKeV<fine.samples[i-1].energyKeV);
});

test('legacy target configuration keeps its numerical behavior and now explicitly identifies D–T outputs',()=>{
 const result=simulateCoupledTarget({...DEFAULT_FUSION_BEAM,stoppingModel:'geant4-bragg',materialColumnM2:1e22,beamCurrentA:0,exposureS:.1},
  {...DEFAULT_COUPLED_TARGET,depthCells:2,samples:10,cooldownS:0});
 assert.equal(result.reactionOutput,DT_ONLY_OUTPUT);assert.equal(result.materialGeometry.numberDensityM3,1e28);
 assert.equal(result.final.cumulativeNeutrons,0);assert.ok(result.final.tritiumFraction.every(x=>x===1));
 assert.match(result.reactionOutput.limitation,/D–D/);assert.ok(result.curves[0].label.includes('D–T'));
});
