# Marathon realism and interface pass — v22

Published to https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev.
Cloudflare reports version `f2537250-1a7b-43ce-831b-d9d449b39c66` at 100%,
created 2026-11-08 01:54:38 UTC (7 November locally).

## Fixes and rationale

1. **Exposure had no thermal state.** Technically, the source returned steady
   deposited power and multiplied neutron rate by duration; it had no stored
   energy or coolant-transfer equation. Simply, it could show heat input but
   not warming and cooling. A separate exact single-node observer now uses the
   conditional fully-stopping-backing heat ledger, assumed areal heat capacity
   and cooling conductance. It tracks bulk temperature, signed coolant energy
   and fusion-only tritium consumption, with one shared source duration. This
   bounded model was chosen because validated LiT stopping/retention and
   geometry data are missing; invented material coefficients or yield feedback
   would add unjustified precision. The exact exponential and stable short-time
   arithmetic avoid introducing a numerical timestep error into this linear
   reference. It is one exposure followed by cooldown, not periodic pulsing.

2. **The source interface had competing navigation and equal visual emphasis.**
   Technically, apparatus and inspector supplied duplicate component choices,
   the DOM put controls ahead of inspection, and schematic/readouts/details
   occupied competing regions. Simply, the important actions were hard to find.
   The scoped layout now presents apparatus, inspection, operating controls and
   results in coherent order, keeps one keyboard-accessible component list,
   adds section links and puts secondary schematic/assumptions behind native
   disclosures. Existing IDs, numerical bounds and all 31 static input
   attribute sets were preserved. Scoped CSS and native disclosures were chosen
   over rebuilding the stateful application or changing simulation behavior.

3. **Logarithmic controls exposed internal exponents to assistive technology.**
   Technically, their native range values represented log10 coordinates while
   visible outputs represented physical quantities. Simply, an assistive reader
   could announce −2 instead of 0.01 A. The existing readout path now sets
   `aria-valuetext` to physical value and unit on initialization and updates.
   This preserves bounds, conversion and event handlers; replacing controls or
   adding a parallel value state would create unnecessary synchronization risk.

4. **New thermal results contradicted old scope copy.** The old statement that
   no target temperature was calculated predated the observer. It now
   distinguishes conditional bulk temperature from unresolved surface
   temperature, damage and lifetime, with a published model-scope document.
   This preserves the scientific boundary rather than relabeling a bulk
   scenario as a resolved target model.

## Independent adversarial review

Four agents independently covered primary-source realism priorities, thermal
equations and numerical references, UI structure, and actual production event
handlers. Reports: `MARATHON-REALISM-PLAN-V22.md`,
`MARATHON-PHYSICS-AUDIT-V22.md`, `UI-CLEANLINESS-V22.md`, and
`INTERACTION-AUDIT-V22.md`. No blocking defect remained within the declared
reduced model. These reviews do not establish Marathon operating performance.

## Exact verification

All project execution occurred in copied Apple safe-dev VMs. Parent final
snapshot: `/tmp/mass-spinner-playgrounds-v22`, guest
`safe-dev-23d9d3afbe84f64a`, 308 source inputs; source-map SHA256
`cb35f7481ae9814aa387fe11c5e0fa1283705c6087f6f4caaa0ceff560ada5dd`.

- Narrow actual-handler/physics/layout gate: 16/16 passed.
- `npm test`: 318/318 passed, zero skipped.
- `npm run typecheck`: passed.
- `npm run build`: passed. Existing large main-bundle warning remains
  (1098.81 kB minified, 310.92 kB gzip); performance was not browser-profiled.
- `npm run check:site`: passed, including module syntax, mount/resource/worker
  and published apparatus assets. This is not a rendered-browser check.
- Independent RK4 temperature and coolant integration, adiabatic and steady
  limits, signed bath flow, exact pulse switch, area scaling, tiny-conductance
  arithmetic and inventory/domain guards passed.
- Actual source→geometry→thermal handler regressions verified shared duration,
  invalid-source clearing/recovery and local thermal failure isolation.
- Host inputs and actual guest export matched every recorded source hash.
  The deployment VM rechecked all 118 release files before upload; its actual
  exported files still matched afterward. Release-map aggregate SHA256
  `c5a923e62de5ea7ec27141055992bc6aa4a0b534015b342b38733f813a1a7f35`.
- Cloudflare's deployment listing confirms the new version at 100%.

Evidence is archived in `scientific/verification-v22` and
`scientific/deployment-v22`. Live browser, mobile rendering, GPU appearance and
assistive-technology verification remain unobserved because the explicit
managed browser denial remains in effect; no alternate browser or fetch
workaround was used.

## Remaining scientific gate

The observer is exact only for its assumed single bulk node. Temperature does
not change yield or material loading. It does not resolve surface peaks,
spatial conduction, phase changes, isotope exchange, damage, regeneration or
target lifetime. Fusion consumption alone is not a target-life model. Better
absolute source accuracy still requires validated D-in-LiT stopping and
evolving loading, followed by material/geometry and experimental comparisons.
See published `MARATHON-TARGET-EXPOSURE.md` for equations and primary sources.
