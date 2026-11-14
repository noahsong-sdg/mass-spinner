# Stable arithmetic for the existing field norm

The axial preflight exposed a checker defect, not a newly identified flow
instability. At the initial clock, density and temperature profiles differ
only around the rounding level of the saved state. The old checker evaluates
two large, nearly equal interpolants separately in binary64 and subtracts
them. Interpolation rounding can then be comparable to their true difference.
Squaring this sampled noise no longer gives the intended bilinear polynomial,
so nominally exact Gauss orders 2/3 disagree.

In plain terms, the checker rounded two large numbers before measuring a tiny
gap between them. It was measuring part of its own rounding error.

## The observable is unchanged

Each saved scalar field has the original padded piecewise-bilinear, or Q1,
interpolant. Density and temperature retain edge padding. Velocity and angular
speed retain the original wall, axis and midplane zero-value rules. Centroid
knots are computed by the original binary64 expressions; recomputing those
coordinates as exact rational centroids would change the observable.

On the union of both interpolants' knots, their difference is also Q1:

\[
D(r,z)=A(r,z)-B(r,z)=\sum_{i,j=0}^{1}d_{ij}N_i(r)N_j(z).
\]

The metric's error and reference integrals remain

\[
E=\int D^2\,2\pi r\,dr\,dz,\qquad
R=\int B^2\,2\pi r\,dr\,dz.
\]

Density/temperature increments are formed by the original binary64 subtraction
of each trajectory's own initial samples. Each velocity component still uses
the common denominator \(R_{v_r}+R_{v_z}\). No background norm replaces an
increment norm.

## The arithmetic change

`stable107.py` treats the existing floating-point knots and sample values as
exact rational numbers using Python's standard `Fraction`. It evaluates both
Q1 interpolants exactly at union-grid knots and subtracts there, before any
rounding. Each resulting difference sample is converted once to binary64.
The existing SciPy interpolator then evaluates this small difference field on
the original Gaussian panels. The reference field still uses the original
`audit86.interpolate`. Subsequent interpolation, integration and normalization
retain their usual floating-point rounding.

Gauss order 2 integrates a squared Q1 field times the cylindrical radial weight
exactly in exact arithmetic; order 3 remains the independent panel check.
The 5% spatial, 2% temporal, contraction and 1e-10 panel limits are unchanged.

This approach removes the demonstrated large-background cancellation without
clipping small errors, flooring a denominator, skipping initial clocks or
selecting an adaptive precision threshold. It also avoids the cancellation
in the expanded expression \(A^2-2AB+B^2\). It uses established rational
arithmetic and SciPy interpolation, without changing a producing equation.

## Validation and cost

Seven root-run controls pass: analytic one-ulp constants, identical functions
on different grids, mixed-grid Q1 polynomial integrals, agreement with the
separate 60-digit Decimal mass integral, velocity boundaries, increment and
reference semantics, and preservation of a real discrepancy above 5%.

The actual legacy-plus-preflight replay took 43.54 seconds and 396,132 KiB peak
RSS. This is postprocessing cost, not PDE runtime or a scaling guarantee.
Rational interpolation is more expensive than direct binary64 evaluation;
larger studies must measure its cost before optimizing it.

The new canonical result is separately sealed as `stable-audit.json` with an
explicit metric-implementation hash. Original failed artifacts remain intact.
Passing this checker does not establish continuum error bounds, experimental
accuracy, correctness of a transport closure or live-playground qualification.
