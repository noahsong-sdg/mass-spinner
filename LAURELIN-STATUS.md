# Laurelin playground — 2026-11-14

[Open the deployed playground](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/laurelin). Also available through **Advanced → Laurelin** in Mass Spinner.

Interactive WebGL assembly, six selectable component descriptions/material assumptions, ten parameters, pulse playback/scrubbing, three synchronized plot cursors and a separate plasma work/recovery ledger. Geometry and topology are illustrative; the numerical scope and primary sources are in [LAURELIN-MODEL.md](LAURELIN-MODEL.md).

## Second independent audit

The conditional 0D equations received separate analytic, numerical-oracle and
scene/UI reviews. Check08 passed **5/5 independent analytic controls**, **25/25
application regressions**, `npm run typecheck`, `npm run build`,
`npm run check:site` and `npm run check:assets`, offline in 1 GiB safe-dev.
All 21 retained payload hashes and 7 execution logs were independently checked.
Tested source manifest:
`07393420863bf4168287f9eb59419d04072f982a2fff4db789d39ae315987ede`.
Release manifest:
`1a9b370526149a632348b1bcfc91181f7f34299cad7cee9f7ad43e73c13cefe7`.

The reviewer reproduced an ambiguous plot caption: it showed the full-pulse
maximum beside the selected-time readout without labeling the difference.
The new regression failed in check07 (24 others passed); adding **Peak** to
all three captions passes check08. This preserves the existing full-pulse plot
and selected-state behavior with a one-word clarification.

Independent native Brave review observed the WebGL pair, component inspection,
parameter reset and scrollable 390×844 / 390×460 layouts with no horizontal
overflow or captured browser warnings/errors. Those independent observations used the previous deployed build. Root then
verified the new caption on Cloudflare version
`5ca7dbb3-fb7c-4a99-9db6-6a58729e55cc`: all three Peak labels stay fixed as the
selected state changes at 0/20/80 µs, with all plot cursors aligned. Native WebGL
rendered, 390×844 document width remained 390 px, and warning/error capture was
empty. Temporary viewport and timeline changes were reset. Screenshots:
`scientific/laurelin/retained/review2-peak-live.jpg` and `review2-peak-phone.jpg`.

A separate SciPy DOP853/QUADPACK comparison passed its five initial controls,
then failed strict evidence serialization because NumPy comparison decisions
were not native Python booleans. The smallest correction converts decisions
at construction and adds a real-assessment serialization regression; equations,
inputs and gates are unchanged. Original failed evidence/source is preserved.
After the memory guard recovered, the old source reproduced the regression
failure, all six corrected controls passed, and all 16 prespecified comparison
rows passed unchanged gates. Maximum state/energy errors were 8.14e−14 /
4.07e−13; yield error decreased 3.635e−5→2.272e−6 under fourfold refinement.
The independent oracle reviewer verified all 66 exported payload hashes,
source bindings, logs and gate decisions. This is independently authored
DOP853/QUADPACK comparison with root-owned isolated execution, not an
independent machine or experimental measurement.

No new conditional-equation physics bug was established. Missing FRC equilibrium,
axial compression, ion/electron energy, reconnection, burn and recovery-circuit
physics still prevent a Laurelin device-prediction claim.

[Independent physics review](scientific/laurelin/REVIEW-INDEPENDENT-2.md) ·
[Oracle protocol](scientific/laurelin/ORACLE2.md) ·
[Scene review](scientific/laurelin/SCENE-REVIEW-2.md)

## Previously deployed verification

All project execution used offline 1-GiB safe-dev; deployment alone used networking. Final check06 341-input source manifest SHA256: `aa92fcd69261f33f25acc8a6e88aa52dba7079e86dc58a3d39429a5ea472b334`. Final 168-file release manifest: `08b6c95ba15c36c09b0fcd3bfe97f3970823e67347047c910cd79c9e96768490`.

The final snapshot passed:

- `npm exec --offline -- tsx --test --test-concurrency=1 tests/laurelin-camera.test.ts tests/laurelin-physics.test.ts tests/laurelin-workbench.test.ts tests/audit-header-v52.test.ts tests/workspace-v43.test.ts` — **24/24**. Before the domain correction below, the new regression failed and the other 23 passed; that red receipt is preserved as check05.
- `npm run typecheck`, `npm run build`, `npm run check:site`, `npm run check:assets` — exit zero. The pre-existing main-bundle size warning remains.

Cloudflare version `13fe1bf6-40b2-4e36-9743-81aa56d5e4ed` serves the final release. Deployment receipts and earlier failed test witnesses are retained under `scientific/laurelin/retained`; earlier releases were preserved. Tested release hashes were checked before and after upload.

Live Brave verification observed native WebGL, orbit dragging, hardware picking, all ten sliders and Reset, six keyboard component choices, camera reset, playback/completion/pause/restart, and aligned cursors. Compression changed temperature, density and the explicitly labeled beta-one field estimate. Desktop 1440×900 and phone 390×844 were inspected; phone document width remained 390 px. Final browser warning/error capture was empty. Screenshots are retained as `laurelin-desktop.jpg` and `laurelin-phone.jpg` in that evidence directory. This is observed UI verification, not physical validation or exhaustive browser coverage.

The final domain-corrected bundle `/assets/laurelin-D9fXcEHA.js` was reopened on the deployed site. Native slider changes reproduced the reviewer's 550-µs cooling case: the page withheld charged/neutron energy and displayed its fit-range reason. The Advanced navigation link also opened the new playground successfully. Additional screenshots: `laurelin-domain-boundary.jpg`, `laurelin-final-desktop.jpg`.

## Corrections made during verification

**Cropped assembly:** a fixed camera position ignored the hardware bounds, viewport aspect and overlay area. In plain terms, one zoom could not fit every screen. The camera now fits actual assembly bounds with measured overlay padding; portrait orientation is established before OrbitControls caches its up basis. Resizing preserves manual orbit. Geometric fitting was chosen over device-specific zoom constants; three projection regressions cover the boundary.

**Hidden cutaway:** the actual open vessel sector faced away from the default view. Its sector was rotated toward the camera and a ray-intersection regression verifies interior access. This corrects geometry rather than making an opaque wall misleadingly transparent.

**Unwieldy labels:** significant-digit locale formatting still expanded very large numbers. Density and rate labels now use explicit scientific notation above one million. A DOM regression checks the resulting density/rate strings. This keeps the existing plotting implementation and fixes the formatting at its source.

**Missed fit-domain crossing:** midpoint-only admission could report a full-pulse yield when temperature crossed below 0.2 keV after the final midpoint. In plain terms, an integration sample missed an unsupported tail. Admission now checks both existing endpoint samples as well as the midpoint. The exact constant-coefficient thermal solution is monotone within each aligned phase, so endpoints bound the entire interval. This closes the demonstrated gap without extrapolating the fit, clipping temperature or changing the quadrature. The independent reviewer supplied the UI-admissible witness and reviewed the correction; see [LAURELIN-REVIEW.md](LAURELIN-REVIEW.md).

## Qualification boundary

The exact prescribed-volume thermal/work equation and bounded Bosch–Hale D–D diagnostic have analytic and refinement controls. A source-based independent review is separate from those producer-run tests. This is a conditional educational 0D model: no calibrated Laurelin operating point, solved FRC equilibrium, MHD/reconnection/stability, species burn feedback or pulsed-power circuit. Recovery efficiencies are assumptions, and fusion electrical recovery remains unsolved. Passing software checks cannot establish first-order device accuracy.
