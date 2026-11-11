# Marathon preparation: reading and bounded projects

Sources reopened 9 November 2026. Reading recommendations and project ranking are
judgment, not Marathon's hiring requirements. Do not describe this educational
simulator as an independently calibrated Marathon digital twin.

## Reading order

1. [Tritium-Lean Fusion Power Plants](https://arxiv.org/html/2410.05238v2):
   Parisi, Meschini, Rutkowski and Diallo. This already includes authors who are now
   on Marathon's leadership team. Read I, IV, VII.2 and VIII first, then the
   transport/pumping definitions. It connects selective pumping to fuel inventory
   and reactor operation. It does not validate our particular centrifuge closure.
2. [Marathon centrifuge disclosure](https://patents.google.com/patent/WO2026064411A1/en):
   architecture, partial ionization, neutral entrainment, drive and collection.
   A patent is useful engineering disclosure, not experimental performance data
   or proof that every illustrated embodiment was built.
3. [Electromagnetically Driven Thermal Dissipation Scaling](https://arxiv.org/abs/2607.28208):
   external researchers Hood-McFadden, Kotla and Underwood. Complements the above
   by examining coupled rotation and heating against measurements. Its model,
   working gas and operating regime must be matched before benchmarking.
4. [Isotope Production in Fusion Systems](https://arxiv.org/abs/2512.09242):
   Marathon authors' broader bridge from fusion gain and neutron use to isotope
   production and economic viability. Read after the centrifuge material if the
   job interest extends to neutron sources/blankets.
5. [Scalable Chrysopoeia](https://www.marathonfusion.com/alchemy.pdf):
   company-hosted technical paper on Hg transmutation, neutron multiplication,
   breeding and example neutronics models. Especially useful for an OpenMC project;
   economic projections and modeled blanket performance remain assumptions/results
   to reproduce, rather than demonstrated operation of a commercial power plant.
6. [Scalable Terbium-149 Production](https://arxiv.org/abs/2609.25554):
   Parisi and Rutkowski, September 2026 preprint. Useful for reaction-chain,
   scheduling and uncertainty projects. The abstract explicitly identifies a key
   proton reaction cross section as awaiting experimental measurement.

The company lists additional research on its
[radiopharma page](https://www.marathonfusion.com/radiopharma/).
Its [August enrichment announcement](https://www.prnewswire.com/news-releases/marathon-fusion-demonstrates-lithium-and-hydrogen-isotope-enrichment-using-proprietary-plasma-centrifuge-technology-302861336.html)
is context about a company-reported demonstration, not a complete experimental
dataset for fitting the simulator.

## Project choices

| Project | Bounded deliverable | Crucial validation | Fit / limitation |
|---|---|---|---|
| Virtual diagnostics and parameter recovery | Generate synthetic spin-up observations with noise; infer collision/drag parameters and report their correlation | Recover held-out known parameters; demonstrate a deliberately non-identifiable case; do not call synthetic agreement experimental validation | Best next extension to this simulator; shows diagnostics, inverse problems and scientific judgment |
| Fuel-cycle inventory and outages | Small mass-balance model of burn, recycling delay, processing hold-up and a pump outage | Closed inventory ledger, steady-state limit and delay/time-step refinement | Accessible first project, strong connection to the Tritium-Lean paper; not a full plant model |
| Separation at finite residence time | Purity–recovery–throughput map with a declared extraction model | Species conservation, zero-drive and long-time limits, grid/time refinement | Direct centrifuge relevance; more work than a closed-wall equilibrium calculation |
| Beam-target operating envelope | Energy-dependent yield, stopping, heat load and exposure study with data-source uncertainty | Published stopping/yield benchmark, energy balance and depth/time convergence | Strong source-engineering connection; LiT stopping/loading data uncertainty must remain visible |
| Minimal neutron-transport benchmark | Reproduce one simplified slab/blanket case using OpenMC and evaluated data | Independent reaction-rate check, statistical errors, source normalization and nuclear-data provenance | Higher setup cost and learning curve, clear industry-tool signal; do not start with the complete economic blanket claim |
| Irradiation/decay scheduling | Reaction-chain notebook comparing irradiation, cooling and delivery times | Analytic Bateman limits, atom balance and uncertainty in unmeasured cross sections | Bounded and relevant to newer medical-isotope work; production feasibility is not established by the notebook |

My recommendation: virtual diagnostics if scientific software is the intended role,
fuel-cycle inventory if building fusion intuition is the priority, or one OpenMC
benchmark if neutronics is the desired specialization. Finish one reproducible
result and its failure case before broadening the project.
