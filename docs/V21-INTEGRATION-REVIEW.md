# Independent v21 source integration review

7 November 2026. This reviewer owns this report only. Runtime source, scene
recipes, tests and public scientific sources were read; no project code or
tests were executed by this reviewer. The parent's completed VM gate logs and
exact tested source were independently inspected for this final disposition.
No denied browser origin,
alternate browser or indirect origin fetch was used.

## Scope and traced paths

Reviewed `apparatus-ui.js`, `apparatus.css`, `tutorial-insights.ts`,
`tutorial-insights-ui.js`, `blanket-reference.ts`, `blanket-ui.js`, and changes
in `main.js`, `index.html`, component inspection and viewport presentation.
Read `blender/build_playgrounds.py` and the corresponding apparatus, tutorial
and blanket tests. The user-provided isolation rules and safe-dev README apply;
this review did not create or sync the parent's VM staging directory.

### Mode and level changes

`selectMode` updates solver-specific controls, captions, result visibility,
apparatus and insight content, then invalidates prior results and schedules the
existing live calculation. The render is a static apparatus illustration;
sliders still update the original numerical paths and live plots. The mode
insights declare what each observable means and what the corresponding solver
omits. They do not turn reference-only mechanisms into implemented solvers.

Level 1 still pins its 40-u source species, source distribution and timestep
when entered and explicitly switches back to the live orbit view. Level 3
defaults to centrifuge and its apparatus render; rotating and ICR retain live
assembly/orbit/field alternatives. The `render` view hides canvas, poster and
loading state through `sceneVisibility`, rather than showing a still render
as proof of renderer readiness. Non-orbital model views keep their diagnostics
separate from the apparatus. The diagram never embeds calculated plasma
density, fields or particle paths.

The final source pass also checked the explicit apparatus argument to
`rendererPresentation`: its default preserves the previous four-argument
behavior, while a selected apparatus hides every live surface regardless of
GPU startup/failure state. The animation callback skips a hidden canvas, so
viewing a static render no longer draws concealed GPU frames. Returning to a
live view uses the same visibility path, and the stage ResizeObserver remains
responsible for the changed canvas dimensions. The associated regression is
included in the parent's passing final test gate, whose logs were reviewed.

### Component selection and rendering contract

The apparatus uses the host's document, a fixed 16:9 frame and normal native
buttons. Image pins use normalized Blender camera projections; frame image
dimensions and `object-fit:contain` preserve their coordinate interpretation
when the source is 16:9. Every projected pin must have a known component ID.
The unprojected component-button list is a useful alternative where labels
crowd or overlap. Component descriptions use text content, not HTML parsing.

Model apparatus components state that construction materials are unspecified
and steel/copper/ceramic appearances are illustrative. The beamline render
uses the existing LiT/D+ catalog; the blanket must receive its separate catalog.
Same-looking metals are not treated as verified company construction choices.

The Blender recipe records optical finishes and exaggerated LiT thickness as
illustrative. A shared double-well hardware image is legitimate for the
landscape and collisional variants because the solver distinction belongs in
the diagnostics and qualification notes, not in an invented physical machine.

## Findings raised during integration

### 1. Blanket material catalog was not connected — corrected

Initially `setupApparatus(blanketHost).show('blanket')` used the default
`modelComponents('blanket')`, which returns no records. Therefore projected
blanket pins would all be skipped, and no materials could be inspected.
Simply, the drawing and its descriptions existed but had not been connected.

The current `main.js` imports `blanketComponents` and passes it explicitly.
The apparatus test now exercises that concrete option and checks the FLiBe
description remains separate from the LiT beamline. This is preferable to
expanding the separator catalog into a mixed catalog with accidental defaults.

### 2. Lithium preset boundary existed only in an exported string — corrected

Initially the crucial explanatory string was tested but never rendered. Users
could see “Li-6/Li-7” without seeing that it means equal on-axis fractions and
an equilibrium calculation rather than natural-feed enrichment or a Marathon
reconstruction.

