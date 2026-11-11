import test from 'node:test';
import assert from 'node:assert/strict';
import {solveEquilibrium,type EquilibriumConfig} from '../src/equilibrium-model.js';
import {centrifuge} from '../src/centrifuge.js';
import {centrifugeDiagnostics} from '../src/centrifuge-diagnostics.js';
const c:EquilibriumConfig={radius:.48,rotationRadS:10000,ionTemperatureEV:5,electronTemperatureEV:5,bins:100,
 species:[{massU:40,chargeState:1,axisFraction:.5},{massU:84,chargeState:1,axisFraction:.5}],
 magneticT:.1,densityWidthM:.25,axisDensityM3:1e17};

test('legacy equilibrium requests retain their exact central-boundary profiles',()=>{
 const legacy={...c};delete legacy.closure;delete legacy.compositionBoundary;
 assert.deepEqual(solveEquilibrium(legacy).profiles,centrifuge(c).profiles);
});

test('both equilibrium closures rerun bulk inversion at each selected radial resolution',()=>{
 for(const closure of ['corotating','gaussian'] as const){
  const config={...c,closure,compositionBoundary:'bulk' as const,bulkFractionA:.35};
  const coarse=solveEquilibrium(config),fine=solveEquilibrium({...config,bins:400});
  for(const result of [coarse,fine]){
   assert.ok(Math.abs(centrifugeDiagnostics(result).bulkNumberFractions[0]!-.35)<1e-9);
   assert.equal(result.composition.boundary,'bulk');
  }
  assert.notEqual(coarse.species[0].axisFraction,fine.species[0].axisFraction);
 }
});

test('closure and composition boundaries reject unknown values and unsupported Gaussian charge mixtures',()=>{
 assert.throws(()=>solveEquilibrium({...c,closure:'unknown' as 'gaussian'}));
 assert.throws(()=>solveEquilibrium({...c,compositionBoundary:'feed' as 'bulk'}));
 assert.throws(()=>solveEquilibrium({...c,compositionBoundary:'bulk',bulkFractionA:NaN}));
 assert.throws(()=>solveEquilibrium({...c,closure:'gaussian',species:[c.species[0],{...c.species[1],chargeState:2}]}),/equal ion charge/);
});
