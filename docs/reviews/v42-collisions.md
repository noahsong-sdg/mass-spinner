# v42 independent collision audit

9 November 2026. Scope: browser Coulomb/neutral kernels, annular locality,
transport qualification, and the distinct offline Julia/PETSc evidence.
No production edit, deployment, new trajectory, VM lifecycle action or host
project execution was performed by this reviewer. Source/data reads and report
edits occurred on the host. The parent owns execution of the two bounded probes
below in its existing guest and the final application checks.

## Disposition

**Do not qualify separator transport or the general 3V research backend.** The
current source correctly describes the replay as recorded Julia data and live
collisions as unqualified. Existing numerical failures are retained rather than
hidden. I found one additional saved-diagnostic validation defect; it does not
establish corruption of any retained cohort or make the global convergence
status green, because the continuum gate remains UNKNOWN.

| Priority | Finding | Classification |
| --- | --- | --- |
| P2 | Invalid saved unresolved-exposure values can earn a coverage PASS | Demonstrable boundary bug; bounded executable witness supplied |
| P1 scientific | Browser candidate fails its own coverage/torque budgets | Recorded, explicitly unqualified regime; no claim this is newly introduced |
| P1 scientific | General 3V Julia evolution fails distribution/rate/rotation acceptance | Recorded method-resolution failure; cannot substitute for browser transport |
| P2 scientific | Pair energy/momentum and positive mass do not establish angular conservation or physical entropy | Missing/limited evidence, with explicit algebraic counterexamples |
| P2 scientific | TA large-step reversal and Nanbu higher-moment error remain | Known finite-step approximation, correctly documented; not an undisclosed new bug |

## Traced execution paths

Live double-well: `src/worker.ts:23` → `simulateDoublewell` → `collisionCells`
(`src/doublewell-dynamics.ts:160–171`) → two half-step collisions around the
orbit pusher (`:231–252`) → mixed random pairs (`src/coulomb.ts:140–159`) →
TA/Nanbu relative-velocity rotation (`:97–132`). Annular mode converts each
representative's velocity to its own cylindrical frame before applying that
same pair operator (`src/axisymmetric-collisions.ts:82–93`).

Live evidence: saved regime/history ledgers →
`assessCollisionObservableEvidence` (`src/observable-evidence.ts:19–55`).
Archived whole runs: `executeSeed` → `observeDoublewell` →
`summarizeConvergence` (`src/convergence.ts:72–134,206–263`).

Research replay: `src/research-ui.js:18–46` fetches
`/research-recordings.json`, selects saved states, and renders saved moments.
There is no Julia/PETSc import or call in `src/worker.ts:1–32`; scrubbing does
not execute a solver. Its status explicitly says qualification WITHHELD.

## 1. Invalid saved coverage can pass — P2, concrete bug

**Problem.** `src/convergence.ts:224–227` treats a diagnostic as unresolved only
if absent, explicitly null, or above the tolerance. A negative number, missing
`unresolvedExposure` member, or NaN satisfies none of those conditions and earns
`sampled local coverage: pass`. Missing `outsideSnapshots` likewise appears
equivalent to zero. The raw-angular budget at `:228–230` also accepts a negative
residual as below budget. These are real range/type boundaries: an exposure is a
fraction in [0,1], an outside count is a nonnegative integer, and an error norm
is nonnegative finite.

**Technical cause.** JavaScript comparisons with undefined/NaN are false;
negative fractions are below a positive budget. Source/config/RNG provenance
matching (`:209–214`) does not validate those diagnostic fields. In simple
terms, invalid measurements can look like an excellent score because the gate
checks only whether the number is too large.

**Witness.** `docs/reviews/v42-collision-probe.ts` constructs two unique complete
source/config/RNG-matched synthetic records, then varies exposure among −0.5,
NaN, and undefined. It asserts the present erroneous local PASS and the global
UNKNOWN. This executes no trajectory. A missing member is a directly
representable stale JSON case; NaN is an in-memory API case, not a standard
serialized JSON number. No malformed retained physical result was observed.

**Smallest fix.** At this record-ingestion boundary require a finite exposure in
[0,1], a finite nonnegative error norm, and a nonnegative safe-integer sampled
outside count before using them. Invalid/missing measurements must be UNKNOWN
or make the record ineligible, consistently with the existing missing-data
contract. Keep a genuinely measured budget excess as FAIL. This is preferable
to clipping values, coercing missing fields to zero, or rewriting trajectories:
those would hide the input defect or change unrelated physics.

**Objective regression.** Valid 0 and threshold equality preserve behavior;
negative/NaN/undefined/null/Infinity/boolean fractions and negative/noninteger
counts never PASS; JSON records predating the diagnostic field remain UNKNOWN.
Repeat for invalid raw residuals. Keep the global missing-continuum UNKNOWN.

