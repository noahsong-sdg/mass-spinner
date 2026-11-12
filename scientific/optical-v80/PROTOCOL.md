# Optical follow-up, without rotation refitting

11 November 2026. Freeze before extracting journal Fig. 6 brightness coordinates.
The V79 velocity targets are already known. This is a diagnostic follow-up on
development data, not a new unseen experiment. Keep the complete V79 prediction
packet byte-identical (SHA256 1a1e7e54974ed7e7e28be655e911b17d3cdd7bc55107b34474148702858ef128).
No new current, viscosity, velocity, conductivity, Hall parameter or geometry fit.

## Independent diagnostic inputs

Use only neutral 4702 Å brightness symbols in journal Fig. 6a at 0.13 T,
100 A per source, 1 Torr fill. Independently inspect axes and distinguish them
from ion-line symbols. Retain original PDF and crop hashes, extraction ranges,
all symbols and exclusions. Do not infer brightness coordinates from indexed
text, prose descriptions or measured velocities. Use relative photon brightness;
absolute calibration cancels from normalized centroids/spectra.

The velocity diagnostic's neutral line is not explicitly identified. All
4702 Å conditioning is conditional on the same line and optically thin,
axisymmetric emission. No opacity correction is supported without populations
of the excited lower level. No measured instrument profile, finesse, free
spectral range, aperture or spectral reduction rule has been recovered.

## Frozen operators and sensitivities

- Invert line-integrated brightness with existing PyAbel 0.9.1 Daun, degree 0,
  nonnegative least squares. No velocity-based smoothing or regularizer choice.
  Interpolate admitted brightness linearly between measured samples. If the
  axis is unsampled, use constant continuation to zero impact and label it.
- Compare BOTH outer continuations beyond the last brightness point to R=6 cm:
  linear to zero, and square-root chord-length taper matched at that point.
  Neither continuation may be selected from velocity agreement.
- Optical meshes: 64, 128, 256 samples including axis; annular outer edge exactly
  R. Evaluate the frozen piecewise-constant angular speed on intersected annuli.
  Reproject reconstructed emissivity against the original brightness samples.
- Also bound centroids over ALL nonnegative emissivities satisfying the original
  independently extracted brightness intervals, using SciPy/HiGHS linear
  programming. Infeasibility remains a failure; never widen intervals until
  velocities fit. No edge continuation is imposed on this feasible-envelope test.
- Generate isolated-line Maxwellian Doppler spectra using the bin-integrated
  Gaussian algorithm documented by CHERAB, via SciPy normal CDF differences.
  Report analytic centroid and spectral mode separately. This adapts the
  documented algorithm; it does not claim execution of CHERAB/Raysect.
- The source's temperatures are apparent ion-line widths / corrected probe
  estimates, not measured local neutral T(r). Use explicit sensitivity values
  1400, 1800, 2900, 5950, 7250 K, plus a linear 5950→1800 K profile between
  0 and 5 cm continued constant to the wall. None is a calibrated neutral map.
  No added instrument broadening in the nominal calculation; separately test
  centered Gaussian broadening of 0, 500, 1000 m/s standard deviation as
  uncalibrated sensitivities. Never choose one to minimize velocity residuals.
- Spectral bins: 10, 5, 2.5 m/s across ±12000 m/s. Require final centroid/mode
  change <1% of each nonzero predicted signal, captured photon flux error <1e-8,
  and final optical-mesh centroid change <1%. Retain all coarse failures.
- Check positive Gaussian-mixture centroid/mode bounds independently for ANY
  nonnegative emissivity and positive thermal width; passing necessary bounds
  does not prove a common emissivity exists for every chord.

## Admission and scoring

Scoring is separate from prediction. The optical prediction entry point accepts
brightness and the sealed V79 packet, never measured rotation velocities.
Test target-velocity mutation leaves optical predictions byte-identical. Verify
rigid rotation, signed reversal, zero flow, brightness scaling, exact annular
projection, analytic flat-chord-brightness inversion, Gaussian thermal width,
flux/centroid/variance conservation, and independent hull limits.

Use the existing V79 five points, extraction masks and unchanged 20% per-signal
criterion. Report both β cases, all electrical-voltage alternatives, both edge
closures and every estimator; no best-variant pass. Keep experimental
qualification false if diagnostic identity, optical response, reconstruction
ambiguity or numerical gates remain unresolved. Publish the actual mismatch,
not a fitted optical correction.
