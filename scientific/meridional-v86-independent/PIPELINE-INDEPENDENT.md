# Independent pipeline and qualification review

12 November 2026. Read-only review during the final sealed replay. No project
execution, VM operation or Python edit. Final exported evidence is pending.

## Paths checked

Read complete `run86.py`, `summarize86.py`, `compare86.py`, `panel86.py`,
`replay_fields86.py`, `thermal_reference86.py`, the frozen optical scorer and
the current root report. The optical acceleration's method description was
read, but its mathematical/implementation validation is a separate review.

`run86 final` reruns controls, independent controls, wall reaction, hydro and
the actual FiPy reference before the original audit, panel supplement, optical
comparison and summary. Original audit/panel failure exits are retained while
later evidence is collected. The runner's final nonzero result is not erased
by later software success. Other command failures stop the run explicitly.

`summarize86` gets `allRequiredNumericalPass` from the original failed audit.
Panel failures are separate counts, and cannot set qualification true. The
panel supplement reads the original audit's prediction/source seals and keeps
the failed-original flag false even if every supplemental test passes.
Its per-panel 2x2 integration is exact for squared bilinear interpolation
differences times the cylindrical weight; orders 3/4 are verification checks,
not a changed physical prediction. The supplement is explicitly post hoc.

The comparator checks the complete optical group/alternative inventory and
fixture identities before pairing by full keys. Failed/unavailable groups
remain separately represented. The inherited spectral gate includes flux
capture. All fixed reporting times are retained; no winner timestamp is used
for global qualification. Figures use predeclared edge/temperature/centroid
slices, rather than selecting a slice from best experimental agreement.

## Required distinctions in the final report

- Preserve every original 85 field and 335 quadrature failure if confirmed by
  the final exports. Panel integration is a better diagnostic of the same
  interpolants; it must not rewrite the original frozen acceptance outcome.
- The max-timestep inputs 0.1/0.05/0.025 microseconds are **caps**, not proof of
  corresponding actual timesteps. The parent reports 654/654/655 steps and
  bitwise-identical first two trajectories. Confirm actual sequences from the
  exports. This is an ineffective timestep-refinement contrast, not a
  qualified timestep study or a measured large time-integration error. Further
  accuracy work must decrease the active acoustic CFL or enforce genuinely
  smaller accepted timesteps, under a new protocol.
- Distinguish the initial full-flow attempt from the final source-sealed replay
  after optical acceleration/comparator changes. `replay_fields86` checks all
  26 raw field/history hashes, as well as unchanged physical source files.
  If it passes, numerical optical acceleration did not alter those physical
  fields. Describe fixes as preceding the **final sealed replay**, not all
  earlier scientific work.
- Campaign temperature/Mach maxima come from accepted full-Lie-step endpoints.
  They do not bound intermediate hydro/EM/diffusion temperatures or the
  continuous-time maximum. These already extreme endpoint values suffice to
  expose the physical heating-closure failure.
- First axial cell-center values are used as a symmetric midplane estimate
  in optical input/figures; their observation error needs refinement. They are
  not an independently measured or reconstructed exact wall/axis trace.
- The thermal reference verifies a passive constant-property adiabatic
  eigenmode. Passing it does not qualify strongly heated coupled gas, electron
  energy partition, ionization, radiation or the observed discharge.

## Derived-artifact seal limitation

The summary checks the panel prediction SHA but does not independently verify
its `originalAuditSHA256` or supplemental checker hashes. It also parses
`comparison.json.gz` for figures without checking that file against the
comparison-summary `comparisonSHA256`. The sequential fresh runner should
produce matching files, but summary admission alone does not establish these
bindings under stale/replaced derived artifacts. Final publication review
should explicitly verify those hashes against the exported files and current
checker sources. No stale artifact or wrong final figure is demonstrated here;
this is an admission-coverage limitation, not grounds to change sealed physics.

Final acceptance remains pending actual exported receipts, hashes, plots,
comparison completeness and failed-gate counts. No experimental qualification
is supported by the source review.

## Attempt 02 evidence review

Read-only inspection of the exported JSON, trusted `jq` field/count inspection
and trusted file hashes; no project code or scientific solver was executed.
The interim prediction
`a84ae24f0fc46703bd362684386803906e98940d0392d124ccf448ef76b08104`
and original audit
`a8b1d4ae0fdab77f97d8e71431ccee3d5869840d5ac5168a8ccb6c2dd11aa480`
match the panel's recorded bindings. The inspected checker hashes also match:

| Checker | SHA256 |
|---|---|
| panel86.py | ca787e0ff29615aaf0ab0fe7ed4642ce834ef99fa19b8d668eb140213231e353 |
| test_panel86.py | 11e3b58464d5f57b9ea0ba547b2ce03f33d19e7bb131aca8d6e1b59b09cde00b |
| audit86.py | 448157c40bcc9c1113c43da9112291aad7fcf23ccc75d7e96dc77d137cad3936 |

These are attempt-02 results, not final replay evidence. Current final source,
prediction and audit seals must be independently confirmed after export.

