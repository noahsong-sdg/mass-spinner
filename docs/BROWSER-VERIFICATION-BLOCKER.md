# Browser verification diagnostic — 6 November 2026

## Confirmed observations

- The user reports a personal account, not an organization-managed workspace.
- The user saved a site allowance and fully quit/restarted Codex before the latest attempt.
- After the restart, the local configuration still contains the exact origin rule:

```toml
[browser_use.origins."https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev"]
access = "allow"
```

- The supported Computer Use call was:

```javascript
await cua.createBrowserTab('iab',
  'https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev',
  {visible:true});
```

- It failed before loading the page, including after the restart:

> Browser Use rejected this action due to browser security policy. Reason: The admin-enforced policy blocks this action. Browser use could not acquire authority to trigger network egress. The origin policy gate did not grant access for https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev. Managed policy blocks access to this origin.

- Earlier scoped checks found no `/etc/codex/requirements.toml`, user requirements file, project `.codex/config.toml`, or the checked macOS managed-preference plist files. This does not prove that no other runtime or remotely delivered policy exists.
- Native Computer Use inspection of the Codex app was separately rejected by that tool. Its settings were not automated or changed.
- No alternate browser, CDP, indirect site fetch or security-policy workaround was attempted.

## Conclusion and unknowns

The saved local allowance and the effective runtime denial disagree. The tool's phrase “admin-enforced” does not identify the policy owner or prove this personal account has an enterprise administrator. The denial is not evidence of a Cloudflare, JavaScript, shader or application-code failure: the page was never loaded.

A stale running-app policy was a hypothesis; restarting did not resolve the symptom. The remaining policy source or authority failure is not exposed by the available tools. Product support should investigate the effective browser policy/authority evaluation for this personal-account session and this exact origin. No further identical local allowance edit is justified by the evidence.

Official references checked:

- https://learn.chatgpt.com/docs/browser
- https://learn.chatgpt.com/docs/enterprise/managed-configuration — effective policy, precedence and running-task refresh limits.
- https://learn.chatgpt.com/docs/config-file/config-reference — origin matching and stricter applicable policy.

## Verification ready once access is restored

1. Confirm only the six A–D methods appear and the default centrifuge run finishes.
2. Change rotation, temperatures, central fraction, radial cut and resolution; confirm current plots/metrics recalculate and radial refinement reports a result.
3. Switch to rotating orbits; confirm full accounting, cold-reference curves, sampled paths and timestep refinement. Change voltage/B and confirm the cutoff and collection respond.
4. Confirm assembly/orbits/fields views, camera input and real renderer status using screenshots; distinguish WebGPU from WebGL2 and from the Blender still image.
5. Exercise ICR and gyro/drift modes, then double-well shape/Ptheta/crop; check unrelated controls/readouts are hidden and plots react.
6. Rapidly move sliders/switch modes and compare models; verify obsolete jobs do not publish stale outputs.
7. Inspect all eleven atlas images, source links and tradeoffs; check narrow viewport overflow, plot readability and keyboard access.

These are pending runtime checks, not claimed passing results. Existing source-unit tests/build/deployment evidence is separate.
