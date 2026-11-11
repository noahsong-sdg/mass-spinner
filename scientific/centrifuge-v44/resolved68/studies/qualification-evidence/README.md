# Mass Spinner — plasma separation laboratory

Public personal learning project: https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev

Dark instrument-style interface, editable Blender hardware, current Three.js 0.187 WebGPU renderer (built-in WebGL2 backend), Vite 8.3.6 and a TypeScript physics worker. No backend, accounts or database. Only `release/` is published to Cloudflare Workers Static Assets; local tools and project files are not uploaded.

Current centrifuge scientific work: a reusable electrical solver makes the
experimental spatial backend practical to refine. All four evolving resolution
comparisons pass their declared whole-history, surface and electrical gates;
1,152 accepted steps pass independent conservation/entropy audits. A fresh
16-case FiPy comparison passes too. Early local thermal responses and experimental
accuracy remain unqualified. The deployed backend is not replaced.
[Measured results, root causes and remaining limits](docs/RESOLVED-CURRENT-EVOLUTION-V68.md).

## Version 20: compact controls and component inspection

Click the separator meshes or beamline components to inspect their function,
materials and source boundaries; equivalent native buttons work without picking.
Basic controls use a compact narrow-screen grid, target assumptions are collapsed,
and advanced models have section navigation. Replay loading can retry failures;
all six plotted components have distinct line/legend styles. An optional sample
geometry reference distinguishes neutron production from idealized sample current.
It does not calculate actual neutron transport or isotope yield.

Two independent Marathon source reviews and an integration review retain the
compact-source / future-alchemy distinction. Measured LiT stopping, target thermal
and regeneration dynamics, and angular neutron transport remain future data and
validation work. [Full v20 review](docs/PLAYGROUND-REVIEW-V20.md).

Final isolated gate: **289 tests pass**, typecheck/build/static-site checks pass.
Cloudflare confirms version `c1e8a2a7-71ce-40c6-82be-75890a203388` at 100%; all
99 deployment-export files match the tested build. Native browser/GPU checks
remain blocked by the effective origin policy despite the saved/UI allowance.
[Browser diagnostic](docs/BROWSER-VERIFICATION-V20.md).

## Version 19: visual playgrounds and adversarial audit

Level 1 keeps the rotating-ion playground without lesson steps. Level 2 is a
beamline console: on/off controls, target loading, physical footprint scaling,
live metrics and marked energy scans. Level 3 keeps the advanced separator
controls and plots, with explanations collapsed and independent comparison
operating points visible. Level 4 replays three actual Julia cases/63 saved
states with a time scrubber and complete temperature tensors; it is recorded
data, not a browser collision solver.

Five adversarial reviewers covered every level and cross-level interaction.
Fixes address misleading graph scaling, stale share/preset state, hidden-camera
dimensions, keyboard plot access, supported timestep coverage and approximation
warnings. Physics kernels and scientific acceptance gates are unchanged.
Final gate: 274 tests, typecheck, build and static-site validation pass on an
exact 259-file copied snapshot. Cloudflare confirms playground version
`fe9ac4ef-6e6c-4483-9a46-3c52e4049b1a` at 100%. Live browser/GPU verification
remains blocked.
[Findings, root causes, fixes and evidence](docs/PLAYGROUND-AUDIT-V19.md).

## Version 18: learning levels

The default Level 1 is the basic rotating-filter playground: four controls,
a pinned source/seed and a reproducible experiment link. Level 2 teaches
Marathon's compact beam-target source through fusion versus stopping, neutron
output versus heat, and useful-neutron versus electrical accounting. Its
assumed target model is educational, not a calibrated Marathon machine.
Level 3 retains the advanced separator workbenches. Level 4 presents actual
offline research figures with the unresolved qualification gates visible.

The unchanged numerical engines pass 268 application tests, typecheck, build
and static-site validation on an exact 255-file copied snapshot. Live browser
verification is still blocked by the managed origin policy; rendered controls
and GPU appearance are not verified. Cloudflare confirms the new build deployed
at 100% as version `3d9ba981-edae-4175-836d-5107ce38f9af`.
[Curriculum, independent reviews, fixes and evidence](docs/LEARNING-LEVELS-V18.md).

