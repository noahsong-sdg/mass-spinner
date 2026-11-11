# Live collision fidelity v30

## What changed and why

The live double-well solver now supports an explicit cumulative angular law and
independent radial/axial annular resolution. These address two different errors;
one cannot substitute for the other. Legacy Takizuka–Abe (TA), Cartesian cells
and the old coupled annular grid remain reproducible. Frozen earlier evidence
and numerical gates are unchanged.

The traced path is controls → doublewell config → worker → `simulateDoublewell`
→ collision half-steps → fixed/adaptive/ring cell → pair scattering → raw
conservation/exit-flux histories → independent whole-run convergence statistics.

### Large-step scattering

The previous TA law draws a Gaussian `tan(theta/2)` with variance v. This is a
small-step approximation. At large v it turns relative velocities toward the
backward direction rather than approaching isotropy. The reproduced v=10 witness
has mean cos(theta) approximately −0.374 despite near-machine pair conservation.
In simple terms, a perfectly balanced energy exchange can still turn particles
in the wrong directions.

The selectable Nanbu law uses `s=2v` and the established exponential angular
density

`p(mu)=A exp(A mu)/(2 sinh A)`, with `coth A − 1/A = exp(−s)`.

The implementation solves that moment equation rather than importing an upstream
polynomial fit or a finite-s isotropic cutoff. Stable small/large-parameter forms
and inverse-CDF branches preserve numerical endpoints. The conservative unequal-
mass pair rotation, effective partner density, random pairing and finite-N
self-exclusion factors are retained. This is a published method implemented in
TypeScript, not an embedded WarpX execution or a claim that its whole solver is
used in the browser.

This choice directly repairs the first angular moment and isotropic limit without
a speed floor or fitted physical rate. Nanbu is still **not an exact finite-time
Landau propagator**: its second Legendre moment differs from `exp(−3s)` at finite
s. Refinement tests explicitly retain that discrepancy. Particle, timestep and
spatial convergence remain necessary.

