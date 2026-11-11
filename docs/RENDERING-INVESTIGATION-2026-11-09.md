# Live rendering investigation — 2026-11-09

Three independent subagents reviewed live browser behavior, the renderer execution path, and assets/dependency compatibility. Normal CUA in Brave successfully accessed the deployed site. No alternate automation or policy bypass was used.

## Observed browser behavior

The existing tab initially showed `3D unavailable`. One ordinary reload restored Marathon's 3D model and changed the old header to the current compact header. A second reload also rendered successfully. The original startup exception was not available; captured warnings/errors on fresh runs were empty. A stale document or transient chunk failure is plausible, not established.

Verified on https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/:

- 01: separator vessel and coils render.
- 02: beam–target and future blanket render; switching between them succeeds.
- 03: equilibrium separator geometry renders.
- 04: recorded research plots load. This view intentionally has no 3D apparatus.
- 02: energy changes 100 → 105 → 100 keV update successfully.
- 02: accepting the material model, hardware mode, fields and tritium surface quantities work.
- 02: time scrubbing to the end produces 15 s, beam off, zero instantaneous neutrons, and a surface timestamp of 15 s.
- 02 at 390 × 844: the 3D view and plots panel fit.

The original viewport and default 02 state were restored. Screenshots were emitted by the browser agent; no filesystem screenshot artifact was provided by the supported API.

This was not an exhaustive slider-extrema or mobile matrix for every playground. Successful rendering does not qualify the underlying physics.

## Source review and remaining findings

Execution path: `main.js` → `setupApparatus` → lazy viewer import → WebGL renderer/PBR environment → GLB load → accepted engineering surfaces. Manifest GLBs exist, and checked beam/blanket assets and manifests match between `web-assets` and `release`. The aliases share one Three core; no duplicate-core failure was established. GPU-mocked unit tests cannot establish actual WebGL rendering.

### Camera orientation continuity

Accepting a target result deliberately hides the reference Blender GLB and shows the SI engineering assembly (`apparatus-viewer.js:64–66`). Model dispatch is correct: the beam branch in `engineering-geometry.js` constructs an RF source, induction windings, three extraction electrodes, LiT film, backing and cooling manifold.

The abrupt horizontal-to-vertical appearance is explained by camera roll. `surface-layer.js` rotates the assembly's local axial z onto world x. Resetting the camera with transformed local direction `(0, 1, −0.2)` produces approximately `(-0.196, 0.981, 0)`, while camera-up remains world Y. That combination projects the apparatus axis vertically. In plain terms, the camera rolls the same type of machine into a different screen orientation.

A future focused correction should preserve a consistent projected apparatus axis and the tested cutaway sightlines. Add a projected-axis regression; account for OrbitControls caching its up-axis transform at construction. Replacing the model or changing physics dispatch would address the wrong cause.

Film, backing and illuminated-area geometry follow accepted inputs. The source, electrodes and vessel construction remain illustrative, not an engineering reconstruction of Marathon's proprietary machine.

### Diagnostic observability

`apparatus-ui.js:36–39` discards loader/startup errors and displays the same fallback for different failures. `apparatus-viewer.js` catches asset/surface failures. If failure recurs, preserve the original exception before selecting a fix. Renderer creation preceding PMREM initialization also presents a conditional cleanup risk if environment initialization throws; this was not observed live.

No product source changes, deployment, dependency installation, or project tests/builds were performed for this investigation. No deterministic current rendering failure was reproduced, so no speculative renderer patch was applied.
