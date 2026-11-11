# Independent fresh-seed confirmation of the version-10 collision candidate

7 November 2026 UTC. This is the additional confirmation batch specified prospectively in [the version-10 plan](CONVERGENCE-PLAN-V10.md): sixteen fresh whole-run seeds **1001–1016**, the two finest source-fitted annular resolutions, and a matched finest collision-off control. It is separate from the six exploratory seeds and is not pooled with them after inspection.

The source graph was already frozen and independently checked. This agent changed no production, test, package or existing runner files. The computational plan is `assets/convergence-confirmation-plan-v10.json`, written before starting any confirmation run. All **48 declared runs** are mandatory regardless of early results. The settings remain the original 200 µs physical case, dt=100 ns, original density/source/fields/temperatures, and unchanged version-9 engineering budgets.

| Level | Radial intervals | Markers/species | Collisions |
| --- | ---: | ---: | --- |
| rz8-N2048 | 8 | 2048 | on |
| rz12-N4096 | 12 | 4096 | on |
| rz12-N4096-off | 12 | 4096 | off |

The spatial comparison is a joint N/r–z refinement, not a fixed-N estimate. `collisionSourceAligned:true` inserts the known initial pulse interfaces into the fixed annular grid; it does not use realized positions or change collision density. Every actual face and meridional pair distance remains recorded by the engine.

## Execution and provenance

Four independent CPU processes run the existing sequential CLI with seed subsets 1001–1004, 1005–1008, 1009–1012 and 1013–1016. Each executes all three levels; no subset is an acceptance certificate. Concurrent wall times include contention and are not summed as measured CPU time.

```
./node_modules/.bin/tsx scripts/run-convergence.ts --plan assets/convergence-confirmation-plan-v10-part1.json --output assets/convergence-confirmation-v10-part1.json
./node_modules/.bin/tsx scripts/run-convergence.ts --plan assets/convergence-confirmation-plan-v10-part2.json --output assets/convergence-confirmation-v10-part2.json
./node_modules/.bin/tsx scripts/run-convergence.ts --plan assets/convergence-confirmation-plan-v10-part3.json --output assets/convergence-confirmation-v10-part3.json
./node_modules/.bin/tsx scripts/run-convergence.ts --plan assets/convergence-confirmation-plan-v10-part4.json --output assets/convergence-confirmation-v10-part4.json
./node_modules/.bin/tsx assets/convergence-confirmation-aggregate-v10.mts
python3 assets/verify-confirmation-v10.py
```

The archived aggregator checks the original plan, exact configs, complete disjoint seed union, all source-file hashes, each part's SHA-256 and all 48 unique level/seed pairs. It then uses the frozen `summarizeConvergence`; no alternative estimator changes the declared result. The full aggregate records the original-plan, part-artifact and aggregation-code hashes. The separate Python auditor imports no simulator code and independently recomputes every summary, paired comparison interval/verdict and physical-effect interval using the declared pointwise Student-t method (df=15, rounded critical value 2.131450).

## Acceptance boundary

An interval must fit entirely inside the original budget to pass. No observed spread withholds its interval. These approximate pointwise intervals are over independent complete runs, not over interacting ions, and are not simultaneous bands or distribution-free guarantees. A collision-on/off interval excluding zero establishes a model effect at those settings, not a bound on continuum bias. Sparse thermal-regime coverage, absent independent sensitivity cases and experimental validity remain separate gates even if outlet precision improves.

Host execution follows the project's explicitly delegated user-scoped exception after inaccessible safe-dev service. No isolation settings, hooks, credentials, browser policy or deployed origin were accessed or changed. The parent owns final integration, publication and repository checks.

## Executed result: FAIL overall, narrower specified successes

All **48/48 declared runs completed successfully**, with all four CLI processes exiting 0. Concurrent elapsed wall time was **256.605 s**; summed run wall times were 1011.156 s under contention, not measured CPU time. The aggregate uses executed source hash `8fb6f995e56e9fe0e2f80a75e0c6cabf1b042a72efb432694cd52397afc5b11a` and records all thirteen source-file hashes. No seed, physical input, budget or planned level was removed.

The full declared gate is **FAIL** because the coarser c8/N2048 control exceeds the original 0.1% raw-P budget in three fresh seeds. A passing finest level does not erase that failure. Sampled local coverage and the full spatial comparison remain **UNKNOWN**, and the original missing sensitivity/effect-versus-continuum-error checks remain open.

