# v43 viewer correction and verification gates

## Camera frame (v42 finding 11 / geometry finding 3)

The execution path is `updateSurfaceState → createSurfaceLayer.update → choose displayed root → fit/resize/reset`. Runtime surfaces and engineering parts share the local-z-to-world-x assembly rotation. The previous reset transformed its inspection direction `(0,1,-0.2)` but retained reference world-Y up. That placed the viewing direction close to camera up and projected the machine axis vertically. In plain terms, accepting a result rolled the familiar horizontal apparatus.

The correction specifies the complete frame: the reference uses its manifest up vector; accepted geometry uses transformed local +x as camera up and retains the existing local +y cutaway sightline. Source→target now projects screen-right for both representations. Three OrbitControls caches its camera-up transform when constructed, so a frame change disposes its old listeners/control and constructs a fresh control with the new up vector. Keyboard rotation uses that same up frame. This changes the camera rather than the already-correct SI geometry, cutaway, or physics dispatch.

## Resize fitting (v42 finding 12 / geometry finding 4)

The previous resize path updated aspect alone. Fit distance depends on the smaller horizontal/vertical field of view; reducing the available width therefore invalidated the original fit. In plain terms, the window narrowed while the camera stayed too close.

Resize now multiplies the camera-to-target offset by the new/old fit-distance ratio. This retains orbit direction, focused target, and the user's zoom relative to a fitted view. It also reverses when the stage widens and extends the distance bound when a very narrow stage needs more room. A component-focused or deliberately magnified view remains focused/magnified: resize does not promise to display the entire assembly after the user has intentionally zoomed in. Full resets on every panel movement were rejected because they would lose that intentional view. Updating fields or time without a geometry change still preserves the camera.

## Impact display/picking consistency (geometry finding 5)

The pointer path casts a real Three ray against hardware plus numerical layers, filters hidden objects/non-actionable lines, then applies the existing four-pixel point filter. Previously it selected the nearest remaining intersection before asking the surface layer to inspect it. A foreground opaque mesh could therefore consume a visible rear impact. In plain terms, the dot appeared on top but clicking it selected a wall.

Impacts retain their intentional `depthTest:false` display and explicitly draw after ordinary hardware (`renderOrder=1`). Pixel-filtered active impact hits take priority over hardware; within their single batch, later vertex indices win overlapping dots, matching primitive draw order. The existing screen-space tolerance remains bounded at four pixels, and clicks away from dots retain ordinary component selection. Disabling hardware picking or enlarging the tolerance in physical metres would change unrelated behavior and was rejected.

## Representation boundary

The viewer now reports the actual displayed root and actual active numerical layer to its wrapper. The surface layer exposes only its selected layer and whether that layer actually has numerical objects. This supports accurate reference/accepted/hardware/pending captions without inferring the representation from solver status alone. No result schema or persisted-data migration changes.

## Evidence and limits

Source trace and adjacent invariants checked: shared rigid SI transform; local +y cutaway visibility; camera reset, focus, keyboard orbit and OrbitControls lifecycle; field/time refresh camera preservation; visible-object filtering; point clipping and four-pixel filtering; ordinary hardware picking; selected-layer changes; reference/pending/load-error reporting.

`tests/viewer-frame-v43.test.ts` uses actual Three cameras, geometry, rays and OrbitControls with an injected rendering adapter. Its known opaque foreground mesh reproduces the old nearest-hardware ordering while a rear impact passes the real ray and pixel filter. It checks exact rear/foreground/overlapping event readouts, an off-pixel event, and ordinary hardware clicks. It also checks reference/accepted axial projections and wide→square→portrait resize before any manual reset, including preservation of a focused/zoomed/orbited target.

Requested narrow VM command: `node_modules/.bin/tsx --test tests/viewer-frame-v43.test.ts tests/scene-interaction-v41.test.ts tests/surface-viewer-v39.test.ts tests/apparatus-3d-v24.test.ts`.

Execution belongs to the root-coordinated safe-dev snapshot; results and snapshot identity must be read from its final receipt. This report does not assert GPU rendering or a live-browser pass. Root must run the repository build/typecheck final gates and reopen the desktop/mobile camera, cutaway, target microscope and orbit/pick paths before claiming those live outcomes.
