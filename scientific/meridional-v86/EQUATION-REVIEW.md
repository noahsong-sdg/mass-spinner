# Meridional coupling: independent equation and scope review

12 November 2026. Read-only code/source investigation. No scientific code,
project script, PDF parser or VM command was run by this reviewer. The parent
owns safe-dev execution. No measured current or velocity was used to choose a
coefficient, boundary condition or circulation amplitude.

## Trace and smallest coherent extension

The existing path is `campaign84 -> model82.properties -> transport82.profile
-> model84.solve`. V84 already solves axial current and viscous angular-momentum
transport. Its material fields are radial profiles copied along z. V85 adds
Hall-inclusive pressure compatibility and torque diagnostics but does not evolve
meridional flow, mass or energy. Thus an extra endwall drag is not the missing
term. The missing feedback is advection, pressure/density/energy response and
radial-flow electromagnetic response.

A defensible first backend can be a separately labelled fixed-composition,
single-fluid, axisymmetric continuum problem with independently specified
boundaries and a conservative total-energy ledger. It is not automatically a
matched weakly ionized discharge. The full apparatus prediction additionally
needs finite contact physics, mass/thermal boundary inputs and an electron/
ionization closure. Keep these qualification boundaries visible in results.

## Equations and signs

Use a right-handed cylindrical basis, imposed `B=B ez`, velocity
`u=(ur,v,uz)`, `v=r Omega`, specific angular momentum `ell=r v`, and
`divm(a)=r^-1 d_r(r a_r)+d_z(a_z)`. All derivatives below are axisymmetric.
Pressure is thermodynamic pressure in Pa, not pressure divided by density.

Continuity must use the same face mass flux as all advective equations:

`d_t rho + divm(rho um) = 0`, where `um=(ur,uz)`.

With `D=d_t+ur d_r+uz d_z`, meridional momentum is

`rho (D ur - v^2/r) = -d_r p + (div tau)_r + B Jtheta`,

`rho D uz = -d_z p + (div tau)_z`.

For isotropic Newtonian stress with zero bulk viscosity,
`tau=2 mu [S-(div u) I/3]`, `S=(grad u+grad u^T)/2`. The cylindrical entries
are `Srr=d_r ur`, `Stt=ur/r`, `Szz=d_z uz`,
`Srz=(d_z ur+d_r uz)/2`, `Srt=(d_r v-v/r)/2`, `Szt=d_z v/2`.
In particular,

`(div tau)_r = r^-1 d_r(r tau_rr)+d_z tau_rz-tau_tt/r`,

`(div tau)_z = r^-1 d_r(r tau_rz)+d_z tau_zz`.

For variable mu these are stress divergences, not simply `mu laplacian(u)`.
Omitting the `-tau_tt/r` term produces a spurious radial viscous force even
in simple axisymmetric manufactured cases.

Angular momentum should be evolved conservatively:

`d_t(rho ell)+divm(rho um ell)`
` = r^-1 d_r(r^2 tau_rtheta)+d_z(r tau_ztheta)-r B Jr`.

Here `tau_rtheta=mu r d_r Omega` and
`tau_ztheta=mu r d_z Omega`. The zero-meridional steady limit is exactly the
V84 torsional equation. Closed-wall meridional advection creates no net torque;
the integrated Lorentz torque still follows the boundary-current radial second
moment. It can change local velocities and wall stresses.

For the positive-magnitude API `h=hallSM=-sigma_H_source`, `P=pedersenSM`,
`A=sigmaParallelSM`, and `E=-grad phi`, the required moving-fluid fields are

`Eprime_r=-d_r phi+v B`, `Eprime_theta=-ur B`, `Eprime_z=-d_z phi`.

The positive Hall mapping checked against original p.675 is

`Jr=P Eprime_r-h Eprime_theta`,
`Jtheta=h Eprime_r+P Eprime_theta`, `Jz=A Eprime_z`,
`divm(J)=0`.

Consequently the radial-flow feedback is not optional:

`Jr=P(-d_r phi+v B)+h B ur`,

`B Jtheta=B(h/P) Jr-B^2(P+h^2/P) ur`.

