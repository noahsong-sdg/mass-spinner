# Prospective independent review: active-CFL refinement

12 November 2026. Before V87 predictions. No project/scientific code, VM,
dependency installation or Git action executed by this reviewer. V86 sources,
results and failed qualification remain immutable.

## Root cause and permitted scope

V86's nominal 0.1/0.05/0.025 microsecond limits were maximum caps. The acoustic
CFL already controlled almost every step: the first two trajectories both took
654 identical steps, and the third took 655. Their failure to contract does
not establish a large timestep error; that experiment did not meaningfully
refine accepted timesteps.

The smallest useful continuation is exactly three trajectories on the same
64x96 grid, first frozen scenario `linear-finite-te1`, anode center 0.07 m,
with acoustic CFL 0.2/0.1/0.05 and the same 0.1 microsecond maximum cap. Reuse
the unchanged V86 initialization, conservative hydro, monolithic Hall source
and full-stress/conduction operators in the same Lie order. Keep all reporting
times 0,1,2,4 microseconds, physical coefficients and source/thermal boundaries.
Do not read measured velocities or choose a trajectory/clock by optical score.

This study addresses time accuracy of one conditional, spatially unresolved
release. It cannot repair the 64 V86 spatial exceedances, 335 original
quadrature failures, experimental mismatch, all-heavy heating or missing
electron/ionization/radiation/wall closure.

## Required prediction and activity evidence

- Record all accepted dt values and cumulative times, the reporting target,
  actual acoustic candidate, maximum cap and selected limiting reason. Require
  each accepted dt to equal the declared minimum to arithmetic precision, and
  each trajectory to land on every fixed reporting time without omission.
- Demonstrate that changing CFL actually decreases the accepted-step schedule,
  not only its label. Agreed prospective activity screen: step count rises
  by strictly more than 1.5x for each halving, maximum accepted dt decreases,
  and at least 95% of non-report-truncated steps are limited by acoustic CFL.
  These are study-design checks, not
  physical accuracy thresholds or an estimated order of convergence.
- The CFL=0.2 run must reproduce the frozen V86 case. Require the same grid,
  entire state/history packet bitwise in both raw and compressed form; record
  full-state hashes and exact decoded equality. If equality fails, stop and
  diagnose rather than waive a source/initialization difference. New schedule
  metadata lives in the predictions packet outside the frozen state schema.
- Preserve the old prediction/selected field compressed/raw SHA bindings and
  the actual imported numerical source hashes. Seal the explicit nine-file
  physical driver/protocol/dependency inventory in predictions; record checker
  source hashes separately in the audit receipt. A scorer-only change must not
  invalidate an unchanged physical trajectory. Importing V86 `initialize` does not require rerunning its 26-case
  comparison or treating unrelated optical/scoring code as new physics. Record
  all genuinely imported physical dependencies, including V75 flow, V82/V81
  transport and viscosity data, plus numerical package versions.

## Independent audit and gates

Reconstruct every saved primitive field, EOS and inertia from the six conserved
FV arrays using natural-Ar mass 39.948 u. Check positive mass/internal energy,
passive-species bounds, full three-component kinetic energy and unchanged
source inputs. The two equal masses are a single-Ar control, not an ionization
or isotope model.

Require mass/species relative drift <1e-10, closed total-energy versus cumulative
electrical-work discrepancy <1e-8, and normalized charge residual <1e-9. Check
every saved reporting-time budget independently. Intermediate producer residual
scalars cannot independently establish all unsaved local PDE rows; retain that
evidence boundary. Keep Ohmic, physical viscous and EM/viscous BE-defect heat
separate; do not call their sum the complete numerical entropy budget.

Compare all reporting times on the unchanged fixed physical domain using the
same bilinear interpolants and exact union-panel integration as the V86
supplement. On a fixed grid the knots coincide, but the cylindrical squared
error still requires its r weight. Two-point Gauss per coordinate is exact for
the interpolant polynomial; orders 3 and 4 must agree to the declared 1e-10
relative raw-integral tolerance, including exact-zero treatment.

The prospective temporal gate remains **finest relative RMS change <2% and
contraction** against the preceding pair, for rho,T,Omega,ur,uz and separate
rho/T increments from each trajectory's own initial state. Normalize ur and uz
by the fine meridional vector RMS; other fields by their fine RMS. Add no
arbitrary physical floor. If both compared fields/increments are exactly zero,
the difference is zero and the gate passes. If the fine scale is zero but the
error is nonzero, report an unresolved relative comparison and fail it. Keep
absolute RMS values so tiny changes are interpretable.

At t=0 identical initialization gives zero pair differences; that is a
reproduction control, not evidence of finite-time accuracy. Retain all failed
field, activity and conservation gates. Do not relax contraction because a
curve appears visually unchanged. Passing the new one-slice temporal screen
would establish only bounded numerical time accuracy relative to these finite
references; spatial and physical qualification remain false.
