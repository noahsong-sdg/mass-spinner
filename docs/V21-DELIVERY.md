# V21 apparatus and source coverage

## Why these changes

The numerical modes existed, but 02 exposed only a beamline schematic and the
non-orbital 03 modes had no matching apparatus. The old scene path loaded one
separator GLB for rotating/ICR and placed reduced diagnostics inside the same
viewport. In plain terms, several different mechanisms shared one picture or
had no machine to inspect.

The fix adds real Blender apparatus images, camera-projected native component
buttons and model-specific descriptions. Numerical diagnostics sit outside the
image frame and retain their existing handlers. Rotating/ICR still offer live
assembly, trajectory and field views. This bounded asset path is preferable to
inventing moving field or particle graphics for models that do not solve them.

Advanced mass controls also excluded lithium because their HTML minimum was
20 u, although the equilibrium kernel accepts positive masses. Only advanced
inputs now start at 1 u. A labeled 6/7-u equilibrium preset uses the existing
solver; the simple playground bounds and orbit timestep guards remain intact.
This fixes access to a supported physical case without changing its equations.

The Marathon review found that the compact beam source omitted the separate
future-plant blanket ideas. Mixing them into the beam solver would confuse
different neutron sources, gain definitions and engineering assumptions. An
optional separate blanket explorer instead combines a frozen published OpenMC
scenario with explicitly bounded decay and optical-depth references. Sliders
cannot change the quoted TBR or annual gold yield. Missing transport, target
regeneration, circuit, fuel-cycle and economics models remain visibly missing.

Independent review caught an omitted outer V-alloy wall in the first blanket
recipe and disconnected blanket component metadata. The corrected image has
both structural walls, and its own catalog is passed explicitly. The render
also originally kept selection state separately from the beamline inspector;
native or SVG clicks could leave a stale render highlight. The existing shared
inspector now notifies the render through silent selection synchronization.
An alternating render/native/SVG regression checks that fix without a general
event framework or duplicate descriptions.

## Scientific evidence and limits

See `CORE-COVERAGE-02-V21.md`, `CORE-COVERAGE-03-V21.md` and the public
`web-assets/CORE-COVERAGE.md` for primary sources and the implemented/reference/
unresolved coverage map. `RENDER-PIPELINE-V21.md` records actual native Blender
execution, editable scene provenance, rendering checks and image review.

The new numerical references are an assumed normalized Hg-197m/Hg-197/Au-197
shutdown batch, an independent normalized Au-195 residual and a single-reaction
slab optical-depth limit. Tests include an independent ODE comparison. They do
not constitute new neutron-transport, product-purity or experimental validation.
Existing separator and collision-qualification limits are unchanged.

Live browser controls, responsive layout, GPU appearance and touch behavior
remain unverified under the explicit managed origin denial. No alternate
browser, CDP, indirect public fetch or browser rendering of a local clone was
used to evade it. Asset image inspection, source-unit tests and provider
deployment metadata are separate evidence.

## Final gate

The first full gate passed before the final marker correction. Its actual
export remains `/tmp/mass-spinner-playgrounds-v21-pre-marker-export`, with
logs and source-map retained in `scientific/verification-v21-intermediate`.

The image review identified overlapping text labels on thin blanket layers.
Camera projections were correct, but variable-width labels occupied more space
than the projected separation; simply, correct points still produced crowded
text. Numbered 24px markers now correspond to named native buttons. At viewport
widths ≤600px, only the full-name button list is shown. Aria labels and titles
retain component names. This avoids guessed leader-line positions and keeps all
components available without changing camera projections or physics. Browser
appearance is still an open observation, not inferred from this source fix.

Final copied stage `/tmp/mass-spinner-playgrounds-v21`, guest
`safe-dev-5ad03b32bec2e04a`: **299 source inputs**, source-map SHA256
`1a2a6c6ee29024c402d3a83daaf016e8883abac0238546949caf5d92e2d10ae3`.
Explicit `sync --replace-guest` followed the last host edits; dependency
installation ran online inside that guest, and all checks ran offline.

Exact commands after final sync:

```
safe-dev -C /tmp/mass-spinner-playgrounds-v21 run --online -- npm ci
safe-dev -C /tmp/mass-spinner-playgrounds-v21 run -- node --import tsx --test tests/apparatus-ui.test.ts tests/component-inspector.test.ts tests/view-state.test.ts tests/tutorial-insights.test.ts tests/blanket-reference.test.ts
safe-dev -C /tmp/mass-spinner-playgrounds-v21 run -- python3 scripts/verify-levels-v21.py
```

Focused suite **21/21 passed**. The gate ran `npm test` (**304/304 passed**),
`npm run typecheck`, `npm run build` and `npm run check:site`; all exited zero.
Vite retains its existing large-main-chunk warning. Main JS is 1090.37 kB
(307.22 kB gzip), versus v20 1058.56 kB. The physics worker remains byte-named
`worker-CM5G_q9z.js`; original separator kernels and recorded research are
unchanged. All eight WebP images total 768874 bytes and load lazily.

Actual final export: `/tmp/mass-spinner-playgrounds-v21-final-export`.
All 299 input hashes match the actual export and current canonical files.
All **117 release members** and hashes match the actual build. Compact sorted
release-map aggregate SHA256:
`f3058dc2785b2b71cbcf3e720108573c7d74290dfc2caa0117ed365b79569b2e`.
Logs, exact source and release map are retained in
`scientific/verification-v21`; editable Blender scenes and execution evidence
are in `scientific/render-assets-v21`.

Independent source review closed all five findings before publication. It
verified the authored images/source and preserved the distinction between
source review, executed tests and unobserved browser/GPU behavior.

## Deployment confirmation

The reviewed 117-member release was copied into the existing deployment-only
safe-dev VM `safe-dev-f5e3965510847418`. Its saved guest OAuth remained valid;
no host credentials were copied. Pinned Wrangler 4.158.0 verified exact file
membership and hashes before publishing. It uploaded 22 changed assets and
reused 95. The actual deployment export is
`/tmp/mass-spinner-deploy-v21-final-export`.

Cloudflare's subsequent independent `deployments list --json` reports version
`30f3756a-3501-421c-b4d7-060bce3acdd2` as the latest deployment, **100%**, at
2026-11-08 01:40:47 UTC (7 November locally). All 117 actual deployment-export
files match the reviewed build and canonical release. Logs, provider response,
dependency lock, config and release hashes are retained in
`scientific/deployment-v21`.

Public URL: https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev
Use `?level=2` for Marathon and `?level=3` for the model lab.
This is provider/artifact verification, not a successful live browser visit;
the managed origin denial remains unresolved.
