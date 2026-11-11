# Adversarial Marathon interaction audit — v22

7 November 2026. Independent source review of the compact-source controls,
plot/display projections, component selection and level navigation. This agent
initially owns this report only. No denied browser origin, alternate browser,
CDP, indirect page fetch or browser rendering of a local clone was used.

## Traced paths and established behavior

`index.html` provides the level navigation, static panel mounts and source
toggles. `experience-ui.js` changes the level, pins the basic spinner settings
when returning to 01, and enters the centrifuge when switching to 03. Marathon
has independent state: changing separator species or fields does not mutate its
source controls.

`setupFusionLaboratory` creates range controls, reads physical values, calls
`simulateFusionBeam`, projects the result through `fusionPlaygroundData`, then
replaces plots/readouts, updates the schematic and calls its downstream
observer. Beam-off returns zero source rate; tritium-unloaded keeps the separate
imposed stopping/heat model while suppressing D–T reactions. The energy scan
contains the exact current setting. Exports serialize the current valid source
result. Source failure clears plots/readouts, disables export and sends `null`
to the existing neutron-geometry observer.

`setupApparatus` creates numbered native image pins plus a full-name native
component list. External beam selection forwards into the shared fusion
inspector; that inspector updates its native list, SVG hotspots and apparatus
pressed states through silent selection synchronization. The preceding v21
render/native/SVG stale-selection defect is corrected in the reviewed code.
At ≤600px the apparatus hides image pins but retains the full-name native list.
The plot renderer supplies focusability and Arrow/Home/End sample inspection;
the current audit does not repeat the obsolete claim that plots lack keyboard
inspection.

These are source facts, not observed browser, touch or assistive-technology
behavior. The v21 retained tests cover source-unit DOM callbacks; they are prior
evidence and do not prove the new v22 layout or target panel.

## Findings and review gates

### P2 — Logarithmic range internals lack a physical accessible value

Current, target column and illuminated area inputs store `log10(value)`, while
their visible output and the solver use `10 ** input.value`. For example the
default current control's native value is `-2`, representing `0.01 A`. The
input supplies no `aria-valuetext`. The visible label includes the physical
output, but it does not replace the range control's value semantics.

Simply, visual users see amperes while the control exposes a logarithmic
internal coordinate. This is a concrete semantic mismatch; actual spoken
output has not been tested in a screen reader.

The smallest fix is to set `aria-valuetext` to the same physical value and unit
when initializing/updating each source range. Keep native keyboard behavior,
numeric bounds and the physics conversion unchanged. Replacing logarithmic
ranges with linear ranges would make orders-of-magnitude exploration worse;
a custom slider would add unnecessary input semantics and maintenance.

Required regression: invoke actual source handlers, checking initial `-2`
maps to an accessible `0.01 A` value, a changed `-1` maps to `0.1 A`, and column/
area expose their own physical units. Verify toggles still preserve their
stored setpoint and beam/target zero limits.

Primary accessibility guidance: [W3C Slider Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/)
specifies a meaningful `aria-valuetext` when a slider's numeric coordinate is
not understandable to its users. Browser/assistive-technology testing remains
a separate gate.

### P2 — Two component lists repeat the same six actions

The apparatus always renders six numbered native choices. Immediately below,
the shared fusion inspector's disclosure renders another six full-name native
choices for the same catalog. The SVG adds a third selection surface when
expanded; its symbolic graphical form has a useful distinct purpose. The two
text lists, however, add redundant navigation and tab stops.

The technical cause is composing two independently complete inspection
widgets; simply, both bring their own menu. Keep the apparatus native list as
the authoritative text selection surface and retain the inspector's actual
function/material/source readout. Hide only the redundant fusion-inspector
list, not 01/03 controls and not mobile apparatus choices. This is a smaller fix
than rebuilding selection state, whose current synchronization already works.

The v22 UI owner applied the scoped
`#fusion-lab #fusion-inspector .component-choices` rule. Final source reread
confirmed the apparatus list remains and the shared 01/03 lists are untouched.

### Integration gate — A target-panel error must remain local

The source observer runs inside `setupFusionLaboratory`'s calculation `try`.
If a downstream observer throws, the source catches it as a beam-calculation
failure and then invokes the observer again with `null`. Existing geometry
handles its own local errors, so no current production failure is established.

The new target observer must catch its own invalid input and clear only its
own outputs. A regression should prove invalid target thermal/scenario input
does not erase an otherwise valid source/geometry result, and invalid source
does invalidate both dependents. This is an adjacent integration requirement,
not justification for speculative catches around every callback.

