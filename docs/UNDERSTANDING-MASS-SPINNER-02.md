# Tutorial 2 · Rotation and separation

## What do we want to calculate?

The goal is to collect more light-isotope atoms at a higher percentage.
Isotopes are atoms of the same element with different masses. Here, ⁶Li is lighter than ⁷Li.
Separation is useful when a later process needs more ⁶Li relative to ⁷Li.
The centrifuge must change where these atoms are before we can collect an enriched sample.

Lithium has a role in the supply of fusion fuel. A D–T reactor uses deuterium and tritium, which are hydrogen isotopes.
Neutrons from fusion can react with lithium-6 in a surrounding blanket to make tritium and helium.
Increasing the lithium-6 percentage can help a blanket supply tritium. The necessary percentage changes with the blanket materials and neutron energies.
Lithium-7 can also make tritium through reactions with high-energy neutrons.

The centrifuge increases the lithium-6 percentage; it does not make tritium.
The [ITER blanket handbook, §9.7.2](https://www.iter.org/sites/default/files/media/2026-02/vol.1_ch.09_gaps_to_fill_beyond_iter_e5ynb7.pdf) explains why some blanket designs use enriched lithium.
[Tutorial 5](UNDERSTANDING-MASS-SPINNER-05.md#jobs) connects enrichment, breeding and fuel recovery.

Purity is the light-isotope percentage in the sample. Recovery is the collected fraction of the initial light-isotope count.

Rotation can increase the light-isotope percentage near the axis. We can then collect this inner gas, including both isotopes.
We select a region of gas, not individual light atoms.

An outlet near the axis can remove this gas. Its location selects the mixture; it does not distinguish the isotopes.
Actual extraction can change pressure and composition. This animation explains sample counts, not outlet flow or the gas supply during extraction.

The diagram starts after separation. Its example counts are 76 light and 924 heavy atoms in the vessel.
The marked inner gas contains 10 light and 90 heavy atoms. Collect all 100 atoms from that region.
Purity increases from 7.6% to 10%, but light recovery is only 10/76, or 13.2%.
Most light atoms remain in the outer gas. A higher percentage does not mean that we collect more light atoms.

<!-- diagram:goal -->

This centrifuge model explains Marathon's [lithium-enrichment application](https://www.marathonfusion.com/fusion-energy/), not proprietary equipment or a fusion reactor.
It connects drive, rotation, heating, separation and collection.

We examine them in that order because each process changes the conditions for the next one.
Current gives torque. Torque changes rotation. Rotation changes the atom distribution.
Heating can weaken that redistribution, and the collection radius determines which atoms we keep.
Thus, a fast gas does not necessarily give a useful product.

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

<!-- diagram:turning -->

An atom moving in a straight line would leave a circular path. Inward force continually changes its direction.
A turning gas contains random atom motion as well as motion around the axis.
The model describes the mean motion of many atoms. It does not put each atom on a perfect circular orbit.

Circular motion is possible only with inward force. Pressure that increases from the axis to the wall supplies this force.
Pressure acts on both sides of a small gas volume. Higher pressure on its outer side gives a net inward force.
Thus, pressure must increase toward the wall to maintain circular motion.

At the same radius and angular speed, heavier atoms need more inward force.
During equilibrium rotation, heavier atoms have a larger wall-to-axis density ratio. The gas near the axis has a higher light-isotope percentage.

Temperature measures random atom motion. This motion competes with separation, so speed alone cannot tell us how much separation to expect.
With the same number of atoms per volume, hotter gas has higher pressure.
At the same rotation speed and uniform temperature, a smaller density increase toward the wall can supply the necessary inward force.
Both normalized density curves become less steep, and the isotope fractions differ less between the axis and wall.

Use an ideal neutral gas at one temperature, with rigid rotation: angular speed Ω is the same at each radius.
[The assumption checks below](#equilibrium-assumptions) explain when this reference can describe real gas.
Tangential speed increases with radius:

<!-- equation:speed -->

```math
v_\theta(r)=\Omega r.
```

Equilibrium means that the distribution no longer changes, even though atoms continue to move.
For each isotope, inward diffusion balances the rotational tendency toward the wall. There is no net radial transport.
We need the density at each radius to calculate how many atoms lie inside a collection radius.
For each species s, the equilibrium density is

<!-- equation:density -->

```math
\frac{n_s(r)}{n_s(0)}
=\exp\!\left(\frac{m_s\Omega^2r^2}{2k_BT}\right).
```

Here, r is radius, n is number density (atoms/m³), m is one atom's mass, and T is temperature in kelvin.
The symbol k_B is Boltzmann's constant.
Each species' total atom count sets its density scale.

<!-- diagram:density-scan -->

Increase temperature to make the radial curves less steep. Move the selected radius toward the axis to approach a density ratio of 1.
Each ratio compares one isotope with its own axis density. It does not give the isotope percentage.

The two densities increase outwards, but their ratio changes.
To obtain composition, count light atoms as a share of all atoms in the same small volume.
The local light fraction is

<!-- equation:composition -->

```math
x_\ell(r)=\frac{n_\ell(r)}{n_\ell(r)+n_h(r)}.
```

The exponential density equation gives a density ratio, not an isotope percentage.
For example, a heavy density increase of 6× and a light density increase of 4× increase the heavy/light ratio by 1.5×.
Both isotope densities increase toward the wall, but the heavy fraction increases more.
The center can have a higher light percentage but fewer light atoms in a unit volume.
The diagram divides each density by that isotope's axis density. Thus, 1× means its value at the axis.

<!-- diagram:composition -->

First, compare No rotation with Rotation in the diagram. Then select Higher temperature.
The last two cases have the same rotation speed. Only temperature changes.

The curves show density against distance from the axis. The label “6×” is a density ratio, not a percentage.
The heavier density increases more sharply. Thus, the light percentage decreases toward the wall.

[Show your end-of-run composition](/?level=2&guide=physics&topic=composition&try=composition).
Select the axis and then the wall.

The feed is the gas mixture before separation. Its light fraction is the number of light atoms divided by the number of all atoms.
A feed light fraction of 7.59% means that 7.59% of its atoms are light. The other 92.41% are heavy.

“Local” means within a small region at the selected radius. For an example, use a local light fraction of 8%.
Compare equal groups of 10,000 atoms:

| Group | Light atoms | Heavy atoms | Light percentage |
| --- | ---: | ---: | ---: |
| Feed before separation | 759 | 9,241 | 7.59% |
| Small region after separation | 800 | 9,200 | 8% |

The second group has more light atoms for the same total atom count. This increase in light percentage is called enrichment.
Compare the local percentage with the feed percentage, not 50%. A region can be enriched in light atoms while most atoms there remain heavy.

The two groups in the table can have different volumes. They compare mixtures, not the sizes of regions.
To calculate how many light atoms a region contains, you also need its volume and light-atom density.

The local 8% divides light atoms in that region by **all atoms in that region**.
To find the region's share of the vessel's light atoms, divide its light-atom count by **all light atoms in the vessel**.
These are different totals.

If the whole vessel contains 100,000 light atoms, the region's 800 light atoms are 800 / 100,000 = 0.8% of that total.
Its local light fraction is still 8%, because 800 of its 10,000 atoms are light.

In this closed vessel, separation moves atoms between regions. It does not create light atoms.

An outer ring also has more volume than an inner ring of the same thickness. Density alone does not give its atom count.

Composition enlarges the percentage range. The heavy percentage is the remainder.
[Show species density](/?level=2&try=density) to compare each density with its volume mean.
Here, 1× means that isotope's vessel mean, rather than its axis value. Your run might not reach the diagram's equilibrium.

<details>
<summary>Where does the exponential come from?</summary>

Pressure that increases outwards gives inward acceleration. For constant circular motion of neutral gas,

<!-- equation:pressure -->

```math
-\frac{dp}{dr}=-\rho\frac{v_\theta^2}{r},
\qquad\text{so}\qquad
\frac{dp}{dr}=\rho\Omega^2r.
```

Here, p is pressure and ρ is mass density. At diffusive equilibrium, each species has no net diffusion.
Its ideal partial pressure gives

<!-- equation:gas-law -->

```math
p_s=n_sk_BT,\qquad \rho_s=m_sn_s,
\qquad
\frac{d\ln n_s}{dr}=\frac{m_s\Omega^2r}{k_BT}.
```

Integration from the axis to r gives the exponential. This is not a complete momentum equation for acceleration.

</details>

<h3 id="equilibrium-assumptions">When can we use these assumptions?</h3>

These assumptions let us calculate the effect of rotation on composition. They are conditions for the exponential equation, not verified Marathon operating conditions.
A correct equation can give an incorrect equipment prediction when its conditions do not apply.

#### Ideal neutral gas

The ideal gas law gives pressure from number density and temperature.
It does not include corrections from atom size or interactions between collisions.
The equation describes neutral atoms, which have no net electric charge. It does not describe the ion or electron equilibrium.
This approximation can describe a dilute atomic vapor that stays in the gas phase.
Ionization, molecules and condensation can change its composition and pressure.

Cooling can cause condensation: lithium leaves the gas and collects on a surface.
The 500 K examples prescribe atomic lithium gas. They are not verified conditions for stable lithium vapor at the specified pressure.
[NIST's lithium data](https://www.nist.gov/publications/melting-points-and-boiling-points-alkali-metals) give the connection between vapor pressure and temperature.
[Open the surface reference](/?level=2&try=surfaceExperiment) to examine this limit. It does not calculate condensation during your run.

An ideal gas law is not sufficient evidence for accurate diffusion or heat transport.
The mean free path is the average distance between collisions. For fluid transport, this distance must be small compared with the flow scales.
These scales include the widths of density and temperature gradients, not only the vessel radius.
The [NIST gas-flow review, §2](https://srd.nist.gov/jpcrdreprint/1.556019.pdf) explains this separate condition through the Knudsen number.

#### Rigid rotation

Rigid rotation means the same angular speed at all locations in one population. It does not mean that the vessel wall turns.
This approximation can describe gas when momentum exchange keeps angular-speed differences small under drive and wall braking.
Wall braking and uneven drive can instead cause velocity shear: adjacent gas regions turn at different angular speeds.
The measured speed profile must be close to Ωr before this assumption can describe an experiment.

The live coupled model keeps one angular speed for ions and one for neutral gas. These two speeds can differ.
It does not calculate shear within either population.
Our [argon comparison](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/qualification.html) does not qualify this assumption for that experiment.

#### Uniform temperature

Here, uniform temperature means the same temperature at every location in the gas. It can still change with time.
This approximation can work when heat transport keeps temperature differences small with heating and cooling.
A hot gas interior and a cold wall can instead give a large radial temperature difference.
One mean temperature then cannot describe the local pressure or separation everywhere.

The equilibrium reference uses one temperature. Optional spatial gas energy transport calculates radial temperatures, but still uses rigid rotation.
[Open the temperature-profile experiment](/?level=2&try=spatialHeatExperiment) to compare the interior with the wall.
This comparison checks the effect within our model; it does not replace temperature measurements.

#### Diffusive equilibrium

Diffusion is atom motion that changes the mixture between regions. At diffusive equilibrium, each isotope has zero net radial diffusion.
Atoms still move and collide. Their distribution stays constant because opposing transport effects balance.
Redistribution must have sufficient time, with rotation and temperature almost constant during that time.
An outlet, a changing drive or a short run can prevent this state.

Coupled separation calculates a changing distribution. The last point of a run can still have radial transport.
[Open the diffusion experiment](/?level=2&try=diffusionExperiment) to compare distributions at the same physical time with different diffusivities.
Diffusivity sets the rate of radial redistribution in this model.

These conditions permit reference calculations for learning and numerical checks. They do not show experimental accuracy.
The [plasma separation tutorial, §III](https://w3.pppl.gov/~fisch/fischpapers/2018/Zweben_PMF_POP18.pdf) discusses additional effects from charge, neutral gas, collisions and electric fields.

## 2. How strong is the separation?

We want a different isotope mixture near the axis so that collection can give a richer sample.
A larger number of atoms per volume is not sufficient.
If both isotope densities increase by the same factor, their percentages stay the same. There is denser gas, but no separation.

Compare two small gas volumes of the same size: one near the axis and one near the wall.
The counts below are an example, not a prediction for your run.

| Quantity in each small volume | Near the axis | Near the wall |
| --- | ---: | ---: |
| Light atoms | 10 | 20 |
| Heavy atoms | 90 | 360 |
| Heavy atoms per light atom | 90 / 10 = 9 | 360 / 20 = 18 |
| Light percentage | 10 / 100 = 10% | 20 / 380 ≈ 5.3% |

The wall sample contains more atoms of both isotopes. But it has more heavy atoms for each light atom.
Its heavy/light ratio is 18, compared with 9 near the axis.
Divide these ratios: 18 / 9 = 2. We call this result the separation factor, α.

Thus, α = 2 means twice as many heavy atoms per light atom at the wall as near the axis.
It does not mean twice the light percentage. In this example, the light percentage is higher near the axis: 10% compared with about 5.3%.
The axis value is not the feed percentage. The feed is the initial mixture before separation.

When α = 1, the two locations have the same isotope percentages. A larger α means a larger wall-to-axis change in the heavy/light ratio.
The factor compares locations; it does not tell us how many light atoms we can collect.

<details>
<summary>How does rotation set this factor?</summary>

The previous section gives a density increase for each isotope.
The heavier isotope has the larger increase. Dividing the two increases leaves a result that contains their mass difference, Δm.

The equation below makes the same comparison as the table.
Here, n_h and n_ℓ are heavy and light number densities. Their ratio equals the count ratio in one small volume.
The subscripts r = R and r = 0 select the wall and axis.

<!-- equation:separation -->

```math
\alpha=\frac{[n_h/n_\ell]_{r=R}}{[n_h/n_\ell]_{r=0}}
=\exp\!\left(\frac{\Delta m\,\Omega^2R^2}{2k_BT}\right).
```

Δm = m_h − m_ℓ is the mass difference between one heavy atom and one light atom.
Ω is angular speed in rad/s. R is vessel radius. T is absolute gas temperature in kelvin.
The constant k_B converts temperature to a thermal energy scale.
The function exp(x) means e raised to the power x, where e ≈ 2.718.

The gas speed at the wall is v_wall = ΩR. The vessel wall itself stays still.
The quantity Δm v_wall² / 2 is the difference in rotational kinetic energy between the isotopes at that speed.
The quantity k_B T sets the scale of random thermal motion.
Dividing this energy difference by k_B T gives the exponent. A larger exponent gives a larger separation factor.

At zero rotation or zero mass difference, the exponent is zero and α = 1. There is no composition difference.
This equation assumes ideal neutral gas, rigid rotation, uniform temperature and diffusive equilibrium.
[Read the assumption checks](#equilibrium-assumptions) before using it to describe real equipment.

</details>

At fixed radius and isotope masses, higher angular speed or lower temperature gives stronger ideal equilibrium separation.
The reference below starts at α = 1.20. Compare one change at a time.

<!-- diagram:bias -->

1. [Compare 2× rotation](/?level=2&guide=physics&topic=bias&try=rotation). Keep temperature constant. The heavy/light ratios become more different.
2. [Compare 2× temperature](/?level=2&guide=physics&topic=bias&try=temperature). Keep rotation speed constant. The heavy/light ratios become less different.

<details>
<summary>Why does twice the speed not give twice the separation factor?</summary>

Speed is squared inside the exponential function. Twice the speed makes the exponent four times as large.
It gives the fourth power of the initial separation factor.
Starting from α = 1.20, the new factor is 1.20⁴ ≈ 2.074.

Twice the temperature makes the exponent half as large. The new factor is the square root of the initial factor.
Starting from α = 1.20, the new factor is √1.20 ≈ 1.095.

The natural logarithm, ln α, is the exponent in the equation. The factors four and one half apply to ln α.
They do not directly multiply α, purity or recovery.

</details>

These equilibrium curves do not change your run or calculate the necessary power.
If the curves overlap at 0 s, advance a powered run to a time with nonzero rotation.
[Open the equilibrium calculator](/?level=2&try=equilibrium) for an independent calculation.
To compare with your run, select Use sampled state first. This imports the selected values once.

Stronger drive can also increase heating and wall pressure. Too much cooling can cause lithium to condense on surfaces.
The collection radius changes purity and recovery. The available atom count limits how much product we can collect.
A larger equilibrium factor alone does not give more collected product.
Charged-particle filters use more physics than this neutral-gas model includes.

## 3. How does electricity turn the gas?

Equilibrium assumes gas that already turns. A device also needs a drive that causes this rotation.
A mechanical centrifuge uses a drum: a cylinder whose wall turns and makes the gas turn.
Here, the vessel and electrodes stay still. Electrical drive turns the gas between them.

Electric current is charge in motion. A voltage between the electrodes causes charge to move across the gas.
The voltage gives an electric field that pushes charged particles through the gas.
The current arrow gives the direction of positive-charge flow. Electrons have negative charge and can move in the opposite direction.

Experiments show that a magnetic field applies force to a charge that moves across it.
The force acts at right angles to both the motion and the field.
This is the magnetic part of the Lorentz force law:

<!-- equation:magnetic-force -->

```math
\mathbf{F}_{B}=q\,\mathbf{v}\times\mathbf{B}.
```

Here, F_B is the magnetic force on one charge, q is its signed electric charge, and v is its velocity.
B is magnetic field. The cross product, ×, gives a direction perpendicular to both vectors.
The force magnitude is |q|vB sin θ, where θ is the angle between motion and field.

Motion along the field gives zero magnetic force. Motion across the field gives the largest force at the same speed.
Negative charge reverses the force direction for the same velocity.

The magnetic force changes the direction of motion. It does not directly increase the charge's speed.
The electrical supply supplies energy for rotation and heat. The magnetic field does not supply this energy.

For many charges, their combined motion gives current density J: electric current per area.
The magnetic force on the charged gas per unit volume is

<!-- equation:force-density -->

```math
\mathbf{f}=\mathbf{J}\times\mathbf{B}.
```

The symbol f is magnetic force density (N/m³). J has units of A/m². B has units of tesla (T).
The force acts at right angles to both current and field. This equation adds the magnetic forces from ions and electrons.
It does not require all particles to move in the current direction.

Here, radial current points toward the inner electrode. The axial field points along the cylinder.
The force thus points around the cylinder, in the tangential direction.

At the right of the end view, current points left and the field points toward you. The force points up.
At other positions around the gap, the forces have different directions but the same turning effect about the axis.
This turning effect is torque. Reversing current or field reverses it.

Collisions transfer angular momentum from ions to neutral atoms. Angular momentum measures rotational motion.
Neutral atoms have zero net charge and receive no direct force of the form qv × B.
They turn because collisions transfer motion to them. Thus, the gas can turn while the metal parts stay still.

<!-- diagram:drive -->

Select Current, Turn the ions and Turn the gas in sequence in the diagram.
Then [show gas & drive](/?level=2&guide=physics&topic=drive&try=look) in the 3D equipment.
The dots show populations, not microscopic particle paths.

Find the gas between the two electrodes. Follow an inward current arrow, then the force arrow at the same location.
The force points around the axis, not toward the inner electrode.
The neutral markers then turn because collisions transfer motion. No metal drum needs to turn.

## 4. What sets the rotation speed?

Useful separation needs sufficient speed within the available time. We must compare the drive with losses before we can predict that speed.

The drive continually adds rotational motion. Collisions pass some of it from ions to neutral atoms, while wall drag removes it.
We need a quantity that counts this motion so that we can track transfers and losses. That quantity is angular momentum.

Torque changes angular momentum L over time, not speed immediately.
Moment of inertia ℐ measures resistance to rotation changes.
The same mass farther from the axis has greater inertia. It needs more angular momentum for the same angular speed.
For rigid rotation,

<!-- equation:momentum -->

```math
L=\mathcal{I}\Omega,
\qquad
\frac{dL}{dt}=\tau_{\mathrm{in}}-\tau_{\mathrm{loss}}.
```

The symbol τ is torque. The symbol d/dt means rate of change. For ions and neutral gas,

<!-- equation:coupled -->

```math
\frac{dL_i}{dt}=\tau_{\mathrm{drive}}-\Gamma(\Omega_i-\Omega_n),
\qquad
\frac{dL_n}{dt}=\Gamma(\Omega_i-\Omega_n)-\tau_{\mathrm{wall}}.
```

The collision control sets Γ = ℐᵢνᵢₙ (kg·m²/s). Ion inertia is specified. Neutral inertia changes with mass location.
Collisions exchange angular momentum without changing its total. Wall drag removes it: τ_wall = ν_wall L_n, with ν_wall in s⁻¹.

The collision terms have opposite signs because each transfer removes angular momentum from one population and adds it to the other.
Stronger coupling decreases the speed difference, but does not necessarily increase the neutral speed after acceleration stops.
When drive torque equals wall-loss torque, total angular momentum stops increasing. The gas can then keep turning at constant speeds.

Force farther from the axis gives more torque. Thus, the drive depends on where current crosses the gas.
For radial current I through an annular region in constant axial field B,

<!-- equation:torque -->

```math
\tau_{\mathrm{drive}}=\frac{IB}{2}(R^2-r_{\mathrm{in}}^2).
```

The symbol I is current. ℐ is inertia. The inner radius r_in marks the inner edge of the driven gas region.
Integration of rIB dr across the driven region gives the torque. Thus, electrode radii change the drive.

<!-- diagram:spin -->

Use the powered run from the first experiment.

1. [Replay spin-up](/?level=2&guide=physics&topic=momentum&try=spin). The plot adds speeds when physical time increases. Ion speeds increase first. Collisions then increase neutral gas speed.
2. During rotation, [cut power](/?level=2&guide=physics&topic=momentum&try=cutPower). The gas continues to turn because it has angular momentum.
3. [Show angular momentum](/?level=2&guide=physics&topic=momentum&try=momentum). Total angular momentum equals drive impulse minus wall impulse. Each impulse is torque integrated over time.
   After the power stops, wall drag decreases total angular momentum. Collisions only move it between populations.

The spin-up plot has time on the horizontal axis and speed on the vertical axis.
A rising curve means acceleration. A flat curve means constant speed, not stationary gas.
After power stops, a falling total-angular-momentum curve shows loss to the wall. Ion–neutral transfer alone cannot cause this total loss.

At constant L, outward mass movement increases inertia and decreases angular speed.
Thus, redistribution can change speed even when the total angular momentum stays the same.
Replay keeps the power switches. The first experiment removes those switches and starts from rest.

## 5. Where does the energy go?

At the same rotation speed, more random thermal motion decreases separation. Equilibrium separation increases with Ω²/T.
More current can increase speed and temperature. Heating can remove the increase in separation from faster rotation.

This does not mean all heat is harmful. Lithium must remain in the gas phase, which also requires sufficient temperature.
The separation question is whether the increase in Ω² exceeds the increase in T.
For example, two times Ω and two times T give two times Ω²/T. Two times T alone gives half that ratio.

For constant temperature, cooling must remove net heat input.
Thus, we must calculate separation and cooling power. The drive supplies mechanical power and resistive heat:

<!-- equation:power -->

```math
P_{\mathrm{mechanical}}=\tau_{\mathrm{drive}}\Omega_i,
\qquad
P_{\mathrm{Ohmic}}=I^2R_{\mathrm{electrical}}.
```

Power is the energy rate, in watts. One watt supplies one joule each second.
Mechanical power is torque times angular speed because the torque does work as the gas turns.
A nonzero torque at the instant of rest gives zero instantaneous mechanical power, but it starts acceleration.

At constant field, geometry and conductivity, two times the current gives two times the torque but four times the resistive heat.
Resistance does not include motion-induced voltage. The source also supplies mechanical work.
Collisions change relative rotational energy into heat:

<!-- equation:slip -->

```math
P_{\mathrm{slip}}=\Gamma(\Omega_i-\Omega_n)^2.
```

Slip heating cannot be negative. Collisions decrease the speed difference between populations and convert some organized rotation into random motion.
When both populations have the same angular speed, this slip-heating term is zero.
Wall drag also changes rotational energy into heat.

Mass movement changes rotational energy K = L²/(2ℐ). In the thermal model, this energy difference increases or decreases gas thermal energy.
At constant L, outward movement releases energy. Inward movement can remove heat.
This does not calculate full fluid momentum and energy transport.

For the closed vessel, the continuous energy balance is

<!-- equation:energy -->

```math
\frac{d}{dt}(K_{\mathrm{rotation}}+U_{\mathrm{gas}}+U_{\mathrm{wall}})
=P_{\mathrm{mechanical}}+P_{\mathrm{Ohmic}}-P_{\mathrm{cooling}}.
```

U is thermal energy. Slip and wall friction move energy inside the system. Specified heat fractions set its destination.
Time stepping also removes numerical energy. The energy account records numerical loss and physical heat as separate terms.
Smaller timesteps give a convergence check for this numerical loss.

<!-- diagram:energy -->

[Show drive work](/?level=2&guide=physics&topic=energy&try=work). Curve height is energy in joules. Curve slope is power in watts.
This plot accounts for mechanical energy. Ohmic power is a separate value. Temperature shows cooling energy when thermal evolution is on.

These separate values do not form a complete thermal-energy plot. The default bath keeps temperature constant.
It assumes an external heat source or sink supplies or removes the necessary heat.

With thermal evolution on, compare gas temperature, liner temperature and cooling energy.
A hotter liner can heat the gas. A colder liner can remove heat. Temperature need not increase just because current is positive.

[Tutorial 03](UNDERSTANDING-MASS-SPINNER-03.md) adds temperature changes.
It does not calculate ionization or separate electron and ion temperatures.

## 6. How do time and collection change the result?

Equilibrium tells us a possible final distribution. It does not tell us whether a one-second run reaches that distribution.
Atoms need time to move across the vessel. Diffusivity D describes how quickly their random motion spreads them over distance.
Diffusion moves atoms a typical distance √(Dt), which gives the approximate time

<!-- equation:diffusion -->

```math
t_{\mathrm{diffusion}}\sim\frac{R^2}{D}.
```

D is diffusivity (m²/s). Boundaries and rotation also change the time to equilibrium.
Doubling radius gives four times this diffusion timescale at the same D. Doubling D gives half the timescale.
This is a scale estimate, not the calculated completion time.
[Open diffusivity and separation](/?level=2&try=diffusionExperiment) to compare the calculated distribution with equilibrium.

Enriched gas can contain few atoms. For all gas inside a collection radius,

<!-- equation:collection -->

```math
\mathrm{purity}=\frac{N_{\ell,\mathrm{inside}}}
{N_{\ell,\mathrm{inside}}+N_{h,\mathrm{inside}}},
\qquad
\mathrm{recovery}=\frac{N_{\ell,\mathrm{inside}}}{N_{\ell,\mathrm{whole\ vessel}}}.
```

N counts atoms. With light enrichment near the axis, a smaller inner sample can increase purity but decrease recovery.
Purity divides by all atoms in the sample. Recovery divides by all light atoms in the vessel.

Suppose the vessel contains 100 light atoms. A sample with 10 light and 90 heavy atoms has 10% purity and 10% recovery.
A smaller sample with 5 light and 20 heavy atoms has 20% purity but only 5% recovery.
Higher purity alone therefore does not show that a cut is better.

These fractions measure gas in the vessel, not gas flow through an outlet.

<!-- diagram:inventory-cut -->

[Open the collection experiment](/?level=2&try=collectionExperiment).
Select two probe radii. At the wall, purity is the feed percentage and recovery is one.
An empty sample has no defined purity. If the vessel contains no light species, recovery has no defined value.

The probe does not move the 3D collection marker.
The Inner collection radius / a control changes that marker and starts a new run.

## Which model parts are necessary, and what is missing?

We must know which conclusions the model can show before we use its results. Each missing process limits those conclusions.
The browser can answer, “What does this specified drive do within this model?”
It cannot yet answer, “What voltage and power will a particular Marathon machine need for this measured production rate?”

Drive changes rotation, heating decreases separation at the same speed, and transport changes the distribution over time.
The collection radius selects the sample. Without these connections, more current can appear useful when it is not.

The browser uses bulk speeds and specified transport coefficients. These do not show if the device can continue to operate.
It does not calculate velocity shear, circulation in the radial–axial plane, evaporation, condensation or the discharge energy supply.
The research solver is separate.

We use three checks before we use a prediction:

- In this closed vessel, each isotope must have the same total atom count before and after a run.
  A change in that count shows an error in the calculation, not separation.
- We calculate the same physical problem again with smaller cells and time steps. The results should approach stable values.
  This checks numerical error, not the physical assumptions.
- We compare a prediction with a measurement from the same apparatus and operating conditions.
  We compare the quantity that the instrument measures.
  This checks whether the physical model describes that experiment.

Passing the first two checks does not show agreement with measurements.
Our [argon comparison](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/qualification.html) still disagrees with measurements.
It does not show accuracy for Marathon equipment or lithium gas.
[Tutorial 6](UNDERSTANDING-MASS-SPINNER-06.md#questions) explains these checks and their limits.

## What do the menu options mean?

Use the two coupled views to answer different questions about one run. Use the reference views to examine separate assumptions.

Start with Coupled separation and one plot related to your question. The other views answer different questions about the same equipment.
Gas view changes the display, not the physics. Use Controls to set optional models to on.

<!-- diagram:views -->

| Gas view | Meaning and limit |
|---|---|
| Equilibrium reference | Ideal equilibrium at the bulk reference's last speed. This is not the coupled model's last state. |
| Coupled separation | Density shading and gas-shell displacement during the run. Open rings show ions. Filled dots show neutral gas. |
| Coupled spin-up | The same speeds, radial distributions and rotation clock. The density surface is hidden so you can see the markers. |
| Flow · reference | A schematic reference. It does not calculate inlet/outlet fluid motion or changes in rotor motion caused by flow. |

Both coupled views show rotation at a lower display rate so you can see it. This display scale does not change the calculated speed.
A change of Gas view returns playback to time zero. For a comparison, select the same physical time again.

The time slider selects physical seconds. The label “1 s screen = …” gives the playback scale.
Read the speed in m/s. Do not count displayed turns.

Play/Pause and Rewind select positions in the calculated history. New run starts again with the current settings.
Cut power adds a current step at the selected time. Reference views do not compare time-dependent runs with controlled inputs.

Time plots add data as physical time increases. Radial profiles show values at the selected time.
Parameter scans compare calculated values for different settings.

For a time plot, move along the horizontal axis to read what happens next.
For a radial profile, move along it to read a different location at the same time.
For a parameter scan, move along it to compare different calculations, not later times.
This distinction explains why Play changes some plots but leaves a reference scan unchanged.

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
