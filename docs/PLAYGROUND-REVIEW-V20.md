# Playground controls, components and Marathon review — v20

7 November 2026. The user requested live browser verification, cleaner navigation,
clickable component descriptions and an independent Marathon design review.
Source changes and validation below are distinct from the blocked browser gate.

## Changes and root causes

| Problem | Technical cause; plain explanation | Fix and why this scope was chosen |
| --- | --- | --- |
| Basic controls form a long narrow-screen stack | A later `.controls{display:flex}` overrides the earlier two-column media rule. The compact layout cancels itself. | A level-1-specific grid groups the same four controls, presets/reset and compact cutoff/action rows. Existing IDs, event handlers and numerical bounds remain, avoiding duplicated control state. The screenshot alone does not establish its CSS-pixel viewport or zoom. |
| Apparatus has no component identity interaction | Meshes and SVG were presentation-only; there was no metadata/selection path. Clicking could only operate the camera. | Real Three raycasting and six SVG hotspots use a small shared catalog, with an equivalent native-button interface. Drag/cancel/mode guards distinguish inspection from camera gestures. Disposable cloned highlights preserve original materials. This keeps inspection independent of scientific state and usable without GPU picking. |
| Material colors can look like an authoritative bill of materials | Blender material names are artistic assignments; Marathon leaves several construction materials unspecified. A metal appearance cannot establish an alloy. | Separator descriptions explicitly identify illustrative choices. Marathon D₂/D⁺ and LiT have public-source descriptions; substrate, coolant and electrode alloys remain unspecified. End collectors correctly use the asset's steel appearance, not the unrelated molybdenum-finish variable name. |
| Target renewal copy crossed a source boundary | A draft grouped fuel recovery with compact-source regeneration, although the explicit recycling description belongs to a separate future plant. The sources described different systems. | Removed the unsupported compact recovery attribution; target regeneration links to the homepage and LiT material points to the beam-driven architecture. The actual inspector regression checks provenance and wording. Narrowing the claim is preferable to inventing hardware or performance. |
| Neutron birth rate does not describe sample irradiation | The original model stops at production rate, without source-to-sample geometry. A neutron born is not necessarily one reaching a sample. | An optional collapsed finite-disk reference computes crossing rate and mean plane current from a one-way source callback. It assumes an isotropic point source and free flight, warns about finite source size and explicitly omits angular transport, attenuation and isotope response. This is an analytically testable reference rather than an invented calibrated irradiation model. |
| New geometry plot initially missed responsive styles | Its initial `plots` class did not match shared `.live-plots` chart rules. The plot missed normal sizing. | Uses `live-plots` and `fusion-model-notes`; actual UI-tree regressions preserve the shared layout contract. No parallel chart system added. |
| Recording loading cannot recover | A cached promise remains non-null even when the viewer returned null. The app remembers failure as completed initialization. | Cache successful viewers only, deduplicate one active request, clear stale tensors/time/scale, expose an explicit retry and hide it after success. This fixes the cache lifecycle without silent retry traffic or duplicate event listeners. |
| Six replay components have ambiguous lines | The shared renderer cycles four solid colors for six curves. Distinct values look identical. | Species color plus component dash creates six identities, repeated in legend swatches. Exact recorded values and sample inspection remain unchanged. |
| Inspector increases bundle size unnecessarily | Passing the entire Three namespace through an object makes every export observable to the bundler. Unused graphics features are retained. | Pass only `Raycaster` and `Vector2`; picking tests exercise that minimal boundary. This preserves real picking without paying for unrelated exports or replacing the renderer. The intermediate passing build and source snapshot are retained separately. |

Navigation is shorter. Playground 02 exposes beam energy/current/footprint first;
target/electrical assumptions start collapsed. Playground 03 gains section links
without removing its controls, plots, mechanism notes or numerical warnings.
No separator or beam-target physics kernel, recorded data or qualification
threshold was changed by these UI corrections.

