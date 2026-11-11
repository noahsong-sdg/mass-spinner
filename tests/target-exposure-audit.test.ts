import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FUSION_BEAM,simulateFusionBeam} from '../src/fusion-reactor.js';
import {DEFAULT_TARGET_EXPOSURE,simulateTargetExposure} from '../src/target-exposure.js';

const beam=(overrides={})=>simulateFusionBeam({...DEFAULT_FUSION_BEAM,...overrides});
function close(actual:number,expected:number,relative=2e-11,absolute=1e-10){
 assert.ok(Math.abs(actual-expected)<=absolute+relative*Math.abs(expected),`${actual} != ${expected}`);
}

// Independent RK4 integration of T and signed coolant heat; it does not use
// the implementation's exact exponential response or energy complement.
function integrate(theta0:number,flux:number,capacity:number,transfer:number,seconds:number){
 let theta=theta0,coolant=0;
 const steps=20000,dt=seconds/steps;
 const derivative=(t:number)=>(flux-transfer*t)/capacity;
 for(let i=0;i<steps;i++){
  const a=theta,b=theta+dt*derivative(a)/2,c=theta+dt*derivative(b)/2,d=theta+dt*derivative(c);
  coolant+=dt*transfer*(a+2*b+2*c+d)/6;
  theta+=dt*(derivative(a)+2*derivative(b)+2*derivative(c)+derivative(d))/6;
 }
 return {theta,coolant};
}

test('independent exposure audit: RK4 temperature and coolant quadrature agree across exact source switch',()=>{
 const b=beam({exposureS:7.3}),c={...DEFAULT_TARGET_EXPOSURE,initialK:350,coolantK:290,
  arealHeatCapacityJm2K:3400,heatTransferWM2K:730,cooldownS:11.7,samples:41};
 const r=simulateTargetExposure(b,c),area=b.config.beamAreaM2,q=b.assemblyHeatIfTransmittedBeamStoppedW/area;
 const on=integrate(c.initialK-c.coolantK,q,c.arealHeatCapacityJm2K,c.heatTransferWM2K,b.config.exposureS);
 const off=integrate(on.theta,0,c.arealHeatCapacityJm2K,c.heatTransferWM2K,c.cooldownS);
 close(r.endOn.temperatureK,c.coolantK+on.theta);
 close(r.final.temperatureK,c.coolantK+off.theta);
 close(r.endOn.heatToCoolantJ,area*on.coolant);
 close(r.final.heatToCoolantJ,area*(on.coolant+off.coolant));
 close(r.final.storedEnergyJ,area*c.arealHeatCapacityJm2K*(off.theta-(c.initialK-c.coolantK)));
 for(const s of r.history)close(s.depositedEnergyJ,s.storedEnergyJ+s.heatToCoolantJ);
 assert.ok(r.history.some(s=>s.timeS===7.3));
 assert.equal(r.final.timeS,19);
 assert.equal(r.final.depositedEnergyJ,r.endOn.depositedEnergyJ);
});

test('independent exposure audit: adiabatic exact solution keeps stored energy throughout cooldown',()=>{
 const b=beam({exposureS:2.37}),c={...DEFAULT_TARGET_EXPOSURE,initialK:270,coolantK:310,
  heatTransferWM2K:0,cooldownS:11};
 const r=simulateTargetExposure(b,c),energy=b.assemblyHeatIfTransmittedBeamStoppedW*b.config.exposureS;
 assert.equal(r.thermalTimeConstantS,null);
 close(r.endOn.temperatureK,c.initialK+energy/(c.arealHeatCapacityJm2K*b.config.beamAreaM2));
 close(r.endOn.storedEnergyJ,energy);
 assert.equal(r.endOn.heatToCoolantJ,0);
 assert.equal(r.final.temperatureK,r.endOn.temperatureK);
 assert.equal(r.final.storedEnergyJ,r.endOn.storedEnergyJ);
 assert.equal(r.final.heatToCoolantJ,0);
});

test('independent exposure audit: tiny conductance preserves the leading coolant-energy term',()=>{
 const b=beam({exposureS:1}),c={...DEFAULT_TARGET_EXPOSURE,
  heatTransferWM2K:2e-10,cooldownS:0,initialK:293.15,coolantK:293.15};
 const r=simulateTargetExposure(b,c),x=c.heatTransferWM2K/c.arealHeatCapacityJm2K;
 const energy=b.assemblyHeatIfTransmittedBeamStoppedW;
 const expected=energy*(x/2-x*x/6);
 assert.ok(r.final.heatToCoolantJ>0);
 close(r.final.heatToCoolantJ,expected,1e-13,0);
 close(r.final.storedEnergyJ,energy-r.final.heatToCoolantJ,1e-14,0);
});

