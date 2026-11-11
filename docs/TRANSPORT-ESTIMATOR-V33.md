# v33 relative-speed estimator audit: rejected extra Bessel correction

Read-only source/algebra audit, 2026-11-08. No simulation, test, production edit or gate change was performed. Prior domain evidence and its 26-file seal remain untouched.

**Finding:** the four-ion domain witness has no missing finite-population correction. Its same-species relative-speed estimate already equals the exact mean squared relative speed over all distinct representative pairs. Applying another n/(n−1) factor would count the correction twice. There is no justified gate-passing fix here.

## Actual path and intended quantity

`doublewell-dynamics.ts:record` transforms each ion to its own cylindrical velocity components before `inspectDoublewellRegime`. The inspector groups by mass and charge, removes each group's mean velocity, and computes

\[
S_s=\sum_{i=1}^{n_s}|v_i-\bar v_s|^2,\qquad
T_s=\frac{m_sS_s}{3e(n_s-1)}.
\]

Here m is in kg and T in eV. `atState` constructs a representative **species-moment** encounter speed,

\[
\widehat g_{ab}^2=\frac{3eT_a}{m_a}+\frac{3eT_b}{m_b}
+|\bar v_a-\bar v_b|^2.
\]

The n−1 denominator shows that sampled temperature is a sample-covariance estimate, rather than the population covariance of the finite marker measure. The source calls the result a representative encounter estimate; it does not claim that every species-pair value is an exact empirical-pair average or unbiased continuum estimator. The reference-state branch instead uses declared physical temperatures.

Crucially, this diagnostic speed does **not** set collision scattering. `collideCoulombCell` chooses disjoint random pairs, and `scatterCoulombPair` computes their actual relative velocity. Changing this diagnostic would change domain classification, not correct a demonstrated trajectory or heating-rate error.

## Same-species identity: no missing correction

For any set of n vectors, without probabilistic assumptions,

\[
\sum_{i\ne j}|v_i-v_j|^2=2n\sum_i|v_i-\bar v|^2=2nS.
\]

Consequently the uniform ordered-distinct-pair mean is

\[
\frac{1}{n(n-1)}\sum_{i\ne j}|v_i-v_j|^2
=\frac{2S}{n-1}=\frac{6eT}{m}=\widehat g_{ss}^2.
\]

Unordered pairs give the same mean. The algebra holds with anisotropy, correlations and arbitrary values of the vectors. Those properties affect continuum/statistical interpretation, not this finite-set identity.

The with-replacement empirical-distribution target includes self draws and instead gives 2S/n. Its speed is smaller, not larger. The n/(n−1) factor converts that population result to the distinct-pair result and is **already present** in the production diagnostic. Adding it again has no support for either target.

The independently captured seed303 witness contains exactly four 40u/+e representatives and no 84u representatives. It is therefore exclusively the same-species case above: T=0.3351339268052941 eV, g=2202.345621539873 m/s, and recorded electron-screened encounter proxy 0.11406654074066121. The rejected extra factor cannot explain this crossing as an implementation error. Its configured 0.1 gate remains failed.

## Cross-species targets are different

For two distinct species, the exact Cartesian-product mean over all n_a n_b representative pairs is

\[
G_{ab,\mathrm{emp}}^2=\frac{S_a}{n_a}+\frac{S_b}{n_b}
+|\bar v_a-\bar v_b|^2.
\]

The current diagnostic exceeds this finite-set mean by

\[
\widehat g_{ab}^2-G_{ab,\mathrm{emp}}^2
=\frac{S_a}{n_a(n_a-1)}+\frac{S_b}{n_b(n_b-1)}.
\]

Under the additional assumptions of independent IID draws within and between species, sample covariance estimates are unbiased, but the squared difference of estimated means has sampling bias. Thus the current cross-species plug-in estimate has expected excess tr(C_a)/n_a+tr(C_b)/n_b over the continuum relative second moment. The empirical Cartesian-product expression is unbiased for that continuum target under those assumptions. Evolved colliding representatives need not satisfy them. This distinction is real and should be documented; it neither demonstrates a bug against the source's declared representative-moment target nor affects the one-species witness. Any future switch must first declare a new target and validate its domain interpretation.

## Mass, weights, coordinates and correlations

Unequal masses are retained correctly: substituting the temperature definition cancels m separately in each thermal-speed term. Reduced mass is used separately for impact-parameter estimates; charge affects grouping, screening and gyrofrequency, not the finite-set velocity identity.

The production contract is explicitly **equal representative weight**. It uses one global physical weight, count-based species fractions and total-cell density count×weight/volume. Unequal statistical weights are unsupported; no hidden weighted correction can be justified for this run. For comparison only, independent weighted draws with normalized weights p_i have empirical covariance C_p and conditional distinct-marker mean square 2C_p/(1−Σp_i²). That is a different sampling law requiring weighted moments and a defined pairing method, not an insertion into this equal-weight implementation.

The cylindrical transform is orthonormal for each particle, then the r/θ/z tuples are treated as a common basis under axisymmetry. The identities apply to these transformed tuples, consistent with the actual ring collision operator. They do not assert equality with Cartesian velocities of spatially separated particles at different azimuths. Finite cell shear remains a spatial-resolution issue.

Finally, n−1 does not make a correlated sample's continuum temperature unbiased. Pair correlations alter that interpretation. The exact distinct-marker algebra survives, but a four-marker cell remains a noisy estimator of an underlying physical distribution. No confidence interval or noise-based dismissal follows from this audit.

Evidence: the separate `scientific/transport-v33/estimator/` leaf preserves audited source copies, their hashes, the already reconstructed witness input and this addendum. Original acceptance sources, confirmations and domain seal were not modified. No numerical results or hypothetical corrected gate values were generated.
