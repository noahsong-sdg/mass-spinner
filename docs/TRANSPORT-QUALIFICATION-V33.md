# Collision transport qualification, v33

8 November 2026. Scope: the live prescribed-field double-well collision backend.
This is not experimental validation, qualification of the separate full-3V
research solver, or evidence of browser/GPU behavior.

## Status

**Transport is not qualified.** The effective five-level cohort now contains
30 clean results, six per level, after eleven predeclared resource retries.
All 240 existing observable-refinement calculations report PASS. Independent
spatial, timestep and final combined blind reconstructions agree. All 30 sampled
raw angular budgets pass; the largest defect is 0.090661%, below 0.1%.
No physical input, source, seed or numerical acceptance budget changed during
recovery.

These numerical passes do not establish calibrated confidence coverage. The
PRNG audit proves reuse of random inputs between nominal replicates and between
initialization/collisions. The independent-stream interpretation of the
Student-t intervals is therefore conditional. All five levels also fail the
sampled model-domain gate; unresolved exposure exceeds 1% in 23 of 30 runs.
There are 118 sampled outside-domain frames, 104 also flagged unresolved.
Alignment/orientation execution and a continuum-bias bound remain absent.

| Retained view | Clean results | Observable calculations |
| --- | ---: | --- |
| Original attempts | 19/30 | 240 UNKNOWN; paired counts 4/0/4/3 |
| Recovered spatial checkpoint | 24/30 | 180 PASS, 60 timestep UNKNOWN |
| Final effective cohort | 30/30 | 240 PASS; stochastic interpretation conditional |

All 41 attempts remain recorded: 30 clean completions, six original timeouts,
one original interruption and four originally unrun cases. A retry is not a new
independent replica. The five non-timestep retries took 254.765–259.368 s each;
the six timestep retries took 492.406–501.555 s each. The original, checkpoint
and effective catalogs/readouts are separate. Missing executions, physical
equivalence failures, uncertain inference and model-domain failures are not
interchangeable verdicts.

The passive rerun localizes one particular warning to four 40-u ions at the
outer edge, with encounter proxy 0.1140665 crossing the configured 0.1 limit.
Ordinary acceptance records do not localize every other flag. The one-cell
mechanism must not be assumed to explain them all, and a sampled proxy crossing
is not an observation that physical encounters became magnetized.

## Root causes and fixes

### Random streams were phase offsets on one short cycle

The [independent PRNG audit](TRANSPORT-PRNG-V33.md) traces the 32-bit additive
state update in `doublewell-dynamics.ts`. Its odd increment traverses one
2^32-state cycle. Changing the seed or XORing a collision seed changes the
position on that same cycle; it does not create a separately keyed stream.
For each collision cell, Fisher–Yates requires `n-1 >= 2*floor(n/2)-1`
uniforms. Recorded pairs plus an upper bound on occupied-cell calls therefore
give a conservative draw-count lower bound without assuming any scattering
draws or positive variances.

The 24 completed acceptance artifacts prove six same-level overlaps of at least
51–67 million uniforms. Seed505 additionally reaches all 589,824 of its own
initialization uniforms during collisions in each completed N32768 level.
The final timestep artifacts extend two overlap lower bounds to 216,211,383
and 230,921,120 uniforms; their counter proof is retained in
`scientific/transport-v33/confirmation-time-recovery/recovery-results/h50-prng-counter-addendum.json`.
In simple terms, separate runs and separate phases can reuse the same random
number tape. This is a demonstrated input-stream defect. It does not measure
output covariance, prove biased means or identify how much Student-t coverage
has changed. Agreement between independent readout programs cannot validate the
missing stochastic independence assumption.

The frozen v33 cohort and all numerical verdicts are retained, with conditional
inference explicitly labeled. A prospective Random123 Philox4x32-10 adapter has
been checked separately: distinct `(seed, phase)` keys and a 128-bit counter,
matching official C output on 10,064 blocks and published known-answer vectors.
Its private integration preserves all 78 historical runs' three saved summaries
exactly. Fresh transport studies remain necessary. This is chosen over changing seed
spacing because a different spacing does not establish separate random streams.
It requires a newly pinned source/algorithm and fresh cohort; archived runs
cannot be relabeled or retroactively repaired. The proof leaf is sealed by
`b1d63d8271cd1f8a5fb82c184ab56540d73c69e6519ae02b70a526e4af3dded7`.

### Finite-cell torque is systematic

The execution path is worker → simulateDoublewell → split collision/orbit steps
→ fixed annular cells → cylindrical-frame Coulomb pairs → saved histories →
executeSeed → paired-seed convergence statistics. At unequal radii, equal and
opposite azimuthal impulses produce physical torque `(ra-rb) Δpθ`.

