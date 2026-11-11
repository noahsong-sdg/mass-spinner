# Marathon Level 2: independent yield and tradeoff review

Primary sources checked 7 November 2026. This is an independent conceptual
review, not a device simulation or an operating-point validation. No scientific
code or dependency installation was executed. Existing source modules and scope
notes were read; no application or backend files were changed.

## Architecture and evidence boundary

Marathon currently describes an RF deuterium ion source, electrostatic beam
acceleration and a cooled solid lithium-tritide target. The beam fuses with
tritium in the target, rather than constituting a thermal fusion plasma.
[Official beam-driven description](https://www.marathonfusion.com/beam-driven-fusion/).

The homepage separately presents this compact neutron source and a future
commercial fusion-plant scene with blankets, fuel systems and external heating.
It displays 1 kW fusion power, 20 kW/m² and 10¹² n/cm²/s, without the complete
operating conditions and uncertainty needed to calibrate a simulator. Treat
those as company-displayed figures, not independent measurement verification.
[Company homepage](https://www.marathonfusion.com/).

The gold paper studies a simulated tokamak blanket, not a validated blanket on
the compact beam-target device. Its fuel self-sufficiency and electricity
claims must not be imported into a model of the present neutron source.
[Author paper, abstract and sections 2–3](https://www.marathonfusion.com/alchemy.pdf).

## Competing hypotheses and triage

These are explanatory choices, not objectively unique rankings.

| Candidate organizing idea | Rank | Reason |
| --- | ---: | --- |
| Fusion probability competes with stopping | 1 | Explains beam energy, target loading, thickness, reaction yield and why reaction energy alone says little about performance. Supplies several falsifiable slider predictions. |
| Neutron throughput is constrained by heat and sustained target condition | 2 | Connects current and spot size to an engineering bottleneck without treating compactness as free gain. Couples instantaneous production to useful operating time. |
| Useful neutrons, fusion power and net electricity are different outputs | 3 | Explains why a neutron source can be useful without net energy gain and why source strength is not sample flux or isotope production. Keeps near-term and future-plant claims separate. |
| Lawson triple product | Reject as the first organizing principle here | A thermal, confined plasma's density-temperature-confinement balance describes a different architecture. It can be taught later for comparison. |
| Maximum D–T cross section | Subordinate to rank 1 | A useful local input, but not the same objective as integrated yield, neutrons per joule, wall-plug efficiency or sustained throughput. |
| Space-charge/perveance limits | Advanced extension of rank 2 | Important for real current extraction; insufficient company geometry is public to make it the principal calibrated lesson. |
| Tritium breeding and gold neutron multiplication | Advanced extension of rank 3 | Central to proposed future blankets, but not a demonstrated closed fuel cycle of the current compact device. |

Alternative triads considered: (a) cross section / stopping / beam gain makes
three mathematically connected lessons but neglects target endurance; (b)
Lawson / confinement / ignition teaches generic thermonuclear fusion and risks
misidentifying this machine; (c) fusion / breeding / transmutation captures the
company's broader portfolio but skips the compact source's immediate losses.
The selected triad spans microscopic probability, local engineering and useful
system output.

## 1. Each ion has a limited opportunity to fuse before it slows

For singly charged deuterons accelerated across voltage V,

    E₀ = eV,                 incident ions/s = I/e.

For a cold stationary tritium target, nonrelativistic two-body kinematics give

    E_cm = m_T/(m_D + m_T) E_D ≈ (3/5) E_D.

Thus a 100 keV deuteron samples a 60 keV centre-of-mass cross section. RF makes
the ions in the source; the accelerating voltage establishes the beam energy.
A source plasma temperature and a directed beam energy are different quantities.

Let S(E,x) = −dE/dx > 0 be total stopping power, including interactions that do
not fuse, and let n_T(x) be the local tritium density. In straight-path,
continuous slowing with no other beam-removal channel, reaction optical depth is

    χ = ∫ n_T(x) σ[E_cm(x)] dx,
    p_f = 1 − exp(−χ),
    R_n = (I/e) p_f.

For a homogeneous target with a prescribed material stopping curve,

    χ(E₀,E_out) = ∫[E_out to E₀] n_T σ(0.6E) / S(E) dE.

Units: n_T is m⁻³, σ is m², S is J/m if E is in joules, so χ and p_f are
dimensionless. For rare fusion, p_f ≈ χ. The classic thick-target derivation
integrates the cross section divided by stopping as the ion slows, rather than
multiplying one incident-energy cross section by an unlimited path length.
[Primary thick-target report, equation 1](https://www.osti.gov/servlets/purl/4618039).
The web search extracted the report text/equation; a subsequent direct PDF open
returned HTTP 502, so a full PDF reading is not claimed.

Thin-target/no-stopping limit: χ = N_T σ(0.6E₀), where N_T = n_T L is the
tritium column in m⁻². A thick target instead samples many energies and yields
no extra deuteron path after that deuteron has stopped. More substrate thickness
is not more useful reacting thickness.

**Surprise worth teaching: density can cancel.** For fixed composition, suppose
n_T = f_T n and S(E) = n ε(E), where ε is stopping cross section in J m².
Then, for a fully stopping target with otherwise unchanged material physics,

    χ(E₀) = ∫[0 to E₀] f_T σ(0.6E) / ε(E) dE.

The bulk density n cancels. Increasing density shortens the stopping distance
and concentrates deposition; it need not increase probability per ion. This is
an analytic scaling consequence under the stated assumptions, not a measured
Marathon result. Changing composition/loading can change both f_T and ε;
changing scattering, temperature or target depth can break this simple scaling.

**Optimization is a ratio problem.** At fixed beam current, maximize p_f for
neutron rate. At fixed incident beam power, maximize p_f/E₀. With accelerator
efficiency η(E₀), the corresponding accelerator-electric figure is ηp_f/E₀,
before source, cooling and vacuum overhead. In the rare-fusion fully stopping
limit Y(E₀) = ∫₀ᴱ⁰ f(E)dE, an interior maximum of Y/E₀ satisfies

    E₀ Y′(E₀) = Y(E₀),

which says the next unit of beam energy must produce as much yield as the
average of the earlier units. It does not say to stop at the cross-section peak.
An independent primary report explicitly treats specific yield Y/E as a
practical objective distinct from yield alone.
[Gas-target report, yield and specific-yield derivation](https://www.osti.gov/servlets/purl/4689161).
Its search text was accessed; direct PDF retrieval returned HTTP 502. Its gas
target numerical optimum is not transferable to lithium tritide.

## 2. More current creates more neutrons and more heat; focusing is not free

For a fixed, undepleted target and unchanged beam-energy distribution,

    R_n ∝ I,       P_beam = (I/e) E₀ = IV,
    q″ = P_deposited / A.

Holding I, E₀ and target state fixed while reducing illuminated area A leaves
total R_n unchanged in this model. It raises deposited heat flux and beam
current density. Real yield may then fall if the changed target temperature,
loading, sputtering or damage changes p_f. A smaller source also changes
near-field sample geometry; it does not by itself determine flux everywhere.

Historical target literature links neutron output to isotope loading and beam
heating; the material and its quantitative temperature limits differ from LiT.
Do not borrow titanium-tritide retention temperatures as Marathon's LiT limits.
[IAEA TECDOC 913, target discussion around p.183](https://www-pub.iaea.org/MTCD/Publications/PDF/te_913_web.pdf).

For an illustrative steady 1D conduction/cooling estimate,

    T_surface − T_coolant ≈ q″ (L/k + 1/h + R_contact),

where L/k and contact resistance have units m² K/W and h is W/(m² K).
This relation requires a declared layer geometry and boundary conditions;
it does not predict target life, cooling failure, phase change or regeneration.
For pulsed operation the peak and time-averaged heat flux must be distinguished.

Useful throughput is time-integrated production, not the best instantaneous
point: N_n = ∫R_n(t)dt. Duty cycle and availability multiply output only when
their definitions and target-recovery assumptions permit that simplification.
Marathon describes a deposited, cooled LiT layer that can be regenerated in situ;
public architecture alone does not specify a validated replenishment-rate law.

Space charge is a later limit: ideal planar, zero-injection-velocity extraction
has j_CL = (4ε₀/9)√(2e/m_D)V^(3/2)/d². Real plasma extraction has geometry,
meniscus, emittance and supply limits. The formula should be an explicitly
idealized comparison, not a universal slider clamp or inferred Marathon limit.
[CERN ion-source chapter, §3.8–3.9](https://cds.cern.ch/record/1517333/files/CERN-2013-001-p369.pdf),
[CERN extraction caveats](https://cds.cern.ch/record/1643436/files/arXiv%3A1401.3951.pdf).

## 3. Count useful neutrons and energy at the correct boundary

Each D–T fusion has approximately 17.6 MeV nuclear Q, carried mainly by the
neutron and the alpha. The source rate and nuclear gain are

    P_fusion = R_n E_Q,
    Q_beam = P_fusion/P_beam = p_f E_Q/E₀.

At an illustrative E₀ = 100 keV, Q_beam = 176 p_f. Reaching Q_beam = 1 alone
would require p_f ≈ 0.00568, or 0.568%. This is an identity/threshold for a toy
beam, not a Marathon operating point or proof that this architecture can attain
it. A large energy release per successful reaction does not compensate for
arbitrarily rare success. The source reaction Q and implementation convention
were reopened in
[ASCOT5's Bosch–Hale source](https://ascot4fusion.github.io/ascot5/_static/doxygen/boschhale_8c_source.html).

The accelerator input is P_beam/η_HV. Complete facility input additionally
includes RF ion production, vacuum, cooling and other auxiliary loads. Nuclear
power divided by accelerator electric input is still not net electricity.
A net-electric ledger needs recoverable heat, conversion losses and the full
facility boundary. Incident beam energy that later becomes heat must not be
counted a second time as newly released nuclear energy.

An externally powered neutron source can nevertheless produce useful irradiation
or isotopes. Accelerator neutron generators are an established applied category,
not failed versions of an ignited plasma.
[IAEA neutron science facility](https://nucleus.iaea.org/sites/nuclear-instrumentation/Pages/neutrons.aspx).
Marathon describes medical-isotope pathways and materials irradiation as its
applications; these descriptions do not by themselves verify delivered yields
or qualify a simulator.
[Official isotope page](https://www.marathonfusion.com/radiopharma/),
[official materials page](https://www.marathonfusion.com/fusion-materials/).

Source strength R_n [s⁻¹] is not local spectral flux Φ(E,r) [m⁻² s⁻¹ per energy].
A sample's reaction rate is

    R_X = N_X ∫ Φ(E,r) σ_X(E) dE

for a uniform thin sample; finite geometry, self-shielding, burnup and product
decay need transport/activation equations. D–T beam-target neutrons also have
energy-angle dependence, so a single “14 MeV” label is an approximate scale.
Neither R_n/A_beam nor an isotropic point-source estimate is a calibrated
detector or sample flux for a real extended source.

## What the existing teaching engine can honestly support now

Traced path: `setupFusionLaboratory → FusionBeamConfig → simulateFusionBeam`.
The nuclear cross section is sourced Bosch–Hale; the target column and linear
fractional stopping law are independent assumed inputs. The existing energy
ledger distinguishes layer heat, transmitted beam energy and conditional heat
if a substrate stops the rest. That is useful educational machinery and already
labels its physical limits. It is not a calibrated LiT stopping calculation.

Recommended three lesson interactions:

1. Scan beam energy and overlay cross section, integrated toy p_f and toy p_f/E₀.
   Show E_lab and E_cm simultaneously. At fixed fractional loss and column,
   this scan compares an imposed family of linear slowing laws; it is **not**
   optimization of a single real material's stopping curve. True material
   optimization needs S(E), composition, depth and scattering data.
2. Change current and area separately. Predict first: current scales source
   count and power together; area changes heat flux while toy source count stays
   fixed. Retain conditional substrate heating so transmitted energy does not
   disappear from the assembly budget. Temperature/lifetime should remain
   uncomputed until thermal/material inputs are supplied.
3. Display ions → fusion probability → produced neutrons alongside beam power,
   nuclear Q power and accelerator input. Label production versus sample flux,
   and leave neutron transport, breeding, isotope yield and net electricity as
   separate future modules.

Do not silently extrapolate the supported cross-section fit to zero energy to
claim a full stopping-target solution. Current controls stay within the declared
fit range; the unsupported fully stopped tail remains an explicit limitation.
Further physical inputs needed include actual D⁺/molecular-ion fractions,
energy/spread/angle distributions, LiT density/composition/loading profiles,
stopping and scattering data, heat-transfer boundaries, replenishment/depletion,
and independently calibrated neutron spectra/geometry measurements.

## Read-only review of the implemented lessons

Reviewed `src/marathon-lessons.ts`, `src/fusion-ui.js`, the rendered lesson
markup in `index.html`, `web-assets/MARATHON-THREE-CONCEPTS.md`, and the
unchanged `src/fusion-reactor.ts`. This was a source-level physics review;
runtime, numerical and browser checks remain the root agent's responsibility.

No numerical or energy-ledger blocker was found in the new interpretation
layer. Its 20–500 keV scan with the permitted loss up to 0.9 remains above
the fit's lower boundary: the lowest exit centre-of-mass energy is 1.2 keV.
The plotted accelerator-joule yield is eta times probability divided by
incident joules per ion. Assembly heat uses the existing conditional substrate
ledger, while incident beam load is separately labeled. The visible page
explicitly states that fixed toy column/fractional slowing does not optimize
one physical LiT material. No new calibrated device, net-electric or sample
flux claim was found.

Concrete interpretation gaps to fix before closeout:

1. The first experiment says the cross-section peak "does not optimize
   either" probability or accelerator-joule yield. At the permitted zero-loss
   setting, probability is exactly `1-exp(-column*sigma(0.6E))`; maximizing
   probability therefore does maximize the cross section. Use "does not
   generally identify the best yield or neutrons per joule" instead.
2. The displayed energy-variable optical-depth integral divides by stopping
   power, so it is singular when the supported fractional loss is zero. The
   backend handles this limit correctly. Show the path integral as the primary
   equation or explicitly add the no-slowing limit `chi=N_T*sigma(0.6E0)`.
3. The third card displays a full facility-input equation with `P_aux`, but
   its gain readout divides by accelerator input alone. The metric labels and
   longer document distinguish these correctly; an immediate card note that
   auxiliary loads are omitted would remove the remaining ambiguity.
