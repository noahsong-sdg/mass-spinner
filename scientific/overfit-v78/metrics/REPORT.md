# Adversarial metric audit

Audit scope: v75 analyze.py, v76 common_space.py, v77 study.py and actual frozen study05/study01. Read-only execution offline in safe-dev; no PDE, sources, plans, old verdicts or thresholds changed.

## P2: Relative wall-heating convergence is not tested by the passing solid-temperature gates

Problem: the 1 K response scale floor in scientific/mixture-axial-v75/analyze.py:110-111, reused at scientific/spatial-v76/common_space.py:55-62 and gated by scientific/spatial-v77/study.py:141-151, makes a microKelvin thermal signal pass even when its relative response is poorly resolved.

Technical cause: max(1 K, max|Tref-350 K|) normalizes absolute temperature differences, not the wall's microKelvin evolution. The two requirements are different. The 0.002 monotonicity exemption is also expressed on this same floor.

Simple cause: the ruler is much larger than the temperature change being tested.

Actual frozen data: at 10/20/40 microseconds the 96x96 reference peak wall changes are 0.336/1.169/4.246 microKelvin. Conservative common-reference comparison of each trajectory's T-Tinitial yields 48-vs96 local differences 29.94/28.74/26.12 percent of that response, with RMS 5.27/5.01/4.57 percent. The 64-vs96 local differences are 21.46/20.12/17.73 percent and RMS 3.31/3.09/2.71 percent. Absolute errors remain tiny: e.g. at 40 microseconds the 48-vs96 local difference is 1.109 microKelvin. This is not evidence of an important absolute-temperature prediction error or an incorrect physical law.

Synthetic profile-only negative control: replacing the 96-grid endpoint solid temperatures by their unchanged initial values loses 100 percent of the temperature response but passes the solid field gate at all three times. This altered state is NOT PDE-generated, NOT admitted by the endpoint/energy checker, and has NOT been tested as a full valid trajectory. It demonstrates the metric's scope only.

Fix: preserve existing absolute-temperature verdicts; explicitly mark relative wall-heating response unqualified. Add heat-flow/enthalpy-response diagnostics and a predeclared thermal holdout with a meaningful wall response, and independently resolve its wall layer. Choose response-scale tolerances from the observable needed, rather than retroactively removing floors or claiming the tiny signal as significant. This is preferable to changing the existing limits until they pass.

Adjacent invariant checked: omega's large background also supplies its normalizer, but actual evolution-relative diagnostics are satisfactory: 48-vs96 local omega-change differences decrease 4.52 to 3.72 percent, and 64-vs96 decrease 1.71 to 1.28 percent. No analogous actual failure is demonstrated.

## P3: Gate count and threshold language need narrow interpretation

scientific/mixture-axial-v75/analyze.py:149-168 scales each observable by its maximum reference magnitude across all output times, not by its instantaneous value. Actual 48-vs96 upper-endwall torque differs by 2.1629 percent of the instantaneous reference at 10 microseconds, while passing the 2 percent peak-history-normalized observable gate. This is an intended mixed absolute/relative convention, not an implementation defect. Reports should say peak-history-normalized difference, and keep signed/absolute discrepancies available.

scientific/spatial-v77/study.py:151 accepts nondecreasing errors when both are below 0.002. Four actual cell-average gates use that exemption despite an increase: three solid and one Y. No actual common-space increasing gate uses it. Therefore a passed decreasing gate is not necessarily observed monotone convergence, as the code explicitly specifies. Record whether each pass used the small-error exemption.

The two metrics are correlated and reuse the same four trajectories and thresholds. Their observable conditions are duplicated; the same-grid temporal field comparisons are also equivalent. 630 is a count of checks, not 630 independent physical tests. No evidence of after-the-fact threshold manipulation was found in this metric audit.

## Validation and artifacts

Exact rerun command:
`/Users/noahs/.local/bin/safe-dev -C /private/tmp/mass-spinner-public-20261110 run -- /work/home/diagnostic-v72-venv/bin/python /work/home/overfit-metrics-v78-20261111/audit_metrics.py`

The preserved script deliberately refuses to overwrite result.json, so replay a copy in a new directory or change only the diagnostic output path. The same source and raw input hashes are stored in result.json.

The diagnostic reproduces 315/315 original gates per metric, computes all response-relative differences from the actual conserved fields and own initial fields, records the four exemption passes, and runs the scoped frozen-wall profile negative control. It does not rerun or independently validate the PDE, experimental data or live playground.
