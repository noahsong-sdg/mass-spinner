# Material, thermal, nuclear and diagnostic tooling audit

2026-11-12. Read-only source audit plus current primary documentation. No solver, install, build or experiment was executed for this review. Existing receipts are evidence of earlier runs, not fresh reproduction. Recommendations below are inferences from the traced implementation and documented tool capabilities.

## Conclusion

We have **not** reinvented all of these fields. Actual RustBCA, FiPy, OpenMC/NJOY, Cantera, PyAbel and SciPy integrations already exist. The weak point is promoting individually verified components into a coupled predictive apparatus model when material properties, boundary conditions and measured operating inputs remain uncertain. More sophisticated software cannot supply those inputs.

The best architecture remains an authoritative offline expert-code calculation, a bounded browser solver or response adapter, and independent checks of both. The browser's small conservative tridiagonal kernels are reasonable. Extending them into a general tritium-materials, depletion or synthetic-diagnostic framework would be avoidable reinvention.

## What is actually used

| Path traced | Actual tool use | Limit that must survive any migration |
|---|---|---|
| `src/deuteron-stopping.ts`, `src/target-material.ts`; `docs/MARATHON-MATERIAL-V35.md` | Browser adaptation of pinned native Geant4 stopping functions, with native comparisons. | Kernel agreement is not a full Geant4 transport run or experimental compound-LiT stopping validation. Bragg-additive atomic stopping omits chemistry and range straggling. |
| `scientific/material-v38/finite_film.py`, cases and independent readout; `docs/FINITE-FILM-V38.md` | Native RustBCA layered-film histories and particle/energy partitions; independently checked raw-output parsing. | Prompt implantation/reflection/sputtering is distinct from subsequent diffusion, trapping, release and evolving target chemistry. |
| `src/target-conduction.ts`; `scientific/marathon-v35/thermal/reference-fipy.py` | Custom bounded browser backward Euler, independently assembled and solved with actual FiPy. | Constant-property illustrative film/backing, insulated front, Robin-cooled back. |
| `src/fuel-thermal.ts`; `scientific/thermal-v53/reference-fipy.py`, `scientific/gas-energy-v57/reference-fipy.py` | Custom conservative radial enthalpy solver, actual FiPy cylindrical references and SciPy LU. | Fixed tungsten geometry and declared material domain; not as-built Marathon construction or multidimensional thermal management. |
| `scientific/gas-regime-v56/transport.py` | Actual Cantera 3.1 atomic-H transport reused with D/T isotope masses. Separate Li fit and NIST He data. | D/T Lennard–Jones isotope proxy; not measured D/T transport. Li is a theoretical fit. No automatic replacement of unavailable data. |
| `scientific/neutron-v38/response-study.py`, refinement studies; `src/neutron-response.ts` | Actual OpenMC 0.16.0, NJOY2016.78 and processed ENDF/B-VIII.1 H1 response family; bounded browser interpolation. | Free H1 at one density/temperature, fixed source spectrum and geometry family. Not a LiT/W apparatus, photon heating or a blanket prediction. |
| `src/decay-network.ts`; `docs/NEUTRON-DEPTH-V38.md` | Small browser positive matrix-exponential network; independent OpenMC CRAM48 and SciPy matrix-exponential controls documented. | Generic supplied rates/branches, not an evaluated isotope depletion chain coupled to local flux. |
| `scientific/optical-v80/emissivity.py`, `feasible.py`, `spectrum.py` | Actual PyAbel nonnegative Daun inversion, SciPy/HiGHS brightness-constrained LP, SciPy normal-CDF line integration. | CHERAB is an algorithm reference, **not executed**. No measured interferometer transfer function or absolute radiometric calibration is available. |
| `scientific/loading-independent-v24/reference.py` | Actual independent SciPy Radau and selected DOP853 loading references. | Simultaneous well-mixed fixed-matrix loading equations; this is not a full independent reference for the later depth/thermal coupled target. |

## Ranked actions

### 1. Adopt specialist tritium transport before expanding target chemistry

