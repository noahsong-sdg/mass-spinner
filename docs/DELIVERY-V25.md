# V25: reactor workspace

Deployed to the existing Cloudflare site with provider version `a88167ab-ff6b-4c6c-860a-5c98a0bedcde` at 100% traffic. Deployment `ce7296e8-a6d3-4ff1-b089-6f88ab305670`, created `2026-11-08T09:06:33.203383Z`.

Playgrounds 01–03 now use the interactive 3D apparatus as the viewport, with floating tools and component inspection. Marathon switches between its separate beam-target and future-blanket models. Research remains a recorded-data workspace. Controls are moved, not duplicated; kernels and Blender assets are unchanged.

See [root causes, choices and audit corrections](IMMERSIVE-WORKSPACE-V25.md) and [independent source audit / live acceptance cases](LIVE-BROWSER-ACCEPTANCE-V25.md).

## Exact checks

All project execution ran in Apple safe-dev guest `safe-dev-98e1a42734e5af8f`, copied from `/tmp/mass-spinner-workspace-v25`. Explicit source sync and offline dependency installation preceded the checks.

- `npx tsx --test tests/workspace-v25.test.ts tests/playground-audit.test.ts`: 15 passed during iteration.
- `npm test`: 380 passed, zero failed/skipped in the final gate, including nine workspace regressions.
- `npm run typecheck`: exit 0.
- `npm run build`: exit 0.
- `npm run check:site`: exit 0.

The first full gate exposed an extracted-handler test fixture that omitted the newly added workspace dependency. The fixture now supplies that dependency and asserts comparison opens Plots, retaining its operating-point and model-boundary assertions. Its failed log remains in `scientific/verification-v25-first-gate`. A later test-only improvement replaced a CSS-string assertion with actual mobile dismissal/focus behavior; the final full gate was rerun.

Final source map: 342 files, SHA256 `3a8f13a5346768f0a274224d36f982ffc1419fce121fd373206361198c7a6446`. Logs/maps: `scientific/verification-v25-final`. Full reviewed export: `/tmp/mass-spinner-workspace-v25-final-regression-export`.

The final rebuilt 130-file release matches the deployed guest export byte for byte. Aggregate SHA256: `230018261ec8e007a0883aabda5efe0a91e484cc67e895fa3af0caae660be756`. The archive contains the compiled workspace shell and viewport CSS. Deployment ran in separate safe-dev guest `safe-dev-f5e3965510847418`; actual guest export: `/tmp/mass-spinner-deployed-v25-final-export`. Script, lock, log and sanitized provider receipt are in `scientific/deployment-v25`.

## Unclosed live gate

The browser origin authority gate still denies page observation. The deployed page, native gestures, actual GPU appearance and mobile dimensions were **not observed**. DOM integration tests, source review, build checks and provider metadata do not replace those observations. No browser-policy bypass was attempted. The read-only autonomous diagnostic and its limits are documented in the workspace report.
