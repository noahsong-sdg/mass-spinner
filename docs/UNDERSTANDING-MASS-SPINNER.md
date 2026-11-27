# Understanding Mass Spinner

Start with [Tutorial 1](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/start.html).
Then read [Tutorial 2](UNDERSTANDING-MASS-SPINNER-02.md).

## What turns?

Gas turns between electrodes that do not turn. Ions have an electric charge. Neutral atoms have no net electric charge.
The gas also contains electrons. Lithium-6 and lithium-7 are isotopes: atoms of the same element with different masses.

Electric current flows across the gas between the electrodes. A magnetic field points along the chamber axis.
The force density **J × B** is force for each unit of volume. Its direction is at right angles to the current and field.
J is the electric current for each unit of area.

This force turns the charged gas. Collisions then cause the neutral gas to turn.

```text
Electrical drive → ion rotation → neutral rotation
                         ↓               ↓
                        heat       radial redistribution
```

The two isotope densities can increase from the axis to the wall. The heavier isotope can have a larger wall-to-axis density ratio.
Thus, the light isotope can have a larger share near the axis. The isotopes do not change. No fusion occurs.

## Why calculate more than rotation?

- The electrical drive adds angular momentum. Wall drag removes angular momentum. Ions and neutral atoms can turn at different speeds.
- Faster rotation can increase equilibrium separation. Higher gas temperature can decrease it.
- Separation does not occur immediately. A small inner sample can have higher light-isotope purity but contain only a small fraction of the available light isotope.

A fixed-temperature model uses a constant gas temperature. Thermal control must keep this temperature constant.
An inventory sample does not give an extraction rate.

[Tutorial 2](UNDERSTANDING-MASS-SPINNER-02.md) gives the equations and links to the related controls and plots.

## What does the computer calculate?

| Part | Calculation or display | Limit |
|---|---|---|
| Browser | Bulk ion and neutral rotation, radial species transport, optional gas and wall heat flow | No local fluid momentum or extraction solution |
| 3D scene | Apparatus and calculated quantities | Each tracer is a display marker for many particles. Some dimensions are assumptions. |
| Research backend | Axisymmetric density, flow, current and heat transport | Separate from the browser. Numerical differences and differences from measurements continue to occur. |

Browser inputs go through [worker.ts](../src/worker.ts) to the
[mechanics](../src/fuel-centrifuge.ts), [transport](../src/fuel-transport.ts),
and [thermal evolution](../src/fuel-operation.ts) calculations. The plots and 3D scene use those results.
For fixed inputs, the equilibrium reference gives an ideal condition that does not change with time.
The time simulation calculates how the condition changes.

## What can the results show?

A closure is a model for physics that the calculation does not calculate directly.
Collision rate and conductivity are examples. Sliders change model inputs. These assumptions continue to be necessary.
Electron, gas, and wall temperatures are different quantities.

Verification is a check of the implementation. Convergence studies compare results with smaller time steps or grid cells.
Validation compares predictions with measurements from the same conditions.

The [argon assessment](LIVE-MODEL-QUALIFICATION.md) rejects the live rigid-rotation model with its specified optical interpretation.
Correct numerical test results are not proof of experimental accuracy.

Use the simulator to see cause and effect with the specified assumptions.
Separate scientific evidence is necessary for device predictions of rotation, enrichment, and throughput.
Refer to [How it works](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/how-it-works.html)
and the [plasma mass separation tutorial](https://w3.pppl.gov/~fisch/fischpapers/2018/Zweben_PMF_POP18.pdf).
