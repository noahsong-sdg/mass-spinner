# PETSc common-temperature distribution study, v13

The current Q2 collision reference remains **unqualified**. The full 0.5 ms distribution baseline reproduces v12 exactly and its number/energy/momentum invariants pass. Spatial refinement of distribution evolution fails the prospective budget. Independently certified nonnegative mesh16 fields exhibit an increase of H, corresponding to a decrease of physical entropy. Resolving diagnostic quadrature and requiring tighter nonlinear function convergence do not remove the observed increase. No Landau kernel, initializer, operator quadrature, clipping or renormalization was changed.

This scientific slice does not replace the production browser collision backend or redeploy the site. Its failed gates remain failed; the study supplies evidence for the next corrective method.

## Scope and prospective decisions

All cases use masses 40/84 u, charge +e, density 5×10¹⁷ m⁻³ each, temperatures 5/5 eV, lnΛ=12, Q2 and the v12 backward-Euler/direct-LU Landau operator. Domains extend to 6 initial component standard deviations for each species. The full baseline is 12×24 cells, dt=5 µs, and 0.5 ms. Meshes 8×16/16×32 and timesteps 10/2.5 µs have a separate 0.1 ms horizon; they do not qualify 0.5 ms refinement.

Each plan was frozen and independently reviewed before its respective dynamics:

| Plan | SHA-256 |
|---|---|
| Original distribution study | `cc45ee538d0faa176c321ff7e9eb3d92b542a1b783cd96233278aba0b6a68531` |
| One-step decreasing-dt slopes | `377954a87c71c0b9b412dc62218b4b5b989a8d5ee4f7884bbac9ad1083a20e15` |
| Matched function-convergence control | `1f644e83000a68a36b5d0a841d186bf324c889d8d1181af73b99ed84a62c4b04` |

Fields use the common normalization `F=v0³f/n0` and measure `2πr dr dz`. H denotes `Σ∫F log(F)d³v`, requiring a nonnegative field with the zero limit defined. H+ denotes the separately labeled positive-part diagnostic for signed fields. Per-particle H changes divide the **summed raw species H change** by the fixed actual initial ΣN, without snapshot normalization.

## Actual fields and baseline reproduction

Actual initial and every evolved timestep were exported as native PETSc Vec files and explicit cell coefficients, basis, original quadrature and geometry. Native VecLoad roundtrips have exactly zero coefficient error. Polynomial reconstruction verifies original FE integrals, then evaluates Gauss8/16/32 on the same coefficients. This is distribution evidence rather than moments-only reconstruction.

The baseline started `2026-11-07T06:19:35.011116+00:00`. Its 101 checkpoints and setup have **2656 binary64 numeric scalars identical** to saved v12 stationarity, maximum absolute delta 0. The comparison is `results/baseline/v12-identity.json`; reference SHA is `c112a505fd370554f7d3321ea8ca092203b4b06f0d66538954927c9ab0ddf795`.

| Case | Horizon | Max H+ adjacent increase/N0,G32 | Max H+ cumulative increase/N0 | Max signed-field L1 drift/Nspecies0 | H16→32 sensitivity/N0 |
|---|---:|---:|---:|---:|---:|
| mesh12,dt5µs baseline | .5ms | 7.182e−7 | 1.841e−6 | 6.559e−4 | 7.33e−15 |
| mesh8,dt5µs | .1ms | 2.744e−6 | 2.130e−5 | 2.603e−3 | 3.66e−7 |
| mesh16,dt5µs | .1ms | 7.915e−8 | 1.159e−7 | 1.503e−4 | 6.66e−16 |
| mesh12,dt10µs | .1ms | 9.370e−7 | 1.324e−6 | 4.812e−4 | 2.89e−15 |
| mesh12,dt2.5µs | .1ms | 4.818e−7 | 1.332e−6 | 4.842e−4 | 2.89e−14 |

The baseline passes its 1e−3 L1 stationarity budget but fails 1e−8 adjacent and cumulative H+ budgets. Its 16→32 L1 sensitivity 4.52e−7 passes 1e−6. Original Gauss3 relative-H failure 8.855393e−8 is reproduced; denser integration does not cure it. Mesh8 H and L1 diagnostics are unresolved at prospective quadrature thresholds; its G32 values alone cannot qualify the case.

