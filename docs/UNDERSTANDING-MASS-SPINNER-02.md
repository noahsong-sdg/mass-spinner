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
Use Coupled separation. Each experiment below opens the plot it needs;
you do not need to learn every menu first. [Every menu option is explained below](#views);
[the reading plan](#path) lists later topics.
The [first guide](UNDERSTANDING-MASS-SPINNER.md) introduces ions and neutrals;
the separate [Start here walkthrough](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/start.html)
lets you try the controls alongside this explanation.

### First, change one real control

1. [Start from rest & edit current](/?level=2&guide=physics&topic=goal&try=currentExperiment).
   Set **Radial discharge current** to **0 A** and wait for Updating to finish.
2. [Show end-of-run speeds](/?level=2&guide=physics&topic=goal&try=endSpin): neither population should turn.
3. Repeat with **0.03 A**, leaving other inputs unchanged. Ions now accelerate;
   collisions make neutrals follow. Compare at the same physical time.

The preparation clears earlier current steps and restarts from rest. An ordinary
current edit after time zero, even while paused, changes the drive of already moving gas.
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
Then [show your end-of-run composition](/?level=2&guide=physics&topic=composition&try=composition).
Read “In 1,000 atoms here…” and click the profile near the axis, then near the wall.
Compare with the feed, **not 50%**. The light-percentage axis is
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

**Predict, then compare:**

1. What if the gas turned twice as fast? [Compare 2× rotation](/?level=2&guide=physics&topic=bias&try=rotation).
   At fixed temperature, the exponent quadruples: the composition contrast grows.
2. Now oppose that sorting with more thermal motion. [Compare 2× temperature](/?level=2&guide=physics&topic=bias&try=temperature).
   At fixed rotation, the exponent halves: the composition contrast shrinks.

These ideal equilibrium overlays do not change your run or predict the power
needed. This neutral-gas result does not describe every charged-particle filter
in the plasma separation tutorial.

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
Then [show gas & drive](/?level=2&guide=physics&topic=drive&try=look) to locate the same field and force arrows in the apparatus.

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

**One experiment: drive, then coast.** Use the powered run from the first experiment.

1. [Replay spin-up](/?level=2&guide=physics&topic=momentum&try=spin).
   Watch the speed curves grow with the clock. Ions initially lead; collisions make the neutral gas follow.
2. While it is turning, [cut power](/?level=2&guide=physics&topic=momentum&try=cutPower).
   The gas keeps moving: removing torque does not remove the angular momentum already stored.
3. To account for that motion, [show angular momentum](/?level=2&guide=physics&topic=momentum&try=momentum).
   Total angular momentum follows **Drive minus wall impulse**. After power is cut,
   wall drag removes it; collisions only transfer it between populations.

At fixed L, moving mass outward increases inertia and slows rotation.
Constant speed therefore requires steady inertia as well as balanced torques.
Replay preserves power switches. To repeat from the original powered state,
return to the first experiment’s **Start from rest & edit current**.

## 5. Where does the energy go?

**The goal here is isotope enrichment, not heating a fusion plasma.** More current can increase
both rotation and heating. Rotation sorts the masses; random thermal
motion opposes that sorting. At the same rotation speed, hotter gas gives
less equilibrium enrichment: recall the competition Ω²/T.

If heating grows too much, faster gas need not separate better. Holding its
temperature fixed instead requires cooling that removes the net heat input.
We therefore ask: **does extra current improve separation, and what cooling
does that improvement require?**

To answer, first separate the power that turns ions from the power deposited
as resistive heat:

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

A temperature rise needs an energy source; keeping temperature steady needs
heating and cooling to balance. For the closed vessel, the intended continuous
energy account is

```math
\frac{d}{dt}(K_{\mathrm{rotation}}+U_{\mathrm{gas}}+U_{\mathrm{wall}})
=P_{\mathrm{mechanical}}+P_{\mathrm{Ohmic}}-P_{\mathrm{cooling}}.
```

U is thermal energy. Slip and wall friction convert energy internally; their
heat destinations are assumptions. The finite-step ledger separately subtracts
numerical damping, which should shrink with refinement; it is not physical heat.

**Read the energy account:** [show drive work](/?level=2&guide=physics&topic=energy&try=work).
Curve height is energy in joules; curve slope is power in watts. Ohmic power is a
separate readout. Work can rise while temperature stays fixed: the default bath
assumes thermal control. [Tutorial 03](UNDERSTANDING-MASS-SPINNER-03.md) removes
that assumption in a controlled comparison; it does not solve separate
electron/ion temperatures or ionization.

## 6. Why do we need time and collection, too?

Fast rotation does not guarantee separation: atoms need time to redistribute.
Diffusion spreads a distance roughly √(Dt), giving the scale

```math
t_{\mathrm{diffusion}}\sim\frac{R^2}{D}.
```

D is diffusivity in m²/s. Boundaries and rotation also matter; this is not an
exact settling time. [Open diffusivity and separation](/?level=2&try=diffusionExperiment) to see whether your run approaches
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

**Try one collection cut:** [open the collection experiment](/?level=2&try=collectionExperiment).
Click the curve at a small radius, then a larger one, and read purity and recovery
below it. Arrow keys also move the probe; Home/End select axis/wall.
The probe does not move the 3D cut marker;
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

**Gas view changes presentation, not physics.** Enable optional models in Controls.

| Gas view | Meaning and limit |
|---|---|
| Equilibrium reference | Ideal distribution at the bulk reference’s endpoint speed; not the coupled end state. |
| Coupled separation | Coupled history with fast turns averaged into rings; weighted populations, not particle orbits. |
| Coupled spin-up | The same accepted coupled solution, slowed to reveal turning; transport still evolves. |
| Flow · reference | Schematic reference, not solved inlet/outlet fluid motion or rotor feedback. |

The time slider selects physical seconds; “1 s screen = …” is playback scale.
Read m/s rather than counting turns. Play/Pause and Rewind navigate history;
New run restarts with current settings. Cut power inserts a current step at the
selected time. Reference views are not controlled comparisons of evolving runs.

**Plots ask different questions.** Time histories grow with the clock; radial
profiles show the selected instant; parameter scans compare hypothetical settings.

| Plot | Read it as… |
|---|---|
| Separation over time | Cut purity/recovery versus time, not extraction rate. [§6](#collection) |
| Composition | Local light percentage versus radius; heavy is the remainder. [§1](#composition) |
| Ion–neutral spin-up | Ion and neutral edge speeds (m/s) versus time. [§4](#momentum) |
| Drive & work | Mechanical energies (J); slopes are power (W). Ohmic power is separate. [§5](#energy) |
| Temperature | Mean gas/liner temperatures; evolution requires thermal physics enabled. [§5](#energy) |
| Temperature profile | Radial temperatures: requires radial liner; gas curve also needs Spatial mixture. No axial structure. [Open heat experiment](/?level=2&try=spatialHeatExperiment). |
| Species energy profile | Cell internal energies with Spatial mixture; more atoms can mean more energy: both share the local temperature. [Open heat experiment](/?level=2&try=spatialHeatExperiment). |
| Gas pressure profile | Local nkT with Spatial mixture, not solved local force balance. [Open heat experiment](/?level=2&try=spatialHeatExperiment). |
| Angular momentum | Drive impulse minus wall impulse; internal collision transfer cancels. [§4](#momentum) |
| Gas inertia | Mass redistribution’s effect on resistance to turning, versus time. [§4](#momentum) |
| Species density | Each isotope’s density divided by its own volume mean; 1× is average. Evolving in coupled views, equilibrium in reference views. [§1](#composition) |
| Purity & recovery | Inventory fractions versus cut radius, not throughput. [§6](#collection) |
| Countercurrent stages | Ideal stage routing, recovery and circulation; assumed equal turnover, not transient plant flow. [Open stages experiment](/?level=2&try=stageExperiment). |
| Differential pumping | Reference pressures/load versus pump and inlet settings; select that application. No open-flow rotor feedback. [Open pumping experiment](/?level=2&try=pumpingExperiment). |
| Magnetic leverage | Resistive heat at matched reference torque, not a fixed-current experiment. [Open magnetic leverage](/?level=2&try=fieldExperiment). |
| D–T fuel inventory | Separate steady fuel-loop accounting from burn fraction and delay; not a lithium-centrifuge burn prediction. [Open fuel inventory](/?level=2&try=inventoryExperiment). |
| Lithium vapor & surfaces | Gas/liner conditions compared with saturation references; not evolved phase exchange. [Open surface reference](/?level=2&try=surfaceExperiment). |

### Which controls affect physics?

Controls changes physical inputs; Inspect identifies parts and links to those controls.
Some inputs act only in enabled models;
others belong to separate reference calculations. A scan’s curve may stay fixed
while its selected marker moves. After editing, wait for the accepted result.

| Input family | Effect; useful plot |
|---|---|
| Feed; light fraction | Masses/inventories; Composition, Species density. |
| Magnetic field; current; drive annulus | Torque, lever arm and resistive path; Spin-up, Drive & work. Late current edits add steps. |
| Gas temperature | Initial temperature, pressure-derived inventory and sorting; Composition, Temperature. Fixed bath unless thermal evolution is on. |
| Duration; radial diffusivity | Available redistribution time and transport rate, not fixed-speed equilibrium; Separation over time. |
| Ion fraction; collision rate | Driven inertia and momentum transfer; Spin-up. Ionization is prescribed. |
| Wall drag | Boundary momentum loss; Spin-up, Angular momentum. |
| Conductivity | Resistive heating at prescribed current, not a solved discharge; Drive & work. Temperature responds only with thermal evolution. |
| Radius; length; pressure | Inventory, inertia and transport scales; Spin-up, density, composition. Decorative hardware is not independently solved. |
| Collection radius | Closed inventory selected; Purity & recovery marker/values. No extraction. |
| Stages; feed stage | Separate ideal cascade routing; Countercurrent stages. |
| Pump speed; inlet conductance | Separate equilibrium pumping reference; Differential pumping. |
| Liner temperature | Initial wall temperature if thermal physics is on; saturation reference otherwise. |
| Reference liner → gas conductance | Reference heat demand only; disabled when thermal physics supplies heat transfer. |
| Thermal switches; storage; conductances; coolant | Enable heat evolution and set exchange/cooling; Temperature. Spatial tungsten supplies material heat capacity. |
| Liner thickness; gas conductivity | Enabled spatial heat transport; Temperature profile. Resolution tests numerical sensitivity, not new physics. |
| Fusion power; burn fraction; processing time | Separate steady D–T inventory accounting, not lithium dynamics. |
| Lithium-seeded CIV reference | Reported reference only; no ionization solution or enforced speed limit. |
| View; gas view; time | Presentation and sampling only, not physical input changes. |

## Where do we go after this guide?

Continue with [03 · thermal limits](UNDERSTANDING-MASS-SPINNER-03.md),
[04 · useful processes](UNDERSTANDING-MASS-SPINNER-04.md),
[05 · fusion fuel](UNDERSTANDING-MASS-SPINNER-05.md) and
[06 · what to trust](UNDERSTANDING-MASS-SPINNER-06.md).

The [investigation path](/learn.html) turns the ideas above into short experiments.
Choose any question; the order below builds toward an enriched, useful inventory.

| Investigation | Why it comes next |
|---|---|
| [Controls and evidence](/learn-controls.html) | Connect a physical change to motion and a plot; distinguish display changes. |
| [Spin-up and separation](/learn-transport.html) | Turning quickly does not imply that the mixture has redistributed. |
| [Thermal limits](/learn-thermal.html) | More drive can also mean more heating; follow where energy goes. |
| [Beam and target](/learn-beam.html) | A separate machine: follow deuteron energy into neutrons and heat. |
| [Collection and processes](/learn-collection.html) | Trade purity against recovery, then distinguish inventory from throughput. |
| [Trust and reproducibility](/learn-evidence.html) | Identify what the model calculates, assumes and has evidence for. |

The [first explanation](UNDERSTANDING-MASS-SPINNER.md) introduces ions and
neutrals. This page supplies the equations; the investigations provide optional
practice. Detailed plant design, self-consistent ionization and experimentally
validated device prediction remain outside these tutorials.

## Equations and further reading

- Implementation: [mechanics/equilibrium](../src/fuel-centrifuge.ts),
  [composition/inertia](../src/fuel-transport.ts), [thermal evolution](../src/fuel-operation.ts).
- [Plasma mass separation tutorial](https://w3.pppl.gov/~fisch/fischpapers/2018/Zweben_PMF_POP18.pdf):
  charged-species filters require physics beyond this neutral equilibrium.
- [How it works](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/how-it-works.html):
  numerical methods and accuracy limits.
