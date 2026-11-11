# Mass Spinner version 9: implemented work and open scientific gates

**Version-10 follow-up:** the collision convergence failures now have a diagnosed spatial cause and a separately reviewed annular/source-fitted candidate. Read [current collision evidence](COLLISION-CONVERGENCE-V10.md). The version-9 results below are retained as historical evidence; they must not be relabeled as results of the new branch. Field/fusion/experimental boundaries remain unchanged.

6 November 2026. The remaining stages have executable software increments and measured evidence. **They have not all achieved scientific acceptance.** Numerical results cannot be made converged by declaring the task complete, and a synthetic fixture is not an experiment.

## Section III coverage

The complete tutorial inventory is **III A–K, eleven topics**. The new page exposes each mechanism's II C/D impact, implementation boundary and missing ingredient: **four partially represented, two diagnostic-only, five not coupled; none fully modeled at apparatus level**. See [complete coverage](SECTION3-COVERAGE.md).

Independent failure-budget sliders explore constant-rate CX/recombination no-event probabilities, prescribed unbounded diffusion displacement, optically thin radiation energy and simplified sheath heat flux. Their cross sections, cooling coefficients, diffusivity and fluxes are explicit assumptions. They do not secretly change charged trajectories, temperatures, neutral populations or collected purity. Molecular chemistry, dust, charge-changing transport and unstable collective response remain separate missing models.

## Stage completion means two different things

| Stage | Executable increment delivered | Observed gate |
| --- | --- | --- |
| 5 | Offline case/seed/resolution runner, source provenance, raw observations, whole-run uncertainty, pass/fail/unknown checks and public case table | **FAIL** for the 200 µs default; controlled ballistic gate remains **UNKNOWN**, despite accurate flux accounting |
| 6 | Adaptive geometric collision cells, density/pair-distance diagnostics, 36-run method comparison, independent nonlinear isotropic Landau reference candidate | **NOT ESTABLISHED**: adaptive is not uniformly better; candidate reference and stochastic finite-time agreement remain unaccepted |
| 7 | Separate II C Gaussian equilibrium with coupled Bz(r), Jθ(r), φ(r) and explicit axis/wall B boundary | Bounded equations/limits tested; prescribed density/rotation and missing source/electron/sheath/axial/instability closure prevent a complete device model |
| 8 | Typed measured/predicted evidence contract, identity/units/settings checks, calibration/holdout separation and comparison CLI | **BLOCKED** for experimental acceptance: no matched measured held-out C/D dataset obtained, and separator convergence remains open |

## Actual numerical evidence

### Stage 5: 48 runs at the intended 200 µs horizon

Six independent seeds per level; separate dt, marker count and approximately occupancy-preserving spatial refinements, plus a collision-off control. No physical density/source/horizon was adjusted to force a pass. Exact executed source identity is recorded in the artifact.

The finest spatial case still reaches **0.963% raw Pθ residual** of the positive initial scale, above the chosen 0.1% diagnostic budget; maximum sampled unresolved representative exposure is **37.6%**. The finest paired spatial change in B angular transfer exceeds its declared budget. Baseline collision-on/off axial-fraction effects are **A −1.30 ± 2.63 pp** and **B +1.04 ± 1.85 pp**, approximate pointwise 95% whole-run intervals: neither resolves a nonzero effect with these six seeds. The overall gate is **FAIL**.

An 18-run controlled ballistic all-exit case closes H/P flux near machine precision but honestly remains **UNKNOWN** for broader convergence. Identical empirical seed outcomes cannot establish an absent rare tail. [Stage-5 equations, checks and command](STAGE5-CONVERGENCE.md); [actual case report](convergence/convergence-default-200us-v1.md).

### Stage 6: 36 locality runs and a finite-time independent formulation

The adaptive low-count candidate lowers artificial torque but **worsens pair distance and initial density smoothing**. At 2048 markers/species its mean raw Pθ residual is 0.578% (approximate 95% interval 0.521–0.635% of the positive scale), while its finest B axial-fraction change spans **−1.40 to +3.57 pp**. This fails the selected one-percentage-point equivalence target. Fixed cells remain the default. [Method, negative results and exact assumptions](STAGE6-LOCALITY.md).

