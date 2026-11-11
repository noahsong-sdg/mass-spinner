# Adversarial physics audit v29

8 November 2026. Eight reviewers independently challenged the four playgrounds,
their numerical backends and their scientific claims. **The simulator is useful
as an exploratory demonstrator; the collisional transport and research collision
backend are not physically qualified. Marathon outputs are reduced-model
references, not calibrated machine predictions.** Passing application tests does
not change those conclusions.

## Highest-priority remaining findings

| Finding | Fresh evidence | Consequence |
| --- | --- | --- |
| P1: finite collision cells inject angular momentum | Default 200 µs pulse: 1.7246% raw canonical-angular-budget error, despite approximately 10⁻⁶ energy/torque-subtracted residuals | A corrected ledger does not correct trajectories or collector fractions. Require joint cell/particle/time/seed refinement. |
| P1: TA angular sampling is inaccurate at large finite steps | At half-angle variance 10, actual mean cosθ = −0.3735 versus fixed-speed angular diffusion exp(−20); pair energy still conserved to approximately 10⁻¹⁵ | Energy conservation alone cannot validate scattering. Gate a cumulative-angle sampler or subcycling independently before transport claims. The witness does not quantify its contribution to a whole-run error. |
| P1: full3V distribution convergence fails | New characteristic-function lower witnesses independently prove 28 refinement failures; n6→n8 at 100 µs gives 0.044835/0.086851 versus a 0.0002 gate | Particle/width/quadrature refinement remains essential. Smaller timesteps or tighter nonlinear tolerances alone cannot remove this demonstrated discrepancy. |
| P1: full3V rotational covariance fails | All eight rotation comparisons fail; even the smallest new lower witness is 0.00070285 | Fixed Cartesian entropy cubature has preferred directions. Exact discrete conservation/entropy balance is insufficient. |
| P2: evolving density support remains unresolved | Source fitting improves the initial n² support ratio from approximately 0.739 to 0.9999, but every sampled frame still contains some unresolved local cells | Initial support correction is not whole-run collision-rate qualification. |

These are existing limitations confirmed by fresh evidence, not newly introduced
regressions. They remain visible in the current scientific qualification. No rate
fitting, speed floor, angular clipping, torque projection, changed acceptance
threshold or retrospective campaign rewrite was used to hide them.

The research reviewer independently reconstructed **617 states in 17 saved
trajectories** and verified **all 63 public replay states** against raw data.
Maximum reconstructed energy and momentum residuals are 8.734×10⁻¹⁴ and
1.237×10⁻¹⁶. These successes coexist with the distribution failures above.
Four timestep comparisons were not decided by the new bounded lower-witness
search; their prior FAIL/UNKNOWN outcomes are retained, not promoted to passes.
Physical entropy and physical-rate integrations were inspected but not rerun in
this pass. A decreasing finite-rule entropy H_Q is not a physical H theorem.

## Reproduced defects and narrow corrections

### P2: a gyro circle could collapse to a line

The reduced gyro display sampled both species over four slow-species periods on
one fixed time grid. At an allowed 1 u, Z=2 versus 125 u, Z=1, the fast ion
completed 1000 cycles and was sampled at half-period intervals. Its expected
3.219 mm x-span became approximately 4.19×10⁻¹⁵ m. In simple terms, repeated
snapshots caught the circle at the same few phases.

Each species now displays at most its own first gyroperiod with the existing
2000 intervals. Short arcs and full-flight axial metrics are retained. The
assumption text identifies these as spatial loci, not simultaneous endpoints.
This resolves a periodic shape at bounded cost rather than allocating enormous
arrays to redraw identical revolutions.

### P2: subtracting inventories erased a real outer population

The outer annulus was obtained as full inventory minus inner inventory. When
almost all particles were inside, both rounded to the same total. A permitted
Gaussian-tail case returned zero populations and undefined composition although
independent annular integration gives 9.846×10⁻²³ and 1.666×10⁻²², with fractions
0.3714/0.6286. In simple terms, the small remainder was lost by subtracting two
large nearly equal numbers.

The solver now directly accumulates outer cell integrals, including the partial
cut cell, with the same cylindrical piecewise-linear quadrature. No floor or
renormalization is introduced. The tail error decreases by approximately four
per grid doubling, consistent with second-order integration. Direct integration
preserves the quantity of interest without changing the density model.

### P2, API-only witness: RF acceleration was missing from the timestep guard

