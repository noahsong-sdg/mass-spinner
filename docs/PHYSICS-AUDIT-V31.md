# Adversarial physics audit v31

8 November 2026. Eight independent workstreams challenge the live separator,
reduced equilibrium, Marathon and public research-replay paths. Findings below
separate demonstrated implementation defects from unresolved physical models.
Passing numerical checks does not establish apparatus or experimental fidelity.

## Confirmed defects and narrow fixes

### P2: weak Nanbu deflections lost through rounding

**Problem.** An accepted pair calculation with relative speed 10000 m/s,
scattering length s=1e−18 and angular uniform u=0.5 returned zero transverse
relative velocity instead of approximately 1.17741e−5 m/s. At s=1e−16, the
transverse result was about 26.6% too large. This is a demonstrated numerical/API
defect; no measurable current UI outcome bias has been established.

**Technical cause.** The exponential angular quantile gave `cos(theta)` first,
then the pair rotation used `sqrt((1−cos(theta))*(1+cos(theta)))`. The cosine can
round to one while its much larger square-root transverse component remains
representable. In simple terms, a tiny change was rounded away before taking
its square root.

**Fix and choice.** A private component sampler retains `q=1−cos(theta)` before
the subtraction from one. The general branch computes the sine from separate
square-root factors, also preserving an independently witnessed subnormal-uniform
case where q itself underflows. Public cosine arithmetic, the TA stream, RNG draw
counts, masses, density factors and the physical angular law are preserved.
This repairs arithmetic at its source without a minimum angle, speed floor,
rate cap or fitted coefficient. Original and intermediate failing witnesses are
retained, alongside independent final checks.

### P2: unused settings accepted as collision refinement

**Problem.** A declared adaptive spatial refinement could change `cellsAcross`
from 2 to 12 without changing any simulated collision, trajectory, conservation
or regime history. Disabled collision methods similarly cannot provide an
executed collision-method or spatial-refinement comparison.

**Technical cause.** The plan validator compared configuration values without
checking whether the selected collision path consumes them. Adaptive partitions
use marker target/depth, while the Cartesian count is unused. In simple terms,
turning an inactive knob could be described as a resolution study.

**Fix and choice.** Reject adaptive `spatial` comparisons based on these settings;
target/depth remain explicit `method` comparisons. Collision method/spatial
comparisons require enabled collisions; the dedicated physical-effect route
still handles on/off controls. This enforces the existing executed-setting
contract rather than inventing adaptive convergence semantics. Fixed Cartesian
and annular radial/axial comparisons retain their public behavior. Historical
plans and unfavorable results are preserved.

### P2: reversed-voltage potential minimum reported at the axis

**Problem.** The signed-voltage API could plot a lower wall energy while labeling
the axis as the minimum. A reproduced case has axis energy zero and wall energy
−993.05 eV, yet the old minimum radius was zero.

**Technical cause.** The analytic minimum branch assumed a positive quartic
coefficient although the public API permits negative voltage. In simple terms,
the formula for an upward-opening well was also used for a downward-opening one.

**Fix and choice.** Compare the physical wall energy with the existing clamped
stationary/axis candidate. For zero canonical momentum the potential is quadratic
in r²: positive quartics admit the interior minimum; negative quartics have their
global minimum at an endpoint. This gives the global minimum over the chamber,
independently of plot cropping, without rejecting previously supported signed
inputs or replacing an analytic result with a plot-grid search. A second reviewer
checks 20 voltage/shape combinations across both species and a cropped view.

### P3: unsupported scan point discarded a valid beam result

**Problem.** A valid 900 keV beam with imposed fractional slowing 0.999 could be
simulated, but requesting its sensitivity plots failed when the automatic scan
tried a different, unsupported low incident energy. Current UI bounds avoid this
API-only witness.

**Technical cause.** The scan recognized the material-slab domain exception but
not the separate D–T cross-section fit exception. In simple terms, one invalid
neighboring scan point canceled the valid selected calculation.

**Fix and choice.** Give the existing fit rejection a specific domain-error type
and exclude only the two expected domain-error classes in the scan. The exact
fit bounds and rejection message remain defined by the physical kernel. This
avoids duplicated fit limits and frame conversions in the plotter. Invalid
selected inputs still reject and unrelated errors still propagate; there is no
extrapolation, zero-rate substitute or catch-all fallback.

### P3: displayed residence time could overflow

**Problem.** An extreme accepted finite residence time could generate infinite
plot coordinates even when all zero-rate diagnostic budgets were finite. The
UI is many orders of magnitude away from this API-only boundary.

**Technical cause.** The existing representability check covered computed
budgets but omitted converting seconds to displayed microseconds. In simple
terms, a finite number became too large after changing units.

**Fix and choice.** Include the displayed endpoint in the existing finite-domain
guard. A neighboring representable case remains accepted. This enforces an
actual numeric boundary without an arbitrary time cap or changed physical rates.

## Physical qualification that remains withheld

- **Finite-cell torque and sparse distributions:** local cylindrical impulses
  conserve pair energy and axial momentum, but their unequal radii inject
  `(ra−rb) delta ptheta`. Narrower radial cells need more markers and independent
  axial convergence. An angular-law repair cannot remove this geometric torque.
- **Finite-step collisions:** Nanbu matches its declared first angular moment and
  isotropic limit, but its higher moments are approximate. The frozen v30 external
  finite-time equivalence intervals remain UNKNOWN. This pass does not replace
  them with an unrun current-source WarpX comparison.
