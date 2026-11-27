# Julia tool choice

Documentation/source research: 7 November 2026 UTC. Capability findings below are not package execution evidence, except for the SciML runs recorded in README and the result artifact.

## Selected role

Use SciML `OrdinaryDiffEqVerner.Vern9` for an independent collisionless continuous-time orbit reference. The [official method guide](https://docs.sciml.ai/OrdinaryDiffEq/stable/explicit/Verner/) recommends these high-order adaptive Runge–Kutta methods for smooth non-stiff, precision-sensitive orbit problems and describes error control and dense interpolation. This differs numerically from the application's fixed-step Boris map. It does not supply a plasma collision operator or self-consistent fields. A reference must still pass analytic gyro motion, tolerance refinement and physical invariant checks.

Language is not a collision model: translating Takizuka–Abe to Julia alone would neither supply an independent Landau reference nor resolve finite collision-cell locality errors. The practical first Julia contribution is a reusable scientific reference workflow, while WarpX/PETSc address separate plasma/collision needs.

## Julia plasma candidates evaluated

| Candidate | Verified published/documented scope | Qualification still needed for this separator |
| --- | --- | --- |
| [GEMPIC.jl](https://juliavlasov.github.io/GEMPIC.jl/dev/) | Finite-element PIC derived from Hamiltonian Vlasov–Maxwell structure, with splitting schemes and diagnostics | No documented full multispecies Coulomb module was established in this review; Hamiltonian collisionless PIC does not by itself solve our collision reference problem. |
| [JuliaPlasma/ParticleInCell.jl](https://github.com/JuliaPlasma/ParticleInCell.jl) | Kinetic PIC package, explicitly pre-1.0; README describes planned flexible/distributed capabilities | Demonstrate the actual operator, boundaries, species masses, collision normalization and cylindrical support in a pinned version. Goals are not completed features. |
| [JuliaVlasov/ParticleInCell.jl](https://github.com/JuliaVlasov/ParticleInCell.jl) | Separate similarly named project, described by its authors as work in progress for optimizing particle–mesh methods | Do not confuse it with the registered JuliaPlasma package or assume production separator capability. |
| [Kinetic.jl](https://xiaotianbai.com/Kinetic.jl/dev/) / KitBase | Finite-volume kinetic/fluid ecosystem; homepage explicitly lists Fokker–Planck–Landau among supported equations | Must inspect the actual operator and examples for Coulomb kernel γ=−3, full nonlinear unlike-species coupling, dimensionality and conservation before adopting it as a 40+/84+ reference. The broad equation list does not establish that exact configuration. |

These findings do not justify labeling one Julia plasma package an industry standard. Prefer solver-specific verification and code-to-code comparisons with exact physical assumptions. Most established scientific plasma frameworks use C++/Fortran with Python interfaces; Julia is compatible with serving as orchestration, analysis and independently integrated reference code.
