# v43 audit repairs and independent re-audit

9 November 2026. Implements the 13 confirmed product findings in [v42](ADVERSARIAL-AUDIT-V42.md), adjacent reproduced defects, and the raw-material retention requirement. Scientific qualification is separate from software acceptance.

## Repair scope and rationale

| v42 finding | Root-cause repair | Regression boundary |
| --- | --- | --- |
| 1: precise thermal-capacity entry edits an exponent | Declare the existing log10/physical-unit contract. Also replace the erroneous `endsWith('K')` temperature inference with explicit temperature fields: heat capacity and conductance units contain K but are not temperatures. | Actual editor → physical solver/export; off-grid 5000, bounds/reset, neighboring conductance and Celsius controls. |
| 2: finest radial grid compares itself | Require a strictly finer supported grid; report unassessed at the existing cap. | Actual main callback makes no solve at 2000; distinct 400→800 and 1000→2000 grids; real equilibria. |
| 3: convergence CLI drops research mode | Forward the parsed execution mode at the dropped argument. | Actual subprocess research and omitted-mode plans retain their executed modes and scientific UNKNOWN. |
| 4: malformed saved diagnostics pass admission | Validate finite exposure in [0,1], nonnegative finite raw norm and nonnegative safe-integer outside count. | Invalid domains and stale JSON shapes remain UNKNOWN; valid measured failures remain FAIL; unchanged budgets. |
| 5: live exports lack producing-code identity | Hash the actual Vite worker dependency graph, locked dependencies and build configuration; bind the worker identity to its accepted result. Apply the same default worker boundary to coupled-target exports. | Actual emitted worker dispatch/hash readback; source/lock mutations; latest-result races; stale export disabled; unidentified legacy results remain null. |
| 6: clicked engineering metadata is hidden | Move the precise apparatus readout into visible Inspect; finish generic synchronization before rendering precise data/actions once. | Real geometry metadata, wrapper/main callbacks, desktop/mobile reparenting, generic selection clears old part data. |
| 7: mobile Research loses species 2 tensor | Shrinkable tracks, mobile stacking and local numerical scrolling. | Real recorded tensors and distribution disclosure; no global overflow. |
| 8: dock obscures surface disclosure | Reserve its measured footprint and bound/scroll the disclosure. | Dock/context changes and narrow/short layout; stale stored layout remains bounded. |
| 9: mechanism identity vanishes | Move the single existing named mechanism chooser into persistent Models context. | Switching retains its listener and selected model with Controls closed. |
| 10: caption describes hidden reference | Publish actual displayed representation/layer from viewer to the existing disclosure. | Loading/reference/accepted/hardware/pending/error transitions; no guessed ready state. |
| 11: accepted machine rolls | Define direction and up consistently; reconstruct OrbitControls when its cached up frame changes. | Actual Three/OrbitControls axial projection, cutaway and keyboard orbit. |
| 12: resize invalidates fitting | Scale camera-target offset by the new/old fit ratio, retaining relative user zoom, orbit and focused target. | Wide→square→portrait bounds before Reset; intentional magnification remains intentional. |
| 13: unused legacy GPU renderer initializes | Initialize once on actual legacy use; reuse pending initialization and clean failed allocation, including PMREM. | Actual main initializer/failure cleanup, no unused factory calls, latest state hydration. |

Additional repairs: the existing main/h1 semantics are restored without extra visible headings. Closed Exposure/Loading references retain dirty inputs and compute the latest snapshot on opening/export; standalone eager behavior remains compatible. The impact-picking candidate was reproduced with a real Three ray behind opaque hardware: intentionally depth-independent dots now draw/pick consistently with deterministic overlap order and the existing four-pixel limit. Ordinary hardware picking is preserved.

Detailed reports explain each defect technically and in plain language, the chosen fix, and rejected alternatives: [controls](reviews/v43-fix-controls.md), [numerical reporting](reviews/v43-fix-numerics.md), [result identity/lifecycle](reviews/v43-fix-identity-renderer.md), [workspace](reviews/v43-fix-workspace.md), [representation](reviews/v43-fix-representation.md), [viewer](reviews/v43-fix-viewer.md). These are coherent review splits; no Git repository or PR is present here. No unrelated framework rewrite or speculative physical closure was introduced.