## 2. Finite collision cells inject physical angular momentum — unqualified regime

For equal-weight Cartesian pairs the routine preserves
`m_a Δv_a + m_b Δv_b = 0`, but positions do not coincide. Thus

`ΔL_z = [(x_a−x_b) × Δp_a]_z`.

For annular partners, `ΔL_z = (r_a−r_b) Δp_theta`.
The magnetic term in canonical angular momentum is unchanged by an
instantaneous velocity collision, so this is also the pair's canonical-angular
error. Units are m × kg m/s = kg m²/s. The observer and measured before/after
ledger implement precisely these identities
(`src/doublewell-dynamics.ts:177–192`). Their comments acknowledge the error
(`src/axisymmetric-collisions.ts:76–80`).

**Reproducible algebraic counterexample.** Put two equal-mass annular particles
at 0.10 m and 0.12 m. Any collision producing A's azimuthal impulse
`Δp_theta = m × 1000 m/s` produces a nonzero total angular increment
`−0.02 m × m × 1000 m/s`, although total pair kinetic energy and local-frame
momentum remain exact. No energy check detects it. Simply, exchanging a sideways
kick at different lever arms produces torque.

This does not justify subtracting measured torque from a trajectory. The code
keeps `maxMomentumResidual` separate from the corrected diagnostic
(`src/doublewell-dynamics.ts:209–214,269–273`), and live qualification uses the
raw value (`src/observable-evidence.ts:45–54`), which is the correct boundary.

**Raw witness read directly.** In
`scientific/collision-v38/execution/results/joint0-101.json.gz`,
`raw.history[-1]` has normalized raw residual 0.0017779606889025382 and
collision torque 0.0017749895509463034. Its maximum saved raw residual is
0.0018847111753279512, while maximum saved energy residual is only
4.504302521061514e−6. The raw angular result exceeds the declared 0.001 budget.
This separates nearly exact energy from meaningful angular error without relying
on the prose report.

**Remediation.** Preserve the adverse classification. A physical transport result
requires jointly refined particle/cell/time studies and a justified continuum
remainder relative to the collision effect. A different angular-conserving local
operator would be separate method work and require rate/distribution benchmarks;
an angular projection or fitted coefficient is not a local correction here.

## 3. Browser convergence data do not supply an accepted envelope

I inspected the actual protocol, terminal ledger, individual compressed raw
history, authoritative `reconciled-readout.json`, and per-level `summary.json`
under `scientific/collision-v38/`. The frozen intermediate is not authoritative:
`scientific/collision-v38/reconcile.py:25–81` enforces unique complete exit-zero
terminal ownership and suppresses incomplete comparison/effect batches.

The retained matrix has 66 complete terminal outcomes, 60 with collisions and
six collision-off controls. The reconciled decisions report 59/60 collisional
runs above 1% unresolved exposure and 28/60 above 0.1% raw angular residual.
There are 275 numerical/sensitivity PASS, zero FAIL, and 265 UNKNOWN decisions;
the continuum status remains UNKNOWN. These are pointwise finite-run
comparisons, not an all-finer-resolution error bound. In particular, a wide
interval or identical discrete result is UNKNOWN, not a demonstrated equivalence
(`src/convergence.ts:45–58`).

The finest `joint2` coverage spans 1.7748908266469812–2.432179810714113% and its
worst raw angular residual is 0.12897427505523962%. The coarser `space` mesh
improves occupancy enough for one seed to fall below the exposure budget, but
its worst raw angular residual is 0.1431678161486921%. This is a measured
locality/occupancy conflict, not proof that all possible browser settings fail.

The observed paired A end-collection difference is −0.010498046875 with
standard error 0.0011311556219983107 and approximate pointwise 95% half-width
0.0029077282811076615. This measures a difference between the selected model
runs; the coverage/torque/continuum gaps prevent treating it as calibrated
physical collector accuracy.

`docs/reviews/v42-collision-data-probe.py` independently reconstructs exposure
from raw active populations and regime fractions, checks saved raw-angular
maxima and all 66 unique terminal identities, and reconstructs the paired effect
from actual exit counts. The completed execution is recorded below.

The older v34 high-N data cannot certify this lower-N browser matrix. Its
`readout/production-summary.json` explicitly retains physical-domain failures.
Here electron temperature is prescribed at 0.5 eV instead of 5 eV; this reduces
the screening-length proxy but does not solve electron dynamics or change the
separately prescribed lnΛ=10 collision coefficient. These remain conditional
inputs, as source `src/doublewell-regime.ts:14–39` makes explicit.

## 4. TA versus Nanbu — supported asymptotes do not imply exact evolution

