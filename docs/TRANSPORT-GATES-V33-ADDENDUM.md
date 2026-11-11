# Independent admission/performance candidate review, v33 addendum

2026-11-08. This new review leaves the prior 22-file gate-review leaf and its
report unchanged. No production code was edited by this reviewer.

## Scope and result

The final candidate explicitly admits research workloads up to 65536
representatives per species and 320 million nominal particle steps. Interactive
admission remains 4096/80 million. Both modes retain the 40000-step bound and the
same physical orbit-resolution checks. This changes scientific compute admission,
not an accuracy tolerance or physical equation.

Root also removes temporary vector allocations in the Coulomb pair implementation
and a redundant identity Map in the axisymmetric wrapper. The former still uses
the same arithmetic sequence, angular law, partner density and random draws;
the latter retains a direct original-ion pointer on each transformed local ion.
This targets demonstrated CPU/allocation cost without replacing the numerical
collision law. A different sampler, rate factor or reduced horizon would alter
the scientific problem and is unnecessary for this performance change.

Independent checks pass **8/8**, with source TypeScript checking exit 0:

- 10000 mixed-mass/charge pair states, both TA and Nanbu, zero-rate/zero-relative
  controls and velocities spanning signed extreme scales: old/current returned
  states and random draw counts are bit-identical.
- 768 repeated ring batches across odd/even populations and both laws:
  velocities, diagnostics, callback identity, callback impulses and random draw
  counts are exact matches. Callback pointers still identify the original ions.
- Twelve full finite-time pulse/closed trajectories covering fixed, adaptive and
  ring partitions with both angular laws: complete returned objects are exact.
- All eight proposed N/h/nz campaign levels are admitted only by research mode.
- The exact continuous-expression 320-million boundary is admitted, excess is rejected;
  the 65536-particle, unchanged 80-million interactive, 40000-step and physical
  resolution limits remain enforced. Invalid modes and config-only opt-in reject.
- Corrupt null mode metadata, mismatched profiles and stale source hashes cannot
  fill an accepted cohort; genuine absent legacy metadata remains interactive.
- Current reanalysis of all 78 archived v30 records deeply equals every archived
  pulse, closed and axial summary object, including all numbers and verdicts.

The same admission predicates run against the pinned old 80-million research
backend give the expected **3 PASS / 2 FAIL**. Only the newly intended high-work
admission tests fail; corrected candidate gives 5/5 admission tests. This is a
before/after compute-boundary regression, not evidence that a former physical
convergence failure has disappeared.

No changed-physics defect was found in this admission/performance scope.
It does not establish speed on a large workload, full distribution accuracy or
transport qualification. The earlier null-data defect remains fixed, and the
previous statistical/coverage qualification limits remain unchanged.

The admission guard uses `2*N*duration/dt`, whereas the saved diagnostic uses
`2*N*ceil(duration/dt)` and execution advances to the physical horizon with a
possibly shortened final step. A separate independent witness at N65536,
dt=100 ns and duration=244.140625 µs is admitted at exactly 320000000 by the
guard but reports 320077824 particle steps. This inherited counting convention
means the tests certify the nominal guard, not a strict integer execution-work
ceiling. The proposed matrix remains below either ceiling. An integer work-cap
correction, if required, should receive its own boundary regression; no gate or
physical result depends on interpreting this rounding difference as a pass.

## Proposed full campaign feasibility

For the full 200 µs physical horizon, nr12, source-fitted interfaces and all six
fixed whole-run seeds, N32768/N65536 × h100/h200 ns × nz3/nz9 is eight levels and
48 runs. All levels satisfy the new 320-million proposed-particle-step ceiling:

| N/species | h, ns | Proposed particle steps/run | nz choices |
| --- | ---: | ---: | --- |
| 32768 | 200 | 65.536 million | 3, 9 |
| 32768 | 100 | 131.072 million | 3, 9 |
| 65536 | 200 | 131.072 million | 3, 9 |
| 65536 | 100 | 262.144 million | 3, 9 |

