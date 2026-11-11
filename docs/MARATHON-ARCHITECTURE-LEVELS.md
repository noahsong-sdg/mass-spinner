# Marathon: architecture and candidate teaching concepts

Primary-source review, 7 November 2026. This is an independent research and
curriculum recommendation, not a validation of Marathon's machine or of the
app's existing beam-target calculations. No simulation or author code ran.

## Establish which machine is being discussed

Marathon's current compact concept sends an electrically accelerated D+ beam
into solid lithium tritide on a cooled substrate. Fusion occurs near the target
surface. The RF plasma makes the ions; the advertised fusion region is a solid
target, rather than an ignited thermal plasma.
[Official architecture](https://www.marathonfusion.com/beam-driven-fusion/).

The company separately describes a future commercial-power-plant system with
neutron-multiplying blankets, fuel processing and lithium isotope enrichment.
These must not be silently merged into the compact source. Its homepage lists
1 kW fusion power, 20 kW/m² power density and 10¹² neutrons/cm²/s, but does not
identify their measurement/normalization basis, beam current, beam voltage,
net electrical gain or operating lifetime. Those figures are company statements,
not an independently checked operating point.
[Current system and future plant](https://www.marathonfusion.com/).

The advertised target is deposited lithium that becomes solid lithium tritide
and can be replenished in place. Regeneration is therefore an architecture
feature worth representing conceptually, but no validated replenishment law,
cooling coefficient or lifetime follows from that description.
[Target description](https://www.marathonfusion.com/).

## Competing hypotheses and triage

| Candidate top-three curriculum | Strength | Why accept or reject |
|---|---|---|
| Yield versus stopping; heat versus local flux; useful-neutron accounting versus electrical gain | Explains the current compact machine, its natural scaling and its limits | Recommended. Each changes a real design decision and can support a conditional interactive calculation. |
| Density/temperature/confinement; ignition; plasma stability | Familiar fusion framework | Reject as the main Level 2 narrative. It would teach a magnetic or inertial thermal-plasma reactor in place of the published cold-target architecture. |
| Tritium recycling; lithium enrichment; neutron multiplication | Explains Marathon's broader fuel-cycle strategy and connects to Mass Spinner | Keep as an extension. By itself it misses why the compact beam-target source produces neutrons and what limits its intensity. |
| Small volume; high power density; high total fusion power | Visually compelling | Reject this ranking. Those are different quantities, and emphasizing them without beam-power and sampling-volume boundaries encourages incorrect gain and scale intuitions. |

## Recommended concept 1: fusion competes with stopping

An accelerated ion does not repeatedly receive its original energy after each
collision. It slows in matter, mostly through non-fusion interactions, while
sampling an energy-dependent fusion cross section. For a stationary tritium
nucleus, nonrelativistic two-body kinematics gives

    E_cm = m_T/(m_D + m_T) E_lab ≈ (3/5) E_lab.

Using laboratory energy directly in a center-of-mass cross-section fit moves the
reaction curve to the wrong energy. For a continuous-slowing-down straight track,
let S(E) = -dE/dx > 0 in J/m. The small-reaction-probability approximation is

    p(E_in, t) ≈ ∫[E_out to E_in] n_T σ_DT(E_cm(E))/S(E) dE.

The path integral, rather than the cross section at the entry energy alone,
sets a thick target's yield. Increasing physical thickness beyond the ion range
does not keep adding equally productive track. For appreciable attenuation,
the corresponding survival-hazard expression is 1-exp(-optical depth), still
subject to the stated trajectory and stopping approximation.
[Primary thick-target derivation](https://www.osti.gov/servlets/purl/4618039).

With a pure singly charged deuteron current I and energy E_lab = eV:

    Ndot_D = I/e
    Ndot_n = p Ndot_D
    P_beam = Ndot_D E_lab = IV
    P_fus = Ndot_n Q_DT
    Q_beam = P_fus/P_beam = p Q_DT/E_lab,     Q_DT ≈ 17.6 MeV.

These are accounting identities and a conditional yield model, not measured
Marathon efficiencies. Raising current at fixed target state increases yield
and beam heating together; it does not improve p or Q_beam. Raising energy can
increase cross section and range while also increasing energy cost per ion.
The optimum for neutrons per joule can differ from the cross-section maximum.

Best exercise: hold beam power fixed, change energy, and inspect p, ions/s,
neutrons/s and fusion-energy/beam-energy separately. Use measured or explicitly
illustrative LiT stopping and loading; n_T and S are not independent material
properties that can be changed arbitrarily while claiming a real material.

## Recommended concept 2: local intensity has a heat and lifetime price

The beam footprint, fusion-producing volume, irradiated specimen area and
cooling area are separate geometric objects. Their denominators must remain
visible. A compact neutron source can have useful local flux with modest total
fusion power; shrinking a label's volume does not increase total reactions.

    q_target = P_heat,target/A_spot
    phi_n(r) ≈ Ndot_n/(4πr²)             [isotropic point-source far field only]
    fluence = ∫ phi_n dt
    DPA ≈ ∫∫ phi_n(E,t) σ_damage(E) dE dt.

The flux approximation fails close to an extended source, for directional
emission or with substantial attenuation. DPA also depends on neutron spectrum
and material response; equal total fusion power, or even equal scalar flux,
does not guarantee equal damage exposure. Marathon identifies neutron-material
testing as a compact-source application.
[Company materials rationale](https://www.marathonfusion.com/fusion-materials/).

An appropriate conditional thermal balance is

    C_th dT/dt = P_heat,target - G(T - T_coolant).

Here P_heat,target includes the deposited fraction of incident beam energy plus
locally deposited fusion-product energy, without counting the same beam energy
twice. Approximately 3.5 MeV is born in the alpha and 14.1 MeV in the neutron at
low incident energy; those birth energies do not assert where either deposits.
Accelerator electrical losses are not automatically target heat.

Higher current, a smaller spot and higher duty factor can increase local flux,
while worsening thermal gradients, isotope retention and erosion. Tritium
loading and regeneration can change yield with time, so steady target state
must be an explicit assumption. Historical RTNS-II operating reports document
water-cooled rotating tritide targets and finite target lifetimes: target
engineering is a genuine source constraint, not decorative apparatus.
[LLNL operating report](https://www.osti.gov/servlets/purl/5222287).

Best exercise: compare the same current on different spots, then compare equal
average power with different duty factors. A lumped thermal model demonstrates
time constants, not validated LiT temperature limits or peak-stress safety.
In particular, the homepage's 20 kW/m² must not become a target beam-heat limit.

## Recommended concept 3: count useful neutrons and energy at distinct boundaries

Neutrons can be valuable for irradiation or isotope production even when the
facility consumes more electricity than its fusion reactions release. This is
an application distinction, not an exception to energy conservation.

    P_wallplug = P_beam/eta_acc + P_aux
    P_net,electric = eta_th P_recoverable,thermal - P_wallplug

Electrical output cannot be inferred from P_fus alone. For an isotope pathway,
a spectrum- and geometry-dependent production rate is

    R_product = ∫_V ∫ n_feed(x) σ_product(E) phi(x,E) dE dV
    dN_product/dt = R_product - lambda N_product - R_burnup - R_extract.

This explains why total neutron rate, flux at feedstock, desired product rate,
activity at delivery and product purity are different observables. Decay during
irradiation and processing matters. The company identifies isotope production
as an application and links author preprints; those establish proposed routes,
not independently demonstrated commercial production performance.
[Official isotope work](https://www.marathonfusion.com/radiopharma/).

For an optional future-plant extension:

    dN_T/dt = R_breed - R_fusion - R_loss - lambda_T N_T + R_external.

Recycling moves existing tritium around the plant; breeding creates replacement
tritium. Recirculation cancels from a whole-system inventory equation. Long
processing delays increase working inventory even with low net burn. Marathon's
fuel-cycle page explicitly places enriched lithium in a neutron-irradiated
blanket; this is the natural conceptual bridge from Level 1 isotope separation.
[Official fuel-cycle scope](https://www.marathonfusion.com/fusion-energy/).

The authors' isotope-economics preprint studies tokamak/mirror and blanket
scenarios; its plasma-gain parameter is not a calibrated gain for the compact
solid-target device. Its mercury/gold route also concerns neutron multiplication
in a future blanket. Do not display economic thresholds as demonstrated reactor
performance or promise a market return.
[Author analysis, current v2](https://arxiv.org/html/2512.09242v2),
[gold-neutronics preprint](https://arxiv.org/abs/2507.13461).

### Source version check

In arXiv:2512.09242v1, Eq. 51 gives
P_abs = eta_abs eta_heat P_heat, and Eq. 53 defines
f_h = P_heat/P_circ. With Q_plas = P_fus/P_abs, these imply

    P_circ = P_fus/(Q_plas eta_abs eta_heat f_h).

Eq. 54 instead prints a factor f_h in the numerator. This apparent inconsistency
is **corrected in current v2, revised 22 March 2026**: its Eqs. 42, 44 and 45 give
the reciprocal f_h factor, consistent with the derivation above. Use v2 rather
than archived v1. This review did not audit every derived result or author code.
The app should still derive its energy balance from explicit system boundaries;
the paper's future plasma/blanket gain thresholds are not calibration data for
the current solid-target source.

## Scope and evidence limitations

The viewed primary pages do not provide a complete calibrated beam/target
operating dataset, stopping table, heat-transfer validation, ion composition,
availability or demonstrated wallplug efficiency. Three Level 2 lessons can be
scientifically useful with declared conditional inputs and correctly coupled
equations. They cannot be branded a predictive Marathon digital twin.

The primary ranking is an inference from the published architecture. It should
be compared with the other independent agents' hypotheses before implementation.
No content was read from the policy-blocked deployed Mass Spinner origin.

## Read-only curriculum integration audit

Reviewed `index.html`, `src/experience-ui.js`, `src/marathon-lessons.ts` and
`web-assets/MARATHON-THREE-CONCEPTS.md` on 7 November 2026. No application code
was changed or executed in this review; root is running the isolated checks.

The Level 2 path consistently distinguishes the published compact beam–target
source from future power-plant blankets. RF creates ions; electrostatic voltage
supplies beam energy. The stationary-T energy conversion, slowing-track yield,
pure-D+ current normalization, target-area distinction, beam gain and
accelerator-only input denominator are stated correctly. Regeneration and
recycling are explicitly distinguished from creation of replacement tritium.
The toy stopping/column scan is clearly identified as a sensitivity family,
not an optimization of measured LiT stopping. No physics-blocking misleading
claim was found in these four files.

One concrete Level 1 wording defect: `index.html` says “Copper ions start at
84 u.” This confuses the copper display color with elemental copper. Say
“Copper-colored ions” or “Species B starts at 84 u”; the arbitrary ion mass
then remains physically clear.

The public curriculum's triage paragraph gives substantive reasons for
rejecting Lawson/ignition as the main compact-source framing and retaining
fuel-cycle/blanket topics as extensions. However, its “four independent
reviews” provenance is not inspectable from that paragraph. Exposing the
competing-curricula table above, or linking the independent reports and a
ranked synthesis, would better satisfy the user's request for parallel
hypotheses followed by triage. It need not add more simulator complexity.

Useful neutron production remains a qualitative lesson: no spectral sample
flux, activation/decay or product-rate dynamics is implemented. This is stated
openly, so it is an extension rather than a hidden predictive claim. None of
these teaching calculations establishes the actual company's measured yield,
cooling limit, lifetime or commercial performance.

### Final level-transition and share-link review

Read-only trace of current `experience-ui.js`, `experience-state.ts`, the level
integration in `main.js`, `index.html` and level CSS found no blocking issue.
Navigation selects `button[data-level]`; transitions invalidate active runs,
abort studies and clear the live timer. Level 1 restores the fixed source,
species, collision and resolution settings before its four share parameters.
The versioned reader validates bounds and slider steps; the copy action reads
the current controls. Nonlevel sections are hidden and the GPU animation loop
skips Levels 2 and 4. The masthead beam-target link selects Level 2 explicitly.

One-time hidden startup work remains: every initial level builds the beam
calculation and energy scan, and initializes/loads/compiles the separator GPU
scene. This is not an offline research-solver run. No blocker is inferred from
that startup cost alone. No browser render or runtime execution was verified
by this agent; this conclusion is source-level evidence only.
