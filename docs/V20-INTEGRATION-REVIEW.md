# Independent v20 integration review

Source review on 7 November 2026. Reviewed the merged application paths in
`src/main.js`, `component-inspector.js`, `component-catalog.ts`,
`component-inspector.css`, `style.css`, `index.html`, `fusion-ui.js`,
`neutron-geometry.ts`, `neutron-geometry-ui.js`, `research-ui.js` and
`laboratory.js`; inspected the corresponding component, geometry, replay and
existing playground tests. Also compared material wording to
`blender/build_separator.py` and the primary sources recorded in
`MARATHON-DESIGN-REVIEW-V20.md`.

This reviewer ran no project code, tests, full-page browser or GPU operation.
The parent owns the required isolated test/build gate. This is a source review,
not approval of unobserved live rendering or end-to-end browser behavior.

## Findings and disposition

### Geometry plot layout integration — fixed in the reviewed source

**Problem:** the newly introduced sample-reference plot originally used
`className='plots'`, while shared chart layout and SVG width rules target
`.live-plots`. Technically, its generated figure/SVG tree missed the application's
responsive chart selectors. Simply, the new chart would not receive the same
sizing and spacing as the other plots.

**Fix observed:** `neutron-geometry-ui.js` now assigns `live-plots`, and its
collapsible container uses `fusion-model-notes`. This reuses the existing layout
contract instead of adding an unrelated parallel chart style. Browser appearance
remains unobserved. The geometry UI test should preserve these classes in
addition to its numerical/control assertions.

### Compact-target fuel-recovery attribution — fixed in the reviewed source

At the first integration read, the LiT target purpose grouped lithium
deposition, surface regeneration and fuel recovery under the compact source's
published architecture. The reviewed public homepage supports in-situ target
regeneration, but its explicit fuel-recycling description belongs to the
separately introduced future power plant. The beam-driven architecture page
does not itself establish a recovery subsystem or operating performance.

Technically, the catalog combined claims with different system boundaries and
one generic source link. Simply, a visitor could infer a documented compact
target-recovery system that the inspected source did not establish.

The final reread confirmed the target catalog now removes the unsupported
recovery attribution, distinguishes the homepage's regeneration description
from the beam-driven page's LiT material description, and supplies the homepage
as its source. The actual inspector link reads that component-specific URL.
The updated regression asserts that source URL, absence of “fuel recovery”,
LiT wording and unknown substrate/coolant. The existing reminder correctly
states that recycling does not create replacement tritium and that those
dynamics are not solved. This narrows the claim to available evidence without
removing the important target-renewal concept.

## Execution paths checked

### Actual component picking

`main.js` installs inspectors before renderer initialization, then supplies lazy
hardware/camera getters and an explicit mode/readiness predicate. Selection
before mesh load is harmless; the native component buttons still expose text.
The picker converts canvas-relative coordinates to normalized device
coordinates, updates camera and hardware world matrices, and uses Three's real
`Raycaster` against hardware descendants. It excludes invisible parent chains
and selects the nearest visible surface. Trajectory decorations are outside the
pick target. Thus this is implemented geometry picking, not a click-anywhere
component carousel.

Pointer-down/up identity, primary left button, a five-pixel movement threshold,
cancellation and positive canvas dimensions are checked. Orbit drag gestures
that exceed the threshold do not select a part. Inspector selection does not
write solver configuration. Highlighting clones materials and disposes clones
on clear; view changes clear selection before changing hardware opacity.
Selection preserves the existing transparency/depth-write state. The main
loader already clones per-mesh materials, preventing shared-material bleed.

The production pointer-handler test uses an actual Three mesh and raycaster,
with synthetic DOM/pointer events. This is useful evidence, but it does not
exercise native OrbitControls event ordering, actual GLTF loading, touch capture
or GPU rendering.

### Fusion SVG components

Six transparent SVG hotspot rectangles are appended after the illustration,
giving them pointer priority over decorative paths. Their coordinates cover the
source, accelerator, downstream beam segment, target layer, substrate and
neutron region. Native buttons and SVG hotspots call the same selection method;
Enter/Space activate hotspots, while Tab is not trapped. Pressed state is
updated in both controls and the SVG, and descriptions use a polite live region.
The SVG becomes an accessible group rather than an image hiding interactive
descendants. The small-screen frame scrolls horizontally so component targets
are not reduced indefinitely.

