# Source-ring boundary comparison

12 November 2026. Freeze before new predictions. Previously examined development
data; no new held-out or device-validation claim. V79–V83 and live code stay frozen.

Source searches confirm Eq11/A4/A5 prescribe infinitely thin current rings at
cathode r=.004 m and sidewall anode z=±c0. No finite emission footprint or precise
experimental corrected-voltage estimator was recovered. This justifies a separate
source-theory current-driven comparison, not selecting a new finite contact radius,
conductivity gain, sheath correction or bulk voltage to match the experiment.

Use the same four V83 finite-neutral source transports (linear/quadratic at1eV
and source-partition2.5eV), both anode centers .07/.08m, prescribed100A per branch.
This current is an experimental INPUT, not a fit or independent current prediction.
Do not import the paper's electrically inferred beta3/9 as independent constitutive
data. No velocities enter parameter or boundary selection. The frozen V83 absolute
18.5V disk predictions remain the separate current-output challenge.

Replace conducting disk/finite anode Dirichlet boundaries with compatible Neumann
delta-ring flux. Primary retains V81 face laws, Omega coordinate, no-slip walls and
fixed-property charge/torsion equations. The independent u-coordinate assembly uses
arithmetic centers and independent source weights, sharing only mesh selection.
Pin one potential DOF only as gauge; enforce conservation at that cell afterward.
Include external radial half-face motional EMF torque/work and boundary Joule loss.

Use nested cosine meshes at refinements1,2,4,8. Radial segments0,a,R have4n/28n
cells; axial faces include0,c0−.01,c0,c0+.01,L−.004,L−.016,L−.04,L−.08,L;
each segment has max(2,ceil(length/.005))*n cosine cells. Two neighboring boundary
cells bracket each ideal ring. Cathode weights preserve total current and r²=a²
using the solver's radial centers; anode weights preserve current and z=c0. Support
shrinks with refinement. It is a numerical delta, never a measured emission width.
Run32 primary and32 independently assembled reference solves. Test gauge invariance,
current/B reversal, exact torque BI(R²−a²)/2, flux and power ledgers at1e−8.
Use original5% final4→8 common-chord, viscous-work/torque and independent-chord gates.
Retain coarse failures. Do not qualify ideal-ring self-potential or Joule/contact
voltage convergence: these have singular source-cutoff dependence. Report raw values.

Seal predictions before reading measured velocities. Feed all8 finest states and
all8 preceding4-grid states into the unchanged V80 optical operator (brightness,
edge closures, temperatures, instrument alternatives, optical/spectral refinements,
LP bounds and original20% measured-speed criterion). A small checked adapter passes
actual graded radial edges instead of assuming the legacy uniform flow mesh. Its
legacy refinement tag4 is an interface key, not the actual flow resolution. Assess
flow-refinement changes in optical predictions separately; withhold unresolved cases.
Keep all alternatives, no winning-parameter selection. Report prescribed-current
point matches separately from experimental electrical/device qualification (false).

Independently audit sealed inputs, source normalization/moment, shrinking support,
gauge/energy/torque, saved reference agreement, and optical scoring. Execute only
in explicitly synced safe-dev VM. Final gates include app tests,typecheck,build.
