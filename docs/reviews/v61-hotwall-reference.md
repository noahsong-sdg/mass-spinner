# Independent reference and qualification review, v61

Status: reference recommendations plus inspected central execution evidence.
The parent owns safe-dev execution and snapshot receipts; this reviewer reads
and edits host files only. The selected policy passes the inspected startup
finite-reference and independent Robin gates. Final release checks remain
parent-owned; the reviewed startup studies do not qualify intervention branches.

## Verified execution path and root cause

The production path is `simulateFuelOperation` → coupled rotor/species/thermal
advance → accepted conserved checkpoints → `sampleFuelTransport` → temperature
and pressure reconstructed from canonical energy and inventories. Current
events split the integration interval and are right-continuous in playback.
Between accepted knots, playback interpolates canonical quantities. Therefore
the common-observation campaign measures integration plus playback error; it
does not assert every observation is an integration knot.

The inspected v60 joint analysis demonstrates temporal under-resolution, with
spatial error important after temporal refinement. The 64/16/512 startup fails
temperature, local heating, and instantaneous wall-rate gates even while budgets
close. Its 84% local-heating error is relative to the small rise from 500 K,
not to the absolute temperature. No missing gas half-cell was found. The series
film, gas half-cell and tungsten half-cell boundary must be retained.

In simple terms, conserving the heat does not ensure it reaches each thin gas
annulus at the correct time. A rotor-based step grid can miss much faster heat
flow. The smallest coherent proposed correction is a separate numerical mode
that estimates local time error while retaining canonical states and the
existing interface. Changing film conductance, hiding the heating tail, or
changing a physical coefficient would solve a different problem.

## Gates that must remain unchanged

Full-mixture qualification must use the v60 common-volume comparison. Sum fine
species probability integrals and internal energies into each candidate annulus,
then reconstruct `T=U/(1.5 kB N)`. An arithmetic average of temperatures gives
the wrong answer for unequal inventories. Compare exactly the same physical
observation times; do not introduce analyzer interpolation.

| Quantity | Gate and assessed domain |
| --- | --- |
| Ion and neutral angular speed | Each maximum relative difference <3%, denominator `max(1 rad/s, abs(reference speed))` |
| Gas temperature | Maximum absolute common-annulus difference <0.1 K |
| Local heating | Maximum `abs(Tcandidate−Treference)/abs(Treference−Tinitial)` <5%, only where reference rise magnitude ≥0.1 K |
| Instantaneous signed wall heat rate | Maximum relative difference <1%, where reference magnitude ≥0.5 W |
| Signed cumulative wall heat | Maximum relative difference <1%, where reference magnitude ≥1e-6 J |
| Canonical invariants | Species positivity/inventory and mechanical, angular and thermal residuals at every accepted state, each <2e-8 |

An empty relative-signal mask means unassessed, not passed. Keep pressure and
species CDF differences as separate diagnostics. Keep the initial sample in
absolute metrics. Signed wall heat is the gas first-law remainder after slip,
Ohmic heating and redistribution work; total gas energy gain is not wall heat.

The Fourier Robin oracle uses a different registered heating norm: profile
error relative to the continuum surface heating, active above 0.01 K. Its
pointwise local-heating ratio is a diagnostic. Do not substitute that easier
surface norm for the full-mixture 0.1 K local-cell gate, or confuse ≤ thresholds
in the old Fourier control with strict < thresholds in the mixture comparison.

## Proposed adaptive estimator: recommendation, not verified behavior

Backward Euler is first order. Compare one full step to two half steps from the
identical starting canonical state, reconstruct each resulting cell temperature,
and take a maximum norm over cells. Accept the two-half-step conserved state.
The difference estimates the leading local error of that more accurate state
in the smooth asymptotic regime; it does not bound accumulated or spatial error.
Retain positivity and conservation audits on every accepted state. Trial states
must not mutate accepted ledgers, inventories, wall energies or checkpoints.

