# Version 20 — compact controls, components and source review

7 November 2026. Scoped mobile layout correction preserves the four basic
controls and all advanced settings. Real mesh raycasting, accessible part
selectors and beamline SVG hotspots show function/material/provenance. Optional
sample geometry distinguishes idealized plane current from neutron birth rate.
Replay failures can retry; six species/component styles and legend marks are
distinct. Physics kernels, recorded data and scientific qualification gates are
unchanged. Marathon target-regeneration provenance is explicitly bounded.

Final exact 271-file safe-dev snapshot:
`18472be63d64d628e8c8d1518e21bca70d96d19ae6eba61f65de4ddd569bb5e6`.
289 tests PASS; typecheck, build and static-site checks exit 0. A namespace-escape
regression found during build was corrected and the entire final gate rerun.
Cloudflare version `c1e8a2a7-71ce-40c6-82be-75890a203388` is confirmed latest at
100%; three changed assets, 96 reused. All 99 deployment-export files match the
tested build. [Evidence](scientific/verification-v20/README.md).

Fresh browser binding still fails the managed origin-authority gate before page
observation. The local allow rule and user-reported site allowance are enabled.
No alternate browser, CDP, indirect origin fetch or local-clone rendering was
used. All-level native controls, visuals and GPU verification remain open.
[Integrated review](docs/PLAYGROUND-REVIEW-V20.md) and
[supported browser diagnosis](docs/BROWSER-VERIFICATION-V20.md).

# Version 19 — playgrounds and adversarial review

7 November 2026. Ordered lesson panels removed. Beamline controls, responsive
footprint, exact-zero switches, operating-point markers and actual saved-state
replay now provide the main interactions. Model explanations are expandable.
Five adversarial reviewers covered all four levels. Source/regression fixes
preserve kernels and all scientific failures rather than altering their gates.

Final actual safe-dev snapshot: 259 source/input files, map SHA256
`c4908f4a55f4b816f33cb0d1d25493a77f6d807d6459283269dc1cc08f79bd18`.
274 tests pass; typecheck, build and static-site checks exit 0. All 99 release
files match the retained map and actual export. Browser/GPU rendering remains
policy-blocked; no alternate-origin workaround was used.
Cloudflare confirms latest version `fe9ac4ef-6e6c-4483-9a46-3c52e4049b1a`
at 100%; five changed assets uploaded, 94 reused. Actual deployment export
matches all 99 tested release files. Provider publication is separate from
browser verification. [Complete audit and scope](docs/PLAYGROUND-AUDIT-V19.md).

# Version 18 — learning levels and Marathon concepts

7 November 2026. Level 1 is a basic rotating-filter introduction with four
controls and versioned, reproducible links. Level 2 teaches the current published
Marathon beam-target architecture, fusion versus stopping, heat versus output,
and neutron-product versus electrical accounting. Four independent research
reviews triaged alternative curricula and checked the implementation's limits.
Level 3 preserves the advanced separator workbenches; Level 4 shows real offline
figures and retained failures. Numerical kernels and scientific results unchanged.

Exact final gate: 268 tests pass; typecheck, build and static-site checks exit 0.
All execution used safe-dev. The 255-file tested snapshot and 98-file built
release are retained with verified hashes. Live-browser access remains denied
by origin policy, so no rendered appearance or live GPU verification is claimed.
[Implementation and evidence](docs/LEARNING-LEVELS-V18.md).

# Version 17 — general three-velocity-dimensional collisions

7 November 2026 UTC. All 17 frozen Julia trajectories complete, including drift,
rotated anisotropy, combined relaxation, boosts, fixed-laboratory rotations and
500 µs common-temperature controls. There are 600 accepted steps and 617 saved
states. The maximum accepted nonlinear residual is 9.57e-13; this is a root-solve
check, not physical accuracy. The final producer package is sealed and independently
byte-verified. Its checks pass: 96 Julia assertions and six Python tests.

Independent mathematical references distinguish finite entropy cubature, the
regularized particle ODE, actual represented-mixture physical rates and nominal
Gaussian physical rates. Large physical-rate and initial-shape failures remain.
An alpha .1 ideal-Gaussian regularization check still misses physical drift/tensor
rates by 14–37%. A fixed Sobol spacing control improves drift but worsens one
tensor comparison; it is retained as a mixed result, not a replacement cure.

All 21 separate WarpX runs complete; all 20 nonzero physical-rate families remain
UNRESOLVED under their frozen 2% gate and seed uncertainty. Raw-array reconstruction,
collision-off and conservation checks pass. Full-3D PDF refinements produce
30 FAIL and two UNKNOWN records; boost symmetry has 10 PASS records, rotation
eight FAIL records. Independent audits cover all 617 states and 51 selected
complete-equation replays: conservation, positivity and replay checks pass.
Physical-H budgets give two PASS and 15 UNKNOWN; the two passes include a small
positive estimated H change, independently confirmed at higher quadrature.
They do not establish an H theorem. Continuum physical qualification is withheld.

