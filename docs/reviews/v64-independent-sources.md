# v64 independent experimental-source review

Checked 2026-11-10. Literature research only; no simulator execution or guest changes. The source table records published prose values; the separate image review below records approximate visual readings.

## Best newly located source

[Hood-McFadden, Kotla and Underwood, arXiv:2607.28208v2](https://arxiv.org/pdf/2607.28208), *Electromagnetically Driven Thermal Dissipation Scaling in Plasma Centrifuges for Mass Separation*. UT Austin, August 2026 revision; preprint. PDF text checked. The web screenshot service failed; subsequently inspected the parent's rendered `scientific/experimental-v64/sources/hood2026-page-17.png` with `view_image`. No automated pixel extraction was executed by this reviewer.

| Experimental observable | Inputs | Value | PDF provenance |
|---|---|---|---|
| Wijnakker maximum Doppler velocity | Ar; 100 A; 3 Torr; .17 T | 950 ±135 m/s | Fig. 10, pp. 16–17; §4.1.1 |
| Wijnakker maximum Doppler velocity | Ar; 100 A; 1 Torr; .13 T | 700 ±105 m/s | Same |
| Wijnakker maximum-based λh | 3 Torr; 100 A; B=.13,.17,.21,.26 T | .21±.05, .21±.07, .27±.09, .34±.11 | Fig. 11; §4.1.1 |
| Kaneko radial pressure ratio | Ar; .5 Torr; .5 A; .57 T | ≈1.19 | Fig. 12; §4.1.2 |
| Compact capillary pressure ratio | Ar; electrodes 2.5/10 mm; samples ≈5/8 mm; B≈.15 T | ≈1 within uncertainty | Fig. 13; §4.1.3 |
| Enlarged thermocouple temperatures | Ar; 2.5 Torr; 25 mA; .15 T | inner/outer ≈340/300 K | Fig. 14; §4.1.3 |

Figures 10–11 cite 15% reproducibility. Fig. 14 error bars are steady-state standard deviations. Effective lengths 14 cm (Wijnakker) and ≈5 cm (Kaneko) are modeling assumptions. Thermocouples measure boundaries. Fig. 15 Ar/Kr separation is qualitative; 75 m/s is fitted, not measured. Optical ≈2 km/s spokes are phase velocity. Simulated isotope α≈1.33 is not experimental.

No data/code repository located: PDF text searches for “Data Availability,” “github,” “repository” and “available” returned no matches. This establishes search scope, not absence of unpublished data.

## Independent page-17 image review

Fig. 10A: filled purple circles are 3 Torr/.17 T/100 A; purple squares are 1 Torr/.13 T/100 A. The low purple circle near r/R2≈.32,V≈150 m/s is a legend symbol and must be excluded. Axes are r/R2 (0–1) and |Vθ| (0–1500 m/s). Coarse manual circle readings (r/R2,Vθ m/s), with estimated reading tolerances ±.01 and ±30–50 m/s:

`(.167,330), (.333,560), (.500,790), (.583,875), (.667,890), (.750,835), (.833,790), (.917,470)`

These approximate readings require checking against the parent's pixel extraction; the visible peak appears below the prose's ≈950 m/s. Preserve both provenance paths rather than replacing the figure with the prose maximum.

Fig. 11: hollow red squares are measurements; black curves are predictions. Visual Vθ readings at B≈`.130,.150,.170,.190,.210,.230,.255 T` are approximately `760,820,930,1070,1130,1230,1350 m/s`. Temperature has four markers only: B≈`.130,.170,.210,.255 T`, T≈`8500,9500,11400,13000 K`. Allow approximately ±30 m/s, ±300 K and ±.001 T for these coarse manual readings, separately from experimental reproducibility. The final B marker is visibly near .255 T, although the prose rounds it to .26 T.

**Source inconsistency requiring explicit treatment:** the first Fig. 11 λh marker appears near .16, whereas the prose lists .21. The independent diagnostic calculation mAr Vθ²/(2kB T), using the visually read 760 m/s and 8500 K, gives approximately .163 and supports the marker. Subsequent visible λh values are ≈.215,.265,.335. Derive λh from separately extracted V,T, carry their uncertainty/correlation assumptions, and flag the prose discrepancy. Do not use both as independent observations.

## Independent page-20 image review

Inspected `hood2026-page-20.png`. Fig. 13B ratio direction is **inner/outer**, p(r1)/p(r2). Markers span Jmax B≈2–30 AT/m² and ratio≈.997–1.008, all consistent with one within displayed bars (some about ±.02). These are coarse visual bounds, not a digitized dataset. The forcing-axis break separates measured low forcing from unmeasured model extrapolation.

Fig. 14A time is **minutes**, extending to 70 min, not seconds. Its terminal thermocouple readings are approximately inner342 K/outer301 K. Fig. 14B's black model underpredicts measured wall ΔT. Do not mistake imposed measured outer-wall temperature in that model's boundary-condition annotation for a prediction of the whole cooling assembly.

## Independent extracted-data audit

Read `scientific/experimental-v64/extract_source.py` and `data/markers.json` without executing them. Counts are eight Fig. 10 circles, seven Fig. 11 velocity squares, four temperature squares and four λ squares. Vector centers/converted profile values agree with this reviewer's coarse image reading. Color/path/size/y-region filters exclude the Fig. 10 legend circle; the square selector separates square outlines from error-bar cap segments. JSON appropriately distinguishes the .5-PDF-point extraction envelope from 15% experimental reproducibility and unknown reproduction error.

The affine mappings have correct orientation: r/R2 increases to the right; speed/temperature/λ increase upwards; field spans .10–.26 T. R2=6 cm is shown in the inset. The initial frame-based temperature calibration was flagged here and subsequently confirmed incorrect; see closeout below. Other frame-based mappings are algebraically consistent with their supplied maxima.

No independent rerun was performed. Extracted coordinates, extraction logic, and observed figure markers were reviewed; source hash, full vector-path contents and simulation residuals were not recomputed by this reviewer.

## Corrected-source closeout

Read `data/markers-corrected.json`, `axis_calibration.py`, and `test_axis.py`; inspected the final `scientific/centrifuge-v44/experimental64/studies/final-qualified/benchmarks.png`.

**Fixed calibration error:** the temperature frame's top is ≈15500 K, whereas the initial extraction identified it with the highest labeled tick, 15000 K. Technically this compressed the affine scale and underestimated temperatures by approximately 3.2%. In plain terms, the graph has empty headroom above its highest tick. The corrected extractor uses actual PDF tick coordinates `(495.8789978,15000)`, `(521.5352173,7500)`, `(547.1914673,0)` and checks their linear consistency. Adjacent coordinate intervals agree to ≈.00003 PDF point. This uses the source's measured axis rather than guessing or hardcoding its frame headroom. Regression source explicitly exercises the formerly incorrect frame assumption; parent owns execution evidence.

Corrected temperatures `8379,9377,11261,12867 K` match this reviewer's independent visual readings. They supersede both initial extraction and coarse manual estimates. Eight/four/seven marker identities and original coordinates remain unchanged. The corrected archive retains calibration ticks and original PDF hash.

Final plot appropriately describes conditioned structural comparisons, excludes Marathon device validation, and distinguishes input sensitivity from a confidence interval. Its pressure/magnetic panels use “Peak speed”; “Peak apparent speed” would more clearly maintain the Doppler diagnostic qualification already present in its profile panel. The pressure trend's original-source extraction was assigned to another reviewer and was not independently checked here.

**Qualification boundary:** these are non-Marathon public experiments, with historical markers extracted from a secondary reproduction. The 15% reproducibility is not a stated confidence interval; covariance, original reproduction accuracy and several operating inputs remain uncertain. Correct source extraction does not establish predictive physical agreement. This reviewer has not independently executed the corrected extraction, tests or simulator studies.

## Independent assessment and comparison rules

1. **Best first target: radial pressure negative control**, provided the actual Fig. 13 markers and uncertainty can be extracted. Compare the same capillary radii and ratio direction. A prediction of a large gradient fails even if the sign of enrichment looks plausible.
2. **Best velocity target: original Wijnakker profiles.** This preprint is a useful locator, but obtain the original diagnostic line/species, geometry, temperature and reproducibility definition before treating neutral bulk velocity as measured. Peak velocity differs from wall velocity, rigid-rotor equivalent speed and mass-weighted average speed. Do not silently identify them.
3. **Thermal comparison remains conditional.** A simulated gas-cell temperature cannot be scored against a solid thermocouple reading without a sensor/material/thermal-contact observation model. Matching ΔT by prescribing those boundary temperatures is a boundary-condition test, not thermal validation.
4. **Composition data cannot calibrate and validate the drive simultaneously.** Inferring rotation from enrichment and then reporting enrichment agreement is circular. Hold out measured quantities; retain uncertain effective discharge length and transport coefficients as nuisance parameters, not tuning knobs hidden from the report.
5. **Current capability gap:** the checked production pair list contains Li, hydrogen and helium combinations, not Ar/Kr. A material-aware experimental fixture is necessary before a matched run. Altering only masses would leave momentum/thermal properties unmatched.
6. Report numerical convergence, experimental agreement and applicability separately. No source inspected here validates the full Marathon machine, neutral drag coefficient, transient separation time or live lithium default.

## Other sources and non-benchmarks

- [Kaneko, Sasaki and Kawashima (1978), DOI 10.1088/0032-1028/20/11/007](https://doi.org/10.1088/0032-1028/20/11/007): original weak-ionization He/Ar separation lead; parent assigned another reviewer to retrieve full text. Do not combine its mixture experiment with its pure-Ar pressure experiment.
- [Muir et al. (2025), DOI 10.1063/5.0285228](https://doi.org/10.1063/5.0285228): theoretical steady-state hydrogen model; not a substitute for experimental velocity/compression validation. Publisher full text was unavailable through the web tool in this pass.
- Fully ionized vacuum-arc isotope measurements can test a separately matched ion-only model; they cannot establish accuracy of ion-driven neutral rotation.

Suggested acceptance artifact: a versioned table of measured observable, exact diagnostic operator, source coordinates, digitization error, reported uncertainty semantics, missing inputs, fixed nuisance priors, predicted interval, residual and applicability status. No fabricated error bars or machine-wide accuracy percentage.
