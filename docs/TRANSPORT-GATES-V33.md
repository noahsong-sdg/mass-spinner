# Independent transport gate review, v33

2026-11-08. Gate/statistics reviewer; no production edits. This review separates
the live prescribed-field collision transport backend from the offline full-3V
research backend and from homogeneous external-code reference studies.

## Retained outcomes independently confirmed

An independent Python standard-library script imports neither production nor
previous reviewers' code. It reads all 78 complete v30 run artifacts, rebuilds
raw angular momentum from active species means plus exits at their actual times,
and recomputes active-population-weighted trapezoidal unresolved exposure.
Every reconstructed raw maximum/exposure agrees within 2e-13 absolute with its
stored diagnostic. These checks establish artifact consistency, not continuum
physical accuracy or unsaved particle distributions.

The same script recomputes all nine paired whole-run comparisons using the
unchanged budgets. It independently integrates the Student-t5 CDF and inverts it
to obtain 2.570581835636312. The rounded production quantile changes a retained
half-width by at most 5.04273e-8 and changes no verdict. All 540 gated observable
decisions agree with the archived summaries: **63 PASS, 0 FAIL, 477 UNKNOWN**.

| Comparison | PASS | Wide interval UNKNOWN | No spread UNKNOWN | Undefined UNKNOWN |
| --- | ---: | ---: | ---: | ---: |
| Ring TA128 → Nanbu128 | 10 | 49 | 1 | 0 |
| Nanbu128 → dt50 | 4 | 55 | 1 | 0 |
| dt50 → dt25 | 2 | 57 | 1 | 0 |
| Nanbu128 → N512 | 6 | 54 | 0 | 0 |
| N512 → N1024 | 9 | 51 | 0 | 0 |
| N512 nr3 → nr6 | 12 | 48 | 0 | 0 |
| N512 nr6 → N1024 nr12 | 8 | 52 | 0 | 0 |
| Closed TA256 → Nanbu256 | 4 | 40 | 10 | 6 |
| N512 nr6 nz9 → nz18 | 8 | 51 | 1 | 0 |

The dominant obstacle in this matrix is broad whole-run uncertainty, rather than
undefined or identical outcomes alone. Intervals crossing an equivalence budget
do not establish either agreement or disagreement. In particular, the next
production fix cannot honestly be selected by calling all 477 unknowns physical
bias failures. The actual demonstrated FAILs are the raw angular budgets of
insufficiently resolved configurations; the fine annular level meets that gate.
Its sampled unresolved exposure still exceeds 1%, so coverage remains UNKNOWN
under the existing contract. Those categories must remain separate.

The independent output retains per-observable differences, half-widths, reasons,
all 13 level maxima and all 78 reconstructed diagnostics. Historical gates and
artifacts were not changed.

## Traced execution and structural qualification limits

The live path is worker → simulateDoublewell → orbit/collision Strang sequence
→ collision-cell partition/pair operator → saved histories → executeSeed →
observeDoublewell → summarizeConvergence. The latter pairs whole runs by seed;
interacting representatives and saved timepoints are not independent replicas.

Current summarizeConvergence cannot return a whole-study PASS even if every
executed numeric comparison clears its budget:

1. validateConvergencePlan rejects alignment and orientation comparisons as
   executor-unsupported, while the summarizer always requires those coverage
   directions and appends UNKNOWN when they are missing.
2. It always appends `effect versus numerical error: UNKNOWN`. The physicalEffect
   route only records collisional-minus-control seed intervals; no executed
   numerical-error or continuum-bias bound is attached to them.
3. Selected mathematically empty populations have undefined observables, while
   identical discrete differences have no estimated sampling spread. Both remain
   UNKNOWN intentionally. Removing them after results would change acceptance.

These are unimplemented evidence requirements, not a newly demonstrated
collision-rate algebra bug. They warrant a separate reviewable contract and
executor change. Passing raw angular conservation or adding markers must not be
presented as whole transport qualification while those requirements remain open.

Old source retained for the trace:

- convergence.ts: d4f7e3acea3026c1948539dc260d1ed285c6d27dc755f72fa47a4d13f9e133c1
- doublewell-dynamics.ts: ea30d19703dfd83d1f8bee7ba20c47bfee95df60af9d4f2cb8600dbdd201557f

## Minimal prospective next studies

Actual sparse-cell resolution should be probed by a fixed joint marker/r-z mesh
ladder at the full 200 µs horizon, keeping source, physical weights, fields,
collision law, seeds and numerical gates fixed. Do not choose a coarse mesh merely
because it passes occupancy; that can hide spatial bias. Do not keep adding
seeds until an interval happens to pass. Freeze a new matrix and runtime budget
before acceptance runs and report every planned case, timeout and unrun case.

Separate executable sensitivity work can preserve existing numerical budgets:

- Orientation: apply a declared global rigid rotation to each complete initial
  x/y and vx/vy vector after sampling. Keep the z state and random streams fixed.
  Adding an angle only to sampled position while leaving thermal velocities
  unchanged would resample the experiment instead of rotating it.
- Alignment: shift declared radial/axial partition faces, retain physical end
  faces and declared source-interface faces, and recompute exact annular volumes.
  Only moving a metadata width or changing source support is not a mesh-alignment
  experiment. Radial and axial shifts must be separated before a joint check.
- Provenance: serialize/hash executed sensitivity settings. Historical missing
  settings mean exact legacy defaults, not completed sensitivity coverage.

