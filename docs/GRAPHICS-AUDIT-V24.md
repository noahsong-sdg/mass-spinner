# Interactive apparatus: independent graphics audit

## Scope and root cause

The prior `setupApparatus` execution path mounted an HTML image and placed
buttons at Blender camera-projected screen coordinates. The editable Blender
files contained 3D geometry, but the page never loaded that geometry. Simply,
the user could inspect a photograph of a model rather than rotate the model.

The requested correction is genuine Blender-exported glTF geometry in a
renderer, with camera interaction and mesh-based component selection. The
original projected-image pin tests cannot establish those behaviors and need
to be replaced by geometry and actual viewer lifecycle checks.

This reviewer owns only independent tests and this report, not application or
export code. All project execution uses bounded copied Apple safe-dev VMs.
No alternate browser, CDP, local clone browser, public fetch or other workaround
for the existing explicit browser-origin denial is permitted or attempted.

## Independent results

- Parse every unique Blender GLB with the actual Three.js GLTFLoader. Check
  scene geometry, finite bounds, PBR material values and component metadata.
- Check GLB structure and validate against the Khronos glTF validator where
  available, keeping validation separate from rendered appearance.
- Exercise the production viewer with actual Three.js scene/camera/raycast
  math and injected renderer/control/loader boundaries. Check asynchronous
  mode races, stale-resource disposal, current failures and recovery,
  selection restoration, pointer drag versus click and final disposal.
- Preserve keyboard-accessible component selection and camera controls rather
  than relying exclusively on pointer picking.

The final independent test file has 11 passing gates. The actual Three.js
GLTFLoader parses all nine manifest modes, covering eight unique GLBs and the
shared double-well geometry. Positions and bounds are finite; normals have
unit length; meshes use PBR materials; every mesh has an inspectable catalogue
ID; manifest bounds match evaluated geometry. Model buffers are embedded and
there are no external images, studio floors, lights or cameras in the models.
Region-only concepts remain catalogue entries rather than fabricated hardware.

