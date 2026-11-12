# Corrected voltage: independent source check

12 November 2026. Source review only. No scientific execution, downloads,
parameter selection from residuals, or changes to the parent-owned VM.

## Result

No newly documented finite-contact voltage operator was recovered. The existing
18.5 V port identification remains an assumption to test, not a transcription
error that can be corrected uniquely from the recovered record.

## Direct evidence

The [1979 article](https://doi.org/10.1515/zna-1979-0602), reopened through its
[publisher-supplied complete OCR rehost](https://www.researchgate.net/publication/276453995_A_Study_of_a_Weakly_Ionized_Rotating_Plasma),
states:

- Table 1: diffuse-mode terminal voltage 58.0±0.5 V; corrected voltage
  18.5±2.0 V. Its footnote distinguishes inclusion/removal of electrode falls.
- §4.5: the correction uses an arc voltage/current plot at fixed magnetic field.
  No raw V–I series or extraction formula is supplied there. The published
  effective Hall parameters 3 and 9 are inferred using the electrical data.
- §4.6: measured and theoretical midplane potential curves are aligned 1 cm
  inward from the wall; the wall floats. This is not an absolute electrode
  potential measurement.
- §3 and Appendix A.4–A.5 prescribe ideal current rings. They do not define a
  finite equipotential contact or a current-weighted finite-contact estimator.

The [1980 follow-up](https://doi.org/10.1515/zna-1980-0815), inspected through
its [complete primary-article OCR rehost](https://www.researchgate.net/publication/253120741_Limitations_on_Mass_Separation_by_the_Weakly_Ionized_Plasma_Centrifuge),
specifies different cathodes (§2.1), but supplies no corresponding raw V–I
correction or measured cathode footprint in the recovered body.

The complete [1979 conference report](https://doi.org/10.1051/jphyscol:19797236)
was subsequently found in the retained local source archive. Visually inspected
p. C7-488 explicitly uses corrected 18±2 V together with viscosity, current,
field and conductivity to infer the Hall parameter. It supplies no correction
estimator or current footprint. This rounded voltage does not justify replacing
the detailed journal's 18.5±2.0 V input or choosing whichever improves agreement.

## What follows mathematically

For the implemented steady model, define branch current I with a consistent
electrode orientation. The work-conjugate port voltage is

`Vport = −∫boundary φ J·n dA / I = (QJoule + Wrotor)/I`.

This is gauge invariant if the branch conserves charge. It reduces to the
potential difference for equipotential electrodes. An unweighted spatial
average, a local centerline potential, and a regional Joule/current budget are
different observables. None becomes the historical corrected voltage solely
because its numerical value is closer to 18.5 V.

An ideal zero-width current ring also does not define a resolution-independent
finite contact voltage. Locally, a line injection into a conducting medium has
`|J| ∝ 1/s`; its Ohmic energy contains `∫ ds/s`, requiring a finite-width or
other physical cutoff. This is a mathematical inference, not an observed
electrode-fall model. Off-contact fields can converge while contact voltage
remains cutoff dependent. A grid-cell-width ring must not conceal that dependence.

## Admissible implementation

1. Retain terminal, corrected, and modeled port voltages as distinct quantities.
   Do not replace the bulk drive with 58 V or delete a layer chosen from residuals.
2. Reconstruct the signed current-weighted boundary observable and verify its
   global work identity. Keep any interior-cut budget explicitly separate.
3. A source-ring Neumann calculation is a useful declared boundary-model
   challenge. If current is prescribed from the experiment, label current as an
   input and voltage/velocity as outputs; current agreement is then tautological.
   State finite-width regularization explicitly and refine it independently of
   the mesh. Do not call it an identified experimental contact.
4. Do not use the published electrically inferred Hall parameters as a newly
   independent constitutive correction. A faithful reproduction can retain
   them with calibration provenance, separately from source-collision predictions.

These changes improve the question being tested. They do not supply the missing
footprint, axial transport, or the original V–I subtraction protocol. No change
of radius, conductivity, Hall parameter or voltage offset is justified by this
source pass alone.

## Access limits and evidence trail

The 1979 rehost was read at the apparatus/diagnostic sections, Table 1, §4.5–4.6
and complete Appendix; the 1980 rehost was inspected at apparatus, diagnostics,
results and theory. The parent subsequently rendered the retained real PDF
`scientific/optical-v80/sources/journal.pdf` inside safe-dev. This reviewer viewed
the exported images of printed pages 677, 678, 682 and 687–690: Eq. 11's current
boundary, Table 1's correction footnote, §4.5's electrical inference and Appendix
field solution are visually confirmed. No finite-contact voltage estimator is
specified in these inspected passages. The §4.6 alignment and 1980 article were
checked through OCR; their figures/equations were not newly visually verified.
The publisher's 1979 PDF web fetch exceeded the tool's 16.45 MB response limit.
The [AMOLF thesis index](https://ir.amolf.nl/year/2025?prev=50) exposes Wijnakker's
1980 dissertation metadata, but direct [record access](https://ir.amolf.nl/pub/1473)
and ADS full-text routes failed in this pass. No full thesis was recovered;
that is an access limitation, not evidence that details do not exist.

New web retrieval of the conference DOI and direct publisher PDF also failed,
but that did not exhaust the retained sources. The parent identified the valid
`scientific/profile-v79/sources/hal-conference.pdf`, HAL record `jpa-00219219v1`,
and extracted/rendered it inside safe-dev. This reviewer visually inspected both
complete article pages C7-487–488, exported as
`source-review/conference-page-1.png` and `conference-page-2.png`. The first page
gives approximate vessel dimensions and wall-ring construction; neither page
specifies a finite cathode emission width or fall-subtraction estimator.
