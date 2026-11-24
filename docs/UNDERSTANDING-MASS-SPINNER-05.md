# Tutorial 5 · Fusion fuel cycle

[Tutorial 4](UNDERSTANDING-MASS-SPINNER-04.md) gives product purity and quantity. Here, follow the materials from lithium preparation to fusion, replacement fuel and electricity.

## How does the plant start and keep operating?

A fuel cycle has a startup problem: fusion needs tritium, but breeding needs fusion neutrons.
An initial tritium supply from outside the plant permits startup. Bred tritium can replace consumed fuel later.
The centrifuge gas, fusion fuel and blanket materials occupy separate equipment. They are not one gas mixture.

<!-- diagram:plant-cycle -->

The sequence includes Marathon’s proposed mercury multiplier. Mercury is optional; other blanket designs use different materials.
An (n,2n) reaction has one incoming neutron and two outgoing neutrons. It needs sufficient incident energy.
The outgoing neutrons have less energy available. They cannot multiply indefinitely through this reaction.
The mercury product undergoes radioactive decay later. Gold production and tritium breeding therefore have different material paths and timescales.

At startup, the stages have an order of dependency. During operation, fusion, breeding, extraction, exhaust recovery and cooling occur together.
Not every neutron follows the illustrated reactions. Scattering, absorption in other materials and leakage affect the result.
[Marathon’s blanket paper, §§2–4](https://arxiv.org/pdf/2507.13461), gives the proposed reaction paths and neutron-transport calculations.

## What are the three processes?

Lithium enrichment alone cannot supply a D–T plasma with tritium. A D–T fusion reaction combines deuterium and tritium to produce helium-4 and a neutron.
Deuterium and tritium are hydrogen isotopes, not lithium isotopes. Lithium can help supply tritium through a different nuclear reaction.
The three processes below therefore have different inputs and outputs:

| Process | What enters | What leaves |
|---|---|---|
| Lithium enrichment | A mixture of ⁶Li and ⁷Li | A ⁶Li-rich stream and a ⁶Li-poor stream |
| Tritium breeding (one reaction) | ⁶Li + a neutron | ⁴He + tritium (T) |
| Exhaust recovery | Unburned deuterium and tritium from the plasma | Recovered deuterium and tritium for return to the plasma |

The rich stream has a higher ⁶Li percentage than the feed. The poor stream has a lower percentage.
Enrichment does not make tritium.
Only the breeding row makes new tritium. Exhaust recovery returns fuel that did not react.
The breeding rate depends on neutron transport, materials and losses.

The Reactor tab has a different model for a compact beam–target neutron source. Neutron output does not show net electric power or sufficient tritium production for operation.

Lithium enrichment supplies lithium for a breeding blanket.
A change in lithium purity does not directly change the exhaust-processing delay or the single-pass tritium burn fraction.

## Must the power plant use a tokamak?

No. A power plant is the complete system that supplies useful power. A tokamak is one type of fusion device inside that system.
For D–T fuel, the same fusion reaction supplies neutrons in several device types. Confinement, heating, fuel delivery and blanket geometry differ.

| Fusion device | How it holds or compresses fuel | What changes in the plant |
|---|---|---|
| Tokamak | Magnetic fields hold plasma in a ring. Plasma current contributes to the field. | Plasma-current control, heating, fuel delivery and pulse operation where applicable |
| Stellarator | External coils produce a twisted magnetic field that holds plasma. | Different coils, chamber shape, access and blanket geometry |
| Inertial confinement | A driver compresses small fuel targets for short fusion pulses. | Target manufacture and injection, driver efficiency, pulse frequency and chamber recovery |

[IPP gives tokamak and stellarator plant concepts](https://www.ipp.mpg.de/16427/stand).
[LLNL gives an inertial fusion energy concept](https://lmf.llnl.gov/science/energy-security).
The mercury paper models particular blanket configurations. It does not establish their performance in every fusion device.

The compact beam–target source in the Reactor tab is a separate architecture.
It accelerates deuterium ions into lithium tritide that already contains tritium. Fusion near the target surface supplies neutrons.
This source does not establish net electric output. [Marathon gives the source architecture here](https://www.marathonfusion.com/beam-driven-fusion/).

## How does new tritium leave the blanket?

Breeding changes a lithium nucleus into tritium and helium. It does not automatically deliver usable fuel to the chamber.
The new tritium interacts with the surrounding material. Its release depends on temperature, diffusion and chemical reactions.
Extraction equipment must remove it before fuel processing can prepare it for use.

<!-- diagram:tritium-extraction -->

In a ceramic breeder, tritium moves through grains and pores, then leaves the surface.
A helium purge gas flows through the pebble bed and carries tritium-bearing molecules to recovery equipment.
The purge gas can contain added hydrogen to help release tritium. Tritium can leave as hydrogen molecules or in water-bearing forms.
[Ceramic breeder experiments](https://doi.org/10.1016/j.fusengdes.2024.114302) show why gas composition affects release.

In a liquid lead–lithium design, the liquid carries dissolved tritium to an extraction unit.
One method uses a metal membrane. Hydrogen isotopes diffuse through the metal toward a vacuum side with low hydrogen pressure.
The bulk liquid stays on its side and returns to the blanket. A vacuum pump removes the released gas.
[This permeator experiment](https://www.mdpi.com/1996-1073/16/7/3022) used hydrogen as a test gas; it does not establish a complete tritium plant.

Extraction recovers tritium from its carrier. Fuel processing then removes impurities and prepares the required hydrogen isotope mixture.
Depending on chemical form, processing can need chemical conversion and hydrogen isotope separation.
This separation concerns hydrogen isotopes, not lithium isotopes. The lithium centrifuge does not perform every fuel-processing task.
[ITER’s fuel-processing description](https://www.iter.org/machine/supporting-systems/fuelling) separates purification, isotope separation, storage and delivery.

These are design examples, not a verified Marathon extraction system. The public material checked here does not specify that complete system.
Extraction delay, trapped tritium, leakage and radioactive decay affect the available fuel supply.
Breeding more tritium than fusion consumes is insufficient if too little becomes usable fuel in time.

## When does the plant supply net electricity?

Heat is energy transfer, not a separate source of energy. Fusion releases nuclear energy; particles deposit energy in surrounding materials.
The plant must convert recoverable heat into electricity. It cannot convert all that heat.
Some electricity must operate the driver, pumps, cooling, magnets where applicable, and fuel-processing equipment.

<!-- equation:plant-electricity -->

```math
P_{\mathrm{net,electric}}=\eta_{\mathrm{conversion}}P_{\mathrm{recoverable,thermal}}-P_{\mathrm{plant,electric}}.
```

P_recoverable,thermal is heat delivered to the power-conversion system. Efficiency η_conversion gives the fraction converted to gross electricity.
P_plant,electric includes all internal electric use. It is not only energy delivered to the fuel.
Do not add fusion power to a thermal-power value that already includes that fusion energy.

For an example, 1,000 MW of recoverable thermal power at 40% efficiency gives 400 MW of gross electricity.
If internal electric use is 150 MW, net output is 250 MW. The conversion system rejects 600 MW of heat.
Internal plant electricity ultimately also becomes heat or other energy outputs; that 600 MW is not the complete site heat account.
At 450 MW of internal use, the same generator gives net output of −50 MW: the plant imports electricity.

Fusion gain compares fusion energy with a specified input. A gain above one at the plasma or target does not establish net plant electricity.
For pulses, compare energy over a complete operating cycle, including charging and recovery between pulses.
Positive net output is necessary for electricity export. Commercial viability also needs acceptable construction cost, operating cost, component lifetime and availability.
Isotope sales can add revenue. They do not change this energy balance.

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