A defensible pilot temperature scale is
`1e-4 K + rtol * max(abs(Tfull−Tinitial), abs(Thalf−Tinitial), 0.1 K)`
with `rtol=1e-3`, followed by a factor-of-two tighter tolerance sensitivity.
These values are proposed settings, not a calibration to observed v61 results.
Temperature reconstruction must use each trial's own particle inventory. A
500 K-relative norm permits errors comparable to the entire early signal; an
RMS norm or a total-energy norm can hide a single failing wall annulus. The
maximum norm directly targets the failed quantity without changing the physical
model. Rotor, wall temperature/energy and species changes require their own
scaled error components if the mode claims control of the coupled state;
temperature alone does not control all coupled variables.

At a current event, stop exactly at the event and apply the new current only
to subsequent trial steps. A controller's step-size history may reset there,
but external qualification keeps the original physical initial-temperature
baseline. No step may straddle a drive discontinuity. Reject/retry must have a
finite resource limit and explicit failure, rather than silently accepting an
inaccurate step. Claims of numerical accuracy must report the achieved
external gates, not merely `estimator <= 1`.

## Practical campaign and required evidence

The existing 512-gas/128-wall/32,768 full-second archive plus the independent
512/128/16,384 2 ms archive remain useful finite startup comparisons. Inspect
their archived source hashes and raw packet identity before reuse; a new solver
must not reinterpret their observations as accepted adaptive knots. The composite
replaces exactly the original observation times through 2 ms and is a comparison
dataset, not one conserved integrated trajectory.

1. Run 128/32 and 256/64 adaptive startup pilots only through 2 ms, sampling the
   existing physical observation times from 1e-7 s onward, including t=0. Use
   the common-annulus v60 gates against the early 512 reference. Repeat the
   promising mesh at half the estimator tolerance. This diagnoses whether 128
   cells have enough spatial margin before paying for full-duration histories.
2. Run the selected mesh over one full second, retaining the same observation
   schedule and comparing to the composite reference. Repeat at half tolerance.
   Report time, accepted/rejected/trial steps and memory/history size; a mode
   that exhausts resources does not qualify as practical. If 128 fails the
   heating gate after tolerance refinement, try 256 rather than weaken the gate.
3. Run a tightly integrated frozen-inventory Robin control using the actual
   whole-operation controller, zero current and cooling, and D=1e-30. Its wall
   remains finite, so account for its measured drift with the independent
   bracket below. Reuse the Bessel annulus oracle, eigenseries truncation check,
   flux/energy checks and finite-solid resistance. Run at least the intended
   tolerance and half tolerance. This is the needed
   independent-equation check for the new controller, because agreement with
   the old mixture kernel alone can preserve a shared integration error.
4. Qualify actual current-intervention paths separately: cut power after startup
   and restart or reverse current, including both exact switch samples and
   event-relative early observations (1e-7 s onward where they fit). Include a
   switch between pre-existing knots and a resume from an interpolated state.
   Compare to a matching tighter-reference intervention history on common
   physical times. Reuse the valid startup prefix, but never compare the
   post-event branch against a no-event startup archive. Verify the preserved
   prefix, continuous inventories/energies/momenta and right-continuous current.

No new 1,024-cell full-second reference is initially required. The old full
reference has measured 2.304% adjacent-time local-heating difference and ~2.000%
early-overlap difference, so a 4.9% candidate comparison has weak margin. A
practical engineering objective is ≤2.5% heating discrepancy and ≤0.05 K on the
declared sample set, plus small tolerance sensitivity; this is an additional
margin objective, not a changed v60 pass threshold or an error bound. If the
candidate approaches the 5% boundary, repeat a focused 512-cell early reference
with half the time step (or sufficiently tight independent stepping) before
claiming meaningful margin. A late-window discrepancy needs a corresponding
late/full reference check; early refinement cannot settle a late-time failure.

The startup archive cannot establish reference quality for interventions. At
minimum, the new intervention reference needs an adjacent tighter-time check
and a fixed-time 256→512 common-annulus check focused around the switch and its
late aftermath. Reusing the startup's wall-mesh insensitivity is a hypothesis
for these branches, not newly measured evidence.

## Scope of any eventual verdict

