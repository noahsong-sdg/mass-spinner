import test from 'node:test';
import assert from 'node:assert/strict';
import { centrifuge, type CentrifugeConfig } from '../src/centrifuge.js';
import { centrifugeDiagnostics } from '../src/centrifuge-diagnostics.js';
import { fixedBulkCentrifuge, solveBinaryBulk } from '../src/centrifuge-bulk.js';

const base: CentrifugeConfig = {
  radius: .48, rotationRadS: 10000, ionTemperatureEV: 5, electronTemperatureEV: 5, bins: 100,
  species: [{ massU: 40, chargeState: 1, axisFraction: .7 }, { massU: 84, chargeState: 1, axisFraction: .3 }],
};
const close = (actual: number, expected: number, tolerance = 1e-9) =>
  assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);

test('bulk inverse recovers the prescribed ratio while central composition changes with rotation', () => {
  const original = structuredClone(base);
  const slow = fixedBulkCentrifuge(base, .5), fast = fixedBulkCentrifuge({ ...base, rotationRadS: 20000 }, .5);
  close(slow.actualBulkFractionA, .5); close(fast.actualBulkFractionA, .5);
  assert.ok(fast.axisFractionA > slow.axisFractionA && slow.axisFractionA > .5);
  assert.deepEqual(base, original, 'Inverse must not mutate the original central-composition configuration');
});

test('zero rotation and equal mass/charge recover the requested central fraction exactly within solve tolerance', () => {
  for (const target of [.01, .37, .99]) {
    close(fixedBulkCentrifuge({ ...base, rotationRadS: 0 }, target).axisFractionA, target);
    const same = { ...base, species: base.species.map(s => ({ ...s, massU: 40 })) };
    close(fixedBulkCentrifuge(same, target).axisFractionA, target);
  }
});

test('forward to inverse round trips include unequal ion charge states', () => {
  for (const chargeB of [1, 2, 3]) {
    const config = { ...base, species: [base.species[0], { ...base.species[1], chargeState: chargeB }] };
    const forward = centrifuge(config), target = centrifugeDiagnostics(forward).bulkNumberFractions[0]!;
    const inverse = fixedBulkCentrifuge(config, target);
    close(inverse.axisFractionA, .7);
    close(inverse.actualBulkFractionA, target);
    assert.ok(inverse.result.maxRelativeChargeResidual < 1e-12);
  }
});

test('pure-species bulk endpoints preserve absence and finite charge closure', () => {
  for (const target of [0, 1]) {
    const solved = fixedBulkCentrifuge(base, target);
    assert.equal(solved.actualBulkFractionA, target);
    assert.equal(solved.axisFractionA, target);
    assert.equal(solved.axisFractionB, 1 - target);
    assert.ok(solved.result.profiles.every(p => p.ionDensities[target === 0 ? 0 : 1] === 0));
  }
});

test('steep profiles retain minority central fractions smaller than machine epsilon', () => {
  const steep = { ...base, rotationRadS: 30000, ionTemperatureEV: 1, electronTemperatureEV: 1,
    species: [{ massU: 20, chargeState: 1, axisFraction: .5 }, { massU: 200, chargeState: 1, axisFraction: .5 }] };
  const solved = fixedBulkCentrifuge(steep, .4);
  close(solved.actualBulkFractionA, .4);
  assert.ok(solved.axisFractionB > 0 && solved.axisFractionB < Number.EPSILON);
  assert.equal(solved.axisFractionA, 1, 'The second independent logistic tail must survive this rounded A');
  assert.ok(solved.result.profiles.every(p => p.ionDensities.every(Number.isFinite)));
});

test('bulk inversion converges under radial refinement to an independently finer-grid inventory', () => {
  const reference = fixedBulkCentrifuge({ ...base, bins: 1600 }, .4);
  const errors = [100, 200, 400].map(bins => {
    const solved = fixedBulkCentrifuge({ ...base, bins }, .4);
    const fine = centrifuge({ ...base, bins: 1600, species: base.species.map((s, i) => ({
      ...s, axisFraction: i === 0 ? solved.axisFractionA : solved.axisFractionB,
    })) });
    return Math.abs(centrifugeDiagnostics(fine).bulkNumberFractions[0]! - .4);
  });
  assert.ok(errors[0] / errors[1] > 3.8 && errors[1] / errors[2] > 3.8);
  close(reference.actualBulkFractionA, .4);
});

test('binary and finite target domains fail explicitly without clipping or changing the kernel domain', () => {
  for (const target of [-.1, 1.1, NaN, Infinity]) assert.throws(() => fixedBulkCentrifuge(base, target));
  assert.throws(() => fixedBulkCentrifuge({ ...base, species: [base.species[0]] }, .5));
  assert.throws(() => fixedBulkCentrifuge({ ...base, rotationRadS: 1e8 }, .5));
  assert.throws(() => solveBinaryBulk(() => centrifuge(base), .5), /unrepresentable|monoton|converge/);
});
