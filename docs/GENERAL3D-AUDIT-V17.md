# Independent general 3D collision audit, v17

The main audit is complete: all 17 cases, 617 saved full-velocity states and
51 selected complete-equation replays were checked against the frozen plan.
Number, energy, momentum, positive Gaussian PDFs and selected equation
replays pass. Maximum relative energy error is 9.526e-14, positive-scale
momentum error 4.593e-15, and replay residual 4.361e-13.

Physical accuracy is not qualified. There are 30 full 3D PDF refinement
failures and 2 unresolved cells; every nonzero initial physical mean/tensor
2% comparison fails. Physical-H budget outcomes are 2 PASS and 15 UNKNOWN.
The two broad-common passes allow an estimated positive H rise of
4.442e-9/N within the original 1e-8 budget: they do not establish monotonic
physical H or an H theorem. Their full-PDF stationarity passes through
500 us; the coarse common control fails. Boost controls pass and rotation
controls fail. Frozen numerical tests pass 29/29, separate orchestration
tests 8/8, and all final Python sources compile.

The prospective contract follows; its original pre-outcome bytes are also
retained under `provenance/GENERAL3D-AUDIT-V17-contract.md`. Final actual
records, figures, source and input hashes are in the closed review package.

Prospective contract, 7 November 2026 UTC, written before main study outcomes.
The reviewer owns `scientific/general3d-review-v17`, imports no producer physics
implementation, and runs every scientific calculation in its own Apple safe-dev
VM. Closed v14/v16 source, results, failures and seals remain untouched.

## Scope and original gates

The candidate evolves positive Gaussian-mixture centers in all three velocity
coordinates. Both species may have relative drift and non-isotropic pressure
tensors. No spherical symmetry, azimuthal symmetry, Cartesian independence or
Maxwellian closure is assumed during evolution. Homogeneity and absent fields,
sources and losses remain explicit restrictions. The physical parameters are
40u/84u ions, +e/+e charges, nominal density 5e17 m^-3 per species and lnLambda12,
with the prior fixed SI normalization. Gaussian variances must satisfy common
`m_s epsilon_s`; fixed smoothing energy is distinct from kinetic marker energy.

| Quantity | Unchanged budget |
| --- | --- |
| Relative species number, total energy, positive-scale momentum | 1e-8 |
| Adjacent and cumulative physical H increase / initial total number | 1e-8 |
| Physical H integration sensitivity / initial total number | 2e-10 |
| Common-temperature full-3D PDF L1 stationarity | 1e-3 |
| Cross-case evolution-increment full-3D L1 at 50/100 us | 2e-4 |
| Full-3D L1 integration sensitivity | 1e-6 |
| Original 2/10 eV zero-drift isotropic initial heating rate | 2% |

The last target remains 27982.16330006834 eV/s for the original input, not for
an anisotropic or drifting input. Drift and pressure-tensor initial rates need
their own independently derived input-specific references. Relative mean-flow
energy must convert to heat while total momentum and total energy are conserved.
Scalar species temperatures alone do not qualify that conversion or anisotropy.

Physical H means sum_s integral F_s log(F_s) d^3v. Positive fixed Gaussian
weights and variances establish continuous-PDF positivity; distant floating-point
underflow is a separate issue. Monotonic producer cubature H_d does not establish
physical-H decay. A particle-centered cubature derivative must differentiate both
the mixture centers and the moving quadrature locations at finite rule order.

## Diagnostic decisions and cost controls

Every saved state is checked for physical entropy, number, full momentum vector,
total energy, species means and full symmetric pressure tensors. Selected actual
steps are replayed with an independently implemented complete discrete gradient
and Coulomb pair mobility. Source and plan pins are verified before consuming
raw arrays. Every declared case must execute or remain explicitly FAIL/UNKNOWN.

Independent entropy integration uses positive Gaussian expectation rules with
higher orders than the producer, and compares orders before accepting the
2e-10 integration budget. Gaussian expectation integrates all space without an
unreported velocity-box cutoff. Selected states receive independent integration
controls; unresolved order sensitivity remains UNKNOWN. A vanishing numerical
collision operator cannot pass on stationarity alone: nonzero drift, anisotropy
and the original thermal-exchange benchmark are separate controls.