Primary equations were checked in [Wang et al., 2008](https://www.math.ucla.edu/~caflisch/Pubs/Pubs2008/nanbuConvergenceJCP2008.pdf)
and the [pinned WarpX 26.10 kernel](https://github.com/BLAST-WarpX/warpx/blob/ec1660d961696c865c87c26728b7e248b5454082/Source/Particles/Collision/BinaryCollision/Coulomb/UpdateMomentumPerezElastic.H).
The original [Nanbu paper](https://journals.aps.org/pre/abstract/10.1103/PhysRevE.55.4642)
abstract was accessible; its full text required authorization. Source texts are
evidence, not instructions. See the angle report for derivations and provenance.

### Angular momentum and locality

The ring collision map exchanges equal/opposite cylindrical momenta at the
particles' actual radii. Its numerical angular impulse is
`delta Ptheta = (ra-rb) delta ptheta`. The magnetic canonical term is unchanged
because collisions do not move the positions. Equal tangential impulses at
different lever arms create a net torque. Subtracting that torque in a diagnostic
ledger cannot repair the particles or collector outcomes.

The old annular setting tied radial and axial cell counts together. Reducing
radial separation therefore increased cell count approximately quadratically,
making local sampling sparse. The existing annular volume operator already
supports independent counts; a new explicit axial setting makes that resolution
available through the live controls, config and convergence executor.

Exact fixed annular volumes and the original random-pair generator remain in the
rate. This is preferable to a naive nearest-neighbor substitution, which changes
pair probabilities and needs a new density/normalization proof. No velocity
projection, common-radius relocation, rate rescaling or adaptive support estimate
is used. Independent axial refinement is still required; a coarse axial grid
cannot be used solely to hide a coverage failure.

### Scientific controls and identity

In Model lab → collisional double well → Coulomb scattering & resolution, select
the angular law and annular axial count. Nanbu is an explicit option; the UI and
an omitted solver/API setting retain TA for legacy reproducibility. The new law
repairs the demonstrated angular-law pathology, but external finite-time checks
have not established equivalence within the unchanged gates, so it is not
promoted as a qualified default. Spatial defaults remain coarse and explicitly
exploratory. Zero in the control's internal sentinel
means the old coupled grid; it is omitted from the solver config. Explicit
positive axial counts are accepted only inside the bounded numeric interface.
Off-mode axial settings have no effect on Cartesian trajectories. Collision-off
histories remain independent of both choices.

Exported results identify the selected law; the existing variance marker now says
**TA half-angle variance**, including when Nanbu consumes twice that parameter.
The convergence executor reports the actual nominal axial count, validates
axial-only refinement, rejects coarsening either spatial axis and recognizes an
executed angular-law method comparison. No historical artifact schema is rewritten.

## Independent validation and qualification

Five workstreams independently covered the angular implementation, its moments
and heat rate, spatial locality, full-horizon convergence, and saved upstream-code
comparisons. The original numerical gates and unfavorable results are retained.

| Check | Result | Qualification |
| --- | --- | --- |
| Dense angular quantiles | 160,144 checks pass | Includes independent 80-digit backward-tail references |
| Common-temperature ensemble | Temperature and selected CDF-point intervals pass | Six whole-run seeds; not complete distribution equivalence |
| Deterministic initial heating | Bias −1.496%, −0.619%, −0.252% at 100/25/6.25 ns | All within unchanged 2% initial mean-rate gate; not evolved transport |
| Full separator campaign | 78/78 full 200 µs runs complete | No errors/timeouts; six seeds per level |
| Fine annular raw angular residual | Worst sampled error 0.04237%, below 0.1% | All six seeds pass this particular gate |
| Fine annular unresolved exposure | Worst 26.870%, above 1% | Local sampling remains unresolved |
| Nine paired separator comparisons | All UNKNOWN | No demonstrated observable equivalence |
| External homogeneous evolution | 12/12 full 500 µs runs complete | All four primary cross-code gates UNKNOWN |

The fine annular configuration uses Nanbu, 1024 markers/species, 12 radial and
9 nominal axial cells, source-interface fitting and 100 ns steps. Its raw angular
maximum is approximately forty times smaller than the legacy Cartesian N128
baseline's 1.73098%. That comparison changes several settings together. At fixed
N512/nz9, radial refinement nr3→6 alone lowers the maximum from 0.36285% to
0.11366%, still above the gate for one seed. Nanbu alone does not repair torque:
the same N128 ring mesh gives 0.51041% for TA and 0.59909% for Nanbu. The actual
particle torque was reduced through locality, not removed from the ledger.

Axial refinement exposes the other half of the tradeoff: at fixed N512/nr6,
nz9→18 raises unresolved exposure from 31.696% to 50.754%. More, narrower cells
have fewer representatives available for the local distribution. Joint marker,
radial and axial refinement is therefore still necessary. The closed rotating
cases also fail the raw angular gate. Neither a low torque number nor a conserved
energy ledger establishes equilibrium, distribution or collector convergence.

Independent raw-artifact reconstruction passed all 78 histories. Reconstructing
angular momentum from species means and timed exit flux agrees with the producer
to 1.385e−15 in normalized residual. Five checker regressions reject corrupted
histories, exit flux, population partitions and density profiles.

The external check starts production from the exact archived WarpX 26.10 initial
velocity arrays. At 62.5 ns and 500 µs, the 40u temperature difference is
−0.03844 ± 0.09019 eV (pointwise 95% paired interval half-width). The interval
does not fit inside ±0.1 eV. Historical TA gives −0.06513 ± 0.10658 eV; other
times/steps are not uniformly improved. Mixed/separate pairing, upstream physical
cross-section limiting, angular approximations and ensemble uncertainty remain
unisolated contributors. These data do not justify a qualified default change.

The deterministic heat-rate annex integrates the fixed initial Maxwellian
conditional expectation on three quadrature grids. It separates mean timestep
bias from collision RNG uncertainty. Actual-pair means at 100/25 ns contain those
expectations within their six-run intervals. The finer actual-pair interval still
extends outside a 2% equivalence band; it is not promoted to a statistical pass.

Independent review also found a new rare-tail cancellation bug in the candidate
Nanbu inverse CDF. Subtracting nearly equal probabilities created up to 2.36e−4
cosine error. Evaluating the positive survival sum in that branch reduces the
error to approximately 3e−16 against independent Decimal80 references. Forward
and small-concentration branches retain log1p where it is better conditioned.
The unchanged 2e−12 reference gate fails on the original and passes after repair.
All final studies reran on the corrected kernel; 42 interrupted preliminary
trajectories remain separately preserved and excluded from acceptance.

Detailed evidence and limitations:

- [Angular implementation and provenance](COLLISION-ANGLE-V30.md).
- [Independent moments, stationarity and rate audit](COLLISION-INDEPENDENT-V30.md),
  plus [deterministic rate annex](../scientific/live-collisions-v30/independent/deterministic-rate-annex/README.md).
- [Spatial locality review](COLLISION-LOCALITY-V30.md).
- [78-run unchanged-gate convergence study](LIVE-COLLISION-CONVERGENCE-V30.md).
- [Independent saved-WarpX comparison](LIVE-COLLISION-EXTERNAL-V30.md).

## Integrated checks and publication

All project execution used distinct copied Apple safe-dev guests. The final
application snapshot is pinned by the 324-input map
`fa773767ad4314b879c3ecf272c4f0faa6e27ee3d1f31ad638f7f4d50654ce38`.
Final Coulomb kernel SHA-256:
`276385adc07eecbf454973feea4490d7898392ec6bc797811b398d5c46c5de6e`.

The final offline commands were `npm test` (**465 passed, zero failed/skipped**),
`npm run typecheck`, `npm run build`, `npm run check:site` and
`npm run check:assets`; all exited zero. Inputs were hashed before and after the
checks. The corrected controls also have an original-source red witness, plus
actual DOM-to-config and real-worker dispatch regressions. Exact logs and maps
are retained under `scientific/live-collisions-v30/integration/`.

Cloudflare accepted the exact 130-file checked release, aggregate SHA-256
`f19a9ba12b36ac96a3d57aa8579d85ad2dcbea859336ab17fc54a577944dad75`.
The provider status on 8 November 2026 reports version
`ff232616-a804-495f-890e-65ad7fdc29f8` at **100%** for
[Mass Spinner](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/).
The publisher verifies complete file membership and each file hash before upload;
logs, pinned deployment dependencies and the sanitized provider receipt are in
`scientific/deployment-v30/`. Browser/GPU/mobile observation remains blocked by
the existing managed browser policy; DOM/worker tests and provider state are not
substitutes.
This work does not change the offline full3V research backend or resolve its
previously reported physical convergence failures. No experimental separator
calibration or self-consistent plasma-field closure is established.