A collision effect whose confidence interval exceeds a prescribed budget, along
with passing measured refinements, is evidence relative to those *observed
refinements*. It does not automatically bound continuum bias: there may be a
common error across all resolutions. The current effect gate explicitly asks for
the latter. A new estimator or theorem must be derived, prospectively tested and
identified before that gate can be promoted. A fit to favorable transport output
is not an error bound.

The homogeneous v30 cross-code study is also narrower: its four primary 0.1-eV
moment equivalence gates and its production time-refinement gates are UNKNOWN.
The separate offline full-3V study retains 30 refinement FAIL/2 UNKNOWN and eight
rotation FAIL outcomes, with fresh distribution witnesses in v31. Neither set is
repaired merely by refining this inhomogeneous live solver.

## Independent review of the research admission candidate

Root introduced an explicit research admission mode that raises the per-species
particle ceiling from 4096 to 65536 while retaining the 80-million-particle-step,
40000-step and physical orbit-resolution guards. Existing calls default to
interactive. This enables new resolution studies without changing the collision
equations or exposing a browser setting. It is an execution-budget correction,
not itself a repair or qualification of finite-resolution transport.

The executed mode is stored on SeedRun and declared on the convergence plan;
mode-mismatched records cannot fill a complete batch. Historical absent mode is
interpreted as interactive. The worker call remains unmodified and cannot select
research by a property inside configuration JSON.

This reviewer found one new persisted-data bug in the first candidate:
`r.executionMode ?? 'interactive'` admitted explicit null metadata as a historical
missing value. Runtime and plan validation reject null, so cohort membership
was inconsistent with that invariant. In simple terms, a corrupt execution label
was being mistaken for an old record without the new label.

The independent red probe is 5 PASS/1 FAIL: null-labeled records incorrectly
filled an interactive batch. Root changed normalization to default only for
undefined, preserving genuinely old records and rejecting corrupt explicit null.
This narrow fix is preferable to inventing a migration default or rejecting all
historical data. Exact red source/probe/logs remain in candidate-red/.

The corrected candidate passes **23/23 tests**: seven independent probes plus
the root admission, existing convergence and v31-locality suites. Strict source
TypeScript checking also passes. Independent tests verify the research ceiling,
unchanged work/physical guards, rejection of invalid modes and configuration-only
opt-in, identical admissible physics across omitted/interactive/research modes,
stale and corrupt records, and unchanged missing-coverage/effect statuses.

An actual persisted-data compatibility test replays all 78 archived records
through the current summarizer. Every pulse, closed and axial summary object is
deeply equal to its archived JSON, including all verdicts and numbers. The
independent raw/statistical reanalysis is also byte-identical before and after
the candidate. These checks do not rerun the original trajectories.

Final tested hashes:

- convergence.ts: d7df4f83246b7d5057417385bb7a6d8c4a9d579d40fc056acf8942d564b99bd1
- doublewell-dynamics.ts: abbd16b22f3b55089644b11fdb2f869db2d218453a66ff09d65376b4758fe04d

At 200 µs/100 ns, N16384 costs 65.536 million particle steps and is admitted.
The matched 50-ns case costs 131.072 million and remains rejected. Consequently,
the new mode enables the planned locality/particle pilot, not every required
fine-N timestep study. A later larger execution budget must be explicit and
prospectively planned; an unmatched low-N timestep comparison cannot certify it.

## Exact execution and reproducibility

All execution occurred offline in the distinct copied Apple guest
safe-dev-20ce5c35f7bacfbc, stage /tmp/mass-spinner-transport33-gates. No dependency
installation or networking was required. The prospective numerical budget was
180 seconds, enforced by timeout. No home, credentials, SSH agent or control
socket was mounted. Host actions only read/copy/hash/edit trusted files.

Command, prefixed by safe-dev -C /tmp/mass-spinner-transport33-gates run --:

`timeout 180 python3 scientific/transport-v33/gates/audit-retained.py`

Exit 0. Inputs are three frozen campaign JSON documents plus all archived final
results/logs and the new audit script, copied into the same relative gate folder.
The 161-input map-file SHA256 is
3b95c67b7d16d3c38f29914131c86dd7a45a3b3e710e2f862eed998371382cf9.
The script verifies every pinned input before computing. Exact raw inputs remain
in scientific/live-collisions-v30/campaign/final/results and in the preserved
export /tmp/mass-spinner-transport33-gates-original-export. Compact new evidence
and exact original production modules are in scientific/transport-v33/gates.

Before replacing guest inputs for the candidate, the original reanalysis was
exported to the directory above. Source, locked Node dependencies and the probe
were explicitly synced. Only npm ci --ignore-scripts used network; later source
syncs were preceded by export and followed by offline installation.

The first candidate source and failing probe were exported to
/tmp/mass-spinner-transport33-gates-candidate-red-export before correction.
The final runner pins 80 source/test/script inputs before and after these offline
commands:

```
node_modules/.bin/tsx --test scientific/transport-v33/gates/contract-probe.ts tests/transport-research-v33.test.ts tests/convergence.test.ts tests/audit31-locality.test.ts
node_modules/.bin/tsc --noEmit
python3 scientific/transport-v33/gates/audit-retained.py
```

All exit 0. Recorded subprocess wall times are 0.8965, 1.6920 and 0.8278 seconds.
Final export: /tmp/mass-spinner-transport33-gates-final-export. Exact final source
map, logs, summaries and candidate modules are copied into gates/final/.

No further demonstrated correctness defect remains in this admission/provenance
scope. This review does not claim the repository-wide build, a new physical
trajectory convergence matrix, browser observation or deployed transport
qualification. Parent owns final integrated checks and publishing.