For a cold common rotation, the independently derived Nanbu mean is
`E[ΔL] = μ Ω (ra-rb)² [exp(-s)-1]`. This damps the rotation magnitude while
conserving kinetic energy: finite-width cells convert ordered spin into heat.
It is not a zero-mean error that extra seeds alone remove. In simple terms,
the collision pair has two different lever arms.

Independent quadrature confirms the mean to 1.06e-5 relative and the expected
factor-four reduction when the radial separation halves. The density-weighted
SI coefficient and finite-N pairing normalization were not found defective.
Measured torque must remain in the raw error budget; subtracting it would hide
the transport error. Refinement of the existing operator is retained instead
of an unvalidated angular-momentum projection that changes its scattering law.
See [independent physics review](TRANSPORT-PHYSICS-V33.md).

### Evolved local sampling is insufficient

The fixed source interfaces and annular cell volumes pass independent inventory
checks. Sparse cells develop predominantly after the pulse expands beyond its
initial support. In the N16384/nr12/nz3/100-ns pilot, all unresolved exposure
is outside the initial source region; its 1.38518% exposure still exceeds 1%.
The fine nz9/200-ns case has 3.07106% unresolved exposure.

In simple terms, the initial pulse is well sampled but parts of its expanded
population are not. Removing those cells, changing the exposure denominator or
coarsening solely to obtain a pass would not establish transport convergence.
The new matrix separately tests particle count, radial mesh, axial mesh and
timestep at the same physical horizon. See the [locality analysis](TRANSPORT-LOCALITY-V33.md)
and [higher-N addendum](TRANSPORT-HIGHN-LOCALITY-V33.md).

The separate [domain witness](TRANSPORT-DOMAIN-V33.md) completed in 106.959 s
and exactly reproduced every saved physical output. The seed303 warning comes
from four 40-u ions in the outer r=0.18333–0.2 m, z=0.4–0.6 m cell, with density
9.1712e13 m^-3 and sampled temperature 0.33513 eV. Its electron screening length
is 1.73577 mm, relative-RMS speed 2202.35 m/s and encounter proxy 0.1140665.
This localizes the estimator's dilute-tail mechanism; it does not establish
persistent continuum magnetization.

Leave-one-out sensitivity spans 0.09875–0.15958; it is not a confidence interval
or valid lower-population gate. Static all-species screening gives 0.02859, but
changing the imposed electron-only screening model would require a justified
dynamic response. Neither calculation replaces the existing threshold. The
0.1 gate is a conservative project scale-separation choice, not a universal
sharp boundary. These distinctions are supported by the primary references in
the domain report.

A separate [estimator audit](TRANSPORT-ESTIMATOR-V33.md) rejects a missing
Bessel-factor hypothesis. For a cell with one species, writing
`S = sum |v_i-mean(v)|²`, the code already uses `T=mS/[3e(n-1)]` and
`g²=2S/(n-1)`, exactly the uniform distinct-pair mean-square speed. Adding another
factor would double-correct the four-ion witness. Cross-species plug-in moments
have a different finite-sample target; that distinction does not affect this
single-species witness and supplies no justified gate-passing correction.

### Research runs were constrained by interactive admission

The browser particle/work ceilings prevented matched higher-N refinement. The
new explicit API argument `simulateDoublewell(config, 'research')` permits up to
65536 representatives per species and 320 million declared particle-steps.
Interactive defaults retain 4096 and 80 million. Both modes retain the nominal
40000-step guard and the same orbit-resolution/domain guards. A configuration JSON property
cannot select research mode through the worker.

These inherited work guards use duration/dt, whereas the recorded proposed work
uses its ceiling; they are nominal admission bounds, not exact integer loop-work
caps at fractional endpoints. All confirmation cases are comfortably inside
both conventions (largest recorded proposed work is 262.21 million). That
resource-convention mismatch is retained as a separate boundary limitation.

This fixes execution admission, not the physical equations. Separate offline
admission is preferable to increasing the browser workload or shortening the
study horizon. Every new SeedRun records its mode, and a convergence plan cannot
silently mix modes. Historical omitted metadata means interactive; explicit null
is rejected. A first implementation incorrectly treated null as missing through
`??`; the regression failed before replacing it with an undefined-only default.

### Collision allocation churn limits practical refinement

CPU sampling attributed 66.55% inclusive time to collision half-steps and 13.05%
to orbit advancement. Heap sampling including collected objects attributed
74.54% of cumulative allocation to collisions. The redundant ring identity Map
and temporary pair vectors were therefore the demonstrated performance target.

