# Independent collision physics diagnosis v33

Reviewer: transport33_physics. No production edits.

## Status

Original-method diagnosis is complete. The inspected coefficient, random-pair
normalization and selected angular law pass the existing narrow tests. The
finite-radial-cell method nevertheless has a demonstrated **systematic rotation
damping** term. This is not a new finite-time transport qualification. Independent
high-particle research-mode reproduction is complete below: the N16384 pilot
passes the raw angular budget but exceeds the unresolved-exposure budget. It
therefore remains unqualified.

## Traced execution and ranked hypotheses

The live path is doublewell configuration → simulateDoublewell → collision
half-step → spatial grouping → local cylindrical velocities → random matching →
SI Coulomb variance → selected angular law → velocity update → raw canonical
momentum and collector histories → whole-run seed equivalence gates.

1. Radially separated partners mix different lever arms and rigid-rotation
   velocities. Predict a nonzero mean angular defect proportional to dr² at fixed
   scattering length, with unchanged pair energy. Time refinement alone does not
   repair this nonlocal generator.
2. Local populations are too sparse on fine meshes. Predict coverage improves
   with N at fixed geometry but worsens with finer cells at fixed N. This reviewer
   does not own the separate coverage study.
3. Finite-s angular and pair-reselection errors bias distribution evolution.
   Predict fixed-speed higher moments approach angular diffusion when subdividing
   the scattering length. Passing first-moment/conservation tests is insufficient.
4. A coefficient, scheduling or diagnostic algebra bug would disagree with an
   independently derived SI variance, tagged-pair normalization or actual
   before/after torque. The checked narrow cases do not support this hypothesis.

## Exact finite-cell damping witness

For two representatives at ra and rb, the original ring collision exchanges
equal/opposite tangential momentum. Consequently

  ΔL = (ra−rb) Δpaθ.

Take a common rigid rotation vθi=Ωri, with identical axial velocity and no radial
velocity. Its cylindrical relative tangential speed is Ω(ra−rb). For the Nanbu
law, E[gθ′]=exp(−s)gθ, and reduced mass μ gives

  E[ΔL] = μ Ω (ra−rb)² [exp(−s)−1].

For Ω<0 the expectation is positive, reducing the magnitude of the negative
angular momentum. For Ω>0 the sign reverses, again damping rotation. It is not
merely a zero-mean random walk. The magnetic contribution to canonical momentum
is unchanged because a collision does not move positions.

Simply, equal kicks at different lever arms slow the bulk spin even while their
total kinetic energy remains constant. That lost bulk rotation can appear as
thermal energy. More seeds only estimate this bias more accurately.

The prospective probe uses unequal 40u/84u masses, Ω=−50000 s⁻¹, gaps
0.02/0.01/0.005 m, s=0.01/0.2/2, and independent azimuths. Each case has 32768
midpoint polar points and paired azimuths 0/π, totaling 65536 calls to the actual
collideAxisymmetricCell. The declared cell density is twice the target partner
density, because the unchanged N=2 finite-N normalization is one half.

All nine cases pass the predeclared checks:

- Mean angular impulse agrees with the derived expectation within 1.058e−5
  relative, inside the fixed 2e−4 quadrature budget.
- Halving the radial gap divides the observed mean by four at fixed s.
- Pair relative energy residual is at most 5.91e−16.
- Axial momentum residual is at most 1.91e−16.
- Direct angular change versus the callback torque differs by at most 4.79e−16
  of the initial angular scale.
- The independently evaluated SI variance agrees within its 2e−14 budget.

This cold pair is an algebraic collision-kernel witness, **not** a claim that a
zero-temperature plasma satisfies the solver's weak-coupling/regime assumptions.
The densities are selected to hold s fixed and are not a transport parameter fit.

## Angular and normalization checks

The coefficient is

  v = (Za Zb e²/(epsilon0 μ))² n_eff lnΛ dt/(8π g³),
  s = 2v.

