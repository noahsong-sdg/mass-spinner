# Live browser verification: current blocker

Checked 7 November 2026, personal-account desktop session.

## Evidence checked

- Codex app version `26.1103.31037`, build `25241`, read from its installed Info.plist.
- `cua.getState()` succeeds and lists the user's existing Brave tab for Mass Spinner.
- Binding that exact tab with `cua.getTab("923038869", {browser:"1"})` fails before page observation.
- The returned reason is: “Browser use could not acquire authority to observe page content. The origin policy gate did not grant access for https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev. Managed policy blocks access to this origin.”
- The local exact-origin rule is still `access = "allow"`, checked only in its own configuration section. No credentials were read.
- The user freshly confirmed that the site is already allowed in the permissions UI. This confirms there is no newly identified local approval to apply.
- The earlier allowance and app restart did not resolve the denial. This fresh attempt does not establish its underlying policy owner or cause.

This is an authorization-layer failure before application content is available,
not evidence of a Cloudflare, JavaScript or GPU failure. Browser inventory is
available; page observation and control are not.

## Supported resolution

[Browser settings](https://learn.chatgpt.com/docs/browser) provide
Settings → Browser → Agent permissions and per-site exceptions. The user has
already set this site's exception. Check whether the current rejected action
offers an approval or whether the UI shows a locked effective restriction.

The [configuration reference](https://learn.chatgpt.com/docs/config-file/config-reference)
specifies that an origin `allow` only permits normal approval and policy checks
to continue; the most restrictive matching origin rule applies. The
[managed configuration reference](https://learn.chatgpt.com/docs/enterprise/managed-configuration)
distinguishes managed browser restrictions from personal settings.

If the site is already allowed and there is no actionable approval, product
support must inspect the effective policy/authority evaluation for this personal
session. The evidence above is the bounded diagnostic packet; it contains no
authentication tokens. No further identical allowance edit or restart is
justified without new evidence. No tool currently exposes the source of this
effective denial, so changing local settings cannot be claimed as a fix.

The tool explicitly prohibits alternate browser surfaces, raw CDP, indirect
execution and policy circumvention after this denial. Consequently no public
origin fetch, alternate domain, local browser clone or headless browser was used
to reproduce the blocked page-observation outcome. Source-level controls tests
and mathematical checks remain permitted and are reported separately.

## Runtime acceptance gate still open

Once access actually succeeds, execute the per-playground control matrix in
`CONTROLS-AUDIT-V20.md`: native range/select/toggle input, current plots and
markers, complete worker runs, stale-run cancellation, downloads, camera
gestures, component selection, responsive layouts and GPU failure presentation.
Capture each playground at desktop and narrow widths, and report the renderer's
actual WebGPU/WebGL2 status. Passing source tests or provider publication cannot
close this gate.
