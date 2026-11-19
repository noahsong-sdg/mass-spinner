# Public-data qualification campaign

The campaign started on 16 November 2026, with scope fixed before execution.
It does not include author requests, fitting, relaxed historical limits or Marathon-device
claims. Live rigid rotation and spatial research references are separate models.

Component and angular-reference results are within their acceptance limits. Rotation, electrical
and conditional pressure predictions disagree with observations. The model does
not have experimental qualification.

## Work and acceptance criteria

The campaign keeps apparatus-matched observations, original tolerances, V82
input alternatives and optical acceptance limits. Previously examined data give
retrospective evidence, not a new prediction test. Unknown uncertainty stays
unknown. Pressure diagnostics have no invented experimental acceptance limit.

Exact limits give production-component tests. Independently written
FEniCSx/scikit-fem implementations use identical physics and boundaries.
Conservation and refinement are necessary; code agreement does not show
experimental accuracy.

Live sensitivity uses accepted inputs, shared clocks and stale-result removal.
Selected inputs give neither confidence intervals nor accuracy between those
inputs. The protocols and execution records below give the full criteria.

## Interpretation boundaries

A supplied transport temperature is not an independent thermal prediction.
Corrected arc voltage and simulated plasma-port voltage are different quantities.
Pressure normalization must use a declared boundary or ratio. Inventory fitting
to improve agreement is not permitted. Recorded argon predictions do not apply
to the live lithium case.

## Execution and documentation

The protocols and execution records give source hashes, dependencies, commands,
failures, exclusions and isolated-execution details.

## Results — 16 November 2026

This retrospective argon diagnosis used authenticated V82 fields without a new
partial differential equation (PDE) solution, fitting, relaxed limits or Marathon-device
accuracy claims.

| Workstream | Observed result | What it shows |
|---|---|---|
| Published observations | 17 pressure markers, five existing rotation markers and operating-condition scalars | Traceable observations from the same historical apparatus; experimental error stays unknown |
| Production components | 60/60 metrics and two component tests were within their limits, including artifact-corruption cases | Exact mechanical, equilibrium and electrical limits; discrete backward-Euler heat algebra |
| Independent reference | All five tests gave results within the fixed numerical acceptance limits | Agreement between independently written DOLFINx and scikit-fem implementations of the same conditional angular/current equations |
| Retained experimental alternatives | 4,320 optical comparisons; zero all-point agreements; 60 electrical alternatives give 17.25–34.20 A against reported 100 A per branch | The transport/diagnostic alternatives do not explain the difference; the plasma-port voltage mapping is unresolved |
| Live playground | Optional coefficient samples use the actual coupled worker | Conditional model sensitivity, without invented priors or an experimental accuracy claim |

The FEniCSx angular-field difference between implementations is at most
1.63×10⁻¹⁰ relative. Coarse/fine mesh changes are 8.53%/0.466%, within the
unchanged fine-grid 5% criterion. Algebraic work and source-moment torque
residuals are below 10⁻⁸.

Electrode power increases from 2,579 to 2,873 to 3,157 W during point-contact
refinement. Contact voltage, local Joule heating and integrated electrode power
do not have a qualified continuum limit. Finite electrode footprints are necessary for those quantities. This reference has no temperature equation, so it gives no
independent thermal prediction.

The pressure comparison adds the assumption `dp/dr = rho v_theta²/r`, with
prescribed temperature and stored local flow. The pressure denominator is the
predeclared outermost admitted marker. No inventory or pressure scale is fitted.
Measured ratios rise from 0.519 to 1, but the conditional model profiles are
almost flat. The maximum nominal ratio discrepancy is 0.457–0.476 across the
retained cases.

Integration refinement changes ratios by less than 4.31×10⁻⁹. This gives
quadrature error, not PDE or physical error. Pixel boxes with a shared denominator
are correlated. The comparison does not propagate radius or probe-response
uncertainty. It has no invented pressure acceptance limit or statistical
rejection. It does not include the separate wall channel beyond 6 cm or the central
extrapolation, which is not a measured point.

![Retained optical and conditional pressure comparisons](../scientific/public-data-campaign/results/comparison.png)

The largest sampled conditional optical spans are 68.5 m/s between transport
cases, 37.0 m/s between estimators and 37.0 m/s across diagnostic temperatures.
The span across voltage hypotheses is 31.7 m/s. Each comparison keeps the other
choices fixed. These alternatives are not physical uncertainty bounds or causal rankings.

A small span for selected anode positions does not show insensitivity to
an untested cathode footprint. Ion-line temperature and wall thermocouple
readings are different diagnostics. Prescribed temperature cannot give thermal
validation.

<h2 id="reproduce-and-inspect">Repeat the calculations</h2>

