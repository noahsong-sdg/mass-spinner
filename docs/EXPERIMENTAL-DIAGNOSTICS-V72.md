# Experimental profile: optical weighting does not resolve the failure

10 November 2026. **Experimental qualification remains incomplete.** This stage
tests a specific explanation for the retained radial-velocity disagreement.
No application source, interactive default, 3D asset or deployment changed.

## What was tested

The original [Wijnakker & Granneman experiment (1980), p885](https://www.degruyterbrill.com/document/doi/10.1515/zna-1980-0815/pdf)
reports laterally observed spectra without Abel inversion and nearly constant
spectral intensity across radius. The v65 conditional profile challenge assumes
uniform **local emissivity**. These are different optical assumptions: a uniform
local emitter produces a chord brightness proportional to sqrt(R²-b²).

Technically, the modeled spectral centroid weights velocity by photon emission along a
chord, not by local density or volume. In plain terms, equally bright views do
not mean equally bright gas everywhere. This was an unresolved benchmark
assumption, not a demonstrated bug in the live solver.

Keep the same constant-viscosity core/annulus flow, geometry and eight corrected
reproduction markers at 0.17 T, 100 A, 3 Torr. Fit one amplitude to the same three
inner markers and hold out the same five outer markers. Compare the original
uniform-local-emissivity operator with an ideal exactly-flat projected brightness
operator. No velocity holdout determines the optical weighting.

The flat limit has epsilon(r)=C/sqrt(R²-r²) on the open disk. Its edge singularity
is integrable; changing chord coordinate to an angle integrates its photon
measure without clipping or sampling the wall. The tangent is unavailable.
This ideal is a **source-motivated sensitivity**, not a recovered emissivity,
a physical claim of infinite wall emission, or a bound on the actual profile.
It is preferable to tuning a radial emission function until the velocity fits:
only the observation hypothesis changes, with all calibration/holdouts frozen.

## Results

| Assumed optical weighting | Held-out RMS / observed peak | Worst individual held-out error | Every holdout ≤20% |
|---|---:|---:|---|
| Uniform local emissivity, retained comparator |39.9808%|62.6061%|Fail|
| Exactly flat projected brightness, ideal sensitivity |38.8526%|61.2509%|Fail|

Inference: this particular weighting change does not resolve the shape mismatch.
It does not identify a unique missing force, viscosity law, secondary flow or
electrical boundary condition. Both operators use spectral centroids; the actual
Fabry–Perot estimator remains unmatched. No current-to-speed, heat-flow,
enrichment, throughput or Marathon performance qualification follows.

Every prediction, residual, fitted amplitude and 32/128/512/2048-point grid is in
[the report](../scientific/diagnostic-v72/accepted/report.json). Independent
SciPy 1.17.1 QUADPACK integration and a closed-form flat-brightness centroid
agree with the final result. The largest final projection error is 1.431e-8 of
the observed peak, below the frozen 1e-6 gate; numerical integration therefore
cannot account for the roughly 39% conditional experimental residual.
Extraction/reproducibility uncertainty was not rerun; the v65/v70 caveats remain.
Neither conditional comparison has an uncertainty-qualified pass.

## Source admission and next comparison

Two independent reviewers examined the 1979 candidate experiment and the 1980
measurement conventions. The 1979 brightness is un-Abel-transformed, interior
temperature is interpolated, and some density/Hall estimates reuse assumed
pressure or measured voltage. Treating these as independent local measurements
would create circular validation. The large 1979 PDF was not recovered as local
verified bytes; indexed text and captions are not admitted digitized figures.
Its 1-Torr inputs cannot replace the separate 1980 3-Torr case.

The next matched comparison needs measured brightness with its edge/background
uncertainty and the actual spectral estimator, then independently constrained
temperature and electrode/current boundaries. Axial momentum transport is a
candidate extension, not an identified cure. Adding fitted radial functions
would hide this uncertainty rather than validate the apparatus.

[Source review](reviews/v72-source-admission.md) ·
[Independent protocol review](reviews/v72-protocol.md) ·
[Existing field-scaling and uncertainty results](FIRST-ORDER-ACCURACY-V70.md)

## Reproduction and verification

All execution used copied source in Apple safe-dev, Python 3.11.2 and SciPy
1.17.1 with NumPy 2.4.6. The accepted 1,559-file input archive SHA256 is
`39fce6ac8e441f72280bc2948c230e2f86be64c6c89157b7deb33bd4f678f764`.
The report binds each study script, test, protocol and unchanged marker file;
exported hashes were checked against the original checkout. Subsequent edits
only add this writeup, its review and the README link.

```sh
python -m unittest discover -s scientific/diagnostic-v72 -p 'test_*.py' -v
python -m unittest discover -s scientific/diagnostic-v71 -p 'test_*.py' -v
python scientific/diagnostic-v72/run_report.py scientific/experimental-v64/data/markers-corrected.json /tmp/v72-report.json
python scientific/diagnostic-v72/independent_check.py scientific/experimental-v64/data/markers-corrected.json /tmp/v72-report.json
npm run typecheck
npm run build
npm run check:site
npm run check:assets
```

Results: **7 new tests and 11 adjacent diagnostic tests pass**; independent report
reconstruction, typecheck, build, site and asset checks pass. Existing build
chunk-size warning remains. No deployed-browser or GPU verification is claimed.
The complete application test suite was not rerun for this research-only change.

The first final runner exposed a relative-path bug after both test suites passed:
source-hash serialization mixed a relative marker path with an absolute project
root. Resolving the CLI input once fixes that representation mismatch; a
regression now proves relative and absolute invocations produce identical
reports. This preserves strict hash binding instead of adding path fallbacks.
The failed log, original runner/test and source hashes remain under
[failed](../scientific/diagnostic-v72/failed). No physical tolerance changed.
