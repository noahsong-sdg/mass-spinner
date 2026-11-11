import type { Vec } from './physics.js';

/** Elastic binary collision with a cold, initially stationary neutral.
 * The outgoing relative velocity is isotropic in the center-of-mass frame.
 * Masses are in u; velocities in m/s. No charge exchange or gas heating is modeled.
 * random must supply independent uniform values in [0,1).
 */
export function elasticCollision(ionVelocity: Vec, ionMassU: number, neutralMassU: number,
  random: () => number): { ionVelocity: Vec; neutralVelocity: Vec } {
  if (!Number.isFinite(ionMassU) || ionMassU<=0 || !Number.isFinite(neutralMassU) || neutralMassU<=0
    || !ionVelocity.every(Number.isFinite)) throw new Error('Collision masses must be positive and velocities finite.');
  const totalMass=ionMassU+neutralMassU;
  const ionFraction=ionMassU/totalMass,neutralFraction=neutralMassU/totalMass;
  const speed=Math.hypot(...ionVelocity),cosine=2*random()-1,azimuth=2*Math.PI*random();
  const sine=Math.sqrt(1-cosine*cosine);
  const relative: Vec=[speed*sine*Math.cos(azimuth),speed*sine*Math.sin(azimuth),speed*cosine];
  const ion: Vec=[0,0,0],neutral: Vec=[0,0,0];
  for(let axis=0;axis<3;axis++){
    const center=ionFraction*ionVelocity[axis];
    ion[axis]=center+neutralFraction*relative[axis];
    neutral[axis]=center-ionFraction*relative[axis];
  }
  return {ionVelocity:ion,neutralVelocity:neutral};
}

/** At-least-one-event probability for a frozen speed and constant isotropic cross section.
 * n [m^-3], sigma [m²], speed [m/s], dt [s]. This is a prescribed cold-bath model,
 * not an empirical cross section for a particular gas. Multiple events are not sampled here.
 */
export function collisionProbability(speedMPerS: number, neutralDensityM3: number,
  crossSectionM2: number, dtSeconds: number): number {
  const parameters=[speedMPerS,neutralDensityM3,crossSectionM2,dtSeconds];
  if (!parameters.every(value=>Number.isFinite(value) && value>=0))
    throw new Error('Collision speed, density, cross section, and timestep must be finite and nonnegative.');
  if (parameters.includes(0)) return 0;
  return -Math.expm1(-neutralDensityM3*crossSectionM2*speedMPerS*dtSeconds);
}
