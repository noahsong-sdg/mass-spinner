# 04 · Does a purer sample make a useful process?

An enriched region is useful only if it contains enough material. [03](UNDERSTANDING-MASS-SPINNER-03.md) considered the energy cost; now ask what you collect and what a continuing process would require.

## How much useful material did you keep?

Keeping a small central sample can improve its isotope mix while discarding most of the isotope you wanted. Purity and recovery answer those different questions.

```math
x_{\ell,\mathrm{cut}}=\frac{N_{\ell,\mathrm{cut}}}{N_{\ell,\mathrm{cut}}+N_{h,\mathrm{cut}}},
\qquad
\eta_\ell=\frac{N_{\ell,\mathrm{cut}}}{N_{\ell,\mathrm{vessel}}}.
```

N counts atoms; ℓ means light and h heavy. Purity divides by **all atoms collected**; recovery divides by **all light atoms available**. A fraction of 0.08 means 8%, not 0.08%.

**Try it:** use a mixed-feed Coupled separation run. Show end-of-run cuts, then probe the curve at two radii. Each cut keeps **all gas inside** that radius. Read the probe values below the plot: smaller cuts usually improve purity but reduce recovery. At the wall, purity equals feed and recovery is 1 (100%). At an empty cut, purity is undefined. With no light atoms, light recovery is undefined.

Probing does not move the 3D collection marker. Its setup control, **Inner collection radius / a**, changes the selected inventory cut and starts a new run. Neither action solves extraction flow.

## Why use more than one stage?

One modest enrichment can be insufficient. A cascade routes one stage's inner and outer streams through neighboring stages to repeat the sorting, with a cost in internal circulation.

**Try it:** open Countercurrent stages. Under Controls → Collection & stages, change **Ideal countercurrent stages**, then **Feed stage**, separately. Record product purity, light recovery and circulation/feed. More stages is not a promise that all three improve together.

This is ideal routing with assumed stage behavior, not a timed plant simulation. It cannot predict kilograms per hour from a closed-vessel snapshot.

## What limits the gas entering a process?

A pump and the pipe leading to it can both restrict effective pumping. This separate reference calculates the upstream pressure required for a prescribed rotating gas state:

```math
Q=S p_w,\qquad p_u=p_a+Q/C,\qquad S_{\mathrm{eff}}=Q/p_u.
```

S is outer pump speed, C inlet conductance (both m³/s); p is pressure (Pa). Gas load Q has units Pa·m³/s. Subscripts w, a and u mean wall, axis and upstream.

**Try it:** choose Differential pumping in Controls, then show its plot. Increase S while holding C fixed. Gas load grows because this reference permits higher required upstream pressure; effective inlet speed approaches C. Then increase C separately. Do not interpret this as fixed-upstream-pressure throughput or feedback on the closed-vessel rotor.

[Routing and pumping implementation](../src/fuel-centrifuge.ts) · [More collection experiments](/learn-collection.html) · [Next: 05 · why fusion needs separation](UNDERSTANDING-MASS-SPINNER-05.md)
