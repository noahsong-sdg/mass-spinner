# Version 10 collision-locality evidence

The optional axisymmetric/source-fitted collision model addresses independently diagnosed sharp-source dilution and finite-distance torque. It preserves the original Cartesian branch and explicit raw-error/coverage gates. See [current collision study](COLLISION-CONVERGENCE-V10.md), [independent physics review](COLLISION-METHODS-V10.md), [prospective plans](CONVERGENCE-PLAN-V10.md), [closed equilibrium falsification](RING-EQUILIBRIUM-V10.md) and [fresh-seed confirmation](CONVERGENCE-CONFIRMATION-V10.md).

Repository checks: 250 tests passed; source TypeScript check passed. Full release checks/publication are recorded in the project-root IMPLEMENTATION-STATUS.md. These are software checks, not an experimental or continuum-validation result. New run exports use modelVersion 10; old study artifacts retain their own source hashes and model versions. Actual browser/GPU verification remains unavailable under the effective origin denial.

Historical evidence follows.

---

# Mass Spinner version 9 — new tools, measured failures and bounded physics

**Spatial separator transport is still exploratory.** The actual 48-run 200 µs convergence case FAILS its declared budgets. The 36-run adaptive comparison is not uniformly better; fixed cells remain the default. The independently derived finite-time Landau solver is explicitly a reference candidate, not an accepted reference. A bounded coupled magnetic equilibrium is implemented, while full discharge/source/electron/instability closure remains absent. The synthetic held-out validation example returns BLOCKED; no measured validation was manufactured.

Section III A–K coverage: four partially represented, two diagnostic-only and five not coupled; no complete apparatus-level subsection. New independent failure-budget estimates use explicit assumed rates/fluxes and do not change separator collection. The Marathon-inspired teaching lab models the disclosed beam–solid-target architecture using supplied target/stopping assumptions; it is not a calibrated device or net-power prediction.

Read [current stage status](/STAGES-5-8-STATUS.md), [coverage audit](/SECTION3-COVERAGE.md), [actual convergence case](/convergence/convergence-default-200us-v1.md), [locality comparison](/STAGE6-LOCALITY.md), [finite-time candidate](/LANDAU-REFERENCE.md), [magnetic closure](/STAGE7-FIELD-CLOSURE.md), [held-out contract](/STAGE8-VALIDATION.md) and [beam-target scope](/MARATHON-SIMULATOR-SCOPE.md). Full source/snapshot/check/publication evidence is recorded in the project-root IMPLEMENTATION-STATUS.md. Actual browser/GPU controls remain unverified after the effective origin-policy denial. CLI publication and source-unit tests remain distinct from browser execution and physical validation.

Historical records follow; their model scope and short-horizon figures are superseded where noted.

---

# Mass Spinner version 8 — second audit

**The collisional double-well model remains exploratory; spatial/particle convergence is not established.** A fresh three-reviewer pass finds 1.7246% raw Pθ residual of the positive initial scale at the actual 200 µs default, with all 155 sampled local-regime snapshots unresolved. The earlier 0.27–0.35% range describes finer 20 µs runs, not this default or an error bar on separation. Fixed-cell smoothing of the sharp source survives increasing marker count.

Audit corrections: narrow leave/re-enter wall contacts, exact axial timestep-end arrivals, tiny constant plot limits and synchronous worker cleanup. Exports include dimensional residual denominators and modelVersion 8; independent-orbit studies retain their unchanged version-6 format. A closed gyro-orbit exactly coincident with the wall remains an explicitly unsupported corner. Floating-point grazing detection is not a substitute for timestep convergence.

**169 automated tests pass**, and typecheck passes. Source-unit checks do not establish deployed native-worker/download/GPU behavior. The final source snapshot, build/asset checks and CLI publication evidence are recorded separately in the project's IMPLEMENTATION-STATUS.md. Live browser/GPU verification remains uncompleted after the effective origin-policy denial; no workaround was attempted.

Read the [audit synthesis](/AUDIT2-SYNTHESIS.md), [collision audit](/AUDIT2-COLLISIONS.md), [transport audit](/AUDIT2-TRANSPORT.md), [product audit](/AUDIT2-PRODUCT.md) and [ranked next stages with acceptance gates](/NEXT-STAGES.md). The next implementation should establish reproducible intended-horizon convergence, then improve collision locality and independently benchmark finite-time relaxation, before adding physical closures or claiming experimental prediction.

Historical records below are superseded where noted by this audit.

---

# Mass Spinner version 7 validation update

**Exploratory collisional double-well dynamics are implemented. Spatial/particle convergence is NOT ESTABLISHED.** Finest tested pulse grids retain roughly 0.27–0.35% raw Pθ error and nonmonotonic refinement. No calibrated sorting, collector purity or experimental validity claim follows from the passing kernel/ledger checks.

