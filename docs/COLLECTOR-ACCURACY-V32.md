# Collector accuracy v32

2026-11-08. Scoped correction to basic rotating and ICR orbit collection.

## Result and qualification

The collector now finds the earliest contact on the reintegrated fractional
Boris path, including a curved wall excursion whose two full-step endpoints
remain inside. Impact clock, position, velocity and RF work use that same path.
Three independent reviewers found no further demonstrated defect in this scope.
The final integrated gate passes **540/540 tests**, typecheck, production build,
site-resource checks, asset checks and the retained grazing-refinement study.

This qualifies the selected numerical contacts and analytic orbit references.
It does not qualify experimental separator efficiency, self-consistent plasma
fields, collisional transport, Marathon material behavior or browser graphics.

## Problem, cause and selected fix

The actual path is controls → worker orbit request → physics.simulate →
collector records → ensemble arrival/collection plots and Three.js paths.
Previously, firstHit intersected the straight segment between full-step
positions. The impact velocity was then separately reintegrated at the
chord-derived clock. Technically, the chord loses radial extrema of the
fractional orbit and mixes states from two paths. Simply, an ion can hit the wall
and curve back inside before the next endpoint, so a ruler between those points
never sees the collision.

The correction uses derivative-root isolation already implemented for the
double-well orbit model. Its polynomial primitives are extracted unchanged into
polynomial-roots.ts. The double-well wall equation and event policy are unchanged.
The public firstHit chord helper keeps its historical behavior.

For parabolic DC E and uniform B, the fractional numerical position is rational
with denominator 1+(qm B tau/2)^2; clearing that denominator gives a degree-at-most-8
wall equation. For RF, a local sin-through-7/cos-through-8 phase expansion gives
degree-at-most-22 candidate equations. Existing frequency/acceleration guards bound
Taylor-only position truncation below 1e-25 radii. Candidate roots and stationary
points are checked against actual time-dependent fractional Boris positions.
This truncation estimate excludes floating arithmetic, which is checked separately.

Exact tangencies absorb; unresolved sub-ulp grazing errors explicitly rather
than enlarging the wall. Axial times remain analytic ballistic intersections.
A proven conservative numerical travel bound avoids polynomial solves far from
the wall. Surface projection is limited to checked root roundoff.

This is the smallest coherent correction because it reuses the existing event
method and preserves the orbit pusher, source and collision streams. Uniformly
shrinking every timestep would cost more and still leave an endpoint-chord
failure near tangency. A larger detector radius would bias the physics. Replacing
the entire pusher would broaden the change unnecessarily. Production delta is
153 added/51 removed lines across four files, including the unchanged helper move.

## Independent and final evidence

- Math review: 8/8 tests; 10,000 random pure-B trajectories against independent
  circle geometry, actual RF events at phases through 3000 radians with both
  magnetic/handedness signs, earliest surfaces, tangencies and near misses.
  Separate 20,000-case position identities agree within 2.22e-16; RF phase
  evaluation discrepancy is at most 9.83e-17 normalized position in that probe.
- Analytic review: 19 new plus 29 adjacent tests, 48/48. It checks circles,
  constant acceleration, hyperbolic/DC motion, circular RF, actual simulate
  impacts, work and second-order full-position convergence.
- Contract review: 30/30 targeted tests, actual worker → plots, t=0 source
  returns, horizon competition, collision-resolution ordering and seeded RNG.
  Frozen v28 fixtures are retained; their obsolete chord impact coordinates are
  explicitly excluded from truth-oracle comparisons and replaced by independent
  analytic gates. Unaffected fields remain exact in the retained fixtures.

The retained pure-B grazing witness at h=.03 was completely missed before.
The corrected contact is 0.00399999899987824 versus physical
0.003999993666672816, a relative error 1.3333035e-6 (0.00013333%).
It agrees with the numerical partial-circle phase relation
tau=2 tan(t_physical/2), rather than pretending root accuracy removes orbit error.
At h=.0009375 and .00046875, relative physical-time errors are 6.89476e-8 and
1.74813e-8, approximately second order. This is one retained witness, not a
population-wide accuracy bound.

One original RF impact-time ratio gate remains **FAIL, 18/19**:
errors 1.00425e-14, 1.67042e-15 and 4.14911e-16 seconds give ratios 6.01 and
4.03, outside its original 3–5.5 band. Neither that gate nor its evidence is
rewritten. Independent analysis and a prospectively specified 72-run follow-up
support cancellation in the radial projection of the vector orbit error.
All 60 full-position refinement ratios are 3.987068–4.0000001. The replacement
regression checks full-position error using the original ratio band and a
separately prescribed envelope; that envelope is not a universal finite-step
theorem. Timing errors remain diagnostics. See COLLECTOR-INDEPENDENT-V32.md
for the derivation and retained negative result.

Final offline commands in Apple guest safe-dev-a57cc55466eba92c:

| Command | Result |
| --- | --- |
| node_modules/.bin/tsx scripts/collector-convergence-v32.ts | Seven-step witness study, exit 0 |
| npm test | 540/540, 25.17 s command wall time |
| npm run typecheck | Exit 0 |
| npm run build | Exit 0 |
| npm run check:site | Exit 0; static resources/module parsing, not browser runtime |
| npm run check:assets | Exit 0 |

Host edits were copied and explicitly synced. Only dependency download used
online npm ci --ignore-scripts; calculations and checks ran offline. The final
342-input SHA map is scientific/collector-v32/final/tested-source-sha256-v32.json,
file SHA256 51940b4f7988c16c62b91dc1f1952a3d9d64a0cae373f09eb40fc0805f24d761.
The gate driver verifies those bytes before and after execution. Export:
/tmp/mass-spinner-collector-v32-final-export. Independent reviewers tested the
same four production hashes; root's final gate also covers an assertion-label
wording correction that changed no test predicate.

## Cost, deployment and remaining limits

Matched bounded VM timings show about 2x CPU cost: default96 median 231→469 ms,
neutral32 29→60 ms, RF32 27→58 ms. Outcome counts are unchanged in those cases.
These are CPU observations, not browser latency or mobile performance claims.
There is no reason to weaken the contact calculation to recover that time.

The exact checked 130-file release was deployed to
https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/.
Release aggregate SHA256:
082afb0e71854839eade3e941ec0051b79f7316a1656eb35a5ceb24887b024b2.
Cloudflare version ff2867d3-c494-4636-b9c7-f647ffc2793e was independently read
back from provider status at 100% at 2026-11-08T16:52:32.884317Z.
Deployment scripts, locked tooling and receipt are in scientific/deployment-v32.
The prior release was originally preserved as `release-before-v32`; V89 moved
its complete contents into the verified [local recovery archive](../scientific/cleanup-v89/SECONDARY-CLEANUP.md).
No live browser/GPU/mobile observations were made in this iteration; provider
rollout, static checks and Blender asset validation are distinct evidence.

No collision law, frozen convergence threshold, scientific study record,
Marathon calculation or graphics asset was changed. Prior v31 transport gates
remain unqualified: fine-ring angular drift passed but unresolved exposure and
coverage did not establish transport convergence; external-code and offline-3V
distribution/rotation failures remain open. Marathon stopping/retention/material
and lifetime calibration also remain open. This patch does not upgrade any of
those statuses.

Next qualification work should retain the frozen collision comparison gates and
resolve their actual spatial/velocity-distribution deficiencies. More collector
tests cannot substitute for that evidence.
