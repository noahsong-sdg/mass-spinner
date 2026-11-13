# Analytic swirl control

[Findings and limitations](../../SWIRL-CONTROL-V94.md).
[Original prospective protocol](PROTOCOL.md), [supplemental protocol](EXTENSION.md).

`control94.py` reuses native OpenFOAM and scikit-fem V86; `score94.py` applies
analytic gates. `test94.py` includes 8 new controls and 51 retained regressions.
The original campaign fails two accuracy gates. Failed qualification is data.

All scientific execution requires the pinned safe-dev scientific environment;
this is not a standalone host Python environment. Trusted host controllers in
`control/` copy/hash immutable guest sources, launch offline work, and verify
exports. `launch.py NAME tests|study|score` refuses overwrites. Historical replay
requires the archived snapshot and recorded native/Python stack. Reusing a name
requires identical source hashes; a changed study must use a new snapshot.

No backend coefficients, app code, deployed controls or physical acceptance
thresholds changed. Numerical controls do not qualify experimental predictions.
