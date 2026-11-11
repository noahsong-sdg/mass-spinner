# Marathon's compact source: three concepts

Primary-source concept review, 7 November 2026. This review concerns the
compact D-on-lithium-tritide neutron source described by Marathon, not a digital
twin or its separate future commercial fusion-power-plant concepts.
[Official architecture](https://www.marathonfusion.com/beam-driven-fusion/),
[current system and future plant](https://www.marathonfusion.com/).

## 1. An ion must fuse before it stops

The RF plasma creates ions. Electrostatic voltage supplies their beam energy.
For D onto stationary T, E_cm ≈ (3/5) E_lab. A 100 keV D beam therefore enters
the D–T cross-section curve near 60 keV centre-of-mass energy.

With continuous straight-track slowing, S(E) = -dE/dx > 0:

    χ = integral[E_out to E_0] n_T σ_DT(0.6 E) / S(E) dE
    p = 1 - exp(-χ)

χ is dimensionless: n_T [m^-3], σ [m²], S [J/m], dE [J]. This is a track
model, not a complete treatment of scattering, target evolution or straggling.
For the app's no-slowing control, use χ = N_T σ(0.6 E_0), where N_T is the
tritium column. The equivalent path form χ = integral n_T σ(E_cm(x)) dx
also covers that limit without dividing by zero stopping power.
Most ions lose energy electromagnetically without fusing. Peak cross section
is therefore not enough: the ion samples a slowing trajectory, and higher
injection energy also costs more electrical energy.

For a fully stopping fixed-composition material, n_T = f_T n and S = n ε(E).
The bulk density cancels from χ. Within those assumptions, greater density
shortens the range rather than giving free extra yield per ion. Composition,
stopping physics and target state can invalidate that simple scaling.
[Primary thick-target analysis](https://www.osti.gov/servlets/purl/4618039).

The default mode integrates a sourced D–T cross section along an **assumed linear**
energy-loss path. Its target column and fractional loss are independent toy
inputs. The energy scan holds both fixed, comparing a family of imposed
stopping laws; it is not optimization of one physical LiT target. It does not
extrapolate the fit to zero energy or claim a fully stopped-tail calculation.
[Bosch–Hale cross-section fit](https://doi.org/10.1088/0029-5515/32/4/I07).

The optional Geant4-derived mode instead integrates an atomic-additivity electronic/nuclear stopping estimate through a fixed formula-unit column. It still lacks measured LiT compound calibration. A separate well-mixed loading reference follows T/D/vacancies and its own evolving yield; neither it nor the bulk thermal observer establishes target lifetime. [Current stopping/loading scope](./DEUTERON-STOPPING-LOADING.md).

## 2. Current buys neutrons and heat together

For a pure singly charged D+ beam, with fixed undepleted target:

    incident ions / s = I/e
    produced neutrons / s = (I/e) p
    P_beam = IV
    deposited heat flux = P_deposited / A

Double current: double source production and beam power. Halve illuminated
area: double heat flux, with unchanged total neutron production in this model.
This invariance breaks when focusing changes temperature, target loading,
retention, composition or the beam itself.

Beam spot, fusion region and irradiated sample are different areas. Dividing
source count by beam area does not calculate neutron flux at a sample.
Marathon's advertised fusion power density is not an established beam-cooling
limit. Its public architecture describes a cooled, regenerable target but
does not provide the material and cooling data needed to predict temperature
or lifetime.

The app keeps a full energy ledger: slowing heat, fusion-product energy,
transmitted beam and escaping products. The conditional assembly heat assumes
the substrate stops transmitted beam. Counting both the entire original beam
as heat and all reacting-beam kinetic energy in products would double-count
energy. Neutron power and nuclear reaction-Q power are also different.

## 3. Useful neutrons are different from net electricity

One D–T reaction produces one neutron and releases approximately 17.6 MeV of
nuclear energy. Beam gain uses incident kinetic energy as its denominator:

    Q_beam = p × 17.6 MeV / E_0
    P_wall = P_beam / η_acc + P_aux
    P_net,electric = η_thermal P_recoverable - P_wall

At an illustrative 100 keV, Q_beam = 176 p: p ≈ 0.568% is needed merely for
fusion energy to equal incident beam energy. This is a threshold, not a
measured Marathon yield or a claim that it is attainable with this target.
Increasing current alone does not improve Q_beam in the linear regime.
The app reports accelerator input only, with P_aux omitted; it calculates
neither a complete facility electrical input nor net electrical output.

An isotope or materials source may be useful while consuming electricity.
Actual product rate requires spectral flux and nuclear response:

    R_product = integral n_feed(r) σ_product(E) φ(E,r) dE dV

Finite geometry, attenuation, isotope pathways, decay, extraction and processing
must then be modeled. The app reports produced neutrons, not product yield.
Each D–T reaction also burns one T nucleus. Recycling and surface regeneration
move or replace material; they do not create replacement tritium fuel.
[Official isotope applications](https://www.marathonfusion.com/radiopharma/),
[official materials applications](https://www.marathonfusion.com/fusion-materials/).

## Why these three concepts

Four independent reviews considered competing concept sets. This selection explains
the published compact architecture and gives testable parameter predictions.

| Candidate curriculum | Triage |
| --- | --- |
| Yield versus stopping; target heat and regeneration; useful-neutron versus electrical accounting | Selected: directly explains the compact source and three distinct design choices. |
| Density–temperature–confinement; ignition; plasma stability | Important for thermal-plasma fusion, but the wrong primary framework for this cold-target architecture. |
| Tritium recycling; lithium enrichment; blanket neutron multiplication | Valuable next lessons about the broader company system; insufficient by themselves to explain this neutron source's yield and heat limits. |
| Highest power density; smallest volume; largest fusion power | Rejected as a conceptual foundation: comparing different denominators can obscure beam costs, useful flux and heat removal. |

Lawson/ignition/confinement was rejected as the main framing because a cold
solid beam target is not an ignited thermal plasma. Tritium recycling, lithium
enrichment and blanket neutron multiplication remain valuable extensions, but
do not replace yield-versus-stopping or heat-removal constraints. Gold-blanket
power-plant simulations must not calibrate this compact source.

All slider defaults are illustrative. A calibrated model needs beam composition,
energy/angle spread, LiT loading and stopping data, cooling boundaries, material
evolution, target regeneration and independently measured neutron output.