**Problem / technical cause.** `src/coupled-target.ts:112` combines depth composition, stopping, fusion, Arrhenius diffusion/release, renewal and heat. Its own assumptions at lines 239–247 identify fixed Li sites, conditional replacement weights, missing compound chemistry and zero-range backing absorption. A parameterized diffusion/release equation does not establish which microscopic retention mechanisms dominate.

**Plain explanation.** We can balance the atoms perfectly while putting them in the wrong places and keeping them for the wrong amount of time.

**Fix.** Build one offline **FESTIM v2** pilot reproducing the existing diffusion-only and heat-only limits, then D/T mobile/trapped species and material interfaces. FESTIM's current species/reaction abstraction supports isotopes, immobile traps, vacancies and reactions; temperature and surface boundary conditions are explicit inputs. This is a fit to the problem class, not evidence that a LiT material law already exists. [FESTIM species](https://festim.readthedocs.io/en/latest/userguide/species.html), [temperature](https://festim.readthedocs.io/en/latest/userguide/temperature.html), [boundaries](https://festim.readthedocs.io/en/latest/userguide/boundary_conditions.html).

**Why this choice.** It avoids building a second general hydrogen-materials framework. **TMAP8** is the stronger alternative when the objective expands to permeation paths, enclosures and fuel-cycle/system inventories; it provides a MOOSE-based migration framework and published verification cases. Choose one first, not two concurrent rewrites. [INL TMAP8](https://tmap8.inl.gov/), [verification walkthrough](https://tmap8.inl.gov/tutorial/index.html).

**Adoption gate.** Use identical fixed geometry and coefficients; verify zero-source inventory conservation, isotope accounting, analytic diffusion/permeation limits, heat flux balance and independent mesh/time refinement. Then validate a relevant retention/desorption measurement with independently specified diffusivity, solubility, trap density/energies and recombination law. No tuning to the already viewed velocity or loading curve. Do not present hypothetical LiT reaction constants as a database-backed material model.

FESTIM's official site lists Marathon among its users; that is project self-report and does not identify Marathon's actual model, inputs or validation. [Official site](https://festim.readthedocs.io/en/latest/).

### 2. Extend an existing stiff reference; stop growing general browser integration machinery

**Problem / technical cause.** The coupled target's first-order IMEX Euler step doubling (`src/coupled-target.ts:223–247`) controls local estimates and has a 50,000-attempt budget. It intentionally maintains positivity and conservation, but owns nonlinear source lagging, adaptation and pulse-edge handling. The independent Radau code covers the earlier, simpler well-mixed equations only.

**Plain explanation.** We have a good small browser engine, but more coupled processes make its numerical behavior harder to certify.

**Fix.** First extend the already available **SciPy Radau** oracle to the full semi-discrete target with independently implemented flux/source assembly, component-scaled tolerances and a sparse Jacobian. Compare Radau/BDF, tolerance refinement and spatial refinement at the same physical sample times. If a mature migration package takes ownership of these equations, use its solver instead. [SciPy solver documentation](https://docs.scipy.org/doc/scipy/reference/generated/scipy.integrate.solve_ivp.html).

**Why this choice.** Existing SciPy is the smallest coherent improvement; adding another language is unnecessary. If profiling demonstrates a scaling or sensitivity requirement, use **SUNDIALS CVODE/CVODES** for stiff ODEs, **ARKODE** for an intentional IMEX split, or **IDA** only for a genuine DAE. These supply mature integration infrastructure, not automatic atom conservation or positivity. [SUNDIALS packages](https://sundials.readthedocs.io/en/v7.2.0/index.html), [current CVODE usage](https://sundials.readthedocs.io/en/latest/cvode/Usage/index.html).

**Adoption gate.** Preserve pulse discontinuities, tiny fusion event channels, nonnegative populations and total-site/element/energy ledgers. Count rejected steps and actual solves; prove the intended timestep contrast is active. Agreement between codes solving the same assumed law establishes numerical verification, not material fidelity. This audit establishes a coverage gap, not a newly reproduced runtime bug.

### 3. Extend existing transport codes instead of inventing richer nuclear or implantation models

**Problem / technical cause.** The current OpenMC family is a narrow, qualified H1 transport example. The browser's reaction/decay visualization and zero-range backing absorption cannot be extrapolated into full shielding, nuclear heating or transmutation.

**Plain explanation.** A validated hydrogen cylinder is not a validated neutron-source assembly.

**Fix.** Keep **RustBCA** for prompt particle-material response and **OpenMC/NJOY** for neutron transport. Add physically specified film/backing compositions, source energy-angle distributions, geometry, leakage and energy deposition offline. Generate response tables only over domains with fresh holdouts. Couple implantation profiles to the target balance only with the correct normalization: stopped/incident and conditional depth distributions are different quantities.

For isotope production, use `openmc.deplete` with an evaluated chain, material volumes and **fixed-source source-rate normalization**, rather than expanding the small generic browser network. OpenMC already separates transport operators from depletion integration. [OpenMC depletion](https://docs.openmc.org/en/stable/usersguide/depletion.html). For heating, distinguish neutron-only local photon deposition from coupled photon transport; the tallies explicitly support these alternatives. [OpenMC heating scores](https://docs.openmc.org/en/stable/usersguide/tallies.html#heating-and-energy-deposition).

**Why this choice.** These are already integrated expert tools with relevant physics. A new custom Monte Carlo or expanding Beer–Lambert attenuation would create a much larger verification burden. Full Geant4 charged-particle transport can be a second independent reference when its additional mechanisms are needed; translating more individual functions is not the same as running its transport engine.

**Adoption gate.** Check isotope-density conversion, beam/neutron normalization, evaluated-data provenance, transport cutoffs, particle/energy closure and Monte Carlo intervals separately from nuclear-data and geometry uncertainty. Neither agreement with OpenMC nor RustBCA supplies missing measured LiT material properties.

### 4. Retain the optical adapter; adopt CHERAB only when geometry/instrument evidence warrants it

**Problem / technical cause.** The existing PyAbel + HiGHS path appropriately constrains emissivity with brightness without fitting velocities. `spectrum.py` is a thin isolated-line Gaussian model. It does not reproduce an unreported Fabry–Perot response, optical depth, collection cone, Zeeman components or uncertain line identification.

**Plain explanation.** A simulated local velocity is not necessarily the velocity an instrument reports.

**Fix.** Keep the exact annular LOS integration, nonnegative inversion and independent centroid bounds. PyAbel already supplies mature inversion methods; replacing it with another hand-coded inverse is unnecessary. [PyAbel methods](https://pyabel.readthedocs.io/en/latest/abel.html#module-abel.daun). Add a **CHERAB/Raysect** synthetic-diagnostic reference when aperture, viewing geometry, line identity, atomic population inputs and instrument response are known. CHERAB supports Doppler and Doppler–Zeeman line shapes, while explicitly assuming Maxwellian emitting species. [CHERAB line shapes](https://www.cherab.info/models/line_shapes/spectral_line_shapes.html).

**Why this choice.** The small SciPy CDF calculation is an appropriate domain adapter; importing a ray tracer solely to integrate a Gaussian adds little. A ray tracer becomes worthwhile for finite optics, obscuration and 3D emission. Unknown emissivity, electron distributions or instrument response remain experimental/model uncertainties.

**Adoption gate.** Reproduce rigid-rotation emissivity independence, analytic Gaussian profiles, signed chords and absolute photon-unit normalization. Demonstrate a shared emissivity satisfies all brightness constraints. Keep centroid, line peak and fitted instrument estimator distinct. Obtain the actual response/calibration before asserting that synthetic line peaks match the historical diagnostic.

### 5. Use standard sensitivity tools when assigning uncertainty, not more ad hoc corners

**Problem / technical cause.** Versioned parameter families, extraction intervals, Monte Carlo histories and convergence bounds answer different questions. No SALib or Dakota integration was found in the searched executable source/manifests. A finite set of parameter corners does not generally bound a nonlinear coupled response; manual extraction ranges are not confidence distributions.

**Plain explanation.** Sweeping many cases does not by itself tell us how likely an error is or which unknown matters most.

**Fix.** Use **SALib Morris** screening for influential inputs, then a justified Sobol design for a small, stable model. Keep explicit assumed distributions and dependencies; conventional independent-input Sobol indices cannot be silently applied to dependent inputs. Use **Dakota** if campaign orchestration, surrogate construction or mixed design/uncertainty studies become the bottleneck. Preserve our domain manifests, sealed observations and acceptance gates as adapters. [SALib methods](https://github.com/SALib/SALib), [Dakota capabilities](https://dakota.sandia.gov/about-dakota/).

**Why this choice.** SALib is a small addition to the existing Python stack. Dakota is a more capable but heavier workflow. Neither makes unidentifiable calibration valid. First-order accuracy still requires held-out measurements of matching apparatus conditions and an uncertainty budget that separates discretization, parameter, observation and model discrepancy.

## Tools not to adopt by default

| Tool | Decision |
|---|---|
| FiPy | Retain actual independent heat oracles. NIST's finite-volume framework fits these radial diffusion/reference tasks. Use a larger multiphysics stack only for demonstrated multidimensional coupling requirements. [NIST FiPy](https://pages.nist.gov/fipy/en/latest/). |
| Cantera | Retain explicitly labeled neutral transport/chemistry comparisons; importing it does not validate the D/T collision parameters. Its transport models require species parameters. A complete reactor network would not replace magnetized momentum/current or solid-state trapping. [Cantera transport](https://cantera.org/stable/reference/transport/index.html). |
| TRANSP | Do not migrate this separator/beam-target model to it. PPPL describes an integrated tokamak interpretive/predictive workflow; its geometry, closures and diagnostic input needs do not match this problem merely because both concern fusion. Access is governed by its license, not assumed unrestricted browser redistribution. [PPPL TRANSP](https://transp.pppl.gov/), [license](https://transp.pppl.gov/files/LicenseAgreement.pdf). |
| SRIM/TRIM | Useful optional independent stopping/range comparison, not a replacement for open reproducible native RustBCA. The official module notice permits noncommercial use and requires a license for commercial inclusion; check the actual distribution's terms before redistribution. No actual SRIM execution was found. [Official notice](https://srim.org/SRIM-Module.htm). |

## Access and redistribution checks

- FESTIM: [Apache-2.0](https://raw.githubusercontent.com/festim-dev/FESTIM/main/LICENSE). TMAP8: [LGPL-2.1](https://raw.githubusercontent.com/idaholab/tmap8/main/LICENSE). Pin versions and retain dependency notices.
- RustBCA v3: [GPL-3.0](https://raw.githubusercontent.com/lcpp-org/RustBCA/v3.0.0/LICENSE). Distinguish offline output use from distributing/linking native or browser binaries; check obligations for the proposed integration.
- OpenMC: [MIT](https://raw.githubusercontent.com/openmc-dev/openmc/develop/LICENSE). Nuclear-data files and processing provenance are separate from the code license; pin the actual evaluations and processed hashes.
- Geant4: its [own license](https://geant4.web.cern.ch/download/license/) requires notices and clear identification of modified software. Preserve existing adapted-kernel attribution.
- CHERAB: [EUPL-1.1 documentation](https://www.cherab.info/licence.html). Atomic-data permissions and installed dependency licenses require separate checks before packaging or public service deployment.
- SALib: MIT per the [official repository](https://github.com/SALib/SALib). Dakota's optional numerical packages have their own licenses; check the selected build rather than treating every plugin as equivalent.

## Practical order

For the **current measured rotation mismatch**, do not interrupt the active flow/current convergence work to install unrelated neutron or target packages. In parallel, specify a FESTIM feasibility deck and full coupled-target independent reference. Next extend existing OpenMC/RustBCA response families when apparatus/source data justify it. Keep the optical constraints as a falsification tool. Add sensitivity/UQ machinery only after numerical failure cases are explicitly classified and input uncertainty is defensible.

No new tool was installed or qualified by this audit, and no public playground accuracy claim changes as a result of it.
