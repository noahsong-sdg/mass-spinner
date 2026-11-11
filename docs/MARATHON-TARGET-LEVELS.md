# Marathon Level 2: independent target and systems hypothesis review

7 November 2026. Primary-source reading and independent dimensional/energy
derivations only; no solver, scientific calculation or code execution. This is
concept selection for a teaching module, not validation of Marathon hardware.

## Architecture actually supported by public sources

Marathon describes RF production of deuterium ions, electrostatic acceleration
to keV energies, and a solid lithium-tritide target on a cooled substrate. Its
homepage describes depositing lithium and forming a regenerable tritide layer.
These are company descriptions, not an independently measured operating point.
The public figures (1 kW fusion, 20 kW/m² power density, 10¹² n/cm²/s flux) do not
give the beam power, target heat flux, measurement geometry, duty factor or
target life needed for an engineering model. In particular, the published power
density must not be reused as incident beam heat flux.
[Company architecture](https://www.marathonfusion.com/beam-driven-fusion/),
[company homepage](https://www.marathonfusion.com/).

The small beam-target source and a future power plant with breeding/transmutation
blankets are distinct systems. Do not teach the source as an ignited thermal
plasma or imply that a compact LiT target already closes a breeding fuel cycle.

## Competing hypotheses and triage

| Candidate concept | Rank | Why |
| --- | ---: | --- |
| Fusion probability competes with beam stopping | 1 | Explains energy choice, thin versus stopping targets, why density alone is insufficient, and why most beam power becomes heat. |
| Useful neutron intensity is purchased with heat flux and target life | 2 | Explains current, spot size, target thickness, regeneration, tritium retention and availability as coupled constraints. |
| Neutron value and electrical gain are different objectives | 3 | Explains why a useful isotope/materials source can consume electricity; prevents mistaking high local power density for power-plant gain. |
| Tritium inventory and self-sufficiency | 4 | Essential for scaling, but compact-source inventory belongs inside concept 2 and future blanket breeding inside concept 3; public data do not justify a calibrated self-breeding source simulation. |
| Plasma confinement / Lawson triple product | 5 | Important for thermal power plants, but not the primary model of this solid-target source. Use to explain the architectural distinction, not as its main slider. |
| Gold transmutation | 6 | An application of neutrons and blanket transport, not a substitute for source physics. Far less explanatory for the specific compact reactor than concepts 1–3. |

Recommendation: **probability → heat/flux → useful output** as the three Level 2
lessons. Each should pose a prediction before the slider moves. Increase current,
shrink the spot, or thicken the target: which output actually changes?

## 1. A deuteron must fuse before it loses useful energy

For an atomic singly charged D⁺ beam delivered to the target,

    E₀ = e V                           [J per ion]
    Γ_D = I/e                          [ions/s]
    E_cm = m_T E_lab/(m_D + m_T)        [about 0.6 E_lab]
    S(E) = −dE/dx > 0                  [J/m]
    τ = ∫ n_T(x) σ_DT(E_cm(x)) dx       [dimensionless]
    p = 1 − exp(−τ)
    R_DT = Γ_D p                       [reactions/s, also source n/s]

This assumes deterministic slowing, D–T as the only removal channel and fixed
target composition. Real straggling, molecular-ion contamination and reaction
angular distributions need additional data. The current here is delivered
atomic-ion current, not RF power or gas throughput.

For a homogeneous stopping target,

    τ = ∫₀ᴱ⁰ n_T σ_DT(0.6 E) / S(E) dE.

For a sufficiently thin target, p ≈ n_T L σ_DT(0.6 E₀). The thin expression must
not be applied at unchanged E₀ through an arbitrarily thick layer. Conversely,
adding material beyond the ion range does not expose that same ion to unlimited
additional tritium. If composition is fixed and both n_T and S scale with density,
the fully stopped integral approximately cancels the density scaling. A denser
target shortens the stopping distance; it does not automatically increase yield
per incident ion. This cancellation is an inference from the stated model.

The optimization variable is a yield integral, or yield per electrical joule,
not the peak value of σ at the incident energy. Sliders for target column and
stopping fraction cannot be treated as independently calibrated material facts.
The IAEA documents continuous slowing in thick neutron targets and the strong
heat-removal constraint; its cited examples use other materials/reactions, not
Marathon's LiT calibration.
[IAEA TECDOC-1743](https://www-pub.iaea.org/MTCD/Publications/PDF/TE-1743_web.pdf).

## 2. More current raises output and heat; a smaller spot redistributes both

At fixed beam energy, composition and undepleted target, R_DT and incident beam
power both scale linearly with I:

    P_beam = I V = Γ_D E₀              [W]
    q'' = P_target/A_spot             [W/m²]
    ΔT ≈ q'' (L_t/k_t + L_b/k_b + 1/h + R_contact'').

The last expression is a steady 1D thermal-resistance teaching model. L/k and
1/h have units m² K/W. It omits lateral spreading, nonuniform deposition,
temperature-dependent conductivity, transients and coolant limits. It must not
predict the temperature or lifetime of Marathon's target without its inputs.

For complete stopping, all charged products retained, and escaping neutrons,
the exact energy-accounting identity is

    P_target = P_beam + R_DT Q_DT − P_neutron,out − P_other,out.

Product laboratory energies include incident projectile kinetic energy. A more
detailed stopping-plus-products model must subtract the kinetic energy removed
from the stopping population by fusion; otherwise that small reacting fraction
of beam energy is counted twice. At low burn probability, the common practical
approximation is P_target ≈ P_beam + R_DT·3.5 MeV when neutron energy is
approximated by 14.1 MeV and Q_DT by 17.6 MeV. Those nominal product energies
neglect beam-energy and angular kinematic corrections.

Shrinking A at fixed I does not increase total R_DT in this linear model. It
raises q'' and source areal emission. Flux at a separate sample depends on
distance, extended-source geometry, angle, attenuation and scattering; it is not
generally R_DT/A_spot. The isotropic point-source approximation is φ ≈ R_DT/(4πr²)
only where that source and transport approximation is suitable.

Heating and target retention are coupled, not merely a separate cooling score:

    dN_T/dt = loading + breeding − R_DT − desorption − sputtering − λ_T N_T.

Those loss rates require material and irradiation measurements. Target layers
also create a thickness tradeoff: too thin loses useful reaction path; excess
thickness adds inventory and thermal resistance after yield has saturated.
In-situ regeneration may recover target performance but also imposes downtime
and recovery constraints. Do not invent a LiT temperature-limit or target-life
law by importing titanium-tritide data.

The historical RTNS-II source is a useful *different-material* negative control:
its primary LLNL report explicitly describes beam stopping heat, tritium loss,
rotation and internal water cooling. It establishes that cooling/retention are
real beam-target design constraints, not Marathon's numeric performance.
[LLNL RTNS-II target report](https://www.osti.gov/servlets/purl/5360420),
[LLNL source/lifetime report](https://www.osti.gov/servlets/purl/5222287).

## 3. A productive neutron source can be an electricity consumer

Define the energy boundary before using Q:

    P_fus = R_DT Q_DT
    Q_beam = P_fus/P_beam = p Q_DT/E₀
    P_wall = P_beam/η_acc + P_aux
    P_net,e = η_th P_heat,recoverable − P_wall.

Current cancels from Q_beam in the linear fixed-target limit. Increasing current
can make more product without making the beam energetically more efficient.
If the entire system captures all incoming beam energy and nuclear energy,
P_heat,recoverable ≤ P_beam + P_fus. Recovering beam energy as heat is allowed,
but it is recycled electrical input, not additional fusion output. Setting p=0
must give negative net electric output for physical efficiencies and auxiliaries.

Source rate R_DT, sample flux φ(E), isotope production, fusion power and net
electric output must be different readouts. An isotope reaction rate is

    R_product = N_feed ∫ φ(E) σ_product(E) dE,

subject to depletion, daughter decay, competing channels and recovery. Annual
useful production also depends on operating availability. The conceptual
economic test compares annualized cost / usable neutron output with realized
product value, not just P_fus. Public price assumptions cannot certify profit.

Marathon's own neutron-economics paper makes availability, flux, gain and capital
intensity distinct. It explicitly restricts LCOE to net-electric systems and
separates valuable-neutron applications from electricity production. Its
performance/cost projections are modeled scenarios, not measured compact-source
parameters. This is a strong reason to choose this third concept over a lesson
framed only around Q > 1.
[Parisi & Schiller, 2026](https://arxiv.org/html/2603.00835v1).

## Minimal honest interactive Level 2

1. **Will it fuse before it stops?** Plot σ versus energy beside cumulative
   reaction probability along a declared stopping trajectory. Vary energy and
   target depth; show thin and stopping-target limits. Use explicit illustrative
   stopping inputs until material data are established, not a Marathon preset.
2. **What happens when we turn it up?** At fixed energy/probability, vary current
   and spot area. Show source n/s, incident W, W/m² and a conditional temperature
   rise. A thickness/range marker should expose wasted inventory beyond range.
3. **What is this machine producing?** Show a source-neutron ledger and system
   energy ledger separately. Let users compare neutron/material output with
   electrical consumption; show availability as a simple multiplier on annual
   output. Keep prices and unknown isotope conversion probabilities out of the
   default scientific claim.

A statement of three missing inputs should remain adjacent: no disclosed
Marathon beam operating point, no LiT stopping/retention/thermal calibration in
this app, and no qualified neutron-transport/product-recovery model. That is a
boundary for fidelity, not a reason to prevent an honest teaching experience.