The current context panel imports and renders the boundary for centrifuge;
the parent also added preset accessibility/immediate-status wording. The
rendered-panel regression now checks the explanation. This preserves the
existing physics while making the actual scenario visible.

The preset chooses the common-corotation branch with 6/7-u singly charged
species, central composition 50/50, 30000 rad/s and 1-eV ion temperature. The
equal-charge ratio law depends on the mass difference:

```
ln[(n7/n6)/(n7,axis/n6,axis)] = (m7-m6) Omega^2 r^2 / (2 e Ti[eV])
```

It partitions a static equilibrium; it predicts neither continuous feed nor
extracted product. No kernel mass boundary or convergence tolerance was relaxed.
The advanced mass inputs now permit low masses, so switching to orbital modes
can fail the existing gyro-resolution guard. That is an honest model boundary;
the available orbit timestep choices do not support every low-mass/high-field
corner. Do not silently change time resolution or relax the guard to make a
preset appear universally supported.

### 3. Outer structural wall missing from blanket render — corrected

The initial scene had W armor, one V-alloy shell, Hg/Li, FLiBe and tank. The
paper's model places separate V–4Cr–4Ti structural layers on both sides of the
multiplier channel, and the inspector already described both. Simply, the
text described a physical layer absent from the drawing.

The final recipe explicitly includes `Outer V4Cr4Ti structure` between the
Hg/Li channel and FLiBe. The full-size exported blanket image shows separate
dark structural layers on both sides of the inner channel, and its caption
declares both layers. Frozen paper TBR/yield remain unchanged: repairing an
illustrative layer is not a new neutron-transport calculation.

### 4. Render pin and native/SVG inspector selection can diverge — corrected

The fusion render maintained its own pressed pin/list state and forwarded clicks
to `inspectors.fusion`. Native inspector/SVG changes initially updated their own
shared state, but did not notify the render. Thus selecting LiT in the render
and then substrate in the native inspector can leave a LiT pin pressed while
the description and SVG indicate substrate.

The root cause was separate representations of one selected component. The
current shared fusion inspector now calls `onFusionSelect`; the apparatus
responds through `syncSelection`, which updates its pressed states without
calling the shared inspector again. This keeps one selection authority and
avoids recursive callbacks. Invalid component IDs return before notifications.
The callback cannot fire during setup, so the later assignment of the apparatus
reference is safe; optional chaining also expresses the setup boundary.

The new alternating render→native→SVG test checks the actual production setup
and pressed state changes. This narrow notification is preferable to duplicating
material descriptions or introducing a broad event abstraction. Its test result
passed in the parent's final gate, not independently executed here.

### 5. Long floating pin labels crowd the blanket cut face — corrected in source

The final projected plasma and structure centers differ by only 4.82% of image
width and 3.35% of image height. In a 900-pixel-wide 16:9 frame this is about
43 by 17 pixels, while the current padded text buttons are substantially wider
and about 24 pixels tall. Their labels consequently overlapped; a phone frame
reduces center spacing further. This is a source/geometry-derived layout issue,
not a claim of native browser verification. The alternate component list keeps
all descriptions reachable, but the image's floating labels remain crowded.

The cause is using a projected physical point as the center of a variable-width
label without collision handling. The current source uses fixed 24-pixel
numbered markers with full `aria-label`/title text and matching numbered
native component buttons. At viewport widths of 600 pixels or less the image
markers are hidden, retaining full-name native buttons with 32-pixel minimum
height. This removes variable-width overlap without inventing new projection
coordinates or leader-line layout. The test asserts actual marker text,
accessible name and corresponding native choice. It passed in the final
integration gate; native rendering remains unverified.

## Blanket science and provenance

The proposed future blanket remains a separate optional explorer. Its published
1500-MWth reference case, 210-mm channel, elemental Hg fraction, isotope
enrichments, TBR and static/depletion Au totals are constants. No beam-target
output enters the explorer, and the optical-depth or decay controls do not
recalculate those published values.

