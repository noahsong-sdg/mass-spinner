# Compact header — v36

Published version `658a5834-942e-4480-9bab-12003da90d2d`; Cloudflare reported 100% traffic at 2026-11-09T05:37:34Z. Provider verification is not a browser observation.

## Typography

The interface combined literal uppercase headings, positive letter spacing in three stylesheet layers, and an uppercase transform on the scenario badge. In plain terms, multiple layers independently produced the spaced-capital appearance. The source declarations now use normal spacing, the brand reads “Mass Spinner,” and ordinary interface headings use normal capitalization. Scientific symbols and units are preserved. Editing the owning declarations avoids another override layer and applies consistently to the floating windows.

## Header navigation

The playground navigation belonged to a separate section. A mobile rule explicitly stacked that section below the masthead. Moving the existing navigation into the masthead makes the brand and tabs share one row. The row remains 64 px tall; tabs scroll horizontally when space is limited. The scene and Marathon context selector use the same header height variable.

An adjacent legacy `.masthead nav` rule hid header navigation outside playground 3. It now excludes `.level-navigation`, preserving access in all four playgrounds. Existing button nodes, handlers, state, share action, accessible title, and focus behavior are retained. Reusing the original controls prevents duplicated navigation state; no parallel mobile control implementation is needed.

## What the controls actually change

The apparatus viewer loads fixed GLB meshes selected by mechanism. It supports orbiting, picking, component highlighting, camera reset and resizing. It does not receive slider parameters or deform the hardware. The Blender assets remain conceptual apparatus, without a complete engineering CAD specification.

Spinner inputs feed the selected numerical model and worker; trajectories, field overlays and plots use the resulting configuration. With live update disabled, Run starts the new calculation. Marathon source inputs recompute beam/source results; coupled target settings schedule the time-dependent loading and thermal solve. These change parameters and predicted states within the selected equations, not the model's assumptions or the fixed hardware mesh. Research replay displays recorded studies rather than a live reactor solve.

## Verification

All execution used the isolated Apple safe-dev guest `safe-dev-d53fa8311a7066e4`, after explicit source synchronization and offline dependency installation. The tested 387-input snapshot is identified by `scientific/header-v36/tested-inputs-v36.json`, SHA256 `cbccff1fcb3ad6aed435d4b9e8e45bda302bb52477855b6f13f5203d5887de7d`.

- Focused workspace/minimal-interface tests: 15 passed.
- `npm test`: 664 passed, zero failed/skipped.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `npm run check:site`: passed.
- `npm run check:assets`: passed.

Regression coverage verifies header ownership, a single navigation instance, actual switching and pressed state in all four playgrounds, visibility under the stylesheet cascade, horizontal overflow, normal typography, and the responsive CSS contract. JSDOM does not render pixels or execute GPU graphics. The browser's managed origin policy still prevents direct deployed desktop/mobile visual inspection; no such verification is claimed.

Only seven inputs changed: HTML, five interface source/style files, and one test file. Physics equations and GLB assets are unchanged. The 144-file release was hash-checked before deployment, then checked again alongside Cloudflare's rollout status. Aggregate release SHA256: `ef6edb14c7db98dc84b899c86d8a1bf999aab08906d8c7362547357309c6e621`.
