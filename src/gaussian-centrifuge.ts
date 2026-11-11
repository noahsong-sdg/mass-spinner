import { AMU, E_CHARGE } from './physics.js';
import type { CentrifugeConfig, CentrifugeResult } from './centrifuge.js';

const MU0 = 1.25663706127e-6;
const ELECTRON_MASS = 9.1093837139e-31;

export interface GaussianCentrifugeConfig extends CentrifugeConfig {
  magneticT: number;
  /** Prescribed Gaussian 1/e density radius, not a source-width prediction. */
  densityWidthM: number;
  /** Total on-axis ion number density. */
  axisDensityM3: number;
}
export interface GaussianProfile {
  radius: number;
  totalIonDensityM3: number;
  laboratoryPotentialV: number;
  electricFieldVM: number;
  ionVelocityMS: number;
  electronVelocityMS: number;
  currentDensityAM2: number;
  /** Estimated Bz(r)-Bz(0) from required current; not fed back into force balance. */
  magneticPerturbationT: number;
  /** Neglected electron centrifugal force / sum of absolute retained force terms. */
  electronInertiaRatio: number;
}
export interface GaussianCentrifugeResult extends CentrifugeResult {
  model: 'prescribed-gaussian';
  gaussianProfiles: GaussianProfile[];
  maxRelativeMagneticPerturbation: number;
  maxElectronInertiaRatio: number;
  maxRelativeForceBalanceResidual: number;
}

/** Prescribed-density, current-carrying equilibrium in an imposed uniform B.
 * Equal ion charge, common rigid ion rotation, isothermal ions/electrons,
 * quasineutrality, electron inertia neglected. N=N0 exp(-r²/R²).
 * The required electron flow/current is derived, not assumed to corotate.
 * This does not predict R, spin-up, axial flow, extraction or circuit power.
 */
