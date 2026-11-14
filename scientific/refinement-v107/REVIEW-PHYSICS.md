# V107 physics review

**Static scope:** this review traces the producing equations and declared study.
It does not establish that any V107 numerical gate, experimental comparison or
live playground has passed. No project code was executed for this review.

## What is being refined

The conserved state is cell-integrated mass, radial/axial momentum, angular
momentum, total energy and one species mass. The ideal monatomic closure has
\(\gamma=5/3\); energy includes both meridional and rotational kinetic energy.
The cylindrical Euler operator uses MUSCL/HLLC and SSPRK2. Its radial source
integrates the pressure/geometric and centrifugal terms consistently with the
limited reconstructed fields; it adds no energy source.
([flow.py:55](../mixture-axial-v75/flow.py#L55),
[force105.py:20](../source-v105/force105.py#L20))

Each accepted step applies Euler, then the current-conditioned Hall/momentum
solve, then Newtonian stress and heat conduction. The electrical solve uses
the evolving cell mass/inertia and records external electrical work. Mechanical
walls are stationary; the heat boundary is adiabatic. The active FiPy solve is
\(\rho c_v\partial_tT=\nabla\!\cdot(\kappa\nabla T)\), holding incoming cell mass
fixed during that split, with constant positive \(\kappa\). V107 changes mesh
and timestep only, retaining these equations and their ledger checks.
([campaign99.py:75](../coupled-v99/campaign99.py#L75),
[electro86.py:96](../meridional-v86/electro86.py#L96),
[diffusion86.py:184](../meridional-v86/diffusion86.py#L184),
[heat106.py:19](../heat-v106/heat106.py#L19))

## Initial-state and closure limits

Every mesh resamples the prescribed radial density/temperature profiles and
recomputes a discrete steady torsion solution. That initializer balances
current-driven swirl against viscosity **without imposing radial pressure or
thermal equilibrium**. Consequently, refinement compares the complete
initialization-plus-evolution pipeline; differences cannot uniquely be assigned
to a density flux or a later boundary layer. Full saved \(q_0\) makes this
confounding inspectable. The linear radial source profile can also have a
nonzero one-sided derivative at the axis and a slope change at 5 cm; these are
unchanged input compatibility features, not evidence of a newly discovered
solver defect.
([campaign99.py:53](../coupled-v99/campaign99.py#L53),
[electro86.py:80](../meridional-v86/electro86.py#L80),
[transport82.py:46](../electrical-v82/transport82.py#L46))

The hot heavy gas subsequently evolves; its density and temperature are not
frozen. However, electrical conductivity/Hall fields remain prescribed from
the source profiles, current is imposed, and no electron-energy or ionization
closure updates them. Viscosity and heat conductivity remain constant in this
campaign. Both material labels have the same argon mass and initially equal
fractions: this is a conditional one-fluid argon rotation/transport benchmark,
not an independent ion/neutral kinetic model or an isotope-separation test.
([transport82.py:35](../electrical-v82/transport82.py#L35),
[electro86.py:14](../meridional-v86/electro86.py#L14),
[campaign99.py:55](../coupled-v99/campaign99.py#L55))

## What a successful study would establish

The nine cases separately test radial, axial, joint and timestep sensitivity
at 0/1/2/4 microseconds, preserving the original norms, 5% spatial/2% timestep
limits, contraction, quadrature, positivity and conservation gates. This is
the defensible next test of demonstrated radial sensitivity; it does not
identify a unique root cause or establish experimental accuracy.

**Finest-mesh time qualification remains limited:** the CFL 0.2/0.1/0.05 triple
is at r8-z2, not r16-z4. Acoustic CFL adaptation can tighten timesteps on the
finest grid, but does not itself measure its temporal or splitting error.
Even a complete declared-matrix pass must retain that limitation; the bounded
1-microsecond resource preflight cannot replace the full study.
([PROTOCOL.md:47](PROTOCOL.md#L47),
[PROTOCOL.md:74](PROTOCOL.md#L74))
