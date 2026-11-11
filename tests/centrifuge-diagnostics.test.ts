import test from 'node:test';
import assert from 'node:assert/strict';
import { centrifugeDiagnostics } from '../src/centrifuge-diagnostics.js';
import { centrifuge, type CentrifugeResult } from '../src/centrifuge.js';
import { AMU, E_CHARGE } from '../src/physics.js';

const close = (a: number | null, b: number, tolerance = 1e-12) =>
  assert.ok(a !== null && Math.abs(a - b) < tolerance, `${a} != ${b}`);
const synthetic = (radii: number[], density: (u: number) => number[]): CentrifugeResult => ({
  species: density(0).map((_, i) => ({ massU: 1 + i, chargeState: 1, axisFraction: 0.5 })),
  referenceSpeciesIndex: 0,
  maxRelativeChargeResidual: 0,
  profiles: radii.map(radius => ({ radius, ionDensities: density(radius),
    electronDensity: 1, effectivePotentialV: 0, logSeparationFactors: [] })),
});

test('uniform column uses cylindrical volume, preserves inventory and absent species', () => {
  const d = centrifugeDiagnostics(synthetic([0, 0.2, 0.65, 1], () => [0.2, 0.8, 0]), 0.37);
  d.profiles.forEach(p => {
    close(p.cumulativeSpeciesFractions[0], p.radius ** 2);
    close(p.cumulativeMixtureFraction, p.radius ** 2);
    assert.equal(p.cumulativeSpeciesFractions[2], null);
  });
  close(d.bulkNumberFractions[0], 0.2);
  close(d.inner.inventory[0], 0.2 * 0.37 ** 2);
  close(d.outer.inventory[1], 0.8 * (1 - 0.37 ** 2));
  close(d.inner.speciesInventoryFractions[1], 0.37 ** 2);
  assert.equal(d.inner.speciesInventoryFractions[2], null);
});

test('linear density integrates exactly across a fractional cell cut', () => {
  const cut = 0.37;
  const d = centrifugeDiagnostics(synthetic([0, 0.1, 0.6, 1], u => [1 + u, 2 - u]), cut);
  close(d.volumeMeanIonDensities[0], 5 / 3);
  close(d.volumeMeanIonDensities[1], 4 / 3);
  close(d.inner.inventory[0], cut ** 2 + 2 * cut ** 3 / 3);
  close(d.inner.inventory[1], 2 * cut ** 2 - 2 * cut ** 3 / 3);
  close(d.bulkNumberFractions[0], 5 / 9);
  d.volumeMeanIonDensities.forEach((value, i) => close(d.inner.inventory[i] + d.outer.inventory[i], value));
});

test('single-species exponential benchmark converges to analytic volume inventory', () => {
  const k = 0.8;
  const config = { radius: 1, rotationRadS: Math.sqrt(2 * k * E_CHARGE * 3 / AMU),
    ionTemperatureEV: 1, electronTemperatureEV: 2,
    species: [{ massU: 1, chargeState: 1, axisFraction: 1 }] };
  const expected = Math.expm1(k) / k;
  const coarse = centrifugeDiagnostics(centrifuge({ ...config, bins: 100 }));
  const fine = centrifugeDiagnostics(centrifuge({ ...config, bins: 200 }));
  const ratio = (coarse.volumeMeanIonDensities[0] - expected) / (fine.volumeMeanIonDensities[0] - expected);
  assert.ok(ratio > 3.99 && ratio < 4.01, `refinement ratio=${ratio}`);
  close(fine.inner.speciesInventoryFractions[0], Math.expm1(k * 0.7 ** 2) / Math.expm1(k), 1e-5);
});

test('heavier equal-charge species is enriched in outer inventory relative to inner', () => {
  const d = centrifugeDiagnostics(centrifuge({ radius: 0.05, rotationRadS: 1e5,
    ionTemperatureEV: 3, electronTemperatureEV: 4,
    species: [{ massU: 40, chargeState: 1, axisFraction: 0.7 },
      { massU: 80, chargeState: 1, axisFraction: 0.3 }] }));
  assert.ok(d.outer.numberFractions[1]! > d.bulkNumberFractions[1]!);
  assert.ok(d.bulkNumberFractions[1]! > d.inner.numberFractions[1]!);
  assert.ok(d.bulkNumberFractions[1]! > 0.3);
});

test('invalid sample geometry, nonfinite densities, empty inventories and cuts reject', () => {
  assert.throws(() => centrifugeDiagnostics(synthetic([0, 1], () => [1]), 0));
  assert.throws(() => centrifugeDiagnostics(synthetic([0, 1], () => [1]), 1));
  assert.throws(() => centrifugeDiagnostics(synthetic([0, 0.5, 0.5], () => [1])));
  assert.throws(() => centrifugeDiagnostics(synthetic([0, 1], () => [NaN])));
  assert.throws(() => centrifugeDiagnostics(synthetic([0, 1], () => [0])));
});
