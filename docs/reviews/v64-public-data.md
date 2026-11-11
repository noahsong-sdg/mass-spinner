# v64 public experimental data: source and applicability review

Independent source review, 10 November 2026. No simulation execution or production edits by this reviewer. Parent owns VM execution and matched-model comparison. Checked the current two-rotor/radial-mixture execution description in `src/fuel-centrifuge.ts` and `docs/MARATHON-CENTRIFUGE-V44.md`.

## Recommendation

Use historical weakly ionized noble-gas experiments to challenge the model's applicability before fitting it. The strongest original source recovered here is Wijnakker et al. (1979): it distinguishes neutral and ion motion and reports both diagnostic uncertainty and radial structure. It is not a matched Marathon apparatus. A direct forward prediction of its current-to-speed response requires spatial current, momentum transport, gas properties and boundary conditions absent from our rigid-rotor reduction.

Do not claim first-order experimental accuracy of the live lithium centrifuge from these sources. At present the justified outcome is an evidence-ranked benchmark inventory, an explicit discrepancy test, and conditional comparisons. Absence of a matched benchmark is not evidence of failure or success.

## Ranked sources

| Priority | Primary source | Useful benchmark | Admission status |
|---|---|---|---|
| 1 | [Wijnakker, Granneman & Kistemaker, 1979, Z. Naturforsch. A34, 672–690](https://doi.org/10.1515/zna-1979-0602) | Separate ion/neutral speed, radial temperature, pressure and Ar/Xe composition | Primary publisher indexed text available; tabulated values below need PDF-image second check before a hard numerical gate. Spatial apparatus mismatch prevents a turnkey forward benchmark. |
| 2 | [Wijnakker & Granneman, 1980, A35, 883–893](https://doi.org/10.1515/zna-1980-0815) | Current/B/pressure trends; thermal limitation on centrifugal separation | Primary publisher abstract verified; full figures not independently extracted here. Same laboratory family as 1979, so not automatically an independent validation cohort. |
| 3 | [Kaneko, Sasaki & Kawashima, 1978, Plasma Physics20, 1167–1178](https://doi.org/10.1088/0032-1028/20/11/007) | He/Ar outer-electrode enrichment | Primary abstract verified, full original conditions not recovered here. Incomplete for a forward prediction. |
| 4 | [James & Simpson, 1976, Plasma Physics18, 289–300](https://doi.org/10.1088/0032-1028/18/4/004) | Time-resolved neon isotope separation | Lead only in this review; no admitted numerical data. |

Another reviewer owns the newer Ar/Ar-Kr experiment, arXiv2607.28208. Its assessment belongs in `v64-independent-sources.md`; do not count a contemporary reanalysis of the historical experiments as independent new historical data.

## 1979 original experiment: compact extraction

Source: [publisher PDF](https://www.degruyterbrill.com/document/doi/10.1515/zna-1979-0602/pdf?licenseType=open-access), pp673,678,681,686. Cylinder: radius6cm, cathode separation48cm, anode separation14cm; opposed sources, 100A each; 1Torr controlled behind cathodes. Diagnostics are in the central symmetry plane.

| Table1 quantity | Diffuse | Contracted |
|---|---:|---:|
| B (T) | .13 | .26 |
| Maximum ion speed (m/s) | 750±75 | 1850±75 |
| Maximum neutral speed (m/s) | 700±100 | 750±150 |
| Heavy-particle T, r=0 (K) | 5950±1300 | 9700±2500 |
| Heavy-particle T, r=5cm (K) | 1800±400 | 2750±500 |
| Corrected arc voltage (V) | 18.5±2 | 38±2 |

Speed diagnostics integrate emission along sightlines, potentially underestimating velocity by20%; error-bar confidence semantics remain unspecified. Diffuse neutral/ion maxima occur near3.5/2cm. Table1 neutral density is calculated assuming center pressure .4Torr, not independently measured. Ar/Xe separation2.15 compares wall versus2cm inward composition. Figure curves and local maxima are not bulk rotor measurements. These factual extractions summarize the original paper; no digitized profile dataset was created.

### Consequences for model comparison (our analysis)

- Do not set the model's global current to100A or200A without integrating the actual radial current and Lorentz torque. Cathode-to-ring current paths contain axial and radial portions; the current label does not establish uniform annular radial drive.
- Do not set `gasK` to the center temperature and call it the experimental volume temperature. The reported radial temperature variation is severalfold.
- A rigid rotor has `v(r)=Omega*r`, with its largest speed at the outer radius. An interior measured maximum challenges that closure; matching the maximum alone cannot validate the radial profile.
- Table1 ion and neutral maxima are generally at different radii. Subtracting their maxima is not a measured local slip. The same issue affects ratios of their maxima.
- Outside the center, the paper reports neutral velocity exceeding local ion velocity. Two global angular velocities cannot represent local slip changing sign. Spatial viscous/axial transport may matter; this is an applicability discrepancy, not necessarily a coding bug.
- Preserve the distinction between instrument/measurement uncertainty, line-of-sight systematic bias and model discrepancy. The20% estimate is not a Gaussian one-sigma error and should not be added in quadrature to the tabulated errors.
- Preserve pressure definition: filling pressure behind cathodes, local center static pressure and local radial pressure ratio are different observables. Do not use the center-pressure-derived neutral density as an independent second validation target.
- For composition compare `alpha=[nXe/nAr](r=.06)/[nXe/nAr](r=.04)`. This is not the outer annulus inventory purity, outlet product purity, wall/axis enrichment or a wall/feed comparison. Point sampling needs a matching diagnostic operator. The mixture's own T and speed must be obtained before a conditional separation calculation; pure-Ar Table1 values cannot silently stand in for mixture conditions.

Primary indexed Fig14 identifies the rotating mixture series as100A,.13T and the nonrotating reference as50A,0T. Its caption says samples beyond r=6cm come from wall insulation, not the rotating plasma. Recovered passages do not establish mixture temperature/velocity profiles, feed fraction or measurement uncertainty. Consequently even the conditional integral `ln(alpha)=integral[Delta_m*v(r)^2/(r*k*T(r)) dr]` over4–6cm cannot currently be compared quantitatively without explicit unvalidated assumptions. A pure-Ar profile proxy would be a sensitivity exercise, not a matched experimental validation.

### Retrieval and transcription limits

Publisher HTML establishes publication year1979; the2014 date is digital republication. The web tool could retrieve primary indexed PDF text, but direct PDF open returned405. No original PDF image was visually checked and no experimental markers were digitized. Primary indexed Table1 says38V, correcting a misleading secondary OCR reading of88V. Do not propagate the erroneous88V value.

## 1980 follow-up

The [publisher issue abstract](https://www.degruyterbrill.com/journal/key/zna/35/8/html) reports Ar/Xe discharges at1–10Torr, current100A and B≤.26T. Measured neutral-speed trends follow `v ~ I*B/mu`. Experimentally reported `X=(m*v_max^2/2)/(k*T_center)` did not exceed .4 for Ar or .2 for Xe within the studied region. The Ohmic-to-viscous heating estimate is at least6, not an independently measured universal constant.

The temperature in this definition is central while velocity is a radial maximum: this diagnostic ratio must not be described as a strictly local Mach number, a universal physical ceiling, or the live simulator's wall-speed separation exponent. The useful challenge is that increasing drive also heats the gas; externally fixed cold gas can greatly overstate separation. Obtain original figure points and uncertainties before assigning quantitative gates to these trends.

Original-paper text on pp886–887 is also publicly readable in the [author-uploaded full-text mirror](https://www.researchgate.net/publication/253120741_Limitations_on_Mass_Separation_by_the_Weakly_Ionized_Plasma_Centrifuge). It reports that at100A,.21T an Ar filling-pressure increase3→9Torr reduces maximum neutral velocity by factor1.5; temperature is nearly independent of filling pressure in Fig5b. The reported reproducibility is approximately15%; within-series error bars describe relative accuracy. Original PDF-image confirmation remains outstanding for this reviewer.

This is a useful **structural scaling challenge**: a model whose wall-loss torque is proportional to gas inertia at fixed drag rate predicts strong density dependence, while a viscous continuum closure can have much weaker density dependence at fixed temperature. But the experimental filling pressure is not volume-mean density, and current distribution, discharge geometry and local temperatures can change. Do not call this a quantitative transport-validation failure solely from setting `pressurePa` to the experimental filling pressure. Preserve a separate applicability/mapping status and numerical residual.

## Kaneko1978: incomplete but relevant constraint

The [IOP primary abstract](https://doi.org/10.1088/0032-1028/20/11/007) reports an outer-electrode Ar/He ratio1.55 times its pre-rotation value at .75T and total current1A; the result is reported insensitive to filling pressure .6–20Torr. It concerns element separation, not measured uranium isotope performance.

In this review the original radii, length, mixture fraction, temperatures, ionization, speed/current distributions, sampling duration and uncertainty remain missing. Do not replace these with values from a later theoretical fit or another apparatus. Do not fit temperature or an unknown drag coefficient to1.55 and classify that same point as held-out validation. The abstract provides a useful provenance-backed experimental outcome, but cannot currently establish a quantitative pass/fail of our model.

## What not to admit as experimental validation

- [Okamoto et al.1979, lithium centrifuge static analysis](https://doi.org/10.3327/jaesj.21.596) is a theoretical, fully ionized calculation. Its computed separation and rotation values are not measurements of a weakly ionized lithium centrifuge.
- [Wong et al.2024](https://doi.org/10.1063/5.0168396) and [Muir et al.2025](https://doi.org/10.1063/5.0285228) are theoretical/simulation studies, useful for equation comparisons rather than experimental agreement.
- Fully ionized vacuum-arc centrifuges can test a separate ion regime but do not establish the neutral entrainment or gas-wall energy closure used here. Mechanically spun gases and liquid isotope centrifuges also have different forcing/transport assumptions.
- Marathon's public disclosures establish intended architecture and company-stated milestones. A patent diagram, proposed parameter range, press statement or simulation figure does not substitute for measured data with apparatus conditions and diagnostic definitions. The current repository already distinguishes these in `MARATHON-CENTRIFUGE-V44.md`; this review found no newly admissible public Marathon calibration table.

## Smallest useful next benchmark implementation

1. Archive original sources, perform independent table-image transcription and retain source coordinates. Missing errors remain null. Add digitization uncertainty only after actual figure extraction.
2. Implement an experimental adapter separate from live presets. Ar/He or Ar/Xe requires species-appropriate collision and thermal properties; modifying only masses in a lithium configuration is invalid.
3. First test conditional observables: radial pressure/composition given independently measured velocity and temperature profiles, or entrainment under fixed declared closures. Conditional agreement does not validate the torque-to-speed prediction.
4. Keep any fitted closures fixed across a truly held-out current/B/pressure sweep. Report fitted points, holdouts, residuals and source/systematic intervals separately.
5. Require numerical error well below the experimental effect before applying a first-order agreement gate. A broad or incomplete experimental interval yields inconclusive status rather than a favorable accuracy percentage.

The near-term priority is defensible observation matching and a clear applicable operating envelope, rather than adding more free closure parameters to reproduce one legacy number.