## Narrow accessibility implementation and duration integration

After the parent assigned this bounded fix, only `src/fusion-ui.js` and the new
`tests/fusion-accessibility-v22.test.ts` were edited, besides this report.
Every range's existing readout callback now sets `aria-valuetext` from the same
physical formatted value and unit. The solver read conversion, native bounds,
step values, off-state behavior and existing numeric calculation are unchanged.

The parent also assigned an optional `exposureHost` argument. It places the
existing exposure control beside the temperature response, preserving exactly
one source input, id, read function and update callback. Calls without the new
argument retain the previous assumption-panel mount. This explicit mount is
smaller and avoids the conflicting state that a second duration slider would
introduce.

The initial two source-unit tests invoke actual production handlers. They check current
and area logarithmic-to-physical values, column units, disabled stored setpoint
retention, invalid-source notification/clearing/export disabling, valid recovery
and exact beam-off/tritium-unloaded source limits. Both passed. The source's
existing `onUpdate` callback contract was not broadened or wrapped speculatively.

Checks ran in isolated Apple guest `safe-dev-9525d7c7f51188f9`, using trusted
minimal source stage `/tmp/mass-spinner-fusion-accessibility-v22`. Its 61-file
source map SHA256 is
`9e5657d482c918e6ebceb0980881ebd6e1841ba7ac99dd868ab72bffa507f949`.
Commands:

```
safe-dev -C /tmp/mass-spinner-fusion-accessibility-v22 init
safe-dev -C /tmp/mass-spinner-fusion-accessibility-v22 run --online -- npm ci --ignore-scripts
safe-dev -C /tmp/mass-spinner-fusion-accessibility-v22 run -- node --import tsx --test tests/fusion-accessibility-v22.test.ts
safe-dev -C /tmp/mass-spinner-fusion-accessibility-v22 run -- npm run typecheck
```

Dependency installation, the two tests and typecheck exited zero. This minimal
snapshot predates the subsequently added target-panel files and static layout;
it does not qualify their merged behavior. No browser/SR observation is claimed.

## V22 layout follow-up

The scoped layout retains the apparatus's native component list and hides only
the redundant fusion-inspector list. The actual description and schematic/pin
selection forwarding remain in place. It also groups the footprint with its
optional schematic and keeps the six primary readouts and energy response
outside that disclosure. Static source, response, target and future-blanket
anchors have actual mount destinations.

One source-order gap was reported to the UI owner: the mobile CSS grid placed
`#fusion-inspector` before controls, although its DOM mount followed controls
and the schematic. Moving that mount directly after `#fusion-apparatus` avoids
a visual/focus-order discrepancy without changing selection handlers. Final
source reread confirmed the owner moved the actual DOM mount: apparatus,
inspector, then controls. The closed schematic remains before nonfocusable
output metrics in DOM but follows them visually; no additional focus-order
failure was established from that placement.

The new thermal observer clears its plots, metrics and export before a
calculation; missing source returns an explicit status, and its local catch
does not rethrow into the source. Its heat-capacity slider also exposes
physical `aria-valuetext`. Bulk/scenario and frozen-yield boundaries are visible.
A stale preexisting source-scope sentence still said target temperature was
not calculated; the parent was notified to distinguish the new conditional
bulk estimate from unmodeled surface temperature and target lifetime.

## Final narrow integrated-handler gate

The final 63-file source map in the same bounded stage/guest has SHA256
`b786b3eaad178f05b5988c785f0273ac4cea010f2d759d99fe890bff42d1f95f`.
It includes the new thermal core/UI and real geometry observer. After explicit
`sync --replace-guest` and a fresh isolated `npm ci --ignore-scripts`, the exact
production-handler file passed **4/4 tests** (160 ms), and `npm run typecheck`
exited zero. Commands were the same narrow test and typecheck listed above.

The additional regression invokes actual source → geometry → thermal callbacks:
initial source success, deliberately out-of-domain local bath temperature
clearing only the target, local recovery, invalid source invalidating both
dependents, valid source recovery, and a 25 s exposure reaching the thermal
response from the same existing input. No source observer threw. The local
invalid input is adversarial injection into the handler; a native range would
constrain that bath value to its declared bounds.

The optional mount regression also verifies there is one duration input in the
provided host and none left in assumptions; its handler updates source exposure
and integrated neutron production together. Default setup calls retain the
previous assumptions host, covered by the other source handler tests.

Required merged test/typecheck/build and permitted
browser verification belong to the parent release gate. No live browser,
assistive-technology, GPU or deployment verification is implied by this report.
