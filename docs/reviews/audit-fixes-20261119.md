# Audit fixes — 19 November 2026

Follow-up to [F1–F7](full-audit-20261119.md). The numerical solvers and their
scientific qualification gates are unchanged. These changes repair display,
interaction, release and development paths; they add no experimental validation.

## Changes and reasons

| Finding | Cause | Fix and choice |
|---|---|---|
| F1: plots disagree between accepted times | The scene reconstructs conserved state; the plot interpolated derived values such as kinetic energy. Averaging answers is different from calculating an answer from averaged momentum and inventory. | Coupled time curves use the same canonical sampler for their revealed endpoint and readout. Accepted knots, undefined values and right-continuous events remain intact. Reusing the physical sampler fixes the disagreement without replacing a correct integrator. |
| F2: tutorial actions disappear or falsely report success | A one-way message had no readiness or execution acknowledgement; reload erased the authorized window and pending observer. The reader could not tell whether anything happened. | Explicit authorized-peer capability, bounded readiness handshake and executed/rejected/waiting outcomes. A document-instance change interrupts an ambiguous request instead of replaying it. Exact-origin, known-peer and action-allowlist boundaries remain. This repairs the existing bridge without a generic message bus, permission expansion or action-delay sleeps. |
| F3: recalculation resets the camera | Pending input disposed the accepted hardware and geometry key, forcing reference and acceptance fits. A new current forgot the viewpoint despite identical hardware. | Pending withholds quantitative surfaces and samples while preserving accepted hardware. Changed geometry still rebuilds and fits; invalid/null states clear resources. Retaining the existing object fixes ownership without retaining stale numerical colors. |
| F4: collection results require decoding | Internal property names and unitless fractions reached legends/readouts. A reader had to translate both names and units. | Descriptive labels and percentages in both equilibrium and transient collection plots. Empty-cut/pure-feed undefined values remain undefined. The cut branches share presentation; the correct inventory formulas and denominators are unchanged. |
| F5: playback rescans accepted histories | Each motion/trail sample recomputed the same speed bound; comparison frames rescanned histories and reapplied color domains. Work repeated even though neither run had changed. | Renderer-owned speed bounds and acceptance/pin/clear-owned comparison ranges. Public pure helpers still observe mutable inputs. Lifetime ownership avoids a global cache and its stale-result hazards. CPU measurements and their limits are recorded separately below. |
| F6: the third deployment can drop old lazy chunks | The previous original candidate omitted chunks retained during its deployment. Rollback also applied current feature tests to older UI. | Carry forward digest-verified prepared releases; regress A→B→C and rollback. Current tooling admits the selected source/lock-bound Verify artifact. Postdeployment verifies every served byte and a stable health contract, rather than requiring newer features in an older release. Pinned bootstrap handles existing manual releases explicitly; HTTPS redirects are tested through real curl. |
| F7: preserved evidence exceeds local isolation limits | Whole-checkout transport included historical campaigns irrelevant to the live build. Keeping evidence made routine development exceed 512 MiB. | A reviewed input snapshot records exact inventory, per-file hashes, lock and real base revision. Added, changed and symlink inputs fail verification before bootstrap. About 127.5 MiB replaces the 1.4 GB transport; historical evidence is untouched. This avoids deleting unique results, raising isolation limits or executing project code on the host. |

## Code reduction

- Removed the unused target adapter/renderer pair. Runtime already follows
  `surfaceState → createSurfaceLayer`; useful accepted-state and invalid-input
  tests now exercise that path. Keeping two owners only duplicated policy.
- Removed a test-only legacy link writer. A literal pre-migration URL still
  tests the live legacy reader; current sharing retains its existing writer.
- Removed CSS for navigation markup that is explicitly absent from the UI.
- Consolidated collection plot presentation and physical history sampling.
  The legacy guide entry remains reachable, so it was not silently deleted.

## Adversarial review

Independent review found and prompted three further corrections: interrupted
waiting commands, version-incompatible rollback checks, and unmanifested snapshot
inputs. A second release review identified real Cloudflare HTML redirects that
mock downloads missed; the transport now follows bounded HTTPS redirects and has
an actual loopback TLS/curl regression. No browser policy was bypassed.

The new tests initially exposed two TypeScript errors, a one-ULP independent
arithmetic assertion, old fraction-label expectations and a test whose mode
selection intentionally changed the displayed field. Those tests were corrected
against their actual API/display contracts; no physical convergence gate changed.

Final independent source reviews found no remaining actionable defect in the
touched display, bridge, release or pruning paths. This is scoped review, not
approval of every model or configuration in the repository.

Production inspection exposed another release boundary: Cloudflare consumes
root `_redirects` as configuration and does not serve it as an ordinary asset.
Bootstrap now restores that file only from its independently verified base and
checks its digest. Production verification checks each declared literal same-origin
301 response instead. Other missing files still fail; local artifact verification
still hashes every file. A real curl/TLS/proxy regression covers intermediate
CONNECT headers, redirects and wrong targets. `_headers`, if introduced, needs
separate behavioral qualification; this release contains none.

