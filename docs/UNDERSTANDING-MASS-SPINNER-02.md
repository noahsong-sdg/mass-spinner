# Understanding Mass Spinner · 2

## What are we trying to predict?

Put a mixture of lithium-6 and lithium-7 in a cylinder. Take a sample from near
its axis. **Can we make that sample contain a larger percentage of lithium-6
than the mixture we put in?** That is the problem we will build a model to answer.
We move atoms around; we do not change one isotope into another.

For a concrete counting example, imagine 76 light atoms and 924 heavy atoms.
The light percentage is 7.6%. A sample containing 10 light and 90 heavy atoms
would be 10% light: enriched, but it recovers only 10 of the original 76 light
atoms. These are invented counts to explain the goal, not a simulation result.
We eventually need **both a better mixture and a useful amount of it**.

Marathon describes lithium enrichment for fusion blankets, where neutron
reactions can produce tritium fuel. **The centrifuge is a fuel processing
machine, not the fusion reactor.** This is a simplified playground, not a reconstruction of Marathon's
proprietary apparatus. Its
[published application](https://www.marathonfusion.com/fusion-energy/) motivates
the question; it does not supply enough information to calibrate our model.

We will build up the answer by removing one assumption at a time:

| First suppose… | The question that forces the next step |
|---|---|
| Rotation is already available | Why would it change the mixture at all? |
| We know its equilibrium distribution | How much speed would make a meaningful difference? |
| We can choose that speed | How does electrical drive actually produce it? |
| Force immediately becomes speed | What accelerates, what loses momentum, and how long does it take? |
| The gas stays cold | Where does the input energy go? |
| The predicted equilibrium is our product | Does the run last long enough, and how much can we collect? |

Use **Coupled separation** for this first pass. You only need Composition,
Ion–neutral spin-up, Drive & work, and Purity & recovery; other plots inspect
pieces of the same argument. [Every menu option is explained below](#views),
and [the reading plan](#path) separates this first model from later extensions.
The [first guide](UNDERSTANDING-MASS-SPINNER.md) introduces ions and neutrals.
The [seven experiments](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/start.html)
are a quick way to try the controls alongside this explanation.

### First, change one real control

Open **Start here → Experiments → Change current; watch rotation**.

1. Press **Start from rest & edit current**. Move **Radial discharge current** to **0 A**. Wait for the new result, then press **Show end-of-run speeds** in the guide. Both populations stay at rest: there is no drive torque.
2. Press **Start from rest & edit current** again. Set **0.03 A**, wait, then show the endpoint again. With the other inputs unchanged, ions now rotate and collisions spin up the neutrals.
3. Compare at the same physical time. A faster rotation is a speed change, not a temperature measurement. With thermal evolution off, the gas temperature stays fixed.

Starting from rest matters: changing current after time zero normally adds a drive step to gas that is already moving. The preparation button restarts the run and clears earlier drive steps; it does not change your other physical inputs. Click a control's numeric readout to enter an exact value. On a phone, reopen **Start here** to return to these instructions.

## 1. Why does rotation separate masses?

Our counting example tells us what success means, but nothing yet moves one
isotope relative to the other. Try rotation as the separating mechanism. First
hold the gas at one temperature and imagine it has had enough time to settle.
**We are asking where atoms would prefer to be, before asking how to get them
there.** This is why our first model is an equilibrium reference.

Think of air becoming less dense with height in gravity. Gravity favors lower
positions; thermal motion spreads particles upward. In an ideal isothermal
mixture, heavier particles have a steeper equilibrium density gradient.

A centrifuge creates an analogous competition **across the radius**. In a frame
rotating with the gas, the centrifugal effect favors the wall. Heavier atoms
develop a stronger outward concentration than lighter atoms. Thermal motion
keeps the separation incomplete: neither region contains only one isotope.
This is a statistical distribution in a colliding gas, not a sieve that sends
each atom to one destination based only on mass.

To draw a curve, we need one more simplification: how speed varies across the
vessel. Start with uniform temperature and **rigid rotation**: every radius has the same
angular speed, called Ω, in radians per second (one turn is 2π radians). At twice the radius an atom travels twice as far per
turn, so its tangential speed is twice as large:

```math
v_\theta(r)=\Omega r.
```

r is distance from the axis; the wall is at r = R. Under these assumptions,
the equilibrium density of either neutral isotope obeys

```math
\frac{n_s(r)}{n_s(0)}
=\exp\!\left(\frac{m_s\Omega^2r^2}{2k_BT}\right).
```

The label s means either isotope; n is atoms per unit volume, m is mass per atom,
T is temperature in kelvin, and k_B is Boltzmann's constant, which converts
temperature to an energy scale. The exponential says how strongly density
increases outward. exp(q) means e raised to q. Each species' total number of
atoms stays fixed and sets its normalization.

**Both densities rise toward the wall. Separation means their ratio changes.**
We cannot judge the sample from density alone: both isotopes might become more
numerous in the same place. We need to divide the light count by the total
count in that same small volume. The local light-isotope fraction is

```math
x_\ell(r)=\frac{n_\ell(r)}{n_\ell(r)+n_h(r)}.
```

Subscripts ℓ and h mean light and heavy. A **radial composition profile** is a
graph of this fraction against radius: “What percentage of atoms here are the
light isotope?” Density answers “How many atoms are here?” The center can be
light-enriched while containing fewer light atoms per unit volume than the wall.

**Predict, then look:** if neither isotope has a reason to favor the wall, the
curves should be flat. With rotation, both should rise, the heavier one more.

**Read the example first:** No spin gives flat density curves. Spinning makes both
rise; the heavier isotope rises more. Warmer keeps the same speed but flattens
both curves. “6×” means six times that isotope's density at the axis, **not 6%**.
The figure is an ideal equilibrium example; your run may not have reached equilibrium.

**Then inspect your run:** Show end-of-run composition selects the endpoint.
Read “In 1,000 atoms here…” before the graph. At axis and At wall change the
sample position, not the settings or time. Compare the light percentage with the
feed, not 50%. The plot shows only the light percentage on a clearly labeled
zoomed scale; the heavy percentage is the remainder. Use the playback slider
for earlier profiles. Species density instead shows each species relative to its
own volume mean: 1× means average density, not 100% of the mixture.
Tracers are weighted populations and fast turns are averaged: use plotted m/s
and physical time, not screen revolutions, to measure motion.

<details>
<summary>Where does the exponential come from?</summary>

An atom moving in a circle needs inward acceleration. In the laboratory frame,
pressure increasing toward the wall provides an inward pressure force. For
steady neutral circular flow, neglecting other radial forces,

```math
-\frac{dp}{dr}=-\rho\frac{v_\theta^2}{r},
\qquad\text{so}\qquad
\frac{dp}{dr}=\rho\Omega^2r.
```

p is pressure and ρ is mass per volume; d/dr means change with radius. In the rotating frame we describe the
same balance as pressure opposing the centrifugal effect. Inward acceleration
and outward-increasing density are consistent descriptions of circular flow.

For either ideal neutral species at isothermal diffusive equilibrium, insert
its partial pressure and mass density:

```math
p_s=n_sk_BT,\qquad \rho_s=m_sn_s,
\qquad
\frac{d\ln n_s}{dr}=\frac{m_s\Omega^2r}{k_BT}.
```

ln is the inverse of exp: it extracts the exponent. Integrating this radial
gradient from the axis to r gives the exponential above. This is a special
equilibrium result, not a complete transient momentum equation for each species.

</details>

## 2. How strong is the separation?

We now have a possible separating mechanism. But a curve that bends in the
right direction could still change composition by almost nothing. **Before
building a drive, we need to know what makes the sorting strong or weak.**

Dividing the two species' density laws cancels their common geometry and leaves
their mass difference. Compare the heavy/light ratio at the wall with the same ratio at the axis.
Call this comparison α:

```math
\alpha=\frac{[n_h/n_\ell]_{r=R}}{[n_h/n_\ell]_{r=0}},
\qquad
\ln\alpha=\frac{(m_h-m_\ell)\Omega^2R^2}{2k_BT}
=\frac{\Delta m\,v_{\mathrm{wall}}^2}{2k_BT}.
```

Here v_wall = ΩR is the model gas speed at the outer radius, **not the speed
of the metal vessel**. The vessel is stationary; this rigid bulk model does
not resolve its near-wall shear layer. ln α extracts the separation exponent.

This isolates mass sorting from the overall rise in density. The exponent is
**rotation energy associated with the mass difference, divided by thermal
energy**. If that dimensionless number is small, the composition gradient is
weak. α = 1 means identical heavy/light ratios at axis and wall; α = 2 means
the wall's ratio is twice the axis's ratio.

For orientation, a mass difference of about one atomic mass unit, wall speed
1,000 m/s and temperature 500 K give an exponent about 0.12 and α about 1.13.
That is a 13% change in the **heavy/light ratio**, not 13 percentage points of
product enrichment. These are illustrative inputs, not a Marathon measurement.

**Why simulate both speed and temperature?** Doubling speed multiplies the
exponent by four. Doubling temperature halves it. Increasing current might
increase both, so “more drive means better separation” is not enough reasoning.

**Predict, then try:** at fixed temperature, twice the speed should give four
times the separation exponent, not four times the purity. At fixed speed,
twice the temperature should halve that exponent. Use the composition view's temperature and rotation comparisons.
They independently change T or Ω to expose this relationship. They are
equilibrium references, not predictions of the drive power needed to get there.
This neutral-gas formula is also not a universal law for the charged-species
filters in the plasma mass separation tutorial.

## 3. How do we spin a gas without spinning a drum?

The equilibrium calculation lets us choose a speed. The machine does not have
a gas-speed dial: it has electrodes and a magnetic field. **We now need a
physical route from the controls we can set to the rotation our calculation
requires.** Moving a speed slider in an equilibrium comparison cannot answer
how much electrical drive is needed.

The electrodes stay still. **The gas between them rotates.** In the website
illustration, step through **Current**, **Turn ions**, then **Turn gas**.
Compare the cylinder view with the view straight into its end.

Current crosses the gas from the outer electrode to the inner one. With a
magnetic field along the axis, the force points **around** the cylinder, not
along it. It drives the charged population; collisions pass rotation to neutral
atoms. The dots show bulk motion, not individual microscopic orbits.

The magnetic force per unit volume in this bulk model is

```math
\mathbf{f}=\mathbf{J}\times\mathbf{B}.
```

**J** is current per unit area and **B** is magnetic field. The cross product
means the force points perpendicular to both; reversing the current reverses
the force. This is a bulk force law, not a claim that every charged particle
follows a circular microscopic orbit.

**Why simulate this?** We control electrical drive, but need gas speed. The
drive accelerates the gas and replaces rotation lost to boundaries. Neutral
atoms feel no direct Lorentz force, so ion–neutral collisions are essential
to the route by which this model spins them.

## 4. What sets the rotation speed?

We have found a sideways force, but force is not speed. A gas starting from
rest must accelerate; collisions share rotation with neutrals, and boundaries
remove it. **The same current can give different speeds at different times.**
To replace our assumed speed with a prediction, we must keep track of rotational
motion gained and lost.

Torque is the rotational counterpart of force. It changes **angular momentum**,
the amount of rotational motion. Moment of inertia measures how hard a mass
distribution is to spin: moving mass farther from the axis increases it.
For one rigidly rotating population,

```math
L=\mathcal{I}\Omega,
\qquad
\frac{dL}{dt}=\tau_{\mathrm{in}}-\tau_{\mathrm{loss}}.
```

L is angular momentum, script ℐ is moment of inertia, and τ is torque. The
derivative means “change per second.” Steady speed requires balanced torques,
provided the mass distribution is steady too.

The simplest browser mechanics treat ions and neutrals as two rotating
populations. Collisions transfer equal and opposite torques between them:

```math
\frac{dL_i}{dt}=\tau_{\mathrm{drive}}-\Gamma(\Omega_i-\Omega_n),
\qquad
\frac{dL_n}{dt}=\Gamma(\Omega_i-\Omega_n)-\tau_{\mathrm{wall}}.
```

i/n mean ions/neutrals. Γ is the prescribed friction coefficient: the
**Ion → neutral collision rate** slider sets Γ = ℐᵢνᵢₙ, with νᵢₙ in s⁻¹ and
Γ in kg·m²/s. The ion inertia ℐᵢ stays prescribed; neutral inertia evolves. If ions lead,
collisions slow them and accelerate neutrals. Add the equations: the internal
collision torques cancel. Only drive and boundary torque change the total
angular momentum. The simple browser wall torque is proportional to neutral
angular momentum: τ_wall = ν_wall L_n, where **Neutral wall drag** sets ν_wall.
Stronger coupling generally reduces ion–neutral lag; it need not increase the
steady neutral speed at a fixed drive torque and wall drag.

For the reference annulus carrying radial current through a uniform axial field,
the drive torque's magnitude is

```math
\tau_{\mathrm{drive}}=\frac{IB}{2}(R^2-r_{\mathrm{in}}^2).
```

I is total current, distinct from script ℐ; B is field strength. The radii bound
the driven annulus. A radial strip contributes torque rIB dr; integrating
from the inner to outer radius gives the squared radii. The formula
assumes that radial-current geometry, not arbitrary electrode shapes.

**Why evolve angular momentum rather than prescribe speed?** It explains
spin-up, ion–neutral lag and coast-down. There is also feedback: moving gas
outward increases neutral inertia. With no net torque, angular momentum stays
fixed and rotation slows. Maintaining speed during that redistribution would
require an additional source of angular momentum.

**Predict, then try:** replay from rest. Ions should initially lead neutrals;
cutting power removes the source of torque rather than instantly stopping the
gas. Compare spin-up with Angular momentum: total momentum follows
**Drive minus wall impulse** because collision torques cancel. Gas inertia
shows the feedback from redistribution.

For a fresh comparison, pin A, change one input, then choose **New run** and
compare at the same physical time. Editing current after time zero, even while
paused, instead inserts a current step at that time; at the endpoint it extends
the run. **Replay spin-up** repeats that history, including any current steps.
Collision and drag edits start a new trajectory. Distinguish the source of
rotation, its transfer to neutrals, and its loss.

## 5. Where does the energy go?

We can now predict speed from drive and losses. It is tempting to turn up the
current and expect better separation. But our equilibrium formula also contains
temperature, which we have quietly held fixed. **If stronger drive heats the gas,
its faster rotation and hotter thermal motion compete.** We need an energy
account before deciding whether more drive helped.

Turning gas faster takes work. Driving current through resistance also produces
heat. Mechanical power applied to ions and resistive heating are

```math
P_{\mathrm{mechanical}}=\tau_{\mathrm{drive}}\Omega_i,
\qquad
P_{\mathrm{Ohmic}}=I^2R_{\mathrm{electrical}}.
```

Power is energy per second: torque times angular speed is rotational work
per second. At fixed geometry and conductivity, doubling
current doubles reference torque but quadruples resistive heating. The
electrical resistance here excludes the motion-induced voltage: total drive
power also supplies mechanical work.

Ion–neutral slip dissipates mechanical energy at rate

```math
P_{\mathrm{slip}}=\Gamma(\Omega_i-\Omega_n)^2.
```

The friction torque Γ(Ω_i − Ω_n) acts across the relative angular speed
Ω_i − Ω_n; multiplying them explains the nonnegative square.
Collisions therefore **transfer angular momentum and convert relative rotation
into heat**. They do not destroy energy. Boundary drag also dissipates rotation.
Redistribution matters, too. Since rotational energy is K = L²/(2ℐ), moving
mass outward at fixed angular momentum increases inertia and lowers rotation
energy. The evolving thermal model deposits the signed redistribution work
in the gas; inward redistribution can draw heat. This is a **reduced-model
closure**, not a resolved fluid momentum-and-energy solution.

For a closed vessel with no mass crossing its boundary, the intended continuous
physical account is

```math
\frac{d}{dt}(K_{\mathrm{rotation}}+U_{\mathrm{gas}}+U_{\mathrm{wall}})
=P_{\mathrm{mechanical}}+P_{\mathrm{Ohmic}}-P_{\mathrm{cooling}}.
```

K is rotational kinetic energy and U is internal (thermal) energy. Slip and
wall friction are internal conversions, not extra external power sources.
Where their heat goes is an additional model assumption. The browser keeps
numerical time-stepping loss separate from physical heat. In its finite-step
ledger, that loss is subtracted from the right-hand energy input; it should
shrink with refinement, not be interpreted as gas heating.

**Drive & work** plots accumulated mechanical energies: curve height is energy
in joules; curve slope is power in watts. A steeper slip-energy curve means
faster frictional heating. Ohmic power is a separate readout; cooling and
Ohmic-energy accounting belong to the thermal budget.

**Why simulate heat?** The separation exponent depends on temperature.
Fixed-temperature mode assumes thermal control and reports heat loads; it
does not predict a temperature rise. Optional thermal evolution follows gas
and wall energy with prescribed heat-transfer and deposition assumptions.
It does not solve separate electron/ion temperatures or discharge ionization.

**Predict, then try:** in fixed-temperature mode, accumulated work can rise
without temperature rising: the bath is assumed to remove the required heat.
Inspect work/heat, then thermal controls. A fixed-temperature
comparison isolates rotation's effect. An evolving-temperature run asks the
coupled question of whether heating erodes that benefit.

## 6. Why do we need time and collection, too?

We have connected electrical input to speed and, optionally, temperature. Can
we now call the equilibrium curve our product? Not yet. **Spinning up the gas
and redistributing its atoms are different processes.** A gas can reach a high
rotation speed before much composition change has occurred.

Equilibrium says where the mixture could settle, not whether it gets there
during the run. The browser evolves radial species inventories using prescribed
transport coefficients. A rough diffusion time scale is

```math
t_{\mathrm{diffusion}}\sim\frac{R^2}{D}.
```

Diffusion spreads a distance roughly √(Dt); reaching R therefore takes roughly
R²/D. D is diffusivity in square meters per second. This is a scale, not an exact
separation time: rotation, boundaries and the transport law matter. A rapidly
spinning gas can still be far from its equilibrium composition.

Even after waiting, our original counting example still matters: a small,
light-rich region can contain very few of the light atoms we started with.
Nor is α the purity of a sample. Imagine selecting all gas inside a chosen
radius. Two different counts matter:

```math
\mathrm{purity}=\frac{N_{\ell,\mathrm{inside}}}
{N_{\ell,\mathrm{inside}}+N_{h,\mathrm{inside}}},
\qquad
\mathrm{recovery}=\frac{N_{\ell,\mathrm{inside}}}{N_{\ell,\mathrm{whole\ vessel}}}.
```

N means number of atoms. A small central region can be relatively pure but
hold little of the desired isotope. The collection view counts inventory
inside the cut; it does not solve an outlet flow or predict kilograms per hour.

**Predict, then try:** rewind Composition and watch it evolve. Increasing run
duration allows more redistribution; it does not by itself change a fixed-speed,
fixed-temperature equilibrium reference. A smaller inner cut can increase purity
while reducing recovery. Show end-of-run cuts selects the endpoint; **Probe collection curve**
keeps your selected time. Click or use arrow keys on that curve to inspect
purity and recovery at different radii. Home and End select the axis and wall.
Use the values below the graph, not the selected-cut summary above it: this
probe does not move the 3D cut marker. At the wall, purity is the feed fraction and recovery is one when light atoms
are present. With no light atoms, recovery is undefined. An empty inner cut
has undefined purity.

Probing counts the same gas without rearranging it. The **Inner collection
radius / a** setup slider instead starts a new run, as other setup edits do.
To explore time available for separation, compare **Run duration** with R²/D,
then change diffusivity in a separate fresh run.

## Why these pieces, and what is still missing?

We can now return to the opening task. Choose drive and thermal assumptions,
evolve the run, inspect composition, then count inventory inside a cut. Each
new model supplied something the previous one had left unspecified:

| Without… | We could not answer… |
|---|---|
| Species densities and composition | Whether a sample is enriched |
| Rotation versus temperature | Whether equilibrium sorting is appreciable |
| Torque and momentum | What speed electrical inputs produce over time |
| Energy accounting | Whether heating undermines that speed advantage |
| Radial transport and inventory cuts | Whether enrichment appears during the run, and how much light isotope is retained |

The essential links are **drive → rotation, work → temperature, and rotation
plus temperature → composition**. Transport time and the collection cut connect
that picture to a possible product. Omitting any link can reverse a conclusion
such as “increasing current improves useful separation.” They are necessary
ingredients, not proof our approximations are sufficient for a real apparatus.

The fast model uses bulk angular speeds. Real gas can rotate at different
angular speeds at different radii and axial positions. Endwalls brake nearby
gas; radial/axial circulation carries heat and composition elsewhere. The
separate research backend resolves more of this flow. Its results do not
automatically replace the browser model, and detail alone does not establish
accuracy.

The lithium inventory and temperatures are imposed gas-only inputs, not a
demonstrated sustainable operating point. Phase exchange with surfaces,
ionization and discharge sustainment are not solved by this learning model.

Three checks answer different questions:

| Check | What passing it establishes |
|---|---|
| Conservation and known analytical limits | The implementation respects selected equations and bookkeeping |
| Stable results with smaller spatial cells and time steps | The selected numerical solution is resolved for the tested case |
| Matched apparatus, inputs and diagnostics reproduce measurements without refitting | Evidence for those experimental observables |

The [public-data assessment](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/qualification.html) records numerical
successes alongside unresolved disagreement with historical argon measurements.
Those are not measurements of this lithium playground or Marathon's machine.
The playground explores conditional physical relationships; experimentally
accurate enrichment and throughput remain separate claims.

For one run, try to explain: **what supplies torque, what sets the speed, where
the energy goes, what composition means, and how the cut changes purity and
recovery.** That is why we simulate these quantities rather than just draw
spinning particles.

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
