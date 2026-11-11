# Independent locality diagnosis, v33

8 November 2026. No production code was edited by this reviewer. Five current-
source, full-200-µs diagnostic runs reproduce and localize the sampling failure.
They do **not** qualify transport: only seed101 was studied, the original 1%
unresolved-exposure budget still fails in every configuration, and no paired
observable equivalence or joint refinement certificate is supplied here.

## Execution path and hypotheses

The actual live path is doublewell-dynamics.simulateDoublewell → collide(dt/2) → collisionCells →
axisymmetricCollisionCells → collideAxisymmetricCell → collideCoulombCell, then
the orbit advance and another half collision. The record path partitions the
same active population and transforms velocities into local cylindrical frames
before inspectDoublewellRegime. A present mass/charge species needs four local
representatives to estimate its thermal state; otherwise every representative
in that cell is marked unresolved. executeSeed trapezoid-integrates unresolved
fraction × active population over the saved times and divides by active exposure.

The ranked hypotheses were stated to root before probing:

1. Evolving occupancy, especially in the expanded pulse, is too small for the
   fine fixed r-z mesh. Increasing N at fixed mesh should reduce exposure.
2. Marking an entire cell unresolved when one present species is sparse amplifies
   the sparse-species mass. Decomposing those two contributions can measure it;
   it does not justify weakening the diagnostic.
3. The approximately160-snapshot cadence aliases short unresolved intervals.
   Doubling diagnostic cadence at identical dynamics distinguishes this from
   actual lack of markers.

Root authorized a bounded one-factor diagnostic matrix. Exact settings and
budgets were frozen in probe.ts and its source map before execution: seed101,
200µs, dt100ns, Nanbu, source-fitted annular cells; 60s per run, 180s combined.
No existing scientific gate was changed. The last case changes only record
cadence from nominal160 to320; this changes neither RNG nor physical timesteps.

## Results against the unchanged budgets

| N/species; nr/nz | Raw angular maximum | Unresolved exposure | Sparse-species own exposure | Other representatives in the same cells |
| --- | ---: | ---: | ---: | ---: |
| 1024;12/9 | 0.0423651% | 26.8704% | 11.1538% | 15.7167% |
| 4096;12/9 | 0.0260674% | 6.94444% | 1.32015% | 5.62429% |
| 4096;12/3 | 0.0448909% | 3.83933% | 0.341003% | 3.49833% |
| 4096;6/3 | 0.0839421% | 1.88413% | 0.089755% | 1.79438% |
| 1024;12/9,320 records | 0.0425827% | 26.6557% | 11.1152% | 15.5405% |

Each single seed meets the raw-angular budget of 0.1%, but all exceed the 1%
unresolved-exposure budget. The existing production contract reports this
coverage as UNKNOWN; it is not conclusive physical disagreement and cannot
qualify transport. This is not a six-seed angular certificate. Runtime was
8.05/31.66/30.26/30.61/7.64s, all complete, no timeout or unrun case. Aggregate
recorded subprocess time of 108.22 s is below the prospectively declared 180 s cap.

The production unresolved fraction is independently reconstructed at every
snapshot from saved species occupancies, then integrated independently. The
code asserts per-snapshot agreement within 1e-14. The N1024/r12/z9 species,
history, conservation, collisions, regimeHistory and spatialCollision objects
are also exactly equal to the immutable v31 seed101 artifact. The diagnostic
adapter therefore has a direct unchanged-physics baseline, not only a claim
that extra recording ought to be harmless.

A separate standard-library checker audits 74,631 occupied saved cells. Exact
annular geometric volume matches every recorded volume; density × volume
recovers weighted population within 4.63e-16 relative. Species counts sum to the
independently saved history populations at every snapshot. All count-based
unresolved fractions match the producer. These are geometric/inventory checks,
not continuum transport validation.

Cadence doubling gives exactly equal species exits, collision totals and final
physical state. Only sampled maxima and quadrature details differ. Exposure
changes by 0.2147 percentage points, whereas the failure exceeds the budget by
more than 25 points. Snapshot aliasing cannot explain this retained failure.

## Where resolution is lost

Every N4096 run starts with zero unresolved representatives. At N4096/r12/z9,
unresolved exposure of 6.94444% decomposes by fixed *initial-support regions* into:

- Inside r < 0.08 m, z < 0.15 m: 0.452904%.
- Outside only the initial radial support: 1.45804%.
- Outside only the initial axial support: 1.02540%.
- Outside both: 4.00811%.

