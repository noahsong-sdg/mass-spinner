# Independent gas-regime physics assessment

Reviewer: `/root/gas56_regime_physics`. Source inspection, primary-source
research and independent review of parent-executed safe-dev evidence; no
project or scientific code was executed by this reviewer. The parent owns
sequential offline safe-dev execution. This
report distinguishes necessary physical screens from validation of a gas
transport or discharge model.

## Execution path and actual assumptions

I traced `FUEL_PAIRS`/`DEFAULT_FUEL_CENTRIFUGE` in
`src/fuel-centrifuge.ts`, `simulateFuelOperation` in
`src/fuel-operation.ts`, the thermal checkpoint path and the exposed controls
in `src/fuel-centrifuge-ui.js`.

The setup obtains neutral number from `p_mean*V/(kB*T_initial)`, holds that
inventory fixed, and evolves global gas energy with `Cv=3*N*kB/2`. The gas
temperature feeds centrifugal redistribution and is simultaneously used as
the temperature adjacent to the wall film. The prescribed total gas–wall
conductance has units W/K; it is combined in series with the solid first-
half-cell resistance. A resolved tungsten wall does not resolve gas gradients.
Mean pressure evolves proportionally to the single gas temperature. The
thermal path rejects the explicit He/D2 molecular pair, appropriately avoiding
unmodeled internal modes.

The default scenario is Li6/Li7 at 500 K and volume-mean 10 Pa in a cylinder
of radius 0.12 m and length 0.8 m; thermal evolution is initially disabled.
When enabled, the default film is 0.1 W/K. The UI spans pressure 1–100 Pa,
gas temperature 300–2000 K, radius 0.05–0.3 m and length 0.2–2 m. Thermal
film inputs can reach 1e6 W/K. The v55 fast-wall benchmark instead used
length 0.5 m, `Cg=0.0006785840131753953 J/K` and film 1000 W/K. That
capacity-only benchmark does not identify a gas species. Its numerical
qualification is not physical validation of that heat-transfer rate.

Two independently entered quantities must not be repurposed as transport data:

- `collisionHz` sets prescribed ion→neutral mechanical torque relaxation.
  It is not a neutral–neutral collision rate, and does not establish a
  Maxwellian neutral velocity distribution or interspecies temperature
  equilibration.
- `radialDiffusivityM2S` is phenomenological species transport. It is not
  a measured gas thermal diffusivity and cannot establish temperature mixing.

## Recommended assessment hierarchy

**1. Identify the gas and data domain.** Use masses and fractions actually
selected, at the accepted gas state. Require sourced neutral transport data
or explicit collision-model assumptions. Atomic D/T is not molecular D2/T2;
helium transport is not lithium-vapor transport. Missing data should remain
unresolved rather than receiving a substituted species' parameters. All
assessments remain conditional on the atomic-state/chemistry assumption.

