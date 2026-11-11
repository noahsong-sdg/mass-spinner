# Executed external scientific references

7 November 2026 UTC. Julia/SciML, PlasmaPy, WarpX and PETSc now have executed,
pinned offline workflows. This closes the absence of independent numerical
evidence for selected components. It does not close the separator's spatial,
continuum or experimental validation gates.

The browser remains the existing TypeScript reduced model. No production physics,
controls, package dependencies or deployment changed in this increment. Julia is
the independent high-accuracy orbit reference, not a relabeled JavaScript solver.

## Tool selection and executed scope

| Tool | Executed work | Result and boundary |
| --- | --- | --- |
| Julia 1.13.3, OrdinaryDiffEqVerner 2.4.2 | Independent nondimensional Lorentz ODE, adaptive Vern9, tolerance refinement, signed-B analytic tests | 2,448 assertions pass; six interior trajectories exported. No collisions, collectors or plasma response. |
| PlasmaPy 2026.2.0 | Exact abstract 40 u/84 u formulary, screening, thermal speeds, gyro rates and cold-limit Coulomb coefficients | 11 tests pass; a reproduced extreme-cold quadrature failure is retained as rejected evidence. |
| WarpX 26.10 | Unmodified upstream collision benchmark; nine matched two-ion relaxation runs and two controls | Upstream final-temperature error 0.6785%, below its 2% tolerance. Matched finite-time comparison remains UNKNOWN. |
| PETSc 3.26.1 Landau | Unmodified electron/ion example on three velocity meshes | All twenty nonlinear solves per mesh converge; four parser tests pass. This is not yet a matched ion/ion reference. |

Dependencies, manifests/locks, input decks, source identities, raw outputs and
reproduction commands are in [scientific/](../scientific/README.md). Scientific
execution and installation used dedicated Apple safe-dev VMs, with downloads
online and computations offline. No host solver execution was necessary.

## Production orbit comparison: PASS for these cases

The adapter calls actual production `advanceDoublewell`, energy and canonical
angular-momentum functions. Four quartic interior trajectories and two uniform-B
trajectories run to 200 microseconds. Production steps are 100, 50 and 25 ns.
The independent Julia solver uses adaptive continuous-time Vern9, not Boris.

- All six cases show approximately fourfold position and velocity error reduction
  when the step is halved, consistent with the production method's second order.
- At 25 ns, the worst sampled coordinate-position difference is **0.6131 micrometers**;
  velocity-component difference is **0.07542 m/s**. Both meet the prospective
  10 micrometer / 1 m/s engineering budgets for these cases.
- Worst sampled normalized production energy and canonical-momentum residuals
  are **6.611e-9** and **9.227e-9**.
- Julia's final tolerance refinement changes positions by at most 1.072e-13 m and
  velocities by 1.551e-8 m/s. This is empirical refinement, not a certified bound.

These cases do not exercise boundary events or collisions. Full trajectories,
levels, budgets and provenance: [orbits.json](../scientific/comparison/orbits.json).

## Production formula comparison: PASS within the qualified regime

Twenty-four comparisons call actual production source-velocity, screening,
gyro-step and Coulomb-variance paths. The largest relative difference is
**1.089e-9**, below the declared 3e-8 formulary budget. Thermal-width checks have
their separate 1e-12 budget. Physical-constant/conversion conventions are recorded;
the library uses a slightly different epsilon-zero convention.

The coefficient comparison converts PlasmaPy's unlike-mass slowing-down rate
into the infinitesimal Takizuka–Abe angular-variance rate. It does not mistake a
test-particle momentum-loss frequency for a mutual thermalization frequency.

**Rejected upstream probe:** at background temperature 1e-8 eV and beam speed
5000 m/s, PlasmaPy returns zero momentum-loss frequency instead of the analytic
cold-limit 10742.36/s. Inspection traces this to quadrature over an enormous
interval missing the localized Maxwellian integrand. In plain terms, numerical
integration skips the narrow part that contributes the answer. The workflow
preserves that failure and qualifies a resolved 0.1 eV cold-limit regime; it does
not patch the package or silently use the failed output. This explicit regime
restriction was chosen over inventing an unreviewed upstream fallback.

