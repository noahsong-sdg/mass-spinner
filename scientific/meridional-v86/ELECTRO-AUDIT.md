# Independent electromagnetic source review

12 November 2026. Source review and regression authoring; no project or test
execution by this reviewer. The parent must run the tests in safe-dev and bind
the actual tested snapshot. No pass or experimental qualification is claimed.

## Execution path and equations checked

`Electro.__init__` constructs conservative internal charge edges and distributed
finite Neumann contacts. `advance` solves potential, angular velocity and radial
velocity in one backward-Euler block. Density/inertia come from current FV mass.
The same series-segment currents enter charge, Lorentz momentum, Ohmic heating
and port voltage. The solve then updates total energy, not temperature directly.

The signs agree with `Eprime=E+u cross B`, positive source Hall magnitude for
positive axial B, and conventional current: the azimuthal force is `-B Jr`;
the radial force includes positive Hall-current forcing and negative radial
magnetic damping. The latter contains `B^2 (sigmaP+h^2/sigmaP)`, not just
`sigmaP B^2`. Reversing B requires reversing signed Hall conductivity too.

The internal segment heat `I^2 R-2 I m ur`, plus the cell damping term `K ur^2`,
is the discrete complete-square representation of the symmetric conductivity
heating; the Hall coefficient is not itself a dissipative conductivity.
Its physical positivity and geometric consistency require numerical tests and
refinement, not merely the algebraic total-energy identity.

For endpoint force work `W=dt u_new dot F_new`, backward Euler gives
`delta K=W-D_BE`, with positive
`D_BE=.5 sum(mass delta_ur^2+inertia delta_Omega^2)`.
Therefore `Wsource=Qohmic+W=Qohmic+delta K+D_BE`, while
`delta internal=Qohmic+D_BE`. The implementation keeps Qohmic and D_BE
separate. D_BE must not be relabelled physical Joule heat or added again to
electrical source power. Vanishing D_BE under timestep refinement is required.

## Independent tests supplied

`test_electro86.py` reconstructs currents directly from cylindrical distances,
areas and conductivities, independently of the producer D/T/M/G matrices. It
checks every charge row, both transverse impulses, segment heat and contact
voltage/power. Other tests cover BE internal/kinetic/total-energy accounting;
exact BE radial relaxation with zero/positive/negative Hall coefficient;
current reversal; simultaneous B/Hall reversal; B=0 electrical heating;
partial-contact overlap; discrete boundary-current torque moment; and invalid
conductivity, contact geometry or timestep rejection. Inputs use no measured
velocities or measured-current calibration.

The exact discrete torque uses current-weighted **cell center radii** at the
cathode, not the continuum uniform-disk moment a^2/2. The difference is a
spatial discretization error that must converge as the finite disk is resolved.
The contact itself is a declared regularization: the paper's 4 mm hollow
cathode inner radius does not identify a uniformly emitting solid disk.

## Remaining qualification requirements

These source tests do not independently verify the full FE diffusion assembly,
Euler transport, optical operator, coupled timestep splitting or source-property
closure. Full V86 admission still needs independent diffusion/energy controls,
local and global coupled ledgers, radial/axial/time/joint refinement, positive
states, boundary-layer resolution, finite-contact voltage/heat convergence and
the meridional line-of-sight spectrum. A converged implementation can remain a
conditional model when transport coefficients/electron temperature are frozen
and the thermal/mass boundaries are not measured.

For a closed adiabatic release, electrical energy accumulates. A mechanically
slow-changing state is not thermal steady state. Retain the prescribed release
times and complete trajectories rather than selecting the time closest to
stationary experimental speeds. Do not use numerical agreement between two
implementations as experimental validation.
