# v68 evolving coupled qualification: independent prospective review

10 November 2026. This agent owns this review and the new independent
electrical-history comparator and its tests. Parent alone profiles, changes
production code, synchronizes and executes code in the offline safe-dev VM. The v67
protocol, analyzers and retained failures remain unchanged. No new numerical
result, experimental validation or live promotion is claimed here.

## Gap being tested

v67 established conditional all-step conservation/entropy and several separate
shared-time refinement comparisons. It did not jointly resolve the evolving
current field, radial gas, graded liner and time. Small changes to neutral spin
did not qualify electrical outputs: four axial cells missed about 30% of Joule
heat and projected torque even while their discrete charge/work identities
closed. Static 32→64 axial electrical comparisons passed, but they froze Ω.
The next study must therefore compare actual evolving electrical outputs,
not substitute a frozen-current result or a negligible neutral-response error.

## Smallest common-anchor matrix

Use the unchanged v67 physical experiment for 1 ms, with neutral Li6/Li7,
R=0.01 m, L=0.1 m, N=1e19, light fraction 0.3, D=0.001 m²/s, B=0.5 T,
sigmaP=0.01 S/m and sigmaParallel=0.1 S/m. Preserve the full outer 0.01 V
electrode, upper 0 V electrode for q/R²<0.5 and all other insulating faces.
All radial counts are even, so physical electrode coverage matches exactly.
Keep initial Ω=2e5(1−q/R²), gas T=1000+100q/R² K, 1200 K solid, 1 mm tungsten,
film 0.1 W/K and zero external cooling. Preserve the sourced constitutive laws
and full-cylinder axis; change numerical resolution only.

Graded wall edges are the already tested quadratic family
`r_j=R+thickness*(j/Nwall)^2`; time knots are
`t_k=duration*(k/Ntime)^2`. Declare both families explicitly in campaign inputs.

| Case | Gas radial | Current axial | Graded wall | Quadratic steps | Purpose |
| --- | ---: | ---: | ---: | ---: | --- |
| F | 64 | 64 | 128 | 256 | Common fine anchor |
| R | 32 | 64 | 128 | 256 | Radial comparison R→F |
| Z | 64 | 32 | 128 | 256 | Evolving current comparison Z→F |
| W | 64 | 64 | 64 | 256 | Wall comparison W→F |
| T | 64 | 64 | 128 | 128 | Time comparison T→F |

These five trajectories are the minimum common-anchor design: each required
axis changes alone, and every pair uses fine values of all other axes. A cheaper
staircase of axis comparisons can diagnose failures, but it cannot replace this
joint test because each comparison would have different unresolved controls.
The current wall-grid implementation supports at most 128 cells; any proposed
extension of that limit is separate reviewable work rather than an implicit
extra level in this matrix.

Run a short nonqualifying performance pilot first, then freeze the executable
source and all five case specifications before scoring. If one axis fails,
retain it and predeclare the next finer common anchor or a restricted scope;
do not move another numerical/physical parameter unnoticed. Existing coarse
and local-causal failures remain evidence even if the new global pairs pass.

## Required evolving checks

Apply the unchanged v67 seven primary history gates to every explicit pair:
Ω/initial fine peak, gas and solid temperature/whole-trajectory excursion,
species CDF, cumulative signed wall heat/total variation, endpoint wall power
and interval-average wall power. Use their existing 0.5% time/2% spatial Ω,
1% time/2% spatial temperature/heat, and 0.005 CDF limits. Retain raw units,
worst locations/times, initial representation errors and zero-signal statuses.
Keep the conservative inventory/energy and L/I restrictions. No time
interpolation or background-temperature denominator is admissible.

Also gate electrical observables throughout each shared-time history. Reuse
the frozen v67 electrical definitions and their 2% spatial criteria:

- Electrode, Joule and mechanical powers, normalized by the physical power sum
  `abs(Pelectrode)+Qjoule+abs(Pmechanical)`.
- Radially projected torque L1 difference, normalized by summed absolute torque;
  net torque cancellation cannot supply the denominator.
- Radially projected Joule-profile L1 difference, normalized by total Joule
  heat. Sum actual axial cell heating before radial comparison.