An independently written isotropic Rosenbluth finite-volume candidate evolves a homogeneous nonlinear two-species distribution for 1 ms. It uses no stochastic-pair rate helper, velocity floor, thermostat or energy projection. Its fine run has **0.0413% unprojected energy defect**, and mesh/time/cutoff checks are reported. Four-seed stochastic comparisons remain wide and nonmonotonic. This is a useful independent candidate, **not an accepted reference or spatial separator validation**. [Derivation and campaign](LANDAU-REFERENCE.md), [independent equation review](LANDAU-INDEPENDENT-REVIEW.md), [recorded evidence](convergence/landau-reference-results.json).

### Stage 7: an actual bounded magnetic closure

The original Gaussian branch estimates a magnetic perturbation while keeping B imposed. The new branch solves `d(B²)/dr = 2μ₀ N r F`, reconstructs current/electron flow and uses `ψ=φ−Ω∫B(r)rdr`. An incompatible wall magnetic pressure rejects the requested equilibrium explicitly; it does not change density or switch boundaries to obtain a result. [Derivation, tests and limitations](STAGE7-FIELD-CLOSURE.md).

Bulk inversion is performed using the B-independent equal-charge composition before testing the final magnetic mixture. Otherwise a pressure-incompatible pure-species bracketing trial can incorrectly reject a compatible requested mixture. The narrow correction separates the mathematical composition inverse from the physical magnetic compatibility test; a regression reproduces the valid-mixture/invalid-endpoint case. Imposed-field and legacy profiles remain unchanged.

### Stage 8: validation infrastructure without invented measurements

The reader checks exact case/model/version/hash, physical settings and units, bounded profile interpolation, numerical bounds separate from predictive/measurement uncertainty, and declared held-out leakage. It rejects stale or obsolete evidence. These are checks of supplied evidence, not authentication of a user-written `measured` label or proof of its declared convergence.

The synthetic example actually returns **BLOCKED**, for synthetic provenance and unestablished numerical convergence. Primary PMFX/LAPD sources were reopened; useful profile diagnostics exist, but the bounded search did not obtain a matched calibration/held-out species-separation dataset. This is not a claim that such data do not exist. [Contract/CLI](STAGE8-VALIDATION.md); [specific missing measurements and candidate sources](EXPERIMENTAL-VALIDATION-GATE.md).

## Marathon-inspired beam-target laboratory

[Marathon's public description](https://www.marathonfusion.com/beam-driven-fusion/) gives an RF deuterium ion source, keV accelerator and cooled lithium-tritide target. The separate teaching panel follows this architecture. It uses sourced Bosch–Hale D–T cross sections, a supplied tritium column and imposed slab stopping law. It reports neutron production, nuclear/beam/product powers, layer heat, transmitted-beam power and conditional assembly heat if the remaining beam stops in the substrate.

Illustrative defaults give **1000 W incident beam, 0.805 W nuclear Q power and 2.855×10¹¹ neutrons/s**. These are computed from explicitly assumed inputs, not Marathon measurements or a fit to company headline figures. Target stopping, solid-state response, cooling/erosion, beam optics, neutron transport, blankets, transmutation and net electricity are not predicted. The diagram is original and conceptual, not a device CAD model. [Full scope and primary sources](MARATHON-SIMULATOR-SCOPE.md).

Independent review caught finite-input overflow of derived beam rate/heat/exposure. A finite-output invariant now rejects nonrepresentable calculations without arbitrary physical caps; zero-current undefined ratios remain null. [Stage-5/6 independent review](STAGE56-INDEPENDENT-REVIEW.md), [product review](STAGE9-PRODUCT-REVIEW.md).

## Release and next decisive work

Current run exports are modelVersion 9; unchanged independent-orbit studies remain version 6. New offline evidence formats have separate schema versions. No historical-file import or persisted-state migration is silently attempted.

Full checks, exact source snapshot and CLI publication are recorded in the project-root IMPLEMENTATION-STATUS.md. All report links must be staged into web-assets before Vite builds; docs alone are not deployed. The 26,225,594-byte raw convergence JSON exceeds Cloudflare's 25-MiB individual-asset cap, so the public download is losslessly gzip-compressed; decompression is verified against the original. Compact JSON and Markdown remain directly available.

Actual browser controls, native workers/downloads, GPU output and responsive appearance remain unverified after the effective origin-policy denial. No alternate browser/CDP/origin-fetch workaround was used. Source-unit controls, SVG and export tests are distinct evidence.

The next decisive work is a spatial/source-density/local-occupancy method that passes intended-horizon observable convergence, more resolved independent finite-time distribution benchmarks, measured device profiles/inputs and a genuine held-out experiment. The software now makes these failures inspectable instead of certifying them away.