With B=0, zero RF frequency and a constant 200 V/m RF field, the old frequency
guard allowed a 100 µs step. For a 40 u ion it reported wall arrival at 19.19 µs
instead of the independent constant-acceleration 43.80 µs, despite an excellent
energy ledger. The state endpoint was accurate; the straight collector-crossing
chord was too coarse. Current UI field/timestep bounds exclude this witness.

The existing dimensionless timestep budget now also checks
`dt sqrt(max(q/m) E_RF / a) ≤ 0.03` for active ICR, and display sampling uses
that scale. This bounds the acceleration displacement by 0.00045 chamber radii
per step. Accepted-step refinement converges to independent wall time/energy.
This repairs the missing scale without silently shrinking requested timesteps
or replacing the event solver. It is not a global accuracy guarantee for
arbitrarily near-wall or grazing trajectories.

### P3, extreme API witness: opaque-target survivor cancellation

The fusion-only loading branch computed remaining T as initial T minus fused T.
At unit optical depth 10²⁰ and crossover dose, the old remaining inventory
rounded to zero and the instantaneous rate to zero; the exact rate is half the
incident rate. A tiny remaining population can still be optically important.
Current thin-target UI optical depths, of order 0.005 or less, exclude this
large-error witness.

The depleted branch now evaluates remaining optical depth directly with stable
logarithmic complements and softplus. The well-conditioned branch and existing
event ledgers are retained. Subtracting dose before multiplication prevents
another cancellation between large products. This preserves the declared ODE
without artificial positive floors or tolerance changes.

### P3: output-grid arithmetic could change the requested endpoint

The stronger independent adjacent-dose test exposed a second defect after the
survivor repair: `dose*i/intervals` can move even its final value by one floating
point increment. An opaque transition amplifies this into a rate error. Both
analytic and coupled loops now use the exact requested dose at the final index.
Tests require exact final exposure identity and check neighboring floating-point
exposures. Intermediate-grid policy is unchanged; rescaling or interpolation of
already solved states would conceal the actual endpoint defect.

### P2/P3: output scope and decay-data identity needed qualification

Primary generic neutron labels could imply total production although the model
computes only D–T reactions. Source/loading metrics and axes now explicitly say
D–T, with values, schema keys and equations unchanged. Inventing D–D or D–Li
rates would require a separate validated model and data.

The blanket reference combines legacy half-lives with a newer isomer branch;
it is not a single current evaluated dataset. Existing closed Model info and
source comments now identify that fact and link the evaluators. Constants and
frozen paper-reference outputs were not changed. For example, 100 h pure-ground
conversion differs by 0.449 percentage points between Hg197 half-lives 64.14 h
and 64.93 h. A stale evaluation's isomer branch must not replace the newer
supported approximately 94.7% value. Dataset reconciliation/uncertainty belongs
in a separately versioned reference, not an unannounced change to saved results.

## Checks that did not demonstrate a new defect

- Orbit signs, mass/charge cutoff, both RF polarizations, source return, unequal
  mass cold-neutral momentum/energy and Poisson survival agree with independent
  equations. An 81-run cold-orbit scan has no destination disagreement and worst
  impact-time relative error 4.875×10⁻⁶ at 40 ns.
- Independent unequal-charge equilibrium, quasineutral force balance, current
  and magnetic-pressure checks pass within the declared reduced closures.
- Direct-state loading ODE references across 24 cases and existing 42-case
  independent references pass. Continuous-depth source refinement, exact thermal
  histories and independent disk solid-angle integration pass.
- D–T cross-section units/CM scaling and the pinned stopping kernel have no new
  demonstrated error. No measured LiT stopping/retention calibration is supplied
  by these numerical checks.
- Screening/coupling checks cover 81 UI combinations. A suspected UI electrostatic
  feasibility failure was **falsified** by corrected arithmetic and its numerical
  regression; rejected evidence is retained. Dilute API cases can still violate
  global electron closure although local collision screening tests pass.
- Units, saved-state identity and qualification labels were traced through the
  actual producers and UI rendering. Torque-subtracted bookkeeping, frozen
  research replay and independent Section III budgets are already distinguished
  from corrected transport, live solves and coupled failure dynamics.

## Scope that remains absent

The separator does not solve self-consistent electrons/space charge, sheaths,
RF penetration/loading, ionization/charge-state evolution, neutral transport or
instabilities. Section III loss/power estimates are independent diagnostics,
not feedback into the orbit solver. The full-orbit model does not require a
guiding-centre approximation, but its prescribed fields still require physical
justification for a real device.