[Full scope, fixes, references and study evidence](docs/GENERAL3D-CONVERGENCE-V17.md).
All scientific execution uses safe-dev VMs. The fresh application gate passes
262 tests, typecheck, build and static-site checks on a pinned 243-file snapshot;
[exact logs](scientific/verification-v17/README.md). Production physics and deployment
are unchanged. No spatial, field, separator-performance or experimental validation
is claimed.

# Version 16 — practical radial time evolution and independent audits

7 November 2026 UTC. All 13 main histories and the separately frozen finest-width
timestep control completed: 494 saved states, including two complete 500 µs
equilibrium controls. The offline Julia backend analytically reduces exact
rotational symmetry while retaining arbitrary radial PDFs and the full 3D
entropy measure. It reuses only the unchanged pinned MIT Newton–Krylov solver;
the shell representation and unequal-mass collision adapter are new work.

Independent all-state physical H, number, energy, positivity and integration
checks pass. Fine width and fine timestep PDF-increment differences pass the
unchanged 2e-4 gate; coarse particle and width failures remain recorded. The
finest initial rate is 27952.3493365 eV/s, 0.1065% below the unchanged target.
Measured refinement differences do not establish exact unregularized PDE error.

The finest 100 µs case takes 392.19 seconds; its 2.5 µs-step control takes
602.15 seconds. Each samples peak RSS below 0.6 GiB. The weighted Gonzalez
correction removes explicit inverse-tail-weight amplification; it does not prove
uniform nonlinear conditioning. A separately frozen entropy-increment repair
passes 14 stability, 41 core and 14 persisted-record assertions. All 480 original
increments and all 21 non-timing states of an actual fine replay are bit identical.
Original and patched sources remain separately identified and sealed.

[Complete results, root causes, plots, limits and independent reviews](docs/EVOLUTION-CONVERGENCE-V16.md).
All scientific execution and required application checks ran in Apple safe-dev
VMs. `npm test`: 262 passed; `npm run typecheck`, `npm run build`,
`npm run check:site`: exit 0. The exact 243-file tested application input map still
matches current bytes. [Snapshot and logs](scientific/verification-v16/README.md).
Production deployment is unchanged. Isotropy excludes drift, anisotropy, rotating
fields and separator losses; this reference does not qualify those device models.

# Version 15 — heating-rate refinement and physics audits

7 November 2026 UTC. All 96 frozen initial-state records and all 15 actual
implicit timestep runs completed. The new positive species-scaled uniform
quadrature family refines particle spacing jointly with Gaussian variance.
An initial tensor/Laplace reference avoids materializing huge3V arrays; independent
physical-GMM calculations and actual-step replay import no producer physics code.

The original physical target27982.16330006834eV/s and2% gate remain fixed.
Fine n512/alpha.0125 and.00625 initial rates27499.185103 and27742.275594eV/s
pass at1.726% and.857% low. n256→512 changes are below.01eV/s.
Independent calculations agree and explain the remaining discrepancy by finite
width; no prefactor, density, temperature or target was fitted. Coarse rate passes
with distorted PDFs remain explicitly insufficient for an accurate initial state.

All15 actual coarse full3V physical-rate gates still FAIL. Time and entropy-grid
refinement approach the same approximately39.6% deficit, with converged roots.
An independent implementation replays selected actual Gonzalez equations and all
raw endpoint slopes. The high-resolution initial benchmark is not an evolved run
of134,217,728 particles per species. Finite-time physical entropy/distribution and
the incomplete500µs horizon remain separate open gates. Production is unchanged.

Parent host checks verify every member of the331-file final producer archive
and77-file timestep archive, including canonical copies, with zero hash errors.
Original failures, stale/corrupt-input regressions and source identities remain
preserved. Independent reference/review artifact seals and exact checks are
recorded in the integrated report.

[Full results, fixes, limits and independent reviews](docs/HEATING-RATE-CONVERGENCE-V15.md).
Root application gate: `npm test`262 passed,0 failed/skipped; `npm run typecheck`,
`npm run build`, `npm run check:site` exit0. All243 copied source/input files
match current corresponding runtime bytes. [Snapshot and logs](scientific/verification-v15/README.md).
Existing renderer chunk warning remains; no deployment or browser/GPU claim.

# Version 14 — structure-preserving two-ion collision adapter

7 November 2026 UTC. A new offline Julia full-3V Gaussian-mixture backend adapts
the pinned CollisionOperators.jl pair/discrete-gradient construction to unequal
40u/84u ions and reuses its MIT Newton–Krylov solver unchanged. Independent source,
mathematical, actual-step and distribution audits retain the v13 physical gates.

The frozen campaign executes eight of thirteen cases: seven complete and the
baseline stops at its unchanged 600-second cap with 90 saved states through
445 µs. Five cases remain unrun UNKNOWN under the original resource ledger.
All 146 final producer-transfer hashes pass. The independent all-90-state audit
resolves decreasing physical H, near-machine-precision N/E/P conservation,
analytic positivity and L1 drift upper bounds below budget for that saved prefix.
The intended 500 µs qualification remains UNKNOWN.
The final independent audit also covers all 53 saved short-control states and
passes their physical-H budgets with order-192 peak checks. All 12 short-time
PDF-increment comparisons pass. Its 38 tests pass, and all 216 accepted artifact
hashes match both exported and canonical bytes. Numerical diagnostics take
870.267 seconds of the reserved 1,200 seconds.

