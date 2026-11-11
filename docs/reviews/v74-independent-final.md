# Independent v74 source and evidence review

Status: study05's bounded numerical evidence is accepted after source and
exported-artifact inspection. No experimental or live qualification is given. This
reviewer did not author the current, torsion, thermal or checker kernels. At
the parent's request, this reviewer subsequently added observed-order analyzer
output and a radial sparse-reference thermal test. Those additions are not
independent validation of their own execution. No project code, tests or builds
were executed by this reviewer;
the parent owns the safe-dev volume. Read-only source/artifact inspection and
this document are the review's evidence. A passing test result reported by
another agent is not independently reproduced here.

## Verified bounded-model execution path

`bridge.ts` calls the existing TypeScript current solver with every r-z
angular-speed value. Its radial half-link torque coefficient and motional EMF
are paired; their signs give electrical input equal to Joule deposition plus
mechanical work when the current equations close. This does not introduce a
separate empirical current or drag closure.

`coupled.py` solves the affine current/torsion endpoint, then checks accepted
speed mismatch and the corresponding torque-work defect. The current iterate
and final torsional iterate are both serialized. The independent checker uses
the actual current iterate for electrical reconstruction and the accepted
mechanical iterate for momentum reconstruction, so its local momentum rows
also constrain disagreement between these endpoints.

The sealed v73 torsional capacity is physical angular inertia. Its radial face
geometry is proportional to r cubed, and its axial face geometry is the exact
annular second moment. `local_shear` uses actual FiPy face coefficients and
gradients, counts each face once, and partitions heat by its fluid
half-resistances. A stationary wall can exert torque with zero mechanical
work; a moving wall supplies its speed times torque on the fluid. Boundary
half-cell dissipation heats gas. The positive backward-Euler kinetic defect is
retained as a numerical sink rather than deposited as heat.

`thermal.py` uses ordinary physical volume for monatomic argon heat capacity
and tungsten mass times sourced enthalpy for solid storage. Its nonlinear
endpoint residual uses the true enthalpy difference; heat capacity is the
increment coefficient. Radial conduction includes the two logarithmic
half-resistances and one interface film. Axial conduction uses planar
half-resistances and annular areas. Each interface flux enters one material and
leaves the other. The outer Robin reservoir has the correct signed outward
heat convention. Thermal end insulation is independent of mechanical no-slip.
The retained torsion workspace updates harmonic viscosity through FiPy's
dependency-tracked variable rather than freezing an old-temperature coefficient.

No new physical-equation defect was established in this source trace for the
explicitly constrained model. This is a source-level conclusion, not evidence
that all frozen refinement gates have passed.

## Findings and remediation status

1. **Original artifact admission did not bind derived reports to raw inputs.**
   Independent and convergence artifacts were admitted by passing flags,
   finite metrics, counts, indices and gates. Neither producer recorded a
   digest of its actual raw input report(s), and the verifier did not
   recompute those analyses. Therefore a stale passing
   audit/convergence report from a different run with the same manifest and
   counts can be paired with changed raw fields. Hashing all four files in the
   resulting receipt identifies that combination but does not establish that
   they agree. In simple terms, the receipt checks that each document looks
   complete without checking that the analyses describe this data. Bind each
   derived artifact to input digests and check equality, or recompute its
   analysis at the final gate. Source reinspection confirms the parent added
   CLI input digests and the physics reviewer added exact input-set/digest
   equality in the receipt. The parent reports all 59 controls passed in
   safe-dev in 11.678 seconds; this reviewer has not reproduced that run.
   This is an evidence/data-compatibility defect, not an established error in
   the present numerical fields.

2. **Observed convergence orders were missing.** The prospective
   protocol requests observed orders without demanding a particular order.
   analyzer reported normalized errors and decreasing-error gates but no
   observed-order values. The reviewer added adjacent finite-reference RMS
   orders for each field/output and a known-second-order synthetic regression.
   Undefined zero-error ratios become null; acceptance gates are unchanged.
   Included in the parent's reported 59-control safe-dev pass.

3. **The independent frozen-property thermal transient control is axial.**
   `test_pure_axial_heat_mode_matches_discrete_backward_euler` supplies a useful
   independent axial eigenmode. The radial-limit control only checks that
   axially uniform input stays axially uniform; it cannot detect a shared
   radial-rate or radial-transient error. The separate reconstructed radial
   flux graph checks implementation consistency, but shares the declared
   logarithmic discretization. No independent radial transient analytic/sparse
   comparison was found in the original control files. The reviewer added a
   nonuniform-radial frozen-property sparse backward-Euler reference test that
   assembles its own radial capacities/conductances without model links. It
   also checks insulated solid stationarity and gas-energy conservation.
   Included in the parent's reported 59-control safe-dev pass. This was a coverage gap, rather than
   a reproduced radial bug; the new discrete reference still does not prove
   continuum accuracy by itself.