## Version 17: general 3D collisions with drift and anisotropy

The offline Julia backend now evolves arbitrary three-component marker velocities,
including relative drift, rotated temperature tensors and coupled relaxation.
Positive Gaussian mixtures and the unequal-mass discrete-gradient pair method
retain number, momentum and energy without a Maxwellian or product closure.
All 17 planned histories complete: 600 accepted steps and 617 saved states.

Independent physical-rate references expose substantial remaining smoothing and
representation errors. At the tested alpha .1, even the ideal regularized Gaussian
limit misses physical drift and full-tensor rates by 14–37%. The separate 21-run
WarpX comparison is complete, but its strict 2% rate comparisons remain unresolved
under measured seed uncertainty. Conservation alone does not qualify either model.
The full-3D PDF study yields 30 refinement failures and two unresolved records;
boost symmetry passes, while both tested rotation orders fail. Independent
audits cover all 617 states and replay 51 complete equations. The physical-H
allowance passes for two controls and remains unresolved for 15; the two passes
include a tiny positive H estimate, so they do not establish an H theorem.
The study report separates these failures from successful trajectory generation.

[Results, causes and independent audits](docs/GENERAL3D-CONVERGENCE-V17.md),
[backend API and reproduction](scientific/general3d-evolution-v17/README.md).
Scope remains homogeneous, field-free two-ion collisions. The browser runtime
and public deployment are unchanged. Fresh application checks pass: 262 tests,
typecheck, build and static-site validation on a pinned 243-file snapshot.
[Commands and logs](scientific/verification-v17/README.md).

## Version 16: practical finite-time collision evolution

The new offline Julia backend uses exact isotropy to evolve full radial PDFs
without a Maxwellian closure. Removing redundant angular dimensions makes the
refined collision model practical: the finest 100 µs case completes in about
6½ minutes, and its smaller-timestep control in about 10 minutes, each with
sampled peak memory below 0.6 GiB.

All 14 planned histories complete, including two 500 µs equilibrium controls.
Independent reconstruction checks physical entropy, number, energy and positive
PDFs across all 494 saved states. Fine width and timestep PDF-increment
comparisons pass the unchanged 2e-4 budget; coarse particle/width failures remain
visible. The finest initial heating rate is 27,952.349 eV/s, 0.1065% below the
unchanged physical target. Refinement differences are not exact-solution error
certificates.

A weighted discrete gradient removes artificial inverse-weight amplification
in near-empty tails. Separately versioned stable entropy arithmetic fixes
large-move NaNs while preserving all 480 saved increments and a fresh finest
run's 21 physical states bit-for-bit. The original studies retain their actual
source identities.

[Results, fixes, plots and independent audits](docs/EVOLUTION-CONVERGENCE-V16.md),
[patched backend and reproduction](scientific/isotropic-evolution-stability-v16/README.md).
The studied scope is this homogeneous, isotropic two-ion benchmark; angular dynamics,
fields and separator transport need further qualification. This backend is
offline; the public browser deployment is unchanged. Application regression
gate: **262 tests**, typecheck, build and static-site checks pass on an exact
243-file snapshot. [Commands and logs](scientific/verification-v16/README.md).

## Version 15: joint heating-rate refinement

All 96 planned initial-state particle/width records and 15 actual implicit
timestep runs completed. A positive uniform Gaussian quadrature family and
independently checked tensor/Laplace initial-rate reference separate input shape,
regularization, operator quadrature and finite-step effects. The physical target
and original 2% gate are unchanged; no collision coefficient was fitted.

Fine initial rates are **27,499.185 eV/s** at alpha .0125 (**1.726% low**) and
**27,742.276 eV/s** at alpha .00625 (**0.857% low**), passing that gate.
Doubling particle resolution changes them by less than .01 eV/s. Independent
physical Gaussian-mixture calculations explain the remaining bias as finite
smoothing. Full-PDF checks reject misleading coarse rate passes.

The actual coarse full3V timestep ladder converges to its own roughly 39.6%
underheating rate; all 15 physical gates still fail. The large tensor benchmark
computes the initial state only: it has not evolved its 134,217,728 encoded
markers per species. Finite-time entropy/PDF/horizon qualification remains open.

