# Coupled rotor release v48

## What changed and why

**Separation now changes the rotor.** Previously the radial solver reported the changing neutral second moment while obtaining angular speed from the fixed-inertia analytic rotor. Gas could move outward without becoming harder to spin. The coupled backend now advances both rotor angular momenta, computes neutral inertia from mass-weighted cell inventories, and derives speed as `Ω=L/I`. Reciprocal friction cancels from the total angular impulse budget; wall drag scales with current inertia at the prescribed drag frequency. This incorporates the missing `−Ω dI/dt` acceleration term directly through a conserved variable. It avoids a separately differenced inertia derivative and preserves the existing positive, conservative radial discretization. [Derivation and limitations](COUPLED-ROTOR-V48.md).

**The nonlinear solve cannot manufacture an angular impulse.** Independent review caught that computing final momentum as `I × root speed` would accumulate the scalar root's finite residual as a small fictitious torque. The endpoint momenta now come from the implicit torque equations, then speed comes from momentum divided by inertia. Tightening the root tolerance alone would still accumulate this error; renormalizing momentum afterward would hide it. The root still controls consistency of the endpoint speed with radial fluxes.

**The root bracket respects accepted inventory roundoff.** Probability sums are accepted within a finite floating-point tolerance, but an initial bracket assumed their sum was exactly one. A concentrated valid state just below one could therefore be rejected. The lower inertia bound now uses the actual mass-weighted inventory sums. A concentrated, zero-diffusion regression checks preservation without clipping or renormalization.

**One coupled history drives the visuals.** Motion, radial probes and time plots previously called the fixed-inertia trajectory independently. Both coupled motion modes now sample transported inventories and angular momenta from the accepted run, including interpolated times. Pinned comparisons retain their own immutable histories. New gas-inertia and angular-momentum plots, and the revised mechanical-work ledger, expose the feedback. Uniform-inertia equilibrium, pump, cascade and operating-map calculations retain explicit reference labels. Sharing the accepted state avoids creating a second display-only physics model.

**Mobile comparisons keep both model centers visible.** Live verification found the playback bar crossed the lower model in stacked comparisons. The mobile CSS split the canvases into two rows but retained the whole-stage bottom anchor for the bar. The comparison-only mobile rule now centers the wrapping bar on the row seam. Its own height determines the offset; no JavaScript measurement or device-specific pixel constant is needed. Single-model and desktop placement retain their previous behavior. [Regression procedure](reviews/v48-mobile-regression.md).

## Independent qualification

Three independent reviewers contributed physics, numerical and integration audits, separate from the implementation agent. Root executed their authored tests in the existing offline safe-dev guest; reviewers inspected the actual logs and receipts rather than claiming their own execution.

The initial narrow batch passed 76/77 tests. The failed joint study halved both cell width and timestep despite the spatial error being second order and backward Euler being first order in time. Opposite signed rotor errors happened to cancel in the coarsest case. Separate spatial/time studies demonstrated the cancellation, and a balanced `dt∝h²` joint refinement converged. The original failure remains recorded; no production solver change or relaxed accuracy bound was used to pass this discriminator.

| Independent study | Successive combined errors |
| --- | --- |
| Direct face-flux RK4 time reference | 0.00402515, 0.00201632, 0.00100909 |
| Fixed-inertia analytic limit | 0.00671309, 0.00337096, 0.00168910 |
| Spatial refinement at fixed small timestep | 0.00137753, 0.000327690, 0.0000655393 |
| Temporal refinement at fixed radial grid | 0.00198238, 0.000976341, 0.000472637 |
| Balanced joint space/time refinement | 0.000616555, 0.000147588, 0.0000295446 |

The dimensionless combined error is the sum of both species' distribution L1 errors and both rotor speeds' relative errors. Grid studies use a finer numerical reference, not an experimental truth. The tests retain the 2% finest combined-error bound and refinement-ratio gates. Other checks cover mass and positivity, exact torque-free angular momentum with slowdown, signed reversal, stiff friction, undriven rotational-plus-mixture free energy, mechanical work, interpolation, absent species and rest/zero-duration limits.

Audits: [physics](reviews/v48-coupled-physics.md), [numerics](reviews/v48-coupled-numerics.md), [integration](reviews/v48-coupled-integration.md).

## Expected deployed values

Default configuration, lithium pair, 1 second, all other inputs unchanged:

| Current | Neutral wall speed | Neutral inertia / initial | Fixed-inertia reference speed |
| --- | --- | --- | --- |
| 0.03 A | 1024.043 m/s | 1.140896 | 1168.376 m/s |
| 0.06 A | 1710.611 m/s | 1.366745 | 2336.751 m/s |