Dense baseline samples find negative number fractions up to 5.49e−16. Small negative mass can pass the 1e−10 mass budget while making full H undefined; these are different requirements. The independent review uses exact-rational Q2 Bernstein certificates or witnesses rather than nodal/sample positivity. Its main five-case audit covers 195 checkpoints/390 fields with no unresolved certificates and certifies all 42 mesh16 fields nonnegative. The certified-positive pilot has independently measured full-H increases 7.914744e−8 and 2.667636e−8/N0. Thus tiny negative tails cannot explain that controlled failure. See [the independent report](PETSC-EQUILIBRIUM-INDEPENDENT-V13.md) for certificates and coverage limits.

Independent all-state coverage checks raw/source/native identities, polynomial moments, original-quadrature H3 and positivity certificates. Independent dense H8/16/32 covers selected initial, peak-increase pairs and planned-time fields; it does not duplicate the producer's all-state dense integration. The producer computes H3/8/16/32 for every saved state. This distinction limits the independent claim.

The sealed producer summary retains its historical `fullHValidity: UNKNOWN pending independent certificate` field. It is producer-only output, not the final combined status: the linked independent certificates establish mesh16 nonnegativity and expose negative witnesses in the other main cases. The producer artifact is preserved rather than rewritten after independent review. Reference acceptance remains false despite resolving mesh16 H validity.

## Spatial and temporal refinement

Comparisons integrate `(Fcase(t)−Fcase(0))−(Fbase(t)−Fbase(0))` on the **union of actual cell boundaries**, divided by baseline12's actual initial species number. Raw initial projection differences are separately retained: mesh8 vs12 L1≈0.006765; mesh16 vs12≈0.002137.

At 100 µs against baseline12/dt5µs:

| Comparison | Species0/1 increment L1 | 16→32 sensitivity,species0/1 | 2e−4 budget |
|---|---|---|---|
| mesh8 | 2.410e−3 /2.049e−3 | 5.45e−7 /1.48e−6 | FAIL /UNKNOWN resolution |
| mesh16 | 4.217e−4 /3.890e−4 | 4.46e−8 /4.45e−8 | FAIL /FAIL |
| dt10µs | 3.294e−6 /3.864e−6 | 3.79e−11 /9.82e−11 | PASS /PASS |
| dt2.5µs | 1.644e−6 /1.974e−6 | 4.22e−11 /9.82e−11 | PASS /PASS |

The fine spatial failure is resolved by diagnostic quadrature. Temporal agreement at 0.1 ms is much better, but passing moments or short timestep agreement does not qualify spatial discretization or the 0.5 ms horizon. `results/refinement.json` retains 50/100 µs values at all integration orders. `results/summary.json` applies per-comparison resolution before assigning PASS/FAIL.

## Finite-dt slopes and nonlinear termination

The decreasing-dt study preserves exact initial mesh16 JSON and native-Vec bytes. Stable pointwise increments use `δF log(F0)+F1 log1p(δF/F0)`, with δF evaluated from coefficient differences, explicit zero limits, NumPy summation and `math.fsum`. This avoids subtracting two large nearly equal H totals.

| One-step dt | Stable H32 change/N0 | Rate per second | Final nonlinear norm /iteration | Reason |
|---|---:|---:|---|---|
| 5µs pilot context | 7.915e−8 | +0.0158295 | not monitored in pilot | context only |
| 1µs | 3.424480069e−8 | +0.0342448 | 5.212e−14 /5 | step norm |
| .1µs | 4.007893402e−9 | +0.0400789 | 5.655e−15 /4 | relative function norm |
| .01µs | 3.765070656e−10 | +0.0376507 | 4.561e−14 /3 | step norm |

The last two rates differ 6.06%, within the prospective 10% sensitivity criterion. For 10 ns, measured quadrature/cancellation sensitivity is 5.04e−16 per particle; positive signal exceeds 20 times the frozen 1e−13 floor. The independent followup audit certifies all 16 endpoint fields nonnegative across the three dt cases and strict control, and independently reproduces the stable increments. These are defined-H finite-dt observations, not a direct semidiscrete derivative proof or rigorous residual-to-H bound.