- **Near-grazing collection:** the basic orbit path finds crossings of a numerical
  chord. A fresh exact circular-orbit witness leaves/reenters the wall between
  endpoints and is missed at dt*omega=0.03. Refinement improves the event time,
  but accuracy is nonuniform near tangency. The frequency guard and a small
  energy residual do not establish collector accuracy for every trajectory.
- **Fields and transport:** prescribed-field ion models do not solve electron
  response, electrode/sheath circuits, sustained source throughput, instabilities,
  charge-state evolution or coupled atomic/radiative transport. Independent
  sensitivity budgets expose assumptions; they do not add those processes to
  trajectories.
- **Marathon:** independent loading and stopping quadratures support the reduced
  equations. LiT retention/chemistry, the evolving stopping matrix, straggling,
  spatial target temperature, neutron transport and lifetime remain uncalibrated.
  The beam source and Alchemy blanket are separate designs/models.
- **Offline research backend:** fresh reconstruction confirms retained full3V
  distribution/rotation convergence failures. Public replay qualification remains
  WITHHELD. Conserved moments and a positive representation are insufficient to
  qualify Landau rates, entropy or complete evolving distributions.

## Evidence reviewed

Reports and scopes:

- [Angular kernel, pairing, boosts and weak limits](PHYSICS-AUDIT-V31-ANGULAR.md).
- [Spatial generator, conservation and convergence contract](PHYSICS-AUDIT-V31-LOCALITY.md).
- [Signed fields, source, collection and event accuracy](PHYSICS-AUDIT-V31-ORBITS.md).
- [Equilibrium closures, magnetic stress and transport](PHYSICS-AUDIT-V31-EQUILIBRIA.md).
- [Marathon coupled loading, stopping and thermal path](PHYSICS-AUDIT-V31-MARATHON.md).
- [Nuclear frames, energy accounting, scan domain and sources](PHYSICS-AUDIT-V31-NUCLEAR.md).
- [Coulomb-domain checks and Section III budgets](PHYSICS-AUDIT-V31-REGIMES.md).
- [Plots, saved distributions and public qualification](PHYSICS-AUDIT-V31-CONTRACT.md).

New execution and primary-source checks are distinguished from reanalysis of
saved artifacts in each report. All project code runs in distinct copied Apple
safe-dev guests; source identities, rejected hypotheses, red/green logs and raw
probes are retained under `scientific/physics-audit-v31/`. No prior campaign or
gate was edited. The original v30 application snapshot is retained separately.

## Final integration and publication

The final copied application snapshot pins **332 inputs**, map-file SHA-256
`5fad49ff8d4e7851197bbdc31a85a24e7b5f623e8dc2cad31188028d6548290d`.
All mapped inputs were checked before and after execution, then against the
reviewed export and canonical working sources. The production change is
**31 added / 11 removed lines across six files**, with eight new independent
test files. No physics tolerance was relaxed.

| Final command | Result |
| --- | --- |
| `npm test` | **509 passed**, zero failures/skips; 25.489 s subprocess wall time |
| `npm run typecheck` | Exit 0 |
| `npm run build` | Exit 0 |
| `npm run check:site` | Exit 0 |
| `npm run check:assets` | Exit 0 |

The integrated stage is `/tmp/mass-spinner-physics-v31`, guest
`safe-dev-4971c6afe8c245a9`; final export is
`/tmp/mass-spinner-physics-v31-final-gates-export`. Exact runner, logs, source
map, changed source/tests and original source witnesses are retained in
`scientific/physics-audit-v31/integration/`.

### Fresh whole-run collision confirmation

After freezing the repaired kernel
`92a2fb84e6df657495871e43107ffd7b7c99b2a9fd974008a403db4e67ff3565`,
the locality reviewer prospectively declared six full 200 µs runs with the exact
v30 fine-case settings: Nanbu, N1024/species, nr12/nz9, source-interface fitting,
100 ns steps and seeds 101–606. All six completed in 45.620 s under the declared
180 s cap; none errored, timed out or was dropped.

Worst sampled raw angular residual is **0.0423651%**, so all six meet the unchanged
**0.1%** raw budget. Sampled unresolved exposure reaches **26.8704%**, exceeding
the **1%** coverage allowance. Coverage therefore remains UNKNOWN and transport
qualification is **WITHHELD**. The independent raw checker reconstructs all six
angular ledgers to 3.38e−17 normalized discrepancy, with population, timed exits,
endpoint, density inventory and exposure checks passing.

This is current-source confirmation of one configuration, not a replacement for
the frozen 78-run v30 method/mesh/particle/timestep matrix or its unresolved
observable comparisons. It does not refresh the saved WarpX finite-time study
on the new source or establish overall convergence. New plan, input identities,
raw results, cap/status and independent reconstruction are retained separately
under the locality evidence tree.

The exact checked static release has 130 files, compact map aggregate SHA-256
`abd58eeabe25639f4a8459cef338a5133f38d73d37901358e930e66b673a6b7f`.
Cloudflare reports version `63c6f9bd-87a5-4c33-b11c-3c7efe9a1e29` at **100%**
rollout, verified 2026-11-08 16:35:25 UTC. The exact checked release is published
at [Mass Spinner](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/).
Publisher inputs, per-file release hashes, deployment log and sanitized receipt
are retained under `scientific/deployment-v31/`.

This is provider-state and artifact verification. Browser/GPU/mobile observation
is not part of this physics audit and remains unverified; no browser-policy
workaround was used.
