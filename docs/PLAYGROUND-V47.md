# Seven connected playground tools

The implementation is split into reviewable modules: radial transport, scene diagnostics, accepted comparisons/maps, and their UI integration. It retains the existing rotor, equilibrium, cascade and pump models; it does not promote them into a calibrated Marathon machine.

| Tool / problem | Technical and plain-language cause | Fix and choice |
| --- | --- | --- |
| Movable section and probes | Only a hidden final-equilibrium ring existed. There was no movable diagnostic view of accepted density/velocity. | An SI slice samples accepted radial data, with composition, number-density and bulk-speed layers. Transient probes use cell masses directly. Axial position is visual placement: the model remains axially uniform. Native unlit Three materials retain logarithmic-depth compatibility and avoid reflection-dependent quantitative colors. |
| Component controls | Inspection described hardware but settings lived elsewhere. New exact entries also risked native range-step quantization. | Selected hardware exposes its own physical slider/number controls. Number entries convert at the canonical logarithmic boundary and disable noninteger range quantization; integer stage constraints remain. Stable controls preserve editing focus across accepted recalculation. |
| Pinned A/B | Mutable inputs and independently fitted cameras/color ranges make comparisons misleading. | A deep-frozen accepted result owns its configuration and worker identity. Both actual 3D viewers share SI camera poses, physical times and color domains; matching plot series share colors, with dashed A curves. Programmatic resize/load fits stay local so camera synchronization cannot compound their scaling. Deliberate presets update both viewers explicitly. |
| Shared timeline | Particle animation and plot inspection had separate state. Rebuilding SVGs every frame would lose focus. | One physical clock drives motion, cell profiles, probes, cuts, plot cursors and readouts. Time-plot click/drag or keyboard scrub selects the corresponding transient mode. Hover only inspects. Cursor/readout updates preserve SVG nodes; automatic updates are silent, deliberate keyboard samples announce. |
| Finite-time separation | Final Boltzmann profiles were not solutions of species continuity during spin-up. In simple terms, the gas appeared separated without evolving there. | Conservative finite-volume Scharfetter–Gummel flux with backward Euler evolves initially uniform species inventories under prescribed neutral rotation. It preserves positivity, reflecting boundaries and integrated exponential equilibrium. This bounded 1D addition has independent analytical/convergence gates; a full mixture solver would require additional equations, data and validation. |
| Operating map | Sliders explored one conditional state at a time. | A cancellable worker computes a bounded parameter grid. Each cell owns its full physical configuration; selection applies exact values. Invalid model states, undefined metrics and diagnostic warnings differ. Maps expose equilibrium inventory purity/recovery, instantaneous input power, and conditional outer gas load—not a measured stability or throughput envelope. |
| Assembly views | Fixed hardware obscured internal diagnostics. | Adjustable native shell clipping, ghosting, restrained hardware explosion and useful camera presets reveal the gas. These are display changes; the numerical gas boundaries and SI coordinates remain fixed. Picking honors clipping, while collection-handle dragging has pointer ownership and explicit cancellation. |

## Adversarial corrections

Independent reviews caught empty-compartment purity from roundoff, zero-speed color-domain rejection, current-case speed leaking into A's slice, stale averaged radii after mode changes, lost species focus during lazy geometry creation, component-input replacement, stale metadata and selection/material disposal ordering. Narrow fixes and regressions cover these paths. Broad clipping/renormalization or duplicated physics state would have concealed errors or introduced new inconsistencies.

Deployed browser inspection additionally found camera fits being relayed between viewers during panel resizing, multiplying the intended zoom adjustment. Suppressing programmatic fit broadcasts is the narrow fix: real user orbit gestures still synchronize, and each viewport applies its own aspect correction once. The paired actual-OrbitControls regression checks this distinction.

Final source review also corrected preset synchronization, precise range assignment, Clear after a failed current request, current-time inventory-cut plots and deliberate keyboard announcements after silent playback updates.

## Scientific boundary

This is an isothermal independent-species Smoluchowski closure driven one way by the existing fixed-inertia rotor. It does not enforce zero summed barycentric diffusive mass flux, evolve gas momentum/pressure/temperature, update rotor inertia, or solve axial extraction. `neutralInertiaRatio` quantifies omitted rotational feedback and can approach twice the initial inertia. The grid warning identifies a centrifugal wall layer finer than a radial cell. Passing the numerical gates qualifies the tested closure and cases, not Marathon performance or every slider combination.

The existing pump/cascade references remain separate from reflecting-wall transport. Exterior flow packets are hidden in transient separation. Geometry, materials and hardware dimensions remain illustrative disclosed topology, not as-built engineering evidence.

