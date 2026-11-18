# Understanding Mass Spinner

Start with the [interactive walkthrough](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/start.html),
then [Part 2: from rotation to a prediction](UNDERSTANDING-MASS-SPINNER-02.md).

## What rotates?

**Gas, not a metal drum.** An ion is a charged atom or molecule; a neutral has
no net charge. A partially ionized gas contains both, plus electrons.
Isotopes share an element but differ in mass: our example is lithium-6 and lithium-7.

Current crosses the gas radially; a magnetic field points along the chamber.
Their interaction produces sideways force, **J × B**, turning charged gas.
J means current per area. Collisions transfer rotation to neutrals.

```text
Electrical drive → ion rotation → neutral rotation
                         ↓               ↓
                        heat       radial redistribution
```

Both isotopes can become denser toward the wall, the heavier one more strongly.
The inner gas becomes relatively light-rich. This redistributes atoms; it
neither changes isotopes nor computes a fusion reaction.

## Why simulate more than rotation?

- **Drive versus losses:** torque adds angular momentum; wall drag removes it.
  Ions and neutrals need not initially turn together.
- **Rotation versus thermal mixing:** ideal equilibrium sorting strengthens
  with speed squared and weakens with temperature. Heating can erode faster
  rotation’s benefit. Fixed temperature assumes external thermal control.
- **Time and collection:** equilibrium may not be reached. A small light-rich
  sample can have high purity but retain little of the available light isotope.
  Inventory cuts are not extraction rates.

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

A **closure** prescribes unresolved physics, such as collision rate or
conductivity. Moving a slider recalculates that model; it does not make its
assumptions self-consistent. Electron, gas and wall temperatures are distinct.

**Verification** tests equations and conservation; **convergence** tests smaller
cells/timesteps; **validation** tests matched measurements. Numerical success
alone is not experimental accuracy. The [argon assessment](LIVE-MODEL-QUALIFICATION.md)
rejects the live rigid-rotation family under its stated optical interpretation.

Use the playground to learn conditional cause and effect. Accurate hardware
rotation, enrichment and throughput need separate evidence.
See [How it works](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/how-it-works.html)
and the [plasma mass separation tutorial](https://w3.pppl.gov/~fisch/fischpapers/2018/Zweben_PMF_POP18.pdf).