The source inspector materials describe the authored separator asset as
illustrative. Fusion descriptions identify D+ and LiT, leave construction alloys
and coolant unspecified, and distinguish a particle stream from solid material.
The LiT target, substrate and neutron rays do not claim material-resolved stopping,
temperature, lifetime or angular transport. The collector description correctly
states that the solver's full end plane differs from the rendered ring apertures.

### Neutron geometry and source coupling

The finite disk reference is mathematically consistent for an isotropic point
source, a circular disk normal to its axis and free flight. With disk radius `a`
and separation `d`, its intercepted fraction is

```
f = (1 - d / sqrt(d*d + a*a)) / 2
```

The code rationalizes this expression to avoid far-field subtraction loss.
Multiplying by neutron production gives crossing rate; division by sample area
gives **mean incident current through the plane**, not scalar neutron flux in
the material. The labels preserve that distinction. The tests compare an
independent radial integral and check hemisphere, zero-source and far-field
limits. The UI's 0.1–3 m distance and 1–100 cm² sample area are distinct from the
beam footprint, and the approximation warning uses the latter's source-size
ratio without changing the geometric result or the fusion source.

`main.js` passes the fusion callback result into the geometry panel. Every valid
beam/target input update propagates its current source rate; a fusion failure
passes `null`, clearing the derived output. Beam-off and zero-tritium cases
produce exactly zero incident current. Changes in sample geometry never feed
back into beam power, target heat, reaction probability or source strength.
The selected sample distance is included exactly in the plotted samples.

The default point-source warning is legitimate: a small distance relative to
the assumed beam spot is outside a good point-source approximation. A small
ratio is expressly not an isotropy/transport validation. No new isotope yield,
damage or dose claim follows from this addition.

### Recorded dynamics and shared plots

Replay loading deduplicates an active request, caches successful results only,
and allows retry after a failed request. Failures clear prior tensor, scale,
time and plot output and disable controls. Native case/time events read exact
saved states; no interpolation or collision solver is dispatched. The packet
remains labeled homogeneous 40/84-u ions and scientifically unqualified.

All six replay vector/tensor components now combine species color with axis
dash style, and shared plot rendering repeats those styles in the legends.
Curves are grouped by axis labels; selected-time markers use the exact saved
sample. Shared charts preserve undefined-value gaps and uncertainty bounds,
provide sample inspection with Arrow/Home/End keys and do not trap Tab.

### Layout and state boundaries

The new Level 1 selectors have sufficient specificity to override the legacy
flex stack on small screens: controls become two columns, with presets,
cutoff/run/status occupying full rows. Desktop controls retain the sidebar.
The mass slider now sits with the other three primary controls. The redundant
long reset row is replaced with a compact reset alongside presets. Level 2
keeps energy/current/footprint primary and collapses target/electrical inputs;
Level 3 gains section navigation without deleting parameter flexibility.

The existing `[hidden]{display:none!important}` rule preserves hidden-control
invariants against explicit flex/grid display styles. Canvas resize ignores
zero-sized hidden levels, and renderer picking/animation are limited to the
relevant level and mode. These are source-level conclusions; native sizing,
focus visibility and plot overflow must still be checked in an authorized live
browser.

## Security and compatibility review

New descriptions, recording labels and readouts use text content rather than
HTML injection. New links are fixed primary-source URLs. The geometry
calculation is local and receives numerical source output; it introduces no
account, credential, server mutation or remote solver. No persistence or
migration schema was changed in these reviewed paths. The supplied JSON replay
packet is a trusted static application asset, not an upload/import feature.

No remaining blocking correctness, security or material-source defect was found
after rereading both fixes. The parent reported 24 narrow integrated tests
passing on the preceding copied snapshot; this reviewer has not independently
executed them or inspected the final full-gate output. The final merged source
must pass that gate before release approval. This is not a penetration test,
broad numerical qualification or live-browser approval.

## Remaining user-requirement gate

“Every playground's controls, plots and visuals end to end” remains open until
the managed browser policy permits the production origin. A full test suite,
real Three raycast unit test, source inspection and provider deployment record
are separate evidence and cannot close native browser/GPU verification. Do not
report all-level visual verification from this review.
