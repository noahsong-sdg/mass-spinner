# Public experimental benchmarks and uncertainty

The benchmark and independent audit are complete. **A first-order predictive
accuracy claim for the Marathon centrifuge is not established.** The tests below
find large discrepancies in the reduced model's assumptions. They do not match
every apparatus input well enough to assign those errors to a real Marathon
machine or to the complete coupled live solver.

No production coefficients, defaults or deployed behavior changed. The new
scientific campaign runs the existing `rotorResponse` and `radialPDF` primitives;
the coupled spatial/thermal solver is not substituted into an incompatible
historical apparatus. Experimental agreement, numerical correctness and model
applicability are reported separately.

## Evidence and admission

Three independent agents reviewed public sources, model/observation mapping,
and numerical reconstruction. The best accessible material was:

- [Wijnakker, Granneman & Kistemaker1979](https://doi.org/10.1515/zna-1979-0602),
  weakly ionized rotating Ar, with separate ion/neutral diagnostics. Its Ar/Xe
  separation factor2.15 samples concentration odds at4 and6cm, not an outlet
  purity; the recovered material lacks matched mixture flow/temperature inputs.
- [Wijnakker & Granneman1980](https://doi.org/10.1515/zna-1980-0815),
  neutral Doppler profiles and pressure/field trends. Filling pressure is not
  measured mean inventory. Optical profiles are not Abel deprojected; the paper
  describes systematic underestimation of velocity and temperature.
- [Hood-McFadden, Kotla & Underwood2026v2](https://arxiv.org/pdf/2607.28208),
  a preprint reproducing historical markers alongside new compact-reactor
  measurements. We extracted experimental symbols in Figs10–11, excluding model
  curves and legend symbols. These are reproduced measurements, not raw data.
- [Kaneko, Sasaki & Kawashima1978](https://doi.org/10.1088/0032-1028/20/11/007),
  partially ionized He–Ar enrichment. Abstract-level operating extrema are
  insufficient for a matched separation prediction.

The search did not establish a complete public Marathon calibration dataset.
Company announcements, patent architecture and simulated isotope enrichment
are not experimental validation. The newer paper's optical spoke phase velocity
is not bulk gas rotation; boundary thermocouples are not gas-temperature sensors.
Its annular pressure experiment is not our full-cylinder geometry. No unsupported
gas was silently replaced by a lithium preset.

For future matched holdouts, the prospective engineering target is <=20% error
in a resolved measured signal, correct trends, and numerical/extraction error
each <5% of that signal. This is our proposed coarse playground target, not a
standard or a demonstrated result. Separation should use log(alpha), not the
baseline of alpha=1. Existing application validation requires stated standard
uncertainties; converting unspecified reproducibility into a Gaussian standard
deviation would fabricate evidence. These bounded structural comparisons are
therefore kept in scientific artifacts, without a new application validator.

## Executed comparisons

| Challenge | Method and result | Interpretation |
|---|---|---|
| Radial apparent velocity | Fit rigid Omega to3 inner markers at<=3cm; hold out5 outer markers. RMS529.74m/s, **59.55% of observed peak**. | Rigid shape misses the turnover/outer decline. Conditioned profile challenge, not a current-to-speed prediction. |
| Pressure scaling | Normalize at3Torr; hold out9Torr, same drive and prescribed temperature/rates. Existing reference gives**1/3**, source reports approximately**2/3**. End-speed ratio error**50%**; slowdown-signal error**100%**. | Fixed-rate plus filling-pressure inventory proxy does not represent this trend. Not a uniquely diagnosed wall-friction error. |
| Field scaling | Calibrate at.17T; hold out.13,.21,.255T. Use measured Tmax as an explicitly conditional inverse-inventory proxy. Errors**15.86%,22.55%,41.18%**. | Assumption set fails the20% screen at two fields; Tmax is not a measured mean gas temperature. |
| Equilibrium operator |9 synthetic single-species log-density ratios reconstructed independently from centrifugal potential, including zero rotation and two finite sampling radii. | Numerical operator checks pass; no experimental separation qualification. |

The pressure reference reproduces inverse-p scaling at six shared times from
.001 to100s. Because all inertias, reciprocal friction and wall torque
coefficients scale with inventory, its rate matrix stays fixed while angular
acceleration scales as1/inventory. Thus Omega scales asT/p at each shared time,
not merely at steady state. This exact statement applies to the fixed-inertia
analytic reference. Evolving radial inertia in the coupled solver changes it.

The field challenge consequently reduces independently to
`Vtest/Vtrain=(Btest/Btrain)(Tmax,test/Tmax,train)` under its proxy assumptions.
The profile fit uses apparent chord coordinates, converted from cm to m. For
rigid rotation, the projected tangential Doppler contribution is Omega*x even
with nonuniform emissivity, assuming no additional chord-dependent line flow.
A non-rigid comparison needs an emissivity/line-of-sight forward model.

The independent Python audit reconstructs the comparisons without importing the
TypeScript runner or production code. It retains the failures rather than
promoting agreement after per-point coefficient fitting. A required drag ratio
of0.5 at9 versus3Torr is an **inverse diagnostic** under the assumptions, not
an independently validated drag law. Unknown discharged inventory, current
distribution, temperature profile and velocity-shape changes can also matter.

## Uncertainty and the corrected extraction bug

The source reports approximately15% reproducibility without a specified
confidence interpretation. For the derived maxima-based parameter
`lambda=mAr Vmax^2/(2 kB Tmax)`, Cartesian +/-15% input sensitivities give
**0.6283–1.5559 times nominal**. That is roughly-37%/+56%, not a95% confidence
interval. Vmax and Tmax need not occur at the same radius, so this is not a
local centrifugal parameter or a direct isotope separation measurement.
The reconstructed values are0.16099,0.21808,0.26609,0.33782 across the four fields.

The source's first plotted lambda is about0.16 while prose says0.21. Deriving
lambda from the velocity/temperature markers supports the plot; the discrepancy
is retained. Fig10's coarse prose peak950m/s also differs from the reproduced
marker maximum889.63m/s. We do not adjust symbols to force agreement with prose.

An adversarial reviewer caught our extraction bug: the temperature frame was
assigned15000K, but its15000K tick lies below it. Technically this compressed
the vertical scale by approximately3.2%; simply, the chart border was mistaken
for a labelled value. The fix calibrates from actual0/7500/15000K vector tick
coordinates and verifies collinearity. Two regression tests cover the offset
frame and invalid tick geometry. This uses the source's actual axis, rather
than an arbitrary rescale chosen to match expected results. Corrected maxima
are8379,9377,11261,12867K. Earlier artifacts are superseded, not overwritten.

All65,536 corners of the declared eight-marker extraction-coordinate box were
tested with nominal train/test membership frozen. The held-out RMS/peak ranges
from**56.47% to62.75%** at those corners; maximum score change is3.20 percentage
points. A shared15% velocity rescale cancels in the normalized profile metric.
Finite corners are a sensitivity screen, not proof of an interior-extremum
bound. The source-to-reproduction digitization error and experimental covariance
remain unknown; they are not set to zero.

## What to build next

The strongest supported next step is radial azimuthal momentum with sourced
viscosity and wall stress, coupled to the existing species/energy equations.
The present one-Omega rotor cannot reproduce a velocity profile that turns
over before the wall, and prescribed drag does not predict changing losses.
In plain terms, we let the whole gas rotate together and dial its friction;
the experiment has different speeds and momentum transport at different radii.

Use the axisymmetric Navier–Stokes balance with Jr*B forcing and appropriate
wall conditions, checked against an independent finite-volume reference.
Historical data justify this direction, not a unique constitutive calibration.
Split it into reviewable steps: momentum/geometry and diagnostic operator;
measured-temperature conditioned flow comparison; then solved heating and a
genuinely held-out field/pressure case. Preserve published input uncertainty.
Avoid fitting arbitrary drag separately at every slider point or building a
full3D MHD solver before a simpler radial model clears the data.

Absolute separation, time to enrichment, extracted throughput and complete
Marathon performance remain unqualified. Better thermal coefficients alone do
not establish those quantities. The first-order goal needs a matched held-out
observable, not universal high-fidelity machinery, but it has not been met yet.

## Verification and artifacts

All execution was inside safe-dev at stage
`/private/tmp/mass-spinner-marathon-v35-final`, guest source
`/work/home/fix-v43-source`. Parent alone executed/synced the VM. The reviewed
controller copied scientific additions explicitly, checked source hashes before
and after, and preserved prior guest studies. Only public-PDF download and a
pinned PyMuPDF1.26.7 installation used online mode; tests/studies were offline.

Final checks:26 TypeScript tests pass (new comparison metrics, independent rotor,
and existing scenario/share-state tests);16 Python tests pass (14 independently
authored audit/negative controls and2 axis regressions). Exact commands:

- `node_modules/.bin/tsx --test tests/experimental-v64.test.ts tests/fuel-centrifuge-independent-v44.test.ts tests/fuel-centrifuge-scenario-v44.test.ts`
- `/work/home/gas-regime-v56-venv/bin/python -m unittest discover -s scientific/experimental-v64 -p 'test_*.py'`
- `compare.ts`, `independent_check.py` and `extraction_sensitivity.ts` execute
  successfully with their exact arguments retained in the final receipt.
- `npm run typecheck`, `npm run build`, `npm run check:site`,
  `npm run check:assets`: all exit zero.

The source PDF SHA256 is
`9402d8d19a6ba33a3a75e5c180ed84e941bff500fe6265ee16075c4e3553d03c`;
corrected extracted-data SHA256 is
`0cfb21edd1debf57ce7d62351b11d4f628fac84f5e44cfc87f21d84f1554de33`.
Controller receipts and source manifests are under
`scientific/fixes-v43/experimental64-*`.
The final accepted snapshot has672 inputs, SHA256
`59e41a81e7184f8b42fc31d2ca4ec4a591e0cb2d7bcf892a0ab0722085edfc49`;
its exact command is
`python3 scientific/fixes-v43/control.py --timeout 900 experimental64-final-accepted -- /work/home/gas-regime-v56-venv/bin/python scientific/experimental-v64/final.py /work/home/experimental-v64/final-accepted`.
The earlier final-qualified comparison was independently audited; the accepted
rerun preserves its exact numerical comparison and improves two plot labels
to say "apparent speed". The added host corrected-data fixture accounts for
the extra manifest input.

Raw data, predictions, independent audit, sensitivity, logs and PNG/SVG plots
are preserved under `scientific/centrifuge-v44/experimental64/studies/` with a
per-file SHA256 manifest. The PNG was reopened and visually inspected; source
page renders were independently inspected too. All151 release files remain
byte-identical to deployed v61 FinalD, release SHA256
`889256c3ef8ae80b934786f1dec45f4b5f1d9a06f39dd787d0245df11390a56d`.
There is no new deployment or fresh browser-verification claim.