All four nonzero heating-rate controls FAIL the unchanged 2% physical benchmark,
with 12.51–40.73% errors. Finite smoothing bias and finite-particle initial-shape
error are demonstrated separately; no coefficient fitting, clipping or threshold
relaxation is used. Production physics and deployment are unchanged.

Full causes, fixes, exact evidence, outstanding gates and independent reviews:
[STRUCTURE-CONVERGENCE-V14.md](docs/STRUCTURE-CONVERGENCE-V14.md).
New adapter checks: 46 Julia assertions, eight watchdog/plan tests and actual CLI
regressions pass. Independent suites have separate source-bound evidence.
Fresh root gate: `npm test` **262 passed, 0 failed/skipped**, 21.953 seconds;
`npm run typecheck`, `npm run build`, `npm run check:site` exit 0. Exact copied
snapshot and exported logs: [scientific/verification-v14](scientific/verification-v14/README.md).
Existing renderer-chunk warning remains; no live browser/GPU QA is claimed.

# Version 13 — distribution equilibrium, positivity and entropy studies

7 November 2026 UTC. Twelve Julia controls and a 100 µs baseline expose negative
interpolation between positive initial nodes; actual-element reconstruction and
exact serialized-polynomial sign witnesses retain that evidence. Mesh/order
refinement improves shape drift. Tolerance, correction and moment-matched controls
do not remove it. All 100 longer-history nonlinear advances return success;
physical entropy remains undefined for the signed field.

PETSc's unchanged-operator 500 µs replay meets its L1 stationarity budget but the
fine short spatial-increment comparison fails its distinct refinement budget.
All 42 mesh-16 fields through 100 µs are certified nonnegative, yet defined H
increases above budget. Independent small-step/strict-solver controls reproduce
the increase; all 16 follow-up endpoint fields are certified nonnegative.
The existing four-seed particle CDF diagnostics pass; some component/fourth-moment
gates remain UNKNOWN. Full distribution qualification is not established.

Exact scopes, causes, failed gates, independent audits, artifact identities and
method choices: [EQUILIBRIUM-CONVERGENCE-V13.md](docs/EQUILIBRIUM-CONVERGENCE-V13.md).
Three standalone evidence figures and pinned reproduction sources are in
`scientific/plots-v13`. No production physics or deployment changes.

Root software gate: **262 tests passed, 0 failed/skipped**, 28.271 seconds;
configured typecheck, build and static-site checks exit 0. Current runtime sources,
scripts, tests, web assets and five root build/config files match the previously
synced tested snapshot. Full exported logs and checked hashes:
[scientific/verification-v13](scientific/verification-v13/README.md).
The existing renderer-chunk warning remains; no live browser/GPU QA is claimed.

# Version 12 — two-ion adaptation and independent collision audits

7 November 2026 UTC. All eight exact-SI PETSc cases and 41 WarpX/production
comparisons complete, with independent raw-history/statistical audits. Fine
PETSc moment comparisons pass; common-temperature sampled entropy and R8
negative-mass budgets fail. Cross-code particle equivalence remains UNKNOWN.
Julia's coupled nonlinear branch and SI initial-rate bridge execute with all
nonlinear success returns asserted; initial-rate gates pass, while negativity
and equilibrium-shape drift remain observed. No production kernel retuning.

The separate PETSc full-field replay passes host integrity and independent Q2
reconstruction after an initial export-integrity failure; damaged first-attempt
files are rejected. All 101 moment checkpoints match the main run bitwise.
Independent denser sampling confirms a tiny negative tail missed by original
quadrature, preserving the distinction between diagnostic budgets and global
positivity. Exact scope, root causes, correction choices, artifacts and remaining
gates: [TWOION-CONVERGENCE-V12.md](docs/TWOION-CONVERGENCE-V12.md). Selection
history and alternatives: [TECH-STACK-DECISION.md](docs/TECH-STACK-DECISION.md).

Root gate in an explicitly synced safe-dev snapshot: `npm test` 262 pass (21.973 s),
`npm run typecheck`, `npm run build`, `npm run check:site` exit 0. Separate actual
production angular-moment regression and strict NodeNext check pass. PETSc 16
regressions pass; particle/control/independent/Julia checks are recorded in the
linked report. Production source/scripts/tests match the tested snapshot;
existing renderer chunk warning remains. No deployment or live browser/GPU QA
in this increment. Scientific execution used safe-dev VMs; reviewed host copying
and scoped VM lifecycle recovery are recorded separately.

# Version 11 — executed scientific references; no new deployment

7 November 2026 UTC. Julia/SciML, PlasmaPy, WarpX and PETSc are installed and executed in dedicated safe-dev VMs. Production orbit/formulary comparisons PASS their stated budgets; the matched homogeneous collision comparison remains UNKNOWN. PETSc's upstream electron/ion example is qualified as a smoke study, not a matched two-ion reference. Production browser source/dependencies are unchanged.

