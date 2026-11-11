# Independent gas-regime integration review

Reviewer: `/root/gas56_integration_audit`. Read-only inspection of production
source; no production code, dependency, or thermal-law edits by this reviewer.
Project execution belongs to the parent inside safe-dev. The presence of this
review does not imply independent second-VM execution or deployment approval.

## Execution path and ownership

The playground constructs `FuelConfig` from its controls and submits it to the
worker. `simulateFuelCentrifuge` validates the configuration and constructs a
uniform-inertia mechanical/equilibrium reference. With transport requested,
`simulateFuelTransport` advances normalized species inventories and angular
momenta. With thermal evolution explicitly enabled, `simulateFuelOperation`
advances those same quantities while the implicit gas energy feeds back into
the transport exponent. It records every accepted integration knot in
`checkpoints`, and a smaller plotting subset in `snapshots`.

`DEFAULT_FUEL_THERMAL.enabled` is false. An assessment of evolving gas and
liner temperature therefore concerns an opted-in thermal configuration,
not the shipped thermal-off default. A static uniform-gas parameter screen
is a separate analytic assessment, not an integrated operating trajectory.

## Density reconstruction invariants

The production model has a closed neutral inventory

`N_neutral = p_initial * π*a²*L / (k*T_initial)`.

It evolves the mean pressure as `p_mean = p_initial*T_current/T_initial`.
Thus `p_mean/(k*T_current)` remains the initial volume-mean number density.
Using initial pressure divided by evolving temperature would spuriously
remove atoms as the gas warms.

Despite their names, `lightMass` and `heavyMass` are separately normalized
species **number** inventories, each summing to one. On the equal-volume
transport mesh `r_edge = a*sqrt(i/Ncells)`, reconstruct the cell densities as

`n_light,j = n_mean * x_light * Ncells * lightMass[j]`,

`n_heavy,j = n_mean * (1-x_light) * Ncells * heavyMass[j]`.

Atomic masses enter mass density and thermal/kinetic moments; multiplying
the above number densities by mass before evaluating particle arrival would
be a units and isotope-weighting error. At pure-species composition endpoints,
the normalized inventory of the absent species must not create a density or
gradient contribution. A zero-density core cannot be made finite by arbitrary
clamping; report the unresolved/empty domain rather than inventing atoms.

The source-owned gas `radiusEdgesM` must be used. `thermalLiner.radiusEdgesM`
is a different annulus outside the gas and cannot be substituted. Gas
inventories are piecewise constant volume-density reconstructions; any
log-gradient calculated between centers is a finite-resolution secant
diagnostic, not an exact within-cell smooth derivative.

## Equilibrium, wall and history limitations

`rotor.profiles` is an equilibrium reference using fixed initial temperature
and uniform-inertia reference mechanics. It must not replace an accepted
finite-time thermal checkpoint. The current gas temperature and pressure
belong to `checkpoint.thermal`; actual neutral angular speed belongs to that
checkpoint, rather than the endpoint reference sample.

The final gas cell supplies a cell-mean density, not a solved pointwise wall
trace. Using it for wall arrival or local Knudsen screening is a disclosed
last-cell proxy. A steep centrifugal layer requires gas-mesh sensitivity;
extra decimal digits in the wall-arrival formula cannot resolve a coarse
radial inventory. An exact equilibrium wall density can be a separate
comparison, but is not the finite-time solution.

The thermal option `gasWallWK` is total **film** conductance. In the spatial
liner model the actual gas-to-first-cell link also includes the solid
half-cell resistance. `Cg/G_film` is a nominal film response time, not the
exact coupled gas/solid relaxation eigenvalue. A flux comparison against
film conductance uses reconstructed interface temperature, not the first
liner cell temperature. Wall-drag heat and momentum accommodation are
separate from sensible gas–wall thermal accommodation.

Sampling a subset of checkpoints qualifies that subset only. A finite set
of parameter corners or a grid of static configurations does not certify
all slider combinations, the continuous trajectory, thermal-off behavior,
or a real Marathon apparatus. Current events are steps, so their spacing
does not bound the instantaneous forcing rise time; integration timestep
is numerical resolution and cannot serve as physical mixing time.

## UI domains inspected

The ordinary sliders span mean neutral pressure 1–100 Pa, initial gas
temperature 300–2000 K, vessel radius 0.05–0.3 m and length 0.2–2 m. Their
API validators allow a wider positive domain. Thermal film conductance is
a numeric input from 0 to 1e6 W/K with default 0.1 W/K. The spatial liner UI
uses 16 cells and thickness 0.1–20 mm; the kernel allows additional scientific
choices. The legacy `linerConductanceWK` slider is explicitly reference-only
and must not be confused with `operation.thermal.gasWallWK`.

