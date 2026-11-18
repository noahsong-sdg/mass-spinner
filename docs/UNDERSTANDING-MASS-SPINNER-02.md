# Understanding Mass Spinner · 2

## What are we trying to predict?

Can rotation make a sample near the cylinder’s axis richer in lithium-6 than
the starting mixture? We move light ⁶Li and heavy ⁷Li atoms; we do not change
one isotope into another. **We want both enrichment and useful inventory.**

Imagine 76 light and 924 heavy atoms: 7.6% light. A sample with 10 light and
90 heavy atoms is 10% light, but recovers only 10/76 of the light atoms.
These invented counts distinguish **purity** from **recovery**.

Marathon’s [lithium-enrichment application](https://www.marathonfusion.com/fusion-energy/)
motivates this question: lithium in fusion blankets helps produce tritium fuel.
The centrifuge processes material; it is not the fusion reactor. This playground
is **not a reconstruction** of Marathon’s proprietary apparatus.

Follow one chain: **rotation sorts masses → electrical drive creates rotation
→ losses and heating limit it → time and collection determine the sample**.
Use Coupled separation and four plots: Composition, Ion–neutral spin-up,
Drive & work, and Purity & recovery. [Every menu option is explained below](#views).
The [first guide](UNDERSTANDING-MASS-SPINNER.md) introduces ions and neutrals;
the separate [Start here walkthrough](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/start.html)
lets you try the controls alongside this explanation.

### First, change one real control

In **Start here**, choose **Can the current make the gas turn?**

1. Choose **Start from rest & edit current**, set **Radial discharge current**
   to **0 A**, wait for Updating to finish, then choose **Show end-of-run speeds**.
2. Repeat with **0.03 A**, leaving other inputs unchanged. Ions now accelerate;
   collisions make neutrals follow. Compare at the same physical time.

The preparation clears earlier current steps and restarts from rest. An ordinary
current edit after time zero instead changes the drive of already moving gas.
Click a control’s number to enter an exact value. With thermal evolution off,
this experiment changes speed, not temperature. [§4 explains why](#momentum).

## 1. Why does rotation separate masses?

First ask where atoms would settle **if rotation were already available**.
Like gravity making air denser at lower heights, rotation favors one region:
the wall. Thermal motion opposes that sorting. Heavier atoms develop a steeper
equilibrium density gradient, so the inner gas becomes relatively light-rich.

Start with ideal neutral gas at uniform temperature and **rigid rotation**:
every radius has angular speed Ω, measured in radians per second. Farther from
the axis, atoms travel farther each turn, so tangential speed is

```math
v_\theta(r)=\Omega r.
```

At equilibrium, the density of either species s obeys

```math
\frac{n_s(r)}{n_s(0)}
=\exp\!\left(\frac{m_s\Omega^2r^2}{2k_BT}\right).
```

Here r is radius, n atoms per volume, m mass per atom, T temperature in kelvin,
and k_B Boltzmann’s constant. exp means e raised to the bracketed number.
Each species’ fixed inventory sets its normalization.

**Both densities rise outward; separation means their ratio changes.** Local
composition asks what fraction of atoms here are light:

```math
x_\ell(r)=\frac{n_\ell(r)}{n_\ell(r)+n_h(r)}.
```

A radial composition profile plots this fraction against distance from the axis.
The center can be light-rich yet contain fewer light atoms per volume than the wall.

**Try it:** in the example above, compare No spin, Spinning and Warmer.
“6×” means six times that species’ axis density, not 6% of the mixture.
Then show your end-of-run composition. Read “In 1,000 atoms here…” and probe
axis and wall. Compare with the feed, **not 50%**. The light-percentage axis is
zoomed; the heavy percentage is the remainder. Species density instead uses
**1× = that species’ volume mean**. The example assumes equilibrium; your run may not.

<details>
<summary>Where does the exponential come from?</summary>

Circular motion needs inward acceleration. Outward-increasing pressure supplies
the inward pressure force. For steady neutral circular flow,

```math
-\frac{dp}{dr}=-\rho\frac{v_\theta^2}{r},
\qquad\text{so}\qquad
\frac{dp}{dr}=\rho\Omega^2r.
```

p is pressure and ρ mass per volume. For each ideal neutral species at uniform
temperature and diffusive equilibrium, substitute its partial pressure:

```math
p_s=n_sk_BT,\qquad \rho_s=m_sn_s,
\qquad
\frac{d\ln n_s}{dr}=\frac{m_s\Omega^2r}{k_BT}.
```

Integrating from the axis to r gives the exponential. This equilibrium balance
is not a complete transient momentum equation.

</details>

## 2. How strong is the separation?

A correctly sloping curve could still mean negligible enrichment. To measure
sorting independently of overall density, compare the heavy/light ratio at
the wall with that at the axis:

```math
\alpha=\frac{[n_h/n_\ell]_{r=R}}{[n_h/n_\ell]_{r=0}},
\qquad
\ln\alpha=\frac{(m_h-m_\ell)\Omega^2R^2}{2k_BT}
=\frac{\Delta m\,v_{\mathrm{wall}}^2}{2k_BT}.
```

R is vessel radius; v_wall = ΩR is gas speed, **not the speed of the stationary
vessel**. The exponent compares rotational energy associated with the mass
difference against thermal energy. α = 1 means no ratio contrast; α = 2 means
the wall’s heavy/light ratio is twice the axis’s, not twice the product purity.

For Δm ≈ 1 atomic mass unit, 1,000 m/s and 500 K, α ≈ 1.13: a 13% ratio
contrast, not 13 percentage points of enrichment. These are illustrative inputs.

**Predict, then try:** double rotation at fixed temperature: the exponent
quadruples. Double temperature at fixed rotation: it halves. The comparison
buttons draw ideal equilibrium overlays; they do not change your run or predict
the power needed. This neutral-gas result does not describe every charged-particle
filter in the plasma separation tutorial.

## 3. How do we spin a gas without spinning a drum?

An equilibrium speed is an assumption, not a drive mechanism. Electrodes and
a magnetic field must produce that motion. The electrodes stay still;
**current crosses the gas radially, while the field points along the axis**.
Their interaction pushes charged gas around the cylinder:

```math
\mathbf{f}=\mathbf{J}\times\mathbf{B}.
```

f is force per volume, J current per area and B magnetic field. The force is
perpendicular to both; reversing current reverses it. Neutrals feel no direct
Lorentz force: collisions transfer the ions’ rotation to them.

**Look:** step through Current → Turn ions → Turn gas in the diagram.
Compare cylinder and end views. Dots represent populations, not microscopic orbits.

## 4. What sets the rotation speed?

Force produces acceleration, not an instant speed. We therefore track angular
momentum L. Moment of inertia ℐ measures how hard a mass distribution is to
spin; moving mass outward increases it. For one rigidly rotating population,

```math
L=\mathcal{I}\Omega,
\qquad
\frac{dL}{dt}=\tau_{\mathrm{in}}-\tau_{\mathrm{loss}}.
```

τ is torque; d/dt means change per second. The browser uses two populations:

```math
\frac{dL_i}{dt}=\tau_{\mathrm{drive}}-\Gamma(\Omega_i-\Omega_n),
\qquad
\frac{dL_n}{dt}=\Gamma(\Omega_i-\Omega_n)-\tau_{\mathrm{wall}}.
```

The collision-rate control sets Γ = ℐᵢνᵢₙ, in kg·m²/s. Ion inertia stays
prescribed; neutral inertia evolves. Collisions slow leading ions and speed
neutrals by equal opposite torques, so they cancel in total angular momentum.
Wall drag removes it: τ_wall = ν_wall L_n, with ν_wall in s⁻¹.
Stronger coupling reduces lag; it need not raise steady neutral speed.

For radial current I through an annulus in uniform axial field B,

```math
\tau_{\mathrm{drive}}=\frac{IB}{2}(R^2-r_{\mathrm{in}}^2).
```

I is current, distinct from inertia ℐ. Integrating the radial strip torque
rIB dr between the driven radii gives this lever arm. It assumes that geometry.

**Try it:** replay spin-up, then cut power. Ions initially lead; removing drive
does not instantly stop the gas. Angular momentum follows **Drive minus wall
impulse**. Gas inertia shows redistribution feedback: at fixed L, greater
inertia means slower rotation. Constant speed requires steady inertia as well
as balanced torques.

For a fresh comparison, pin A, change one input, choose **New run**, and compare
at the same physical time. Current edits after zero, even while paused, insert
a drive step; an endpoint edit extends the run. Replay preserves those steps.
Collision and drag edits start a new trajectory.

## 5. Where does the energy go?

More current can increase rotation **and heating**. Because temperature weakens
separation, we need an energy account before calling stronger drive better.
Mechanical power turns ions; electrical resistance produces heat:

```math
P_{\mathrm{mechanical}}=\tau_{\mathrm{drive}}\Omega_i,
\qquad
P_{\mathrm{Ohmic}}=I^2R_{\mathrm{electrical}}.
```

Power is energy per second. At fixed geometry and conductivity, doubling current
doubles torque but quadruples resistive heat. Resistance here excludes the
motion-induced voltage; total drive power also supplies mechanical work.
Collisions dissipate relative rotation:

```math
P_{\mathrm{slip}}=\Gamma(\Omega_i-\Omega_n)^2.
```

Friction torque times relative speed gives the nonnegative square. Wall drag
also dissipates rotation. Redistribution changes kinetic energy K = L²/(2ℐ):
the thermal model deposits **signed redistribution work** in the gas. Outward
motion at fixed L releases energy; inward motion can draw heat. This is a
reduced-model closure, not resolved fluid momentum and energy.

For the closed vessel, the intended continuous energy account is

```math
\frac{d}{dt}(K_{\mathrm{rotation}}+U_{\mathrm{gas}}+U_{\mathrm{wall}})
=P_{\mathrm{mechanical}}+P_{\mathrm{Ohmic}}-P_{\mathrm{cooling}}.
```

U is thermal energy. Slip and wall friction convert energy internally; their
heat destinations are assumptions. The finite-step ledger separately subtracts
numerical damping, which should shrink with refinement; it is not physical heat.

**Try it:** Drive & work curve height is energy in joules; curve slope is power
in watts. Ohmic power is a separate readout. Work can rise while temperature
stays fixed: the default bath assumes thermal control. Enable **Evolve gas &
liner temperature** to explore heating versus cooling and its effect on separation.
This does not solve separate electron/ion temperatures or ionization.

## 6. Why do we need time and collection, too?

Fast rotation does not guarantee separation: atoms need time to redistribute.
Diffusion spreads a distance roughly √(Dt), giving the scale

```math
t_{\mathrm{diffusion}}\sim\frac{R^2}{D}.
```

D is diffusivity in m²/s. Boundaries and rotation also matter; this is not an
exact settling time. **Rewind Composition** to see whether your run approaches
equilibrium. Longer duration permits redistribution without changing the
fixed-speed, fixed-temperature equilibrium itself.

Even an enriched region might contain little useful material. Keeping all gas
inside a radius gives two distinct measures:

```math
\mathrm{purity}=\frac{N_{\ell,\mathrm{inside}}}
{N_{\ell,\mathrm{inside}}+N_{h,\mathrm{inside}}},
\qquad
\mathrm{recovery}=\frac{N_{\ell,\mathrm{inside}}}{N_{\ell,\mathrm{whole\ vessel}}}.
```

N counts atoms. A smaller inner cut generally raises purity but lowers recovery.
These are closed-inventory counts, not outlet flow or kilograms per hour.

**Try it:** Show end-of-run cuts selects the endpoint; Probe collection curve
keeps your selected time. Click the curve or use arrow keys; Home/End select
axis/wall. Read the probe values below it. The probe does not move the 3D cut marker;
the **Inner collection radius / a** setup slider instead starts a new run.
At the wall, purity equals feed and recovery is one. Empty cuts have undefined
purity; an absent light species has undefined recovery.

## Why these pieces, and what is still missing?

Drive supplies torque; torque changes rotation; work can heat gas; rotation
and temperature set the sorting preference. Transport time and a collection
cut turn that preference into a sample. Omitting a link can reverse a claim
such as “more current improves separation.”

The browser uses bulk angular speeds, prescribed transport and gas-only inputs,
not a demonstrated sustainable operating point. It does not solve shear,
meridional circulation, phase exchange or discharge sustainment. The separate
research solver does not automatically replace it.

**Verification** checks conservation and known limits; **convergence** checks
smaller cells and timesteps; **validation** checks matched measurements without
refitting. Passing the first two does not establish the third.
The [public-data assessment](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/qualification.html)
records unresolved argon-profile disagreement, not validation of Marathon’s
machine or lithium enrichment. Use this model to explore conditional mechanisms.

## What do the menu options mean?

The **Gas view** menu changes how the accepted result is displayed. It does not
turn optional thermal physics on or off; that is done in Controls.

| Gas view | What you are looking at | What it cannot establish |
|---|---|---|
| Equilibrium reference | A fixed-temperature equilibrium distribution using the bulk reference's endpoint speed, with uniform-inertia reference mechanics | Not the actual end-of-run coupled distribution or its time to settle |
| Coupled separation | The evolving coupled run; fast azimuthal motion is averaged into rings so radial redistribution can be watched over seconds | Rings are weighted populations, not resolved particle trajectories |
| Coupled spin-up | The same accepted coupled solution, slowed so ion and neutral turning can be seen | Not a different collision solver or a switch that freezes species transport |
| Flow · reference | Reference rotation and schematic throughput packets, using the pumping calculation | Not solved inlet/outlet fluid motion or its feedback on the rotor |

For an accepted coupled run, changing these views changes the presentation,
not the computed history. The **physical-time slider** selects seconds of that
history. “1 s screen = …” is the visual playback scale. Use m/s readouts rather
than counting screen revolutions. Reference views use reference states instead
of the evolving coupled history; changing between them is not a controlled
physics comparison.

Play/Pause changes playback. Rewind returns to time zero. New run starts a
fresh experiment with the current settings. Cut power inserts a current change
at the selected time; it does not delete the earlier driven history.

The **Plot** menu changes the question asked of a result. Time-history plots
grow with the clock; a radius profile is a snapshot across the vessel at the
selected time; a parameter scan compares hypothetical settings. A scan's
horizontal axis is not playback time.

| Plot | Question it answers and how to read it |
|---|---|
| Separation over time | At the chosen cut, how do light purity and recovery develop? Compare with the conditional equilibrium reference; it is not an extraction rate. [§6](#collection) |
| Composition | What percentage here is light isotope? Radius is horizontal; the light percentage is zoomed vertically. The heavy percentage is the remainder. [§1](#composition) |
| Ion–neutral spin-up | How fast does each population turn? Time is horizontal; speed at the model's outer radius is in m/s. [§4](#momentum) |
| Drive & work | Where has mechanical input energy gone? Height is joules, slope is watts; Ohmic power is a separate readout. [§5](#energy) |
| Temperature | How do mean gas and liner temperatures evolve? Thermal model must be enabled for evolution; otherwise the gas is a fixed-temperature bath. [§5](#energy) |
| Temperature profile | Where is heat concentrated across radius? Requires a radial liner; a gas curve additionally requires Spatial mixture. These are cell temperatures, not axial structure. Planned guide 03. |
| Species energy profile | How much internal energy is in each species in each gas cell? Requires Spatial mixture. More energy can mean more atoms, not a higher species temperature: both share the local temperature. Planned guide 03. |
| Gas pressure profile | Where is local ideal-gas pressure high? Requires Spatial mixture; it uses local number density and temperature, not a solved local radial force balance. Planned guide 03. |
| Angular momentum | Does rotation gained equal drive impulse minus wall impulse? Collision transfer cancels in the total. [§4](#momentum) |
| Gas inertia | Has gas moved farther from the axis, making the same angular momentum turn it more slowly? This is a time history, not a second speed curve. [§4](#momentum) |
| Species density | How crowded is each isotope relative to its own volume-average density? 1× means that isotope's mean density. In coupled views this is the evolving profile; in reference views it is equilibrium. [§1](#composition) |
| Purity & recovery | For each possible cut radius, what percentage of the selected inventory is light, and what fraction of all light atoms is retained? This is a radius scan, not outlet throughput. [§6](#collection) |
| Countercurrent stages | Can ideal routing through repeated stages improve purity, and what recovery/circulation does it cost? Fixed feed stage and assumed equal turnover; not a transient plant simulation. Planned guide 04. |
| Differential pumping | How do rotation, pump speed and inlet conductance affect reference partial pressures and gas load? Select the Differential pumping application; no open-flow rotor feedback is solved. Planned guide 04. |
| Magnetic leverage | At the same reference torque, could stronger B reduce resistive heat? Current is adjusted in this hypothetical scan: it is not a fixed-current experiment. Planned guide 03. |
| D–T fuel inventory | How much unburned fuel is tied up by an assumed burn fraction and processing delay? Separate steady fuel-loop scenario; not a burn prediction from the lithium centrifuge. Planned guide 05. |
| Lithium vapor & surfaces | How does equilibrium lithium vapor pressure depend on surface temperature? A saturation check, not a condensation rate, surface chemistry calculation or lifetime prediction. Planned guide 03. |

### Which controls actually change physics?

**Controls** and the sliders in **Inspect** share the same physical inputs.
Selecting a component, changing **View**, or scrubbing time does not rerun the
solver. Editing a physical input does. An edit can leave the new run paused at
0 s; use **Play** or the component's response button to see later behavior.

Not every input affects every plot. Some plots scan many possible settings:
the curve can stay the same while the marker and selected values move.

| Input | What changes; where to look |
|---|---|
| Feed; Reference light-species fraction | Species masses and inventories. Look at Composition and Species density. |
| Axial magnetic field; Radial discharge current | Applied torque and the spin-up trajectory. Look at Ion–neutral spin-up and Drive & work. A late current edit changes drive history; it does not restart the gas. |
| Initial / bath gas temperature | Initial temperature, gas inventory at prescribed pressure, and separation bias. With thermal evolution off it remains a fixed bath. Look at Composition and Temperature. |
| Run duration | How far the computed evolution runs. Compare at the same physical time when testing another input. |
| Ionized number fraction; Ion → neutral collision rate | Driven inertia and ion–neutral momentum transfer. Look at Ion–neutral spin-up. These are assumed inputs, not a solved ionization balance. |
| Neutral wall drag rate | Momentum lost to the wall. Look at Ion–neutral spin-up and Angular momentum. |
| Effective perpendicular conductivity | Resistive heat at prescribed current, not a self-consistent discharge current. Look at Drive & work; it heats the gas only with thermal evolution enabled. |
| Drive annulus inner radius / a | Torque lever arm and resistive path. Look at Ion–neutral spin-up and Drive & work. |
| Vessel radius; Vessel length; Volume-mean neutral pressure | Geometry, gas inventory, inertia and transport scales. Look at spin-up, density and composition. Decorative bolts and coil turns are not independently solved engineering geometry. |
| Assumed radial diffusivity | How quickly composition redistributes, not the ideal equilibrium preference. Look at Separation over time. |
| Inner collection radius / a | Which closed inventory is counted as product. Look at the marker and values in Purity & recovery; the curve scans all cut radii. It does not extract atoms. |
| Ideal countercurrent stages; Feed stage | Separate ideal cascade calculation and routing overlay. Look at Countercurrent stages. No axial cascade flow feeds back into the gas evolution. |
| Outer pump speed; Inlet conductance | Separate equilibrium pumping calculation. Look at Differential pumping. These do not generate an open inlet/outlet flow in the closed-vessel evolution. |
| Initial / reference liner temperature | With thermal evolution on: initial wall temperature. With it off: lithium saturation-pressure reference; the gas does not heat. Inspect's response button chooses the appropriate plot. |
| Reference-only liner → gas conductance | Reference heat demand, not an evolved temperature. It is disabled when the thermal model supplies its own heat-transfer parameters. |
| Fusion thermal power; Single-pass tritium burn fraction; Exhaust processing time | Separate fuel-loop inventory accounting. Look at D–T fuel inventory. These do not change the lithium centrifuge dynamics. |
| Lithium-seeded CIV reference | Only the reported critical-ionization-velocity reference. It does not add a species, solve ionization, limit speed or change rotation. |
| Evolve gas & liner temperature; Liner model; Gas model | Enable the thermal calculation and choose lumped or spatial heat transport. Look at Temperature and Temperature profile. Off means the bath remains fixed. |
| Liner heat capacity; Gas–liner conductance; Liner cooling conductance; Coolant temperature | Thermal energy storage, exchange and cooling when enabled. Spatial tungsten computes its own heat capacity from material data. |
| Liner thickness; Gas conductivity; Resolution | Enabled spatial models only: wall heat flow, gas heat flow, or numerical resolution. Increasing resolution is not a physical change; it tests numerical sensitivity. |
| View; Gas view; Physical time | Display, diagnostic/reference choice and time sampling only. They do not change the accepted physical inputs. |

## Where do we go after this guide?

Only guides **01 and 02 exist today**. The menu reference above covers the
meaning of every current option; the remaining guides below are a plan for
explaining the extensions properly, not links to completed tutorials.

| Guide | One problem to solve | What you should be able to do afterward |
|---|---|---|
| 01 · Meet the machine — available | What are ions, neutrals, fields and this centrifuge? | Identify what rotates, what stays still, and what the browser actually calculates. [Read 01](UNDERSTANDING-MASS-SPINNER.md) |
| 02 · Build one separation prediction — this page | Can electrical drive produce a useful light-rich sample? | Explain each link from torque to speed, heat, composition and inventory cuts; compare one input at a time. |
| 03 · Can the operating point survive? — planned | Does useful rotation require temperatures or phases our assumptions cannot support? | Follow gas-to-wall heat flow, distinguish cell energy from temperature, use the matched-torque B scan, and interpret lithium saturation and ionization/transport limits. |
| 04 · From a sample to a process — planned | How would we repeatedly collect and process material? | Explain purity/recovery tradeoffs, ideal cascade routing and inlet/pump bottlenecks; identify the extraction dynamics we do not solve. |
| 05 · Why fusion needs fuel processing — planned | How does separation connect to an actual fuel loop? | Distinguish lithium blanket material from D–T exhaust, and calculate the inventory cost of low burn fraction and long processing delay without claiming reactor performance. |
| 06 · Which predictions deserve trust? — planned | How can a plausible graph still be wrong? | Separate conservation, numerical convergence and experimental validation; test closures, match diagnostics, and state the domain of a defensible prediction. |

For each future guide, begin with a concrete failed prediction or unresolved
decision, add only the physics needed to address it, then make a prediction
before touching a control. Finish by explaining the observed plot in your own
words. There are no required lessons or completion gates in the playground.

## Equations and further reading

- [Live mechanics and equilibrium reference](../src/fuel-centrifuge.ts),
  [evolving composition and inertia](../src/fuel-transport.ts), and
  [optional thermal evolution](../src/fuel-operation.ts) implement the simplified
  picture above.
- [Plasma mass separation tutorial](https://w3.pppl.gov/~fisch/fischpapers/2018/Zweben_PMF_POP18.pdf)
  covers several mechanisms. Its charged-species filters need additional
  physics beyond the neutral-gas equilibrium derived here.
- [How it works](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/how-it-works.html)
  gives more implementation detail and accuracy limits.
