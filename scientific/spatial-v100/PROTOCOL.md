# V100 spatial repair protocol

Frozen before the new campaign: retain V99's physical inputs, finite contacts,
initialization prescription, 16/32/64 by24/48/96 nested grids, reporting times
0/1/2/4 microseconds, and active CFL refinements0.2/0.1/0.05 at n2.
No changes to current, measured velocities, heating partition, transport,
boundary conditions, fitting, reporting-time selection or acceptance thresholds.

Repair two demonstrated discretization defects: LLF acoustic diffusion of
stationary contacts/swirl energy, and FE quadrature bins assigning heat across
FV cell faces. Use HLLC with Davis acoustic bounds and the same original Q1
stress field integrated on the FE/FV intersection mesh. Pull stress stiffness
back through the identical sparse prolongation so dissipation equals work.
Keep scalar conduction unchanged. No slip-stencil change in this campaign.

Retain every V99 independent saved-state, charge, mass, species, energy,
angular,5% spatial,2% timestep, contraction and quadrature gate. Reuse its
auditor with an explicit V100 producer inventory. Conservative restriction is
a supplemental diagnostic; it cannot replace a failed original gate.
Run every case in a fresh sequential process with one BLAS thread and record
peak resident memory. This releases FE/sparse/JSON buffers between cases.

After predictions are sealed, rerun all72 frozen optical alternatives at all
four times and compare against all five previously viewed argon velocities.
Retain the20% screen. This remains retrospective development evidence,
not independent experimental validation or a thermal steady-state apparatus.

References: [HLLC](https://doi.org/10.1007/BF01414629),
[Clawpack construction](https://github.com/clawpack/riemann/blob/master/riemann/euler_1D_py.py).
The face-specific angular metric and six conserved fields require an adaptation;
this is not an unmodified Clawpack or independently assembled PDE solution.
