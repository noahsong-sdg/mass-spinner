# Tutorial 5 · Fusion fuel cycle

[04](UNDERSTANDING-MASS-SPINNER-04.md) distinguished a useful sample from a continuous process. Fusion adds another constraint: scarce fuel can sit in processing equipment instead of being available to burn.

## What are the three different jobs?

Separation supports fusion through three distinct material streams:

- Enrichment: sort lithium-6 from lithium-7. The centrifuge redistributes existing isotopes; it creates no tritium.
- Breeding: neutrons interact with lithium in a blanket, potentially producing tritium. A simplified lithium-6 channel is ⁶Li + n → ⁴He + T. Actual breeding depends on transport, materials and losses.
- Exhaust recovery: a D–T fusion plasma consumes only part of injected fuel in one pass. Processing must recover and return unburned fuel.

The Reactor tab's compact beam–target neutron source is also a separate model. Neutron production is not proof of net electric power or a self-sufficient fuel cycle.

## Why keep fuel outside the plasma?

At fixed fusion power, lower burn fraction requires more circulating fuel. Longer processing ties up more of that fuel:

```math
\dot N_T=\frac{P_f}{E_{DT}},\qquad
M_{\mathrm{exhaust}}=m_T\dot N_T\left(\frac{1}{f_b}-1\right)\tau_p.
```

P_f is fusion thermal power (W); E_DT = 17.6 MeV per reaction, converted to joules. Each reaction burns one tritium atom of mass m_T. Burn fraction f_b and processing time τ_p (s) give unburned inventory M (kg).

[open the fuel inventory experiment](/?level=2&try=inventoryExperiment). Read the baseline unburned exhaust inventory.

Then [open fuel inventory controls](/?level=2&try=inventoryControls):

1. Hold Fusion thermal power and Exhaust processing time fixed. Halve Single-pass tritium burn fraction. Read the increased unburned exhaust inventory; its factor need not be exactly two because of the “−1.”
2. Restore burn fraction. Double processing time: this reference inventory doubles at fixed power and burn fraction. Avoid zero power/time when testing a ratio.
3. Check the centrifuge composition: these fuel-accounting inputs do not change lithium transport.

## What would establish a workable fuel cycle?

This is steady processing holdup, not total plant inventory. Startup reserve, storage, decay, leakage, breeding dynamics and equipment residence-time distributions are omitted. Zero loop holdup does not mean a plant needs no tritium. Lithium purity alone cannot establish fuel self-sufficiency.

[Fuel accounting implementation](../src/fuel-centrifuge.ts) · [Inventory experiment](/learn-collection.html#fuel) · [Next: 06 · which prediction to trust](UNDERSTANDING-MASS-SPINNER-06.md)
