# 03 · Can faster rotation stay cool?

[02: rotation and separation](UNDERSTANDING-MASS-SPINNER-02.md) showed why faster rotation helps sorting. Can increasing current heat the gas enough to undo that gain?

## Why add a temperature model?

At a given rotation speed, hotter gas has more random thermal motion and weaker mass sorting. A fixed-temperature run hides this tradeoff: it assumes thermal control holds temperature steady, however much heat the drive supplies.

With energy storage and cooling, we can ask **whether the extra rotation outweighs the heating, and how much heat cooling must remove**. These power terms tell us where energy enters:

```math
P_{\mathrm{mech}}=\tau\Omega_i,\qquad P_{\mathrm{Ohmic}}=I^2R_e.
```

Power is joules per second. Torque τ times ion angular speed Ωᵢ gives mechanical power; current I through electrical resistance Rₑ gives resistive heat. At fixed geometry and conductivity, doubling current doubles torque but quadruples resistive heating. Mechanical work can become rotation, then heat through friction.

**Try one controlled comparison:** [open the heat experiment](/?level=2&try=heatExperiment).

1. Choose Centrifuge → Coupled separation, Isotope separation and an atomic lithium feed. Turn thermal evolution off. Set Run duration to 1 s. Rewind, set current to 0.03 A, then New run to clear earlier power switches. Wait for the accepted result.
2. Select 0.1 s, record speeds and temperature, then pin A. [Open thermal controls](/?level=2&try=thermal) and enable **Evolve gas & liner temperature**. Wait and return to 0.1 s.
3. [Show temperature](/?level=2&try=thermalPlot). Compare with A: temperature can rise or fall depending on heating and cooling.
4. To explain that difference, [show drive work](/?level=2&try=work). Curve heights are joules; slopes are watts. Check the signed budget before assigning a cause.

## Where does the heat go?

The average temperature can hide a thin hot layer beside a cooler wall. Heat must cross that layer to leave the gas, so an average alone cannot tell us the heat flow or hottest temperature. A spatial model divides the gas and liner into cells and transfers heat between neighbors.

```math
q_r=-k\frac{\partial T}{\partial r},\qquad
p=nk_B T.
```

Heat flux qᵣ, in W/m², goes down the temperature gradient; k is thermal conductivity. Local pressure p depends on both number density n and temperature T. These relations motivate separate temperature, energy and pressure plots.

**Try it:** [open the spatial heat experiment](/?level=2&try=spatialHeatExperiment). Enable **Radial tungsten liner**, then **Spatial mixture · experimental**.

[Show temperature profile](/?level=2&try=thermalProfile) at one time: where is the gas warmer, and which way should heat flow?
Both species share one local temperature here. A cell with more atoms can contain more energy without being hotter.

## Can a field change avoid the heating?

The [Magnetic leverage experiment](/?level=2&try=fieldExperiment) asks a different question from changing B alone: it adjusts current to hold reference torque fixed. Then I ∝ 1/B, so resistive heating scales as 1/B². It does not establish that arbitrarily large fields are practical.

Colder is not always better either: a lithium-vapor separator needs its working material to remain in the gas phase. The [surface reference](/?level=2&try=surfaceExperiment) compares conditions with saturation to explore that constraint; it does not evolve evaporation or condensation.

**Boundary:** conductivity, heat exchange and deposition remain prescribed. Early wall layers require joint cell/time refinement; a smooth picture is not evidence of resolution. There is no solved discharge or radial fluid momentum.

[Implementation and assumptions](../src/fuel-operation.ts) · [Try more thermal experiments](/learn-thermal.html) · [Next: 04 · a useful process](UNDERSTANDING-MASS-SPINNER-04.md)
