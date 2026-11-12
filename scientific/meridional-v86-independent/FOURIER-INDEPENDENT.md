# Independent Fourier-kernel source audit

Source reviewed: `fourier86.py`, frozen V86 `optical86.py`, V80 spectrum and
brightness/geometry interfaces. This reviewer did not author the Fourier
kernel. **No code or validation was executed by this reviewer.** Parent-owned
safe-dev execution is required before selecting this optional acceleration.

## Algebra checked

For a Gaussian mixture, `C(k)=sum f exp(-k²s²/2-iku)` and the inverse convention
is `exp(+ikx)`. Thus the implemented positive first-bin-center phase is correct:
it shifts samples to physical bin centers, including a window not centered at
zero. Integrating a mode across one bin gives `sinc(kd/2)`, expressed correctly
as NumPy `sinc(kd/(2pi))`. With `N=4n` and period `L=Nd`, normalized `irfft`
supplies precisely `d/L=1/N`. It retains conjugate negative frequencies once,
not twice. The Nyquist coefficient is zero because the cutoff must lie below
Nyquist. DC=1 fixes mixture normalization over the entire periodic domain;
the retained original window is never renormalized.

Writing `a=2pi² s_min²/L²`, the absolute omitted probability in each bin is at
most `2/N sum_(m>M) exp(-a m²)`. The decreasing-integrand integral bound from M
is conservative, so the implemented whole-window bound
`n/N sqrt(pi/a) erfc(sqrt(a)M)` and its per-bin value divided by n are correct.
Ignoring the sinc in that bound is conservative. The probability outside the
centered fundamental period bounds periodic images entering the inner original
window: those preimages are disjoint and all outside the fundamental interval.
The weighted Gaussian-tail expression uses each mean/width and remains valid
for low-weight outliers outside the period. It rejects unresolved images.

Analytic centroid and variance are exact mixture expressions, independent of
bin discretization and clipping. Instrument broadening adds its variance once.
Captured flux is the independent endpoint CDF expression, distinct from the
Fourier bin sum; checking their disagreement against the error budget is useful.

## Numerical limits and mode ownership

The floating-point operation-count allowance is an engineering estimate, **not
a proof** of the error of SciPy `exp`, `irfft`, reductions or Gaussian CDFs.
Accordingly, analytic truncation/image bounds alone do not establish the full
1e-14 floating-point accuracy. Actual CDF witnesses remain necessary. Tiny
negative bins are removed only within the allowance, their removed probability
is reported, and the returned probability is not renormalized. Clipped modes,
unresolved linewidth, insufficient spectral bandwidth, unresolved images,
nonpositive flux and invalid inputs are rejected; there is no direct-CDF
fallback that would conceal a failed acceleration admission.

Candidate peaks within twice the per-bin allowance include the true maximum
provided that allowance holds. Original CDF probabilities then select the peak
and its three-bin quadratic interpolation; consequently FFT noise does not
directly perturb the interpolated mode.

The initial independent review found that V86's direct reference grouped
duplicate `(mean,T)` pairs and accumulated blocks, while the first Fourier
candidate calculation summed original components in a different order. For
exact or extremely near ties, these reductions could select different first
peaks at roundoff level, producing a large mode discrepancy despite nearly
identical spectra. Matching analytic moments would not resolve that defect.
The Fourier author subsequently changed the kernel to the same sorted unique
`(mean,T)` pairs, `bincount` weights, normalization and 256-component CDF
accumulation blocks as V86. This reviewer inspected that correction in source.
The direct reference's identical bin estimator remains the comparison target;
the independent witness uses **V86's actual grouped reference**, not only V80
tests. No measured velocities enter the correction or tie convention.

Inputs in the frozen application have finite ordinary SI scales. The general
API checks finite primitive inputs but does not establish finite intermediate
values for arbitrarily extreme floating-point magnitudes; it should not be
advertised as robust for all representable finite numbers. No frozen-domain
issue is demonstrated by this source review.

## Fixed actual-field witness

`validate_fourier86.py` seals its current numerical-kernel sources, the archived
producer prediction manifest, compressed and raw field packets, and both
brightness/geometry fixtures before evaluating kernels; it verifies those seals
again afterward. The default input is explicitly
`meridional-v86/results/attempt01/predictions.json`, whose complete byte SHA256
must be `b211cfaffeacdea7207f210f7874f6aedd34d3d38c804cd18554b2bb679ae06e`.
Recorded `scientific/meridional-v86/*` producer sources map only to that attempt's
`source-snapshot` directory, without falling back to the current producer tree.
All other recorded frozen producer sources remain checked against their exact
ROOT paths. Thus an optional numerical-kernel integration does not masquerade
as the source of old flow data or weaken its original source seal. Missing,
modified or escaping archive paths are rejected. The archived producer source
seal and current numerical-kernel source seal are both recorded separately.
No velocity-target file is read. Later replay of all 26 flow packets and their
raw-byte hashes is a separate parent-owned check of unchanged flow physics.

Before inspecting outputs it selects the first declared scenario, 7cm anode,
64x96 grid, 0.1us maximum timestep, t=0 and 4us. It retains both optical edge
closures and first/middle/last geometric sightlines. There are 72 main witnesses
across 10/5/2.5m/s bins, 2900K/no instrument and radial-linear T/1000m/s
instrument, plus 12 fixed 1400/7250K endpoint witnesses with 500m/s instrument.
Exactly 84 direct calls limits the intended cost to tens of seconds on the
parent's measured kernel timing; this is an estimate, not an executed runtime
guarantee. No runtime threshold is a physical pass gate.

Frozen gates: maximum absolute per-bin probability error <1e-10; mode error
<1e-6m/s using the same CDF-bin quadratic estimator; analytic moments within
128 machine epsilons of their natural scales; captured flux within 128 machine
epsilons; nonnegative unrenormalized probabilities and the stated bin-sum budget.
All failures are retained. Passing establishes numerical equivalence for this
fixed witness inventory, not the physical adequacy of emissivity, neutral
temperature proxies, the heated flow closure or the original experiment.

Parent execution after final source/field export:

```sh
python scientific/meridional-v86-independent/validate_fourier86.py
```

With no arguments, this reads the immutable attempt01 input and writes current
`meridional-v86/results/fourier-validation.json`. Seven lightweight unit controls
cover fixed gate failures, explicit archived-source mapping, rejection of stale
external sources, rejection of missing archives without fallback, and path
traversal rejection. They have not been executed by this reviewer.

Final export03 evidence review: this reviewer reopened the flow/final receipts,
all 84 witness rows and their gate inventory, and independently rehashed the
current numerical sources, archived original producer sources, brightness and
location fixtures. Every recorded source hash matched. The archived prediction
manifest independently hashes to the declared `b211c...ae06e` baseline.
All 84 rows completed and passed: maximum bin-probability difference
`1.2750217548429532e-16`, mode/analytic-centroid/analytic-variance differences
zero, and maximum captured-flux difference `6.883382752675971e-15`.
Recorded direct/Fourier kernel totals are 3.855970247s/0.272362747s; reconstruction
took 0.008850458s. These are witness timings, not whole-campaign performance.
The initial summation-order finding is corrected in the reviewed source.

The reviewer also independently decompressed and hashed all 26 current and
archived field packets: every raw-byte hash matched its manifest and its
counterpart, confirming the separate replay receipt's identity claim.
Final prediction SHA256 is
`70e0923e8ac9a53a476e439a9df3e670fb52467ee9d3d6ab5aa62ad9eae5e5c7`.
This closes the previously pending artifact review. **The reviewer performed
read-only evidence/hash inspection, not a new project or VM execution.**