The original audit retains **85 field failures and 335 quadrature failures**.
Exact-panel integration gives **85 field failures again**, with zero panel
quadrature failures; maximum relative integral spread between orders 2/3/4 is
`5.489500584800064e-13`. Better integration resolves the quadrature diagnostic
but removes none of the field failures.

All **64 spatial failures contract** across the declared grids but remain
above the 5% finest-change gate:

| Field | Failures | Finest relative-change range |
|---|---:|---:|
| Density increment |24|20.2455–87.2200%|
| Radial velocity |22|5.2392–11.1027%|
| Axial velocity |12|5.2208–6.4431%|
| Temperature |2|5.32341–5.32344%|
| Temperature increment |4|5.65898–5.71895%|

The **21 timestep failures are noncontraction failures**; none exceeds the
2% change threshold. The largest is **0.420356%** for density increment.
The first two actual timestep sequences are identical, so these small changes
cannot qualify timestep accuracy. They also should not be described as
observed large time errors. An active timestep/CFL refinement remains needed.

`supplementalFixedPanelPass`, `originalAllRequiredNumericalPass` and overall
`allRequiredNumericalPass` all remain false. Final reporting must retain this
distinction rather than extrapolating the interim evidence to a new seal.

## Final export 03 evidence review

Read the completed root report and exported JSON, execution receipts and logs.
Used trusted file hashes, read-only `jq` inspection of stored fields/counts and
heat-budget ratios, and decompression of the four displayed fine-case saved
snapshots. No solver/project code, VM operation or test rerun was performed.

The final prediction SHA is
`70e0923e8ac9a53a476e439a9df3e670fb52467ee9d3d6ab5aa62ad9eae5e5c7`.
The final audit SHA is
`000ff297e48a62536ac118111963266b02e0269f4a103a9d5c9096bf5467d19b`,
matching `panel.originalAuditSHA256`. The comparison packet SHA is
`ca9d4e1e067e4387869e1752ad074877165d66657fae8f6889580d2b5c31ef98`,
matching `comparison-summary.comparisonSHA256`. All 26 current main/standalone
Python source hashes match the final execution receipt; the three panel-checker
hashes match its supplemental receipt. This closes the concrete final-artifact
binding checks that summary admission alone does not enforce.

Fresh final audit/summary evidence retains **85 field and 335 original
quadrature failures**. The panel supplement again has **85 field failures,
zero quadrature failures**, and maximum order-2/3/4 relative integral spread
`5.489500584800064e-13`. The 64 contracting spatial exceedances and 21
inactive-cap/noncontraction failures remain as described above. All original,
supplemental and overall qualification flags remain false. Actual timestep
counts are 654/654/655, and the first two timestep sequences are identical.

The optical summary contains all 2,304 alternatives and no unavailable groups.
Each fixed time has 576 alternatives, zero all-point matches and zero numerical
optical failures. The 84 actual-field Fourier witnesses all passed. Their
receipt deliberately references archived producer prediction `b211cfaf...ae06e`,
not the final source-sealed manifest. The referenced compressed field
`dd4fa46b...d39901` and raw field `2f4b7ef9...a13418` hashes match the final
selected case, while current optical/accelerator source hashes match their
receipt. The separate replay receipt binds all 26 bitwise-identical saved
field/history packets to the final prediction. This is a valid explicit
archived-field provenance chain, not evidence that old-source hashes silently
match current code.

Logs show **48 main + 24 standalone + 3 wall-reaction + 12 hydro = 87 tests
passed**, plus 1,238 application tests, zero application failures. Typecheck
and build receipts/logs pass. All nine actual-FiPy/analytic thermal gates pass.
Final-phase command exits are zero except the two retained scientific audit
exits of 1. The overall runner therefore correctly returns 1. These software
and operator controls do not qualify the failed coupled field convergence.

The four reported fine-grid, 7 cm-anode local temperature maxima match the
stored 4-microsecond snapshot maxima: 594187.7284, 201348.4094, 665033.8070 and
219136.2228 K. Their mass-weighted temperature and meridional RMS values match
the summary and report. These are accepted-split endpoint values, not bounds
on intermediate states or physically qualified plasma temperatures.

### Backward-Euler heat budget

For the eight regular finest-grid cases (both anode positions), the stored
EM-plus-viscous BE defects total **1.287–2.999 microjoules**, compared with
**25.783–38.781 millijoules** of recorded Ohmic heat. Per-case BE/Ohmic ratios
span **0.004936–0.007742%**; BE/electrical-work ratios span
**0.004683–0.007480%**. Thus those BE defects do not dominate the global
recorded energy input. This is a narrow budget conclusion: hydro numerical
mixing/entropy is not included, and small global BE energy does not bound
its concentration or local peak-temperature error. The failed spatial gates
and missing electron/heavy/radiation/wall closure remain independent limits.

No material contradiction or qualification overclaim was found in the final
report. The work supports an implemented conditional coupled backend and a
negative comparison result. It does not establish first-order device accuracy
or identify the unique physical cause of the experimental discrepancy.