| Level | A axial fraction, % ± pointwise 95% half-width | B axial fraction, % ± half-width | Maximum sampled raw Pθ/positive scale, % | Maximum sampled unresolved exposure, % |
| --- | ---: | ---: | ---: | ---: |
| c8/N2048 | 72.3419 ± 0.4804 | 60.3394 ± 0.4630 | **0.11494** | 24.3671 |
| c12/N4096 | 72.2427 ± 0.3232 | 60.8490 ± 0.2932 | **0.04674** | 24.7322 |
| c12/N4096 collision-off | 74.2508 ± 0.2631 | 60.5774 ± 0.3575 | 0.0001092 | 24.2720 |

No sampled state was flagged outside the collision domain in this batch, but that does not certify unresolved or unsampled states. The finest Hamiltonian residual is at most **1.139×10⁻⁶** of its positive energy scale. Its positive canonical-momentum normalization lies between **2.0612×10⁻⁷ and 2.0711×10⁻⁷ kg·m²/s**; the largest sampled absolute raw angular defect is **9.6335×10⁻¹¹ kg·m²/s**. The coarser maximum absolute defect is 2.3862×10⁻¹⁰ kg·m²/s. The normalized figures refer to a positive scale, not signed initial net momentum or purity error. Mean RMS radial pair gaps are **9.403 mm** at c8 and **6.452 mm** at c12; collision-off pair distance is undefined, not zero.

### Paired spatial differences, fine minus coarse

The 62 recorded observable comparisons comprise **47 PASS, 15 UNKNOWN and zero observable FAIL**. Two unknown impact-Hamiltonian observables intentionally have no invented acceptance budget; among the sixty gated observables, 47 pass and 13 remain unknown. The comparison as a whole is UNKNOWN.

| Observable | Fresh-seed paired mean ± pointwise 95% half-width | Original budget | Verdict |
| --- | ---: | ---: | --- |
| A axial fraction | −0.0992 ± 0.4410 percentage points | ±1 percentage point | PASS |
| B axial fraction | +0.5096 ± 0.5399 percentage points | ±1 percentage point | UNKNOWN |
| A angular transfer / positive P scale | −0.0001999 ± 0.0005610 | ±0.001 | PASS |
| B angular transfer / positive P scale | −0.0002453 ± 0.0006038 | ±0.001 | PASS |
| A survivor residual temperature | −0.02834 ± 0.07534 eV | ±0.1 eV | UNKNOWN |
| B survivor residual temperature | −0.05129 ± 0.05515 eV | ±0.1 eV | UNKNOWN |

Unknown B survivor/CDF comparisons are also retained in the machine-readable artifact. Even B's modest axial mean change is not equivalence: its interval extends to **+1.0495 pp**, just outside the ±1-pp budget. Temperature intervals similarly extend past a budget edge. The acceptance rule has not been relaxed to call those close results passes.

### Finest collision-on/off effect

The model's A axial-fraction effect is **−2.0081 ± 0.3619 pp**; B's is **+0.2716 ± 0.1891 pp**, pointwise 95% whole-run intervals. Both exclude zero for these selected observables at this finite numerical setting. B wall collection changes **+0.1495 ± 0.1038 pp**; A wall changes **+0.00610 ± 0.01008 pp** and does not resolve a nonzero effect. These are model-effect estimates, not simultaneous significance claims, calibrated purity, or a continuum-bias bound.

The earlier six-seed finer-grid result and this fresh confirmation were not pooled. New seeds narrow several observable intervals, but cannot resolve geometric or occupancy bias. This c8→c12 path increases markers by a factor of two while the nominal r–z cell count increases roughly 2.25-fold; it does not increase representative occupancy toward an independently resolved local distribution. Further evidence should increase particle count at fixed executed meshes as well as refining physical widths, preserve unresolved coverage, and retain the independent time/distribution benchmarks.

## Independent audit outcome

`python3 assets/verify-confirmation-v10.py` exited **0**. It verified all thirteen executed source hashes, original plan/config/budget preservation, four part-artifact hashes, aggregation-code hash and all 48 exact part-to-aggregate run identities. Independent arithmetic reproduced **186 level-summary intervals, 62 paired observable intervals/verdicts and 62 collision-on/off intervals**. Its result is `assets/convergence-confirmation-independent-audit-v10.json`, which also records the verifier code's SHA-256. A separate numerical integration of the df=15 Student-t density gave critical value **2.13144954556**, consistent with the declared rounded 2.131450 within 4.55×10⁻⁷.

The other convergence reviewer independently read the aggregation/verification code and found no blocking seed/config/source/timing defect. The parent convergence report records any additional whole-campaign audit separately. This arithmetic/provenance result does not convert the scientific FAIL/UNKNOWN gates into acceptance.
