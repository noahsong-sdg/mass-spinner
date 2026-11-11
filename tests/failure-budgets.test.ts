import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_FAILURE_BUDGETS,failureBudgets} from '../src/failure-budgets.js';

test('independent homogeneous failure budgets reproduce dimensional optical depths, diffusion and heat limits',()=>{
 const r=failureBudgets({...DEFAULT_FAILURE_BUDGETS,neutralDensityM3:1e19,cxCrossSectionM2:1e-19,pathLengthM:1,
  electronDensityM3:1e18,recombinationM3S:1e-16,residenceS:.01,diffusionM2S:.25,
  ionDensityM3:1e18,impurityFraction:.01,coolingCoefficientWM3:1e-31,
  electronTemperatureEV:2,heatTransmission:7,wallFluxM2S:1e21});
 const b=r.budgets;
 assert.ok(Math.abs(b.cxOpticalDepth-1)<1e-14);
 assert.ok(Math.abs(b.recombinationOpticalDepth-1)<1e-14);
 assert.ok(Math.abs(b.noChargeExchangeProbability-.36787944117144233)<1e-14);
 assert.ok(Math.abs(b.noRecombinationProbability-.36787944117144233)<1e-14);
 assert.ok(Math.abs(b.diffusionRMSM-.1)<1e-14);
 assert.ok(Math.abs(b.radiativePowerWM3-1000)<1e-10);
 assert.ok(Math.abs(b.radiatedEVPerInitialIon-62.41509074460763)<1e-11);
 assert.ok(Math.abs(b.sheathHeatFluxWM2-2243.0472876)<1e-9);
 const cx=r.curves[0];assert.equal(cx.y[0],1);assert.equal(cx.y.at(-1),b.noChargeExchangeProbability);
 assert.equal(r.curves[2].y.at(-1),b.diffusionRMSM);
 assert.ok(r.assumptions.some(x=>x.includes('do not modify')));
});

test('zero assumed rates recover no-reaction and no-loss limits without changing a simulation',()=>{
 const c={...DEFAULT_FAILURE_BUDGETS,neutralDensityM3:0,recombinationM3S:0,diffusionM2S:0,
  impurityFraction:0,wallFluxM2S:0},copy=structuredClone(c),r=failureBudgets(c);
 assert.equal(r.budgets.noChargeExchangeProbability,1);
 assert.equal(r.budgets.noRecombinationProbability,1);
 assert.equal(r.budgets.diffusionRMSM,0);assert.equal(r.budgets.radiatedEVPerInitialIon,0);
 assert.equal(r.budgets.sheathHeatFluxWM2,0);assert.deepEqual(c,copy);
 assert.ok(r.curves.flatMap(s=>s.y).every(Number.isFinite));
});

test('failure estimates enforce units/domain and report overflow rather than fabricate a budget',()=>{
 for(const change of [{residenceS:0},{ionDensityM3:0},{impurityFraction:1.01},
  {diffusionM2S:-1},{cxCrossSectionM2:NaN},{wallFluxM2S:Infinity}])
  assert.throws(()=>failureBudgets({...DEFAULT_FAILURE_BUDGETS,...change}),/require/);
 assert.throws(()=>failureBudgets({...DEFAULT_FAILURE_BUDGETS,coolingCoefficientWM3:1e308}),/representable/);
});
