# Mass Spinner: collision-locality correction and intended-horizon evidence

7 November 2026 UTC. Version 10 addresses the demonstrated spatial collision errors. Implementation invariants, numerical convergence and experimental validity are separate gates. The physical source, density, temperatures, fields, boundaries and 200 µs horizon are unchanged in the open-pulse comparisons. The fixed Cartesian default is preserved.

## Root cause, fix and choice

The execution path is controls/config → collision partition → physical density Nw/V → mixed-pair TA scattering → full orbits → exit/conservation/local-regime diagnostics → plots/export. Independent reviews did not reproduce a Coulomb coefficient, sign or reduced-mass defect. The demonstrated defects were spatial discretization errors.

**Sharp-source dilution:** cells crossing the initial source boundary average plasma together with vacuum. The infinite-marker density-squared multiplier is Σ|source∩cell|²/(|source|·|cell|), about 0.686 for the default Cartesian grid and 0.419 for the next grid. More particles cannot remove that geometric error. In plain terms, the collision model spreads a compact pulse across oversized boxes. A deterministic source-fitted annular grid inserts faces at the known initial source radius and slug end; full cell volumes remain in every rate. This removes initial support averaging without changing density, estimating support from particles or applying an ad hoc rate multiplier. Evolving profiles still require refinement.

**Nonlocal collision torque:** equal opposite impulses at distinct positions change canonical angular momentum by (xa−xb)Δpya−(ya−yb)Δpxa. The old corrected ledger recorded this error but could not repair paths. The new optional axisymmetric ring representation uses exact annular r–z volumes and transforms each velocity into its own cylindrical frame before the unchanged pair operator. Angular error becomes (ra−rb)Δpθa and remains measured directly. In plain terms, symmetry lets us avoid sampling the same azimuthal distribution in many separate boxes, while smaller radial gaps reduce artificial spin transfer. No angular projection or thermostat hides the remaining error.

The ring reduction is appropriate only for the current axisymmetric source distribution, fields and cylinder. It retains three velocity components and full orbit motion; it is not a guiding-center model. It conserves pair energy and axial momentum, not the transverse Cartesian momentum of two displayed point representatives. It cannot model azimuthal fluctuations or instability. Local thermal/regime estimates also use cylindrical velocities so coherent rotation is not mistaken for heat.

Dimensional convention: Δp is an impulse in kg·m/s, so Δr·Δpθ and the accumulated legacy `collisionTorque` fields have units kg·m²/s: angular impulse or angular-momentum defect. They are not instantaneous torque in N·m. Legacy export keys are retained for compatibility.

**Mesh endpoint correction:** independent review found that near-coincident interface coalescing could move the physical axis or wall. Only interior grid faces now coalesce; physical endpoints remain exact and nearby distinct interfaces are inserted. This preserves the actual domain instead of clipping particles or deleting a valid source layer. A regression covers the reproduced boundary cases.

Nearest-neighbor pairing with the old rate would change partner probabilities without compensation. An all-pairs symmetric spatial kernel is a defensible larger alternative, with additional cost and its own finite-width torque. Rings plus fixed source fitting are the smallest coherent improvement supported by this machine's existing symmetry. They remain a candidate, not a complete continuum solution.

## Controls and reproducibility

In **Double-well collisional dynamics → Coulomb scattering & resolution**, choose **Axisymmetric annular r–z cells**, then **Source-fitted grid**. `cellsAcross` is the annular radial interval count in this branch; axial count is ceil(L/(a/c)). Source fitting inserts additional fixed faces. Exports include all actual radial/axial faces, maximum widths, physical weights, meridional/radial pair distances, raw torque, source/sink fluxes and sampled regime estimates. The unmodified Cartesian/adaptive branches remain available.

`collisionSourceAligned` defaults to false and is inactive for Cartesian/adaptive or equilibrium runs. Missing legacy method fields retain the old fixed behavior. Collision-off trajectories are independent of either new setting. Current run exports use modelVersion 10; historical evidence retains its original version and source hash.

## Independent physics checks

The independent reviewer checked annular measure, finite-N rate normalization, azimuth relabeling invariance, mixed-mass energy/axial momentum, nonzero radial-gap torque, Maxwellian stationarity, actual-engine local temperatures and inactive equilibrium controls. The controlled rigid-flow torque probe improves approximately fourfold when its radial gap halves. This is a specified probe, not a general quadratic-convergence theorem. Four 8192-marker common-temperature runs have mean species-temperature changes ±0.003645 eV; these do not establish arbitrary non-equilibrium distribution accuracy.

[Root-cause derivation](COLLISION-ROOTCAUSE-V10.md), [independent physics review](COLLISION-METHODS-V10.md), [prospective study plan and unchanged tolerances](CONVERGENCE-PLAN-V10.md).

## Scientific acceptance boundary