- Terminal-current differences normalized by total absolute terminal current.

Report these independently of the neutral spin gate. Keep the existing
no-positive-floor handling for exactly zero signals. For a new whole-history
electrical norm, predeclare its trajectory scale and shared-time coverage
before scoring; do not silently substitute it for v67's frozen-state gates.
Extensive radial currents/torques/heat require conservative shell restriction
before comparing different radial grids. Surface/face current measures and
their outward signs must refer to the same physical electrodes.

Every accepted step, including fine-only times, must pass the existing coupled
mass, angular-momentum, physical/numerical energy and entropy audit. Independently
reconstruct charge/work and projected electrical heat/torque using the actual
accepted current input, rather than relying only on solver-reported residuals.
Preserve the existing 1e−9 natural-scale electrical identities and separately
reported arithmetic/representability allowances. Independent FiPy checks at
selected initial, early and late accepted states should use the exact exported
source Ω, conductivity, grid and electrode data for those states. Actual Ω may
differ between evolving coarse/fine cases; that feedback is part of the
convergence experiment and must not be frozen away. Common-Ω cross-evaluations
can additionally diagnose operator versus feedback error, clearly labelled.

## Early physical surface response remains separate

Use the same physical R surface and v67 resistance/flux reconstruction; moving
cell-center temperatures do not qualify surface temperature. Retain its frozen
global surface-excursion and absolute 0.05 K gates. Keep the earliest shared
61 ns time diagnostic (4.637% in v67) and finest spatial causal diagnostic
(2.885%) separate from primary global acceptance. Tiny solid excursions near
ULP resolution remain inconclusive rather than physical percentage errors or
automatic passes. The resolved local gas response also remains relevant:
quadratic time refinement reduced the v67 30.08% point diagnostic to 10.55%,
not to uniform local-relative qualification.

There is a further interpretation issue: increasing quadratic N moves the first
shared time toward zero as T/N². An initially incompatible thermal boundary can
have a sqrt(t) diffusion startup. Relative error at a shrinking first sample
need not decay like a fixed-time or global absolute error. This is an inference
about the asymptotic regime, not a reason to erase the observed failure or
relax its gate. Predeclare an additional fixed-physical-time diagnostic set
common to q128/q256 and subsequent nested refinements, for example
`T*(m/128)^2`, m=4,8,16,32,64,128: 0.9765625, 3.90625, 15.625, 62.5, 250 and
1000 μs. Any qualified "after startup" statement must give its physical time
window. All earlier accepted/shared points and their errors remain reported.

## Static-operator optimization and provenance conditions

For prescribed conductivities and fixed geometry/electrode masks, the electrical
operator is static while its motional-EMF forcing evolves with Ω. Reusing a
prepared operator or response can reduce the expensive campaign without
changing the physics. This is conditional on those inputs staying fixed;
future temperature/ionization-dependent conductivity invalidates that premise.
Optimization must preserve the charge/work adjoint, actual local Joule heating,
signed torque, terminal currents and the existing source/frame convention.

Retain a fingerprint of the exact radial/axial geometry, conductivity arrays,
electrode voltages/masks, B, Ω-to-current mapping and implementation snapshot.
Stale same-shaped data must not silently reuse another operator or response.
Compare optimized and reference results for nonuniform/signed Ω and changed
physical inputs, and retain the established conservation/gauge/domain checks.
A faster solver is not independently validated merely because neutral outputs
look similar.

The accepted current source Ω is the exported converged fixed-point guess,
not automatically the final momentum Ω; their endpoint defect is explicitly
bounded and audited. Field references and power projections must use the exact
source field, not a displayed/interpolated/rendering field. Bind every campaign
packet, comparison configuration, audit and independent reference to its exact
source/input/prediction digests. Prefer one frozen simulation snapshot for all
five cases. Record analysis snapshots separately if an arithmetic auditor fix
is necessary; retain failed receipts without overwriting their labels.

Full accepted states and field inputs must remain auditable. A compact archive
is acceptable if lossless raw-byte decompression is hash-verified; omitting
fine-only fields or repeated inputs requires an explicit reviewed schema and
reconstruction, not an undocumented storage shortcut. Report accepted/requested
steps, failures, all pair gates and every unpaired diagnostic. Simulation
execution, optimization validation, independent reconstruction, numerical
refinement and experimental device calibration are distinct results.

