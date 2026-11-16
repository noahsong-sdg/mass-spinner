# Joint experimental benchmark: model readiness

16 November 2026. Source and retained-document review only. No scientific
imports, solver execution, fresh numerical result, browser check or experimental
qualification is claimed. This review does not select a dataset before the
independent source/apparatus/diagnostic admission workstreams finish.

**Finding:** no inspected existing execution path predicts rotation, a measured
temperature and an independent electrical observable for the same real apparatus
without additional, experimentally unsupported closure/boundary assumptions.
The obstacle is not that another matrix solver is missing.

## Execution paths and conditioning

| Existing path | Actual computation | What prevents a joint no-fit test |
| --- | --- | --- |
| `profile-v79/study.py → solver.calibrate → solver.solve → observe` | Steady r–z charge/torsional balance and uniform-emissivity Doppler centroids | `calibrate` chooses scalar conductivity to match measured 100 A at a selected 18.5 V. This is electrical calibration, not a no-fit current prediction. Viscosity/temperature are prescribed; temperature is not predicted. |
| `electrical-v82/campaign82.py → model82.properties → transport82.profile → flow-v81/solver.solve` | Absolute finite-disk current, potential and torsional flow at specified voltage; separate exact fixed-current scaled states | No velocity targets are read, but heavy-temperature, neutral-density and electron-collision profiles are prescribed. Those profiles cannot simultaneously be scored as independent temperature predictions. The corrected-arc voltage is not identified with a measured finite-contact plasma-port operator. |
| `boundary-v84/campaign84.py → model84.solve`; V85 uniform-viscosity variation | Source-prescribed ideal-ring current, graded r–z charge/torsional flow, source-informed optical alternatives | Current is an input. Ideal-ring contact potential/Joule power have no physical finite-energy continuum limit, so cannot provide the independent voltage/heating prediction. Temperature is still prescribed. |
| `nonrigid-v98/fem98.py` / `apparatus98.py` | Independent scikit-fem Q2/SciPy charge/torsional reference for the V84/V85 family | Strong independent discretization check, but shares prescribed transport and current, ideal-ring and no-energy assumptions. Replacing FV with FEM does not recover missing experimental inputs. |
| `meridional-v86/campaign86.py → Flow → Electro → Diffusion` | Conservative density, full momentum and total-energy release; scikit-fem stress/conduction, Hall electrical coupling | Evolving heavy temperature is a conditional closed, adiabatic release at fixed current, not the steady experiment. Electrical coefficients and electron temperature stay prescribed; all Ohmic heat is assigned to heavy gas. Initial temperature/density come from source-informed profiles. No supported thermal steady-state boundary closes the experiment. |
| `simulateFuelSpatialExperiment → createFuelSpatialStepper → advanceFuelSpatialOperation` | Browser-callable coupled radial species/Ω/thermal state with r–z current projected onto radial cells | Conceptual 1 cm × 10 cm argon cell, fixed σperp=0.01, σparallel=0.1 S/m, D=0.001 m²/s and film=0.1 W/K. Ω is z-independent; no meridional/electron-energy closure. It is not the 6 cm × 48 cm Wijnakker device or a Marathon apparatus. |

The browser path's two equal-mass argon labels do not model separate ions and
neutrals or isotope enrichment. Its solid temperature is not automatically an
optical gas temperature or a thermocouple reading.

## What existing comparisons actually say

- V82 retains independently sourced transport alternatives and does not fit
  velocities. Nominal finite-contact currents at 18.5 V are roughly 19–31 A,
  not the measured 100 A. Solving at prescribed 100 A instead requires about
  60–96 V in those frozen equations. The voltage diagnostic/contact mapping
  remains unresolved; this is development evidence, not a newly identified
  electrical benchmark.
- V85's prescribed-current, published-uniform-viscosity family has 0/576 optical
  matches under the original 20% screen; worst-point errors span 45.6–59.9%.
  Its radial-viscosity baseline also fails. Neither family independently
  predicts the temperatures used to build transport.
- V98's independent angular solver passes its bounded numerical comparisons.
  Its ideal-ring Joule power rises on refinement while off-contact angular
  observables converge. Contact power must not be promoted by that angular
  success.
- The latest nine-case radial/thermal refinement tests a different conceptual
  apparatus over 1 µs. Its 66 passes, zero failures and six unresolved wall-T
  checks cannot validate the historical apparatus or a measured steady profile.

These statements were checked against source paths and retained reports;
this reviewer did not rerun or independently rescore those campaigns.

## Smallest defensible next comparison

1. **Admit one condition before adapting a solver.** Require species, physical
   geometry and electrical contacts, drive mode, discharged inventory or density,
   heat-loss boundaries, observation time/steady-state criterion, and diagnostic
   definitions for all three scored signals. Missing metadata must produce an
   explicit unavailable joint comparison, not a guessed numerical input.
