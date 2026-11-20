# Tutorial 3 · Heating and cooling

[02: rotation and separation](UNDERSTANDING-MASS-SPINNER-02.md) connected rotation with separation.
First, compare separation with and without thermal evolution for the same drive.

## Why add a temperature model?

At the same rotation speed, hotter gas has more random thermal motion and less separation.
More current can increase speed and temperature. Before changing current, test the effect of thermal evolution with the same drive.
To calculate Ω²/T, we must calculate speed and temperature. Cooling must remove net heat input to keep temperature constant.

First calculate the energy supplied each second. Mechanical power turns ions. Electrical resistance produces heat:

```math
P_{\mathrm{mech}}=\tau\Omega_i,\qquad P_{\mathrm{Ohmic}}=I^2R_e.
```

Power is the energy rate, in watts. Torque τ and ion angular speed Ωᵢ give mechanical power.
Current I and electrical resistance Rₑ give resistive heat.
At constant field, geometry and conductivity, two times the current gives two times the torque but four times the resistive heat.
Friction also changes rotational energy into heat.
The balance of energy input and removal sets the gas and liner thermal energy and temperatures.

<!-- diagram:energy -->

[Open the heat experiment](/?level=2&try=heatExperiment).

1. Select Centrifuge → Coupled separation, Isotope separation and an atomic lithium feed.
   Set thermal evolution to off. Set Run duration to 1 s.
2. Select Rewind. Set current to 0.03 A. Select New run to remove earlier power switches.
   Wait until the calculation finishes.
3. Select 0.1 s. [Show composition](/?level=2&try=compositionPlot). Record the speeds, temperature and light percentage.
4. [Select Pin A](/?level=2&try=pin).
5. [Open thermal controls](/?level=2&try=thermal). Set Evolve gas & liner temperature to on.
   Wait until the calculation finishes. Select 0.1 s again.
6. [Show temperature](/?level=2&try=thermalPlot). Compare with A.
   Temperature can increase or decrease, because heating and cooling change it.
7. [Show drive work](/?level=2&try=work). Curve heights are energy in joules. Slopes are power in watts.
   Read the separate Ohmic power value. This plot accounts for mechanical energy, not all heating and cooling.
8. [Show temperature](/?level=2&try=thermalPlot). Read Cooling energy below the plot. Ohmic power and cooling energy are separate from the work curves.
9. [Show the speed history](/?level=2&try=spinPlot). Compare both runs at 0.1 s.
10. [Show composition](/?level=2&try=compositionPlot). Compare both runs at the same radius and 0.1 s.

This comparison shows the combined effect of thermal evolution. Temperature and speed can both change.
Use Compare 2× temperature in Tutorial 2 to isolate temperature at fixed speed.

## Where does the heat go?

A mean temperature does not show hot boundary layers, which can control heat loss.
The spatial model divides the gas and liner into cells. It calculates heat flow between cells and a temperature for each cell:

```math
q_r=-k\frac{\partial T}{\partial r}.
```

Heat flux qᵣ is heat flow divided by area, in W/m². Thermal conductivity k measures heat conduction, in W/(m·K).
The minus sign gives heat flow from hot regions to cold regions.

<!-- diagram:heat-flow -->

1. [Open the spatial heat experiment](/?level=2&try=spatialHeatExperiment).
2. Set Evolve gas & liner temperature to on.
3. In Liner model, select Radial tungsten liner.
4. In Gas model, select Spatial mixture · experimental.
5. Wait until the calculation finishes.
6. [Show temperature profile](/?level=2&try=thermalProfile).
7. Select one physical time.
8. Compare gas and liner temperatures to identify the heat-flow direction.

The two species have the same local temperature in this model.
A cell with more atoms can contain more thermal energy without a higher temperature.

## Can a field change decrease resistive heating?

Higher current can increase resistive heating rapidly. We want the same torque with less heat, if a field change can give it.

The magnetic leverage experiment changes current to keep reference torque constant.
At constant conductivity and geometry, I ∝ 1/B and resistive heating ∝ 1/B².
Two times B gives I/2 and one quarter of the resistive heat.
A stronger field then decreases resistive heating. This result does not show a practical maximum field.
Changing only B at constant current is a different experiment.

<!-- diagram:magnetic -->

[Open the magnetic leverage experiment](/?level=2&try=fieldExperiment).

Lithium must also stay in the gas phase.
The [surface reference](/?level=2&try=surfaceExperiment) compares gas and liner conditions with saturation conditions.
It does not calculate evaporation or condensation over time.

Conductivity, heat exchange and heat deposition are specified.
Use joint spatial and timestep refinement for a wall boundary-layer accuracy test.
The model does not calculate the electrical discharge or radial fluid momentum.

[Implementation and assumptions](../src/fuel-operation.ts) · [Next: 04 · a useful process](UNDERSTANDING-MASS-SPINNER-04.md)
