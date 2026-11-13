# Near-axis reconstruction and rotational periodicity

V95 exposed nonzero strain for rigid rotation on the collapsed wedge before
time evolution. This follow-up isolates native boundary/reconstruction effects;
it does not change physical coefficients or assert experimental qualification.

Before new predictions, register these initial-field probes at nr16/nz32:

- Wedge Gauss linear and leastSquares at half angles 0.5, 0.25 and 0.125 degrees.
- Rotational cyclic Gauss linear and leastSquares at half angle 0.5 degrees.
- Exact rigid-rotation velocity on both sector faces, with ordinary patch mesh
  types, using Gauss linear and leastSquares at half angle 0.5 degrees. These
  prescribed-face controls are diagnostic only and cannot become a live boundary.

All initialize U=Omega*(-y,x,0), Omega=A/R, and p=Omega^2*r^2/2 using the
unchanged V94 coefficients and amplitude. Solid walls co-rotate using native
rotatingWallVelocity; the axial midplane remains symmetric. Report max and
volume RMS symmetric deviatoric strain/Omega and errors in the full analytic
gradient. Fixed initial strain gate: max <1e-6, unchanged from V95.

If native rotational cyclic + leastSquares passes the initial gate, evolve
that candidate without changing the native library or custom diffusion code:

- Rigid rotation nr16/32/64, nz=2nr, 256 steps; nr64/nz128 also 128/512 steps.
- Bessel decay nr32/64/128 with nz128, 256 steps; nr64/nz128 also 128/512 steps.

Use V94's 20 microsecond horizon, clocks 0/5/10/20 microseconds and axial grade4.
Rigid gates at all saved clocks: max strain/Omega <1e-6, max swirl change/A
<1e-6 and meridional/A <1e-6. Analytic whole and response errors, globally and
in the physical upper-wall band, retain the V95 5% bound; apply accuracy gates
to the nr128/nz128 spatial endpoint and nr64/nz128 512-step endpoint. Report
all other errors and successive radial/time changes without waiving failures.
The existing pure-diffusion custom solution is a comparison, not ground truth.

Reject incomplete campaigns, mismatched metadata, source/native identity drift,
nonfinite fields, missing clocks and stale wedge packets. Preserve failed runs.
Only write requested output clocks for gradient function objects to keep raw
evidence bounded. If the candidate fails the initial gate, retain all probes and
identify the next falsifiable intervention; do not silently choose a new winner.

A passing initial gradient does not establish stress-divergence, pressure,
energy/torque, coupled compressible or experimental qualification. A candidate
passing these controls still needs coupled release and joint convergence gates
before adoption. Existing live and scientific defaults remain unchanged.
