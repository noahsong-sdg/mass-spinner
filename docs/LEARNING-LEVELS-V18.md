# Learning levels and Marathon curriculum — v18

7 November 2026. Four independent primary-source reviews considered competing
curricula before implementation. This is a teaching layer over the existing
browser engines. Neither the separator nor fusion numerical kernel changed.

## Decision and evidence

Marathon's current published compact architecture is an RF ion source,
electrostatic D+ accelerator and solid lithium-tritide target on a cooled
substrate. Its future thermal-plasma power-plant blanket and fuel-cycle plans
are distinct. Checked the [official architecture](https://www.marathonfusion.com/beam-driven-fusion/)
and [system overview](https://www.marathonfusion.com/) on this date.
Company summary power/flux figures do not disclose the beam, stopping,
geometry or cooling data needed to calibrate this simulator.

The selected concepts are fusion versus stopping, neutron output versus target
heat, and useful-neutron production versus electrical gain. They explain three
different decisions: energy/material choice, current/spot/cooling choice, and
the useful product/system boundary. A Lawson/ignition/stability sequence would
primarily teach a different reactor. Tritium recycling, lithium enrichment and
blanket multiplication belong in extensions; they do not replace the compact
source's yield and heat constraints. Small volume and high power density are
outputs with different denominators, not sufficient conceptual foundations.

Independent reviews:

- [Architecture, competing hypotheses and source review](MARATHON-ARCHITECTURE-LEVELS.md).
- [Yield, cross sections and energy optimization](MARATHON-YIELD-LEVELS.md).
- [Target heat, stopping, materials and lifetime](MARATHON-TARGET-LEVELS.md).
- [Electrical, neutron-product and tritium ledgers](MARATHON-SYSTEMS-LEVELS.md).

The public [three-concept derivation](../web-assets/MARATHON-THREE-CONCEPTS.md)
contains the equations, units, fixed-composition density cancellation and source
links. The v1 recirculating-power caution in the initial review was checked
against current arXiv v2 and corrected: the current equation has the consistent
inverse heating fraction. No archived equation is used as a device calibration.

## Levels

1. **Mass Spinner:** collisionless rotating orbit filter; magnetic field,
   potential, transverse temperature and species-B mass. The complete source,
   seed, timestep, species-A mass, charges and collision state are pinned.
   Finite-device trajectories, destination counts and live plots remain visible.
   Copy experiment link captures the four controls with a versioned URL.
2. **Marathon Fusion:** architecture schematic; three question/equation/prediction
   lessons; live probability, neutron, heat and energy-accounting readouts.
   Energy, current and beam area are prominent. Effective target and electrical
   assumptions are expandable, as is the detailed original energy ledger.
   Probability and neutrons per accelerator joule are scanned over energy.
3. **Model lab:** existing seven Section II A–D workbenches, failure modes,
   refinement/sampling tools and remaining-section reference atlas.
4. **Research bench:** actual offline v16/v17 figures and explicit qualification
   status. It does not start Julia, PETSc or WarpX in the browser. Scientific
   source/results and acceptance gates remain unchanged.

The energy scan holds the toy column and fractional linear slowing fixed. It
compares a family of imposed slowing laws, not one physical LiT material as
energy changes. No target temperature, lifetime, sample flux, isotope yield or
net electrical output is calculated. Defaults are assumptions, not Marathon data.

## Execution path and fixes

Previously every subject and advanced control occupied one undifferentiated
laboratory. The entry point initialized all workbenches and one selected separator
mode, with no concept of learning depth. A small level controller now selects
the visible subject and delegates to the unchanged mode and simulation paths.
CSS controls presentation; existing worker request/revision cancellation remains
responsible for separator work. This avoids duplicating kernels or inventing
a hierarchy of numerical validity.

**Hidden state and pending runs.** The technical risk was restoring only visible
sliders while leaving advanced charges, neutrals, source sampling or a pending
debounced run active. In plain terms, two apparently identical shared experiments
could have different physics. Level 1 now re-pins its complete source before
selecting the rotating model. Level transitions invalidate/abort workers and
studies and clear the pending timer. Versioned links validate the full supplied
four-control state; stale, invalid and off-step links restore defaults. This is
smaller and more reproducible than serializing all advanced workbench settings.

**Level-button event boundary.** The initial selector `[data-level]` matched the
body as well as the buttons. Bubbled ordinary clicks could therefore re-enter
the active level and cancel a run. Restricting the selector to
`button[data-level]` fixes the binding itself; no propagation guard is needed.
The regression harness includes the body and checks it has no click handler.
The model-lab header link now navigates to `?level=2` instead of a hidden anchor.

**Teaching limits.** Independent review caught a misleading element/color label,
an overgeneral statement about cross-section maxima and a singular equation at
zero stopping. Species B is an abstract mass shown in copper. The general path
integral covers zero slowing, with the column-times-cross-section limit explicit;
the energy integral applies only where stopping is positive. Cards also state
that auxiliary electrical loads and recovery are omitted. These corrections
preserve the unchanged underlying calculation and its valid limiting controls.

Continuous orbital GPU rendering skips Levels 2 and 4. One-time beam-workbench
calculation and GPU initialization still occur on initial page load; this is not
an offline research-solver run. Lazy initialization can be evaluated separately
if measured startup cost warrants it.

## Verification and limits

All execution took place in Apple safe-dev VMs. The exact application snapshot
contains 255 mapped source/input files; map SHA256:
`7d99c4dda4dd624e0be6230ea9c1e323a31a6508ed47841aff79b9007741dcd1`.
All corresponding host and actual-export bytes were checked. The archive retains
the exact tested source rather than relying on later working-tree identity.

Initial focused checks: 20/20 passed across experience, Marathon lessons,
workbench UI, invalid-output review and UI contract tests. Final gate:

| Command | Result |
| --- | --- |
| `npm test` | 268 PASS; zero failed, skipped or cancelled |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0; existing large renderer-chunk warning remains |
| `npm run check:site` | exit 0; modules parse and local resources exist |

Tests include stale/nonfinite/out-of-range/off-step URLs, hidden advanced-state
reset, level cancellation, zero-current denominators, efficiency scaling,
current/area invariants and the 100-keV gain identity. Existing cross-section,
slab attenuation, energy-ledger and input-boundary tests also pass.
[Exact source, logs and release map](../scientific/verification-v18/README.md).

Three public research images were byte-checked against the sealed original
independent audit and label-corrected presentation packet. Also reverified all
1,322 main-audit and 38 presentation sealed members and exact membership;
both original seal digests remain unchanged. No curves were rerendered or
scientific claims upgraded. [Public provenance and scope](../web-assets/LEVELS-RESEARCH.md).

A fresh live-browser attempt was denied by the managed origin policy. No alternate
browser or indirect fetch was used to circumvent it. These are source/unit/build
checks, not verified rendered appearance, GPU behavior or live controls. Provider
deployment confirmation is separate from browser verification.

Published the exact 98-file build using pinned Wrangler 4.158.0 inside a separate
deployment-only safe-dev VM. Cloudflare uploaded eight changed assets, reused 90
and activated `3d9ba981-edae-4175-836d-5107ce38f9af`. A separate authenticated
deployment-list request confirms this version at 100%, created 8 November 2026
00:16:38 UTC. Both pre-upload and actual-export release hashes match the build.
The first attempt was denied because its OAuth request omitted the distinct
`workers_scripts:write` scope; successful login was insufficient permission for
the deployment API. Adding that permission through user reauthorization fixed
the same artifact's deployment. Requesting the demonstrated missing scope was
chosen over granting all Wrangler permissions. Credentials remain in the guest
home, outside exported project files. Actual locks and failed/successful provider
logs are retained under `scientific/verification-v18/deployment`.
