# v72 independent experimental protocol review

10 November 2026. Review scope: v70 field evidence, v71 optical operator and
protocol, v65 core/annulus momentum reference, and primary experimental sources.
No project code was executed by this reviewer. No production change or
experimental qualification is established here.

## Finding and recommended next gate

Use a separately admitted **1979 diffuse argon case: 1 Torr filling pressure,
0.13 T, 100 A**, not temperatures borrowed from that case for the separate 1980
3-Torr comparison. Freeze the measured observable and input provenance before
running a solver. A conditional profile challenge is worthwhile; a fully
predictive spatial heat/flow validation is not yet supported by the recovered
inputs.

The root cause of the remaining comparison ambiguity is an inverse problem:
local temperature, current and velocity fields are not the same objects as
projected optical measurements. In plain terms, matching the light does not
uniquely recover the gas. Adding adjustable radial functions would make a fit
easier without identifying the missing physics.

## Primary-source facts checked

[Wijnakker et al. (1979), DOI 10.1515/zna-1979-0602](https://www.degruyterbrill.com/document/doi/10.1515/zna-1979-0602/pdf?licenseType=open-access),
publisher-indexed pages 673, 679–681:

- Geometry: 12-cm midplane diameter, 14-cm anode separation, two opposed sources;
  the source current definition must be preserved. Filling pressure is maintained
  behind the hollow cathodes, not measured as a uniform local hot-gas pressure.
- Fig. 6 spectral intensities have **not been Abel transformed**. They are
  brightness along sight lines, not local radial emissivity.
- Fig. 7 central temperature comes from ion-line Doppler width; near-wall values
  come from a corrected thermocouple. The interior curve is interpolated.
- Section 4.5 describes line-of-sight velocity bias, citing approximately 20%
  maximum error. Different species have different peak locations. The authors
  identify contracted-mode slip and discuss possible axial viscous driving of
  diffuse-mode neutrals.

These facts were recovered through the publisher's indexed full-text results;
the 16-MB PDF exceeded the web parser limit. Final numerical admission should
retain a visually checked page/table extraction and its hash rather than rely
on search-result OCR.

[Hood-McFadden et al., arXiv:2607.28208v2](https://arxiv.org/pdf/2607.28208v2),
sections 4.1–4.1.3, explicitly frames comparisons as scaling tests. Its 14-cm
effective discharge length and one-dimensional current distribution are
approximations; outward-skewed velocity shapes remain unresolved. Its new
low-force experiments offer pressure/composition limits, not strong-separation
validation. The PDF and arXiv abstract page did not expose a specific data/code
deposit in the scoped checks. This is not evidence that none exists. Generic
arXivLabs code-search links are not a released supplement.

## Admission checks before any numerical claim

1. **Case identity:** source/version/hash, figure or table, gas composition,
   discharge mode, field, current definition, filling-pressure location,
   geometry, axial station, spectral line, and chord convention. Different
   pressure, mode or source years require distinct case records.
2. **Quantity identity:** classify every datum as measured local, measured
   projected, interpolated, inferred from another measurement, or assumed.
   A thermocouple reading, central optical width and interpolated interior curve
   cannot all be scored as independent local temperatures.
3. **Diagnostic identity:** centroid, fitted peak shift, fitted Gaussian width,
   HWHM and second moment are different estimators. The v71 moment operator is
   not automatically the historical Fabry–Perot reduction. If that estimator
   cannot be reconstructed or bounded, label the comparison conditional.
4. **Input/holdout separation:** no speed holdout may determine viscosity,
   effective discharge length, emissivity, heat-source shape or current path.
   A calibrated amplitude tests held-out shape only. It does not validate
   electromagnetic drive, heating, or throughput.
5. **Domain checks:** all spatial property calls must remain inside the source
   table range, including uncertainty scenarios. Missing line emission is an
   unavailable measurement, not zero temperature or zero speed.
6. **Uncertainty identity:** extraction ranges, source error bars, common
   calibration factors and independent coordinate sensitivity have separate
   semantics. Unknown covariance stays unknown; finite sensitivity extrema
   are not confidence intervals.

These are real scientific admission boundaries. A metadata checker can enforce
their presence and consistency but cannot certify that a paper supports their
values. Source review remains necessary.

## Minimum constrained profile comparison

Keep one frozen neutral-Ar momentum closure, sourced viscosity, independently
specified current/electrode geometry and no fitted radial forcing function.
Use same-condition temperature constraints as input intervals. An interpolation
family between measured constraints is a declared sensitivity, not a measured
temperature field; matching it does not validate the heat equation.

Before passing Fig. 6 to v71, reconstruct a nonnegative emissivity consistent
with the measured brightness and its errors. Direct substitution of brightness
as emissivity would project the signal twice. Abel inversion or an equivalent
forward-matrix constrained fit needs its own background, finite-window,
symmetry, regularization and edge uncertainties. Do not choose that inversion
using velocity holdouts. Keep ion and neutral transitions separate.

Then project the computed flow through the admitted diagnostic, compare every
resolved velocity holdout with its own observed scale, and retain any absolute
drive residual separately from a calibrated shape residual. Keep the v70 target
of at most 20% nominal error per resolved signal, correct trends, and numerical
and extraction contributions each below 5%; these are project criteria, not a
published universal standard. A pass must state exactly which supplied inputs
it is conditional on. Unbounded nuisance inputs mean unqualified, not pass.

The one-dimensional model's missing axial momentum transport cannot be fixed
merely by selecting a more favorable viscosity. Resolving that mechanism is a
separate model extension requiring independently constrained boundaries.

## A real negative experiment when prediction remains underdetermined

A useful immediate gate is **shared peak-observable proxy compatibility**:
can one predicted scalar peak represent both published ion and neutral peak
measurements in each admitted discharge mode? Use source-verified values and
error bars, then a separately declared sensitivity to the cited LOS bias.
Report overlap or disjointness; do not fit a coupling constant to force overlap.
This compares an existing reduced model assumption with real measurements.

It does **not** by itself falsify all common-fluid profiles. Different line
emissivities can give different apparent maxima for the same angular-velocity
field, as follows directly from v71's photon weights. A local common-fluid
rejection needs matched co-spatial observations and their observation operators,
or a defensible bound showing that no allowed common field reproduces them.
The historical authors' physical slip interpretation is relevant evidence,
but does not remove the simulator's diagnostic obligation.

Another legitimate negative benchmark is the admitted radial pressure
enhancement against a fixed closure. It tests that closure under declared
temperature/current assumptions; it cannot identify secondary flow, Hall force,
probe disturbance or thermal structure uniquely. Keep the original experimental
failure visible instead of replacing it with a synthetic conservation pass.

## Review disposition

Proceed with source admission and a named reduced-observable regime test now.
Proceed with the conditional diffuse-profile challenge only after estimator and
emissivity admission. Do not claim first-order device fidelity, experimental
thermal validation, isotope throughput or a Marathon operating point from these
checks. No scientific code or tests were added by this review, so there is no
new execution snapshot or numerical result to report.
