# Marathon: next bounded realism work

Independent source/physics planning review, 7 November 2026. This agent owns
this report only and changed no application source. No simulation, test,
dependency installation or browser automation was executed by this agent.
Project execution, if needed later, must use Apple safe-dev VMs; the safe-dev
README and explicit browser-origin restriction were read and preserved.

## Recommendation and evidence boundary

Implement a **conditional transient target-assembly cooling explorer** next.
Use the existing deposited-power ledger as forcing and explicitly assumed
thermal capacity/cooling conductance. Add pulse duty/period and report beam-on
time, mean input and a thermal energy balance. Keep the existing slab and its
material-data limitation visible. This is a defensible extension in time;
it is not a measured Marathon target-temperature or lifetime calculation.

The highest-priority route to better **absolute yield accuracy** remains
material-resolved stopping and loading. That larger scientific gate is not
closed by adding thermal sliders. A readily available validated LiT/deuteron
dataset was not established in this review, so do not silently replace the
current closure with a guessed stopping formula.

Do **not** make fusion-only tritium consumption the principal target-degradation
model. It is useful as a labeled lower-bound inventory diagnostic, but important
transport and exchange pathways remain missing. A visually dramatic decay in
output manufactured from a short burnup timescale would reduce realism.

## Actual execution path and root cause

Read `fusion-reactor.ts`, `fusion-playground.ts`, `fusion-ui.js`,
`CORE-COVERAGE-02-V21.md`, the architecture/yield/target studies and v20 design
review. Controls feed a prescribed homogeneous tritium column and linear energy
loss; the nuclear kernel returns a steady probability, energy ledger and rates.
Exposure currently only multiplies rate by duration. No target state is
integrated, and source composition, material properties and transport are not
inferred from the rendering.

Technically, the current energy accounting has no state variable for stored
heat or coolant transfer; the inventory is a fixed input, not an evolving
conservation equation. Simply, the playground describes a steady exposure but
cannot yet show the target warming up, cooling down or accumulating exposure.

The smallest coherent correction is a separate bounded transient module driven
by the checked steady ledger. Replacing the nuclear model, inventing a LiT
desorption threshold or coupling temperature to yield without coefficients
would conflate distinct missing physics instead of fixing this omission.

## Fresh primary-source checks

