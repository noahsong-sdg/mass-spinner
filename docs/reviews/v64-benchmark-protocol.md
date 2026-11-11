# Experimental benchmark protocol: independent model-path review

Status: source/observable review completed. This reviewer has not executed a
simulation, installed software, modified production code, or independently
validated an experimental comparison yet. Parent owns all VM execution.

## Traced implementation

Reviewed `src/fuel-centrifuge.ts`, `src/fuel-transport.ts`, `src/fuel-operation.ts`
and `src/fuel-gas.ts` directly on 10 November 2026. The relevant path is:

`simulateFuelCentrifuge(config)` supplies uniform-reference inertias, torque,
friction, wall drag and equilibrium references. `simulateFuelOperation` calls
the coupled rotor/radial transport and optional spatial mixture energy solver.
Accepted angular momenta, cell species probabilities and internal energies are
retained and sampled for visual/plot outputs. Pumping/cascade references in
the initial rotor result are not open boundary conditions for that closed run.

The initial neutral pressure fixes neutral particle inventory:

```
Nn = p V / (kB T0)
Ntotal = Nn / (1-fi)
Ji = (Ntotal mbar R²/2) fi
Jn,ref = (Ntotal mbar R²/2) (1-fi)
Γ = Ji νin
Dwall,ref = Jn,ref νwall
τ = I B (R²-a_drive²)/2
Pohmic = I² ln(R/a_drive) / (2π L σperp)
```

The coupled path evolves neutral inertia from actual radial inventories;
the ion inertia and integrated friction Γ remain fixed. Neutral drag is the
current neutral inertia multiplied by the prescribed drag frequency. The
spatial gas path uses prescribed common mobility/D, an overdamped pressure
relaxation law and common local temperature, not a solved radial momentum
equation or Maxwell–Stefan mixture closure. Axis and wall reflect species.

Validation checks on finite inputs, positive inventories and material property
ranges are numerical/domain admission, not evidence of stable discharges or
the validity of rigid rotation, a diffusion model or the prescribed ion fraction.
The CIV result is diagnostic; it is not an instability or ionization solver.

## Principal identifiability gap

The steady two-rotor equations give:

```
Ωn = τ / (Jn νwall)
Ωi - Ωn = τ / Γ
```

The neutral speed does not independently determine Γ or fi. Measured ion speed
plus neutral speed can constrain Γ, but Γ still combines fi, inventory and νin.
A neutral spin-up record can constrain effective eigenvalues and amplitudes,
subject to input/geometry knowledge; it does not automatically identify every
physical coefficient. A steady radial equilibrium does not constrain D: D sets
relaxation, not the equilibrium exponent. Electrical power may constrain an
effective σperp only after mechanical power, geometry and other voltage losses
are independently separated.

Consequently, fitting νwall to the measured neutral speed and then comparing
that speed is calibration, not validation. Fitting D to a relaxation time and
reporting the same time is circular. Matching isotope enrichment by adjusting
Ω or T is also calibration. Do not tune all free coefficients independently
for every experimental point and call the sweep predicted.

## Admissibility classes

| Class | Permitted conclusion | Required evidence |
|---|---|---|
| A: fully specified, unfitted comparison | Predictive check for the named observable and domain | Matching apparatus/working population, reported inputs and coefficients with provenance, independently measured outputs |
| B: calibrated, held-out comparison | Predictive check conditional on the declared fitted closure | Explicit training points/fit objective; identifiable parameters or retained parameter set; untouched held-out operating conditions |
| C: conditioned mechanism check | Check of one submodel, not current-to-device performance | Measured rotation/temperature supplied as inputs; compare independent radial density/isotope measurements with identical sampling definition |
| D: inadmissible/incomplete | Evidence gap or illustration only | Abstract-only extrema, missing temperature/radii, incompatible phase/geometry, fitted and tested same point, or theoretical prediction presented as experiment |

No unreported value is filled by the playground default. A justified source
range produces an identified set/sensitivity envelope. A missing unbounded
input produces no bounded predictive comparison. A probability distribution
requires a stated measurement/error model; a uniform distribution over an
assumed range is a sensitivity experiment, not automatically a confidence band.

## Exact experimental observable matching

1. Identify gas/ion species, isotope masses, charge states and atomic/molecular
   population. The live pair catalog lacks He–Ar; a scientific-only generic
   mass comparison must disclose this rather than relabel a Li preset.
2. Preserve neutral pressure versus total plasma pressure and neutral versus
   total ionization fraction. Neutral gas temperature is neither electron
   temperature nor necessarily ion Doppler temperature.
3. Record whether velocity is ion or neutral, local tangential speed or fitted
   angular speed, and whether a measurement is line/chord/volume weighted.
   Spectroscopic line shift is not automatically the common neutral velocity.
4. Convert gauss/kilogauss to tesla, Torr to Pa, Hz to radians/s and eV to K
   explicitly. A frequency/radian mistake squares a factor 2π in separation.
