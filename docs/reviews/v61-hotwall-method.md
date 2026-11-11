# Independent audit of the proposed v61 temporal controller

Status: source and method audit, 2026-11-09. This reviewer read the v60
joint-convergence report and `src/fuel-operation.ts`, `src/fuel-transport.ts`,
`src/fuel-gas-thermal.ts`, the v59 continuation tests and v51 independent
operation tests. No numerical execution or VM run was performed by this
reviewer. Numerical values below are reported v60 evidence, not new runs.

## Root cause and bounded scope

The operation path uses quadratic nominal time knots and additional
rotor-timescale knots. Neither construction estimates the thermal truncation
error. The implicit mixture solve can conserve species, angular momentum and
energy while damping the spatial thermal transient. Its nonlinear residual
tolerance is a solve-accuracy condition, not a timestep-error condition.

In ordinary terms, the current integration schedule checks rotation and
bookkeeping but does not check whether one heat-flow step is too long.

An opt-in temporal controller around the existing conservative backward-Euler
step is a defensible small change. It preserves the represented transport,
boundary resistance and deposition partition. Removing a physical resistance,
loosening the nonlinear solver, or interpreting good conservation as accuracy
would not address the demonstrated cause. Keep the existing default schedule
unchanged until a separately reviewed qualification establishes a replacement.

## Recommended algorithm

For a proposal of width h, start both trials from exactly the same accepted
canonical state. Compute one step of h and independently compute two steps
of h/2. Compare their endpoints. For first-order backward Euler, the usual
fine-trajectory error estimate divides the endpoint difference by
`2^1 - 1 = 1`. An accepted candidate uses the two-half-step trajectory.

Do not Richardson-extrapolate the canonical state. Extrapolation would combine
different nonlinear trajectories and their different mechanical numerical-loss
ledgers; positivity and the stepwise energy identities would then need new
proofs. Keeping the existing fine trajectory preserves those identities.

Retain both accepted half-step knots. Phases are endpoint quadratures:
`phase_next = phase_old + dt * omega_endpoint`. Energy and impulse ledgers
also belong to each accepted substep. Collapsing a pair into its final endpoint
would leave playback unable to represent the accepted midpoint and could make
reconstructed phase increments look inconsistent with the retained intervals.
The coarse trial must never enter checkpoints, snapshots or prefix maxima.

Use a maximum component error, with independently meaningful units:

- Gas temperature: normalize by an absolute temperature-error allowance plus
  a relative allowance times the local heating signal measured from the
  original gas temperature. A denominator based on 500 K absolute temperature
  can hide large relative heating errors. A positive absolute allowance is
  necessary before the heating signal turns on or when signed changes cancel.
- Ion and neutral speeds: absolute speed floor plus a relative allowance on
  the endpoint speed, consistent with the registered rotor metric.
- Solid temperature or enthalpy, species inventory/CDF changes, phase and
  signed heat/source ledgers: audit explicitly, or state clearly that their
  accuracy is assessed only through independent convergence comparisons.
  Conservation by itself is not an accuracy estimate for these quantities.

For an error estimate E, an ordinary bounded proposal is
`h_next = h * clamp(0.9 / sqrt(E), minFactor, maxFactor)`; the square root
comes from the O(h^2) local defect of a first-order method. E=0 needs an
explicit bounded-growth branch. Reject E>1 and repeat from the accepted start.
Local tolerance is not a rigorous global error bound: demonstrate its effect
against the registered common-time comparisons and tighten with margin.

## State, event and invariant requirements

The current `advance` mutates thermal state before its late ion-speed check.
Rollback must therefore restore state even when a trial throws. The complete
trial state comprises both species arrays, both angular momenta, gas cell
energies, solid cell energies, gas/solid mean temperatures, all mechanical
energy and impulse ledgers, both phases, Ohmic and cooling energies, and
maximum cell exponent/coupling iterations. Copy array ownership as well as
scalar values. Never retain a rejected trial's diagnostics in accepted maxima.

Separate a rejected accuracy estimate from a violated physical invariant.
Do not indiscriminately catch RangeError and retry forever: malformed inputs,
the 300–1900 K tungsten domain, and nonrelativistic speed boundaries must keep
their documented failure semantics. Each accepted midpoint and endpoint must
pass the existing species, mechanical/angular and thermal budget checks.

