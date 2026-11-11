# Independent finite-time cross-code check, v30

8 November 2026. **Twelve new 500 µs production-Nanbu trajectories completed.
No six-seed cross-code equivalence gate passed. All four primary gates remain
UNKNOWN, not FAIL.** The new angular law corrects a separately demonstrated
finite-step angular defect; this study does not demonstrate a statistically
resolved improvement of the full finite-time evolution over the TA baseline.

## Prospective case and identity

The immutable `scientific/live-collisions-v30/external/plan.json` declares 2048
markers per species, 40 u/84 u singly charged ions, nominal 2/10 eV initial
Maxwellians, density 5×10¹⁷ m⁻³ per species, fixed lnΛ=12, zero fields and no
spatial push. Six archived independent initial realizations, seeds 1101–1106,
are evolved at 250 ns and 62.5 ns for the full 500 µs. Saved times are 0, 100,
250 and 500 µs. Actual initial velocities, rather than a newly sampled nominal
Maxwellian, are copied exactly from the archived WarpX26.10 v12 reference.

All new runs use the actual production `collideCoulombCell` with its explicit
`'nanbu'` argument, mixed equal-weight random pairs and unchanged finite-N
partner-density normalization. This homogeneous harness applies one collision
batch per timestep; it is not the separator's orbit/collision Strang sequence.
The runtime plan is 400 s total, 45 s per case, with incomplete cases UNKNOWN.
All 12 completed, taking approximately 147.6 s of subprocess wall time.

The original pre-results plan pins a candidate kernel. Before any new evolution,
independent dense quantile tests exposed a backward-tail cancellation problem.
`kernel-amendment.json` explicitly replaces the candidate with the repaired
kernel without altering matrix, gates or runtime budgets. The parent and
independent angular reviewer authorized execution after the repaired dense
quantile/Decimal reference gate passed. No pre-fix trajectories or mixed-source
results were substituted. Final kernel SHA-256:

`276385adc07eecbf454973feea4490d7898392ec6bc797811b398d5c46c5de6e`.

## Unchanged statistical gate

The v12 prospective engineering moment budget is ±0.1 eV at 250 and 500 µs,
with 40 u the primary species. This follow-on requires six whole-run seeds.
Pointwise paired Student-t intervals use t₅=2.5705818. PASS requires the entire
interval inside the budget; FAIL requires the entire interval outside it;
otherwise UNKNOWN. Missing or identical observations cannot produce a pass.
Timepoints and correlated particles are not treated as independent replicates.

The primary reference is the archived WarpX BOBYLEV ensemble, for which all six
seeds exist. Only four matching WarpX NANBU seeds exist; those are separately
reported diagnostics and cannot clear the six-seed gate. Speed-CDF maximum
distances are descriptive, with no post hoc 0.01 equivalence claim or KS p-value.
No seed or unfavorable result was removed.

## Results

40 u raw second-moment differences relative to archived WarpX BOBYLEV, in eV:

| dt | Time | New Nanbu, mean ± pointwise 95% half-width | Historical TA on the same reference | New gate |
| --- | --- | --- | --- | --- |
| 250 ns | 250 µs | −0.06989 ± 0.12168 | −0.11600 ± 0.17792 | UNKNOWN |
| 250 ns | 500 µs | −0.11950 ± 0.08696 | −0.07228 ± 0.09622 | UNKNOWN |
| 62.5 ns | 250 µs | −0.04729 ± 0.10937 | −0.01616 ± 0.11347 | UNKNOWN |
| 62.5 ns | 500 µs | −0.03844 ± 0.09019 | −0.06513 ± 0.10658 | UNKNOWN |

The last point estimate is closer to the reference than historical TA, while
some other point estimates are farther away. The uncertainties do not establish
a systematic improvement. For example, the fine-step 500 µs new-minus-old
difference is +0.02668 ± 0.07459 eV. The new cross-code interval still extends
below −0.1 eV. Containing zero would not establish equivalence.

New production timestep differences (250 ns minus 62.5 ns) for 40 u are
+0.03064 ± 0.07720 eV at 250 µs and −0.05891 ± 0.11734 eV at 500 µs: both
UNKNOWN. The archived WarpX timestep comparison passes at 250 µs
(+0.05324 ± 0.03898 eV) but is UNKNOWN at 500 µs
(+0.02215 ± 0.11794 eV). There is no passing production timestep-convergence
claim from these data.

