# Understanding Mass Spinner

Start with the [interactive walkthrough](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/start.html),
then [Part 2: from rotation to a prediction](UNDERSTANDING-MASS-SPINNER-02.md).

## What rotates?

Gas rotates inside stationary electrodes. Ions carry charge; neutrals do not.
The gas also contains electrons. Lithium-6 and lithium-7 are isotopes: the same
element with different masses.

Current crosses the gas radially; a magnetic field points along the chamber.
Their interaction produces sideways force, **J × B**, turning charged gas.
J means current per area. Collisions transfer rotation to neutrals.

```text
Electrical drive → ion rotation → neutral rotation
                         ↓               ↓
                        heat       radial redistribution
```

Both isotopes can become denser toward the wall, the heavier one more strongly.
The center becomes relatively light-rich. No isotopes change and no fusion occurs.

## Why simulate more than rotation?

- Drive adds angular momentum; wall drag removes it. Ions and neutrals can differ in speed.
- Ideal sorting strengthens with speed squared and weakens with temperature.
  Heating can offset faster rotation; fixed temperature assumes thermal control.
- Separation takes time. A small light-rich cut can retain little light inventory;
  cutting inventory does not predict extraction rate.

[Part 2](UNDERSTANDING-MASS-SPINNER-02.md) derives these relationships and
connects each to a control and plot.

## What does the computer calculate?

| Part | Solves | Boundary |
|---|---|---|
| Browser | Bulk ion/neutral rotation, radial species transport, optional gas/wall heat flow | No local fluid momentum or extraction solution |
| 3D scene | Displays apparatus and computed quantities | Weighted tracers, not microscopic trajectories; unpublished dimensions remain assumed |
| Research backend | Axisymmetric density, flow, current and heat transport | Separate from the browser; unresolved numerical/experimental disagreement |

Browser inputs pass through [worker.ts](../src/worker.ts) into
[mechanics](../src/fuel-centrifuge.ts), [transport](../src/fuel-transport.ts)
and [thermal evolution](../src/fuel-operation.ts). Plots and 3D use those results.
Equilibrium overlays and evolving distributions answer different questions.

## What deserves trust?

A closure prescribes unresolved physics, such as collision rate or conductivity.
Sliders recalculate those assumptions rather than resolve them. Electron, gas
and wall temperatures remain distinct.

Verification checks implementation; convergence checks refinement; validation
checks matched measurements. The [argon assessment](LIVE-MODEL-QUALIFICATION.md)
rejects live rigid rotation under its stated optical interpretation. Numerical
success does not establish experimental accuracy.

Use the playground to learn conditional cause and effect. Accurate hardware
rotation, enrichment and throughput need separate evidence.
See [How it works](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/how-it-works.html)
and the [plasma mass separation tutorial](https://w3.pppl.gov/~fisch/fischpapers/2018/Zweben_PMF_POP18.pdf).
