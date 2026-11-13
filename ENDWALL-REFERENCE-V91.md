# Stationary-wall reference, V91

This continues the [V90 coupled OpenFOAM reference](COUPLED-OPENFOAM-V90.md).
It concerns a closed, neutral-argon momentum/energy benchmark, not experimental
qualification of the centrifuge or a change to the deployed playground.

## Defect and fix

The Euler reconstruction copied tangential velocity into its wall ghost cell,
while the following viscous operator imposed a stationary no-slip wall. At an
exactly linear wall shear, the copied ghost forces the last cell's limited
slope to zero. The last interior Rusanov face then sees two different traces
and adds numerical tangential-momentum diffusion even with zero normal
advection. In simple terms, one step treated the wall as slippery while the
next imposed no slip, smearing the thin layer between them.

An analytical stencil witness measured this artificial flux at 4.124 times
the physical viscous shear at n=64, and 2.062 times at n=128. These are local
stencil diagnostics, not ratios of the complete evolved error. Initial
diffusion alone produced zero meridional velocity; it did not reproduce the
suspected spurious circulation on its own.

`Flow(..., noSlipWalls=True)` now reflects tangential ghost velocities for
the reconstruction slopes at the physical outer radius and endwall. The final
Euler wall Riemann pair retains normal-only reflection: viscous wall traction
still comes exclusively from the stress operator. Axis and midplane symmetry
are unchanged. This uses a standard stationary viscous-wall ghost construction
([NASA-CR-199562, section 3.3.2](https://ntrs.nasa.gov/api/citations/19960003218/downloads/19960003218.pdf)).
That source supports the boundary construction, not this complete hybrid solver.

The explicit option is preferable to changing all slip-Euler callers, replacing
the flux solver, or changing transport coefficients: it fixes the demonstrated
boundary inconsistency with a small, testable change and preserves the old
reference bitwise. Only the V91 candidate selects it. Existing driven campaigns
and the live playground do not yet use this option.

## Qualification

The prospective protocols are [PROTOCOL.md](scientific/endwall-v91/PROTOCOL.md)
and [WALL-TRACE.md](scientific/endwall-v91/WALL-TRACE.md). Predictions precede
scoring; the V90 scorer, transport coefficients, initial conditions, reporting
clocks and tolerances remain unchanged. No measured current or velocity is fit.

| Separate audit | Unchanged baseline | Corrected candidate |
|---|---:|---:|
| Original 8→16→32, 512 steps | 118/119 | 118/119 |
| Extension 16→32→64, 512 steps, with n=64 timestep sweep | 130/134 | 132/134 |
| New 32→64→128, all at 1024 steps | 67/73 | 73/73 |

The original native swirl-increment change remains 6.274%, above 5%. The
extension's remaining candidate failure is meridional self-contraction:
1.04555 against a strict limit below one, recorded twice because the initial
meridional velocity is zero and whole/increment scores coincide. Its former
cross-solver contraction failures pass. The unchanged finer baseline still
fails six checks; the corrected finer comparison passes all 73. These are
overlapping audits, not independent experiments to pool into one pass rate.
The scoring command deliberately exits 1 because the extension remains red.

Final-time cross-solver response differences at n=64, 512 steps:

| Response, volume RMS | V90 baseline | V91 candidate |
|---|---:|---:|
| Density change | 0.1331% | 0.1234% |
| Temperature change | 0.1284% | 0.1182% |
| Swirl change | 0.8144% | 0.8147% |
| Meridional velocity | 0.8345% | 0.2847% |

At n=128 and 1024 steps these differences are 0.0624%, 0.0603%, 0.2825%
and 0.1582%, respectively. The boundary fix reduces the meridional discrepancy
substantially; it does not improve every field at every resolution.

At 20 microseconds, sqrt(nu t) is 1.510 mm. The n=64 axial spacing is
1.875 mm, so this length occupies only 0.805 cells. At 5 microseconds it is
only half as large. A small final-time global norm cannot establish that the
early, local wall layer is resolved. Additional saved-time and endwall-region
comparisons are diagnostic and do not silently replace the admission gates.
In the region within four diffusion lengths of the endwall, the n=128
meridional differences are 2.068%, 1.965% and 1.821% at 5, 10 and 20 μs.
The 5 μs global difference rises from 0.0805% at n=64/512 steps to 0.1140%
at n=128/1024 steps, despite the improved final result. This diagnostic pair
changes both grid and timestep; it is not a matched-clock spatial sweep or
proof of early-time convergence. See the [full saved-time diagnostics](scientific/endwall-v91/time-diagnostics.json).

The n=128 study has a single 1024-step clock. A timestep-refinement study on
that mesh is required before full finest-grid numerical qualification.
Code-to-code agreement for this constant-property neutral-gas problem cannot
establish agreement with measured plasma rotation, optical diagnostics,
electrode transport or separation. Closed total-energy conservation also
does not independently validate local viscous heating.

The next admission work is matched-clock timestep refinement at n=128, followed
by explicit early-time/local wall-layer resolution checks. Only then should
this option be assessed in the driven apparatus model. None of these reference
results substitutes for held-out experimental validation.

## Reproducibility

All scientific execution uses offline Apple safe-dev VMs. Source copies,
input dictionaries, native OpenFOAM source/binary/library hashes, commands,
failed regression attempts, full state arrays and native fields are retained.
The unchanged n=128 baseline is kept separately from the candidate. Reused
V90 native packets are authenticated before reuse; no native result is relabeled
as a new solve. In stress-work negative-control rows, the `work0` flag refers
to the native comparison only; our backend retains full stress work.

The baseline is source copy `v91-endwall-source02`; the corrected candidate and
green regressions are `v91-endwall-source04`. The tested Flow SHA256 is
`43dfde8fdf544e74e9c93cb7417218056fbbfeb5a1279b0d2ba011e4cf071d8c`.
Historical V90 sources/results and source03's pre-fix regression failure remain
unchanged. The environment is Python 3.11.2, NumPy 2.4.6, SciPy 1.17.1,
scikit-fem 12.0.2 and native OpenFOAM Foundation 14.

Checks run inside safe-dev:

- `probe91.py probe-results`: exit0; reproduces exactly the four old failures.
- `inspect91.py inspect-results`: exit0; confirms the linear-shear mechanism.
- `test91.py tests-results`: the pre-fix copy exits1 (six tests cannot construct
  the new option); the corrected copy passes all34 tests, including seven new
  controls and bitwise legacy replay. [Green receipt](scientific/endwall-v91/evidence/v91-endwall-source04/scientific/endwall-v91/tests-results/controls.json).
- `refine91.py refine-results`: exit0; two unchanged native/backend cases.
- `candidate91.py candidate-results`: exit0; twelve corrected trajectories.
- `score91.py score-results`: exit1, intentionally retaining the failures above.
  [Original](scientific/endwall-v91/evidence/v91-endwall-source04/scientific/endwall-v91/score-results/original.json),
  [extended](scientific/endwall-v91/evidence/v91-endwall-source04/scientific/endwall-v91/score-results/extended.json),
  [fine](scientific/endwall-v91/evidence/v91-endwall-source04/scientific/endwall-v91/score-results/fine.json),
  [unchanged fine baseline](scientific/endwall-v91/evidence/v91-endwall-source04/scientific/endwall-v91/score-results/baseline-fine.json).
- Saved-time diagnostics: exit0; packet and source hashes verified before/after.
- `npm test`: 1,238/1,238 pass. `npm run typecheck`, `npm run build`,
  `npm run check:site`, `npm run check:assets`: all exit0. The exact 2,666-file
  app snapshot is `ccfc2619fbc2509e31034c4b9a86535a5d8e623f7f68a3c6f8510023fba1ab7c`;
  only Flow differs from the prior app gate. [Commands, log hashes and receipt](scientific/endwall-v91/app-final/execution.json).

The [full evidence archive](scientific/endwall-v91/evidence.tar.gz) contains
213 members and is 47,003,863 bytes; SHA256
`0c7ec0b162621a646d618fab388943536ee1308f1e0d4c99b4ecd909b775673d`.
Every member was rehashed after export; [export receipt](scientific/endwall-v91/export.json).
The [scientific directory](scientific/endwall-v91/README.md) maps source files,
controls and reproduction prerequisites. `numericalComparisonPass` and
`experimentalQualification` remain false.