Every study uses independent whole-run seeds. Pointwise approximate Student-t intervals are not independent-ion confidence bands, simultaneous coverage or rigorous rare-tail bounds. No observed seed spread yields a withheld interval. Deliberately coarse failures remain reported; even a passing finest diagnostic does not retroactively pass the full matrix. Unresolved local regimes, omitted sensitivity directions and continuum error versus physical effect remain explicit.

The nonlinear homogeneous Landau formulation remains an independent candidate with measured discretization error. This spatial change does not make it an accepted reference. No experimental separator calibration or held-out device validation is supplied. Live deployed controls and GPU appearance remain unverified under the existing origin-policy denial.

## Completed open-pulse comparisons

The three replay matrices each execute the original eight numerical levels with seeds 101,202,303,404,505,606. Physical settings, 200 µs horizon and budgets are unchanged. The higher-resolution study executes another 24 runs. This table reports the maximum sampled raw Pθ residual over six independent runs, not an error on extracted purity.

| Spatial method | Radial/grid setting | Markers/species | Raw Pθ / positive scale | Original 0.1% budget |
| --- | --- | ---: | ---: | --- |
| Cartesian baseline | 6 cells across diameter | 1024 | 0.96317% | Fail |
| Uniform axisymmetric rings | 6 radial cells | 1024 | 0.13585% | Fail |
| Source-fitted rings | 6 nominal radial cells plus interfaces | 1024 | 0.12005% | Fail |
| Source-fitted rings | 8 nominal radial cells plus interfaces | 2048 | 0.09635% | Pass this diagnostic |
| Source-fitted rings | 12 nominal radial cells plus interfaces | 4096 | 0.05723% | Pass this diagnostic |

Ring radial widths are a/c, whereas Cartesian widths are 2a/c. The table's labels are not equal physical grids; actual faces, pair distances, weights and SI normalization scales are exported. The c6/N1024 comparison retains the same marker count and physical sample. The final two rows also increase marker count and refine locality, so their improvement cannot be attributed to the method alone.

An independent exact comparison found all **447,330 pre-existing leaves across 48 Cartesian runs unchanged** from v9, including histories, impacts, fluxes and observables. Only additive metadata, model/source identity and runtime differ. The new implementation did not alter the retained baseline to improve its comparison.

**Source-fitting tradeoff:** it removes initial support dilution, but splitting cells increases sparse-sampling burden. At coarse c3/N128, maximum sampled unresolved representative exposure rises from 47.0% for uniform rings to 58.7% for fitted rings. At c12/N4096 it is still **24.49%**, far above the unchanged 1% budget. This is unresolved evidence, not proof that that percentage of physical particles is invalid. No local-regime criterion was relaxed.

The six-seed c8→c12 axial-fraction differences are **A +0.118 ± 0.910 percentage points** and **B −0.0326 ± 1.132 pp**, approximate pointwise 95% intervals. Both remain UNKNOWN against the one-percentage-point equivalence criterion; small mean changes do not establish accuracy when their intervals extend outside the budget. The c6 case still fails raw Pθ, so the complete higher-resolution matrix remains FAIL even though its finest raw diagnostic passes.

At c12/N4096, the matched collision-on/off A axial-fraction change is **−1.827 ± 0.369 pp**; B is **+0.269 ± 0.259 pp**. These specified pointwise model effects are statistically resolved in this batch (B only marginally), but continuum error has not been bounded below them. They are not experimentally validated separation predictions or simultaneous significance claims.

## Complete timestep and fresh-seed confirmation

All **252 physics runs** completed: 48 Cartesian replay, 48 uniform rings, 48 source-fitted rings, 24 higher-resolution, 18 fine-timestep, 48 fresh-seed confirmation and 18 independent closed-equilibrium runs. Aborted metadata-only pilot work is excluded. No planned batch was stopped because its results looked favorable.

These are 252 executions, not 252 independent statistical samples. Repeated configuration/seed combinations across campaigns are not pooled; each reported interval uses its declared six or sixteen independent whole-run seeds.

The c12/N4096 **100/50/25 ns** study completes all 18 runs. Maximum sampled raw Pθ residuals are **0.05723% / 0.04094% / 0.03983%**, all below the original 0.1% budget. Both timestep comparisons pass the one-percentage-point axial-collection criterion for both species. The 50→25 ns differences are **A −0.0773 ± 0.3867 pp**, **B −0.1180 ± 0.3954 pp**. Some angular-transfer, temperature and CDF comparisons remain UNKNOWN. The full timestep study is UNKNOWN, not PASS; coverage and continuum-effect bounds remain open. Three predeclared two-seed chunks used the same frozen solver/statistics; aggregation preserves every original setting and records part, original-plan and aggregation-code hashes. Timings include CPU contention and are not CPU time.

The prospectively specified **16 new seeds, 1001–1016**, compare c8/N2048, c12/N4096 and the matched finest collision-off control: 48 complete runs. The intermediate c8 maximum raw Pθ residual is **0.11494%**, so it FAILS the unchanged 0.1% budget despite passing in the earlier six-seed exploration. The finest c12 maximum is **0.04674%**, passing that diagnostic again.

