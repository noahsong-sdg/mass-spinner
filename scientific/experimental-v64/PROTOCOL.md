# Experimental benchmark v64: frozen comparison contract

Frozen before executing comparisons, 2026-11-10. This campaign does not change
production coefficients or declare the complete centrifuge experimentally valid.

Target for a future admitted, held-out scalar: relative error <=20% of its
measured signal, correct trend, numerical and digitization errors each <5% of
that signal. Separation uses log(alpha), not alpha's baseline of one. This is
a prospective playground target, not an established measurement standard.

Current comparisons:

1. **Rigid-profile structural challenge.** Digitize experimental velocity
   markers, not fitted curves, in Fig.10A of Hood-McFadden et al., arXiv
   2607.28208v2, reproducing Wijnakker's Ar measurements. Fit one angular speed
   using only inner markers r<=3 cm. Hold out every usable marker r>3 cm.
   Score held-out RMS error / observed profile peak, and individual residuals.
   Retain a common +/-15% reproducibility sensitivity, separately from pixel
   extraction ranges; its confidence meaning is not specified. Original
   spectroscopic velocities are line-of-sight measurements, not deprojected
   bulk velocities. Rigid rotation predicts Doppler chord speed Omega*x even
   before deprojection, so profile curvature is a useful structural challenge.
   This is not an independent-current prediction or device-accuracy certificate.
   Non-rigid alternatives require an emissivity-weighted diagnostic forward
   model; no unprojected local velocity curve is scored against chord data.

2. **Pressure-scaling structural challenge.** Original Wijnakker1980 pp.886-887:
   fixed100 A, .21 T, Ar filling pressure3->9 Torr reduces peak speed by1.5,
   nearly constant measured temperature. Compare analytic-reference production
   rotorResponse with all rates fixed and inertia proportional to p/T. Normalize
   at3 Torr; leave9 Torr held out. Unknown mean/filling-pressure mapping and
   discharge structure prevent a matched forward experimental claim. Report
   the temperature or effective drag ratio needed to reconcile the trend as
   an inverse diagnostic, never as a validation result.

3. **Conditional separation uncertainty.** Evaluate the unchanged production
   radialPDF at the actual two sampling radii, compare with an independently
   integrated centrifugal potential, and propagate bounded measured-speed and
   temperature inputs. This is a numerical/uncertainty check, not experimental
   separation validation without independent matched density measurements.
   Report any missing temperature/flow profile as unavailable, never substitute
   playground defaults. Missing uncertainty is not zero uncertainty.

4. **Magnetic-scaling structural challenge.** Fig.11 red velocity/temperature
   markers at .13,.17,.21,.255 T. Normalize at .17 T; hold out the other three.
   Test production fixed-rate response with inventory proportional to1/Tmax,
   at fixed filling pressure. Tmax is a diagnostic maximum, not a measured
   volume-mean temperature, so retain this proxy explicitly. Do not silently
   substitute Tmax for a solved spatial energy field. This challenges the
   assumption set; it is not a matched apparatus prediction.

Do not fit each held-out point separately. Do not interpret a deterministic
input envelope as a confidence interval. Shared systematic errors do not shrink
with the number of digitized markers. Keep signal error, source uncertainty,
input sensitivity, numerical error and model discrepancy separate. Include
failing and unavailable cases in the machine-readable results.

Independent review must reconstruct conversions and metrics without importing
the comparison implementation, inspect source images/definitions, and inspect
actual execution receipts. Production defaults remain unchanged until a
separately reviewed closure clears appropriate held-out gates.
