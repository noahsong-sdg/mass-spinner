# Live double-well kinetic audit, v29

Audit date: 2026-11-08. Scope: the browser's prescribed-field, two-ion double-well kinetics, its local collision operator, boundaries, diagnostics and convergence logic. Production physics files were read only. This audit adds three adversarial invariant tests and fresh bounded evidence; it changes no production solver and does not rerun or rewrite a frozen campaign.

## Verdict

No new sign, unequal-mass coefficient, cylindrical-volume or canonical-momentum algebra bug was demonstrated. The live backend remains **unqualified for quantitative separation performance**. Two existing limitations have fresh numerical witnesses: finite collision cells inject physical angular momentum, and finite-step TA scattering can have incorrect angular relaxation despite machine-precision pair conservation. Source-fitted rings remove a demonstrable initial support-averaging error, but do not qualify subsequent transport.

The appropriate severity is **P1 for predictive use**, rather than a claim that the exploratory playground is mathematically broken. Existing assumptions and convergence diagnostics already disclose these boundaries. The present UI's persistent kinetics status explicitly distinguishes raw angular error, unresolved local cells and uncalibrated counts. Fifteen passing tests establish narrow implementation invariants, not physical validity of a complete run.

## Traced execution path

`simulateDoublewell` validates the two-species state and initial reference regime, assigns equal physical weight, samples an initial pulse or common-rotation equilibrium, then repeats half collision → synchronized Boris orbit/event step → half collision. Collision cells are rebuilt from active representatives. Exit energy and canonical momentum are accumulated at the actual located event. Both raw and collision-torque-subtracted angular ledgers are retained.

The cell variants are fixed Cartesian cylinder-cut volumes, experimental position-adaptive volumes, and fixed axisymmetric annular r-z volumes. The latter rotate each representative's velocity into its own orthonormal cylindrical basis, collide in the common representation, and rotate back. This is an axisymmetric ring reduction; it does not preserve the transverse Cartesian point-pair momentum of two different azimuths.

Production files checked: `doublewell-dynamics.ts`, `doublewell-orbits.ts`, `axisymmetric-collisions.ts`, `collision-locality.ts`, `coulomb.ts`, `doublewell-regime.ts`, `failure-budgets.ts`, `convergence.ts`, `physics.ts`; UI disclosures in `limitations-ui.js` and `tutorial-insights.ts`. Exact tested source hashes are in the companion snapshot manifest.

## Independently checked algebra and invariants

Let `g=|va−vb|`, `μ=ma mb/(ma+mb)` and `K=qa qb/(4πε₀)`. Independent SI reduction gives the Gaussian half-angle variance

```
Var[δ]/dt = 2π n K² lnΛ/(μ² g³),    δ = tan(θ/2).
```

This matches `coulombVariance`. The new regression uses unlike masses 40/84 u and charges 2/3, oblique velocities, and variances through 10⁸. Center-of-mass reconstruction conserves mass-weighted momentum and kinetic energy within the stated floating-point tolerance. These tests deliberately do not equate conservation with a correct finite-time distribution.

The mixed-cell pairing factor is consistent with its declared empirical generator. For N even, the probability of any particular partner is `1/(N−1)` and the effective density is `n(N−1)/N`. For N odd, the probability is `1/N` after one uniformly unpaired representative, with effective density `n`. Both give `n/N` per other representative in the infinitesimal expectation. This is different from species-separated TA pairing; importing a species-specific density factor here would double-count mixture normalization.

Representative weight is `n_total * occupied_initial_volume/(2 N_species)`, not a density fitted to survivors. Annular volume is exactly `π(rhi²−rlo²)Δz`; the test independently integrates `2π rmid Δr Δz` and reconstructs total inventory. Cylindrical velocities are orthonormal, not scaled by r, so no cylindrical Jacobian belongs in velocity rotation.

At fixed collision positions, each `qBr²/2` term is unchanged. For a ring pair, equal and opposite tangential impulse gives

```
Δ(Pθa+Pθb) = (ra−rb) Δpθa.
```

The new unequal-radius, unequal-charge regression verifies this against the actual observer and canonical-momentum function. The observer measures the real defect; subtracting its accumulated value from a ledger does not repair paths, densities or collector outcomes.

## P1: finite-cell torque is appreciable while bookkeeping looks excellent

