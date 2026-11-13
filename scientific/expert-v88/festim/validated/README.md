# FESTIM native pilot

**Qualified numerically for four manufactured limits; not experimentally qualified and not wired into the live target solver.**

Actual runtime: FESTIM 2.2, dolfinx 0.11.0, PETSc 3.25.6, SciPy 1.18.1, Python 3.12.16, one MPI rank on Linux ARM64. No stubs, altered dependencies or solver substitutions.

## Why this adapter exists

The live target path in `src/coupled-target.ts` computes the stopping plan, explicit fusion depletion, species replacement/release/diffusion, positive backward-Euler transport and target conduction with adaptive step doubling. That custom coupling is necessary for application-specific bookkeeping. Its isotope/heat primitives should be compared with an established hydrogen-in-materials code before extending them.

FESTIM supplies the existing finite-element diffusion, multispecies trapping and heat solvers. This pilot establishes reproducible native execution and common limiting cases. It does **not** automatically replace the browser kernel, predict LiT material rates, model beam implantation, or validate Marathon hardware.

## Frozen experiment

`protocol.json` SHA256: `be8b8542dcc565f9ef600e551034eebb1b69148a0c985ddf0ed26b432831fa00`. Frozen before the scientific campaign. All concentrations, geometry and time scales are manufactured. D and T are bookkeeping labels with identical manufactured diffusivities; real isotope effects require measured material data.

| Case | FESTIM problem | Independent reference |
|---|---|---|
| Sealed D/T diffusion | Two conserved mobile species, insulated slab | Exact cosine decay; independent SciPy finite-volume matrix exponential |
| Shared trap | Two isotopes compete for one finite vacancy population | SciPy Radau and DOP853 on the four-state mass-action ODE |
| Heat eigenmode | Constant heat capacity, fixed 300 K ends | Exact sine decay; independent SciPy finite-volume matrix exponential |
| Thermal diffusion | Insulated uniform heating drives Arrhenius diffusivity | Exact temperature; quadrature of the diffusion history |

The 36 runs use 16/32/64 cells and steps .01/.005/.0025 to t=.1. All 94 protocol gates pass. Maximum isotope inventory residual: 5.11e-15; all concentrations nonnegative; minimum shared vacancy .267851. Finest normalized profile errors: diffusion 3.61e-5, trapping 5.34e-5, heat 1.81e-4, coupled diffusion 2.44e-4. Spatial contraction .251–.252 and temporal contraction .502–.506 are consistent with P1 spatial / backward-Euler temporal refinement. They qualify these smooth manufactured limits only.

Nine adversarial tests additionally check raw integral inventories, initial-condition extraction, actual solver time, heating energy balance and rejection of injected conservation, positivity, vacancy and reference failures.

## Read the output

- `results.json`: all 36 native trajectories, raw finite-element integrals, gates, package records and installed FESTIM/dolfinx Python-source hashes.
- `response.json`: finest-grid response tables, four cases on 257 sample positions and all 41 stored times. Concentration scale is one; heat-profile error scale is 50 K. These are reference tables, not production material data.
- `receipts/`: solver/test logs, explicit native package lock, pip wheel URLs and SHA256 hashes, package licenses and bootstrap hashes.
- `oracle.py`: independent SciPy/analytic reference assembly.
- `test_campaign.py`: negative controls and independent ledger checks.

## Reproduce in safe-dev

Copy this folder to a dedicated clean project. Run `safe-dev -C /absolute/project init`, then `safe-dev -C /absolute/project run --online -- sh install.sh` for required public downloads. Offline run:
```sh
safe-dev -C /absolute/project run -- sh -c 'OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 .cache/bootstrap/bin/micromamba run -p /work/project/.venv python campaign.py'
safe-dev -C /absolute/project run -- sh -c 'OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 .cache/bootstrap/bin/micromamba run -p /work/project/.venv python -m unittest test_campaign -v'
```
The tested clean stage was `/private/tmp/mass-spinner-festim-v88-retry-20261112`, volume `safe-dev-413f05df90daf334`. Only native packages occupy the guest; no host credentials or mounts. Export omits the environment/cache. Native conda dependencies plus genuine pip FESTIM/io4dolfinx avoid optional PyVista/Qt/VTK: upstream supports the pip route and no package was patched. Dependencies/locks are retained; successful environment was 2.0 GiB, post-clean cache 28 MiB.

## Limits and next adoption gate

FESTIM's coupled class advances heat then hydrogen: one-way temperature feedback, not reaction heat feedback. Its heat residual uses Cp(Tnew)*(Tnew−Told), rather than an exact enthalpy difference for variable Cp. This constant-Cp pilot deliberately avoids that difference. Replacing the existing variable-Cp enthalpy kernel without resolving it would regress energy accounting.

Next: map an explicitly selected public material's measured diffusion/trapping parameters and uncertainty into this native adapter, then compare the **same** source, surface, initial state, heat law and geometry with the existing target solver. Keep beam stopping/fusion depletion/implantation as separately validated adapters. Do not label this pilot as a complete target-model replacement or LiT calibration.

Primary sources: [official installation](https://festim.readthedocs.io/en/latest/installation.html), [FESTIM v2.2 coupled class](https://github.com/festim-dev/FESTIM/blob/v2.2/src/festim/coupled_heat_hydrogen_problem.py), [heat residual](https://github.com/festim-dev/FESTIM/blob/v2.2/src/festim/heat_transfer_problem.py), [io4dolfinx extras](https://github.com/scientificcomputing/io4dolfinx/blob/v1.5.1/pyproject.toml). Installed metadata records FESTIM Apache-2.0, dolfinx LGPL-3.0-or-later, PETSc BSD-2-Clause, SciPy BSD-3-Clause and io4dolfinx MIT. No third-party environment is redistributed here.
