import test from 'node:test';
import assert from 'node:assert/strict';
import { gaussianCentrifuge, type GaussianCentrifugeConfig } from '../src/gaussian-centrifuge.js';
import { AMU, E_CHARGE } from '../src/physics.js';
import { centrifugeDiagnostics } from '../src/centrifuge-diagnostics.js';
import { solveBinaryBulk } from '../src/centrifuge-bulk.js';

const c: GaussianCentrifugeConfig = { radius: .48, rotationRadS: 10000, ionTemperatureEV: 5,
  electronTemperatureEV: 5, magneticT: .1, densityWidthM: .2, axisDensityM3: 1e17, bins: 1000,
  species: [{ massU: 40, chargeState: 1, axisFraction: .6 }, { massU: 84, chargeState: 1, axisFraction: .4 }] };
const close = (actual: number, expected: number, tolerance = 1e-10) =>
  assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${actual} != ${expected}`);

test('prescribed Gaussian density, quasineutrality and exact equal-charge enrichment are simultaneous', () => {
  for (const charge of [1, 2]) {
    const input = { ...c, species: c.species.map(s => ({ ...s, chargeState: charge })) };
    const result = gaussianCentrifuge(input);
    result.profiles.forEach((p, j) => {
      const total = Math.exp(-((p.radius / c.densityWidthM) ** 2));
      close(p.ionDensities.reduce((a, b) => a + b), total);
      close(p.electronDensity, charge * total);
      close(p.logSeparationFactors[1]!, 44 * AMU * c.rotationRadS ** 2 * p.radius ** 2 / (2 * E_CHARGE * c.ionTemperatureEV));
      close(Math.log(p.ionDensities[1] / p.ionDensities[0] / (.4 / .6)), p.logSeparationFactors[1]!);
      close(result.gaussianProfiles[j].laboratoryPotentialV,
        p.effectivePotentialV + c.rotationRadS * c.magneticT * p.radius ** 2 / 2);
    });
    assert.ok(result.maxRelativeChargeResidual < 1e-14);
    assert.ok(result.maxRelativeForceBalanceResidual < 1e-14);
  }
});

test('independent finite differences close each ion and electron radial momentum equation', () => {
  const result = gaussianCentrifuge({ ...c, bins: 2000 });
  const h = c.radius / 2000;
  for (const j of [100, 500, 1000, 1500, 1900]) {
    const r = result.profiles[j].radius, g = result.gaussianProfiles[j];
    const potentialPrime = (result.gaussianProfiles[j + 1].laboratoryPotentialV
      - result.gaussianProfiles[j - 1].laboratoryPotentialV) / (2 * h);
    close(potentialPrime, -g.electricFieldVM, 2e-6);
    for (let i = 0; i < 2; i++) {
      const densityPrime = (Math.log(result.profiles[j + 1].ionDensities[i])
        - Math.log(result.profiles[j - 1].ionDensities[i])) / (2 * h);
      const pressure = E_CHARGE * c.ionTemperatureEV * densityPrime;
      const force = c.species[i].massU * AMU * c.rotationRadS ** 2 * r
        - E_CHARGE * potentialPrime + E_CHARGE * c.rotationRadS * r * c.magneticT;
      assert.ok(Math.abs(pressure - force) / Math.max(Math.abs(pressure), Math.abs(force)) < 1e-5);
    }
    const electronPressure = -2 * E_CHARGE * c.electronTemperatureEV * r / c.densityWidthM ** 2;
    const electronForce = E_CHARGE * (potentialPrime - g.electronVelocityMS * c.magneticT);
    assert.ok(Math.abs(electronPressure - electronForce) / Math.abs(electronPressure) < 1e-5);
    close(g.currentDensityAM2, E_CHARGE * g.totalIonDensityM3 * (g.ionVelocityMS - g.electronVelocityMS));
  }
});

test('zero ion rotation retains Gaussian pressure-supported current, not fictitious electron corotation', () => {
  const result = gaussianCentrifuge({ ...c, rotationRadS: 0 });
  result.profiles.forEach((p, j) => {
    close(p.ionDensities[0] / (p.ionDensities[0] + p.ionDensities[1]), .6);
    close(p.effectivePotentialV, c.ionTemperatureEV * p.radius ** 2 / c.densityWidthM ** 2);
    close(result.gaussianProfiles[j].electronVelocityMS,
      2 * (c.ionTemperatureEV + c.electronTemperatureEV) * p.radius / (c.magneticT * c.densityWidthM ** 2));
    if (j > 0) assert.ok(result.gaussianProfiles[j].currentDensityAM2 < 0);
  });
});

test('equal mass species and absent species preserve their stated composition without false separation', () => {
  const result = gaussianCentrifuge({ ...c, species: c.species.map(s => ({ ...s, massU: 40 })) });
  for (const p of result.profiles) {
    close(p.ionDensities[1] / p.ionDensities[0], 2 / 3);
    assert.deepEqual(p.logSeparationFactors, [0, 0]);
  }
  const absent = gaussianCentrifuge({ ...c, species: c.species.map((s, i) => ({ ...s, axisFraction: i })) });
  assert.equal(absent.referenceSpeciesIndex, 1);
  for (const p of absent.profiles) { assert.equal(p.ionDensities[0], 0); assert.equal(p.logSeparationFactors[0], null); }
});

test('single-species potential and Ampere self-field estimate agree with independent integrals and converge', () => {
  const input = { ...c, species: [c.species[0]] };
  const coarse = gaussianCentrifuge({ ...input, bins: 100 }), fine = gaussianCentrifuge({ ...input, bins: 200 });
  const coefficient = c.species[0].massU * AMU * c.rotationRadS ** 2
    + 2 * E_CHARGE * (c.ionTemperatureEV + c.electronTemperatureEV) / c.densityWidthM ** 2;
  const exactField = 1.25663706127e-6 * c.axisDensityM3 * coefficient * c.densityWidthM ** 2
    / (2 * c.magneticT) * (1 - Math.exp(-((c.radius / c.densityWidthM) ** 2)));
  const coarseError = Math.abs(coarse.gaussianProfiles.at(-1)!.magneticPerturbationT - exactField);
  const fineError = Math.abs(fine.gaussianProfiles.at(-1)!.magneticPerturbationT - exactField);
  assert.ok(coarseError / fineError > 3.99 && coarseError / fineError < 4.01);
  for (const g of fine.gaussianProfiles) {
    const exactPhi = (c.rotationRadS * c.magneticT / 2
      + c.species[0].massU * AMU * c.rotationRadS ** 2 / (2 * E_CHARGE)
      + c.ionTemperatureEV / c.densityWidthM ** 2) * g.radius ** 2;
    close(g.laboratoryPotentialV, exactPhi);
  }
});

test('current and magnetic perturbation scale with absolute density; inertia ratio does not', () => {
  const a = gaussianCentrifuge(c), b = gaussianCentrifuge({ ...c, axisDensityM3: c.axisDensityM3 * 10 });
  a.gaussianProfiles.forEach((p, i) => {
    close(b.gaussianProfiles[i].currentDensityAM2, p.currentDensityAM2 * 10);
    close(b.gaussianProfiles[i].magneticPerturbationT, p.magneticPerturbationT * 10);
    close(b.gaussianProfiles[i].electronInertiaRatio, p.electronInertiaRatio);
  });
  assert.ok(a.maxElectronInertiaRatio > 0);
  close(b.maxRelativeMagneticPerturbation, a.maxRelativeMagneticPerturbation * 10);
});

test('inventory integration conserves the prescribed Gaussian column under radial refinement', () => {
  const coarse = centrifugeDiagnostics(gaussianCentrifuge({ ...c, bins: 100 }));
  const fine = centrifugeDiagnostics(gaussianCentrifuge({ ...c, bins: 200 }));
  const exact = (c.densityWidthM / c.radius) ** 2 * (1 - Math.exp(-((c.radius / c.densityWidthM) ** 2)));
  const error = (d: typeof fine) => Math.abs(d.volumeMeanIonDensities.reduce((a, b) => a + b) - exact);
  assert.ok(error(coarse) / error(fine) > 3.99 && error(coarse) / error(fine) < 4.01);
  assert.ok(fine.outer.numberFractions[1]! > fine.inner.numberFractions[1]!);
});

test('negative B and reversed ion rotation satisfy signed force balance without changing density', () => {
  const a = gaussianCentrifuge(c), b = gaussianCentrifuge({ ...c, magneticT: -c.magneticT });
  const reverse = gaussianCentrifuge({ ...c, rotationRadS: -c.rotationRadS });
  a.profiles.forEach((p, i) => {
    assert.deepEqual(p.ionDensities, b.profiles[i].ionDensities);
    assert.deepEqual(p.ionDensities, reverse.profiles[i].ionDensities);
    close(b.gaussianProfiles[i].currentDensityAM2, -a.gaussianProfiles[i].currentDensityAM2);
    close(reverse.gaussianProfiles[i].currentDensityAM2, a.gaussianProfiles[i].currentDensityAM2);
  });
  assert.ok(b.maxRelativeForceBalanceResidual < 1e-14);
});

test('invalid inputs and unequal charges fail explicitly rather than silently changing closure', () => {
  for (const patch of [{ magneticT: 0 }, { radius: 0 }, { densityWidthM: 0 }, { axisDensityM3: 0 },
    { electronTemperatureEV: 0 }, { rotationRadS: Infinity }, { bins: 2001 }, { densityWidthM: .001 },
    { species: [] }, { species: [{ ...c.species[0], axisFraction: 0 }] },
    { species: [c.species[0], { ...c.species[1], chargeState: 2 }] }])
    assert.throws(() => gaussianCentrifuge({ ...c, ...patch }));
});

test('binary bulk inversion works with steep Gaussian composition and preserves total prescribed inventory', () => {
  const config = { ...c, rotationRadS: 30000, ionTemperatureEV: 1, bins: 400,
    species: [{ massU: 20, chargeState: 1, axisFraction: .5 }, { massU: 200, chargeState: 1, axisFraction: .5 }] };
  const solve = (axisA: number, axisB: number) => gaussianCentrifuge({ ...config,
    species: config.species.map((s, i) => ({ ...s, axisFraction: i ? axisB : axisA })) });
  const a = solveBinaryBulk(solve, .25), b = solveBinaryBulk(solve, .75);
  close(a.actualBulkFractionA, .25, 1e-10); close(b.actualBulkFractionA, .75, 1e-10);
  // A light-rich bulk needs a sub-epsilon central heavy tail; subtraction 1-axisA would erase it.
  assert.ok(b.axisFractionB > 0 && b.axisFractionB < Number.EPSILON);
  const total = (result: typeof a.result) => centrifugeDiagnostics(result).volumeMeanIonDensities.reduce((sum, n) => sum + n);
  close(total(a.result), total(b.result));
  for (const result of [a.result, b.result]) {
    assert.ok(result.maxRelativeForceBalanceResidual < 1e-14);
    assert.ok(result.profiles.every(p => p.ionDensities.every(Number.isFinite)));
  }
});
