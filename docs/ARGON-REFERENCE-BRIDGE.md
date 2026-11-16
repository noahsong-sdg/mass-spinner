# Recorded spatial reference

The browser now has a separate, inspectable copy of the completed V98
scikit-fem non-rigid argon predictions. This connects the research evidence to
the playground without claiming that an unqualified research model replaces
the live lithium solver.

## Problem and scope

The live worker evolves two rigid rotors. Its radial density/thermal transport
does not create a resolved angular-velocity field. The offline solver already
resolves angular shear, but its completed predictions were only available in
research archives. In plain terms, users could not inspect the more detailed
calculation from the playground.

The smallest justified bridge is a read-only reference, rather than a fitted
slider surrogate or running an expensive solver after each interaction. It
shows all eight retained transport/anode alternatives and all three mesh
refinements. Every plotted ordinate is an exact stored uniform-emissivity
chord centroid. Lines join those samples; no interpolation engine, fitting,
new prediction, or local-speed conversion is performed.

Fixed conditions: argon, 100 A per branch, 0.13 T, 6 cm radius, 48 cm length.
Anode z is 7 or 8 cm. Ideal ring contacts, prescribed transport and no evolving
meridional/density/thermal model limit the reference. The spectral estimator
used by the experiment remains unresolved. Numerical agreement is not
experimental qualification, lithium separation validation or Marathon accuracy.
Live sliders do not alter the records.

## Provenance and implementation

`scripts/export-argon-reference.py` uses only the standard library. It verifies
the retained archive and original prediction-member hashes, then copies JSON
values and their original source identities. It neither decodes NPZ fields nor
executes a scientific model. The generated asset contains all 24 sample sets,
original packet hashes, comparisons and source manifest. The loader verifies
its bundled SHA-256 before parsing and refuses stale, partial or relabeled
packets. No new measurements are redistributed by this bridge.

The reference loads only when opened. Failed loads offer retry, disposal aborts
requests, and late responses cannot rebuild disposed UI. Rendering uses text
nodes and fixed links. Its plots are independent of live controls and the
separate measured-profile structural test.

## Verification

Prepared checks: `tests/argon-reference.test.ts`,
`tests/argon-reference-ui.test.ts`, and
`python3 -m unittest discover -s tests -p test_argon_reference_export.py`.

Host syntax and exact-copy metadata checks pass. Runtime, typecheck, build and
browser verification remain pending; this document does not claim those checks
ran. Existing V122 and V125 frozen sources and scientific gates are unchanged.