- [Marathon architecture](https://www.marathonfusion.com/beam-driven-fusion/):
  accelerated deuterons encounter a solid LiT surface on a cooled substrate.
  The public page does not provide thermal geometry, measured conductance,
  target thickness or retention coefficients.
- [Marathon homepage](https://www.marathonfusion.com/): lithium deposition,
  cooling, tritide formation and in-situ regeneration are described as process
  capabilities. This supports showing their roles, not assigning renewal rates.
- [LLNL UCRL-51834, *A Model for Tritium and Deuterium Transport in Targets
  for Neutron Generators*](https://www.osti.gov/servlets/purl/4283123-gffPGP/):
  a titanium-tritide study treats transient heating and both thermal and
  irradiation-related isotope transport. Beam-power profile and cooling
  uncertainty affect the temperature history. Its Ti-target coefficients and
  geometry are not data for Marathon's LiT target.
- [Sandia, *Optimization of target lifetime for production of 14 MeV neutrons*
  (2020)](https://www.sandia.gov/research/publications/details/optimization-of-target-lifetime-for-production-of-14-mev-neutrons-2020-12-15/):
  isotope exchange, diffusion and permeation barriers affect target life in
  the studied metal-tritide systems. This directly challenges fusion burnup
  as a sufficient lifetime model. No Ti-temperature optimum is transferred to LiT.
- [NIST STAR introduction](https://physics.nist.gov/PhysRefData/Star/Text/intro.html):
  ESTAR, PSTAR and ASTAR address electrons, protons and helium ions. A proton
  table is not measured deuteron stopping in LiT.
- [Geant4 hadron/ion ionisation manual](https://geant4.web.cern.ch/documentation/pipelines/master/prm_html/PhysicsReferenceManual/electromagnetic/charged_hadron_incident/hion.html):
  low-energy stopping requires evaluated parameterizations; bare Bethe–Bloch
  extrapolation is unsuitable here. Nuclear stopping is a separate process.
  A future offline Geant4 study needs pinned physics/material definitions and
  independent range/yield comparison, not a browser formula substitution.
- [Jeon, Goldston and Gilson, P385 study (2024)](https://arxiv.org/html/2406.18607v1):
  TRIM paths plus evaluated nuclear data are compared with measurements;
  atomic/molecular beam composition is explicitly relevant. Its proprietary
  generator target and assumed fractions do not calibrate Marathon's machine.
- [Kaneko, Le Bris and Patera, lumped approximations (2024)](https://arxiv.org/abs/2412.16357):
  lumped models approximate spatial averages in a small-Biot regime; geometry
  can make simple conventional criteria insufficient. A bulk node must never
  be labeled a resolved surface hotspot.

## Bounded thermal contract

Use area-normalized quantities so changing beam footprint has a coherent
interpretation for a local illuminated assembly patch:

```
theta = T_bulk - T_coolant
C_A dtheta/dt = q_in(t) - G_A theta
q_on = P_assembly_if_substrate_stops_transmitted_beam / A_beam
C_A: J m^-2 K^-1       G_A: W m^-2 K^-1
```

`C_A` describes assumed participating assembly capacity per footprint area;
`G_A` describes assumed effective conductance per footprint area. Both must
be declared scenario inputs, not disguised LiT material constants. Changing
area with these fixed changes the modeled patch's total capacity and
conductance. This is not a fixed-geometry three-dimensional target.

The selected heat ledger must be explicit. Using assembly heat includes all
transmitted deuteron energy only under the existing fully-stopping-substrate
condition. Using only target-layer heat with the capacity of the entire
substrate would miss its beam heating. Do not add accelerator inefficiency
to target heat: it belongs to a different location/ledger.

For constant forcing over an interval and `G_A > 0`:

```
tau_c = C_A / G_A
a = exp(-Delta_t / tau_c)
theta_out = a theta_in + (q_in / G_A) [-expm1(-Delta_t / tau_c)]
E_in_per_area = q_in Delta_t
Delta_E_stored_per_area = C_A (theta_out - theta_in)
E_to_coolant_per_area = E_in_per_area - Delta_E_stored_per_area
```

The exact adiabatic `G_A=0` limit is
`theta_out=theta_in+q_in Delta_t/C_A`. Very short intervals and weak cooling
need stable limiting arithmetic; do not introduce cancellation through
`1-exp(-x)` or infer accuracy from a tiny residual computed with the same
unstable expression. Signed coolant transfer is physically meaningful if an
initial assembly is colder than its coolant; alternatively restrict the
initial state explicitly to coolant temperature.

For pulsing, preserve the current's meaning as **beam-on current**. With duty
`D` and period `P`, on duration is `D P` in each cycle. Integrate the last
partial cycle correctly. Cumulative neutrons in this fixed target approximation
are steady beam-on rate times actual on-time, not rate times wall-clock time.
Mean power is `D q_on` only for complete periods; a short partial exposure can
have a different realized duty. Include pulse transition times in plots so
the sampling cannot omit the hottest instant.

Cut beam forcing off exactly at the existing exposure duration. Any additional
displayed cooldown has zero beam forcing and accumulates coolant transfer,
but no additional beam-on time or neutron production. A plotting interval that
straddles exposure end must be split there; immutable beam/slab inputs retain
their existing meaning.

For complete cycles, coolant-start initial state and positive conductance,
the periodic peak and trough provide independent analytic references:

```
a = exp(-D P/tau_c); b = exp(-(1-D)P/tau_c)
theta_peak_periodic = (q_on/G_A) (1-a)/(1-a b)
theta_trough_periodic = b theta_peak_periodic
mean_theta_periodic = D q_on/G_A
```

There is no finite steady state for sustained nonzero heat with zero cooling.
The periodic result is not the temperature reached in a finite exposure and
must not silently replace that trajectory.

## Optional fuel-consumption diagnostic

The illuminated initial target inventory is `N_T0 = column_T * A_beam`.
The exact nuclear atom accounting consumes one target tritium atom per D–T
reaction: `N_T_consumed = N_neutrons` for this single reaction channel.
Report the fraction of **initial inventory consumed by fusion only**.

Under the existing defaults, the specified illuminated inventory is `1e20`
atoms. The sourced cross section near this incident energy is of order barns,
so a ten-second exposure consumes only order `1e12` atoms, a fraction of order
`1e-8`. These are order-of-magnitude deductions from the declared toy inputs,
not measured Marathon numbers or an executed numerical result in this review.

If depletion remains disconnected from the slab, present the consumption as
an undepleted-target estimate and flag when that approximation ceases to be
small; never allow a negative remaining inventory. A chosen validity threshold
must be labeled a numerical approximation budget, not a material safety limit.
Regeneration adds externally supplied fuel or replaces material; it does not
breed new tritium nuclei. A realistic target lifetime requires isotope
exchange, implantation, diffusion, desorption, sputtering and their geometry/
temperature dependence. They are not encoded by a generic exponential loss
constant unless explicitly shown as an assumed scenario.

If a separate **uniformly mixed, fixed stopping matrix, fusion-only** depletion
reference is desired later, the one-parameter optical-depth limit has an exact
solution. With `p=1-exp(-tau)`, `alpha=J_D sigma_effective`, and no replenishment:

```
d tau/dt = -alpha (1-exp(-tau))
expm1(tau(t)) = expm1(tau0) exp(-alpha t)
```

That mathematical reference cannot reproduce isotope-exchange target damage.
It should not be advertised as the principal realism improvement.

## Acceptance gates and adversarial cases

1. Recover exact constant-power exponential heating and zero-cooling linear
   heating. With beam off, recover cooling to coolant; with zero duration,
   preserve the initial state and zero accumulated exposure.
2. Test duty zero/one, exactly complete periods, noninteger final periods and
   on/off boundary times. Peak temperature and total energy must be invariant
   under output plotting resolution. Plot thinning is not a physics timestep.
3. Close `E_in = Delta_E_stored + E_to_coolant` using an independent integral
   of the cooling term, not only defining a residual to be zero by construction.
4. Compare many-cycle temperatures against the periodic analytic peak/trough;
   verify no finite steady-state result is invented when conductance is zero.
5. Check pulse sequencing against independent high-accuracy ODE integration
   and a long repeated-cycle control. Require finite outputs or explicit
   representability errors at allowed numeric extremes.
6. Trace actual beam controls through the deposited-power forcing, the new
   trajectories and cumulative counts. Preserve zero-T but nonzero material
   stopping heat; zero source clears output correctly. Invalid source data must
   invalidate the thermal panel, then valid inputs must recover it.
7. Keep the default steady beam numbers unchanged. Make the new exposure
   scenario separately inspectable/exportable so its assumed coefficients
   cannot be mistaken for company operating inputs.
8. No target lifetime, resolved surface peak, safe/unsafe material badge,
   temperature-dependent yield or fitted regeneration claim without new data.

## Following this stage

The next larger split is a pinned offline material stopping/range benchmark,
then a measured thermal/retention validation case. Beam species/energy spread
and evaluated differential neutron spectra are additional bounded fidelity
improvements. A D+/D2+/D3+ scenario could expose current-to-nuclei and energy
sharing exactly, but its fractions must be assumed or measured, not borrowed
from the unrelated P385 tube. Source/target data remain separate from the
future Hg/Li blanket's neutron-transport/depletion validation.

## Final integration source review

Reviewed `target-exposure.ts`, `target-exposure-ui.js`, the source callback in
`fusion-ui.js`, setup ordering in `main.js`, the Marathon section in
`index.html`, `web-assets/MARATHON-TARGET-EXPOSURE.md`, and the independently
written `tests/target-exposure-audit.test.ts`. This was source inspection;
this reviewer did not execute the tests or perform browser verification.

The implemented stage intentionally narrows the proposal above to one constant
beam pulse followed by cooldown. The earlier duty-cycle/periodic formulas and
related gates are future options, not claims about implemented controls.
The configured areal defaults are C_A=10000 J/m²/K and h=5000 W/m²/K, explicitly
assumed. The implementation preserves the source calculation and uses its
conditional stopping-substrate heat exactly once. No temperature-to-yield
feedback or fabricated material threshold was introduced.

The exact segment solution, its adiabatic limit, signed coolant transfer,
area scaling, immutable source duration and beam-shutoff energy boundary are
coherent in the inspected path. Including both switching endpoints is enough
to capture the extrema of each monotone constant-forcing segment; the plotted
sample count does not determine the computed peak. The independent regression
source integrates temperature and coolant transfer with RK4, providing a real
comparison rather than merely checking a residual defined to be zero.

The observer rejects consumption beyond available tritium. This is an atom
budget boundary, not a low-depletion accuracy gate: appreciable sub-inventory
consumption still leaves the source frozen. The public scope document states
this limitation and directs the user toward shorter exposures. A target
lifetime cannot be inferred from this diagnostic.

One actionable integration-copy contradiction was reported to the parent:
the pre-existing global notes still said no target temperature was calculated.
The parent corrected it, and re-reading `index.html` verified the distinction
between the new conditional bulk observer and unresolved physical surface
temperature. No blocking thermal-equation defect was found by this inspection.
Validated D-in-LiT stopping/loading remains the
next substantive yield-fidelity gate; the new exact thermal equation does not
make the source or actual target experimentally validated.
