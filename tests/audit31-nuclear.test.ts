import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FUSION_BEAM,DTCrossSectionDomainError,simulateFusionBeam} from '../src/fusion-reactor.js';
import {fusionPlaygroundData} from '../src/fusion-playground.js';
import {isotropicDiskReference} from '../src/neutron-geometry.js';
import {BLANKET_PAPER_CASE,HG197_HALF_LIFE_HOURS,HG197M_HALF_LIFE_HOURS,
 HG197M_IT_BRANCH,mercury197Batch,blanketOpticalDepth} from '../src/blanket-reference.js';

const close=(a:number,b:number,tolerance=3e-12)=>assert.ok(Math.abs(a-b)<=tolerance*Math.max(Math.abs(b),1e-300),`${a} vs ${b}`);
const qe=1.602176634e-19;

test('independent two-body angular quadrature recovers the declared integer-mass product powers',()=>{
 for(const energy of [20,100,500,900]){
  const source=simulateFusionBeam({...DEFAULT_FUSION_BEAM,beamEnergyKeV:energy,stoppingFraction:0,targetColumnM2:1e27});
  const incidentSpeed=Math.sqrt(energy),cmSpeed=2*incidentSpeed/5,cmAvailable=17600+energy-5*cmSpeed**2/2;
  const neutronSpeedCM=Math.sqrt(2*cmAvailable*4/5),alphaSpeedCM=neutronSpeedCM/4;
  let neutronMean=0,alphaMean=0;
  for(let i=0;i<1000;i++){
   const mu=-1+(2*i+1)/1000;
   neutronMean+=(neutronSpeedCM**2+cmSpeed**2+2*neutronSpeedCM*cmSpeed*mu)/2000;
   alphaMean+=4*(alphaSpeedCM**2+cmSpeed**2-2*alphaSpeedCM*cmSpeed*mu)/2000;
  }
  close(source.neutronPowerW/source.neutronRateS/(1000*qe),neutronMean);
  close(source.alphaPowerW/source.neutronRateS/(1000*qe),alphaMean);
  close(neutronMean+alphaMean,17600+energy);
 }
});

test('zero-reactant and optically saturated limits preserve the full energy ledger',()=>{
 const empty=simulateFusionBeam({...DEFAULT_FUSION_BEAM,targetColumnM2:0,stoppingFraction:.9});
 assert.equal(empty.neutronRateS,0);assert.equal(empty.fusionProbability,0);
 close(empty.beamStoppingPowerW,.9*empty.beamPowerW);
 close(empty.transmittedBeamPowerW,.1*empty.beamPowerW);
 for(const intervals of [10,400,6400]){
  const saturated=simulateFusionBeam({...DEFAULT_FUSION_BEAM,stoppingFraction:0,targetColumnM2:1e35,intervals,alphaDepositedFraction:.37});
  close(saturated.fusionProbability,1);assert.equal(saturated.transmittedFraction,0);
  close(saturated.neutronRateS,saturated.config.beamCurrentA/qe);
  close(saturated.nuclearPowerW,saturated.neutronRateS*17.6e6*qe);
  close(saturated.targetLayerHeatW,.37*saturated.alphaPowerW);
  assert.ok(Math.abs(saturated.relativeEnergyResidual!)<3e-14);
 }
});

test('high-loss valid selected source remains representable by its energy sensitivity view',()=>{
 // 900 keV at 99.9% imposed loss ends at 0.9 keV lab = 0.54 keV CM,
 // so every stage of the selected slab remains within the sourced fit.
 const source=simulateFusionBeam({...DEFAULT_FUSION_BEAM,beamEnergyKeV:900,stoppingFraction:.999});
 assert.ok(source.exitEnergyKeV>.5/.6);
 const view=fusionPlaygroundData(source);
 assert.ok(view.curves[0].x.includes(900));
 assert.ok(view.excludedEnergiesKeV.includes(20));
 assert.ok(view.curves.every(curve=>curve.x.length===curve.y.length&&curve.y.every(Number.isFinite)));
 assert.throws(()=>simulateFusionBeam({...DEFAULT_FUSION_BEAM,beamEnergyKeV:100,stoppingFraction:.999}),DTCrossSectionDomainError);
 source.config.acceleratorEfficiency=0;
 assert.throws(()=>fusionPlaygroundData(source),/positive area\/efficiency/,'unrelated invalid configuration must not be suppressed by scan-domain handling');
});