Final integrated checks: **158 tests passed**; typecheck, production build, site structure and asset checks passed. Independent analytical rate benchmarks support Coulomb time normalization; exact pair conservation, quartic orbit/Hamiltonian/boundary checks, closed/open flux accounting and short-time common-Ω equilibrium tests pass. Diagnostic corrections expose individual pair torque, concentration-dependent applicability and sparse screening failures. Details: [implementation](/STAGE4-IMPLEMENTATION.md), [independent physics audit](/STAGE4-PHYSICS-AUDIT.md), [quantitative numerical validation](/STAGE4-NUMERICAL-VALIDATION.md), [Coulomb operator](/COULOMB-OPERATOR.md), [quartic orbit validation](/DOUBLEWELL-ORBITS.md).

Browser/GPU runtime remains unverified because effective policy denies the public origin. CLI publication and structural checks do not prove deployed interaction. Historical validation follows, superseded by this update and the version-7 source snapshot.

---

# Mass Spinner version 6 validation update

Final integrated gate: 123 tests passed; typecheck, production build, site structure and asset checks passed. These establish mathematical/source/numerical evidence within the stated reduced models, not experimental or deployed-browser validation. Current evidence: [independent review](/MASS-SPINNER-REVIEW.md), [Gaussian equations and checks](/GAUSSIAN-IMPLEMENTATION.md), [bulk boundary](/BULK-COMPOSITION.md), [double-well dynamics specification](/DOUBLEWELL-DYNAMICS-SPEC.md). Collisional double-well dynamics are not implemented.

The review fixed false certainty at observed zero/one purity; unresolved bootstrap intervals are now withheld with a reason. Recovery Wilson intervals are pointwise, not simultaneous scan bands. Sampling, timestep/radial-grid error and omitted physics remain distinct.

Historical validation follows; current model-version 6 source and implementation status take precedence.

---

# Version 5 — II C / II D verification

80 tests pass in the integrated source snapshot. This verifies reduced equations, discretization and source-unit control paths, not experiments or the deployed browser. New checks cover exact cylindrical inventory integrals and convergence; cold rotation branches; marginal, zero-field, reversed-field and tangent-wall limits; agreement with independent Boris trajectories; full finite-Pθ radial Hamiltonians; central-vs-bulk composition; diagram manifest integrity; and the six-model workbench boundary.

**II C:** integrate 2πr nᵢ(r)dr using exact cylindrical integration of the piecewise-linear radial profiles. A radial cut partitions static chamber inventory; it is not an extraction process or a throughput prediction. The default uses 1000 intervals; the UI offers 400–2000 and a doubled-grid comparison. Extreme steep profiles require inspecting this convergence output. The common-corotation density grows toward the wall; published vacuum-arc Gaussian envelopes require a separate current-carrying closure. See IIC-LITERATURE-REVIEW.md.

**II D:** the exact cold-mode discriminant and source-edge solution independently cross-check stability, wall-intersection time and finite axial transit. Reference curves start with zero transverse laboratory velocity and fixed axial beam energy; they exclude thermal spread and collisions. Signed slow/fast ion branches are distinct from the E×B drift limit. Warm/collisional collection remains the full prescribed-field Monte Carlo model. See IID-LITERATURE-REVIEW.md.

**Double well:** U=(Pθ−qBr²/2)²/(2mr²)+qV[(r/a)⁴−κ(r/a)²]. The plot can explore κ and Pθ. Opposite ±P have equal extrema radii and a constant energy offset; tests check this independently. Nonzero P diverges on axis, so the plotted interval excludes r/a<0.01; the view-only crop can reveal the wells. The original Pθ=0 minimum is never shown as a general finite-P result. No density, equilibrium population, transport time or collection purity is predicted.

**UI interpretation fix:** reduced-mode frequencies previously came from hidden orbit settings. The readout is now hidden for these modes; their metrics use their own field parameters. The regression test exercises the mode-presentation function.

**Verification boundary:** build/typecheck/site/assets checks are separate from runtime browser/GPU QA. The supported browser retry after a user permission change still returned admin-enforced origin denial. No browser/CDP/network workaround was attempted. Thus live deployed controls, visual layout and GPU appearance remain unverified.

Historical validation records follow; older all-A–K UI scope is superseded by this A–D workbench and E–K reference atlas.

---

# Version 4 validation update

61 tests passed at the integration gate. Added independent gyro/drift/double-well/mirror/azimuthal-field benchmarks, transport/ionization/time-of-flight checks, actual dynamic-control→solver sensitivity tests, worker dispatch/cancellation tests, renderer-readiness state tests and three reproduced audit regressions. No experimental or live-browser validation is implied. Full team findings are in AUDIT-REPORT.md.

Impact velocity is now reintegrated over the fractional Boris interval, with RF evaluated at the fractional midpoint. maxRelativeImpactEnergyError is separate from the full-step work/loss residual; boundary position/time remain chord approximations. The collision-resolution guard now also checks steps that hit an absorber.

The Section II expansion contains intentionally different fidelities: exact analytical limits, full prescribed-field particle orbits, equilibrium closures, transport closures and illustrative potentials/fields. POMS is explicitly a surrogate. Three named variants are overview-only. Live plots update after debounced slider changes and obsolete workers are cancelled; this UI behavior has source-unit coverage but has not been observed in the blocked deployed browser.