Approximately 93.5% of unresolved exposure is outside the initial support.
This is the evolved/expanded pulse and its tails; the regional classification
does not imply every such particle is a dilute-tail particle. It is not a new
support estimator or a density renormalization. At N4096/r6/z3 all unresolved
exposure is outside that original support. The failure develops dynamically;
an initially source-fitted mesh is insufficient to resolve the later population.

The whole-cell rule amplifies the effect, but it is not an algebra bug. At the
fine N4096 mesh, even the genuinely sparse species alone contribute1.32015%
exposure, above1%. Ignoring other representatives in their cells would not
rescue that case and would silently change the frozen gate's meaning.

The actual fixed annular volumes, particle weights and random-pair normalization
were traced and no new demonstrated error was found. The earlier independent
volume, self-exclusion and torque identities remain relevant. Finite-radius
collision torque is still (ra−rb)Δpθ; a smaller raw sum does not establish local
sampling or transport fidelity. The coarser mesh improves occupancy while
increasing raw angular drift, exactly the existing geometry/statistics tradeoff.

## Cause, remedy and alternatives

The supported root cause is inadequate finite-marker support in physical
collision cells as the pulse evolves. In technical terms, an initially uniform
source spreads over a substantially larger r-z support and species populations
separate; present species often have fewer than four representatives locally.
Simply, the browser tracks too few particles in the regions where the beam has
spread. Refining cells spreads the same small sample even thinner.

There is no justified local production patch in this scope. N4096 is the current
browser maximum and does not pass even the coarser sampled geometries. A valid
next numerical remedy is a separately budgeted offline high-N executor, followed
by joint particle/radial/axial/timestep/seed studies under the same gates. The
existing equal-weight axisymmetric binary operator can be reused. Raising a
public browser cap alone is not a physical fix and would need a deliberate
execution-budget design; an offline runner can preserve the interactive budget.

Do not clip low-density tails, enlarge diagnostic cells while retaining fine
collision cells, replace actual density by declared density, subtract the torque
ledger from the raw gate, or choose a coarse mesh merely because it passes an
occupancy check. Those alternatives conceal unresolved regions or change the
physical collision operator without demonstrating convergence. Position-adaptive
cell merging could be studied as a separate method, but has data-dependent
density bias and is not an immediate justified replacement.

For planning only, in a homogeneous independent Poisson cell model with mean
lambda representatives per species, the unresolved probability seen by a marker
of A is 1−(1−pA)(1−pB), where pA=e^−lambda(1+lambda+lambda²/2) and
pB=e^−lambda(lambda+lambda²/2+lambda³/6). It falls from1.303% atlambda10 to
0.6104% atlambda11. This explains why a mean of four is inadequate for a1%
exposure target. It is an approximate planning model, not a bound for the
inhomogeneous collisional pulse and not a certificate that a chosen larger N
will pass. Further high-N runs must be prospectively planned, not extrapolated
into PASS from this table.

## Exact execution and evidence

Distinct copied Apple guest safe-dev-b401d80ff50e9a42, stage
/tmp/mass-spinner-transport33-locality. No home, credentials, SSH agent or control
socket was mounted. Only dependency download used online networking. All
simulations and analysis were offline. All valuable guest outputs are preserved
in /tmp/mass-spinner-transport33-locality-final-export and copied into
scientific/transport-v33/locality.

Commands used (with absolute safe-dev and -C stage path):

```
init
sync --replace-guest
run --online -- npm ci --ignore-scripts
run -- python3 run.py
run -- python3 - < /tmp/mass-spinner-transport33-locality/analyze.py
run -- python3 - < /tmp/mass-spinner-transport33-locality/check.py
export /tmp/mass-spinner-transport33-locality-final-export
```

The source adapter adds occupancy recording and optional diagnostic cadence only.
Its exact diff is diagnostic-adapter.diff. The full executed src copy, original
dynamics file, source maps, probe, hard-timeout runner, analysis script, per-run
full raw results, gate plan, subprocess logs and status are retained. Original
dynamics SHA256ea30d19703dfd83d1f8bee7ba20c47bfee95df60af9d4f2cb8600dbdd201557f;
adapter SHA2560f9d87a9d9195cbd72801c4ca28dbab2ceb83822755df29e259412ab07cff39c.
The checked source-map file SHA256 is
77f83a6bc8120835d92fde6115e0f94658967151f004991794085da8ca37f643.
It is verified before and after every simulation. The separately streamed
analysis SHA256 is fd926d8f0896d5f160f935eaefc5e0fc251fa1547decff12173ebf902fd95b9c.

No new physical validity, whole-study PASS, browser/mobile/GPU observation,
experimental calibration, production build or deployment is asserted by this
review. Root owns final integration and any subsequent fix/review campaign.
