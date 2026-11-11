# Collision transport qualification, v34

8–9 November 2026. Scope: the prescribed-field, two-ion, full-orbit live
double-well backend. The separate full-3V research solver is outside this study.

## Status

**Transport remains unqualified.** All 30 fresh Philox runs completed cleanly.
All 240 existing numerical refinement decisions and all five sampled raw
angular-budget gates pass, independently reconstructed blind before the
production reference was supplied. All five sampled model-domain gates fail.
Sixteen runs exceed the 1% unresolved-exposure budget; 109 saved frames across
24 runs cross the encounter-magnetization proxy threshold. Alignment/orientation
execution and a defensible continuum-bias bound remain missing. A separately
selected passive diagnostic localizes the worst saved crossing and reproduces
every physical output exactly; it does not change these verdicts.

The corrected application passes all 557 tests, strict TypeScript checking,
production build, site checks and asset checks. Independent reviewers froze the
fresh cohort's provenance and unchanged acceptance protocol before execution.

The [v33 report](TRANSPORT-QUALIFICATION-V33.md) closes the complete historical
30-run cohort separately. All 240 numerical comparisons pass there, but their
confidence interpretation is conditional because random input segments repeat.
Twenty-three runs exceed 1% unresolved exposure and all five levels have sampled
model-domain failures. None of these records is relabeled as a Philox result.

## Demonstrated defect and correction

The preceding v33 work removed redundant collision-loop allocations and ring
lookups while preserving arithmetic, random draws and observer behavior. It
also separated explicit offline research admission from interactive limits.
Those failures were execution cost and admission limits, rather than evidence
of a different collision coefficient: in plain terms, the intended studies
could not finish under the original resource envelope. The narrow performance
fix and explicit research mode were chosen over changing collision physics or
raising browser limits. Historical timeouts and interruptions remain retained;
the fresh v34 cohort required no retries. The [v33 report](TRANSPORT-QUALIFICATION-V33.md)
contains the exact regression, snapshot and recovery evidence.

The execution path is worker → simulateDoublewell → initialization RNG and
collision RNG → split collisions/orbits → executeSeed → convergence statistics.
The old Mulberry32 update adds an odd constant to a 32-bit state. Every seed is
a phase offset on the same 2^32-state cycle; XORing the collision seed changes
that offset, rather than creating another keyed stream. Recorded pair counts
prove that these long studies reuse tens to hundreds of millions of inputs
between nominal replicas, and one collision stream reuses its own initialization
inputs. Separate readout programs cannot repair that stochastic assumption.

Simply, several runs were reading overlapping portions of the same random-number
tape. This proves input reuse, not measured output covariance, biased means or
an observed amount of confidence-interval miscoverage.

The fix adapts the existing Random123 Philox4x32-10 algorithm, using exact
uint32 arithmetic, key `(seed, phase)` and a full 128-bit block counter. Phase
tags are 0 for initialization and 1 for collisions; uniforms remain uint32/2^32.
Existing Gaussian transforms, shuffle and angular laws are unchanged. Different
seed/phase pairs have distinct keys; same-seed reuse across resolution levels
is intentional for paired comparisons. Different keyed inputs do not prove
mathematical independence or imply that individual random values never match.

This was chosen over wider spacing of old seeds because spacing cannot create
independent keyed streams on one cycle. It uses an established counter-based
generator with a reproducible official oracle, without adding an unverified
runtime package or changing the stochastic scattering transformation. The
adapter matches 10,064 official C blocks (40,256 words), upstream known-answer
tests and a separate BigInt oracle. Counter carries and exhaustion are tested.
The complete Random123 BSD notice survives in the built worker bundle.