**2. Check local equilibrium and rarefaction.** Knudsen number is mean free
path divided by a relevant physical length. Official
[COMSOL regime documentation](https://doc.comsol.com/6.4/doc/com.comsol.help.mfl/mfl_ug_modeling.05.18.html)
uses the conventional continuum/slip/transition/free-molecular divisions
at Kn of 0.01, 0.1 and 10. These are regime screens, not error guarantees.
A thermal-gradient or density-gradient length can be shorter than the vessel
radius. A viscosity-derived mean free path must identify its convention;
it is not necessarily a literal mean distance between all binary collisions.
The precise convention
`lambda_mu=(mu/p)*sqrt(pi*kB*T/(2*m))` is Eq. 2.3 of
[Sharipov and Seleznev, Data on Internal Rarefied Gas Flows](https://srd.nist.gov/jpcrdreprint/1.556019.pdf).
For a mixture, substituting mixture viscosity and mean particle mass is a
declared bulk screening approximation, not species-resolved collision data.

In rotation, density is not uniformly `p_mean/(kB*T)`. For the code's
isothermal equilibrium reference,

`n_s(r)=N_s/V * beta_s*exp[-beta_s*(1-r²/a²)]/(1-exp[-beta_s])`,

with the continuous uniform limit at beta=0. Here
`beta_s=m_s*Omega²*a²/(2*kB*T)`. Therefore
`ell_n,s(r)=kB*T/(m_s*Omega²*r)` and at the wall
`ell_n,s=a/(2*beta_s)`. Both depleted-axis rarefaction and the dense wall's
short gradient length matter. The finite-time transport state should use
its actual accepted inventories/profile rather than being replaced by the
equilibrium reference. A small mean-density `lambda/a` alone is insufficient.

**3. Check timescale separation.** Compare a sourced neutral-collision or
relaxation time, radial/axial acoustic times and gas thermal diffusion time
with both actual forcing intervals and the imposed reservoir response
`tau_g=Cg/G`. For an atomic mixture at common temperature,
`c_sound=sqrt((5/3)*kB*T/m_mean)` is an ideal-gas acoustic estimate. It
does not certify temperature homogenization: sound communicates pressure,
whereas thermal mixing requires transport. Rigid-body rotation alone does
not supply radial turbulent mixing.

Continuum thermal diffusivity is conventionally `alpha=k_g/(rho*cp)`.
That local, acoustically equilibrated diffusion estimate must not silently
replace the global closed-vessel `Cv` reservoir capacity. A spatial gas
energy PDE must state its momentum/pressure/work closure. `a²/alpha` is
only a characteristic scale, with geometry and boundary-condition factors.
The large ratio `t_thermal_diffusion/tau_g` is a warning for the lumped
temperature assumption, not evidence of instability of the numerical wall
solver.

For a prescribed film `h=G/A`, a continuum Biot-like screen is
`Bi=h*(V/A)/k_g`. The conventional small-Bi rationale is that interior
conduction is fast compared with boundary exchange. A threshold such as
0.1 is heuristic and must be labeled; it neither validates the unspecified
film nor supplies missing local gas physics. At noncontinuum conditions,
Fourier diffusion and this continuum mixing screen are outside their domain.

**4. Check gas–wall collision energy availability.** A useful independent
screen needs no neutral cross-section data. For species s, a local incident
Maxwellian with zero normal drift gives wall number flux

`Gamma_s=n_s,wall*sqrt(kB*T/(2*pi*m_s))=n_s,wall*vbar_s/4`.

Its incident translational energy per hit is `2*kB*T`, rather than the
bulk-particle average `3*kB*T/2`. These integrals and the definition of
energy accommodation are explicitly given in
[NASA TM-88786, Appendix B, Eqs. B5–B11](https://ntrs.nasa.gov/api/citations/19860022180/downloads/19860022180.pdf).
For a stationary impermeable wall, excluding chemical, radiative and
tangential-drift energy transfer, the monatomic thermal contribution is

`Q_gas_to_wall=A*sum_s 2*kB*Gamma_s*alpha_E,s*(T-Twall)`.

Thus `G_T,max=A*sum_s 2*kB*Gamma_s` is a conditional single-interface
Maxwellian thermal-conductance ceiling when `0<=alpha_E,s<=1`. It must
use wall density, not volume-mean density after centrifugal stratification.
This is not an unconditional bound for an arbitrary nonequilibrium incident
distribution. It is also not a two-wall Kennard formula; the familiar
`alpha/(2-alpha)` factor for repeated encounters between two walls must
not be transplanted onto this one-wall, locally Maxwellian construction.

For uniform monatomic gas and only cylindrical side-wall area,
`Cg/G_T,max = 3*V/(A*vbar)` for one species, or
`(3/2)*a/vbar`. This wall-encounter timescale immediately tests whether a
prescribed ultrafast reservoir relaxation is even consistent with its own
Maxwellian interface assumptions. Failure is physical, not something to
repair by shrinking the timestep.

An inferred `alpha_required=G_prescribed/G_T,max` above one contradicts
this thermal-interface model. A ratio below one merely passes a necessary
availability screen: it does not measure accommodation, establish gas
uniformity or validate the prescribed conductance. Tangential gas/wall
slip contributes mechanical energy and momentum transfer separately; it
must not be reclassified as temperature-driven conductance. Adsorption,
condensation, recombination and evaporation require additional particle and
energy budgets, especially for lithium surfaces.

## Existing data and solver choices

[NIST's gas-property program](https://www.nist.gov/programs-projects/gas-properties-flow-metering)
identifies ab-initio dilute helium viscosity and thermal-conductivity data
over 1–10,000 K. The dedicated
[helium isotope study](https://www.nist.gov/publications/ab-initio-values-thermophysical-properties-helium-standards)
includes He3, He4 and their equimolar mixture. This is appropriate evidence
for a helium validation fixture with its exact composition/data domain,
not blanket coverage of every mixture fraction, atomic hydrogen isotope or
lithium scenario. The primary paper/data should be recorded at numerical
ingestion rather than silently extrapolating a single reference value.

FiPy is appropriate for a *continuum* spatial gas-energy reference after
the gas transport and pressure/work closure are specified. It does not
provide neutral collision cross sections, surface accommodation or kinetic
validity automatically.

[SPARTA](https://sparta.github.io/doc/surf_collide.html) is an existing DSMC
candidate for later rarefied comparisons. Its diffuse model makes a
fraction of reflections diffuse and the rest specular. Its CLL model has
separate normal/tangential accommodation parameters, and its rotating-wall
option handles tangential wall velocity. Those model parameters must not
be indiscriminately identified with one measured thermal-accommodation
coefficient. An executed DSMC reference additionally needs species collision
models, surface parameters and mesh/timestep/statistical convergence.
Documented code capability is not evidence that such a reference has run.

Published accommodation measurements illustrate why unity is only an upper
reference. The [1974 tungsten-wire experiment](https://doi.org/10.1016/0039-6028(74)90166-6)
reports helium thermal accommodation near 0.018 for its particular wire,
300 K incident gas, 1073–1785 K wall and roughly 1e-3 torr pressure. This
does not calibrate the simulator's unspecified surface, its lithium pair
or the whole operating range. Surface state, composition and temperature
must remain attached to any imported accommodation datum.

## Validation requirements

The assessment should preserve existing simulation trajectories and public
thermal parameters. It diagnoses model applicability; it should not silently
replace a conductance, clamp a gas state or treat a numerical integration
step as a physical mixing time.

Required independent checks are dimensions, composition/end-point limits,
pressure and geometry scaling, stationary zero-film/equal-temperature limits,
local rotating-density normalization, molecular-pair rejection and missing-
data behavior. A separate implementation or direct quadrature of the
Maxwellian wall-flux integral should verify the `2*kB*T` and `n*vbar/4`
factors. A helium data-point comparison supplies external transport evidence.
Negative controls must include a conductance above the full-accommodation
reference and a steep centrifugal density distribution that invalidates a
mean-density-only rarefaction claim.

No lumped-gas or full-device qualification is concluded merely from these
screens. A pass means no identified scale contradiction within the available
inputs; absent accommodation/mixing/transport data remains unresolved.

## Implementation review and independent executable audit

I inspected the new standalone `scientific/gas-regime-v56/assessment.py`,
`transport.py`, `run-assessment.py` and `export-cases.ts`. The fixed-inventory
and per-species number-density ownership follows the production path. The
accepted thermal states remain distinct from uniform parameter screens and
the v55 capacity-only benchmark's explicitly conditional compositions.
The assessment changes no simulator trajectory or existing film value.

Two API issues found during review have source-level corrections: nonfinite
angular speed now raises a domain error rather than producing nonfinite drift
power, and a one-cell profile now has an unresolved density-gradient Kn rather
than a spurious known zero. The acoustic fields explicitly identify their
bulk frozen-composition assumption. Source inspection confirms these changes;
the parent-run green log records all sixteen assessment regressions passing.

I authored `scientific/gas-regime-v56/audit-independent.py`, which imports no
assessment, transport, Cantera or simulator module. It reconstructs closed
species inventories, capacity, pressure, bulk sound and thermal-diffusion
scales from the exported inputs. Four independent SciPy half/full Gaussian
quadratures verify incident particle flux and flux-weighted `2*kB*T` energy;
the resulting numerical moments then check the reported wall reference. It
also checks the density form of the viscosity-path convention, local
gradient screens, zero-film/vacuum handling, isotope endpoint scaling and
the twelve He3/He4/equimolar tabulated temperature/composition sets I verified
directly in Hurly and Moldover's primary PDF. Every case must retain
`qualified=false`. A deliberately corrupted result should fail this auditor.

The executable audit verifies formulas, units, attribution and ownership. It
does not provide an independent gas PDE, a measured accommodation coefficient,
chemistry, spatial heating closure or a hardware validation. Sparse helium
temperature interpolation and the atomic-H isotope-potential substitution
remain model approximations even if their numerical implementation passes.

## Executed evidence reviewed

I read `scientific/fixes-v43/gas56-assessment.log`,
`gas56-independent.log`, `gas56-negative-controls.log`,
`gas56-tests-green.log`, `gas56-figure.log` and the assessment/auditor
receipts. Assessment and independent audit each exited zero with source
verification before and after against the same snapshot
`c8762f88e4029b8edc51f3686fc811e1e68f48631760ff4276e53c5be1dce6ab`.
The exported-input hash is
`3e2e58bd43bd64739e2e1b821a6baa16f470292edd1772e9657164cb0dc68394`;
the result hash is
`4f38f1defcd2e99ceb47dcfe58fd6fd6d19578ed4f89e3911d9aa136e9664ede`.

The audit checked 3,338 atomic cases and 649 unsupported molecular cases,
with maximum relative species-inventory reconstruction error
`2.9689e-15`. Numerical Gaussian moments returned incident energy `2.0*kB*T`;
all twelve independent NIST temperature/composition anchors were inspected.
All three deliberate corruption controls were rejected: one-percent capacity
error, use of the bulk `1.5*kB*T` moment for wall incidence, and one-percent
NIST conductivity error. The assessment exported no simulated-run failures.

The initial Li reference has radial acoustic scale 0.1201 ms, axial acoustic
scale 0.8007 ms, nominal film time 10.857 ms and bulk Cp diffusion estimate
24.133 ms. The latter-to-film ratio is 2.223, so the implemented gas-conduction
screen correctly does not support a lumped thermal closure despite the much
faster acoustic signal. Its initial radius-based viscosity Kn is 0.005417,
close enough to the heuristic continuum boundary that local density and
gradient effects must remain visible.

The accepted isothermal Li endpoint at 32/64/128 gas cells gives worst local
radius Kn 0.008410/0.008464/0.008492 and wall-interface references
10.974/11.048/11.086 W/K. The classification does not change in that refinement;
the finite-volume wall-cell proxy remains distinct from a reconstructed wall
trace. This is one finite-time configuration, not complete gas-transport
convergence or an error bound over all slider states.

For the capacity-only v55 fast benchmark, the five explicitly conditional
atomic identities give full-accommodation uniform-gas wall references
4.659–8.141 W/K. A prescribed film of 1000 W/K would require reference
accommodation 122.8–214.6. This contradicts the stated single-interface
Maxwellian thermal interpretation for those conditional inputs. It does not
invalidate the previous numerical wall stress test as a test of its declared
equations, nor establish an untested original gas identity.

Only 118 static slider-grid probes pass the implemented continuum/conduction
necessary screens; every physical-qualification flag correctly remains false.
There are local data gaps beyond cases counted as unknown *global* transport:
an initially equimolar helium gas can acquire non-equimolar cells during
separation, where the restricted table-based local transport is unresolved.
No lumped gas or gas–wall film is certified from this assessment alone.

I subsequently inspected the durable raw export at
`scientific/centrifuge-v44/gas56/studies/`: the independent audit JSON,
selected actual Li/He endpoint rows from `results.json`, the complete compact
Li thermal-sample/refinement findings and all three rejection tracebacks.
Read-only SHA256 checks of the input packet, result, audit and current auditor
source match their recorded values and export manifest. I also inspected the
PNG figure; its conditional-reference labels, proxy qualifications and plotted
timescales agree with the inspected records. In the opted-in Li trajectory,
the final sampled local radius Kn is 0.008867 and diffusion/film ratio is 1.222;
neither result licenses the lumped gas closure. The actual separated He endpoint
correctly retains null local transport/Kn while exposing its approximate bulk
property estimate.

The final gate receipt records all nine commands exiting zero with source
verification around each command, including build, typecheck and the sixteen
Python regressions. These checks leave `browserVerified=false` and
`calibratedMarathonDevice=false`. No remaining arithmetic, ownership or
reporting blocker was found within the conditional assessment's declared scope.
