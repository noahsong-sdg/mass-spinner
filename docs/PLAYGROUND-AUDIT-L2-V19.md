# Level 2 adversarial audit, v19

Reviewed 7 November 2026. Independent Level 2 physics, normalization and plot
interpretation audit. Application files were not edited. Frontend replacement
was happening in parallel; findings below apply to the explicitly identified
source snapshot, not to a later replacement or a verified deployed page.

## Findings requiring action

### P2: survival chart exaggerates microscopic attenuation and labels every tick 1

Evidence: `src/fusion-reactor.ts`, surviving-beam curve; `src/laboratory.js:105–113`
automatically bounds every y axis by its data extrema and formats ticks to four
significant figures. Default survival, independently reproduced in the VM, is
`0.9999954259005933`. Its five axis ticks are approximately 0.999995426,
0.999996569, 0.999997713, 0.999998856, 1. Every displayed tick becomes `1`.
The tiny attenuation occupies the entire plot height.

Technical cause: data-dependent y bounds amplify a 4.57 ppm change; tick
precision cannot distinguish that range. In plain terms, a nearly unchanged
beam looks like a large downward trend without legible numbers to correct the
impression. This is reproduced, not an inferred rendering-performance risk.

Small coherent fix: supply explicit [0,1] bounds for a survival-fraction chart,
or plot a clearly labeled lost fraction with scientific ticks. Avoid silently
changing all other chart domains. Recheck both no-reaction and appreciable-loss
cases. A logarithmic loss panel could supplement a fraction chart, but is not
necessary to fix this misleading representation.

### P2 requirement gap: the energy-slider position is absent from the energy scans

Evidence: `src/marathon-lessons.ts:7–10` intentionally overwrites the selected
energy with each scan energy. `:35–37` returns two complete scan curves without
a selected operating point. `src/fusion-ui.js:23–26` renders them unchanged.
Dragging only the beam-energy slider therefore leaves both scan curves
unchanged, while the selected-state readouts change.

This is correct scan mathematics, but poor feedback for the requested visual
parameter playground: the user cannot see where the slider sits on the curves.
Add a current-energy marker, vertical cursor or explicitly identified selected
sample. Do not alter the scan to manufacture a dependence on selected energy.
This is a source-confirmed interaction gap; native pointer behavior and final
replacement graphics were not browser-verified by this auditor.

### P3: zero-current and zero-tritium controls are unavailable

Evidence: `src/fusion-ui.js:9–10` exposes only logarithmic current
10^-5–1 A and target column 10^19–10^25 m^-2. The backend correctly supports
exact zero values, but the playground cannot reach either important limiting
case. No-current is distinct from no-fusion-target: the latter still deposits
beam heat under the independently imposed stopping closure.

An explicit beam-off/target-free toggle or exact-zero option would let users
explore these limits. This is an interaction limitation, not a backend
normalization defect. If beam off is added, show beam/electrical gain as
undefined, and distinguish an efficiency curve's finite marginal yield from an
actual zero-input ratio 0/0. Do not change existing null gain to zero.

## Independently executed checks

Trusted host operations only copied the reviewed reactor source and created a
small audit harness. All scientific execution occurred offline in a distinct
Apple VM via safe-dev; no shared guest, dependency installation, host homes,
credentials, keys, control sockets or browser-policy workarounds were used.

Exact staging: `/tmp/mass-spinner-l2-audit-v19`, two files.

* `fusion-reactor.ts` SHA-256:
  `d675d191b59da2e6875614a8a1b7ba00727c9d2f94a21bb4f704075aa7a5d961`
* Final `audit.mjs` SHA-256:
  `9454262076bb78de1e30f627fa43286f384a30ab7b87f8deeb702c447905af8f`

Commands:

```text
/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-l2-audit-v19 init
/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-l2-audit-v19 run -- node audit.mjs
/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-l2-audit-v19 sync --replace-guest
/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-l2-audit-v19 run -- node audit.mjs
```

The first run established the invariants and the duplicate tick labels. The
second run added reporting of UI-range absolute/relative integration errors.
Both exited 0. No valuable guest edits existed before replacement sync.

The harness executes the actual reactor source using Node's TypeScript strip
API, replacing only its `physics.js` constant import with the reviewed exact SI
value of the elementary charge. This avoids executing unrelated separator
modules. It compares the reactor's 400-cell constant-hazard midpoint method
with an independently formulated 20,000-interval Simpson integral of optical
depth. Both use the existing cross-section function; this independently checks
integration, not the nuclear fit itself.

The 72-corner grid covers laboratory energies 20, 105, 500 keV; loss fractions
0, 0.5, 0.9; columns 0, 10^19, 10^25, 10^30 m^-2; and alpha deposition 0 or 1.
The largest column is deliberately outside the UI as an attenuation stress
case. Additional checks halve area, halve accelerator efficiency and set
current to zero.

Results:

| Check | Result |
| --- | --- |
| Maximum relative energy-ledger residual, all corners | 1.451 × 10^-14 |
| Maximum number-budget residual, all corners | 1.465 × 10^-14 |
| Probability bounds and nonnegative heat/transmitted beam | Pass |
| Conditional assembly heat + escaping alpha + neutron output equals beam + nuclear Q | Pass |
| Maximum absolute probability difference for UI columns | 9.019 × 10^-9 |
| Maximum relative probability difference for nonzero UI-column cases | 5.021 × 10^-6 |
| Area halving leaves source count fixed and doubles heat flux | Pass |
| Efficiency halving doubles accelerator input without changing nuclear output | Pass |
| Zero current retains undefined beam gain | Pass |
| Lowest exit centre-of-mass energy in UI range | 1.2 keV, inside 0.5–550 keV fit |

