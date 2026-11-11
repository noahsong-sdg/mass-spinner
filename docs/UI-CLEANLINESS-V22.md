# Marathon interface cleanliness pass

## Traced execution path and root causes

The static `index.html` mounts feed `fusion-ui.js`, `setupApparatus`, the shared
component inspector and optional neutron/blanket explorers. Physics controls are
created once by ID; changing their surrounding HTML does not alter their values,
events or numerical configuration. The image and inspector use the same six
fusion-component records and synchronized selection authority.

The prior console's first DOM child was the control sidebar. Below desktop
widths the source therefore became a form before users saw the apparatus.
The rendered apparatus already included six named native component buttons,
while the inspector repeated that list. Schematic, footprint, readouts and
plots also competed at similar prominence. Simply, too many representations of
the same instrument appeared before the main feedback was easy to scan.

## Small coherent changes

`index.html` now supplies one source-console grid with the apparatus first,
then its inspector and operating-point controls in DOM order. Desktop placement
keeps controls beside the apparatus; the single-column view keeps inspection
and controls after the image. An adversarial interaction reviewer identified
the initial inspector/DOM mismatch, and its physical mount was moved beside the
apparatus rather than relying on CSS order alone.

Only `#fusion-inspector .component-choices` is hidden. The apparatus retains the
complete named native button list, including its mobile alternative; the
inspector still opens the shared function/material description. This removes
the duplicate list without changing selection handlers, raycasts, SVG regions
or the component catalog. Global hiding would have removed other playgrounds'
inspection, so the rule is deliberately scoped to this one redundant list.

The footprint moves into the existing optional beamline-schematic disclosure.
All SVG IDs, labels and dynamic beam/spot/neutron updates remain. Six current
source readouts form a compact standalone row, and the two energy-response
plots remain visible. Target/electrical assumptions, the detailed energy ledger
and model sources remain accessible through native disclosures. Their scientific
boundaries are preserved; moving material assumptions into their own disclosure
does not couple them to the solver.

A small section navigation links source, energy response, target exposure and
the separate future blanket. The new `#target-exposure` mount sits outside the
source console and before its ledger. The future blanket is moved after the
source ledger/equations to distinguish its power-plant scope.

The adjacent mobile cascade was also traced: the shared stylesheet sets
instrument labels to `flex-direction:column`. The primary-label override now
explicitly resets the row direction below 560px, so its intended label/value
alignment is not defeated by that inherited rule.

The new `marathon-layout.css` uses scoped selectors to supersede existing
historical layout rules. This is preferable to refactoring the large shared
stylesheet or adding interface state machinery: other playgrounds retain their
existing rules and all physics modules are untouched. The visual direction is
a restrained dark instrument workspace, with fewer enclosing boxes and compact
typography; no new dependency, motion, calibration or fake render overlay was
added.

## Verification and boundaries

Owned application files are only `index.html` and `src/marathon-layout.css`.
Parent integration imports the new CSS after `apparatus.css`; this agent did not
edit `main.js`, physics, controls or existing styles.

A trusted minimal snapshot at `/tmp/mass-spinner-marathon-layout-v22` contains
the current HTML/CSS, the frozen v21 HTML and an independent standard-library
HTML/ID/order checker. It ran offline in guest `safe-dev-6c14f255f0166b9c` after
explicit `sync --replace-guest`. Command:

```
safe-dev -C /tmp/mass-spinner-marathon-layout-v22 run -- python3 verify-layout.py
```

The checks require all 195 previous static IDs and all 31 static input attribute
sets to survive; image → inspector → controls order; source readouts inside the
console; target exposure and future blanket outside it; valid section targets;
and only the scoped duplicate-choice rule. The old source has controls before
the image, so the new ordering checks cover the actual identified regression.

These are source-structure checks. Parent's merged build/typecheck/full tests
and CSS compilation remain required. Browser, responsive appearance, touch,
focus rendering and actual all-level visual behavior remain unobserved under
the explicit managed-origin denial. No alternate browser, indirect origin fetch,
CDP or browser rendering of a local clone was used.

Final narrow check **PASS**, with actual copied-file SHA256 values:

```
index.html           fa457053afc42c2be194af51010814d2278d62cdd62c701a47d5e5d2266ecf64
marathon-layout.css  ac45200d5c3bf59a78d70e0c16f2f65e9ff1cb162a094ce357e2e346a96adbf5
```

The reusable narrow checker is retained in the named minimal stage. Parent can
include the same source-order/ID assertions in its final regression suite.
