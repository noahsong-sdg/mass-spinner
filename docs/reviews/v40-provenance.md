# v40 independent release and evidence audit

9 November 2026. Read-only review of the current v39 source, checked release,
recorded deployment receipt and scientific qualification claims. No application
changes, deployment, network fetches or project execution were performed by this
reviewer. Trusted host operations read files and recomputed file hashes only.

## Finding: P2 — the linked coverage matrix describes the old Marathon model

**Problem.** `web-assets/CORE-COVERAGE.md:10–12`, identically published as
`release/CORE-COVERAGE.md`, calls target heating an exact bulk solution and says
loading has a fixed stopping matrix with no resolved diffusion or renewal.
This is presented as current coverage through `src/tutorial-insights-ui.js:15`
and `src/blanket-ui.js:56`.

**Technical cause.** The static matrix was not updated when
`setupMarathonModels` made the coupled depth target the main calculation
(`src/marathon-ui.js:25–43`) and moved the bulk and well-mixed models into
references. `src/coupled-target.ts:146–161` explicitly recomputes beam response,
uses temperature-dependent release/diffusion, evolves renewal and solves
depth-resolved conduction. Its assumptions at lines 240–248 distinguish these
conditional coefficients from measured LiT transport.

**Simple explanation.** The help link describes an earlier simulator, so users
cannot reliably tell which current controls affect the target or why results
change.

**Recommended fix.** Rewrite the affected matrix rows to distinguish the live
coupled scenario from retained bulk/well-mixed references; include current
finite-film and H1 reference boundaries without claiming calibration. Add a
content regression that the linked current coverage describes the production
model and labels retained references. Updating this one authoritative map is
preferable to adding more explanatory banners to an already text-heavy UI.
This review did not modify it.

## Acceptance gap: live GPU/mobile behavior is still unverified

`scientific/engineering-v39/deployment/verified-receipt-v39.json:12` explicitly
records `browserVerified: false`. The provider receipt establishes an observed
100% rollout at 2026-11-09 08:06:07 UTC, not a currently rechecked live page.
The v39 viewer regressions use jsdom and an injected renderer. They execute
real Three geometry, state and camera code, but do not exercise shader
compilation, the real WebGL renderer, GPU precision, mobile touch/viewport
behavior or deployed resource loading. Offline Blender proofs are separate.

This is a disclosed limitation, not a newly hidden software defect. It prevents
approving the user's requested deployed end-to-end acceptance. The explicit
browser managed-origin denial also forbids alternate browser/CDP/headless or
origin-fetch workarounds. No such workaround was attempted.

## Fresh integrity checks

Independent trusted-host SHA256 checks on this audit turn found:

- Release: exactly **148 files**, no missing files, hash differences or extra
  members. Canonical sorted-map aggregate
  `36f2fb3920ff74f09b62f3ddcd12c066ad71d44a5b934f5cf35288686df3aae0`
  matches the final manifest and deployment receipt.
- Tested source manifest: **478 entries**. All **476 available canonical
  inputs** match. The two absent entries are the stage-only final-gate runners
  `run-final-gates-v38.py` and `run-final-gates-v39.py`, consistent with the
  recorded staging scheme. Manifest aggregate
  `93ac8c83f541bc95ef3514c2ec3eda0def918ab555d24327b7a1f7902c359efd`.
- Manifest coverage includes all current **110 src**, **151 tests**, **27
  scripts** and **7 blender** files. No source/test omission was found.
- All **88 local Markdown references** in published top-level Markdown files
  resolve to files in the checked release. This is file existence, not browser
  response or Markdown presentation verification.
- The built worker contains the Random123 copyright and redistribution notice;
  the final license receipt identifies its checked module. No credential or
  account configuration was read.

Historical final logs, read again during this review, record **821/821 tests**,
zero failures/skips/cancellations and zero exit status for offline install,
typecheck, build, site check, asset check and both geometry/state exports. These
are historical executions of the byte-matching snapshot, not fresh test runs
by this reviewer. `tsconfig.json` checks TypeScript sources; most UI/rendering
JavaScript is covered by execution tests and bundling rather than strict JS
type checking. `scripts/check-site.mjs:32` correctly states it is not a browser
runtime check.

## Scientific claims remain bounded

The current UI does not inherit a collision qualification certificate from old
archives. `src/main.js:326–330` computes actual-result observable status and
links the explicitly unqualified browser-resolution packet.
`docs/COLLISION-QUALIFICATION-V38.md:134–143` retains **59/60** unresolved-exposure
budget exceedances, **28/60** angular-budget exceedances, **275 PASS / 265
UNKNOWN** numerical decisions and no continuum-bias bound. The checked public
packet reports the same qualification status and counts.

The v17 replay UI (`index.html:84`) also states the failed rate/rotation and
distribution gates, unresolved physical entropy and unqualified WarpX rates;
it does not promote 821 software tests into physics validation. Marathon model
notes (`index.html:77`) explicitly withhold calibration, target lifetime and
full transport claims. These boundaries are appropriate and should remain.

No release-membership, source-drift or hidden qualification-promotion defect was
found in the inspected paths. Full experimental validation, collision continuum
qualification and deployed GPU/mobile acceptance remain open.