Exact environments, inputs, outputs, numerical results, negative evidence, audit fix, next-stage split and final checks: [EXTERNAL-REFERENCE-RESULTS-V11.md](docs/EXTERNAL-REFERENCE-RESULTS-V11.md). Root gate: 262 tests pass; configured typecheck, separate strict comparison-script check, build and static site check all exit 0. Runtime source/scripts/tests match the exported tested snapshot byte-for-byte. No public deployment or live browser/GPU verification in this increment.

# Version 10 — diagnosed collision-locality correction and independent studies

Published 7 November 2026 UTC. **Measured improvement; overall continuum convergence remains unestablished.** Full root cause, technical/plain explanations, fix choice, studies and boundaries: docs/COLLISION-CONVERGENCE-V10.md. Independent derivation/reviews: COLLISION-ROOTCAUSE-V10.md, COLLISION-METHODS-V10.md, CONVERGENCE-RESULTS-V10.md, CONVERGENCE-CONFIRMATION-V10.md and RING-EQUILIBRIUM-V10.md.

The demonstrated causes were fixed-cell sharp-source dilution and finite-distance collision angular impulses, not a reproduced Coulomb coefficient error. The optional axisymmetric annular r–z representation uses exact volumes and own-cylindrical velocities for both collisions and local thermal diagnostics. Optional fixed faces at declared initial source interfaces remove initial support averaging without changing physical density or using sampled-support renormalization. Physical finite-radial-gap angular error remains measured. Independent review corrected near-endpoint mesh coalescing that could move a physical boundary. No angular projection, thermostat, rate floor or silent physical retuning was introduced. The legacy Cartesian default remains; its 48 fresh runs exactly reproduce 447,330 pre-existing v9 leaves.

## Actual physics results

All **252 executions completed**: three 48-run replays, 24 higher-resolution, 18 fine-timestep, 48 fresh-seed confirmation and 18 independent closed-equilibrium runs. These are not 252 independent statistical samples; repeated configurations/seeds are not pooled. Intervals retain their declared six or sixteen whole-run seeds and original budgets. Incomplete metadata-pilot work is excluded.

- Six-seed c6/N1024 raw Pθ maximum: Cartesian **0.96317%**, uniform rings **0.13585%**, source-fitted rings **0.12005%** of the positive scale. Source-fitted c12/N4096 is **0.05723%**, below the unchanged 0.1% diagnostic budget.
- Fresh sixteen-seed c12/N4096 maximum: **0.04674%**, also passing that diagnostic; c8/N2048 **0.11494%** FAILS. Fresh A axial-fraction spatial equivalence passes; B remains UNKNOWN. Both species angular-transfer equivalence checks pass. Maximum sampled unresolved exposure remains approximately **24.7%**, above the 1% budget. Sparse temperature/profile coverage and the continuum-bias bound remain unresolved.
- Fine c12/N4096 100/50/25 ns raw maxima: **0.05723/0.04094/0.03983%**. Both species axial-fraction checks pass in both timestep comparisons. Some other observables and full coverage remain UNKNOWN; this is not a full timestep/spatial validation pass.
- Independent closed 200 µs common-Ω study: exact inventories, H residual ≤1.95e−8, finest raw maximum **0.03001%**. Rotation/profile/temperature intervals and approximately **6.30%** time-averaged unresolved representative exposure keep its overall gate UNKNOWN.
- Independent Python audit verifies all **234 open executions**, source/config membership, 2108 level-summary intervals, **1426 paired observable intervals** and 310 physical-effect intervals. Both external CPU aggregation procedures were cross-reviewed and record original plans, part/code hashes and correct concurrent wall-time semantics.

Legacy torque keys store accumulated **angular impulse** in kg·m²/s; they are not instantaneous N·m torque. Actual positive SI normalization scales, raw histories, impacts, meshes, distances and independent audits are downloadable. Seven raw JSON files are losslessly gzip-compressed; all decompress byte-for-byte. The 31-file reproduction archive contains executed physics graphs, plans, aggregation/audit code and selected tests, not full UI/Blender assets. Source fitting and ring cells remain experimental choices; experimental device validity is unchanged and unestablished.

## Final software/publication gate

- `npm test > assets/physics-test-results-v10.txt 2>&1`: **250 passed, 0 failed, 0 skipped**, 23.528 s, exit 0.
- `npm run typecheck`: exit 0 for the repository's src target. The independent equilibrium utility's separate strict script check did **not** pass (missing Node declarations and utility typing outside that configured target); its successful runtime campaign and failed auxiliary check are both reported in RING-EQUILIBRIUM-V10.md.
- `npm run build`: exit 0; index-CKWBCKez.js **1033.45 kB / 287.74 kB gzip**, worker-CM5G_q9z.js **70.60 kB**. Existing large-chunk warning remains.
- `npm run check:site`: exit 0; built module parsing and HTML/static/worker/atlas resources. This is not browser execution.
- `npm run check:assets`: exit 0; GLB v2 / 176 meshes, PNG 1600×1000 and editable Blender scene intact.
- **103** core source/test/config/script hashes unchanged from before the full suite/typecheck through final publication. Full final source/docs/public snapshot: assets/verified-source-v10.sha256 (also verified-source.sha256), **235 hashes**. All campaign executed graphs match. New report links, archive hashes/contents, all raw gzip payloads and all **117** release files' per-asset size limits are checked.

