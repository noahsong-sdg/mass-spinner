# Angular conservation: independent method design review v33

Reviewer: transport33_physics. Design addendum only. No production changes,
numerical runs, gate changes, or modifications to the two prior evidence seals.

## Decision

An angular correction can be scientifically valid, but zero torque is not enough
to establish that. It must define a collision operator with a justified local
Landau limit, the appropriate conserved quantities, equilibrium measure and
transport coefficients. No verified published drop-in replacement for the
current unequal-radius, random-pair ring update was found in this bounded search.
This is a search result, not a proof that no such method exists.

If the unchanged confirmation gates still fail, retain the failure and separate
three questions: angular nonlocality, sparse-cell rate coverage, and the sampled
encounter-domain estimator. Do not solve one by concealing another. The smallest
established-method change remains better spatial locality with a correctly
normalized local partner population and joint particle refinement. If that is
impractical, the most defensible next backend prototype is a **local velocity
distribution solver at fixed spatial nodes**, with conservative coupling back to
orbit particles. This is larger than a pair correction and should be reviewed as
a separate research stage. Its transfer step is part of the physics method.

## Traced defect and why a small correction is constrained

The inspected path is collision half-step → spatial cell → cylindrical velocities
→ random matching → TA/Nanbu scattering → inverse velocity transform → physical
canonical-momentum ledger. The prior sealed audit demonstrates, for the current
equal/opposite tangential impulse at fixed positions,

\[
\Delta L=(r_a-r_b)\Delta p_{a\theta},\qquad
E[\Delta L]=\mu\Omega(r_a-r_b)^2(e^{-s}-1)
\]

in the cold rigid-rotation witness at fixed scattering length. This is an
algebraic witness, not a weak-coupling plasma benchmark. In simple terms, kicks
at different lever arms turn coherent spin into random motion. A smaller time
step does not by itself remove this spatial error.

There is also a basic obstruction. With unequal radii, preserving both the sum
of the two local tangential momenta and their angular momentum requires

\[
\Delta p_{a\theta}+\Delta p_{b\theta}=0,\quad
r_a\Delta p_{a\theta}+r_b\Delta p_{b\theta}=0
\quad\Longrightarrow\quad \Delta p_{a\theta}=\Delta p_{b\theta}=0.
\]

Thus a nontrivial exact-angular update at finite radial separation must change
the usual pair invariants, move positions, or change the representation. Exact
ordinary tangential momentum is a local collision property; it is not an
independent global symmetry of cylindrical ring coordinates at different radii.
Choosing a different finite-cell invariant can be legitimate discretization,
but its local limit and transport consequences need demonstration.

## What the primary sources actually establish