4. **Receipt dependency hashes and the pre-run snapshot have distinct scopes.**
   The receipt explicitly states that its sealed torsion/property dependency
   hashes describe the publication snapshot only. The runner does not record
   a pre-run per-dependency hash map. Separately, the parent reports a complete
   pre-run safe-dev source archive hash, covering the source copy actually
   executed: `bc916fb78f6bd56f5e58a4dd660e353fbed950a29fb0682fef68cd45bdfc6b2a`,
   1601 files / 223047158 bytes. The parent identifies sealed v73/property
   inputs as published HEAD `c7ff62e`. This reviewer has not independently
   reopened that archive or verified its bytes. Do not mistake the receipt's
   post-run dependency map for the pre-run archive evidence, or claim that an
   exact source snapshot is absent merely because its identity is recorded
   separately.

## Retained evidence inspected

The exported `static-current-03.json` records the required five meshes and
decreasing potential/power errors, ending at relative potential RMS
`5.5358408747e-5` and power error `1.8087900811e-4`. Its flags pass the frozen
0.005 finest gates. These numbers were read from the artifact, not recomputed
by this reviewer. Its smooth distributed sine potential has the stated finite
Bessel solution; it is not one equipotential metal electrode.

`study-03.json` retains a failed 96x96 first-step witness. Its independent
momentum row is `-3.8100196329e-23 Nm`, above `3.0906688103e-24 Nm` tolerance;
substitution of the exact TypeScript torque reduces that row to
`2.6723063758e-27 Nm`. This localizes the observed disagreement to electrical
torque reconstruction/precision rather than to the assembled viscous row.
The failed trajectory must not be qualified merely because the other
trajectories or global ledgers pass. The parent reports tighter-current
witness replay and is preparing corrected evidence; that replay has not yet
been inspected here.

## Conductive roundoff plateau and prospective study05

`thermal-diagnostic-04.json` was reopened. It records step10, iteration9,
gas cell0 at `400.02347258380047 K`, old temperature
`400.0209818329519 K`, row residual `-4.4038651202743946e-17 W`, tolerance
`4.3468211383766474e-17 W`, and proposed increment
`2.7374430502267535e-14 K`. At 400 K the spacing of binary64 temperatures is
`2^-44 K`; the increment is below half that spacing. Adding the proposed
correction can therefore leave the represented temperature unchanged. A line
search cannot reliably improve that row, despite a consistent Newton direction.
This is a representability limit, not evidence that a physical heat term is
missing.

The restored inner allowance is

```
16 eps [sum_incident_faces G_ab max(|T_a|, |T_b|)
        + G_bath max(|T_a|, |T_bath|)]
```

Source inspection verifies watts as its units, one contribution per incident
link in each cell, correct bath inclusion, and zero contribution from an
insulated contact/bath. Absolute-temperature spacing matters even when a
temperature difference and its physical flux are small. For a diffusive row,
dividing this floor by the diagonal conductance gives an allowed temperature
uncertainty of order `16 eps T`, rather than a percentage of the large
background temperature. The analogous conductance/absolute-temperature term
already exists in `src/fuel-gas-thermal.ts`. The allowance is separately
serialized as `conductionRoundoffW`; no residual is added to a source, and no
numerical mechanical sink becomes heat.

The synthetic balanced-dipole test isolates a sub-ULP representability case;
its extremely low density is not a physical gas-regime demonstration. The
captured96 test reruns the actual stalled state and submits its new endpoint
to the independent checker. The parent reports 61 controls passed in safe-dev
in 17.138 seconds, including both tests; this reviewer has not executed them.

The independent physical thermal row still uses exactly `1e-8 * exchange +
64 eps * (|U_new|+|U_old|)/dt`, with no conductive allowance. Momentum rows,
global ledgers, profile convergence and observable gates likewise receive no
new allowance. This was verified both by reading those formulas and by
removing only CLI digest metadata from the current checker stream: its SHA-256
then equals study03's recorded whole-checker hash,
`5a978786fbf42433308aa48ca9cb846639426df8cf7a139236e11644bab79ac5`.
Thus the numerical checker is byte-identical to its earlier version. Inner
convergence cannot by itself qualify a trajectory; every accepted production
step must still pass those independently reconstructed rows and ledgers.

One source-level edge invariant was sent to the parent: the new conductance
times absolute-temperature intermediate and final tolerance do not yet have
an explicit finite check. Extreme admitted geometry could make that product
overflow despite finite conductance and temperature, yielding an infinite
tolerance and zero score. No such overflow was observed in these inputs; it
does not explain the captured plateau. The runner's `allow_nan=False` JSON
serialization would reject that nonfinite returned allowance, so this is an
inner-API invariant edge rather than a demonstrated path to a falsely green
study artifact. A future general-purpose admission claim should close it.

Study04 remains a retained failed/interrupted attempt. The parent reports
prospective study05 is running the same physical inputs/refinement levels
from source archive
`f85feba6adf8e0414e9cebbb0ee39cdec39c35c63ac79f7164341eb5712fe94a`
(1604 files / 229633176 bytes), with static05 passing. These snapshot/run
details are parent-reported, not independently replayed. Final numerical
qualification was pending here until the final artifact review below.

