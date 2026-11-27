# Radial density: what the isolation studies establish

This is the optional conceptual argon cell, not experimental Marathon data.
The live defaults and physical coefficients remain unchanged. Full designs and
exclusions are in the [prospective protocol](RADIAL-PRECISION-PROTOCOL.md).

## Confirmed diagnosis

- An independent 80-digit solve finds only **0.0074–0.0427%** mass-response
  disagreement in the original-amplitude prescribed-field replays. This cannot
  by itself explain the original **22–38%** radial discrepancy. Snapshot fields
  are prescribed here; this does not exclude coupled transfer-feedback errors.
- Freezing one conservatively mapped r256 Joule source makes gas temperature
  converge on tested fine grids, while native-source temperature still fails.
  Source discretization therefore contributes to the modified problem's error.
- Density still fails with that common source, but contracts on finer gas grids.
  The r256/512/1024 differences are **8.97% / 2.47%**, above the unchanged 2%
  gate. Gas transport needs resolution independently of electrical heating.

## Implementation and audit fixes

The diagnostic duplicated scoring logic and omitted exact equality/quiet-signal
cases. That could misclassify identical predictions or serialize nonfinite
ratios as null. It now reuses the established classifier, with regression tests;
this removes the inconsistent copy without changing the coupled study's gates.

Fine reference histories would multiply resident arrays and serialized copies.
The runner now writes every accepted row as compressed JSONL and streams common
profiles for comparison. It retains gas/liner energies, native gas temperature,
accepted transfers, heat and residuals for an independent accounting audit.
This keeps the required evidence without retaining every trajectory in RAM.

The low-level gas cell ceiling increases to 4096 for offline refinement because
1024 did not resolve the computed profile. Transport equations, tolerances,
positivity/conservation checks and the 1-GiB cap stay fixed; the UI limit stays 32.
Resolution is increased rather than tuning diffusion or smoothing the source.

## Joint study receipt

[Exact-source study](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43848934708),
`8745d41`: all 22 trajectories complete, 17 comparisons, Node peak RSS 184624 KiB.
At 1024 timesteps, the common-source r1024/2048/4096 density differences are
**0.71815% / 0.17948%**; temperature **0.04036% / 0.009965%**. Both pass the
unchanged 2% gate and contract. The same radial triple passes at 256/512 steps;
all three fine-grid timestep triples pass 1% plus contraction at shared clocks.

Independent accounting verified all stream hashes, accepted row/clock counts,
source mapping and source-file identities. It retains a **−1.80679e-13 J** final
energy defect at r4096/time1024 against **1.57304e-9 J** deposited. Liner
accounting dominates; stored-energy quantization is plausible, not proven.
Unresolved wall uptake is not an energy-accuracy pass.

[Required checks](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43848934850)
at the same source passed: all 1324 TypeScript tests (`node --import tsx --test
--test-concurrency=1 tests/*.test.ts`), 17 electron-screen and 3 export Python
tests; `npm run typecheck`, `npm run build`, `npm run check:site` and
`npm run check:assets`. The study also
passed 18 focused TypeScript tests, 3 precision-oracle and 4 accounting tests.

[Compact receipt](../scientific/spatial-argon-20261116/radial-receipts-8745d41.tar.gz)
SHA-256: `2e6d951582467330083e649cd3601533decfc2f21cda92182aa48a1133503dac`.
It includes assessments, precision replay inputs, source/stream hashes and CI
receipts/logs, **not the dense raw streams**. Those are in the
[280-MB Actions artifact](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43848934708/artifacts/14216981998),
whose current expiry is 2027-02-14. The committed workflow provides reproduction steps.
All 22 dense streams are also retained locally in the ignored
`scientific/spatial-argon-20261116/retained-radial-8745d41/` directory;
their copied bytes match the indexed hashes. They are not Git-tracked.
The final evidence/documentation commit changes no tested model code.

No frozen-source pass establishes the native electrical continuum limit,
rotating-model convergence, local relative startup accuracy, liner resolution,
experimental accuracy or the full slider envelope. The independent audit's
energy ratios use final cumulative deposited energy; they do not qualify
early-time relative errors. Main 3D behavior is unchanged and not deployed here.