Passing qualifies only the sampled physical inputs, windows, event schedules,
mesh and tolerances against the stated finite references and the isolated Robin
continuum control. It does not establish a uniform error bound, convergence for
every slider combination, kinetic gas-surface physics, measured accommodation,
transport-data validity or Marathon calibration. Preserve these distinct claims
in the UI, study summary and final report.

Inspected sources: `docs/JOINT-HOT-WALL-CONVERGENCE-V60.md`,
`docs/reviews/v60-hotwall-physics.md`, `scientific/hotwall-boundary-v60/campaign.ts`,
`analyze-joint.py`, `robin-reference.py`, `emit-robin.ts`, the archived
`scientific/centrifuge-v44/boundary60/studies/refined/hotwall60-joint-result.json`,
and event/playback paths in `src/fuel-operation.ts` and `src/fuel-transport.ts`.
The following sections identify the new execution evidence actually inspected.

## Whole-operation finite-wall Robin control

`scientific/hotwall-adaptive-v61/robin-adaptive.py` exercises saved results from
the actual operation/controller path rather than a separate thermostatted
kernel driver. It requires source-free, motionless gas with uniform species
inventories; both sampled states and all-accepted-state extrema/diagnostics are
audited. D=1e-30 is a numerical frozen-inventory control, not a physical diffusion
measurement. Its accepted and sampled species inventories must remain exactly
equal to the initial binary-representable uniform arrays, so no unbounded heat
capacity perturbation is admitted into this fixed-inventory comparison.

The finite tungsten wall has bounded inner-cell temperature `Tw_lo..Tw_hi` over
all accepted states. The independent tungsten polynomial is evaluated by interval
arithmetic to bound its positive half-shell conductance, giving effective films
`G_lo..G_hi`. The continuum boundary uses film plus solid resistance; its gas
half-cell belongs only to the discrete production flux audit. Removing the gas
half-cell from the discrete audit or adding it to the continuum film would
compare the wrong boundary condition.

Two constant Robin solutions, `(Tw_lo,G_lo)` and `(Tw_hi,G_hi)`, bracket the
corresponding continuum's temperature and absorbed heat by the parabolic
comparison principle. At a putative lower crossing, the lower solution is at
most `Tw_lo`, so the variable boundary supplies at least as much heat; the upper
crossing follows symmetrically, with a negative actual temperature difference
only strengthening the upper inequality. This argument assumes the bounded
boundary values between knots; convex canonical playback and the recorded
piecewise endpoint boundary satisfy that numerical interpretation. It is not a
bound on the continuum solution of an independently solved physical solid.

Instantaneous fluxes of the two solutions need not be ordered. The harness
instead bounds the surface temperature, then evaluates all four products of
`[G_lo,G_hi]` and `[Tw_lo−Ts_hi,Tw_hi−Ts_lo]`. It compares production flux to this
signed interval. Cumulative heat follows the volume-integrated temperature
bracket. The 512-versus-1,024-mode self-check and small explicitly reported
floating-point interval widening remain numerical checks, not a rigorous
spectral-tail theorem.

All reported accuracy gates use the worst-case discrepancy across the boundary
interval and the smallest positive reference signal. Their thresholds remain
0.1 K, 5% of surface heating above 0.01 K, 1% instantaneous flux and 1% cumulative
heat. Boundary uncertainty is reported separately and is never added to an
allowed error. An interval crossing the heating mask or zero flux fails oracle
qualification rather than silently passing. This isolates controller integration
error without relabeling finite-wall drift as evidence of solver inaccuracy.

The first central adapter-test run produced four passes and one failed exact-zero
assertion: conservative U/N reconstruction differed from self-reference by
3.4106e-13 K. The test now requires self-comparison below 1e-10 K. Numerical
qualification gates were unchanged. The central rerun of
`python -m unittest discover -s scientific/hotwall-adaptive-v61 -p 'test_*.py'`
passes all nine tests in 3.776 seconds. Its verified-before/after snapshot has
640 inputs, SHA-256
`335a8980f73700116a49705a451c3a3d919484e1941577c5cf0defd8a1edea87`,
and exit zero. The controls cover original gzip/plain references, exact-time
matching, physical-input rejection, numerical-option compatibility, material and
temperature domains, frozen/source-free audits, interval conductance containment,
an intermediate Robin solution inside the bracket, and inactive-signal reporting.