## Final study05 evidence review

Reopened `study-05.json`, `static-current-05.json`, `independent-05.json`,
`convergence-05.json`, `receipt-05.json`, `summary-05.json` and the rendered
`verification-05.png`. The actual raw filename is `study-05.json`. Independently
hashed all four numerical artifacts on the host with `shasum -a 256` and
matched the receipt, both derived reports' input bindings, and the same files
in `/private/tmp/mass-spinner-v74-study05-accepted`. Raw SHA-256 is
`cb57006163950c2a37cb800b4cb4472540b37d816ea23b3816ca416bb4af5d16`.
Hashed the current six producer files, TypeScript current solver and manifest;
each matched the corresponding receipt value. These are file-identity checks,
not a second execution of the physics solvers.

Read-only `jq` inspection independently confirmed 22 complete trajectories,
3896 sequential per-step audit receipts with matching physical step times,
and exactly 1, 2 and 4 ms scheduled outputs for every trajectory. This includes
the formerly failing 96x96/256-step reference and the 48x48/512-step repeat.
There are no producer failures. All recorded per-step energy and momentum
ledger residuals satisfy their recorded exchange/storage allowances. Scheduled
local Joule/shear heat and numerical losses are nonnegative. The maximum inner
thermal residual score is 0.997575; none exceeds one. The independently rerun
scheduled audit contains 66 cases, no failures, and all six deliberate
potential/heat/temperature/loss/reservoir/interface corruptions rejected.

Every one of the five refinement series has 54 passing gates and no failed
gate. Both separate tolerance variations, the combined tighter tolerance,
96x96 spatial reference check and smaller-dt reference check pass. The
analyzer records no requirements gap. The finest joint comparison is
36x36/144 steps against 48x48/256, at the same physical times. Its worst
response-normalized RMS errors are 0.2565% gas temperature, 0.06624% solid
temperature, and 0.4079% angular speed; worst local field error is 1.656% and
worst observable error 0.7625%. The finer spatial and smaller-dt checks have
worst observable differences of 0.08562% and 0.4472%, respectively, below the
frozen 2% gate. The static five-level control ends at relative potential RMS
`5.5358408570e-5` and power error `1.8087900810e-4`, with decreasing errors.

Joint wall RMS errors are **not monotone**. Their largest value over the
compared levels/times is 0.1469%, so they pass the prospective exception for
errors already below 0.2%. All solid temperature scales in the finest joint
comparison are floored at 1 K; those percentages therefore describe absolute
sub-millikelvin RMS errors, not fractional accuracy of the small wall response.
Negative observed wall orders are retained in the artifact. The figure shows
that nonmonotonicity rather than hiding it. Finite references and observed
orders do not prove an asymptotic order or exact continuum truth.

The summary separately records `maxSavedEndpointEnergyResidualJ=2.9346883e-11`
for scheduled rechecks and `maxStepEnergyResidualJ=4.6681823e-11` across all
per-step receipts. Both are within their stated allowances. These explicit
names preserve the distinct scopes of the two maxima.

The parent reports 61 safe-dev controls passed in 17.138 seconds, 15 adjacent
TypeScript tests passed, and required typecheck/build/site/asset checks passed.
Those executions were not repeated by this reviewer, and their logs were not
included in the inspected numerical JSON receipt. The numerical artifact
signoff rests on the inspected source, complete recorded checks, input binding,
unchanged independent numerical checker, failed-attempt retention and frozen
refinement gates. It authorizes a bounded numerical-verification claim for
these specified inputs and 1–4 ms histories. It does not extend to the public
playground, device performance, experimental accuracy or missing closures.

## Physical scope

The model freezes density and species inventory, sets radial/axial velocity to
zero, prescribes diagonal electrical conductivity, and immediately deposits
all Joule heat into one heavy-gas temperature. It omits pressure balance,
meridional flow, compression work, mass separation, evolving ionization,
electron energy, ion-neutral slip and Hall-force closure. A fixed-density
temperature field need not satisfy the omitted force equations. Neutral argon
transport and illustrative contact/cooling films are not validated lithium or
Marathon apparatus closures. The solid has no modeled endcap thermal mass,
radiation, evaporation or chemistry. Passing numerical refinement can qualify
only the stipulated research backend, not experimental accuracy, discharge
sustainment, a device operating point, or the public playground.

## Checks and files reviewed

Read the safe-dev README, v74 implementation document and protocol, bridge
files, coupled/thermal/checker/analyzer/runner/verifier sources, sealed v73
torsion, TypeScript current solver, and coupled/thermal/wall-work/analyzer
controls. Inspected static-current-03 and the retained study03 failure tail.
No project runtime checks were run by this reviewer. The parent owns the
safe-dev executions. The final exported numerical evidence was independently
inspected as detailed above and supports the bounded study05 qualification.
