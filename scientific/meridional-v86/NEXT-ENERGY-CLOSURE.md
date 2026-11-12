# Next energy closure: friction channels and thermal exchange

12 November 2026. Source/formula research only; no project calculation, VM run
or implementation. Approximate numbers below are hand estimates rounded to two
significant figures, not executed validation results. They must be independently
recomputed before implementing a closure. No velocity/current fitting.

## Finding

**Neither depositing every watt into heavy-particle temperature nor assigning
every watt to electrons is justified by the source tensor.** Its ion-slip term
already represents dissipative ion–neutral relative motion. The strongest
immediately justified next diagnostic is to separate parallel/electron-friction
and perpendicular/ion-slip heating, before choosing an energy evolution model.
That decomposition does not by itself supply the complete species temperatures.

## What the existing coefficients identify

Write the source's positive-magnitude tensor as `P=sigma*(1+s)/D`,
`h=sigma*beta_e/D`, `D=(1+s)^2+beta_e^2`, where
`s=xi_n^2 beta_e beta_i` and `sigma=sigmaParallel`. Direct inversion gives

`P/(P^2+h^2)=(1+s)/sigma`, `h/(P^2+h^2)=beta_e/sigma`.

Consequently its symmetric dissipation is exactly

`Q=J dot Eprime=(Jparallel^2+Jperp^2)/sigma + s Jperp^2/sigma`.

Hall resistivity makes no contribution to that scalar product. Under the
same source approximations, `s/sigma=xi_n^2 B^2/(rho_i nu_i)`: the second
term is the ion-slip/ambipolar friction channel, while the first is the
electron-collision resistive channel. The first coefficient includes both
electron–ion and electron–neutral momentum collisions. It is not exclusively
electron–ion Spitzer heating.