`npx --yes wrangler@4.158.0 deploy --config wrangler.jsonc`: exit 0, uploaded **39** new/modified static assets. Published version **87fe665c-a408-4a3c-a1ac-661ebb8c4713**, metadata assets/deployment-v10.json. CLI publication is confirmed separately from runtime. Browser-origin access remains policy-denied: live controls, native downloads/workers, responsiveness and GPU appearance are unverified. No alternate browser/CDP/origin-fetch workaround was attempted.

Execution used the existing explicitly authorized project-scoped host exception after inaccessible safe-dev service; no isolation settings, hooks or credential files were changed. No Git metadata or PR is present. Keep reviewable increments separate: annular operator/geometry and regressions; engine/controls/diagnostic integration; runner/provenance and scientific campaigns; then public evidence packaging. Do not combine them into an oversized PR.

Historical records follow; prior proposal/completion language is superseded by the current scoped results and open gates above.

---

# Version 9 — failure coverage, stages 5–8 and beam-target laboratory

Published 6 November 2026 (7 November UTC). **Software increments delivered; scientific acceptance remains open.** See docs/STAGES-5-8-STATUS.md for equations, evidence, fix causes, design choices and remaining gates. All eleven Section III A–K topics are exposed: four partial, two diagnostic-only, five not coupled. Independent budget sliders do not change separator outcomes.

Stage 5 executed 48 intended-horizon runs and **FAILS** its declared convergence gate. The controlled ballistic case remains UNKNOWN despite near-machine-precision flux accounting. Stage 6 adds experimental adaptive cells and an independently reviewed isotropic Landau candidate; adaptive cells are not uniformly better, fixed cells remain default, and reference acceptance remains false. Stage 7 adds a bounded coupled B/J/φ Gaussian equilibrium with explicit magnetic boundary and rejected incompatible pressure; prescribed density/rotation, discharge and stability remain unsolved. Stage 8 provides a measured/held-out comparison contract, but experimental acceptance is BLOCKED by missing matched data and unresolved convergence. No measured results were invented.

The separate Marathon-inspired laboratory follows the company's public beam-target architecture, not a thermal-plasma reactor. It uses Bosch–Hale D–T cross sections with an assumed target column and slowing law. Default 1000 W beam gives 0.805 W nuclear Q power under those assumptions, not a prediction of Marathon hardware. Layer heat and conditional substrate absorption are distinguished.

Independent stage-5/6, field/beam physics, Landau and product reviews are recorded in docs/STAGE56-INDEPENDENT-REVIEW.md, STAGE9-PRODUCT-REVIEW.md and LANDAU-INDEPENDENT-REVIEW.md, with scoped module reports. Regression fixes cover stale/confounded convergence evidence, unsupported sensitivity checks, degenerate intervals, adaptive diagnostics, magnetic bulk bracketing and nonrepresentable beam outputs. The released page includes the reports and original raw convergence histories as a verified lossless gzip download; the uncompressed file exceeds Cloudflare's per-asset limit.

## Final gate

- `npm test > assets/physics-test-results-v9.txt 2>&1`: **226 passed, 0 failed, 0 skipped**, 13.316 s, exit 0.
- `npm run typecheck`: exit 0.
- `npm run build`: exit 0; index-qka2A-8a.js 1033.05 kB / 287.64 kB gzip; worker-DypbLI1R.js 64.70 kB. Existing large-chunk warning remains.
- `npm run check:site`: exit 0; built module parsing, HTML/static resources, worker and atlas checks. Not browser execution.
- `npm run check:assets`: exit 0; GLB v2 / 176 meshes, PNG 1600×1000, editable Blender scene present.
- **153** source/test/configuration/public-asset hashes unchanged across final checks and publication: assets/verified-source-v9.sha256 and assets/verified-source.sha256. All 23 source hashes across the actual convergence/locality/Landau campaigns match. The raw download decompresses byte-for-byte; all 82 release files fit the individual asset cap. Current coverage/status report links are staged and checked.

`npx --yes wrangler@4.158.0 deploy --config wrangler.jsonc`: exit 0; uploaded **26** new/modified assets. Published version **867ba1c0-8765-47fc-a17a-810c4a28d3c0**, metadata assets/deployment-v9.json. This is CLI publication evidence. Public controls, native workers/downloads, responsive appearance and GPU output remain unverified after the effective browser-origin policy denial. No alternate browser/CDP/origin-fetch workaround was attempted.

Execution used the existing scoped user-authorized host exception after safe-dev service access failed. No hooks, isolation settings or credential files were changed. No Git metadata/PR is present. Keep review increments separate and below the requested PR limit: convergence/statistics; locality diagnostics; independent collision reference; bounded magnetic closure; comparison contract; Section III/beam-target workbenches and integration. This combined local release is not a single proposed PR.

