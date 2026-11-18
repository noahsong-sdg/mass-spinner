# 05 · Why does fusion need separation?

[04](UNDERSTANDING-MASS-SPINNER-04.md) distinguished a useful sample from a continuous process. Fusion adds another constraint: scarce fuel can sit in processing equipment instead of being available to burn.

## What are the three different jobs?

Lithium enrichment, tritium breeding and exhaust recovery act on different material streams. Understanding their connection does not require pretending they are one machine.

- **Enrichment:** sort lithium-6 from lithium-7. The centrifuge redistributes existing isotopes; it creates no tritium.
- **Breeding:** neutrons interact with lithium in a blanket, potentially producing tritium. A simplified lithium-6 channel is ⁶Li + n → ⁴He + T. Actual breeding depends on transport, materials and losses.
- **Exhaust recovery:** a D–T fusion plasma consumes only part of injected fuel in one pass. Processing must recover and return unburned fuel.

The Reactor tab's compact beam–target neutron source is also a separate model. Neutron production is not proof of net electric power or a self-sufficient fuel cycle.

## Why keep fuel outside the plasma?

At a specified fusion power, the reaction rate sets how fast tritium burns. If a smaller fraction burns per pass, more must circulate. If processing takes longer, more fuel waits in that loop.

```math
\dot N_T=\frac{P_f}{E_{DT}},\qquad
M_{\mathrm{exhaust}}=m_T\dot N_T\left(\frac{1}{f_b}-1\right)\tau_p.
```

P_f is fusion thermal power in watts; E_DT = 17.6 MeV is energy per D–T reaction, converted to joules in the calculation. One tritium atom is burned per reaction. Its mass is m_T; f_b is single-pass burn fraction, and τ_p is exhaust processing time in seconds. The result M is kilograms of unburned tritium held in processing.

**Try it:** in Centrifuge, [show D–T fuel inventory](/?level=2&try=fuelInventory). Read the baseline unburned exhaust inventory.

Then [open fuel inventory controls](/?level=2&try=inventoryControls):

1. Hold Fusion thermal power and Exhaust processing time fixed. Halve Single-pass tritium burn fraction. Read the increased unburned exhaust inventory; its factor need not be exactly two because of the “−1.”
2. Restore burn fraction. Double processing time: this reference inventory doubles at fixed power and burn fraction. Avoid zero power/time when testing a ratio.
3. Check the centrifuge composition: these fuel-accounting inputs do not change lithium transport.

## What would establish a workable fuel cycle?

This steady reference explains processing holdup, not total plant inventory. It omits startup reserve, storage, decay, leakage, breeding dynamics and real equipment residence-time distributions. A zero processing time giving zero loop holdup does not mean zero tritium is needed by a plant.

**Check your understanding:** would excellent lithium purity alone establish tritium self-sufficiency? No: breeding, extraction, recycling, losses and inventory must also close.

[Fuel accounting implementation](../src/fuel-centrifuge.ts) · [Inventory experiment](/learn-collection.html#fuel) · [Next: 06 · which prediction to trust](UNDERSTANDING-MASS-SPINNER-06.md)
