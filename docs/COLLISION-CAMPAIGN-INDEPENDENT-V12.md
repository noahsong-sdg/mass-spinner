# Independent audit of the 41-case collision campaign

7 November 2026 UTC. This reviewer did not implement or execute the producer's
WarpX/TA campaign. It independently inspected the frozen plan and comparison
path, then recomputed raw-array checks and published statistics in a separate
Apple safe-dev VM using Python's standard library. Production physics was not
edited. Audit software passes; collision equivalence remains **UNKNOWN**.

## Traced contract

`plan.json` declares the physical case, exact case membership and prospective
0.1 eV pointwise budgets. `suite.py` generates cases and invokes the pinned
WarpX runner. `compare.ts` validates physical identity and provenance, verifies
shared initial arrays at fixed N/seed, then calls the actual production TA
comparison. `analyze.py` aggregates whole-run paired differences.

Independent `scientific/collision-review-v12/audit.py` does not import those
producer validators or statistical functions. It separately derives the case
set and checks:

- Exactly 41 unique physical cases/names match the frozen plan: 24 main timestep
  runs, four larger-N runs, eight Nanbu runs, four common-temperature controls
  and one collision-off control. The separate default-law replay is not pooled.
- Reference byte hashes, input-deck hashes, runner identity and production source
  hashes match. The three production physics-module digests also match v11.
- Absolute density, log, duration, cell volume, model, N, timestep and seed match
  the plan; agreement among stale files alone is insufficient.
- Every checkpoint has exactly zero six-component fields, unchanged inventories,
  unique and stable per-species particle IDs, exact constant weights and the
  declared species masses/charges. Physical velocity is recomputed from proper
  velocity. Raw second moments are recomputed from the actual velocity arrays.
- Initial particle arrays are bitwise identical across timestep/angle-law cases
  at fixed N/seed. Collision-off arrays and production comparison moments remain
  unchanged. Marker refinements are paired by whole-run seed, not particle identity.
- Total relativistic WarpX energy and momentum are recomputed from raw arrays.
  Independent maxima are approximately **1.962e-12** and **4.8e-14**, respectively,
  against positive initial physical scales. Tiny differences from the producer's
  near-roundoff momentum residual reflect summation order. Production reported
  maxima are **4.489e-13** and **5.788e-15**; both methods meet the 1e-10 invariant
  audit threshold. These checks do not establish the correct collision rate.
- All **176** published cross-code and per-code/law refinement intervals are
  independently recomputed, including descriptive species/times. Means, bounds,
  half widths and PASS/FAIL/UNKNOWN classifications agree within 1e-11 eV.
  These are 176 checked numerical records, not independent experiments.

The checker computes 97.5% Student-t quantiles independently by numerical CDF
integration and inversion. A separate closed-form integer-df CDF test checks the
df=7 result. It uses sample standard deviation divided by sqrt(number of runs),
with degrees of freedom 7 or 3. Particle and checkpoint counts never inflate
the statistical sample size. Refinement differences use the same run seeds.

## Findings and corrected numerical constant

The producer initially used df=7 critical value `2.3646242510102993`, while
independent CDF inversion gives `2.3646242515928`. The discrepancy was a literal
constant error, not a physical solver defect. In simple terms, an incorrect
last few digits had been copied into the interval calculation.

The producer corrected the literal, added a regression against SciPy's
independent quantiles, and regenerated the summary. The relative half-width
change is about **2.5e-10**; no engineering gate changes. Correcting the constant
and testing it independently addresses the cause. Loosening this audit's
precision check would have concealed it. The old exported summary demonstrably
failed the strict check, for example 0.08638493786664 versus independently
0.08638493788792 eV. The corrected final summary passes; no audit tolerance was
relaxed.

The current membership and absolute-physical-case validation also resolves the
earlier parent review concern about pooling arbitrary individually valid files.
Independent regressions reject missing/duplicated/replaced cases and an entire
campaign uniformly stale in density, Coulomb log or duration.