## Current status

### Final sealed acceptance

The remaining provenance and required-check items are closed. Independently
verified all 201 payload hashes in `studies/final-seal` against manifest
`f481e1fca315455f98842bc55de9885505f0302471f8eeef595710daf837dd23`.
Streaming decompression of each of the five untouched original-packet gzips
reproduces its original raw digest in the seal index and the independent audit,
electrical and separation reports. Reading the original packet prefixes
confirms that every root contains source digest `4d281138…` and specification
digest `5bab5fa3…`. The copied specification bytes independently reproduce the
full expected digest recorded above. Original and combined packets remain
distinct retained evidence.

All 187 retained source-copy hashes agree with their entries in the complete
736-entry tested-input manifest; that actual manifest independently
canonicalizes to the frozen full source digest `4d281138…`. The bundle preserves
the historical guest-only runner sources as source copies. The seal documents
portable replay: preserve original configs, decompress unchanged packet bytes
and create a separately hashed replay config changing only packet paths, with
the packet/source hashes unchanged. No source or raw prediction is silently
regenerated during relocation.

Inspected the hash-verified final logs and their command receipts: all 1,231
application tests and 28 v67 scientific regressions pass, as do typecheck, build,
site resource parsing and authored-asset checks. The earlier nine new electrical
history regressions also have an inspected successful command receipt and raw
test log. Canonical final-check and nine-test input manifests independently
match the same `4d281138…` simulation/analysis snapshot. The asset/site logs
explicitly do not constitute a browser runtime test; no such claim is made.
The build retains an existing large-bundle warning, not a failing check.

No blocker remains to acceptance of this conditional 1 ms common-anchor
numerical foundation, its predeclared global observable norms, all-step
conservation/entropy and the separately labelled integrated-separation
diagnostic. This approval does not extend to uniform startup/local-relative
accuracy, untested operating parameters or durations, experimental calibration,
discharge/ionization/chemistry closure, collector performance or deployed/live
rendering. The explicit failures and scope limits below remain part of the
accepted evidence. No project or scientific code was executed by this reviewer;
all executable verification was performed by the parent in offline safe-dev.

### Actual common-anchor spatial qualification

Read-only inspection of the complete `studies/spatial-1` export verified all
53 payload hashes against manifest
`f5c755242b19cb5ed0e6c548a59e006404d30e0b2dc0dcd7c37bfe34560755d0`.
Streaming decompression independently produced the radial, axial and liner
prediction digests `0cbc4270…`, `2dae6696…` and `c4fbdb66…`, respectively,
matching their complete retained report/configuration/summary bindings. Every
source binding is the frozen `4d281138…` snapshot. The actual canonical input
dictionaries for the remaining-case runner, spatial assessment and additional
separation diagnostic independently reproduce that same source digest; their
receipts report exit code zero and before/after source verification. All six
fixed physical checkpoints for each spatial axis exactly equal the respective
original history, physical-surface and electrical trace rows.

All unchanged primary, physical-surface and electrical gates pass across all
three spatial axes. The following percentages use each observable's predeclared
global norm, not background temperature or a local percentage denominator:

| Spatial axis | Ω | Gas T | Liner T | Surface T | Projected torque | Projected Joule |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Radial 32→64 | 0.394176% | 0.0171576% | 0.0169207% | 0.0169407% | 0.0585261% | 0.101051% |
| Axial 32→64 | 0.0000421384% | 0.0000588020% | 0.0000226789% | 0.0000226967% | 0.632140% | 0.891123% |
| Graded liner 64→128 | 1.10352e−9% | 1.45873e−7% | 0.0564178% | 0.0571870% | 1.82803e−9% | 1.84884e−9% |

The radial Ω maximum is near the axis at 30.899 μs and includes the retained
finite-grid initial representation difference; it is not an endpoint-only
measure. Species CDF discrepancies are 4.71940e−6, 3.37562e−9 and 2.96263e−12
for radial, axial and liner pairs. The largest spatial endpoint/interval wall
power discrepancy is the radial 0.263408% at 15.2588 ns. In the axial pair,
neutral Ω alone would show only 0.0000421%, while projected Joule differs by
0.891%; this directly demonstrates why a nearly unchanged neutral solution
cannot substitute for the separate evolving electrical qualification.

