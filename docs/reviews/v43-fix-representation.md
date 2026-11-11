# v43 — Displayed geometry and selected-part provenance

## Verified source path and root cause

`setupApparatus.show()` assigned the Blender asset caption once. Accepted solver packets subsequently reached `updateSurfaceState()` and replaced the viewer's reference root with its SI engineering assembly. That transition never updated the caption. Consequently, accepted numerical fields could appear beside the reference-only “Hardware only; layer thickness exaggerated” disclosure. In simple terms, the picture changed while its explanation stayed attached to the previous picture.

Physical-part picking already supplied the hit object's name, `materialBasis` and `geometryBasis`. The apparatus wrapper wrote those into its own `.component-description`, while the source workspace displayed the separate generic fusion inspector. In addition, the wrapper returned early for generic component selections whenever `onSelect` existed. A keyboard selection could therefore leave a previous physical part's material text behind. Its hit-metadata branch could also invoke `onInspect` twice. In simple terms, the selection had two competing descriptions, and changing the selection did not reliably replace the visible one.

## Small coherent correction

The viewer reports its actual displayed representation: reference, accepted SI assembly, loading or unavailable, together with its active numerical layer. The wrapper uses that acknowledgement to update the existing collapsed fidelity disclosure. It distinguishes fields, trajectories, impacts and hardware-only display, keeps construction/material assumptions explicit, and preserves each reference asset's original limits. An incoming ready packet alone does not establish that its geometry has loaded.

The apparatus wrapper always rebuilds its component readout. It first permits the existing generic selection synchronization, then writes the selected physical part's metadata, and finally invokes its inspection callback once. A later dropdown selection restores the generic component's own description and clears the old part details. Workspace/main integration places this same apparatus readout in visible Inspect and attaches the established component actions after its final rendering.

This preserves the existing callbacks, catalog, geometry and collapsed disclosure. It is preferable to inferring display state from solver readiness, selecting an arbitrary first mesh for a generic dropdown choice, or adding a second material panel: each of those alternatives would obscure the actual displayed/selected object or create another competing owner. No solver equations or material qualification claims change.

## Regression evidence and limits

`tests/apparatus-representation-v43.test.ts` exercises the real apparatus setup, asynchronous display acknowledgements, reference/accepted/hardware/pending/error transitions and failed viewer import. It also passes real electrode, RF winding, film, backing and flange metadata from `buildEngineeringGeometry()` through the actual generic-inspector synchronization path, verifies final callback timing, and checks keyboard removal of stale part details.

The coordinating root owns all safe-dev snapshot import and project execution. Requested narrow command:

```sh
./node_modules/.bin/tsx --test tests/apparatus-representation-v43.test.ts tests/apparatus-ui.test.ts tests/component-inspector.test.ts tests/apparatus-3d-v24.test.ts
```

Execution results and exact tested snapshot will be recorded by the root. These tests exercise DOM/CPU contracts; they do not verify deployed browser rendering, GPU picking, mobile layout, material calibration or the scientific validity of the numerical fields.
