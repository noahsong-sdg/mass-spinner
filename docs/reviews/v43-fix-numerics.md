# v43 numerical-control and saved-diagnostic fixes

9 November 2026. Scope: v42 findings 2, 3 and 4. No equilibrium equations,
collision operator, physical tolerance, execution ceiling or transport
qualification was changed. Root coordinates guest execution and final evidence.

## Finest radial grid

**Problem and traced cause.** The accepted centrifuge result disables the
refinement button at 2000 intervals, but the click callback independently
constructs `min(2000, 2*bins)` without requiring an increased resolution. A
callback invoked at the cap therefore solves the same deterministic grid and
labels its zero difference as refinement evidence. In simple terms, the finest
calculation can be checked against itself.

**Fix.** `radialRefinementSettings` returns a strictly finer supported settings
copy or null. The main callback checks that result before calculating, displays
“No finer supported grid; radial convergence unassessed” at the cap, and names
both interval counts for real comparisons. Accepted-state availability uses the
same helper. Final button restoration respects the cap.

**Why this fix.** A strict comparison invariant repairs the evidence path while
preserving the existing 2000-interval solver boundary and every physical input.
Raising the cap would only move the self-comparison defect to a new ceiling;
silently comparing a lower grid would change the meaning of the requested check.

**Regression evidence requested.** The helper tests execute nonuniform
400→800, 1000→2000 and 1500→2000 equilibria. A separate test runs the actual main
click callback with injected DOM/worker boundaries and real equilibrium solves:
2000 must make no calculation call or inventory estimate, while 400 and 1000
must execute and name distinct grids. This is a CPU/callback test, not a deployed
browser or GPU test. Existing absent-species display semantics are preserved.

## Research-mode CLI

**Problem and traced cause.** `run-convergence.ts` validates the plan's execution
mode, then formerly called `executeSeed` with three arguments. The omitted
fourth argument defaults to interactive. The resulting mode mismatch correctly
fails strict batch admission. Simply, the command accepted the instruction and
forgot to pass it to the solver.

**Fix.** Forward `selected.executionMode` to `executeSeed`; omission retains its
interactive default. The result admission check is unchanged.

**Why this fix.** It corrects the argument at the exact dropped boundary. Changing
the saved label afterward, widening interactive limits or relaxing the checker
would conceal the actual execution mode.

**Regression evidence requested.** Real subprocess CLI tests use one-step,
eight-representative, two-seed cases with declared research mode and omitted mode.
They require complete runs, the corresponding recorded execution mode, no
artificial complete-batch failure and an overall UNKNOWN scientific gate.

## Saved collision diagnostics

**Problem and traced cause.** After source/config/RNG/mode admission,
`summarizeConvergence` checked exposure only for null and an upper budget,
outside counts for truthiness, and raw angular residuals against an upper budget.
JavaScript comparisons let undefined/NaN exposure and negative fractions/norms
look acceptable. In simple terms, malformed measurements could look unusually
good because only excessive values were screened.

**Fix.** At this ingestion boundary, exposure must be a finite number in [0,1],
outside snapshots a nonnegative safe integer, and raw angular residual a finite
nonnegative number. Missing/invalid diagnostics remain UNKNOWN. A valid observed
outside count above zero and a valid measured raw residual above budget retain
FAIL, even if another measurement is missing. Valid overbudget exposure keeps
its existing UNKNOWN semantics. Valid historical summaries retain their reason
strings and values.

**Why this fix.** These are the quantities' actual domain invariants. No coercion,
clipping, missing-value zero defaults or trajectory modification is justified.
The fix changes admission of malformed evidence, not the physical thresholds or
the retained unresolved transport classification.

**Regression evidence requested.** Synthetic source/config/RNG-matched complete
records test negative, nonfinite, missing, null and wrong-type exposure/norms;
fraction overflow; fractional/unsafe outside counts; exact zero and budget
boundaries; and measured-failure precedence. JSON round trips explicitly remove
each diagnostic member and the entire diagnostics object to represent stale
persisted shapes. Existing frozen RNG summary tests check valid legacy behavior.

## Verification ownership and limits

This contributor read the safe-dev README and made only trusted host file
reads/edits. No project code, install, build or test was run on the host; no VM was
created, synchronized or deleted by this contributor. Root transfers these edits
to the one existing guest, records the exact tested snapshot, and owns the final
gate. At report creation these new regressions had not yet executed.

Narrow requested command, inside that guest source:

```sh
node --import tsx --test tests/convergence.test.ts tests/convergence-cli-v10.test.ts tests/convergence-admission-v43.test.ts tests/radial-refinement-v43.test.ts tests/random-source-v34.test.ts tests/transport-research-v33.test.ts
```

Root must append the actual command results and snapshot identity before
claiming verification. Software regression success does not qualify collision
transport, certify experimental accuracy or close missing continuum/refinement
evidence.
