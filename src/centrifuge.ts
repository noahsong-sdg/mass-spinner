import { AMU, E_CHARGE } from './physics.js';

export interface CentrifugeSpecies {
  massU: number;
  chargeState: number;
  /** Central number fraction, not whole-volume inventory or feed composition. */
  axisFraction: number;
}
export interface CentrifugeConfig {
  radius: number;
  rotationRadS: number;
  ionTemperatureEV: number;
  electronTemperatureEV: number;
  species: CentrifugeSpecies[];
  /** Number of radial intervals; both axis and wall are sampled. */
  bins?: number;
}
export interface CentrifugeProfile {
  radius: number;
  /** Densities divided by total on-axis ion number density. */
  ionDensities: number[];
  electronDensity: number;
  /** psi = phi - Omega B r²/2, with psi(0)=0; not laboratory potential. */
  effectivePotentialV: number;
  /** ln[(n_i/n_ref)/(f_i/f_ref)]; null for an absent species. */
  logSeparationFactors: (number | null)[];
}
export interface CentrifugeResult {
  species: CentrifugeSpecies[];
  referenceSpeciesIndex: number;
  profiles: CentrifugeProfile[];
  maxRelativeChargeResidual: number;
}

function logSumExp(values: number[]): number {
  const largest = Math.max(...values);
  return largest + Math.log(values.reduce((sum, value) => sum + Math.exp(value - largest), 0));
}

/** Isothermal, rigidly corotating quasineutral equilibrium; electron inertia neglected.
 * n_s=f_s exp[m_s Omega² r²/(2 Ti)-Z_s e psi/Ti],
 * n_e=(sum Z_s f_s) exp[e psi/Te]. No relaxation time or throughput is predicted.
 */
export function centrifuge(config: CentrifugeConfig): CentrifugeResult {
  const { radius, rotationRadS, ionTemperatureEV, electronTemperatureEV } = config;
  if (![radius, rotationRadS, ionTemperatureEV, electronTemperatureEV].every(Number.isFinite)
      || radius <= 0 || ionTemperatureEV <= 0 || electronTemperatureEV <= 0)
    throw new Error('Radius and temperatures must be finite and positive; rotation must be finite.');
  const bins = config.bins ?? 100;
  if (!Number.isInteger(bins) || bins < 1 || bins > 2000)
    throw new Error('Use 1–2000 radial intervals.');
  if (!config.species.length || config.species.some(s => !Number.isFinite(s.massU) || s.massU <= 0
      || !Number.isSafeInteger(s.chargeState) || s.chargeState <= 0
      || !Number.isFinite(s.axisFraction) || s.axisFraction < 0))
    throw new Error('Species need positive mass, positive integer charge, and nonnegative central fraction.');
  const totalFraction = config.species.reduce((sum, s) => sum + s.axisFraction, 0);
  if (!Number.isFinite(totalFraction) || totalFraction <= 0)
    throw new Error('Central fractions must have a finite positive sum.');
  const species = config.species.map(s => ({ ...s, axisFraction: s.axisFraction / totalFraction }));
  const referenceSpeciesIndex = species.findIndex(s => s.axisFraction > 0);
  const active = species.map((s, index) => index).filter(index => species[index].axisFraction > 0);
  const temperatureRatio = ionTemperatureEV / electronTemperatureEV;
  const wallSpeed = Math.abs(rotationRadS) * radius;
  const wallExponents = species.map(s => s.massU * (AMU / E_CHARGE) * wallSpeed ** 2 / (2 * ionTemperatureEV));
  if (!Number.isFinite(temperatureRatio) || temperatureRatio <= 0
      || wallExponents.some(value => !Number.isFinite(value) || value > 500))
    throw new Error('Equilibrium exceeds the finite exponent domain: m Omega² a²/(2 Ti) <= 500.');
  const logAxisCharge = Math.log(species.reduce((sum, s) => sum + s.chargeState * s.axisFraction, 0));
  let maxRelativeChargeResidual = 0;
  const profiles = Array.from({ length: bins + 1 }, (_, index): CentrifugeProfile => {
    const fraction = index / bins;
    const alpha = wallExponents.map(value => value * fraction ** 2);
    // For y=e psi/Ti, closure decreases strictly with y. These bounds bracket its root.
    const upper = Math.max(...active.map(i => alpha[i] / (species[i].chargeState + temperatureRatio)));
    const ionSlopes = species.map(s => s.chargeState * upper);
    const electronSlope = temperatureRatio * upper;
    const logIonCharge = (x: number) => logSumExp(active.map(i =>
      Math.log(species[i].chargeState * species[i].axisFraction) + alpha[i] - ionSlopes[i] * x));
    let low = 0, high = 1;
    for (let iteration = 0; iteration < 80 && upper > 0; iteration++) {
      const midpoint = (low + high) / 2;
      if (logIonCharge(midpoint) > logAxisCharge + electronSlope * midpoint) low = midpoint;
      else high = midpoint;
    }
    const x = upper > 0 ? (low + high) / 2 : 0;
    const exponents = alpha.map((value, i) => value - ionSlopes[i] * x);
    const effectivePotentialV = ionTemperatureEV * upper * x;
    if (!Number.isFinite(effectivePotentialV) || exponents.some(value => Math.abs(value) > 600))
      throw new Error('Electrostatic equilibrium exceeds the finite exponent domain.');
    const logElectronDensity = logAxisCharge + electronSlope * x;
    maxRelativeChargeResidual = Math.max(maxRelativeChargeResidual,
      Math.abs(Math.expm1(logIonCharge(x) - logElectronDensity)));
    return {
      radius: radius * fraction,
      ionDensities: species.map((s, i) => s.axisFraction * Math.exp(exponents[i])),
      electronDensity: Math.exp(logElectronDensity),
      effectivePotentialV,
      logSeparationFactors: species.map((s, i) => s.axisFraction > 0
        ? exponents[i] - exponents[referenceSpeciesIndex] : null),
    };
  });
  return { species, referenceSpeciesIndex, profiles, maxRelativeChargeResidual };
}
