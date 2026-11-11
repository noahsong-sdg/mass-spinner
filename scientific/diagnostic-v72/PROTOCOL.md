# v72: brightness sensitivity of the experimental profile challenge

Frozen before execution, 10 November 2026. Research only. No live model, default,
or deployment changes. This is not a matched experimental validation.

Trace: corrected v64 markers → v65 fixed core/annulus steady velocity → optical
projection → one least-squares amplitude from the three inner markers → five
outer holdouts. Keep geometry (core radius 0.0075 m, wall radius 0.06 m), forcing,
constant viscosity, split and all markers unchanged. The optical assumption is
the only changed hypothesis. No measured speed selects an emission profile.

The original 1980 paper, p885, states that the laterally observed spectra were
not Abel transformed and that their intensities were nearly constant across
radius. Uniform *local emissivity*, assumed by v65, instead produces a projected
brightness proportional to sqrt(R²-b²). The two are not equivalent.

Compare the retained uniform-local case with the ideal **exactly flat projected
brightness** limit. This is a source-motivated sensitivity, not a reconstruction
or a bound on the actual unknown brightness profile. Exact flatness across the
whole open disk implies the integrable edge-singular emissivity
epsilon(r)=C/sqrt(R²-r²), r<R. Do not clip it, assert a physical divergent wall
emission, or treat the tangent as an emitting chord. Real edge falloff, finite
aperture, opacity and the Fabry–Perot estimator remain unresolved.

With y=sqrt(R²-b²) sin(theta), the photon weight epsilon dy=C dtheta. Thus
brightness=pi C and the centroid is b times the uniform theta average of Omega,
theta∈[-pi/2,pi/2]. Use symmetry to integrate 0..pi/2. The uniform-local reference
uses y=sqrt(R²-b²)t, t∈[0,1]. Both assume optically thin centroid spectroscopy;
neither matches an unspecified fitted peak estimator by definition.

Use composite midpoint quadrature with 32/128/512/2048 points and retain every
grid result. Freeze the final 2048-point result before scoring. Compare each
2048-point unit-scale projection against independent SciPy QUADPACK using the
same explicit analytic flow, splitting at the core boundary. Required numerical
error <1e-6 of the observed profile peak after amplitude fitting. Do not require
monotonic refinement through a piecewise-smooth core boundary. Preserve the
unchanged project 20% error screen for **every** resolved held-out measurement;
also report RMS/observed peak to compare with v65, not to replace that screen.

Tests: rigid rotation for either photon weight, signed chords, central chord,
tangent/outside unavailable, flat-brightness normalization, distinction from
uniform-local projection, source/hash and stale marker rejection, frozen split,
no held-out amplitude leakage, and inherited v65 uniform-local result. Report
every predicted value and residual; bind script, protocol and marker SHA256.
The full source PDF has not been locally recovered/hashed in this stage; its
publisher text is the primary qualitative source, not a new numeric extraction.
Extraction, reproducibility and original-to-reproduction uncertainty are not
rerun here; retain v65/v70 results and no uncertainty-qualified pass.

Primary source: Wijnakker & Granneman (1980), DOI 10.1515/zna-1980-0815,
https://www.degruyterbrill.com/document/doi/10.1515/zna-1980-0815/pdf
Abel-transform convention: https://pyabel.readthedocs.io/en/stable/readme_link.html
Existing numerical library: SciPy integrate.quad (QUADPACK), independent reference
only; https://docs.scipy.org/doc/scipy/reference/generated/scipy.integrate.quad.html
