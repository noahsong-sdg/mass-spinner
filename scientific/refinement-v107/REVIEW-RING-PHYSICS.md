# Independent saved-state ring review

Reviewed by the force-balance reviewer, who did not author this diagnostic or
run its isolated executions. I previously reviewed the source and requested
the constant-velocity/changing-mass regression. This is an independent
interpretation and artifact check, not a second independent solver.

## Evidence checked

Under [ring-evidence-20261114](retained/ring-evidence-20261114/), I verified all
13 exported payload hashes and the three decompressed output hashes. I read
the controller, analysis driver, protocol, six-test receipt and all three
diagnostic outputs serially. No project code, tests or PDE were executed by
this reviewer. The six controls passed in the recorded offline execution;
the largest recorded diagnostic peak was 223,536 KiB.

The driver binds the previously admitted canonical audit
`f63ed0efb04ad2a632ffddc4b2074755d5424b5d2d5490ad6f00ea9a3661cbd5`,
pinned full predictions, and frozen producer source. Direct
`SourceFlow(..., noSlipWalls=True)` reproduces the producer's constructor-only
`CoupledFlow` override. No initialization or evolution is performed.

## Observed results

At the common physical point r=17 mm, z=228 mm, at 4 microseconds:

| Radial cells | Density increment, kg/m³ | Radial density rate, kg/m³/s | Axial density rate, kg/m³/s | Signed relative pressure trace jump |
|---|---:|---:|---:|---:|
| 80 | 5.503842e-5 | 16.260687 | -0.391946 | -0.087120 |
| 160 | 7.152297e-5 | 47.208289 | -0.406726 | -0.025105 |
| 320 | 7.785528e-5 | 77.195358 | -0.326794 | -0.005360 |

These are scalar-Q1 samples of instantaneous discrete rates, not integrated
mass budgets or replacements for the cylindrical convergence norm. At the
same fine-grid point the density increment is zero initially, 1.999891e-8
at 1 microsecond, and 3.123364e-7 at 2 microseconds. The late signal is finite
amplitude, rather than a last-bit initial encoding effect.

Along the sampled z=228 mm line at 4 microseconds, positive-increment peaks
are 5.891488e-5, 7.495441e-5 and 8.200571e-5 kg/m³. Half-maximum widths are
3.993316, 3.218902 and 2.868559 mm. I independently recomputed these from
adjacent-sample linear crossings on the 0.25 mm diagnostic point grid.
They are sampled-profile widths, not exact native or continuum widths.
The fine profile has outward velocity about 1476, 739 and 292 m/s at radii
16, 18 and 19 mm, respectively, with a steep outward pressure decrease.

The radial cell-reference rates at the common point are 18.728420,
46.988037 and 77.172453 kg/m³/s. Reconstruction/Riemann reference differences
are respectively (+8.024315, -10.492049), (+8.658275, -8.438023), and
(+2.726259, -2.703355). Thus substantial mesh dependence remains in the
evolved cell reference, while the latter two terms mostly cancel on the
finer grids. Those signed terms are not unique physical/numerical parts.

All recorded boundary mass fluxes are exactly zero. Global integrated mass
rate cancellation residuals are at most 2.16e-20 kg/s. Maximum native and
projected decomposition defects are 2.85e-14 and 8.53e-14 kg/m³/s.

## Interpretation and next diagnostic

The sharpening ridge, increasing peak and decreasing pressure trace jumps
support underresolution of an evolving compression feature. They do not
identify HLLC, the limiter, thermal forcing or initial torsion as a unique
cause. Local radial dominance at one late point does not exclude earlier
axial/endwall redistribution or indirect electromagnetic/thermal forcing.
Each mesh still has its own steady-torsion initialization.

A separately declared higher-radial-resolution control would test further
spatial contraction without tuning solver coefficients. A full 640-cell run
could cost about eight hours under naive quadratic scaling from the measured
320-cell trajectory; this is an estimate, not a measured runtime or resource
admission. A bounded resource preflight and frozen protocol must come first.

The smallest additional attribution probe is a separately sealed, frozen-state
electromagnetic and stress/heat split-response probe at the same four clocks,
using a common small timestep and its half. Compare pressure, thermal energy
and velocity responses over the ring and upstream core/endwall, retaining
signed transport and work receipts. Verify unchanged cell masses and
timestep-stable response estimates. These are counterfactual one-step
responses, not accepted-stage history or accumulated causal attribution.
If attribution remains ambiguous, an unchanged-physics instrumented
trajectory must retain both SSPRK stages and each subsequent split's pressure
change; four snapshots cannot reconstruct those histories.

No coefficient tuning or PDE change follows from this probe. The real
4-microsecond density increment failure (5.595688% > 5%), original six V106
failures, strict q0 contraction failures and incomplete axial matrix remain.