Full-3D PDF comparison first uses valid analytic Gaussian-mixture bounds where
available. For identical weights/variances, a coupling gives an L1 upper bound
from the actual center displacements. The v14 exact-rational implementation is
reused with its source identity retained. Such an upper bound can establish PASS;
exceeding it cannot establish FAIL. Cross-case increment triangle bounds are
similarly valid only with the declared normalization and mixture identities.

For cases not resolved by an upper bound, bounded characteristic-function
differences and one-dimensional marginals provide full-3D L1 lower witnesses.
They may establish a separated FAIL, never a full-3D PASS. Full-3D numerical
integration, when needed, uses positive mixture importance sampling with nested
randomized Sobol rules and independent scrambles, or adaptive conditional
Gaussian integration. Level differences and uncertainty are both reported;
neither is mislabeled an interval certificate. If the original 1e-6 diagnostic
budget cannot be resolved at the frozen cost cap, the integral is UNKNOWN,
while an independent resolved lower-bound failure remains a failure.

The actual case matrix, source versions, diagnostic levels and per-case caps
will be frozen separately after a bounded cost pilot and before main outcomes.
No aggregate wall budget may silently omit fine cases. Coarse physical or
diagnostic failures are retained with their tested source, rather than removed
from the final membership. 50/100 us controls do not qualify a 500 us horizon.

## Representation and source integrity

Every record exports all 3D centers, raw weights, masses, species, Gaussian
variances, actual times, nonlinear residuals and static quadrature arrays. Drift,
off-diagonal stresses, fixed-rule rotation bias, Galilean shifts, coincident
pairs and close-pair singular scaling require explicit checks. The Coulomb
projector is not implicitly softened. Momentum uses a positive nonzero scale,
not division by a possibly vanishing net vector.

Consumed data require exact file/case membership and an externally reported
actual-byte SHA256 seal. Tests include stale, duplicate, truncated, mutated and
missing-source-pin records. Guest source is a copy: host edits are explicitly
synced, valuable guest results exported and hashed before replacement. Host work
is limited to trusted edits, inspection, copying and hashing; no home directories,
credentials or control sockets are mounted. Application tests/builds and browser
deployment remain separate from numerical physics acceptance.

## Frozen main diagnostic plan and verified initial evidence

Before main outcomes, `diagnostic-plan.json` was pinned to exact producer plan
`4f534bc934204887c4023983e4cb0f22683b4b55c08deb5a471539bb9ba4664c`.
The diagnostic plan is `2513ca4c8bc9dd6f7767e155f71341af1611199074abcaf0fb8d948f57189501`.
It covers all seventeen cases, every accepted state, three complete implicit
replays per evolved case, and eight particle/width/cubature/timestep comparisons
at 50/100 us. H uses orders 5/9/13/17, bounded density omission 1e-13 and the
unchanged sensitivity gate. Unresolved controls remain UNKNOWN. Numerical H
decisions include a diagnostic uncertainty envelope around the 1e-8 rise budget.

The initial broad-width common controls were independently checked using their
actual serialized 512-marker arrays per species, for both boosts. The full3D
product-to-Gaussian L1 upper estimate is 4.7059598e-4 per species, below 1e-3;
repeated adaptive-integral sensitivity is 1.89e-12, the exact-rational weight
factorization defect is 2.32e-17, and analytic Gaussian tails contribute at most
2.15e-32. This uses a full-joint telescoping upper, rather than treating marginal
passes as joint passes. Adaptive quadrature error estimates are numerical, not
interval certificates. Result `common-initial-results.json` is pinned to
`521c4655a534c1c185535a0001ac6db3ba0e5f3e5bdb64ba87fc9e2883cf383b`.
These alpha .5 controls do not qualify alpha .1 drift/anisotropy rates.

Earlier actual initial arrays already show strongly unresolved narrow-width
GH representations and initial-rate failures. For example, the n8/alpha .1
hot rotated PDF has a full3D characteristic-function lower witness 0.50081
against the intended Gaussian. The original isotropic n8/alpha .1 q3 heating
rate is 25534.956 eV/s, 8.75% below 27982.163 eV/s. These are preserved pilot
outcomes, not main-campaign or continuum qualification. Actual initial review
`initial-reference.json` is pinned to
`b1e905f2bfc03997cb1f3929efcf58f0c89685acfce0ad18810e7df75a2d0a9f`.

