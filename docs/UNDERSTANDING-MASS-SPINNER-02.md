# Tutorial 2 · Rotation and separation

## What are we trying to predict?

Can the gas near the axis become richer in lithium-6 while retaining enough
material? For example, taking 10 light atoms and 90 heavy ones from a mixture
of 76 light and 924 heavy atoms raises purity from 7.6% to 10%, but recovers
only 10/76 of the light atoms. Separation rearranges isotopes; it creates none.

Marathon's [lithium-enrichment application](https://www.marathonfusion.com/fusion-energy/)
motivates this centrifuge model. It is not a reconstruction of proprietary hardware
or a fusion reactor. Follow drive → rotation → heating → separation → collection.

Use Coupled separation. [Every menu option is explained below](#views).
[Tutorial 1](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/start.html)
introduces the controls; the [first guide](UNDERSTANDING-MASS-SPINNER.md) defines ions and neutrals.

### First, change one real control

1. [Start from rest & edit current](/?level=2&guide=physics&topic=goal&try=currentExperiment).
   Set Radial discharge current to 0 A and wait for Updating to finish.
2. [Show end-of-run speeds](/?level=2&guide=physics&topic=goal&try=endSpin): neither population should turn.
3. Repeat with 0.03 A, leaving other inputs unchanged. Ions now accelerate;
   collisions make neutrals follow. Compare at the same physical time.

Preparation clears power switches and starts from rest. A later current edit,
even while paused, changes the drive history. With thermal evolution off,
temperature stays fixed. [§4 explains the motion](#momentum).

## 1. Why does rotation separate masses?

Like gravity making air denser at lower heights, rotation favors the wall.
Thermal motion opposes sorting. Heavier atoms develop a steeper equilibrium
density gradient, leaving the inner gas relatively light-rich.

Assume ideal neutral gas at uniform temperature and rigid rotation: every
radius has angular speed Ω (radians per second). Tangential speed increases
with radius:

```math
v_\theta(r)=\Omega r.
```

At equilibrium, the density of either species s obeys

```math
\frac{n_s(r)}{n_s(0)}
=\exp\!\left(\frac{m_s\Omega^2r^2}{2k_BT}\right).
```

Here r is radius, n atoms per volume, m mass per atom, T kelvin and k_B
Boltzmann's constant. Each species' inventory fixes its normalization.
Both densities rise outward, but their ratio changes. Local light fraction is

```math
x_\ell(r)=\frac{n_\ell(r)}{n_\ell(r)+n_h(r)}.
```

The center can have a higher light percentage yet fewer light atoms per volume.
In the diagram, compare No spin, Spinning and Warmer: “6×” is a density ratio,
not a percentage. Then [show your end-of-run composition](/?level=2&guide=physics&topic=composition&try=composition)
and probe axis and wall. Compare with feed, not 50%. The composition axis is
zoomed; heavy fraction is the remainder. Species density uses 1× = its volume
mean. The diagram's equilibrium need not match your finite-time run.

<details>
<summary>Where does the exponential come from?</summary>

Circular motion needs inward acceleration. Outward-rising pressure supplies
the inward force. For steady neutral circular flow,

```math
-\frac{dp}{dr}=-\rho\frac{v_\theta^2}{r},
\qquad\text{so}\qquad
\frac{dp}{dr}=\rho\Omega^2r.
```

With p pressure, ρ mass density and each species at diffusive equilibrium,
substitute ideal partial pressure:

```math
p_s=n_sk_BT,\qquad \rho_s=m_sn_s,
\qquad
\frac{d\ln n_s}{dr}=\frac{m_s\Omega^2r}{k_BT}.
```

Integrating from the axis to r gives the exponential. This equilibrium balance
is not a complete transient momentum equation.

</details>

## 2. How strong is the separation?

A slope can represent tiny enrichment. Compare the heavy/light ratio at
the wall with that at the axis:

```math
\alpha=\frac{[n_h/n_\ell]_{r=R}}{[n_h/n_\ell]_{r=0}},
\qquad
\ln\alpha=\frac{(m_h-m_\ell)\Omega^2R^2}{2k_BT}
=\frac{\Delta m\,v_{\mathrm{wall}}^2}{2k_BT}.
```

R is vessel radius; v_wall = ΩR is gas speed, not the speed of the stationary
vessel. The exponent compares rotational energy from the mass difference with
thermal energy. α = 2 doubles the heavy/light ratio, not product purity.

For Δm ≈ 1 u, 1,000 m/s and 500 K, α ≈ 1.13: a 13% ratio contrast,
not 13 percentage points of enrichment.

1. What if the gas turned twice as fast? [Compare 2× rotation](/?level=2&guide=physics&topic=bias&try=rotation).
   At fixed temperature, the exponent quadruples: the composition contrast grows.
2. Now oppose that sorting with more thermal motion. [Compare 2× temperature](/?level=2&guide=physics&topic=bias&try=temperature).
   At fixed rotation, the exponent halves: the composition contrast shrinks.

These equilibrium overlays leave your run unchanged and predict no required
power. Charged-particle filters need physics beyond this neutral-gas result.

## 3. How do we spin a gas without spinning a drum?

Assuming rotation does not explain how to produce it. Radial current crosses
an axial magnetic field, pushing charged gas around stationary electrodes:

```math
\mathbf{f}=\mathbf{J}\times\mathbf{B}.
```

f is force per volume, J current per area and B magnetic field. The force is
perpendicular to both; reversing current reverses it. Collisions pass ion
rotation to neutrals, which feel no direct Lorentz force.

Step through Current → Turn ions → Turn gas in the diagram, then
[show gas & drive](/?level=2&guide=physics&topic=drive&try=look) in the 3D apparatus.
The dots represent populations, not microscopic orbits.

## 4. What sets the rotation speed?

Force changes motion over time. Track angular momentum L, with moment of
inertia ℐ measuring how hard the mass distribution is to turn. For rigid rotation,

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

The collision control sets Γ = ℐᵢνᵢₙ (kg·m²/s). Ion inertia is prescribed;
neutral inertia evolves. Collision torques cancel in total angular momentum.
Wall drag removes it: τ_wall = ν_wall L_n, with ν_wall in s⁻¹.
Stronger coupling reduces lag but need not raise steady neutral speed.

For radial current I through an annulus in uniform axial field B,

```math
\tau_{\mathrm{drive}}=\frac{IB}{2}(R^2-r_{\mathrm{in}}^2).
```

I is current, distinct from inertia ℐ. Integrating rIB dr across the driven
annulus gives this geometry-dependent lever arm.

Use the powered run from the first experiment.

1. [Replay spin-up](/?level=2&guide=physics&topic=momentum&try=spin).
   Watch the speed curves grow with the clock. Ions initially lead; collisions make the neutral gas follow.
2. While it is turning, [cut power](/?level=2&guide=physics&topic=momentum&try=cutPower).
   The gas keeps moving: removing torque does not remove the angular momentum already stored.
3. To account for that motion, [show angular momentum](/?level=2&guide=physics&topic=momentum&try=momentum).
   Total angular momentum follows Drive minus wall impulse. After power is cut,
   wall drag removes it; collisions only transfer it between populations.

At fixed L, outward redistribution increases inertia and slows rotation.
Replay preserves power switches; return to the first experiment to restart
from the original powered state.

## 5. Where does the energy go?

Shared rotation strengthens sorting; random thermal motion weakens it at the
same rotation speed. More current can increase both. The equilibrium competition
is Ω²/T: faster gas need not improve separation if it also gets hotter.

Holding temperature fixed requires cooling to remove net heat input. We ask:
does extra current improve separation, and what cooling does it require?
First separate mechanical power from resistive heat:

```math
P_{\mathrm{mechanical}}=\tau_{\mathrm{drive}}\Omega_i,
\qquad
P_{\mathrm{Ohmic}}=I^2R_{\mathrm{electrical}}.
```

Power is energy per second. At fixed geometry and conductivity, doubling
current doubles torque but quadruples resistive heating. Electrical resistance
excludes motion-induced voltage; the drive also supplies mechanical work.
Collisions dissipate relative rotation:

```math
P_{\mathrm{slip}}=\Gamma(\Omega_i-\Omega_n)^2.
```

The square is nonnegative. Wall drag also dissipates rotation. Redistribution
changes K = L²/(2ℐ); the thermal closure deposits signed redistribution work
in the gas. Outward motion at fixed L releases energy; inward motion can draw
heat. This does not resolve fluid momentum and energy.

For the closed vessel, the intended continuous energy account is

```math
\frac{d}{dt}(K_{\mathrm{rotation}}+U_{\mathrm{gas}}+U_{\mathrm{wall}})
=P_{\mathrm{mechanical}}+P_{\mathrm{Ohmic}}-P_{\mathrm{cooling}}.
```

U is thermal energy. Slip and wall friction transfer energy internally;
heat destinations are assumed. The finite-step ledger separately subtracts
numerical damping, which should shrink with refinement; it is not physical heat.

[Show drive work](/?level=2&guide=physics&topic=energy&try=work): curve height is
energy in joules; curve slope is power in watts. Ohmic power is separate.
The default bath holds temperature fixed despite work input.
[Tutorial 03](UNDERSTANDING-MASS-SPINNER-03.md) enables thermal evolution;
it does not solve ionization or separate electron/ion temperatures.

## 6. Why do we need time and collection, too?

Rotation takes time to redistribute atoms. Diffusion spreads a distance
roughly √(Dt), giving the timescale

```math
t_{\mathrm{diffusion}}\sim\frac{R^2}{D}.
```

D is diffusivity (m²/s); boundaries and rotation also affect settling.
[Open diffusivity and separation](/?level=2&try=diffusionExperiment) to compare
finite-time redistribution with equilibrium.

An enriched region can contain little material. Keeping all gas inside a
radius gives two measures:

```math
\mathrm{purity}=\frac{N_{\ell,\mathrm{inside}}}
{N_{\ell,\mathrm{inside}}+N_{h,\mathrm{inside}}},
\qquad
\mathrm{recovery}=\frac{N_{\ell,\mathrm{inside}}}{N_{\ell,\mathrm{whole\ vessel}}}.
```

N counts atoms. Smaller inner cuts generally raise purity but lower recovery;
these are inventory fractions, not outlet flow.

[Open the collection experiment](/?level=2&try=collectionExperiment) and probe
two radii. At the wall, purity equals feed and recovery is one. Empty-cut purity
and absent-light-species recovery are undefined. The probe does not move the 3D cut marker;
the Inner collection radius / a setup slider instead starts a new run.

## Why these pieces, and what is still missing?

Drive changes rotation; heating opposes sorting; transport and the collection
cut determine the sample. Omitting a link can reverse “more current helps.”

The browser's bulk speeds and prescribed transport are not a demonstrated
sustainable operating point. It does not solve shear, meridional circulation,
phase exchange or discharge sustainment. The research solver is separate.

Conservation and refinement test the numerical solution; matched measurements
test the physical model. The [public-data assessment](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/qualification.html)
records unresolved argon-profile disagreement, not validated Marathon or lithium performance.

## What do the menu options mean?

Gas view changes presentation, not physics. Enable optional models in Controls.

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

Plots ask different questions. Time histories grow with the clock; radial
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

Continue with [03 · heat](UNDERSTANDING-MASS-SPINNER-03.md),
[04 · collection](UNDERSTANDING-MASS-SPINNER-04.md),
[05 · fuel](UNDERSTANDING-MASS-SPINNER-05.md) and
[06 · accuracy](UNDERSTANDING-MASS-SPINNER-06.md).
The [documentation index](/learn.html) also links optional experiments using
the same controls and plots.

## Equations and further reading

- Implementation: [mechanics/equilibrium](../src/fuel-centrifuge.ts),
  [composition/inertia](../src/fuel-transport.ts), [thermal evolution](../src/fuel-operation.ts).
- [Plasma mass separation tutorial](https://w3.pppl.gov/~fisch/fischpapers/2018/Zweben_PMF_POP18.pdf):
  charged-species filters require physics beyond this neutral equilibrium.
- [How it works](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/how-it-works.html):
  numerical methods and accuracy limits.
