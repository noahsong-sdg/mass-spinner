# Tutorial 4 · Purity and recovery

High purity alone does not give the product quantity. After the [energy cost](UNDERSTANDING-MASS-SPINNER-03.md), this quantity is the next question.

## How much light isotope did you keep?

A small central sample can have high light-isotope purity but contain few light atoms. Two quantities show this difference:

```math
x_{\ell,\mathrm{cut}}=\frac{N_{\ell,\mathrm{cut}}}{N_{\ell,\mathrm{cut}}+N_{h,\mathrm{cut}}},
\qquad
\eta_\ell=\frac{N_{\ell,\mathrm{cut}}}{N_{\ell,\mathrm{vessel}}}.
```

N is the number of atoms. The symbols ℓ and h identify the light and heavy isotopes. Purity is the light-isotope number fraction in the sample. Recovery is the fraction of the vessel's light atoms in the sample. A fraction of 0.08 is 8%, not 0.08%.

[Open the collection experiment](/?level=2&try=collectionExperiment).

1. Select Isotope separation.
2. Select Coupled separation with the two isotopes in the feed.
3. Select two radii on the collection curve.
4. Read the purity and recovery below the plot.

Each cut includes all gas inside its radius. Smaller cuts usually give higher purity and lower recovery. At the wall, purity is the feed light fraction and recovery is 1 (100%). An empty cut has no defined purity. With no light atoms, light recovery is undefined.

The plot probe does not move the 3D collection marker. Inner collection radius / a changes the selected cut and starts a new run. These actions do not calculate extraction flow.

## Why use more than one stage?

One stage may not give the required purity. A cascade connects stages through inner and outer streams. More stages can give higher purity but cause more internal circulation.

[Open the stages experiment](/?level=2&try=stageExperiment).

1. Select Isotope separation.
2. Record product purity, light recovery and circulation/feed.
3. [Change Ideal countercurrent stages](/?level=2&try=stageControls).
4. Compare the three quantities.
5. Change only Feed stage.

More stages can give lower recovery or higher circulation. This reference uses ideal routing and stage assumptions. It cannot give plant transients or kilograms per hour from a closed-vessel state.

## How much gas can enter a process?

A pure sample does not give a production rate. A process also needs gas to enter and leave.

The pump and inlet pipe each have a flow limit. This reference gives the necessary upstream pressure for a specified rotating gas state:

```math
Q=S p_w,\qquad p_u=p_a+Q/C,\qquad S_{\mathrm{eff}}=Q/p_u.
```

S is outer pump speed. C is inlet conductance, the gas-load capacity per pressure difference. The two have units m³/s. Pressure p has units Pa. Gas load Q has units Pa·m³/s. Subscripts w, a and u identify wall, axis and upstream pressures.

[Open the pumping experiment](/?level=2&try=pumpingExperiment).

1. Select Differential pumping.
2. [Increase S](/?level=2&try=pumpControls) with no change to C.
3. Compare gas load, upstream pressure and effective inlet speed.
4. Increase only C.

At larger S, the necessary upstream pressure and gas load are higher. Effective inlet speed approaches C. This is not flow at fixed upstream pressure or feedback on closed-vessel rotation.

[Routing and pumping implementation](../src/fuel-centrifuge.ts) · [Next: 05 · Fusion fuel cycle](UNDERSTANDING-MASS-SPINNER-05.md)