[Results, root causes and independent audits](docs/HEATING-RATE-CONVERGENCE-V15.md),
[complete initial-state matrix](scientific/structure-rate-v15/results/table.md),
[actual timestep evidence](docs/HEATING-RATE-TIMESTEP-V15.md).
Fresh application checks: **262 tests pass**, typecheck, build and static-site
checks pass; [exact copied snapshot and logs](scientific/verification-v15/README.md).
Production physics and public deployment are unchanged.

## Version 14: structure-preserving two-ion collision method

A new offline Julia backend uses full-3V positive Gaussian mixtures, an
unlike-mass Landau pair metric and a Gonzalez discrete gradient. It executes the
unchanged MIT Newton–Krylov solver from pinned CollisionOperators.jl; the
two-ion physics and entropy representation are explicitly new adaptations.
Independent agents audit source reuse, algebra, actual steps and reconstructed
distributions against the unchanged convergence budgets.

Physical qualification remains open. Coarse operator quadrature decreases its
own discrete entropy while increasing resolved physical entropy, so that failed
control is retained. Finite smoothing changes the physical relaxation rate.
The requested 500 µs baseline reached its fixed wall cap at 445 µs; its real
saved history is audited without relabeling it a completed run. Nearly stationary
finite mixtures also have measurable initial Maxwellian-shape error.
The completed independent audit passes all saved 100 µs control entropy and
stationarity budgets and all 12 short-time PDF-increment comparisons. All four
physical heating-rate controls fail, with 12.51–40.73% errors; five planned
refinements remain unrun. The candidate is not a qualified physical reference.

[Implementation, studies and qualification](docs/STRUCTURE-CONVERGENCE-V14.md),
[source/reuse review](docs/STRUCTURE-SOURCE-REVIEW-V14.md),
[independent mathematics](docs/STRUCTURE-MATH-AUDIT-V14.md),
[distribution-gate audit](docs/STRUCTURE-GATE-AUDIT-V14.md).
Fresh root software gate: **262 tests pass**, typecheck, build and static-site
checks pass; [exact snapshot and logs](scientific/verification-v14/README.md).
This scientific backend has not replaced production physics or been deployed.

## Version 13: distribution equilibrium, positivity and entropy

Actual-field studies separate conserved moments from distribution fidelity.
Julia's twelve controlled cases and 100 µs baseline show that positive nodes can
already interpolate to a negative initial PDF. Mesh/order refinement reduces
shape drift substantially; tighter nonlinear tolerances and conserving-correction
toggles do not remove it. Physical entropy is withheld for signed distributions.

The PETSc 500 µs replay and shorter refinement ladder preserve the operator and
initialization. All 42 mesh-16 fields through 100 µs are certified nonnegative,
yet physical H increases above budget. Smaller-step controls and a stricter
residual-converged solve retain the increase. The full baseline meets its L1 stationarity budget,
while the fine spatial increment comparison fails its separate budget. Existing
particle CDF diagnostics pass, with fourth-moment uncertainty retained. Full
distribution/continuum qualification remains unestablished.

[Integrated studies, causes and checks](docs/EQUILIBRIUM-CONVERGENCE-V13.md),
[independent cross-audit](docs/EQUILIBRIUM-CROSS-AUDIT-V13.md),
[published method and existing-code options](docs/ENTROPY-METHOD-OPTIONS-V13.md),
[reproducible figures](scientific/plots-v13/README.md). Root tests: **262 pass**;
typecheck, build and static-site check pass. Scientific computation and tests use
safe-dev VMs. No production physics, browser behavior or deployment changed.

## Version 12: matched two-ion references and collision controls

The exact-SI PETSc two-ion adapter and all eight planned cases execute. Fine
moment-refinement comparisons pass their budgets; a common-temperature sampled
entropy increase and larger-domain negative mass keep full reference acceptance
UNKNOWN. The expanded 41-case WarpX/production study also remains UNKNOWN on all
primary cross-code equivalence gates. Independent audits check 759 PETSc
checkpoints and all 41 particle runs / 176 reported intervals.

