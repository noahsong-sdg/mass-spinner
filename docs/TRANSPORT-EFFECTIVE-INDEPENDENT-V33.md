# Final effective v33: independent audit

Reviewer: transport33_physics. New effective readout; original and checkpoint
reports/seals remain unchanged. No production change or new physical simulation.

## Finding

The independent frozen analyzer reproduces **240/240 arithmetic PASS decisions**
from all thirty clean completed runs, six per level. Particle, timestep, radial
and axial comparisons each supply 60 decisions. **Transport remains unqualified.**
All five levels fail sampled coverage/domain gates; 23 of 30 runs exceed the 1%
unresolved-exposure budget. Alignment, orientation and physical-effect versus
continuum-bias evidence remain missing. Saved-record consistency and agreement
between two analysis implementations do not establish physical accuracy.

Crucially, the separate [PRNG audit](TRANSPORT-PRNG-V33.md) proves reused uniform
input segments between nominal replicate streams and between initialization and
collisions. Consequently these Student-t intervals are exploratory calculations
conditional on unvalidated independence assumptions; their nominal confidence
coverage is not established for this cohort. This does not demonstrate correlated
physical outputs, quantify interval miscoverage, or invalidate deterministic
ledger values. No output covariance was measured here. The proposed future RNG
cohort must remain separate; it cannot replace seeds/results within v33.

## Provenance and independent first execution

The final catalog SHA is
`fecfc9bea204a817b3cb278d916d1128ad0dc87e8c97d1bba348da0f0a1d258c`;
all-attempts SHA is
`1c7cf3763d813165179bd238d7a843070516d7d293351fd91b0187a7d14de091`.
The prospectively frozen verifier
`104fbeb0c794a9d79907cdbbea0f04e6e7553ccb4dc29443aa4370a32de48b21`
checks all 41 attempts: 30 exact original records plus 11 unique predeclared
resource retries. The original 19 clean rows remain exactly original; each new
row's originalAttempt exactly matches its historical terminal record. Every
request/config/seed/mode, process status, log source identity and supplied
request/log/artifact SHA pin passes. Clean retry records carry no stale original
outer evidence. Each level/seed contributes once. Retained process counts are
30 complete, 6 timeout, 1 interrupted, 4 unrun; effective counts are 30 complete.

The unchanged analyzer checks all 45 frozen source files with identity
`ce9f7d1675841be920363278eaa306077e3ebdfb4af1ba41e08cdf6d7e0705b2`.
Analyzer SHA remains
`8bd1a935ee7de542b2fcebc24d254d65b92a806fa03df1720dcfd5c3e877ec07`;
protocol SHA remains
`3f5ccd4185a881be44d16847f5ed94c88f4cef1e9e87806b5ebddbc1f72c4b2c`.
No gate, horizon, seed, critical value or numerical stopping rule changed.

The blind first readout excluded the production summary, exited 0 in 5.747s under
the fixed 180s analyzer cap, and was exported before reference ingestion. Its
report SHA is
`ce5900800aeb5c311a4b5d300b30e9a1cdb45b0d1c3ef04e74889784fd8c8f35`.
Independent saved-ledger reconstruction across 30 runs disagrees by at most
1.0281e−16; reconstructed observable disagreement is at most 1.7586e−13, within
the frozen accounting roundoff budget. These checks include outgoing particle
and canonical-momentum accounting; they do not observe unsaved distributions.

## Numerical comparisons and remaining failures

| Comparison | Pairs | Arithmetic PASS | Arithmetic FAIL/UNKNOWN |
|---|---:|---:|---:|
| N16384→N32768, r12/z3/h100 | 6 |60|0|
| h100→h50, N32768/r12/z3 | 6 |60|0|
| z3→z9, N32768/r12/h100 | 6 |60|0|
| r6→r12, N32768/z3/h100 | 6 |60|0|

The closest passing interval remains axial A.angularTransfer, with
(|mean|+half-width)/tolerance=0.9877694356, about 1.22% headroom. The intervals are
pointwise, not simultaneous confidence bands; the PRNG caveat above additionally
prevents certifying their advertised coverage.

Percentages below equal saved fractions times 100. Raw angular budget 0.1%;
unresolved-exposure budget 1%.

