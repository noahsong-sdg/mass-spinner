# Responsive scientific plots — R1

## Problem and root cause

Verified source path: model/research/study curve producers → `renderPlots` in
`src/laboratory.js` → an 800-unit SVG → `.live-plots svg { width:100% }`.
The previous 11/12-unit SVG labels scaled with that entire 800-unit drawing.
Technically, a 300 CSS-pixel plot reduced an 11-unit label to 4.125 CSS pixels.
Simply, the application shrank the lettering along with the picture.
This is source-derived, not a measurement of the deployed page.

## Fix and choice

The existing renderer now measures the figure's content width and makes one SVG
unit correspond nominally to one CSS pixel. Axis and legend text is 12 units;
legend words wrap into adaptive columns, horizontal ticks thin to match available
width, and long horizontal axis labels wrap. Extra legend/label rows add vertical
space rather than shrinking the plot or type. A small 180px drawing floor uses
horizontal overflow only in exceptionally narrow hosts.

ResizeObserver redraws the same SVG on a positive content-width change. Hidden
or unmeasured figures start with the previous finite 800-unit layout and update
when shown. Hiding a measured figure retains its finite layout. Each host owns
its observers through a WeakMap; its next `renderPlots` call disconnects them,
including when called with an empty curve array. Readout/keyboard state and SVG
focus survive width-only redraws because the SVG element and handlers persist.

The transforms retain equal physical scale on spatial axes, true scientific
domains (including small constant SI quantities), exact pointer/keyboard sample
inspection, post-event repeated-X selection, selected-X markers, and separate
finite uncertainty-band segments. No scientific calculation changed.

This is the smallest coherent fix to a demonstrated SVG/layout defect. Increasing
font size in the original fixed viewBox would require viewport-specific guessing;
non-scaling stroke does not protect text; adopting another plotting framework
would replace working exact inspection and introduce a dependency without a
demonstrated capability gap.

## Verification receipt

All dependency installation and test execution ran in this agent's separate
Apple safe-dev VM, not the host and not another agent's VM. Stage:
`/private/tmp/mass-spinner-charts-v38-agent`; volume `safe-dev-b6368c85eb95d6a9`.
The small stage copied `src`, `tests`, package manifests, `index.html`, and only
`web-assets/research-recordings.json` from the checked v36 export, then overlaid
the two files below before initialization. No home/credentials/control sockets
were mounted. No post-initialization source edits occurred, so no resync was
necessary.

Initialized snapshot: 208 files / 1,569,478 bytes;
`source_sha256=28ebc2bbe0a3b83bac5d9d0c6642b9a0550bf766b2af74eb12e7375e21a80cb3`.

Tested overlays (SHA-256):

```text
f8b184b5d7ccb43d01c44ad58fc87a4aadf8e103e66b1f4e2119d2c8fc4d2f25  src/laboratory.js
20d6278def6b44e5f97d58d532c13b1eb1b3cdf29e0fa20ed2f4ab50e6cb48eb  tests/responsive-plots-v38.test.ts
```

Commands (all prefixed with
`/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-charts-v38-agent`):

1. `init` — passed.
2. `run -- npm ci --offline --ignore-scripts` — failed `ENOTCACHED`; no cached
   xmlchars archive was available in this new guest.
3. `run --online -- npm ci --ignore-scripts` — passed, 54 packages installed.
   Network was enabled only for dependency download.
4. `run -- node_modules/.bin/tsx --test tests/responsive-plots-v38.test.ts tests/graphics-fidelity-v28.test.ts tests/playground-audit.test.ts tests/audit-product-v7.test.ts tests/study-ui.test.ts`
   — **23 passed, 0 failed**.

New tests exercise measured mobile width and 12-unit type, adaptive horizontal
ticks, hidden→visible recovery, repeated resizing, exact pointer/keyboard values,
selected markers, observer disconnection, wrapped legends, spatial scale, and
uncertainty/path gaps after resizing. Existing scientific/inspection tests passed
unchanged. The root task owns final combined typecheck/build/full-suite gates.

## Integration and remaining evidence

`main.js` owns a separate hard-coded number-fraction SVG. The root agent has the
recipe to replace its SVG mount with a shared `renderPlots` host using profile
`radius`, B number fraction, and the physical `[0,1]` Y domain. This agent did not
edit `main.js` or `index.html` in the live project.

No deployed browser, GPU frame, mobile viewport, clipping, or touch interaction
was observed. The managed browser denial was respected. DOM/coordinate tests
establish mathematical layout and interaction behavior, not visual sign-off.