## Interpretation of the actual physics results

All twelve primary cross-code gates remain **UNKNOWN**. The finest main Bobylev
comparison, N=2048 per species and dt=0.0625 microseconds, has production-minus-
WarpX 40 u raw-second-moment differences:

| Time | Mean difference, eV | Pointwise 95% half width, eV | Interval, eV |
| --- | --- | --- | --- |
| 250 microseconds | -0.0445207 | 0.0944903 | [-0.1390111, +0.0499696] |
| 500 microseconds | -0.0375240 | 0.0839298 | [-0.1214538, +0.0464058] |

Each interval includes zero but extends outside the prospective +/-0.1 eV band.
It therefore establishes neither equivalence nor a resolved above-budget bias.
The N=2048 dt=1 microsecond 250 microsecond interval is entirely below zero,
[-0.1822803, -0.0654701] eV, yet crosses the -0.1 eV engineering boundary:
statistical difference from zero is not the same as a resolved budget failure.

At 500 microseconds, both per-code middle/fine timestep intervals lie inside
the +/-0.1 eV budget. At 250 microseconds the corresponding WarpX check passes,
while the TA interval remains UNKNOWN. Marker refinements remain UNKNOWN at
both primary times. Those limited passes do not establish full timestep,
particle-count, distribution or continuum convergence.

The installed default-versus-explicit Bobylev replay was checked directly from
the two raw artifacts: all four checkpoints through 500 microseconds have
identical species arrays/moments, fields, times and step indices. The legacy
artifact hash is tied to the v11 comparison's recorded input bytes. This is
stronger evidence of the actual installed default for that case than release
source inspection alone; it is not a general binary audit or extra independent
physics realization.

WarpX's low-speed cross-section cap and cumulative-angle law differ from the
uncapped production TA operator. This audit validates aggregation and invariants;
it cannot attribute the measured transient difference between those operators.
The independent kernel controls and PETSc Landau study supply separate causal
evidence. Conservation, a decreasing CDF distance or a pointwise interval
including zero must not be promoted to distribution equivalence. These 500
microsecond studies also do not replace the earlier 1 ms or spatial-separator
convergence evidence.

## Exact execution evidence

Source snapshot: `/tmp/mass-spinner-collision-review-v12`, safe-dev guest
`safe-dev-b0f7dc7368cabd7f`, explicitly synced after edits: **197 files, 59.5 MiB**.
It contains the producer's reviewed final export, unchanged v11 baseline source
identities, and the independent checker/tests. Python 3.11.2 / GCC 12.2.0,
Linux aarch64. All checker execution was offline; no dependency downloads or
host scientific execution were needed. No host mounts/credentials were used.

Actual final commands:

```
safe-dev -C /tmp/mass-spinner-collision-review-v12 run -- python3 -m unittest -v
safe-dev -C /tmp/mass-spinner-collision-review-v12 run -- python3 audit.py . --output independent-results.json
safe-dev -C /tmp/mass-spinner-collision-review-v12 export /tmp/mass-spinner-collision-independent-export-v12
```

Five regression tests pass; full audit exits 0. The export was inspected before
copying only the generated result into
[independent-results.json](../scientific/collision-review-v12/independent-results.json).
Recorded plan SHA256 is
`f67c7ccf37dc2d9138f6f1bae0464abc86b29934ba0766fc10ca224024206881`.
Exact checker/test identities are recorded in that JSON; host files match their
executed hashes. The current host also passes the producer provenance manifest's
nine source-file digest checks. A lock rejected one premature overlapping
safe-dev command; it was rerun after the unit tests completed. No numerical
threshold, isolation setting or physics parameter changed to obtain a pass.

This subtask does not run the frontend build/typecheck, change production code,
deploy the site or verify live GPU rendering. Those remain the parent's
integration/publication responsibilities. No claim of experimental separator
validity follows from this audit.
