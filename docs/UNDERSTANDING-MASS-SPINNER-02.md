# Understanding Mass Spinner · 2

## From rotation to a prediction

The [first guide](UNDERSTANDING-MASS-SPINNER.md) introduced the machine: current
and magnetic field drive ions; collisions spin up neutral gas; rotation can
separate masses. This guide connects that picture to equations you can reason
with. Read the physical meaning first. The algebra gives you a way to check it.

## 1. A rotating gas needs a pressure gradient

An atom moving around a circle continually changes direction. Its inward
acceleration is `vθ²/r`. The gas needs an inward force to maintain that motion.
Pressure supplies it: higher pressure outside pushes inward more strongly than
lower pressure inside pushes outward.

For steady circular motion, ignoring other radial forces,

`dp/dr = ρ vθ²/r`.

Here `p` is pressure, `ρ` mass density, `r` radius and `vθ` tangential speed.
For rigid rotation, `vθ = Ωr`, so

`dp/dr = ρ Ω²r`.

“Rigid” means every radius has the same angular speed Ω, not the same
tangential speed. Gas at twice the radius moves twice as fast.

In the laboratory frame, the pressure force supplies inward acceleration.
In a frame rotating with the gas, we describe pressure balancing the outward
centrifugal term. These are two descriptions of the same balance.

If we initialize uniform pressure and nonzero rotation, that balance is absent:
radial motion is expected. A good test for *artificial* radial motion must
initialize the balancing pressure gradient as well.

## 2. Why heavier atoms favor the wall

Consider an ideal neutral species with mass per atom `m`, number density `n`
and uniform temperature `T`. Its partial pressure is `p = nkBT`; its mass
density is `ρ = mn`. In rigid rotational equilibrium:

`kBT dn/dr = mnΩ²r`.

Divide by `n kBT` and integrate between the axis and radius r:

`ln[n(r)/n(0)] = mΩ²r²/(2kBT)`.

Both species concentrate outward. Taking their ratio reveals the separation:

`α = [(nh/nl) at wall] / [(nh/nl) at axis]`

`ln α = (mh − ml) Ω²R²/(2kBT) = Δm vwall²/(2kBT)`.

The subscripts h/l mean heavy/light; R is the chamber radius. The crucial
quantity is **rotation energy associated with the mass difference, divided by
thermal energy**. Its dimensionless value is the exponent, not α itself.

At fixed temperature, doubling angular speed multiplies `ln α` by four.
Doubling temperature at fixed speed halves `ln α`. Doubling both speed and
temperature doubles `ln α`.

For a hypothetical baseline with α = 2:

| Change | New ideal α |
|---|---:|
| Double Ω, keep T fixed | 16 |
| Double T, keep Ω fixed | √2 ≈ 1.41 |
| Double both Ω and T | 4 |

These illustrate the equation, not a particular machine's performance.

These are equilibrium neutral-gas relationships, not a general formula for
charged-species separation. Electric fields, different population temperatures,
non-rigid flow and transport can change the result. The tutorial's plasma
filters and a partially ionized neutral centrifuge share ideas without having
identical equations.

Most importantly, **α is not product purity or production rate**. It compares
two local composition ratios. To predict a collected product, we also need the
whole distribution, inlet/outlet locations and flows, and time to establish
separation. A tiny enriched sample can have excellent purity and poor recovery.

## 3. More current is a coupled tradeoff

Use I for electrical current and ℐ for gas moment of inertia:

`L = ℐΩ`, and `dL/dt = applied torque − loss torque`.

Current and magnetic field supply torque. In the simple annular radial-current
reference, `τ = IB(R² − rin²)/2`. That says how rapidly angular momentum is
supplied; it does not directly prescribe speed. Inertia and losses determine
the response.

The mechanical power delivered to a rigid rotating population is `P = τΩ`.
Electrical power also supplies resistive heat. In the simple resistive reference,
with fixed conductivity, geometry and current pattern, doubling current doubles
the reference torque but quadruples resistive heating. That comparison is for
prescribed current; prescribed voltage is a different experiment. Motion can
change both the required voltage and the spatial current pattern.

Collisions help transfer torque from ions to neutrals, but relative motion
dissipates energy. Increasing drive can therefore increase both Ω and T.
Whether separation improves depends on the resulting `Ω²/T`, rather than the
current slider alone. Temperatures of electrons, ions, neutral gas and walls
need not be equal.

There is feedback in the other direction too: moving gas outward increases ℐ.
At conserved L, the rotation slows. If ℐ doubles while L stays fixed, Ω halves
and rotational kinetic energy `K = L²/(2ℐ)` halves. A consistent model must
account for that energy change through the other work and energy terms.
Recomputing a distribution while holding speed fixed implicitly assumes an
angular-momentum source can maintain that speed.

