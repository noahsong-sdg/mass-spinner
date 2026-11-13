# Graded endwall reference

See [results](../../GRADED-ENDWALL-V93.md) and the registered
[protocol](PROTOCOL.md). This adds an opt-in nested axial mesh to the existing
OpenFOAM/custom reference. Physical operators, uniform defaults and the live
playground remain unchanged. Numerical agreement is separate from experiment.

- `study93.py`: the five registered mesh/timestep pairs; native mesh checks,
  source/native seals and complete conserved histories.
- `score93.py`: actual graded-volume global/local spatial and temporal gates;
  conservative restriction, whole/increment norms and independent budgets.
- `test93.py`: graded mapping/restriction and legacy replay regressions plus
  the retained V92 controls. The failed pre-change snapshot is retained.
- `control/launch.py`: trusted host copy/hash/launch controller. Every project
  computation runs offline inside safe-dev on an immutable source copy.
- `control/app-final.py`, `control/export.py`: separate app checks and verified
  export of source, dictionaries, raw native fields, packets and receipts.
- `control/diagnostics.py`: initial sampling, wall-scale cell counts and
  separate radial/axial velocity diagnostics; these never change admission.

Reproduction requires the recorded OpenFOAM 14 installation, v90 Python
environment and retained V90-92 guest evidence, using the installation-specific
paths in the controllers. No credentials, host mounts or dependency upgrades
are needed. Restore the recorded prerequisites; then launch `tests`, `study`
and `score` against a fresh named source. Do not overwrite a completed or
failed phase. A failed scientific score is preserved as a nonzero exit.
Historical controllers intentionally reject shared-source hash drift; use
their archived source snapshot or recorded Git revision for historical replay.

Result: global spatial 142/144; wall-local spatial 140/144; global temporal
96/96; wall-local temporal 96/96; conservation 25/25. All six failures concern
swirl response increments. Every meridional, whole-state and contraction gate
passes. Numerical, experimental and live-playground qualification remain false.
The original V90-92 failures stay available separately.

See [audit](evidence/v93-graded-source02/scientific/graded-endwall-v93/score-results/audit.json),
[diagnostics](diagnostics.json), [app checks](app-final/execution.json)
and [verified archive receipt](export.json).
