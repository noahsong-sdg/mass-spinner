# Minimal playground interface

## Problem and root cause

Navigation cards, a runtime introduction, a second section heading and apparatus
context repeated the same description. In Marathon, the first model controls
followed multiple headings and disclaimers. The old `refresh()` recreated this
prose whenever the user changed playgrounds. Legacy styles also imposed card
grids and large introduction spacing.

In plain terms, the interface described what the visitor had already selected
several times before showing the thing they wanted to manipulate.

## Change and rationale

- Navigation now contains four names: Mass Spinner, Marathon, Models, Research.
- Removed card numbers, subtitles, the playground label, duplicated introductions,
  the Marathon overline and visible duplicate section title.
- The selected playground retains one accessible page heading; the apparatus/model
  retains its own visible title where useful.
- Model assumptions, published sources and explanatory equations live in closed
  native **Model info** disclosures. Nothing opens these by default.
- Preserved all functional IDs, control bounds, labels, units, share/reset behavior,
  section anchors, model-validity messages, failure reports and integration mounts.
- Empty status elements take no space. Populated warnings and errors remain outside
  closed disclosures. Scientific limitations are available on request.
- `src/minimal.css` must import after the existing stylesheets. It compacts the
  existing navigation instead of creating a second navigation system.

Removing redundant markup and stopping its runtime recreation addresses the source
of the problem. A blanket text-hiding rule would retain duplicated content, risk
hiding active errors and leave empty layout space. Native disclosures keep the
scientific context available without adding a modal, help system or dependency.

The beginner collisionless-model note is scoped to level one; it must not describe
the separate collisional model-lab backend. This change does not alter any solver.

## Verification

Bounded source copy: `/tmp/mass-spinner-minimal-ui-v24`.
Apple guest: `safe-dev-3d21050ac08faaf8`. No host project execution or browser-policy
bypass. Dependencies installed inside the guest with online access; tests ran
offline. Guest source was explicitly refreshed after the final host edit.

```sh
safe-dev -C /tmp/mass-spinner-minimal-ui-v24 init
safe-dev -C /tmp/mass-spinner-minimal-ui-v24 run --online -- npm ci
safe-dev -C /tmp/mass-spinner-minimal-ui-v24 sync --replace-guest
safe-dev -C /tmp/mass-spinner-minimal-ui-v24 run --online -- npm ci
safe-dev -C /tmp/mass-spinner-minimal-ui-v24 run -- node --import tsx --test tests/minimal-ui-v24.test.ts tests/experience.test.ts tests/layout-v20.test.ts tests/layout-v22.test.ts
```

Targeted checks: **11 passed, zero failures**. They cover actual level-navigation
handlers against IDs present in the HTML, stale share and URL state, preserved
controls and mounts, balanced native disclosures, and unobscured populated status
elements. These are structural and handler tests; they do not constitute browser,
responsive-layout, accessibility-tree or GPU verification. The full app build and
typecheck belong to the combined integration gate.

Tested owned-file SHA-256:

```text
0a38e11fda3f46167b6f9025e09584a84e70b796f1fd6c9da4b2c166682969b9 index.html
c3a51438ccfddb984d761b547fb7815582062f8c23f019c925146329c1843242 src/experience-ui.js
d5715a5d19d0dd50e41ea6d390eb6a3957f21de8ab6279e0d4eefa57cc1bef3f src/minimal.css
ae733cf9fddf628b786b7e9c4a35e05cc97b7c5b5aed811c0ce6c54a32d91325 tests/minimal-ui-v24.test.ts
```