Also inspected the actual central `hotwall61-robin` driver log and receipt:
640 verified inputs, SHA-256
`ec0aec7fec80aa70e562664042c44d28cf0b21e9d69d6e486dd83e4666c519b7`,
exit zero. All three emitted histories have exactly frozen binary-uniform
inventories and zero physical gas sources. Their minimum inner-wall temperatures
are 999.99970187–999.99970189 K; the small finite-wall drift matches the oracle
bracket's intended regime. The 256-cell intended-tolerance history has 6,795
accepted pairs; the tighter control has 12,089. Driver completion alone is not
an independent-oracle accuracy pass; its actual analysis is reviewed below.

## Inspected v61 startup candidate

Read the actual central `hotwall61-candidate.log`,
`hotwall61-candidate-reference.log` and their reference receipt. The independent
adapter ran successfully on 639 verified inputs, SHA-256
`5df2618391c4d1815e7c917ae9e0a3e25abc69de91e93306def4b3363d555086`,
exit zero, with source verification before and after. This is execution evidence
for the recorded snapshot, not a claim that later source edits were checked.

The full-second candidate has 256 gas/16 wall cells, 512 nominal intervals,
relative tolerance 2.5e-6 and absolute temperature tolerance 2.5e-7 K. It retains
17,444 half-step checkpoints from 8,722 accepted pairs and seven rejected trial
pairs; the recorded runtime is 34.998 seconds. Its largest recorded thermal
budget residual is 5.80e-14, and mechanical/angular/species residuals are below
6.22e-15. Budgets remain necessary checks rather than accuracy estimates.

| Same-v60 finite-reference comparison | Maximum difference | Gate |
| --- | --- | --- |
| Common-annulus temperature | 0.0623661 K | pass <0.1 K |
| Local heating above 0.1 K reference rise | 0.173196% | pass <5% |
| Instantaneous wall heat rate | 0.378856% | pass <1% |
| Signed cumulative wall heat | 0.0198063% | pass <1% |
| Ion speed | 0.0161860% | pass <3% |
| Neutral speed | 0.0166228% | pass <3% |

This demonstrates substantial local-heating margin against the existing finite
startup composite; the absolute-temperature gate has less margin. A tighter
candidate and the error's physical time/location should be examined before
interpreting that absolute difference. The comparison does not independently
establish the finest reference's remaining temporal bias or an intervention
branch. This setting also fails the independent control below, so it must remain
a retained intermediate rather than the proposed qualified mode.

## Independent oracle rejects the intermediate and supports tighter control

Inspected `hotwall61-joint-metrics.log` and the actual analysis/metrics receipts
on 640 verified inputs, SHA-256
`8f3ffd1d15b2ab16761c12cfc4fc907c7ea4f43e12b963bf74b46f284c699a7f`.
The analysis correctly exited one because its then-selected 2.5e-6 policy
failed the independent absolute-temperature gate. It wrote and retained all
results; the subsequent metrics reader exited zero. The current policy selection
was subsequently tightened. A separate successful receipt is inspected below;
the old failing receipt remains evidence of the rejected intermediate.

| Actual whole-operation Robin control, 256 gas/16 wall cells | 2.5e-6 / 2.5e-7 K | 6.25e-7 / 1e-7 K |
| --- | --- | --- |
| Maximum worst-case annulus temperature error | 0.100928 K: **fail** | 0.0579459 K: pass |
| Error / surface heating, active above 0.01 K | 0.344402%: pass | 0.336497%: pass |
| Instantaneous flux | 0.109520%: pass | 0.0638996%: pass |
| Absorbed heat | 0.0258808%: pass | 0.0140884%: pass |