All five atomic pair choices support the existing monatomic thermal model;
the He/D2 molecular choice is rejected when evolving thermal physics is
enabled because D2 internal modes are absent. A regime assessment should
preserve that unsupported status, rather than certify molecular Cv=3Nk/2.

## Implementation, corrected defects and actual evidence

I independently authored `tests/test_gas_regime_v56.py`, with 16 assessment
regressions covering fixed inventory during heating, number-density
normalization, species-resolved incident moments, absent species, vacuum,
zero conductance, unknown transport, unsupported molecular closure, malformed
inventories, nonfinite and signed rotation, unresolved one-cell gradients,
heuristic-versus-qualified reporting, published SI unit scales and actual
Cantera isotope masses. Execution and red/green evidence remain parent-owned.

The initial assessment implementation omitted validation of `neutralRadS`,
which could emit a nonfinite drift-power reference for nonfinite input. In
simple terms, an invalid speed could silently produce an invalid heat-flow
diagnostic. The smallest fix rejects nonfinite speed while preserving both
finite signs. This enforces the physical input domain rather than clamping
speed or altering the arrival/drag formulas.

The initial assessment also treated a one-cell profile as a known zero
gradient, despite having no spatial neighbor. In simple terms, missing
spatial information was being mistaken for a uniform field. The fix reports
that gradient unresolved; uniform static screens now explicitly contain two
equal-volume cells. This preserves the distinction between unknown and
known-small gradients without forcing a fabricated gradient value.

The initial exporter labeled all pair-reference compositions as defaults.
In the UI, switching pair does not automatically reset the light-fraction
control. Only the lithium case is the shipped full default; a helium
equimolar run is a deliberate configuration choice. The exporter now labels
these `initial-pair-reference`. Actual configurations remain attached to
each case, so the underlying composition is inspectable. Correcting the
label preserves UI behavior rather than changing the user's feed fraction.

The actual first regression run additionally exposed Cantera initialization
at zero temperature in the constructed isotope phase. The phase now has an
explicit positive initial state; assessment evaluations still set their
own requested `TPX`. The passing test checks the actual D/T phase masses
and monatomic heat-capacity ratio, rather than accepting a YAML comment as
proof that isotope masses were configured.

I inspected the actual parent-owned safe-dev evidence:

- `scientific/fixes-v43/gas56-tests-red.log` records 16 tests with four
  failing subcases/tests and one Cantera initialization error. This preserves
  measured evidence of the defects rather than only inferred source concerns.
- `gas56-tests-green.log` records all 16 tests passing. Its receipt has exit
  zero, 591 input files, and source SHA256
  `e319543b1f44d6b9452004f7051aceec8f33eedc51c7a0ff0c53a68f8e21b0fb`,
  verified before and after execution.
- `gas56-export.log` records 3,987 cases and no simulated-run export failures:
  six pair-reference initial states, 3,888 static slider-grid probes, 85
  selected accepted thermal states, three isothermal profile-refinement
  endpoints and five conditional species assignments for the v55 fast case.
  The physical v55 benchmark still has no original species assignment.
- `gas56-assessment.log` records attributed transport and actual Cantera
  3.1.0 execution. D/T molecular weights are exactly the configured
  2.014101778 and 3.016049282 kg/kmol. Atomic-H transport is identified as a
  Lennard–Jones isotope proxy, not measured D/T transport.
- `gas56-independent.log` records the separately authored formula/quadrature
  audit passing 3,338 supported and 649 unsupported cases. Its independent
  Gaussian velocity quadrature obtains an incident energy moment of 2kT,
  and maximum relative species-inventory error is 2.969e-15. This supports
  implementation correctness, not physical gas mixing or surface calibration.

The common case-packet SHA256 is
`3e2e58bd43bd64739e2e1b821a6baa16f470292edd1772e9657164cb0dc68394`;
the assessed-result SHA256 is
`4f38f1defcd2e99ceb47dcfe58fd6fd6d19578ed4f89e3911d9aa136e9664ede`.
Every assessed case remains explicitly `qualified:false`.

**Verdict:** no remaining integration blocker found within this standalone,
conditional screening assessment. The production thermal law is unchanged.
This review does not approve an uninspected final repository build, a deployed
UI, interpolation accuracy between sparse helium table points, or the physical
closure for real Marathon hardware. The finite checkpoint subset and static
parameter grid are not a substitute for an independently resolved gas field.
