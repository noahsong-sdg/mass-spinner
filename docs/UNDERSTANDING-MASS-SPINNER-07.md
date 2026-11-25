# Tutorial 7 · Beam-driven neutron source

## Why does the source use a beam?

The centrifuge changes the lithium isotope mixture. A neutron source does a different job: it uses fusion reactions to produce neutrons.

In this source, an electric field accelerates deuterium ions toward a target that contains tritium.
An ion can fuse with a tritium nucleus. The reaction produces a neutron and a helium nucleus, also called an alpha particle.
The source needs both the beam and tritium in the target. Lithium enrichment alone does not start this reaction.

Beam energy is the kinetic energy of one incident ion. Beam current sets how many singly charged deuterium ions arrive each second.
These inputs answer different questions: how much energy does each ion carry, and how many ions arrive?

[Open the source example](/?level=2&try=beamSource). Find beam energy, beam current and the source energy account.

## Why do most ions heat the target?

A useful source must produce neutrons without excessive target heating. Thus, we must track energy loss as well as fusion.

An ion transfers energy to the target as it moves through it. This energy loss is called stopping.
The ion can leave a thin target with energy remaining. A sufficiently thick target can stop it.
Fusion is a separate possibility along that path; energy loss does not mean that fusion occurred.

The fusion cross section describes the reaction probability for an ion passing target nuclei.
It changes with collision energy. The model therefore calculates energy loss and reaction probability along the path through the target.
For the example inputs, only a small fraction of incident ions fuse.

<figure>
<svg viewBox="0 0 820 300" role="img" aria-labelledby="beam-path-title beam-path-desc">
<title id="beam-path-title">Energy and reaction paths through a target</title>
<desc id="beam-path-desc">A deuterium beam enters a tritium target. Energy loss heats the target. Fusion produces neutrons and helium. Unreacted ions can leave with energy remaining.</desc>
<defs><marker id="beam-path-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="currentColor"/></marker></defs>
<g fill="none" stroke="currentColor" stroke-width="2"><rect x="20" y="112" width="150" height="66" rx="8"/><rect x="250" y="85" width="180" height="120" rx="8"/><rect x="540" y="20" width="250" height="58" rx="8"/><rect x="540" y="120" width="250" height="58" rx="8"/><rect x="540" y="220" width="250" height="58" rx="8"/><path d="M170 145H245M430 115L532 49M430 145H532M430 175L532 249" marker-end="url(#beam-path-arrow)"/></g>
<g fill="currentColor" text-anchor="middle" font-size="20"><text x="95" y="152">Deuterium beam</text><text x="340" y="137">Tritium target</text><text x="340" y="166">Energy loss</text><text x="665" y="55">Target heat</text><text x="665" y="155">Fusion: neutron + helium</text><text x="665" y="255">Unreacted beam</text></g>
</svg>
<figcaption>Paths, not relative amounts. Some unreacted beam energy can reach the backing or a downstream surface.</figcaption>
</figure>

Target heat includes deposited beam energy and deposited reaction-product energy.
Neutrons carry energy out of the target. Their later energy transfer needs a separate transport calculation.

More beam energy does not always give more reactions per unit of electrical energy.
The cross section, energy loss, target thickness and accelerator efficiency all affect this comparison.

## What changes when beam current increases?

Higher neutron output can come from more incident ions, even when each ion has the same reaction probability.
We need to distinguish these two causes before we judge source efficiency.

[Open the source example](/?level=2&try=beamSource). Keep beam energy and the initial target state constant. Increase beam current.

Compare Initial source results. In this fixed-target calculation, reaction probability per ion stays constant.
Neutron rate, incident beam power and deposited beam power increase in proportion to current.
Twice the current gives twice these rates at the same energy and target state.

This comparison does not mean that a real target can accept unlimited current.
The evolving target can heat and change its tritium content. Its later reaction probability can then change.

## Why does output change during a pulse?

A fixed-target result describes one target state. It cannot show whether the source maintains that output during operation.

Incident deuterium, fusion and the selected transport processes can change the target's local isotope content.
Temperature also changes as deposited energy moves through the target and backing toward the coolant.
The coupled target model calculates these changes together.

[Open the target example](/?level=2&try=beamTarget). Compare Dynamics at the same physical time after each change.

Beam duty is the fraction of each pulse period with the beam on. Current is the current during that on-time.
At a lower duty, the beam supplies energy for less time. The off-time permits heat flow without more beam heating.
The temperature response also depends on the target, backing, contact and cooling inputs.

Replacement, release, diffusion and renewal affect loading only when their selected coefficients are nonzero.
These are assumed material inputs. The model does not establish measured lithium-tritide loading or target lifetime.

## What does this source tell us about a power plant?

Neutron output is useful for a neutron source. It does not establish that the system supplies net electricity.

The source calculation tracks beam energy, fusion output and target heat.
A power plant also needs energy conversion, cooling, fuel recovery and all electrical loads.
Positive fusion power alone does not establish a positive electrical balance.

The stopping estimate uses an approximate material model. It is not a measured lithium-tritide stopping curve.
The source does not calculate neutron shielding, a breeding blanket, a complete fuel cycle or commercial performance.

See [Marathon's source description](https://www.marathonfusion.com/beam-driven-fusion/),
[the beam calculation](../src/fusion-reactor.ts), and [the coupled target calculation](../src/coupled-target.ts).
The [target qualification record](COUPLED-TARGET-V35.md) separates numerical checks from measured accuracy.
[Tutorial 5](UNDERSTANDING-MASS-SPINNER-05.md#jobs) explains the different fuel-cycle jobs.
