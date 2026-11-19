# Tutorial 4 · Purity and recovery

After the [energy cost](UNDERSTANDING-MASS-SPINNER-03.md), ask what you can collect: enrichment is useful only if enough material remains.

## How much useful material did you keep?

A small central sample can be light-rich yet retain few light atoms. Track both:

```math
x_{\ell,\mathrm{cut}}=\frac{N_{\ell,\mathrm{cut}}}{N_{\ell,\mathrm{cut}}+N_{h,\mathrm{cut}}},
\qquad
\eta_\ell=\frac{N_{\ell,\mathrm{cut}}}{N_{\ell,\mathrm{vessel}}}.
```

N counts atoms; ℓ means light and h heavy. Purity divides by all atoms collected; recovery divides by all light atoms available. A fraction of 0.08 means 8%, not 0.08%.

[open the collection experiment](/?level=2&try=collectionExperiment). Use a mixed-feed Coupled separation run, then probe the curve at two radii. Each cut keeps all gas inside that radius. Read the probe values below the plot: smaller cuts usually improve purity but reduce recovery. At the wall, purity equals feed and recovery is 1 (100%). At an empty cut, purity is undefined. With no light atoms, light recovery is undefined.

Probing does not move the 3D collection marker. Its setup control, Inner collection radius / a, changes the selected inventory cut and starts a new run. Neither action solves extraction flow.

## Why use more than one stage?

A cascade repeats modest enrichment by routing inner and outer streams between stages. This costs internal circulation.

[open the stages experiment](/?level=2&try=stageExperiment) and record product purity, light recovery and circulation/feed.

Then [adjust stages](/?level=2&try=stageControls): change Ideal countercurrent stages, then Feed stage, separately. More stages is not a promise that all three measures improve together.

This is ideal routing with assumed stage behavior, not a timed plant simulation. It cannot predict kilograms per hour from a closed-vessel snapshot.

## What limits the gas entering a process?

The pump and inlet pipe both restrict flow. This separate reference calculates upstream pressure for a prescribed rotating gas state:

```math
Q=S p_w,\qquad p_u=p_a+Q/C,\qquad S_{\mathrm{eff}}=Q/p_u.
```

S is outer pump speed, C inlet conductance (both m³/s); p is pressure (Pa). Gas load Q has units Pa·m³/s. Subscripts w, a and u mean wall, axis and upstream.

[open the pumping experiment](/?level=2&try=pumpingExperiment), then choose Differential pumping.

Now [adjust pump speed](/?level=2&try=pumpControls): increase S while holding C fixed. Gas load grows because this reference permits higher required upstream pressure; effective inlet speed approaches C. Then increase C separately. Do not interpret this as fixed-upstream-pressure throughput or feedback on the closed-vessel rotor.

[Routing and pumping implementation](../src/fuel-centrifuge.ts) · [Next: 05 · why fusion needs separation](UNDERSTANDING-MASS-SPINNER-05.md)