The fix uses the original object already stored on each ring wrapper, scalar
pair intermediates, and one relative-speed evaluation. It preserves arithmetic
order, tie-breaking, Math.hypot, validation, random draws, observers and physical
updates. In simple terms, the same collision calculation creates less temporary
garbage. It avoids changing the pusher or introducing a new collision model.

Two independent reviewers checked frozen implementations, extreme/signed-zero
inputs, both angular laws, callback identities, RNG streams and complete
trajectories. Physical outputs were exactly equal. One CPU-profile pair fell
16.64→13.51 s; estimated allocation churn fell 39.56→29.09 GB. These are sampled
case-specific measurements, not a general speed guarantee or live-memory usage.

A separate full-duration N16384 pilot fell 86.876→56.709 s with every physical
output exactly unchanged. Both old and optimized N32768 pilots timed out at
their fixed 150-s caps. Those timeouts remain retained; acceptance-run budgets
were separately declared before execution.

## Frozen confirmation protocol

The five-level, six-seed matrix retains full 200 µs duration, physical inventory,
source, fields, temperatures and Nanbu angular law. Seeds are 101, 202, 303, 404,
505 and 606. Each refinement changes only its advertised setting.

| Level | N/species | nr | nz | dt, ns | Per-run / combined cap, s |
| --- | ---: | ---: | ---: | ---: | ---: |
| Particle base | 16384 | 12 | 3 | 100 | 250 / 1500 |
| Particle fine | 32768 | 12 | 3 | 100 | 400 / 2400 |
| Time fine | 32768 | 12 | 3 | 50 | 800 / 4800 |
| Axial fine | 32768 | 12 | 9 | 100 | 500 / 3000 |
| Radial coarse | 32768 | 6 | 3 | 100 | 400 / 2400 |

Here nr/nz are base-grid counts. Preserved source faces at r=0.08 m and z=0.15 m
add interfaces: nr12/nr6 execute 13/7 annuli, and nz3/nz9 execute 4/10 slabs.
The independent configuration review found no confounded physical settings.

Paired whole-run Student-t intervals, not interacting-particle intervals, must
fit the existing budgets: fractions/CDF 0.01, radius/a 0.01, residual temperature
0.1 eV, impact-time/duration 0.02, species angular transfer 0.001. Raw angular
maximum is limited to 0.001 and sampled unresolved exposure to 0.01. Undefined
populations and zero-spread discrete differences remain UNKNOWN.

Plan SHA256: a384961e2acab2c1ba09a14da879884219dde2d8ee8e62233c1099f02a4aec18.
Shared 45-file map SHA256:
5e965a159a712b48413b6bf9afbad6b1d9d2b17968a301163644c58397cf5a18.
Executed sourceHash:
ce9f7d1675841be920363278eaa306077e3ebdfb4af1ba41e08cdf6d7e0705b2.
Each study additionally pins its complete plan and runner inputs. Errors,
timeouts and unrun cases remain in the status records; no partial batch supplies
a six-seed certificate. See `scientific/transport-v33/confirmation-plan.json`.

The initial concurrent execution recorded 400-s high-N timeouts and an 800-s
timestep timeout. These are execution failures, not measured physical
disagreements. The remaining h50 execution was explicitly stopped to release
resources: seed101 retains its original timeout, seed202 is interrupted, and
four later seeds are unrun. No raw timestep artifact was admitted. The original
plan, status and stopped volume were preserved. Its separately frozen recovery
keeps every seed, configuration, code hash and numerical gate, with 1200 s per
run/7200 s combined and at most one heavy Mass Spinner simulation VM at a time.
The five non-timestep retries completed serially, followed by the six timestep
retries, with no overlapping heavy Mass Spinner simulation VM. All eleven
completed cleanly. The original readout remains immutable and the recovered
cohort has a separate readout. A retry is not an additional independent seed.

## Remaining requirements

The independent [gate review](TRANSPORT-GATES-V33.md) reconstructs all 78 retained
runs and 540 historical observable decisions: 63 PASS, 0 FAIL, 477 UNKNOWN. Broad
whole-run uncertainty dominates that matrix. UNKNOWN does not identify a
coefficient bug or prove disagreement.

The whole-study contract also requires unimplemented alignment/orientation
execution and an actual continuum-bias bound relative to the collision effect.
Those require a separate reviewable implementation. Reporting an observed
refinement difference as a continuum bound would not satisfy the existing gate.
No conservation, covariance or cross-code result from another backend replaces
these requirements.

The independent [next-step design review](TRANSPORT-QUALIFICATION-NEXT-V33.md)
splits missing sensitivity execution from prospective studies and a validated
bias estimator. The present two-resolution comparisons can test equivalence;
they cannot identify asymptotic orders, joint discretization bias or the
collision-on/off effect. Even identical results after a rigid azimuthal rotation
would remain UNKNOWN under the existing zero-spread statistical rule. A discrete
symmetry test needs its own explicit contract rather than a retroactive waiver.

