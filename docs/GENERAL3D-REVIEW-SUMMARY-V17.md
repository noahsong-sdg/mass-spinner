# Independent review of general 3V collisions, v17

7 November 2026 UTC. Numerical, source and presentation review complete.
**The general 3V research backend runs, but physical
production qualification is withheld.** It supports arbitrary three-component
marker velocities, unequal masses, relative drift and full pressure tensors.
Homogeneous collision-only studies do not validate fields, spatial transport or
separator performance. Named drift/anisotropy cases retain the 2/10 eV thermal
baseline; they are ablations, not equal-temperature isolation controls.

## Verified outcome and requirements gaps

| Area | Evidence and disposition |
| --- | --- |
| Finite algorithm | Exact moving-node plus mixture-center entropy derivative; unequal-mass mobility and weighted discrete gradient checked independently. This establishes finite algebra, not continuum accuracy. |
| Completed evolution | 17/17 planned cases, 600 accepted steps, 617 states. Number/energy/momentum pass all cases; positivity follows from fixed positive Gaussian weights/variances. 51 selected first/middle/final complete-equation replays pass, not all 600 independently replayed. |
| Physical rates | All nonzero 2% vector/tensor physical comparisons fail: 52 nominal-Gaussian and 58 actual-GMM decisions; zero references receive absolute residuals. All 17 independent initial-rate dictionaries exactly match the later case audits. |
| Physical H | 217 state-integration PASS, 400 UNKNOWN; two case engineering-budget PASS, 15 UNKNOWN. The two passes allow a small positive H estimate and do not establish physical-H monotonicity. |
| Full 3D PDF convergence | 32 species/time decisions: 30 FAIL, two UNKNOWN. Particle, width and cubature pairs all fail; timestep gives two heavy-ion FAIL and two light-ion UNKNOWN. |
| Symmetry | Ten boost records PASS by exact coupling uppers; all eight fixed-laboratory rotation records FAIL by characteristic lower witnesses, including q9. Algebraic covariance when also rotating quadrature is a separate property. |
| Common-state control | Broad alpha .5 controls each pass 202 stationarity cells through 500 µs; coarse alpha .1 gives 189 FAIL, 11 UNKNOWN, two initial PASS. The latter already poorly represents a Maxwellian. |
| Compatibility/security | Versioned, sealed offline packages preserve prior closed results and browser/runtime inputs. Scientific execution used copied safe-dev guests; no credential/home/control-socket mounts observed. This is not a claim about all desktop processes. |

The light timestep point estimates exceed the 2e-4 PDF budget, but their
2.44e-6/2.51e-6 numerical sensitivities exceed the original 1e-6 integration
prerequisite. Keeping UNKNOWN is correct. Adaptive-H and randomized-QMC
uncertainties are numerical estimates, not rigorous interval certificates.

The broad base control's posthoc q13 endpoint check retains
**+4.441512935e-9 H/N**, compared with a 6.28063e-13 numerical sensitivity envelope.
It is below the unchanged 1e-8 increase budget while finite H_Q falls. Thus
“budget PASS” must never be presented as an H theorem. The sign supplement is
separate from the frozen main study and confirms a positive numerical estimate,
not an interval proof.

## Root causes and bounded fixes

The old exact radial reduction excludes drift/anisotropy. Particle-centered
Gaussian expectation quadrature extends the existing variational method to
full 3V without a global velocity box; it was chosen as a contained extension.
Its O(N²p) direct cost still limits adequate representation resolution.

Both sample nodes and Gaussian centers move. Differentiating only one gives
the wrong finite entropy; paired scatter includes both. In plain terms, moving
particles change both where density is measured and the density being measured.
Conservation alone would not reveal that missing derivative.

Tiny entropy increments were lost through endpoint subtraction. Common endpoint
scaling and log1p preserve them against a 256-bit reference without adding
floors. Julia captured-variable boxing separately caused excessive allocation;
explicit loops remove it while retained pilot arrays/increments remain
bit-identical. These arithmetic/performance fixes preserve the model, unlike
clipping or changing collision coefficients.

Failed implicit candidates were formerly discarded before writing evidence.
The narrow writer fix retains attempted states and diagnostics while accepted
histories remain accepted-only prefixes. The auditor's initial-only prefix bug
now selects only real accepted indices and returns UNKNOWN for absent evolution.
Both have actual regressions.

Execution ingestion assumed runtime JSON was the first log line; warnings
violated that assumption. Selecting exactly one required-schema runtime object
handles the actual valid log while preserving seal/source/input/runtime checks
and rejecting ambiguity. Eight regressions include stale records, duplicate/
nonfinite JSON and changed membership; actual closed PDF ingestion passes.
These orchestration changes do not modify frozen numerical physics.

