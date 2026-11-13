# Early swirl-response diagnostic

V93's remaining failures concern small swirl increments. This stage tests
the existing viscous operators against a known decay, before modifying the
coupled physics. It is a constant-property neutral-argon numerical control.
It changes no deployed model and establishes no experimental accuracy.

## What was tested

The [prospective protocol](scientific/swirl-control-v94/PROTOCOL.md), published
at `22bd4e1`, fixes the V93 graded cylinder, mixed symmetry/no-slip boundaries,
material properties, reporting clocks and error thresholds. The exact mode is

    u_theta = A J1(chi r/R) cos(pi z/(2H)) exp(-lambda t)
    lambda = nu [(chi/R)^2 + (pi/(2H))^2].

The existing OpenFOAM 14 incompressibleFluid module evolves native momentum;
the existing scikit-fem V86 operator evolves viscosity/heat at fixed mass.
The latter intentionally omits Euler advection and pressure in this control.
Native [momentum includes advection](https://cpp.openfoam.org/v14/incompressibleFluid_2momentumPredictor_8C_source.html),
so the small Reynolds number 1e-4 and half-amplitude test bound nonlinear effects.
This diagnostic has different dynamics from the strongly rotating V93 release.

Six native/custom pairs use n16/32/64 at 256 steps, n64 at 128/512 steps,
and n64 at half amplitude. Errors are measured against analytic point samples,
globally and near the upper wall, for whole states and response increments at
5/10/20 microseconds. The exact increment uses expm1 to avoid cancellation.

## Findings

| Fixed gate set | Passed | Failed |
|---|---:|---:|
| Finest analytic accuracy | 22 | 2 |
| Spatial error contraction | 48 | 0 |
| Timestep differences and contraction | 48 | 0 |
| Amplitude linearity / native meridional flow | 18 | 0 |
| Custom mass and energy | 12 | 0 |

The scorer exits **1**, retaining `analyticControlPass=false`. Both failures
are native response accuracy at 5 microseconds: 6.7568% globally and locally,
against the unchanged 5% limit. Native global increment errors subsequently
fall to 3.7570% and 2.0671%. The custom global errors at the same finest settings
are 0.3850%, 0.3815% and 0.3761%; local errors are 0.1459%, 0.1251% and 0.1094%.
All whole-state accuracy checks pass. These gates overlap and are not independent
experiments or confidence intervals.

The largest fine temporal difference is 0.00619%, well below 2%. Halving amplitude
changes normalized responses by at most 3.77e-13; native peak saved-clock
meridional speed is less than 7.91e-9 times A. Thus the observed discrepancy
exists without strong rotation or significant nonlinear secondary flow.

Post-campaign radial partitions locate 83.34% of native global squared error in
the first radial cell and 11.81% in the outer four rings. The radial band from
one-quarter to three-quarters of the radius has approximately 0.021% relative
response error. These selected partitions diagnose error location; they cannot
replace the declared whole-domain norm or erase axis/wall contributions.

Recovering the native integrated-inertia convention consistently in both the
prediction and analytic reference lowers the early local error to 6.1268%.
It still fails. This is a reporting-convention diagnostic, not a conservative
projection of the continuum initial condition or a new physical evolution.

The [supplemental protocol](scientific/swirl-control-v94/EXTENSION.md), published
at `00ebf3f` after these findings and before the extra prediction, adds one
native-only n128/s256 case. Its early global/local response error is **2.2156%**,
versus 6.7539% at n64/s256. Later errors are 1.2295% and 0.6820%. All twelve
whole/response, global/local comparisons meet the original 5% diagnostic bound
and contract, with ratios about 0.328. Initial point samples match the analytic
mode to 1.36e-20 m/s. This is evidence of resolution improvement, not permission
to overwrite the original failed campaign. Both radial and axial resolution
increased; this is not an isolated radial test, custom n128 comparison, new
timestep study or coupled-model qualification.

## Interpretation and next work

Verified: an early native viscous-response resolution error already exists in
the analytic control. Timestep refinement and amplitude reduction do not remove
it. The error is concentrated near radial boundaries. In plain terms, the
reference's large rotating velocity can look accurate while its tiny initial
change is inaccurate in a few influential cells.

Inference: axis/outer-wall spatial treatment and initialization projection are
better targets than tuning nonlinear transport or physical drag at this point.
The control does not uniquely separate wedge geometry, boundary interpolation,
point sampling and the viscous operator, nor prove that all six V93 failures have
one cause. No physical backend patch is justified by error location alone.
The smallest defensible next study separates radial from axial refinement and
checks the native near-axis rigid-rotation stress nullspace and conservative
initial projection. It must then rerun the coupled release under its own gates.

This diagnostic was chosen over changing the transport model because it tests
a known solution with the existing expert code, without fitting a coefficient
or loosening an acceptance threshold. [V93](GRADED-ENDWALL-V93.md) remains
numerically unqualified; neither this work nor code agreement establishes
experimental or live-playground qualification.

## Verification

All scientific execution ran offline in safe-dev, using the immutable
`/work/project/v94-swirl-source01` snapshot. Its source/reference maps are in
the phase receipts and archive. The existing Flow, Diffusion and reference
adapters were unchanged. Seven native solver/utility source/binary hashes were
checked before and after execution. Python 3.11.2, NumPy 2.4.6, SciPy 1.17.1
and scikit-fem 12.0.2 were reused without downloads. The extra native case is
separately sealed at `/work/project/v94-native-extension-source01` and refers
to the unchanged source01 implementation. Exploratory diagnostic partitions
and the supplemental prediction are explicitly distinguished from prospective
original gates. This is a single-agent audit, with no new independent agent review.

`test94.py` passed 59/59 controls, including the 51 retained regressions.
The exact-mode PDE/boundaries, false/no decay, wrong rate, stale/partial campaign,
representation recovery and native configuration were checked. The original
six pairs completed; `score94.py` deliberately failed on the two accuracy gates.

Final required application checks passed: `npm test` (1238/1238),
`npm run typecheck`, `npm run build`, `npm run check:site`, and
`npm run check:assets`. The separately verified 2666-file application snapshot
remains `ccfc2619fbc2509e31034c4b9a86535a5d8e623f7f68a3c6f8510023fba1ab7c`.
These are local isolated checks, not deployed-browser verification.
The build retains its existing large-bundle warning; this stage does not change
frontend loading or performance.

## Evidence

- [Sources and reproduction](scientific/swirl-control-v94/README.md),
  [all original gates](scientific/swirl-control-v94/evidence/v94-swirl-source01/scientific/swirl-control-v94/score-results/audit.json),
  [predictions](scientific/swirl-control-v94/evidence/v94-swirl-source01/scientific/swirl-control-v94/study-results/predictions.json).
- [59 regression/analytic controls](scientific/swirl-control-v94/evidence/v94-swirl-source01/scientific/swirl-control-v94/tests-results/controls.json),
  [post-campaign diagnostics](scientific/swirl-control-v94/diagnostics.json),
  [application receipt](scientific/swirl-control-v94/app-final/execution.json).
- [Original raw evidence archive](scientific/swirl-control-v94/evidence.tar.gz),
  [rehash receipt](scientific/swirl-control-v94/export.json): 17,172,017 bytes,
  SHA-256 `ef25b104c6791c658853d713754f491081860b761cf8fc71102900f391cf6e25`;
  all 295 members were verified, with complete sources, inputs and native fields.
- [Supplemental comparisons](scientific/swirl-control-v94/extension.json),
  [raw native refinement](scientific/swirl-control-v94/extension/evidence.tar.gz),
  [its rehash receipt](scientific/swirl-control-v94/extension/export.json):
  14,401,887 bytes, SHA-256
  `13fd9662d32fb4a988fac2c3dca6f137fb05c1b5b503beca946871a2e366d6d9`;
  all 46 members verified. This archive references the unchanged source01
  implementation in the original archive rather than duplicating it.