## Material retention

The original 16-case material campaign is now backed up at `/Users/noahs/Scientific Backups/material-v38-v43-20261109`. All 160 files were independently reread, including 128 original raw output hashes and 5,330,275,010 raw bytes. A separate reducer consumed the backup bytes inside safe-dev and reconstructed partitions, energy accounting, 64 Wilson intervals, eight refinements and public-data translation. The original volume remains preserved and ownership unreleased. [Closure report](reviews/v43-material-retention.md), [receipts](../scientific/audit-v43/material-backup/).

## Verification and independent review

Three independent reviewers cover [physics](reviews/v43-reaudit-physics.md), [architecture/provenance](reviews/v43-reaudit-architecture.md) and [UI](reviews/v43-reaudit-ui.md). Implementation authors are separate from these reviewers.

The first complete candidate passed all seven gates, including **864/864** tests. Its [receipt](../scientific/fixes-v43/final/receipt.json) and [raw logs](../scientific/fixes-v43/final/) remain retained. The governing final snapshot below additionally fixes defects exposed by live verification and independent re-audit.

The tested input map contains 497 entries with aggregate `15f25d8fec054eb3e0d25f4efd2601054fb782c5be3033fb485a02485cdf66b1`; the 495 available canonical inputs match, with only the two declared historical guest-only runners absent from the host. The clean release has exactly 148 files, aggregate `5531ce3c3ec3835fb1c8c3207f376c789cb2f2c470228c8cea6e381c020c8421`. Independent architecture review reread every checked-release byte and all 31 worker producing-source hashes. The emitted `worker-D3YT48CW.js` completed a real orbit dispatch and its metadata matched the tested source. The build retains a large-chunk warning (main bundle 1.33 MB uncompressed); no warning threshold was raised.

The fresh saved-data reducer reproduced all 66 unique terminal cases exactly: 59/60 collisional exposure excesses and 28/60 raw-angular excesses, zero reconstruction differences, and 275 PASS/0 FAIL/265 UNKNOWN comparison decisions. This is reduction of retained trajectories, not a new transport-convergence study. The independent physics reviewer accepted the bounded reporting fixes and preserved the physical qualification limits.

Execution uses the existing offline safe-dev volume and a separate `/work/home/fix-v43-source` copy, preserving the older baseline and native results. Each source transfer verifies complete input hashes before/after execution. A first gate attempt exposed dereferenced dependency executable links in that copy; original links were restored, preserving the failed attempt. A later full suite passed 863/864 and exposed an obsolete test's source-regex boundary; the corrected test executes the current actual observer registration and preserves zero-size camera invariants. Both attempts remain recorded rather than counted as passes.

### Governing final snapshot

Live acceptance found literal `null` heading text caused by querying the heading after detaching its parent. Capturing the existing heading before reparenting fixes the real initialization order and preserves the single main/h1 semantics. The regression checks original node identity and absence of stray text across navigation.

First use of the lazy legacy renderer also revealed clipped hardware when side panels narrowed the stage. Its camera used fixed coordinates, and resize updated only the projection. In plain terms, the old framing ignored the space actually available. The fix measures the loaded hardware bounding sphere and fits the smaller horizontal/vertical field of view. Resizing scales camera offset and limits by the fit ratio, preserving deliberate user orbit, pan and relative zoom. Independent re-audit then caught missing immediate zoom-out headroom when the fitted reset equaled the maximum distance. A fit-relative upper limit and matching far plane fix that boundary. Actual initializer, projected hardware-bound, resize and keyboard regressions exercise these paths, including pressing minus immediately after a narrow first-use reset. This is preferable to arbitrary camera coordinates or resetting user framing on every resize.

All seven final commands exited zero on the same hash-checked offline guest snapshot:

