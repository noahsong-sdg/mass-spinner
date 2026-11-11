# Marathon Level 2: independent systems hypothesis and triage

Reviewed 7 November 2026. Primary-source research and independent algebra only;
no solver, downloaded author executable or application code was run or changed.
This report selects teaching concepts, not a calibrated model of proprietary
hardware. Current public statements are distinguished from demonstrated results.

## What architecture is actually being described?

Marathon's current [beam-driven-fusion description](https://www.marathonfusion.com/beam-driven-fusion/)
specifies RF ionization of deuterium, electrostatic acceleration to keV energies,
and bombardment of a solid lithium-tritide layer on a cooled backing. This is a
beam–target neutron source, not a thermal plasma burning at a single temperature.
Its [home page](https://www.marathonfusion.com/) separately describes compact
isotope/materials work and a future large-plant blanket/fuel-cycle story. The
listed 1 kW, 20 kW/m² and 10¹² n/cm²/s lack public measurement conditions and
uncertainties there. They must not become independent simulator calibration data.

The [2025 chrysopoeia paper](https://arxiv.org/abs/2507.13461) reports simulated
gold production in a tokamak blanket. It does not demonstrate that the compact
beam–target apparatus produces electricity, breeds all its own tritium or achieves
the paper's power-plant-scale economics. Keep those machine boundaries distinct.

## Competing top-three hypotheses

| Candidate set | Why compelling | Why I would or would not select it |
| --- | --- | --- |
| **Per-ion reaction bargain; target heat/lifetime; useful neutron economy** | Explains the accelerator, dense target, cooling/regeneration, isotope business and energy boundaries. | **Recommended.** Each connects an input knob to a measurable quantity and a limiting tradeoff. |
| Temperature; density; confinement/Lawson criterion | Central for thermonuclear plasmas and useful for later power plants. | Not the best first three for the stated compact beam–target source: the beam is nonthermal and loses energy while traversing matter. |
| Plasma centrifuge; enrichment; tritium recycling | Closely connects Mass Spinner with Marathon's fuel-cycle business. | Important prerequisite/extension, but cannot by itself explain the neutron source's yield or thermal bottleneck. |
| Gold; tritium breeding; electrical gain | Captures the unusual commercial story. | Too easy to conflate proposed future blanket calculations with current compact-source performance. Use as applications within the third lesson. |
| Cross-section peak; maximum current; smallest spot | Three intuitively attractive optimizations. | Deliberately reject: they ignore stopping, total power and target survival, respectively. Excellent negative-control experiments. |

The ranking is inference about teaching value. It is not a measured ranking of
the company's technical difficulties. Target/material data may ultimately
dominate its engineering priorities.

## 1. Each accelerated ion buys a probability, not a guaranteed fusion

Let a singly charged deuterium beam have current I [A], entrance energy E₀ [J]
and fusion probability y per incident deuteron. Elementary counting gives

    incident deuterons/s = I/e
    P_beam = (I/e) E₀ = I V
    R_f = y I/e
    P_fus = R_f Q_DT
    Q_beam = P_fus/P_beam = y Q_DT/E₀.

Q_DT is about 17.6 MeV, comprising approximately 14.1 MeV neutron energy and
3.5 MeV alpha energy. These birth energies are the low incident-energy D–T
approximation; a finite-energy beam has angular/kinematic shifts. At an
**illustrative** E₀ = 100 keV, fusion/beam energy equality would need y ≈ 0.00568,
or 0.568%. This threshold is not a measured Marathon reaction probability, and
does not include accelerator, cooling or electrical-conversion losses.

The important tradeoff is not simply a larger microscopic cross section.
Deuterons mostly slow electromagnetically, so the integrated probability along
their slowing-down history matters. The separate yield reviewer should supply
the thick-target integral and its stopping/target-composition assumptions.
Increasing I alone increases neutron rate and beam power together; it does not
improve Q_beam when y is held fixed.

Suggested experiment: vary beam energy and assumed/calculated y, showing
neutrons/s and Q_beam separately. Then double current: counts double, efficiency
does not. Never label beam energy as plasma temperature or P_fus as electrical
output. Ionization makes an ion; it does not fuse its nucleus.

## 2. Compactness trades irradiated area and cooling margin against local flux

Current density j = I/A_beam [A/m²] gives incident beam power density

    q_beam = j V = P_beam/A_beam  [W/m²].

Reducing spot area by four at fixed current raises this heat flux by four.
Nothing about that operation makes more total neutrons if y stays fixed. A
reactor can have an intense small irradiation region while modest total fusion
power. Local flux, total yield, accessible irradiation volume and survival time
are separate metrics.

The energy ledger must specify where each contribution goes. A useful teaching
form is

    P_target = deposited incident-beam power
               + deposited alpha power
               + neutron/gamma return heating.

The incident-beam contribution includes stopped non-fusing ions. Do not put all
14.1 MeV neutron energy into the beam spot: most birth neutron energy travels
away from it. Do not count the same beam energy twice as both source heating and
an additional fusion product. An arbitrary stopping fraction detached from the
fusion-yield model is a stated illustrative assumption, not independent physics.

Marathon describes deposition and in-situ regeneration of its target, but does
not publish a qualified cooling curve, tritium-retention law or target lifetime
on its architecture page. A temperature or lifetime prediction therefore needs
new material/geometry data. Show q_beam and assumed allowable heat flux before
claiming a temperature. Regeneration addresses a material inventory problem; it
does not erase the instantaneous heat-removal requirement.

The historical [LLNL RTNS-II operating report](https://www.osti.gov/servlets/purl/6816875)
is a real beam–tritide source precedent with a rotating, cooled target. Its
different TiT₂ target, geometry and operating conditions are a precedent, not
calibration of Marathon's LiT apparatus.

## 3. A neutron is a product and a resource; electricity is a separate ledger

The fundamental source identity is one birth neutron per D–T reaction:

    R_n = R_f = P_fus/Q_DT.

For orientation, 1 kW total D–T fusion corresponds to about 3.55×10¹⁴ birth
neutrons/s, using the low-energy reaction energy. This is an independent unit
conversion, not verification of the company's 1 kW statement. Capture fraction
and geometry decide how many of those neutrons perform a useful reaction.

The general production rate for nuclide i is

    R_i = ∫volume ∫energy n_feed(r) σ_i(E) φ(r,E) dE dV  [atoms/s].

A monoenergetic thin-sample approximation gives R_i ≈ N_feed σ_i Φ. Its limits
include shielding, competing reactions, nonuniform flux, feed depletion and
spectral changes. A scalar neutron count does not establish a product yield.
For a simple radioactive product with constant production and negligible
destruction, dN_i/dt = R_i − λ_i N_i and activity A_i = λ_i N_i. The
[IAEA activation manual](https://www-pub.iaea.org/MTCD/Publications/PDF/te_1340_web.pdf)
explains saturation and these corrections. Counts made, atoms remaining,
activity and delivered useful doses are different outputs.

Tritium requires a stock-and-flow balance, not merely a positive breeding ratio:

    TBR = tritium atoms bred / fusion reactions
    dN_T,total/dt = all breeding + external supply
                     − fusion consumption − decay − unrecovered losses.

Here N_T,total includes in-process and stored material. Unburned fuel that is
successfully recycled is an internal flow and must not be subtracted as
permanently lost on every pass. A separate usable-reservoir balance counts
extraction and recycling when they arrive, and injection when it leaves;
processing delay therefore ties up inventory without destroying nuclei.
The [ITER breeding description](https://www.iter.org/machine/supporting-systems/tritium-breeding)
provides the standard lithium-to-tritium context; it is not evidence Marathon's
compact unit has a closed breeding blanket. Marathon's own
[fuel-cycle page](https://www.marathonfusion.com/fusion-energy/) describes its
enrichment and recycling work separately.

Neutron multiplication can support both transmutation and breeding, but cannot
create two equally energetic copies of a birth neutron. Endothermic (n,2n)
channels reduce energy; leakage and parasitic capture matter. Product formation
and multiplication can occur in the same event, so naive mutually exclusive
“gold versus breeding” pie slices can also be misleading. The paper's proposed
mercury route makes Hg-197, followed by decay to stable Au-197; gold does not
appear instantaneously after every neutron.

For energy, retain explicit boundaries rather than a single ambiguous Q:

    P_e,in = P_beam/η_acc + P_aux
    P_e,out = η_th P_heat,recoverable
    P_net,e = P_e,out − P_e,in.

Recoverable heat must declare what fraction of incident beam and fusion energy
is captured. A blanket's extra nuclear heat, if present, must not double-count
the original fusion energy. An isotope source need not be net-electric-positive
to be useful. Economic return additionally depends on recoverable product,
prices, demand saturation, isotope processing, uptime, consumables and capital.
The [Marathon-authored isotope-systems paper](https://arxiv.org/abs/2512.09242)
explicitly studies value before energy breakeven, but its modeled plasma-gain
thresholds are not measured beam-target gains.

Suggested experiment: hold total neutron rate fixed, vary useful interception,
sample distance and product survival. Display birth neutrons, useful reactions
and retained product independently. A hypothetical point-source 1/r² flux law
must be labelled far-field/isotropic; it cannot be applied unqualified at a
finite target surface. Keep electricity and product value in separate outputs.

## Source-version check

The initial review found an apparent recirculating-power inconsistency in
[archived v1](https://arxiv.org/html/2512.09242v1). The current
[v2, 22 March 2026](https://arxiv.org/html/2512.09242v2) resolves that issue:
Eqs. 42–45 explicitly distinguish wallplug heating and absorbed power and put
f_h in the denominator of recirculating power, consistently with its definition.
The archived observation is not a defect in the current equations or evidence
of an author-code bug. The app uses its own explicit beam-target energy ledger;
these thermal-plasma power-plant scalings do not calibrate the compact source.

## What Level 2 should and should not promise

Teach controllable relationships with honest effective inputs. Keep the
company's architecture visible, with primary source links, while marking
assumed target properties and unvalidated material/neutronics models. A useful
lesson can correctly explain tradeoffs without predicting Marathon's operating
point. Do not present the compact source as a demonstrated self-sustaining
electricity plant, the gold-blanket proposal as its installed blanket, or the
existing Mass Spinner collision-convergence results as validation of any of them.
