# Independent radial transport confirmation, v33

8 November 2026. This reviewer changed no production code, collision law,
physical input, or numerical acceptance gate. The owned evidence is
`scientific/transport-v33/confirmation-radial/`.

## Outcome

The prospective six-seed coarse-radial batch produced **three complete runs and
three hard timeouts**. It cannot meet the existing six-independent-run gate.
Every complete run also leaves the declared unmagnetized-encounter domain at
sampled times. Transport is **not qualified** by this study.

All cases use 32768 representatives per species, nr6/nz3 fixed source-fitted
annular cells, 100 ns steps, the full 200 µs horizon, Nanbu scattering, and the
same physical settings as the root pilot. The companion nr12 batch is owned by
another reviewer; this report does not substitute an unmatched prior campaign
for that comparison.

| Seed | Status | Seconds | Maximum raw angular residual | Unresolved exposure | Outside snapshots |
| --- | --- | ---: | ---: | ---: | ---: |
| 101 | TIMEOUT | 400.012 | unknown | unknown | unknown |
| 202 | TIMEOUT | 400.011 | unknown | unknown | unknown |
| 303 | TIMEOUT | 400.007 | unknown | unknown | unknown |
| 404 | COMPLETE | 314.678 | 0.000879394357 | 0.00801893695 | 10 |
| 505 | COMPLETE | 308.019 | 0.000826935341 | 0.00721578597 | 14 |
| 606 | COMPLETE | 337.917 | 0.000836436379 | 0.00668649836 | 7 |

The three measured raw angular maxima are below the unchanged 0.001 budget.
Their unresolved exposures are below 0.01. Neither observation overrides the
physical-domain FAIL: the production sampled-local-coverage gate fails if a
sampled state is outside the supported domain, independently of occupancy.
Timeouts are operationally incomplete evidence, not measured physical or
numerical-convergence failures. No partial trajectory from them was admitted.

## Remaining physical-domain failure

All 10/14/7 outside-domain snapshots respectively contain the explicit reason:
`Encounter magnetization reaches the configured unmagnetized-encounter limit (0.1).`
The maximum sampled encounter magnetizations are **0.207436, 0.195479 and
0.179049**, respectively. Initial analytic-peak reference screening passes
(approximately 0.000329), so screening the initial state alone does not establish
validity throughout the evolved run.

Some flagged snapshots also contain a sparse-species sampling reason. That
reason does not itself trigger the outside-domain status; the encounter criterion
does. Saved records retain aggregate sampled extrema, not the identity and full
distribution of each responsible cell. Accordingly, this analysis does not claim
to have localized those flags to a particular tail region or to have established
whether low-count temperature estimation is the dominant cause.

Technically, the implemented binary-collision model assumes unmagnetized
encounters; its declared screening rejects sampled conditions for which magnetic
deflection during an encounter is no longer small under the existing criterion.
In simple terms, more representatives can reveal conditions outside the
collision approximation even while improving coverage. Merely increasing N,
removing flagged cells, or loosening 0.1 would not repair that model boundary.
The next review should retain and localize the responsible cell states and
separate estimator uncertainty from genuine magnetized-encounter physics before
selecting an appropriate collision model. This report introduces no replacement
criterion or unvalidated magnetized kernel.

## Independent checks

The standard-library Python analyzer imports no simulator or prior review helper.
For all three complete raw artifacts it verifies:

- Exact executed configuration, research admission label and shared source hash.
- Initial/final horizon, strict snapshot ordering, complete collector partitions,
  destination counts, impact times and radii, and positive finite momentum scale.
- Raw angular momentum reconstructed from active species means and **147669
  exits at their actual times**. Maximum difference from saved history is
  **7.07e-17**, and reconstructed raw maxima agree within 2e-13.
- Active-population-weighted trapezoidal unresolved exposure, reconstructed from
  saved regime fractions independently of the stored aggregate.
- Final radial-density integrals equal the independently recorded survivor
  populations within 2e-10 representatives.
- All 48 frozen study inputs remain hash-identical after execution.

These checks establish artifact, ledger, coverage-aggregation and inventory
consistency. They do not validate unsaved states, individual cell distributions,
the continuum transport solution, or a physical device. No independent-ion
confidence interval is used. The parent owns paired six-seed refinement results;
missing alignment, orientation and effect-versus-continuum-bias evidence remains
UNKNOWN under the unchanged contract.

## Prospective plan and exact execution

The fixed seeds were 101,202,303,404,505,606 before execution. The budget was
**2400 seconds combined / 400 seconds per run**, with whole child-process-group
termination at timeout. All six planned attempts occurred. Their aggregate
subprocess wall time is 2160.644 seconds. No cap was extended after observing a
timeout; no thresholds or selected seeds changed. Other research guests ran in
parallel, so contention may contribute to these wall times, but this study did
not measure a counterfactual isolated runtime and does not establish that cause.

The bounded launcher exits zero after recording all statuses, including
timeouts. Its exit code is not a certificate that all simulations completed.
The separate independent analyzer exited zero for the three complete cases and
explicitly records `allComplete: false`.

Execution used copied stage `/tmp/mass-spinner-transport33-radial`, distinct Apple
guest `safe-dev-8d495908327c4bb4`, without host mounts, credentials, SSH forwarding
or control sockets. Network was used only for locked dependency installation:

```
safe-dev -C /tmp/mass-spinner-transport33-radial init
safe-dev -C /tmp/mass-spinner-transport33-radial run --online -- npm ci --ignore-scripts
safe-dev -C /tmp/mass-spinner-transport33-radial run -- python3 run-study.py plan.json
safe-dev -C /tmp/mass-spinner-transport33-radial run -- python3 - < analyze.py
safe-dev -C /tmp/mass-spinner-transport33-radial export /tmp/mass-spinner-transport33-radial-checked-export
```

The actual study invocation first checked the entire input map in the guest;
the analyzer also checks it after execution. Analyzer source was passed on stdin
to the guest, not executed on the host. The report and trusted host file copies
were created after exported evidence inspection. Both the preceding final export
and checked export are retained. No guest replacement occurred while valuable
results were unexported. No repository-wide build or browser check was performed
by this reviewer; the parent owns integrated final gates.

- Plan SHA256: `631cb655470652479d879b02a4b8e9159f01cb5c48d6f75907ec6d678d3a6f57`.
- Complete input-map SHA256: `2f1a14989598c1b0f25c7272e53e9e3848f93d2a1916a946d43783ff0ac411e5`.
- Shared 45-file source-map SHA256: `5e965a159a712b48413b6bf9afbad6b1d9d2b17968a301163644c58397cf5a18`.
- Executed source identity: `ce9f7d1675841be920363278eaa306077e3ebdfb4af1ba41e08cdf6d7e0705b2`.

The evidence leaf contains the frozen plan, copied executed inputs, raw compressed
results, every input request/log/status, independent analyzer and its output, and
the outside-domain diagnosis. Its final `LEAF-SHA256.json` seals that evidence.
