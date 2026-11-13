# Follow-up to the failed cyclic evolution

The registered nr16/nz32 256-step cyclic/leastSquares rigid case developed
nonfinite U by 10 microseconds. The solver exited 0; field admission rejected
the output. The initial gradient passed, so this is a separate evolution defect.
The failed source04 trajectory is retained, and the main campaign is incomplete.

Before further runs, register nr16/nz32 rigid controls over the same 20 us:
512 and 1024 steps with one outer corrector, and 256 steps with two and four
outer correctors. All retain the same sector, gradient, coefficients, initial
conditions and pressure settings. Compare saved strain, swirl change and
meridional flow to the original 1e-6 gates; nonfinite values fail, regardless
of solver exit status. Record iteration-limit occurrences and native identities.

Prediction: a timestep-dependent explicit coupling defect should improve as
dt decreases. Insufficient outer pressure/velocity iteration should improve
with additional outer correctors at fixed dt. Neither improvement alone proves
spatial convergence or experimental fidelity. No new default is authorized by
these exploratory diagnostics; changing geometry/operators requires a new
registered comparison.
