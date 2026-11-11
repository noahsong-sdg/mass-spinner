# Stage 8: experimental evidence gate and usable public candidates

6 November 2026. **Stage 8 is not complete.** The app has no documented held-out experimental validation of II C/D collector separation. Synthetic truth, an independently derived equilibrium and numerical convergence are different evidence classes. This bounded search found useful published profiles and candidate experiments, but did not obtain a matched raw calibration/held-out device dataset. That is not a claim that no such data exist.

## Primary material reopened

| Candidate | What was verified | Legitimate use now | Why this does not validate current collector purity |
| --- | --- | --- | --- |
| Gueroult et al. 2016, *Initial experimental test of a helicon plasma based mass filter*, [author full text](https://w3.pppl.gov/~fisch/fischpapers/2016/Gueroult.PSST.2016.pdf), [DOI](https://doi.org/10.1088/0963-0252/25/3/035024) | Preliminary PMFX density/floating-potential and Ar/Kr spectroscopic profiles; diagnostics provide partial plasma characterization. Te is assumed because reliable compensated measurements were unavailable. Interpreting the line-ratio change requires the electron-temperature profile. | A future synthetic-diagnostic comparison, with excitation/line-integration model and uncertainty, or qualitative profile-response checks. | Emission ratio is not directly an ion-density ratio or collected mass fraction. No matched measured source, complete field/Te profiles and collector composition with uncertainties were obtained here. |
| Gueroult et al. 2024, *Plasma potential shaping using end-electrodes in LAPD*, [author full text](https://w3.pppl.gov/~fisch/fischpapers/2024/Gueroult.electrodes.JPP2024.pdf), [DOI](https://doi.org/10.1017/S0022377824000552) | Six bias scenarios; measured potential/density/temperature profiles and electrode currents; displayed profile error bars represent five-shot variation. Bulk response depends on parallel resistivity/current rather than electrode commands alone. | A future field/current-closure benchmark, withholding one bias scenario or operating condition from fitting. | This is a potential-shaping experiment, not a measured multi-species collector-separation benchmark. Digitized plot values would still need extraction uncertainty and cannot stand in for missing input profiles. |
| Hole & Simpson 1997, *Performance of a vacuum arc centrifuge with a nonuniform magnetic field*, [author PDF](https://maths.anu.edu.au/files/U4348025XPUB31.pdf), [DOI](https://doi.org/10.1063/1.872246) | Primary title/abstract reopened; the full PDF timed out during this pass. Existing project review previously inspected its equations. | Theoretical model comparison after recovering and tracing the full source again. | It analyzes a perturbative fluid model; model curves are not independent measured device truth. This pass does not invent new experimental numbers from an inaccessible text. |

The [BaPSF data-management policy](https://plasma.physics.ucla.edu/data-management.html) describes HDF5 experimental runs and campaign-specific calibration metadata, with reuse controlled by the campaign PI. This explains why a published figure does not automatically expose its full data; it does **not** establish that every LAPD dataset is closed. No data-request email or other message was sent.

## Minimum dataset contract before calling validation complete

For each condition, preserve the device geometry/collector acceptance; source history and species/charge fractions; measured or justified `B(r,z)`, bulk `φ(r,z)`, `n`, `Ti`, `Te` and neutral inputs; recorded output observable; calibration/diagnostic transfer function; measurement uncertainty/covariance; units; provenance; and reuse permission. Mark assumed and inferred inputs separately from measurements.

If the measured output is light emission, compare synthetic light emission under the same excitation/line-of-sight model. If it is collector composition, compare composition with the same temporal/spatial acceptance. Do not fit one observable and claim validation of another.

Freeze a training/calibration condition and hold out at least one distinct operating condition before tuning. Freeze uncertain-parameter priors/ranges and the acceptance criterion. Run the converged numerical model, propagate measured input uncertainty, compare the held-out observable, and report both agreement and failure. A withheld point interpolated from the same fitted curve is weaker than a genuinely distinct operating condition and must be described as such.

## What can be completed without new experimental data

- A provenance-aware data schema, measurement/model overlay and uncertainty report can be implemented and tested using explicitly synthetic fixtures.
- A field-closure example can be compared with independently digitized published profiles, with plot-resolution/extraction uncertainty and a declared scope.
- Numerical convergence and independent analytic/kinetic benchmarks can be completed without treating them as experimental validation.

**What remains external:** obtaining sufficient measured conditions and uncertainties, recovering missing source/field/diagnostic metadata, and passing an actual held-out comparison. Software can represent and enforce this gate; it cannot manufacture the evidence. No currently unmeasured industrial throughput, power, purity, or Marathon-specific performance is justified by it.