For even cell size N, random matching selects each possible partner with
probability 1/(N−1), while n_eff=n(N−1)/N. Their product is n/N per empirical
partner. For odd N, one representative is uniformly unpaired, each possible
partner has probability 1/N and n_eff=n. Thus the same n/N generator weight is
retained. This explicit empirical self-exclusion differs from some
species-separated production-code conventions; importing their coefficient
without their scheduling would be wrong.

Fresh existing tests pass 11/11: independent unequal-mass Maxwellian exchange
rate, weak-angle resolution, Galilean covariance, enumerated odd/even matching,
ring frames/volumes, support interfaces and actual physical torque. No new
coefficient or pair-normalization error is demonstrated.

Fixed-speed angular composition remains approximate. At total s=1, one-step
Nanbu P2 is approximately 0.085305 versus angular diffusion exp(−3)=0.049787.
Composing 32 equal pieces gives approximately 0.049839. This diagnostic isolates
the angular kernel, not evolving relative speed or a full Landau distribution.
Its midpoint quantile quadrature has a finite endpoint error, especially at small
s; the recorded P1 deviations are quadrature diagnostics rather than a claim
against the exact imposed first moment.

The primary [Wang et al. comparison](https://www.math.ucla.edu/~caflisch/Pubs/Pubs2008/nanbuConvergenceJCP2008.pdf)
was reopened. It separates timestep bias from particle statistics and treats TA
and Nanbu as approximations to the Landau operator. This supports retaining
independent particle/time/distribution gates rather than certifying transport from
a corrected angular limit.

## Existing angular-conserving methods and research-only proposal

The [Skovorodko AMC DSMC method](https://arxiv.org/pdf/physics/0401026) changes
tangential collision weights to mr, repairs energy by rescaling radial/axial
velocities, and rejects infeasible cases. It is not a justified drop-in here:
the rescaling can alter axial momentum and Coulomb angular statistics.

The [Oikawa et al. ALG method](https://www.jspf.or.jp/PFR/PDF/pfr2010_05-S2026.pdf)
uses approximate physical encounters with position and momentum evolution.
It conserves total angular momentum but changes the microscopic spatial model;
it is not a replacement function for random local ring collisions.

The [Brizard–Sugama Landau bracket](https://arxiv.org/abs/2506.22289) connects
angular conservation to spatial locality. It does not validate a finite-width
ring kernel merely because its global torque is zero.

No established primary Coulomb implementation of the following exact nullspace
variant was found in the targeted search. It is therefore a mathematical
research proposal only, not implemented or qualified in this iteration:

  wr = sqrt(μ)(vra−vrb), wz = sqrt(μ)(vza−vzb),
  wθ = sqrt(ma mb/(ma ra²+mb rb²)) (rb vθa−ra vθb).

Complete these with orthonormal centers corresponding to Pr, Pz and Lθ in
mass-weighted velocity coordinates. Rotating w while preserving those centers
conserves kinetic energy, Pr, Pz and L exactly. For fixed positions, the common-T
rigid-rotation Maxwellian is uniform on each residual sphere; a symmetric angular
kernel whose rate depends only on |w| is reversible on that measure.

At ra=rb>0, w=sqrt(μ)(va−vb), recovering the ordinary local kernel. For unequal
radii, using |w|/sqrt(μ) changes the physical relative speed and anisotropy.
Writing I=ma ra²+mb rb², S=ma ra+mb rb and M=ma+mb, relative tangential peculiar
velocity after removing Ωpair=L/I is [S/sqrt(MI)] times wθ/sqrt(μ). Away from
the axis this factor differs from one quadratically in dr/r; no uniform near-axis
consistency proof follows. Both radii zero is a rank change because L then
vanishes identically.

Exact invariants and stationary measure would not prove finite-mesh Landau
rates, transport or distribution convergence. The old callback torque formula
would also need revision: such a map has raΔpaθ+rbΔpbθ=0, generally not equal/
opposite tangential impulses. This iteration deliberately retains the original
collision operator and investigates higher-N spatial convergence instead.

## Independent high-N candidate reproduction

This initial high-N candidate changes admission and convergence-run provenance, not the
collision kernel. The actual doublewell-dynamics diff was inspected: only the
execution-mode type, validation ceiling and mode argument forwarding changed.
In this explicitly retained snapshot, default interactive admission remains at 4096 representatives per species;
research admission allows 65536, preserving the 40000-step and 80-million-work
bounds. An admissible 32-per-species collision run produced exactly equal result
objects in default and research modes. Explicit checks rejected the high-N
configuration in default mode, rejected N65537 in research mode, and retained
the existing work and step limits.

A fresh independently executed full-duration run used N16384 per species,
12 radial / 9 axial source-fitted cells, Nanbu, h=200 ns, duration=200 μs,
seed101 and explicit research mode. It completed in 85.582 seconds under the
prospective 150-second cap. All scientific execution was offline in the distinct
guest listed below; raw output was exported before any further sync.

- Maximum raw normalized angular residual: 0.00028824063972223107
  (0.0288241%), below the frozen 0.1% budget.
- Unresolved exposure: 0.030710604307645196 (3.07106%), above the frozen
  1% budget. The retained scalar budget comparison says `fail`; the production
  convergence gate correctly calls insufficient coverage `unknown`.
- Outside-domain sampled states: zero.
- Maximum sampled energy residual: 0.000004265179847215162.
- Unpaired representative exposure: 0.00288629584067534.

Independent reconstruction used sampled active counts and mean canonical
momenta plus all collector impacts whose times preceded each snapshot. Its raw
angular ledger agrees with the production history within 6.20e−17 of the initial
positive scale. The independently reconstructed maximum agrees with the
diagnostic within 1.20e−17. Every sampled species population sums to its injected
population. Integrating each final radial-density curve over annular volume
gives exactly its unconditional surviving fraction (0.198486328125 for A,
0.306884765625 for B). Reintegrating unresolved exposure gives the same retained
value. These checks validate accounting and reproduction, not physical accuracy
of the underresolved populations.

One successful high-N run cannot satisfy the existing six-seed paired spatial,
particle, timestep, alignment and orientation equivalence requirements. No gate
was loosened. This pilot establishes that N16384 still does not meet the chosen
local-coverage budget. Its 200 ns step differs from the historical 100 ns
campaign, so that historical comparison alone would not isolate particle bias.

Exact checked source hashes include:

```
doublewell-dynamics.ts abbd16b22f3b55089644b11fdb2f869db2d218453a66ff09d65376b4758fe04d
convergence.ts d7df4f83246b7d5057417385bb7a6d8c4a9d579d40fc056acf8942d564b99bd1
coulomb.ts 92a2fb84e6df657495871e43107ffd7b7c99b2a9fd974008a403db4e67ff3565
axisymmetric-collisions.ts 0ce57aec0ab24fe410101598d130019059905ece3e4bae7f1348ba2d8886bc47
```

All source hashes, the raw compressed SeedRun, runtime/command logs, independent
ledger summary and copied candidate sources are retained in
scientific/transport-v33/physics/highN. The prospective plan and harness are
high-n-plan.json and high-n.ts in the parent physics evidence directory.

## Measured computation bottleneck

A separate prospective 90-second baseline probe profiled the actual production
N4096 / r12 / z9 / h200 ns / full200 μs / seed101 case, with the original
unchanged physics source above. Node's CPU profiler with `--import tsx` completed
in 16.639 seconds and collected 16.532 seconds of sample weight. Inclusive stack
categories overlap and must not be summed:

| Path | CPU sample weight |
| --- | ---: |
| Collision half-step including partition | 66.55% |
| Ring-frame pair cell | 50.27% |
| Coulomb pair cell | 38.10% |
| Spatial partition, all callers | 12.20% |
| All orbit advance | 13.05% |
| Generic Boris step | 2.55% |
| Quartic fields | 0.33% |
| Sampled snapshot record | 3.64% |
| Regime inspection | 0.55% |
| Garbage collector | 13.13% |

The main exclusive frame was scatterCoulombPair (18.49%). An orbit callback
name helper accounted for another 4.06%, so the generic-step share alone is not
a strict bound on all possible scalar-orbit benefit. The profile nevertheless
falsifies generic Boris arithmetic as the dominant measured runtime bottleneck.
The collision path is the stronger target for a minimal allocation reduction.

A separate prospective 90-second allocation probe completed in 18.767 seconds.
It used a local in-process inspector session, with no network debug endpoint.
Heap sampling explicitly included objects collected by both minor and major GC.
The primary [DevTools protocol definition](https://raw.githubusercontent.com/ChromeDevTools/devtools-protocol/master/json/js_protocol.json)
was checked because its default reports surviving objects, which would hide the
temporary allocation churn under investigation. Sampling interval was 65536
bytes; these are statistical allocation estimates, not exact byte counters.

Estimated total allocation during the run was 39.56 GB, most of it temporary
and collected. This is **not resident memory or live heap size**. Inclusive
fractions were collision half-step 74.54%, ring frame/cell 61.54%, Coulomb cell
36.03%, partition 6.96%, all orbit advance 22.62%, generic Boris 11.97%, quartic
fields 2.38%, sampled snapshot 2.45%, and regime inspection 0.43%. These also
overlap. This independently supports prioritizing collision-array and ring-wrapper
allocation over changing the orbit integrator.

One concrete redundant structure was traced: each ring wrapper already carries
its original ion, but the old path also constructs entry arrays and a Map for
the same original-ion lookup. Directly using that existing field can preserve
every arithmetic operation, guard, observer identity and RNG draw. Candidate
equality and timing were subsequently checked below. CPU and allocation raw profiles, commands, runtime caps,
and exact executed-source maps are preserved in the `profile` and `allocation`
subdirectories of this reviewer's evidence directory.

## Final allocation-reduced candidate audit

The final candidate was frozen separately after the baseline profiles. The only
physics-path edits inspected were scalar expansion of the existing three-vector
pair arithmetic, reuse of its unchanged relative speed in the unchanged rate
formula, and removal of the redundant ring-wrapper Map. Validation, arithmetic
ordering, basis tie-breaking, robust Math.hypot, angular law, density
normalization, pair scheduling and random draws were retained. The orbit
integrator was left unchanged, consistent with the measured bottleneck.

The root cause of excess computation was repeated temporary vectors and a
duplicate original-ion lookup structure in the collision hot path. Simply, the
same small pieces of data were repeatedly packaged and discarded millions of
times. Removing that packaging addresses the measured cost without changing the
physical approximation or adding another collision model.

Independent exact comparisons pass:

- 936 pair edge cases across both angular laws, including signed zeros, equal
  basis components, coordinate axes, tiny and enormous finite speeds, zero
  parameters, and extreme allowed uniform draws.
- 11 invalid-input or invalid-RNG cases preserve errors and draw counts.
- 12 ring-cell cases with zero, odd and even populations preserve diagnostics,
  next RNG draw, original observer identity and mutable-observer update ordering.
- Fresh execution of root's 20000-pair and cell tests, plus the final admission,
  mode equality and stale-provenance tests: 5/5 tests pass.
- The entire full200 μs N4096 / r12 / z9 / h200 ns / seed101 physical SeedRun
  equals the original kernel exactly. Only durationMs, sourceHash and the level
  label were excluded. Config, mode, observables, diagnostics, raw histories,
  exits and final distributions all match. The physical fingerprint is
  e44298575a635c4240eb4defa81886b4b301cddcc267c551dad25c97bb8ebed6.
- Root and independent original-kernel N16384 outputs likewise match exactly.
  CPU-profile and allocation-profile versions also reproduce identical physics.

The final explicit offline research admission allows 320 million nominal
particle steps instead of the earlier pilot's 80 million, to admit a matched
N32768 / h100 ns study. Interactive admission remains 4096 representatives per
species and 80 million particle steps. Both modes retain 40000 physical steps
and the same orbit-resolution limits. Fresh mode tests verify these boundaries;
this is a resource-admission change, not an accuracy-tolerance change. The old
80-million pilot provenance above is retained rather than relabeled.

Matched-case CPU profiling took 13.510 seconds for the final candidate versus
16.639 seconds for the baseline. Measured collision-half-step sample weight fell
from 11.002 to 7.935 seconds; Coulomb-cell sample weight fell from 6.298 to 3.405
seconds. A single profiled pair is evidence of improvement in this case, not a
general speedup estimate or a repeatability interval. Both runs respected their
prospective 90-second caps.

Separate sampled allocation dropped from an estimated 39.562 GB to 29.086 GB
(26.5% less cumulative churn). Collision-half-step allocation dropped from
29.489 to 19.086 GB and Coulomb-cell allocation from 14.256 to 5.855 GB.
These are overlapping sampled categories, not live-memory sizes. The allocation
profiler itself took 19.915 seconds versus 18.767 seconds before; intrusive
allocation timings do not establish a wall-clock improvement. Its physical
output still exactly matches the CPU-profile output.

The same-step one-seed particle comparison has unresolved exposure 7.32056% at
N4096 and 3.07106% at N16384, with otherwise matching r12 / z9 / h200 ns
settings. This supports the sparse-coverage diagnosis but both exceed 1%.
The N4096 raw angular residual is 0.0242082% versus 0.0288241% at N16384;
increasing particle count at fixed radial mesh does not remove the finite-cell
torque mechanism. Six-seed and independent refinement gates remain necessary.

Final checked hashes:

```
coulomb.ts 3ae1013f33a6b719451b5314817769fa0b81ab4b817a521f0880d94b55f44cfc
axisymmetric-collisions.ts 2e2c1da25716aa2e7486b9962986878d23c8dc4e9b1f69949a43469babc820b0
doublewell-dynamics.ts f88bca34dfb4e9304d5167e6c516292a1d7f5149a506ad28db6bce59c99a5530
convergence.ts d7df4f83246b7d5057417385bb7a6d8c4a9d579d40fc056acf8942d564b99bd1
```

The complete final source snapshot, hashes, edge/test logs, whole-run comparisons,
CPU profile, allocation profile and both raw SeedRuns are retained under
scientific/transport-v33/physics/final. This audit finds no demonstrated physical
regression in the allocation fix. It does not certify collision transport: the
retained local-coverage and multi-seed convergence requirements are not met by
these one-seed cases.

## Reproduction

All numerical execution occurred offline in distinct Apple guest
safe-dev-075899b94961c9ba, copied from
/tmp/mass-spinner-transport33-physics. Dependency download alone used online
npm ci --ignore-scripts. No host code execution or host/home/credential mounts.

The recorded original-method gate took 4.853 seconds under a predeclared
180-second cap:

  node_modules/.bin/tsx scientific/transport-v33/physics/probe.ts
  node_modules/.bin/tsx --test tests/coulomb-independent.test.ts
    tests/audit31-angular.test.ts tests/axisymmetric-collisions.test.ts

Exact source hashes, command logs, plan and numerical JSON are under
scientific/transport-v33/physics/original. Original guest results were exported
before any candidate source synchronization:
/tmp/mass-spinner-transport33-physics-original-export.

The original probe source and plan remain separate from any subsequent
high-particle study. Frozen historical gates and v30/v31 records are unchanged.