Clip proposals to the existing event and base-grid boundaries. The old current
acts up to a switch; the capture exactly at the switch is right-continuous
after `applyEvents`. Reset the proposal after switches and resumed starts.
Continuation must retain its canonical prefix, including older histories that
lack new controller metadata; new temporal control cannot retrospectively
qualify an interpolated or coarse retained prefix.

Bound attempted work and fail explicitly when the requested tolerance cannot
be achieved within the limit or below floating-point time resolution. Do not
accept the last trial merely because a rejection/step limit was reached.
Report actual accepted substeps and rejected proposals separately from the
public nominal interval count. Large accepted histories must avoid spreading
the whole history into function arguments, including the existing resume
prefix append path implicated as a separate limitation in v60.

## Qualification gates

1. Preserve the default path at identical requested inputs and retain its
   public `steps` meaning. The new mode must be explicit and serializable.
2. Test an actually rejected proposal and verify all accepted canonical
   arrays, ledgers, phases and diagnostics. Reconstruct phases from every
   retained endpoint and reconstruct drive/Ohmic integrals from current events.
3. Check exact event landing, zero-current coastdown, duplicate-knot avoidance,
   off-knot branching, duration extension, and a stale history without new
   metadata. Reject unsupported mode/input combinations explicitly.
4. Compare tighter temporal tolerances at identical physical observation times,
   including dense 0.1–1 microsecond observations and the later bulk transient.
   Use the same canonical common-annulus projection and active-signal masks as
   v60. Check rotor, temperature, local heating, instantaneous wall rate,
   signed cumulative wall heat and conserved budgets independently.
5. Repeat the spatial comparison. The v60 64-cell / 16,384-interval run still
   differed by 9.169% in local heating; temporal control on that mesh cannot
   be advertised as spatial qualification. The 256-cell candidate's 4.683%
   comparison has limited margin below 5%. Require a finer reference self-check
   and a tolerances/mesh combination with meaningful margin before promotion.
6. Retain the independent Robin Fourier-limit control. Numerical convergence
   of this reduced model does not validate the kinetic wall layer, prescribed
   transport coefficients or device accuracy.

These recommendations are an algorithm/design audit. Executed receipts and
final implementation review must be recorded separately before claiming that
the proposed controller meets any numerical qualification target.

## Agreed implementation contract and independent controls

The implementing reviewer selected explicit
`thermal.gas.accuracy = {relativeTolerance, temperatureToleranceK}`. Absent
accuracy preserves the old path. Accuracy selects 256 gas cells only when a
caller has not supplied its own mesh; explicit scientific `cells` and `steps`
remain authoritative. Result `timeControl` records the method, tolerances,
accepted pairs, rejected proposals and maximum accepted error ratio. The
maximum accepted error ratio must not include rejected proposals and must
remain at or below one. Resuming requires the same physical/thermal setup;
missing legacy result metadata does not erase canonical prefix state.

`tests/hotwall-adaptive-independent-v61.test.ts` was authored against that
contract. It derives a frozen-inertia switched-current rotor/phase oracle from
the two spectral projectors of the independent 2-by-2 ODE, reconstructs current
and squared-current integrals at every retained knot, reconstructs endpoint
phase quadratures, compares same-mesh hot-wall temporal refinements, requires
an actual rejected proposal, and exercises off-knot/stale-metadata continuation
and tampered derived-state rejection.

## Implementation source review and focused execution evidence

The reviewer subsequently traced `observe`, `retain`, `save`, `restore` and
the adaptive `advanceTo` path, plus `src/fuel-time-control.ts`. No blocking
rollback, event or phase defect was found in that source review. `save`
retains canonical array references rather than copying their elements. This
is safe for the traced kernels because they allocate their result arrays and
do not mutate old species, gas-energy or solid-energy inputs. That ownership
invariant is necessary if the kernels change later.

Coarse and fine trials share the same restored start. A rejected `continue`
executes `finally` and restores canonical state, all scalar ledgers and the
two resolution maxima. Domain errors propagate after restoration. Only the
accepted midpoint enters history inside the trial; the endpoint is retained
inside `advanceTo` or by the existing outer capture, exactly once. Event
endpoints are captured after the right-continuous current switch. Trial
thermal budgets are checked in `observe`; accepted mechanical and impulse
budgets remain checked by the terminal sweep of all retained checkpoints.