Controlled expectations identify finite-step angular sampling and mixed pairing
as concrete causes of initial TA underheating. No missing Coulomb prefactor was
found. A newly qualified Julia nonlinear multispecies solver and small SI bridge
match the analytic initial heating rate to about 0.0011%; negativity and
equilibrium-distribution drift remain explicit limitations. The full-field PETSc
replay passes integrity and independent reconstruction checks; denser sampling
confirms a tiny negative tail missed by the original quadrature.

[Integrated results, causes and checks](docs/TWOION-CONVERGENCE-V12.md),
[stack rationale and tradeoffs](docs/TECH-STACK-DECISION.md),
[scientific reproduction packages](scientific/README.md). Root tests: 262 pass;
typecheck, build and static site checks pass. No production behavior or public
deployment changes in this increment.

## Version 11: executed external scientific references

Julia/SciML adaptive orbit references, PlasmaPy formula fixtures, WarpX mixed-ion collision runs and PETSc's upstream Landau example now execute in isolated safe-dev VMs. Production comparisons pass all six interior orbit cases and 24 formula checks. The finite-time collision comparison remains UNKNOWN; three-seed uncertainty, coarse-step transient differences and angular-variance tails prevent an equivalence claim. PETSc's exact two-ion initialization is a separate adaptation stage.

[Executed results and remaining gates](docs/EXTERNAL-REFERENCE-RESULTS-V11.md), [reproducible scientific workflows](scientific/README.md), [established solver review](docs/INDUSTRY-SOLVER-REVIEW-V11.md). Root software checks: 262 tests pass; typecheck, comparison-script strict check, build and static site check pass. No production behavior or deployment changed in this increment.

## Version 10: collision-locality correction

The double-well kinetic model now offers experimental axisymmetric annular r–z collision cells and optional fixed faces at the declared initial source interfaces. This targets demonstrated nonlocal torque and sharp-source dilution without altering the Coulomb coefficient, renormalizing occupied support or projecting angular momentum. The Cartesian default remains available and reproduces all prior observations exactly.

Choose the annular method and source-fitted grid in Coulomb scattering & resolution. Physical weights, actual mesh faces, meridional/radial pair distances, raw torque and fluxes are exported. Source fitting is inactive for equilibrium runs; ring kinetics assume an axisymmetric distribution and cannot represent azimuthal fluctuations. Numerical convergence remains an explicit acceptance gate, not a consequence of passing implementation tests.

[Root causes, studies and limits](docs/COLLISION-CONVERGENCE-V10.md), [independent physics review](docs/COLLISION-METHODS-V10.md), [prospective study plan](docs/CONVERGENCE-PLAN-V10.md). Exact final checks/publication are in IMPLEMENTATION-STATUS.md. Historical version-9 evidence follows.

## Version 9: failure mechanisms, verification workbenches and beam-target fusion

Section III A–K now has a complete II C/D coverage map: four partial topics, two diagnostic-only, five not coupled, none fully modeled. Independent live budget controls explore CX/recombination, assumed mixing, radiation and sheath heat; these do not modify separator collection.

Stages 5–8 now have executable increments: reproducible intended-horizon convergence cases, experimental adaptive cells with measured locality, an independently derived finite-time Landau reference candidate, coupled radial magnetic equilibrium with axis/wall boundaries, and a held-out evidence comparison contract. **The scientific gates remain open:** the actual 48-run default case FAILS convergence, the 36-run adaptive comparison is not uniformly better, and experimental validation is BLOCKED without a matched measured dataset and converged model.

A separate Marathon-inspired beam-target teaching panel follows the company's public RF-source → D⁺ accelerator → lithium-tritide architecture. Bosch–Hale reaction physics and an explicit beam/product energy ledger are implemented; target column/stopping/deposition/efficiency are assumed. No Marathon digital twin or net-electric/device-performance claim. An original beamline schematic keeps this hardware separate from the mass separator's Blender asset.

See [stage implementation and gate status](docs/STAGES-5-8-STATUS.md), [Section III mapping](docs/SECTION3-COVERAGE.md) and [beam-target sources/limits](docs/MARATHON-SIMULATOR-SCOPE.md). Exact final tests, snapshot and publication are recorded in IMPLEMENTATION-STATUS.md. Deployed browser/GPU verification remains uncompleted after the origin-policy denial.

