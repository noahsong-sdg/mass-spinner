# Coupled playground sensitivity

## Missing behavior and traced path

The playground mounted a retrospective argon benchmark in `fuel-qualification-ui`
but offered no dynamic coefficient sensitivity or indication whether current
inputs match the historical numerical campaign. `setupFuelCentrifuge` reads
controls, sends an identified worker request and accepts it only for the current
revision. The worker calls `simulateFuelCentrifuge`, then `simulateFuelOperation`.
The accepted coupled checkpoints drive `sampleFuelTransport` and the 3D scene.
Consequently an analytical uniform-inertia parameter scan would not describe
the current coupled trajectory. The missing behavior was a presentation and
execution gap, not evidence that any particular transport coefficient was wrong.

## Smallest coherent change

`public-sensitivity.ts` constructs lower/current/upper settings for one explicitly
user-chosen prescribed coefficient: wall drag, ion–neutral collision rate or
perpendicular conductivity. Initial bounds equal the current assumption. No
measured uncertainty distribution or source-supported interval is invented.

The optional disclosure in `public-sensitivity-ui.js` runs those distinct samples
sequentially through the actual existing worker with `includeTransport:true`.
The accepted configuration, thermal closure and drive-event history are retained;
each alternative starts from rest. No previous trajectory is reused as an
alternative coefficient's initial condition. Shared physical clocks sample gas
speed, inner-inventory fraction and gas temperature from the coupled backend.
The center line is the current coefficient; shading joins the minimum/maximum
of the sampled settings. This is explicitly not an exhaustive envelope, joint
parameter bound, confidence band or experimental qualification.

Each full worker result is reduced to small observable records before requesting
the next. The accepted parent result is referenced without duplicating its full
checkpoints. Work starts only after an explicit Run action. Edits invalidate
samples immediately, including while the parent retains the previous 3D result.
Closing, cancellation, navigation away and disposal abort active work; partial
ranges and late replies are discarded. Mismatched code identity, configuration,
history, truncated trajectory or invalid observable refuses the sample entirely.

Input coverage compares the frozen V97 setup and its three isothermal lithium
currents (0.015/0.03/0.06 A), no drive events, 64 cells and 512 nominal intervals.
Only floating representation roundoff is tolerated. This is labelled a historical
input match, never current-code qualification or qualification of nearby sliders.
All numerical and experimental qualification fields remain negative.

This approach reuses the live solver and its observation operator. It avoids
introducing a second rotor model, invented uncertainty priors, automatically
launching heavy ensembles or presenting prescribed parameters as measurements.
Coefficient samples remain conditional: discharge kinetics and correlated
transport closure are still absent.

## Verification contract

Added `tests/public-sensitivity.test.ts` and
`tests/public-sensitivity-ui.test.ts`. They cover frozen-node boundaries,
floating roundtrips, thermal/history mismatch, unsupported and nonphysical bounds,
actual canonical coupled sampling, source mismatch, incomplete histories,
sequential worker requests, no qualification promotion, stale edits, late
responses, cancellation, parent navigation/disposal and no partial plotted range.

No tests or scientific modules were executed on the host by the implementing
agent. The coordinator must run the targeted tests, adjacent fuel UI suites,
typecheck and production build in the isolated environment and append exact
results to the campaign record. Passing these tests establishes plumbing and
invariants; it does not validate any sensitivity interval against experiments.

## Executed checks

The initial integrated candidate passed 1,356 tests. After final schema/initial-
current identity and evidence-link additions, all 11 sensitivity tests passed,
as did typecheck, production build and site-resource checks. Independent review
found no remaining blocker in cancellation, disposal, stale-result invalidation
or scientific scope labels. Browser receipts and final full-suite results are
recorded in the campaign RUN.md.

The live browser found that navigation to the raw Markdown report was blocked
by the client. The publisher now emits normal HTML from the same reviewed source
using pinned build-only Marked, copies the comparison PNG, and resolves evidence
links to the public source branch. This avoids both a custom partial Markdown
parser and duplicate prose. The client does not identify its blocking layer;
no browser security setting was changed. `tests/qualification-page.test.ts`
covers actual report rendering and link/image targets. Independent source review
found no blocker within this trusted-repository input scope.
