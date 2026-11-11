# v69 independent local thermal diagnosis

10 November 2026. This reviewer owns only this document. Source and retained
data were read on the host; trusted standard-library JSON/arithmetic review was
used, with no project imports or scientific execution. The parent owns every
VM run, source synchronization and executable change. This is a diagnosis and
prospective qualification plan, not an executed v69 refinement result.

## Paths and observed evidence

Traced `createFuelSpatialStepper` / `advanceFuelSpatialOperation` → source
callback for species and momentum → `advanceFuelMixtureThermal` → canonical
enthalpy/temperature reconstruction. The same endpoint temperature drives
transport properties, conservative species transfers, momentum work and Joule
heat. The thermal residual combines canonical energy change, source work,
conductive/enthalpy face transfers and equal-and-opposite wall exchange. All
these increments use the same supplied timestep. Its nonlinear iteration is
not itself a higher-order time integrator.

The wall uses exact annular volumes, logarithmic radial centers/resistances,
temperature-dependent tungsten conductivity and Shomate enthalpy. The gas uses
equal-volume shells and temperature-dependent neutral conductivity. Physical
surface temperature is independently reconstructed from the first solid
temperature plus signed accepted wall power times its half-cell resistance;
the initial physical surface remains the uniform initialized solid value.

Read the v68 report, frozen campaign and specification, `analyze.py` / `surface.py`
and the retained time/spatial reports. The qualified v68 source snapshot is
`4d28113802de70f2624f3d5146f5e8f22508103e6ae8f255575d2ea62d935631`.
Those observations establish separate discrepancies:

- Time-axis surface response: 4.6388% at the first shared 61.035 ns time, a
  1.0444e-6 K discrepancy on a 2.2515e-5 K excursion.
- Wall-axis surface response: 5.5121% at 15.259 ns, a 5.9777e-7 K discrepancy
  on a 1.0845e-5 K excursion.
- Time-axis gas cell 1: 14.8176% at 38.146972656 microseconds, a 0.002171255 K
  discrepancy on a 0.014653228 K causal excursion. The reference excursion is
  far above the reported roundoff scale, so this cannot be discarded as noise.
- Near-ULP solid-cell ratios are a different case: a very large percentage can
  correspond to a sub-nanokelvin raw difference. Keep their unresolved status
  and raw scale rather than interpreting them as macroscopic heating error.

The gas trace was additionally inspected directly in untouched original packet
gzips under the v68 final seal, without importing model code. Cell 1 starts at
1002.34375 K, first cools, and then reheats through its initial temperature.
At the disputed shared time, coarse/fine reported temperatures are
1002.3605744829744 / 1002.3584032278843 K. Fine values at 29.54 / 32.29 / 35.16
microseconds are 1002.3405137 / 1002.3453080 / 1002.3512318 K. The ending
coarse/fine intervals are approximately 2.991 / 1.511 microseconds. The retained
face and source increments are nonzero and the canonical species inventories
evolve. This is a small nonmonotone net temperature response, not the immediate
wall surface jump or roundoff-only cancellation.

## Diagnosis: observed versus inferred

