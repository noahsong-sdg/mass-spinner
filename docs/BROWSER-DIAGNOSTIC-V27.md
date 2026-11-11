# Browser diagnostics follow-up

Status: unresolved. This is a diagnostic record, not a simulator release or live-browser acceptance result. The preceding supported browser attempt and policy/configuration reads are recorded in `BROWSER-DIAGNOSTIC-V26.md`.

## Additional evidence

- Ran the installed official CLI's documented `doctor --json` command without configuration overrides. It exited 0, with overall status `warning`. CLI version: `0.167.0-alpha.3.2`.
- Doctor reports the background App Server running, authentication configured, and provider HTTP/WebSocket connectivity working. These checks did not request Mass Spinner page content and do not test browser-origin authorization.
- Doctor reports desktop version `26.1103.31037`, but marks the desktop app as not running and therefore does not perform a desktop handshake. A bounded read-only process-name check independently finds `/Applications/ChatGPT.app/Contents/MacOS/ChatGPT` running. This demonstrates a diagnostic detection discrepancy; it does not prove the cause of the browser denial.
- Doctor explicitly does not inspect active-thread configuration overrides.
- Doctor reports three missing environment variables for the configured `node_repl` server: `BROWSER_USE_ACCESS_EXECUTOR_ID`, `BROWSER_USE_ACCESS_PIPE_PATH`, and `BROWSER_USE_ACCESS_VERIFYING_IDENTITY`. A presence-only check confirms these variables are absent from the standalone shell invocation. User MCP configuration lists all three as forwarded variable names. No authority values were read, copied, fabricated or injected. Their absence from a standalone process does not establish their absence from the desktop tool context.
- A bounded macOS unified-log query for origin-policy, managed-policy and browser-authority errors over 15 minutes returned zero matches. A phrase-only search of the two newest desktop log files also returned zero matches. Neither result establishes that the live policy has no errors.

## Conclusion and limits

The known failure remains before page acquisition: browser inventory works, but the supported browser tool rejects the exact deployed origin with an explicit managed-policy denial despite the local allow rule. The source of that live denial remains unexposed by the available configuration diagnostics. Runtime-context divergence is a hypothesis; a specific configuration defect has not been demonstrated.

Do not treat the standalone CLI's missing authority variables as instructions to manufacture access or connect to authority pipes. Do not disable security controls, change unrelated deprecated settings, terminate helper processes, or use another browser surface to recover the denied content.

No simulator source, browser policy, credentials, extension state or runtime process was changed. No support message or logs were uploaded. No repeated page acquisition was attempted without evidence of a changed authorization state. The raw redacted doctor output is stored locally at `/tmp/mass-spinner-codex-doctor-v27.json` with private file permissions; it includes unrelated diagnostic inventory and should not be shared wholesale.

## Acceptance still outstanding

- Deployed Blender models: visible geometry, materials, orbit, zoom, selection and animation.
- Every playground's controls and corresponding live plots.
- Floating-panel behavior and component/material inspection.
- Native narrow-viewport and touch layout; GPU/context-loss behavior.

Existing build/test evidence does not satisfy these browser acceptance gates. No project tests were rerun because this follow-up changes diagnostic documentation only.

## Support-ready addition to v26 reproduction

Please compare the live browser tool's effective origin-policy source with the separate App Server configuration reads for chat `01a1b24c-d476-72f2-9877-6d32127334f6`. Doctor does not inspect active-thread overrides; it also reports the desktop app absent while its process is present. Determine whether these contexts are associated with different authority requirements. Do not broaden the requested access beyond the user's existing exact-origin allowance.

Official references: [CLI doctor](https://learn.chatgpt.com/docs/developer-commands?surface=cli), [extension troubleshooting](https://learn.chatgpt.com/docs/chrome-extension), [managed configuration](https://learn.chatgpt.com/docs/enterprise/managed-configuration).
