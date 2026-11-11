# Marathon coupled-target interface, v35

## Execution path and requirement

The previous `main → source → exposure/loading` path updated two independent
reference panels. `workspace-ui` moved both panels into the same Target window,
but moving their DOM did not give them a common evolving target state. In
simple terms, two separate calculations occupied the same window and could not
describe one selected instant in the target's evolution.

The new `setupCoupledTarget` owns one result and selected saved snapshot. Its
source update requests `simulateCoupledTarget` through the existing cancellable
worker client; the current neutron output,
cell-average temperatures, isotope plots, balances and exported selected time
all come from that same result. The root integration keeps the historical
exposure/loading nodes in the returned `referenceHost`, inside one collapsed
References disclosure. Existing source controls and reference calculations
retain their own contracts.

## Visible behavior

- Dynamics, Depth and Settings are keyboard-accessible tabs. Only one target
  view is visible, while the reactor remains the full-window scene behind it.
- The time slider selects actual saved states, including pulse edges, shutoff
  and cooldown. Its callback provides `{result,state}` to downstream scene and
  neutron calculations. A cooldown snapshot displays zero current production;
  cumulative neutron production remains distinct.
- Dynamics offers source/temperature, isotope and energy plots. Depth displays
  cell-average temperature and film isotope fractions. Its Film / Film & backing
  selector keeps the micrometre film legible alongside a millimetre backing.
  The hottest film cell is not labeled a resolved surface hotspot.
- Operating controls stay compact; thermal properties, material-transport
  coefficients and numerics live in separate disclosures. The Scenario badge
  and Model info preserve the assumptions without repeating explanatory prose
  throughout the main interface. Default diffusion, release and renewal remain
  zero; the UI does not invent measured LiT rates or implantation ranges.
- The single existing source-duration slider mounts in `durationHost`.
  Formula-unit column comes from the explicit material source control; there
  is no second hidden material column or duplicate exposure control.

Coupled calculation requires the explicit Geant4-derived material source mode.
Legacy linear mode shows **Use material model**, invoking the root's source
selector action. It does not silently reinterpret a linear-stopping scenario.

Changing the source or a setting invalidates the previous result immediately:
plots, selected metrics and balances clear, export disables, downstream
observers receive `null`, and the pending timer is canceled. A 250 ms debounce
coalesces slider input. An active calculation's worker is terminated when an
input changes. Successful recalculation starts selection at the initial
snapshot; invalid settings remain visible for correction and do not mutate the
source or historical reference controls. Empty numeric coefficients produce
NaN via `valueAsNumber` and reject, rather than silently becoming zero.

This approach preserves the existing floating-window system and plot renderer.
It was chosen over an unrelated dashboard/layout rewrite or duplicated controls;
the required change is shared state and focused navigation.

## Computation and protocol

The first synchronous interface passed its seven tests, but isolated CPU
measurements took 288 ms for the default example, 691 ms after refinement, and
584 ms with assumed release. Technically, the solver ran on the event loop;
in plain terms, each update could stop controls responding. Debounce reduced
how often this happened, but did not make a calculation interruptible.

The fix reuses the existing one-worker-per-request client and adds one explicit
`coupled-target` request variant. Abort terminates that worker; a UI revision
guard also rejects stale success/error callbacks, including an injected client
that ignores abort. There is no synchronous fallback. Worker failure remains
visible and a later input retries. This avoids a second worker abstraction and
keeps the existing collision/orbit protocol behavior unchanged.

Only the new request enforces its versioned envelope: a nonnegative safe-integer
ID, `kind: 'coupled-target'`, and `schemaVersion: 1`. The client checks all three
on the response. Previously the generic helper discarded response metadata;
simply comparing a result's shape would not prove that it answered this request.
The narrow protocol guard enforces this real identity boundary without changing
legacy reply requirements.

## Recorded references

The optional `implantationReference` argument accepts the corrected INTERPOLATED
recorded half-space dataset under References. The histogram retains fractions
per incident ion, and displays reflected, beyond-histogram and unclassified
fractions. The disclosure retains the upstream numerical smoke mismatch.
It is an uncalibrated LiT scenario, not a finite-film retention law, and does not
supply live implantation weights or replace the assumed uniform profile.
Old loading/exposure observers remain available in `referenceHost`.

## Verification status

Ten actual-handler JSDOM tests exercise explicit mode selection, keyboard
navigation and native hidden state, source invalidation/recovery, selected
cooldown states, local errors, physical slider readouts, superseded source
updates, full JSON export, asynchronous stale/error handling, and recorded
half-space reference separation. Four new worker tests cover response identity,
abort/error/post failure cleanup, and the actual production handler in a Node
thread. Two existing client lifecycle tests remain in the same narrow gate.
The Node bridge uses `tsx`'s `tsImport` to load the production handler; this is
a test adaptation, not browser execution or a production fallback.

