# Stage 6: measured adaptive-locality comparison

6 November 2026. **Implemented: an off-default adaptive spatial discretization and reproducible comparison. Not established: continuum transport convergence or improved separator prediction.** The original fixed grid remains the default. This report does not complete experimental validation or independently solve the Landau equation.

## Root cause and traced path

The actual path is `doublewell controls/config → simulateDoublewell → collisionCells → local density N·weight/V → collideCoulombCell → pair velocity map → torque/flux/regime diagnostics → plots/export`. Fixed cut-cell volumes are geometrically correct, but a partially filled cell spreads a sharp pulse over its full volume. Binary impulses at distinct positions also produce `(r_a−r_b)×Δp_a`. Increasing marker count at fixed cells does not remove either spatial approximation.

In plain terms, the old model collides particles that may be far apart and dilutes a compact source across larger boxes. Exact pair energy/linear momentum and a torque-corrected ledger cannot establish correct spatial transport. This increment tests a different partition rather than imposing an angular-momentum projection or changing physical density to obtain a better residual.

## Implemented method and compatibility

`src/collision-locality.ts` builds geometric midpoint bisections of the cylinder's bounding box. At each node it tries the longest physical dimensions first. It splits an over-target population only when each occupied child has at least one quarter of the target count; an empty child is a permitted vacuum part of the partition. Splitting stops at the target, the maximum depth, or when no acceptable geometric split exists. A target is not a guaranteed occupancy bound.

Each leaf uses the exact circle/rectangle intersection times its axial length. The existing exact area function moved unchanged to the locality module and is re-exported from the old engine path. No nearest-neighbor distance, pulse-overlap factor, thermostat or torque projection enters the pair rate. All representatives retain the same physical weight.

Optional configuration fields:

| Field | Meaning | Default if omitted |
| --- | --- | --- |
| `collisionMethod` | `fixed` or experimental `adaptive` | `fixed` |
| `collisionTarget` | Desired total representatives per adaptive leaf; integer 16–256 | 32 |
| `collisionMaxDepth` | Maximum geometric bisections along a branch; integer 3–24 | 15 |

Legacy missing-field configurations retain the fixed trajectory, history, destination and conservation results exactly. `cellsAcross` describes only the fixed grid; fixed-grid width ratios are suppressed for adaptive mode. Physical RMS/maximum pair-separation metrics are measured from the actual collided pairs, and display undefined when no pairs occurred. Raw zero-initialized accumulators remain available with their pair count.

## Conditional generator and unresolved biases

Conditional on a leaf of N equal-weight representatives and physical volume V, its density is `n=Nw/V`. The unchanged mixed random pairing uses effective density `n(N−1)/N` for even N, with partner probability `1/(N−1)`; odd N uses n with probability `1/N`. Thus each represented other partner contributes `w/V` to the infinitesimal empirical generator. Pair kinetic energy and linear momentum are conserved just as before.

This conditional statement does **not** make a position-selected histogram an unbiased estimator of physical density. Leaf selection, spatial averaging, finite occupancy, velocity shear, axis orientation and periodic seams still require convergence. A necessary refinement strategy increases target occupancy while reducing target/total count and maximum physical leaf size; holding target fixed is not a proof of consistency. No rigorous continuum-limit proof is claimed here.

Exports include `spatialCollision.initial/final` inventory, occupancy and density moments. `ΣN²w²/V` is the histogram's empirical density-squared integral. `ΣN(N−1)w²/V` removes the empirical self term for a **fixed** partition; it does not remove adaptive partition-selection bias. Neither moment alone quantifies the full velocity-weighted Coulomb rate.

## Actual 200 µs comparison: negative convergence result

Command: `./node_modules/.bin/tsx scripts/evaluate-locality.ts > assets/locality-comparison-log.txt 2>&1`.

Artifact: `assets/locality-comparison.json`. The final execution has **36 runs**, six independent whole-run seeds **11,22,33,44,55,66**, identical declared physical source/field/temperature/density/boundary/horizon, dt=100 ns, and maximum adaptive depth 15. It records full configs, source SHA-256 hashes, raw destination counts, final radial histograms, SI conservation scales, collision diagnostics and runtime. Source hashes were checked unchanged after execution. Summed measured simulation runtime was **77.61 s** on this host; this is not a browser performance guarantee.

The table gives means across six runs. Residual percentages use the engine's positive initial Pθ scale, not signed net Pθ or separator accuracy. Density ratios compare the initial marker-mean assigned cell density with the declared source density. Unresolved fraction means the fraction of sampled snapshots containing unresolved local estimates, not the fraction of all particles that are invalid.

