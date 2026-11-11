# V54 thick-wall refinement re-audit

## Evidence checked

Read-only review of `scientific/thermal-v54/refinement-fipy.py`,
`refinement-production.ts`, the executed `thermal54-refinement-b.log` and receipt,
and the independent `thermal54-physics-audit.log` and
`thermal54-numerics-audit.log` under `scientific/fixes-v43/`.
This reviewer did not execute project code on the host. Parent-owned safe-dev
execution returned exit 0; its receipt verifies the source before and after,
snapshot SHA-256 `e7db9c6b86762efe55dfef87bc3a4e1a10daacaa687a8691354904869ee974f0`.
The case packet hash is
`98cf9cd8285593845d3af3e47b9bc9025bafdf5c7d2093427dba44839c882903`;
the FiPy result hash shared by both independent auditors and production is
`ea36aa2d3a58bdd3a7052bb6f9eb8c015a763dcc31fb66be1ac43b55096fdc48`.

## Preserved negative result

The full-grid spatial claim **still fails**. At the original late horizon
5/512 s and 160 steps, maximum endpoint field differences are:

| Grid pair | Difference, K | Next-pair / current-pair |
| --- | ---: | ---: |
| 8 → 16 | 8.46432815251319e-5 | **1.1967277302223738 — fail** |
| 16 → 32 | 1.0129496217814449e-4 | 0.34917996231896364 |
| 32 → 64 | 3.537017107646534e-5 | 0.26312889638497694 |
| 64 → 128 | 9.306914080298156e-6 | 0.2527070286720925 |
| 128 → 256 | 2.3519226033386076e-6 | — |

`failedComparisons` explicitly retains `spatial-n8-steps160`; spatial
`allGridsContract`, spatial `allPass`, and campaign `allPass` remain false.
No contraction threshold was loosened: resolved signals above 1e-8 K still
require ratios below 0.85. Raw converged fields are saved before physical or
summary assertions, so a failed analysis no longer discards its evidence.

The nonmonotonic coarse result is consistent with an unresolved short-time
wall layer: at 1000 K, alpha = 4.143613428543454e-5 m²/s and
sqrt(alpha t) = 0.636121 mm. The 8- and 16-cell widths are 1.5 and 0.75 mm.
Also, the original metric samples changing cell centers and includes an
interpolation error. These explain why coarse-grid monotonicity is not an
appropriate inference; they do not prove a unique cause of its sign.

## What the scoped qualification establishes

`qualificationPass = true` is a separate, narrower claim. The prospective
cell-width screen selects a candidate tail beginning at 32 cells. The screen
alone does not certify resolution: the actual retained maximum-field metric
must then pass at least two successive unchanged contraction gates. Its tail
ratios are 0.263129 and 0.252707. The additional 256-cell FiPy point is external
only; production retains its 128-cell domain.

All passive energy, signed coolant, entropy-with-bath and temperature-bound
checks passed for 22 cases / 2,875 accepted states. Maximum FiPy nonlinear
residual is 7.512658535492937e-14 against the unchanged 1e-11 criterion.
The fixed-128-cell late-endpoint temporal family contracts from 0.506016 to
0.500153, with final adjacent difference 1.407678041687177e-6 K. The separate
fast-gas temporal family contracts from 0.418135 to 0.487375; its final
160→320-step difference remains **0.13557699331795448 K**.

Production compares every accepted gas and liner temperature for all 21 cases
inside its grid domain: 286,955 temperatures, maximum difference
4.596131475409493e-9 K versus the unchanged 5e-6 K gate. Maximum normalized
cumulative energy imbalance is 2.1279259814027376e-14. The exact originally
failed 16-cell / 5-step case differs by at most 1.2516920833149925e-10 K.
Production explicitly requires the external scoped qualification and the
visible negative full-grid record; it does not silently accept a failed
reference as a full-grid pass.

Independent Decimal80 physical equations passed all 22 cases, including
per-node balance, gas-row balance, passive bounds and entropy. A separate
absolute-temperature Decimal80 nonlinear solver passed 15 states across the
original, late-time coarse-step and fast-gas coarse-step cases; its maximum
FiPy difference was 3.410605131648481e-13 K against 2e-7 K. These checks support
the discrete solution, not continuum or material-model calibration.

## Limits and verdict

No blocker found in the scoped qualification or result bookkeeping. The
full-grid failure is visible and must remain visible in any summary.
The late-horizon endpoint study does not resolve the initial gas transient.
The fast family establishes temporal contraction of a fixed discrete wall;
its 93.75 µm cells do not resolve the roughly 12 µm fast wall diffusion layer.
The common-radius companion is an interior-domain diagnostic: its first
radius is 0.120747671 m, outside the strongest inner boundary layer, so it
cannot substitute for the original maximum-field gate. Neither endpoint
contraction nor close cross-code agreement establishes experimental Marathon
fidelity, a uniform whole-history error bound, or complete continuum spatial
convergence at early times.