5. The gas grid is a full cylinder `0≤r≤R`. `driveInnerFraction` changes a drive
   annulus, not an excluded gas core. A solid axial electrode making an annular
   gas column requires the appropriate observation/model map; full-cylinder
   inventory normalizations cannot silently be reused.
6. Distinguish wall-to-axis local concentration ratios; outer-wall/feed
   concentration ratios; finite-volume or sampled-annulus ratios; collection
   inventory cuts; and extracted-flow purity. They are different observables.
   The finite-time live vessel has no extracted product stream.
7. State whether time starts at a discharge step, gas injection, exposure,
   collection or a claimed steady state. Maximum rotation at one time does
   not condition a time-integrated collector measurement without a transport map.

For a common rigid angular speed and uniform common temperature, the local
heavy/light log-odds change between radii ra and rb is:

```
S = ln[(nh/nl)(rb)/(nh/nl)(ra)]
  = (mh-ml) Ω² (rb²-ra²) / (2 kB T)
```

The implementation's `collection.logHeavyLightSeparation` uses `ra=0, rb=R`.
It is not `ln[(nh/nl)(R)/(feed odds)]` and not an outlet enrichment ratio.
For non-rigid common rotation or varying common T, the corresponding neutral
closure gives `S = ∫ra^rb Δm Ω(r)² r/[kB T(r)] dr`; substituting the maximum
speed and one unspecified temperature is unjustified.

An equal-charge, common-temperature/common-rotation fully ionized isotope
experiment can in principle check this conditional log-odds slope because
the common electrostatic term cancels in the isotope difference. It cannot
thereby validate neutral entrainment, absolute density profiles, current-driven
rotation, neutral energy or extraction. Unequal charge, unequal temperatures
or different species rotations invalidate that cancellation.

## Uncertainty and prospective first-order gate

Use “first-order accurate” only for named observables on a bounded domain.
Before looking at a comparison, freeze the following candidate operational
target (20% is an engineering target proposed here, not an established standard
or demonstrated capability):

- For each resolvable, nonzero primary held-out scalar, point prediction
  error ≤20% of the measured **signal**, with correct sign and trend over the
  admitted sweep. For separation, signal is `S=ln α` or the source's precisely
  defined enrichment increment, not purity itself or α's baseline of one.
- Zero/no-drive controls use a predeclared absolute resolution, not division
  by zero. Extremely small separation signals below measurement resolution
  are unresolved, not relative-accuracy passes.
- Numerical discretization and source-digitization changes should each be
  less than 5% of that experimental signal before attributing a 20% error to
  physical fidelity. If they are larger, refine/report inconclusive.
- Report the source's measurement uncertainty alongside prediction error;
  an experiment too uncertain to distinguish 20% disagreement cannot establish
  the target. Do not expand uncertain coefficients until every datum overlaps.
- Retain every admitted point and failures. Do not select the closest run or
  favorable radius. Any exclusion must use an independent, predeclared domain
  rule and keep its rejected record.
- Report probability coverage only if the uncertainty model and number of
  genuinely independent held-out measurements support that inference. A few
  points or many pixels from one fitted curve do not establish calibrated 95%
  coverage. A bounded input sweep is labelled an envelope, not a confidence band.

For independent small relative input uncertainties in the rigid conditional
formula, `uS/|S| ≈ sqrt[(2uΩ/Ω)²+(uT/T)²+(uΔr²/Δr²)²]` (plus mass uncertainty
if relevant). Retain covariance if reported. For wall-speed form at ra=0,
`S=Δm vR²/(2kB T)`, radius must not be counted a second time as independent
uncertainty when vR was derived from ΩR. Large ranges or correlated geometry
require direct propagation rather than this differential approximation.

Supply observed-value uncertainty, input-induced prediction uncertainty,
numerical error, digitization resolution and structural/model discrepancy
separately. Agreement conditional on measured speed does not constrain error in
the simulator's predicted speed. Common source/systematic errors do not shrink
like independent pixel noise.

## Primary candidate warnings