The official [Khronos glTF Validator](https://github.com/KhronosGroup/glTF-Validator/blob/main/node/README.md),
version `2.0.0-dev.3.10`, reports **zero errors, zero warnings and zero infos**
for each of beam-target, blanket, centrifuge, curved, doublewell, gyro, icr and
rotating. That establishes file-format validity, not engineering fidelity.

## Findings and corrections

1. **Static image path.** The page referenced image URLs and projected pins,
   so Blender meshes never reached the browser. The replacement loads the
   actual GLB through Three.js, exposes OrbitControls and raycasts meshes.
   Using the exported geometry directly preserves depth and component metadata;
   additional image viewpoints would have preserved the original limitation.
2. **Uninspectable hardware.** The first independent asset test failed on the
   beam-target `support` mesh: its metadata ID had no catalogue entry. The new
   `support` and `beamline` catalogue entries describe their visible roles and
   explicitly identify unspecified construction alloys. The final catalogue
   gate covers every actual mesh ID.
3. **Hidden asynchronous initialization.** The wrapper originally checked
   visibility only before awaiting its renderer chunk. Switching playgrounds
   during that wait still allocated a hidden viewer. Rechecking visibility and
   disposal after the import fixes the actual continuation boundary; deferred
   import tests establish that no viewer is created while hidden or disposed.
4. **Model-load retry.** The viewer returns `false` on an asset failure, so the
   wrapper's exception handler did not expose recovery. Wiring the existing
   `onError` callback to a persistent Retry control makes actual loader failures
   recoverable. A production-wrapper test drives the first-failure/second-success
   path and checks that Retry appears, then clears.
5. **Context restoration with on-demand rendering.** Three.js restores its
   renderer after context loss, but the application had no animation loop or
   event requesting another frame. Simply, a recovered canvas could remain
   blank until the next interaction. A narrow `webglcontextrestored` listener
   requests one render and is removed by the existing listener cleanup. This
   matches on-demand rendering without adding a permanent animation loop. The
   regression dispatches that event and checks one new render request and none
   after disposal; it does not simulate physical GPU recovery.

The producer separately corrected inward blanket outer-shell winding and the
open curved guide's inner surface, and supplied signed radial-normal checks in
`scientific/model-assets-v24/validation.json`. This review used those final
exports, then independently checked their format, loader behavior, unit normals,
finite geometry and metadata. Unit-normal checks alone do not prove outward
winding or visible shading quality.

## Execution and exact snapshot

All execution was inside the bounded stage
`/tmp/mass-spinner-graphics-audit-v24`, copied to guest
`safe-dev-8b83e0b8204711ef`; final sync copied 18 files, 9.7 MiB. No credentials
or home directories were copied. Commands used:

```text
safe-dev -C /tmp/mass-spinner-graphics-audit-v24 init
safe-dev -C /tmp/mass-spinner-graphics-audit-v24 sync --replace-guest
safe-dev -C /tmp/mass-spinner-graphics-audit-v24 run --online -- npm ci
safe-dev -C /tmp/mass-spinner-graphics-audit-v24 run -- node_modules/.bin/tsx --test tests/apparatus-3d-v24.test.ts
safe-dev -C /tmp/mass-spinner-graphics-audit-v24 run --online -- npm install --no-save --package-lock=false gltf-validator@2.0.0-dev.3.10
safe-dev -C /tmp/mass-spinner-graphics-audit-v24 run -- node validate-glb.mjs
```

The validator was reviewer-only tooling; it was not added to application
dependencies. Its JSON report was exported before the last sync to
`/tmp/mass-spinner-graphics-audit-v24-evidence/khronos-validation.json`.

Final SHA-256 snapshot:

| File | SHA-256 |
| --- | --- |
| apparatus-viewer.js | af97b545ed4619cc6cabf25e37f14787b197c6af070b1fc5685bbf7473a91317 |
| apparatus-ui.js | d9959fd7dd8a2ece8552870142f6aae8f588dd8244855436ae189af9cd0b1400 |
| component-catalog.ts | 71af57dbe6467d569657fef1c06709b9649b5c0a327a3fd0114b418042de2b24 |
| manifest.json | cbcb4d91dc04ddcfa21b3e565c0d921d17323421b92322601446545be84e5d26 |
| apparatus-3d-v24.test.ts | 6ac3aee71fcf8961e51cc325e7fb68c89c3dd6c650aea615b2f2a99ae1d9404d |
| beam-target.glb | ae0a91dcd94749f53b0dbce3c5a4444aa4441b12ddf3c4e809b9b7fa58bbce35 |
| blanket.glb | 5c117c0f90af06c332a3d57aca1e553f1dd7510ca4e21199aecfce5fe9108e9f |
| centrifuge.glb | a3a6a0879fbc08c349ae7ad742d0cbe45d3aa0d8309a4ca4db7b0789bacbff6a |
| curved.glb | f1c045e91d7a969dd38ac0453516a84e4ff6c22d837cc59a5aea83b10f53a7e0 |
| doublewell.glb | f6e936108d4d9fe20393152ee14e7e58ab8a58d2cbd9934f58bb960d9dc8f8ec |
| gyro.glb | c3f6c85132197307583d3368bbeb3e0f5da0c1199bf647183e3d3c9f23afebd9 |
| icr.glb | b92e7c7261d5ee4b37f97afd7c1df323ed65eaaaa5d80075b0314591866dbdb3 |
| rotating.glb | ca1a53493033c0be28fd6a270122abcac4e694353cd1d794ac1503a0aaf2b76a |

The broader build, typecheck and integration suite are the parent task's final
gate, beyond this independently bounded graphics snapshot.

## Verification limits

CPU glTF parsing and injected-renderer tests do not verify a GPU frame, native
OrbitControls gestures, mobile layout, material appearance or live deployment.
Browser/GPU visual verification remains open under the existing managed-origin
denial. No browser-policy workaround was attempted. The geometry is conceptual;
neither format validation nor attractive materials calibrate Marathon hardware
dimensions, construction materials, source operation or target physics.
