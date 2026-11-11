import { centrifuge, type CentrifugeConfig, type CentrifugeResult } from './centrifuge.js';
import { centrifugeDiagnostics } from './centrifuge-diagnostics.js';

export interface BulkCompositionSolution<T extends CentrifugeResult = CentrifugeResult> {
  result: T;
  axisFractionA: number;
  axisFractionB: number;
  targetBulkFractionA: number;
  actualBulkFractionA: number;
  residual: number;
  logOddsResidual: number;
}

/** Invert a binary equilibrium's monotone axis-to-volume composition map.
 * Both axis fractions are passed independently: 1 - axisA would erase the
 * minority species when its central fraction is below machine epsilon.
 * Density normalization is unchanged; this fixes the bulk ratio, not total N.
 */
export function solveBinaryBulk<T extends CentrifugeResult>(
  solve: (axisA: number, axisB: number) => T,
  targetA: number,
): BulkCompositionSolution<T> {
  if (!Number.isFinite(targetA) || targetA < 0 || targetA > 1)
    throw new Error('Bulk A number fraction must lie between zero and one.');
  const evaluate = (axisA: number, axisB: number) => {
    const result = solve(axisA, axisB);
    if (result.species.length !== 2) throw new Error('Bulk inversion requires exactly two ion species.');
    const inventory = centrifugeDiagnostics(result).volumeMeanIonDensities;
    const actual = inventory[0] / (inventory[0] + inventory[1]);
    return { result, axisA, axisB, actual, odds: Math.log(inventory[0]) - Math.log(inventory[1]) };
  };
  const finish = (state: ReturnType<typeof evaluate>, logOddsResidual: number) => ({
    result: state.result, axisFractionA: state.axisA, axisFractionB: state.axisB,
    targetBulkFractionA: targetA, actualBulkFractionA: state.actual,
    residual: state.actual - targetA, logOddsResidual,
  });
  if (targetA === 0 || targetA === 1) {
    const state = evaluate(targetA, 1 - targetA);
    if (state.actual !== targetA) throw new Error('Equilibrium does not preserve the absent-species boundary.');
    return finish(state, 0);
  }
  const targetOdds = Math.log(targetA) - Math.log1p(-targetA);
  const at = (logit: number) => {
    const tail = Math.exp(-Math.abs(logit));
    const small = tail / (1 + tail), large = 1 / (1 + tail);
    return logit < 0 ? evaluate(small, large) : evaluate(large, small);
  };
  // exp(±700) stays representable. No silent clipping to a pure species.
  let low = -700, high = 700, left = at(low), right = at(high);
  if (!(left.odds <= targetOdds && targetOdds <= right.odds))
    throw new Error('Requested bulk mixture requires unrepresentable central fractions.');
  for (let iteration = 0; iteration < 64; iteration++) {
    const midpoint = (low + high) / 2, state = at(midpoint);
    if (Number.isNaN(state.odds) || state.odds < left.odds - 1e-9 || state.odds > right.odds + 1e-9)
      throw new Error('Equilibrium bulk composition must increase monotonically with central A fraction.');
    const difference = state.odds - targetOdds;
    if (Math.abs(difference) < 1e-10) return finish(state, difference);
    if (difference < 0) { low = midpoint; left = state; }
    else { high = midpoint; right = state; }
  }
  throw new Error('Bulk-composition inversion did not converge; inspect central-fraction representability.');
}

/** Same common-corotation equilibrium, with a whole-cylinder composition boundary. */
export function fixedBulkCentrifuge(config: CentrifugeConfig, targetA: number) {
  if (config.species.length !== 2) throw new Error('Bulk inversion requires exactly two ion species.');
  return solveBinaryBulk((axisA, axisB) => centrifuge({ ...config, species: config.species.map((s, i) =>
    ({ ...s, axisFraction: i === 0 ? axisA : axisB })) }), targetA);
}
