# Saved-state ring diagnosis

Read only the admitted V107 full radial triple (80/160/320 × 48, CFL0.1),
at all four original clocks. Use the sealed producer's SourceFlow with
stationary viscous-wall reconstruction. No trajectory, coefficients, mesh,
initializer, constitutive closure or qualification predicate changes.

Ranked hypotheses: a late compression feature becomes underresolved; pressure
trace jumps drive a mesh-sensitive acoustic response; axial/endwall
redistribution feeds the ring. Compare native mass-flux divergence and its
radial/axial parts, reconstructed pressure/density jumps, Eulerian cell-velocity
time derivatives (not material acceleration), and
cell-average gradient estimates. Sample on fixed r=12–24mm, z=220–238mm
points, including density increments and both velocity components. This is a
diagnostic point grid, not a replacement convergence norm or continuum error.

For each direction write the exact production flux as the sum of a
distance-weighted cell rho*u reference, reconstructed-mean minus cell
reference, and HLLC minus reconstructed mean. Apply actual face areas before
divergence. These are bookkeeping terms, not unique physical/numerical parts;
pressure-driven HLLC mass flux can be physical at zero advective reference.
Keep signed terms and projection-closure defects. Do not infer contributions
to total squared error by adding squared component norms without cross terms.

Controls: graded-grid linear radial/axial expansion with both signs and exact
cancellation, stationary pressure contact, acoustic pressure jump at rest,
closed/axis boundaries, unchanged input q, and signed scalar-Q1 projection
closure. Verify producer and packet seals before and after the invocation.
The isolated runner sets PYTHONPATH to the sealed producer's
`scientific/source-v105` before standalone unittest discovery; no prior test
imports are required. Execute inside offline safe-dev, root only, explicitly 1GiB and one case at
a time. Export small sealed diagnostic outputs and receipts; retain failures.

Snapshots reveal instantaneous rates, not accepted-stage history or integrated
causality. Initial torsion differs by mesh. An instrumented unchanged-physics
trajectory or common-initial-state control would be separately declared;
neither can silently replace the original failed matrix.