test('finite disk interception matches independent plane-current quadrature and geometric similarity',()=>{
 const n=100000;
 for(const ratio of [.1,1,10,100]){
  const distance=ratio,radius=1,area=Math.PI,rate=7e12;
  let integral=0;
  for(let i=0;i<n;i++){
   const rho=(i+.5)/n;
   integral+=distance*rho/(2*(distance**2+rho**2)**1.5)/n;
  }
  const a=isotropicDiskReference({neutronRateS:rate,distanceM:distance,sampleAreaM2:area});
  close(a.interceptedFraction,integral,1e-9);
  close(a.meanPlaneCurrentM2S*area,a.interceptedRateS);
  const b=isotropicDiskReference({neutronRateS:rate,distanceM:distance*1e6,sampleAreaM2:area*1e12});
  close(b.interceptedFraction,a.interceptedFraction);
  close(b.meanPlaneCurrentM2S,a.meanPlaneCurrentM2S/1e12);
 }
});

test('two-parent decay obeys inventory, positivity, initial rates and linear evolution semigroup',()=>{
 const lg=Math.LN2/HG197_HALF_LIFE_HOURS,lm=Math.LN2/HG197M_HALF_LIFE_HOURS,b=HG197M_IT_BRANCH;
 const transfer=(ground:number,meta:number,gold:number,time:number)=>{
  const toGround=b*lm*meta*(Math.exp(-lg*time)-Math.exp(-lm*time))/(lm-lg);
  const nextGround=ground*Math.exp(-lg*time)+toGround,nextMeta=meta*Math.exp(-lm*time);
  return {mercury197:nextGround,mercury197m:nextMeta,gold197:gold+ground+meta-nextGround-nextMeta};
 };
 for(const f of [0,.01,.5,.99,1])for(const time of [0,.001,1,100,500,1e5]){
  const actual=mercury197Batch(time,f),reference=transfer(1-f,f,0,time);
  close(actual.mercury197,reference.mercury197);close(actual.mercury197m,reference.mercury197m);
  assert.ok(Math.abs(actual.gold197-reference.gold197)<3e-15);
  assert.ok(Object.values(actual).every(value=>value>=0&&value<=1));
  close(actual.mercury197+actual.mercury197m+actual.gold197,1);
  const halfway=mercury197Batch(time/2,f),composed=transfer(halfway.mercury197,halfway.mercury197m,halfway.gold197,time/2);
  assert.ok(Math.abs(actual.gold197-composed.gold197)<3e-15);
 }
 const dt=1e-6,pureMeta=mercury197Batch(dt,1);
 close(pureMeta.gold197/dt,(1-b)*lm,3e-7);
});

test('blanket optical response is bounded and its published transport case stays a separate frozen reference',()=>{
 for(const tau of [0,1e-12,.01,1,8,1000]){
  const r=blanketOpticalDepth(tau);
  assert.ok(r.interceptedFraction>=0&&r.interceptedFraction<=1);
  assert.ok(r.inventoryUtilization>0&&r.inventoryUtilization<=1);
  if(tau>0)close(tau*r.inventoryUtilization,r.interceptedFraction);
 }
 assert.deepEqual([BLANKET_PAPER_CASE.fusionPowerMWth,BLANKET_PAPER_CASE.channelThicknessMm,
  BLANKET_PAPER_CASE.tritiumBreedingRatio,BLANKET_PAPER_CASE.transportGoldKgPerYear,BLANKET_PAPER_CASE.depletionGoldKgPerYear],
 [1500,210,1.19,2953,2909]);
 assert.ok(Object.isFrozen(BLANKET_PAPER_CASE));
});