High-order initial quadrature agrees with an independent regularized force,
yet the physical drift deficit remains about 41%. The ideal-Gaussian reference
separately isolates alpha .1 smoothing bias: 14.055% drift and 37.177%/28.107%
tensor errors. Signed vector/matrix residuals retain finite-representation
differences; scalar error norms cannot assign causal fractions of the GH deficit.
Static Sobol improves drift but still fails physical tensor/rate gates. Joint
particle/width refinement is required; q-only changes or a fitted rate cannot
qualify the model. [Detailed implementation](GENERAL3D-IMPLEMENTATION-V17.md),
[independent physics audit](GENERAL3D-AUDIT-V17.md).

## Existing tools and next practical increment

WarpX demonstrates practical large-N full3V collision-only reference runs:
21 cases, 88 reconstructed raw species snapshots and conservation/off controls.
All 20 nonzero 2% rate families remain UNRESOLVED with three whole-run seeds.
It is a useful independent moment reference, not a qualified production
replacement; stochastic-law entropy does not prove pathwise KDE-H or full-PDF
gates. MIT SBM's shipped Coulomb example has close-pair/sampler issues and
equal-mass assumptions; it is not an unmodified oracle.

The first acceleration candidate is consistent forward/adjoint Gaussian entropy
density/gradient sums, keeping direct pair mobility exact. Pinned candidates
are Flatiron FGT (GPL-3.0), then FMM3D (Apache-2.0) for later kernel work. Tail/log
accuracy, finite-H derivative consistency, null spaces, PSD and cost crossover
must be qualified. No installation or speedup is claimed. The proposed
Cartesian mutual-information bound is valid but fails the needed diagnostic
budget in the actual cost probe; no shortcut was adopted.
[Primary sources, exact licenses and pins](GENERAL3D-TOOLS-V17.md).

## Checks and evidence actually reviewed

Producer final checks: 96 Julia assertions and six Python tests PASS.
Independent audit: `python run_checks.py` 29/29; orchestration unittest 8/8;
all final Python compilation PASS. Application gate: 262 tests, typecheck,
build and site check PASS on its pinned 243-file source map. This does not
verify a new deployed backend, live controls or GPU appearance.

This reviewer ran only its own bounded source-text downloaders and stdlib
evidence/comparison checkers in safe-dev; no author solver was executed here.
All seven offline checks PASS: `verify_evidence.py`, `review_warpx.py`,
`review_final_producer.py`, `review_main.py`, `review_pdf.py`,
`review_rates.py`, `review_audit.py`. Outputs and scope are retained in
`scientific/general3d-tools-v17/*-checks.json`. They check provenance and
reported arithmetic, not a repeat of physical integrals or nonlinear solves.

Exact actual-member hashes/membership checked independently here:

| Closed evidence | Members excluding seal | Seal SHA256 |
| --- | ---: | --- |
| Mathematical base | 175 | `31de487b64cea15424ce8111d340190bbbbfed95ae026ca76c7084b48b265563` |
| Producer final | 250 | `56214d77c3234194259e3f4ff8ce01642db9c4bfaa014e07547b0da71769b947` |
| PDF/symmetry | 298 | `e1943bc87a2e7217d9c55740c8d89c726d7994be21559f80366a74641d687c35` |
| Final independent audit | 1322 | `51b7fef7862527194b4508bda97aec804e9ab0cb8c8ca0701a0eb4540d2890fa` |

The parent separately checked complete WarpX, mathematical-extension, ingestion
and sign-supplement memberships/export identities; this reviewer checked their
relevant actual sources/results and selected WarpX metadata. The sign seal is
`da889fac2d188d16cc58d2f66c66824e708a61446ce365836e9e85a679043600`.
The final own audit-check copy contained 2088 files/486.8 MiB; actual output export
is `/tmp/general3d-tools-v17-final-audit-review-export`.

The separate presentation packet corrects exactly two label strings: “H-rise
budget” and “Boltzmann H change / N”. This reviewer inspected the actual rendered
three-panel PNG and source patch; the two unrelated PNGs are byte-identical to
the sealed main. The corrected plot clearly shows rising physical H alongside
falling H_Q in the broad control. Presentation seal:
`1f37aa91f6a5cbd780c4f0e6fa62d72e821cd1c608d04ae9c9d93b3ce3b87dd4`.
The closed main numerical audit is unchanged. [Corrected H plot](../scientific/general3d-presentation-v17/figures/entropy-physical-vs-discrete.png).