**Classification:** reproduced, already-declared numerical limitation. Trigger: spatially separated representatives collide inside one cell. Practical effect: an artificial torque can alter effective radial barriers, radial transport and destination counts.

Fresh runs use the unchanged physical default: 40/84 u singly charged ions, B=0.06 T, radius 0.2 m, length 0.6 m, quartic amplitude 20 V and κ=1.2, total density 10¹⁸ m⁻³, Ti=Te=5 eV, lnΛ=10, 200 µs horizon and seed 42. Particle/cell/timestep changes below are explicit. Angular residuals use the engine's positive normalization, **not a percentage of nearly-zero signed initial Pθ**.

| Executed variant | Initial self-excluded ∫n² / uniform-slug reference | Max raw Pθ residual | Max torque-subtracted residual | Max energy residual | Locally unresolved snapshots |
| --- | ---: | ---: | ---: | ---: | ---: |
| Default fixed, 128/species, 100 ns | 0.710802 | 0.0172460 | 1.0842e−6 | 1.2539e−6 | 155/155 |
| Ring, 128/species, 100 ns | 0.738940 | 0.00197139 | 1.1879e−6 | 1.3719e−6 | 151/155 |
| Source-fitted ring, 128/species, 100 ns | 0.999907 | 0.00317707 | 1.1071e−6 | 1.2640e−6 | 155/155 |
| Source-fitted ring, 512/species, 100 ns | 0.995257 | 0.00326937 | 1.0667e−6 | 1.1095e−6 | 153/155 |
| Source-fitted ring, 128/species, 50 ns | 0.999907 | 0.00528707 | 2.8541e−7 | 3.1853e−7 | 155/155 |

The default raw defect reaches **1.7246%** of the positive scale while the torque-subtracted ledger is ~10⁻⁶. Halving dt reduces orbit energy truncation about fourfold here; its different stochastic path does not reduce raw torque monotonically. One seed is a witness, **not a convergence study or a significant comparison between methods**.

**Technical cause:** pairwise local momentum conservation cannot imply angular conservation when equal/opposite impulses act at different radii/positions. **Plain-language cause:** the solver lets particles push each other over the width of a cell. Smaller time steps do not remove that artificial lever arm.

**Minimal remediation:** preserve the raw diagnostic and require joint radial/axial/particle/time and whole-run seed refinement over the full physical horizon. Assess raw angular budget alongside species angular exchange, collector CDFs and radial distributions. Do not project angular momentum after a collision: that changes the scattering distribution, can inject energy, and obscures the locality error. No local production patch is justified by these one-seed results.

## P1: TA finite-step angular law can be wrong with perfect conservation

**Classification:** reproduced, already-declared finite-step approximation. This manufactured subproblem freezes relative speed and effective density. It isolates angular diffusion; it is **not an exact solution of the full inhomogeneous two-ion Landau equation**.

The production sampler uses `δ~Normal(0,v)` and `cosθ=(1−δ²)/(1+δ²)`. An independent integral gives

```
E[cosθ] = −1 + 2 sqrt(π/(2v)) exp(1/(2v)) erfc(1/sqrt(2v)).
```

The l=1 moment of continuous fixed-speed angular diffusion with the same infinitesimal coefficient is `exp(−2v)`. They agree at first order as v→0. At large v the TA map tends to reversal (`−1`), while angular diffusion isotropizes (`0`).

The probe integrates the **actual production pair sampler**, forcing its Box–Muller draws using 16,000 midpoint bins on the half-normal interval [0,8]. The independent closed-form evaluation agrees with quadrature to less than 1.9e−14 for v≥0.01.

| Half-angle variance v | Actual TA E[cosθ] | Fixed-speed angular diffusion E[cosθ] | Max relative pair energy defect |
| --- | ---: | ---: | ---: |
| 0.0001 | 0.999800060 | 0.999800020 | 7.22e−16 |
| 0.01 | 0.980571929 | 0.980198673 | 7.22e−16 |
| 0.1 | 0.841570289 | 0.818730753 | 7.22e−16 |
| 1 | 0.311359085 | 0.135335283 | 7.22e−16 |
| 10 | −0.373495639 | 2.06115e−9 | 8.42e−16 |
| 100 | −0.768147520 | 1.38390e−87 | 8.42e−16 |