The reviewer directly inspected
`scientific/fixes-v43/hotwall61-focused.receipt.json` and its TAP log. The
offline parent-owned run executed the five named TypeScript test files,
including all four independent controls, with 14 passing tests, zero failed
or skipped tests, and exit code zero. The receipt records 633 inputs, source
SHA-256 `101528bdcfc32ba47831fd95509116c91c1878881e75194a6a2dffeffd4e6ea1`,
and source verification before and after execution. This confirms focused
checks at that snapshot; it does not establish the full numerical comparison
campaign or final required build/typecheck gates.

The later new `tests/hotwall-adaptive-entropy-v61.test.ts` contains independent
startup and current-switch controls on the actual adaptive whole-operation
path. It checks monatomic gas, tungsten and coolant entropy, the endpoint
face-production lower bound, and an independently reconstructed first law
at every accepted half-step. Its equations and roundoff tolerances follow the
v59 independent audit; it requires an actual rejected proposal.

The reviewer directly inspected the later
`scientific/fixes-v43/hotwall61-entropy.receipt.json` and log. Both entropy
controls passed with exit code zero against 638 verified inputs, source
SHA-256 `1b9e8f0c25ab975be470a0edb2c7264ebd727405069897f5d34828437411d549`.
The receipt records source verification before and after execution.

| Adaptive entropy control | Retained knots | Rejected proposals | Minimum entropy increment (J/K) | Minimum production-bound margin (J/K) | Maximum independent first-law residual (J) |
|---|---:|---:|---:|---:|---:|
| Startup | 629 | 5 | `1.7726001712953607e-8` | `-1.627782408210373e-13` | `3.821987293707932e-10` |
| Current switches | 891 | 14 | `1.772598782149719e-8` | `-4.101348328270911e-13` | `4.1162015506149285e-10` |

The tiny negative production-bound margins are within the unchanged,
enthalpy-storage roundoff allowance, rather than physical entropy decreases:
the separately measured entropy increments remain strictly positive. The
control reconstructs each actual half-step from adjacent retained canonical
states. It therefore also checks that rejected coarse trials do not
contaminate the accepted physical heat/entropy trajectory. This bounded
irreversibility result does not qualify its timestep accuracy.

## Independent external comparisons retain accuracy failures

The reviewer inspected `hotwall61-pilot-metrics` and
`hotwall61-tight-reference` receipts and logs. Their successful process exit
codes mean that the comparisons executed, not that the candidates passed.
The unchanged v60 reference/masks still reject the initial rtol `0.001`
candidate: maximum annulus temperature difference `0.4750092511 K`, local
heating difference `5.485402%`, and instantaneous wall-rate difference
`2.766554%`. Rotor and cumulative heat gates pass separately.

At rtol `2.5e-5`, the 128/256/512-cell runs have nearly identical maximum
temperature differences (`0.221089`, `0.221210`, `0.221267 K`) and wall-rate
differences around `1.3276%`. At 256 cells and rtol `6.25e-6`, temperature
still fails at `0.1068747497 K`, while wall rate passes at `0.650299%`.
These observed results reject promotion of those settings under the unchanged
`0.1 K` and `1%` gates. Their persistence across meshes supports bulk time
error as the dominant remaining demonstrated bias. It does not prove a
spatial error bound for all quantities.

Inference: in the tighter adaptive regime, quartering the local tolerance
approximately halves the observed global temperature error, as expected
when an O(h^2) local defect controls a first-order global method. Further
tightening is therefore a reasonable experiment, but its outcome must be
measured. No gate was loosened or successful finer candidate assumed during
that proposal; the later qualified results are recorded below.

## Demonstrated large-history plotting failure and bounded fix

The refined histories exposed a separate UI execution limit. The Drive & work
view groups six full accepted-history curves. `renderPlots` flattened their
finite coordinate pairs and passed all coordinates as individual arguments to
four `Math.min`/`Math.max` calls. With 32,000 points on each of six curves,
the production path throws `RangeError: Maximum call stack size exceeded`
at `src/laboratory.js:147`. This is a JavaScript call-argument limit rather
than failed integration or invalid physical data.

The reviewer authored `tests/large-history-plots-v61.test.ts` before changing
production code. The parent-owned VM reproduced the failure; the reviewer
directly checked the receipt and exact stack in `hotwall61-plot-before`.
It records exit code one against 641 verified inputs, source SHA-256
`aa296a75081eeb8a865c6c0fa5af554d35292628b7f7fb10421fe248bd96c534`.

