# Independent review of the v41 audit fixes

9 November 2026. Read-only implementation review. This reviewer did not edit application code, execute project code, deploy, or operate a browser. Root coordinated copied-source execution inside the existing safe-dev VM. The required implementation/build gates now pass, with independently inspected raw logs and runner evidence. Independent verification of the transferred checked release is also complete. This clears the bounded code changes and checked release artifacts; it does not establish deployed GPU/mobile or physical qualification.

## Reviewed execution paths

- `setupExperience` level 1/3 entry → `setupWorkspace` reparenting/eligibility → `setupApparatus.select` and native component dropdown → persistent `apparatus.readout` → `main.inspectComponent` → Parameters/Results actions and existing control focus.
- Accepted numerical packet → `createSurfaceLayer` SI assembly → viewer fitting/reset → local cutaway inspection direction transformed by the active assembly matrix → actual Three ray intersections.
- Pointer release → visible ray intersections → exclusion of current non-actionable lines → surface sample/event action or hardware component selection. The point-specific projected-pixel check is retained.
- Surface sample change → exact raw support boundaries → a separate selection outline → view/pending/dispose cleanup. Quantitative RGB values and batched field geometry stay unchanged.
- Accepted coupled-target result/history sample → required D–T reaction metadata → stable neutron scalar ID plus explicit label and omitted-reaction limitation → actual surface ledger/Model info.
- Current coupled-target source and assumptions → linked `CORE-COVERAGE.md`, distinguishing the live conditional model from legacy, native-recorded and bounded reference models.

## Correctness and compatibility assessment

No unresolved correctness blocker was found in the inspected production changes. The fixes address the demonstrated boundaries without changing numerical algorithms, solver acceptance thresholds, SI coordinates or material geometry.

The workspace retains the existing DOM objects, rather than creating a second inspector. The main render branch uses the exposed description reference; external Marathon and older separator inspector ownership stay unchanged. New tests exercise native selection after real workspace reparenting and repeated component changes at both relevant levels and mobile/desktop sheet modes. The small main wiring change was reviewed directly; importing the complete GPU-booting main module is not part of those tests.

The camera direction is defined toward the construction's local +Y opening and transformed with the active assembly. `fit` updates the assembly world matrix before initial reset. The new camera test uses the production viewer/reset path and real meshes/raycaster, rather than simply duplicating a direction formula. It covers five cylindrical mechanisms and two lengths. Target and full browser appearance remain separate acceptance questions.

Ignoring display lines without component actions fixes the demonstrated intercepted-click failure at its source. It does not change the material or numerical geometry. Current trajectories and sample outlines have no component ID, while hardware meshes and impact-point actions remain eligible. New picking tests cover three physical scales.

The selection outline uses separate geometry/material and leaves the colormap intact. Only a bounded number of edges is generated for the selected support; whole fields remain batched. Explicit microscope-box edges avoid coordinate-rounding assumptions from generic edge extraction. Old selection resources are disposed before rebuilding, and view/pending/dispose paths clear the outline. No custom GPU shader was added.

The expanded target-camera regression found an adjacent real display obstruction: the full target retaining ring hid a true-depth sample at the smallest beam area because its illustrative minimum construction width extends axially across the tiny film. The recorded original test failed specifically on that ring. Applying the same +Y inspection cutaway used by the beam tube is a coherent display-only correction; target film/backing dimensions, full illuminated area and numerical surface registrations remain unchanged. The test uses the actual viewer reset and accepted coupled-target sample at both beam-area extremes. This reviewer read its successful unchanged post-fix execution in `scientific/audit-v41/geometry-green.log`, together with ten adjacent geometry invariants: 15/15 tests passed.

The neutron scalar retains ID `neutron-rate`, so existing consumers/tests need not change identifiers merely to render a scientific label. Its new optional `label` is populated from accepted D–T metadata, and the existing omitted-reaction limitation travels into the same surface inspector. Missing or unsupported old target metadata is explicitly rejected rather than silently published as generic neutron production. This is an appropriate domain boundary; persisted scenario inputs do not contain these result packets, so no scenario migration is introduced. The existing solver result remains the scope authority.