| Level | Max raw angular defect | Unresolved exposure range | Seeds over 1% | Outside snapshots |
|---|---:|---:|---:|---:|
| N16384/r12/z3/h100 |0.030568%|1.29604–1.57743%|6/6|1|
| N32768/r12/z3/h100 |0.032817%|0.89227–1.17367%|5/6|34|
| N32768/r12/z3/h50 |0.032661%|0.80926–1.26386%|5/6|28|
| N32768/r12/z9/h100 |0.035923%|1.49155–1.88345%|6/6|2|
| N32768/r6/z3/h100 |0.090661%|0.49617–1.13699%|1/6|53|

All 30 raw-angular budgets pass. This does not erase the separately demonstrated
finite-cell systematic rotation damping. More-local meshes reduce lever-arm
mixing but leave fewer representatives per occupied cell; the observed coverage
and torque tradeoff remains unresolved. Timestep refinement alone does not
repair that spatial mechanism.

The recovered h50 seeds 101, 202, 303, 404, 505, 606 have outside snapshot counts
5, 4, 1, 5, 7, 6 respectively. All 118 outside snapshot records across the whole
cohort contain the sampled encounter-magnetization reason at configured limit
0.1; 104 also mention unresolved occupied cells. The h50 contribution is 28
magnetization flags,26 also with unresolved cells. These counts come from raw
saved regime histories. **They verify a sampled proxy gate failure, not that
physical encounters actually became magnetized.** Sparse local moments have
sampling uncertainty. Correcting that estimator requires separate prospective
validation; these flags were not recoded or thresholds adjusted.

## Reference comparison and adversarial persisted-data checks

After the blind export, the production reference
`a1680ea0640ced410e58f82f8b9c7845238906f78b194f9edfb9e2db71964040`
was supplied. All 240 statuses, sample counts and tolerances match exactly.
All 720 finite mean/SE/half-width values meet the frozen scaled roundoff check;
630 are bitwise equal and the largest absolute difference is 3.47e−18. No
reference mismatches. The second analyzer exits 0 in 5.791s under 180s.

Five cheap negative fixtures run only after the blind first export. Each fixture
repins its mutated top-level catalog and attempt-list hashes, so rejection reaches
the intended semantic invariant rather than failing a stale top-level checksum:

1. Duplicate effective seed: rejected by exact expected key-set check.
2. Altered nested originalAttempt: rejected by historical-record equality.
3. Stale original physicalVerdict on clean retry: rejected by retry-field schema.
4. Nonzero clean exit: matching fixture status is also changed to 7; rejected by
   the explicit clean exit-zero requirement.
5. Artifact SHA mismatch: rejected by artifact-byte verification.

All five subprocesses exit 1 at the expected assertion source line; none writes
an accepted analysis summary or completed provenance-verification record. Their
captured tracebacks and fixture script are retained. These are data-integrity
checks, not scientific validation gates or evidence of valid CI coverage.

## Execution and seal

All Python execution was offline in the distinct Apple safe-dev guest
`safe-dev-0183b3b87047e9e2`, source copy
`/tmp/mass-spinner-confirmation-effective-independent-v33`. Explicit sync followed
host edits; valuable guest output was exported before every replacement. The
frozen verifier, both analyzer executions, unchanged descriptive extractor and
five semantic-negative fixtures all pass their intended checks. No dependency
installation, production import, build, physics simulation or unisolated project
execution occurred in this readout.

First and reference evidence are separately preserved under
`scientific/transport-v33/confirmation-independent-effective/first/` and
`reference/`. Names original-descriptive-summary.json/original-outside-frames.json
are inherited from the unchanged descriptive script; here they describe the
final effective catalog. Its reference directory also contains all negative
witness outputs and comparison-numeric-difference.json. The new seal is
`scientific/transport-v33/confirmation-independent-effective/SHA256SUMS`.
Original, checkpoint and preparation seals remain untouched.

The next reviewable change is a prospectively frozen, separately versioned RNG
cohort with recorded generator/domain identity. It addresses demonstrated input
reuse; it does not itself fix unresolved coverage, spatial nonlocality or the
physical-domain estimator. Reapply the same numerical and physical gates to new
data and retain v33 as historical evidence.