export function gaussianCentrifuge(config: GaussianCentrifugeConfig): GaussianCentrifugeResult {
  const { radius, rotationRadS: rotation, ionTemperatureEV: ti, electronTemperatureEV: te,
    magneticT: b, densityWidthM: width, axisDensityM3: n0 } = config;
  if (![radius, rotation, ti, te, b, width, n0].every(Number.isFinite)
      || radius <= 0 || ti <= 0 || te <= 0 || b === 0 || width <= 0 || n0 <= 0)
    throw new Error('Gaussian equilibrium requires finite positive radius, temperatures, width and density, and nonzero B.');
  const bins = config.bins ?? 1000;
  if (!Number.isInteger(bins) || bins < 1 || bins > 2000)
    throw new Error('Use 1–2000 radial intervals.');
  if (!config.species.length || config.species.some(s => !Number.isFinite(s.massU) || s.massU <= 0
      || !Number.isSafeInteger(s.chargeState) || s.chargeState <= 0
      || !Number.isFinite(s.axisFraction) || s.axisFraction < 0))
    throw new Error('Species need positive mass, positive integer charge and nonnegative central fraction.');
  const z = config.species[0].chargeState;
  if (config.species.some(s => s.chargeState !== z))
    throw new Error('The prescribed-Gaussian closure currently requires equal ion charge states.');
  const totalFraction = config.species.reduce((sum, s) => sum + s.axisFraction, 0);
  if (!Number.isFinite(totalFraction) || totalFraction <= 0)
    throw new Error('Central fractions must have a finite positive sum.');
  const species = config.species.map(s => ({ ...s, axisFraction: s.axisFraction / totalFraction }));
  const referenceSpeciesIndex = species.findIndex(s => s.axisFraction > 0);
  const masses = species.map(s => s.massU * AMU);
  const wallAlpha = masses.map(m => m * (rotation * radius) ** 2 / (2 * E_CHARGE * ti));
  if ((radius / width) ** 2 > 500 || wallAlpha.some(x => !Number.isFinite(x) || x > 500))
    throw new Error('Gaussian equilibrium exceeds the finite exponent domain (radial exponents ≤500).');
  const result: GaussianCentrifugeResult = { model: 'prescribed-gaussian', species, referenceSpeciesIndex,
    profiles: [], gaussianProfiles: [], maxRelativeChargeResidual: 0,
    maxRelativeMagneticPerturbation: 0, maxElectronInertiaRatio: 0, maxRelativeForceBalanceResidual: 0 };
  for (let j = 0; j <= bins; j++) {
    const r = radius * j / bins, u2 = (r / width) ** 2;
    const alpha = wallAlpha.map(a => a * (r / radius) ** 2);
    const logs = species.map((s, i) => s.axisFraction > 0 ? Math.log(s.axisFraction) + alpha[i] : -Infinity);
    const largest = Math.max(...logs);
    const logSum = largest + Math.log(logs.reduce((sum, x) => sum + Math.exp(x - largest), 0));
    const fractions = logs.map(x => Math.exp(x - logSum));
    const density = Math.exp(-u2), meanMass = fractions.reduce((sum, f, i) => sum + f * masses[i], 0);
    const effectivePotentialV = ti / z * (logSum + u2);
    const potentialSlopeOverR = rotation * b + meanMass * rotation ** 2 / (z * E_CHARGE) + 2 * ti / (z * width ** 2);
    const potentialSlope = r * potentialSlopeOverR;
    const electronAngularSpeed = potentialSlopeOverR / b + 2 * te / (b * width ** 2);
    const ve = electronAngularSpeed * r, vi = rotation * r;
    const current = -n0 * density * r / b * (meanMass * rotation ** 2 + 2 * E_CHARGE * (ti + z * te) / width ** 2);
    const inertia = ELECTRON_MASS * electronAngularSpeed ** 2
      / (E_CHARGE * (2 * te / width ** 2 + Math.abs(potentialSlopeOverR) + Math.abs(b * electronAngularSpeed)));
    const ionDensities = fractions.map(f => density * f), electronDensity = z * density;
    const charge = ionDensities.reduce((sum, n) => sum + z * n, 0);
    result.maxRelativeChargeResidual = Math.max(result.maxRelativeChargeResidual, Math.abs(charge - electronDensity) / electronDensity);
    // Coefficient form removes the common r factor, including the continuous r→0 limit.
    for (let i = 0; i < species.length; i++) if (species[i].axisFraction > 0) {
      const pressure = E_CHARGE * ti * (-2 / width ** 2 + (masses[i] - meanMass) * rotation ** 2 / (E_CHARGE * ti));
      const centrifugal = masses[i] * rotation ** 2, electric = -z * E_CHARGE * potentialSlopeOverR;
      const magnetic = z * E_CHARGE * rotation * b;
      const residual = Math.abs(pressure - centrifugal - electric - magnetic)
        / (Math.abs(pressure) + Math.abs(centrifugal) + Math.abs(electric) + Math.abs(magnetic));
      result.maxRelativeForceBalanceResidual = Math.max(result.maxRelativeForceBalanceResidual, residual);
    }
    const electronPressure = -2 * E_CHARGE * te / width ** 2;
    const electronElectric = E_CHARGE * potentialSlopeOverR, electronMagnetic = -E_CHARGE * b * electronAngularSpeed;
    const electronResidual = Math.abs(electronPressure - electronElectric - electronMagnetic)
      / (Math.abs(electronPressure) + Math.abs(electronElectric) + Math.abs(electronMagnetic));
    result.maxRelativeForceBalanceResidual = Math.max(result.maxRelativeForceBalanceResidual, electronResidual);
    const previous = result.gaussianProfiles.at(-1);
    const perturbation = previous ? previous.magneticPerturbationT
      - MU0 * (previous.currentDensityAM2 + current) / 2 * (r - previous.radius) : 0;
    result.profiles.push({ radius: r, ionDensities, electronDensity, effectivePotentialV,
      logSeparationFactors: species.map((s, i) => s.axisFraction > 0 ? alpha[i] - alpha[referenceSpeciesIndex] : null) });
    result.gaussianProfiles.push({ radius: r, totalIonDensityM3: n0 * density,
      laboratoryPotentialV: effectivePotentialV + rotation * b * r ** 2 / 2,
      electricFieldVM: -potentialSlope, ionVelocityMS: vi, electronVelocityMS: ve,
      currentDensityAM2: current, magneticPerturbationT: perturbation, electronInertiaRatio: inertia });
    result.maxRelativeMagneticPerturbation = Math.max(result.maxRelativeMagneticPerturbation, Math.abs(perturbation / b));
    result.maxElectronInertiaRatio = Math.max(result.maxElectronInertiaRatio, inertia);
  }
  if (!result.gaussianProfiles.every(p => Object.values(p).every(Number.isFinite)))
    throw new Error('Gaussian fields exceed the representable finite domain.');
  return result;
}
