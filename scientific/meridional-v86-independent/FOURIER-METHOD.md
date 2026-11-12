# Optional Gaussian-mixture optical acceleration

This module is separate from the frozen V86 producer. Its author performed no
execution. Parent-owned safe-dev controls, actual-field comparisons and timing
must precede selection. It changes numerical integration, not velocities,
temperatures, brightness, score thresholds or physical simulation equations.

## Exact target and Fourier representation

For normalized positive weights f, means u and widths
`s=sqrt(kB T/mAr+instrumentSigma^2)`, the target bin probability is

`p_j=sum f [Phi((edge_(j+1)-u)/s)-Phi((edge_j-u)/s)]`.

The existing V80 normal-CDF integrator remains the direct reference. The
characteristic function is `C(k)=sum f exp(-s^2 k^2/2-i k u)`. Periodize over
four times the original spectral-window width L. For a uniform bin of width d
and center x, integration of each Fourier mode is exact:

`p(x)=d/L sum_m C(2 pi m/L) sinc(pi m d/L) exp(2 pi i m x/L)`.

The real inverse FFT therefore receives positive-frequency coefficients
`C(k) sinc(k d/2) exp(i k firstBinCenter)`. NumPy's normalized sinc uses the
argument `k d/(2 pi)`. An inverse transform with four times the original bin
count supplies `d/L=1/Npadded`; the first original-window bin count is retained.
The remaining period is padding, not discarded physical probability to be
renormalized.

## Probability error controls

The actual weighted Gaussian mass outside the centered fundamental period
is an upper bound on image probability entering the original window. It must
be less than 1e-14. This uses each component's mean, width and photon weight,
not a rule that all component means happen to be inside the window. An
unresolved image contribution is rejected.

With `a=2 pi^2 s_min^2/L^2`, coefficient magnitudes are bounded by
`exp(-a m^2)`. The omitted series obeys

`sum_(m>M) exp(-a m^2) <= integral_M^infty exp(-a x^2) dx`.

This determines M using SciPy's complementary-error inverse. The summed
absolute truncation bound over all original-window bins must be below 1e-14.
The formula also bounds each bin's truncation error. The FFT Nyquist limit
must strictly exceed M.

Floating-point accumulation and FFT error have a separately reported
operation-count budget under standard floating-point assumptions, including
component reductions, phase evaluation and transform depth. This is not a
formally verified bound on the SciPy implementation. Direct-CDF comparisons
and actual-field witnesses remain necessary. Negative numerical bin masses
are accepted only within the per-bin budget and set to zero. Their actual
removed magnitude is reported. There is no probability renormalization.

Captured flux is independently evaluated by the exact full-window Gaussian
CDF expression. Its discrepancy from the accumulated bin masses must fit
the reported error budget. Centroid and variance use the original analytic
Gaussian-mixture moments; the binned centroid uses the actual retained bins.
Before evaluation, components are grouped and sorted by the exact `(mean,T)`
pair using the same `np.unique`/`np.bincount` operations and `sum(combined)`
normalization as V86. This preserves its component ordering for moment and
near-tied-mode comparisons rather than treating raw input order as meaningful.

## Mode and failure behavior

The original estimator chooses the first largest uniform-bin probability and
applies three-bin quadratic interpolation. Fourier roundoff can otherwise
swap near-tied peaks in bimodal meridional spectra. Candidates within twice
the per-bin probability budget of the Fourier maximum are evaluated using
the original normal-CDF bin expression, accumulated in the same sorted
256-component block order as V86. The first exact maximum and its two exact
CDF neighbors determine the same quadratic estimator. Mathematically equal
separated peaks remain a nonunique estimator; floating-point/library reduction
details can choose either peak, and such degeneracy must be disclosed rather
than represented as a physically resolved mode prediction.

A maximum at either window edge is rejected, as by the original kernel. A
maximum below the Fourier probability resolution is rejected rather than
turning tiny truncation ripples into a resolved line. Line-width/bin admission
is unchanged: at least eight bins per narrowest Gaussian standard deviation.

Tests are authored for all original bin widths, variable temperatures,
instruments, radial temperature proxies, large radial motion, symmetry,
bimodal near-ties, period images, clipped maxima, zero-weight components and
invalid inputs. These tests have not been executed by the author. They do
not independently establish the experimental emissivity/temperature closure.