## 4. What “solving the flow” adds

An equilibrium formula describes a possible final balance. It does not tell
us how the apparatus gets there. A flow calculation also follows transport:

`∂ρ/∂t + (1/r)∂(rρur)/∂r + ∂(ρuz)/∂z = 0`.

This is conservation of mass in an axisymmetric chamber. The speeds ur and uz
describe radial and axial motion. “Meridional flow” means motion in this
radius–length plane, alongside the circular motion around the axis.

An endwall can brake circular motion. That changes centrifugal support, which
changes pressure balance and can drive radial/axial circulation. The circulation
then transports angular momentum, species and heat. This is why a single bulk
angular speed cannot represent every measured velocity profile.

The research solver divides this plane into cells. It stores **amounts** in
each cell: mass, momentum, angular momentum, energy and species mass. A shared
face flux leaves one cell and enters its neighbor. Current, viscosity and heat
transport are coupled to those evolving quantities using additional operators.
The model assumes rotational symmetry; its cells are not a full 3D turbulent
plasma calculation.

The current argon research campaign is a short, closed, adiabatic control:
electrical work enters, but heat cannot leave. Sustained positive net power
therefore prevents steady total energy. Its four-microsecond history cannot
establish the experiment's steady thermal state. A physically justified energy
exhaust and population-energy model is a separate requirement, not something
smaller cells can supply.

The browser model is deliberately faster and simpler. Its 3D scene visualizes
computed populations and fields; adding realistic surfaces or more dots does
not add missing momentum equations.

## 5. Three different reasons a prediction can be wrong

| Question | Example | Evidence needed |
|---|---|---|
| Did we implement the equations correctly? | Balanced gas moves because pressure and centrifugal source were discretized differently | Analytical controls and conservation checks |
| Have we resolved their solution? | An endwall layer changes when cells get smaller | Spatial and timestep convergence |
| Do these equations describe this experiment? | Prescribed conductivity or optical weighting does not represent the apparatus | Matched measurements, uncertainty and predictions without refitting |

The radial-balance correction addresses the first row. On one equilibrium
control, radial RMS speed fell from 0.127 m/s to about `3.7 × 10⁻¹³ m/s`.
That is numerical cancellation, not a measurement of physical gas motion.

The complete coupled study still fails six spatial checks. Its density-change
differences are 21–24%, while total density differences are much smaller:
subtracting the initial density asks whether we resolve the *change* we claim
to predict. Neither percentage is an absolute error against a known solution.
The experimental optical comparison also still fails. See the
[V103 evidence](../RADIAL-BALANCE-V103.md) for the exact conditions and limits.

Finally, an instrument measures a signal. A Doppler observation can combine
light from gas at several radii, weighted by emissivity and viewing geometry.
Comparing that signal with a simulated local velocity requires a diagnostic
model. Better flow numerics alone cannot correct an unjustified measurement
interpretation.

## Check your understanding

Try answering before opening the explanation. These are practice questions,
not prerequisites for using the playground.

<details><summary>1. Double Ω and quadruple T. Does ideal equilibrium separation improve?</summary>

No. Ω²/T is unchanged, so α is unchanged under these assumptions. The drive
power, stresses and time to equilibrium could still differ.

</details>

<details><summary>2. Two species both become denser near the wall. Has separation failed?</summary>

Not necessarily. Separation concerns their relative abundance. If the heavy
species increases more strongly, the local heavy/light ratio still changes.

</details>

<details><summary>3. More current produces faster rotation. Is that enough to predict higher purity?</summary>

No. Check heating, transport time, the composition profile and the collection
cut. Even a larger equilibrium α does not specify collected product purity.

</details>

<details><summary>4. Energy balances to twelve digits. Are the temperatures experimentally accurate?</summary>

No. The code can conserve energy perfectly while depositing it in the wrong
place, using the wrong heat-transfer law or omitting a physical energy channel.

</details>

<details><summary>5. What would make this a useful predictive simulator?</summary>

A declared operating range where numerical errors are small, selected
observables match justified experiments with uncertainty, and the fast browser
model reproduces the qualified reference. Argon rotation evidence alone would
not establish lithium enrichment or extraction performance.

</details>

The next reading step is to pick one operating point and trace its torque,
angular momentum, heat, rotation and composition together. Before moving a
slider, predict the direction of each change; afterward, explain any difference
using the assumptions above.

Sources: [plasma mass separation tutorial](https://w3.pppl.gov/~fisch/fischpapers/2018/Zweben_PMF_POP18.pdf),
[Marathon's public fuel-cycle description](https://www.marathonfusion.com/fusion-energy/),
[live equations](../src/fuel-centrifuge.ts), [research flow operator](../scientific/mixture-axial-v75/flow.py).
