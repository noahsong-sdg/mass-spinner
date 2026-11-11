import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FUSION_BEAM,type FusionBeamConfig} from '../src/fusion-reactor.js';
import {DEFAULT_COUPLED_TARGET,simulateCoupledTarget,type CoupledTargetConfig} from '../src/coupled-target.js';

const beam: FusionBeamConfig={...DEFAULT_FUSION_BEAM,stoppingModel:'geant4-bragg',materialColumnM2:1e21,
 targetColumnM2:7e20,beamCurrentA:0,exposureS:.03};
const config:CoupledTargetConfig={...DEFAULT_COUPLED_TARGET,depthCells:4,backingCells:2,cooldownS:0,
 initialK:343.15,coolantK:293.15,backHeatTransferWM2K:0,samples:10,
 relativeTolerance:1e-7,absoluteTolerance:1e-11,maxStepS:.0002};
const close=(a:number,b:number,absolute:number,relative=0)=>assert.ok(
 Math.abs(a-b)<=absolute+relative*Math.abs(b),`${a} != ${b}`);
const avg=(a:number[])=>a.reduce((x,y)=>x+y,0)/a.length;

test('closed homogeneous isotope state is invariant even when implicit diffusion is extremely stiff',t=>{
 for(const diffusivityM2S of [1e-12,1]){
  const r=simulateCoupledTarget({...beam,exposureS:.001},{...config,depthCells:8,diffusivityM2S,maxStepS:.001});
  for(const s of r.history){
   for(const value of s.tritiumFraction)close(value,.7,2e-12);
   for(const value of s.deuteriumFraction)close(value,.3,2e-12);
   for(const value of s.vacancyFraction)assert.equal(value,0);
   assert.equal(s.incidentD,0);assert.equal(s.cumulativeNeutrons,0);
  }
  t.diagnostic(JSON.stringify({diffusivityM2S,maxTError:Math.max(...r.history.flatMap(s=>s.tritiumFraction.map(x=>Math.abs(x-.7)))),solver:r.solver}));
 }
});

test('explicit null or missing numeric coefficients never silently select a zero physical process',()=>{
 for(const key of ['diffusivityM2S','releaseAttemptRateS','renewalRateS','pulseDuty','cooldownS'] as const)
  for(const invalid of [null,undefined])
   assert.throws(()=>simulateCoupledTarget(beam,{...config,[key]:invalid} as unknown as CoupledTargetConfig),
    /finite physical|valid material|numeric/);
});

test('an explicit null implantation profile cannot silently become a uniform profile',()=>{
 assert.throws(()=>simulateCoupledTarget(beam,{...config,implantationWeights:null} as unknown as CoupledTargetConfig),
  /[Ii]mplantation|[Ww]eights|finite physical/);
});

test('front release and back permeation match independent boundary-cell exponential losses',t=>{
 const c={...config,surfaceReleaseVelocityMS:2e-7,backPermeationVelocityMS:3e-7};
 const r=simulateCoupledTarget(beam,c),width=c.filmThicknessM/c.depthCells;
 const expectedT=Array.from({length:c.depthCells},(_,i)=>.7*Math.exp(-beam.exposureS*
  (i===0?c.surfaceReleaseVelocityMS/width:i===c.depthCells-1?c.backPermeationVelocityMS/width:0)));
 const expectedD=expectedT.map(t=>t*3/7),inventory=beam.materialColumnM2!*beam.beamAreaM2;
 for(let i=0;i<c.depthCells;i++){
  close(r.final.tritiumFraction[i],expectedT[i],2e-6);
  close(r.final.deuteriumFraction[i],expectedD[i],2e-6);
  close(r.final.vacancyFraction[i],1-expectedT[i]-expectedD[i],3e-6);
 }
 close(r.final.releasedT/inventory,.7-avg(expectedT),2e-6);
 close(r.final.releasedD/inventory,.3-avg(expectedD),2e-6);
 assert.equal(r.final.cumulativeNeutrons,0);assert.equal(r.final.energy.incidentBeamJ,0);
 t.diagnostic(JSON.stringify({maxTError:Math.max(...r.final.tritiumFraction.map((v,i)=>Math.abs(v-expectedT[i]))),
  releasedTPerSite:r.final.releasedT/inventory,expectedReleasedTPerSite:.7-avg(expectedT),solver:r.solver}));
});

test('temperature-dependent boundary escape follows the independently evaluated Arrhenius rate',t=>{
 const kb=8.617333262145e-5,temperatures=[293.15,343.15],results:number[]=[];
 for(const temperatureK of temperatures){
  const c={...config,initialK:temperatureK,surfaceReleaseVelocityMS:2e-7,surfaceReleaseActivationEV:.04};
  const r=simulateCoupledTarget({...beam,exposureS:.1},c),width=c.filmThicknessM/c.depthCells;
  const k=c.surfaceReleaseVelocityMS/width*Math.exp(-c.surfaceReleaseActivationEV/(kb*temperatureK));
  const expected=.7*Math.exp(-k*.1),actual=r.final.tritiumFraction[0];
  close(actual,expected,2e-6);results.push(actual);
  t.diagnostic(JSON.stringify({temperatureK,rateS:k,expected,actual}));
 }
 assert.ok(results[1]<results[0],'warmer boundary must release more for the declared positive activation energy');
});

test('isotope diffusion and boundary losses preserve independent inventories without residual projections',()=>{
 const r=simulateCoupledTarget(beam,{...config,diffusivityM2S:3e-12,
  surfaceReleaseVelocityMS:2e-7,backPermeationVelocityMS:3e-7});
 const inventory=beam.materialColumnM2!*beam.beamAreaM2;
 for(const s of r.history){
  close(avg(s.tritiumFraction)+s.releasedT/inventory,.7,1e-9);
  close(avg(s.deuteriumFraction)+s.releasedD/inventory,.3,1e-9);
  for(let i=0;i<config.depthCells;i++){
   assert.ok(s.tritiumFraction[i]>=0&&s.deuteriumFraction[i]>=0&&s.vacancyFraction[i]>=0);
   close(s.tritiumFraction[i]+s.deuteriumFraction[i]+s.vacancyFraction[i],1,1e-9);
  }
  for(const t of s.temperatureK)close(t,config.initialK,2e-10);
 }
});

test('continuous and absent duty limits preserve exact projectile time and beam-off energy',()=>{
 const e=1.602176634e-19;
 for(const duty of [0,1]){
  const b={...beam,beamCurrentA:.01,exposureS:.325},r=simulateCoupledTarget(b,
   {...config,pulsePeriodS:.1,pulseDuty:duty,maxStepS:.01,relativeTolerance:1e-5});
  close(r.final.beamOnS,b.exposureS*duty,2e-14);
  close(r.final.incidentD,b.beamCurrentA/e*b.exposureS*duty,1,2e-13);
  close(r.final.energy.incidentBeamJ,b.beamCurrentA*b.beamEnergyKeV*1000*b.exposureS*duty,1e-11,2e-13);
  assert.equal(r.final.neutronRateS,0);assert.equal(r.final.neutronMeanEnergyMeV,null);
 }
});
