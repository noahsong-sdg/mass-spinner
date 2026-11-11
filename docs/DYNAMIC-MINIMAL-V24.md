# Dynamic simulator text, v24

## Root cause and scope

The dynamic producers added a second layer of introductions and qualifications after the page shell had already introduced each simulator. `setupFusionLaboratory` wrote explanatory success prose on every source update. `setupTargetExposure` added a subtitle and repeated pulse settings in its status. Geometry put a scope paragraph ahead of controls; blanket put its architecture and batch assumptions ahead of its controls.

Technically these paragraphs were generated content, so deleting the static subtitles alone would leave them on every run. In plain terms, each panel kept explaining itself before allowing the user to play.

The fix changes only presentation in `fusion-ui.js`, `target-exposure-ui.js`, `neutron-geometry-ui.js` and `blanket-ui.js`. No equations, input defaults, control bounds, state flow, model selection or export payloads changed.

## Changes

- Successful source, exposure and blanket decay calculations leave their status empty. Source scan exclusions and all errors remain visible.
- Exposure uses the heading “Exposure”; its introductory scope joins its equations, assumptions and source links in a closed native “Model info”.
- Sample geometry moves scope behind a closed “Model info”. Its quantitative readouts and plot remain available when opened. The point-source warning remains visible whenever spot radius / distance exceeds 0.1.
- Blanket uses short section names. Architecture, batch assumptions, decay limitations and other unmodeled physics remain in “Model info”; the frozen published transport case remains separate. Isotope percentages and optical-depth reaction/utilization results remain live.

Native disclosures preserve access to scientific provenance and qualifications with no extra state or custom overlay. This is preferable to deleting limitations, hiding all status messages, or adding another navigation layer. Numerical outputs, physical units, plot axes and actionable warnings stay at the interaction point.

## Verification

All project execution was inside a separate Apple safe-dev VM. The copied stage was `/tmp/mass-spinner-dynamic-minimal-v24`, guest `safe-dev-187c603811cdf1c9`. The stage contains 69 input files: all `src`, package/lock/typecheck config and the new test. The final explicit sync copied those files plus the manifest; dependencies were installed again after sync.

Commands:

```text
safe-dev -C /tmp/mass-spinner-dynamic-minimal-v24 init
safe-dev -C /tmp/mass-spinner-dynamic-minimal-v24 run --online -- npm ci --ignore-scripts
safe-dev -C /tmp/mass-spinner-dynamic-minimal-v24 sync --replace-guest
safe-dev -C /tmp/mass-spinner-dynamic-minimal-v24 run --online -- npm ci --ignore-scripts
safe-dev -C /tmp/mass-spinner-dynamic-minimal-v24 run -- ./node_modules/.bin/tsx --test tests/dynamic-minimal-v24.test.ts
safe-dev -C /tmp/mass-spinner-dynamic-minimal-v24 run -- npm run typecheck
```

Results: **4/4 production-handler regressions passed; typecheck passed**. The initial new test incorrectly classified a status paragraph as introductory prose; its assertion was corrected to allow status roles while still excluding unconditional prose. There was no production failure in that first run.

The regressions exercise:

1. Quiet source success, retained assumptions, valid scan exclusions, invalid-source clearing and recovery.
2. Exposure units, shared duration and plot updates; local invalid-temperature errors, plot clearing, disabled export and recovery; retained collapsed equations/sources.
3. Geometry warning at the finite-source boundary, quiet valid regime, invalid-distance clearing and recovery, retained units and scope.
4. Live blanket isotope percentages and plots; invalid isomer fraction, recovery, optical-depth outputs and invalid-depth errors; retained collapsed scientific qualification.

SHA256 of `SNAPSHOT-V24.json`: `49a26ba224350b0112488a9113324f7fafa6432b97dd3dd6a11d8600c1d7e3e5`.

| File | Tested SHA256 |
|---|---|
| `src/fusion-ui.js` | `2cca718113f476c44f6de63f533874186b2c84084a6236bea01d28d025173e9b` |
| `src/target-exposure-ui.js` | `3f9d0b894500a6f7eec7e225050c9ac02ac9f62a0f8f901b2f6e22fdff4876e1` |
| `src/neutron-geometry-ui.js` | `852b9717cc6cd75478c359d01e91b2267b9dcb39df6eb089e0dbc5a87a2821a4` |
| `src/blanket-ui.js` | `3fb4b195b442be342e6a6f1ffeb98c3406fc93923e818ea9ffb2a4dda6d1dec1` |
| `tests/dynamic-minimal-v24.test.ts` | `4847b27b3fe1b5b0e5c99926ac01db15fdd9c4c9fea3a18cd497f828931354ae` |

Host files matched these tested hashes after execution. These source-unit checks use a minimal DOM and actual production event handlers; they do not establish browser appearance, interaction rendering or GPU behavior. Full merged build/typecheck/site verification and deployment are parent gates. Existing exact-prose assertions in `fusion-accessibility-v22.test.ts:77` and `material-ui-v23.test.ts:57,92` need updating to the intentionally quiet success behavior while retaining their numerical/state invariants.
