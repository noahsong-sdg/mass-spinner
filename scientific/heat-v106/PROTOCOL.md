# V106: finite-volume heat, unchanged coupled gates

Freeze before the coupled study. Replace only the heat solve of V105 with
FiPy 4.0.3 cylindrical cell-centred backward Euler conduction. Retain its
mechanical finite-element stress, dissipation, source reconstruction and
stationary viscous wall traces. Constant scalar conductivity is the declared
scope; this does not establish a plasma transport closure.

The old hybrid heat solve has zero boundary-node heat capacities. An isolated
radial Neumann Bessel mode develops axial variation (0.654 K on uniform and
1.996 K on graded axial cells after one microsecond). Exact axial variation is
zero. Retain that failed control. The replacement must pass the SAME four
independent controls: separability, annular-average Bessel spatial refinement,
backward-Euler time refinement, and refreshed incoming energy/mixture capacity
with conservation, positivity and thermal entropy. Preserve the legacy base
operator's behavior in the extraction test.

Keep identical V105 physical inputs, initial state, electrode geometry,
transport coefficients, nested V101 mesh, clocks 0/1/2/4 microseconds,
n=1/2/4 at CFL .1 and n=2 at .2/.05, and 100 ns cap. Use the original
evaluate100 -> audit99 and geometry101.expected_edges. Do not change the
5% spatial or 2% temporal gates, contraction, positivity, quadrature, charge,
or mass/species/energy/angular ledgers. Record every failed gate. No fitting
of currents, optical velocities or temperatures; optical comparisons remain
retrospective and sealed before scoring.

Seal source inventories, environment, field packets and execution logs. Compare
the actual saved fields. Heat-control success is distinct from coupled spatial
convergence, experimental accuracy and live-browser adoption. In particular,
high temperatures, prescribed neutral transport, unknown sheath/electrode
details and the short closed adiabatic exposure remain physical limitations.
