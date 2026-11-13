# Reconstruction triage

The derivation below is an independent source review. The coordinator's safe-dev
study supplies execution evidence, summarized in [V101](../../SPATIAL-FLOW-V101.md).
No shared solver or acceptance threshold was changed by this reviewer.

Ranked, falsifiable hypotheses:

1. The source derivative clamp at 5 cm produces localized pressure-state mismatch
   in a piecewise-linear reconstruction. Align the fixed clamp with a grid face,
   retain the original physical functions, and compare local face jumps and
   evolved integral errors. Initial density-rate RMS alone is not a convergence
   gate: the exact instantaneous density derivative vanishes, but an acoustic
   Riemann discretization responds to its finite reconstruction error.
2. Abrupt adjacent widths contaminate smooth-profile slope and face errors.
   Compare exact linear/quadratic **cell averages** on the original grid and a
   monotone C1 geometric map, independently of any apparatus velocity data.
3. Centroid-sampled initial pressure is not its true cell average. Compare
   cylindrical quadrature of the unchanged source functions, splitting at the
   clamp. This distinguishes initialization projection from the flux algorithm.
4. Endwall/cathode viscous layers remain under-resolved. Source-grid controls
   cannot settle this separate evolved-flow error; preserve the wall-region
   diagnostics, timestep study and original 5% spatial gates.

## What the current reconstruction guarantees

`Flow.primitive` recovers volume-averaged density and internal-energy pressure,
but mass-weighted velocities and inertia-weighted angular speed. These are not
all point samples. `_face_states` uses a limited linear polynomial centered at
the geometric volume centroid. It reproduces linear scalar cell averages on
graded cells. Its centered secant is not an exact quadratic derivative on an
abruptly graded mesh. That fact alone does not prove the MUSCL operator has lost
its expected second-order face-value consistency.

For cell mean `a_i`, centroid `c_i`, and variance `v_i=<x²>_i-c_i²`, write a
quadratic as

`u(x)=a_i+b_i*(x-c_i)+C*((x-c_i)²-v_i)`.

For neighbor `j`, `a_j-a_i=b_i*d_j+C*e_j`, with
`d_j=c_j-c_i` and `e_j=d_j²+v_j-v_i`. Solving the two neighbor equations gives
the exact quadratic derivative `b_i`. The controls implement this independent
formula. In cylindrical cells `<r²>=(r_lo²+r_hi²)/2`; axial cells use
`<z²>=(z_lo²+z_lo*z_hi+z_hi²)/3`.

The familiar unequal-point derivative omits the variance differences. More
importantly, even the correct derivative in a *linear* reconstruction omits
`C*((x_face-c_i)²-v_i)`. For axial widths `h_i`, its quadratic face error is
`-C*h_i²/6`; unequal neighbors therefore still have different face states.
Demanding quadratic-exact faces from a slope-only change would be an invalid
regression contract. Full parabolic reconstruction would be a broader method
change requiring new positivity, limiting, contact, wall and conservation
controls. The current evidence does not justify that escalation yet.

## Source-aligned refinement

Keep MUSCL/HLLC unchanged. `reconstruction101.py` offers a **diagnostic-only**
Hermite coordinate map with PCHIP interior slopes through fixed source/contact
and wall-resolution cuts. Endpoint slopes equal their adjacent interval secants:
plain PCHIP can clip one to zero at a strong spacing change, unnecessarily
making the endpoint cell and acoustic timestep scale as n^-2. The map changes
geometry spacing, not the physical density, temperature,
conductivity, current or observed velocities. Sampling the same parameter map
at doubled resolution gives exact nested grids. The candidate adds the fixed
5 cm source face, so radial count changes from 16n to 20n; it is not a pure
alignment experiment or an established speed improvement. The old axial cuts
and count remain, with smoother spacing transitions. The completed coupled
campaign still fails six spatial gates: density-increment differences of
21.6–23.9% and radial-velocity differences of 7.09–9.73% exceed the unchanged
5% screen. Improved initial-rate behavior does not qualify the evolved fields.
The research grid has not replaced the live model.

The executable probes report face errors/jumps without imposing an impossible
quadratic-exactness gate. Source quadrature compares orders 8/16 and sampled
versus integrated initial density/pressure. The zero-swirl projection probe is
not a replacement for the coupled steady-torsion initializer, whose kinetic
energy and angular momentum require their own consistent volume integration.
The script also reports zero-meridional initial density-rate RMS, integrated
square, mean absolute rate, face mass flux, and overlapping cylindrical regional
fractions, separately for centroid-sampled and projected sources. Pressure-
equalized controls preserve each density profile and isolate contact leakage.

No experimental or live-playground qualification follows from these controls.
