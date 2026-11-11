# Independent fresh-Philox confirmation, v34

Reviewer: transport33_physics. The fresh 30-run cohort passes all 240 declared
paired numerical convergence decisions and all five raw-angular-error gates.
It does **not** qualify collision transport: every level fails its coverage
gate, 16/30 runs exceed the 1% unresolved-exposure budget, and the saved-domain
proxy reports 109 outside-supported-domain snapshots. Alignment, orientation,
and physical-effect-versus-continuum-bias evidence remain absent.

## Blind protocol and identity

The protocol and source were frozen before the first science case; see
`TRANSPORT-INDEPENDENT-PROTOCOL-V34.md`. The unchanged stdlib analyzer imports
no production model. All execution was offline in safe-dev guest
`safe-dev-9b87390ab6daf83a`, stage
`/tmp/mass-spinner-confirmation-independent-v34`. No physical simulation,
dependency installation, or host execution of project code was performed here.

The final catalog SHA256 is
`2bbdcd6c9a5ef014a1fc1d00e092d8302aa8cf3758844827221df45ede9af35f`.
All 30 rows are unique, clean exit-0 completions. Every request, log, gzip,
process status, explicit research mode, complete configuration, Philox header,
46-file source map and source identity matches the prospective pins. There are
no v33 retries or historical outputs in this fresh cohort. The tested source is
`4ace5d1e542015ecb4a2be87e1a946a514612f95cd4543a0ca32611445ddd6e6`.

The first wrapper exited 0 in 3.047235751 seconds under the fixed 180-second
cap. Its first export, made before receiving the production reference, is
`/tmp/mass-spinner-confirmation-independent-v34-first-export`; it is copied
verbatim to `scientific/transport-v34/independent-final/first/`. First report
SHA256: `3f308ac6322275850d1d62593ad0f31037b15b36a5e4fb63190983447ee5fe6c`.
First RNG/input ledger SHA256:
`ff8245f8fdfd18897d46cfa8d45cc49c37b700e476728d2884715ba7c83f1824`.
The parent verified both before supplying its reference.

## Independent results

Each comparison uses the original six seeds, paired Student-t interval and
unchanged tolerances. Particle refinement, timestep halving, axial refinement
and radial refinement each pass 60/60 gated decisions. The two impact-energy
observables per comparison remain descriptive because no tolerance was declared.
Pointwise intervals are not simultaneous confidence bands.

| Level | Maximum raw angular error | Unresolved exposure range | Runs above 1% | Outside snapshots |
|---|---:|---:|---:|---:|
| 16384, r12 z3, 100 ns | 0.034034% | 1.316707–1.816805% | 6/6 | 6 |
| 32768, r12 z3, 100 ns | 0.030427% | 0.850648–1.176182% | 2/6 | 26 |
| 32768, r12 z3, 50 ns | 0.030964% | 0.878109–1.189579% | 2/6 | 28 |
| 32768, r12 z9, 100 ns | 0.036346% | 1.565406–1.884625% | 6/6 | 11 |
| 32768, r6 z3, 100 ns | 0.087161% | 0.578078–0.861991% | 0/6 | 38 |

All maximum raw angular errors are below the unchanged 0.1% budget. This is a
finite error bound, not exact angular-momentum conservation; the known
finite-cell torque mechanism remains. Finer axial cells raise unresolved
exposure at fixed particle count. Coarser radial cells improve occupancy while
raising torque and saved-domain warnings. Timestep halving alone does not
remove these spatial and validity constraints.

Independent reconstruction of populations, collision/boundary angular ledgers,
geometry, exposure and plotted observables reports no errors for all 30 runs.
The largest scaled ledger difference is `9.508453052697874e-17`; the largest
observable difference is `2.2382096176443156e-13`. Full per-case values are in
`independent-final/descriptive/blind-descriptive-summary.json`, extracted and
exported before reference ingestion.

Every one of the 109 outside snapshots includes the encounter-magnetization
proxy exceeding its configured 0.1 limit; 99 also report sparse occupied cells
with fewer than four representatives of a present species. This establishes
consistency of the saved flags, not the validity of an unsaved encounter
distribution or a proof that physical scattering is magnetized. The proxy can
be affected by poorly resolved local tails. A separate passive localization
witness must not be counted as another acceptance replicate or replace these
saved outcomes. Its interpretation cannot turn these coverage failures into a
transport-qualification pass.

## Production comparison and persisted-record negatives

Only after the first export was preserved was reference SHA256
`387cc610ad3539d8c89d382b3668ab235be96fe3b0517490faf373c6e228c688`
received. The separate reference run exited 0 in 2.855782501 seconds. All 240
decision statuses, sample counts and tolerances agree exactly. Of 720 finite
means, standard errors and interval halfwidths, 644 are bitwise equal; the
maximum absolute difference is `6.938893903907228e-18`. The closest passing
gate is axial A.angularTransfer: `abs(mean)+halfwidth = 0.0009375348256211528`
against tolerance `0.001`, or 93.7535% of the bound.

Three cheap persisted-record negatives independently remove, null, or replace
the complete-record randomSource header with the legacy version. Each gzip,
catalog and process-status artifact hash is repinned consistently. All three
fail at the intended randomSource metadata assertion, before the statistical
analyzer writes any accepted summary. Thus rejection is semantic, not merely
an unrelated file-hash mismatch. The unchanged complete 30-run positive case
passes. Script and complete results are in `independent-final/negative/`.

The short-state RNG bug was input-address reuse between distinct replicates or
initialization and collision phases. In simple terms, nominally separate random
experiments reused parts of the same stream. Explicit Philox seed/phase keys
and a counter address the demonstrated cause while preserving an explicit
legacy selector for old records. Merely changing seeds would not eliminate the
short-cycle mechanism. Source-derived draw bounds are not measured counters,
distinct keyed inputs are not a guarantee of unique random outputs, and this
fix alone does not prove application confidence coverage or collision physics.
The old v33 sealed readouts retain their original conditional-inference caveat.

No physical equation, gate, tolerance, seed, stopping criterion, or previous
seal was changed by this audit. This is an independently reproduced numerical
convergence pass with explicit physical coverage failures, not qualified
transport. The final leaf seal includes the first source/data snapshot,
reference comparison, descriptive records, negative fixtures and this report.
