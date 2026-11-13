# Wall transient qualification

See [results and limits](../../WALL-TRANSIENT-V92.md) and the prospective
[protocol](PROTOCOL.md), published before the new timestep trajectories.
The physical implementations are unchanged from V90/V91. This is a neutral-gas
numerical comparison; experimental qualification and live integration remain
separate requirements.

Result: final global spatial 48/48; early global spatial 81/96; wall-local
spatial 105/144; global temporal 96/96; wall-local temporal 96/96;
conservation 15/15. Numerical and experimental qualification remain false.
The wall layer needs further spatial resolution; reducing the timestep meets
the declared temporal limits but does not repair the spatial failures.
See the [complete audit](evidence/v92-wall-source02/scientific/wall-transient-v92/score-results/audit.json),
[application receipt](app-final/execution.json), [projection diagnostic](projection-diagnostic.json)
and [verified archive receipt](export.json).

- `study92.py`: two native/corrected-backend trajectories at 128×256 and
  512/2048 steps, completing the retained 1024-step study.
- `score92.py`: separate saved-clock global/local spatial, temporal and
  conservation sets. Conservative restriction precedes primitive recovery;
  local norms use exact fractional cell-volume overlaps.
- `test92.py`: five new scoring controls plus the 34 previous controls.
- `control/launch.py`: trusted host copy/launch controller. It refuses source
  drift and authenticates the referenced V91 manifests and packets.
- `control/projection-diagnostic.py`: fixed common-grid projection diagnostic,
  explicitly excluded from qualification.
- `control/app-final.py`, `control/export.py`: offline final checks and
  hash-verified export. No scientific calculation runs on the host.

Paths are installation-specific. Reproduction requires the recorded native
OpenFOAM 14 installation, Python/scikit-fem environment and authenticated V91
packets. Source copies are immutable and separate from the host. Restore the
recorded source/reference maps and retained V91 evidence before replaying;
never overwrite an existing prediction directory or relax a failed gate.

The early/local spatial checks rescore previously observed V91 histories;
they are not held-out spatial predictions. The two new timestep trajectories
were uncomputed at registration. Gate sets overlap and are not independent
experiments to combine into one pass rate. The original V90/V91 failures remain.