Worst relative probability difference occurs at 20 keV, 90% imposed loss,
column 10^19 m^-2: Simpson gives 1.1965731498 × 10^-11, reactor gives
1.1965671420 × 10^-11. Across all corners, including the non-UI 10^30 column,
the maximum absolute probability difference is 1.816 × 10^-6. This latter
number is not the UI error and is not a claim of mesh convergence everywhere.
No physical discrepancy is indicated by these differences at teaching-model
precision. Existing test-suite passes were not treated as independent evidence.

## Physics review: no defect found within the stated closure

The following were checked against the actual execution path
`setupFusionLaboratory → simulateFusionBeam → interpretation/scan helper →
renderPlots`:

* Number normalization: for pure D+, incident ions/s is I/e, and each fusion
  produces one neutron. Cumulative probability and surviving fraction sum to 1.
* Kinematics: cold-target CM energy is approximately 0.6 E_lab; the product
  mean energies use the declared mass-number and isotropic-CM approximation.
  Their sum includes nuclear Q plus kinetic energy carried into fusion.
* Slowing heat stops accruing after an ion fuses. Transmitted ions retain
  their prescribed exit energy. Product power is not added on top of an
  already fully deposited incident beam. The numerical budget confirms this.
* Layer heat contains stopping and the assumed deposited-alpha fraction.
  Conditional assembly heat additionally stops the transmitted beam. It is
  separately labeled from incident beam power/area, which is not automatically
  the layer's deposited heat flux.
* Accelerator input is beam input divided by assumed efficiency. RF, vacuum,
  cooling and other auxiliary loads are omitted, and the current source copy
  says so. No net-electrical output is computed.
* The scan's eta times p/E has units neutrons per accelerator joule for the
  pure D+ architecture. Probability and this efficiency metric are different
  objectives. Changing energy also changes the imposed linear stopping law
  when column and fractional loss stay fixed; the visible page explicitly
  identifies this as a toy family rather than one material's optimization.
* Zero imposed loss is supported correctly by the backend. The earlier
  singular presentation equation and blanket cross-section-peak statement
  were fixed in the reviewed source.

## Scope risks, not demonstrated calculation bugs

These remain essential visible boundaries of a playground:

* Current, column, area and fractional loss are independently imposed; the
  model cannot establish physical LiT stopping, beam extraction limits,
  loading, replenishment, phase stability or achievable heat removal.
* The UI can request 1 A at 500 keV over 10^-5 m², an incident beam load of
  5 × 10^10 W/m². This is an exposed toy setting, not evidence that the cooled
  target survives it. No inferred failure threshold should be invented.
* Alpha deposition is an assumed fraction; isotropic-CM mean energy is an
  approximation. The budget's closure is not neutron-spectrum validation.
* Target depletion is omitted, so exposure multiplies a fixed source rate.
  Sample flux, detector response, irradiation damage, isotope production and
  breeding require additional transport/material equations.
* Removing long lessons must preserve short graph-local labels for these
  boundaries, particularly fixed toy stopping, accelerator-only efficiency,
  layer versus conditional assembly heat, and produced rather than detected
  neutrons. A source link alone cannot correct a misleading plot label.

No measured Marathon operating-point, cooling-temperature, lifetime,
net-electric or sample-flux claim was found in the reviewed source snapshot.
No browser/deployment verification was performed by this auditor.

## Source snapshot for frontend findings

```text
src/marathon-lessons.ts c149a7eeb328c87e06ab9cba5fa0ba3167b93be579b5b168154eeafa05b25393
src/fusion-ui.js 71489c55597736ef3b22d09ba15d9057b5243183498652560abb4c13dc9b8cad
src/laboratory.js 3be385f795bfde7bb487818fda1abd27215c26caa48dfce366ab05d764574ce8
index.html c072dc538d6db56fac692d984d694f2bfd2ed2e5aa47458bc3d0e1a01283425e
```

The root agent owns reviewing and testing the final replacement frontend.

## Follow-up: replacement playground source

The later `src/fusion-playground.ts`, replacement `fusion-ui.js`, `index.html`
and shared plot changes were reviewed read-only. All three original findings
are addressed in this source:

* The survival curve declares yDomain [0,1].
* The energy grid includes the exact selected energy, and the renderer marks
  that position and its computed probability/efficiency values.
* Beam-off and tritium-unloaded toggles pass exact zeros to the existing model,
  while preserving slider values for re-enabling.

No new physics/visual blocker was found. The circular footprint uses
sqrt(A/pi) and a fixed 40 cm diameter reference; the largest allowed area fits
inside that reference. The source correctly separates conditional assembly
heat from temperature, neutron direction lines from counts, and current
energy settings from a calibrated beamline geometry. Beam off hides the beam,
footprint fill and neutron rays, gives zero source/heat readouts and preserves
undefined beam gain. The conditional per-ion probability and marginal
accelerator-joule curve can remain finite at zero current; the visible
specific-yield beam-on assumption explains this. Unloading tritium removes
fusion while retaining imposed stopping and substrate beam heat.

One minor follow-up presentation issue was sent to the root agent: with zero
tritium, the probability and accelerator-joule curves contain only zeros.
The generic renderer then selects y in [-1,+1], displaying negative probability
and negative neutrons-per-joule tick values. No computed prediction is
negative. Prefer nonnegative axes with an explicit positive fallback upper
bound for the two zero-valued scan curves. Severity P3; this is not an
energy-accounting or rate defect.

This follow-up was source-only; no new runtime/browser claim is made. The
scientific reactor source remains the exact hash independently executed above.
