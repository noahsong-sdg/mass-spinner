# Current DOLFINx toolchain qualification

This is the DOLFINx 0.11 API adaptation of the frozen [0.9 matched angular reference](../public-fenicsx-reference/PROTOCOL.md). The physical weak form, synthetic apparatus, contacts, independent scikit-fem comparison and all acceptance gates are unchanged. The mesh constructor moved its element argument before coordinates; this port changes that call, not the geometry.

The native environment is the digest-pinned official image in `ci/Dockerfile.fenicsx`. Keep its binary-compatible NumPy/SciPy/PETSc environment; this is separate from the Python 3.15 diagnostic environment. CI records the complete image inspection and Python package inventory.

Run the five matched-physics tests, then the existing n=1,2,4 refinement at the original 5% field/refinement and 1e-8 conservation screens. Source hashes include this adaptation, its protocol, the frozen independent fem98 implementation and the native recipe. This is a synthetic stationary angular/electrical reference; no temperature, meridional flow, full live-model or experimental qualification follows.

The original source, recipe, results and notice remain unchanged. This adaptation is accepted only after the recorded native run passes.