The four newly inspected 256-step coupled audits, together with the prior
128-step audit, cover all 1,152 unique accepted transitions and 1,402,752 checks.
Each of five cases independently rejects all nine first-transition corruptions
(45 retained controls); controls are not described as whole-history corruption
tests. The largest unadjusted global energy residual divided by dynamic scale
among the four new audits is 2.27506e−10, below 1e−9 even before explicit
storage allowances. All entropy increments are positive, with overall minimum
3.30203e−10 J/K and smallest increment/allowance ratio above 707. The largest
source/final Ω endpoint defect is 1.99991e−11, within the existing 2e−11 bound.
Every unique initial/accepted electrical state is reconstructed: 1,157 states
across five cases. The common anchor is repeated in pair reports, not counted
as new independent data. The largest spatial identity discrepancy is
1.57603e−11 versus the unchanged 1e−9 limit.

The newly inspected 16-case actual FiPy campaign passes 362 frozen gates, with
raw case/production/FiPy input hashes matching its report and export manifest.
The retained versions are FiPy 4.0.3, NumPy 2.4.6 and SciPy 1.17.1. This is an
independent discretization/reference check for prescribed conductivity and
specified electrodes, not a validation of conductivity prediction, discharge
chemistry or experimental device performance.

Local limitations remain visible rather than erased by the global passes.
The liner-axis physical-surface causal difference reaches 5.51211% at the first
shared 15.2588 ns (0.597773 μK error on a 10.8447 μK signal). The radial gas
causal diagnostic reaches 2.26505% at 0.381470 μs. Liner spatial diagnostics
retain near-precision undefined-relative comparisons and a nominal 103.093%
resolved comparison on an 8.82210e−11 K signal; full local-relative accuracy is
explicitly false. The previously documented time-startup/local gas failures
also remain. All-axis global convergence of this conditional 1 ms experiment
does not qualify every early/local signal, long-time operation, the browser
backend or Marathon's actual device. Untouched original-packet/source sealing
and final application checks are now closed by the final acceptance above.

### Actual resolved time-pair evidence

The complete common-spatial-resolution q128→q256 time comparison is now
independently inspected in `scientific/centrifuge-v44/resolved68/studies/time-1`.
All seven exported payload digests match its manifest, whose raw SHA256 is
`c8f621553dc7a8a952a319af2ba03018812bd6127539d150b11638f5ae5c9b55`.
Streaming decompression without scientific-module execution independently
reproduces uncompressed prediction SHA256
`cf1b6e3adc453b2301a58fdd79a8c0db73b52f3c1c495d82609fe023e1f01d4e`;
the compressed payload digest is
`ce3462605945605176f8bc5afd83b347673227844bb34c94ff18b9474cbbe983`.
Both match the retained summary/configuration. Raw stream metadata confirms
the two correct case identities, identical 64×64 gas/current and 128-cell wall
specifications, requested 128/256 steps and null failures. The anchor-case and
time-assessment receipts have exit code zero, report source verification before
and after, and their actual canonical 736-entry input manifests independently
hash to the common frozen `4d281138…` snapshot above.

The seven primary whole-history limits all pass. Maxima are Ω 0.0331264%, gas
temperature 0.196797% of trajectory heating (0.184203 K), liner temperature
0.202660% (2.23501 μK), species CDF 1.02842e−5, cumulative wall heat 0.0908515%,
endpoint wall power 0.132592%, and interval wall power 0.150648%. The common
physical surface passes at 0.199675% of its global excursion and 2.20235 μK
absolute difference. These are global excursion norms, not local-relative
percentage bounds. All 128 coarse accepted times plus the initial state are
included; 128 fine-only accepted times are outside refinement comparison.

