# Thick-wall FiPy convergence diagnosis

## Failure and causal test

The exact rejected v53 case is a 12 mm tungsten annulus, inner radius 0.12 m,
length 0.5 m, 16 cells, gas capacity 0.0006785840131753953 J/K, gas film
1000 W/K, coolant film 1 W/K, gas/coolant initially 500 K and wall 1000 K.
Five backward-Euler steps of 1/512 s are requested, without heat deposition.
The original FiPy 4.0.3 oracle fails reproducibly on the first step after
300 nonlinear iterations. Its normalized physical residual is
1.5977273101386072e-10 against the unchanged 1e-11 gate.

The execution path is `run_case` in `scientific/thermal-v53/reference-fipy.py`:
temperature-dependent enthalpy secants and logarithmic cylindrical
conductances → actual FiPy matrix assembly → SciPy LU solve → independent
per-node physical residual and temperature-change acceptance checks.

Controlled probes retain the frozen original oracle SHA256
`26c444105a496254fc33f99d2852469ca0f218ebf6679e0c414c7e48f38322ba`.
The baseline temperature stops changing, while the gas physical residual
is -2.682e-10 J and its linear residual is -2.680e-10 J. Thus this is a
linear-solve accuracy floor, rather than unresolved nonlinear oscillation.
Stable enthalpy/secant evaluation alone and stable physical-residual
evaluation alone both retain the failure. Changing only the unknown to
the step increment passes all five steps under the original criteria.
The last-step normalized physical residual is 1.516e-14.

