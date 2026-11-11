# v75 transport source and closure review

This reviewer read source and primary documentation on 2026-11-10. No project
code was executed. This is a formulation/data review, not numerical or
experimental qualification. Runtime checks belong to the parent's safe-dev
execution and require a separate final evidence review.

## Verified existing path

`scientific/coupled-axial-v74/coupled.py` accepts full r,z rotation and supplies
actual TypeScript current, FiPy torsional diffusion and composite thermal
conduction. Its inertia and gas heat capacities are fixed. In contrast,
`src/fuel-spatial-operation.ts` has evolving radial species and advected
angular momentum, but projects electrical fields into radial cells.
`src/fuel-gas.ts` explicitly labels its independent-species pressure-drift
model as prescribed-mobility overdamped transport, not Maxwell–Stefan or
meridional momentum. Extending that closure to r,z does not by itself create
a self-consistent binary neutral-fluid simulation.

The root difficulty is physical closure: moving gas changes mass, angular
momentum, heat capacity and pressure together. Resetting density and keeping
the old `rho*dOmega/dt` or fixed-inventory thermal equation would silently
create or destroy momentum/energy.

## What existing expert codes establish

[Cantera 3.2 governing equations](https://www.cantera.org/stable/reference/onedim/governing-equations.html)
define species mass flux relative to mass-average velocity and explicitly
correct mixture-averaged fluxes to make their sum zero. Species enthalpy
transport appears in the temperature equation. Their published one-dimensional
form is an equation reference and possible property/reference solver, not a
drop-in axisymmetric centrifuge backend. Soret requires an explicit modeling
choice; its absence must remain visible.

The maintained [PeleLMeX formulation](https://raw.githubusercontent.com/Pele-Suite/PeleLMeX/development/Docs/sphinx/manual/Model.rst)
evolves conserved species density and enthalpy, coupled to momentum, an ideal
mixture EOS and a velocity-divergence constraint. It includes a closed-chamber
pressure evolution rather than holding pressure fixed during sealed-volume
heating. Its standard low-Mach decomposition uses spatially uniform
thermodynamic pressure and a dynamic perturbation of relative order Mach².
**Inference:** that formulation cannot simply be applied unchanged to a
strongly centrifuged gas with order-one radial pressure variation. Use a
documented low-swirl-Mach limit, an appropriate stratified base state, or
compressible momentum. PeleLMeX provides an expert reference architecture;
adopting the entire AMReX application would be a separate engineering task.

[COMSOL 6.4 Maxwell–Stefan theory](https://doc.comsol.com/6.4/doc/com.comsol.help.fce/fce_ug_chemsptrans.08.168.html)
identifies composition, pressure, temperature and species forces as the
general diffusion drivers, with fluxes defined relative to mass-average
velocity. Pressure diffusion is central to centrifugation: ordinary Fick
diffusion alone cannot reproduce different-mass rotating equilibrium.

[FiPy's conservation equation](https://pages.nist.gov/fipy/en/latest/numerical/equation.html)
uses the conservative transient derivative of coefficient times field.
Its [exponential convection term](https://pages.nist.gov/fipy/en/latest/generated/fipy.terms.exponentialConvectionTerm.html)
and [scheme documentation](https://pages.nist.gov/fipy/en/4.0/numerical/scheme.html)
offer existing finite-volume convection/diffusion machinery. Those tools do
not supply a missing pressure or thermodynamic closure. Keeping existing
FiPy/SciPy operators is reasonable if the coupling and source identities are
independently derived and checked.

## Minimum conservative contract (derived recommendation)

For species mass densities `rho_s`, mixture mass-average meridional velocity
`u`, diffusion mass fluxes `j_s`, and common azimuthal speed `r*Omega`:

```
rho = sum_s rho_s
d(rho_s)/dt + div(rho_s*u + j_s) = 0
sum_s j_s = 0
d(rho)/dt + div(rho*u) = 0
d(rho*r²*Omega)/dt + div(rho*u*r²*Omega) = viscous torque + J×B torque
Ugas = (3/2) kB sum_s Ns * T
q = -kappa*grad(T) + sum_s h_s*j_s
```

These are continuum balances, not a supplied numerical discretization. A
single common azimuthal velocity and zero net diffusive mass flux make the
diffusive angular-momentum flux cancel. If species have separate azimuthal
velocities, that cancellation is no longer available and a multifluid closure
is needed. Meridional momentum, pressure work and kinetic energy must be
included consistently, or their omitted work explicitly identified as external
to a constrained transport model. A globally closed ledger alone cannot prove
that the omitted fluid equations hold.

A prescribed-flow or overdamped manufactured transport study can be a useful
interim test. It must say what sets that velocity/mobility, track its work, and
retain an explicit non-hydrodynamic qualification boundary. It must not be
reported as a validated centrifuge-density evolution model.

## Selected compressible isotope case and binary face flux

The parent selected compressible 36Ar/40Ar around 350 K, rather than importing
the old independent-species overdamped closure. For an ideal binary gas with
equal body force per unit mass and Soret omitted, reduction of the
Maxwell–Stefan driving force gives (derived here):

```
Y = rho_light/rho
mbar = 1 / (Y/m_light + (1-Y)/m_heavy)
j_light = -rho*D*[grad(Y) + Y*(1-Y)*(m_heavy-m_light)/mbar*grad(ln p)]
j_heavy = -j_light
```

The sign makes the light species move toward lower pressure at uniform
composition; no second independent centrifugal body-force term should be
added to this pressure-driving term. Rotation enters through the resolved
mixture momentum and pressure field. Adding centrifugal drift a second time
would double-count the same common mechanical forcing. Internal energy is
`(3/2)*kB*T*sum(Ns)`, pressure is `kB*T*sum(Ns)/V`, and species enthalpy per kg
is `(5/2)*kB*T/m_s`. Thus equal/opposite diffusive mass fluxes can carry a
nonzero enthalpy flux when isotope masses differ.

For a face directed from cell a to b, the proposed bounded binary flux is:

```
B(x) = x/expm1(x), B(0)=1
psi = (m_heavy-m_light)/mbar_face * (ln(p_b)-ln(p_a))
F_light = rho_face*D_face*area/distance *
          [B(psi)*Y_a*(1-Y_b) - B(-psi)*Y_b*(1-Y_a)]
F_heavy = -F_light
```

**Analytical checks:** at zero pressure gradient it reduces exactly to the
ordinary two-point Fick flux. Expanding smooth neighboring states recovers
the continuum equation above. For frozen positive transport coefficients it
increases with `Y_a` and decreases with `Y_b` on `[0,1]`, and vanishes when
`logit(Y_b)-logit(Y_a)=-psi`. These are useful consistency/boundedness and
discrete equilibrium properties. They do not prove global entropy stability
of a coupled compressible integrator, nor exact preservation of the continuum
rotating equilibrium at finite spacing when `mbar` varies over a face.

This expression should be labeled a **consistent Bernoulli binary
finite-volume flux**, not an exact integrated Maxwell–Stefan face solution.
The [WIAS review of generalized Scharfetter–Gummel methods](https://www.wias-berlin.de/preprint/2263/wias_preprints_2263.pdf)
distinguishes exact local nonlinear flux integration from modified formulas
and emphasizes testing equilibrium and dissipation. Its semiconductor results
do not independently validate this gas-mixture adaptation. No existing
production binary-gas implementation of this exact blocked formula was
identified in the reviewed sources.

## Public coefficient data and scope

[NIST TN 2279](https://nvlpubs.nist.gov/nistpubs/TechnicalNotes/NIST.TN.2279.pdf)
Table 1a, printed p.8/PDF p.13, gives evaluated rare-gas diffusion fits at
101325 Pa. Its convention is
`ln(D/[cm²/s]) = A + B/(T/K) + C*ln(T/K)`.

The Ar self-diffusion row gives 235–418 K, `D298=0.182 cm²/s`,
`A=-11.097`, `B=-45.486`, `C=1.676`; its uncertainty cell is blank. That blank
does not establish zero uncertainty. Converting cm²/s to m²/s requires 1e-4.

Natural-Ar self-diffusion is not directly measured 36Ar–40Ar diffusion. Using
it for isotope/label controls is an explicitly approximate property choice;
same-atom labels are the cleaner identical-species limit. Neither those data
nor the existing natural-Ar viscosity/conductivity validate lithium plasma.
Do not extrapolate the Ar fit above 418 K merely because the wall is hot;
admit the actual gas-temperature range reached by each trajectory.

The dilute ideal-gas approximation uses

```
D(T,p) = 1e-4 * exp(-11.097 - 45.486/T + 1.676*ln(T)) * 101325/p   [m²/s]
```

Here T is kelvin and p is pascals. The inverse-pressure convention is also
implemented in [Cantera GasTransport.cpp](https://www.cantera.org/3.1/cxx/d5/de4/GasTransport_8cpp_source.html),
`getBinaryDiffCoeffs`, where symmetric temperature-dependent pair values are
divided by pressure. Dilute inverse-pressure scaling is a kinetic-model
assumption, not additional low-pressure experimental data in TN 2279. It does
not remove continuum/Knudsen limits at very low pressure.

For this bounded first isotope case, retain the existing natural-Ar
`mu(T),kappa(T)` as a **composition-independent property approximation**,
while using actual isotope masses in number, pressure, energy and diffusion
equations. This reuses sourced coefficients without inventing cross-collision
data. The simple identical-potential kinetic scaling, `mu proportional to
sqrt(m)` and `kappa proportional to 1/sqrt(m)`, suggests a roughly 5% variation
between pure 36Ar and natural-Ar properties. That is an approximate scale,
not an experimental error bound. Adding a new mixing rule would add another
untested approximation; a future Cantera/kinetic-potential comparison can
quantify this closure separately from numerical convergence. Soret and Dufour
effects remain omitted, rather than implicitly zero in the actual isotope gas.

## Required distinguishing controls

- Recover v74 when species flux and meridional transport are disabled.
- Preserve each closed species inventory and positive cell storage; do not
  clip or renormalize an unconverged state.
- Sum species continuity to the actual mixture continuity equation, and check
  the angular-momentum equation with old and new inertia separately.
- For a force-free physical binary mixture, reject a flux construction whose
  sum is nonzero in the mass-average frame. Changing total density requires
  mixture motion, external mass exchange, or a separately declared closure.
- Recover equal-species label mixing with no artificial mass separation.
- Check the isothermal rigid-rotation equilibrium independently:
  `n_s proportional to exp(m_s*Omega²*r²/(2*kB*T))`, with species totals fixed.
  Do not confuse numerical cell-center equilibrium with the exact cell average.
- Transport species enthalpy and momentum using the same accepted face
  transfers as continuity; check local and global energy, signed pressure/
  centrifugal work, positive physical dissipation, and separate numerical loss.
- Refine radial spacing, axial spacing and time independently and jointly.
  Track density, species fraction, angular speed, temperatures, species flux,
  endwall torque and heat/current observables at the same scheduled times.
- Include a changed-density negative control: old fixed-inertia or fixed-Cv
  assembly must fail the independent momentum/energy reconstruction.

No final runtime or experimental signoff is supplied by this source review.

## Frozen v75 physical-regime assessment

These are nominal scale estimates for `rho=0.001 kg/m³`, `T=350 K`, equal
36Ar/40Ar mass fractions, `R=0.06 m`, `L=0.14 m`, and the 10–40 µs observation
window. They are not extracted trajectory diagnostics. Only this review was
updated; no frozen scientific source was changed or executed for this estimate.
The arithmetic uses the already declared natural-Ar viscosity/conductivity
approximation and isotope EOS, not newly measured isotope-mixture properties.

Use the viscosity-based mean-free-path convention documented in the
[COMSOL CFD guide, slip boundary condition for gases](https://doc.comsol.com/6.4/doc/com.comsol.help.cfd/CFDModuleUsersGuide.pdf):

```
mbar = 1/(Y/m36 + (1-Y)/m40) = 37.895 u
p = rho kB T/mbar = 76.8 Pa
mu = 2.54e-5 Pa s; nu = mu/rho = 0.0254 m²/s
lambda = (mu/p) sqrt(pi kB T/(2 mbar)) = 0.115 mm
cbar = sqrt(8 kB T/(pi mbar)) = 442 m/s
tau_collision_scale = lambda/cbar = 0.260 microseconds
```

Mean-free-path definitions differ by order-one collision-model conventions;
this is a viscosity-equivalent estimate, not a species-resolved measured
collision time. The maintained [SPARTA mean-free-path/collision-time diagnostic](https://sparta.github.io/doc/compute_lambda_grid.html)
instead uses all species' pairwise VSS parameters and densities. That is an
appropriate kinetic cross-check once justified isotope-pair collision inputs
are available; substituting an arbitrary single-species parameter set would
not supply isotope validation.

On the complete apparatus scales, `Kn_R=0.00191` and `Kn_L=0.000820`, so a
smooth bulk continuum model is plausible. This does not establish no-slip
wall accuracy. The [COMSOL regime guidance](https://doc.comsol.com/6.3/doc/com.comsol.help.mfl/mfl_ug_modeling.05.18.html)
places ordinary continuum, slip and transition ranges at roughly below 0.01,
0.01–0.1 and above 0.1 respectively. These boundaries are heuristics tied to
the relevant physical gradient length, not a numerical cell-size criterion.

For an early wall-induced disturbance, define an order-one viscous penetration
scale `delta_nu=sqrt(nu t)`. The factor of two in the Stokes similarity
coordinate, or a chosen velocity-percent thickness, changes its numerical
definition; it does not change the following order-of-magnitude warning.
The unsteady momentum-diffusion scaling follows the
[Stokes first-problem solution in the NTNU numerical-methods notes](https://leifh.folk.ntnu.no/teaching/tkt4140/._main035.html).
The declared NIST diffusion fit gives `D=0.0322 m²/s` here. With
`kappa=0.0198 W/(m K)` and binary `cp=549 J/(kg K)`, thermal diffusivity is
`alpha=0.0361 m²/s`.

| Time | `sqrt(nu t)` | `lambda/sqrt(nu t)` | `sqrt(D t)` | `sqrt(alpha t)` |
| --- | --- | --- | --- | --- |
| 10 µs | 0.504 mm | 0.228 | 0.568 mm | 0.601 mm |
| 20 µs | 0.712 mm | 0.161 | 0.803 mm | 0.850 mm |
| 40 µs | 1.007 mm | 0.114 | 1.136 mm | 1.202 mm |

If dynamically important shear, thermal or composition gradients develop on
these lengths, molecular nonlocality is a meaningful model uncertainty;
refining a continuum grid does not remove it. It would be premature to assign
the whole frozen run to the transition regime from this table: its initial
angular velocity is already zero at the endwalls and varies as `sin²(pi z/L)`,
so it is not Stokes' impulsively started plate. Its initial axial variation is
centimetric. A strong submillimetre boundary layer must be demonstrated from
the actual evolving solution, rather than assumed from a dimensional scale.
At this early time `Omega*t=0.009–0.036`, so a fully developed rotational
Ekman layer, whose nominal `sqrt(nu/Omega)` scale is 5.31 mm, is not established
by the observation window either.

For local assessment, report a gradient-length diagnostic, for example
`lambda*abs(grad(rho))/rho` and `lambda*abs(grad(T))/T`, along with shear and
species-gradient scales. A velocity ratio must use a finite physical velocity
scale near stagnation or no-slip points; blindly dividing by zero velocity
manufactures a breakdown flag. The gradient-length method and the often-used
0.05 warning criterion are described in this
[NASA-hosted rarefied/continuum modeling seminar](https://www.nas.nasa.gov/assets/nas/pdf/ams/2022/AMS_20220802_Singh.pdf).
That threshold is a diagnostic convention, not a universal error bound for
this rotating binary mixture.

For wall torque, a defensible next comparison is a Maxwell slip condition
`slip_length=lambda*(2-TMAC)/TMAC`, using independently justified tangential
momentum accommodation for the actual gas/surface. Even perfect diffuse
accommodation gives a slip length of order 0.115 mm in this convention. Its
ratio to a genuine 0.5–1 mm shear layer would be about 0.11–0.23, enough that
no-slip torque should not be claimed accurate at a few percent without a
sensitivity check. This ratio is a scale warning, not a predicted torque
error. The existing prescribed gas-wall conductance also needs accommodation
and temperature-jump validation; a fitted contact coefficient is not evidence
of a kinetic boundary law.

The instantaneous Maxwell–Stefan/Fick constitutive closure assumes collisional
relaxation faster than macroscopic evolution and gradient lengths larger than
molecular transport lengths. The first output is approximately 39 nominal
collision times after initialization; the last is approximately 154. Thus
neglecting diffusion-flux inertia is plausible for smooth, slowly changing
bulk fields. It does not justify abrupt submicrosecond forcing, a kinetic
wall layer, or sharp species fronts. The diffusion-inertia scale
`D*mbar/(kB*T)` is approximately 0.420 µs, supporting the same order-of-magnitude
assessment. Taking PDE time steps below a collision time neither invalidates
the numerical integration automatically nor adds the missing kinetic physics.

Consequently, numerical convergence can qualify this declared continuum
research model, while first-order physical wall-braking and wall-heat-transfer
accuracy remain conditional on evolving gradient diagnostics and a slip/jump
or kinetic comparison. None of these neutral-Ar estimates establishes the
conductivity closure of a partially ionized gas, lithium transport, or a
quantitative Marathon-device prediction.
