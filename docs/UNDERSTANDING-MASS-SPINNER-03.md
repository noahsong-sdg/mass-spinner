# Tutorial 3 · Heating and cooling

[02: rotation and separation](UNDERSTANDING-MASS-SPINNER-02.md) connected rotation with separation.
The next question is if more current can increase gas temperature sufficiently to remove the increase in separation.

## Why add a temperature model?

At the same rotation speed, hotter gas has more random thermal motion and less separation.
Does more current increase separation when it increases temperature?
To calculate Ω²/T, we must calculate speed and temperature. Cooling must remove net heat input to keep temperature constant.

First calculate the energy supplied each second. Mechanical power turns ions. Electrical resistance produces heat:

```math
P_{\mathrm{mech}}=\tau\Omega_i,\qquad P_{\mathrm{Ohmic}}=I^2R_e.
```

Power is the energy rate, in watts. Torque τ and ion angular speed Ωᵢ give mechanical power.
Current I and electrical resistance Rₑ give resistive heat.
At constant field, geometry and conductivity, two times the current gives two times the torque but four times the resistive heat.
Friction also changes rotational energy into heat.
The balance of energy input and removal sets the stored energy and temperature.

[Open the heat experiment](/?level=2&try=heatExperiment).

1. Select Centrifuge → Coupled separation, Isotope separation and an atomic lithium feed.
   Set thermal evolution to off. Set Run duration to 1 s.
2. Select Rewind. Set current to 0.03 A. Select New run to remove earlier power switches.
   Wait until the calculation finishes.
3. Select 0.1 s. Record the speeds and temperature. Select Pin A.
4. [Open thermal controls](/?level=2&try=thermal). Set Evolve gas & liner temperature to on.
   Wait until the calculation finishes. Select 0.1 s again.
5. [Show temperature](/?level=2&try=thermalPlot). Compare with A.
   Temperature can increase or decrease, because heating and cooling change it.
6. [Show drive work](/?level=2&try=work). Curve heights are energy in joules. Slopes are power in watts.
   Use the energy account to identify the cause of the difference.

## Where does the heat go?

A mean temperature does not show hot boundary layers, which can control heat loss.
The spatial model divides the gas and liner into cells. It calculates heat flow between cells and a temperature for each cell:

```math
q_r=-k\frac{\partial T}{\partial r},\qquad
p=nk_B T.
```

Heat flux qᵣ is heat flow divided by area, in W/m². Thermal conductivity k measures heat conduction, in W/(m·K).
The minus sign gives heat flow from hot regions to cold regions.
Calculate pressure p from number density n, temperature T and Boltzmann's constant k_B.

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

The [Magnetic leverage experiment](/?level=2&try=fieldExperiment) changes current to keep reference torque constant.
At constant conductivity and geometry, I ∝ 1/B and resistive heating ∝ 1/B².
Two times B gives I/2 and one quarter of the resistive heat.
A stronger field then decreases resistive heating. This result does not show a practical maximum field.
Changing only B at constant current is a different experiment.

Lithium must also stay in the gas phase.
The [surface reference](/?level=2&try=surfaceExperiment) compares gas and liner conditions with saturation conditions.
It does not calculate evaporation or condensation over time.

Conductivity, heat exchange and heat deposition are specified.
Use joint spatial and timestep refinement for a wall boundary-layer accuracy test.
The model does not calculate the electrical discharge or radial fluid momentum.

[Implementation and assumptions](../src/fuel-operation.ts) · [Next: 04 · a useful process](UNDERSTANDING-MASS-SPINNER-04.md)
