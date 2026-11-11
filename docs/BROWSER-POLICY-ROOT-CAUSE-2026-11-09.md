# Browser policy root cause — 2026-11-09

Status: initial diagnosis below; subsequently resolved by the explicitly authorized user configuration change recorded at the end. No installed runtime, browser extension, simulator code, or deployment was changed.

## Finding

The installed browser service consults the command-network configuration of the profile named by `config.default_permissions`. The user's default profile is `safe-dev`, with `network.enabled = false`. That is sufficient to reject every HTTP(S) origin, even when `browser_use.origins` and the saved browser permissions explicitly allow the site.

The rejection is classified as `enterprise_policy_blocked` with source `codex-network-policy`. Consequently, its user-facing message says “admin-enforced” without establishing that an administrator supplied the restriction. My earlier investigation checked browser-specific rules but missed this command-profile input.

## Evidence checked

- Installed application: `/Applications/ChatGPT.app`, bundle `com.openai.codex`, version `26.1103.31037`, build `25241`.
- Its bundled Codex diagnostic identified itself as `0.167.0-alpha.3.2`.
- Documented read-only `config/read` with `includeLayers: true` resolved `default_permissions = "safe-dev"` and `permissions.safe-dev.network.enabled = false`. Both values were attributed to the **user** layer `/Users/noahs/.codex/config.toml`.
- The same read resolved the exact Mass Spinner origin to `access = "allow"` in `browser_use.origins`.
- Documented `configRequirements/read` on that fresh bundled runtime returned `requirements: null`.
- `/Users/noahs/.codex/browser/config.toml` also lists the exact origin in `origins.allowed`, with an empty denied list.
- The current browser-service `latest` link resolves to `chrome/26.1103.31037/scripts/browser-service.mjs`.
- The last normal Browser Use attempt returned `enterprise_policy_blocked` / “Managed policy blocks access to this origin.”

The configuration diagnostic was a separate read-only client, not a dump of the already-running browser session's private state. An attempted read through the daemon proxy did not complete. Therefore these findings do not exclude an additional session-specific restriction. They establish a sufficient local denial cause without assuming a cloud administrator exists.

## Execution path

Source: `/Users/noahs/.codex/plugins/cache/openai-bundled/chrome/26.1103.31037/scripts/browser-service.mjs`.

1. `P6.readAll()` reads the layered configuration; `readRequirements()` reads requirements (line 4543).
2. `PL(origin, config)` calls `SS(requirements, config)` before testing the browser origin rule (line 4524).
3. `SS` obtains user command-network settings through `Loe`, which selects `config.permissions[config.default_permissions].network` (line 4524).
4. `vk(origin, network)` returns `"deny"` immediately when `network.enabled === false` (line 1064).
5. `PL` consequently returns `true` before calling `IL`, the browser-origin policy resolver.
6. `zM` turns that boolean into `enterprise_policy_blocked` and the generic managed-policy message (line 1153).

The network-denial error and the origin-denial error share a classification. The error alone cannot identify either its configuration layer or whether a managed requirement exists.

## Plain explanation

The command sandbox says “commands must stay offline.” The browser service also reads that setting and refuses the site before considering “this website is allowed.” Its error incorrectly suggests the restriction necessarily came from an administrator. The saved allowance and the sandbox rule are separate inputs; repeatedly saving the allowance changes the wrong one.

## Validation

Read-only native diagnostics were scoped to installed application metadata and the documented configuration RPCs. No project code ran on the host. Only relevant configuration fields and provenance were printed; credentials and unrelated configuration were withheld.

A reproduction extracted the installed pure policy functions, preserving their text, and ran them in the existing Apple safe-dev VM `safe-dev-d53fa8311a7066e4`, offline. Functions were supplied only a minimal sanitized configuration reproducing the observed values. The origin-policy resolver was replaced by a sentinel that throws if reached, to establish the ordering of the rejection.

Result: **PASS**, exit 0:

```json
{"result":"PASS","managedRequirements":null,"defaultProfile":"safe-dev","profileNetwork":false,"originConfiguredAllow":true,"blocked":true,"originPolicyCalls":0,"browserActions":0,"networkRequests":0}
```

Installed browser-service SHA-256:
`0442cee0bb672f889e89d40a64123c589363a13d931954bb7364cd4231e8fdab`

Exact extracted-function reproduction snapshot SHA-256:
`7b0ce2d7a9d3669537c0db92e756823ac7a8fb8009b8e8cc9a85211f36fbfddc`

No guest project source was replaced or synced for this test; the reproduction was passed as a `node -e` argument. Existing scientific evidence and deployment artifacts were untouched. No build or typecheck was needed for this diagnostic-only change. This test establishes the pure rejection path, not deployed GPU, browser interaction, or mobile correctness.

