# Live centrifuge benchmark: retrospective rigid-rotation challenge

13 November 2026. **Protocol for a structural test, not an experimental
qualification claim.** This experiment and its extracted velocities were
already inspected during V79–V86. They are development data; changing the
implementation now cannot make them prospective holdouts.

## Source and frozen observations

Use the diffuse neutral-argon rotation profile in Wijnakker & Granneman,
[1979 conference paper, Fig. 2](https://doi.org/10.1051/jphyscol:19797236),
also reported in Wijnakker, Granneman & Kistemaker,
[1979 journal paper, Fig. 9](https://doi.org/10.1515/zna-1979-0602).
These are aliases of one experiment, not independent replications. The
author-provided [conference PDF](https://www.researchgate.net/profile/Ernst-Granneman/publication/45703766_A_STUDY_OF_A_WEAKLY_IONIZED_ROTATING_PLASMA/links/00b7d530b34d0b4c69000000/A-STUDY-OF-A-WEAKLY-IONIZED-ROTATING-PLASMA.pdf)
was reopened, and the retained Fig. 2 crop was visually checked for this audit.

| Retained source | SHA-256 |
|---|---|
| `scientific/profile-v79/sources/hal-conference.pdf` | `235f0180bfa134e6e82895ceb2615ea2b396efb3c950dc2992ab1cbe0e7d2c67` |
| `scientific/profile-v79/sources/figure2-crop.png` | `07bdee0628c73b9cb411996214a513055c9ab1381579ed9eff4c6e755ad61f4f` |
| `scientific/profile-v79/digitization-independent.json` | `8bc1cf5f11e4c4a2b15ff2f31129d0b158a75b99b8daa90bdc994d804997de17` |
| `scientific/optical-v80/sources/journal.pdf` | `a40b59b092d6671cba93a8f22506257a27ed0fc982985479962d2babc48a6795` |

The extraction records the local PDF page index 2, crop and tick calibration,
five Ar I symbols, their plotted bars, and ±6-pixel extraction ranges. Retain
all five points. The first and last fail the earlier 5% digitization-resolution
gate; flag them, do not remove them. Legend glyphs, unresolved axis features
and smooth theory curves remain excluded by the existing source-only rules.
Reconstruct observations from the digitization, not previous solver predictions.

Approximate inspection values, not replacements for the frozen coordinates:

| Sightline offset (cm) | Apparent neutral speed (m/s) |
|---:|---:|
| 0.9735 | 282.33 |
| 1.9844 | 526.25 |
| 2.9860 | 699.10 |
| 3.9688 | 631.88 |
| 5.0078 | 405.25 |

## Apparatus mapping and limits

The selected condition is argon, B = 0.13 T, 100 A per opposed discharge and
1 Torr filling pressure behind the cathodes. The cylinder radius is 0.06 m;
the retained apparatus manifest gives cathodes 0.48 m apart, anodes 0.14 m
apart and ring width 0.02 m. Filling pressure is not the discharged local
pressure. The corrected bulk arc drop is not an electrode-to-electrode
uniform radial field. These cannot silently become live-model inputs.

The live model has rigid ion/neutral rotation, prescribed collision/drag
coefficients and a full-cylinder inventory. It lacks an Ar pair and this
electrode/current-footprint solution. No Li/D preset, arbitrary drag or
unmeasured mean temperature may be substituted to claim an absolute Ar
prediction. This test isolates the rigid velocity shape only.

## Fixed test and interpretation

Trace the actual live result: `worker.ts → simulateFuelCentrifuge →
simulateFuelOperation/simulateFuelTransport`. At an accepted sampled time the
neutral renderer's rigid velocity family is vθ(r) = Ωn r. Check the production
state path; do not replace it with an offline CFD model.

For rigid rotation, projected line-of-sight velocity is Ωn b at every location
on a chord with offset b. Positive emissivity weighting therefore cannot
change its full-line centroid. Centered symmetric local line shapes also
share this center. This statement does not recover the experiment's unknown
Fabry–Perot response or arbitrary fitted spectral estimator.

Retain the pre-existing 20% per-signal target. For every admitted point form
the allowable Ω interval, then intersect all intervals. The nominal interval
is `[0.8 v/b, 1.2 v/b]`. For positive digitization ranges use the deliberately
optimistic interval `[0.8 vlo/bhi, 1.2 vhi/blo]`. An empty intersection proves
that no amplitude can satisfy all points under that observation model. It is
not a drag fit, a current-to-speed prediction, or a measurement-noise test.
Independently compute the exact nominal minimax relative-error floor:
with `qmin = min(v/b)` and `qmax = max(v/b)`, it is
`(qmax − qmin)/(qmax + qmin)`. The diagnostic optimizer
`Ω = 2 qmin qmax/(qmin + qmax)` is not a predicted physical speed and must
never be reused as a calibrated live coefficient. Report the floor even when
the 20% screen fails.
Repeat separately with the source's plotted bars and with a conservative
bar-plus-digitization envelope. Neither bars nor pixel ranges are Gaussian
standard uncertainties, confidence intervals, or unreported systematic bounds.
Where the interval implementation allows each point its own radius/velocity
box, shared tick-calibration correlations are deliberately relaxed: this
enlarges the feasible set. Failure of that optimistic test is a valid
incompatibility bound; passing it does not establish one common calibration
or simultaneous experimental agreement. The combined envelope extends plotted
bar endpoints by the corresponding declared digitization uncertainties; show
it only as a conservative sensitivity calculation.

Keep nominal, digitization and plotted-bar conclusions separate. Preserve
failures and unresolved numerical/source checks. Do not add a fitted radial
shape, relax tolerances, select radii by residual, or call an optimized
amplitude an independent prediction. Synthetic rigid profiles and reversed
units/ratio orientation should test the harness independently of this dataset.

## Qualification boundary and next admission

A structural failure rejects this rigid closure for this measured profile
under the declared optical interpretation; it does not establish the unique
missing physical cause or invalidate every learning use of the playground.
A pass would establish only compatibility of that shape. It would not qualify
thermal evolution, separation, current response, extraction or Marathon's
apparatus. The present admitted sources do not support matched-input
prospective qualification of the complete live model.

Before such qualification, obtain an independent condition with bounded
discharged inventory, temperature/property inputs, electrode/current mapping
and measurement operator. Freeze the model and independently justified
coefficients before opening held-out outputs. Require observable-specific
spatial/timestep convergence and numerical error below 5% of the measured
signal, retain all admitted conditions, and propagate source uncertainty
without fitting currents or velocities to each case.