This interpretation is consistent with the original source Eq.7–8 and the
centre-of-mass ambipolar derivation, Eqs.45–50, in
[Ballester et al., Partially Ionized Plasmas in Astrophysics](https://www.issibern.ch/teams/pipa/publications/PIPA_SSR.pdf).
Retain its omissions: neglected drift inertia, prescribed microscopic rates
and neglected differential pressure/battery forces. A temperature-pressure
extension must revisit those omissions rather than reuse a neutral-frame
formula with mixture-frame velocity.

For **perpendicular heating alone**, the slip-channel fraction is `s/(1+s)`.
At the finite-neutral Te=1 eV endpoints this is approximately 98.9% centrally
and 87.1% at 5 cm. These are not whole-device heavy-heating fractions: near
the axial cathode current the parallel channel has no ion-slip term. Compute
the actual spatial/port-integrated heating budgets before drawing conclusions.
If using only `Jr`, reconstruct `Jtheta`; `Jperp^2=Jr^2+Jtheta^2`, including
the radial-flow Hall response. Current fractions cannot replace heat fractions.

For an elastic collision pair a,b with drag coefficient
`K_ab=m_a n_a nu_ab=m_b n_b nu_ba`, relative drift removes mechanical energy
at `K_ab |u_a-u_b|^2`. A simple isotropic elastic pair model assigns fractions
`m_b/(m_a+m_b)` to a and `m_a/(m_a+m_b)` to b. Thus equal-mass Ar ion/neutral
friction directly warms both heavy species; electron-heavy drift dissipation
initially mainly randomizes electron motion. Velocity-dependent cross sections,
charge exchange and temperature distributions require the corresponding
collision moments, not an unexplained fixed partition factor. See the primary
species-heating derivation in
[Strangeway (2012)](https://doi.org/10.1029/2011JA017302).

## Electron-heavy thermal exchange is a different term

[Goebel and Katz, §3.5.3, Eq.3.5-36](https://descanso.jpl.nasa.gov/SciTechBook/series1/Goebel_03_Chap3_plasphys.pdf)
separate frictional heating, elastic temperature equilibration and inelastic
losses. For Ar with the stated collision-frequency convention, their leading
electron elastic energy loss is

`Qe_exchange=-3 ne kB (me/MAr) [nu_ei (Te-Ti)+nu_en (Te-Tn)]`.

Equal-and-opposite energy enters the heavy equations. With Ti=Tn held fixed,
the electron-temperature relaxation time is
`tau_eh = MAr/[2 me (nu_ei+nu_en)]`. It is **not** the electron momentum time
`1/nu_e`. Conductivity, momentum-deflection and Maxwellian energy-transfer
frequency conventions must be reconciled; these order estimates do not certify
the prefactor of a modern Landau/Spitzer implementation.

The frozen source endpoints imply the following conditional estimates:

| Quantity | r=0 | r=5 cm |
|---|---:|---:|
| beta_e / beta_i at Te=1 eV |100 / .94|38 / .18|
| nn, m^-3 |4.3e20|4.5e21|
| ne implied by sigma B/(e beta_e), m^-3 |8.7e18|2.0e19|
| nu_e=eB/(me beta_e), s^-1 |2.3e8|6.0e8|
| nu_en=nn Qen sqrt(8 e Te/(pi me)), s^-1 |1.2e7|1.2e8|
| tau_eh at Te=1 eV |160 microseconds|61 microseconds|
| tau_eh at Te=2.5 eV under frozen V82 rate scaling |500 microseconds|120 microseconds|
| 1/nu_i=beta_i MAr/(e B) |3.0 microseconds|.57 microseconds|

Inputs are B=.13 T, Qen=4e-20 m^2 and the source's rounded microscopic
endpoints, as preserved in `transport82.py` and `argon-viscosity-source.json`.
The Te=2.5 eV row uses V82's explicit `nu_ei~Te^-3/2`, `nu_en~Te^1/2`, fixed
Coulomb logarithm/densities/cross section; it is not new experimental data.
The collision rates are conditional initial-state estimates and cannot be
held fixed through the approximately 600,000 K one-temperature release.

The 4-microsecond comparison interval is short relative to these electron
elastic equilibration times. Instantaneous transfer of the electron-friction
channel into a common heavy temperature therefore lacks justification. This
does not make a constant small heating fraction valid: electron temperature,
conductivity, excitation and ionization can change rapidly as energy accumulates.

Ion–neutral thermal equilibration needs its own moments. If the source nu_i is
identified with charge-exchange-dominated Ar ion–neutral momentum relaxation,
the equal-mass temperature-difference time is of order 1/(nu_in+nu_ni), with
`nu_ni=(ni/nn)nu_in`; it is about 3/.57 microseconds at those endpoints. The
core is therefore not uniformly in a limit of instantaneous Ti=Tn over this
release. The neutral bath's response to ions maintained at a different Ti has
the much longer inverse nu_ni scale, about 150/130 microseconds. Do not confuse
that fixed-ion bath time with the coupled temperature-difference decay time.

## Reviewable next implementation

1. Preserve V86 as the explicit all-to-heavy adiabatic control. First add a
   sealed per-cell/per-port resistive-versus-slip heating ledger, derived from
   the same discrete current and segment work, and check that it sums exactly
   to the existing nonnegative heating. No solution should change at this step.
2. Evolve electron internal energy separately. Retain an Ar ion/neutral split
   until the ion-neutral equilibration reduction is independently justified.
   Couple equal-and-opposite exchange energies conservatively, rather than
   updating temperatures without their capacities. FLASH's existing
   [Heatexchange implementation](https://flash.rochester.edu/site/flashcode/user_support/flash_ug_devel/node123.html)
   is a useful conservative Spitzer reference, but supplies no neutral/cathode
   or partially ionized Ar chemistry by itself.
3. Recompute collision rates/ionization and pressure from that evolving state.
   Existing electron-kinetic tools include
   [BOLSIG+](https://www.bolsig.laplace.univ-tlse.fr/index.html) and
   [LoKI-B++/LoKI-MC](https://nprime.tecnico.ulisboa.pt/loki/tools.html), with
   versioned [LXCat](https://us.lxcat.net/data/set_databases.php) Ar elastic,
   excitation and ionization cross sections. Their local/two-term or Monte
   Carlo assumptions and magnetic-field support must be matched explicitly.
4. Specify independent wall/sheath radiation, mass injection/exhaust and heat
   boundaries before attempting a steady apparatus comparison. These are
   external sinks and boundary physics; electron-heavy exchange merely moves
   energy internally and cannot make a closed positive-power vessel steady.

None of these steps licenses selecting a cooling coefficient, partition or
observation time from the velocity residuals. A conservative multi-temperature
release is an identifiable next physics improvement; a matched steady discharge
still requires missing independent boundary/diagnostic information.
