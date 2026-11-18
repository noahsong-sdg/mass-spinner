# 03 · Can faster rotation stay cool?

[02: rotation and separation](UNDERSTANDING-MASS-SPINNER-02.md) showed why rotation helps sorting. But the drive also supplies energy. Before increasing current, ask where that energy goes.

## Why add a temperature model?

A flat temperature curve can mean an imposed thermal bath, not an absence of heating. We need to let the gas and wall store energy to see the cost of driving them.

Mechanical power turns the ions; resistance heats the gas:

```math
P_{\mathrm{mech}}=\tau\Omega_i,\qquad P_{\mathrm{Ohmic}}=I^2R_e.
```

Power is joules per second. Torque τ times ion angular speed Ωᵢ gives mechanical power; current I through electrical resistance Rₑ gives resistive heat. At fixed geometry and conductivity, doubling current doubles torque but quadruples resistive heating. Mechanical work can become rotation, then heat through friction.

**Try one controlled comparison:**

1. Choose Centrifuge → Coupled separation, Isotope separation and an atomic lithium feed. Turn thermal evolution off. Set Run duration to 1 s. Rewind, set current to 0.03 A, then New run to clear earlier power switches. Wait for the accepted result.
2. Select 0.1 s, record speeds and temperature, then pin A. Enable **Evolve gas & liner temperature** in Controls. Wait and return to 0.1 s.
3. Compare Temperature and Drive & work. Curve heights in Drive & work are joules; slopes are watts. Temperature can rise or fall depending on heating and cooling. Check the signed budget before explaining the difference.

## Where does the heat go?

A mean temperature cannot show a hot inner wall beside a cooler outer wall. A spatial model divides the gas and liner into cells and transfers heat between neighbors.

```math
q_r=-k\frac{\partial T}{\partial r},\qquad
p=nk_B T.
```

Heat flux qᵣ, in W/m², goes down the temperature gradient; k is thermal conductivity. Local pressure p depends on both number density n and temperature T. These relations motivate separate temperature, energy and pressure plots.

**Try it:** enable **Radial tungsten liner**, then **Spatial mixture · experimental**. Compare Temperature profile, Species energy profile and Gas pressure profile at one time. More cell energy need not mean hotter gas: a cell can contain more atoms. Both species share one local temperature here.

## Can a field change avoid the heating?

The Magnetic leverage plot asks a different question from changing B alone: it adjusts current to hold reference torque fixed. Then I ∝ 1/B, so resistive heating scales as 1/B². It does not establish that arbitrarily large fields are practical.

For a lithium feed, inspect Lithium vapor & surfaces. The saturation curve is a phase-equilibrium reference; it does not evolve evaporation or condensation.

**Boundary:** conductivity, heat exchange and deposition remain prescribed. Early wall layers require joint cell/time refinement; a smooth picture is not evidence of resolution. There is no solved discharge or radial fluid momentum.

[Implementation and assumptions](../src/fuel-operation.ts) · [Try more thermal experiments](/learn-thermal.html) · [Next: 04 · a useful process](UNDERSTANDING-MASS-SPINNER-04.md)