The boundary-temperature bracket is only 0.0002490 K wide and its maximum
difference from the ideal film-only target is 0.0002551 K. It does not explain
away the failed 0.100928 K profile discrepancy. The failure occurs near 17.783 ms
in the axis annulus, beyond the early wall layer. Thus the independent oracle
adds a real constraint that the finite full-mixture reference alone missed.
The coarse 64-cell/1e-3 control also fails absolute temperature at 0.183609 K;
its heat-only and surface-relative gates pass. Both failures are retained.

The tighter full-second 256-cell mixture at 6.25e-7 / 1e-7 K independently
compares to the unchanged v60 composite with 0.0240161 K temperature difference,
0.191785% local heating, 0.142990% instantaneous wall heat rate and 0.00888653%
cumulative wall heat. Ion/neutral differences are below 0.008683%. Every
registered startup gate passes. This supports choosing the tighter setting over
the cheaper intermediate without changing a physical coefficient or threshold.
The additional mesh/horizon checks and fresh successful policy analysis are
reviewed below. Current-intervention and final release evidence are separate
from this startup numerical qualification.

## Fresh successful policy analysis and mesh/horizon checks

Inspected the actual `hotwall61-qualified-analysis.receipt.json` and its log.
The command runs the independent `analyze.py` over the full and early archived
references, the candidate/spatial/fine-qualified/early-qualified/Robin folders,
and the retained looser controls. It exits zero in 8.697 seconds on 642 inputs,
SHA-256
`8fd5c702b8ae7923a7fa75d4151d73f7af2f64edb8cf9346aa7e6c9ed44d6507`,
with source verification before and after. All three explicitly promoted cases
are present and pass: full-second 256-cell mixture, separate 2 ms 256-cell
mixture, and actual-operation 256-cell Robin control, each at relative tolerance
6.25e-7 and absolute temperature tolerance 1e-7 K.

| Same selected tolerances, 16 wall cells | Gas cells | Result against declared comparison reference |
| --- | --- | --- |
| Full-second mixture | 128, 256, 512 | All five v60 gates pass for every case |
| Separate 2 ms mixture | 64, 128, 256, 512 | All five v60 gates pass for every case |
| Whole-operation finite-wall Robin control | 256 | All four continuum-control gates pass |

Also inspected the producing `hotwall61-fine-qualified` receipt/log: 640 inputs,
SHA-256 `8537f22ca684df8ad9b0b6c1cf50420a0c0546aba870722498a7a4f20fd47309`,
exit zero, verified before/after. Its full-second 128/512-cell histories retain
31,094/32,290 half steps. The `hotwall61-early-qualified` receipt/log has 641
inputs, SHA-256
`aa296a75081eeb8a865c6c0fa5af554d35292628b7f7fb10421fe248bd96c534`,
exit zero, verified before/after. Its 64/128/256/512-cell early histories retain
20,562/21,598/22,212/22,710 half steps. All recorded canonical residuals remain
below 1.3e-13 with positive temperatures and species inventories.

These mesh checks use the same controller tolerances, not identical accepted
time partitions. They therefore support mesh robustness under the selected
controller; they are not a pure fixed-timestep spatial-error estimate or a new
continuum error bound. The separate early run changes the horizon and base
knots while retaining the exact original physical observation times. Its pass
is useful evidence against a horizon-dependent startup artifact.

The combined analysis retains 21 accuracy comparisons: 11 passes and 10
failures. The failures include the looser mixture policies and both failed
Robin controls. The three promoted passes are distinct full/early/control
assessments, not three independent continuum solutions. No mask, denominator
or accuracy threshold was loosened to obtain this result.

**Scoped scientific verdict:** the selected 256-gas/16-wall, 6.25e-7 / 1e-7 K
policy satisfies the registered hot-wall startup comparisons and the independent
finite-wall Robin control at the sampled inputs and times. This reviewer finds
no unresolved reference-method blocker to exposing it as an explicitly scoped
opt-in numerical mode. The evidence does not qualify arbitrary slider values,
current interventions, kinetic wall physics or Marathon device calibration.
The 19 final release gates and deployed application behavior have not been
reviewed in this document and remain the parent's final verification work.
