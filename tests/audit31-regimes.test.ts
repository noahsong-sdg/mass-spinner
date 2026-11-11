import test from 'node:test';
import assert from 'node:assert/strict';
import {type Vec} from '../src/physics.js';
import {DEFAULT_DOUBLEWELL,simulateDoublewell} from '../src/doublewell-dynamics.js';
import {inspectDoublewellRegime} from '../src/doublewell-regime.js';
import {DEFAULT_FAILURE_BUDGETS,failureBudgets} from '../src/failure-budgets.js';
import {section3Coverage} from '../src/failure-catalog.js';

const qe=1.602176634e-19,eps=8.8541878128e-12,amu=1.66053906660e-27;
const close=(a:number,b:number)=>assert.ok(Math.abs(a-b)<2e-11*Math.max(Math.abs(a),Math.abs(b),1e-30),`${a} != ${b}`);
function thermal(massU:number,z:number,t:number,n=6,drift:Vec=[0,0,0]){
 const v=Math.sqrt(3*(n-1)*qe*t/(n*amu*massU));
 return Array.from({length:n},(_,i)=>({massU,chargeState:z,
  velocity:drift.map((d,k)=>d+(k===i%3?(i%6<3?1:-1)*v:0)) as Vec}));
}

test('unequal-charge local screening uses observed number fractions and unbiased thermal traces',()=>{
 const density=3e18,c={...DEFAULT_DOUBLEWELL,densityM3:density,magneticT:0,
  species:[{massU:12,chargeState:1},{massU:56,chargeState:3}]};
 const r=inspectDoublewellRegime(c,[{densityM3:density,ions:[...thermal(12,1,7),...thermal(56,3,11,12)]}]);
 const ne=density*7/3,lambda=Math.sqrt(eps*c.electronTemperatureEV/(ne*qe));
 close(r.observed.minDebyePopulation!,4*Math.PI*ne*lambda**3/3);
 close(r.observed.minTemperatureEV!,7);
 const spacing=(3/(4*Math.PI*density))**(1/3);
 close(r.observed.maxCoupling!,9*qe/(4*Math.PI*eps*spacing*11));
 assert.equal(r.observed.unresolvedRepresentativeFraction,0);
 // The analytic initial reference assumes equal initial inventories, unlike this evolved cell.
 const initialNe=2*density,initialLambda=Math.sqrt(eps*c.electronTemperatureEV/(initialNe*qe));
 close(r.reference.debyePopulation,4*Math.PI*initialNe*initialLambda**3/3);
});

test('common velocity boosts and orthogonal velocity rotations cannot change thermal regime diagnostics',()=>{
 const ions=[...thermal(40,1,3,6,[1200,-2000,500]),...thermal(84,2,9,6,[-4000,1000,800])];
 const c={...DEFAULT_DOUBLEWELL,species:[{massU:40,chargeState:1},{massU:84,chargeState:2}]};
 const assess=(items:typeof ions)=>inspectDoublewellRegime(c,[{densityM3:1e18,ions:items}]);
 const a=assess(ions),b=assess(ions.map(p=>({...p,velocity:[p.velocity[2]+1e6,p.velocity[0]-2e6,p.velocity[1]+3e6] as Vec})));
 for(const key of ['minTemperatureEV','maxCoupling','minDebyePopulation','minEstimatedCoulombLog','maxEncounterMagnetization'] as const)
  close(a.observed[key]!,b.observed[key]!);
 assert.equal(a.status,b.status);
});

test('encounter magnetization threshold follows omega lambda over relative thermal speed, not bulk gyroradius',()=>{
 const c={...DEFAULT_DOUBLEWELL,magneticT:0},n=c.densityM3,t=c.ionTemperatureEV;
 const lambda=Math.sqrt(eps*c.electronTemperatureEV/(n*qe));
 const limits=c.species.flatMap((a,i)=>c.species.slice(i).map(b=>{
  const g=Math.sqrt(3*qe*t/amu*(1/a.massU+1/b.massU));
  const omegaPerT=Math.max(a.chargeState/a.massU,b.chargeState/b.massU)*qe/amu;
  return .1*g/(lambda*omegaPerT);
 }));
 const threshold=Math.min(...limits),ions=[...thermal(40,1,t),...thermal(84,1,t)];
 const below=inspectDoublewellRegime({...c,magneticT:.99*threshold},[{densityM3:n,ions}]);
 const above=inspectDoublewellRegime({...c,magneticT:1.01*threshold},[{densityM3:n,ions}]);
 close(below.observed.maxEncounterMagnetization!,.099);
 close(above.observed.maxEncounterMagnetization!,.101);
 assert.equal(below.status,'within-supported-domain');
 assert.equal(above.status,'outside-supported-domain');
 assert.match(above.reasons.join(' '),/Encounter magnetization/);
});