## Diagnostic fixes and their evidence

The full3D entropy diagnostic repeated each additive one-dimensional control
at every tensor quadrature node, hiding the benefit of bounded neighbor density
evaluation. Technically, a function of one coordinate was redundantly summed
over the other two quadrature axes. Simply, the same small calculation was done
many times. Summing those two axes out with their actual raw weights is exact;
the complete joint density is still evaluated at all q-cubed nodes. This exact
algebraic change was preferable to approximating the evolved PDF. Dense and
bounded q9 entropy agree to 2.2e-15; the explicit weighted omission bound is
1e-13. For the same frozen N512 heavy-species fixture, bounded runtime fell
from 3.310 s to 1.183 s. Dense runtime fell from 5.226 s to 3.460 s. Both old
and new actual tested sources/results are retained under `provenance`.

An initial-only failed history also exposed a replay index beyond the available
array. The selection included literal step one even when no step was accepted.
In plain terms, it tried checking an evolution that never happened. Restricting
selected indices to actual accepted steps fixes the source of the error;
initial-only H/equation evolution gates remain UNKNOWN. The failing regression
and pre-fix source were exported before replacement. Twenty-three independent
tests subsequently passed in the reviewer's own offline VM, tested source
snapshot `d20b48a8d440525c3d1ef6d9849a32a42813aa7b59350850b40cbaaad1b1449d`.

The final reviewable split is four single-purpose units: numerical
diagnostics/schema/physics foundation; scientific campaign decisions/rates/
figures; provenance/execution/ingestion; and static pilot studies. Each is
below 700 non-test source lines. No Git PR is claimed by this workspace.
This was the pre-main implementation checkpoint. Completed main outcomes
and final verification are reported above and below.

The one prescribed antithetic Sobol seed1701 static spacing control offers a
mixed tradeoff, not a replacement qualification. Its actual pressure-tensor
biases are 0.437%/1.642%, and full3D nominal-Gaussian L1 lower witnesses are
0.01135/0.05739: both initial shapes still fail 1e-3. Against independently
calculated physical Landau rates for the exact actual mixture, q9 mean-drift
error is 13.652%, and tensor Frobenius errors are 37.784%/29.224%. Against the
intended nominal Gaussian they are 9.528%, 37.744%/32.930%. Drift improves
relative to the GH control, while the heavy-ion tensor worsens. All physical
2% rate gates fail. No Sobol time evolution or covariance fitting was added.
Own reconstructed rates agree with producer moment derivatives within 3.2e-10
V0/s for the mean and 1.2e-8 eV/s for the full tensor. The separate independent
physical reference is pinned to
`16173134934c43e50983ff25da8c2201cf6093181df868f18e507c740349482c`.

## Execution phases and provenance boundary

The original two-worker attempt completed the n4/q5 and n6/q5 combined cases.
Their observed audit costs were 66.39 s / 118500 KiB and 384.92 s / 131556 KiB.
Both have invariant and complete-equation replay passes, while physical H and
its integration sensitivity remain UNKNOWN at the frozen q17 ceiling. The
whole attempt, original source bytes and two interrupted active-case logs were
exported before guest replacement. Its 45-member seal is
`a62f9f6dcc92f91affcd0849ca3e7c0ee622ef5934564a878a0b23a6867483c0`.
An interrupted diagnostic process is not a physical failure.

A separate paired performance study found that reusing per-state marginal
integrals gave 1.408x speedup for n4 and 1.249x for n8; the complete joint
integral remained the main n8 cost. All tested values were bit-identical, but
this cache was not adopted in the main audit. Instead, the remaining fifteen
cases were partitioned prospectively across two independent four-vCPU safe-dev
VMs, each with four single-thread processes. The observed selected n8 H-plus-
replay peak was 270240 KiB; this is a measurement, not a bound on every case.
The actual runtime is Python 3.11.2, NumPy 2.2.6, SciPy 1.15.3 and Matplotlib
3.10.3, with OPENBLAS_NUM_THREADS=1 and OMP_NUM_THREADS=1. All original numerical
source bytes, inputs, gates and case options are unchanged. Own seven-case
phase plan is `44bfb4914e6126ca637294de2407a2c08286f45feb73d5aa6605301bf7efdbe5`;
the separate eight-case execution plan is
`c41c409e7c3e2fa3836fb121a44ca5e37eba643bf301425dcc6dc5ccdb150d45`.

