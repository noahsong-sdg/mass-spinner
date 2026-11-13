# Independent V101 review

Accepted for the bounded performance/numerical implementation, not experimental
qualification. Inspected retained final04/final06 sources, manifests, execution
logs, failing controls, equivalence, benchmark, fields, optics and audit results.
All manifest entries and current Python/protocol inputs match; log hashes and
five field/four optical packet seals match. Summary result hashes also match.
The reviewer traced initialization, split evolution, Euler/HLLC reconstruction,
electrical heat, stress/conduction, geometry admission and optical scoring.
No scientific execution, VM operation or browser observation by this reviewer.
The checker geometry extension below was implemented by this reviewer.

## Performance changes

Profiling identified sparse solves and vector interpolation as dominant work.
The flattened electrical scatter preserves ordered face/half accumulation with
`np.add.at`, including repeated cells and signed Hall cross terms. Every face
has exactly two series halves. Ports remain; no canonical consumer of removed
`self.segments` was found. This removes repeated Python work and tuple storage
without freezing evolved velocities, density, inertia or timestep.

Scalar-component interpolation preserves vector DOF mapping, six cylindrical
strains and the order-6 Gauss rule. Bounded stress assembly covers each element
once with global DOFs, then applies the original prolongation. Full-matrix
comparisons with batch lengths 3/7 include a partial batch. Arbitrary full
velocity traces, variable viscosity, cellwise heat and stiffness/work controls
check equivalence. Minimum-degree sparse ordering changes factorization fill,
not equations; capacities and factorizations remain fresh every step.
Review found batching broke full-grid coefficient arrays and changed callbacks'
evaluation domain. Evaluating viscosity once on full scalar quadrature and
passing its exact batch slices restores the contract and shared heat/stress
values. Full-array/global-callback controls fail before and pass after the fix.

The first raw dense reference was ill-conditioned in mixed momentum units and
zero-capacity trace rows. Retained diagnostics show condition 6.9e11, reduced
to 2.38 by diagonal congruence scaling. Corrected tests retain tight tolerances,
physical mass/inertia/heat capacities and a separate `rhs=A@known` control.
This repairs the reference, not a demonstrated production-solver defect;
retain the original failure and conditioning diagnostic.

Final06 logs confirm 90 controls passing and three alternating fresh-worker
152-step pairs: median 28.182 to 19.593 s, peak 382756 to 284072 KiB;
1.438x speed and 25.8% worker-peak reduction. All six conserved components
differ by at most 6.41e-13 against the unchanged 1e-10 screen. This is a bounded
benchmark, not full-campaign, browser or host-memory performance.

## Fixed-input numerical fidelity

Actual FV quadratic averages contain cell-variance terms; a pointwise weighted
derivative omits them. Even an exact quadratic derivative in a linear MUSCL
polynomial cannot give quadratic-exact face values. The controls respect that
distinction, and no unsupported slope-only production fix was introduced.

The candidate nested Hermite map aligns the fixed 5 cm source clamp and smooths
spacing transitions. Positive endpoint secants avoid unnecessarily tiny
boundary cells. It changes radial count from 16n to 20n as well as alignment
and grading; improved error is not attributable to alignment alone. Physical
source functions, contacts, current, transport, clocks and equations stay fixed.
Initial density-rate improvement alone cannot qualify the evolved solution,
particularly at a source derivative kink or the separate endwall layer.

The legacy checker hard-coded the old grid and counts. An optional explicit
expected-geometry callback admits the declared candidate while preserving
default legacy admission, saved-edge precision and every existing gate.
`geometry101.py` independently evaluates fixed Hermite polynomials and harmonic
slopes without SciPy or the producer helper. Controls admit the candidate and
reject stale old geometry, altered edges and counts. This is smaller and safer
than copying the auditor or weakening geometry checks.

Full final04 study: six failed spatial gates in 119866 checks; density-increment
changes 21.6–23.9%, radial flow 7.09–9.73%, versus 5%. All contraction/timestep
gates pass; largest fine timestep change 0.214% versus 2%. Final06 retains its
own identity: nominal constructors/operators at n1/2/4 and a 91-step state are
bitwise identical to final04. No full-study source seal was relabeled.

## Experimental boundary

V100 had ten spatial failures; V101 still fails the argon comparison, with
zero all-point matches across 288 alternatives and local temperature 617763 K.
The model retains single-heavy-temperature Ohmic heating,
prescribed ionization/transport, regularized contacts and adiabatic walls.
Numerical improvements cannot qualify that apparatus closure. All 72 optical
alternatives at every time and every measured point remain; the data are
retrospective, and the first axial cell is only a near-midplane proxy whose
height changes with the grid. No favorable time/diagnostic selection, fitting,
experimental qualification or live-playground/GPU verification is claimed.