test('coupling and screening failures cannot be hidden by sparse local temperature samples',()=>{
 const t=.2,n=3/(4*Math.PI)*(.101*4*Math.PI*eps*t/qe)**3;
 const c={...DEFAULT_DOUBLEWELL,magneticT:0,ionTemperatureEV:t,densityM3:n};
 const dense=inspectDoublewellRegime(c,[{densityM3:n,ions:thermal(40,1,t)}]);
 close(dense.observed.maxCoupling!,.101);
 assert.equal(dense.status,'outside-supported-domain');
 assert.match(dense.reasons.join(' '),/coupling parameter/);
 const sparse=inspectDoublewellRegime(DEFAULT_DOUBLEWELL,[{densityM3:1e30,ions:thermal(40,1,5).slice(0,2)}]);
 assert.equal(sparse.observed.resolvedCells,0);
 assert.equal(sparse.observed.unresolvedRepresentativeFraction,1);
 assert.equal(sparse.status,'outside-supported-domain');
 assert.match(sparse.reasons.join(' '),/screening limit/);
});

test('equal trace anisotropy passes the same diagnostic without claiming a distribution-shape validation',()=>{
 const isotropic=thermal(40,1,5),speed=Math.sqrt(15*qe*5/(6*amu*40));
 const anisotropic=isotropic.map((p,i)=>({...p,velocity:[i<3?speed:-speed,0,0] as Vec}));
 const at=(ions:typeof isotropic)=>inspectDoublewellRegime({...DEFAULT_DOUBLEWELL,magneticT:0},[{densityM3:1e18,ions}]);
 const a=at(isotropic),b=at(anisotropic);
 close(a.observed.minTemperatureEV!,b.observed.minTemperatureEV!);
 close(a.observed.minEstimatedCoulombLog!,b.observed.minEstimatedCoulombLog!);
 assert.equal(a.status,b.status);
 // This deliberately witnesses the documented scope: a scalar thermal proxy is not an anisotropy test.
});

test('short actual collisionless run keeps sparse Coulomb diagnostics unresolved and physical ledgers separate',()=>{
 const r=simulateDoublewell({...DEFAULT_DOUBLEWELL,particlesPerSpecies:8,duration:2e-7,collisions:false});
 assert.equal(r.collisions.pairs,0);
 assert.equal(r.regimeSummary.status,'unresolved');
 assert.ok(r.regimeHistory.every(h=>h.assessment.status==='unresolved'));
 assert.match(r.assumptions.join(' '),/not proof between sampled times/);
});

test('independent failure budgets preserve channel dimensions, linear energy and diffusive square-root scaling',()=>{
 const c={...DEFAULT_FAILURE_BUDGETS,neutralDensityM3:1e20,cxCrossSectionM2:3e-19,pathLengthM:.03,
  electronDensityM3:2e18,recombinationM3S:7e-17,residenceS:2e-3,diffusionM2S:2,
  ionDensityM3:4e18,impurityFraction:.03,coolingCoefficientWM3:2e-31,
  electronTemperatureEV:4,heatTransmission:8,wallFluxM2S:9e20};
 const a=failureBudgets(c),b=failureBudgets({...c,residenceS:4*c.residenceS});
 close(a.budgets.cxOpticalDepth,.9);close(a.budgets.noChargeExchangeProbability,Math.exp(-.9));
 close(a.budgets.recombinationOpticalDepth,.28);
 close(a.budgets.radiativePowerWM3,48000);
 close(a.budgets.sheathHeatFluxWM2,8*4*qe*9e20);
 close(a.budgets.radiatedEVPerInitialIon,48000*.002/(4e18*qe));
 close(b.budgets.diffusionRMSM,2*a.budgets.diffusionRMSM);
 close(b.budgets.radiatedEVPerInitialIon,4*a.budgets.radiatedEVPerInitialIon);
 close(b.budgets.noChargeExchangeProbability,a.budgets.noChargeExchangeProbability);
 assert.match(a.assumptions.join(' '),/do not modify/);
 assert.equal(section3Coverage.length,11);
 assert.ok(section3Coverage.every(s=>s.status!=='solved'));
});

test('failure-budget domain rejects an overflowing displayed time even when all physical budgets are finite',()=>{
 const c={...DEFAULT_FAILURE_BUDGETS,neutralDensityM3:0,recombinationM3S:0,
  diffusionM2S:0,impurityFraction:0,wallFluxM2S:0};
 assert.throws(()=>failureBudgets({...c,residenceS:1e304}),/representable finite domain/);
 const r=failureBudgets({...c,residenceS:1e302});
 assert.ok(r.curves.every(curve=>[...curve.x,...curve.y].every(Number.isFinite)));
 close(r.curves[0].x.at(-1)!,1e308);
 assert.ok(r.curves[0].y.every(y=>y===1));
});
