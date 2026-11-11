# 02: conditional target heating and exposure

This observer adds a time-dependent **bulk assembly** temperature to the frozen beam/target source. It is a scenario calculator, not a measured Marathon target model. Changing thermal coefficients does not change neutron yield.

## Boundary and equation

The source supplies `assemblyHeatIfTransmittedBeamStoppedW`: conditional heat if the backing stops all transmitted beam. Divide by illuminated area A to obtain q″ in W/m². The film and backing share one temperature:

`C_A d(T − T_bath)/dt = q″ − h(T − T_bath)`.

Here C_A is assumed areal heat capacity (J/m²/K), h is assumed effective conductance to a fixed bath (W/m²/K), and τ = C_A/h. For a constant segment of duration t,

`T(t) − T_bath = (T(0) − T_bath) exp(−t/τ) + (q″/h)(1 − exp(−t/τ))`.

Beam heat acts for the **same exposure duration used by the source**, then q″ becomes zero for cooldown. The h=0 limit is exactly adiabatic. Implementation uses `expm1` and a short-time series to avoid cancellation; plot samples do not advance a numerical timestep. Switching events and short thermal time scales are sampled explicitly.

The energy ledger independently displays deposited heat, stored change relative to the initial state, and signed heat transferred to the bath. Deposited = stored change + bath transfer. Negative bath transfer means an initially colder assembly is being warmed by the bath.

Defaults C_A=10000 J/m²/K, h=5000 W/m²/K, bath/initial temperature 20°C and cooldown 20 s are **illustrative assumed inputs**. They are not fitted LiT properties or Marathon measurements. Heat capacity and conductance scale with the chosen illuminated area in this reduced model; spreading into a fixed substrate geometry is not solved.

## Fuel bookkeeping

Initial illuminated tritium inventory is `targetColumnM2 × beamAreaM2`. Fusion consumes `neutronRateS × exposureS` tritium nuclei, one per D–T reaction. An exposure exceeding that inventory is rejected. The displayed fraction is **fusion-only consumption**, not a lifetime or usable-life prediction. A separate [loading observer](./DEUTERON-STOPPING-LOADING.md) now evolves its own yield; it does not replace this constant-forcing observer. Here the source remains frozen even when this fraction is appreciable; shorter exposure is necessary before interpreting a constant-source approximation as negligible depletion.

Implanted deuterium, isotope exchange, diffusion, permeation, sputtering, radioactive decay, regeneration and fuel recovery are not evolved. Other losses can dominate fusion consumption. No tritium is bred by recycling.

## What this does not establish

There is no temperature-to-yield feedback, surface hot spot, separate film/backing temperature, contact resistance, spatial conduction, coolant hydraulics, radiation, phase change, damage, safe temperature or target lifetime. No small-Biot or uniform-temperature validity gate is claimed: the required geometry and material data are absent. A numerically exact single-node response can be a poor physical approximation to an actual target.

The next yield-fidelity requirement remains validated **deuteron stopping and evolving D/T loading in LiT**. Proton stopping tables and metal-tritide transport coefficients cannot simply be relabeled as LiT data.

## Evidence and provenance

- [Marathon beam-driven architecture](https://www.marathonfusion.com/beam-driven-fusion/) motivates a solid LiT target on a cooled substrate; it does not calibrate this observer.
- [Kaneko, Le Bris and Patera: Certified Lumped Approximations](https://arxiv.org/abs/2412.16357) describes lumped spatial-average thermal approximations and their limitations. It does not provide our beam or material coefficients.
- [Wampler et al.: Optimization of target lifetime for production of 14 MeV neutrons](https://www.sandia.gov/research/publications/details/optimization-of-target-lifetime-for-production-of-14-mev-neutrons-2020-12-15/) supports distinguishing isotope transport/exchange from fusion burnup. Its metal-tritide results are not validated LiT coefficients.

Independent regression studies compare the exact model with separately integrated temperature and coolant energy, and test adiabatic/steady limits, signed heat transfer, pulse timing, area scaling and inventory rejection. These establish implementation consistency within the stated equations, not experimental validity. Source and geometry observers retain their own boundaries; invalid thermal settings clear this observer without invalidating a valid neutron source.
