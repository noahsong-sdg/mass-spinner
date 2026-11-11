# Independent fast-thermal numerical review

Reviewer: `/root/fast55_numerics`. No blocking numerical defect found within
the stated mesh/time study and inspected evidence. This is a review of the
discrete thermal model and sampled-history convergence, not calibration of
Marathon hardware or approval of an uninspected final build/deployment.

I read the actual constructor, reference solver, case generator, campaign
runner/analyzer, production comparison, independent physical audit and
half-space formulas. I authored `scientific/thermal-v55/audit-numerics.py`.
The parent executed all project code in the offline safe-dev VM. I inspected
the resulting host-exported logs; I did not run project code on the host or
independently execute a second VM campaign.

## Resolution and implementation

The earlier 128-cell uniform wall has 93.75 micrometre spacing, whereas the
solid penetration depth over five gas-film times is about 12 micrometres.
Reducing the timestep alone converges to an underresolved spatial model.
In plain terms, the simulation needs to see the thin wall layer rather than
treating it as part of a much thicker first cell.

The existing solver already constructs every mass and half-shell resistance
from the stored annular edges. The coherent extension is an optional explicit
edge array, leaving uniform construction as the default. The symmetric,
nested exponential meshes refine both interfaces and retain the entire
12 mm wall and its mass, within the production limit of 128 cells. An
external-only 256-cell holdout supplies an additional spatial comparison.
This is preferable to silently expanding the public grid domain or cutting
off the outer wall to obtain cheap small cells.

