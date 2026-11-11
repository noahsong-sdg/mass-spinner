# Render interaction release verification

Verified 9 November 2026. Candidate: `render50e`.

Production: https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/?level=2

Cloudflare version `d56b2d1a-63c9-4e9b-a24b-9a968f1864f9`, verified at 100%
traffic. The production browser loaded `/assets/index-DWj8MRmr.js`, matching the
exported, checked release. An earlier deployment initially served the previous
entry page despite the provider reporting 100%; version-specific delivery was
correct, and production subsequently served the new build. The precise
provider-side cause was not established. No browser policy was bypassed and no
application fallback was added to conceal this discrepancy.

## Exact tested snapshot

Existing safe-dev VM: `/private/tmp/mass-spinner-marathon-v35-final`.
Guest source: `/work/home/fix-v43-source`.

- 539 manifest entries; SHA-256
  `256043212a03fcd50747b204f3d066a3d88308c8bbd931cc385cb0daafab54bd`.
- 151 release files; aggregate SHA-256
  `d333ff781dca3440eb6f68a9ae3d8a26e4ea31abfa502ea9f7c750136dca673b`.
- Reviewed byte transfer explicitly synchronized host edits into the copied guest.
  Every source digest was verified before and after each final command. Two
  preserved historical guest-only runners were retained in the manifest.
- Deployment used only the checked release in the existing isolated Wrangler VM,
  `/private/tmp/mass-spinner-levels-v18-deploy`; host credentials were not mounted.
- Host operations were bounded file/hash/transfer orchestration; project scripts,
  tests, builds and authenticated deployment ran inside the VMs. Native Brave/CUA
  browser control remained on the host as an editor/control operation.

## Final checks

All eight commands exited 0:

| Command | Result |
|---|---|
| `npm test` | 1,034 passed, 0 failed, 0 skipped |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| `npm run check:site` | Passed |
| `npm run check:assets` | Passed |
| `node --import tsx scientific/fixes-v43/verify-release-worker.mjs` | Bundled worker/provenance checks passed |
| `node --import tsx scripts/verify-fuel-release-v44.mjs` | 144 centrifuge cases, 144 transport cases, 49 map cells; invalid domain/protocol rejected |
| `python3 docs/reviews/v42-collision-data-probe.py` | Saved-data recomputation passed; no new collision simulation or qualification |

Narrow iteration checks covered playback input/position persistence, real Blender
materials, section geometry, current-drive directions, camera framing, plot
location and geometry invariants. Their receipts are under
`scientific/fixes-v43/render50-*`. Final logs, input hashes, exported bytes and
provider status are under `scientific/centrifuge-v44/render50e/` and
`scientific/fixes-v43/v44-final-render50e.*`.

## Live browser evidence

Used the supported CUA Brave extension with native GPU rendering, native pointer
input and read-only DOM observations; no CDP/headless substitute.

- Dragged the dedicated playback grip on production. It moved to x=904,
  y=157.78 on desktop; physical time remained 0.83015 s while paused.
- Checked keyboard movement and independent timeline seeking, persistence across
  reload, and resize clamping. The grip does not own slider/button gestures.
- Checked 390×844 and 320×740 layouts. On the final release at 320 px, page scroll
  width was exactly 320; the dragged panel occupied x=8…312 and y=489.29…648.29,
  above the dock, with physical time still 1 s. Restored the viewport override.
- Checked field-only and combined modes, density/speed legend changes, hardware
  opening/ghost presentation, and the optional circuit. Triangle-area, empty-bore
  and clip-plane correctness are additionally tested numerically.
- Clicked the new supply directly. Inspector showed its name, schematic current
  topology, assumed materials, current and annulus controls. The supply is now on
  the camera-facing side; a raycast regression checks its sightline is clear of
  other opaque hardware, respecting hidden ancestors and shader clipping.
- Set radial current to 0 A through the actual control: accepted ion/gas speeds
  became 0. Restored 0.03 A: accepted spin-up returned. Component framing and plot
  location were exercised; automated integration checks separately establish that
  plot location does not submit a new physics request.
- Checked pinned A/B model loading with shared time/camera conventions. Also
  checked adjacent GPU scenes loading: introductory spinner, beam target, future
  blanket, II.C and double-well II.D. This was a renderer regression check, not an
  exhaustive new sweep of every older playground control or operating regime.
- No console warnings/errors were recorded after the final release timestamp.
  The older build's obsolete PCFSoftShadowMap warning was observed and corrected
  by explicitly selecting the supported PCFShadowMap.

Evidence: `scientific/render50/browser/verification.json`, `desktop.jpg`,
`mobile.jpg`, `component-inspection.jpg`, and `comparison.jpg`. Desktop, mobile and
component screenshots show the final release; comparison was recorded on the
preceding rendering candidate, with unchanged comparison/playback implementation.

## Scientific boundary

This release changes presentation and interaction. It does not change the coupled
rotor/transport backend or resolve previously unqualified collision cases.
Manufacturing details, optical finishes and circuit placement are illustrative.
The circuit supplies conventional current inward from wall anode to inner cathode;
its ratings and electromagnetic boundary conditions are not solved. Diagnostic
sections remain radial and axially uniform. Passing these release checks does not
calibrate the simulator to Marathon hardware.

Root causes, fixes and reasons for the chosen implementations are documented in
`docs/RENDER-INTERACTION-V50.md`. Reading recommendations and project validation
gates are in `docs/MARATHON-READING-AND-PROJECTS.md`.