Electrical reconstruction covers all 386 states: 129 coarse and 257 fine,
including both initialized states and every fine-only accepted endpoint.
All 5,790 independent electrical identity checks pass, with largest reported
relative discrepancy 1.03840e−11 against the unchanged 1e−9 identity limit.
All nine time-refinement electrical observables pass. The largest is projected
Joule-profile L1 error 0.0535909%, followed by projected torque L1 0.0531013%;
electrode power, Joule power and mechanical power are separately checked at
0.000163542%, 0.0266399% and 0.0268035% of their common physical power scale.
Active upper/outer terminal differences are each 0.0281722%; inactive sides
remain exact zero. No Ω-based denominator is used for electrical acceptance.

All six retained fixed physical checkpoints are exact copies of the respective
history, surface and electrical trace rows, independently checked by data
comparison. The physical surface's local causal differences at 0.9765625,
3.90625, 15.625, 62.5, 250 and 1000 μs are respectively 1.91655%, 1.03838%,
0.570110%, 0.332730%, 0.173952% and 0.0737831%. This sample list does not
replace all earlier points or qualify an entire later time window.

The explicit local limitations remain. At the earliest shared 61.0352 ns the
surface causal error is 4.63883% (1.04443 μK on 22.5150 μK), above the proposed
1% local target despite the global norm passing. The worst resolved local gas
diagnostic is 14.8176% at 38.147 μs in radial cell 1, from 0.00217126 K error on
a 0.0146532 K causal signal. Liner diagnostics retain 3,568 unresolved-relative
comparisons and 73 unresolved comparisons with discrepancies above their
arithmetic allowance. Its largest nominal resolved relative error is 769.677%
on a 7.04858e−11 K signal, barely above a 6.82121e−11 K allowance; that is not
evidence of a similarly large absolute physical temperature error. The maximum
unresolved raw difference is 4.96584e−10 K. Uniform local-relative accuracy
therefore remains unqualified.

This establishes the scoped time comparison, supplemented by the separately
reviewed spatial comparisons above; it does not establish device calibration
or a live backend. Original packet digests agree
between the electrical config, report and summary and the earlier coarse audit;
the final sealed export now retains untouched original one-case raw bytes in
lossless raw-byte gzips. The exact combined prediction stream omits the
original root `specificationSHA256` and is not byte-identical to either original
packet, so it cannot alone reverify those original-file digests.

### Additional separation-signal interpretation

After the parent reported completion of all five trajectories, but before
spatial scoring closeout, it proposed an additional diagnostic without changing frozen gates or
executables. This review agrees it addresses a material limitation: absolute
species CDF error below 0.005 may still be larger than the entire differential
isotope-separation signal. It cannot alone establish relative accuracy of that
signal.

Use each species' normalized canonical inventory to define signed
`D(q,t)=CDFheavy(q,t)−CDFlight(q,t)`. At each shared accepted time, conservatively
restrict fine species inventories to the coarse q cells before forming D at
common edges. Report maximum shared-time/edge discrepancy E, the maximum |D|
over both complete histories S, and E/S with exact zero handling. Preserve
raw E/S units, the peak signed profiles, worst time/edge and both signed D
values there, final profiles, and fine-only temporal coverage. Zero signal
with zero error is exact agreement; a nonzero discrepancy with zero scale is
unqualified rather than assigned a floor. This is an additional labelled
diagnostic, not a retroactively introduced acceptance gate.

Even a small E/S would concern a global integrated separation signal; it would
not qualify local isotope enrichment, wall concentration gradients, collector
purity or extraction performance. Existing species-CDF and continuity checks
remain necessary because common-mode errors in both species can cancel in D.
The retained `resolved68-separation-diagnostic` command, receipt, log and raw
JSON are now independently inspected. The command explicitly binds frozen
source `4d281138…`, validates each completed normalized inventory and records
the five original packet digests, which agree with coupled/electrical reports.
It uses compensated CDF sums, conservative fine-inventory restriction, both
complete native histories for S, exact shared times and the frozen no-floor
ratio function. Its raw diagnostic SHA256 is
`2ffa1533e137e519dfab8b9c49923a0ca1f5f3cbb0618d1877f08e5b65d2371f`,
verified against the spatial export manifest.