## Independent reviews

- [Marathon design/literature](MARATHON-DESIGN-REVIEW-V20.md): primary-source boundaries, equations and data/validation gates.
- [Adversarial Marathon review](MARATHON-ADVERSARIAL-V20.md): independently ranked omissions; finite-disk implementation and numerical/UI checks.
- [All-level controls audit](CONTROLS-AUDIT-V20.md): execution-path trace and complete native-browser acceptance matrix; independently tested replay recovery/styles.
- [Layout trace](LAYOUT-V20.md): CSS cause, preserved contracts and focused layout changes.
- [Final integration review](V20-INTEGRATION-REVIEW.md): independent source/security/material audit and correction of two integration findings.

The component reviewer additionally parsed every exported GLB mesh and tested
production picking with a real Three raycaster in its own Apple VM. Independent
narrow checks: component 4/4; replay 4/4; geometry 5/5 plus typecheck. A parent
intermediate merged run passed 24/24 before the final provenance and chart-class
regressions. These are mathematical/source-unit checks, not a browser emulator
or GPU test. Exact final integrated evidence is recorded separately below.

## Important Marathon work still required

The two primary-source reviewers agree on three major realism gaps:

1. Couple measured LiT composition/depth and deuteron stopping, rather than the current independent column/fractional-slowing inputs.
2. Evolve target temperature, tritium loading and in-situ regeneration using sourced thermal/material/loss laws and measured operating points.
3. Resolve neutron angular/energy transport and sample response before predicting actual flux, activation, isotope yield, damage or dose.

The geometry reference begins the third concept; it does not close that gate.
The material inspector explains target renewal; no lifetime or renewal dynamics
are claimed. Marathon's [compact architecture](https://www.marathonfusion.com/beam-driven-fusion/)
and [target-regeneration description](https://www.marathonfusion.com/) are
distinct from its [alchemy paper](https://www.marathonfusion.com/alchemy.pdf),
which models a future ARC-like fusion-power-plant blanket using OpenMC.
That paper's W, V–4Cr–4Ti, Eurofer97, Hg/Li and FLiBe choices are not assigned to
the compact source. Arbitrary thermal or stopping coefficients were not added
to make the app look more realistic.

## Browser gate

The fresh browser inventory succeeds, but binding the user's exact open tab
fails at the managed origin-authority gate before page observation. The local
origin is allowed and the user freshly confirms the UI allowance. There is no
new approval or exposed effective-policy source to apply. The supported
diagnosis and exact error are in [the browser packet](BROWSER-VERIFICATION-V20.md).
The available tools cannot repair or override that denial. No alternate browser,
CDP, local clone rendering or indirect public-origin request was used.

Native all-level controls, focus, downloads, responsive visuals and actual GPU
appearance therefore remain **unverified**. Publication and source tests cannot
close this user requirement. Existing collision convergence failures remain
visible and scientifically unqualified.

## Final gate and publication

The final merged gate passed **289 tests**, typecheck, build and static-site
checks in the Apple VM. Exact 271-file map SHA256:
`18472be63d64d628e8c8d1518e21bca70d96d19ae6eba61f65de4ddd569bb5e6`.
All source/input hashes match the host and actual final guest export. All 99
release files match exact membership and hashes; the corrected main bundle is
1,058.56 kB / 296.59 kB gzip. The intermediate namespace-escape build was
1,327.55 kB / 371.53 kB gzip. Existing large-renderer-chunk warning remains.

Cloudflare published version `c1e8a2a7-71ce-40c6-82be-75890a203388`, uploading
three changed assets and reusing 96. A separate authenticated deployment-list
request confirms it as latest at 100%. All 99 files in the actual deployment
export match the final tested build. Only reviewed static output was uploaded.
This is publication evidence, not browser-runtime evidence.

[Exact commands, snapshots, logs and provider records](../scientific/verification-v20/README.md).