The normalized shutdown-batch model treats initial ground/metastable Hg-197
fractions as assumed inputs. Its two-parent Bateman solution includes both
isomeric feeding of ground-state Hg and direct decay to Au. The code preserves
the distinction between an initially specified inventory, neutron-produced
yield and usable extracted product. A separate Au-195 impurity curve is
normalized to its own initial amount; it does not claim the modeled batch's
purity, release time or dose. Analytic atom balance is not activation/depletion
validation. The optical-depth reference correctly uses
`eta = 1-exp(-tau)` and `Xi = eta/tau`, with the continuous zero-depth limit.
It does not model competing neutron reactions, multiplication or TBR.

The primary references support the scope separation: the
[alchemy paper](https://www.marathonfusion.com/alchemy.pdf), §4.1, describes
the representative OpenMC blanket geometry and materials; the later
[isotope-systems paper](https://arxiv.org/html/2512.09242v2) discusses capture,
inventory, wall-loading and economic tradeoffs. These are proposed power-plant
studies, not a calibration of the compact solid-LiT source.

The tutorial context preserves the distinction between `m/Z` sensitivity,
thermal/velocity assumptions, drift and finite-flight effects, equilibrium
inventory, individual fixed-momentum landscapes and exploratory collisional
transport. Its generic charge/neutral/field/output boundaries are explanations
and diagnostics; they are not newly solved collective effects. The
[tutorial](https://w3.pppl.gov/~fisch/fischpapers/2018/Zweben_PMF_POP18.pdf)
itself separates these mechanism ideas from the generic physics and technology
issues required for practical performance.

## Release gate and remaining evidence

The final canonical manifest has nine mode entries and eight unique images,
using the declared shared double-well alias. All 46 projected points have IDs
in the corresponding separator, compact-source or blanket catalog and finite
in-bounds coordinates. The exported verification records 1600×900 PNG/WebP
decoding and editable Blender headers. This reviewer independently hashed all
16 canonical image files and the recipe: every hash matches the producer's
verification record. The recipe SHA256 is
`3f162732fe9c5e5567567eecf0796be3fb9f3b07eb997eeaa3b703588da4c5a2`.

The eight-image contact sheet and full-size corrected gyro/blanket PNGs were
opened by this reviewer. The gyro source is transverse to the axial-field
geometry and its segmented collectors lie in the gyro plane. The blanket shows
the corrected material sequence. No baked plasma, beam or neutron glow creates
a false source-on signal. These are apparatus illustrations, not calculated
particle paths or proprietary CAD. The apparatus and static-site tests passed
against these actual exported assets in the parent's final gate.

The reviewer subsequently read the actual retained VM `test.log`,
`typecheck.log`, `build.log`, `site.log` and command exit records in
`scientific/verification-v21`. Results: `npm test` **304/304 PASS**, including
the changed apparatus, selection, blanket, tutorial and viewport regressions;
`npm run typecheck`, `npm run build` and `npm run check:site` each exited **0**.
The build retains its disclosed large-chunk advisory. The site check explicitly
states that it is not a browser runtime check.

The tested source map has **299 inputs**, SHA256
`1a2a6c6ee29024c402d3a83daaf016e8883abac0238546949caf5d92e2d10ae3`.
Its bytes match the actual final export at
`/tmp/mass-spinner-playgrounds-v21-final-export/verification-v21`.
Trusted file comparisons show the canonical `src`/`tests` trees, `index.html`
and render manifest match both the retained exact source copy and actual final
export; therefore the reviewed fixes are in the checked snapshot. The retained
test log, command records and **117-file release hash map** also match that
actual export. This is independent inspection of another agent's executed
evidence, not a second execution of the project tests.

All five source/asset findings above have a reviewed correction. No further
correctness, security, material-provenance or physics-scope blocker was found
in these changed execution paths. This is source review plus authored-asset
inspection, not independent execution approval.

Native browser rendering, touch picking, camera behavior and
all-level visual verification remain unobserved under the managed origin
denial. Local Blender image inspection and source-unit tests are legitimate
separate evidence, not closure of that browser gate. The required source/build
integration gate is now satisfied and no source-level release blocker remains.
Deployed browser acceptance and experimental/scientific qualification remain
outside that disposition.
