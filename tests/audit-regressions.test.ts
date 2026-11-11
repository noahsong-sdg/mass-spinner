import test from 'node:test';
import assert from 'node:assert/strict';
import {simulate,DEFAULT_CONFIG,E_CHARGE,AMU} from '../src/physics.js';

test('an absorbing boundary cannot bypass the collision-resolution invariant',()=>{
  assert.throws(()=>simulate({...DEFAULT_CONFIG,magneticT:0,voltage:0,particlesPerSpecies:1,
    dt:.0006,duration:.0006,neutralDensityM3:1e25,neutralCrossSectionM2:1e-19}),/Collision timestep unresolved/);
});

test('fractional uniform-B impacts preserve exact kinetic energy, not just full-step energy',()=>{
  const omega=E_CHARGE*.1/(40*AMU),dt=.0299/omega;
  const speed=Math.sqrt(2*E_CHARGE*20/(40*AMU));
  for(const fraction of [.1,.5,.9]){
    const result=simulate({...DEFAULT_CONFIG,voltage:0,particlesPerSpecies:1,perpendicularEV:20,
      dt,duration:2*dt,length:speed*dt*fraction});
    for(const species of result.species){
      assert.equal(species.impacts.length,1);
      assert.ok(Math.abs(species.impacts[0].kineticEV-40)<1e-10);
      assert.ok(species.maxRelativeImpactEnergyError<1e-12);
    }
  }
});

test('fractional resonant RF impact work converges to the analytic energy gain',()=>{
  const omega=E_CHARGE*.1/(40*AMU),speed=Math.sqrt(2*E_CHARGE*20/(40*AMU));
  const amplitude=200,transit=3.4e-6;
  const exactGain=(E_CHARGE/(40*AMU))*amplitude**2*transit**2/2;
  const error=(dt:number)=>{
    const result=simulate({...DEFAULT_CONFIG,mode:'icr',voltage:0,particlesPerSpecies:1,
      perpendicularEV:0,dt,duration:4e-6,length:speed*transit,rfAmplitudeVM:amplitude,
      rfFrequencyHz:omega/(2*Math.PI),rfHandedness:-1});
    const species=result.species[0];
    assert.ok(Math.abs(species.impacts[0].kineticEV-20-species.rfWorkEV)<1e-10);
    assert.ok(species.maxRelativeImpactEnergyError<1e-11);
    return Math.abs(species.rfWorkEV-exactGain);
  };
  const coarse=error(1e-7),fine=error(5e-8);
  assert.ok(coarse/fine>3.7 && coarse/fine<4.3);
});