The fix replaces only the four argument-expansion extrema calls with one
streaming loop using constant-arity `Math.min`/`Math.max`. It preserves the
existing finite-pair filtering, every plotted sample, exact extrema, explicit
domain overrides and equal-aspect transformation. This was selected over
decimating history, imposing a smaller integration budget or changing the
plot API because the numerical result is valid and only the reduction's
calling convention fails. The unchanged regression also checks all six path
sample counts, extrema coordinates and keyboard endpoint selection.

The reviewer subsequently inspected `hotwall61-ui-green` receipt and log.
All 44 tests passed, including the unchanged large-history regression,
responsive/equal-aspect and coordinate-fidelity checks, product plot checks,
fuel UI and chunked export checks. Exit code zero, 643 verified inputs,
source SHA-256
`a0c386a796aed15e50dc6e0d7fc6958fe5d2529a4394b16ae65224eec52e0373`.

## Large-history export and current qualified scope

The reviewer inspected the actual `hotwall61-export-size` receipt/log. The
qualified 256-cell startup retains 31,791 checkpoints. Their independently
serialized JSON content totals `1,408,211,301` bytes, exceeding the measured
single V8 string limit `536,870,888`. The old export constructed one string
before creating its Blob, so merely wrapping that string could not resolve
the limit. This size measurement passed execution checks against 640 verified
inputs, source SHA-256
`e4861889f9005957550dcc031055b9936debdf07183e69334390dd641fddd630`.

The reviewer traced the later fuel-specific `src/fuel-export.js` implementation.
It traverses only the plain-data export root, result and transport containers,
then serializes each checkpoint/snapshot into its own Blob before visiting
the next. Nested Blob assembly preserves the existing JSON schema, property
order and all accepted states without retaining the entire history as a JS
string. The two passing export regressions in `hotwall61-ui-green` check exact
native JSON bytes and ensure that neither a whole result/history nor multiple
pending state strings reach the serializer. This fixes the demonstrated
export-string boundary; it does not establish arbitrary memory capacity for
worker structured clones, pinned comparisons or future longer histories.

The reviewer directly inspected `hotwall61-focused-final` receipt/log: all
17 tests passed with no failed/skipped tests, exit code zero, 640 verified
inputs, source SHA-256
`50733d1cf3e3e5bbbddad6c7ee7c530b46219744b1b5672fdf6de908e273c778`.
The set includes adaptive duration extension, independent rotor/phase,
entropy, stale-prefix continuation, legacy continuation and actual UI policy
checks. The explicit UI refined policy is now 256 gas cells, relative
tolerance `6.25e-7` and temperature tolerance `1e-7 K`; legacy mode remains
unchanged.

The reviewer also inspected `hotwall61-qualified-analysis` receipt/log:
execution passed against 642 verified inputs, source SHA-256
`8fd5c702b8ae7923a7fa75d4151d73f7af2f64edb8cf9346aa7e6c9ed44d6507`.
All three assessed promoted-policy cases pass unchanged accuracy gates:
full one-second rotating startup, early rotating startup, and independent
Robin/Fourier control on the actual adaptive operation path. Ten failed
comparisons at other settings remain in the output. This is qualification
for those tested cases and finite-reference/oracle comparisons, rather than
an error guarantee for arbitrary sliders, current interventions or physical
wall models.

The first final gate attempt, `v44-final-adaptive61`, is not a release pass.
Its inspected receipt records 643 verified inputs, source SHA-256
`aae3553b38b69c47ae7a9a772939de65f9084785c9f102435d42fc2ebfe269c4`,
and exit code two. The log shows all 1,193 TypeScript tests passing, followed
by typecheck errors at `src/fuel-operation.ts:146` when narrowing an older
snapshot/checkpoint prefix before destructuring CDF fields. The runtime
continuation checks passing does not excuse that required gate. A corrected
snapshot and successful complete final gate remain necessary before release
approval; browser and deployment outcomes are outside this evidence review.

## Final-gate retries and emitted-worker harness lifetime

