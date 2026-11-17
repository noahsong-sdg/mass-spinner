# Guide audit and next finish line · 16 November 2026

Four independent reviewers traced physics, beginner explanations, native UI
execution paths and the project's qualification evidence. This review covers
`UNDERSTANDING-MASS-SPINNER-02.md` and its embedded/standalone website guide.
It does not certify experimental accuracy.

## Findings and corrections

| Problem | Cause | Correction |
|---|---|---|
| Gas “wall speed” suggests a spinning vessel | Rigid-reference edge speed was undefined | Define ΩR as gas speed; stationary-wall shear layer is unresolved |
| Collision slider cannot be related to Γ | Equation uses friction, UI uses a rate | State Γ = ℐᵢνᵢₙ and wall torque = νwall Lneutral; give units and expected lag response |
| Drive schematic disagrees with 3D current direction | Both sign conventions were individually valid | Match inward J and counterclockwise J×B; annotate the annular radii |
| Power equations lead to energy plots | Instantaneous W and accumulated J were not distinguished | Explain height versus slope and separate the Ohmic readout |
| Redistribution work is unexplained | Variable inertia changes kinetic energy even at fixed L | Explain signed thermal deposition as a reduced closure, not resolved fluid work |
| Continuous budget appears to be the discrete ledger | Numerical damping is an additional discrete energy deficit | State that it is excluded from heat and should shrink under refinement |
| Current edits and other edits appear equivalent | Current inserts an intervention after t>0; setup edits restart | Explain New run, replayed history and equal-time comparisons |
| Radius probes silently jump to the endpoint | All guide composition actions shared endpoint() | Preserve selected time for probes/comparisons; explicitly label endpoint shortcuts |
| Collection exercise restarts the physical experiment | Guide focused a setup slider handled by generic invalidation | Focus the existing paused diagnostic cut curve; disclose setup-slider reset behavior |
| Empty-cut purity shows a neighboring radius's value | Generic scalar readout skipped undefined y before finding nearest x | Select the radius first; display undefined as — without borrowing another sample |
| Enrichment changes are difficult to see | Light-only references used a 0–100% axis | Use explicitly labeled zoomed percentage axes and show feed; keep full two-species axes |
| Momentum/inertia claims lack their actual plots | Guide action list omitted existing diagnostics | Link native angular momentum, gas inertia, species density and run duration |

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
Execution and deployed browser receipts are appended after the final gate.