The variance in `src/coulomb.ts:86–90` is dimensionless:
`v = (Za Zb e²/(epsilon0 μ))² n_eff lnΛ dt/(8π g³)`.
The even/odd finite-N normalization at `:134–148` has the stated empirical
generator: even partner probability 1/(N−1) times n(N−1)/N, and odd probability
1/N times n, both produce n/N per distinct partner. I found no factor-of-two
or reduced-mass defect in this path.

For TA, δ = tan(theta/2) is Gaussian and
`cos(theta)=(1−δ²)/(1+δ²)`. As variance tends to infinity, almost every draw
approaches backward scattering, not isotropy. This follows directly from
`src/coulomb.ts:117–120`. It is correctly labeled a small-angle baseline and
retained for compatibility. A warning count is available at `:153`; it does not
make the large-step distribution physical.

Nanbu uses s=2v and the exponential angular law with
`coth(A)−1/A=exp(−s)`. Its first angular moment is exp(−s); its second is
`1−3exp(−s)/A`, rather than the exact fixed-speed diffusion exp(−3s).
Consequently even a correct finite-step sampler needs timestep refinement.
The existing explicit second-moment negative control is
`tests/collision-angle-v30.test.ts:34–49`. The raw joint0-101 case contains
maximum variance 106.58980069751388 and 1678 pairs above 0.1 out of 1301073;
this is a resolution diagnostic, not an automatic estimate of observable bias.

