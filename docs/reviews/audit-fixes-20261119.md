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

## Verification

The final focused isolated batch passed 80 tests plus test and infrastructure
typechecking. Earlier app/contract typechecking and five snapshot Python
regressions passed. Exact tested input manifests and logs are retained in
`output/`; final full-suite, browser, performance and deployment receipts follow
when qualification completes.

GitHub's Cloudflare deployment secrets are currently absent. Existing authorized
Wrangler OAuth supports manual publication of the exact qualified prepared tree.
The credentialed Actions deployment path must not be described as exercised
until those credentials are configured and a run succeeds. See
[deployment](../DEPLOYMENT.md) and [development](../DEVELOPMENT.md).