Technically, the absolute-temperature right-hand side contains large
background storage/conduction terms. Global linear-solver accuracy is
insufficient for the tiny gas row, which the per-node physical gate
correctly rejects. The installed FiPy LU source was inspected: it scales
by the maximum diagonal and limits iterative correction to ten even when
`iterations=1000` is requested. In plain terms, tiny gas-energy changes
were being recovered alongside much larger wall-energy terms.
The pinned [FiPy 4.0.3 LU implementation](https://github.com/usnistgov/fipy/blob/4.0.3/fipy/solvers/scipy/linearLUSolver.py)
documents the corresponding linear-solver path.

## Fix

Solve for `delta = T_new - T_old`, resetting its old value to zero for each
physical step. Evaluate all nonlinear coefficients at the current physical
temperature. Move old-temperature conduction and the coolant offset into
the increment right-hand side, then reconstruct the physical temperature.
The coefficient matrix, backward-Euler discretization, material laws,
source deposition, signed boundary exchange and acceptance gates remain
unchanged. This does **not** improve the matrix condition number.

This is the smallest fix supported by the probes. Relaxing the residual
tolerance would accept a failed balance; increasing nonlinear iterations
would repeat a stagnated state; adding stable enthalpy algebra alone did
not address the measured cause. The browser kernel already solves step
increments, so this change corrects the independent FiPy reference rather
than changing the deployed simulator's physical behavior.

The actual-FiPy regression `tests/test_fipy_thickwall_v54.py` was run red
before the fix and green afterward. It exercises the original five-step
case, unchanged residual/energy gates and passive temperature bounds.

## Scope of qualification

Solver acceptance, mesh/time accuracy and physical calibration are separate.
The nominal gas-film time is about 0.679 microseconds. The original
1/512 s step does not resolve initial gas heating even when its implicit
energy balance converges. Endpoint refinement at the original horizon
therefore cannot establish initial heating-rate accuracy.

At 1000 K the adopted tungsten properties give diffusivity about
4.14e-5 m²/s and penetration scale `sqrt(alpha*t)` about 0.636 mm after
5/512 s. The 8- and 16-cell meshes have widths 1.5 and 0.75 mm.
The first thick-wall refinement attempt correctly failed its all-grids
contraction check: successive differences were 8.464e-5, 1.013e-4,
3.537e-5 and 9.307e-6 K. That negative evidence is retained. A finer
sequence tests the asymptotic regime separately; the penetration-scale
screen is a physical rationale, not itself proof of convergence.

The separate fast-gas timestep family uses a horizon of five nominal
film time constants. At 128 cells its wall spacing is 93.75 micrometres,
larger than the roughly 12 micrometre thermal penetration scale. Its
temporal convergence qualifies that fixed spatial discretization, not
the continuum early wall/interface field.

The model remains a one-dimensional radial solid with lumped gas,
prescribed interface/coolant conductances, fixed mass and geometry, and
300–1900 K tungsten properties. Numerical agreement does not calibrate a
Marathon machine or validate omitted radiation, axial flow or rarefaction.

## Rerun and independent audits

The final thick-wall campaign contains 22 cases and 2,875 accepted steps.
Every FiPy solve passes the unchanged physical residual gate; the maximum
reported value is 7.513e-14. Production comparison covers all 21 cases
within the browser's 128-cell boundary, checking every gas/wall value
(286,955 temperatures), signed cumulative cooling and passive bounds.
Its largest temperature difference is 4.596e-9 K versus the unchanged
5e-6 K gate. Its largest relative cumulative energy imbalance is 2.128e-14.
The 256-cell case is an external-only holdout, not a browser-domain expansion.

| Study | Evidence | Interpretation |
| --- | --- | --- |
| Spatial, 32/64/128/256 cells | Successive full-profile differences 3.537e-5, 9.307e-6, 2.352e-6 K; ratios 0.2631, 0.2527 | Approximately second-order endpoint contraction in the candidate resolved regime |
| Original horizon, 5–640 steps | Ratios 0.5060 → 0.50015; final difference 1.408e-6 K | First-order backward-Euler endpoint contraction on 128 cells |
| Fast-gas horizon, 5–320 steps | Ratios 0.4181 → 0.4874; final difference **0.135577 K** | Temporal contraction on the fixed discrete wall; finite error and unresolved fast solid boundary layer remain |
| Original 8–256 full spatial sequence | First ratio **1.1967** | **Fails** all-grids contraction; negative evidence retained |

`fipy.json` and `summary.json` deliberately retain `allPass:false` for the
full spatial sequence. Separate `qualificationPass:true` requires physical
checks, both temporal families and the physically screened spatial tail to
pass. The threshold remains 0.85; the coarse failure is not relabeled as a
pass. A common-radius interpolation diagnostic is interior-only and does not
replace the full-wall metric. Endpoint differences are convergence evidence,
not calibrated error bars or heating-rate validation.

Two reviewers implemented independent Decimal80 checks, importing neither
FiPy nor the production solver:

- The physics audit reconstructs every energy row, coolant exchange,
  conditional gas balance, entropy and passive bounds for all 2,875 states.
  Its maximum independently calculated normalized row residual is
  1.459e-13, still below 1e-11; maximum gas-row residual is 2.449e-13 J.
  Minimum system-plus-bath entropy increment is positive, 5.434e-9 J/K.
  It also independently evolves 35 short-case states: maximum difference
  5.242e-13 K. Analytic two-reservoir and insulated annulus self-checks pass.
- A separate absolute-temperature, 80-digit tridiagonal enthalpy solver
  evolves 15 states across the original case, the 128-cell stiff case and
  the fast-gas case. Maximum FiPy difference is 3.411e-13 K against its
  unchanged 2e-7 K gate. This is selected-case independent advancement,
  not an 80-digit rerun of all 2,875 states.

Agents wrote and independently reviewed the audit implementations; the
parent executed each one inside safe-dev and returned actual results for
review. A shared continuum closure can still share modeling assumptions.

## Evidence

Frozen source, original input and five controlled diagnostic traces are
retained in `scientific/centrifuge-v44/thermal54/diagnosis/`. Red/green and
study receipts under `scientific/fixes-v43/thermal54-*` identify the exact
host-to-guest input hashes and verify source before and after execution.
All project execution uses the offline Apple safe-dev VM, not the host.

Final gate: `python3 scripts/run-final-v44.py thermal54`, invoked through
`python3 scientific/fixes-v43/control.py thermal54-final -- ...`, passed
all ten commands on 574 immutable inputs, source SHA256
`7912df36dfcf581eb849cf4fbd3534420a9cc14d81a749e63bd35e54f61ddbd4`:

1. `npm test` — 1,135 passed, zero failed/skipped/cancelled.
2. `npm run typecheck` — passed.
3. `npm run build` — passed; existing large-chunk advisory remains.
4. `npm run check:site` — passed.
5. `npm run check:assets` — passed.
6. `node --import tsx scientific/fixes-v43/verify-release-worker.mjs` — passed.
7. `node --import tsx scripts/verify-fuel-release-v44.mjs` — passed.
8. `python3 docs/reviews/v42-collision-data-probe.py` — passed existing evidence gates.
9. `python3 scientific/thermal-v53/run-studies.py /work/home/thermal-v53-final-studies-thermal54` — all seven reference cases / 80 steps, nonlinear refinements and analytic Bessel check passed.
10. `/work/home/thermal-v53-venv/bin/python tests/test_fipy_thickwall_v54.py` — passed the original five-step regression.

New campaign command: `/work/home/thermal-v53-venv/bin/python scientific/thermal-v54/run-studies.py /work/home/thermal-v54-refinement-b`.
Its receipt identifies source snapshot
`e7db9c6b86762efe55dfef87bc3a4e1a10daacaa687a8691354904869ee974f0`.
The only subsequent source change before the final snapshot was the
independent numerical auditor's explicit support for the scoped reference
status; the oracle, case generator, refinement analysis and browser kernel
are byte-identical between those snapshots. Both independent audit commands
ran on the final `7912df...` snapshot. Full arguments and hashes are in
their `thermal54-{physics,numerics}-audit.receipt.json` files.

The 151-file built browser release remains exactly
`6b29e6159360b202d9073a76feca155d9377c118d2ac427582bf804acdf9992a`,
matching the previously published v53c build. No deployment or fresh live
browser verification was performed for this reference-only correction.

Durable evidence:

- [Final receipt and source manifest](../scientific/centrifuge-v44/thermal54/final/receipt.json)
- [Thick-wall study summary](../scientific/centrifuge-v44/thermal54/studies/summary.json)
- [Independent physical checks](../scientific/centrifuge-v44/thermal54/studies/audit-physics.json)
- [Independent numerical advancement](../scientific/centrifuge-v44/thermal54/studies/audit-numerics.json)
- [Physics review](reviews/v54-thickwall-physics.md), [numerics review](reviews/v54-thickwall-numerics.md), [refinement review](reviews/v54-thickwall-refinement.md)