Adding external shard ingestion creates a new persisted-data boundary. A
matching scientific-plan hash alone cannot establish that a report came from
the assigned input, source or case. Simply, a correctly named old result can
still describe the wrong experiment. The separate orchestration validator
therefore checks externally sealed exact membership and file hashes, all
original source pins, input identity, case IDs, actual runtime and executed
commands before importing anything. It also refuses to overwrite prior
evidence. This addresses the boundary directly without changing the frozen
numerical methods; stale identity and changed-membership regressions will be
run in the guest before final ingestion. The completed ingestion checks and
main outcomes are reported below.

The actual PDF export exposed one orchestration parser assumption: NumPy's
stderr warning about optional PyYAML appeared before the buffered stdout JSON
runtime record. In simple terms, a warning arrived first. Reading line one as
JSON therefore rejected valid evidence. The narrow fix locates exactly one
JSON object with the required runtime fields, then applies the same version,
ledger and raw-log hash checks. Missing or duplicate runtime objects are still
rejected. The original log and pre-fix validators are retained under
`provenance/ingestion-parser-before-fix`; neither the log nor scientific runs
were changed. This preserves the evidence and addresses output ordering
without adding a dependency or rerunning the physics.

## Closed full 3D PDF and symmetry results

The unchanged refinement and symmetry scripts completed in a separate offline
single-thread safe-dev VM. Their actual 298-member export was independently
verified against seal
`e1943bc87a2e7217d9c55740c8d89c726d7994be21559f80366a74641d687c35`.
The new ingestion validator then checked exact assignments, all source/input
hashes, actual runtime versions, commands and all output identities in another
isolated stdlib-only run. Eight provenance regressions passed, including the
actual warning-first runtime log. That 320-member validation package has seal
`86d6b10e74b8f5e05912210266b7620ebfc3c30f135a56398d819711fff347c0`.
These eight orchestration tests are separate from the frozen numerical suite.

All 28 particle, width and cubature species/time cells fail the unchanged
2e-4 full 3D evolution-increment L1 gate through separated analytic
characteristic-function lower witnesses. Those witnesses are lower bounds,
not reported integral values. The timestep pair has two further failures:
heavy-ion full 3D QMC estimates are 2.9832646e-4 at 50 us and 2.2392264e-4 at
100 us, with respective diagnostic sensitivities/empirical uncertainties
6.30e-7 and 4.49e-7. Both resolve the original 1e-6 diagnostic budget and
remain above 2e-4. The two light-ion timestep cells remain UNKNOWN because
their 2.44e-6 / 2.51e-6 diagnostic sensitivities exceed 1e-6, despite point
estimates above the physics threshold. Overall: 30 FAIL, 2 UNKNOWN, no PASS.
The QMC uncertainty is empirical, not an interval certificate.

All ten boost species/time cells pass through exact serialized-mixture
coupling upper bounds, including common controls through 500 us. All eight
rotation cells fail through full 3D characteristic lower witnesses, for both
q5 and q9 at 50/100 us. The rotation's exact-rational Gram-defect Frobenius
upper is 2.1014e-16; the Gaussian covariance-map and center-rounding
allowances are explicitly included in decisions. They are about 1e-15 in
L1 and cannot explain witnesses from 4.3771e-4 to 7.6939e-3. Higher q reduces
the measured rotation discrepancy but does not pass the original gate.
Galilean covariance therefore passes these controls while finite-rule
rotational covariance fails the declared finite-time tolerance. Neither
result establishes continuum convergence.

Figure convention: H is the Boltzmann functional, the species sum of
integral F log(F), in the declared normalized velocity/density units.
Decreasing H corresponds to increasing thermodynamic entropy. The entropy
figure's vertical axis therefore means change in this H functional divided
by initial total number; it is not a plot of thermodynamic entropy decrease.
Blue error bars show the actual numerical H sensitivity, and UNKNOWN labels
retain the original 2e-10 integration gate even when the curves look smooth.
The dashed curve uses the producer's finite-rule H_Q increments. Agreement
in shape or finite H_Q decrease does not qualify physical H convergence.

