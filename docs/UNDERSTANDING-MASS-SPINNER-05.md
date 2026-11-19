# Tutorial 5 · Fusion fuel cycle

[Tutorial 4](UNDERSTANDING-MASS-SPINNER-04.md) shows the difference between product purity and quantity. A fusion plant must also have sufficient fuel available. Processing equipment holds some fuel outside the plasma.

## What are the three processes?

Lithium enrichment alone cannot supply a D–T plasma with tritium. We must distinguish three processes to understand what a centrifuge can contribute:

- Enrichment increases the lithium-6 fraction relative to lithium-7. The centrifuge changes the isotope distribution. It makes no tritium.
- Breeding makes tritium through nuclear reactions in a blanket. One reaction is ⁶Li + n → ⁴He + T. The tritium yield changes with neutron transport, materials and losses.
- Exhaust recovery collects unburned D–T fuel. This fuel goes through processing equipment and back into the plasma.

The Reactor tab has a different model for a compact beam–target neutron source. Neutron output does not show net electric power or sufficient tritium production for operation.

## How much fuel stays in processing equipment?

Fuel in processing equipment is unavailable to the plasma. We need its mass to estimate how much fuel the plant must have.

Burn fraction is the number of tritium atoms used in fusion divided by the number injected in one pass. At fixed fusion power, more fuel circulation is necessary when burn fraction is lower. Longer processing time increases the fuel inventory outside the plasma:

```math
\dot N_T=\frac{P_f}{E_{DT}},\qquad
M_{\mathrm{exhaust}}=m_T\dot N_T\left(\frac{1}{f_b}-1\right)\tau_p.
```

P_f is fusion thermal power (W). E_DT is 17.6 MeV per reaction, converted to joules. Each reaction uses one tritium atom of mass m_T. Burn fraction f_b and processing time τ_p (s) give unburned exhaust inventory M (kg).

[Open the fuel inventory experiment](/?level=2&try=inventoryExperiment).

1. Set Fusion thermal power to 1000 MW.
2. Set Exhaust processing time to 100 s.
3. Set Single-pass tritium burn fraction to 0.05.
4. Record the unburned exhaust inventory.
5. Keep power and processing time unchanged.
6. [Set Single-pass tritium burn fraction](/?level=2&try=inventoryControls) to 0.025.
7. Compare the inventory with the initial value.

The inventory increases, but not by exactly a factor of two because the equation includes “−1.”

8. Set the burn fraction to 0.05 again.
9. Set the processing time to 200 s.
10. Compare the inventory again.

At fixed power and burn fraction, two times the processing time gives two times the inventory.
This ratio applies only with positive power and time, and a burn fraction below one.
These inputs do not change lithium transport.

## Does this give the total fuel inventory?

An exhaust estimate covers only one fuel location. Before we use it to size a plant, we must identify the other inventories.

For constant fuel flow, the equation gives exhaust-processing inventory, not total plant inventory. It does not include startup reserves, storage, decay, leakage or evolving breeding. It uses one processing time instead of a distribution of times. Zero processing inventory does not mean zero plant inventory. Lithium purity alone does not show sufficient tritium production for operation.

[Fuel accounting implementation](../src/fuel-centrifuge.ts) · [Next: 06 · Model accuracy](UNDERSTANDING-MASS-SPINNER-06.md)
