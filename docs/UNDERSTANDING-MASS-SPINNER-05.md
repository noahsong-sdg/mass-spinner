# Tutorial 5 · Fusion fuel cycle

[Tutorial 4](UNDERSTANDING-MASS-SPINNER-04.md) shows the difference between product purity and quantity. A fusion plant must also have sufficient fuel available. Processing equipment holds some fuel outside the plasma.
This tutorial explains why faster processing can reduce the required fuel supply, even when fusion power stays the same.
It also distinguishes a lithium isotope separator from a fusion reactor.

## What are the three processes?

Lithium enrichment alone cannot supply a D–T plasma with tritium. A D–T fusion reaction combines deuterium and tritium to produce helium-4 and a neutron.
Deuterium and tritium are hydrogen isotopes, not lithium isotopes. Lithium can help supply tritium through a different nuclear reaction.
The three processes below therefore have different inputs and outputs:

- Enrichment increases the lithium-6 fraction relative to lithium-7. The centrifuge changes the isotope distribution. It makes no tritium.
- Breeding makes tritium through nuclear reactions in a blanket. One reaction is ⁶Li + n → ⁴He + T. The tritium yield changes with neutron transport, materials and losses.
- Exhaust recovery collects unburned D–T fuel. This fuel goes through processing equipment and back into the plasma.

The Reactor tab has a different model for a compact beam–target neutron source. Neutron output does not show net electric power or sufficient tritium production for operation.

In the diagram, follow two paths separately. Lithium enrichment supplies lithium for a breeding blanket.
Exhaust recovery returns unburned hydrogen fuel to the plasma.
A change in lithium purity does not directly change the exhaust-processing delay or the single-pass tritium burn fraction.

<!-- diagram:fuel-cycle -->

## How much fuel stays in processing equipment?

Fuel in processing equipment is unavailable to the plasma. Its mass is part of the necessary plant inventory.
Even a process with no fuel losses needs fuel while earlier material is still inside the processing equipment.
At constant flow, the amount inside equals the amount entering each second multiplied by the time spent inside.

Burn fraction is the number of tritium atoms used in fusion divided by the number injected in one pass. At fixed fusion power, more fuel circulation is necessary when burn fraction is lower. Longer processing time increases the fuel inventory outside the plasma:

For example, inject 100 tritium atoms and consume five. The burn fraction is 0.05, and 95 atoms leave unburned.
Injected flow equals consumed flow divided by burn fraction. Subtract consumed flow to find unburned flow.
Multiplying unburned flow by processing time gives the number of atoms held in processing equipment.

<!-- equation:fuel -->

```math
\dot N_T=\frac{P_f}{E_{DT}},\qquad
M_{\mathrm{exhaust}}=m_T\dot N_T\left(\frac{1}{f_b}-1\right)\tau_p.
```

The first equation gives consumed tritium flow in atoms/s. P_f is fusion thermal power (W). E_DT is 17.6 MeV per reaction, converted to joules. Each reaction uses one tritium atom of mass m_T. Burn fraction f_b and processing time τ_p (s) give unburned exhaust inventory M (kg).

The factor `(1/f_b − 1)` subtracts consumed flow from injected flow. The mass per atom converts the held atom count to mass.

<!-- diagram:inventory -->

[Open the fuel inventory experiment](/?level=2&try=inventoryExperiment).

1. Set Fusion thermal power to 1000 MW.
2. Set Exhaust processing time to 100 s.
3. Set Single-pass tritium burn fraction to 0.05.
4. Record the unburned exhaust inventory.
5. Keep power and processing time unchanged.
6. [Set Single-pass tritium burn fraction](/?level=2&try=inventoryControls) to 0.025.
7. Compare the inventory with the initial value.

The inventory increases, but not by exactly a factor of two because the equation includes “−1.”
At a burn fraction of 0.05, exhaust flow is 19 times consumed flow. At 0.025, it is 39 times consumed flow.
The inventory ratio is therefore 39/19, about 2.05, at the same power and processing time.
The plant burns the same number of tritium atoms per second, but more atoms circulate without burning.

8. Set the burn fraction to 0.05 again.
9. Set the processing time to 200 s.
10. Compare the inventory again.

At fixed power and burn fraction, two times the processing time gives two times the inventory.
This ratio applies only with positive power and time, and a burn fraction below one.
These inputs do not change lithium transport.

In the plot, the horizontal axis is burn fraction, not elapsed time.
The selected point gives the inventory for your inputs. Changing processing time changes the inventory curve; it does not animate lithium separation.

## Does this give the total fuel inventory?

An exhaust estimate includes only one fuel location. Before we use it for a plant, we must find the other inventories.
Think of each location as a separate fuel account: plasma, processing equipment, storage and breeding equipment.
A smaller exhaust account reduces one requirement. It does not prove the plant can replace all consumed tritium.

For constant fuel flow, the equation gives exhaust-processing inventory, not total plant inventory. It does not include startup reserves, storage, decay, leakage or evolving breeding. It uses one processing time instead of a distribution of times. Zero processing inventory does not mean zero plant inventory. Lithium purity alone does not show sufficient tritium production for operation.

<!-- diagram:scope -->

[Fuel accounting implementation](../src/fuel-centrifuge.ts) · [Next: 06 · Model accuracy](UNDERSTANDING-MASS-SPINNER-06.md)