The source now casts the guarded snapshot prefix entry to
`FuelTransportSnapshot` before removing its plotting/CDF fields. This repairs
the TypeScript narrowing without changing the runtime prefix loop. The
reviewer inspected the next `v44-final-adaptive61b` receipt and log: 643
verified inputs, source SHA-256
`72b1820432ee1b5e45736105706a52731a7455eb1f8589351b19bff96f635a24`.
All 1,193 tests, typecheck, build, site, asset and generic emitted-worker
checks passed. The fuel-specific emitted-worker harness then exhausted the
Node heap (`Allocation failed - JavaScript heap out of memory`); the
overall receipt is exit code 250, not a final-gate pass.

The reviewer traced `scripts/verify-fuel-release-v44.mjs`. Its synchronous
fake `postMessage` originally appended every large reply to an array, even
though every assertion reads only `replies.at(-1)`. This retained all prior
test histories unnecessarily until the process ended. The minimal harness
fix clears that array before pushing the new reply. It preserves the same
requests, assertions, source digest checks and numerical thresholds. Explicit
local references used for continuation and prefix comparison remain valid;
clearing the container does not mutate their reply objects. No solver state,
worker protocol or browser behavior was changed to accommodate the harness.

The reviewer directly inspected `hotwall61-bundle-retry` receipt/log. The
narrow retry passed with exit code zero against 643 verified inputs, source
SHA-256
`6a0f84efa57cb2761c57976d1bb028b03ef9c12bdbb6b07fda1f50252ffaaba9`.
It executed the actual emitted worker `worker-6xuOxnyp.js`, SHA-256
`2f076345e1b9258d5229ccc584d09494f2a34b6f618dfb3d1f2255b72287f973`,
covering 144 base/transport cases, 20 operation cases, four solid-spatial
cases, ten mixture cases, two hot-wall cases, two adaptive cases, 49 operating
map cells and protocol/domain rejection. The adaptive cases exercise both
startup and off-knot current branching with the qualified policy.

This fixture uses object references for fake `postMessage`; it does not
execute browser structured cloning. Its passing retry therefore establishes
emitted-worker execution under the corrected harness lifetime, rather than
browser peak-memory capacity. A complete final gate on the corrected snapshot
and direct browser verification still remain necessary. The earlier typecheck
and heap failures remain recorded as negative evidence.

## Final C: scoped source and numerical approval

The reviewer directly inspected
`scientific/fixes-v43/v44-final-adaptive61c.receipt.json`, its log and the
final-gate command construction. The exact top-level command was
`python3 scripts/run-final-v44.py adaptive61c`, executed by the parent in the
existing offline safe-dev copy. It completed with exit code zero in
`374.949375174 s` against 643 verified inputs, source SHA-256
`6a0f84efa57cb2761c57976d1bb028b03ef9c12bdbb6b07fda1f50252ffaaba9`.
The inner receipt confirms source verification before and after every
command, rather than only once for the aggregate run.

All 19 recorded commands passed:

- `npm test`: 1,193 passed, zero failed/skipped.
- `npm run typecheck`, `npm run build`, `npm run check:site`, and
  `npm run check:assets`.
- Generic emitted-worker verification, fuel emitted-worker verification,
  and the recorded collision-data probe.
- Mixture studies, Fourier input emission, independent Fourier/FiPy
  comparison, and inherited hot-wall timestep studies.
- Nine independent adaptive-oracle Python tests; full, early and Robin
  adaptive campaigns; and their independent policy-gated joint analysis.
- Legacy wall-grid replay and exact common-time canonical-state identity
  with adaptive mode absent.

The full adaptive campaign also exercised the actual chunked export helper
on all 31,791 accepted transport checkpoints. It constructed and streamed
`1,413,979,084` bytes, checking both Blob size and independently accumulated
stream length without calling Blob.text or materializing a whole JSON string.
The resulting SHA-256 is
`b39a70aef724b30f5d7bf54ba8718534306c6753793e06500783bbcc142d0cb9`.
This is an actual oversized transport-history Blob smoke test in Node;
ordinary full export JSON byte/schema equality is covered by the separate
regressions. It is not evidence that a browser downloaded the file.

The final build contains 151 release files with manifest SHA-256
`b82f3a446ba61e3319d8f9149954fe262b2a920c8cb953287932554eb70626c3`.
The checked entry bundle is `assets/index-Bk-6Okfh.js`; the checked worker
remains `assets/worker-6xuOxnyp.js` with the digest recorded above.

