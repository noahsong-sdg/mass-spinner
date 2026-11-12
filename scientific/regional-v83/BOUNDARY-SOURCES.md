# Boundary-source investigation

12 November 2026. Independent, bounded primary-source search. No velocities,
conductivities, geometry or voltage offsets were fitted. This reviewer executed
no scientific code, PDF parser, downloader or shared VM command.

## Decision

**No new experimentally justified electrode boundary or corrected-voltage
operator was recovered.** Retain the V82 boundary uncertainty. A prescribed-current
reproduction of the original theory is defensible as a separate mathematical
benchmark; it does not establish the physical cathode footprint or an absolute
experimental port voltage.

## Evidence checked

| Source | Verified in this pass | Unavailable / not established |
|---|---|---|
| [Wijnakker, Granneman and Kistemaker (1979)](https://doi.org/10.1515/zna-1979-0602) | Publisher-indexed apparatus text independently confirms 48 cm cathode separation, 12 cm central diameter, floating steel rings, hollow tantalum cathode **inner** radius 4 mm and 100 A per source. The existing V82 geometry/voltage audits were read in full. | An aperture radius is not a measured plasma-current footprint. The existing audits find no outer cathode dimensions, emitting length, resolved taper, local transport map or explicit finite-contact voltage estimator. This pass does not add a new full-PDF inspection of that paper. |
| [Wijnakker dissertation, AMOLF record 1473](https://ir.amolf.nl/pub/1473) | Institutional record confirms *Centrifugal effects in a weakly ionized rotating gas*, University of Amsterdam, 3 September 1980, promoter J. Kistemaker. The complete record exposes metadata but no thesis download. | Thesis full text was not recovered. Its existence is not evidence that a missing boundary specification has been found. |
| [Wijnakker and Granneman (1980), publisher record](https://www.degruyterbrill.com/document/doi/10.1515/zna-1980-0815/html), [AMOLF record 2706](https://ir.amolf.nl/pub/2706), and [publisher-provided full text rehosted on ResearchGate](https://www.researchgate.net/publication/253120741_Limitations_on_Mass_Separation_by_the_Weakly_Ionized_Plasma_Centrifuge) | Rehosted OCR body inspected from title through references, pp. 883–893, including apparatus §2.1 and theory §4. It specifies **tungsten cathodes, diameter 1.5 cm**, and calls the 1979 device similar. | No measured current-footprint distribution, axial transport map or corrected-voltage extraction operator was found in that body. Publisher direct PDF remained inaccessible; OCR equations/figures were not visually verified. |
| [1979 conference report](https://doi.org/10.1051/jphyscol:19797236), *A study of a weakly ionized, rotating plasma* | AMOLF's 1979 index independently lists the report, authors and pages 487–488. | Publisher access returned 403; full text was not inspected. DOI discovery alone supplies no additional boundary data. |
| [Boeschoten, Komen and Sens (1979), positive-column study, Part I](https://doi.org/10.1515/zna-1979-0815) | Publisher metadata confirms a related Eindhoven hollow-cathode study, pages 1009–1021. | Its full text was not inspected. A related discharge cannot supply Wijnakker-specific dimensions or voltage offsets without demonstrated apparatus equivalence. |

## New follow-up evidence

The 1980 cathode specification must not be silently transferred into the 1979
hollow-tantalum apparatus or equated with a conducting plasma-contact disk.
Its heating estimates reuse earlier transport assumptions rather than measuring
an axial conductivity field. Its velocity-scaling comparison is normalized to
an argon measurement; it is not an independent absolute-amplitude validation.
The paper also explicitly reports uncorrected lateral optical measurements.
Those data require their own observation operator and apparatus manifest.

## Interpretation and next admissible step

The original theory prescribes current at an ideal ring; the present solver uses
a finite equipotential disk. Converting one to the other requires a finite
current/emission geometry and a definition of which near-electrode drops were
removed from the reported corrected voltage. These remain independent inputs,
not numerical tuning parameters.

**Inference:** near-cathode transport or the voltage operator could explain part
of the absolute-current mismatch. Neither is identified uniquely by the
available central-plane measurements. Changing contact radius, deleting a
chosen voltage-drop layer, or introducing a conductivity enhancement until the
current reaches 100 A would fit missing inputs.

The next source-dependent step is obtaining the dissertation and looking
explicitly for dimensioned cathode drawings, electrode-fall
extraction/raw V–I data, and axial transport measurements. The present search
failure is **not proof that those data do not exist**. Meanwhile, use fixed-input
contact benchmarks and fixed physical regional budgets to diagnose the current
implementation, preserving experimental qualification as false.
