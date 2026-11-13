# Directional swirl and rigid rotation

[Protocol](PROTOCOL.md). `study95.py` runs five matched native/custom decay
pairs, one native reconstruction counterfactual and four native rigid-rotation
controls. `score95.py` applies fixed analytic and zero-strain gates.
`test95.py` includes rectangular-grid and stale-data regressions plus retained
controls. Numerical diagnostics do not establish experimental accuracy.

All execution requires the pinned safe-dev scientific environment; no new
scientific dependencies are needed. Host controllers in `control/` copy/hash
immutable guest snapshots, execute offline, and verify evidence exports.
`launch.py NAME tests|study|score` refuses overwrites and source drift.
Historical replay requires its archived snapshot and recorded native stack.

Only the opt-in axial mesh count changes shared adapters. Default inputs and
legacy native/custom replays are checked for exact identity. Flow, Diffusion,
physical coefficients, default gradient scheme and the deployed app stay fixed.

[Results and limitations](../../RADIAL-AXIS-V95.md).
[Raw evidence archives](https://github.com/noahsong-sdg/mass-spinner/releases/tag/v95-scientific-evidence)
are release assets; `export.json` records checksums and the complete member
inventory is in `evidence/ARCHIVE-MANIFEST.json`.
