# Browser authority diagnostic

Status: unresolved. No deployed page content, screenshot, GPU appearance or native layout was observed. This is a diagnostic record, not a simulator release.

## Fresh observations

1. Supported `cua.getState()` succeeds. Brave Personal is connected through the extension and lists existing Mass Spinner tab `923038869` at `https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/?level=2`.
2. Supported `cua.getTab('923038869', {browser:'1'})` fails before acquiring page authority:

   > Browser Use rejected this action due to browser security policy. Reason: The admin-enforced policy blocks this action.

   The remaining error specifically names a managed origin-policy denial for `https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev`, and prohibits alternate surfaces or indirect access to achieve the denied observation.
3. Read-only native access to Codex's diagnostic UI using `cua.getApp('com.openai.codex')` is separately rejected:

   > Computer Use is not allowed to use the app 'com.openai.codex' for safety reasons.

4. The saved user configuration contains the exact origin rule with `access = "allow"`, no browser default-origin rule and no browser/computer feature pins.
5. The installed official Codex binary was invoked as a separate read-only App Server client using the documented initialization handshake. Only `config/read` and `configRequirements/read` were requested; no threads or turns were created, and no configuration writes occurred.
6. `config/read` with `includeLayers:true` and `cwd:/Users/noahs/omega` succeeds. The effective browser configuration includes the exact allow rule, attributed to `/Users/noahs/.codex/config.toml`. Reported layers are user configuration and `/etc/codex/config.toml`; the system layer has no browser section.
7. `configRequirements/read` succeeds with `requirements:null`. This describes that separate local diagnostic process, not necessarily the effective authority context of the live browser tool.
8. One supported desktop updater check returns installed version `26.1103.31037`, build `25241`, channel `prod`, status `busy`. It does not establish update eligibility or that the app is up to date. No update polling, download, installation or restart occurred.

## What this establishes

Browser discovery and extension connectivity work. Failure occurs at page authorization, before simulation execution or browser interaction. The local allow rule is parsed and loaded correctly by the official configuration API.

The source of the live tool's managed denial remains unknown. The difference between a separate local process and the live tool's authority context prevents concluding that the latter has no managed restrictions. A product/session policy mismatch is a hypothesis, not a demonstrated root cause. No code or settings change is justified by the evidence collected here.

No raw CDP, alternate browser, native browser observation, proxy, public-page fetch or local browser clone was used to recover denied page content. No permission, policy, authentication or extension state was changed.

## Support-ready reproduction

Chat ID: `01a1b24c-d476-72f2-9877-6d32127334f6`.

Please identify the effective browser authority policy and its source for this chat. Browser inventory succeeds, but acquiring the existing Mass Spinner tab returns an admin-enforced managed origin denial. The user reports a personal account and has already allowed the exact origin and restarted. A separate official App Server `config/read` confirms the exact origin allow and `configRequirements/read` returns null. Native automation of Codex's diagnostic UI is also denied. Determine which policy/context supplies the live origin denial, or whether the diagnostic process and tool are using different effective requirements. No broader site access is requested.

This report is prepared locally; no support message or logs were transmitted.

## Official references checked

- [Browser extension troubleshooting](https://learn.chatgpt.com/docs/chrome-extension): documented setup, connection checks and `/feedback` / chat-ID escalation.
- [App Server](https://learn.chatgpt.com/docs/app-server): initialization, effective configuration and requirements read APIs.
- [Managed configuration](https://learn.chatgpt.com/docs/enterprise/managed-configuration): policy scope, precedence and verification limitations.