The [published-method review](AXISYMMETRIC-COLLISION-DESIGN-V33.md) found no
verified drop-in angular repair for this two-ion full-orbit operator in its
bounded search. Published entropy-preserving markers can retain finite-cell
angular defects; neutral-gas angular repairs can change axial momentum, and
coordinate repairs introduce artificial transport. A local velocity-distribution
solver with independently validated conservative particle/grid transfer is a
separate possible torque-control stage. It would not by itself resolve the
unmagnetized-encounter domain assumption or qualify the current backend.

## Verification and isolation

The [final independent reconstruction](TRANSPORT-EFFECTIVE-INDEPENDENT-V33.md)
checked all 30 artifact identities and ledgers before receiving the production
reference. All 240 decisions, seed counts and tolerances agree. Across 720 finite
statistics the largest absolute difference is 3.47e-18. The tightest comparison,
axial species-A angular transfer, uses 98.77694% of its budget. Five repinned
negative provenance fixtures reject duplicate cases, changed nested originals,
stale outer fields, nonzero exits and artifact-hash corruption. These checks
validate the readout contract, not the PRNG confidence assumption or model domain.

The effective catalog and complete 41-attempt catalog are retained separately in
`scientific/transport-v33/readout-effective/`. Their SHA256 values are
`fecfc9bea204a817b3cb278d916d1128ad0dc87e8c97d1bba348da0f0a1d258c` and
`1c7cf3763d813165179bd238d7a843070516d7d293351fd91b0187a7d14de091`.
The production readout completed in 2.173 s against 115 pinned inputs, map SHA256
`70f478c4f4af647c19f70b5c87ff9b3f87e4d6ac4e4696ea26bb4c8e7d522383`.
Its summary SHA256 is
`a1680ea0640ced410e58f82f8b9c7845238906f78b194f9edfb9e2db71964040`.
The independent 653-member leaf seal is
`80b6fd6444fba35fe129adb95becf8163accf5dfb32ae743ba41727376b0203e`.
The integrated legacy-cohort evidence is indexed by
`scientific/transport-v33/ROOT-SHA256.json`. This report closes v33 before the
separately pinned v34 random-stream integration and fresh trajectories.

Production changes are limited to `coulomb.ts`, `axisymmetric-collisions.ts`,
`doublewell-dynamics.ts` and `convergence.ts`, with regression tests and offline
study tooling. No pusher, UI, physical defaults or numerical gate was changed.
All dependencies, tests, profiling and simulations execute in distinct copied
Apple safe-dev guests. Guest results are exported before source replacement.
Host operations only edit, copy, read and hash trusted files. No host credentials,
home directories, signing keys, SSH agents or control sockets are mounted.

Deliberate macOS-only control exceptions were read-only resource inspection and
stopping the uniquely identified owned timestep guest
997b5c27-5da1-4154-a995-926a1900f0fa, after matching its volume and command.
No other VM/job was stopped. The scoped stop and export are recorded separately
in `confirmation-time/execution-stop.json`.

The final copied application snapshot passed all **545/545 tests**, strict
TypeScript checking, the production build, `check:site` and `check:assets`.
Commands were `npm test`, `npm run typecheck`, `npm run build`,
`npm run check:site` and `npm run check:assets`, offline in
safe-dev-305acbe9d26c2717. Exact 342-input map SHA256:
d12c04d35d65a0f6f0d377dc0a13c3e0f308bb97dfb9ee9a7dd9b63e8787b3b5.
All inputs were checked before and after the sequence. Logs and release hashes
are retained in `scientific/transport-v33/final-checks`; complete export is
`/tmp/mass-spinner-transport-v33-final-export`.

Neither an asset-structure check nor a provider deployment establishes observed
browser controls, WebGPU rendering or mobile layout. No such observation was
made in this iteration.

## Publication

The checked 130-file release was published to the existing Cloudflare worker.
The provider reported version `bf08ff90-5591-4e4f-9456-0441408232a7` at 100%
on 8 November 2026 at 22:46:17 UTC. All release hashes matched before publishing
and during the subsequent provider check; aggregate release SHA256 is
`7a96754de70a57899cb528fd8ef2783b6e43d9dc966642ce59e50de73803f664`.
The receipt explicitly records `browserVerified: false`. Publication evidence
is retained in `scientific/deployment-v33`, sealed by
`87ef764d7121f43bbd14f97930ec9842654cf1e1bb14bbeb4c0eaaf9c522341e`.