At 0.5 seconds in the default case, gas speed is 789.415 m/s and inertia ratio is 1.078316. Endpoint studies on the tested guest snapshot have maximum normalized momentum and mechanical-ledger residuals below `4×10⁻¹⁵` in these two cases. Such algebraic closure is distinct from discretization accuracy. Small browser/guest differences at machine precision are expected.

## Final release and live verification

The final `coupled48b` candidate passed **1021/1021 tests**, no skips or cancellations. Exact final commands in the offline guest were `npm test`, `npm run typecheck`, `npm run build`, `npm run check:site`, `npm run check:assets`, `node --import tsx scientific/fixes-v43/verify-release-worker.mjs`, `node --import tsx scripts/verify-fuel-release-v44.mjs`, and `python3 docs/reviews/v42-collision-data-probe.py`. Every command exited zero; the source manifest was verified before and after each. The bundled fuel worker passed 144 cases with coupled transport, 49 operating-map cells and invalid-input/protocol rejection. The collision-data command only rechecks saved evidence and does not change that research's qualification.

- Tested source: 528 manifest entries; SHA-256 `014e23bc52a1008a636e27973b956004ca31a7867b50528b81034bb1f83137d7`.
- Exact checked release: 150 files; aggregate SHA-256 `e7939f150d2ca2285c4bb4c29b3e1f15b7852c00d83752c69f6b693afc63695c`.
- Physics worker bytes: `bf92a7dfbb132e95a21a0c530d63228154ac90017ff24db1a94e3ac2b056338d`; producing-code identity `fc5bf33e2386c250a87d51cea9365eb49ac9ecaa2821b9a49b88bc3e1a182eb6`.
- Cloudflare version: `0b94d871-fe2d-4507-b09b-e9c678bc9374`, provider verified at 100% traffic. Live entry: `/assets/index-yLOg-eXd.js`.

Root verified the [public site](https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/?level=2) in the actual Brave GPU browser through CUA, with no alternate automation bypass. The first candidate verified native section picking and changing density/speed at the same radius, default and doubled-current numerical endpoints, zero current, half-second interpolation, coupled spin playback, all twelve plot selections, work/impulse curves, and immutable A/B histories. The final candidate changes only comparison CSS; reviewers verified that physics and numerical tests are byte-identical. Final live checks again covered all twelve plots, the current change, pinned inertia curves, shared Home/End time, and responsive layout. No warning/error console entries were returned for the final loaded page.

The mobile regression now passes at 320×740 and 390×740 in both coupled modes: the bar center coincides with the row seam, both canvas centers lie outside it, all playback controls remain on screen, and horizontal page overflow is absent. The 601px breakpoint retains side-by-side full-height canvases; clearing A restores one full-height canvas and ordinary bottom placement. Native panel scrolling reaches the entire selector, metrics, legend, axes and readout; a partly cropped legend in an earlier focused-SVG screenshot was a scroll offset, not missing content. One CUA screenshot after reload had an incorrect capture aspect; resetting and reapplying the viewport produced valid portrait captures, which the independent reviewer checked.

Evidence: [final gate receipt](../scientific/centrifuge-v44/coupled48b/final/receipt.json), [provider status](../scientific/centrifuge-v44/coupled48b/provider-verified.json), [live regression observations](../scientific/centrifuge-v44/coupled48b/browser-regression.json), [desktop inertia](../scientific/centrifuge-v44/coupled48b/desktop-inertia.jpg), [320px comparison](../scientific/centrifuge-v44/coupled48b/mobile-320-comparison.jpg), [390px comparison](../scientific/centrifuge-v44/coupled48b/mobile-390-comparison.jpg). Raw first-failure and refinement evidence remains under `scientific/fixes-v43/coupled48-narrow.*` and `coupled48-refinement.*`. Build output retains a pre-existing large-chunk advisory; it is not an error or a new runtime finding.

## Physical limits

This qualifies the declared reduced equations in tested regimes; it is not a calibrated Marathon machine. Gas temperature, ion inertia, integrated ion-neutral friction and diffusion coefficient remain prescribed. The gas rotates rigidly, inventories are fixed, and boundaries reflect. Local angular-momentum transport, multicomponent pressure/thermal evolution, zero barycentric diffusive mass flux, ionization, axial circulation and product extraction are not solved. Redistribution work and numerical dissipation are separate from measured heating. The earlier collision-transport research qualification is unchanged.
