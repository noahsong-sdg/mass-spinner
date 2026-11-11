# Mass Spinner: collisional double-well dynamics

Version 7 implements an **exploratory prescribed-field kinetic model**, alongside the unchanged fixed-Pθ landscape. It is not a calibrated double-well separator. The numerical spatial/particle convergence gate is **not established**; read [the numerical audit](/STAGE4-NUMERICAL-VALIDATION.md) before interpreting sorting.

## Model and actual execution path

`doublewell-ui.js → main.js/config → worker kind doublewell-dynamics → simulateDoublewell → local Coulomb half-step → quartic orbit step/absorbers → local Coulomb half-step → history, conservation, regime checks and plots → version-7 export`.

The potential is laboratory φ=V[(r/a)⁴−κ(r/a)²], with E=−∇φ and uniform imposed B. No centrifugal term is added to E. Cartesian full particles have synchronized position/velocity. The Coulomb kernel uses equal physical weights, random local mixed-species pairs, a documented finite-N density normalization and Takizuka–Abe angular scattering. It preserves pair kinetic energy and linear momentum; it does not force a target temperature or radial population. See [operator equations/rate benchmarks](/COULOMB-OPERATOR.md) and [quartic orbit checks](/DOUBLEWELL-ORBITS.md).

Open mode initializes equal represented species numbers in a finite disk/axial slug at t=0. Weight=n₀πrₛ²ℓₛ/(2N). Source, end and wall subsequently absorb particles. This is a finite pulse, not a continuous reservoir. The source density sets physical weights, not a constant density imposed as the pulse expands. Collision density is active markers×weight/exact cylinder-cut Cartesian cell volume.

Closed mode uses a specular cylindrical wall and periodic z. Reflection preserves H and Pθ. It can start from a pulse or a sampled common-Ω Maxwellian equilibrium with nₛ∝exp{−[qₛφ−(mₛΩ²+qₛΩB)r²/2]/kT}. The latter is a stationarity benchmark, not the endpoint being imposed by the collision update. Species-specific zero-mean-Pθ rotation is only an initial flow; thermal spread gives individual Pθ values, and collisions exchange the species' angular budgets.

## Controls and interpretation

Choose **Collisional double-well dynamics** in the system selector. Vary B, potential amplitude/shape, species mass/charge, temperature, density, initial rotation/beam and pulse dimensions. Compare collision-on with collision-off at identical declared settings. Independent seeds measure variability; changing the seed alone does not address numerical bias. To refine space, increase marker count together with cells so local populations do not disappear. Halve timestep independently. A finer grid with too few partners can suppress collisions.

Plots show all four destinations versus time, conditional survivor radius/flow/residual kinetic temperature/Pθ, final axially averaged densities and H/Pθ balances including outgoing flux. Empty survivor observables are undefined. Fitting out one rigid rotation is a diagnostic; it does not establish a local Maxwellian temperature. Collisions couple samples, so no independent-ion Wilson intervals or calibrated product-purity prediction is attached to these counts.

## Audit corrections and why

1. **Missing dynamics:** the landscape had no distribution, density, collisions, boundaries or time evolution. In simple terms, accessible radii are not particle motion. A separate kinetic worker preserves the original landscape and makes the new assumptions explicit instead of adding a phenomenological relaxation slider.
2. **Hidden angular-momentum defect:** impulses applied at different positions within a collision cell produce torque ΔPθ=[(rₐ−rᵦ)×Δpₐ]z. Absolute cell-net torque can hide opposite pair errors. The engine now records actual raw drift, signed cell torque, absolute per-pair increments and their quadratic variation. Subtracting measured torque closes a bookkeeping ledger; it does not repair trajectories. Artificial momentum projection was not used because it would change the Coulomb angular law without a derivation. Absolute stochastic variation can grow when timestep shrinks; it is not an error bound.
3. **Misleading applicability at average density:** an equilibrium can be centrally concentrated, and expansion can leave sparse cells. A passing volume-mean check cannot establish the local plasma regime. Initial checks now use a conservative species-peak/charge-density bound. Recorded local checks estimate each species' thermal spread after removing its mean drift and include relative flow in encounter speeds. Sparse samples are unresolved, not silently assigned the initial temperature. Known screening failures remain detectable without a temperature estimate. These checks flag unsupported trajectories without modifying velocities or clipping rates.

The electron temperature, screening model, Coulomb logarithm and imposed fields remain assumptions. Diagnostics sample times and coarse cells; they cannot certify unsampled states or the distribution-level applicability of Landau theory. No self-consistent electron response, sheath, turbulence, circuit/drive power or experimental throughput is solved.

## Validation status

Independent subagents checked the primary literature, derived rate coefficients, tested the collision and orbit kernels, audited the coupled equations and UI route, and ran seed/time/particle/cell comparisons. Rutherford pitch-angle diffusion and a Maxwellian unequal-mass thermal-exchange coefficient support the collision time normalization. Analytic Hamiltonian turning times, second-order collisionless convergence and signed exit-flux checks support the orbit/ledger path. A common-Ω equilibrium retained its independent radial CDF over a short test horizon.

**Not passed:** continuum spatial/particle convergence, arbitrary-pulse long-time equilibration and experimental prediction. The reported grids retain nonmonotonic raw Pθ error. The UI prominently labels this limitation. Passing kernel tests must not be promoted to validated sorting, collector purity or machine feasibility. [Independent physics audit](/STAGE4-PHYSICS-AUDIT.md); [quantitative numerical validation](/STAGE4-NUMERICAL-VALIDATION.md).

Reviewable development slices: (1) collision/orbit operators and independent analytical benchmarks; (2) coupled engine, regime diagnostics and UI/worker integration. Preserve separate PRs under the repository's 700-line non-test limit. No PR was opened in this non-Git artifact directory.