---

# Numerical validation and applicability — version 3

These checks validate specified reduced equations, not a real operating separator. Source: Zweben, Gueroult & Fisch (2018), *Plasma mass separation*, https://doi.org/10.1063/1.5042845. Tutorial §§II A, II C, II D and §III motivate the three separate modes and the added source/collision physics.

## Equations and independent benchmarks

**Rotating filter:** uniform axial B and phi=V(1-r²/a²), full Lorentz-force trajectories. Exact field-free/constant-E motion, positive/negative-charge helices, stable/unstable/marginal rotating solutions, canonical angular momentum and cold cutoff are checked. Halving the timestep reduces analytic trajectory errors approximately fourfold. Finite-time cold radial envelopes independently predict collection near 0.999/1/1.001 times critical voltage. Infinite-device radial stability is not finite-device efficiency.

**ICR:** uniform prescribed circular transverse E(t), no DC radial potential. For an initially stationary ion with cyclotron angular frequency Omega and co-rotating drive omega, transverse speed is |2(q/m)E sin[(Omega-omega)t/2]/(Omega-omega)|; at resonance it is |(q/m)Et|. Independent tests cover exact resonant, detuned and opposite-polarization energy and second-order timestep convergence. Full runs test selective heating, zero-drive limit, repeatability and RF-work-corrected energy balance. This models single-particle RF heating; it does not solve antenna fields, dielectric response or wave coupling. Collection occurs only on the same ideal chamber boundaries, not an RF extraction stage.

**Centrifuge:** imposed common rigid rotation; isothermal ions and Boltzmann electrons, electron inertia neglected. For psi=phi−Omega B r²/2,

    n_s=f_s exp[m_s Omega² r²/(2 e Ti) − Z_s psi/Ti]
    n_e=(sum Z_s f_s) exp[psi/Te]
    sum Z_s n_s = n_e

Ti/Te are in eV. Charge closure is solved by monotonic bracketed bisection in log space. Equal-charge enrichment exactly follows ln[(n_B/n_A)/(f_B/f_A)]=(m_B−m_A)Omega²r²/(2eTi). Tests also cover unequal-charge quasineutrality, electron response, single-species Ti+ZTe pressure balance, zero/reversed rotation, equal-mass invariance, absent species, steep profiles and radial refinement. Axis fractions are not whole-volume feed fractions. No equilibration time, collection recovery or throughput is inferred. This equilibrium model assumes the collisional relaxation needed to establish it, rather than predicting that relaxation from the optional orbit collision operator.

**Source:** drifting anisotropic Maxwellian pulse or fixed-energy legacy control; disk samples uniform in area. Tests measure Gaussian means/variances/cross moments and position–velocity independence. Reusing position/velocity random streams was corrected and is regression-tested. Equal m/q and equal velocity distributions give the same trajectories. Each species gets equal injected count, not adjustable mass throughput. Negative axial velocities injected at the plane immediately return to the source; this is a pulse distribution, not a steady reservoir flux distribution.

**Neutral collisions:** isotropic binary elastic scattering against a cold stationary neutral bath with an explicitly assumed constant cross section. Collision probability is 1−exp(−n sigma v dt). Both-body momentum and energy, recoil, isotropic moments, zero-cross-section limit and survival probability are checked. Integrated runs test repeatability, inventory and energy transfer into neutrals. Events occur after full orbit steps (operator splitting); at most one event is sampled per step. Per-step optical depth is restricted to 0.02, and timestep/ensemble convergence is still required. There is no empirical gas cross-section dataset, gas heating feedback, charge exchange, ionization or Coulomb scattering. This is a controlled scattering model, not a calibrated gas/plasma prediction.

## Diagnostics and reproducibility

Every run exports settings, seed, counts, all-ion impact time/energy/position, deposition bins, sampled paths, accumulated RF work and energy transfer to neutrals. Inventory includes source returns and still-uncollected ions. Energy diagnostics subtract RF work and collision losses; raw energy is not conserved in a driven or lossy model. Impact velocity uses fractional-step reintegration; boundary/impact accuracy still requires timestep convergence.

The half-timestep control reports changes in collector counts and RF work per injected ion. With collisions, common random streams do not make stochastic paths timestep-equivalent; ensemble-size and statistical convergence are separate requirements. Identical collector counts alone do not verify trajectory accuracy. A very fine run may exceed the explicit browser compute budget.

Parallel comparison launches independent workers using snapshots of the current settings. It shows model-specific observables, not a common efficiency score. Worker contracts and rejection of obsolete requests are tested.

## Verification limits

The suite is run with `npm test`, type safety with `npm run typecheck`, production bundling with `npm run build`, and publication structure with `npm run check:site`. Blender artifacts are checked with `npm run check:assets`. Managed browser policy in this session prevents live UI/GPU verification; no alternate browser workaround is used. No experimental validation has been performed.