The maximum integrated separation signal is approximately 7.5953e−4. E/S is
0.260796% for time, 0.0867737% radial, 0.0000554790% axial and 4.23169e−9%
liner. All maxima occur at 1 ms and retain signed D, worst common q edge and
final coarse/restricted-fine/native-fine profiles. The time raw error is
1.98082e−6 and radial raw error 6.59072e−7. The developed signal is substantially
smaller than the absolute 0.005 species-CDF gate, confirming why this additional
relative diagnostic matters. These are retained diagnostic observations,
not newly introduced acceptance gates or claims about local enrichment,
collector performance or calibration.

### Provisional actual 128-step conservation evidence

Read-only inspection of
`scientific/centrifuge-v44/resolved68/studies/solver-1/resolved68-time-audit/conservation.json`
and the host `resolved68-time-case`/`resolved68-time-audit` receipts and logs
confirms the time control completed 128 of 128 requested steps, with no failure,
and its independent coupled audit completed 174,976 checks. Both receipts have
exit code zero and report source verification before and after execution. Their
actual canonical input dictionaries independently hash to the same frozen
`4d28113802de70f2624f3d5146f5e8f22508103e6ae8f255575d2ea62d935631`.
The seven directly reviewed runner, comparator, comparator-test, trajectory,
surface and coupled-auditor source files match those manifest entries. The
retained specification entry and current specification bytes independently
match SHA256 `5bab5fa3fd41e4963fc28a0faa938ff271c7e2081167423177d8f0ee3ebde293`.

The actual audit payload hashes to
`2562208260a5be3eb02e69a16a9d6a808158662af00cdb18905eed9d5ba40b47`,
matching the retained solver-1 export manifest, whose raw SHA256 is
`84432b2837b3f8b0390685281dfa6bc1e1b2facbf363bfe0fd10f3bf88e7b157`.
The audit binds the original one-case prediction digest
`e6d0b27f5bfa4c77b3fbd594b009ad246131acb69ec915f7cf34730ae28c4898`;
those raw prediction bytes are not yet exported for direct inspection here.

All 128 accepted-transition ledgers pass their existing 1e−9 natural-scale
criteria. The maximum unadjusted global energy residual divided by its dynamic
energy scale is 2.11617e−10, already below that gate before the explicit storage
allowance. The largest raw global residual is 3.52422e−12 J; dynamic scales span
0.0120176–0.0370911 J. The largest adjusted local gas-energy error is
3.47975e−12, local angular-momentum error 3.06972e−14, and electrical work
identity error 1.43932e−12. Physical shear heat, centrifugal work, external
mechanical numerical losses, species/enthalpy flux and boundary heat remain
separately audited rather than being reassigned to make a total close.

Every accepted entropy increment is positive: the minimum is 1.32070e−9 J/K,
and the smallest ratio to its explicit arithmetic allowance is 2827.78. The
source/final Ω relative endpoint mismatch spans 1.00406e−11–1.98983e−11,
consistent with the declared fixed-point limit; the largest mechanical endpoint
work defect is 6.34831e−19 J. The nine actual adversarial controls all reject,
including partial trajectory, density/inertia/spin corruption, invented heat,
wrong projected torque, stale shear representation, missing accepted solid
temperature and background energy substituted for dynamic scale. Controls use
the first accepted transition only, as the report explicitly states; the
uncorrupted conservation audit covers all 128 transitions.

This is all-step identity/entropy evidence for one trajectory. Completion and
conservation alone do not establish evolving-current or temporal/spatial
convergence; the separately retained time-pair evidence above provides the
specific time-refinement result. Original-packet/source closeout is now
complete as recorded in the final acceptance. No project or scientific code was executed by this reviewer.

### Frozen campaign and assessment source review

Read-only review of `scientific/resolved-v68/campaign.ts`, `assess.py`, their
frozen v67 helper calls and the coupled-auditor control entry points found no
blocking defect in the planned matrix's physical setup or orchestration.
The campaign constructs the same scalar inputs, physical half-upper-electrode
coverage, full outer electrode and nested quadratic time family for every
declared axis. Initial electrical fields use the exact initialized Ω. Accepted
output is streamed to NDJSON and then assembled into one complete-case packet;
requested counts and failures are retained. Removing the redundant thermal
payload preserves the separately exported fields consumed by the independent
auditors. The runner does not retain all full electrical states in memory.