The heavy-species differences are almost exactly opposite because both methods
conserve total kinetic energy with equal species densities. They are retained
but are not independent evidence of another validation success.

Four-seed production-minus-upstream-NANBU means at 500 µs are −0.15639 eV at
250 ns and +0.02133 eV at 62.5 ns for 40 u. These remain UNKNOWN under the
declared six-seed contract; their smaller point estimate at fine dt is not a
qualification result.

## Independent raw-array verification

The checker rebuilds 96 species-state moments from the new saved velocities,
validates exact initial-velocity identity against the upstream archive, matches
every reference/input/runner hash and confirms historical TA comparisons refer
to the identical upstream file. A separate standard-library checker audits all
48 saved mixture states and independently recomputes speed-CDF distances:

- Maximum relative kinetic-energy residual: **4.4853×10⁻¹³**.
- Maximum momentum residual normalized by the initial positive momentum scale:
  **5.7289×10⁻¹⁵**.
- Maximum discrepancy in reported speed-CDF distance: **zero**.
- All saved velocities are finite and inventories are unchanged.
- Three independent analyzer tests pass, including interval-within-budget,
  incomplete/identical-sample UNKNOWN, and SI raw-versus-centered moments.

These are saved-state checks, not a check at every collision step. Conservation
does not qualify the distribution or the physical rate.

## Why the remaining disagreement is not isolated

Production uses mixed-species random pairing. WarpX schedules same-species and
unlike-species collisions separately, evaluates a physical low-speed cross-section
cap, and uses fitted Nanbu angular formulas. The new production method solves
the Nanbu moment relation more accurately but retains its approximate higher
angular moments. Finite markers, timestep, angular law, pairing schedule,
cross-section cap and ordinary whole-run noise are therefore still distinct
possible contributors. This ensemble does not assign causal fractions to them.
It would be incorrect to attribute the entire remaining difference to the cap,
to angular sampling or to noise alone.

The appropriate next study is a prospectively enlarged marker/seed ensemble and
controlled matched-law/pair-schedule tests, followed by distribution-level and
inhomogeneous transport gates. Increasing the sample until a favorable pass or
fitting a rate coefficient would invalidate the prospective comparison.
No new WarpX trajectories, physical entropy integration, drift/anisotropy,
angular-momentum/locality experiment or experimental validation was performed
by this workstream. Those are separate team scopes.

## Exact execution and retained artifacts

Copied stage `/tmp/mass-spinner-collision30-external`, Apple guest
`safe-dev-913234a43791ca4a`. The bounded snapshot includes only selected archived
references and source. No host code execution, home/credentials/control-socket
mounts or browser-policy workaround was used. Network was enabled only for
initial `npm ci --ignore-scripts`; after a deliberate source sync, reinstall
used `npm ci --offline --ignore-scripts`. The superseded source copy was exported
before replacement; it contained no scientific evolution.

Commands after sync/install, prefixed with `safe-dev -C` and the stage path:

```
run -- sh -c 'cd scientific/live-collisions-v30/external && python3 -m unittest -v test_analysis.py > analysis-tests.log 2>&1'
run -- python3 scientific/live-collisions-v30/external/run.py
run -- sh -c 'python3 scientific/live-collisions-v30/external/analyze.py > scientific/live-collisions-v30/external/analysis.log 2>&1'
run -- python3 - < [absolute path to audit_raw.py]
export /tmp/mass-spinner-collision30-external-final-export
```

The last checker was streamed as exact script bytes to guest Python, not executed
on the host. An overlapping launcher attempt was refused with `Resource
temporarily unavailable`; the sequential retry completed. No trajectory was
restarted or numerical threshold changed because of that launcher error.

Owned evidence is `scientific/live-collisions-v30/external/`: frozen plan and
kernel amendment; runner/analyzers/tests; 12 result JSONs and 12 gzipped raw
velocity histories; run-status/logs; summary; raw-invariant check; tested source
map and final artifact manifest. Existing upstream raw files and prior TA results
remain in the immutable v12 archive and are identified by their hashes.
The executed source and every original tested input digest matched the reviewed
guest export. Parent owns whole-application typecheck/build and deployment; this
child claims neither those gates nor deployed browser verification.
