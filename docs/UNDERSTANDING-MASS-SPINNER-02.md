# Understanding Mass Spinner · 2

## What are we trying to predict?

Imagine a sealed cylinder containing lithium-6 and lithium-7 atoms. We want gas
near its center to contain a **larger fraction of lithium-6** than the original
mixture. We do not change either isotope into the other: we move them around.

Why care? Marathon describes enriching lithium for fusion blankets, where
neutron reactions can produce tritium fuel. **The centrifuge is a fuel processing
machine, not the fusion reactor.** Our playground explores a simplified
centrifuge; it is not a reconstruction of Marathon's proprietary apparatus.
[Marathon's description](https://www.marathonfusion.com/fusion-energy/) gives
the application, not enough information to calibrate this model.

The central question is: **Can we create enough rotation to separate the mixture,
without heating it so much that thermal motion weakens the separation?**

That makes three quantities essential:

| We need to know… | Because… | Playground view |
|---|---|---|
| How fast ions and neutral gas rotate | Rotation produces the separating effect; current alone does not specify speed | Spin-up |
| How hot the gas becomes | Thermal motion opposes the composition gradient | Work / heat and thermal controls |
| Where each isotope ends up, over time | Speed and temperature matter only if they produce a useful composition | Composition and collection |

Everything below builds that chain. Follow it in
[Start here](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/?level=2&guide=start).
The [first guide](UNDERSTANDING-MASS-SPINNER.md) explains ions, neutrals and the
project's two backends if those terms are unfamiliar.

## 1. How do we spin a gas without spinning a drum?

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

## 2. Why does rotation separate masses?

Think of air becoming less dense with height in gravity. Gravity favors lower
positions; thermal motion spreads particles upward. In an ideal isothermal
mixture, heavier particles have a steeper equilibrium density gradient.

A centrifuge creates an analogous competition **across the radius**. In a frame
rotating with the gas, the centrifugal effect favors the wall. Heavier atoms
develop a stronger outward concentration than lighter atoms. Thermal motion
keeps the separation incomplete: neither region contains only one isotope.
This is a statistical distribution in a colliding gas, not a sieve that sends
each atom to one destination based only on mass.

Start with uniform temperature and **rigid rotation**: every radius has the same
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
The local light-isotope fraction is

```math
x_\ell(r)=\frac{n_\ell(r)}{n_\ell(r)+n_h(r)}.
```

Subscripts ℓ and h mean light and heavy. A **radial composition profile** is a
graph of this fraction against radius: “What percentage of atoms here are the
light isotope?” Density answers “How many atoms are here?” The center can be
light-enriched while containing fewer light atoms per unit volume than the wall.

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

## 3. How strong is the separation?

Compare the heavy/light ratio at the wall with the same ratio at the axis.
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

**Try it:** use the composition view's temperature and rotation comparisons.
They independently change T or Ω to expose this relationship. They are
equilibrium references, not predictions of the drive power needed to get there.
This neutral-gas formula is also not a universal law for the charged-species
filters in the plasma mass separation tutorial.

## 4. What sets the rotation speed?

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

**Try it:** compare spin-up with Angular momentum: total momentum follows
**Drive minus wall impulse** because collision torques cancel. Gas inertia
shows the feedback from redistribution.

For a fresh comparison, pin A, change one input, then choose **New run** and
compare at the same physical time. Editing current after time zero, even while
paused, instead inserts a current step at that time; at the endpoint it extends
the run. **Replay spin-up** repeats that history, including any current steps.
Collision and drag edits start a new trajectory. Distinguish the source of
rotation, its transfer to neutrals, and its loss.

## 5. Where does the energy go?

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

**Try it:** inspect work/heat, then thermal controls. A fixed-temperature
comparison isolates rotation's effect. An evolving-temperature run asks the
coupled question of whether heating erodes that benefit.

## 6. Why do we need time and collection, too?

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

**Try it:** Show end-of-run cuts selects the endpoint; **Probe collection curve**
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
