# Post hoc fixed-panel integration

12 November 2026. Independent checker extension, outside the frozen producer.
No numerical execution by its author. Original field and quadrature failures,
thresholds and `allRequiredNumericalPass=false` remain unchanged.

The frozen audit uses global Gauss points over the whole r/z domain. Its
interpolants are piecewise bilinear, with derivative changes at every padded
centroid-grid line. A single global quadrature rule is therefore not integrating
a single smooth polynomial, and can underresolve the interpolation knots.

`panel86.py` forms the union of both interpolants' physical r/z grid lines,
including the original axis/midplane/wall extensions. Each resulting rectangle
contains one bilinear expression from each interpolant. Their squared difference
has degree at most two separately in r and z; the cylindrical volume weight r
raises the radial degree to three. Two-point Gauss in each coordinate is exact
for these polynomials, up to floating-point evaluation. Orders 3 and 4 provide
independent quadrature-order witnesses; raw squared-error/reference integrals
must agree within relative 1e-10, with exact zeros treated explicitly.

The supplement preserves the original interpolation, whole-field normalizers,
shared meridional vector scale, density/temperature increments, 5% spatial and
2% timestep gates and contraction rule. It does not alter a prediction or fit
an input. The exact integration is a post hoc diagnostic, not a replacement
prospective qualification. It also reports equality of actual timestep
sequences: lowering an inactive maximum-step cap is not timestep refinement.

The reader checks the original audit's prediction/source binding, frozen
baseline, producer source hashes, all 26 jobs, compressed/raw field seals,
saved primitive/energy ledgers and declared schedules. It records separate
supplemental checker hashes. The original failed audit is read, never edited;
overall qualification stays false even if supplemental gates pass.

Tests cover analytic squared bilinear fields with exact cylindrical integrals,
nonuniform panel volume, piecewise-interpolant orders 2/3/4, zero and arbitrarily
small flow scales, inactive-step contraction, failed-original preservation,
bad seals and invalid/nonfinite fields. These controls establish integration
and admission behavior, not local PDE accuracy or experimental fidelity.