The source uses backward endpoint energy increments. BE remains stable for a
stiff diffusion problem without necessarily resolving its short transient. The
[NIST FiPy diffusion example](https://pages.nist.gov/fipy/en/stable/generated/examples.diffusion.mesh1D.html)
explicitly distinguishes implicit stability from timestep accuracy; its
[TransientTerm documentation](https://pages.nist.gov/fipy/en/stable/generated/fipy.terms.transientTerm.html)
also shows the endpoint difference of stored quantities. These references
support the numerical interpretation, not an independent run of our coupled
model or a recommendation to substitute Crank–Nicolson without qualification.

A suddenly applied finite Robin/flux boundary on an initially uniform solid
has a developing diffusion layer. Locally, the planar constant-property
equation `T_t = alpha*T_xx` gives a penetration scale proportional to
`sqrt(alpha*t)` and a constant-flux surface excursion proportional to
`sqrt(t)`. This is an independently derived limiting argument, not a claim
that the full variable-property cylindrical gas/solid problem is exactly
planar or constant-flux.

The quadratic schedule has first time `T/Ntime^2`. Doubling its count moves
that point four times earlier. A first-knot coarse/fine comparison therefore
continually probes a new startup scale rather than proving a fixed-time
asymptotic error. A similar relative error can persist at the moving first
point even while errors at fixed physical times improve. It must not be
removed from reporting, but its behavior should not be confused with failure
of convergence at every fixed positive time.

The quadratic wall mesh at 128 cells has first thickness approximately 61 nm,
then 183 / 305 nm. Only a few cells can span a sub-micrometre initial layer.
The wall-axis discrepancy is consequently consistent with insufficient local
spatial resolution and half-cell reconstruction of a strongly curved startup
profile. This is a physical/numerical inference requiring a fixed-time mesh
study; the existing two-level result does not identify a material-law bug.

The inner gas cell's nonmonotone trajectory is consistent with first-order
temporal phase/amplitude error in a small net response of competing energy
transport and evolving particle inventory. Its later time and interior
location rule out attributing the entire 14.8% to the first wall boundary
layer. Additional fixed-time coupled refinement is needed before assigning a
more specific cause. No conductivity, heat capacity or accommodation adjustment
is justified by these observations.

## Smallest justified improvement and test order

1. Isolate a solid startup benchmark at fixed 15.258789 ns and 61.035156 ns.
   On a fixed spatial mesh split each exact physical duration into 1/2/4/8/16
   BE intervals, retaining original initialized temperature and boundary data.
   Compare against an independent FiPy solve and/or a properly scoped analytic
   planar constant-property limit. Keep continuum-limit assumptions explicit.
2. Hold that temporal support fine and compare a frozen family of explicit
   wall edges across the same full annulus. The current API already accepts
   such edges; a new physical model or larger cell cap is not the first remedy.
   Smooth exponential/sinh grading can place more cells across the first
   micrometre while keeping first widths in the tens of nanometres. Test both
   startup and the full 1-ms energy/surface norms. This is a suggested mesh
   experiment, not a demonstrated better mesh.
3. For the gas failure run a complete requested coupled prefix ending at
   38.146972656 microseconds. The original 1-ms quadratic scheduling function
   reaches this time at steps 25/50/100 for nominal counts 128/256/512. This
   efficiently targets the retained failure at identical physical time before
   paying for another complete 1-ms trajectory. Report prefix duration as such;
   it does not qualify later operation.
4. If substepping is justified, advance the entire coupled state on every
   accepted fine interval. Retain fine states and ledgers individually. Do not
   relabel their aggregate as one original BE step: endpoint work and BE/upwind
   losses depend on the intermediate path, so the existing per-step auditor
   must see the actual steps.

This order preserves existing equations and conservative structure while
separating spatial and temporal errors. A thermal-only higher-order update
would be broader and potentially inconsistent: the source callback already
integrates species/momentum over the supplied full dt. New multi-stage or
BDF formulas would require corresponding source and numerical-loss ledgers,
positivity/entropy qualification, and independent stage validation.

Avoid blindly replacing quadratic grading with cubic grading: at 128 cells
and 1-mm thickness its first width is about 0.48 nm, near atomic scales. It
also increases stiffness and temperature-representation sensitivity. More
resolution near the actual penetration scale is preferable to an arbitrarily
tiny first cell.

## Gates and claim boundaries

Retain all v68 primary, electrical, surface, conservation, positivity, domain
and entropy gates. Preserve the failed v68 outputs unchanged. Prospective new
studies must declare exact grids/times, complete requested duration, raw and
source hashes, and every unpaired/fine-only time. No temporal interpolation
or positive denominator floor should turn an unresolved local signal into a
pass. At fixed startup times report raw K differences and causal signal-relative
errors alongside whole-history normalization. Keep near-roundoff solid signals
separately inconclusive; do not hide their raw discrepancies.

A regression should reproduce the retained gas cell/time and demonstrate
reduction of its resolved error, not merely a smaller global maximum elsewhere.
Startup wall tests must compare the physical surface radius, not the first
cell-center temperatures from different meshes. Any proposed accepted-substep
wrapper needs missing/partial trajectory and coarse-versus-fine state ownership
tests. Rejected coarse trials must not become accepted history or corrupt the
prepared solver's private state; the solver's actual residual remains
authoritative for any reused initial guess.

No v69 study has yet been executed by this reviewer. The existing evidence
supports the scoped v68 global numerical foundation, not uniform local
thermal accuracy, measured Marathon performance or promotion to live defaults.

## Follow-up source review of the proposed v69 campaign

Reviewed `scientific/thermal-local-v69/{PROTOCOL.md,specifications.json,
campaign.ts,benchmark.ts,assess.py,reference.py}` without execution. The fixed
exponential stretch of 8 is declared before scoring; production equations,
material functions, mesh cap and live defaults remain unchanged. The coupled
prefixes retain actual accepted transitions. Their quadratic nominal schedules
end at the same declared physical time and preserve the original quadratic wall
to isolate temporal error.

The limiting benchmark is physically coherent within its declared scope:
uniform fixed gas inventory and temperature, zero species transfers/sources,
the original gas-wall film, fixed neutral conductivity, a closed external wall,
and nonlinear tungsten in the target solver. The independent graph uses the
same cylindrical annular geometry, gas capacities and series half-cell/film
resistances. Its frozen tungsten coefficients make it a limiting reference;
the recorded coefficient variations must remain visible. It is not a second
implementation of all coupled production physics.

Two concrete scoring blockers were reported to the parent before execution:

1. `assess.py` records the new resolved fixed-endpoint gas 1% gate but exits
   nonzero only on legacy global/surface/electrical failure. A pair can therefore
   fail the new target with a successful process status. The gas-prefix result
   should enforce its declared endpoint target, explicitly require reversal
   cell 1 to be resolved, and disallow a vacuous successful `all([])` when no
   signals resolve. A regression should inject a failed resolved endpoint while
   leaving legacy gates passing; another should make cell 1 unresolved.
2. `reference.py` reports eigen/expm increment disagreement as reference
   uncertainty but does not include that uncertainty in external or successive
   accuracy gates. A reported small target/reference discrepancy is insufficient
   when the reference itself cannot resolve the 1% budget. Require a declared
   reference-resolution budget relative to the gas/surface increment norms
   before allowing an external pass. Keep tiny per-cell tails diagnostic. A
   regression should increase only the independently reported reference defect
   and verify that the external qualification becomes inconclusive or fails.

These are scorer defects, not evidence that the physical fixture or a numerical
study has failed. At review time no new result packets had been checked by this
reviewer, and neither local qualification nor a new integration-method accuracy
claim follows from the source review.

### Endpoint scorer correction reviewed

The parent's revised `assess.py` now computes endpoint qualification through a
nonvacuous resolved-cell set, requires known reversal cell 1 to resolve, and
includes this qualification in `allRequiredGatesPassed` and the process failure
status for the explicitly named gas-prefix time pairs. This addresses blocker 1
on source inspection. `test_endpoint.py` covers the cooling/reheating causal
excursion denominator, a resolved greater-than-1% discrepancy, and zero-signal
or missing-reversal-cell rejection. The helper remains downstream of the frozen
physical-setup, complete-history and shared-time validators in the real scorer.
No additional physical or endpoint-scoring blocker was found in that narrow
re-review. Test execution remains the parent's VM responsibility; this is not a
claim that those tests have passed. A command-level test of the final process
exit would additionally cover the wiring from helper to CLI, beyond the three
helper tests.

### Independent reference correction reviewed

The revised reference now reserves at most 0.1% of the relevant gas or surface
increment norm for its numerical reference allowance, separately from the 1%
target/reference discrepancy gate. That allowance combines eigen/augmented-expm
increment disagreement and a temperature representation term; it is not
subtracted from the measured discrepancy. The finest external gates enforce
`referenceQualified`, including a negative assessment test. This addresses
blocker 2 on source inspection. Treat the allowance as an estimated numerical
resolution check, not a mathematically certified upper bound on reference error.

Exported gas and interface heat are now checked in magnitude against independently
reconstructed endpoint `dt G (T_left-T_right)` as well as direction, with explicit
floating-point and physical-flux allowances. A same-sign doubled interface-heat
test verifies that direction alone cannot pass. Canonical energy, independently
reconstructed row residuals, global energy and entropy remain separate checks.
No additional blocker was found in this narrow source review.

The external accuracy claim remains limited to the fixed-graph frozen-property
reference. Wall mesh refinement is separate evidence about spatial resolution;
it does not convert the graph reference into a certified continuum solution.
Reported nonlinear tungsten coefficient variations must accompany results. These
checks do not bound nonlinear-property approximation error by themselves, and
provide no gas-regime or experimental validation. The parent reports 14 new
tests passing in offline VM snapshot
`5134e97644469f1e82ec9b04a397a4c60090532237544e4b1e9902d0f4fc173d`;
this reviewer inspected source only and has not independently run those tests
or checked exported numerical results from that snapshot.

## Initial exported q512/q1024 evidence independently checked

Reviewed retained `thermal69/studies/initial/thermal69-assess-1` evidence using
trusted Python standard-library JSON/gzip/hash/arithmetic only. No project
modules were imported or executed. Initial export manifest SHA-256 is
`4677a27b00472f8c08c8ac7d7688441b38d2edac463b466b8943571f0bde8660`.
The combined gzip and uncompressed packet hashes match their report, binding
the checked raw 100/200 accepted-step cases to the assessment. Both requested
durations finish at `0.00003814697265625 s`, without a failure flag.

Canonical temperatures independently reconstructed from stored gas energies and
species inventories confirm reversal cell 1 is the only endpoint above 1%:

| Quantity | Independently recomputed value |
| --- | ---: |
| q512 endpoint cell 1 | 1002.3573164901201 K |
| q1024 endpoint cell 1 | 1002.3567729114106 K |
| q1024 minimum cell 1 | 1002.3290317773522 K |
| Endpoint difference | 0.0005435787094256739 K |
| Fine causal excursion | 0.014718222647729817 K |
| Maximum endpoint ratio, cell 1 | 3.6932360818% |

Recomputed ratios agree with the report to about `8e-12` absolute ratio; tiny
differences arise from independent arithmetic ordering. The report explicitly
fails endpoint qualification despite passing the legacy whole-history,
surface and electrical gates, and the retained receipt shows CLI exit 1. This
is a successful detection of an unresolved target, not a convergence pass.

Both conservation reports contain one audit record per accepted transition
(100/200), 136700/273400 checks and nine rejected controls each. Their stated
negative-control scope is the first accepted transition; it does not claim
mutated controls at every time. I additionally reconstructed every step's
species continuity, endpoint shell inertia and global energy identity directly
from the raw cases, including independently calculated BE and advection losses.
Maximum global residuals were `3.38e-12 J` and `3.27e-12 J`, at most 0.00672 and
0.00648 of the separately declared storage-plus-dynamic gate. Maximum canonical
inertia relative discrepancy was `1.05e-14`; species continuity defects were
below `6.3e-17`, with positive species inventories. Reported residual arithmetic
differences remained well below the explicit stored-energy allowance. Full
entropy and local row reconstruction were inspected through the retained
independent auditor's reports/source, rather than reimplemented in this review.

The raw endpoint discrepancy is about one quarter of the old q128/q256 value,
consistent with first-order temporal truncation as steps shrink. That is an
inference supporting the root-cause diagnosis; the pending q2048/q4096 results
are required before accepting the prospective 1% target.

## Bounded next step toward first-order physical accuracy

The retained v64/v65 reports still record a failed experimental challenge:
rigid-model apparent-profile RMS/peak 59.55%, viscous candidate 39.98%, versus
the proposed 20% target. Their pressure hypotheses predict respectively 1/3
and 1 for the 9-Torr/3-Torr speed ratio, versus the reported approximate 2/3.
Tracing `experimental-v64/compare.ts` and the v65 protocol explains these as
different closures: the first prescribes inventory-scaled rates, while density
drops out of fixed-viscosity/current steady flow. Neither failure uniquely
identifies drag. V66–v68 add numerical current/momentum/thermal coupling but
retain prescribed conductivity, common radial rotation extruded in z and no
separate charged/neutral or electron-energy equations. They do not replay the
experimental apparatus or supersede those retained discrepancies.

Two reviewable experimental/model gates are preferable to more isolated thermal
refinement after its numerical gates pass:

1. **One temperature-conditioned Ar profile.** First admit a source-bound input
   package for the same measured condition: actual electrode/current geometry,
   available radial temperature constraints, optical line and projection/fit
   operator, and uncertainty semantics. Then use the existing sourced Ar
   viscosity as a function of those temperatures and preserve the three-inner /
   five-outer velocity holdout. Allow only the previously declared single
   amplitude calibration; bound missing current/emissivity inputs independently
   before scoring. Require the prospective 20% resolved-signal target, correct
   profile trend and numerical/extraction contributions each below 5%. Missing
   matched inputs mean inadmissible, not an invented calibrated prediction.
   In particular the recovered 1979 1-Torr temperature anchors cannot stand in
   for the distinct 1980 3-Torr profile. This is conditional flow validation;
   it does not validate predicted heating or ion-neutral slip.
2. **A matched pressure holdout with shared closures.** After that fixture,
   hold out a second pressure using one fixed material/drive closure and
   independently constrained temperature/current/inventory changes. Compare
   the same measured Doppler quantity and pressure definition, including the
   slowdown signal, not merely a speed ratio with a large unity baseline.
   Do not fit drag at each pressure or infer discharged inventory from filling
   pressure without an admitted boundary/expansion model. If these inputs remain
   unavailable, retain the old discrepancy as an applicability challenge and
   seek a more completely specified public case before adding new equations.

This order is an inference about the shortest useful route: observed profile
errors are much larger than the current thermal discretization error, and
temperature/current/diagnostic conditioning tests those specific confounders
before broad two-temperature or finite-length model work. A fresh primary
[2026 preprint abstract](https://arxiv.org/abs/2607.28208v2) confirms that its
two-temperature model is benchmarked against Ar velocity, temperature and
pressure measurements; that establishes a relevant literature lead, not that
our repository has a complete matched input dataset. The original historical
publisher pages were inaccessible in this fresh web check; historical numerical
values above are explicitly from the retained repository evidence.

## Finest coupled evidence closeout

Independently checked the exported `finest` and `coupled` evidence using only
trusted standard-library data/hash/arithmetic review. All 16 and 38 files match
their declared SHA-256 and byte counts. Manifest hashes are respectively
`c8e02ed8e33c8a6f7932858f7f729f2aeccaf269c5b826aecf07537d9bd415bf`
and `7309805aec23f06f6d8f6b54b2d5008562a0ce36038ef5378fa06ab1b6cbe2b6`.
Both retained finest combined packets match compressed and uncompressed hashes
and declare source `5134e97644469f1e82ec9b04a397a4c60090532237544e4b1e9902d0f4fc173d`.
Original standalone packet hash claims agree across convergence, electrical and
conservation reports. At this initial closeout the standalone bytes were not
yet exported, so only the combined bytes and cross-report consistency could be
checked directly. The later archive verification below closes that limitation.

For the q2048/q4096 gas prefixes, setup and initial state match exactly; both
complete 400/800 accepted steps to `38.14697265625 us`. Direct canonical gas
temperature reconstruction gives:

| Quantity | Independently recomputed value |
| --- | ---: |
| q2048 endpoint cell 1 | 1002.356501078075 K |
| q4096 endpoint cell 1 | 1002.3563651514687 K |
| q4096 minimum cell 1 | 1002.3289183515495 K |
| Cell 1 endpoint difference | 0.00013592660627637088 K |
| Cell 1 fine causal excursion | 0.014831648450353896 K |
| Maximum endpoint ratio, cell 1 | 0.9164632423% |

All 64 endpoint signals resolve and satisfy the prospective 1% target. I also
recomputed the gas causal diagnostic at every shared accepted time, including
fine intermediate times in the causal denominator: the same endpoint/cell is
the worst resolved comparison. Only the initial zero excursions are unresolved.
The maximum absolute gas difference is a different observable: 0.00269350549 K
in cell 62, whose fine causal signal is 12.8413587 K. This distinction prevents
mistaking a small reversal-cell signal for the largest temperature discrepancy.
The q1024/q2048 endpoint result remains a failed 1.83748% comparison with exit 1.

The finest gas time pair passes the unchanged whole-history gates at shared
times: maximum rotation difference `0.522475 rad/s` (0.0002633% of initial peak),
global gas-temperature difference 0.02059% of heating excursion and reconstructed
surface difference 0.02534% of whole-history surface excursion. The electrical
report's maximum refinement ratio is 0.0002223%; its identities pass. These
reported gates were checked against their unchanged explicit limits; direct raw
recomputation additionally confirmed the gas and rotation maximum differences.

For the full 1-ms exponential-wall pair, both cases complete 256 steps, all
non-liner setup and initial gas fields match, and the wall edges nest exactly.
Whole-history surface difference is 0.0716094% of excursion, below the unchanged
2% wall gate; raw difference is `7.9054e-7 K`. The fixed 15.2587890625-ns coupled
startup endpoint report gives `1.73222e-8 K / 1.19828e-5 K = 0.1445595%`, below
its prospective 2% spatial target. This endpoint report was inspected, rather
than independently reconstructing its nonlinear enthalpy inversion here.

The six additional conservation reports cover all 1840 accepted transitions,
2474320 checks and 54 rejected negative controls, with first-transition mutation
scope stated separately from all-step original-state checks. All report passes;
their minimum total entropy increments remain positive and maximum global
energy residuals are below `4.0e-12 J`. The original 100/200-step cases remain
preserved in the earlier export. Receipt status agrees with the retained failed
coarse pair and passing required finest comparisons.

### Remaining qualification boundaries

- The finest time-pair physical surface causal ratio still reaches **4.13017%**
  at **0.238419 ns** (`6.52215e-8 K / 1.57915e-6 K`), despite passing the
  whole-history norm. It is retained as an unresolved local time target.
- Fixed-endpoint wall qualification does not establish all-time spatial
  relative accuracy: the coupled startup wall pair's earliest local surface
  ratio reaches 2.38464%. Near-resolution solid tails also retain failed local
  ratios. Neither may be removed by changing normalization or adding a floor.
- Fine-only accepted times receive identity checks, not refinement comparisons.
  The complete 1-ms exponential pair is a wall study at 256 timesteps, not a
  full-horizon q4096 time study. No new joint gas-radial/electrical/liner/time
  convergence or arbitrary-slider range follows.
- These results qualify the targeted conditional numerical experiments. The
  retained experimental profile and pressure failures, common-fluid/neutral
  transport assumptions, prescribed electrical conductivity and absent
  charged/neutral/electron-energy closure remain. There is no measured Marathon
  accuracy, live-default promotion, deployment or browser-verification claim.

The targeted gas reversal and fixed-time wall results support moving next to the
matched Ar metadata/holdout gate above, while retaining the microscopic surface
and solid-tail limitations explicitly. Further microscopic tuning should not
be presented as progress toward experimental accuracy without that data gate.

### Standalone archive provenance verified

After the standalone packets were exported and losslessly archived, I
independently streamed all eight gzip files through SHA-256 and byte counting,
without loading or executing project code. Every decompressed digest matches
both `studies/packet-archives.json` and the original packet hashes recorded in
the convergence summaries. Every compressed digest and byte count also matches
the supplemental archive index. The recovered total is 1057959367 original
bytes from 470366524 compressed bytes. This closes the standalone packet-hash
limitation recorded above, including the two finest gas cases.

I parsed the four root provenance fields directly from every recovered packet.
All agree on the frozen source, specification, seed and baseline packet hashes.
The specification hash also matches the actual retained `specifications.json`,
and the seed hash matches the actual retained initial `thermal69-seed.json`.
The original raw-export manifests describe their pre-compression paths; the
supplemental index identifies the recoverable gzip path and both byte hashes.
The source hash remains the campaign's tested-source attestation, not a hash of
today's evolving documentation checkout.

Final retained VM receipts/logs additionally show 9 v68 and 28 v67 scientific
tests passing, 1231 application tests passing without failures, and successful
typecheck, build, site and asset checks. These complement the parent's reported
14 v69 tests. I inspected those receipts and final summaries; I did not rerun
project checks or independently verify live browser behavior.