## Version 8: second audit; exploratory collisional double-well dynamics

A separate seventh workbench mode now evolves equal-weight mixed ions under the quartic prescribed potential and local Coulomb pair scattering. It offers a finite initial pulse with absorbers or a closed reflecting/periodic column, common-rotation equilibrium initialization, physical density/temperature/source inputs, particle/cell/timestep controls, and live destination, density, flow and conservation plots. The original landscape remains available.

Kernel validation includes independent Rutherford and Maxwellian thermal-exchange rate benchmarks, exact pair conservation, Hamiltonian turning/event checks and collisionless timestep convergence. Coupled tests cover equal weights, exact cut-cell volumes, source/sink accounting, H/Pθ flux and short-time common-Ω equilibrium stationarity.

**Spatial/particle convergence is not established.** The second audit measures 1.72% raw canonical-angular-momentum residual at the actual 200 µs default, relative to the solver's positive initial scale. The earlier 0.27–0.35% range applies to finer 20 µs runs, with nonmonotonic refinement. All 155 default local-regime snapshots remain unresolved; source/cell geometry also creates persistent density smoothing. Outlet counts are exploratory, not calibrated purity predictions. Measured torque subtraction validates bookkeeping, not trajectories. See [the fresh audit and next stages](docs/NEXT-STAGES.md) and the three AUDIT2 reports. Final checks, snapshot and publication are recorded in IMPLEMENTATION-STATUS.md. Live browser/GPU verification remains policy-blocked.

## Version 6: uncertainty and centrifuge closures

Public branding is now **Mass Spinner**. The existing Cloudflare address is retained so shared links keep working.

Implemented the first three reviewed increments: independent-seed orbit batches and B/V/mass scans with pointwise Wilson recovery intervals and paired-batch bootstrap purity intervals; fixed whole-cylinder composition as an alternative to fixed central composition; and a separately named prescribed-Gaussian, current-carrying centrifuge equilibrium. Scan plots compare finite-device collection with an ideal cold stability threshold, and exports retain cold wall/axial flight times. Arrival plots retain source returns and ions still inside; impact-energy CDFs are explicitly conditional on collection.

Gaussian controls expose density width, absolute axis density and imposed B. Outputs include laboratory potential, electric field, ion/electron rotation, required azimuthal current, estimated magnetic perturbation and omitted electron inertia. These are low-self-field equilibrium diagnostics, not a source/torque/throughput prediction. The two closures preserve their distinct assumptions. Bulk composition fixes the integrated species ratio; the common-corotation normalization does not fix absolute particle number.

The independent audit reproduced a false certainty problem at perfect sampled purity: resampling cannot invent an unobserved contaminant. Such bounds are now withheld with an explicit reason while retaining the point estimate. Recovery intervals remain defined at 0/N and N/N. Cancelled or superseded studies cannot publish partial results.

The fourth increment has a conservative kinetic model specification in `docs/DOUBLEWELL-DYNAMICS-SPEC.md`. Collisional double-well dynamics and collector purity are **not implemented**. Inter-species angular momentum exchange, collision conservation and residence-time benchmarks must pass before those outputs can be enabled. Historical version descriptions below are superseded by this section. Final checks and deployment evidence are in IMPLEMENTATION-STATUS.md; deployed browser/GPU verification remains blocked by effective browser policy.

## Version 5: focused A–D workbench

Current interactive scope: gyro-orbit (§A), ICR (§A), curved-field drift (§B), rigid-rotation equilibrium benchmark (§C), rotating/Ohkawa full orbits (§D), and the double-well Hamiltonian (§D). Eleven original dark scientific schematics cover §E–K and their named variants in the reference atlas; those reference cards do not expose numerical simulators. The older solver modules remain for their benchmarks.

New §C outputs show local composition, logarithmic density, effective potential, log enrichment, cumulative cylindrical inventory and a hypothetical radial cut. Central A fraction and radial resolution are adjustable; a doubled-grid check reports inventory/composition sensitivity. Common electron/ion corotation is explicitly a bounded benchmark, not a realistic vacuum-arc density reconstruction. A current-carrying Gaussian closure is described in the literature review as a separate future model.

