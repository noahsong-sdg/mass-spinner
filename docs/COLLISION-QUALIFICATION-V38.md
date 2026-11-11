# Browser collision envelope

8 November 2026. Restricted-domain experiment; no full transport qualification.

The live collision backend still has no independently supported continuum-bias
bound. More replicas or passing conservation diagnostics cannot supply one. This
change adds observable-specific live diagnostic status and a prospectively frozen
browser-resolution study, rather than transferring the high-resolution v34
research result to interactive settings.

## Root cause and fix

The executed path is `executeSeed → simulateDoublewell → collision cells →
sampled regime/exit ledgers → observeDoublewell → paired seed differences`.
The old convergence executor rejects alignment/orientation comparisons and its
continuum gate is deliberately UNKNOWN. Finite radial collision partners inject
raw angular torque; cold sparse outer cells can independently violate the
unmagnetized-encounter approximation. Numerically similar answers can share both
errors. Simply, several agreeing pictures do not prove the simulated transport.

`assessCollisionObservableEvidence` classifies each live observable from its
actual history, prescribed inputs and raw angular error. It recomputes the same
active-representative-time unresolved exposure as the convergence executor and
keeps the 1% exposure and 0.1% raw-angular budgets. Missing, stale, truncated or
undefined histories remain unresolved. A sampled physical-domain crossing wins
over a good exposure average. Collision-free orbits are classified separately.
Even passing diagnostics remain a single-realization preview; this API does not
accept archive-based certificates. This is preferable to a global green status,
which would incorrectly certify unrelated observables or numerical settings.

## Prospective experiment

`scientific/collision-v38/protocol.json` was written before the first physical
run. It fixes six paired Philox seeds, eleven levels, the complete 200 µs pulse,
N≤4096, interactive admission, a 90 s per-run cap, 1200 s campaign cap and one
worker. Every terminal outcome is retained; there is no seed replacement or
passing-subset selection. All existing v34 numeric gates remain unchanged.
Protocol SHA256 is `6e15c6c87a676604221542af86f40d54ca195c6a1f02f5791a8945e089fb0fe4`;
the canonical executed-map identity is
`7f9b350e8e0c8e573e521f245a061ae4f0016c12375420df3781f723c0324c24`.

The physical pulse is the v34 case with explicitly prescribed electron
temperature 0.5 eV instead of 5 eV. Lowering this input reduces electron Debye
length by √10 at a fixed state; it does not replace electron screening with
equilibrium-ion screening or prove this prescribed temperature is experimentally
maintained. The study is a restricted conceptual case, not a new default.
In this backend Te affects these screening/domain diagnostics, while the
collision operator uses the separately imposed logΛ=10. Thus this restriction
does not alter ion trajectories through a solved electron response or justify
holding either input fixed in a real machine.

The joint ladder is (N,r,z,dt)=(1024,3,1,200 ns), (2048,4,2,100 ns),
(4096,6,3,50 ns). Independent particle, timestep and spatial comparisons share
the finest corner. Additional levels turn collisions off, shift only radial
or axial interior lattice faces by half a spacing, or rotate the entire realized
initial position/velocity ensemble by 0.37 or 1.21 radians. Source interfaces,
endpoints, total column volume, representative weights, random draw counts and
particle ordering remain fixed. Individual full annular cell volumes are
recomputed from their new faces. Phase shifting changes the executed geometry.
The shifted lattice is clipped at the fixed domain endpoints: half phase has
one additional boundary bin before source-face insertion. Alignment therefore
tests boundary partition/cell-count sensitivity as well as face placement at
fixed nominal spacing; it is not a comparison at identical executed cell count.
Every raw result saves actual radial/axial faces, nominal counts and maximum
executed widths in `spatialCollision`; those arrays, rather than an ID's nominal
counts, define the numerical geometry.

The phase/rotation settings exist **only in a generated research copy**. The
production initializer, pusher, collision law and public configuration remain
unchanged. `prepare.py` records both original and executed source maps; the
existing source-verifying runner checks every execution input before and after
each run. Readout checks actual configuration, seed, execution mode, random
source and map identity. The patch is reproducible from original source plus
`prepare.py`; exported originals and executed sources preserve exact bytes.