The first term is V85's Hall radial force; the second is nonnegative radial
magnetic damping. The azimuthal force is `-B Jr`. Holding the V84 current
unchanged while adding only hydrodynamic advection omits this charge/force
feedback and generally fails the electromagnetic power identity.

## Energy, pressure and composition closure

Let `Etotal=e+|u|^2/2` and `q=-k grad T`. For a single-temperature,
fixed-composition material without radiation or external species sources,

`d_t(rho e)+divm(rho um e)`
` = -p divm(um)+tau:grad u-divm(q)+Qohm`,

`Qohm=J dot Eprime=P(Eprime_r^2+Eprime_theta^2)+A Eprime_z^2 >= 0`.

Hall current itself does not dissipate. The equivalent total-energy equation is

`d_t(rho Etotal)+divm[rho um Etotal+p um-(tau dot u)_m+q] = J dot E`.

This follows because `u dot (J cross B)+Qohm=J dot E`; counting both
`J dot E` and Lorentz mechanical work as thermal inputs double counts energy.
With `divm(J)=0`, `J dot E=-divm(phi J)`, so electrode electrical power
enters the closed-system boundary ledger exactly once.

For neutral monatomic Ar one may declare `p=rho R_Ar T`, `e=3 R_Ar T/2`,
but this neglects charged-particle pressure and separate electron energy.
For a singly ionized fixed-composition LTE mixture with ion number fraction x,
`p=(1+x)rho R_Ar T` and translational `e=3(1+x)R_Ar T/2`.
For distinct temperatures the pressure is instead
`p=(nn+ni) kB Th+ne kB Te`; the heavy and electron internal energies and
their interspecies exchange must be distinguished. Imposing Te=1/2.5 eV while
depositing all `Qohm` into a heavy-temperature equation is a declared thermal
approximation, not a self-consistent nonequilibrium energy closure.

Original 1979 p.675 explicitly substitutes experimental temperatures rather
than solving energy. The existing neutral/ion density and collision profiles
are conditional, so a new mass equation cannot simultaneously evolve density
and enforce both old density profiles everywhere. Fixed Eulerian transport
coefficients can define a verification/sensitivity problem; they cannot be
described as constitutive properties responding self-consistently to the
evolved material. Likewise, thermal evolution with no density/EOS feedback is
passive heat transport, not full momentum/continuity/energy coupling.

`div(um)=0` is a constant-density approximation. A streamfunction enforcing
`div(rho um)=0` instead is an anelastic steady constraint, not an evolving
mass equation. Neither becomes compressible continuity merely by storing rho.
Check the full velocity Mach number, including swirl, before using low-Mach
approximations; small meridional Mach number alone is insufficient. The
5950-to-1800 K conditional radial temperatures are not a small Boussinesq
perturbation.

## Boundary and optical requirements

At solid stationary walls use no penetration and resolved no slip. At the
axis require `ur=v=0`, and even scalar/uz symmetry. At a midplane half-domain,
`uz=0` and even `ur,v,p,T`; this does not require `ur=0` there. Actual hollow
cathodes may introduce mass, enthalpy and angular momentum. An impermeable
closed vessel is an explicit alternative, not the measured injection condition.

Specify initial inventory/thermodynamic state and wall temperature or thermal
flux independently. Do not set pressure and density everywhere in addition
to a different EOS. Ideal Neumann current rings have contact-cutoff-dependent
voltage and Joule power; that singular source cannot supply calibrated thermal
forcing. A finite contact footprint/thermal law must be fixed from independent
geometry/data, with sensitivities retained rather than tuned using velocities.

Meridional flow also reaches the optical forward model. For side-on sightline
coordinate x and impact b, `r=sqrt(x^2+b^2)`, a consistent frozen-sign choice
is `uLOS=ur*x/r-v*b/r`. Symmetric radial emission cancels ur in the exact
centroid but adds spectral broadening and can alter mode-based estimators.
The original rotation-only operator must therefore be extended, or the omitted
radial contribution bounded, before claiming a full meridional spectral
comparison. Pure radial flow has zero centroid and nonzero extra variance.

## Existing code and acceptance gates