**A published axisymmetric DSMC repair exists, but is not a Coulomb validation.**
[Skovorodko (2004), §§2–4](https://arxiv.org/pdf/physics/0401026)
reports solid-body spin-down from finite-radius pair mixing. Its AMC algorithm
replaces tangential collision weights by mass times radius, then rescales radial
and axial velocities to repair energy; infeasible draws are skipped. It reports
agreement with a rotating neutral-gas equilibrium. The formulas do not generally
preserve axial pair momentum: multiplying the two axial velocities by separate
factors, or even a common factor, changes their mass-weighted sum. The paper
does not establish a multispecies Coulomb Landau generator or a discrete
H-theorem for this repair. Its small reported rejection fraction is specific to
the tested neutral-gas cases. Copying it would exchange a known torque error
for unqualified momentum, angular-statistics and rate changes.

**Continuum angular conservation follows from locality.**
[Burby, Brizard & Qin (2015), eqs.21–31](https://arxiv.org/pdf/1503.07185)
construct an energy-consistent gyrokinetic Landau operator with entropy
production. Its toroidal-momentum proof contains the factor
\(\hat z\times(y-y')\delta(y-y')=0\). The delta is in physical particle
position, not merely gyrocenter position or shared cell membership. Their
Hamiltonian velocity difference and bracket belong to the reduced model; they
are not interchangeable with full-orbit cylindrical velocities. This is a useful
design principle, not a license to transplant a gyrokinetic collision law into
the present full-orbit simulator.

**A structure-preserving marker implementation does not automatically fix it.**
[Hirvijoki (2021), §§2.3–2.4 and 3.3–3.4](https://arxiv.org/pdf/2012.07187)
gives discrete-time energy/positivity and regularized-entropy properties, plus
kinetic momentum for the standard Landau version. Crucially, eqs.91–92 explicitly
identify loss of discrete toroidal canonical momentum when distinct marker
positions share a collision cell. Replacing the spatial delta by a cell
indicator loses the locality cancellation. The paper preserves energy and
entropy despite this angular defect. Therefore swapping Nanbu for this published
marker construction alone is not a demonstrated finite-cell torque solution.
The paper's single-species presentation also leaves our actual two-ion
adaptation to be verified.

**Published coordinate correction is a proposal with artificial transport.**
[Kiviniemi, Hirvijoki & Virtanen (2021), §§2–3](https://acris.aalto.fi/ws/portalfiles/portal/62494593/SCI_Kiviniemi_Binary_collisions_acceptedversion.pdf)
demonstrate collision-cell gradient errors and propose iteratively shifting
particle coordinates to restore energy and momentum in a fluctuating
drift-kinetic model. They explicitly discuss induced artificial diffusion and
estimate its size for their ordering. Their small fluctuating-field parameter
does not bound our finite-radius full-orbit error. A coordinate shift here also
changes electrostatic energy, magnetic canonical momentum, wall/collector
membership and residence time. Their construction is a useful warning and a
model-specific research alternative, not an already justified patch for this
separator.

**A local distribution solver offers stronger starting guarantees.**
[Hirvijoki, Burby & Kraus (2018), §§II–V](https://arxiv.org/pdf/1804.08546)
prove conservation, positivity and a discrete H-theorem for a nonlinear
velocity-space Landau discretization using an exponential representation,
invariant-reproducing basis and discrete gradients. Its worked problem is
single-species, spatially homogeneous velocity relaxation; “space” in that
discretization must not be misread as a validated global separator geometry.
Using such an operator independently at spatial nodes is our proposed extension,
not a result proved in that paper. A spatially axisymmetric geometry also does
not imply that the distribution is axisymmetric in velocity when drift and
anisotropy matter.

## A constructive alternative, and its missing proof

The mass-weighted constraint-sphere candidate below is **our unimplemented
mathematical proposal**, not an existing validated Coulomb implementation.
Let \(\mu=m_am_b/(m_a+m_b)\), \(I=m_ar_a^2+m_br_b^2>0\), and define

\[
w_r=\sqrt\mu(v_{ra}-v_{rb}),\quad
w_z=\sqrt\mu(v_{za}-v_{zb}),\quad
w_\theta=\sqrt{m_am_b/I}(r_bv_{\theta a}-r_av_{\theta b}).
\]

In the six mass-weighted velocity coordinates, these are three orthonormal
residual directions. The complementary orthonormal centers are

\[
c_r=P_r/\sqrt{m_a+m_b},\quad
c_z=P_z/\sqrt{m_a+m_b},\quad c_\theta=L/\sqrt I,
\qquad K=(|c|^2+|w|^2)/2.
\]

**Demonstrated algebra:** holding c fixed and rotating w preserves K, local-frame
Pr, Pz and mechanical L exactly; fixed positions also preserve the magnetic
canonical contribution. Equal radii r>0 give the ordinary mass-weighted relative
velocity. A common rigid rotation gives wθ=0. The constraint on Pr is a
discretization choice at unequal radii, not a new global radial-momentum symmetry.

**Conditional probabilistic result:** at fixed positions the rotating Maxwellian
\(\exp[-\beta(K-\Omega L-U_zP_z)]\) is constant on each residual sphere. A
normalized symmetric angular transition, with rate dependent only on invariants
such as |w| and fixed positions, satisfies detailed balance for that conditional
measure. Orthogonal coordinates have constant velocity Jacobian. Markov mixing
then contracts relative entropy of probability densities with respect to that
stationary measure, when that relative entropy is defined. This statement is
not a proof that a finite collection of delta markers has increasing empirical
differential entropy, or that an arbitrary state-dependent rate remains
reversible.

**Unproved physical property:** substituting |w|/√μ into a Coulomb g⁻³ rate
changes both the speed and diffusion metric at unequal radii. Exact invariants
and detailed balance do not show the correct Landau drift/diffusion, viscosity,
interspecies heating or collector transport. The diffusion generator, not only
the stationary measure, must converge. Away from the axis, the peculiar
tangential relative velocity after subtracting the pair's rigid rotation is

\[
g_{\theta,\mathrm{pec}}=
\frac{m_ar_a+m_br_b}{\sqrt{(m_a+m_b)I}}\frac{w_\theta}{\sqrt\mu}.
\]

The prefactor tends to one as the relative radial separation tends to zero.
That supports a possible local-limit derivation; it does not supply uniform
control near zero relative speed or the axis. At ra=rb=0, I=0 and the angular
constraint loses rank, so the above chart is undefined. A method would require
a derived rank-changing axis limit, not an epsilon denominator.

The current torque callback formula would also be wrong for this candidate:
tangential impulses need not be equal/opposite. Record the actual
\(r_a\Delta p_{a\theta}+r_b\Delta p_{b\theta}\), plus independent before/after
canonical momentum. Neither ledger may be defined to assume the invariant.

## Recommended reviewable implementation split

1. **Finish the current unchanged-method qualification.** Preserve raw defects,
   incomplete attempts and sampled-domain failures. An outer-tail cell with four
   particles is not precise temperature or regime evidence; a better estimator
   needs its own validation and must not retroactively change acceptance gates.
2. **Prototype local Landau evolution as a separate oracle.** At each fixed
   spatial node use the full three-velocity, two-species operator and retain
   total local momentum/energy/positivity/entropy guarantees. Local total
   tangential momentum conservation implies conservation of its node radius
   times momentum; summing nodes therefore conserves collision angular momentum.
   This last implication is algebra, conditional on the stated local solver.
3. **Validate transfer before coupling.** Particle-to-grid and grid-to-particle
   maps must preserve species number, total energy, Pz and radius-weighted
   tangential momentum, with positivity and a defined entropy statement. A map
   preserving only total tangential momentum is insufficient. Remapping or
   sampling a grid distribution can reintroduce torque, heating and noise.
   Define field-energy and boundary accounting before allowing position changes.
4. **If pursuing the sphere candidate, make it a distinct methods experiment.**
   Derive the small-angle generator and local convergence first; retain the
   ordinary equal-radius TA/Nanbu kernel as an independent limit oracle. Do not
   call it a published method, qualified physics, or a performance-only change.

The grid branch is chosen over a global torque subtraction because it begins
with an existing local collision equation and explicit discrete entropy
machinery. Its cost, velocity truncation, two-species coupling and conservative
transfer are substantial and unresolved. The sphere experiment is smaller in
code but carries greater method-validity risk. Neither is production-ready.

## Prospective falsification gates

Any new branch must retain the existing gates and first pass: unequal-mass pair
invariants; both signs of rigid rotation; equal-radius/equal-position recovery;
near-axis limits; zero-drift Galilean limits where applicable; multispecies
temperature exchange and anisotropy decay; non-equilibrium distribution and
regularized-entropy convergence; reverse-transition/detailed-balance checks;
spatial locality/partner-rate normalization; and joint N/cell/time transport
refinement with the same raw canonical ledger and collector gates. A corrected
zero angular defect does not replace the heating, distribution or transport
tests. Additional method tests are diagnostic requirements, not relaxed gates.

## Evidence and execution boundary

Primary PDFs were read through the browsing tool on 2026-11-08. The source ledger
is `scientific/transport-v33/angular-design/sources.json`. Local report inspection
used trusted host read-only commands. This addendum contains analytical reasoning
only; no new project code, dependency, test, build or simulation was executed.
Prior numerical results remain in their separately sealed reports. The frozen
independent confirmation analyzer remains unchanged for the effective catalog.
