# Guide audit and next finish line · 16 November 2026

Four independent reviewers traced physics, beginner explanations, native UI
execution paths and the project's qualification evidence. This review covers
`UNDERSTANDING-MASS-SPINNER-02.md` and its embedded/standalone website guide.
It does not certify experimental accuracy.

## Findings and corrections

| Problem | Cause: technical and physical meaning | Correction | Why this fix |
|---|---|---|---|
| Gas “wall speed” suggests a spinning vessel | Rigid-reference edge speed was undefined | Define ΩR as gas speed; stationary-wall shear layer is unresolved | Clarify the existing reference; a moving-vessel depiction would teach the wrong machine. |
| Collision slider cannot be related to Γ | Equation uses friction, UI uses a rate | State Γ = ℐᵢνᵢₙ and wall torque = νwall Lneutral; give units and expected lag response | Expose the implemented mapping rather than imply a new first-principles collision model. |
| Drive schematic disagrees with 3D current direction | Both sign conventions were individually valid | Match inward J and counterclockwise J×B; annotate the annular radii | Use one consistent convention instead of making a beginner reconcile opposite arrows. |
| Power equations lead to energy plots | Instantaneous W and accumulated J were not distinguished | Explain height versus slope and separate the Ohmic readout | Bridge the existing ledger units without adding another competing plot. |
| Redistribution work is unexplained | Variable inertia changes kinetic energy even at fixed L | Explain signed thermal deposition as a reduced closure, not resolved fluid work | Disclose the closure rather than present bookkeeping as resolved fluid physics. |
| Continuous budget appears to be the discrete ledger | Numerical damping is an additional discrete energy deficit | State that it is excluded from heat and should shrink under refinement | Keep numerical loss visible rather than hiding it in physical heating. |
| Current edits and other edits appear equivalent | Current inserts an intervention after t>0; setup edits restart | Explain New run, replayed history and equal-time comparisons | Preserve native intervention behavior and teach controlled comparisons instead of changing experiment history. |
| Radius probes silently jump to the endpoint | All guide composition actions shared endpoint() | Preserve selected time for probes/comparisons; explicitly label endpoint shortcuts | Reuse the native clock; only explicitly named endpoint actions should seek to the end. |
| Collection exercise restarts the physical experiment | Guide focused a setup slider handled by generic invalidation | Focus the existing paused diagnostic cut curve; disclose setup-slider reset behavior | Reuse an inventory diagnostic instead of mutating accepted results, continuation state and provenance. |
| Empty-cut purity shows a neighboring radius's value | Chart adapter dropped nulls; scalar readout also skipped undefined y before finding nearest x | Preserve null gaps in the native adapter, select radius first and display — without borrowing another sample | Undefined means no denominator; neither zero nor a neighboring radius is a valid replacement. |
| Enrichment changes are difficult to see | Light-only references used a 0–100% axis | Use explicitly labeled zoomed percentage axes and show feed; keep full two-species axes | Show small changes with explicit units and bounded axes rather than imply a large absolute enrichment. |
| Standalone Pin A silently does nothing | Export becomes ready before comparison controls | Wait for the native Pin A readiness signal as well as the accepted result | Observe actual readiness instead of using a guessed delay or claiming a successful pin. |
| Momentum/inertia claims lack their actual plots | Guide action list omitted existing diagnostics | Link native angular momentum, gas inertia, species density and run duration | Reuse existing diagnostics rather than create duplicate calculations or panels. |

The collection probe changes neither setup nor the selected 3D cut. Its graph
readout reports radius-dependent purity and recovery for the same inventory.
Turning the setup collection slider into a diagnostic configuration edit would
also require coherent accepted-result, continuation and export provenance
changes; that broader feature is not hidden in this guide patch.

## Equation audit

All 15 displayed groups have consistent algebra, signs and dimensions within
the ideal neutral equilibrium and prescribed two-rotor assumptions. Their order
answers: how torque is produced; why mass and temperature create radial sorting;
how to measure that bias; what limits rotation; where work goes; and what time
and an inventory cut mean. Optional pressure-balance derivation remains folded.
The torque integral, squared slip loss and diffusion scale now have short
physical motivations. exp, ln, radians and number fraction are defined.

The gas-only lithium example is an imposed model state, not a demonstrated
sustainable discharge. Phase exchange, ionization, electron energy and resolved
near-wall flow remain outside this explanation's scope.

## Progress and priorities

**Learning:** drive → rotation → heating → composition → collection exists.
The finish criterion is a newcomer correctly explaining inputs versus outputs,
transient versus equilibrium, density versus composition and purity versus
recovery, using one controlled comparison. Source tests alone cannot prove
that a learner understands it.