The actual FiPy reference uses the same prescribed edges through nonuniform
`CylindricalGrid1D` spacings, while independently assembling its matrix.
This is an existing FiPy capability, documented in the official
[factory mesh reference](https://pages.nist.gov/fipy/en/stable/generated/fipy.meshes.factoryMeshes.html).
The thermal laws, fixed annular mass, backward-Euler storage, equal/opposite
internal heat flow, Robin films, and physical residual gates are unchanged.

I checked the constructor's copied array, count, finite/increasing-edge and
explicit endpoint invariants. Two adjacent issues were found and corrected:

- A truthy-array test would silently treat explicit `null`/`false`/zero as
  a request for uniform geometry. Only `undefined` now selects the default;
  malformed explicit geometry rejects. This enforces the actual input
  domain instead of introducing an undocumented fallback.
- Applying exact endpoint equality to generated legacy uniform edges rejected
  valid three-cell geometry: `.12 + .1*3/3` rounds to a different double
  from `.12 + .1`. Both TypeScript and FiPy regressions reproduced the failure
  before correction. Exact supplied-endpoint validation is now scoped to
  supplied edges; existing uniform arithmetic remains unchanged. This avoids
  changing old geometry values or inventing a new rounding tolerance.

`thermal55-legacy-red.log` records both failures. The targeted green rerun
passed 16 TypeScript thermal/grid checks and the FiPy legacy case. The
separate `thermal55-compat-parity.log` records exact five-step parity for
graded and uniform reference cases after the compatibility correction.

## Actual refinement and cross-code evidence

I inspected `scientific/fixes-v43/thermal55-refinement.log` directly. The
matrix varies 32/64/128 graded cells and 2,560/5,120/10,240 timesteps, with
the 256-cell holdout and uniform control. It compares the same 97 physical
checkpoints, reconstructing the actual inner surface through film and
half-cell resistance; a first-cell center is not mislabeled as a surface.
Timestep and mesh slices accompany joint refinement, so cancellation along
one refinement diagonal cannot alone establish success.

Observed finest-pair results:

| Quantity | Timestep refinement | Spatial refinement, 128 to 256 |
| --- | --- | --- |
| Gas temperature | 0.0448754 K | 3.02955e-5 K |
| Inner surface temperature | 3.30613e-5 K | 4.12281e-5 K |
| Reconstructed inner-layer profile | 3.30613e-5 K | 6.53192e-5 K |
| Interface heat flow / initial 500 kW | 8.97577e-5 | 6.41944e-8 |
| Cumulative gas heat / initial contrast energy | 8.97508e-5 | 6.05910e-8 |

The measured temporal gas ratio is 0.500305; spatial interface ratios approach
0.25. Profile and outer-surface differences are explicitly gated as well.
The joint finest gas difference is 0.0449755 K. All predeclared/explicitly
derived criteria pass. These differences support first-order temporal and
approximately second-order spatial behavior; they are not rigorous error
bounds on an unsampled continuous history.

The uniform control remains a negative result: 0.172084 K gas and
0.503080 K inner-surface differences from the graded run. It fails the refined
accuracy criteria even at the fine timestep. Thus the measured improvement
requires spatial resolution and is not just another timestep-only rerun.

The production driver checks every accepted gas/all-wall temperature,
reconstructed surface, endpoint power, signed cumulative gas exchange and
coolant ledger. It correctly obtains endpoint W from the backward-Euler
step heat divided by dt, separately from cumulative heat. I inspected
`thermal55-production.log`: 11 supported cases, **5,389,445 temperature
values**, maximum FiPy difference **1.08435e-9 K** versus the 5e-6 K gate.
The independent physical audit checks **94,725 accepted states** across all
14 cases, including external/constant-property runs. Its maximum normalized
energy-row residual is **1.60668e-15**, below the unchanged 1e-11 gate;
energy, signed gas/coolant exchange, passive bounds and entropy passed.

## Independent advancement and a measured audit-roundoff issue

My Decimal80 solver independently rebuilds annular masses, logarithmic
resistances, exact integrated enthalpy secants and an absolute-temperature
Thomas solve. It imports neither FiPy nor production modules. It advances
five selected early finest-grid steps, not the entire campaign.

The first audit correctly exposed an overly exact arithmetic assertion in
the auditor itself: at step zero, an otherwise passive 1,000 K interior cell
overshot by **1e-76 K**, one Decimal ULP at 80 digits. Maximum equation
residual was 1.5366e-56 J, and iteration change 1.433e-48 K. This is a
roundoff-level false positive in a mathematically exact maximum-principle
comparison, not a physical wall overshoot. The original failed assertion
and quantified diagnostic remain in `thermal55-numerics-audit.log` and
`thermal55-numerics-diagnose.log`.

The fix gives only the passive inequality an explicitly reported arithmetic
allowance, `8 * node_count * ULP(bound_temperature)`, about **1.032e-73 K**
here. It is not claimed as a rigorous accumulated error bound. The actual
maximum overshoot remains reported as 1e-76 K. A self-check accepts one ULP
and requires a much larger 1e-30 K violation to reject. Increasing precision
would merely move the last-digit issue, and relaxing physical residual or
cross-code tolerances would address the wrong condition. The nonlinear
1e-44 J/K stopping criteria, 2e-7 K comparison and coolant gates remain
unchanged.

The actual green run, `thermal55-numerics-green.log`, passed five states with
maximum FiPy difference **3.41061e-13 K** and coolant difference
1.05879e-22 J. Its case packet SHA256 is
`fbc82ef2693f000aa373ee58a3939134eb44fea325a5db32700e11b4516af896`,
reference SHA256
`ac91bab941d9f279c1f17c8dd75ef5e6c1b9c99b792705642682750bfd4dbb28`,
and auditor SHA256
`b7893fc1948344a0ed75587fc19389dc865609c412cb17969adf987d19964bbc`.
The receipt records exit zero on synchronized source snapshot
`00a8cae5bc729df19e7811bed6f13a7b2c8c86763273852bf72b13aa4df894bf`.

## Independent continuum comparison and limits

I separately derived the lumped-gas/film/half-space Laplace partial fractions
and checked the implemented complex-erfcx response and derivative signs.
The actual `thermal55-halfspace-audit.log` passes surface convolution,
integrated gas energy and equilibrium self-checks. The 128-cell constant-
property run differs from that independent continuum benchmark by at most
0.0449267 K gas, 4.81107e-5 K surface and 44.8795 W interface power at the
96 positive-time checkpoints. This corroborates the expected remaining
backward-Euler time error. It does not make the constant planar benchmark
an exact nonlinear cylindrical reference.

The qualified positive-time window starts at approximately 10.6 ns
(`tau/64`) and ends at 3.393 microseconds (`5*tau`); the exact initial right
limit is stated separately. The much earlier accepted timesteps are not
thereby certified as continuum-resolved wall fields. Fixed-depth profiles
are piecewise reconstructed, not raw wall-cell values or a dense continuum
error supremum. The graded API is available for scientific kernel studies;
the playground's default uniform selection has not silently changed.

Finally, this is conditional validation of a radial Fourier-conduction wall
and lumped gas with prescribed films. It does not establish gas mixing or
thermalization on a sub-microsecond timescale, accommodation/conductance
calibration, axial structure, radiation or real Marathon construction.