| Method | Markers/species | Target | Raw Pθ residual, % | RMS pair separation, m | Initial density ratio | Unpaired exposure, % | Unresolved snapshots, % |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Fixed, 3 cells across | 128 | — | 1.4742 | 0.08254 | 0.6814 | 11.039 | 100.00 |
| Adaptive | 128 | 32 | 0.6844 | **0.12769** | **0.5842** | 2.227 | 34.30 |
| Fixed, 4 cells across | 512 | — | 1.1852 | 0.06520 | 0.4205 | 5.574 | 98.28 |
| Adaptive | 512 | 32 | 0.6834 | 0.07735 | 0.7093 | 2.406 | 74.19 |
| Adaptive | 512 | 64 | 0.6613 | 0.10110 | 0.6884 | 1.169 | 23.33 |
| Adaptive | 2048 | 64 | 0.5781 | 0.06350 | 0.6951 | 1.195 | 76.13 |

**The low-count adaptive candidate reduces raw torque while making actual pair separation and source-density dilution worse.** This directly demonstrates why a smaller Pθ residual cannot select a more accurate physical model. Reducing collisions through extra dilution can also reduce torque. No automatic default switch is justified.

At 2048/species, the approximate 95% Student-t interval for mean raw Pθ residual is **0.5211–0.6352%**, still above the chosen 0.5% positive-scale target. Relative to 512/species at target 64, the paired-seed end-B fraction change is **+1.082 percentage points**, with interval **−1.402 to +3.566 pp**. That does not establish the chosen one-percentage-point outlet accuracy. End-A's interval **−1.246 to +0.171 pp** also exceeds that budget. The 5-mm survivor-radius target is met by those particular paired intervals, which does not rescue the failed outlet/locality gate.

The tolerances were encoded before the final matrix: one-percentage-point outlet change, 5-mm survivor-radius change and 0.5% raw Pθ scale. They are educational engineering targets, not universal physical standards. There is no claim that these targets alone suffice for scientific validation.

Intervals use six independent whole-run observations (df=5), with shared seed labels for paired method/resolution differences. Different particle counts do not give identical realized populations for both species. These approximate intervals are not independent-ion Wilson bands or rigorous rare-event bounds. When all observed runs have identical values, interval bounds are withheld rather than turning unobserved tails into a zero-width certainty. Raw observations remain exported. No independent dt/depth matrix or collision-on/off effect-size gate is completed by this method comparison.

## Verification and fixes during review

`./node_modules/.bin/tsx --test tests/collision-locality.test.ts tests/doublewell-dynamics.test.ts` — **16 passed, 0 failed** (7 new, 9 adjacent). New checks cover disjoint geometric leaves, single inventory representation, exact physical weight, depth termination, mixed-ion pair energy/momentum, legacy missing-field compatibility, open source/sink and signed flux ledgers, undefined no-pair metrics, density self-counting and rejected invalid settings.

Independent review reproduced misleading fixed-grid width metrics in adaptive mode: they referred to an unused grid. These are replaced with the adaptive settings while actual physical pair separations remain measured. The zero-pair RMS initially displayed zero, suggesting exact locality despite no observations; it now displays undefined. These smallest display-boundary corrections avoid inventing an adaptive equivalent cell width or treating a missing ensemble as zero distance.

Execution used the user's scoped host exception after safe-dev service access was denied. No browser-origin workaround, policy/hook weakening or credential access was used. Root owns the final integrated typecheck/build/suite and publication gate.

## Remaining Stage 6 gate

This increment supplies the candidate, diagnostics and a reproducible **not-established** result. It does not satisfy the continuum transport gate. Required next evidence: independent dt/depth/occupancy and grid-orientation/seam tests at the intended horizon, higher-occupancy local-state coverage, a genuinely resolved source-density profile, and comparison with an independently validated finite-time Landau reference. Keep failed cases and raw outputs visible.

Fresh primary literature also describes an alternative regularized variational PIC–Landau approach: [Bailo, Carrillo & Hu, 2024](https://arxiv.org/abs/2401.01689). Its reported mass/charge/linear-momentum/energy/entropy structure is a reason to investigate an independent reference, not evidence that this geometric tree implements that method or conserves spatial angular momentum. Existing [Wang et al. 2008](https://doi.org/10.1016/j.jcp.2007.12.027) supports the pair-scattering/time-error discussion; it does not validate this adaptive spatial partition.
