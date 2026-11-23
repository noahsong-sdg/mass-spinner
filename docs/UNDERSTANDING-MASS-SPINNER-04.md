# Tutorial 4 · Purity and recovery

High purity alone does not give the product quantity. After the [energy cost](UNDERSTANDING-MASS-SPINNER-03.md), this quantity is the next question.
This tutorial separates three decisions: how much gas to keep, whether to repeat separation, and how gas could flow through a process.

## How much light isotope did you keep?

A small central sample can have high light-isotope purity but contain few light atoms. Two quantities show this difference.
Purity asks, “Of all atoms in my sample, what fraction are light?”
Recovery asks, “Of all light atoms that I started with, what fraction did I keep?”
The denominators differ because the questions differ:

<!-- equation:collection -->

```math
x_{\ell,\mathrm{cut}}=\frac{N_{\ell,\mathrm{cut}}}{N_{\ell,\mathrm{cut}}+N_{h,\mathrm{cut}}},
\qquad
\eta_\ell=\frac{N_{\ell,\mathrm{cut}}}{N_{\ell,\mathrm{vessel}}}.
```

N is the number of atoms. The symbols ℓ and h identify the light and heavy isotopes. Purity is the light-isotope number fraction in the sample. Recovery is the fraction of the vessel's light atoms in the sample. A fraction of 0.08 is 8%, not 0.08%.

Suppose the vessel contains 100 light atoms. A sample with 10 light and 90 heavy atoms has 10% purity and 10% recovery.
A smaller sample with 5 light and 20 heavy atoms has 20% purity and 5% recovery.
The second sample is purer but discards more of the desired atoms.

In the diagram, move the collection radius inward. Count both species inside the shaded disk, not only dots near its edge.
The percentages use all gas inside that radius. A local Composition value describes only one location.
Outer rings have more volume, so an average of equally spaced radial percentages does not give the sample purity.

<!-- diagram:inventory-cut -->

[Open the collection experiment](/?level=2&try=collectionExperiment).

1. Select Isotope separation.
2. Select Coupled separation with the two isotopes in the feed.
3. Select two radii on the collection curve.
4. Read the purity and recovery below the plot.

Each cut includes all gas inside its radius. Smaller cuts usually give higher purity and lower recovery. At the wall, purity is the feed light fraction and recovery is 1 (100%). An empty cut has no defined purity. With no light atoms, light recovery is undefined.

The plot probe does not move the 3D collection marker. Inner collection radius / a changes the selected cut and starts a new run. These actions do not calculate extraction flow.

## Why use more than one stage?

One stage may not give the required purity. A stage is one separation step. Its product can become the feed for another step, which enriches it again.
A cascade connects stages through inner and outer streams.

Returning a stream to an earlier stage can recover desired atoms that would otherwise leave in the rejected gas. More stages can give higher purity but cause more internal circulation.
Internal circulation is gas flow between stages, which can exceed the new feed flow.
It requires processing capacity even though it is not additional product.

This stage reference uses equilibrium distributions at the uniform-inertia model's final speed and the specified initial gas temperature.
It does not use the coupled run's selected finite-time distribution. Each ideal stage uses these same routing probabilities.
Thus, it does not connect resolved outlet flows between physical machines.

<!-- diagram:stages -->

[Open the stages experiment](/?level=2&try=stageExperiment).

1. Select Isotope separation.
2. Record product purity, light recovery and circulation/feed.
3. [Change Ideal countercurrent stages](/?level=2&try=stageControls).
4. Compare the three quantities.
5. Change only Feed stage.

Read product purity and recovery together before comparing circulation/feed.
A circulation/feed value of 5 means five units of internal circulation per unit of new feed.
More stages can give lower recovery or higher circulation. This reference uses ideal routing and stage assumptions. It cannot give plant transients or kilograms per hour from a closed-vessel state.

## How much gas can enter a process?

A pure sample does not give a production rate. A process also needs gas to enter and leave.
A closed-vessel sample has an atom count. A continuous process needs an atom flow per second.
A pumping calculation connects pressures to gas load, which is one part of that missing flow description.

The pump and inlet pipe each have a flow limit. This reference gives the necessary upstream pressure for a specified rotating gas state:

<!-- equation:pumping -->

```math
Q=S p_w,\qquad p_u=p_a+Q/C,\qquad S_{\mathrm{eff}}=Q/p_u.
```

S is outer pump speed. C is inlet conductance, the gas-load capacity per pressure difference. The two have units m³/s. Pressure p has units Pa. Gas load Q has units Pa·m³/s. Subscripts w, a and u identify wall, axis and upstream pressures.

Pump speed alone does not give gas load. The pressure at the pump also matters, as Q = S p_w shows.
The inlet pressure must exceed the axis pressure to drive gas through the inlet restriction.
A smaller conductance C needs a larger pressure difference for the same Q.

In the diagram, trace gas from the upstream supply through the inlet and toward the pump.
These equations hold the rotating gas state fixed and ask what supply pressure would sustain that gas load.
They do not hold the upstream supply pressure fixed and predict a new vessel state.

<!-- diagram:pumping -->

[Open the pumping experiment](/?level=2&try=pumpingExperiment).

1. Select Differential pumping.
2. [Increase S](/?level=2&try=pumpControls) with no change to C.
3. Compare gas load, upstream pressure and effective inlet speed.
4. Increase only C.

At larger S, the necessary upstream pressure and gas load are higher. Effective inlet speed approaches C.
The inlet then limits the effective speed even if the outer pump becomes much larger.
Increasing conductance instead reduces the required pressure drop for a specified gas load. This is not flow at fixed upstream pressure or feedback on closed-vessel rotation.

[Routing and pumping implementation](../src/fuel-centrifuge.ts) · [Next: 05 · Fusion fuel cycle](UNDERSTANDING-MASS-SPINNER-05.md)
