# Collector v32: independent execution contract and bounded timing review

Reviewer: `events32_contract`, 2026-11-08. Production code was read, not edited
by this reviewer. This is an independent integration review, not a claim of
native-browser/GPU verification or comprehensive plasma-model validation.

## Scope and root cause

The actual basic rotating/ICR path is UI configuration → `worker.ts` orbit request
→ `physics.ts:simulate` → `collectionSummary` / `arrivalCurves` and sampled Three.js
paths. The original event locator intersected a straight chord, then integrated a
fractional Boris step for impact velocity. Consequently, the reported position
and velocity represented different trajectories, and a curved excursion with both
endpoints inside could escape collection entirely. In simple terms, the solver
looked for collisions on a ruler laid between two points on a curved orbit.

The candidate preserves the existing full drift–Boris–drift orbit step and source
and collision RNG streams. It finds absorbing contacts on the reintegrated partial
step, using an exact DC rational polynomial and a bounded local RF polynomial,
checking candidate positions against the actual partial step. Axial motion stays
ballistic, so axial contact time is analytic. Full-step neutral optical-depth
validation still happens before event localization and absorption. Fractional RF
work, impact velocity and surface position now refer to the same contact state.
This directly corrects event localization without replacing the orbit pusher or
introducing empirical wall inflation. It is preferable to globally reducing the
step because small grazing excursions can remain poorly resolved by chord
geometry; timestep convergence is still required for the physical orbit itself.

## Independent checks

`tests/collector-contract-v32.test.ts` drives the actual worker, summaries and
arrival curves. It checks inventory, immediate negative-vz source returns,
right-continuous source-return jumps at t=0, a noninteger final time interval,
inside/exact/outside final-horizon axial collection, field-free impact energy,
full proposed-step neutral resolution before early absorption, and wall initial
points with inward versus outward motion.

The historical `graphics-v28-before-path.json` fixture is unchanged. Its collected
event coordinates are historical chord results, not a suitable new truth oracle.
The revised trajectory test retains exact comparison of all no-impact fields and,
for the collected fixtures, every field except impact records and their derived
impact-energy residual. It still checks exact counts, deposition bins, full-step
energy residual, RF/neutral energy, source kinetic energy and collision counts.
New contact records must remain finite, within the observation horizon, on their
physical surface and in the same destination sequence for these fixtures.
Independent analytic event gates are separate; frozen evidence is not regenerated.

The final narrow command ran in a distinct Apple safe-dev guest:

```
node_modules/.bin/tsx --test tests/collector-contract-v32.test.ts tests/trajectory-graphics-v28.test.ts tests/worker.test.ts tests/ensemble.test.ts tests/adversarial-orbits-v29.test.ts
```

Result: **30/30 passed**; full output is retained as
`scientific/collector-v32/contract/narrow-contract.tap`. Root owns the required
integrated typecheck, build and full repository gate; those are not asserted here.

## Matched bounded performance experiment

Old source came from immutable `/tmp/mass-spinner-physics-v31-final-gates-export`.
Its `physics.ts` SHA-256 is
`70da1eb0c6c78eb1a80bceea354fdc3161139554e3e393c5257f47b551e9385f`.
Candidate source hashes are retained in the accompanying README.

Both snapshots ran the same retained probe on Node v22.23.4, one warmup and three
timed repeats per case, offline inside the same distinct safe-dev project. The
candidate column is a fresh run with no simultaneous test invocation. This is a
small CPU timing comparison, not a browser frame-rate or statistical benchmark.

| Seeded case | Old median, ms | Candidate median, ms | Outcome evidence |
| --- | ---: | ---: | --- |
| DEFAULT_CONFIG, 96 markers/species | 231.40 | 468.96 | Same 96 axial A / 96 wall B |
| Neutral, 32 markers/species, 30 µs | 29.44 | 60.19 | Same 66 / 52 elastic events |
| RF, 32 markers/species, 30 µs | 27.02 | 58.05 | Same uncollected RF trajectories |
| Neutral, 8 markers/species, 1.235 µs | 0.60 | 1.35 | Same 9 / 5 elastic events |
| Thermal source, 8 markers/species, 1 µs | 1.08 | 1.24 | Same 5 immediate returns/species |

Full JSON results for **neutral, RF, noHit and source are byte-for-byte identical**
between old and isolated candidate runs (`cmp`, four successful comparisons).
Default differences are contact positions/energies, the impact-energy residual and
the last path vertex; collection counts, bins and full-step diagnostics are fixed.
The roughly 2× cost is a real tradeoff of this candidate at these small workloads;
it should be reported, not hidden by selecting only easy cases. Default CPU time
remains below 0.5 s in this guest. No assertion follows for mobile hardware.

An initial exploratory neutral density of 1e21 m⁻³ was correctly rejected by the
existing 0.02 optical-depth invariant; it was reduced to 1e20 m⁻³ **before** the
retained matched baseline and candidate runs. No resolution gate was loosened.

## Adjacent invariants and limits

- Event location consumes no random draws; unchanged full-step trajectories and
  sampled collision corners remain unchanged until a newly recognized contact.
- The complete proposed step is still checked for neutral resolution even when
  its particle exits early. Collisions remain end-of-step impulses only for
  uncollected particles; this patch does not claim continuous-time collision events.
- Source z=0 returns at t=0 and final-horizon impacts satisfy the ensemble contract;
  still-inside particles remain censored at the requested final time.
- Earliest axial or wall contact is selected; wall/end ties keep wall precedence.
- Impact work uses the actual fractional midpoint RF and surface state, rather
  than reusing the full-step RF impulse. Physical orbit error remains second order.
- Numerically unresolved grazing is an explicit error, not silently clipped
  collection. The small final surface projection is limited by candidate residual
  checks; it is not a deliberately enlarged collector.
- The shared polynomial extraction also touches the separate double-well solver.
  Its broader regression gates belong to the root integrated final verification.
- These checks do not validate omitted self-consistent fields, electrons, neutral
  kinetics, machine geometry, or experimental separator performance.

No additional correctness or domain-boundary defect was demonstrated in this
execution-contract review. Integration acceptance is contingent on the separate
analytic reviewers and root's full required gate for the same final source.
