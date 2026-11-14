# Independent V107 axial-preflight review

The retained combined preflight is **FAIL**, with full qualification pending.
Its only two failed gates concern the relative agreement of two quadrature
evaluations of nearly zero initial density/temperature differences. No frozen
code, gate, physical input or retained result was changed for this review.

## Actual evidence

Inspected the candidate01 axial export, actual 160 × 96 fields/history,
producer receipt and combined independent audit. Recomputed seals:

- Axial predictions: `9c071da189b7390b846d9925c2aa5d6ace484ba7ed37d66e9ee1d16152c971b6`.
- Compressed fields: `cb0b57fa128b15cf5cb89d52468a6fb4cabb0feeb5882a67445b2f3d3c86b072`.
- Decompressed fields: `456eabe15160a8a82f3181e16db771698f854af074bed92b13d4b1f875293276`.
- Combined audit: `19b36780162a19d8d7e52f4f8fd6902fc61ea0644797dfd6807384613495c845`.

All agree with receipts. The trajectory completed 1,661 steps to 1 µs in
810.28 s, with 657,884 KiB peak RSS under its declared 1 GiB budget.
The combined audit contains 41,138 gates and exactly two failures; all 28
refinement gates and all recorded history/conservation checks pass.
The actual axial trajectory's maximum relative energy, angular and charge
defects are 4.67e-15, 1.31e-14 and 2.68e-12. Minimum temperature is
1,799.90 K; maximum is 234,498.94 K, still a conditional transport closure.

At 1 µs, axial 48 → 96 changes are 3.009840% for density increment,
0.994207% for radial velocity and 1.405413% for axial velocity. Those pass
the unchanged 5% pair gates. This two-level comparison establishes neither
axial contraction nor the full nine-job, four-clock qualification.

## The two initial-state failures

| Initial field | Order-2 error integral | Order-3 error integral | Relative spread |
|---|---:|---:|---:|
| Density | 2.985113272e-42 | 3.069452066e-42 | 0.027476824 |
| Temperature | 6.699684466e-28 | 6.717044493e-28 | 0.002584474 |

Both exceed the frozen 1e-10 relative quadrature limit. Their full-field
relative RMS differences are only 1.35e-16 and 1.69e-16. Actual archived q0
on both axial meshes has maximum density spread across z of 1.0842e-19 kg/m³
and temperature spread of 3.6380e-12 K. The initializer supplies radial-only
rho/T, then constructs m=rho*V and E=thermal+kinetic; primitive recovery
divides by V and subtracts kinetic energy. Its tiny axial variations are
consistent with those finite-precision operations, not imposed axial profiles.

The entire q0 is not identical: steady-torsion initialization changes initial
angular momentum from 9.905588827e-6 to 9.894928173e-6 kg m²/s and energy
from 0.5686884173 to 0.5685284499 J. Those real discretization differences
must remain in the scientific comparison.

Static trace identifies the numerical vulnerability: audit99 evaluates two
large interpolated fields independently, subtracts them, then squares their
ULP-scale difference. Interpolation roundoff depends on the Gauss points;
relative agreement of that almost-null squared difference becomes unreliable.
This is a precision diagnosis supported by source/scale evidence, not yet a
validated replacement result. The original failed checks remain failed.

## A falsifiable, unchanged-norm diagnostic

Use the existing union of bilinear reconstruction panels and boundary rules.
Interpret the existing float knots and field values exactly in higher
precision, map both traces to each panel, then form corner differences d.
For radial panel [r0,r0+h] and axial width k, the same exact norm is

`Epanel = 2*pi * d.T * (Mz tensor Mr) * d`, radial corner index fastest,

`Mz = k/6 * [[2,1],[1,2]]`,

`Mr = h * [[r0/3+h/12, r0/6+h/12], [r0/6+h/12, r0/3+h/4]]`.

This is direct integration of the squared bilinear difference with weight r.
Do not use the cancellation-prone expansion integral(a²)-2*integral(ab)+integral(b²).
Retain original increment construction, boundary padding and reference norms.
No nonzero error should be clipped, rounded to zero, or removed by a floor.

[SciPy NdPPoly.integrate](https://docs.scipy.org/doc/scipy/reference/generated/scipy.interpolate.NdPPoly.integrate.html)
provides established piecewise-polynomial integration machinery; ordinary
float coefficients formed after cancelled interpolation are insufficient.
[mpmath conversion/arithmetic](https://mpmath.org/doc/current/general.html)
supports lossless float conversion and increased arithmetic precision for
an independent reference. Compare analytic mass integration with Gauss 2/3
at 80 and 120 decimal digits, applying the original 1e-10 spread criterion.
Require nonzero near-null controls, identical-field controls and genuine
finite-difference failures to retain their meanings. A successful diagnostic
would justify a separately sealed auditor correction, not rewriting V107.

No scientific code was executed by this reviewer; checks used trusted
JSON/hash utilities and static algebra. Root remains the sole VM operator.

## Retained precision witness, subsequent evidence

Inspected the actual `precision-evidence-20261113/v107-precision02` diagnostic,
logs, execution receipt, and current `precision107.py` plus its tests. Source
SHA-256 is `0b5f600d2fc9da378fd81e3a05248c3848ce7cce93c750ca6960f7a1f864e031`;
diagnostic SHA-256 is `f0f3c173c80345622c059d16b278782ce2e2685143d53c88ab3862f496bb922e`.
Both were independently checked against their receipts. The diagnostic pins
the actual radial/axial field hashes and original failing audit hash above.

The root-run independent Decimal witness reports five passing controls.
They cover rational polynomial integrals, nonzero one-ULP differences,
identical profiles, alternating tiny perturbations, genuine changes exceeding
5%, and explicit scalar/domain boundaries. Its synthetic 40-digit test permits
1e-22 relative error because subtraction spends about 16 decimal digits;
the separate scientific 1e-10 quadrature criterion remains unchanged.

At 60 decimal digits, the actual initial error integrals are
`1.6910590268012248984823727568588029e-43` for density and
`3.2718964386390578542506407853572109e-28` for temperature. Neither is zero.
Analytic Q1 integration and independent Gauss 2/3 evaluation agree; relative
40-to-60-digit changes are 2.09e-25 and 2.02e-25, far below the original
1e-10 criterion. The source uses the same binary64 reconstruction knots,
losslessly converts archived values, and changes arithmetic rather than
the observable, boundary conditions, denominator or gate.

This supports interpolation cancellation as the cause of the two failed
binary64 checks. It does not retroactively change their frozen FAIL result.
A generic replacement auditor still requires its own source provenance,
all-field/boundary regressions and actual archived-data comparison before
acceptance. No producer or live-playground change follows from this witness.

Static review of the proposed generic `stable107.py` at SHA-256
`5b54757cb1fc08eeffd70a0b62167cafb149fe4b101057e5c5bd4b3f54c9708b`
found no mathematical or boundary-condition blocker: exact rational tensor
interpolation maps both original Q1 traces onto their union knots, forms
their difference, then rounds that small difference once before the original
Gaussian-panel integration. Binary64 centroid and increment construction,
velocity boundary padding, the original finer reference and combined
meridional normalization are preserved. All five fields and both increments
use this same path. No near-zero floor or clock-specific branch is present.
Runtime controls and actual-data comparison remain pending at this review
point; this static finding alone does not approve replacement qualification.
