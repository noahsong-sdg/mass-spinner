# v75 independent mixture-equation review

## Role and evidence boundary

Independent source/equation review requested before implementation. Read the
safe-dev instructions, v74 coupled/thermal/current path, v73 FiPy torsion and
the existing radial species/energy path. No project code executed on the
host, and no numerical qualification is claimed by this design review.

## Root cause of the missing coupling

`scientific/coupled-axial-v74/thermal.py` computes gas mass once from the input
density and uses a fixed argon heat capacity. The inherited torsion object
likewise freezes local inertia. The v74 current solve accepts axial/radial
angular-speed fields but not evolving density or composition-dependent
conductivity. Its new heat coupling does not transport mass.

`src/fuel-transport.ts` and `src/fuel-gas.ts` already evolve independent species
with prescribed overdamped mobility, with important limits explicitly stated
in their documentation. Those fluxes are not binary Maxwell–Stefan transport
relative to a mass-average velocity. Updating the two fixed capacities from
those densities would omit angular-momentum advection, pressure/compression
work and species energy transport. Passing a global energy ledger after
inserting a corrective heat term would not repair those missing equations.

In simple terms: moving gas carries mass, momentum and energy together. A new
density cannot be inserted into yesterday's thermal and mechanical masses
without recording how the material and its energy arrived.

## Closed free-gas model

For a binary neutral monatomic mixture, let `u=(ur,uz)` be meridional
mass-average velocity, `Omega` the common angular speed, `l=r² Omega`,
`rho=sum(rho_s)`, `Y_s=rho_s/rho`, `x_s=(rho_s/m_s)/sum(rho_k/m_k)` and
`mbar=sum(x_s m_s)`. The following is a derived continuum model, not a claim
about a specified Marathon operating point:

```
partial_t rho_s + div(rho_s u + j_s) = 0
sum(j_s) = 0
p = kB T sum(rho_s/m_s)
rho e = (3/2) kB T sum(rho_s/m_s)

partial_t(rho l) + div(rho u l)
    = div(r tau_mtheta) + r (J cross B)_theta

E = rho e + (1/2)rho(ur² + uz² + r² Omega²)
partial_t E + div[(E+p)u]
    = div(tau dot velocity) - div(q) + J dot E_lab
q = -k grad(T) + sum(h_s j_s)
h_s = (5/2) kB T/m_s
```

Here `div` includes the cylindrical `1/r partial_r(r...)` factor. Radial and
axial momentum equations are also required. The radial force includes
`rho r Omega² - partial_r p`; azimuthal stresses are
`tau_rtheta=mu r partial_r Omega` and `tau_ztheta=mu r partial_z Omega`.
Axis regularity and reflecting solid boundaries must be imposed separately
from thermal film/solid conditions. Total energy includes meridional kinetic
energy; centrifugal exchange is internal to the momentum/energy system.

The existing matched current identity is reusable:
`P_electrode=P_Joule+sum(torque_i Omega_i)`. It supplies the electrical part
of the above energy equation. A constitutive electrical conductivity that
depends on density/temperature/ionization still requires a justified closure;
changing inertia alone does not provide one.

If all species share the same angular velocity, their diffusive angular flux
is `l sum(j_s)=0`. The barycentric mass flux still transports angular momentum
and changes local inertia. A model allowing distinct species swirl velocities
needs their additional relative angular flux and reciprocal momentum exchange.