Independent derivation and references: [transport](TRANSPORT-V47.md), [physics audit](reviews/v47-physics.md), [ergonomics audit](reviews/v47-ergonomics.md), [comparison audit](reviews/v47-comparison.md).

## Verification

Project execution uses the existing offline Apple safe-dev guest copy at `/work/home/fix-v43-source`. The trusted controller explicitly transfers reviewed source and verifies its manifest before and after execution. Earlier snapshots, studies and volumes are preserved. Publishing uses a separate existing deployment guest with guest-owned Cloudflare authorization.

The final receipt, exact source/release digests, command logs and provider deployment evidence are recorded under `scientific/centrifuge-v44/playground47f/`. Browser observations and screenshots are separate from the build receipt; a test/build pass alone is not live GPU verification.

### Final checked release and deployment

- Candidate: `playground47f`; input snapshot `30997becf4647c0aed7a0c4c35784723c1d2a767fb9ad49b455ee4c7fd45c73c` (524 inputs); release digest `09efe4f6c06ad596674472cc0356e431477b951c09ee97c563ff91325202db8b` (150 files).
- `npm test`: **994/994 passed**. `npm run typecheck`, `npm run build`, `npm run check:site`, and `npm run check:assets`: passed.
- `node --import tsx scientific/fixes-v43/verify-release-worker.mjs`: passed.
- `node --import tsx scripts/verify-fuel-release-v44.mjs`: passed, including 144 bundled centrifuge/transport cases and 49 operating-map cells, source identity and protocol/domain rejection.
- `python3 docs/reviews/v42-collision-data-probe.py`: passed saved-data recomputation; this does not qualify the existing collision transport model.
- Provider verification confirms version `ae1cfd89-5977-4e13-b56b-17f0d4a8dd41` receives 100% of traffic. The live browser loaded `index-BcRxULiq.js`; the accepted experiment displayed worker identity `d9ec800e3c222eda5477ee192f8a0ba3437232d95b4ab36ee4e9724a6ab8f155`.

### Actual deployed-browser observations

The root agent operated the deployed site in Brave through the browser extension, including the actual GPU canvases. Desktop verification used 1440×900; responsive verification used 390×844 and 320×740 viewport overrides, restored afterwards. These are desktop viewport tests, not physical-phone GPU/touch measurements.

- Moved the section through 0, 0.25, 0.5, 0.75 and 1 of the length; exercised all three field layers and species highlighting. A native section probe reported `r=0.0523 m`, `z=0.800 m`, light fraction `0.07877`, density `1.120e21 m⁻³`, bulk speed `424.2 m/s`, and time `1.000 s`.
- Clicking an actual copper winding opened its field control. Exact component entries applied 0.53 T and 0.06 A. A native collection-ring drag changed the accepted cut from 0.45 to `0.59063656166458`; the corresponding numeric control showed the committed value.
- Pinned A at 0.53 T / 0.06 A; a map point applied B at exactly 0.375 T / 0.0333333333333333 A. A remained unchanged. Inspected paired canvases, shared camera gestures/presets, panel resizing, common plot colors/dashed A curves and the stacked mobile arrangement.
- Plot Home/End changed the shared physical timeline and gas speeds; playback advanced from rest to 0.1563 s with ion/neutral wall speeds 322.6/300.4 m/s. Exercised equilibrium, separation, spin-up and flow modes.
- Generated maps covering all four axes and all four metrics; exercised keyboard cell navigation and click-to-apply. At 320 pixels the map scrolls within its panel and document width remains 320 pixels; at 390 pixels the document remains 390 pixels.
- Selected all ten centrifuge plot views and inspected their readouts and SVG paths: no `NaN` or `Infinity` path coordinates.
- Smoke-tested all four playgrounds: completed introductory orbit integration and keyboard plot inspection; changed beam energy and confirmed beam-off zero output; changed blanket cooldown and observed Hg/Au fractions update; inspected model-laboratory geometry/plots and recorded-research scrubbing. This covers representative older controls, not every possible input combination. Research remains recorded data, and collisional double-well dynamics visibly retains `budget-exceeded / continuum unqualified`.
- No captured browser warning/error after final publication. One extension-channel error in the retained console log predates this deployment.

Screenshots and observations: [`playground47f/browser`](../scientific/centrifuge-v44/playground47f/browser/), including [`observations.json`](../scientific/centrifuge-v44/playground47f/browser/observations.json), desktop A/B comparison, mobile comparison/map/plots, apparatus snapshots and research replay. Independent physics and ergonomics audits are linked above; live verification was performed by the root agent, not inferred from their source reviews.
