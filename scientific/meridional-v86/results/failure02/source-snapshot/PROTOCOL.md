# Conditional compressible meridional release, V86

Frozen before scientific predictions or new comparison scoring, 12 November 2026.
This is a separate research backend, not a production replacement or a matched
experimental steady-state solve. No velocity, current or timestamp fitting.

## Root cause and reviewable split

V84/V85 already resolve axial current and torsional viscous transport. They
omit meridional mass/momentum/energy advection and full meridional stress;
radial-flow Hall EMF is absent. Extending those fixed-density torsional states
does not determine their missing pressure/thermal balance. Reuse frozen V75
compressible MUSCL/Rusanov SSPRK2 transport and existing scikit-fem 12.0.2
assembly for full cylindrical Newtonian stress and heat. Separately adapt the
Hall source and optical LOS operator. Retain established baseline evidence.

## Fixed conditions and limitations

Same four V84 microscopic electrical scenarios, both anode centers .07/.08 m,
radius .06 m, half-length .24 m, B=.13 T and prescribed branch current 100 A.
Finite Neumann anode spans the published 2 cm ring width. Cathode current is
uniform on a 4 mm radius disk: this is an explicit regularization, not a
measured emitting footprint of the hollow cathode. Exact area/length overlaps
distribute current; support does not shrink under refinement.

Closed impermeable walls, midplane symmetry, stationary no-slip outer/endwall,
adiabatic thermal boundaries. No injection/exhaust or cooling data is invented.
Use one monatomic ideal-Ar fluid, m=39.948 u, gamma=5/3; fixed composition,
mu=1.14e-4 Pa s and conditional Eucken k=15 kB mu/(4m). Initial density is the
source neutral+single-ion number density times m; initial heavy temperature
is the source nominal radial temperature alternative. Initialize the *new*
finite-contact steady current/swirl problem with zero meridional velocity,
then release pressure/mass/energy. This is not initial thermal equilibrium.

Microscopic conductivity/Hall profiles remain externally prescribed, not
advected ionization chemistry. Full radial-flow EMF and charge response are
solved each step. All Ohmic heat enters this single temperature, a conditional
heavy-heating control rather than a justified electron/heavy energy partition.
Track max T, total Mach and temperature/density changes to expose failure of
these assumptions. No finite-temperature constitutive accuracy is inferred
from constant coefficients, especially above 10000 K. Closed adiabatic positive
power has no thermal steady state. These limitations forbid experimental
qualification even if the optical score happens to improve.

## Numerical schedule fixed independently of measured velocities

Uniform tensor grids (nr,nz)=(16,24),(32,48),(64,96). Report every state at
t=0,1,2,4 microseconds; retain all final states and failure cases. Maximum
outer timestep 0.1 microseconds, further limited by the actual acoustic CFL
0.2. Lie split: compressible hydro, implicit Hall electrical/momentum source,
implicit full stress and adiabatic conduction. No source or field clipping.
Additional timestep runs at 0.05 and 0.025 microseconds for the declared first
scenario (linear-finite-te1), anode .07 m, finest spatial grid. They establish
only that slice's timestep accuracy. Do not select a better-matching clock,
boundary, scenario, contact footprint or heating fraction after scoring.

## Gates

Independent regression controls: full Hall sign/reversal/zero-field response,
charge and electrical=Ohmic+mechanical identity, exact backward-Euler kinetic
defect, cylindrical stress (including hoop strain), rigid-rotation zero strain,
variable-coefficient manufactured stress integrals, adiabatic heat conservation,
unchanged conservative hydro checks and radial-flow LOS broadening/zero centroid.
Global mass and species relative drift <1e-10; closed total-energy versus
electrical work relative discrepancy <1e-8; normalized source charge residual
<1e-9. All states must have positive density/internal energy, no corrections.

Fixed-domain volume RMS fields rho,T,Omega,ur,uz: finest spatial relative
change <5%, with contraction versus preceding pair. Normalize velocities by
their full-field RMS scale (ur,uz share the meridional vector scale); separately
report midpoint line values and density/temperature increments. Interpolation
onto common fixed physical quadrature is explicit, not selected point pairing.
Declared timestep slice requires <2% changes and contraction for nonzero fields.
Report unresolved near-zero cases rather than manufacturing relative accuracy.
Prospective full-campaign auditor detail, added after the pilot and before any
full-campaign predictions: fixed physical tensor Gauss rules at 16,32,64 points
per coordinate; require the 32-to-64 change in comparison metrics below 1% of
their scale. This additional quadrature gate cannot waive a field-error gate.

After prediction sealing, reuse independently extracted brightness and all 72
V80 optical alternatives, with the necessary radial-velocity LOS extension.
Keep the original 20% measured-speed criterion and all numerical optical gates.
Report each fixed time separately. These are conditional transient comparisons
on already viewed development data, never fresh held-out or steady validation.
All source/prediction hashes, failures, test logs, build and typecheck retained.

## Numerical acceleration after first flow seal, before optical predictions

The first 26-case packet is preserved under results/attempt01, including its
sources, fields and failed audit. A representative direct Gaussian-CDF kernel
requires 0.1914 s for 2992 components and 9600 bins; the complete two-sided
spectral campaign would multiply that work substantially. Add an explicitly
selected Fourier Gaussian-mixture bin integrator, with four-period padding,
analytic tail/truncation bounds, exact CDF captured flux and exact CDF mode
candidate resolution. The original direct kernel remains the reference/default.
No physical equations, parameter, timestamp or scoring criterion changes.
Validate against direct CDF on analytic and actual sealed-state spectra before
use; require max absolute bin-probability error <1e-10 and mode discrepancy
<1e-6 m/s, with analytic moments and captured flux agreeing to floating-point
accuracy. Retain unsupported-domain failures instead of switching methods.
Replay all 26 flows with the final source seals and require every raw field
packet (including all saved states/history) to be bitwise identical to attempt01.
No measured velocity is read by either flow execution or acceleration checks.
The panel-wise exact-integration assessment is a separately labeled post hoc
supplement; it cannot replace any original failed numerical gate.