Scoped approval: no unresolved correctness, conservation, tested-data
compatibility or numerical-target gap was found for the reviewed source and
the explicitly qualified startup/Fourier cases at this tested snapshot.
The required build/typecheck and meaningful regression/reference checks have
now passed. The local controller remains an estimate, tested numerical
qualification remains separate from physical validity, and the earlier
negative settings/final attempts remain part of the record. The receipt
explicitly records `browserVerified: false` and `calibratedMarathonDevice:
false`. Deployment, real browser structured-clone capacity, browser plot/
playback behavior and browser download outcome are not approved by this VM
evidence review and still require direct observation.

## Refined gzip export: independent source and narrow-gate review

After Final C, the parent reported direct deployed Refined execution and
large-history plotting/mobile success, followed by failure to observe a
download from the actual 1.4 GB raw JSON export. This reviewer has not
independently inspected those browser observations. The Final C Blob smoke
therefore remains valid as a VM construction/streaming result, while it does
not establish completion of the browser download flow.

The reviewer traced the replacement path in `src/fuel-export.js` and
`src/fuel-centrifuge-ui.js`. The root practical problem is the size and
synchronous preparation of the complete accepted history: splitting native
JSON into Blobs removes the JavaScript maximum-string boundary but still
hands the browser approximately 1.4 GB of raw output. In plain terms, a
successful in-memory file construction did not make that large file a usable
download. The new Refined path serializes the same ordered properties and
every accepted state through a native gzip stream. Interactive retains its
synchronous `.json` export. Refined downloads use `.json.gz`; decompression
must preserve the exact original JSON bytes. This narrowly changes the file
encoding without changing the data schema, scientific states or replay
history. It avoids the information loss and separate compatibility work
that decimation or a new persisted format would require.

No concrete correctness defect was found in the reviewed implementation.
Compressed output is drained concurrently with awaited input writes, so
TransformStream backpressure cannot depend on a reader that starts only
after writer closure. Serialization yields to a real browser task initially
and after each MiB of input, allowing preparation status and cancellation to
run. Only compressed byte chunks are retained; no complete raw Blob or JSON
string is assembled. The helper removes its AbortSignal listener and awaits
stream abort/cancel and the drain before releasing locks on failure. It
propagates serialization and codec errors instead of substituting a raw
download.

The UI captures the accepted object and revision before preparation. It
checks both, the AbortSignal and disposal immediately before creating the
download URL. Settings changes, a replacement run and disposal cancel the
old preparation; the finally block restores controls only while it still
owns the active preparation. Thus an older completion cannot enable a newer
pending export or download stale inputs. URLs are revoked on their timer,
the next export/invalidation, or disposal. The button reports preparation,
blocks duplicate export clicks and returns codec failures through the
existing status.

The reviewer directly inspected
`scientific/fixes-v43/hotwall61-gzip-focused.receipt.json` and its log. The
parent executed exactly `node --import tsx --test
tests/fuel-export-v61.test.ts tests/hotwall-adaptive-ui-v61.test.ts
tests/fuel-centrifuge-ui-v44.test.ts` in safe-dev. It passed 28/28 tests,
exit code zero, against 645 inputs with source SHA-256
`a0fd93669afa1385a8d364912dc9a9f7d36e33e317b0688fa39d737230e31119`,
verified before and after execution. The regressions cover native gzip UTF-8
byte identity, sparse/omitted JSON values, a zero-buffer transform that
requires concurrent draining, repeated real-task heartbeats, absence of an
uncompressed Blob, already-aborted signals, accepted-payload download and
filename, stale/disposed preparations and codec failure. The current UI
cancellation tests interrupt the initial task yield; they do not separately
exercise cancellation during a pending stream write. The reviewed source
handles that path, but this is a narrower executed claim.

The updated full-campaign source incrementally decompresses and hashes the
actual compressed history, requiring the exact Final C uncompressed digest
above and expected byte count. Its execution, the complete Final D gate and
an actual large browser gzip download remain pending at this audit point.
The source/numerical approval established by Final C remains scoped as
stated above; the new export path receives no broader completion claim from
the narrow tests alone. This reviewer executed no project code and made no
application changes during this follow-up.

## Gzip full-history identity and final focused follow-up

