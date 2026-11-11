# Coupled loading, interactive apparatus and minimal UI — v24

## Delivered behavior

Marathon is available as an exploratory playground, not a calibrated machine
or target-lifetime predictor. Its loading calculation now solves competing
fusion and isotope replacement simultaneously. Every illustrated apparatus
loads actual Blender-derived PBR geometry, with orbit/zoom, keyboard camera
controls and component inspection. No static apparatus image substitutes for
failed 3D. Name-only navigation and optional Model info replace repeated
headings, subtitles, introductions and success prose. Controls, plots, units,
errors and approximation warnings remain.

## Root causes and choices

**Loading bias.** The previous execution path applied exact fusion and exact
replacement in sequence at each plotting interval. Mathematically, this was a
first-order Lie split. In ordinary terms, fusion used fuel that competing
replacement should already have removed. Adaptive Dormand–Prince 5(4) now
advances both together in positive log-survival coordinates, with independently
integrated event ledgers. This removes the ordering error without millions of
uniform steps or an unnecessary general implicit solve. Plot density is now a
sampling choice; tolerance controls the adaptive solve. The old `resolution`
record is replaced by explicit `solver` diagnostics.

Independent audits also found zero-dose residuals using a plotting coordinate
as physical dose, excessive initial-transient error allowances from scaling by
the entire exposure, and a one-ULP negative transmission from subtracting large
opaque-limit counts. The fixes use physical zero dose, per-site channel scales,
and an exact complementary transmission integral. They correct the respective
causes without loosening conservation gates or clipping negative results.

**Static apparatus.** Editable Blender meshes existed, but `setupApparatus`
mounted only an image and projected buttons. The wrapper now lazily loads GLBs
through Three.js, raycasts their component IDs and exposes one compact
component dropdown. Actual geometry supplies depth and selectable surfaces;
more image viewpoints would retain the original limitation. Empty beam/plasma
regions remain catalogue entries rather than invented solid parts. The
existing first playground retains its interactive separator GLB.

The exporter also repaired disabled weighted normals and reversed shell
winding. Technically, the source modifiers required Auto Smooth and some face
orders pointed at the wrong side. Simply, lighting was treating inside as
outside. Correcting normals preserves the shape and addresses the cause rather
than compensating with lighting. Independent lifecycle tests additionally
caught hidden asynchronous initialization and missing asset-load retries;
visibility rechecks and the existing loader error callback now handle them.
An on-demand context-restoration render listener avoids an unnecessary loop.

**Repeated text.** Static HTML, the experience refresh function and dynamic
panel producers each repeated context. The changes remove duplication at all
three producers. Scientific scope is retained in native closed disclosures;
real failure/approximation messages stay visible. Component purpose and
material appear after selection, with detailed provenance under Model info.
This preserves the requested flexibility without a wall of default text.

## Independent numerical evidence

- Forty-two SciPy Radau cases; eighteen also checked with DOP853. Reference
  coarse/fine relative fusion difference <=2.692e-12; DOP853/Radau <=1.852e-13.
- 588 production tolerance/output-grid solves, including the UI tolerances
  and tenfold tighter comparisons; dose through 1e7/site, optical depth through
  1000, analytic zero-beam/zero-hazard/zero-replacement limits.
- Historical high-dose case: old 6400-interval bias **6.38%**; current relative
  error **1.401e-11**, using 121 accepted adaptive steps at 20 plot intervals.
- Worst default relative fusion error **1.403e-11**; scaled eight-channel error
  **9.114e-12**; scaled conservation residual **9.097e-12**. All tested histories
  have nonnegative populations and event channels.
- Separate mathematical review checks the transformed equations, event rates,
  numerical tableau, horizon invariance, area/rate scaling and dose scaling.

See `COUPLED-LOADING-V24.md`, `LOADING-INDEPENDENT-V24.md` and
`LOADING-MATH-V24.md`. References, pinned dependencies, raw numerical results
and hashes are retained in `scientific/loading-independent-v24/`.

These results verify the declared reduced equations numerically. Replacement
probability remains assumed; stopping stays composition-frozen. Implantation
profiles, measured LiT retention, diffusion/permeation, sputtering, renewal,
D–D reactions and heat/loading feedback remain outside this model. Initial
steady-source and thermal observers remain separate from evolving loading.

## Graphics and interaction evidence

Eight unique Blender GLBs cover nine model entries, plus the existing first
playground separator. New assets contain 438 hardware mesh nodes; every new
asset is below 2 MB. The official Khronos glTF Validator reports zero errors,
warnings and infos on all eight exports. Actual Three.js GLTFLoader checks
finite geometry, PBR materials, normals, component IDs and bounds. CPU camera,
raycast and injected-renderer tests check mode races, click versus drag,
selection restoration, retry, resource disposal and context-restoration frame
requests. These are not claims of a verified GPU frame or native gesture.

See `BLENDER-MODELS-V24.md`, `GRAPHICS-AUDIT-V24.md`, `MINIMAL-UI-V24.md` and
`DYNAMIC-MINIMAL-V24.md`. Exporter checks and independent validator JSON are in
`scientific/model-assets-v24/`.

## Final application gate and snapshot

All project execution used Apple safe-dev copies, without host home, sockets or
credentials mounted. Downloads were isolated online install steps. Root stage
`/tmp/mass-spinner-playgrounds-v24`, guest `safe-dev-7b493fd770aba18e`, was
explicitly synchronized after edits. The final verifier checked all copied
hashes before and after running:

| Exact check | Result |
| --- | --- |
| `npm test` | 371/371 pass, 0 skipped |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0 |
| `npm run check:site` | exit 0 |

Command: `/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-playgrounds-v24 run -- python3 scripts/verify-levels-v24.py`.
Build retains a large-chunk advisory, without an error. New viewer code is
loaded on demand. The initial merged test attempt caught two obsolete geometry
tests depending on child position and removed prose; their assertions now
locate the live plot and test current error/warning semantics. The failed log
is preserved alongside the final pass.

Final source: **338 files**, map SHA256
`04220be9019cb0db4f77f8e2f1d6e9feff7c2f0f42a894709c1ebbd92d8f6140`.
Frozen solver SHA256:
`ad06d98da87ea8623cbf81c4159f60c6f7b4575ecb2e2a90f8f46d6f1042115d`.
Checked release: **130 files**, aggregate SHA256 of the sorted compact file map:
`82a9cf4e8421c7f985664a96aaf22db2f3c0a8f5088b3e403168c82e0760ce92`.
All canonical input hashes match the actual final guest export. Logs and maps
are retained in `scientific/verification-v24/`.

## Deployment and remaining verification boundary

The exact checked release was copied to the isolated deployment guest
`safe-dev-f5e3965510847418`. Its deployment script checks complete membership
and every release hash before Wrangler 4.158.0 uploads. The previous release is
preserved as `release-before-v24`.

Cloudflare reports version **9214b0ff-9ec3-4dc1-b48d-e17b7f593496** at **100%**,
deployment `3f78fbb1-9801-4fb3-9b6d-5dd718016a11`, created
`2026-11-08T07:17:31.988378Z`. Site:
https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/?level=2

Provider activation and release hashes are verified separately from browser
behavior. Existing explicit managed browser-origin denial remains unresolved.
No alternate browser, local browser clone, CDP, proxy or public-origin fetch
was used to bypass it. Live GPU appearance, native orbit/pan/pinch, mobile
layout and deployed end-to-end browser controls remain unverified. The UI is
implemented and deployed; those visual/runtime observations are not claimed.