Primary implementation: [Random123](https://github.com/DEShawResearch/random123),
commit `9545ff6413f258be2f04c1d319d99aaef7521150`;
[official documentation](https://random123.com/releases/docs/).
Evidence is retained in `scientific/transport-v34/rng-adapter/`.

## Historical records and invalid inputs

New defaults explicitly select `philox4x32-10-u32-v1`. A supplied historical
configuration with an omitted selector still uses `mulberry32-v1`; its saved
settings are not rewritten or silently upgraded. Explicit null and unknown
selectors are invalid. Fresh SeedRun records identify the executed generator.
Missing historical headers resolve to legacy, while missing/stale/null headers
cannot admit a result into the new cohort. Configuration/header disagreement
invalidates the record, including a relabeled legacy result. A plan cannot hide
a generator change inside a nominal particle or timestep comparison.

This preserves reproducibility without treating corrupt data as a valid old
format. Eight regressions cover the boundary, including a frozen legacy golden
trajectory. All 78 retained historical runs reproduce their three saved
summaries exactly. See [integration review](RNG-INTEGRATION-V34.md).

An additional [independent gate review](TRANSPORT-GATES-V34.md) passed eight
bounded checks: separate BigInt/KAT arithmetic, key/counter bounds, exact plan
identity, legacy/stale/null metadata, unchanged UNKNOWN requirements and all
78 historical summaries. It executed no physical trajectory and inspected no
active campaign result. Its 16-file evidence is sealed separately.

## Prospective study

All 30 trajectories are fresh: five numerical levels × seeds 101, 202, 303,
404, 505, 606, full 200 µs. Every physical setting, comparison and acceptance
budget equals v33; only the explicit RNG selector is added to each config.
No archived trajectory, diagnostic pilot or partial result can substitute for
a cohort member. One heavy simulation VM executes serially with predeclared
1200 s/run and 18000 s combined caps. Errors/timeouts/unrun cases are retained.

| Level | N/species | Base radial/axial cells | Step |
| --- | ---: | --- | ---: |
| Particle base | 16384 | 12 / 3 | 100 ns |
| Particle fine | 32768 | 12 / 3 | 100 ns |
| Time fine | 32768 | 12 / 3 | 50 ns |
| Axial fine | 32768 | 12 / 9 | 100 ns |
| Radial coarse | 32768 | 6 / 3 | 100 ns |

Preserved source faces add interfaces; these are base counts, not the final
number of annuli/slabs. Research admission remains 65536 representatives per
species and 320 million nominal particle-steps. Browser admission is unchanged.
This matrix covers one physical configuration, not the full slider range. Its
research particle counts exceed the interactive ceiling; a pass cannot be
transferred to a lower-particle browser preview.

Plan SHA256: `5d73f77d31f9052097c1a9097468e545a31791b5896b344556696bb64abec8d9`.
46-file map SHA256: `ceaf1bb94f3a1ce4f37aaef128c7cf057c0d6cf73a1291d6d5bafc6b38cee9a0`.
Executed sourceHash: `4ace5d1e542015ecb4a2be87e1a946a514612f95cd4543a0ca32611445ddd6e6`.
Complete 49-input campaign map SHA256:
`388f428e9dc2317deb78a055e7392f2b02c8cc2c6ebecf1d117761d58f8e0b9e`.
The source/plan/runner files are checked before and after execution, with source
checks additionally bracketing each executeSeed call.

The [independent protocol](TRANSPORT-INDEPENDENT-PROTOCOL-V34.md) retains the
v33 numerical analyzer byte-for-byte. Its separate preflight requires explicit
Philox config/header/log provenance, exact process status, requests, source and
artifact hashes before computing statistics. Its prospective protocol and
cohort pins were exported and verified before the first full simulation case.
The source-derived maximum of 262,209,536 collision blocks is below counter
exhaustion; no measured draw-count claim is made.

## Unchanged qualification requirements

The existing paired whole-run Student-t decisions require six complete matched
seeds. Fraction/CDF and radius/a budgets are 0.01, temperature 0.1 eV,
impact-time/duration 0.02, angular-transfer 0.001. Raw angular momentum must stay
within 0.001 and unresolved exposure within 0.01. Undefined or zero-spread
populations remain UNKNOWN. Intervals are pointwise approximate intervals,
not simultaneous confidence bands or experimental validation.

Finite-width collisions have a systematic torque when pair radii differ;
the independent cold-rotation mean is
`E[ΔL]=μΩ(ra-rb)^2[exp(-s)-1]`. Extra seeds do not remove that bias.
Sparse evolved cells and the unmagnetized encounter assumption also remain
physical/sampling constraints. No torque subtraction, clipping, screening
replacement or threshold relaxation is adopted to manufacture qualification.
Alignment/orientation executors and a defensible continuum-bias bound remain
separate missing requirements, as documented in the frozen v33 design review.

## Fresh results and independent readouts

Every declared case completed once, exit 0, at the full physical horizon.
No resource retry, replacement seed, shortened horizon or partial result was
needed. All 92 original campaign outputs are retained under
`scientific/transport-v34/campaign-results/`; their seal is
`2a8085e1ca65d77af1c51e05da140db308a552d47ca7c465e7b30d0295c23692`.
The 30-case catalog SHA256 is
`2bbdcd6c9a5ef014a1fc1d00e092d8302aa8cf3758844827221df45ede9af35f`.

All four observable comparisons pass their 60 existing decisions, using six
matched seeds each: particle count, timestep, axial mesh and radial mesh.
Independent and production counts, tolerances and all 240 verdicts match.
Among 720 finite mean/SE/halfwidth values, 644 are bitwise equal and the maximum
absolute difference is 6.94e-18. The closest comparison is axial species-A
angular transfer: `|mean|+halfwidth=0.000937535`, or 93.7535% of its 0.001 budget.
This is approximate pointwise numerical evidence, not an asymptotic bias bound.
Angular percentages below use the recorded positive normalization, including
a thermal scale; the signed initial total is near zero.

| Level | Maximum sampled raw angular error | Runs with exposure >1% | Runs with outside-domain frames |
| --- | ---: | ---: | ---: |
| N16384, r12, z3, 100 ns | 0.0340339% | 6/6 | 3/6 |
| N32768, r12, z3, 100 ns | 0.0304270% | 2/6 | 5/6 |
| N32768, r12, z3, 50 ns | 0.0309641% | 2/6 | 6/6 |
| N32768, r12, z9, 100 ns | 0.0363463% | 6/6 | 4/6 |
| N32768, r6, z3, 100 ns | 0.0871611% | 0/6 | 6/6 |

The unchanged raw angular budget is 0.1%. The maximum is therefore below the
budget, without subtracting accumulated collision torque. Exposure above 1%
alone means UNKNOWN; an outside-domain frame makes the existing sampled
coverage verdict FAIL. All five levels fail that latter check, including r6
where every exposure is below 1%. Unresolved exposure ranges from 0.57808% to
1.88462% across the cohort. Comparing threshold-crossing counts with legacy
runs is descriptive; it does not demonstrate systematic physical improvement
from changing the generator.

The [independent raw audit](TRANSPORT-RAW-RESULTS-V34.md) finds zero admission,
population, horizon, collision-accounting or reconstruction issues. Independent
raw-angular and exposure reconstruction differ from the producer by at most
3.37e-17 and 3.13e-17, respectively. All 109 outside frames have the same reason:
the sampled local encounter proxy reaches 0.1. There are no reference-state,
coupling, Debye-population or Coulomb-log threshold violations. Ninety-nine of
those frames also have a sparse-cell reason. Aggregate extrema cannot identify
which cell supplied each flag, the number of affected ions, or whether a
crossing represents continuum physics rather than sampling noise. In particular,
a frame-active-time proxy is not an offending-cell ion fraction.

The independent-first statistics were exported before reference ingestion:
`/tmp/mass-spinner-confirmation-independent-v34-first-export`, report SHA256
`3f308ac6322275850d1d62593ad0f31037b15b36a5e4fb63190983447ee5fe6c`.
The separate reference comparison preserves that export. Root production
readout took 1.188 s, verified 145 input hashes before/after, map SHA256
`550ac05288c03629e19a0a58a399741f0e44c53ae79cfc5b00f4862406827fb7`.
Its summary SHA256 is
`387cc610ad3539d8c89d382b3668ab235be96fe3b0517490faf373c6e228c688`.
Three actual-CLI negative cases reject timeout status, exit137 and a corrupted
artifact SHA, with no summary written. CLI success denotes readout execution,
not physical qualification. Logs and pins are under
`scientific/transport-v34/readout/`.

The [final independent statistical audit](TRANSPORT-CONFIRMATION-INDEPENDENT-V34.md)
also repins three deliberately invalid records consistently across artifact,
catalog and status hashes. Missing, null and legacy RNG headers each reject at
the intended identity assertion before an accepted summary can be written.
Its 219-file evidence seal is
`22294359d98947bbc09be31d65664f74458008fb52b7cc2a257957d0430019a9`.
The separate 14-file raw-audit seal is
`d0de25177db732739ed397b9370d2b5a1d5ed5972c5bf2d44345000b66c516da`.

## Remaining domain failure localized

The [passive diagnostic](TRANSPORT-DOMAIN-V34.md) used a selection rule frozen
before reading physics outputs: the completed case with largest finite observed
encounter proxy at or above 0.1, with declared deterministic ties. This selected
N32768/r6/z3/100 ns, seed505. One separately authorized full-200µs replay took
139.969 s. Its instrumented source identity is separate from acceptance; after
excluding only sourceHash and durationMs, the entire remaining SeedRun is
strictly identical, including all RNG/config metadata, observables and raw data.
It is a diagnostic, never a seventh replicate or a replacement acceptance run.

The worst captured state at 167.7µs contains five 84-u ions in the outer
r=0.166667–0.2 m, z=0–0.15 m cell. Independent Decimal/direct-pair reconstruction
confirms density 3.99503e13 m⁻³, Bessel-corrected temperature 0.0563858 eV,
relative RMS speed 623.378 m/s, electron screening length 2.62993 mm and
gyrofrequency 68918.1 s⁻¹. Their ratio `Ω λe/g=0.290754` crosses the unchanged
0.1 gate. Coupling, estimated Coulomb log and Debye population remain within
their separate diagnostic bounds.

In plain terms, the sampled heavy tail is cold and dilute, making the screening
scale long relative to its moment-derived gyroradius. This is a correct
calculation under the declared electron-screening convention; the underlying
continuum tail is not independently measured. All five delete-one moment
sensitivities remain above the gate (0.255550–0.341360), as does a separate
13-marker heavy-ion capture (0.111290–0.125129). The legacy four-light-ion
explanation therefore does not describe every new crossing. Delete-one results
are sensitivities, not confidence intervals or proof of continuum failure.

Conditional static all-species screening would lower the worst ratio to
0.0307037. Streaming non-Maxwellian ions need not provide that static response;
substituting it would change the model. No such substitution, temperature
floor, Bessel rescaling, smoothing or gate relaxation is adopted. The source
already has the correct same-species n−1/distinct-pair identity.

The five captured warning cells account for 5.22404e-6 of sampled active-ion
time in this one case. That descriptive quantity does not bound unsampled
encounters or final observable error, replace the 1% unresolved-exposure check,
or explain other cases' warnings. Captured velocities are already cylindrical;
frame conversion has separate source/synthetic checks. All captured cell and
pair moments were independently reconstructed before the reviewer read the
producer's conclusions. See the [independent actual-cell audit](TRANSPORT-DOMAIN-INDEPENDENT-V34-ACTUAL.md)
and its separate [preparation review](TRANSPORT-DOMAIN-INDEPENDENT-V34.md).

Preparation and selection are sealed separately. The 17-file execution seal is
`fcdbbbec32513e5dd69e0154318bfae549ac8f46bb78efa3b83ac5b9f86cd19f`;
the exact-output proof SHA256 is
`ca59d75c56855f202137c7c628dfff315f1f6a54184dba72388226d4d533ab10`.
The independent actual-data review's 25-file seal is
`b57934b829791f06b3b3a59bfdb774a90b3c11809e882ede51638b19c7d33644`.
Its three isolated saved-data commands passed, including all five direct
distinct-pair checks and comparison against producer conclusions only after
the independent first result was exported. It made no production changes and
ran no additional physical trajectory.

## Reviewable next work

The remaining blockers require separate scientific changes, rather than a local
scalar patch:

1. Add the missing executable alignment/orientation and matched collision-off
   controls. Define the deterministic symmetry/zero-spread contract explicitly;
   the current statistical gate cannot certify an identical finite sample.
2. Resolve the cold dilute tail with justified joint particle/cell studies and
   a benchmarked screening/encounter treatment. More particles alone cannot
   establish the unmagnetized-encounter assumption. The existing electron-only
   result stays unsupported wherever its current gate fails.
3. Establish a continuum-bias bound relative to the collision effect, using
   enough resolved levels to examine asymptotic behavior and coupled errors.
   The present two-resolution equivalence checks supply no such bound.

These splits preserve the demonstrated code fixes and negative evidence. A
different collision model, conditional supported domain or rigorously bounded
tail error would need a newly declared protocol and independent benchmarks.
Passing conservation and refinement statistics cannot substitute for them.

## Application checks and isolation

Exact 347-input tested map SHA256:
`2684adbbc33e863955193d13be6f7f3a0a80495787d1290a3a4c10a4ef850e1c`.
Commands, all exit 0: `npm test` (557/557), `npm run typecheck`, `npm run build`,
`npm run check:site`, `npm run check:assets`. Inputs matched before/after; the
eight applied files match that tested copied snapshot. The study CLI was then
pinned separately. Logs, release hashes and the license check are retained in
`scientific/transport-v34/final-checks/` and complete export
`/tmp/mass-spinner-transport-v34-final-export`.

After the cohort/readouts, all 347 tested inputs matched again: 346 canonical
application inputs plus the archived test wrapper. All 46 cohort source files
and all 2424 immutable v33 proof members also matched. The reconciliation is
`scientific/transport-v34/application-source-reconciliation.json`, SHA256
`97cb572b942be0829de96b807644d68bf729834e335317ba3b57bc6326f4854b`.
Subsequent changes are reports and research-only readout/diagnostic evidence;
the application suite has not been repeated against unchanged app code.

All dependency installation, upstream compilation, tests and simulations run in
copied Apple safe-dev guests; results are exported before guest replacement.
No home, host credentials, SSH agent, signing keys or control sockets are mounted.
Host operations are trusted file edits, reads, copies and hashing. No browser,
GPU or mobile observation follows from these checks or provider publication.
All physical simulation jobs have ended and unique outputs have been exported.
The integrated evidence index is `scientific/transport-v34/FINAL-SHA256.json`;
it covers the retained v34 evidence, reports and deployment receipt without
hashing itself. Its verification records file integrity, not physical validity.
Final trusted-host byte checks verified all 14 named leaf seals and their 615
unique files; details are in `scientific/transport-v34/final-leaf-integrity.json`.

## Publication

Cloudflare confirmed version `2c07fc55-fc03-4802-9278-3b98331ed33f` at 100%
on 9 November 2026 at 02:58:05 UTC. The checked 130-file release aggregate is
`910eb86d784259a2ff1a0483dbd3bd20f2ae7f81dd4a15a3ab860721551fb8af`.
Release membership and every hash were checked before publication and again
against the provider rollout. Receipt and commands are retained in
`scientific/deployment-v34/`; `browserVerified` is explicitly false.
