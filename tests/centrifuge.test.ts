import test from 'node:test';
import assert from 'node:assert/strict';
import { centrifuge, type CentrifugeConfig } from '../src/centrifuge.js';
import { AMU, E_CHARGE } from '../src/physics.js';

const config: CentrifugeConfig = {
  radius: .2, rotationRadS: 30000, ionTemperatureEV: 10, electronTemperatureEV: 2,
  species: [{ massU: 40, chargeState: 1, axisFraction: .7 }, { massU: 84, chargeState: 1, axisFraction: .3 }],
};
const close = (actual: number, expected: number, tolerance = 1e-11) =>
  assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);

test('zero rotation gives uniform central fractions, including normalization and absent species', () => {
  const result = centrifuge({ ...config, rotationRadS: 0, species: [
    { massU: 1, chargeState: 1, axisFraction: 0 },
    { massU: 40, chargeState: 1, axisFraction: 7 },
    { massU: 84, chargeState: 2, axisFraction: 3 },
  ] });
  assert.equal(result.referenceSpeciesIndex, 1);
  assert.equal(result.profiles.length, 101);
  for (const profile of result.profiles) {
    assert.deepEqual(profile.ionDensities, [0, .7, .3]);
    close(profile.electronDensity, 1.3);
    assert.equal(profile.effectivePotentialV, 0);
    assert.deepEqual(profile.logSeparationFactors, [null, 0, 0]);
  }
});

test('equal charges give the exact mass-difference enrichment independent of electron temperature', () => {
  for (const electronTemperatureEV of [.5, 2, 20]) {
    const result = centrifuge({ ...config, electronTemperatureEV });
    for (const p of result.profiles) {
      const exact = 44 * AMU * config.rotationRadS ** 2 * p.radius ** 2 / (2 * E_CHARGE * config.ionTemperatureEV);
      close(p.logSeparationFactors[1]!, exact);
      close(Math.log((p.ionDensities[1] / p.ionDensities[0]) / (.3 / .7)), exact);
    }
  }
});

test('unequal-charge equilibrium satisfies local quasineutrality and electron Boltzmann response', () => {
  const input = { ...config, species: [config.species[0], { ...config.species[1], chargeState: 3 }] };
  const result = centrifuge(input);
  for (const p of result.profiles) {
    const charge = p.ionDensities.reduce((sum, n, i) => sum + result.species[i].chargeState * n, 0);
    close(charge, p.electronDensity);
    close(p.electronDensity, 1.6 * Math.exp(p.effectivePotentialV / config.electronTemperatureEV));
    result.species.forEach((s, i) => {
      const alpha = s.massU * AMU * config.rotationRadS ** 2 * p.radius ** 2 / (2 * E_CHARGE * config.ionTemperatureEV);
      close(p.ionDensities[i], s.axisFraction * Math.exp(alpha - s.chargeState * p.effectivePotentialV / config.ionTemperatureEV));
    });
  }
  assert.ok(result.maxRelativeChargeResidual < 1e-12);
});

test('single-species profile includes electron pressure and is unchanged by rotation reversal', () => {
  const input = { ...config, species: [{ massU: 40, chargeState: 2, axisFraction: 1 }] };
  const result = centrifuge(input);
  assert.deepEqual(result, centrifuge({ ...input, rotationRadS: -input.rotationRadS }));
  for (const p of result.profiles) {
    const exact = Math.exp(40 * AMU * config.rotationRadS ** 2 * p.radius ** 2
      / (2 * E_CHARGE * (config.ionTemperatureEV + 2 * config.electronTemperatureEV)));
    close(p.ionDensities[0], exact);
  }
});

test('equal masses and charges cannot produce radial composition separation', () => {
  const result = centrifuge({ ...config, species: config.species.map(s => ({ ...s, massU: 40 })) });
  for (const p of result.profiles) {
    assert.deepEqual(p.logSeparationFactors, [0, 0]);
    close(p.ionDensities[1] / p.ionDensities[0], .3 / .7);
  }
});

test('radial refinement preserves the independently solved closure, including steep profiles', () => {
  const input = { ...config, rotationRadS: 500000, species: [config.species[0], { ...config.species[1], chargeState: 4 }] };
  const coarse = centrifuge({ ...input, bins: 20 }), fine = centrifuge({ ...input, bins: 40 });
  coarse.profiles.forEach((p, i) => assert.deepEqual(p, fine.profiles[2 * i]));
  assert.ok(fine.maxRelativeChargeResidual < 1e-11);
  assert.ok(fine.profiles.every(p => Number.isFinite(p.electronDensity)));
});

test('invalid fields and unrepresentable equilibrium domains are rejected', () => {
  for (const patch of [
    { radius: 0 }, { radius: NaN }, { rotationRadS: Infinity }, { ionTemperatureEV: 0 },
    { electronTemperatureEV: -1 }, { bins: 0 }, { bins: 2.5 }, { bins: 2001 },
    { rotationRadS: 1e8 }, { species: [] },
    { species: [{ massU: 40, chargeState: 0, axisFraction: 1 }] },
    { species: [{ massU: 40, chargeState: 1.5, axisFraction: 1 }] },
    { species: [{ massU: -40, chargeState: 1, axisFraction: 1 }] },
    { species: [{ massU: 40, chargeState: 1, axisFraction: -1 }] },
    { species: [{ massU: 40, chargeState: 1, axisFraction: 0 }] },
  ]) assert.throws(() => centrifuge({ ...config, ...patch }));
});
