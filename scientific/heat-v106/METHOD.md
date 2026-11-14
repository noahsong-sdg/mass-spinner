# V106: put conduction on the conserved cells

The old heat substep uses an axisymmetric Q1 finite-element stiffness matrix
but places heat capacity only at FV centroid nodes. Its additional boundary
nodes have zero capacity. Their algebraic natural-boundary equations include
tangential conduction, not just the physical zero normal flux. A radial
temperature field can consequently develop artificial axial variation near
adiabatic endcaps. The independent smooth Neumann-mode witness produces
0.654 K spread on uniform axial cells and 1.996 K on graded axial cells after
one microsecond. This is a finite-grid method defect; its importance to the
full density/flow failures still requires the unchanged coupled campaign.

`FVDiffusion` replaces only the conduction solve with existing **FiPy 4.0.3**
`CylindricalNonUniformGrid2D`, `TransientTerm`, `DiffusionTerm` and SciPy LU.
The inherited mechanical stress solve, viscous dissipation, backward-Euler
numerical heat and local mechanical energy redistribution remain unchanged.
A small `conduct(thermal, heat_capacity, dt)` hook preserves the old base
method's algebra, allowing this candidate to replace one substep without
copying or intercepting the mechanical solver.

Each FiPy cell is one actual conserved annular volume. Cell order and
`2*pi*mesh.cellVolumes == flow.volume` are checked. The mesh's ordinary
arithmetic radial centers belong to FiPy's own FV discretization; they are
not asserted equal to the flow reconstruction's volume centroids. No metric
coefficient is fitted or transferred from the rejected heat operator.

For the incoming post-mechanical thermal energy `E` and species-derived heat
capacity `C`, solve `C*(T_new-E/C)/dt = sum(face conductive heat rates)`.
The coefficient is `C/physical_volume`, with **no old capacity history**.
Every call resets temperature to `E/C` before updating its old value, so
changes in upstream heating, density and species cannot reuse stale storage.
FiPy geometry is per radian; the common `2*pi` factor cancels in the equation.
No constraints are applied: native boundary fluxes are zero. There are no
extra thermal boundary unknowns. For radial-only capacity and temperature,
tensor FV face balances preserve axial uniformity on graded axial meshes.

Total energy changes by `C*T_new-E`; no Joule or viscous heat is added twice.
The receipt identifies its temperature trace as FV cells and reports both
the actual LU row residual in joules and the summed thermal redistribution.
The inherited `thermal_stiffness` attribute is an **inactive legacy FE
diagnostic**; it is not the active FiPy matrix and must not be used to audit
this candidate's heat flux. `heat_equation.matrix` is the active cached
library matrix, including storage. Mechanical trace semantics are unchanged.

This isolated candidate supports finite positive **constant scalar**
conductivity, the frozen coupled campaign's closure. It rejects coefficient
arrays and callables rather than substituting a different closure. Spatial
or temperature-dependent conductivity, wall heat exchange and experimental
calibration are outside this candidate. FiPy does not remove spatial or
timestep truncation: independent Bessel controls and the original coupled
spatial/time/conservation gates remain necessary. No threshold or physical
input changes are authorized by passing the separability witness.

Primary sources: [FiPy cylindrical mesh](https://pages.nist.gov/fipy/en/stable/generated/fipy.meshes.cylindricalNonUniformGrid2D.html),
[transient term](https://pages.nist.gov/fipy/en/stable/generated/fipy.terms.transientTerm.html),
[default boundary conditions](https://pages.nist.gov/fipy/en/stable/USAGE.html#default-boundary-conditions).
The project already used this library family in
`meridional-v86/thermal_reference86.py` and `mixture-energy-v58/fipy-reference.py`.