The industrial equations and correction of approximate diffusive fluxes to
zero total mass flux are documented by [Sandia Fuego's laminar and swirl
theory](https://www.sandia.gov/files/sierra/Fuego_Users_5_26/theory/mathmodels/laminar.html).
The species enthalpy flux and the zero-sum correction are also explicit in
[Cantera's governing equations](https://www.cantera.org/3.1/reference/onedim/governing-equations.html).
These sources corroborate the conservation structure; their particular
low-Mach/stagnation simplifications do not by themselves implement a centrifuge.

## Binary diffusion and separation control

With prescribed positive binary diffusivity `D12`, no Soret term, and shared
acceleration per unit mass, the ideal binary Maxwell–Stefan equations reduce to

```
d1 = grad(x1) + (x1-Y1) grad(log p)
j1 = -rho D12 m1 m2/mbar² d1
j2 = -j1
```

This expression follows from `d1=-x1*x2*(v1-v2)/D12` and
`j1=rho*Y1*Y2*(v1-v2)`. Pressure diffusion is essential. At isothermal rigid
rotation and mechanical equilibrium,

```
partial_r p = rho r Omega²
partial_r log(x1/x2) = (m1-m2) r Omega²/(kB T)
```

The heavier species enriches outward. Centrifugal acceleration is the same
per kilogram for both species, so its external-force difference cancels from
the Maxwell–Stefan relative force. Adding an independent centrifugal drift
on top of the above barodiffusion would count that separation twice.

[COMSOL's Maxwell–Stefan theory](https://doc.comsol.com/6.4/doc/com.comsol.help.fce/fce_ug_chemsptrans.08.168.html)
explicitly includes composition, pressure, temperature and species-specific
external forces in diffusion. The zero-Soret choice is an explicit reduced
closure, not a prediction that isotopes have no thermal diffusion. Prescribed
`D12` is not experimental transport data.

## Recommended numerical path and acceptance gates

For a free gas with evolving density, reuse a conservative compressible
finite-volume hydrodynamic method and the existing FiPy diffusion/solid heat
parts, retaining the actual TypeScript current solver. Keep all transported
species on the same numerical mass flux; do not separately normalize or clip
their inventories. Record any numerical kinetic-energy treatment and any
operator splitting error explicitly. A local constitutive residual is not a
physical heat source. A Darcy/overdamped flow model would need a real drag
mechanism and is not automatically a free-gas approximation.

[PeleC](https://www.osti.gov/servlets/purl/2311310) is an expert-code reference
for compressible multispecies flow; axisymmetric swirl support must be checked
before calling a particular configuration turnkey. [Pyro's compressible
documentation](https://python-hydro.github.io/pyro2/compressible_basics.html)
describes conservative Riemann-solver hydrodynamics, but its older reference
lists r-z geometry and passive species as extensions rather than established
capabilities. FiPy is useful for the existing diffusion problems; using it
does not itself validate a new compressible solver.

Prospective controls should include:

- Every species inventory, total mass and positive density/temperature; no
  clipping, renormalization or disappearance at impermeable walls.
- Exact `sum(j_s)=0` on every internal face, with common conservative
  barycentric advection. Equal-mass labeled species must show no false
  barodiffusive isotope separation.
- Uniform equilibrium with no drive; arbitrary uniform composition and
  identical temperatures must remain stationary.
- Acoustic/Euler reference, pressure-driven mass transport and adiabatic
  compression/expansion. These expose the missing meridional work terms.
- Rotating isothermal mechanical/diffusive equilibrium, including the stated
  log-odds slope, and a nearby perturbed state.
- Closed moving-density angular-momentum conservation. Swapping old inertia
  for new inertia at fixed angular speed must be deliberately rejected.
- Species enthalpy-flux control with unequal masses and a composition gradient;
  do not confuse internal energy per particle with transported enthalpy.
- `B=0`, common electrode offset and axial speed perturbation controls from
  v74; prescribed conductivity must be labeled as such.
- Endwall/curved-wall torque and work partitions, Joule and viscous heating,
  gas/solid interface reciprocity and whole-system total energy.
- Independent radial, axial, spatial, timestep and joint refinements at the
  same early/intermediate/final physical times. Include density, both species,
  meridional velocities, pressure, angular speed and both temperatures, plus
  currents, torques, interface heat and separation observables.
- A stricter spatial/time reference and independent tolerance variations;
  splitting error must decrease with timestep rather than be hidden by a
  shared coarse reference. Keep failed attempts and exact input/source hashes.

Numerical agreement for a prescribed neutral surrogate remains distinct from
experimental validation of lithium/plasma transport, discharge sustainment,
ionization, electron energy, rarefaction, sheath/current closure or an actual
Marathon engineering geometry. No live/playground qualification follows from
this equation review.

## Independent cylindrical finite-volume derivation

For a cell `[a,b] × [z0,z1]` with constant reconstructed density and angular
speed, the exact cylindrical integrals are

```
V = pi (b²-a²) dz
r2bar = (a²+b²)/2
rbar = 2(b³-a³)/(3(b²-a²))
M = rho V; I = M r2bar; L = I Omega; Ktheta = L²/(2 I)
```

The radial-momentum flux includes `p` on radial faces of areas
`Aminus=2 pi a dz`, `Aplus=2 pi b dz`. The cell geometric pressure source is
`(Aplus-Aminus)p`, which cancels their net flux exactly for uniform pressure.
Under the stated constant-`rho,Omega` reconstruction, the integrated centrifugal
source is `M Omega² rbar`, since it integrates `rho r Omega²`. It must not be
silently replaced by an expression for a constant-tangential-speed
reconstruction. In that alternative reconstruction the source is instead
`M vtheta² * 2/(a+b)`. `sqrt(r2bar)`, `rbar`, and `(a+b)/2` serve different
roles; they need not be equal on a finite mesh.

Each shared internal finite-volume face must transfer equal and opposite
species mass, total mass, axial angular momentum and total energy. Thus
closed mass, angular momentum and energy are global conservation tests even
when the local source/face approximation is first order. They are not enough
to establish a well-balanced rotating state. The continuum rigid-rotation
test needs `p'=rho r Omega²` and the binary equilibrium above; record spurious
radial velocity and temperature error versus mesh. A first-order Rusanov
scheme should be described as converging toward that equilibrium unless its
source/flux construction actually preserves it exactly.

The usual Cartesian Rusanov positivity guarantee cannot simply be cited for
a cell-dependent kinetic metric `L²/(2 M r2bar)`. Moving angular momentum and
energy between radii can make the inferred internal energy inadmissible at
large swirl. Check every substep's species masses, total density, temperature
and internal energy. A full-step rejection with smaller timestep is a
defensible integration policy; clipping species, adjusting energy or
normalizing the resulting masses is not. Include both acoustic and geometric
source step restrictions and retain rejected-step diagnostics.

The compressible total-energy update may turn unresolved kinetic structure
into internal energy numerically. This must not be labeled physical viscous
heat. The existing v74 physical shear/Joule sources and backward-Euler sink
remain separately identified in their source substep, and splitting error
requires explicit timestep refinement.

## Pre-study implementation audit and radial motional current

Read `flow.py`, `diffusion.py`, `coupling.py`, `magnetic.py`, `mixcheck.py`,
`independent.py`, analytical controls and the source/transport tests after
implementation. The pressure-geometry cancellation and constant-angular-speed
centrifugal source match the above integrals. The shared numerical mass flux
also carries donor specific angular momentum and species mass fraction.
Both the actual FiPy transient capacity and the separate inertia ledger are
refreshed from the transported mass. Gas heat capacity is computed from the
two particle inventories. Within each source step they remain fixed, which is
consistent with the declared first-order operator splitting.

Independently expanding the binary SG flux to first order gives
`j1=-rho D[grad(Y1)+Y1(1-Y1)(m2-m1)/mbar grad(log p)]`. Transforming from
`Y1` to `x1` gives the Maxwell–Stefan formula above, including the pressure
term's sign. Its energy flux is `(h1-h2)j1`, and its second species mass flux is
exactly opposite. The equal-mass and pressure-sign controls are necessary but
do not alone establish accuracy of the physical diffusivity approximation.

The new radial velocity creates an additional motional current under the
existing diagonal Ohm law. With `Etheta=0`, `B=Bz ez`, no Hall response and no
induction, `er cross ez=-etheta` gives

```
Jtheta = -sigmaP B ur
fr = -sigmaP B² ur
Qtheta = sigmaP B² ur²
fr ur + Qtheta = 0
```

Thus the added exact local substep is physical magnetic braking, not an
empirical drag: at frozen density and conductivity,
`Mr_new=Mr_old exp(-sigmaP B² dt/rho)`. It leaves total cell energy unchanged;
lost radial kinetic energy becomes internal heat. The separately reported
heat uses `Krad_old * [-expm1(-2 sigmaP B² dt/rho)]`, preserving tiny positive
values that subtracting nearly equal energies would lose. Mass, species,
axial momentum and angular momentum stay unchanged. The current is
axisymmetric and divergence-free, so it does not add a charge source or
electrode power. Its source splitting error remains part of timestep
refinement. The independent checker reconstructs both its analytic decay and
local heat without importing the production stage.

No blocking equation discrepancy was identified in those admitted kernels.
This is source-level support only. Reported analytic-control and convergence
results must still be inspected separately; this reviewer has not executed
the VM tests. Meridional viscosity, Soret/Dufour, evolving electrical
conductivity, Hall response and ionization remain absent. Natural-Ar neutral
transport is explicitly an isotope approximation, not lithium or plasma data.

This reviewer additionally authored `analyze.py` and its tests after the
independent equation review. That analyzer reconstructs primitive fields from
the conserved endpoint state, uses cylindrical-volume restriction and mass
restriction/weighting for species fraction, and applies the prospective
response-scaled gates. Before the full study, separate density-change and
species-fraction-change fields were added: comparing whole profiles alone
could hide a small evolution error behind the deliberately nonuniform initial
state. Their scales use the reference change (floors `1e-6 rho0` and `1e-6`),
and species change subtracts separately mass-restricted final and initial
fractions with their own density weights. This strengthens prospective
qualification of the new dynamics; it does not loosen an existing gate.
Its implementation therefore needs review by another
agent; it is not independent validation of this reviewer's own code.

## Frozen-run re-audit and anticipated resolution limits

Reopened the final four production kernels, mixture checker, analytical
controls, diffusion controls and exact manifest while the first full study
was running. No frozen scientific source was edited by this reviewer.
The parent reports 77 tests, 24 hydrodynamic-control gates, 14 diffusion-control
gates and six actual corruption controls passing inside safe-dev. This
reviewer has not rerun them and has not yet inspected full-study results.
The added diffusion controls now test the rotating-equilibrium rate, absence
of a second rotation force and tagged-species Fourier diffusion; rotating
hydrodynamics also gates its angular-speed error.

An admission issue was sent to the parent: the composite model requires
accepted gas states between 300 and 418 K, but the reused v74 source solver
alone admits gas up to 20000 K. Diffusion checks its own 235–418 K fit before
and during its stages; that does not reject a final source endpoint above
418 K if no later diffusion step occurs. The minimal composite fix is to
admit initial and accepted physical substep states explicitly in `Coupled`,
and separately in the independent source audit. Nonlinear source trial
temperatures are different: only viscosity/conductivity and solid properties
are evaluated there, so their actual wider constitutive domains apply.
Blindly raising inside an overridden temperature method would bypass v74's
existing wider-domain line-search backtracking. This is a general API domain
gap, not evidence that the specified approximately 350 K trajectory crossed
the boundary. Fixes after export require a newly sealed source snapshot.

The principal anticipated endwall-torque limitation is spatial resolution,
not a reason to relax its prospective gate. From the sourced argon viscosity
near 350 K, `mu≈2.5e-5 Pa s` and `rho≈0.001 kg/m³` give
`nu≈0.025 m²/s`. The analytical estimate `sqrt(nu t)` is approximately
0.50, 0.71 and 1.00 mm at 10, 20 and 40 microseconds. Uniform axial cells are
2.92 mm at 48 cells and 1.46 mm at 96 cells. Even the reference can therefore
miss the early local wall gradient while its volume RMS field looks accurate.

Specifically, the initial `sin²(pi z/L)` rotation behaves as `C z²` near a
stationary endwall. Its initial continuum wall gradient is zero, whereas a
cell-center-to-wall first difference gives approximately `C h/2`. In the
constant-property half-line heat problem, the early continuum wall gradient
is `4 C sqrt(nu t)/sqrt(pi)`. This independently derived local estimate
explains an order-h wall-torque error and a poorly resolved short-time layer;
it is not a numerical measurement of the coupled study. If confirmed,
resolving that layer or using a verified consistent higher-order wall
reconstruction addresses the cause. Tightening endpoint tolerances cannot
resolve missing spatial degrees of freedom.

The newly gated changes in density and species fraction can also expose
first-order Rusanov diffusion. Its smooth-field numerical diffusivity is of
order `c h/2`, with acoustic speed around 350 m/s here. Comparing whole
nonuniform profiles could conceal its effect on a much smaller evolution.
The change-specific gates deliberately prevent that concealment. Numerical
method/order or mesh improvements must be tested against those same gates;
an unresolved outcome must remain unqualified.

## Host-only composite-domain correction review

Reopened the applied host copies of `coupling.py`, `mixcheck.py` and
`test_coupling.py` while the isolated guest retained the original frozen study.
The new admission method covers construction, direct-source input/output and
all four accepted split-stage endpoints. Its primitive reconstruction already
rejects nonfinite state and nonpositive internal energy; the added interval
check enforces the actual 300–418 K composite constitutive domain without
clipping or altering the conservation equations.

The guard does not override the thermal solver's temperature reconstruction or
its nonlinear trial admission. Accordingly it preserves the inherited wider
property domains and line-search behavior while rejecting an unsupported final
physical state. The independent checker reconstructs and checks both source
endpoints without importing the production guard. No uncovered accepted
endpoint was identified in this execution path.

The regressions include constructor and stage-wiring cases, direct-source
input rejection, and an actual hot-wall source solve starting at 417 K with a
650 K wall. A separate controlled test disables only production admission,
requires that the real thermal solve exceed 418 K, and then requires rejection
by the independent source checker. This is a concrete reproduction of the
former final-step gap, rather than a mocked invalid thermal result. These new
regressions have been inspected but not executed by this reviewer; VM checks
and a separately identified tested snapshot remain required.

The accompanying status document accurately identifies the 36/40 u neutral
isotope surrogate and prescribed electrical conductivity. It explicitly
states the assumed local carrier-to-heavy-gas momentum/energy transfer and
the absence of a derived carrier population or equilibration time. I found no
claim that this closure establishes a self-consistent ionized plasma model or
a validated Marathon operating point. Its provenance paragraph also correctly
keeps the original frozen run separate from these later host corrections.

## Late endpoint and producer-binding review

Source-reviewed `endpoint_admission.py`, `supplemental_admission.py`, the
updated `verify.py` path and their fixtures without running project code.
Canonical initialization is reconstructed from manifest parameters and geometry,
not admitted merely by matching total inventories. Endpoint temperature,
angular speed and kinetic energy are independently recovered from conserved
fields. Species centroids use the exact cylindrical volume-mean radius;
azimuthal-current heating is the instantaneous `sigmaP B² ur² V`, distinct from
the radial/axial electrical graph's Joule heat. Reconstructed shear and wall
torques use the endpoint viscosity and angular speed. These formulas match the
physical and discretization definitions of the saved observables.

The supplemental path requires exact original raw-to-producer source hashes
against the separately extracted frozen tree. It also requires the sealed
v74 graph to match the late checker's graph before using it. Its receipt records
the raw digest, original producer hashes and later checker hashes separately;
it explicitly sets numerical, experimental and live qualification false.
Completeness, canonical initial states, saved primitive domains, endpoint
observables and recorded global ledgers are admitted, while intermediate audit
receipts are inspected rather than replayed. It cannot establish convergence
or retroactively establish that the producer ran later guards. The ordinary
verification path still requires exact producer, analyzer, control and
convergence bindings for its own source tree; supplemental admission does not
replace that requirement.

Tests cover edited original source, a changed sealed graph, partial/failed
producer evidence, wrong initial state and common cached-observable bias. The
endpoint tests additionally exercise real production initialization and a real
coupled trajectory. Their source-level coverage is appropriate; passing them
is not asserted here because the isolated full study is still running.

The `1e-7` graph-observable allowance is far below the prospective 2% convergence
gate, but is not a universal relative-error consequence of the inherited
current endpoint bound. That bound is `5e-10 max(1,max|Omega|)` in a global
maximum norm, so near-cancellation observables can be more sensitive. The real
study's reconstructed current comparisons must demonstrate adequacy for this
manifest; an unexplained mismatch must remain a failed admission rather than
be hidden by widening a tolerance. No blocking formula or provenance defect
was found in these new paths during source inspection.

## Completed first study: independent artifact triage

Read `convergence-01.json` directly after the full study completed. The parent
reports 20 trajectories and 4448 steps with no recorded per-stage failure; this
reviewer has not replayed those steps. The artifact itself reports no missing
requirements and **`numericallyQualified: false`**. Temporal refinement,
linear/thermal/joint solver-tolerance checks and the 48-cell smaller-timestep
reference pass. The spatial-reference comparison fails at every output time.
Tighter algebraic tolerances therefore do not address the observed spatial
errors on these tested meshes.

The following are direct artifact observations for the 48-to-96-cell reference
comparison (percentages retain the protocol's response normalizations):

| Quantity | 10 microseconds | 20 microseconds | 40 microseconds |
| --- | ---: | ---: | ---: |
| Upper endwall torque | 22.9534% | 15.9823% | 7.3539% |
| Lower endwall torque | 22.0896% | 15.2062% | 6.9235% |
| Gas temperature local error | 8.4592% | 13.7748% | 8.9187% |
| Density-change RMS | 2.1337% | 1.6307% | 1.0210% |
| Density-change local error | 16.1162% | 12.2353% | 7.3905% |
| Species-fraction-change RMS | 2.0049% | 1.6371% | 1.1012% |
| Species-fraction-change local error | 5.6526% | 4.8792% | 3.7322% |
| Meridional kinetic energy | 0.2537% | 1.0214% | 4.0133% |
| Radial motional Joule power | 0.2558% | 1.0406% | 4.0923% |

In contrast, at 10 microseconds the complete angular-speed and species-fraction
RMS values are only 0.01526% and 0.01547%. These small whole-field errors cannot
qualify wall gradients or small transport increments. The increment gates
successfully expose inaccuracies that background profiles would conceal.
Absolute early gas-temperature disagreement is about 0.107 K locally; its
response-normalized failure is still valid and must not be replaced by a
350 K normalization. No asymptotic error estimate follows merely from having
a finer reference that itself remains unresolved.

The endwall result is consistent with the previously predicted thin viscous
layer and first-difference wall-gradient error; the error decreasing with time
also supports that interpretation. This is not a completed isolation study.
Resolving the layer with prospective axial refinement or a separately verified
wall reconstruction is the appropriate next experiment. Gas/density local
errors and growing meridional/Joule errors require spatial error-location maps
and hydro-only/source-only controls before assigning them exclusively to wall
heat transfer, Rusanov diffusion or another individual stage.

There is a separate, analytically identifiable comparison effect in the joint
series: at 10 microseconds, angular-speed RMS rises from 0.05809% at 24 cells
to 0.22315% at 36 cells; species fraction rises from 0.06230% to 0.31845%.
The overlap implementation integrates piecewise-constant reference fields
correctly, but nonnested grids can alias a smooth underlying field. For the
exact axial function `f(z)=a+bz`, fine-cell width `h`, and coarse width `4h/3`
(48-to-36), restricting reference cell-center samples gives a repeating
coarse-center discrepancy `+bh/12, 0, -bh/12`. The nested width `2h`
(48-to-24) cancels that linear discrepancy exactly. Thus even an exact smooth
solution can produce a larger 36-cell comparison error under this transfer.
For the prescribed initial profiles, the resulting local scales are of the
same order as the reported whole-field increase.

That construction demonstrates a possible comparison contribution, not the
fraction of the measured error caused by it. A canonical-initial transfer
control and a manufactured smooth-field remap study should quantify it first.
A future prospective study can use nested meshes, or qualify a higher-order
conservative transfer with the correct mass treatment for species. Neither
deleting the 36-cell gate retrospectively nor loosening monotonicity would
repair the independent 48-to-96 failures. This study and its original analyzer
must remain retained as failed qualification evidence.

## Final summary and publication-scope check

Read the exported `summary-01.json` and `supplemental-02.json` and compared
their values with the completed-study status document. The summary confirms
that nonnested aliasing exists before evolution: 36-cell initial angular-speed
RMS is 0.2231534%, versus 0.2231485% at 10 microseconds; initial species-fraction
RMS is 0.3187368%. The actual manufactured linear remap error is
0.2430556 mm for 48-to-36, versus approximately `6.94e-18 m` for 48-to-24.
These measurements confirm the comparison contribution predicted above;
they do not waive the original 74 failed series gates or the nested spatial
reference failures.

The later endpoint admission passes all 60 saved endpoints. Its worst relative
current and Joule discrepancies are approximately `1.1474e-12` and
`1.7342e-12`, so no cancellation-driven tolerance rejection occurred in this
manifest. The receipt retains separate producer/checker source maps and
explicitly withholds numerical, experimental and live qualification. The
summary records a bitwise-identical 32-step revised-source pilot, not a rerun
of the original 4448-step full study. The final status document preserves
that distinction and the neutral-fluid/carrier-transfer limitations.

The reported failed-gate breakdown matches the summary: joint 18, spatial 29,
radial 19, axial 8, temporal zero, summing to 74 of 615. The table of worst
reference differences agrees with the previously inspected convergence rows.
This final check used artifact/source reading only; test execution remains
the parent's separately recorded safe-dev evidence.
