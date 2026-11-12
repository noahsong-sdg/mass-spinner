# Final source/evidence review before export

This review reads current V86 code, the archived attempt01 source/data seal,
the report skeleton and independent Fourier code. No project execution or VM
operation was performed by this reviewer. The parent reports 47 main controls,
24 standalone controls and 84 actual-field Fourier witnesses passing in the
active replay. Final exported evidence is still required to verify that report.

## Source binding

The actual-field witness requires the complete, known attempt01 prediction
SHA256; verifies both compressed and raw selected field-packet hashes; maps only
recorded `scientific/meridional-v86/<file>` sources to the explicitly archived
`source-snapshot`; checks other frozen producer dependencies at their original
paths; and rejects absent archives rather than consulting current producer
files. A separate current numerical-kernel seal is checked before and after
the calculation. This distinction is correct: new acceleration code is tested
against old immutable physics data without claiming it produced that data.

A direct source diff between archived/current `optical86.py` shows only an
optional `spectrum_fn=spectrum` argument and its four call-site substitutions.
The direct CDF integrator and LOS components are unchanged. The current
Fourier code now uses the same sorted mean/temperature grouping, photon sums
and 256-component exact-CDF mode blocks as the reference. The formerly found
roundoff tie-ownership discrepancy is addressed in source. The 84 witnesses
cover one first-scenario finest-grid flow case, both closures, three impacts,
two fixed reporting times and all three bin widths. They do not establish
equivalence for every operating point or physically validate optical emission.

The full 26-flow replay separately checks packet hashes and raw-byte identity
for all saved states and histories. That is stronger than comparing only the
final velocities and prevents optical acceleration from concealing altered
flow predictions. Its actual exported receipt must be checked before reporting
bitwise identity as observed.

## What the final runner covers

`run86.py final` invokes main and standalone unit controls, stationary-wall
torque controls, original conservative hydro controls, the actual FiPy/analytic
heat reference, independent saved-state and frozen quadrature auditing, the
separately labeled exact-panel supplement, complete optical scoring,
summarization, app tests, typecheck and build. Failed original audit, heat
reference or supplemental panel commands are retained while remaining checks
continue; any such nonzero result makes the runner's final status nonzero.
An app build passing must never be summarized as the scientific suite passing.

The final phase does not rerun the 84 actual-field Fourier witnesses or the
26-flow identity command; those belong to the flow phase. Nor does summary
generation consume/verify those two report files. Thus final reporting needs
the flow receipt, `fourier-validation.json`, `field-replay.json`, final receipt
and source hashes together. This is an evidence-packaging limitation rather
than a demonstrated physics error in the sealed campaign. Do not rely on
`summary.json` alone to claim acceleration validation or replay identity.

The independent saved-state auditor reconstructs EOS/inertia, positive states,
mass/species/total-energy budgets and reporting-time consistency. Intermediate
charge and source-energy residuals are producer history scalars; independent
source tests support them, but saved logs are not an independent reconstruction
of every intermediate electric field. Full-trajectory wall reaction also is
not saved. The report skeleton states these limits accurately.

## Report claims to retain

The report correctly calls this a research-only conditional transient release
of a 1979 argon apparatus, with unchanged production/live physics. It retains
the prescribed current and uncertain emitting cathode footprint, constant
transport coefficients, frozen ionization/conductivity, missing injection and
cooling, all-Ohmic-to-heavy heat assumption and absent thermal steady state.
Extreme control temperatures expose missing energy closure; they are not
predictions of an operating device. They cannot be presented as explaining the
experimental velocity mismatch quantitatively.

All four fixed times, four electrical scenarios, both anode positions and all
72 optical alternatives per scenario/time must remain visible. Best agreement
among these alternatives is a sensitivity result on already viewed development
data, not a held-out prediction, fit-free experimental validation or recovered
operating state. The one heavy-fluid composition coordinate is passive natural
Ar, not ionization or isotope-separation chemistry. No Marathon-specific design
accuracy follows from this benchmark exercise.

