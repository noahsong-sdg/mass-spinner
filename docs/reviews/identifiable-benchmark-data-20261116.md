# Public benchmark data: independent candidate search

16 November 2026. Literature/repository review only; no solver execution, new
comparison or experimental qualification. No authors were contacted.

**Decision:** no new dataset inspected here passes admission for a simultaneous,
no-fit prediction of rotation, temperature and an independent electrical signal.
This is a bounded search result, not a claim that suitable data do not exist.
The strongest public alternative apparatus document is the MCX dissertation;
the strongest directly diagnosed argon alternative is modern PCX. Both require
substantial model-transfer checks and additional same-shot metadata.

## Ranked candidates

The rank measures feasibility of investigating an independent joint benchmark,
not scientific quality. Published figures remain useful even when raw data are
unavailable; they do not automatically identify the required forward problem.

| Rank / source | Verified measurement and source location | Admission / model-transfer issue |
| --- | --- | --- |
| 1. **MCX, Messer2004**; [official UMD record](https://drum.lib.umd.edu/items/c3cab4e9-a0f5-4050-81da-9eb740a829d6/full), [dissertation PDF](https://drum.lib.umd.edu/bitstreams/89a36a34-778d-4a6c-a698-a19cc88830d6/download) | §3.3, printedpp13–14: tangential Doppler spectroscopy and1MHz voltage/current recordings; §4.4, pp24–25: instrument, calibration and repeated-shot uncertainty. §5.2.4, pp36–42: mirror-ratio scan with optical temperature/velocity and electrical quantities. AppendixB, pp62–64 describes the diagnostic. | **Conditional candidate, not admitted.** Nearly fully ionized hydrogen mirror, not a collisional neutral-dominated argon centrifuge. Carbon-line observations are not automatically bulk-proton velocity/temperature. Profile/shear/reflection ambiguity is stated. AppendixI tabulates fitted trends, not a raw same-shot archive. Density and some velocities are inferred from electrical assumptions; never treat those as independent targets. |
| 2. **PCX/BRB, Flanagan2020**, [PRL125135001](https://doi.org/10.1103/PhysRevLett.125.135001), [lab-hosted PDF](https://wippl.wisc.edu/pub_files/journal/Flanagan1316.pdf) | pp135001-2–3: argon, current drive, Hall-probe and Mach/Langmuir diagnostics; PCX Fabry–Perot measures chord-integrated velocity/ion temperature. Fig3 gives a PCX velocity profile with20m/s Bayesian uncertainty. Fig5 gives injected-current versus field-change scans. Diagnostic precision is alignment/calibration dependent. | **Best new argon diagnostic lead, not an admitted joint shot.** No matched voltage/temperature dataset was recovered here. Field expulsion/amplification requires evolving Hall-MHD rather than prescribed vacuumB. PCX and BRB are different geometries/current directions: do not combine their panels into one apparatus. The paper itself calls its NIMROD comparison qualitative. |
| 3. **PCX, Collins2014**, [PoP21042117](https://doi.org/10.1063/1.4872333), [lab PDF](https://wippl.wisc.edu/pub_files/journal/Collins1007.pdf) | pp042117-2–3: independently cross-checked electron temperature; Fig3 compares axial Mach-probe flow with two/four biased cathodes at450V and approximately1A per cathode. Fig4 contains time-dependent current/pressure/plasma parameters. | **Useful conditional rotation/electron-diagnostic test, not independent heavy-temperature qualification.** §III explicitly obtainsTi from a fitted velocity profile; TableI labels itTifit. Supplying thatTi and then scoring it would leak the rotation target. Multicusp boundary stirring, ECH and very low pressure differ from the present Marathon concept. |
| 4. **PCX, Milhone2021**, [PRL126185002](https://doi.org/10.1103/PhysRevLett.126.185002), [lab PDF](https://wippl.wisc.edu/pub_files/journal/Milhone1318.pdf) | pp185002-2–3: radial ne/Te/B profiles, current scans and Doppler ArII temperature/velocity spectra; Fig4 compares stable/unstable ion distributions. Observation is chord integrated and exposure exceeds the mode period. | **Valuable diagnostic/instability challenge, poor first joint benchmark.** Requires Hall and non-Maxwellian wave-heating physics. Ref32 identifies supplemental content as mode video and dispersion derivation, not an advertised raw joint diagnostic bundle. Voltage/source and thermal closure still need matching. |
| 5. **Wijnakker1979/1980**; [1979 source](https://doi.org/10.1515/zna-1979-0602), [1980 source](https://doi.org/10.1515/zna-1980-0815) | Closest weakly ionized apparatus family already reviewed in this repository;1979 jointly reports neutral/ion rotation, plasma parameters, potential and pressure. | **Development reproduction only.** Known outputs have repeatedly guided model development. Re-extraction or a newer paper reproducing its points does not create an untouched holdout.1979 and1980 cathode/operating details must be admitted separately. See the independent apparatus review. |
| 6. **Hood-McFadden2026v2**, [primary preprint](https://arxiv.org/pdf/2607.28208) | §3, PDFpp14–15: calibrated capillary/RGA pressure, boundary thermocouples, high-speed imaging; §4.1.3, pp19–21: contemporary compact/enlarged experiments. | **New pressure/boundary-thermal evidence, not jointly measured bulk rotation.** Optical spoke phase speed is explicitly different from bulk flow. A prescribed wall temperature cannot validate that same thermal boundary. Historical reproduced plots and fitted/inferred rotation are not new independent rotation measurements. |
| 7. **Kaneko1978**, [publisher source](https://doi.org/10.1088/0032-1028/20/11/007) | Abstract reports He–Ar outer-electrode enrichment1.55 at0.75T/1A over0.6–20Torr. | **Separation lead only.** Fulltext and same-condition independent flow/temperature/voltage metadata were not recovered in this search. Do not combine this mixture result with the distinct pure-argon pressure case reproduced in2026. |

## Repository and calibration checks

**WiPPL:** the [official data-access page](https://wippl.wisc.edu/how-do-i-access-data/)
describes diagnostic MDSplus trees and institution-static-IP/facilitator access.
Its [data-management policy](https://wippl.wisc.edu/what-is-your-data-management-plan/)
identifies shot-based raw/processed storage, a per-shot electronic logbook,
environmental histories and firewall/trusted-user access with PI approval.
It also requires public figure/table ASCII/HDF5 or equivalent archival. The
checked paper/lab pages did not expose a matching downloadable joint shot bundle;
a stated publication policy is not evidence that a particular deposit was found.
The official [thesis index](https://wippl.wisc.edu/student-theses/) links2020
Flanagan/Milhone dissertations, but the web reader rejected their27.9/63.8MB
PDFs. Those contents were not audited. No private MDSplus access was attempted.

**MCX:** no separate raw archive was recovered. Keep spectral species, chord
and exposure; instrument resolution alone omits shot variation and
interpretive uncertainty (§4.4).

**Marathon/MIT:** a public plan, [DMP DOI10.48321/D10930DB2F](https://doi.org/10.48321/D10930DB2F),
is titled *Advancing Selective Isotope Pumping Using a Partial Ionization Plasma
Centrifuge*. An indexed plan is a deposit lead, not observed experimental data.
Exact-title/Marathon searches did not recover its promised centrifuge dataset.
The checked [Marathon GitHub organization](https://github.com/Marathon-Fusion/)
listed CNC_Mill and neutronics_workflow; the located [Zenodo15053541 poster](https://zenodo.org/records/15053541)
concerns CAD/OpenMC neutronics, not centrifuge calibration. Direct Zenodo search
and the DMP DOI did not open through the web reader; this limits coverage.

## Other contemporary alternatives screened

[CMFX, Ball2026](https://doi.org/10.1088/1741-4326/ae0faa), published November2025,
has high-quality voltage/current monitoring and independently calibrated neutron
yield. However §4 uses measured yield, voltage and power with MCTrans++ to infer
undiagnosed density and temperature. These are not independent thermal targets,
and quoted E×B rotation from applied fields is not a measured bulk-flow profile.
It is an excellent separate fusion-yield/diagnostic problem, not a shortcut to
qualifying this neutral-gas centrifuge.

[SERPENT2025 thesis](https://deepblue.lib.umich.edu/bitstream/handle/2027.42/199190/jruths_1.pdf?sequence=1)
describes construction and a planned Doppler diagnostic; §7.1's current-reversal
example is simulated from MCX. Search-indexed primary text was checked; the full
PDF fetch returned429. It cannot supply an observed joint SERPENT benchmark here.
The [Reid2013 MCX record](https://drum.lib.umd.edu/items/45c2d604-237e-4799-add7-649abb0c98e5)
adds an electron-Bernstein-wave temperature diagnostic, but its abstract does not
identify matched rotation/electrical shot data; full admission remains open.

## Smallest defensible next action

1. Preserve the existing Wijnakker comparison as development evidence. Do not
   retrofit a new closure until a particular observable and apparatus are frozen.
2. If pursuing an independent public alternative now, first assemble a **PCX
   diagnostic-only** packet or an **MCX published-figure reproduction** packet.
   Label the regime transfer and missing data explicitly; neither is presently
   a joint predictive validation campaign. Do not import their fitted transport
   parameters as independent inputs.
3. Admit a real joint case only after recording: same shot/condition; finite
   contacts and drive circuit; magnetic/neutral inventory; thermal sinks; exposure
   times; spectral calibration and line-of-sight weighting; uncertainty meaning.
   Prescribe current **or** plasma-port voltage and predict the other. Never
   score prescribed wall/gas temperature as a predicted thermal output.
4. Seal inputs, source bytes and diagnostics before exposing held-out targets.
   Numerical convergence and broad nuisance-parameter compatibility remain
   separate from experimental predictive accuracy.

Search scope: primary publisher/arXiv/lab/UMD/OSTI/Michigan records; exact-title,
author/device, supplemental-data and Zenodo/GitHub queries for the listed
candidates. Search engines returned unrelated biological-plasma results for
some dataset queries; those are not negative evidence about fusion data.
