# Gas-regime transport data and code review

Reviewer: `/root/gas56_transport_data`, 2026-11-09. Source inspection and
primary-source research only. No project code, dependencies or scientific
calculations were executed by this reviewer. The parent owns isolated
safe-dev execution, quantitative regime maps and their receipts. This report
does not claim that an external transport code has already been integrated.

## Existing model and data requirements

`src/fuel-centrifuge.ts` offers Li-6/Li-7, atomic D/T, He-3/He-4, atomic
D/He-4 and T/He-4, plus molecular He-4/D2. The UI varies gas temperature
300–2000 K and volume-mean neutral pressure 1–100 Pa. The active thermal
path in `src/fuel-operation.ts` explicitly rejects the molecular pair;
its heat capacity is the constant-volume monatomic value, `3*N*kB/2`.

The current mechanical ion-to-neutral `collisionHz` and phenomenological
radial species diffusivity cannot supply a neutral-neutral collision rate
or a thermal conductivity. Transport needs the actual neutral composition,
temperature, local density and interaction-specific data. In a centrifuge,
local densities can differ substantially from the volume mean, so any
single pressure-derived Knudsen number is at most a bulk screen.

## Useful primary data

**Lithium vapor.** Bouledroua, *J. Plasma Fusion Res. Series* 7 (2006),
217–219, derives dilute monatomic alkali-gas transport using singlet/triplet
potentials and gives Li fits over 100–3000 K:

`mu = 3.14e-8 * T**0.863 Pa s`

`k = 1.398e-4 * T**0.863 W/(m K)`.