New §D outputs compare exact cold source-edge radial motion, finite wall/exit time, growth rate and signed slow/fast rotation branches with the simulated sampled warm orbits. E×B is labeled a drift limit. Double-well controls expose κ, conserved Pθ/(qBa²), and a view-only inner-radius crop; potential accessibility does not predict collisional populations or purity. Reduced models no longer show frequencies taken from unrelated hidden orbit controls.

Four subagents reviewed primary literature, derived independent invariants, inspected the integration and created the illustrated atlas. Reports: `web-assets/IIC-LITERATURE-REVIEW.md`, `IID-LITERATURE-REVIEW.md`, `CD-INDEPENDENT-REVIEW.md`, and `REFERENCE-ATLAS.md`. `npm test`: 80/80 pass; final checks and snapshot are recorded in IMPLEMENTATION-STATUS.md. The browser origin remained admin-denied after the user changed settings; deployed controls/GPU appearance are unverified. No workaround was attempted. Historical versions below are superseded by this scope.

## Version 4: Section II workbench and team audit

Every A–K subsection has a numerical model or diagnostic; 18 directory entries include the named variants with advantages, disadvantages and fidelity notes. Fifteen numerical entries use fourteen solver families (end-plug shares mirror endpoint equations). Rotating magnetic-field, collisionality-gradient advection and capillary ion-wind proposals remain overview-only. POMS is an explicit magnetic-core surrogate, not a reconstruction.

Sliders update interactive plots after 250ms debounce; obsolete workers terminate and settle their promises. Comparisons launch independent models. Hover plots for values; exports include configuration and output curves. Equilibrium, collection, transport and illustrative diagnostics are not combined into an engineering-efficiency score.

Team audit: `web-assets/AUDIT-REPORT.md`; full current coverage: `web-assets/TUTORIAL-REVIEW.md`; validation: `web-assets/VALIDATION.md`. The team reviewed the paper inventory, geometric models, transport/atomic models, core physics and UI/GPU source. The audit fixed a skipped collision-resolution guard on absorbing steps and erroneous interpolated impact energy. Renderer state/failure handling and stale/cancelled requests are covered by source-unit tests.

Latest integrated checks: `npm test` 61 passed; `npm run typecheck`, `npm run build`, `npm run check:site`, `npm run check:assets` passed. Vite reports the large ~954kB (~262kB gzip) renderer bundle. Managed browser policy again rejected public-origin access; deployed controls and GPU appearance are explicitly unverified, and no alternate browser/network workaround was attempted. This is numerical/source validation, not experimental validation.

Reviewable implementation slices: (1) independent mechanisms and benchmarks (`geometries.ts`, `transport.ts`, `methods.ts`), (2) live plots/control integration (`laboratory.js`, main/UI), (3) audit corrections and asynchronous/renderer invariants (`physics.ts`, `worker-client.ts`, `view-state.ts`, regression tests). No PR has been opened; preserve these boundaries if preparing PRs under the 700-line limit.

The prior runbook and version-3 history below remain for context. Current sources, audits and final snapshot hashes take precedence.

## Version 3: multiple systems and added realism

Selectable rotating full-orbit filter, circular RF/ICR heating, and quasineutral plasma centrifuge equilibrium. The Compare control runs all three in independent workers; their observables are deliberately model-specific. Orbit settings include fixed or drifting thermal sources, mass/charge, ensemble size, timestep and optional cold-neutral elastic scattering with recoil. Centrifuge settings include rotation and ion/electron temperatures.

Read `web-assets/VALIDATION.md` for equations and benchmarks and `web-assets/TUTORIAL-REVIEW.md` for coverage. Tests now number 33; results are in `assets/physics-test-results.txt`, representative timestep/collision runs in `assets/validation-runs.json`. Version 3 deployment: e5eeab78-1677-4ef4-b49a-42e1564e10e3.

## Run and publish

Node 22.12+ is required. On a normal checkout:

