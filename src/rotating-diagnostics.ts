import { AMU, E_CHARGE, type IonSpecies, type Model, type RunConfig } from './physics.js';

export interface ColdRadialModes {
  cyclotronRadS: number;
  electricRateSquared: number;
  discriminantRadS2: number;
  stability: 'bounded' | 'marginal' | 'growing';
  slowRotationRadS: number | null;
  fastRotationRadS: number | null;
  growthRateS: number;
}

/** Signed angular velocities for x+iy proportional to exp(i omega t).
 * u'' + i Omega_c u' - alpha u = 0, alpha=2qV/(ma²).
 * Restricted to the outward-field Ohkawa configuration, V >= 0.
 */
export function coldRadialModes(model: Model, species: IonSpecies): ColdRadialModes {
  if (![model.radius, model.magneticT, model.voltage, species.massU, species.chargeState].every(Number.isFinite)
      || model.radius <= 0 || model.voltage < 0 || species.massU <= 0
      || !Number.isSafeInteger(species.chargeState) || species.chargeState <= 0)
    throw new Error('Cold Ohkawa diagnostics require positive radius/mass/charge and nonnegative voltage.');
  const qm = species.chargeState * E_CHARGE / (species.massU * AMU);
  const cyclotronRadS = qm * model.magneticT;
  const electricRateSquared = qm * 2 * model.voltage / model.radius ** 2;
  let discriminantRadS2 = cyclotronRadS ** 2 - 4 * electricRateSquared;
  // The analytically marginal case can acquire a few ulps in SI arithmetic.
  if (Math.abs(discriminantRadS2) <= 16 * Number.EPSILON * (cyclotronRadS ** 2 + 4 * electricRateSquared))
    discriminantRadS2 = 0;
  const stability = discriminantRadS2 > 0 ? 'bounded' : discriminantRadS2 < 0 ? 'growing' : 'marginal';
  const sign = cyclotronRadS < 0 ? -1 : 1;
  const denominator = cyclotronRadS + sign * Math.sqrt(Math.max(0, discriminantRadS2));
  const slowRotationRadS = stability === 'growing' ? null
    : denominator === 0 ? 0 : -2 * electricRateSquared / denominator;
  return {
    cyclotronRadS, electricRateSquared, discriminantRadS2, stability,
    slowRotationRadS,
    fastRotationRadS: slowRotationRadS === null ? null : -cyclotronRadS - slowRotationRadS,
    growthRateS: Math.sqrt(Math.max(0, -discriminantRadS2)) / 2,
  };
}

/** Exact r(t)/r(0) for initially zero transverse laboratory velocity.
 * This is an orbit reference, not a warm-source envelope or density prediction.
 */
export function coldRadialGain(modes: ColdRadialModes, timeS: number): number {
  if (!Number.isFinite(timeS) || timeS < 0) throw new Error('Time must be finite and nonnegative.');
  const { discriminantRadS2: d, electricRateSquared: alpha } = modes;
  if (d === 0) return Math.sqrt(1 + alpha * timeS ** 2);
  const root = Math.sqrt(Math.abs(d));
  const oscillation = d > 0 ? Math.sin(root * timeS / 2) : Math.sinh(root * timeS / 2);
  return Math.sqrt(1 + 4 * alpha / Math.abs(d) * oscillation ** 2);
}

/** First wall intersection of that exact reference orbit; null means never. */
export function coldWallTime(modes: ColdRadialModes, sourceRadius: number, wallRadius: number): number | null {
  if (![sourceRadius, wallRadius].every(Number.isFinite) || sourceRadius < 0 || wallRadius <= sourceRadius)
    throw new Error('Source radius must lie inside a positive wall radius.');
  const { discriminantRadS2: d, electricRateSquared: alpha } = modes;
  if (sourceRadius === 0 || alpha === 0) return null;
  const distance = ((wallRadius / sourceRadius) ** 2 - 1) / alpha;
  if (d === 0) return Math.sqrt(distance);
  const root = Math.sqrt(Math.abs(d));
  const argument = root * Math.sqrt(distance) / 2;
  // A tangent wall contact has argument=1; roundoff must not turn it into a miss.
  if (d > 0) return argument <= 1 + 16 * Number.EPSILON
    ? 2 * Math.asin(Math.min(1, argument)) / root : null;
  return 2 * Math.asinh(argument) / root;
}

export interface ColdSpeciesDiagnostic extends IonSpecies, ColdRadialModes {
  transitTimeS: number;
  coldWallTimeS: number | null;
  coldWallBeforeExit: boolean;
  /** RMS transverse speed / |Omega_c| / a; not an actual orbit radius in E. */
  rhoOverA: number | null;
  /** q[phi(source edge)-phi(wall)] in eV, available as wall-directed work. */
  edgePotentialEnergyEV: number;
  samples: { timeS: number; radiusM: number }[];
}

/** Analytic reference alongside the simulated warm, possibly collisional source.
 * RF, neutral collisions, axial thermal spread and collective fields are excluded.
 */
export function coldOrbitDiagnostics(config: RunConfig): {
  exbRotationRadS: number | null; species: ColdSpeciesDiagnostic[];
} {
  if (![config.length, config.parallelEV, config.perpendicularEV, config.sourceRadius, config.duration].every(Number.isFinite)
      || config.length <= 0 || config.parallelEV <= 0 || config.perpendicularEV < 0
      || config.duration <= 0 || config.sourceRadius <= 0 || config.sourceRadius >= config.radius
      || config.mode === 'icr')
    throw new Error('Cold diagnostics require a rotating model, positive axial energy, and an interior source.');
  return {
    exbRotationRadS: config.magneticT === 0 ? null : -2 * config.voltage / (config.radius ** 2 * config.magneticT),
    species: (config.species ?? [{ massU: 40, chargeState: 1 }, { massU: 84, chargeState: 1 }]).map(species => {
      const modes = coldRadialModes(config, species);
      const transitTimeS = config.length / Math.sqrt(2 * E_CHARGE * config.parallelEV / (species.massU * AMU));
      const wallTime = coldWallTime(modes, config.sourceRadius, config.radius);
      const stop = Math.min(config.duration, transitTimeS, wallTime ?? Infinity);
      const transverseSpeed = Math.sqrt(2 * E_CHARGE * config.perpendicularEV / (species.massU * AMU));
      return {
        ...species, ...modes, transitTimeS, coldWallTimeS: wallTime,
        coldWallBeforeExit: wallTime !== null && wallTime < transitTimeS,
        rhoOverA: modes.cyclotronRadS === 0 ? null : transverseSpeed / Math.abs(modes.cyclotronRadS) / config.radius,
        edgePotentialEnergyEV: species.chargeState * config.voltage * (1 - (config.sourceRadius / config.radius) ** 2),
        samples: Array.from({ length: 121 }, (_, i) => ({
          timeS: stop * i / 120,
          radiusM: config.sourceRadius * coldRadialGain(modes, stop * i / 120),
        })),
      };
    }),
  };
}