## All seventeen initial physical-rate gates

Initial rates were independently reconstructed directly from every sealed
raw step-zero 3D array using the unchanged force/complete-gradient modules,
without waiting for the finite-time entropy loop. The exact metadata,
history and first-line hashes match the independently closed physical
references. `results/direct-initial-rates.json` is pinned to
`5cf1de5bbdb09858006a6f469b3c7c8482595fec1b6b3d57858432463f871871`.
All seventeen completed case-audit rate dictionaries match this upfront
reconstruction exactly. The preserved upfront artifact is unchanged; the
separate `results/rate-dictionary-crosscheck.json` records all seventeen
later case-report hashes and exact matches.
These are initial derivatives, not analytic finite-time reference curves.

Every evaluated nonzero physical vector/tensor 2% gate fails, against both
the intended nominal Gaussian and the actual serialized smooth-mixture
Landau reference. Zero-by-symmetry means and nominal common-equilibrium
tensors use absolute errors only. Auxiliary regularized-Gaussian comparisons
are retained separately and cannot qualify physical agreement.

Selected errors against the actual smooth-mixture physical reference are
below. The mean column is for the light species; heavy-species relative
errors agree at the shown precision.

| Initial case | Mean-vector error | Light tensor Frobenius error | Heavy tensor Frobenius error |
|---|---:|---:|---:|
| Combined n4, alpha .1, q5 | 64.86% | 33.04% | 19.40% |
| Combined n6, alpha .1, q5 | 50.67% | 37.13% | 6.25% |
| Combined n8, alpha .1, q5 | 41.08% | 38.18% | 7.41% |
| Combined n8, alpha .15, q5 | 40.97% | 62.64% | 33.12% |
| Combined n8, alpha .05, q5 | 45.13% | 14.67% | 14.55% |
| Pure drift n6, alpha .1, q5 | 42.47% | 6.87% | 7.95% |
| Pure anisotropy n6, alpha .1, q5 | Absolute-only symmetry zero | 35.86% | 16.87% |
| Pure thermal n6, alpha .1, q5 | Absolute-only symmetry zero | 11.34% | 11.34% |

The original 2/10 eV scalar-heating target is also retained: observed
26421.6008 eV/s versus 27982.1633 eV/s, a 5.58% error. Broad common controls
have small absolute rates: the independent actual-mixture physical light-ion
scalar rate is approximately -0.229219 eV/s, while the q5 finite operator
gives -0.284719 eV/s. Its tensor Frobenius error is 0.0961294 eV/s against a
0.397019 eV/s reference magnitude, or 24.21%. This relative failure must not
be confused with a large absolute departure from the nominal zero-rate
Maxwellian. The narrow coarse common input is itself poorly represented;
its actual smooth-mixture physical rate is not zero. The independently
computed full-space entropy-force finite-marker ODE gives a third distinct
broad-common scalar rate, -0.004322842 eV/s. The q5 result being closer to
the physical actual-mixture rate can therefore reflect cancellation between
cubature and finite-marker approximation errors.

Changing a single width improves some components while worsening others.
Static q13/q17 force probes already show that resolving entropy cubature
does not remove the approximately 40% N512 combined drift-rate deficit.
Together with the actual-mixture comparisons, these observations support
the inference that initial Gaussian-shape error and the tested entropy
cubature error do not fully explain the remaining deficit. Finite
marker/width collision approximation remains unresolved; conservation,
finite H_Q decrease and a successful nonlinear solve do not correct these
physical-rate errors.

## Completed all-state entropy, stationarity and equation audit

All seventeen planned trajectories completed and all 617 saved states were
independently analyzed. There were no omitted or resource-failed final cases.
The old interrupted two-worker attempt remains separately preserved. Actual
metrics are in `results/metrics-summary.json`; exact later/upfront rate
identity is in `results/rate-dictionary-crosscheck.json`.

