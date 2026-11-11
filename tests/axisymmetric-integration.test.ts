import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_DOUBLEWELL,simulateDoublewell} from '../src/doublewell-dynamics.js';
import {executeSeed,validateConvergencePlan,type ConvergencePlan} from '../src/convergence.js';

test('source-fitted rings remove initial support dilution without changing physical inventory or density input',()=>{
 const c={...DEFAULT_DOUBLEWELL,collisionMethod:'axisymmetric' as const,particlesPerSpecies:1024,duration:1e-12};
 const uniform=simulateDoublewell(c),fitted=simulateDoublewell({...c,collisionSourceAligned:true});
 const volume=Math.PI*c.sourceRadius**2*c.length*c.pulseLengthFraction,truth=c.densityM3**2*volume;
 const ratio=(r:typeof fitted)=>r.spatialCollision.initial.selfExcludedDensitySquaredIntegral/truth;
 assert.ok(ratio(uniform)<.75);
 assert.ok(Math.abs(ratio(fitted)-1)<.02,`finite-marker source estimate: ${ratio(fitted)}`);
 assert.equal(fitted.spatialCollision.initial.representedInventory,uniform.spatialCollision.initial.representedInventory);
 assert.equal(fitted.config.densityM3,c.densityM3);
 assert.equal(fitted.spatialCollision.sourceInterfacesFitted,true);
 assert.match(fitted.assumptions.join(' '),/no particle-dependent support estimate/);
});

test('actual ring transport retains inventories and flux accounting while exposing uncorrected radial torque',()=>{
 const c={...DEFAULT_DOUBLEWELL,collisionMethod:'axisymmetric' as const,collisionSourceAligned:true,particlesPerSpecies:64,duration:1e-5};
 const r=simulateDoublewell(c);
 for(const h of r.history)for(const s of h.species)assert.equal(s.active+s.wall+s.end+s.source,64);
 assert.ok(r.collisions.pairs>0);
 assert.ok(r.conservation.maxEnergyResidual<2e-6);
 assert.ok(r.conservation.maxCorrectedMomentumResidual<2e-6);
 assert.ok(r.conservation.normalizedAbsolutePairTorque>0,'Do not project away physical finite-gap error.');
 assert.equal(r.spatialCollision.separationCoordinates,'r-z');
 assert.ok(r.metrics.some(m=>m.label==='RMS meridional pair separation'));
 assert.ok(!r.metrics.some(m=>m.label==='RMS pair separation'));
 assert.match(r.assumptions.join(' '),/Cartesian transverse point-pair momentum is not an invariant/);
});

test('ring and source-fit switches cannot modify trajectories with collisions off',()=>{
 const c={...DEFAULT_DOUBLEWELL,collisions:false,particlesPerSpecies:32,duration:2e-6};
 const legacy=simulateDoublewell(c),ring=simulateDoublewell({...c,collisionMethod:'axisymmetric',collisionSourceAligned:true});
 assert.deepEqual(ring.history,legacy.history);assert.deepEqual(ring.species,legacy.species);
 assert.deepEqual(ring.conservation,legacy.conservation);
});

test('equilibrium ring runs ignore inactive pulse source-fitting settings',()=>{
 const c={...DEFAULT_DOUBLEWELL,collisionMethod:'axisymmetric' as const,particlesPerSpecies:32,duration:2e-6,
  initialState:'equilibrium' as const,boundary:'closed' as const,rotationMode:'common' as const,rotationRadS:0,beamEV:0,voltage:0};
 const uniform=simulateDoublewell(c),fitted=simulateDoublewell({...c,collisionSourceAligned:true,sourceRadius:.12,pulseLengthFraction:.5});
 assert.deepEqual(fitted.history,uniform.history);assert.deepEqual(fitted.species,uniform.species);
 assert.equal(fitted.spatialCollision.sourceInterfacesFitted,false);
});

test('convergence geometry uses the executed ring dimensions and rejects inactive-control placebo refinements',()=>{
 const c={...DEFAULT_DOUBLEWELL,collisionMethod:'axisymmetric' as const,particlesPerSpecies:16,duration:1e-7};
 const run=executeSeed({id:'ring',config:c},123);
 assert.equal(run.status,'complete');assert.equal(run.numericalGeometry?.coordinates,'annular-r-z');
 assert.equal(run.numericalGeometry?.baseCellWidthM,c.radius/c.cellsAcross);
 assert.equal(run.numericalGeometry?.baseAxialCells,Math.ceil(c.length/(c.radius/c.cellsAcross)));
 assert.equal(run.numericalGeometry?.uniformColumnMeanRepresentativesPerFullBaseCell,null);
 const plan:ConvergencePlan={id:'method',description:'Executed settings only',seeds:[1,2],
  levels:[{id:'a',config:c},{id:'b',config:{...c,collisionTarget:64}}],comparisons:[{kind:'method',coarse:'a',fine:'b'}],
  tolerances:{fraction:.01,radiusFraction:.01,temperatureEV:.1,timeFraction:.02,normalizedAngularMomentum:.001,maxRawMomentumResidual:.001,maxUnresolvedExposure:.01,minimumSeeds:2}};
 assert.throws(()=>validateConvergencePlan(plan),/executed collision/);
 plan.levels[1].config={...c,collisionSourceAligned:true};validateConvergencePlan(plan);
});