Statistical decisions use the existing `seedInterval` and `equivalence`, with
the same pointwise approximate Student-t interpretation. Undefined populations
and differences without resolved sampling spread remain UNKNOWN. Metamorphic
orientation covariance is reported separately; it cannot override that rule.
Joint increments and matched on/off differences are empirical evidence, not a
justified all-finer-resolution saturation assumption or continuum remainder.

## Independent readout correction

Peer review found a real eligibility race in the frozen intermediate readout:
it globbed complete gzip files without checking the terminal execution ledger.
A timed-out process could have written its artifact just before being killed.
Its effect calculation also selected the first duplicate with `.find()`, unlike
the refinement path's uniqueness check. Simply, a result file alone did not
prove its run completed successfully or was unique.

The mapped intermediate is preserved unchanged. Separate `reconcile.py` checks
the exact protocol SHA and complete level×seed terminal matrix, then admits only
unique, complete, exit-zero artifacts with matching config/source/RNG/mode.
Timeouts, errors, duplicates and budget-missing cases remain explicit terminal
rows with unavailable evidence. Any incomplete paired batch suppresses that
comparison/effect entirely. This fixes the ownership boundary without deleting
failed data or changing the prospectively frozen physical acceptance rules.
Source and regression checks reject boolean stand-ins for integer seeds/exit
codes and stale pre-change configurations. The authoritative report is
`reconciled-readout.json`, not the frozen `readout.json` intermediate.

## Retained cold-tail witness

An independent 50-digit Decimal reconstruction uses explicit unordered velocity
pairs instead of the production central-moment formula. The five retained v34
warning cells reproduce their encounter proxies, and all remain above 0.1.
Their stored velocities are already cylindrical. This rechecks arithmetic and
the finite sample, not continuum magnetization, independent particle statistics
or unsampled trajectories. The cold tail cannot be repaired by another Bessel
factor, a velocity floor, subtracting torque, or changing the screening model
without new physical justification.

## Verification and results

Execution uses only copied Apple safe-dev guest `safe-dev-f6cc18c484d94d28`,
stage `/tmp/mass-spinner-collision-v38-20261108`. Dependency installation used
`npm ci --ignore-scripts --no-audit --no-fund` once online; subsequent copies
used the isolated npm cache offline. No host project scripts were executed.

Before physical runs: `node --import tsx --test tests/observable-evidence.test.ts`
passed five tests, including stale/missing histories, stale duration, unchanged
thresholds, physical-domain precedence and no inherited archived qualification.
After research preparation: `node --import tsx --test
scientific/collision-v38/instrumentation.test.ts` passed three tests: exact
whole-result legacy equivalence, shifted-grid positive volumes/inventory, and
rotation covariance. `python3 scientific/collision-v38/cold_tail.py` exited 0,
reconstructing five of five domain failures. One attempted concurrent diagnostic
launch was rejected by the safe-dev lock before execution; the check then ran
sequentially. This infrastructure rejection is not a physical replicate.

The full campaign completed **66/66 runs in 1040.261 s**, within the unchanged
1200 s cap. Terminal reconciliation admitted exactly 66 unique complete,
exit-zero cases. The authoritative results do **not** find a qualified browser
collision-transport envelope in this candidate:

- None of the 60 collisional runs has a resolved sampled domain crossing.
- **59/60** exceed 1% unresolved representative-time exposure.
- **28/60** exceed 0.1% maximum saved raw angular-momentum error.
- The 540 existing numerical/sensitivity decisions are **275 PASS, 0 FAIL,
  265 UNKNOWN**. Absence of a FAIL is not equivalence; wide intervals and
  no-resolved-spread observations remain UNKNOWN.
- No continuum-bias bound was supplied, so continuum qualification is UNKNOWN.