The viscosity conversion is important: one micropoise is `1e-7 Pa s`.
These are theoretical neutral-Li transport fits, not solid/liquid lithium
properties, a measured Li/W interface conductance, or certified isotope-
mixture transport. The paper does not state a numerical reference-isotope
mass, so preserve its fit unchanged as a disclosed mixture proxy rather
than inventing a reference isotope. The fit range alone does not establish
that a chosen vapor pressure and wall temperature avoid condensation.
This source supports a clearly identified transport approximation, not
an unqualified device calibration.
[Primary paper](https://www.jspf.or.jp/JPFRS/PDF/Vol7/jpfr2006_07-217.pdf).

**Helium isotopes.** Hurly and Moldover (2000) provide low-density He-4,
He-3 and equimolar-mixture transport tables over 1–10,000 K. Selected
values transcribed from Appendix A, with viscosity in µPa s and thermal
conductivity in mW/(m K):

| Temperature | He-4 mu | He-4 k | He-3 mu | He-3 k | Equimolar mu | Equimolar k |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 300 K | 19.919 | 155.863 | 17.296 | 179.621 | 18.667 | 166.649 |
| 500 K | 28.344 | 221.707 | 24.606 | 255.451 | 26.562 | 237.099 |
| 1000 K | 46.378 | 362.590 | 40.259 | 417.739 | 43.465 | 387.918 |
| 2000 K | 77.286 | 603.905 | 67.087 | 695.745 | 72.436 | 646.403 |

1500 K is not tabulated. Section 5 recommends cubic Hermite interpolation
using tabulated derivatives; an alternative interpolation must disclose its
own unquantified error. Its three compositions are not automatically all mixture
fractions; a justified mixture model is still needed elsewhere. These are
bulk dilute-gas properties, not accommodation data. Later ab-initio work
improves pure-He accuracy; the openly tabulated isotope data remain useful
independent checkpoints for a first assessment.
[Primary tables](https://nvlpubs.nist.gov/nistpubs/jres/105/5/j55hur.pdf),
[later He-4 calculation](https://www.nist.gov/publications/he4-thermophysical-properties-new-ab-initio-calculations).

**Atomic hydrogen surrogate.** Cantera v3.1.0's pinned `h2o2.yaml`, derived
from GRI-Mech, explicitly distinguishes H atoms from H2 molecules. The
atomic-H transport entry gives Lennard–Jones diameter 2.05 Å and well
depth divided by Boltzmann constant 145 K. Its H thermodynamic polynomial
range is 200–3500 K; that is not an experimental accuracy guarantee for
the transport parameters. A custom D/T species may reuse the electronic
potential and change mass only as a stated classical isotope approximation.
This does not validate low-energy quantum isotope effects, H/He cross
interactions, reacting atomic fractions or any tungsten accommodation.
[Pinned data](https://raw.githubusercontent.com/Cantera/cantera/v3.1.0/data/h2o2.yaml),
[transport model documentation](https://cantera.org/3.1/reference/transport/index.html).

Cantera's documented YAML format supports custom isotope elements with
`symbol`, `atomic-weight` and optional `atomic-number`; include them in
the phase's `elements` and species `composition`. This supplies isotope
mass without relabeling molecular D2 as atomic D. Importing the H transport
entry does not create validated D/T data. The official example-data
ammonia mechanism also has a He atom LJ entry, diameter 2.576 Å and well
depth 10.2 K, but this is a mutable example repository rather than a
v3.1.0 bundled-file guarantee. Prefer the scoped NIST table reference for
this assessment; do not extend H/He mixture validity solely to fill a gap.
[Custom isotope format](https://cantera.org/3.1/userguide/creating-mechanisms.html),
[official example He data](https://github.com/Cantera/cantera-example-data/blob/main/ammonia-CO-H2-Alzueta-2023.yaml).

For a higher-fidelity atomic-H data campaign, the older NBS hydrogen study
explicitly separates H–H, H–H2 and H2–H2 collision integrals and reactive
thermal conductivity. Its molecular-hydrogen title must not lead to
unqualified substitution for prescribed atomic D/T. The IAEA compilation
also contains hydrogen-species collision-integral fits over wide thermal
ranges, but adopting them requires reading the individual channel,
potential, energy range and integral normalization.
[NBS paper](https://pmc.ncbi.nlm.nih.gov/articles/PMC6728481/),
[IAEA compilation](https://www-pub.iaea.org/MTCD/Publications/PDF/APID-VOL9.pdf).

**Interface accommodation.** Watt and Moreton (1974) measured He on a
particular polycrystalline tungsten wire: gas 300 K, wire 1073–1785 K,
pressure of order `1e-3 torr`; their reported thermal accommodation is
approximately 0.018. This is strong evidence against assuming full
accommodation for every gas/surface pair. It is not a universal He/W value
across surface histories, not Li/W data, and not D/T recombination data.
Use it only as a clearly scoped sensitivity example unless matching the
experimental surface and temperatures.
[Primary experiment](https://doi.org/10.1016/0039-6028(74)90166-6).

Hydrogen atoms on tungsten can recombine; that adds chemistry, species
conversion and binding-energy transport absent from a sensible-heat Robin
law. Measurements of recombination up to 1350 K reinforce that a scalar
thermal accommodation coefficient cannot represent all wall physics.
No independently validated Li/W thermal accommodation coefficient was
established in this review; report that input as unknown.
[Primary recombination study](https://www.sciencedirect.com/science/article/abs/pii/S0039602814001241).

## Existing codes and appropriate uses

| Code/data | Verified useful capability | Appropriate use and limitation |
| --- | --- | --- |
| Cantera | Species-specific Lennard–Jones collision integrals; mixture transport | External dilute-continuum transport comparison with explicit custom isotope assumptions. A combustion mechanism does not validate all separator pairs or a gas–wall coefficient. |
| CoolProp | He-4 fluid properties and molecular H2/D2 property models | Independent pure-He check inside individual correlation domains. `Hydrogen` is H2, not H; `Deuterium` is molecular D2, not atomic D. Its He page cites Hands–Arp conductivity rather than the isotope tables above. |
| SPARTA DSMC | Multispecies VSS/VHS collisions, local thermal fields, particle/surface energy transfer | Appropriate future oracle in transition/free-molecular conditions after collision kernels and surface inputs are justified. It does not generate missing physical collision or accommodation parameters. |
| FiPy | Conservative continuum transient conduction | Appropriate gas-PDE reference after continuum transport and pressure/momentum closure are specified. Solid conduction agreement alone does not validate a gas closure. |

References: [Cantera](https://cantera.org/3.1/reference/transport/index.html),
[CoolProp helium](https://coolprop.org/fluid_properties/fluids/Helium.html),
[CoolProp hydrogen identity](https://coolprop.org/fluid_properties/fluids/Hydrogen.html),
[SPARTA collision parameters](https://sparta.github.io/doc/collide.html),
[SPARTA thermal diagnostics](https://sparta.github.io/doc/compute_thermal_grid.html).

SPARTA's current mean-free-path diagnostic uses the mixture species
densities and VSS parameters rather than one species' diameter for the
whole gas. Its documentation notes an October 2024 formula change; record
the exact code revision when using it as an oracle. Its diffuse and CLL
wall models take accommodation as input. Distinct normal/tangential and
internal-mode coefficients are supported; this flexibility is not
experimental surface calibration.
[MFP/collision-time diagnostic](https://sparta.github.io/doc/compute_lambda_grid.html),
[surface scattering](https://sparta.github.io/doc/surf_collide.html).

Cantera's source is BSD-style, requiring its notices for redistributed
code. SPARTA is GPLv2; using it as a separate executable oracle is a cleaner
boundary than copying implementation into the browser without reviewing
license obligations. Preserve numerical data attribution and check each
dataset's terms rather than treating a software license as licensing all
external experimental data.
[Cantera license](https://raw.githubusercontent.com/Cantera/cantera/v3.1.0/License.txt),
[SPARTA license](https://raw.githubusercontent.com/sparta/sparta/master/LICENSE).

## Implementation recommendation and validation conditions

The immediate assessment should disclose a data tier per pair and avoid
automatic substitution when a model is missing. Li fits and helium tables
can support model-dependent thermal-diffusion screens. An atomic-H LJ
surrogate can support explicitly approximate D/T sensitivity. Mixed H/He
and arbitrary He-isotope fractions need an identified mixture closure.

Keep transport collision integrals, total collision cross sections and
energy-relaxation rates distinct. Conductivity or viscosity does not by
itself uniquely identify a total collision frequency. If a viscosity-based
mean-free-path proxy is useful, name its convention and avoid presenting
it as a measured total-collision MFP or an independently certified Knudsen
number. Any rate inferred from `lambda/v` inherits that convention.

The rotating-state assessment should sample the actual evolving radial
species densities where available, and separately test the volume-mean
bulk state. The uniform thermal assumption also requires diffusion/mixing
faster than the relevant forcing, not merely collisions faster than a
solver step. Rigid-body azimuthal rotation does not itself mix radially.
Fast sound propagation can equilibrate pressure while radial temperature
remains nonuniform. These are physical inferences to test, not data fits.

Required independent checks are parameter-unit transcription, correct
atomic/molecular identity, pure-species and equal-isotope limits, sensible
pressure/density scaling, explicit extrapolation rejection, and separate
regime/model-validity versus solver-success results. Preserve the v55
capacity-only fast case as species-unspecified: assigning it a named gas
without composition would manufacture missing physical input.

## Source-check status

The selected He table entries were compared in two retrieved text
representations of the same primary PDF, including the actual 22-page
version (He-4 on PDF page 17, He-3 on pages 18–19, equimolar mixture on
page 20; these are one-based page positions). This catches transcription
differences, but is not an independent physical dataset. Screenshot calls
returned references without inspectable image payloads in this session,
so this reviewer does not claim a visual screenshot check. A separate
reviewer should repeat the transcription against the primary table.
