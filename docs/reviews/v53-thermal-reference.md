# Independent thermal reference and convergence plan

This review owns external numerical validation, not the production implementation. The parent owns all execution inside safe-dev. Source inspection and script authoring are complete; each gate below needs its own exact-snapshot execution receipt before a passing claim. The parent reports that the five-case, 70-step external-code comparison passed; the newly added production refinement campaign remains pending at this update.

## Why the previous closure cannot answer spatial questions

The existing operating history calls a two-reservoir implicit gas/liner update. Its liner state contains a single temperature and prescribed total heat capacity. It can conserve the integrated energy budget while suppressing thermal gradients and the finite diffusion time through the material. Constant total heat capacity also cannot represent the difference between energy storage at 400 K and 1500 K.

In plain terms, a warm inner surface and cool outer surface were necessarily drawn as the same temperature. The proposed correction is a radial cylindrical wall model, retaining a clearly identified well-mixed gas node. It adds a real spatial conduction path without inventing an unsupported spatial discharge-temperature model.

## Existing code chosen

[FiPy](https://github.com/usnistgov/fipy) is NIST's open-source finite-volume PDE framework. Its documented [transient/diffusion example](https://pages.nist.gov/fipy/en/latest/generated/examples.diffusion.mesh1D.html) explicitly warns against replacing the conservative heat equation with a variable diffusivity Laplacian. Its [boundary treatment](https://pages.nist.gov/fipy/en/stable/USAGE.html) documents finite-volume fluxes and Robin conditions. This reference uses actual FiPy `CylindricalGrid1D`, `TransientTerm`, `DiffusionTerm` and SciPy `LinearLUSolver`; no production tridiagonal implementation, matrix or output is imported into the solver.

The project already retains an aarch64 Python 3.11 wheelhouse under `scientific/marathon-v35/thermal/wheelhouse`: FiPy 4.0.3 plus NumPy/SciPy and its plotting/utility dependencies, approximately 73 MiB on disk. This allows offline installation inside an existing safe-dev VM. The old FiPy output is provenance for an earlier target calculation, not evidence that this new liner model works.

MOOSE's [tungsten material](https://mooseframework.inl.gov/moose/source/materials/TungstenThermalPropertiesMaterial.html) is a useful higher-level existing implementation, but a full MOOSE runtime is unnecessary for a one-dimensional browser reference. Its NASA-handbook constitutive choices differ from this release's NIST/Tolias choices; silently treating those two materials as identical would make code disagreement ambiguous. FiPy tests the selected constitutive model with an independent assembly/solver while preserving interactive browser deployment.

## Independent transcription and boundary meaning

The oracle transcribes NIST solid tungsten Shomate heat capacity over the deliberately narrower 300–1900 K domain, and the solid-conductivity fit in [Tolias 2017](https://arxiv.org/html/1703.06302). It integrates heat capacity to specific enthalpy measured from 300 K. Density is fixed at 19,250 kg/m³, so the annular geometry implies fixed material mass. It does not change density with temperature while retaining the same geometry, which would spuriously create/remove material energy.

`reference-fipy.py` constructs one gas cell on [0, inner radius] plus radial annular wall cells. The gas cell is a uniform reservoir with a user-supplied total heat capacity; its conductivity is not claimed as a gas material property. Each wall temperature unknown sits at a geometric radial midpoint. The FiPy face coefficient converts exact logarithmic half-shell resistances into FiPy's geometric gradient convention. Inner and outer conductances are total surface-film W/K values in series with their corresponding half-cell conduction resistance. Gas-film heat has equal and opposite signs in the gas and inner wall balances. Wall drag deposition enters the innermost wall cell; this is an explicit source-location assumption.

Variable heat capacity uses the exact enthalpy secant in every nonlinear iteration, not `Cp(T) × T`. The scalar coefficient is intentionally not a FiPy `hasOld` variable: one secant multiplies both endpoint temperatures. Otherwise a changing old/new coefficient would approximate a different energy equation. The converged wall and gas temperatures are checked by independent exact enthalpy/flux residual evaluation after FiPy solves the coupled linearization.

## Executable gates

1. `export-reference.ts` uses the production public API to write five cases and 70 individual steps: equilibrium, strong nonlinear exchange, cooling plus sources, pulse/coast/reheat and isolated deposition. `reference-fipy.py` independently solves every supplied initial value/source history, compares gas and all wall temperatures with a 5e-6 K absolute gate, checks optional cooling ledgers, and checks six independently transcribed property probes. It also enforces a 1e-9 relative energy-balance gate. This demonstrates solver agreement for those scenarios; it does not validate a measured gas-wall film coefficient.
2. `convergence-fipy.py` performs spatial refinement with 8, 16, 32 and 64 radial cells while holding 256 time steps fixed. It separately performs temporal refinement with 16, 32, 64, 128 and 256 steps while holding 64 cells fixed. The nonlinear case has inner gas heating, inner wall deposition and outer cooling, and must generate more than 5 K through-wall variation. Consecutive endpoint-difference ratios must be below 0.85, and the signal must exceed numerical roundoff. This is a convergence diagnostic for one representative case, not an extrapolated bound on every slider setting.
3. The campaign also checks an insulated annular analytic Bessel `J0/Y0` eigenmode with constant material properties. Its radial wave number is found using SciPy's `brentq`; no production solver or numerical eigensystem is used. To isolate spatial truncation error, the analytic eigenfunction uses its exact backward-Euler amplification at the same fixed time step. Errors must decrease under 8/16/32/64 refinement and the finest maximum error must be below 0.02 K. This supplies a continuum analytical spatial oracle beyond matching the same finite-volume stencil in two codes.
4. `convergence-production.ts` repeats the same nonlinear spatial/time campaign using the actual browser thermal kernel. It checks the global cumulative gas-plus-liner-plus-cooling energy ledger at every accepted step (relative error at most 1e-8), positive gas temperature, the solid material domain and nontrivial wall gradients. When given the FiPy campaign output, it requires all 64 wall temperatures plus the gas endpoint to agree within 2e-5 K. Endpoint-only agreement is not substituted for full-field agreement. This separate production study prevents an external solver's convergence from being misreported as qualification of the browser implementation.

Intended isolated commands (after the parent refreshes and hashes the guest snapshot):

```text
node --import tsx scientific/thermal-v53/export-reference.ts scientific/thermal-v53/reference-cases.json
.venv/bin/python scientific/thermal-v53/reference-fipy.py scientific/thermal-v53/reference-cases.json scientific/thermal-v53/fipy-reference.json
.venv/bin/python scientific/thermal-v53/convergence-fipy.py scientific/thermal-v53/fipy-convergence.json
node --import tsx scientific/thermal-v53/convergence-production.ts scientific/thermal-v53/production-convergence.json scientific/thermal-v53/fipy-convergence.json
```

Each external output records the input/script hashes and actual FiPy version; the oracle also exports Python dependency versions. The parent must retain these outputs and source manifests alongside test/build receipts. No execution was performed by this agent, avoiding races on the parent-owned guest.

## Remaining physical boundaries

Radial liner heat flow does not provide axial coil/endcap gradients, localized arcs, radiation, deformation, thermal stress, liquid lithium films, phase change, molecular modes or electron/ion/neutral energy equilibration. Film conductances and deposition fractions remain assumptions. The liner represents illustrative solid tungsten, not a claim about Marathon's as-built material or dimensions. Numerical convergence and external-code agreement establish the selected model's numerical behavior; calibration would need geometry/material documentation and temperature/heat-load measurements.