- `npm test`: **865/865**, zero failures.
- `npm run typecheck`
- `npm run build`
- `npm run check:site`
- `npm run check:assets`
- `node --import tsx scientific/fixes-v43/verify-release-worker.mjs`
- `python3 docs/reviews/v42-collision-data-probe.py`

[Final receipt](../scientific/fixes-v43/final-zoom/receipt.json), [raw logs](../scientific/fixes-v43/final-zoom/), [tested input map](../scientific/fixes-v43/final-zoom.inputs.json). Input aggregate: `5d33233f0a960682f6c3308aa5f3bb8a33a864e5cfc301ad2a4af288168b6c48` (497 entries). Clean release aggregate: `02817e4029b3aecc24fed8c09a0a4bcd5ed66f6cd8a18171eef15ee4b8145a28` (148 files). The exact checked release is retained locally in `scientific/fixes-v43/checked-release-zoom.tar`, with paths beneath `release/`; this archive is not a public download. Extract it into a fresh directory to recover the expanded files. The duplicate expanded copy was removed only after complete archive/file hash equality; [cleanup receipt](../scientific/cleanup-v89/cleanup-execution.json). Older candidate artifacts remain preserved separately. These last camera changes do not change the producing worker or physical equations.

### Deployment and live acceptance

Published the exact checked candidate to [Mass Spinner](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/). [Provider readback](../scientific/fixes-v43/provider-verified-zoom.json) reports version `49762a3a-b928-491a-b00a-6ef09739aa15` at 100%. The reopened authorized Brave tab loaded `/assets/index-B8zedRyd.js`, matching the checked release. Browser access worked through the normal extension without weakening policy or changing security settings.

Live verification covered all four playgrounds, all seven Models geometries, controls, accepted/pending plots, component/material picking, physical capacity entry, target-time linkage, captions, surface/dock spacing, and desktop/mobile layouts. Research also passed the 320 px local-scroll check. Final camera-only candidate smoke checks reopened all four, accepted the coupled target, verified its time-linked output, and checked legacy first use, immediate keyboard zoom-out and desktop→mobile resize. [Detailed matrix and candidate attribution](reviews/v43-liveux.md), [browser receipt/evidence hashes](../scientific/fixes-v43/browser-final.json).

Independent physics, architecture/provenance and UI reviewers accepted the bounded final fixes after reopening the relevant source, raw gate logs, hashes and browser images. Architecture independently verified all 495 available canonical inputs and all 148 release members; the two declared historical stage-only runners account for the 497-entry tested map. No remaining confirmed product blocker was found in this scope. The UI reviewer independently inspected the final reset/minus/mobile frames and the coupled target and Research evidence. The temporary browser viewport override was reset and the live site was left open.

Verification limits: mobile checks emulate viewport size in desktop Brave; no physical-phone or 200% zoom audit is claimed. Browser export controls were exercised, but browser-downloaded file readback was not completed. Executed CPU tests cover actual Blob generation and accepted-result provenance, and the real emitted worker was dispatched and identity-checked separately. Warnings/errors captured during the live paths were empty. These limits and scientific failures below remain explicit.

## Scientific limits that remain

Reporting/control fixes do not modify collision trajectories or qualify transport. The retained studies and unchanged budgets must retain their adverse/UNKNOWN outcomes. The offline full-3V entropy/distribution studies also remain distinct from live spatial transport. Conservation success cannot substitute for raw angular-momentum or continuum convergence.

Marathon remains a conditional compact D–T beam–target scenario, not a calibrated complete reactor. Its finite-film retention kernel, evolving lithium-site supply, finite correlated neutron birth source, and reaction-resolved transport/inventory closure remain separate qualification work. Assumed materials and omitted channels remain disclosed. Detailed engineering meshes are SI conceptual geometry, not verified manufacturing drawings.

The cheap energy-sensitivity scan still runs synchronously: deferring its combined source/scan transaction requires a separately reviewed responsibility split. No measured browser latency or VRAM saving is claimed. These research/efficiency extensions are not silently marked repaired by passing product tests.