```
npm ci
npm test
npm run typecheck
npm run build
npm run check:assets
npm run check:site
npx wrangler@4.158.0 deploy
```

The host's npm optional-dependency cleanup produced EPERM errors. Vite/Three were successfully installed in `.tools/frontend`; build/config resolution supports that demonstrated local prefix as well as ordinary root dependencies. The lockfile includes pinned dependencies for a fresh checkout. `npm install --package-lock-only --ignore-scripts` passed with no audit vulnerabilities.

Historical v3 execution used the then-authorized host exception after safe-dev
service access failed. The v11/v12 scientific work and checks use safe-dev VMs;
follow the current isolation rules and the exact package reproduction commands.

## Assets

`blender/build_separator.py` generates the editable `assets/separator.blend`, `assets/separator.glb` and `assets/separator-cutaway.png` (1600×1000, 128-sample CPU Cycles). `npm run render:host` uses project-local Blender 3.6.23 ARM/OpenGL startup, because 4.5.15 crashes during Metal detection in this environment. Official download checksums were verified.

Copy regenerated GLB and PNG to `web-assets/` before building. Materials need reflected environment lighting; the live viewer generates a studio PMREM environment. Geometry includes exposed copper windings, graphite formers, machined flanges/seals, feedthroughs, diagnostic fittings and support rails. It is conceptual apparatus, not CAD for fabrication or a reconstruction of a specific experiment.

## Model and evidence

Orbit modes integrate full Lorentz trajectories with prescribed fields and ideal whole-cylinder/source/end absorbers. Rotating mode uses phi=V(1-r²/a²); ICR uses uniform circular RF with zero radial DC voltage. Centrifuge mode independently solves isothermal rotating Boltzmann profiles and quasineutral charge closure, not transient orbits. The conceptual hardware is an orbit-filter vessel, not evidence of three engineered machines.

UI defaults to a drifting thermal pulse; the kernel retains fixed-energy defaults for backward compatibility. Source positions and velocities now have separate random streams to prevent spurious correlation. Negative axial samples return at the source plane. This is not the flux distribution from a steady reservoir. Equal injected numbers and equal centrifuge axis densities are distinct normalizations.

Collision settings use assumed constant cross sections, cold stationary targets and isotropic binary elastic scattering. At most one event is sampled per step with an optical-depth resolution guard; this is operator-split and needs timestep/ensemble convergence. It is not empirical gas calibration. No charge exchange, ionization, Coulomb collisions, self-consistent fields, sheaths, turbulence or engineering throughput is calculated. The centrifuge assumes collisional equilibrium but does not predict relaxation time.

All-ion impact times/energies/positions, counts, sampled orbits, RF work, neutral energy transfer and work/loss-corrected energy residuals are exported. UI half-timestep comparison checks collection and RF work; identical counts alone are insufficient to validate trajectories.

## Verification, 2026-11-06

- `npm test`: 33 passed, including independent stable/unstable/marginal analytical orbits, charge sign, canonical angular momentum and second-order convergence, finite-time collection near cutoff, zero-voltage control, source/collection/deposition accounting.
- `npm run typecheck`: passed.
- `npm run build`: passed; reports a large Three.js bundle warning (~926 kB, ~252 kB gzip).
- `npm run check:assets`: passed; GLB v2, 176 meshes, PNG dimensions, .blend present. PNG visually inspected.
- `npm run check:site`: passed; bundled JavaScript parses, referenced resources and worker present. This is a structural check, not browser execution.
- `npm run render:host`: passed (asset review).
- `npx --yes wrangler@4.158.0 deploy --config wrangler.jsonc`: succeeded. Public workers.dev route published.

Managed browser policy rejected both localhost preview and the public workers.dev origin. No alternate browser/CDP/curl workaround was attempted for the blocked public UI verification. Live controls and GPU appearance remain unverified from this agent session. Cloudflare initially noted DNS propagation may take a few minutes. Source hashes are recorded in `assets/verified-source.sha256`.

`public/` holds the earlier prototype and is no longer the deployment root. Root `index.html`, `src/main.js`, `src/style.css`, `src/worker.ts`, `src/physics.ts` and `web-assets/` are the current application sources.