## Proper correction

The installed runtime needs to distinguish the effective browser-session authorization from command networking, and report the actual source of a denial. In particular, reading an unrelated **default** command profile is not evidence about the active browser session's permissions. Official documentation describes profile `network.enabled` as enabling network access for **commands**; it separately documents managed network restrictions that browser tools must continue to enforce.

A runtime correction should be reviewed against these requirements:

1. Resolve the applicable browser-session policy explicitly. Preserve applicable managed network denies, managed exclusive allowlists, browser origin denials, and approvals.
2. Do not promote a user default command-network toggle into an administrator-origin denial without a supported, explicit policy relationship. If that relationship is intentional, expose it in settings, documentation and the denial provenance instead of asking the user to change an unrelated site allowance.
3. Return provenance sufficient to distinguish a user command profile, a browser origin rule, a managed requirement, and missing policy data.
4. Add regression cases for an allowed origin plus an offline command profile, an active profile different from the default, managed deny overriding local allow, exclusive-allowlist misses, explicit browser deny, unavailable policy, and unchanged offline command execution.

This is preferable to globally enabling host networking because it preserves the user's isolation boundary and addresses the component that conflates the controls. It is a proposed product correction, not an installed patch or a claim that all browser traffic should ignore command policy.

No documented browser-only setting was found that can override this particular early rejection while retaining the current command-network-off profile. A site allow alone demonstrably cannot do so. Whether a newer supported application release corrects the interaction has not been established.

## Why alternative automation was not used

CDP, Playwright, headless browsers, and other browsers are normal testing tools. Here the Browser Use rejection explicitly forbids obtaining the same blocked outcome using alternate browser surfaces, raw CDP, or indirect execution. Using a different route after that denial would evade the access decision rather than repair it. This applies even though the diagnostic now explains why the message was misleading.

At the time of diagnosis, the user required: “Never weaken sandbox settings or bypass hooks to make a command work.” No permission changes or installed policy patches were made during diagnosis. No OpenAI support report was sent. The user subsequently explicitly authorized changing the identified setting; that exception and its verification are recorded below.

## Authorized configuration resolution

The user explicitly requested fixing the identified safe-dev setting. Changed only `/Users/noahs/.codex/config.toml:354`, from `enabled = false` to `enabled = true` under `[permissions.safe-dev.network]`. This removes the demonstrated network-off input without modifying the installed policy enforcement implementation or any managed requirement.

This toggle also permits command networking for processes using the profile; it is not a browser-only permission. Project execution continues through the safe-dev launcher, whose independent VM networking remains `--network none` unless `run --online` is explicitly used. Sensitive filesystem denials were preserved. The local safe-dev README was updated to describe the authorized distinction.

Verification:

- Replacing just that value back in the current file reproduces the original complete file SHA-256 `cd4c69f395c0e9840e866ca3beb5af5fea90f0613f75c7d0cc0819ab6796f539`, proving the one-line configuration delta.
- Current configuration SHA-256: `8801f765afa770faed9fb8614e9e02e62cf01a0649857f5f6c0d9a140796e342`.
- The ordinary CUA Browser Use path successfully claimed the existing Brave tab `923039329` and returned the deployed Mass Spinner accessibility tree, with Marathon selected, controls, plots, target, inspect, and model-info controls. No CDP workaround, alternate browser, or headless runner was used.
- The page reports **3D unavailable**. Access is verified; working GPU rendering and full playground acceptance remain unverified.
- A separate offline safe-dev invocation verified UID 1000, interfaces `["lo"]` and zero IPv4 routes after the profile change. The VM launcher's offline boundary remains effective.

For this authorized configuration change, the smallest effective correction was the identified profile toggle. It was chosen over modifying installed runtime code or broadening filesystem permissions. The product-level policy/provenance recommendations above remain applicable.

## Official references

Subsequent rendering verification: ordinary reloads restored working 3D on 01–03 and both 02 apparatus variants. The historical startup failure's exact cause remains unobserved. See [the separate rendering investigation](RENDERING-INVESTIGATION-2026-11-09.md) for live controls/mobile coverage and remaining camera/diagnostic findings.

- [App Server: configuration and requirements RPCs](https://learn.chatgpt.com/docs/app-server)
- [Configuration Reference: permission-profile network access and browser policy](https://learn.chatgpt.com/docs/config-file/config-reference)
- [Managed configuration: effective-policy checks and precedence](https://learn.chatgpt.com/docs/enterprise/managed-configuration)
- [Developer settings: effective-configuration inspection](https://learn.chatgpt.com/docs/developer-settings)
