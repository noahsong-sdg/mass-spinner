# Tutorial 2 · Rotation and separation

## What do we want to calculate?

The goal is to collect more light-isotope atoms at a higher percentage.
Purity is their percentage in the sample. Recovery is their fraction of the initial light-isotope count.

From 76 light and 924 heavy atoms, collect 10 light and 90 heavy atoms.
Purity increases from 7.6% to 10%, but recovery is only 10/76. Separation moves isotopes. It does not make them.

This centrifuge model explains Marathon's [lithium-enrichment application](https://www.marathonfusion.com/fusion-energy/), not proprietary equipment or a fusion reactor.
It connects drive, rotation, heating, separation and collection.

Use Coupled separation. [The menu table](#views) explains the other options.
[Tutorial 1](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/start.html) shows the controls.
The [first guide](UNDERSTANDING-MASS-SPINNER.md) explains ions and neutral atoms.

### First, change one real control

1. [Start from rest & edit current](/?level=2&guide=physics&topic=goal&try=currentExperiment).
2. Set Radial discharge current to 0 A.
3. Wait until the calculation finishes.
4. [Show end-of-run speeds](/?level=2&guide=physics&topic=goal&try=endSpin). The two populations must stay at rest.
5. Do the same comparison with 0.03 A and the same other inputs. Ion speeds increase. Collisions then increase neutral gas speed.
6. Compare the speeds at the same physical time.

The experiment removes earlier power switches and starts from rest.
Later current changes change the drive history, also during a pause.
Without thermal evolution, temperature stays constant. [§4 explains the motion](#momentum).

## 1. Why does rotation separate masses?

Rotation is useful only if it changes the isotope mixture. We need to know which isotope becomes more common at each radius.

Circular motion is possible only with inward force. Pressure that increases from the axis to the wall supplies this force.
At the same radius and angular speed, heavier atoms need more inward force.
During equilibrium rotation, heavier atoms have a larger wall-to-axis density ratio. The gas near the axis has a higher light-isotope percentage.
Random thermal motion decreases separation.

Use an ideal neutral gas at one temperature, with rigid rotation: angular speed Ω is the same at each radius.
Tangential speed increases with radius:

```math
v_\theta(r)=\Omega r.
```

For each species s, the equilibrium density is

```math
\frac{n_s(r)}{n_s(0)}
=\exp\!\left(\frac{m_s\Omega^2r^2}{2k_BT}\right).
```

Here, r is radius, n is number density (atoms/m³), m is one atom's mass, and T is temperature in kelvin.
The symbol k_B is Boltzmann's constant.
Each species' total atom count sets its density scale. The two densities increase outwards, but their ratio changes.
The local light fraction is

```math
x_\ell(r)=\frac{n_\ell(r)}{n_\ell(r)+n_h(r)}.
```

The center can have a higher light percentage but fewer light atoms in a unit volume.

Compare No rotation, Rotation and Higher temperature in the diagram. The label “6×” is a density ratio, not a percentage.
[Show your end-of-run composition](/?level=2&guide=physics&topic=composition&try=composition).
Select the axis and then the wall. Compare each percentage with the feed percentage, not 50%.

Composition enlarges the percentage range. The heavy percentage is the remainder.
Species density uses each species' volume mean as 1×. Your run might not become equal to the diagram's equilibrium.

<details>
<summary>Where does the exponential come from?</summary>

Pressure that increases outwards gives inward acceleration. For constant circular motion of neutral gas,

```math
-\frac{dp}{dr}=-\rho\frac{v_\theta^2}{r},
\qquad\text{so}\qquad
\frac{dp}{dr}=\rho\Omega^2r.
```

Here, p is pressure and ρ is mass density. At diffusive equilibrium, each species has no net diffusion.
Its ideal partial pressure gives

```math
p_s=n_sk_BT,\qquad \rho_s=m_sn_s,
\qquad
\frac{d\ln n_s}{dr}=\frac{m_s\Omega^2r}{k_BT}.
```

Integration from the axis to r gives the exponential. This is not a complete momentum equation for acceleration.

</details>

## 2. How strong is the separation?

A clear slope can show a small isotope change. Compare the heavy/light ratio at the wall with the axis ratio:

```math
\alpha=\frac{[n_h/n_\ell]_{r=R}}{[n_h/n_\ell]_{r=0}},
\qquad
\ln\alpha=\frac{(m_h-m_\ell)\Omega^2R^2}{2k_BT}
=\frac{\Delta m\,v_{\mathrm{wall}}^2}{2k_BT}.
```

R is vessel radius. The speed v_wall = ΩR is gas speed at the wall, which does not move. Ω has units of rad/s.
The exponent compares the rotational energy difference with thermal energy.
When α = 2, the wall heavy/light ratio is two times the axis ratio, not two times the purity.

For Δm ≈ 1 u, a gas speed of 1,000 m/s and a temperature of 500 K, α ≈ 1.13.
The ratio increases by 13%. Purity does not increase by 13 percentage points.

1. [Compare 2× rotation](/?level=2&guide=physics&topic=bias&try=rotation). At constant temperature, the exponent becomes four times its initial value and separation increases.
2. [Compare 2× temperature](/?level=2&guide=physics&topic=bias&try=temperature). At constant rotation speed, the exponent becomes half its initial value and separation decreases.

These equilibrium curves do not change your run or calculate the necessary power.
Charged-particle filters use more physics than this neutral-gas model includes.

## 3. How do we turn gas without a moving drum?

Equilibrium assumes gas that already turns. A device also needs a drive that creates this rotation.
Radial current crosses an axial magnetic field. The resulting force turns charged gas around electrodes that do not move:

```math
\mathbf{f}=\mathbf{J}\times\mathbf{B}.
```

The symbol f is force density (N/m³), J is current density (A/m²), and B is magnetic field.
The force is perpendicular to the current and field. Reversing current reverses force.
Collisions move angular momentum from ions to neutral atoms, which receive no direct Lorentz force.

Select Current, Turn the ions and Turn the gas in sequence in the diagram.
Then [show gas & drive](/?level=2&guide=physics&topic=drive&try=look) in the 3D equipment.
The dots show populations, not microscopic particle paths.

## 4. What sets the rotation speed?

Useful separation needs sufficient speed within the available time. We must compare the drive with losses before we can predict that speed.

Torque changes angular momentum L over time, not speed immediately.
Moment of inertia ℐ measures resistance to rotation changes. For rigid rotation,

```math
L=\mathcal{I}\Omega,
\qquad
\frac{dL}{dt}=\tau_{\mathrm{in}}-\tau_{\mathrm{loss}}.
```

The symbol τ is torque. The symbol d/dt means rate of change. For ions and neutral gas,

```math
\frac{dL_i}{dt}=\tau_{\mathrm{drive}}-\Gamma(\Omega_i-\Omega_n),
\qquad
\frac{dL_n}{dt}=\Gamma(\Omega_i-\Omega_n)-\tau_{\mathrm{wall}}.
```

The collision control sets Γ = ℐᵢνᵢₙ (kg·m²/s). Ion inertia is specified. Neutral inertia changes with mass location.
Collisions exchange angular momentum without changing its total. Wall drag removes it: τ_wall = ν_wall L_n, with ν_wall in s⁻¹.
Stronger coupling decreases the speed difference, but does not necessarily increase the neutral speed after acceleration stops.

For radial current I through an annular region in constant axial field B,

```math
\tau_{\mathrm{drive}}=\frac{IB}{2}(R^2-r_{\mathrm{in}}^2).
```

The symbol I is current. ℐ is inertia.
Integration of rIB dr across the driven region gives the torque. Thus, electrode radii change the drive.

Use the powered run from the first experiment.

1. [Replay spin-up](/?level=2&guide=physics&topic=momentum&try=spin). The plot adds speeds when physical time increases. Ion speeds increase first. Collisions then increase neutral gas speed.
2. During rotation, [cut power](/?level=2&guide=physics&topic=momentum&try=cutPower). The gas continues to turn because it has angular momentum.
3. [Show angular momentum](/?level=2&guide=physics&topic=momentum&try=momentum). Total angular momentum equals drive impulse minus wall impulse. Each impulse is torque integrated over time.
   After the power stops, wall drag decreases total angular momentum. Collisions only move it between populations.

At constant L, outward mass movement increases inertia and decreases angular speed.
Replay keeps the power switches. The first experiment removes those switches and starts from rest.

## 5. Where does the energy go?

At the same rotation speed, more random thermal motion decreases separation. Equilibrium separation increases with Ω²/T.
More current can increase speed and temperature. Heating can remove the increase in separation from faster rotation.

For constant temperature, cooling must remove net heat input.
Thus, we must calculate separation and cooling power. The drive supplies mechanical power and resistive heat:

```math
P_{\mathrm{mechanical}}=\tau_{\mathrm{drive}}\Omega_i,
\qquad
P_{\mathrm{Ohmic}}=I^2R_{\mathrm{electrical}}.
```

Power is the energy rate, in watts.
At constant field, geometry and conductivity, two times the current gives two times the torque but four times the resistive heat.
Resistance does not include motion-induced voltage. The source also supplies mechanical work.
Collisions change relative rotational energy into heat:

```math
P_{\mathrm{slip}}=\Gamma(\Omega_i-\Omega_n)^2.
```

Slip heating cannot be negative. Wall drag also changes rotational energy into heat.

Mass movement changes rotational energy K = L²/(2ℐ). In the thermal model, this energy difference increases or decreases gas thermal energy.
At constant L, outward movement releases energy. Inward movement can remove heat.
This does not calculate full fluid momentum and energy transport.

For the closed vessel, the continuous energy balance is

```math
\frac{d}{dt}(K_{\mathrm{rotation}}+U_{\mathrm{gas}}+U_{\mathrm{wall}})
=P_{\mathrm{mechanical}}+P_{\mathrm{Ohmic}}-P_{\mathrm{cooling}}.
```

U is thermal energy. Slip and wall friction move energy inside the system. Specified heat fractions set its destination.
Time stepping also removes numerical energy. The energy account records numerical loss and physical heat as separate terms.
Smaller timesteps give a convergence check for this numerical loss.

[Show drive work](/?level=2&guide=physics&topic=energy&try=work). Curve height is energy in joules. Curve slope is power in watts.
Ohmic power is separate. The default bath keeps temperature constant.

[Tutorial 03](UNDERSTANDING-MASS-SPINNER-03.md) adds temperature changes.
It does not calculate ionization or separate electron and ion temperatures.

## 6. How do time and collection change the result?

Separation takes time. Diffusion moves atoms a typical distance √(Dt), which gives the approximate time

```math
t_{\mathrm{diffusion}}\sim\frac{R^2}{D}.
```

D is diffusivity (m²/s). Boundaries and rotation also change the time to equilibrium.
[Open diffusivity and separation](/?level=2&try=diffusionExperiment) to compare the calculated distribution with equilibrium.

Enriched gas can contain few atoms. For all gas inside a collection radius,

```math
\mathrm{purity}=\frac{N_{\ell,\mathrm{inside}}}
{N_{\ell,\mathrm{inside}}+N_{h,\mathrm{inside}}},
\qquad
\mathrm{recovery}=\frac{N_{\ell,\mathrm{inside}}}{N_{\ell,\mathrm{whole\ vessel}}}.
```

N counts atoms. With light enrichment near the axis, a smaller inner sample can increase purity but decrease recovery.
These fractions measure gas in the vessel, not gas flow through an outlet.

[Open the collection experiment](/?level=2&try=collectionExperiment).
Select two probe radii. At the wall, purity is the feed percentage and recovery is one.
An empty sample has no defined purity. If the vessel contains no light species, recovery has no defined value.

The probe does not move the 3D collection marker.
The Inner collection radius / a control changes that marker and starts a new run.

## Which model parts are necessary, and what is missing?

We must know which conclusions the model can support before we use its results. Each missing process limits those conclusions.

Drive changes rotation, heating decreases separation at the same speed, and transport changes the distribution over time.
The collection radius selects the sample. Without these connections, more current can appear useful when it is not.

The browser uses bulk speeds and specified transport coefficients. These do not show if the device can continue to operate.
It does not calculate velocity shear, circulation in the radial–axial plane, evaporation, condensation or the discharge energy supply.
The research solver is separate.

Conservation and refinement tests identify numerical errors. Measurement comparisons give a physical-model validation check.
The [public-data assessment](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/qualification.html) records remaining differences from an argon experiment.
It does not show accurate Marathon or lithium results.

## What do the menu options mean?

Different pictures can look like different physical models. Use this key to distinguish a calculated history from a reference.

Gas view changes the display, not the physics. Use Controls to set optional models to on.

| Gas view | Meaning and limit |
|---|---|
| Equilibrium reference | Ideal equilibrium at the bulk reference's last speed. This is not the coupled model's last state. |
| Coupled separation | Coupled time history. Rings show mean rotation. Dots show weighted populations, not particle paths. |
| Coupled spin-up | The same coupled solution, with slower displayed rotation. The distribution continues to change with physical time. |
| Flow · reference | A schematic reference. It does not calculate inlet/outlet fluid motion or changes in rotor motion caused by flow. |

The time slider selects physical seconds. The label “1 s screen = …” gives the playback scale.
Read the speed in m/s. Do not count displayed turns.

Play/Pause and Rewind select positions in the calculated history. New run starts again with the current settings.
Cut power adds a current step at the selected time. Reference views do not compare time-dependent runs with controlled inputs.

Time plots add data as physical time increases. Radial profiles show values at the selected time.
Parameter scans compare calculated values for different settings.

| Plot | Meaning |
|---|---|
| Separation over time | Sample purity and recovery against time, not extraction rate. [§6](#collection) |
| Composition | Local light percentage against radius. The heavy percentage is the remainder. [§1](#composition) |
| Ion–neutral spin-up | Ion and neutral gas speeds at the wall (m/s) against time. [§4](#momentum) |
| Drive & work | Mechanical energy (J). Slopes give power (W). Ohmic power is separate. [§5](#energy) |
| Temperature | Mean gas and liner temperatures. Temperature changes occur only with thermal evolution. [§5](#energy) |
| Temperature profile | Radial temperatures use Radial tungsten liner. The gas curve also uses Spatial mixture. No axial temperature structure. [Open heat experiment](/?level=2&try=spatialHeatExperiment). |
| Species energy profile | Internal energy in each cell with Spatial mixture. The two species have the same local temperature. More atoms can give more energy without a higher temperature. [Open heat experiment](/?level=2&try=spatialHeatExperiment). |
| Gas pressure profile | Local nkT with Spatial mixture. This does not calculate local force balance. [Open heat experiment](/?level=2&try=spatialHeatExperiment). |
| Angular momentum | Drive impulse minus wall impulse. Collision torques move angular momentum between populations without changing the total. [§4](#momentum) |
| Gas inertia | Resistance to changes in rotation, against time. Mass movement changes this inertia. [§4](#momentum) |
| Species density | Each isotope's density divided by its own volume mean. 1× is the mean. Coupled views change with time. Reference views show equilibrium. [§1](#composition) |
| Purity & recovery | Fractions of atoms in a sample, against collection radius. No outlet flow. [§6](#collection) |
| Countercurrent stages | Ideal routing between stages, with recovery and circulation. Equal turnover times are specified. Plant flow changes are not calculated. [Open stages experiment](/?level=2&try=stageExperiment). |
| Differential pumping | Reference pressures and gas load for pump and inlet settings. Select that application. No flow-induced changes in rotor motion. [Open pumping experiment](/?level=2&try=pumpingExperiment). |
| Magnetic leverage | Resistive heat at constant reference torque. Current changes with field. This differs from constant-current operation. [Open magnetic leverage](/?level=2&try=fieldExperiment). |
| D–T fuel inventory | A separate fuel-loop account with constant flows using burn fraction and delay. This does not calculate lithium-centrifuge burn. [Open fuel inventory](/?level=2&try=inventoryExperiment). |
| Lithium vapor & surfaces | Gas and liner conditions against saturation references. Evaporation and condensation do not change the run. [Open surface reference](/?level=2&try=surfaceExperiment). |

### Which controls affect physics?

Controls changes physical inputs. Examine identifies parts and links to those controls.
Some inputs affect only active models. Others affect separate reference calculations.
A parameter scan can keep the same curve while the selected marker moves.
After a change, wait until the calculation finishes.

| Input family | Effect. Related plot |
|---|---|
| Feed; light fraction | Species masses and atom counts. Composition, Species density. |
| Magnetic field; current; drive annulus | Torque, electrode radii and resistive path. Spin-up, Drive & work. Current changes during a run add steps. |
| Gas temperature | Initial temperature, atom count from pressure, and separation. Composition, Temperature. A constant-temperature bath operates unless thermal evolution is on. |
| Duration; radial diffusivity | Time for mass movement and movement rate. Separation over time. These inputs do not change fixed-speed equilibrium. |
| Ion fraction; collision rate | Ion inertia and angular momentum exchange. Spin-up. The model does not calculate ionization. |
| Wall drag | Angular momentum loss at the wall. Spin-up, Angular momentum. |
| Conductivity | Resistive heat at the selected current. Drive & work. Temperature changes occur only with thermal evolution. The model does not calculate the discharge. |
| Radius; length; pressure | Atom count, inertia and transport scales. Spin-up, Species density, Composition. Displayed mechanical parts have no separate structural calculation. |
| Collection radius | Selected gas in the closed vessel. Purity & recovery marker and values. No extraction. |
| Stages; feed stage | Separate ideal routing between stages. Countercurrent stages. |
| Pump speed; inlet conductance | Separate equilibrium pumping calculation. Differential pumping. |
| Liner temperature | Initial wall temperature with thermal evolution. With thermal evolution off, only a saturation reference. |
| Reference liner → gas conductance | Reference heat demand only. This control is not active when thermal evolution calculates heat exchange. |
| Thermal switches; storage; conductances; coolant | Temperature changes, heat exchange and cooling. Temperature. The spatial tungsten model uses material heat capacity. |
| Liner thickness; gas conductivity | Spatial heat transport when active. Temperature profile. Cell count and timestep change numerical accuracy, not the physical model. |
| Fusion power; burn fraction; processing time | Separate D–T fuel account with constant flows. These inputs do not change lithium motion. |
| Lithium-seeded CIV reference | A reported critical ionization velocity reference. This does not calculate ionization or enforce a speed limit. |
| View; gas view; time | Display and selected time only. These controls do not change physical inputs. |

## What comes next?

Read [03 · heat](UNDERSTANDING-MASS-SPINNER-03.md),
[04 · collection](UNDERSTANDING-MASS-SPINNER-04.md),
[05 · fuel](UNDERSTANDING-MASS-SPINNER-05.md) and
[06 · accuracy](UNDERSTANDING-MASS-SPINNER-06.md).
The [documentation index](/learn.html) links all six tutorials and the technical references.

## Equations and more reading

- Implementation: [mechanics/equilibrium](../src/fuel-centrifuge.ts),
  [composition/inertia](../src/fuel-transport.ts), [thermal evolution](../src/fuel-operation.ts).
- [Plasma mass separation tutorial](https://w3.pppl.gov/~fisch/fischpapers/2018/Zweben_PMF_POP18.pdf):
  charged-species filters use physics that this neutral equilibrium does not include.
- [How it works](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/how-it-works.html):
  numerical methods and accuracy limits.
