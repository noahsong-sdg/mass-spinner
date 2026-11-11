# Playground layout correction — v20

The screenshot's long control stack follows the source path: `setupExperience`
selects level 1, the shared controls remain the existing inputs, and CSS chooses
their layout. An early ≤740 px rule gives `.controls` a two-column grid; a later
rule at the same breakpoint changes it back to flex. Reset, presets, four sliders,
cold-cutoff readout and run state then each consume a full-width row. In plain
terms, the compact layout was being overwritten, with too many separate rows.

The change scopes the compact grid to level 1 so the advanced level 3 controls
retain their existing flexible layout. It groups the four existing inputs in two
columns on narrow screens, puts reset beside the presets, and reduces the cutoff
and run-row spacing. DOM order matches visual order: presets, B, potential,
temperature, species-B mass, cutoff, run. All input IDs, bounds and event paths
are preserved. Level 1 keeps its source and collision settings pinned by the
existing experience code.

The navigation and introduction are shorter. Level 3 gains section links for the
simulator, live plots, mechanism guide, failure modes and references. The target
and electrical assumptions in level 2 start collapsed while the three primary
beam controls remain exposed. Important model-validity messages remain visible.
The compact source is explicitly distinguished from Marathon's future alchemy
blanket. Existing equations, outputs and scientific limitations are retained.

This is preferable to hiding parameters, duplicating simplified inputs or moving
control state into a second UI: the same tested handlers and numerical kernels
continue to run. Scoped CSS preserves advanced controls; native disclosure keeps
the deeper inputs accessible without a new navigation state machine.

Mounts `separator-inspector`, `fusion-inspector` and `neutron-geometry` are provided
for the parent's component and geometry modules. `replay-retry` is provided for
the separately owned recording-load retry correction.

Source inspection confirms existing control IDs and model targets are preserved.
Runtime/build checks are owned by the parent on its final synchronized snapshot.
No browser or GPU check was performed: the deployed origin is managed-denied, and
no alternate browser, indirect fetch or local rendering workaround was used.
