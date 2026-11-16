# Public-data-independent component verification

## Execution path and evidence gap

Existing production tests already cover exact rotor response, integrated
centrifugal equilibrium, coaxial electrical conduction and cylindrical heat flux.
The gap was a reusable numerical receipt with source identity and explicit
comparison errors; another solver or rewritten physics was not justified.

`scripts/qualify-public-components.mjs` invokes the production kernels directly:

| Component | Production entrypoint | Independent comparison | Existing deeper coverage |
| --- | --- | --- | --- |
| Rotation | `rotorResponse` | Undamped common angular momentum and exponential slip | `tests/fuel-centrifuge-independent-v44.test.ts`: independent RK4, driven energy and stiff limits |
| Isothermal separation | `advanceFuelRadialMass` | Integrated Boltzmann bin masses at six centrifugal strengths | `tests/fuel-transport-independent-v47.test.ts`: Bessel-mode cylindrical diffusion refinement and free-energy decay |
| Current | `solveFuelCurrent` | Coaxial Ohm law, integrated motional EMF and electrical/mechanical power balance | `tests/fuel-current-v66.test.ts`: insulating boundaries, gauge invariance and axis exclusion |
| Heat | `advanceFuelMixtureThermal` | Exact two-cell backward-Euler Fourier algebra, both heat signs at three temperatures | `tests/fuel-gas-thermal.test.ts`: manufactured cylindrical flux, entropy and energy; `tests/fuel-operation-independent-v51.test.ts`: thermal transient refinement |

The 60 numeric comparisons are limiting-case checks, not new experimental
measurements. The heat oracle is the exact **discrete** BE solution, not a claim
of time-continuum accuracy. All experimental qualification flags stay false.
The published tolerances reuse or tighten the existing controls; no gate was
relaxed. Source hashes identify the executed kernels and locked dependencies.

The receipt auditor recomputes numerical errors/limits and checks the complete
case set. It is a same-script consistency check, not an independently authored
physics solver or a cryptographic authenticity verifier. Tests deliberately
corrupt identity, completeness, finite values, limits and acceptance flags.

## Reproduction

Run only in the project's isolated execution environment:

```sh
node --import tsx --test --test-concurrency=1 tests/public-components.test.ts
node --import tsx scripts/qualify-public-components.mjs NEW_COMPONENT_RESULTS.json
```

The CLI refuses an existing output path and exits nonzero for any failed gate.
Execution results are recorded by the coordinating campaign; this source review
does not claim that the new script has run. No production code was changed.
