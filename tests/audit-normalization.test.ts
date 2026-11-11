import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_DOUBLEWELL,simulateDoublewell} from '../src/doublewell-dynamics.js';

test('exported residual scales have physical units and reproduce completed-pulse flux balances',()=>{
 const r=simulateDoublewell({...DEFAULT_DOUBLEWELL,magneticT:0,voltage:0,ionTemperatureEV:.01,
  beamEV:100,rotationMode:'common',rotationRadS:0,particlesPerSpecies:8,collisions:false,
  dt:1e-6,duration:7e-5});
 const c=r.conservation,last=r.history.at(-1)!;
 assert.ok(r.species.every(s=>s.active===0));
 assert.equal(c.energyScaleJ,c.initialEnergyJ,'With zero potential, the positive H scale is initial total kinetic energy.');
 assert.ok(c.canonicalMomentumScale>=Math.abs(c.initialCanonicalMomentum));
 assert.ok(c.canonicalMomentumScale>0);
 assert.ok(Math.abs(last.energyResidual*c.energyScaleJ-(c.energyOutJ-c.initialEnergyJ))<1e-13*c.energyScaleJ);
 assert.ok(Math.abs(last.momentumResidual*c.canonicalMomentumScale-(c.canonicalMomentumOut-c.initialCanonicalMomentum))<1e-13*c.canonicalMomentumScale);
 assert.equal(r.config.collisions,false);
});