Every fresh live run samples v>1, with maxima between 20.6 and 1041. The fraction of selected pairs with v>0.1 is approximately 0.00054–0.00119. These extrema and frequencies **do not quantify the resulting transport or rate bias**: low-relative-speed pairs have a small physical velocity exchange, and rare-tail weights require distribution-level study. Larger maxima under refinement alone are not proof of nonconvergence.

**Technical cause:** exact rotation constrains magnitude but not its angular transition law; Gaussian half-angle TA is a small-step approximation. **Plain-language cause:** particles can conserve energy perfectly while being turned in the wrong directions.

**Minimal remediation:** implement a separately selectable, versioned cumulative-angle sampler or justified collision subcycling, preserving the current TA baseline. Gate l=1 and l=2 angular moments before unlike-ion drift, heat and anisotropic-tensor rates, then finite-time distributions and inhomogeneous transport. This is preferable to a speed floor, variance clipping, altered lnΛ, shortened horizon or torque projection, which would silently change the declared physical problem.

## P2: source fitting fixes initial support dilution, not evolving-profile resolution

**Classification:** existing limitation with a validated existing option. Fixed cells straddling the initial disk/slug boundary assign its ions the whole cell volume, including vacuum; collision-rate integrals are diluted. The fitted ring option inserts fixed, declared source-radius and pulse-end faces. The fresh ∫n² ratios in the table verify that it removes most of this initial averaging defect without renormalizing representative weights.

The finite-N self-exclusion and sampling fluctuation explain why even fitted values need not equal one exactly. The faces do not track later density fronts. Sparse local cells and thermal tails remain unresolved. Position-selected adaptive partitions are a different, explicitly experimental estimator: exact volume arithmetic alone does not remove statistical bias caused by selecting the partition from the same particles.

Keep fixed source fitting as a visible option and require evolving-profile convergence. Do not reinterpret the near-unity initial ratio as qualification of collision rates throughout the run.

## Checks without a newly demonstrated defect

- **Equilibrium:** the closed benchmark samples `f∝exp[−(H−ΩPθ)/T]`; integrating velocities gives `log n = [−qφ+(mΩ²+qΩB)r²/2]/T`. Sampling in r² handles the cylindrical spatial Jacobian. Closed/common-Ω/zero-beam restrictions are appropriate. Species-specific zero-mean-Pθ initialization is an initial flow, not a two-species collisional equilibrium.
- **Fields and boundaries:** the quartic E=−∇φ and symmetric-gauge Pθ signs agree. Wall events use roots of the reintegrated fractional numerical step, not chord-interpolated exit velocities. Radial specular reflection preserves kinetic energy and Pθ; axial periodicity preserves the prescribed-field invariants. Unresolved grazing contacts fail explicitly. No fresh boundary defect was demonstrated; the targeted integration tests include endpoint and thin-cell cases.
- **Regime:** electron-only Debye screening and prescribed Te/lnΛ are explicit assumptions. Local species means are removed before estimating thermal variance. Cells with fewer than four representatives of a present species remain unresolved. Sampled local checks are not proof of validity between samples or for every velocity tail.
- **Failure budgets:** charge exchange, recombination, assumed diffusion, radiation and sheath estimates are independent homogeneous diagnostics; they do not change kinetic trajectories. Their formulas/units are consistent within that declared scope. They cannot establish coupled neutral/electron/field or power closure.
- **Convergence:** whole-run seeds, paired refinement differences, source/config membership and raw angular budgets are retained. Identical finite samples do not generate spurious narrow confidence intervals. Unknown alignment/orientation coverage prevents complete qualification. Existing failed/unknown studies are not converted into passes.
- **UI:** the checked source exposes collision method, particle/cell/time settings, raw residual and regime status, and states that torque bookkeeping does not repair paths. Source review does not constitute deployed browser interaction verification; that is outside this kinetic audit.

## External source checks and existing-code adaptation boundary