test('independent exposure audit: source-off hot/cold relaxation has signed first-law energy',()=>{
 for(const initialK of [200,400]){
  const b=beam({beamCurrentA:0,exposureS:0}),c={...DEFAULT_TARGET_EXPOSURE,initialK,coolantK:300,cooldownS:4};
  const r=simulateTargetExposure(b,c),theta=initialK-c.coolantK,tau=c.arealHeatCapacityJm2K/c.heatTransferWM2K;
  close(r.final.temperatureK,c.coolantK+theta*Math.exp(-c.cooldownS/tau));
  assert.equal(r.endOn.temperatureK,initialK);
  assert.equal(r.final.depositedEnergyJ,0);
  assert.equal(Math.sign(r.final.heatToCoolantJ),Math.sign(theta));
  close(r.final.storedEnergyJ,-r.final.heatToCoolantJ);
  assert.equal(r.fusionConsumedTritium,0);
 }
 const zero=simulateTargetExposure(beam({exposureS:0}),{...DEFAULT_TARGET_EXPOSURE,cooldownS:0});
 assert.equal(zero.history.length,1);
 assert.equal(zero.final.timeS,0);
 assert.equal(zero.final.depositedEnergyJ,0);
 assert.equal(zero.final.temperatureK,DEFAULT_TARGET_EXPOSURE.initialK);
});

test('independent exposure audit: beam footprint changes temperature rise but not production or integrated power',()=>{
 const c={...DEFAULT_TARGET_EXPOSURE,cooldownS:0},small=beam({beamAreaM2:.005}),large=beam({beamAreaM2:.02});
 const a=simulateTargetExposure(small,c),b=simulateTargetExposure(large,c);
 assert.equal(small.fusionProbability,large.fusionProbability);
 assert.equal(a.fusionConsumedTritium,b.fusionConsumedTritium);
 close(a.endOn.temperatureK-c.coolantK,4*(b.endOn.temperatureK-c.coolantK));
 close(a.endOn.depositedEnergyJ,b.endOn.depositedEnergyJ);
 close(a.endOn.storedEnergyJ,b.endOn.storedEnergyJ);
 close(a.fusionOnlyConsumedFraction!,4*b.fusionOnlyConsumedFraction!);
 assert.equal(a.assemblyHeatW,small.targetLayerHeatW+small.transmittedBeamPowerW);
});

test('independent exposure audit: long exposure reaches the assumed thermal steady state without cooldown neutrons',()=>{
 const b=beam({exposureS:1000}),c={...DEFAULT_TARGET_EXPOSURE,cooldownS:100};
 const r=simulateTargetExposure(b,c);
 close(r.endOn.temperatureK,c.coolantK+r.heatFluxWM2/c.heatTransferWM2K);
 close(r.final.temperatureK,c.coolantK+(r.endOn.temperatureK-c.coolantK)*
  Math.exp(-c.cooldownS*c.heatTransferWM2K/c.arealHeatCapacityJm2K));
 assert.equal(r.fusionConsumedTritium,b.neutronRateS*1000);
 assert.equal(r.fusionConsumedTritium,b.totalNeutrons);
 assert.equal(r.initialTritiumNuclei,b.config.targetColumnM2*b.config.beamAreaM2);
});

test('independent exposure audit: finite atom budget and zero inventory remain explicit',()=>{
 const noT=simulateTargetExposure(beam({targetColumnM2:0}),DEFAULT_TARGET_EXPOSURE);
 assert.equal(noT.initialTritiumNuclei,0);
 assert.equal(noT.fusionConsumedTritium,0);
 assert.equal(noT.fusionOnlyConsumedFraction,null);
 const b=beam();
 // Construct a deliberately inconsistent observer input to isolate its budget guard.
 const excess={...b,neutronRateS:b.config.targetColumnM2*b.config.beamAreaM2/b.config.exposureS*1.01};
 assert.throws(()=>simulateTargetExposure(excess,DEFAULT_TARGET_EXPOSURE),/more fusion reactions than available tritium/);
});

test('independent exposure audit: invalid thermal state cannot produce an apparently valid history',()=>{
 const b=beam();
 for(const delta of [{arealHeatCapacityJm2K:0},{heatTransferWM2K:-1},{initialK:0},
  {coolantK:Infinity},{cooldownS:-1},{samples:15},{samples:1001},{samples:16.5}])
  assert.throws(()=>simulateTargetExposure(b,{...DEFAULT_TARGET_EXPOSURE,...delta}),RangeError);
});