The first isolated snapshot passed five tests
and failed two: a zero-current core error and an unnecessarily strict one-ULP
slider comparison. The core failure was sent to its owner with a direct
simulation reproduction; the slider check now uses a 1e-14 relative arithmetic
tolerance. The initial source and log remain in
`/tmp/mass-spinner-marathon35-ui-first-export`.

The first async snapshot captured a core edit with a `d2` temporal-dead-zone
error, plus a Node bridge import-resolution error. Both failures were retained;
the core owner fixed the first, and explicit `tsImport` fixed the second. A
subsequent snapshot passed all 15 then-current tests and strict TypeScript.
The final reference regression snapshot is recorded below. These are interface
and execution-path checks, not an independent validation of material physics.

Final isolated checks passed:

```
node --import tsx --test tests/marathon35-ui.test.ts tests/marathon35-worker.test.ts tests/worker-client.test.ts
# 16 tests, 16 pass, 0 fail (10.98 s)
./node_modules/.bin/tsc --noEmit
# exit 0 (1.60 s)
```

The wrapper verified all 90 input SHA-256 hashes before and after execution.
The exact input-map SHA-256 is
`be4d7829d0a30f6ddf19fdef5b5fc2a890db4457e7c2b5459a62a590b0523f97`.
The tested core SHA-256 is
`d5d3028a87f57832a0e9aa2612e927017b99d9aac0a2c0386b4cbe1a17f26b2e`.
It precedes the separate pending backing/interface refinement; the root's final
integration gate must rebase onto that change. The required whole-application
build and typecheck belong to that final integration gate, rather than being
claimed from these narrow UI checks.

Source, tests, manifests and raw logs are preserved in
`scientific/marathon-v35/ui/final/` and exported to
`/tmp/mass-spinner-marathon35-ui-final-export`. Earlier failure snapshots and
the measured synchronous timings remain in the sibling `first`,
`synchronous-intermediate`, `async-first` and `async-green` leaves. The final
leaf's `SHA256.json` seals every artifact other than the seal itself.

Owned final source hashes:

| File | SHA-256 |
| --- | --- |
| `src/coupled-target-ui.js` | `3e6f6759bd6d489d5a6f65b25b37e9bf9699b99af71054f3a54f98fb80ffe6bc` |
| `src/coupled-target.css` | `2aa06bf33aa75529598517af1d4941c66207e42009f94a2fdb2f2cca7a191c00` |
| `src/worker.ts` | `7ee82d9804f73576c33a39d78bb5fa2c38bc26a2c8ebc4f510ea5e7477667f6e` |
| `src/worker-client.ts` | `e5e57ae51508e0be57a865027a76c24183d1ecbbe28a635b564e948552aeaa35` |

JSDOM and
stylesheet assertions do not establish a deployed browser, GPU or mobile visual
result. The managed origin-policy denial remains a separate blocker; this work
does not attempt alternate browser routes, CDP or indirect site access.

## Display-only half-space follow-up

The frozen reference histogram covers 0–4 µm, while the recorded 500 keV scenario
has mean deposited depth near 7.2 µm. Always rendering the validation grid hid
that case's depth distribution, even though the explicit beyond-grid fraction
preserved its accounting. In simple terms, the chart stopped before the ions
stopped.

The renderer now uses optional `displayDepthEdgesM` and
`case.displayPerIncidentDepthFractions` when both exist. It labels this an
extended display only, retains `beyondHistogramFraction` as **beyond validation
grid**, and separately reports `beyondDisplayHistogramFraction` as **beyond
display**. Original-format records still use their original grid. This scoped
display selection preserves the predeclared sampling gates and incident-ion
denominator; replacing the validation grid or renormalizing the visible bins
would change the evidence being shown.

A new fixture regression checks the longer plot, both distinct tails, unchanged
source data and absent live implantation weights; the original-format regression
remains. On the same pinned core as above, the same three-file test command
passed **17/17** and `tsc --noEmit` exited 0. The 90-file before/after input-map
SHA-256 is `a7580a4f0d4fbb372b88bc318f65b52cb14dc432efa0486981ba589db2c01ef3`.
The separate `scientific/marathon-v35/ui/display-followup/` seal preserves this
follow-up; none of the earlier sealed artifacts were changed. Its fixture
tests exercise the optional schema, while the material owner's corrected raw
data and root's final rebased integration checks remain separate evidence.