See [formulary.json](../scientific/comparison/formulary.json) and
[PlasmaPy execution evidence](../scientific/formulary/VERIFICATION.md).

## Finite-time collision comparison: UNKNOWN

Both methods start from exactly the same exported velocity realization, exact
40 u/84 u masses, elementary positive charges, density 5e17/m3 per species,
lnLambda=12 and nominal 2/10 eV initial temperatures. The single homogeneous
collision cell has no fields, spatial push or boundary loss. Duration is 1 ms.
Nine relaxation runs use three seeds per numerical level; two additional runs
test common-temperature stationarity and disabled collisions. The duplicate
pilot is excluded. Different random pairing is compared statistically, not
particle by particle.

At the final checkpoint, temperature difference means **production TA minus WarpX**:

| Markers per species | Step | 40 u difference, eV | 84 u difference, eV |
| --- | --- | --- | --- |
| 512 | 1 microsecond | +0.03472 ± 0.31936 | -0.03304 ± 0.29533 |
| 2048 | 1 microsecond | -0.06332 ± 0.41504 | +0.06207 ± 0.41457 |
| 2048 | 0.25 microsecond | +0.06769 ± 0.51247 | -0.06823 ± 0.51462 |

Half widths are exploratory pointwise paired 95% Student-t intervals with three
whole-run seeds and two degrees of freedom, not simultaneous bands or equivalence
tests. The fine-step 40 u interval spans about -0.445 to +0.580 eV; it cannot
establish sub-0.1 eV equivalence. At 1 microsecond, the 250/500 microsecond
pointwise intervals exclude zero for both species. It would be incorrect to say
all histories agree within uncertainty. Opposite species differences are
energy-constrained, not two independent successes.

Production sampled energy/momentum residuals are at most 2.231e-13 and 3.095e-15
against positive physical scales. The collision-off distribution is unchanged.
WarpX's independent raw-array audit likewise checks fields, inventories and
conservation. These verify invariants, not the finite-time distribution law.

The production diagnostic counts **pair steps with angular variance above 0.1**,
not observed large deflection angles. It falls from approximately 5.3–5.5% at
1 microsecond to 1.38–1.48% at 0.25 microsecond in the N=2048 relaxation runs.
The maximum variance is 366631.54, exposing the low-relative-speed tail. That
flags unresolved finite-step behavior; small relative speed also means small
relative energy, so the maximum alone does not quantify a transport error.
Falling speed-CDF distances with particle count can reflect ordinary sampling
noise. No continuum error bound or distribution-equivalence tolerance is accepted.

Full histories include directional temperatures, bulk velocities, raw second
moments, descriptive speed-CDF distances and conservation diagnostics:
[collisions.json](../scientific/comparison/collisions.json).

## Audit correction: prevent pooling incompatible runs

The original comparison grouped records by particle count and timestep only.
Individually valid files with different densities, Coulomb logs, durations or
checkpoint times could enter the same confidence interval. In plain terms, it
could average different experiments as if they were repeat trials.

Campaign validation now checks physical identity, generator revision and
tolerance-aware checkpoint identity **before simulation and pooling**, and
requires the declared nine relaxation configurations plus both controls.
Regressions include individually valid stale records and harmless timestamp
roundoff. All saved configurations already match; no observed result was
invalidated. Rejecting incompatible inputs at the campaign boundary is the
smallest fix; changing the statistical formula or silently dropping files would
leave the cause unresolved. An independent agent re-reviewed the corrected path.

Orbit/formulary reference hashes pin the tested artifact bytes. Digest-format
validation alone does not establish that a generator is fresh; source manifests
and package-specific export reviews supply that separate provenance evidence.

## Next scientific stages