Historical implementation records follow; earlier stage proposals and short-horizon figures are superseded by the current status above.

---

# Version 8 — second audit and contact/plot/worker corrections

Three independent reviewers audited collision/local-regime physics, orbit/event transport and product execution; the event correction received an independent cross-review. Findings and fix rationale: docs/AUDIT2-SYNTHESIS.md; detailed AUDIT2-COLLISIONS.md, AUDIT2-TRANSPORT.md and AUDIT2-PRODUCT.md. Ranked continuation: docs/NEXT-STAGES.md.

**Spatial/particle convergence remains NOT ESTABLISHED.** The unchanged default's 200 µs run has 1.7246% maximum sampled raw Pθ residual relative to its positive initial normalization scale, all 155 local-regime snapshots unresolved and 10.75% unpaired marker exposure. Earlier 0.27–0.35% figures describe finer 20 µs cases, not this default, signed-net-Pθ loss or separation accuracy. Sharp-pulse cell-density smoothing survives infinite marker count at fixed grid. Corrected torque bookkeeping does not restore trajectories. No experimental validation.

Corrected demonstrated defects: narrow leave/re-enter wall excursions missed by fixed samples; exact axial timestep-end arrivals bypassing absorption; tiny constant scientific plots with arbitrary ±1 limits; synchronous worker-submission cleanup. Additive exports now include physical residual normalization scales. Main run modelVersion is 8; unchanged independent-orbit studies remain version 6. Exact closed wall-coincident gyro grazing remains explicitly unsupported; no artificial nudge was introduced. Floating-point root checks do not prove exact physical tangent timing.

## Final gate, 2026-11-06

- `npm test > assets/physics-test-results-v8.txt 2>&1`: **169 passed, 0 failed, 0 skipped**, 20.862 s.
- `npm run typecheck`: exit 0.
- `npm run build`: exit 0; index-X5PBAS-Q.js 1000.30 kB / 276.63 kB gzip; worker-Dg92SJdP.js 58.12 kB. Existing large-chunk warning remains.
- `npm run check:site`: exit 0; module parsing, HTML resources, worker and static resources checked. This is not browser execution.
- `npm run check:assets`: exit 0; GLB v2 / 176 meshes, PNG 1600×1000 and editable Blender scene present.

Code/tests/configuration hashes were compared before and after the full test/typecheck and again before deployment: unchanged. Exact current snapshot: assets/verified-source-v8.sha256, also assets/verified-source.sha256, **108 hashes**. Prior v7/v6/v5 manifests remain. Execution used the user's scoped host exception after safe-dev access failed; no hooks, isolation, browser policy or credential files were changed.

`npx --yes wrangler@4.158.0 deploy --config wrangler.jsonc` exited 0, uploaded nine new/modified static assets and deployed the existing route. Published version **6ea47d40-ec8e-41b5-afea-95ab6a6569b2**; metadata assets/deployment-v8.json. CLI publication is observed evidence, separate from runtime verification. No deployed-origin fetch or browser/CDP workaround was attempted. Public controls, native worker/download behavior, actual asset loading, responsiveness and GPU appearance remain unverified after the effective origin-policy denial.

No Git metadata or PR is present. Keep future review increments separate: numerical-contact correction; product resource/display fixes; convergence-runner/statistics/reference cases. Stage 5 is the recommended next implementation; stages 6–8 remain proposals.

Historical records follow; short-horizon v7 figures must not be generalized to the current default.

---

# Version 7 — exploratory collisional double-well dynamics

The seventh workbench mode evolves full quartic-potential orbits with local mixed-ion Coulomb scattering and physical equal marker weights. It offers open finite-pulse absorption or closed reflecting/periodic boundaries, a common-Ω equilibrium initializer and density/temperature/source/resolution controls. The original landscape and previous modes remain available. Main run exports carry modelVersion 7; the unchanged independent-orbit-study format remains version 6.

**Validation boundary: spatial/particle convergence is NOT ESTABLISHED.** Finest tested pulse grids have roughly 0.27–0.35% raw Pθ residual and nonmonotonic refinement. Numerical torque correction closes bookkeeping but does not repair trajectories. The UI prominently labels the model exploratory, exposes pair torque and sampled local-regime diagnostics, and does not attach independent-particle confidence intervals or calibrated purity to coupled counts. No experimental validation.

## Final gate, 2026-11-06

- `npm test > assets/physics-test-results-v7.txt 2>&1`: 158 passed, 0 failed, 0 skipped (~19.3 seconds).
- `npm run typecheck`: exit 0.
- `npm run build`: exit 0; index-Bmqe96Xo.js 1000.26 kB / 276.59 kB gzip, worker-DqwP5ZLx.js 55.92 kB. The existing large-chunk warning remains.
- `npm run check:site`: exit 0; source/build resources and module parsing, not browser execution.
- `npm run check:assets`: exit 0; existing GLB v2 / 176 meshes, PNG 1600×1000 and editable Blender scene intact.