2. **Separate inputs from outputs.** Prescribe measured current *or* plasma-side
   voltage; predict the other or a separately measured power. A current-conditioned
   solution cannot validate current. Do not supply measured heavy/electron
   temperature to transport and then score it as a temperature prediction. An
   externally measured wall temperature can be a boundary input, but cannot also
   count as predicted thermal validation.
3. **Reuse the narrowest compatible reference.** A finite-contact fixed-property
   charge/torsional solve is already available for a conditional rotation/electrical
   test. Joint gas-temperature prediction additionally needs an energy closure
   with independently constrained electron–heavy power transfer and physical
   heat sinks. Use existing FEM/FV operators rather than reimplementing them.
   Native OpenFOAM currently verifies the neutral thermofluid block, not a
   complete weakly ionized Hall/discharge closure; its remaining failed controls
   must not be bypassed by selecting its name as a solver.
4. **Freeze predictions and diagnostics before scoring.** Store the admissible
   input/assumption table, parameter ranges and source bytes; seal predictions;
   then compare all predeclared rotation, thermal and electrical observables.
   Known Wijnakker outputs remain development data. Use a genuinely new condition
   for later confirmation; a new marker extraction is not a new experiment.

## Required regression and numerical gates

Before a new adapter is admitted, test: target-output fields rejected from its
input contract; voltage-driven versus current-driven semantics; unchanged inputs
when hidden target values are perturbed; geometry/units/source identity; local
versus LOS velocity; gas versus wall/sensor temperature; and stale/partial receipt
rejection. Existing sign, B=0 heating-without-torque, drive reversal, charge/power,
angular momentum and species conservation controls should be reused.

Run observable-specific spatial/timestep and diagnostic integration refinement
on a physical domain held fixed across levels. Retain original thresholds and
representation limits. A converged prescribed-property solution is conditional
physics, not experimental validation. A wide nuisance interval that happens to
contain a measurement is compatibility evidence, not predictive accuracy or a
statistical confidence interval.

## Ranked implementation needs after data admission

1. Exact apparatus and synthetic-diagnostic adapter, including a defensible port
   voltage operator. This determines whether an existing model is applicable.
2. Only the discharge/thermal closures needed by that apparatus: finite contacts,
   heat sinks, electron–heavy energy partition and conductivity response. Rank
   uncertain assumptions by effect on measured signals before adding equations.
3. Matched-model numerical and uncertainty campaign, followed by a separate
   untouched experimental operating condition. No retuning to its velocities,
   temperatures or currents.

If the best available dataset lacks the required independent inputs, report
which individual channels remain testable and why the joint no-fit test is not
identifiable. Building a broader solver would not itself repair that evidence gap.

## Concrete bounded replay available now

A fresh **conditional** no-fit rotation/electrical rescore can reuse
`electrical-v82/compare82.compare → optical-v80/compare.score` without rerunning
or importing a PDE solver. Supply the sealed V82 predictions, complete optical
index/all 20 compressed groups and the V79 score packet's five target points.
Score all groups, then retain every `drive == 'absolute-voltage'` row: ten
transport scenarios × two anode geometries × three voltages × 72 optical
alternatives = 4,320 rows. Fixed-current scaled states must be excluded from
absolute-current validation. Control collision partitions remain labelled
controls, not physical uncertainty bounds. No residual selects a preferred case.

This optical replay uses measured-brightness reconstruction and conditional
spectral alternatives, **not uniform local emissivity**. The simpler retained
uniform-centroid summaries have 11 chords at 5 mm spacing, while measured target
radii are approximately 9.7348, 19.8440, 29.8596, 39.6875 and 50.0780 mm. Pairing
nearest summary samples with those points is invalid. If a uniform-emissivity
control is wanted, run existing `profile-v79/solver.observe` on authenticated
retained field packets at the exact target radii; label that as a fresh diagnostic
integration of old fields, not a new PDE prediction.

Read-only byte checks in this review verified all 20 compressed optical group
hashes against their index. Key retained SHA256 values:

| File | SHA256 |
| --- | --- |
| `electrical-v82/results/predictions.json` | `8b4041c7db6ee606db57dca695da350919c7a6f0c29727f2dbd3ac010ecd857e` |
| `electrical-v82/results/optical-index.json` | `7b92089143a8c092ae0d37e88d87b33e93796d2dae3e13db7672547d25735f90` |
| `profile-v79/results/score.json` | `1e4f542dab2cdd777673f724ec3038e0223589797fa290765c0e1c8f047b4741` |
| `optical-v80/compare.py` | `75cfcc0ee62e0f80a986897b0e23b87e5d8846d81bda28afbd4ca4c996958bc4` |
| `flow-v81/argon-viscosity-source.json` | `583b67d3ece2c7f29d164bde80c4b3d7510b30b584ca947e1edb76652b10e00f` |

A wrapper must write to a fresh directory, authenticate source/input/packet
identities, reject missing/duplicate groups and alternatives, and preserve source
target geometry. Existing `compare82.main` writes historical results and should
not be run in place. A fresh score would remain retrospective development
evidence with `temperaturePredictionAvailable=false` and joint qualification
false. It cannot establish that the best new candidate dataset is identifiable.
