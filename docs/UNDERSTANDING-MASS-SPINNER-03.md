# Tutorial 3 · Heating and cooling

[02: rotation and separation](UNDERSTANDING-MASS-SPINNER-02.md) showed why faster rotation helps sorting. Can increasing current heat the gas enough to undo that gain?

## Why add a temperature model?

Hotter gas has more random thermal motion and weaker mass sorting at the same rotation speed. We ask: does extra current improve separation enough to outweigh heating? A fixed-temperature bath assumes cooling removes the net heat; an evolving temperature model must account for it:

```math
P_{\mathrm{mech}}=\tau\Omega_i,\qquad P_{\mathrm{Ohmic}}=I^2R_e.
```

Power is joules per second. Torque τ and ion angular speed Ωᵢ give mechanical power; current I and resistance Rₑ give resistive heat. At fixed field, geometry and conductivity, doubling current doubles torque but quadruples resistive heating. Friction converts rotation into heat.

[open the heat experiment](/?level=2&try=heatExperiment).

1. Choose Centrifuge → Coupled separation, Isotope separation and an atomic lithium feed. Turn thermal evolution off. Set Run duration to 1 s. Rewind, set current to 0.03 A, then New run to clear earlier power switches. Wait for the accepted result.
2. Select 0.1 s, record speeds and temperature, then pin A. [Open thermal controls](/?level=2&try=thermal) and enable Evolve gas & liner temperature. Wait and return to 0.1 s.
3. [Show temperature](/?level=2&try=thermalPlot). Compare with A: temperature can rise or fall depending on heating and cooling.
4. To explain that difference, [show drive work](/?level=2&try=work). Curve heights are joules; slopes are watts. Check the signed budget before assigning a cause.

## Where does the heat go?

An average hides hot layers that control cooling. The spatial model divides gas and liner into cells to calculate heat flow and local temperature:

```math
q_r=-k\frac{\partial T}{\partial r},\qquad
p=nk_B T.
```

Heat flux qᵣ (W/m²) runs down the temperature gradient; k is conductivity. Pressure p depends on number density n and temperature T.

[open the spatial heat experiment](/?level=2&try=spatialHeatExperiment). Enable Radial tungsten liner, then Spatial mixture · experimental.

[Show temperature profile](/?level=2&try=thermalProfile) at one time: where is the gas warmer, and which way should heat flow?
Both species share one local temperature here. A cell with more atoms can contain more energy without being hotter.

## Can a field change avoid the heating?

The [Magnetic leverage experiment](/?level=2&try=fieldExperiment) asks a different question from changing B alone: it adjusts current to hold reference torque fixed. Then I ∝ 1/B, so resistive heating scales as 1/B². It does not establish that arbitrarily large fields are practical.

Lithium must also remain gaseous. The [surface reference](/?level=2&try=surfaceExperiment) compares saturation conditions without evolving evaporation or condensation.

Conductivity, heat exchange and deposition remain prescribed. Wall layers need joint cell/time refinement. Discharge and radial fluid momentum are not solved.

[Implementation and assumptions](../src/fuel-operation.ts) · [Next: 04 · a useful process](UNDERSTANDING-MASS-SPINNER-04.md)