[OpenFOAM's energy guide](https://doc.cfd.direct/openfoam/energy-equation/)
distinguishes internal/total energy and shows that some historical common
solver energy forms omit viscous mechanical sources; the actual selected
version must be inspected. Wall viscous heating matters here. Its
[thermophysical guide](https://doc.cfd.direct/openfoam/user-guide-v13/thermophysical)
provides explicit EOS, heat-capacity and transport choices. Using established
pressure/velocity/energy machinery is preferable to assuming that a generic
MHD solver already implements this weak-ionization Hall tensor.

[FiPy's Stokes cavity](https://pages.nist.gov/fipy/en/stable/generated/examples.flow.stokesCavity.html)
demonstrates pressure correction and Rhie-Chow interpolation but expressly
documents flow-accuracy limitations. It is a useful independent reduced
control, not a ready-made high-fidelity apparatus solver. Existing-code use
must mean actual executed equations/benchmarks, not merely importing a package.

Freeze gates and scenarios before the optical scoring stage:

- Smooth cylindrical manufactured continuity/momentum/energy solutions,
  including variable mu, geometric stress and axis regularity.
- Zero-drive equilibrium; solid-body rotation/centrifugal pressure equilibrium;
  pure conduction; adiabatic compression; no-torque angular-momentum transport.
- Hall zero/sign reversal and radial-flow EMF manufactured tests; enforce
  `Qohm>=0` and `J dot E=Qohm+u dot (J cross B)` independently.
- All-face mass/charge continuity; pressure/EOS defects; positive rho,T;
  angular momentum, full stress work, electrical and total-energy ledgers.
- Recover V84 when meridional velocity/thermal response is disabled, without
  fitting forcing or modifying original optical thresholds.
- Independent established-code control and joint r/z/timestep refinement using
  fixed physical integrals and resolved wall layers. Nonlinear tolerance
  convergence cannot substitute for spatial convergence.
- Pure radial optical centroid/variance, pure swirl regression, complete
  spectrum refinement and all previous optical alternatives preserved.

No new source recovered here supplies a matched axial temperature, circulation,
contact-heating or mass-injection map. A conditional coupled run can be useful
and compared without fitting, but agreement would not identify missing inputs
or independently validate the actual device.

## Follow-up: concrete source boundary audit

Both complete primary article bodies were reopened online in this turn:
[1979](https://www.researchgate.net/publication/276453995_A_Study_of_a_Weakly_Ionized_Rotating_Plasma)
and [1980](https://www.researchgate.net/publication/253120741_Limitations_on_Mass_Separation_by_the_Weakly_Ionized_Plasma_Centrifuge).
Retained original-page OCR p.673,678,682 was also read. This extends the
earlier code/doc trace, but is not a new visual inspection of the PDFs.

| Needed input | Recovered constraint | What is not licensed |
|---|---|---|
| 1979 finite anode | Stainless ring, axial thickness 2 cm; spacing 14 cm | Unique center-vs-clear-gap interpretation or sheath law |
| 1979 cathode | Tantalum hollow cathode, inner radius 4 mm | Outer radius, exposed length, emitting footprint or uniform disk current |
| 1979 mass boundary | 1 torr controlled in reservoirs behind cathodes | A gas injection velocity, throughput or interior fixed-pressure field |
| 1979 thermal wall/cathode | No quantitative matched thermal law recovered | A prescribed 300 K wall or cathode temperature |
| 1980 wall | Water-cooled walls mentioned; Fig.8 uses 400 K in a theoretical example | A measured 1979 wall temperature, thermal film or heat flux |
| 1980 cathode | Different tungsten cathodes, diameter 1.5 cm; ion/electron heating | Substituting their dimensions or heating into the 1979 case |

An existing finite 4 mm disk can be retained as a declared regularization to
obtain finite Joule power, provided every comparison retains that distinction.
A closed, adiabatic, finite-time run avoids inventing wall temperature or film
coefficients, but is a conditional transient. Positive sustained electrical
power in an insulated closed vessel prevents a thermal steady state; do not
report late-time stationarity merely because mechanical velocity appears flat.
Freeze reporting times/duration before scoring, retain the whole trajectory,
and do not select the instant closest to the measured stationary velocities.
Source temperatures may initialize a declared release experiment; they do not
independently establish its unknown axial state or elapsed experimental time.