Exact tested source/configuration/asset snapshot: assets/verified-source-v7.sha256 (also current verified-source.sha256). Execution used the user's existing scoped host exception after safe-dev access failed; no policy/hook/credential changes. Published Cloudflare version: `ae5e3e64-0907-4910-90c6-9b5134764f9e`. Wrangler uploaded 11 new/modified assets and deployed the existing route successfully.

## Independent checks and remaining gates

Collision tests prove pair energy/momentum, mixed-population normalization, isotropic angular law, Maxwellian stationarity and relaxation diagnostics. Analytic Rutherford pitch-angle moments agree within 0.002 at the finest tested step. An independent Maxwellian Landau temperature-exchange coefficient benchmark reduces discrepancy 2.55%→1.58%→0.93% under timestep refinement. Collisionless H/Pθ and boundary benchmarks have independent analytic/quadrature expectations. Closed/open coupled ledgers, exact cut-cell volumes and short-time common-Ω stationarity pass their tests.

The physics audit found two diagnostic defects: cell-net absolute torque could hide opposite pair errors, and a mean initial density could hide high-density or sparse local regimes. Per-pair impulse accounting plus quadratic variation now reveals locality error; peak-density bounds and sampled local screening/thermal checks expose invalid or unresolved states. No artificial angular projection, rate floor or temperature reset was added. Detailed problem/technical cause/plain explanation/fix/alternative rationale: docs/STAGE4-IMPLEMENTATION.md.

Reports: docs/COULOMB-OPERATOR.md, DOUBLEWELL-ORBITS.md, STAGE4-PHYSICS-AUDIT.md and STAGE4-NUMERICAL-VALIDATION.md. The independent reviewers approve only an explicitly exploratory implementation; continuum spatial/particle convergence, arbitrary-pulse long-time equilibration and experimental machine prediction remain open gates.

Effective browser policy continues to deny live deployed-origin access despite the saved allowance and restart. No alternate browser/CDP/deployed-origin fetch was used. Public controls, actual asset loading, responsive layout and GPU appearance remain unverified. CLI publication is separate evidence.

Reviewable increments: collision/orbit operators and analytical tests; then coupled engine/regime/UI integration. No PR or Git metadata is present. Preserve separate PRs under the 700-line non-test rule.

---

# Version 6 — Mass Spinner

Current public title: **Mass Spinner**. The existing worker name/route is retained to preserve shared links. Published Cloudflare version: `98e30e09-209e-4190-95aa-a8442b0e6ba3`. Wrangler reported 21 new/modified assets uploaded and triggers deployed successfully. CLI asset publication is separate from browser runtime verification.

Implemented orders 1–3 from docs/NEXT-PHYSICS-PRIORITIES.md: independent seed batches, voltage/B/mass scans and sampling intervals; fixed whole-cylinder composition; and a prescribed-Gaussian equilibrium with derived electron flow, current, estimated magnetic perturbation and neglected electron-inertia diagnostics. The common-corotation benchmark and legacy omitted-field requests retain their original physical profiles. Cold scan references include marginal stability and wall/flight timing without equating stability with finite-device collection.

Order 4: docs/DOUBLEWELL-DYNAMICS-SPEC.md specifies a conservative multispecies collisional model and five gated implementation slices. Transient double-well redistribution, relaxation times and collector purity are not implemented. No experimental calibration or maximal-fidelity claim.

## Final gate, 2026-11-06

- `npm test > assets/physics-test-results-v6.txt 2>&1`: 123 passed, 0 failed, 0 skipped.
- `npm run typecheck`: exit 0.
- `npm run build`: exit 0; current entry index-B003iW9P.js 992.03 kB / 274.27 kB gzip, with the existing large-chunk warning. Worker worker-BezXl5hv.js 32.51 kB.
- `npm run check:site`: exit 0; module parsing, HTML/control references, physics worker and published resources checked. This is not browser execution.
- `npm run check:assets`: exit 0; GLB v2, 176 meshes, PNG 1600×1000, editable Blender scene present.
- `.tools/atlas-venv/bin/python scripts/build-reference-atlas.py`: exit 0; 11 rebranded original diagrams and manifest validated. Contact sheet visually inspected.

Exact tested code/input snapshot: assets/verified-source-v6.sha256 (also current assets/verified-source.sha256). Tests and code were run under the user's scoped host exception after the safe-dev service failure. No sandbox/hook/policy weakening or credential inspection was performed.

The independent integration audit reproduced and fixed a zero-width purity interval at unobserved contamination. Paired bootstrap resampling cannot learn a missing species tail: point purity is retained, bounds are withheld with a reason, and both zero/one boundaries are regression-tested. This avoids an unjustified pseudocount or an independence assumption that would break paired-species sampling. See docs/MASS-SPINNER-REVIEW.md for the root cause, plain explanation and rationale. Parent source-unit tests also execute the real equilibrium-control mapping and study UI lifecycle, including cancelled/superseded export suppression and missing-band segmentation.

The effective browser policy continues to deny the public origin after the saved local allowance and app restart. Live deployed controls, responsive appearance, asset loading and GPU backend/shaders remain **unverified**. No alternate browser/CDP/deployed-origin fetch was attempted. The unknown policy conflict is documented in docs/BROWSER-VERIFICATION-BLOCKER.md.

