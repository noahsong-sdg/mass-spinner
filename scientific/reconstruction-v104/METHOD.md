# Pressure reconstruction candidate

This subclass changes only radial pressure reconstruction and its geometric
source. Shared `Flow`, density/velocity reconstruction, HLLC, SSPRK2, physical
inputs and qualification gates are unchanged. It is not production adoption.

The construction follows the cylindrical volume-moment formulation and monotone
parabolic constraints in [Mignone (2014), sections 2.2 and 3.3, equations
45–48](https://arxiv.org/abs/1404.0537). We apply those constraints to departures
from V103's local centrifugal reference. This is a component-wise adaptation,
not the complete PPM algorithm or a TVD proof for the coupled Euler system.

In each interior annulus, fit neighboring **cell averages** with
`δp = b*(r-c) + C*((r-c)^2-v)`, where `c=<r>` and `v=<r²>-<r>²` use cylindrical
volume weighting. This departure has zero owner-cell volume average. Neighbor
departure averages subtract the owner's equilibrium extrapolation, so native
rigid isothermal equilibria retain zero departure. Moment fitting replaces
pointwise interpolation; it does not change the conserved state representation.

Clip each departure edge between zero and its adjacent departure average, then
apply the cylindrical parabolic monotonicity conditions using
`h_plus/minus = 3 +/- width/(2*geometric_midpoint)`. Recover `b,C` from the limited
edges and zero volume average. Unlike an extremum-preserving variant, this
standard limiter flattens resolved smooth departure extrema too. Its accuracy
cost must remain visible in refinement tests; exact quadratic accuracy is
claimed only where the monotonicity constraints are inactive.

The first and last annuli retain V103's reflecting-wall equilibrium pressure
stencil, with zero departure. No polynomial is extrapolated across a solid wall
or the symmetry axis. A two-annulus grid therefore has no interior Q2 stencil.
Boundary accuracy is not upgraded. No source-profile kink is detected or moved.

For positivity throughout the cell, find the quadratic departure's minimum from
its edges and vertex. The local exponential pressure is bounded below by its
inner edge. Scale both coefficients toward zero only as needed to keep that
lower bound positive, retaining the volume average without a physical floor.

The pressure geometry correction uses the **final limited coefficients**:
`2*pi*dz*(-b*width^3/(12*midpoint) + C*width^5/(72*midpoint^2))`.
This integrates `δp dr` stably. It adds no angular-momentum or energy source.
The centrifugal density/rotation source keeps V103's second-order treatment;
neither full third-order consistency nor improved experimental agreement is
claimed. Both require separate evidence, and existing convergence gates apply.