The coverage update describes conditional diffusion/release/renewal and composition stopping without promoting their coefficients to measured LiT material data. Native finite-film results remain recordings, first-flight neutron diagnostics remain bounded, and generic separator collisions do not acquire the hydrogen-only tracer model.

## Test-strength feedback sent before sign-off

The first multi-scale picking test could have reused a previous successful selection and used a stale camera inverse for its off-pixel assertion. Root corrected it to require a new selection at every scale and explicitly update the camera matrix before projection. These are test-strength corrections, not changes to numerical acceptance gates.

Root added coverage of depth/microscope outlines and cleanup when switching away from fields, in addition to radial sample selection and pending cleanup. The added test checks film temperature, backing temperature and film tritium selection, exact physical support depths, the matching magnified box edges and cleanup when selecting hardware. Exact final gate receipts must determine whether those requested checks passed.

## Security and requirements boundaries

No new network destination, credential access, dynamic code evaluation or untrusted HTML insertion was introduced by the reviewed fixes. Numeric and text readouts continue to use DOM text properties. This is bounded path review, not a comprehensive security audit.

No claim of deployed GPU/mobile verification is approved by this review. The browser origin remains explicitly policy-blocked; no alternate browser, headless runner, CDP or origin-fetch workaround was attempted. CPU geometry/jsdom checks do not establish shader behavior, touch ergonomics or real deployed resource loading.

Collision continuum qualification and experimental Marathon/LiT calibration remain open. The interface fixes must not be described as resolving the saved angular-error/exposure failures, UNKNOWN convergence decisions, omitted D–D physics or uncalibrated retention assumptions.

## Execution evidence and disposition

The reviewer has inspected source, test intent and retained root-run logs. `scientific/audit-v41/green-1.log` records 44/44 passing scoped integration/adjacent tests on its explicit 481-input synchronized snapshot. The later `geometry-green.log` records 15/15 passing geometry and expanded scene tests, including true-depth target visibility at both beam-area extremes. The preceding `scene-expanded.log` and `target-occlusion.log` retain the actual target obstruction failure rather than rewriting it as a pass.

This reviewer subsequently read `scientific/audit-v41/final-console.log` and the final runner. They record **831/831 passing tests**, zero failures/skips/cancellations, plus exit zero for `npm run typecheck`, `npm run build`, `npm run check:site` and `npm run check:assets`. The runner checks the expected source hashes before and after every command, writes individual raw logs and does not relax a gate. The build retains its non-fatal large-chunk warning; no browser runtime result is implied by bundling or parse checks.

An independent trusted-host file-hash check found **479 available canonical inputs matching all expected digests**, zero mismatches, against the 481-entry manifest. The two absent canonical paths are the known stage-only older gate runners. The source aggregate independently reproduces `4f85060ae4393b8c17ecb616b56cc1be1599162e27820c822a398b0fc7a2a6a4`.

After export, this reviewer independently hashed the canonical release against `scientific/audit-v41/final/release-sha256-v41.json`. All **148 members** match their individual expected digests, with no missing files, extras or mismatches. The aggregate independently reproduces `89d7cb3d6c289900641f678318d5c5f3d5f6ccdcd335aae15e1955e66f60ee0d`.

The transferred final command receipts and all five raw gate logs were read. The full raw TAP contains **831 successful test records**, zero `not ok`, SKIP or TODO records, consistent with its final summary. Raw typecheck, build, site and asset logs match the recorded zero exits. The original failed desired-behavior and target-obstruction logs remain retained separately. Root's separate provider verification receipt was also read: it records version `893305a3-d0d2-4485-b82c-c0c4bcfa41c4` at 100% traffic at `2026-11-09T16:12:24.473370+00:00`, with the same checked release aggregate and explicit `browserVerified: false`. This reviewer did not issue deployment calls or independently query provider rollout state.

There is no remaining source-review or checked-artifact-transfer blocker for these fixes. Required build/typecheck/test evidence has passed for the synchronized snapshot. Approval is limited to the demonstrated software behavior and the hash-verified release artifacts. Live browser acceptance and scientific collision qualification remain open as stated above.
