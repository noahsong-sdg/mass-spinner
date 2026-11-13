# Independent spatial-physics review

This review traces the V99 producer, V75 Euler flux, V86 stress/heat operator
and independent panel auditor. It is a source-level review; execution evidence
must be supplied by the separately recorded safe-dev studies.

**Verified discretization issue.** `Diffusion.dissipation_cells` bins FE Gauss
points by the containing FV cell. A centroid-to-centroid FE element generally
crosses an FV face; integrating a smooth FE dissipation field and subsequently
binning its quadrature points does not integrate the discontinuous FV indicator.
Global dissipated power can be correct while local heating is misplaced.
This can contaminate pressure gradients and the resulting meridional motion.
Its importance in V99 remains an execution question, not a source-level finding.

A defensible correction splits the integration domain at the union of FE and FV
coordinates, preserving the original Q1 field. Each integration element then
belongs to a single FV cell. Use the same split-domain integration in the stress
bilinear form and the heat ledger. In particular, radial velocity terms include
`ur/r`; Q1 interpolation produces rational radial integrands away from the axis,
so old and split quadrature need not have identical global integrals. Silently
renormalizing local heat to preserve an old total would hide this discrepancy.

An independent analytic cellwise control is `Omega=a*z+b`, `ur=uz=0`, constant
viscosity. It gives dissipation density `mu*a^2*r^2`, hence each FV cell receives
power `mu*a^2*pi/2*(r_hi^4-r_lo^4)*(z_hi-z_lo)`. Evaluate this manufactured field
on all FE nodes; do not introduce zero-wall traces into this constitutive test.
Nonuniform radial and axial cells are essential. A sum-only test cannot expose
the placement bug. Also check the discrete identity `sum(cell_power)=x.T*S*x`.

**Second verified algorithmic issue.** The original Euler operator used LLF
energy diffusion but replaced angular-momentum diffusion with
mass-flux upwinding. A stationary axial swirl contact can therefore have nonzero
numerical energy flux while its mass and angular fluxes vanish. This is an
accuracy concern, not a violation of global energy conservation. The HLLC
replacement uses the standard contact-wave star-state construction, extended
to tangential momentum and face-specific angular momentum. Its direct star
flux preserves stationary shear without subtracting large equal energy terms.
The source
radial profiles also change derivative at 5 cm, which is not an original V99
mesh cut; that remaining feature deserves localization before further changes.

**Final execution-path review.** The campaign retains the original initializer,
physical baseline, reporting times and five active-CFL jobs. Cached electrical
blocks depend only on prescribed geometry and conductivity; evolving mass and
the actual timestep still enter each solve. The checker retains every original
5% spatial, 2% timestep, contraction and ledger gate. Conservative restriction
is additional evidence, not a replacement criterion. Optical prediction seals
all four reporting times before the scorer opens the fixed velocity target;
all 72 diagnostic alternatives remain. Regional restriction-error fractions
overlap and must not be interpreted as a disjoint partition. Source inspection
cannot establish a numerical or experimental pass; retained execution results
and independent controls remain necessary.

**Executed evidence reviewed.** Retained safe-dev logs show the old solver
fails both stationary-contact regressions and the cellwise heat regression;
the corrected snapshot passes all 77 controls. The five trajectories completed.
The auditor reports 95,842 gates with ten spatial failures, all contractions
passing. Finest density-increment changes are 26.6–39.9%, radial velocity
11.1–15.2%, and whole density at most 0.615%. The largest fine timestep change
is 0.2221%. These results do not qualify spatial convergence. All 288 no-fit
velocity alternatives fail the 20% screen; optical numerical gates pass.
Current solver/campaign hashes match the retained producer inventory, and
prediction/audit/comparison file hashes match the summary. The n4 worker's
recorded peak is 378.41 MiB; this is measured for this campaign, not a bound
for arbitrary future refinements.

The localization control puts 95.26% of the finest **initial squared density
rate** in the 4.8–5.2 cm band. It does not put 95% of the evolved coupled error
there. At 1 microsecond, conservative restriction instead assigns 20.79% of
density-increment squared error to that band and 70.37% of radial-velocity
squared error to the endwall region. Regional fractions overlap. The alternative
mesh probe improves the initial-rate error but simultaneously changes alignment,
cell count and grading; it does not isolate alignment as the sole cause.

**Scope.** Correcting heat placement does not justify a single heavy-particle
temperature absorbing all Ohmic heat, frozen ionization/conductivity at extreme
contact temperatures, unknown cathode footprint, or adiabatic closed experimental
boundaries. Preserve the 5% spatial and 2% temporal gates, every reporting time,
and every no-fit Doppler alternative. Better numerical agreement is distinct
from experimentally qualified apparatus predictions.