These conclusions match [Wang et al. (2008), primary comparative analysis](https://www.math.ucla.edu/~caflisch/Pubs/Pubs2008/nanbuConvergenceJCP2008.pdf),
which separates particle and timestep error, and the original
[Nanbu method abstract](https://journals.aps.org/pre/abstract/10.1103/PhysRevE.55.4642).
Objective tests retain first and second Legendre moments, unequal-mass energy
and momentum, and nonlinear heating/drag/distribution refinement separately.
Switching method labels alone cannot repair spatial torque or sparse cells.

The simpler orbit playground has a different neutral model:
`src/physics.ts:272–279` → `elasticCollision` in `src/collisions.ts:8–23`.
This is elastic ion scattering against an initially stationary neutral, with
isotropic relative direction and exact pair momentum/kinetic energy in exact
arithmetic. Only the ion is advanced; the bath remains cold and prescribed.
The ion's lost energy is explicitly accumulated in the neutral-energy ledger
(`src/physics.ts:274,286`), so ion energy/momentum alone need not be conserved.
`collisionProbability` supplies the probability of at least one event, while
the caller samples at most one and applies it after the orbit step. The actual
caller checks optical depth n sigma |v| dt ≤0.02 even on collecting steps
(`src/physics.ts:234–236`). At that maximum a constant-rate Poisson process has
probability approximately 2e−4 of multiple events; the guard is a real
resolution boundary, not a proof of exact event timing. Collision-time/orbit
splitting and cold-bath physics remain approximations requiring timestep
checks. I found no missing ion-to-neutral energy sign in this path.

## 5. Positivity and entropy: distinguish each representation

Live random-pair representatives keep positive fixed weights. Their empirical
distribution is a sum of Dirac masses; this is not a finite differential
Boltzmann H integral. No per-realization physical entropy-monotonicity guarantee
is implemented in `src/coulomb.ts`, nor should random histogram entropy be used
as one without a declared estimator and refinement. Pair conservation is
algebraic; physical accuracy and entropy are separate requirements.

The offline v17 Julia representation is a strictly positive Gaussian mixture
with positive weights and variances
(`scientific/general3d-evolution-v17/core.jl:21–36`). Its moving-node finite
entropy is H_Q (`:48–91`), with a compatible discrete gradient and mobility
(`:162–211`). A solved implicit equation dissipates that finite functional.
It does not automatically prove full-space physical H of the represented PDF
decreases, nor that the unregularized Landau rate is accurate. This distinction
is consistent with the regularized-entropy construction in
[Carrillo et al., primary paper](https://arxiv.org/abs/1910.03080).

The actual archived v17 readout confirms the separation:

- `scientific/general3d-review-v17/results/metrics-summary.json:4–51`: 17 cases,
  617 states, 51 selected equation replays; all case number/energy/momentum
  gates PASS; positive PDF follows from the representation. Physical-H cases
  have two PASS and 15 UNKNOWN; state integration has 217 PASS and 400 UNKNOWN.
- Raw `combined-n8-q5-a005/history.jsonl` at steps 0 and 20 has energy
  3.592083333333333 → 3.592083333333335 and unchanged number, but this does not
  override the distribution comparison failures.
- `results/comparisons/width-a010-a005.json` has a full-3D characteristic-function
  L1 lower witness 0.039082245993980816 for species 1 at 50 µs, far above the
  declared 2e−4 budget. A lower witness is not an L1 integral estimate.
- `results/comparisons/timestep-5us-2p5us.json` has species-2 L1 estimate
  0.00029832645612799097 at 50 µs with reported sensitivity/empirical uncertainty
  6.299328853540429e−7, yielding FAIL. Species-1 remains UNKNOWN under its
  independent integration gate; its suggestive point estimate is not promoted.
- `results/symmetry.json` retains q5 and q9 rotation FAIL witnesses; q9 at
  50 µs is 0.0008779988287277436 and 0.0004377057300542457 for the species.
  Galilean controls PASS. Thus good boost behavior does not establish rotation
  resolution.
- The separate posthoc entropy-sign packet finds positive physical ΔH/N of
  4.441512935215993e−9 with sensitivity 6.280633842803646e−13. It remains below
  the original acceptance budget, so its recorded PASS is not a claim of exact
  entropy monotonicity. See
  `scientific/general3d-entropy-sign-v17/comparison.json`.

These are recorded numerical findings, not a fresh re-execution or a claim
that this reviewer re-integrated all 617 PDFs. Earlier v14 rate failures are
not the latest result: v15 refined initial-rate controls and v16 restricted
radial evolution exist. Their symmetry-restricted/initial-rate successes cannot
qualify v17 drift/anisotropy or spatial separator transport.

PETSc is a different finite-element reference. I checked the official
[Landau example source](https://petsc.org/release/src/ts/utils/dmplexlandau/tutorials/ex1.c.html)
and retained `scientific/petsc-distribution-v12/results/fine-field-summary.json`.
That record contains eight native reconstructed fields with agreement near
roundoff and an exit-zero solver. It also records a quadrature minimum
−1.5536521820254574e−16 at t100us species 1: this fails to provide a strict
whole-domain positivity certificate, but its tiny magnitude alone is not
evidence of significant negative mass or an independently resolved physical
instability. A certificate or a sufficiently separated negative witness is
required before making stronger claims. Native-vector/reconstruction fidelity
does not certify entropy or continuum convergence.

## Verification record and remaining acceptance work

Source/data inspections used `nl`, `rg`, `jq`, and gzip read-only decompression.
No project script, test, dependency install, build or simulation ran on the
host. Primary method pages and code documentation were browsed; a guessed
WarpX docs URL returned 404 and was replaced by the pinned upstream kernel.
No CUA/UI observation was made and no scientific output was deleted.

Parent executed these bounded commands in the existing offline copied guest,
both exit 0:

```
node --import tsx docs/reviews/v42-collision-probe.ts
python3 docs/reviews/v42-collision-data-probe.py
```

The first confirms all three malformed-exposure cases earn a local PASS while
the global verdict stays UNKNOWN. It is a pre-fix defect witness, not an
acceptance test. The second independently reconstructs all 66 unique complete
terminal cases and 60 collisional results: 59 exposure excesses, 28 raw-angular
excesses, zero sampled domain crossings, and exact zero differences from saved
exposure/angular diagnostics. The paired effect and 275/0/265 decision counts
match exactly. It reconstructs saved arithmetic, not new physical evidence.
I reopened the exported stdout in
`scientific/audit-v42/collision-witness.log` and `collision-data.log`.

The parent's tested source was `/work/home/audit-v41-check-source`, the existing
481-input baseline plus individually hashed probe/evidence inputs recorded in
`scientific/audit-v42/receipt.json` and `input-receipt.json`. The parent reports
all 481 baseline hashes matched before/after every command. Probe SHA256 values:
TS `7d8c274ae7b1905d237fef100c418400c7bfdf0ef4a60cde2280b1d2ae8ebdda`;
Python `a5a91a808c5b5e5e99c1bffebe6c22c23f77d3519f874be82d5a77c089f91f40`.
Baseline aggregate is
`4f85060ae4393b8c17ecb616b56cc1be1599162e27820c822a398b0fc7a2a6a4`;
the receipt identifies 479 matching canonical inputs plus the two guest-stage
gate-runner scripts `run-final-gates-v38.py` and `run-final-gates-v39.py`.

I also reopened the receipt and test-log closeout: `npm test` passed 831/831,
zero failed; `npm run typecheck`, `npm run build`, `npm run check:site`, and
`npm run check:assets` each exited 0. These are application checks on that
snapshot, not physical qualification or deployed-browser observation.

Scientific next work should be split: (1) fix/test saved-diagnostic admission;
(2) declare a prospectively bounded browser convergence/continuum protocol;
(3) qualify a rotated 3V entropy/rate/distribution rule before proposing it as
a live replacement. Broad solver replacement is not a justified local fix.