The reviewer directly inspected `hotwall61-gzip-full.receipt.json` and its
log. The parent ran `node --import tsx
scientific/hotwall-adaptive-v61/campaign.ts
/work/home/hotwall61-gzip-candidate candidate` in safe-dev. It passed with
exit code zero in `132.171374643 s`, against the same 645-input
`a0fd93669afa1385a8d364912dc9a9f7d36e33e317b0688fa39d737230e31119`
snapshot, verified before and after. The actual compressed file is
`486,798,118` bytes. Native streamed decompression produced exactly
`1,413,979,084` bytes with SHA-256
`b39a70aef724b30f5d7bf54ba8718534306c6753793e06500783bbcc142d0cb9`,
identical to Final C. All 31,791 accepted knots are present. The actual
operation still has 15,895 accepted pairs and seven rejections. This
establishes lossless compression of the oversized physical history without
materializing its whole text; it remains a VM test, not a browser download.

The parent then identified and corrected an adjacent status race. The
reviewer traced the real `animateGas` callback: every running frame writes
the ordinary closed-vessel status. Consequently a codec error written by
the asynchronous export catch could disappear on the next frame. In plain
terms, playback immediately covered the error message. The minimal fix,
inside the existing accepted-object/revision/abort/disposal guard, sets
`playing=false`, refreshes playback to remove the frame callback, and then
writes the export error. It pauses only the currently owned failed export
flow. This reuses the existing playback lifetime instead of adding a second
status-priority mechanism, changing the solver, or obscuring codec failure
with a raw-file fallback. No correctness or stale-owner defect was found in
that fix.

The final focused snapshot adds two meaningful regressions. A controlled
zero-buffer transform aborts while the second checkpoint write is pending;
the test requires AbortError, calls to both writer abort and reader cancel,
settlement of the pending write and no constructed Blob. A viewer fixture
uses the real registered playback callback around a codec failure and
requires the error to remain visible, the animation callback to be removed,
the Play button to reflect pause and the simulation request count to remain
one. The earlier pending-write cancellation evidence gap is therefore
closed by an executed test, rather than source reasoning alone.

The reviewer directly inspected
`hotwall61-gzip-final-focused.receipt.json` and its log. The same three-file
focused command recorded above passed 30/30 tests with exit code zero in
`5.062493169000001 s`. It tested 645 inputs at source SHA-256
`3e6c57102c97b52b88940dd99f7c694a6f62dd45b7ee222c23ee68b04849865f`,
verified before and after execution. This source differs from the earlier
full-history smoke by the focused cancellation regression and small
playback/error-status fix; the gzip serializer and numerical model are
unchanged. Final D and actual deployed gzip download remain pending. The
reviewer made no application changes and executed no project code.

## Final D: source, numerical and generated-release gates approved

The reviewer directly inspected
`scientific/fixes-v43/v44-final-adaptive61d.receipt.json`, its aggregate log
and `scripts/run-final-v44.py`. The parent ran exactly `python3
scripts/run-final-v44.py adaptive61d` in the existing offline safe-dev copy.
The command completed with exit code zero in `429.312552323 s`, against 645
verified inputs, source SHA-256
`3e6c57102c97b52b88940dd99f7c694a6f62dd45b7ee222c23ee68b04849865f`.
This is the same source snapshot as the final 30-test focused check above.
The inner receipt and runner enforce source identity before and after each
of the 19 commands; all 19 exit codes are zero.

The full `npm test` gate reports 1,200 passed, zero failed and zero skipped.
Required typecheck, build, site and assets checks passed. Both emitted-worker
checks, collision-data probe, inherited mixture/Fourier/FiPy and hot-wall
campaigns, ten independent adaptive-oracle Python tests, new full/early/Robin
campaigns, joint policy analysis, legacy replay and exact canonical legacy
state identity all passed. The joint analysis continues to record failing
coarser settings alongside the qualified cases; no threshold was relaxed to
convert a negative case into a pass.

Final D reran the actual complete-history gzip round trip. It again produced
`486,798,118` compressed bytes and exactly `1,413,979,084` decompressed bytes,
all 31,791 accepted knots, with SHA-256
`b39a70aef724b30f5d7bf54ba8718534306c6753793e06500783bbcc142d0cb9`.
The actual full trajectory retains the same 15,895 accepted pairs, seven
rejections and maximum accepted error ratio `0.8240305340642897`. Thus the
final source, including the small playback-status fix and new cancellation
regression, has passed the full lossless-history check rather than relying
only on the preceding snapshot's result.