| Level | N/species; nominal r×z; dt | Unresolved exposure across seeds | Worst raw angular error |
| --- | --- | --- | --- |
| joint0 | 1024; 3×1; 200 ns | 2.029–3.194% | 0.247458% |
| joint1 | 2048; 4×2; 100 ns | 1.201–1.802% | 0.171435% |
| joint2 | 4096; 6×3; 50 ns | 1.775–2.432% | 0.128974% |
| particle | 2048; 6×3; 50 ns | 2.628–4.099% | 0.115558% |
| time | 4096; 6×3; 100 ns | 1.825–2.537% | 0.093064% |
| space | 4096; 4×2; 50 ns | 0.748–1.503% | 0.143168% |

These measured results expose the unresolved sampling/locality tradeoff:
increasing representation at a fixed fine mesh reduces the sampled unresolved
fraction, while coarsening the mesh improves occupancy but leaves every spatial
coarse run above the raw torque budget. This supports further method work; it
does not demonstrate that any other browser parameter domain must fail. Smaller
time steps alone cannot supply missing local representatives or a continuum
bias certificate. Stochastic raw-error maxima need not decrease for each seed.

The matched on/off empirical A end-collection difference is
−0.0104980 ± 0.0029077 (approximate pointwise 95% interval, six paired runs).
It is an observed model difference, not qualified physical collector accuracy:
the sampled coverage and numerical qualification gaps above still apply.
The two orientation comparisons each retain 48 UNKNOWN and 12 PASS decisions;
the covariance test does not turn deterministic discrete outcomes into
statistical tail bounds.

The five new terminal-ledger regressions passed. The exact strict module check
`tsc --noEmit --strict --target ES2022 --module NodeNext --moduleResolution
NodeNext src/observable-evidence.ts` exited 0. Frozen readout and authoritative
reconciliation both exited 0. Runtime: Node 22.23.4, Python 3.11.2, Linux aarch64.
The parent runs the final repository suite/typecheck/build/assets on the merged
snapshot; these narrow checks do not claim that final gate or deployed visuals.

All **212 evidence-file hashes** passed host verification after copying the
reviewed export into `scientific/collision-v38/execution`. The artifact manifest
SHA256 is `553628eab04812b2760ff7bff1b7fab0a45bc456c44cb00f878e3c4b23c5bfed`.
`frozen-inputs.tar.gz` holds the exact already-instrumented source, original
source, locks, protocol, scripts and synthetic tests. To replay physical runs
from that snapshot, install the locked dependencies in a copied VM and run
`python3 scientific/collision-v38/run.py`; do not apply `prepare.py` a second
time to its already-instrumented source.

The compact public packet is `web-assets/convergence/browser-v38.summary.json`
(21,663 bytes), SHA256
`c7714ee9f4a9746d27b14198ec7877104295c8797f45c76faa3beb1077e902f2`.
It includes actual terminal accounting, source/protocol identity, geometry,
settings, unchanged gate counts and explicit unqualified status. It is generated
only from sealed reconciled inputs by `public_packet.py`. Live status continues
to use the current actual result, never this historical packet as a certificate.

## Independent disposition

A separate reviewer accepted provenance and terminal reconciliation, while
rejecting browser-envelope qualification. In its own safe-dev VM it verified
all 212 manifest files and source identities, exact 66-case seed/config/mode/
Philox/full-horizon membership, and independently reconstructed raw observables
from impact/history/density ledgers. Every exposure, raw-angular diagnostic,
paired interval and effect matched. It reproduced 59/60, 28/60, zero crossings,
275 PASS and 265 UNKNOWN. All 60 collisional live classifications are adverse:
28 budget-exceeded and 32 unresolved; six collision-off controls are ideal-orbit.

Its three new adversarial terminal-reconciliation tests and the five producer
tests passed independently. Executed geometry is 7×4 cells at the finest corner,
8×4 after radial phase and 7×5 after axial phase, including source interfaces.
The reviewer's final file export initially encountered host disk pressure; its
verified stdout and earlier exports remained preserved. No acceptance claim is
being substituted for those negative scientific results.
