# Axial shear and endwall torque: research backend

10 November 2026. **Numerically verified constrained torsional transport;
not experimental qualification or complete reactor hydrodynamics.** No live
application, defaults, controls, assets or deployment changed.

## Execution path and change

`fuel-spatial-operation.ts` repeats one radial angular-velocity field into the
electrical r-z grid and sums axial torque back into radial cells. This makes
axial viscous shear identically zero. In simple terms, every slice must rotate
the same way, so the model cannot represent endwall braking or axial differences.
This is a known reduction, not an identified cause of the experimental residual.

The new research solver uses actual **NIST FiPy4.0.3** cylindrical 2D diffusion
and SciPy LU, with fixed prescribed density/viscosity and integrated cell torque:

```
rho*r²*dOmega/dt = (1/r)*d(mu*r³*dOmega/dr)/dr
                  + d(mu*r²*dOmega/dz)/dz + r*f_theta
```

It supports stationary/rotating walls and zero-stress boundaries. The axis is
regular fluid, not a wall pinned at zero angular speed. Cell inertia and axial
stress use the annular average of r²; radial faces use their actual r².
This preserves the correct cylindrical lever arm, including the first cell.
Harmonic viscosity supports prescribed material interfaces. Its radial face
approximation differs from v65's exact half-cell resistance at finite resolution;
the study checks the common continuum limit, not bitwise matrix identity.

Angular momentum, body work, wall work, physical discrete viscous heat and
backward-Euler numerical loss have separate ledgers. Stationary walls can remove
angular momentum with zero mechanical wall work. Time-dependent density and
compatible mass advection are outside this solver's domain.

FiPy reuses an established discretization/linear-solver implementation. Keeping
this extension separate is preferable to silently replacing the coupled live
model: gas/species transport and thermal coupling still use a radial grid.
A later integration needs compatible axial fields and work/heat transfer,
rather than averaging away the new degree of freedom.

## Evidence

Thirteen frozen controls passed a separately assembled SciPy sparse torque
graph, without importing FiPy or the primary solver. Independent analytic
checks cover absolute cylinder inertia, layered axial Couette flow and end
torque, axial decay, and the radial core/annulus limit.

| Control | Coarse → fine error | Frozen final gate |
|---|---|---|
| Joint r/z manufactured steady refinement, 8→16→32→64 |0.3302%, 0.0848%, 0.0228%, 0.00590% of exact peak|<0.5%|
| Axial decay, 8→32→128 timesteps on fixed 4x32 mesh |2.2268%, 0.5998%, 0.1735% of initial amplitude|<1%|

The decay comparison also matches the exact discrete BE eigenmode, separating
timestep and spatial effects. Every transient step passes the 1e-9 exchange-scale
angular-momentum and energy gates plus declared storage roundoff. These are
numerical controls, not measured device accuracy estimates.

With identical illustrative forcing and geometry, stationary endwalls reduce
total angular momentum to 77.70% of the free-end value and take part of the
balancing wall torque. The computed axial field obeys the expected ordering.
This sensitivity is not a fitted experimental boundary condition or an inferred
Marathon braking factor. Existing field/profile/pressure failures are unchanged.

An adversarial review found that finite angular speed could overflow its derived
energy: a number can fit while its square cannot. NaN residuals can then evade
ordinary tolerance comparisons. The new solver rejects nonfinite derived
inertia, momentum, energy, power and ledger values, with a regression at finite
Omega=1e200. Rejecting an unrepresentable state preserves the balances; clipping
speed or energy would fabricate a different physical state.

## Limits and reproduction

This solves only the theta-momentum equation with zero radial/axial velocity.
Axially varying centrifugal force generally requires meridional pressure/flow
physics for full equilibrium. No secondary circulation, evolving density,
ion-neutral slip, plasma/electron closure, temperature prediction, or coupled
current/thermal evolution is established. The actual experimental diagnostic
and independently constrained current/temperature boundaries remain necessary.
General 2D variable-property continuum refinement and joint r-z-time transient
boundary-layer refinement remain unqualified.

[Frozen protocol](../scientific/axial-v73/PROTOCOL.md) ·
[Full cases and fields](../scientific/axial-v73/accepted/report.json) ·
[Independent reconstruction](../scientific/axial-v73/accepted/independent-check.json) ·
[Physics review](reviews/v73-axial-physics.md) · [Scope review](reviews/v73-scope.md) ·
[Results review](reviews/v73-results.md)

Run in a copied safe-dev VM with FiPy4.0.3, NumPy2.4.6 and SciPy1.17.1:

```sh
python -m unittest discover -s scientific/axial-v73 -p 'test_*.py' -v
python -m unittest discover -s scientific/diagnostic-v72 -p 'test_*.py' -v
python scientific/axial-v73/run_report.py /tmp/axial-report.json
python scientific/axial-v73/independent_check.py /tmp/axial-report.json
npm run typecheck
npm run build
npm run check:site
npm run check:assets
```

**6 new tests and 7 adjacent tests pass**, including stale/corrupt evidence,
invalid domains and nonfinite derived-energy rejection. The 13-case study,
independent reconstruction, typecheck, build, site and asset checks pass. The
existing bundle-size warning remains. No full application-test rerun or deployed
browser/GPU check is claimed for this research-only extension.

The tested 1,566-file safe-dev source archive is SHA256
`332c3455ecd398f46276cd24b8c4d3971fae11b100b6887d7497c169712a1da2`.
The accepted report binds all five scientific sources/protocol/tests; exported
hashes match the original checkout. Later additions only record these results.
No acceptance tolerance was loosened and every coarse control remains recorded.
