import type { CentrifugeResult } from './centrifuge.js';

export interface RadialInventory {
  /** Integral of normalized density over this region, divided by the full cylinder area. */
  inventory: number[];
  numberFractions: (number | null)[];
  /** Fraction of each species' whole-cylinder inventory in this region; null if absent. */
  speciesInventoryFractions: (number | null)[];
}

/** Radial inventories of an axially uniform column, not extraction or throughput predictions. */
export function centrifugeDiagnostics(result: CentrifugeResult, cutRadiusFraction = 0.7) {
  if (!Number.isFinite(cutRadiusFraction) || cutRadiusFraction <= 0 || cutRadiusFraction >= 1)
    throw new Error('The hypothetical radial cut must lie strictly inside the cylinder.');
  const count = result.species.length;
  const samples = result.profiles;
  if (!count || samples.length < 2 || samples[0].radius !== 0)
    throw new Error('Inventory integration requires an axis and at least one outer sample.');
  for (let i = 0; i < samples.length; i++) {
    const p = samples[i];
    if (!Number.isFinite(p.radius) || p.radius < 0 || (i > 0 && p.radius <= samples[i - 1].radius)
        || p.ionDensities.length !== count
        || p.ionDensities.some(n => !Number.isFinite(n) || n < 0))
      throw new Error('Inventory samples need increasing radii and finite nonnegative species densities.');
  }
  const wallRadius = samples[samples.length - 1].radius;
  const cumulative: number[][] = [Array(count).fill(0)];
  const inner = Array(count).fill(0) as number[];
  const outer = Array(count).fill(0) as number[];
  // Exact integral of 2u*n(u) for the piecewise-linear density, u=r/a.
  const cell = (u: number, h: number, n0: number, n1: number) =>
    2 * (n0 * (u * h + h * h / 2) + (n1 - n0) * (u * h / 2 + h * h / 3));
  for (let j = 1; j < samples.length; j++) {
    const left = samples[j - 1], right = samples[j];
    const u = left.radius / wallRadius, v = right.radius / wallRadius;
    const end = Math.min(v, cutRadiusFraction);
    const next = cumulative[j - 1].slice();
    for (let i = 0; i < count; i++) {
      const n0 = left.ionDensities[i], n1 = right.ionDensities[i];
      next[i] += cell(u, v - u, n0, n1);
      if (end > u) {
        const nEnd = n0 + (n1 - n0) * (end - u) / (v - u);
        inner[i] += cell(u, end - u, n0, nEnd);
      }
      // Integrate the annulus directly: subtracting two nearly equal full/core
      // inventories would erase finite, low-density outer populations.
      const start = Math.max(u, cutRadiusFraction);
      if (v > start) {
        const t = (start - u) / (v - u), nStart = (1 - t) * n0 + t * n1;
        outer[i] += cell(start, v - start, nStart, n1);
      }
    }
    cumulative.push(next);
  }
  const volumeMeanIonDensities = cumulative[cumulative.length - 1];
  const totalInventory = volumeMeanIonDensities.reduce((a, b) => a + b, 0);
  if (!Number.isFinite(totalInventory) || totalInventory <= 0)
    throw new Error('The cylinder must contain a finite positive ion inventory.');
  const fractions = (values: number[]): (number | null)[] => {
    const total = values.reduce((a, b) => a + b, 0);
    return values.map(value => total > 0 ? value / total : null);
  };
  const region = (inventory: number[]): RadialInventory => ({
    inventory,
    numberFractions: fractions(inventory),
    speciesInventoryFractions: inventory.map((value, i) =>
      volumeMeanIonDensities[i] > 0 ? value / volumeMeanIonDensities[i] : null),
  });
  return {
    cutRadius: cutRadiusFraction * wallRadius,
    volumeMeanIonDensities,
    bulkNumberFractions: fractions(volumeMeanIonDensities),
    inner: region(inner),
    outer: region(outer),
    profiles: samples.map((p, j) => ({
      radius: p.radius,
      numberFractions: fractions(p.ionDensities),
      cumulativeSpeciesFractions: cumulative[j].map((value, i) =>
        volumeMeanIonDensities[i] > 0 ? value / volumeMeanIonDensities[i] : null),
      cumulativeMixtureFraction: cumulative[j].reduce((a, b) => a + b, 0) / totalInventory,
    })),
  };
}