The assessment independently audits each complete original trajectory before
limiting adversarial corruptions to the first transition, which is explicitly
labelled. Its pair workflow retains the exact combined prediction JSON bytes in
gzip and binds both compressed and uncompressed digests. Frozen trajectory and
surface helpers score that same in-memory packet. Both full packets are then
released before the electrical comparator independently reloads them; the
small comparison reports remain. No project/scientific execution was performed
by this reviewer.

Source-level pair agreement is not itself freshness proof. Final closeout must
verify each exported `specificationSHA256` against the actual retained frozen
specification bytes and its common `sourceSHA256` against the trusted runner
manifest, then verify payload hashes. The assessment takes its comparison source
hash from the two packets, so this external provenance check remains necessary.
The electrical configuration records absolute VM packet paths; portable replay
also needs a documented path-restoration or relocation mapping while preserving
the exact packet hashes. These are evidence-closeout requirements, not changes
to the frozen physical model or refinement limits.

The new `scientific/resolved-v68/electrical_history.py` independently reconstructs
current, signed torque, Joule heating and electrode work from the potential and
actual source Ω at the initial state and every accepted step. It reuses the
frozen v66 independent integrated-link reconstruction and the frozen v67
trajectory, physical setup, q-overlap and accepted-time validation. It imports
no production code. The gap is that neutral Ω convergence can hide substantial
electrical error; the remedy tests electrical observables directly instead of
changing their physical model or fitting another tolerance.

Each packet must contain exactly one complete case with `initialElectrical`;
each accepted step must export its actual `sourceOmegaRadS`. Configurations bind
both packet raw-byte hashes, a shared source hash, explicit file identities and
one declared refinement axis. Initial data cannot be replaced by the first
accepted state, a partial failed trajectory cannot be scored, and changed
conductivity, electrodes or geometry cannot be relabelled as refinement.

Per-state charge, work, reported powers, cell torque/Joule/residual arrays,
projected torque/Joule and boundary-current multiset are checked at 1e−9
natural electrical scales. Explicit projected checks use their own projected
L1 denominator: large cancelling axial torques cannot hide an error in the
much smaller torque actually supplied to radial gas dynamics. Projected Joule
uses its own dissipative scale, even when the signed mechanical/electrode
exchange is much larger than Joule heating. The
multiset check is deliberate: production and independent link traversals can
enumerate identical physical boundary faces in different orders. The four
terminal comparisons mean signed outward sums on the physical inner, outer,
lower and upper boundary sides. Their denominator sums absolute individual
electrode-face currents, preserving a scale even when net current cancels.

The new prospective shared-time electrical limits are 1% for time and 2% for
each spatial axis. Their fixed whole-trajectory natural denominators are the
maximum of `abs(Pelectrode)+Qjoule+abs(Pmechanical)`, projected torque L1, total
Joule heat and summed absolute electrode-face current across both complete
histories. Compare electrode, Joule and mechanical powers separately; projected
radial torque and Joule profiles use L1 differences and conservative extensive
q-overlap restriction; compare each terminal separately. These are global
signal norms, not pointwise local-relative accuracy. Zero denominators have no
invented floor: zero discrepancy is an exact zero-signal pass, while a positive
discrepancy with zero scale is explicitly unqualified. Fine-only times receive
identity checks and remain outside the refinement comparison.

Nine new regressions are authored for analytic axial Ohmic conduction on all
four axes and adversarial stale/hash/source/physical-input/time/initial-state
and profile failures. They include errors at initial and fine-only times,
identical tiny neutral rotation with corrupted heat or torque, signed cancelling
torque profiles, reported axial-cancellation errors and zero scales. Parent
reports all nine pass in offline safe-dev at source snapshot
`4d28113802de70f2624f3d5146f5e8f22508103e6ae8f255575d2ea62d935631`;
the nine-test raw receipt and log were subsequently independently inspected
and confirmed in the final acceptance above. This reviewer has
executed no project or scientific code. Executables were frozen for the parent
gate. The actual four-axis comparisons and all five coupled audits above are
independently inspected. Passing this proposed matrix qualifies its conditional 1 ms
numerical experiment and observable norms, not all local early responses,
long-time operation, discharge/chemistry closure, experimental first-order
Marathon accuracy or deployed-browser behavior.
