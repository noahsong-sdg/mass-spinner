# Retained first narrow-check failure

The physical campaign completed before this check. Its three field/history
packets and prediction hash did not change during the fix.

The first narrow run passed nine study/report/launcher controls, then one of
ten independent controls errored: a synthetic cap-limited trajectory was
reported as having an incomplete reporting-state CFL inventory. Subsequent
checks were not run by that attempt. Its receipt, logs and exact auditor/test
sources are retained here.

Root cause: `abs(snapshot.timeS - timeBeforeS) < 1e-16` identified both a tiny
roundoff residual step immediately before a reporting event and the actual
event as the same saved state. Checkpoint identity now requires exact equality
to the declared reporting time. The numerical CFL comparison and all
conservation/field-convergence tolerances are unchanged. An additional control
constructs the residual step explicitly. Deduplicating matches or relaxing the
required checkpoint count could hide a missing event; exact identity fixes the
actual bookkeeping error.

Export: `/private/tmp/mass-spinner-timestep-v87-narrow-failure-export01`.
Failed checker sources are also available at Git commit `edd7374`.