- [Observation inventory and extraction coordinates](../scientific/public-data-campaign/observations.json),
  [admission review](reviews/public-data-coverage-20261116.md), and
  [no-fit diagnosis](../scientific/public-data-campaign/results/diagnosis.json).
- [Component implementation review](reviews/public-components-20261116.md),
  [independent physics review](reviews/public-components-independent-20261116.md), and
  [60-metric record](../scientific/public-data-campaign/results/components.json).
- [FEniCSx fixed protocol](../scientific/public-fenicsx-reference/PROTOCOL.md),
  [reference review](reviews/public-fenicsx-reference-20261116.md), and
  [reference results](../scientific/public-fenicsx-reference/results/reference.json).
- [Live sensitivity execution/lifecycle review](reviews/public-sensitivity-20261116.md).
- [Exact execution manifest and logs](../scientific/public-data-campaign/results/RUN.md).
  The workflow `.github/workflows/public-data-qualification.yml` does the isolated
  checks on explicit dispatch. Its existence does not show a successful CI run.

The campaign candidate had successful results for 1,357 tests, 11 targeted
sensitivity tests, typecheck, build, site and asset checks. RUN.md gives exact
records and the large-bundle warning. These checks do not show experimental accuracy.

<h2 id="what-remains">Next work</h2>

### Finite-current footprint continuation

The next conditional numerical step is complete. DOLFINx and
scikit-fem references written independently use finite current patches instead of zero-area point
loads. Surface-area normalization keeps the prescribed current fixed. Fixed
physical widths remove the mesh-dependent cutoff without heating clips,
conductivity changes or observation fitting. The historical point-ring source
and execution records stay unchanged.

All three predeclared footprint hypotheses gave results within the original
5% angular-field and 1e-8 budget limits. Results were also within the added 5%
fine-change/contraction limits for integrated power and voltage. Final mesh changes are 0.30–0.45% for angular
flow, 0.12–0.86% for port voltage and 0.15–1.05% for integrated Joule power.
The largest independent-code difference is below 1.33e-9 relative.

Seven new physics tests cover source balance/moments, wall torque, work,
independent assembly, gauge invariance, reversals, drive scaling and fixed
support geometry.

At imposed 100 A, narrow/middle/broad hypotheses give current-weighted port
voltages of 21.86/18.12/14.11 V. These are not independent experimental voltage
predictions. The inherited conductivity ratio corresponds to Hall parameter 3.
That value came from earlier electrical observations. The emission footprints
and corrected-voltage operator are still unknown. No new parameter fitting
removes this inherited calibration.

The 2 cm anode band has a metal-geometry basis, but uniform current on it is
an assumption. The hollow cathode has a 4 mm inner radius; that dimension does
not give its emitting width. The paired supports are illustrative alternatives, not measured uncertainty
bounds or an isolated causal study of either contact.

Only integrated electrical work has numerical qualification within this stationary,
fixed-property angular model. That qualification does not include sharp-edge peak
heating, equipotential metal electrodes, sheaths, thermal evolution and meridional
flow. It does not include the live lithium model. Experimental qualification stays
false.

Refer to the [fixed protocol](../scientific/finite-contact-reference/PROTOCOL.md),
[execution and independent-review record](../scientific/finite-contact-reference/results/RUN.md),
and [complete compressed field/budget record](../scientific/finite-contact-reference/results/campaign.json.gz).

### Remaining physical identification

The [current-spreading and voltage study](../scientific/voltage-footprint-reference/results/RUN.md)
independently solves ideal equipotential finite contacts. At prescribed 100 A,
its narrow/middle/broad supports give port voltages of 21.10/17.47/13.46 V.
Prescribed uniform current gives 21.86/18.12/14.11 V on the same supports.
All nine mesh cases give results within the original conservation/refinement limits. The
boundary choice changes voltage by 3.5–4.7%; neither choice is preferred.

The voltage record keeps terminal 58±0.5 V, corrected 18.5±2 V, modeled port
voltage and radial probe proxy separate. The probe proxy uses
`phi(r,0)-phi(.05 m,0)`, with the published alignment radius. Its conversion to
plasma potential and the raw fixed-field V–I correction are unknown. The study
adds no measured probe points or experimental score.

Inherited Hall calibration, missing sheath/emission laws and omitted floating-wall
current redistribution still prevent experimental qualification. A physical
basis for finite cathode/anode current footprints and plasma-port voltage mapping
is necessary. The next predictions must also include matched non-rigid neutral/ion
momentum, meridional transport and energy.

A smaller measured residual is not a permitted reason for benchmark input
selection. A new output/condition withheld from model development is necessary for a
prospective test. Previously examined figures cannot become a new holdout.
The live lithium model is a tool for conditional exploration. Model info gives its
rigid-rotation and prescribed-transport assumptions.
