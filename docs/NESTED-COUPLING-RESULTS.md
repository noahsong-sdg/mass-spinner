# Coupled radial density: bounded convergence result

Follow-up: [thermal increment precision](THERMAL-INCREMENT-PRECISION.md) fixes
the wall-power contraction failure below. This page preserves the earlier
producer's results; the follow-up has 66 passing and six unresolved checks.

Tested code: `7ed99b04f3ab418b0dece5f4accace6635dc5e53`.
The [protocol](NESTED-COUPLING-PROTOCOL.md) fixes the equations, parameters,
nine-case matrix and original 2% spatial / 1% temporal gates before results.
This is a conceptual argon cell, not a matched Marathon experiment.

## Change and reason

Gas refinement previously forced every two-dimensional current solve to use
the same radial count. Fine gas transport therefore made electrical solves
unnecessarily large. Nested equal-volume projection now gives gas its own
resolution while preserving integrated torque, heat and source mechanical work.
In plain terms, resolving the gas boundary layer no longer requires adding the
same detail everywhere in the electrical calculation. This smaller change
preserves the established electrical operator; independently refining that
operator remains necessary. Inertia-weighted rotation with equal torque shares
was rejected because it would break the work identity.

## Observed results

All nine trajectories completed: gas grids 1024/2048/4096 crossed with
64/128/256 timesteps, at fixed electrical e16/z32 over 1 microsecond.
The shared classifier assessed 72 metrics: **65 pass, one fail, six unresolved**.
No comparison has `allAssessedGatesPass=true`; no qualification flag was enabled.

| Density response comparison | Coarse adjacent error | Fine adjacent error | Result |
| --- | ---: | ---: | --- |
| Radial triple, 256 steps | 1.48772% | 0.37145% | Pass |
| Time triple, 4096 gas cells | 0.25077% | 0.12561% | Pass |

Density passes all three spatial and all three temporal comparisons. Rotation,
gas temperature, shell inertia/angular momentum, current, mapped torque/Joule
heat, kinetic energy and total angular momentum also pass all assessed triples.
These norms cover common accepted clocks and coarsest restricted gas bins.

The 64-step spatial wall-power errors are 0.0010647% then 0.0012113%:
small magnitudes, but **noncontracting**, so the existing gate correctly fails.
The absolute differences are 3.6132e-12 then 4.1106e-12 W. Wall power passes
the 128/256-step spatial comparisons and all temporal comparisons. The cause
of the 64-step noncontraction is not established; no tolerance was changed.
All six liner-temperature response assessments remain unresolved: stored
temperature has zero response, which does not establish accurate heat uptake.

The independent Python audit checks 84 producer source hashes, all nine raw
stream hashes/row counts/clocks, species continuity, source projection, accepted
inertia and step/prefix angular and energy accounting. At gas4096/time256,
the peak prefix energy defect is 1.71093e-13 J against 1.52303e-9 J actual
electrical input (about 0.01123%). The near-equal liner accounting deficit
dominates. Native step residuals differ from cellwise faithfully summed
receipts by up to 8.37e-13 J across this matrix; background cancellation affects
that native diagnostic. Neither residual is an energy-accuracy admission gate.
Source mechanical-power mismatch is below 3.88e-26 W across all cases.
Stored-state accounting does not independently replay the native nonlinear
thermal callback or establish its exact consistency with recovered temperature.

Driver peak RSS: **592260 KiB (578.4 MiB)** under the unchanged 1 GiB cap.
The finest trajectory took 186.8 seconds on one CPU. Same-grid public behavior
is unchanged; two complete trajectories match pre-change commit `d2ce072` exactly.

## Verification and retained evidence

- [Full verification](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43853254635): `node --import tsx --test --test-concurrency=1 tests/*.test.ts` passes 1327 tests; 17 electron-screen and three archive-export Python tests pass; `npm run typecheck`, `npm run build`, `npm run check:site`, `npm run check:assets` pass. Site/asset checks are structural, not browser/GPU verification.
- [Study and accounting](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43853254711): 15 focused TS tests, exact baseline comparison, three auditor self-tests, nine trajectories, six convergence comparisons and independent accounting complete successfully. Workflow success means execution succeeded; the scientific failure/unresolved statuses above remain.
- [Actual red regression](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43851822778): original grid-size rejection fails the new test; 1324 existing tests pass.
- [Compact receipt](../scientific/spatial-argon-20261116/nested-receipts-7ed99b0.tar.gz), SHA256 `dc8e582ec76326cd4b5f65abaa6474041a28b7f3a39cc17605d99fa2eea0db88`, includes assessments, index, CI identities and logs; dense streams are separate.
- [Dense artifact](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43853254711/artifacts/14219418162): 217947165 bytes; API ZIP digest `728af05f7d2124a5035f934b0b1f0936d575dcffcfbb5af3eb0fcd22f11cba26`; expires 2027-02-14. Ignored local streams are retained under `scientific/spatial-argon-20261116/retained-nested-7ed99b0/`. All nine downloaded hashes were checked and exactly reproduce the earlier run's streams.

Two independent reviewers found no blocker to this bounded stage after source
and retained-result review. Electrical continuum/source refinement, liner heat
uptake, fine-only startup, experimental agreement and the public slider envelope
remain unqualified. The separate frozen OpenFOAM study is still pending and is
not admitted by this result. No deployment, live-default change or claim of
whole-simulator accuracy follows from these radial density passes.