Marathon's public beam architecture supports a source/accelerator/LiT/cooled
backing concept. It does not publish enough calibration to establish this
simulator's target lifetime or source performance. Depth-dependent composition,
straggling, measured retention, renewal, phase change, temperature feedback and
non-D–T reactions remain absent. Thermal and evolving-loading calculations are
separate observers of the frozen initial source. The future blanket is a distinct
conditional neutronics/depletion concept, not the compact source itself.

## Evidence and review record

Eight scoped reports retain independent derivations, source links, counterexamples,
negative controls, tested hashes and exact commands:

1. [Orbits](PHYSICS-AUDIT-V29-ORBITS.md)
2. [Equilibria and reduced geometry](PHYSICS-AUDIT-V29-EQUILIBRIA.md)
3. [Live kinetic collisions](PHYSICS-AUDIT-V29-KINETIC.md)
4. [Marathon numerical solvers](PHYSICS-AUDIT-V29-MARATHON-SOLVERS.md)
5. [Nuclear/stopping data](PHYSICS-AUDIT-V29-NUCLEAR-DATA.md)
6. [Offline collision/replay](PHYSICS-AUDIT-V29-RESEARCH.md)
7. [Scientific UI contract](PHYSICS-AUDIT-V29-CONTRACT.md)
8. [Regimes and Section III](PHYSICS-AUDIT-V29-REGIMES.md)

Compact evidence is under `scientific/physics-audit-v29/`; historical studies and
their thresholds remain immutable. Loading corrections received independent
numeric review; the RF guard received independent dimensional/bound review.
Each corrected defect has a preserved failing witness and regression.

All code execution used copied Apple safe-dev VMs, without host home, credential,
agent or control-socket mounts. Final integrated commands, source identity and
publication status are recorded in the integration section below.

Browser-origin policy remains blocked. DOM, numerical and asset tests are not
deployed browser/GPU/mobile observations, and no alternate access route was used.

## Final integration

The merged copied snapshot passed all **443 tests**, zero failures/skips, plus
`npm run typecheck`, `npm run build`, `npm run check:site` and
`npm run check:assets`. Tests took 23.671 s; typecheck 1.421 s; build 0.685 s;
site check 0.192 s; asset check 0.102 s. Commands ran offline through
`safe-dev -C /tmp/mass-spinner-physics-v29 run -- python3 run-physics-gates.py`
in guest `safe-dev-27f35a0c12f2f46f`, following explicit copied-source sync and
`npm ci --offline --ignore-scripts`. Initial installation alone required network.

The first merged run had 442 passes and one test-harness failure: the old blanket
DOM stub lacked standard `createTextNode`, used by the new source links. Adding
that API to the stub repaired the harness, with no production workaround or
changed assertion. Its failing log is retained. After export, sync and reinstall,
the complete gate above passed on the corrected snapshot.

Final tested 320-file source/fixture map SHA-256:
`97cd945d18798faab975944846d85055b24d9af793f7a59d8c86dfb275ad7066`.
Every listed guest digest was rechecked after export; corresponding canonical
source/tests/scripts/web assets matched the tested bytes. Final export:
`/tmp/mass-spinner-physics-v29-final-gates-export`.

Nine production files differ from v28: 42 added and 16 removed lines. A separate
read-only reviewer traced the merged changes against the retained v28 source and
found no correctness, schema, units or scope blocker. No persistent-data schema,
migration, credentials or authorization path changed. Source links are constant
HTTPS URLs; no caller-provided HTML was introduced.

Logs, runner and source map are retained in
`scientific/physics-audit-v29/integration/`. Publication uses exactly the 130
checked build files, aggregate SHA-256
`c405eb255dfee9604210cd7c5ef4a8d25935bad3f5c184198bcfed4843e90c56`.
Provider confirmation is recorded separately under `scientific/deployment-v29/`;
it does not establish browser behavior.

Cloudflare deployment version `74c0f35a-0895-47ee-9a64-2213b4845ef6` was confirmed
at **100% traffic** by its deployment-status API. All 130 release-file digests
and exact membership were reverified after the deployment guest export, as were
the publisher and pinned dependency lock. Public address:
[Mass Spinner](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/).
This is provider deployment verification; live browser/GPU/mobile verification
remains blocked and is not claimed.