The new camera browser test initially compared focus outlines and dock text
overlapping the canvas. Raw PNG inspection found identical reactor pixels but
different HTML compositing. Screenshot-only styles hide the dock without changing
layout and suppress the focus outline during capture. The camera comparison still
requires exact PNG equality; no pixel tolerance, camera correction or product CSS
change was added. [The isolated diagnostic](https://github.com/noahsong-sdg/mass-spinner/actions/runs/44593786943)
passed desktop and phone, with the 254-file candidate verified before and after.

## Playback measurements

The [bounded playback study](playback-performance-study-20261119.md) confirms one
accepted-history traversal at construction and none during five cached frames.
Ordinary and 10,000-record stress cases retain equal numerical results. Complete
adapter timings are mixed and variable; they establish neither a general speedup
nor a stable net regression. GPU rendering, browser layout/paint and solver cost
are outside this measurement. The 10,000 records are synthetic playback history,
not a finer physical solution.

## Verification

The final offline job of [Verify 44593742304](https://github.com/noahsong-sdg/mass-spinner/actions/runs/44593742304)
passed at source `290aeec2f18742d5fe28ff278cf2b22ae3b88ed9`:

- `npm run typecheck`, `typecheck:infrastructure`, `typecheck:boundaries`,
  `typecheck:tests`, and `lint`: passed.
- `node --import tsx --test --test-concurrency=1 tests/*.test.ts`: 1,588 passed.
- Python unittest discovery for electron applicability, argon reference export,
  and development snapshot: 17 + 3 + 5 passed.
- `npm run build`, `check:site`, `check:assets`, `check:gltf`, `release:seal`,
  and `release:verify`: passed; 254 candidate files digest-verified.
- Dependency admission: no high/critical advisories in the checked lock.

These checks ran offline in bounded CI containers. Earlier focused isolated
iteration passed 80 tests. Exact logs and input manifests are retained under
`output/audit-fixes-20261119/`.

The same Verify run passed all 52 desktop/phone browser checks in 22.7 minutes,
then verified the 254-file artifact again. Coverage includes tutorial startup,
reload/interruption/rejection, collection controls, camera preservation,
A→B→C lazy imports and rollback. The browser container peaked at 1,270,472,704
bytes, with zero OOM events. Chromium uses SwiftShader and phone viewport
emulation; this is not native Safari or universal GPU-performance qualification.
The longer wall time required no test timeout or assertion changes.

## Publication and live checks

[Preparation 44599900516](https://github.com/noahsong-sdg/mass-spinner/actions/runs/44599900516)
passed source/lock admission, pinned live-release reconstruction, stale-selection
checking, offline retention and prepared-artifact upload. It then failed because
GitHub's Cloudflare credentials are absent. It neither published nor qualifies as
a successful prior deployment.

The existing authorized Wrangler 4.164.0 login published the exact prepared tree
without rebuilding. Cloudflare version `67da2371-e034-42da-af44-25a2e62cd264`
serves source `290aeec2f18742d5fe28ff278cf2b22ae3b88ed9`:

- Manifest SHA256 `17c68377b34abb972d02ea015b0b319d269f31f1f8f4d11ecbed31f2c44b1a12`.
- 375 local file hashes and exact inventory verified before upload: 254 unchanged
  candidate files plus 121 retained hashed chunks; no old HTML or data retained.
- Production manifest matched byte-for-byte; all 374 served file hashes and all
  12 declared redirect statuses/locations passed. Root `_redirects` is the one
  deployment control file, independently verified locally.

Native IAB checks confirmed:

- A prepublication centrifuge tab first-opened the reactor after publication,
  loaded its retained modules and reported no application errors.
- At a non-checkpoint clock (0.7489 s), scene and plot readouts agreed on ion
  speed 965.4 m/s and gas speed 938.6 m/s. These are rounded display checks.
- Collection readouts/legends/axis showed named percentages. Editing current
  0.030 → 0.031 A appended an accepted continuation to 2 s; scrubbing there
  changed the collection results. The accepted first second was preserved.
- Docs opened a fresh connected reader, then its composition action executed
  after simulator reload and selected the actual Composition plot. Other old
  reader tabs were not repurposed in this observed browsing context.
- At 390 px, controls and collection plots remained operable with document width
  and scroll width both 390 px. At desktop width, a keyboard-orbited/zoomed reactor
  retained its visible viewpoint through a pending current edit and acceptance;
  stale quantitative layers were withheld. Its error log was empty.

Temporary test tabs were closed and viewport overrides restored. Receipts:
`output/audit-fixes-20261119/deployed-290aeec.json`, browser logs and screenshots.
The conditional case of a related second simulator reusing another simulator's
named reader was not established; the observed fresh-reader case does not certify
every possible browsing-context relationship.

## Deployment-guard follow-up

Preparation exposed a separate shell error: Bash `-e` does not stop at the first
failing command of `test token && test account`. Missing credentials could
therefore reach Wrangler, which safely refused authentication. Simply, the
intended early stop was not an early stop. Two standalone tests now enforce it;
this avoids adding a redundant wrapper or changing credential permissions.

Infrastructure-only commit `2c89b84f7b44883022ff083e654ae2c509ceed80` changes no
website files. [Its guard run](https://github.com/noahsong-sdg/mass-spinner/actions/runs/44601148939)
passed three Python regressions offline in 256 MiB/one CPU: absent/empty/partial
credentials stop before a harmless deployment marker, both fake credentials
reach it, and the original AND-list reproduces the bug. Tests extract the actual
workflow step and replace only its vendor command. This guard is required by the
deployment job and included in future full verification. The redundant full
Verify spawned by this infrastructure-only push was cancelled; the deployed
artifact retains its complete qualification at `290aeec`.
Independent source review found no actionable correctness, security or
data-compatibility gap in this three-file follow-up and checked the actual guard
extraction, clean test environment and deployment dependency.

The credentialed Actions publication path remains unqualified until credentials
are configured and a real deployment succeeds. Future manual publication must
bootstrap explicitly from Verify `44593742304` and the manifest pin above;
failed preparation `44599900516` is not an admissible successful prior deployment.
See [deployment](../DEPLOYMENT.md) and [development](../DEVELOPMENT.md).

The later report-only closeout changes files outside website build inputs; it
does not replace the qualified/deployed source pin above. `git diff --check`
passed after the closeout edit.