Reviewable increments: stage 1 statistics/study pipeline; stage 2 inverse composition boundary; stage 3 independent Gaussian closure; narrow UI integration/branding. No Git metadata or PR is present; preserve those boundaries when preparing PRs under the 700-line non-test limit.

---

# Version 5 — focused II A–D laboratory

Published Cloudflare version: `53a5d0e7-0171-4cac-8224-8024b98fdd0b`. Final gate: `npm test` 80 passed; `npm run typecheck`, `npm run build`, `npm run check:site`, and `npm run check:assets` all exit 0. Vite reports a 977.33 kB renderer/application bundle (268.61 kB gzip) warning. Successful asset publication is not a deployed runtime check.

Interactive selector and parallel comparison: six A–D models. Default view: §C bounded common-corotation equilibrium. Reference atlas: 11 original diagrams covering E–K and named variants. Previous E–K solver modules/tests remain, but those modules are not exposed by the workbench.

§C adds axis fraction, radial cut, radial resolution (400/1000/2000), nine output curves, bulk/annular inventories and radial refinement. §D adds independent cold analytic branches, source-edge radial envelope, wall/exit competition and sampled warm radial excursions. Double-well adds independent quadratic shape and conserved canonical momentum, plus explicit view cropping. A frequency readout incorrectly taken from hidden orbit settings in reduced modes is now suppressed and regression-tested.

80 tests passed: assets/physics-test-results-v5.txt. Current exact source snapshot: assets/verified-source.sha256. Four literature/diagram/review subagents completed their assigned reports. No experimental validation. The current browser connection still reports an admin-enforced denial after the user's site-permission change; native Codex settings inspection is separately unavailable to Computer Use. No alternative browser, CDP or deployed-origin fetch was attempted.

Reviewable slices: (1) two independent diagnostics helpers with analytic tests, (2) narrow A–D control/plot integration and interpretation fixes, (3) reference atlas and literature reports. No PR has been opened. Historical version records follow.

---

# Version 4 — Section II workbench

Deployment: https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev

All Section II A–K headings represented by numerical models/diagnostics; 18 method-directory entries include named variants and tradeoffs. Three variants remain overview-only; POMS and double-well are illustrative; mirror is an endpoint-invariant diagnostic. No all-device/maximal-fidelity claim.

61 tests passed, typecheck/build/site/assets checks passed. Root source-unit tests include dynamic controls→solver sensitivity, all geometry/transport worker dispatches, cancellation, and failed-GPU visibility. Team independently audited equations/limits and fixed two reproduced core numerical errors. Reports: web-assets/AUDIT-REPORT.md, VALIDATION.md, TUTORIAL-REVIEW.md. Results: assets/physics-test-results-v4.txt. Source snapshot: assets/verified-source.sha256.

Managed browser policy blocks the public origin: live deployed controls, GPU shader/device negotiation and actual appearance remain unverified. No browser/CDP/network workaround was attempted. The successful CLI publication is separate evidence from browser runtime behavior.

Historical version-3 record follows.

---

# Version 3 implementation — 2026-11-06

Published to https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev
Cloudflare version e5eeab78-1677-4ef4-b49a-42e1564e10e3.

Traced path: system/settings → typed model config → worker kind dispatch → rotating or ICR full-orbit solver OR independent centrifuge equilibrium → mode-specific diagnostics. Parallel comparison takes immutable settings snapshots and creates independent workers. UI revisions suppress stale results. No fabricated common efficiency score.

Corrected integration fault: the prepared worker expected an explicit orbit/centrifuge kind, while the old client omitted it. All browser tasks now use the typed dispatch contract; a regression test checks both kinds and explicit rejection of obsolete payloads. Separate solvers preserve different governing assumptions rather than forcing equilibrium through a particle integrator.

Corrected source bias: position and Maxwellian velocity shared a random-stream origin. Radius then correlated with transverse kinetic energy. A salted velocity stream preserves same-source comparisons between masses while removing that artificial correlation. A statistical independence regression checks the physical invariant, alongside Gaussian moments.

Added controls expose thermal/fixed injection, species mass/charge, sample count, timestep, neutral density/cross section/mass, circular RF drive and polarization, and equilibrium rotation/temperatures. Added impact diagnostics, RF/loss-corrected energy accounting, parallel comparison and half-timestep checks. Collision model is isotropic elastic cold-bath scattering, not charge exchange or a measured cross-section model.

Final gate: npm test 33 passed; npm run typecheck, npm run build, npm run check:site and npm run check:assets passed. Build has a large-renderer-bundle warning. Independent analytical checks include stable/unstable/marginal rotating orbits, near-cutoff collection, resonant/detuned/opposite RF, charge/electron equilibrium, collision conservation and thermal source moments. Full representative paired-timestep runs are in assets/validation-runs.json.

No experimental validation. Managed browser policy blocks local and public-origin live UI/GPU QA. No workaround attempted. The CLI deployment and structural checks succeeded; live interaction remains unverified in this session. Full scope/assumptions are in web-assets/VALIDATION.md and web-assets/TUTORIAL-REVIEW.md.
