# Cathode and voltage boundary review

12 November 2026. Independent source/code review only. No scientific code,
downloader, parser or shared VM command was executed by this reviewer.

## Verified path and root cause

`V83 campaign83 -> mesh83.operators -> isolated V81 solver.solve` changes the
mesh, not the boundary equations. The V81 solver inherits the V79 observer.
`V82 model82.properties` supplies spatial transport; its `budget82.reconstruct`
repeats the same face laws for electrical accounting.

The actual electrical boundary is an equipotential **solid disk** over the end
faces `r[i+1] <= cathodeRadiusM`, at zero potential. A finite anode band on the
cylindrical wall is held at the requested voltage. Both retain the corresponding
half-cell resistance. All other external electrical faces have pointwise zero
normal current. The coupled mechanical model retains stationary no-slip radial
and end walls and a symmetric midplane.

Thus 18.5 V currently means the voltage between these finite plasma contacts.
It does not mean a local midplane probe difference, a regional Joule/current
budget, or the full terminal arc voltage. The 4 mm disk is an explicit modeling
assumption: it is not recovered from a measured current footprint.

The primary-source body independently inspected in this pass is
[Wijnakker et al. (1979)](https://www.researchgate.net/publication/276453995_A_Study_of_a_Weakly_Ionized_Rotating_Plasma),
§2.1 and §3, Eq. 11/Appendix A.4–A.5. Its physical cathodes are hollow tantalum
with inner radius 4 mm; this does not specify the outer/emitting area. Its
simplified theory prescribes infinitesimal **current rings**, with zero normal
current elsewhere. The anodes are likewise ideal rings in that theory.
These source facts agree with the earlier geometry audit. Rehosted OCR was
checked; no new visual equation/PDF inspection was performed in this pass.

The central problem is a difference between boundary models and an unidentified
voltage observation operator, not an established units, branch-count or polarity
bug. Replacing one unknown contact width with another cannot fix that evidence gap.

## Smallest justified next comparison

Add a separate, explicitly named **source-theory Neumann-ring** calculation.
Use the independently reported branch current as a prescribed experimental input,
with fixed source transport and viscosity. No conductivity calibration, current
optimization, velocity fitting or selection of a better-matching boundary width
is admissible. This is a current-conditioned velocity prediction, not an absolute
current prediction or a correction to the finite-disk model.

For gas-outward normal current, its normalized boundary distributions are

`j_n,cathode(r) = +I delta(r-a)/(2 pi r)` at `z=L`,

`j_n,anode(z) = -I delta(z-z_a)/(2 pi R)` at `r=R`.

The signs reverse together if the chosen branch convention reverses. Integral
flux must be +I and -I. The 100 A input must never be described as an independently
predicted match. With compatible Neumann fluxes, electric potential has a constant
nullspace: impose an algebraic gauge, not a physical grounded wall.

The ring has no independently specified finite width. A conservative numerical
delta must shrink under refinement and be tested using observables away from
the ring. Treating one coarse cell as a physical annulus would invent geometry.
For an injection exactly on a radial face, a split into its neighboring cell
sources can preserve both total current and `sum(I_k r_k^2) = I a^2` using
nonnegative two-point weights. That is a numerical moment rule, not a measured
emission profile. Alternatively retain the actual discrete second moment and
demonstrate its convergence explicitly.

Internal electrical faces retain the existing reciprocal EMF/torque coupling.
Known normal current through a radial anode half-face also supplies its known
boundary EMF torque; omitting that term loses angular momentum and electrical
work. Cathode current is axial, but its radial injection moment controls the
total volume Lorentz torque.

This variant is preferable to an arbitrary finite annular equipotential contact:
the ideal distribution is actually specified by the source, while annular width,
outer radius and plasma/sheath impedance remain unidentified.

## Voltage observations and boundaries

An ideal zero-width ring generally has a singular self-potential. Its contact
voltage and near-ring power can depend on numerical regularization even when
midplane velocities converge. Do not claim that a mesh-dependent ring voltage
predicts the corrected arc voltage. A finite-annulus resistance requires an
independently known physical width/contact law.

For a finite boundary port, use its signed current-weighted potential. The
gauge-invariant work-conjugate difference is

`V_eff = -sum(phi_face I_out)/I_branch`.

For the finite equipotential contacts this reduces exactly to the imposed port
voltage. It is useful for regression and accounting, but supplies no new
experimental voltage definition. Over a spatial cut, the corresponding signed
electrical-energy flux gives a legitimate regional identity; `Q_region/I` alone
is not generally a probe voltage because motional work and stress-energy flux
can be present. Retain fixed physical cuts, and do not choose a discarded layer
to force 18.5 V or 100 A.

## Required checks and reporting gates

- No new producer path calls `calibrate`, reads measured velocities, or optimizes
  current/contact/transport parameters. Current is an explicit input only in the
  declared Neumann variant; absolute-voltage results stay separate.
- Boundary quadrature preserves exactly prescribed fluxes, charge compatibility,
  ring radius and declared injection second moment. A deliberately noncompatible
  flux case must be rejected before solving.
- The pure Neumann solve is invariant under a potential-gauge shift. Gauge
  constraints must not add a conducting boundary or change velocity/current.
- Test zero field, field reversal, current reversal and fixed-property linearity;
  verify the expected source-radius-dependent torque, including the radial
  boundary half-face contribution.
- Independently assemble at least one reference. Check charge, linear residual,
  torque and signed work identities with the original 1e-8 criteria; preserve any
  unresolved contact-power trend rather than normalizing it away.
- Demonstrate joint spatial convergence of common midplane sightline observations
  under shrinking delta regularization, retaining the original 5% numerical and
  20% experimental velocity gates. Include a directional check near the source.
- Use the existing optical operator and every predeclared alternative; no switch
  from a failed sightline prediction to a better-looking local velocity curve.
  Current conditioning, source-theory agreement and experimental qualification
  must be distinct fields.

No source detail recovered by this reviewer establishes a finite experimental
footprint or corrected-voltage map. A ring benchmark is justified; promotion of
it to a calibrated cathode/sheath model is not.

## Independent implementation supplied for parent execution

`reference84.py` assembles a velocity-coordinate finite-volume reference using
arithmetic radial centers, its own source weights, face-frozen electrical/shear
metrics and an algebraic potential gauge. It shares `mesh84.grid` but does not
import `model84.py` or its assembly. Cathode weights preserve the physical squared
radius and anode weights preserve the physical axial centroid. Boundary half-face
EMF and Joule resistance enter the signed power ledger. The prescribed current,
source torque and conditional contact-power diagnostic remain explicit.

`test_reference84.py` supplies seven controls: source moments and conservation;
gauge invariance; zero field/current; signed-current scaling; field reversal;
quadrature invariants; and invalid transport/geometry rejection. These were
written but not executed by this reviewer. Parent-run execution, spatial
convergence and optical scoring are required before numerical acceptance.

## Adversarial producer-path review

Read-only review of the implemented `model84`, `mesh84`, `campaign84`, `optics84`
and `compare84` found no material scientific implementation defect. This is a
source-level assessment, not an independent execution of their new outputs.

The primary charge RHS is the negative external outward-current source. The
mechanical RHS includes the radial anode half-face torque with the same sign and
metric used in the boundary potential reconstruction. Consequently its
`phi_face = phi_cell - I_face R_half - t_half Omega_cell` accounts consistently
for boundary Joule loss and motional work. The pin removes one constant-potential
unknown only; it adds no electrode, normal-current path or grounded wall. Source
quadrature preserves the specified moments. The independent reference uses the
same physical mesh but different radial centers, source quadrature and assembly;
the common sightline observer, rather than point values at different centers, is the proper
comparison target.

The optical adapter replaces the legacy flow-grid reader with the actual graded
edges and midplane Omega. Its legacy refinement and beta tags do not alter the
spectral integrals or brightness-constrained LP; they affect interface labels and
an unused selected-spectrum branch. All optical alternatives remain predeclared,
and matching coarse/fine alternatives is by physical identity rather than list
position. Resolved point-match flags additionally require flow, optical spatial
and spectral convergence. Prescribed current is not mislabeled as a prediction,
and corrected-voltage and experimental qualification remain false.

The main overclaim to avoid is treating the regularized ring contact-voltage
trend as an experimental voltage interval or a finite-power cathode prediction.
The ideal-ring electric field has a singular near-source contribution; converged
far-field rotation does not make that contact voltage or Joule loss a qualified
apparatus observable. Retain the finite-disk absolute-current results separately.