**Conditional predictions:** the next bounded deliverable is an equilibrium
enrichment calculator given geometry, inventory, species masses, prescribed
rotation and uniform temperature. Reuse the existing Boltzmann profiles and
inventory integrals. Qualify a frozen domain against independent integration,
zero-rotation/equal-mass controls, positivity, conservation and difficult wall
layers. Judge error relative to enrichment gain as well as absolute composition.
Propagate user-declared input bounds and export assumptions/provenance. This
would predict ideal profiles/cuts, not drive power, separation time or throughput.

**Experimental device prediction:** remains unqualified. The live V97 screen
covers 27 trajectories and 21 refinements at three lithium current nodes,
thermal off, one second and no current events. It is not a claim across all
sliders. The rigid family misses the inspected argon optical profile under the
stated diagnostic operator; all 4,320 frozen non-rigid optical alternatives also
fail the declared screen. Finite-contact electrical reference numerics pass,
but footprints, inherited transport calibration, voltage mapping and diagnostic
identification prevent an independent apparatus match.

**Research backend:** V122 is newer than the V101 chronology in the main live
status page. Retained evolved spatial comparisons pass; its timestep family
remains unqualified, with eight of nine cases completed and the last refused at
the enforced memory limit. The terminal refusal supersedes older “active” prose.
Prescribed electron temperature/transport and omitted ionization/electron energy
are applicability barriers that conservation or mesh convergence cannot fix.

No new reactor family or full PIC/MHD solver is required to finish the bounded
learning/calculator goal. A later experimental milestone needs one composition
measurement with independently known rotation, temperature, apparatus and
measurement operator; further sweeps cannot identify missing experimental inputs.

Evidence: [live qualification](../LIVE-MODEL-QUALIFICATION.md),
[public data](../PUBLIC-DATA-QUALIFICATION.md),
[benchmark admission](../IDENTIFIABLE-BENCHMARK.md),
[finite contacts](../../scientific/voltage-footprint-reference/results/RUN.md),
[V122 scope](../../scientific/argon-family-v122/SCOPE-REVIEW.md) and
[terminal refusal](../../scientific/argon-family-v122/REVIEW-REFUSAL005.md).

## Verification

Regression coverage checks preserved probe time, paused cut focus, unchanged
accepted inputs/worker request count, native momentum/inertia/density links,
empty/full cut readouts, feed references, zoom disclosure and rendered math.
The final execution and deployed-browser receipts follow.


### Final receipt

- Runtime source: `ee8a3da26c215f19e40bee72534024553d4c0e9d`.
- [Isolated verification run 43993141439](https://github.com/noahsong-sdg/mass-spinner/actions/runs/43993141439): all gates passed. Focused batches passed 39, 24 and 29 tests; the full TypeScript suite passed **1,405/1,405**. Python suites passed **17 + 3** tests.
- Required final commands: `npm run typecheck`, `npm run build`, `npm run check:site`, `npm run check:assets` all passed. The workflow retains exact commands and logs for all test batches.
- Deployment: `88f82153-7436-4335-8e70-007531cef6b3`, using the exact verified-site artifact from that run.
- Browser loaded `/assets/main-DyFM8osW.js`, matching that artifact. Verified with the live in-app browser, without bypassing policy.

Live checks covered all physics-guide action kinds: current, collision rate,
wall drag, thermal controls, diffusivity and duration focus the native controls;
composition/axis/wall/density, momentum/inertia, mechanical energy, temperature
and reference comparisons open the promised native diagnostics. Both temperature
and rotation reference curves retain the sampled state and clearly disclose the
zoomed percentage axis. All 15 equations render with MathML and no KaTeX errors.
Scene/drive and the walkthrough's coils inspection work. Replay starts playback;
explicit endpoint links select the end. The standalone startup Pin A link now
produces an A summary and enables Clear; it no longer silently drops the action.

At physical time **0.99 s**, collection probing paused playback without changing
the clock. Home reported `innerLightPurity: 0, —` and `lightRecovery: 0, 0`.
End reported `innerLightPurity: 1, 0.0759`, `lightRecovery: 1, 1`, and
`outerHeavyPurity: 1, —`. These checks crossed the real adapter, not a synthetic
renderer-only fixture. The earlier renderer-only check had missed its null filter;
the retained regression now exercises the complete path.

Mobile verification at **390 × 844** confirmed readable chapter navigation,
control-sheet focus/return, the same cut readout at 0.99 s, and no page-wide
horizontal overflow (390 px scroll width). Escape closed the embedded guide and
returned focus to Start here. The viewport override was reset. Browser error logs
were empty. Desktop/mobile screenshots were retained locally for the change.

No new experimental solver campaign ran in this guide audit. Historical numerical
and experimental receipts above retain their stated scope; no gate was relaxed.
This receipt-only update does not change the deployed runtime artifact.
