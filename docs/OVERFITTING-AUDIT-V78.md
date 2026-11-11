# Overfitting audit

11 November 2026. Four independent adversarial agents reviewed physical-case
coverage, numerical metrics, checker independence/provenance and accuracy
claims at commit `9e7e3f6`. The parent inspected the execution paths and
reproduced the receipt-mutation result. No physical producer, threshold,
pre-run plan or original result was changed. No new PDE campaign was run.

**Verdict:** no demonstrated coefficient fitting, relaxed thresholds or hidden
replacement of failed results. There are important validation blind spots.
The v77 success remains a bounded numerical result, not evidence of general
first-order physical accuracy or playground qualification.

## P2: Wall-temperature acceptance hides unresolved relative heating

The [temperature scale](../scientific/mixture-axial-v75/analyze.py#L101-L112)
has a 1 K floor, whereas the 96²/256 reference wall rises by only 0.336–4.246 µK
over 10–40 µs. Consequently a small absolute error can be a large fraction of
the heating response. In simple terms, almost no heating occurs in this case,
so an absolute-temperature pass says little about how accurately it heats.

The metric reviewer subtracted each field's own initial state and repeated
the conservative common-reference comparison. Errors below are normalized by
the maximum reference temperature change at the same time:

| Comparison | Local error at 10 µs | Local error at 40 µs | RMS error at 40 µs |
|---|---:|---:|---:|
| 48²/256 versus 96²/256 | 29.94% | 26.12% | 4.57% |
| 64²/256 versus 96²/256 | 21.46% | 17.73% | 2.71% |

The 48² local absolute error at 40 µs is only 1.109 µK. This is a demonstrated
relative-response gap, not a practically large temperature discrepancy.
A synthetic profile-only control suppressing the entire wall-temperature
response still passes the original temperature metric. It was not generated
by the PDE or admitted by the full energy/endpoint checker.

**Next correction:** retain the original absolute-temperature verdict and
withhold relative heating qualification. Add a predeclared thermal holdout
with a meaningful temperature/enthalpy response and heat-flow diagnostics.
This addresses the inactive-response problem without retroactively changing
the tolerance contract to obtain a different historical verdict.

## P2: One development startup is not an untouched physical holdout

The [manifest](../scientific/mixture-axial-v75/manifest.json) and
[initial fields](../scientific/mixture-axial-v75/run.py#L39-L56) prescribe one
36/40 u argon-proxy configuration and initial pattern. Resolution, timestep,
CFL and tolerance vary; the physical condition does not. Mesh placement,
initial integration and comparison methods were improved after observing
failures in that same condition. These are defensible solver corrections,
but passing the development case does not test generalization.

The case is not trivial: by 40 µs the 48²/256 solution changes density by up
to 2.444% of nominal, gas temperature by 5.799 K and radial velocity by
5.837 m/s. However, nominal dimensional scales are 6.981 ms for the fastest
imposed rotation period, 111.65 ms for radial species diffusion and 59.82 ms
for radial thermal diffusion. These are scale estimates, not exact relaxation
times; geometric/eigenvalue factors are omitted. Electrode work is only
1.05e-5 of initial gas thermal energy. The study principally exercises startup,
not developed separation or substantial drive heating.

**Next correction:** externally record a frozen holdout manifest before
running or tuning it. Include an initially uniform-composition separation
transient, a hot-wall transient, reversed forcing and unseen spatial modes
or geometry. Establish meaningful signal sizes and property-domain limits
before evaluating relative errors. Extend observation times where necessary;
another mesh sweep of the same startup would not address this gap. Retain
every holdout failure; after using a case to tune the solver, call it development
evidence and reserve a new confirmation case.

## P2: Research convergence does not qualify the playground's equations

The research producer uses an argon proxy at 350 K, a 300–418 K coupled
property domain and a 40 µs interval. The
[live defaults](../src/fuel-centrifuge.ts#L16-L20) specify lithium, 500 K gas,
a 1000 K liner and a 1 s interval. The
[live spatial gas path](../src/fuel-operation.ts#L72-L78) uses an overdamped
transport model that explicitly omits acoustics and Maxwell–Stefan diffusion.
It is a different model, not the newly refined research PDE running in-browser.

**Next correction:** require matching-model comparisons in the common domain
and separate checks of the live lithium/thermal regime. Preserve the current
`liveQualified=false` boundary. Transferring a research pass across different
equations and material assumptions would not establish accuracy.

## P2: Receipt admission accepts internally contradictory transport logs

The [admission path](../scientific/mixture-axial-v75/verify.py#L118-L136)
checks reported local scores, positive minima, substep timing and final-summary
agreement. It does not reconstruct each recorded conserved residual and its
allowance. Replacing a hydro `massResidualKg` with 1e20 kg, while retaining its
pass score and matching substep record, survives admission and full v77
analysis: all 630 gates remain green. Physical states and observations were
unchanged in this synthetic attack. The published artifact index would detect
the altered raw-file hash; it is not evidence of production corruption or a
wrong physical trajectory being accepted.

The actual producer does call separately implemented transport and source
checks on generated stages. Those implementations nevertheless share the
selected equations, discrete contract and physical closures. They establish
implementation agreement, not an independent physical model or experiment.

**Next correction:** retain selected stage before/after states and re-evaluate
their residuals and arithmetic bounds in admission; independently benchmark
the coupled equations. This supplies missing evidence. An arbitrary fixed
residual cutoff or another unverified pass flag would not do so. Historical
receipts remain unchanged; v77's descriptive admission wording is narrowed.

## P3: Gate counts and percentages need their normalization attached

The 630 rows contain 126 observable conditions repeated across both profile
metrics. Removing only those duplicates leaves 504 rows, not 504 independent
experiments. There is still just one physical condition. Of 27 spatial
decreasing-error rows per metric, 24 cell-average and 23 common-space rows
fall below the existing 0.2% exemption. Only four cell-average sequences
actually increase (three solid, one composition); no common-space gate relies
on an increase exemption. Eligibility for the exemption
is not the same as relying on it to pass.

Observable errors use the maximum absolute reference value over scheduled
times. For example, upper endwall torque at 10 µs differs by 2.1629% of its
instantaneous value while passing the 2% peak-history-normalized gate. That
is the intended contract, not an instantaneous 2% guarantee.

**Reporting correction:** accompany gate counts with physical-case counts,
actual exemption usage and the normalization. Do not call these counts
independent validation samples or infer a convergence order from their pass.

## Evidence and remaining physical limits

All four diagnostics ran offline in safe-dev against preserved frozen sources
and hash-bound data. The parent reran the exact saved receipt-mutation script;
it reproduced the full-analysis pass. Final unchanged-source checks:
`python -m unittest discover -s scientific/spatial-v77 -v` (7 pass),
`npm run typecheck` and `npm run build` (exit zero). The existing large-bundle
warning remains. No browser verification or deployment is claimed. README and
frontend source are unchanged.

Scripts and machine-readable evidence:
[metrics](../scientific/overfit-v78/metrics/REPORT.md),
[physical coverage](../scientific/overfit-v78/coverage/results.json),
[gate accounting](../scientific/overfit-v78/claims/receipt.json),
[receipt attack](../scientific/overfit-v78/independence/evidence.json),
[parent checks](../scientific/overfit-v78/final_checks.json),
[artifact hashes](../scientific/overfit-v78/artifact-index.json).
Scripts retain the original guest paths and no-overwrite protections; reconstruct
that layout or adapt a copy for another environment. The synthetic mutant is
regenerated by its script, not published as production evidence.

The [retained experimental results](FIRST-ORDER-ACCURACY-V70.md) are inspected,
not rerun here: radial-profile and pressure-scaling discrepancies remain around
40% and 50%; numerical success does not erase them. Existing conductivity,
transport, wall and plasma-closure limitations remain. The distinction follows
[NASA's verification/validation guidance](https://www.grc.nasa.gov/www/wind/valid/tutorial/overview.html):
equation/implementation checks and experimental agreement answer different
questions. No experimental or live qualification is granted by this audit.