| Check | Observed result | Original budget |
|---|---:|---:|
| Species number, energy and momentum case gates | 17 PASS each | 1e-8 |
| Maximum relative marker-energy error | 9.525714e-14 | 1e-8 |
| Maximum positive-scale momentum error | 4.592883e-15 | 1e-8 |
| Maximum selected complete-equation residual | 4.361356e-13 | 2e-11 |
| Maximum selected chain-rule residual magnitude | 2.775558e-17 | Recorded diagnostic |
| Maximum selected entropy-balance residual magnitude | 1.226796e-14 | Recorded diagnostic |
| All-state physical-H integration decisions | 217 PASS, 400 UNKNOWN | 2e-10/N |
| Case physical-H engineering-budget decisions | 2 PASS, 15 UNKNOWN | 1e-8/N increase |

The 51 complete-equation replays are selected first/middle/final steps,
three per case. They are not a claim that all 600 accepted nonlinear steps
were independently replayed. Number, energy, momentum, full mean vectors,
all six tensor components and physical-H diagnostics were checked at all
617 saved states. Positive fixed Gaussian weights/variances establish PDF
positivity analytically; no density floor establishes it.

Both broad common controls resolve the declared H integration sensitivity
at every saved state, but their physical-H estimates increase:

| Common control | Maximum estimated H increase / N | H-change diagnostic envelope / N | Stationarity maximum exact L1 coupling upper |
|---|---:|---:|---:|
| n8, alpha .5, base | 4.441546686e-9 | 2.709957847e-12 | 4.242093176e-4 |
| n8, alpha .5, boosted | 4.441547130e-9 | 2.709957848e-12 | 4.242093176e-4 |

Each passes the original 1e-8 **increase budget**, including its diagnostic
envelope, and all 202 species/time stationarity cells per case pass the
1e-3 full-PDF gate through exact coupling uppers (404 PASS cells total
across both cases). These are engineering-
tolerance results. A positive estimated H rise is visible while the
producer's finite H_Q falls; it does not demonstrate exact monotonic
physical H or an H theorem. The H sensitivity/envelope is numerical, not
an interval certificate. Any posthoc higher-order endpoint confirmation is
a separately recorded supplement, outside the frozen main campaign.

The narrow n6/alpha .1 common negative control has 189 stationarity FAIL,
11 UNKNOWN and 2 PASS species/time cells. Its largest analytic full3D
characteristic lower witness is 2.396722249e-3, above 1e-3. Its input is
already a poor Maxwellian representation, so failure is not by itself an
implementation error in the continuous Landau equilibrium. Its physical-H
integration remains UNKNOWN at the original q17 ceiling. The remaining
fourteen drift/anisotropy/thermal/refinement case H decisions are likewise
UNKNOWN; smooth-looking decreasing estimates cannot replace the unmet
2e-10 sensitivity gate.

Final verification ran in the reviewer's safe-dev VM with the unchanged
31 numerical root files: `python run_checks.py` gives 29/29 PASS;
`python -m unittest discover -s orchestration -v` gives 8/8 PASS;
`python -m py_compile` passes for all final Python modules. The original
regression input/source snapshot is
`146898d628ff608cd3f7efece4ebf9e38d4c88aaae2c1db987bd7dffc003c037`;
`results/final-checks/checks.json` additionally pins every orchestration
source and the actual commands. `orchestration/metrics.py` was separately
executed and compiled after those assembly checks. The final seal includes
the complete actual sources and outputs, with generated caches excluded.

The four actual-data figures are under `figures/`. The final three-panel
H figure explicitly shows the broad-common positive physical-H estimate
against falling finite H_Q. Its panel's PASS label means the original
1e-8 engineering budget, not monotone physical H; H is integral F log(F),
so increasing H corresponds to decreasing thermodynamic entropy. Earlier
two-panel exports and image/source hashes remain under
`provenance/owned9-figures`.

A separate posthoc q13 check of the broad-base initial/final states retains
the positive sign: delta H/N = +4.4415129352e-9, with a combined q9/q13
sensitivity estimate 6.2806338428e-13. It uses the same pinned diagnostic
helpers/runtime and leaves all original case decisions unchanged. This is
additional numerical evidence, not an interval certificate or a full-path
q13 audit. Its independently verified 15-member package is
`scientific/general3d-entropy-sign-v17`, seal
`da889fac2d188d16cc58d2f66c66824e708a61446ce365836e9e85a679043600`;
see `docs/GENERAL3D-ENTROPY-SIGN-V17.md`.