The separate 1 µs control sets `stol=0,rtol=1e−13,atol=1e−14,maxit=50`. Absolute tolerance dominates relative target≈7.62e−17. It reaches function norm 2.10933e−15 at iteration 6,`CONVERGED_FNORM_ABS`, in 23.34 s total control wall time. Positive H32 change/N0 remains 3.424479972e−8, differing from matched default by only 9.66e−16. Final PDF L1 differences are 2.12e−15/2.68e−15. Therefore step-norm termination is not the dominant explanation **for this matched case**. This does not establish a general residual-to-entropy bound.

The independent reconstruction also finds the strict-control H-increment change −9.659909889e−16 per initial particle and maximum final-field L1 difference 2.67764716e−15, agreeing with the producer inside the frozen thresholds. Endpoint positivity, stable entropy difference, actual function convergence and the matched full PDF are all checked; none is inferred from moments alone.

## Interpretation and limits

Diagnostic underintegration alone is excluded for resolved mesh12/16 observations. Certified-positive fields have a defined H increase; a tighter function-converged solve retains the positive increment. Projection makes initial Q2 fields different from exact Maxwellians and explains why nonstationarity is possible; projection alone does not explain increasing continuum H. A restricted exact common-temperature Maxwellian still cancels the Landau bracket pointwise, so a finite box alone is insufficient as a cause.

For convex H and an exactly solved backward-Euler step of an H-dissipative semidiscrete ODE, convexity implies nonincrease. Evidence therefore implicates discrete entropy structure and/or numerical operator/solve errors beyond the tested termination criterion. Ordinary Q2 Galerkin lacks an exact `log(F)` test function; this is a plausible structural mechanism, not demonstrated attribution between representation and operator integration. Operator quadrature was deliberately unchanged. No direct mass-inverted residual contraction or discrete-equilibrium construction was performed.

Q1 was not substituted merely for positivity: it cannot exactly represent the quadratic energy invariant in the test space. A corrective method must address positivity, equilibrium and entropy together, then meet the same distribution gates. Overall reference acceptance remains **false/UNKNOWN**.

## Pipeline fixes and verification

Two concrete pipeline fixes were necessary. Cached PETSc pkg-config retained a project-local `.venv` rpath removed by safe-dev sync, so the wrapper could not find an installed math library. An explicit rpath to pinned `/work/home/petsc-env-v12/lib` fixes this loader boundary without mutating the main package or numerical operator. Failed pre-dynamics metadata remain in `diagnostics/link-failure`.

Offline raw verification previously required declared records only as a subset, allowing an unsealed stale checkpoint to go unnoticed. Exact sealed membership now rejects that persisted-data inconsistency, permitting only the two documented derived files. Regressions cover stale/NUL checkpoints, post-manifest byte mutation and a one-bit scalar identity mismatch. This protects provenance rather than masking a physics failure.

All installation, compilation, tests and science ran inside the approved main Apple safe-dev VM, using copied, explicitly synced sources. NumPy 2.4.6 was hash-installed in a separate analysis venv against its [published wheel checksum](https://pypi.org/project/numpy/2.4.6/#files). Solver and analysis threads were pinned to 1, with at most 3 workers. Pilots projected 222.3 MiB combined RSS and 116.7 MiB artifacts, below 1 GiB/200 MiB. Baseline solver time was 725.824 s; original scheduler 730.765 s. Followup wall caps were enforced through in-guest GNU `timeout 300` and `timeout 90` process groups.

The optimized wrapper was built and reused with all five input hashes rechecked: driver`9c2ea2…`, Landau object`0e0db7…`, PETSc library`ea4ff3…`, generated output-only source and wrapper`7f9f3b…`. All 13 focused tests passed; actual output is `results/test-output.txt`. Runtime/config source is 658 non-test lines, including the unchanged 80-line export header and all three plans. Immutable source snapshots are provenance data. Exact hashes and unchanged-input evidence are in `results/final-provenance.json`.

Raw files, source copies, diagnostics and manifests were fsynced before export. All 1361 original, 1475 slope and 1535 final transfer hashes passed on the host before any following reset. The final 1535-hash check also passed in the authoritative package. Earlier manifests under `provenance` explicitly refer to their earlier source snapshots. The guest is retained; [the README](../scientific/petsc-equilibrium-v13/README.md) gives exact commands and artifact contracts.