The fresh spatial-refinement axial differences are **A −0.0992 ± 0.4410 pp (PASS)** and **B +0.5096 ± 0.5399 pp (UNKNOWN)** against the one-point budget. Both species' angular-transfer refinement checks pass. Temperature, some B survivor/CDF checks and approximately **24.7% maximum sampled unresolved exposure** remain open. The confirmation matrix is FAIL because of c8; its finest raw diagnostic and A observable passes cannot certify the full model.

Fresh finest collision-on/off effects are **A −2.008 ± 0.362 pp**, **B +0.272 ± 0.189 pp**, pointwise 95% whole-run intervals. A continuum-error bound below either physical effect has not been established. Do not interpret pointwise exclusion of zero as an experimentally validated separator effect.

[Detailed open-campaign results and independent audit](CONVERGENCE-RESULTS-V10.md), [fresh-seed confirmation and exact criteria](CONVERGENCE-CONFIRMATION-V10.md).

## Independent closed-equilibrium falsification

A separate reviewer ran 18 common-Ω closed-column cases at the same 200 µs horizon: c6/N1024, c12/N4096 and finest collision-off controls, six independent seeds each. Expected radial CDFs use independent 40000/80000-point physical quadrature. The engine lacks an initial particle-histogram export, so initial CDFs are explicitly reconstructed from seeds and independent CDF thresholds, with initializer-quadrature ambiguity checked separately.

Refinement reduces mean raw Pθ residual **0.04839% → 0.02084%**, and mean meridional pair separation **19.164 → 9.611 mm**. The finest maximum is **0.03001%**, below the 0.1% budget. Closed inventories are exact and every maximum H residual is ≤1.95×10⁻⁸. Fine species temperature changes are **A −0.0295 ± 0.0814 eV**, **B +0.0297 ± 0.0886 eV**; rotation changes **A −1.79 ± 2.94%**, **B +0.674 ± 1.20%** remain too uncertain for the chosen 1% criterion. No criterion conclusively fails, but the overall result is **UNKNOWN**.

Every sampled snapshot contains some under-resolved local state; this is not 100% unresolved-particle exposure. Time-averaged unresolved representative exposure is approximately **6.30%** in the fine closed case. All 12 executed source hashes match. [Independent closed-case report and limitations](RING-EQUILIBRIUM-V10.md).

## Remaining root causes and next gate

The spatial correction improves measured angular errors and resolves the initial discontinuity. It does not eliminate later profile smoothing or local finite-marker uncertainty. The higher-resolution r–z path roughly holds occupancy fixed as cells shrink; a consistency path must increase local sampling as well as reduce cell width. More cells alone cannot establish a locally resolved distribution. Next work should test larger N at fixed actual mesh before another joint refinement, with a reviewed resource-budget change if needed, and retain the same exposure/observable criteria. A different local-density or symmetric-kernel method requires its own generator derivation and independent validation.

Retain the failed intermediate level, unresolved B/profile/temperature intervals, independent finite-time Landau reference gate and experimental gate. A smaller scalar residual is not sufficient grounds for automatically replacing the fast Cartesian default or claiming calibrated purity.

## Evidence and software checks

The independent auditor re-evaluates all **234 open runs** and **1426 paired observable intervals**, using an independently integrated Student-t CDF rather than the production lookup constants. Configuration membership, all source hashes, whole-run/effect/refinement statistics and verdicts agree. Both aggregation procedures were cross-reviewed. This is an implementation/statistical audit, not a continuum proof.

`npm test`: **250 passed, 0 failed, 0 skipped**. `npm run typecheck`: exit 0 for the repository's src TypeScript target. The new independent equilibrium utility executes successfully; its separate strict utility-script typecheck did not pass because Node declarations and utility typing are outside that configured target. That failed auxiliary check is retained in its report. Build, static resource checks, exact source snapshots and CLI publication are recorded in project-root IMPLEMENTATION-STATUS.md.

### Public downloads

- [Cartesian replay](convergence/v10/convergence-default-200us-fixed-v10.md)
- [Uniform annular replay](convergence/v10/convergence-default-200us-axisymmetric-v10.md)
- [Source-fitted replay](convergence/v10/convergence-default-200us-axisymmetric-source-aligned-v10.md)
- [Higher-resolution case](convergence/v10/convergence-axisymmetric-refinement-v10.md)
- [Fine timestep case](convergence/v10/convergence-axisymmetric-fine-dt-v10.md)
- [Fresh-seed confirmation](convergence/v10/convergence-confirmation-v10.md)
- [Raw/compact download manifest](convergence/v10/downloads.json)
- [Executed physics source and reproduction inputs](convergence/v10/physics-source-v10.zip)

Raw JSON histories are losslessly gzip-compressed to respect the hosting limit; each download's raw/compressed SHA-256 is in the manifest. Reproduction inputs are source code and assumed teaching configurations, not measurements.