1. **Resolve the homogeneous collision comparison.** Expand independent seeds,
   refine timestep independently of marker count, and predeclare moment and
   distribution equivalence budgets. Retain angular-variance-tail diagnostics;
   do not cap rates or alter density merely to obtain agreement.
2. **Adapt PETSc's initialization, with separate review.** Its shipped first
   species is forced to electrons before derived normalization/coefficient setup.
   Setting an input mass or modifying masses afterward cannot produce a valid
   two-ion case. First add all-species SI initialization, prove unchanged upstream
   behavior and correct pair coefficients, then a matched ion/ion driver. Require
   domain/mesh/timestep refinement, positivity and entropy diagnostics. See the
   [reviewable adaptation split](../scientific/petsc/README.md).
3. **Return to spatial separator convergence.** Match closed rotating equilibrium
   before open sources/collectors, and refine collision-cell geometry separately.
   Homogeneous agreement cannot resolve the v10 locality/sampling failures.
4. **Add self-consistent fields as separate physics.** FEniCSx has actual public
   Marathon Fusion centrifuge-collaboration evidence, but the checked presentation
   does not disclose a reusable model or validation. WarpX RZ/3D is relevant for
   kinetic plasma response and nonaxisymmetric instability studies.

No checked source establishes a single turnkey industry-standard rotating
separator package. The [primary-source review](INDUSTRY-SOLVER-REVIEW-V11.md)
compares commercial packages, Gkeyll and Julia kinetic packages, and distinguishes
advertised capabilities from inspected runnable Coulomb operators.

## Exact parent integration checks

The minimal copied root snapshot is `/tmp/mass-spinner-reference-gate.YWQxyJ`,
guest `safe-dev-e3cc6ae2874726e4`: 235 files, 59.5 MiB, no host mounts. Source was
explicitly synced after edits, followed by `npm ci` in the guest. The export at
`/tmp/mass-spinner-reference-results-v11` has byte-identical `src/`, `scripts/`
and `tests/` to the reviewed host source. Each comparison records production
source digests and exact external input-file digests. Generated results were
reviewed before copying to `scientific/comparison/`.

All commands below ran with `safe-dev -C /tmp/mass-spinner-reference-gate.YWQxyJ run --`:

- `node --import tsx --test tests/external-orbit-reference.test.ts tests/external-formulary-reference.test.ts tests/external-collision-reference.test.ts`: **12 passed**, 0 failed.
- The three `node --import tsx scripts/compare-external-*.ts` commands documented
  in scientific/README.md: exit 0; orbit PASS, formulary PASS, collisions UNKNOWN.
- `npm test`: **262 passed**, 0 failed/skipped, 15.832 s.
- `npm run typecheck`: exit 0.
- `node_modules/.bin/tsc --noEmit --strict --target ES2022 --module NodeNext --moduleResolution NodeNext --lib ES2022,DOM --types node scripts/compare-external-orbits.ts scripts/compare-external-formulary.ts scripts/compare-external-collisions.ts`: exit 0. Guest-only `@types/node@24.10.1` was installed without changing the project lock.
- `npm run build`: exit 0; existing renderer chunk warning remains. Output is
  index-CKWBCKez.js 1033.45 kB / 287.74 kB gzip, worker-CM5G_q9z.js 70.60 kB.
- `npm run check:site`: exit 0; static/module/resource verification, not browser execution.

An initial collision regression fixture accidentally allowed only zero-relative
speed pairs; correcting its velocities made it exercise scattering. An initial
comparison output write failed because empty directories are not copied by
safe-dev; creating the requested guest output directory resolved it. A concurrent
safe-dev command was rejected by the VM lock and was rerun after export completed.
None required a production physics change or weakened isolation.

Independent agents reviewed tool capabilities, the Julia/formulary adapters,
collision campaign aggregation and actual output interpretation. Their source
reviews do not replace the execution evidence above. The existing deployed UI,
managed-origin browser denial and unverified live GPU appearance are unchanged.
This increment was not deployed. Keep solver packages and root comparison
integration as separate reviewable changes; no PR was opened.