The resulting release has 151 files with manifest SHA-256
`889256c3ef8ae80b934786f1dec45f4b5f1d9a06f39dd787d0245df11390a56d`.
The checked entry bundle is `assets/index-DcFujFEQ.js`, SHA-256
`e71c4979c271b51c7339428273fdc044c0c411e2271ab17fa7c2976bea2f0ee8`.
The numerical worker remains `assets/worker-6xuOxnyp.js`, SHA-256
`2f076345e1b9258d5229ccc584d09494f2a34b6f618dfb3d1f2255b72287f973`.

Scoped approval is extended to the reviewed Final D source and its generated
release gates: no unresolved correctness, security, tested-data
compatibility, conservation or tested numerical-target gap was found. The
required build/typecheck, regressions, numerical references and complete
gzip identity check have passed at the recorded snapshot. This is not a
claim of physical device calibration or universal slider-space accuracy.
The receipt explicitly records `browserVerified: false` and
`calibratedMarathonDevice: false`. Final D deployment and actual browser gzip
download are still outside this review's observed evidence and remain
pending. No project code was executed or application source changed by this
reviewer during this follow-up.

## Closeout — 2026-11-10

The reviewer inspected the actual Final D browser evidence under
`scientific/centrifuge-v44/adaptive61d/browser`: deployed entry
`index-DcFujFEQ.js`, accepted Model info, earliest-knot inspection, desktop and
320/390-pixel viewport records/screenshots, empty captured console log,
download observation and transfer receipt. The observed 1 s Refined run has
256 cells, 31,790 retained intervals, 15,895 pairs and seven rejections. An
actual CUA download event produced `487,617,620` bytes; the exact saved gzip
was transferred into the offline VM with SHA-256
`449703e8ff16c13881f5428a97a39ec5dee24d5c1092adebc1b6677613f8cb20`.
These records close the earlier browser/download-pending scope; historical
pending entries above describe their earlier evidence state.

The reviewer directly inspected `hotwall61-browser-export-audit-v2` receipt
and log: exit zero in `96.061035212 s`, 645 inputs, SHA-256
`4b8502fbfbf7e07496068c29a7e63b1c78db17cb4225cb163eeffbc60eb65904`,
verified before and after. The actual downloaded JSON was consumed through
EOF, with all 31,791 knots and all 40 producing-source files verified against
source hash
`a13a2f09e7316019a0cb3fb7b7f1241a179728c10ee347c47ec8a64d4c080270`.
Independent maximum residuals are species `5.3291e-15`, angular
`2.2842e-14`, mechanical `2.5924e-14` and thermal `1.0486e-13`. Canonical gas
fields, mass-weighted inertia, rotor state and accepted endpoint phase
quadratures also passed reconstruction.

The auditor's first failure was a parser integer-range limitation at a valid
large particle-rate value, not a solver failure. The inspected parser change
uses arbitrary-precision JSON integers and bounded-record Decimal-to-float
normalization; physical thresholds are unchanged. The exact large-integer,
plain/gzip and corruption/truncation/trailing-root regression passed at the
same snapshot. The reviewer also inspected `hotwall61-post-audit-final`:
all ten Python oracle tests, `npm run typecheck` and `npm run build` passed,
exit zero in `7.044142295 s`, with the same 645-input hash and before/after
verification. The emitted application entry remains `index-DcFujFEQ.js`.
Only auditor/test sources changed after Final D's 19-gate source snapshot;
the checked deployed application is unchanged.

Closeout approval covers the reviewed source/release gates, explicitly
qualified finite-reference cases, observed browser run/plots/responsive
viewport interaction, actual gzip download/transfer and reconstructed
accepted-data invariants. The browser-file audit explicitly does **not**
check solid enthalpy inversion or local heat-flux accuracy; independent
external studies supply the separate numerical accuracy evidence. These
conservation residuals do not establish continuum accuracy, arbitrary
slider/intervention qualification, physical transport coefficients or
Marathon device calibration. Viewport checks do not qualify phone hardware
memory/GPU capacity, and large Refined histories remain slow and
memory-intensive. No unresolved concrete correctness or claim-scope defect
was found within these stated bounds. The reviewer executed no project code
and edited only this review document during closeout.
