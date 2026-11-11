# Section II E–K reference atlas

Eleven original, reproducible educational PNGs accompany the narrower interactive Section II A–D simulator. They explain the remaining methods and named variants without presenting them as validated, interactive separator models. All images are 1600 × 1000 pixels. A 1280 × 2400 contact sheet provides a quick visual overview.

The drawings were created from the mechanism descriptions and equations in Zweben, Gueroult and Fisch, *Plasma mass separation*, Physics of Plasmas 25, 090901 (2018), [DOI 10.1063/1.5042845](https://doi.org/10.1063/1.5042845), checked against the local tutorial extraction, Section II E–K, and the [author-hosted PDF](https://w3.pppl.gov/~fisch/fischpapers/2018/Zweben_PMF_POP18.pdf). No journal figures, experimental images or apparatus CAD were copied. Historical experimental statements below describe what the 2018 tutorial reports, not a current literature survey.

## Coverage and tradeoffs

| Section / image | Mechanism and potential advantage | Principal disadvantages and fidelity boundary |
| --- | --- | --- |
| II E — `mcmf.png` | A centrifugal plug on an inward end favors light escape; an outward magnetic mirror can favor heavy escape. Two ends can provide separate product outlets. | Pitch-angle scattering must replenish loss cones without excessive perpendicular transport. Endpoints alone do not determine throughput, purity or a self-consistent field. Other variable-field configurations described in II E are grouped under this reference family; the drawing specifically depicts MCMF endpoint logic. |
| II E — `rotatingmagnetic.png` | A time-dependent rotating magnetic drive provides a distinct control mechanism from static electrodes (inference). | Section II only points to the proposal and does not define a complete numerical separator. The sketch depicts generic successive magnetic-field phases; induced electric fields, plasma response, transport and collection are unspecified. It is not the rotating electric field used for ICR. |
| II F — `poms.png` | Plasma-optical separation redirects energetic ions around a strong magnetic core. The tutorial reports nitrogen, argon and krypton separation experiments. | Electron emission and charge-separation fields affect the optics. The drawing is an original conceptual layout, not a reconstruction of an experimental machine; colored paths have no calculated mass ordering. |
| II F — `azimuthal.png` | A central current gives an azimuthal field; a logarithmic radial potential changes annular ion orbits. Cited calculations suggested little ion deposition on electrodes. | Large central currents and immersed bias electrodes are required. Ideal prescribed fields do not establish sheath behavior, field penetration or collection efficiency. This is a different geometry from POMS and from a magnetic cusp. |
| II G — `advection.png` | Neutral friction on azimuthal rotation creates a radial drift. This may use rotation already present in a linear device and helps explain transport competing with other methods. | The neutral-friction dependence on ion mass is weak through reduced mass. Neutral composition and collision profiles matter. This local force sketch is distinct from collisionality-gradient advection. |
| II G — `collisionality.png` | A collision-frequency gradient coupled to diamagnetic flow produces mass- and energy-dependent advection; the tutorial cites potential for substantial theoretical separation. | The illustrative gradient has no numerical calibration. A transport closure must determine the drift direction and magnitude; gradients, magnetization and boundaries must be specified. |
| II H — `diffusion.png` | A simple, relatively cool collisional plasma may reduce heating requirements. | In the trace-heavy-on-light, same-charge Coulomb limit, larger gyroradius and lower collision frequency cancel the leading heavy-mass dependence. The intentionally coincident curves show this null result. Fluctuations and alternative collision channels require separate coefficients. |
| II I — `mobility.png` | Electric forcing balanced by collisional drag can separate drift velocities without an applied magnetic field. | Diffusion broadens the distributions, and shielding can suppress a bulk electric field in a neutralized plasma. The illustrative equal-charge, equal-collision-frequency profiles are conditional, not a universal mass law. |
| II I — `ionwind.png` | The tutorial reports modest cathode-region enrichment of heavier neon/krypton isotopes in capillary discharges. | The process appears slow. Differential ion–neutral friction was considered most probable, but radial thermal diffusion and wall-loss differences were also candidates. The shaded region is an uncalibrated enrichment location, not an established mechanism or concentration prediction. |
| II J — `ionization.png` | Different ionization responses can select elements or molecules, especially those with low thresholds. | Thresholds alone do not determine rates. The electron distribution, measured cross sections, recombination, exposure and ion/neutral extraction are necessary. The displayed 4/14 eV thresholds are hypothetical; the Maxwellian-shaped energy distribution is explanatory, not a measured plasma. |
| II K — `transit.png` | Equal-energy ions have mass-dependent arrival times; a moving collector maps time to accessible deposited fractions. | Energy spread, scattering and pulse width blur arrival times; slits, duty cycle and vacuum mechanics constrain throughput. The arrival markers are exact ideal fixed-energy benchmarks, not product distributions. |

## Equations and numerical checks

- MCMF endpoint barrier: `ΔU = μ ΔB − m Ω² Δ(r²)/2`, assuming the stated rotating-frame endpoint comparison and adiabatic magnetic moment. This omits any additional electrostatic endpoint barrier and does not reconstruct a full magnetic field.
- Azimuthal geometry: `Bθ = μ0 I/(2πr)` and `φ = V ln(a/r)/ln(a/rin)`. For positive `I` out of the page, the drawn field circulation is counterclockwise; for positive `V`, the electric field is outward.
- The advection force directions obey `E` right, `B` out of the page, `E×B` down; stationary-neutral drag points up. These are local Cartesian directions, not an apparatus coordinate map.
- Diffusion uses the tutorial scaling `D⊥ ≈ ρh² νhl/2`, `ρh² ∝ mh`, `νhl ∝ 1/mh`. The illustrative two-dimensional radial diffusion cumulative distribution is exactly `1 − exp[−r²/(4Dt)]`; both curves use the same coefficient.
- Mobility uses `vd = μE`, `μ = q/(mν)`, with positive charge and explicitly equal `ν` for the illustration. The Gaussian widths and means are illustrative rather than calibrated model outputs.
- Differential ionization uses `kion = ⟨σion ve⟩`; the energy-distribution curve has Maxwellian shape proportional to `sqrt(E) exp(−E/Te)` at `Te = 5 eV`, normalized over the displayed interval. No ionization rate or purity is calculated.
- Transit markers use `t = L sqrt[m/(2K)]`, `L = 10 m`, `K = 10 eV`, and masses 40 u / 250 u. Results are 1.4397 ms / 3.5994 ms, a difference of about 2.16 ms. These exact ideal values do not repeat the tutorial's rough ~3 ms difference. A collector moving at 10 m/s would map the ideal difference to approximately 2.16 cm; finite pulse and energy spread are excluded.

## Integration and reproduction

`web-assets/reference-atlas/manifest.json` is a UTF-8 JSON array with fields `id`, `section`, `title`, `image`, `alt`, `mechanism`, `pros`, `cons`, `limitations`, and `sources` (objects containing `title` and `url`). Image values are root-relative `/reference-atlas/<id>.png`. Alternative text and caveats are supplied for every entry. The host app should present them as a reference gallery rather than simulation settings.

From the project root, using an environment containing NumPy, Matplotlib and Pillow:

```sh
.tools/atlas-venv/bin/python scripts/build-reference-atlas.py
```

The script regenerates the eleven PNGs, manifest and contact sheet, then checks that all eleven IDs are unique, every source/pro/con list exists, every referenced image exists, and every primary PNG is 1600 × 1000 pixels. The current atlas was generated with Matplotlib 3.11.2 and Pillow 13.0.0. All eleven images were inspected individually at full resolution; labels, source footers and plotted curves are visible without clipping.

Validation is limited to these explanatory diagrams, their conditional equations and exact ideal benchmarks. It does not validate a plasma solver, machine performance, self-consistent electric fields, collisions, throughput or experimental agreement.