Total proposed work is **7.077888 billion particle steps**. This is a resource
accounting measure, not the exact number of active orbit pushes or pair events.
Actual loss, occupancy, garbage collection and process overhead change wall time.

The retained old pilot completed N16384/h200 (32.768 million proposed steps) in
86.876 seconds and timed out at 150 seconds on N32768/h200. A simple linear
extrapolation from that completed old run predicts about 5.21 hours for the
matrix and 695 seconds for its largest run. These are descriptive planning
estimates, not validated runtime bounds. The full matrix cannot inherit a
150-second cap merely because smaller pilots used it. To fit that cap, the
largest level would require at least a 4.64x throughput gain relative to the
recorded old pilot. Fresh optimized same-workload measurements plus headroom
must establish the acceptance-run budget before results.

The complete factorial permits matched particle, timestep and axial spatial
comparisons at both N/h/nz settings. Holding nr12 fixed provides no new radial
refinement. It provides no orientation, partition alignment, closed stationarity,
velocity-distribution or physical-effect-versus-continuum-error certificate.
Identical finite discrete differences and empty populations must still remain
UNKNOWN under the existing gate. Neither runtime admission nor bitwise parity
promotes any of those statuses.

Before results, the separate frozen five-level confirmation plan
`a384961e2acab2c1ba09a14da879884219dde2d8ee8e62233c1099f02a4aec18` and parent
report were also inspected. Its 30 runs use six seeds with four distinct
particle, timestep, radial and axial comparisons and a shared N32768/nr12/nz3/
100-ns reference. Only the advertised parameter changes in each pair. The report
correctly leaves transport unqualified, retains the unsupported sensitivity and
continuum-bias requirements, and does not treat incomplete batches as six-seed
certificates. Its maximum nominal work is 262.144 million, below 320 million
even with final-step rounding. This is a prospective protocol review, not an
assessment of confirmation results.

## Exact source and execution

Distinct copied Apple guest safe-dev-b213aef0038fb2d3, stage
/tmp/mass-spinner-transport33-performance-gates. The original source tree comes
from the previously preserved /tmp/mass-spinner-transport33-gates-final-export;
the current tree is copied separately. A 307-file map pins both trees, all probe
and runner bytes, locked dependencies and archived raw-summary inputs. Digests
are checked before and after tests. There are no host mounts or credential,
SSH-agent, home or control-socket forwarding. Only npm ci --ignore-scripts used
network; checks ran offline. Each subprocess has a 180-second cap.

Commands within safe-dev run, as retained by run.py:

```
TRANSPORT33_BACKEND=old node_modules/.bin/tsx --test scientific/transport-v33/gates-candidate/admission-probe.ts
node_modules/.bin/tsx --test scientific/transport-v33/gates-candidate/admission-probe.ts scientific/transport-v33/gates-candidate/exact-comparison.ts
node_modules/.bin/tsc --noEmit
```

Recorded process wall times: 0.7792, 1.5875 and 2.5149 seconds. Exit codes are
1 expected for the old admission boundary, then 0 and 0. The environment override
selects only the old validation function for the red compute-admission tests;
current provenance/summary checks are explicitly current-source checks in both.

Final tested production SHA256s:

| Module | SHA256 |
| --- | --- |
| coulomb.ts | 3ae1013f33a6b719451b5314817769fa0b81ab4b817a521f0880d94b55f44cfc |
| axisymmetric-collisions.ts | 2e2c1da25716aa2e7486b9962986878d23c8dc4e9b1f69949a43469babc820b0 |
| doublewell-dynamics.ts | f88bca34dfb4e9304d5167e6c516292a1d7f5149a506ad28db6bce59c99a5530 |
| convergence.ts | d7df4f83246b7d5057417385bb7a6d8c4a9d579d40fc056acf8942d564b99bd1 |

Final export: /tmp/mass-spinner-transport33-performance-gates-final-export.
Compact evidence and exact old/current module copies are retained separately at
scientific/transport-v33/gates-candidate. Parent owns final full build/tests,
fresh high-N trajectories, fixed-gate acceptance and deployment.
