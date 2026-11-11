# Live collision locality v30

8 November 2026. **Separate radial and axial cell counts improve the torque /
occupancy tradeoff, but do not yet qualify physical transport.** No angular
momentum correction, nearest-neighbour pairing, rate rescaling or result clipping
was introduced. Frozen v10 studies and their gates are unchanged.

## Root cause and implementation boundary

The live path is `simulateDoublewell()` → fixed annular `axisymmetricCollisionCells()`
→ `collideAxisymmetricCell()` → `collideCoulombCell()` → selected pair scattering.
Each azimuthal representative's velocity is transformed into its own cylindrical
frame before scattering. A pair receives equal/opposite cylindrical impulses.
Energy and axial momentum are conserved, but the physical angular impulse is

`ΔLz = (ra − rb) Δpθ`.

Collisions do not move positions, so the `qBr²/2` part of canonical angular
momentum does not change during scattering. The same expression therefore gives
the pair's raw canonical-angular change. In simple terms, equal tangential forces
at different lever arms create a net numerical torque.

Randomly pairing across a wide Cartesian cell adds azimuthal as well as radial
nonlocality. The already implemented ring method removes the irrelevant azimuth
separation under the declared axisymmetric distribution; finite radial separation
still matters. This reduction matches the common-angle rationale explained by
[WarpX's maintainers](https://github.com/BLAST-WarpX/warpx/discussions/6835).
It is not an exact finite-cell angular conservation theorem.

The old UI parameter refined both radial and axial rings together:
`nr=cellsAcross`, `nz=ceil(L/(a/nr))`. Occupied-cell count grows approximately
quadratically, although the explicit torque lever arm depends on radial width.
At fixed marker count, joint refinement trades the torque defect for poorly
sampled local density / velocity distributions.

The root integration exposes an explicit independent axial count, already
supported by `RingSettings`. Fixed cells still use their exact full annular
volume, including vacuum, and the unchanged mixed equal-weight pair probability
and finite-N self-exclusion factor. Independent axial refinement remains required;
choosing a coarse axial grid solely to suppress an unresolved flag is not valid.

The only production change owned by this reviewer forwards the selected angular
method through the ring wrapper. Its optional final argument defaults to the
unchanged Takizuka–Abe method. No density, pairing, coordinate or velocity update
formula changed in this wrapper.

## Why not force exact angular conservation?

A post-scatter torque projection or a velocity adjustment can enforce a ledger
constraint while changing the collision transition law. Moving particles to a
common collision radius changes electrostatic/magnetic canonical terms and is a
different phase-space algorithm. Neither is justified by a small residual alone.

Spatially close partner selection is used in DSMC to reduce nonlocality; the
[Macrossan 2010 primary journal record](https://www.sciencedirect.com/science/article/abs/pii/S0021999110002299)
describes that motivation. Its full text was not accessible to this review
(direct fetch 403). A naive nearest-neighbour substitution also changes the
present empirical random-pair generator: pair probability is no longer uniform
within the declared cell. It cannot inherit this code's `n/N` normalization
without a new estimator and consistency proof. No such transplant was made.

Fixed independently declared ring cells are the smallest coherent numerical
change: they retain the existing generator and make the radial / axial tradeoff
measurable. They reduce a demonstrated error; they do not make it identically
zero. The separately implemented cumulative scattering method addresses angular
transition fidelity, not this geometric torque.

## Fresh full-horizon locality sensitivity

Eighteen runs used the unchanged v29 Takizuka–Abe kernel, the same 200 µs physical
pulse and dt=100 ns, source-fitted annular cells, seeds 101/202/303. A copied-source
adapter only added the explicit axial-cell count; it did not alter the collision
law. This isolates the mesh policy from the new angular method. Exact tested
adapter/kernel hashes and complete numerical settings accompany the evidence.

| N per species; nr × nz | Raw Pθ max, three seeds (%) | Unresolved active exposure (%) | Runtime per run |
| --- | --- | --- | --- |
| 512; 3 × 9 | 0.1390 / 0.2431 / 0.1948 | 17.59 / 17.03 / 17.29 | 3.39–3.58 s |
| 512; 6 × 9 | 0.1101 / 0.0960 / 0.0739 | 29.92 / 30.44 / 30.65 | 3.39–3.50 s |
| 512; 12 × 9 | 0.0418 / 0.0212 / 0.0232 | 45.31 / 41.78 / 44.91 | 3.42–3.60 s |
| 512; 6 × 18, old tied refinement | 0.1225 / 0.0793 / 0.0729 | 50.38 / 48.46 / 50.20 | 3.32–3.48 s |
| 512; 12 × 36, old tied refinement | 0.0494 / 0.0804 / 0.0336 | 76.73 / 76.15 / 78.65 | 3.35–3.43 s |
| 1024; 12 × 9 | 0.0435 / 0.0236 / 0.0131 | 25.45 / 25.72 / 26.10 | 6.73–7.00 s |

At fixed nz=9 and N=512, RMS radial pair separation falls from approximately
0.0201 m to 0.0115 m to 0.00648 m as nr goes 3→6→12. All three nr=12 runs meet
the unchanged raw residual gate **0.001**, but unresolved exposure remains far
above **0.01**. These are three-seed sensitivity probes, not the required six-seed
joint convergence campaign. The independent campaign separately evaluates all
prospective observable gates. No default is called converged on this evidence.

The lower unresolved fraction from holding nz fixed is real occupancy improvement,
not proof of axial fidelity. Increasing markers improves support but still leaves
evolving tails unresolved. The physical collector / temperature / density-CDF
differences require their own comparisons and cannot be inferred from torque.
Unresolved exposure measures insufficient local sampling; it is not a measured
percentage error in reaction rates or transport.

## Regressions and exact execution

Three new regression tests cover:

- Both selected angular laws reach the ring backend and match the direct common-
  cylindrical-frame cell operator; the measured finite-gap raw torque remains.
- Independent radial/axial meshes preserve the full physical cylinder volume
  and representative inventory.
- Actual live/convergence dispatch honors an explicit axial count while leaving
  collisionless physical histories unchanged.

All project execution used stage `/tmp/mass-spinner-locality-v30`, copied Apple
safe-dev guest `safe-dev-e950fb2e29592fe5`, with no host mounts, credentials,
control sockets or browser workaround. Initial dependency installation used
network; later reinstalls and runs were offline. Guest outputs were exported
before source replacement. The full 18-run provisional export is retained at
`/tmp/mass-spinner-locality-v30-provisional-export`.

On pure v29 source, the three new regressions give **one pass / two expected
failures**: selected angular methods were not available and the explicit axial
count was not executed. With the integrated method and mesh controls, the own
three tests and 32 neighbouring ring/collision/convergence tests give **35/35
passes**, zero failures/skips. Exact commands and snapshot maps are retained.

The campaign wrapper identity `2084c109…65a07` differs from final
`0ce57aec…bc47` only in two documentation-comment lines: the generator is now
described as using the selected angular law rather than TA exclusively. Both
complete source files and the exact comment-only diff are retained. Scientific
campaigns must not be rerun or retrospectively relabelled for this byte-only
documentation difference. The parent final gate tests the final source.

The first final wrapper/typecheck gate also passed but a post-export freshness
check caught a concurrent, independently demonstrated rare-tail kernel repair.
That earlier log is retained and not attributed to the repaired kernel. Final
selected-method regression/typecheck results against that frozen kernel are
recorded separately. Parent owns merged final build, typecheck, deployment and
interpretation across all independent campaigns.

## Independent read-only integration review

The root's `doublewell-dynamics.ts`, `doublewell-ui.js` and `convergence.ts` were
traced against the retained v29 export. No production correctness, units, schema
or scope blocker was found:

- Omitted scattering method retains TA. The collision-off state evolution is
  untouched; the new metadata reports the selected method explicitly.
- The same selected-law argument reaches Cartesian, adaptive and annular paths.
  Root and wrapper guards retain finite/integer domain checks.
- Explicit axial geometry is used both by the actual ring cells and by convergence
  numerical-geometry metadata. Source interfaces remain fixed physical faces.
- Spatial refinement requires genuine radial or axial improvement and forbids
  coarsening either axis or particle count. Method comparisons explicitly permit
  the new scattering identity while preserving other physical/numeric settings.
- The UI's zero sentinel is removed before the config reaches validation.
  Inactive axial controls are disabled; Cartesian/adaptive physics ignores that
  count. All controls use the existing invalidation/event path.
- Exported assumptions distinguish the cumulative law's first angular moment /
  isotropic limit from approximate higher moments and nonlinear evolution. They
  retain explicit finite-gap raw torque, source-support and sampling limitations.

This review is source-path evidence, not a deployed browser interaction test.

## Final sealed gate

On final wrapper `0ce57aec0ab24fe410101598d130019059905ece3e4bae7f1348ba2d8886bc47`
and corrected angular kernel
`276385adc07eecbf454973feea4490d7898392ec6bc797811b398d5c46c5de6e`, all **three
selected-method / locality regressions pass**, zero skips/failures, and production
`tsc --noEmit` passes. After export, the wrapper, kernel, dynamics and convergence
files were byte-compared against canonical sources and matched. Final snapshot
map SHA-256 is
`4365b8df02a35c66feacebfd74a071ddc4819533c32834425f0f6d7feee3c09e`.
New test file SHA-256 is
`52a61263f80add08064b1a54fe9af665f58b11a62b7f1f308b285a3df3fde49e`.

Commands, in copied stage `/tmp/mass-spinner-locality-v30`:

```text
safe-dev init
safe-dev run --online -- npm ci --ignore-scripts
safe-dev sync --replace-guest
safe-dev run -- npm ci --offline --ignore-scripts
safe-dev run -- sh -c './node_modules/.bin/tsx probe.ts > locality-probe.log 2>&1'
safe-dev export /tmp/mass-spinner-locality-v30-provisional-export
# Replace with pure v29 source plus new regressions; sync + offline reinstall.
safe-dev run -- ./node_modules/.bin/tsx --test tests/collision-locality-v30.test.ts
# Expected red: one pass / two failures. Export before replacing source.
# Replace with new canonical source; sync + offline reinstall.
safe-dev run -- ./node_modules/.bin/tsx --test tests/collision-locality-v30.test.ts tests/axisymmetric-collisions.test.ts tests/review-axisymmetric.test.ts tests/axisymmetric-integration.test.ts tests/coulomb.test.ts tests/convergence.test.ts
# 35/35 pass on the first integrated kernel.
# After final kernel repair: export, explicit sync, offline reinstall.
safe-dev run -- ./node_modules/.bin/tsx --test tests/collision-locality-v30.test.ts
safe-dev run -- ./node_modules/.bin/tsc --noEmit
safe-dev export /tmp/mass-spinner-locality-v30-corrected-final-export
```

The actual invocations use absolute safe-dev and `-C` stage paths; logs are
redirected inside the guest. No jobs remain running in this owned stage. All
unique guest work is exported. No VM or historical campaign was deleted.