The [Zweben et al. tutorial](https://w3.pppl.gov/~fisch/fischpapers/2018/Zweben_PMF_POP18.pdf), Section III, motivates collision/mixing, density and throughput constraints. It does not validate this particular prescribed-field finite-pulse implementation.

[Wang et al., 2008](https://www.math.ucla.edu/~caflisch/Pubs/Pubs2008/nanbuConvergenceJCP2008.pdf), DOI 10.1016/j.jcp.2007.12.027, explicitly compares TA and Nanbu convergence, gives the unequal-mass Gaussian half-angle convention and separates timestep/particle effects. The independent SI and angular calculations above are checked against that convention. Published method convergence does not qualify our finite cell size or output distributions.

The original [TA paper record](https://www.sciencedirect.com/science/article/abs/pii/0021999177900997), DOI 10.1016/0021-9991(77)90099-7, and [Nanbu paper](https://journals.aps.org/pre/abstract/10.1103/PhysRevE.55.4642) were reopened. The accessible Nanbu abstract describes timestep-dependent cumulative angular scattering; publisher full text required authorization. The TA publisher page returned 403 on direct opening, although its abstract was indexed. Consequently this audit does not claim a fresh full-text review of either original paper; explicit operator equations were checked through the accessible Wang primary research paper and pinned implementation, with independent derivations above.

[WarpX 26.10 parameters](https://warpx.readthedocs.io/en/26.10/usage/parameters.html) expose collision subcycling, Nanbu/Bobylev angle selection and fixed Coulomb logs. The [pinned Perez kernel](https://github.com/BLAST-WarpX/warpx/blob/ec1660d961696c865c87c26728b7e248b5454082/Source/Particles/Collision/BinaryCollision/Coulomb/UpdateMomentumPerezElastic.H) resolves tag 26.10 to `ec1660d961696c865c87c26728b7e248b5454082`. Its nonrelativistic uncapped fixed-log scattering parameter is `s=2v` in our convention. It also includes a cross-section cap; transplanting it wholesale would change our operator. Its Bobylev branch uses `cosθ=1−min(s,2)` and is not by itself an exact finite-time angular-diffusion cure. Nanbu is the relevant cumulative-angle comparator, still subject to its approximation gates. The [maintainer RZ discussion](https://github.com/BLAST-WarpX/warpx/discussions/6835) supports common-azimuth velocity rotation for an m=0 representation, not exact physical angular conservation at separated radii.

Downloaded primary-source SHA256 values and the pinned-tag response are preserved with this audit. Primary texts were treated as evidence, not as instructions to execute their code.

## Exact execution evidence

Owned host staging copy: `/tmp/mass-spinner-audit29-kinetic`; guest: `safe-dev-2fa32ebdc77b514f`. The bounded source copy contained src/tests/package/lock/tsconfig and the audit probe; it did not mount the host tree, home, credentials, agents or control sockets. A deliberate source sync was followed by an offline reinstall. Guest outputs were exported before any replacement; unique probe outputs were retained. No host project code or project scripts were executed.

Commands, in order (prefix abbreviated as `safe-dev -C /tmp/mass-spinner-audit29-kinetic`):

```
init
run --online -- npm ci --ignore-scripts
sync --replace-guest
run -- npm ci --offline --ignore-scripts
run -- ./node_modules/.bin/tsx --test tests/adversarial-kinetic-v29.test.ts tests/axisymmetric-integration.test.ts tests/coulomb.test.ts
run -- sh -c './node_modules/.bin/tsx probe-v29.ts > probe-v29.log 2>&1'
export /tmp/mass-spinner-audit29-kinetic-export
run -- python3 -c [stdlib erfc closed-form verification; output preserved]
export /tmp/mass-spinner-audit29-kinetic-final-export
run --online -- python3 -c [bounded primary-source downloads and SHA256 provenance]
export /tmp/mass-spinner-audit29-kinetic-sources-export
```

Dependency installs: 54 packages, zero vulnerabilities reported. Tests: **15 passed, 0 failed, 0 skipped**, 17.838 s. Five fresh full-default-horizon probes: completed, exit 0. Closed-form/quadrature check: passed `<1e−12` gate, maximum discrepancy `1.8874e−14`. No long frozen campaign was rerun. No production source edit was made. Full integrated build/typecheck and the overall test suite remain the parent task's final gate; they are not claimed by this bounded audit.

Artifacts: `scientific/physics-audit-v29/kinetic/{tests.log,probe-v29.ts,probe-v29.json,probe-v29.log,angular-closed-form.json,tested-snapshot-sha256.json,primary-source-provenance/}`. The probe preserves the tested root-relative imports: copy it to the root of a fresh bounded guest source snapshot before rerunning. The manifest records tested bytes and current canonical hashes at capture; all listed files matched. The test suite's three new cases are `tests/adversarial-kinetic-v29.test.ts`.