- [Kaneko, Sasaki & Kawashima (1978)](https://doi.org/10.1088/0032-1028/20/11/007)
  is unusually relevant: its primary abstract describes a weakly ionized He–Ar
  experiment and an outer-electrode Ar/He ratio 1.55 times its pre-rotation value
  at 7.5 kG and 1 A, over 0.6–20 Torr. Full text is needed for radii, temperature,
  composition, speed profiles, sampling geometry and uncertainty. The abstract
  alone is class D for prediction. It must not be compared to wall/axis α.
- [Okamoto, Kiyose & Suzuki (1979)](https://www.jstage.jst.go.jp/article/jaesj1959/21/7/21_7_596/_article/-char/en)
  states in its abstract that its 7.6 km/s and α of order 1.5 arise from ideal
  fully ionized MHD theoretical analysis. It is not experimental data.
- [James & Simpson (1976)](https://doi.org/10.1088/0032-1028/18/4/004)
  reports comparisons to probe voltages and spectroscopic temperatures; retrieve
  the full primary experiment and measurement map before admission.

## Required independent closeout

The executable v64 pressure challenge is deliberately weaker than an admitted
experiment. It freezes the reported 3-to-9 Torr filling-pressure change and
2/3 peak-speed ratio, assumes identical temperature/drive/time and fixed
collision and wall-drag rates, and uses filling pressure as an inventory proxy.
For the fixed-inertia `analytic-reference` initialized at rest, all inertias,
ion-neutral torque coefficient and wall-drag coefficient scale with inventory.
The linear response matrix remains fixed, so speed scales inversely with
inventory at every common elapsed time. The independent expectation is therefore
1/3, not only at steady state. This argument must not be silently extended to
the coupled evolving-inertia solver. A failure challenges the fixed-rate
closure under these assumptions; missing discharged-inventory and profile
measurements prevent a matched experimental validation conclusion either way.

The independent auditor should reconstruct source conversions and observation
maps without importing the comparison implementation, check actual primary
figure/table extraction and exclusions, recompute the stated metrics from
exported raw predictions, and inspect exact VM execution/source manifests.
Negative controls should include Hz/rad confusion, swapped ratio orientation,
wall/axis versus wall/feed, missing versus zero uncertainty, and use of a fitted
point as purported holdout. Passing synthetic tests validates these checks, not
the centrifuge. No review approval should precede actual comparisons/receipts.

## Independent closeout of the qualified v64 run

Inspected the exported `final-qualified` raw comparison, independent results,
coordinate sensitivity, execution receipts, test logs and rendered four-panel
plot. The controller records 671 inputs with source digest
`3026c88f6b29b337e3701493b6916cc0d164f779d304212277e85ecb43df4a25`,
verified before and after execution. The host checker/test hashes match that
input manifest. Read-only host hashing also confirms comparison digest
`99dcf109eb6ff64a26614b459bc2860d5b5145e66a28666a6a06ad6f8c963b49`
matches the independent audit input, and corrected extraction digest
`0cfb21edd1debf57ce7d62351b11d4f628fac84f5e44cfc87f21d84f1554de33`
matches the run receipt. The actual tick calibration supersedes the earlier
upper-frame-as-15000 K extraction; the upper frame is approximately 15500 K.

All 26 selected TypeScript checks and 16 Python checks passed. Comparison,
independent reconstruction, coordinate sensitivity, typecheck, build, site and
asset checks each exited 0. These are execution/numerical checks; the physical
structural challenges fail:

- Inner-marker rigid fit: 3 training, 5 heldout; heldout RMS 529.7 m/s,
  59.55% of observed peak. All 65,536 coordinate corners give 56.47–62.75%.
  Common velocity rescaling leaves the normalized error unchanged.
- Pressure challenge: predicted speed ratio 1/3 versus reported 2/3, giving
  50% ratio error and 100% slowdown-signal error. The exact inverse-pressure
  scaling is reproduced at six common times from 0.001 to 100 s.
- Calibrated B/Tmax inventory-proxy challenge: heldout speed errors 15.86%,
  22.55% and 41.18%. Diagnostic Tmax is not inventory-mean temperature.
- Nine synthetic radial-density operator cases reconstruct correctly. This
  does not validate measured isotope enrichment or extraction purity.

No blocker was found in the comparison arithmetic or exported provenance.
This approves the bounded comparison as a diagnostic, **not forward device
accuracy or the 20% first-order target**. Radial rotation/shear, current and
thermal profiles, discharged inventory, ionization and observation maps remain
needed to attribute discrepancies. The 0.5 inferred drag ratio is not a uniquely
identified physical fix. Source reproduction error and the covariance/coverage
meaning of the reported 15% reproducibility remain unknown. Finite corner
sensitivity does not prove an interior uncertainty bound. The run receipt
explicitly records unchanged production laws/release bytes and no fresh browser
test; this audit supplies no new deployed-interaction verification.

Final accepted rerun: inspected the accepted controller and command receipts
after the plot labels changed to “Peak apparent speed.” All nine command groups
again exited 0. Its 672-input source snapshot is
`59e41a81e7184f8b42fc31d2ca4ec4a591e0cb2d7bcf892a0ab0722085edfc49`,
verified before and after execution. Read-only host hashing confirms the accepted
comparison remains exactly
`99dcf109eb6ff64a26614b459bc2860d5b5145e66a28666a6a06ad6f8c963b49`.
Corrected data and release digests are unchanged. Reviewed the drafted main
report `docs/EXPERIMENTAL-BENCHMARKS-V64.md`; it preserves failures, observation
mapping limitations and the absence of a first-order device accuracy claim.
The accepted rerun supersedes the qualified run for delivery without changing
this audit's scientific conclusions.
