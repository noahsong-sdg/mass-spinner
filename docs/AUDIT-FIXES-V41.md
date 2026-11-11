# v41 audit fixes

9 November 2026. All six actionable findings in [the v40 audit](ADVERSARIAL-AUDIT-V40.md), plus sample highlighting and an adjacent target occlusion, are fixed. Numerical solver equations and scientific acceptance gates are unchanged.

## Inspector visibility

**Problem:** selecting hardware in the basic playground opened an empty inspector and hid selection/reset/focus controls. **Technical cause:** level 1 now uses the apparatus renderer, but its reparented toolbar and description were eligible only in level 3; the alternate inspector was hidden. **Simple cause:** the basic view was using controls still marked advanced-only. **Fix:** allow the existing group at levels 1 and 3. **Why this choice:** reusing the same nodes preserves handlers and state; a duplicate inspector or reverting the renderer would introduce unnecessary behavior changes.

## Component shortcuts

**Problem:** Parameters/Results shortcuts were missing after component selection. **Technical cause:** the handler queried the description under its former ancestor after workspace reparenting. **Simple cause:** it looked in the old location. **Fix:** `setupApparatus` exposes the persistent `readout`, and the main renderer branch uses that reference. **Why this choice:** an owned reference survives reparenting and avoids duplicate content or fragile document-wide selectors. External Marathon and older separator inspectors retain their existing ownership.

## Trajectory picking

**Problem:** an off-pointer trajectory could swallow a hardware click. **Technical cause:** Three's default one-metre line threshold produced a first ray hit with no available inspection action. **Simple cause:** a large invisible region around a thin line intercepted the click. **Fix:** omit non-actionable line intersections from component picking; keep meshes and impact-point actions. **Why this choice:** current trajectories and outlines have no action, so excluding them addresses the actual boundary. A smaller fixed metre threshold would still depend on apparatus scale.

## Camera and target cutaway

**Problem:** the default camera looked at the intact pressure wall instead of the central field. **Technical cause:** a world-space direction did not follow the rotated assembly's local +Y opening. **Simple cause:** it faced the wrong side. **Fix:** transform a local inspection direction with the assembly. **Why this choice:** it preserves SI geometry and opaque materials rather than making all hardware transparent.

An additional actual-camera test at both beam-area extremes found the small target still obscured by its full retaining ring. The film/backing were cut away, but that surrounding ring was not. Its minimum illustrative axial width made the obstruction especially strong at tiny beam area. The ring now uses the same +Y inspection cut as the beam tube. This changes display construction only; numerical film/backing thickness, target area and solver surfaces are unchanged. The original failure and unchanged passing test are retained.

## Reaction scope

**Problem:** the new 3D ledger described a D–T-only rate as generic neutron production. **Technical cause:** the adapter copied the scalar but dropped the solver's reaction metadata and omitted D–D caveat. **Simple cause:** the correct number lost its reaction name. **Fix:** retain stable ID `neutron-rate`, add an explicit D–T label, and carry the existing reaction limitation into the same surface inspector. Missing/unsupported old result metadata is rejected. **Why this choice:** using authoritative solver metadata restores meaning without changing valid numbers or inventing D–D physics. Persisted scenarios store controls, not these result packets, so this introduces no scenario migration.

## Current coverage documentation

**Problem:** the linked coverage matrix described old bulk/well-mixed target models as current. **Technical cause:** its rows were not updated after those models moved into References. **Simple cause:** the help page described an earlier version. **Fix:** distinguish the live conditional coupled-depth model from retained references, finite-film recordings and bounded neutron/H-1 diagnostics. **Why this choice:** correcting the authoritative map is clearer than adding more banners to the playground. Calibration, retention, transport and reaction limitations remain explicit.

## Exact sample selection

**Problem:** selecting a sample dimmed the whole field without identifying the chosen cell. **Technical cause:** the old per-mesh opacity logic read a sample index that now lives in a vertex attribute after batching. **Simple cause:** the display treated the entire batched field as one selected cell. **Fix:** draw a separate neutral outline around the selected raw support and corresponding target microscope cell. Old outlines are disposed on selection, view, pending and teardown transitions. **Why this choice:** the field's RGB values, legend and batched geometry remain unchanged; a new shader or recoloring the data is unnecessary. Explicit box edges also avoid rounding away micrometre dimensions.

## Execution evidence

All project execution used the existing safe-dev VM. The v39 checked source and valuable artifacts were preserved. A separate guest snapshot `/work/home/audit-v41-check-source` received explicit atomic copies of changed files. Before and after every final command, all **481 input hashes** were checked. **479 canonical host inputs** matched; the other two are recorded stage-only runners. Cached locked dependencies were reused inside the guest; no dependency installation or project execution occurred on the host.

- Initial desired-behavior regressions against old production source: **8 failed**, as expected. Original log: `scientific/audit-v41/red.log`.
- Focused integration pass: **44/44**, including old viewer/workspace lifecycle checks and new inspection, picking, scope and selection checks.
- Expanded target visibility initially failed on the retaining ring. Both original failures remain in `scene-expanded.log` and `target-occlusion.log`.
- Corrected geometry/scene pass: **15/15**, including unchanged target visibility and existing numerical-domain geometry invariants.
- Final `npm test`: **831/831 passed**, zero failures, skips or cancellations.
- Final `npm run typecheck`, `npm run build`, `npm run check:site`, `npm run check:assets`: all exited **0**.

The final source aggregate is `4f85060ae4393b8c17ecb616b56cc1be1599162e27820c822a398b0fc7a2a6a4`. All **148** exported release members and individual SHA256 values were rechecked after transfer; release aggregate is `89d7cb3d6c289900641f678318d5c5f3d5f6ccdcd335aae15e1955e66f60ee0d`. Full TAP, command receipts and manifests are under `scientific/audit-v41/final`. The old complete release remains preserved separately.

An independent reviewer traced the implementation, challenged two picking-test weaknesses, and requested depth/microscope and target-camera checks before final acceptance. The strengthened tests require a fresh selection at every scale, use current camera matrices, preserve exact cell bounds/colors, and clear old highlights. See [the independent review](reviews/v41-independent.md).

## Publication and remaining limits

Cloudflare deployment uploaded the hash-checked release as version `893305a3-d0d2-4485-b82c-c0c4bcfa41c4`. A separate provider status read at **9 November 2026, 08:12 Pacific** confirmed that version receives **100% of production traffic**. Before that read, release membership and every digest were checked again. Original logs and the explicit `browserVerified: false` receipt are retained under `scientific/audit-v41/deployment`.

Public site: https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/

These fixes do not qualify collision transport, calibrate LiT retention/chemistry, add D–D reactions or turn illustrative geometry into device CAD. The saved scientific FAIL/UNKNOWN outcomes remain unchanged. Actual deployed GPU appearance, mobile touch/layout and resource loading remain unverified because the browser's managed-origin denial blocks that acceptance gate. No alternate browser/CDP/headless/origin-fetch workaround was attempted. CPU ray, scene and DOM tests are reported as such.