The exact-panel RMS calculation can diagnose underresolved global quadrature
on piecewise-bilinear fields. Its passing result cannot erase original frozen
quadrature/field failures. Timestep studies are restricted to the declared
first scenario/anode slice; if CFL makes nominal maximum-step runs identical,
identical results are not evidence of time-resolution convergence.

## Export closeout inventory

Before replacing the report's pending section with observed results, inspect
the flow receipt and original prediction baseline; all 84 witness rows and their
source/packet seals; all 26 replay identities; final command exit statuses;
original field/quadrature failure counts; separately labeled panel counts;
actual FiPy gates; optical unavailable groups and numerical failures; and the
full per-time experimental comparison inventory. State exact test counts from
receipts. Report still-failed scientific gates explicitly even when regression,
conservation, acceleration, app tests and builds pass.

## Export03 closeout: evidence reopened

The reviewer has now read the actual exported receipts and results, independently
rehashing current scientific sources against the final execution, producer,
Fourier, optical, panel and heat-reference source maps. All hashes matched.
The explicit archived-source map also matched every attempt01 source file;
brightness and geometry fixture hashes matched the witness receipt. The new
prediction manifest independently hashes to
`70e0923e8ac9a53a476e439a9df3e670fb52467ee9d3d6ab5aa62ad9eae5e5c7`;
the baseline independently hashes to its declared `b211c...ae06e` value.

All 84 FFT/CDF witness rows, row gate booleans and their recorded thresholds
were checked. All passed. Maximum per-bin error was `1.2750e-16`, all mode and
analytic moment errors were zero, and maximum captured-flux difference was
`6.8834e-15`. Actual direct/Fourier totals were 3.855970247s/0.272362747s.
Both closures, three sightlines, all three bin widths, both declared times,
constant/linear temperature alternatives and all three instrumental widths
are present. The witness covers its fixed inventory rather than every flow
case, a limit the report preserves.

Both compressed packet hashes and independently decompressed raw hashes were
checked for all 26 current and 26 archived fields. Every raw hash agreed with
both its declared value and its counterpart. Thus the replay identity is
confirmed directly, not merely accepted from a scalar receipt.

The actual FiPy 4.0.3/hybrid/analytic reference reports all nine frozen gates
passing. Its source map matches current files. The finest 24-step cross-code
maximum difference is `0.0009230652476617252` of the imposed 100K amplitude,
or 0.0923065K, consistent with the report's scale explanation. This is a
constant-property conduction benchmark, not a heated-plasma closure validation.

Final logs show 48 main controls, 24 standalone controls, three wall-reaction
controls, 12 hydro controls and 1,238 app tests passing; typecheck and build
have recorded exit zero. Only the original scientific audit and panel
supplement commands exit one. Original 85 field/335 quadrature failures remain;
the panel supplement retains 85 field failures with zero quadrature failures.
All 64 optical groups complete, with 2,304 comparisons, zero unavailable groups,
zero numerical optical failures and zero all-point experimental matches at
every fixed time. Neither numerical nor experimental qualification is granted.

The report's metadata-contract explanation matches the reviewed two-line fix:
project the expected source location records to IDs/radii, then compare them
exactly with predicted IDs/radii. The complete original fixture remains sealed;
extra prediction keys, changed IDs or changed radii remain rejected. Source
records' extraction ranges are not falsely claimed to be propagated through
the predictor.

The report explicitly distinguishes the local peak from mass-weighted bulk
temperature, constant transport controls from valid extreme-temperature
constitutive laws, and this argon transient from Marathon validation. The
reported four local peak values were independently checked against saved
4us fields; they equal their accepted-trajectory maxima in these cases. Its
48-control final count corrects the earlier 47-control pre-regression count.

No publication blocker was found for this **negative, conditional research
report**, provided these failure/scope statements remain. This is not approval
to promote the backend to experimentally accurate production physics. The
remaining numerical and physical qualification failures are substantive and
explicitly retained. No Python source, scientific result or execution state
was changed during this review; only review prose was appended.
