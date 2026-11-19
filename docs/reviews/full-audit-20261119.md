# Mass Spinner audit — 19 November 2026

Application revision: `45588450bf35cb9abc4e3472ff6f30bf9b00d459`.
Scope: maintained UI, tutorial routing, physics-to-plot/scene path, solver contracts,
scientific qualification, rendering, dependencies and release process. This is a
coordinator review, not a new independent-agent or experimental validation campaign.

## Changes requested

The six optional investigation readers duplicated the numbered tutorials. Their
separate data module and generator are removed; the documentation index now has
six tutorials and four references. Twelve explicit redirects preserve old `.html`
and extensionless links. In-tutorial actions still reveal canonical controls and
plots; removing those would remove useful simulation functionality.

Remote DM Sans/Manrope imports and reader system fonts are replaced by locally
hosted Commissioner for text/controls and Literata for headings. Math and code
retain their own fonts. Six Latin/extended-Latin/Greek WOFF2 subsets total 197,472
bytes; Unicode ranges allow browsers to load only needed subsets. Original OFL
licenses, registry integrity and individual asset hashes are retained. A shared
stylesheet fixes typography across both application entrypoints and every reader,
without adding runtime dependencies or changing numerical code. The sweep also
removed a stale window-title override, updated the Advanced page’s local font
alias and aligned its chart labels. A stylesheet-wide regression check prevents
those overrides from silently reverting to generic browser fonts.

## Remaining findings

No P0/P1 defect was established in the inspected paths. Six P2 findings and one
P3 performance opportunity remain;
this is not approval of every configuration. The first three deserve priority.

| ID | Priority | Finding | Evidence |
|---|---|---|---|
| F1 | P2 | Derived plot endpoints can disagree with the scene between accepted times | Source and algebraic counterexample |
| F2 | P2 | Reader connection and action outcomes are unreliable across reload/startup/rejection | Two deployed reproductions; startup source trace |
| F3 | P2 | Pending reactor recalculation rebuilds geometry and can reset the camera | Source; earlier live reproduction not repeated here |
| F4 | P2 | Collection plot exposes internal names and bare fractions | Reproduced on deployment |
| F5 | P3 | Playback repeatedly scans immutable histories | Source; frame-time impact not profiled |
| F6 | P2 | Automated deployment retains only one original candidate generation | Workflow trace; manual prepared deployment avoids it |
| F7 | P2 | Historical evidence copies make the source snapshot too large for local isolation | Measured tracked inventory and safe-dev refusal |

### F1 — Use one physical sampler for plots and scene

[`laboratory.ts:142`](../../src/laboratory.ts#L142) interpolates plotted ordinates,
while [`fuel-transport.ts:252`](../../src/fuel-transport.ts#L252) interpolates
canonical inventory, momentum and energy and reconstructs derived quantities.
For fixed inertia and momentum growing from zero to L, midpoint kinetic energy
is K_end/4; interpolating endpoint energies gives K_end/2. This counterexample
establishes a semantic mismatch, not its magnitude at current live resolution.
Simply, averaging answers differs from calculating an answer from averaged state.
Use the canonical sampler for revealed endpoints/cursor values and test
non-checkpoint clocks with evolving inertia. Keep accepted solver knots and the
existing accessible renderer; replacing the integrator cannot fix display logic.

### F2 — A sent message is not an executed action

[`playground-guide.ts:20`](../../src/playground-guide.ts#L20) keeps an authorized
reader only in memory; reload loses its WindowProxy. The surviving reader still
reports “Sent” although its Spin action leaves accepted playback paused and Plots
closed. In Equilibrium reference, Cut power is correctly rejected, but its reason
is written to hidden `guide-status`; the reader again reports “Sent”.
[`guide-reader.ts:85`](../../src/guide-reader.ts#L85) has no outcome acknowledgement;
a second action during startup can also arrive before the receiver listener exists.
Simply, the guide cannot tell whether the simulator heard or accepted a request.
Restore an explicitly authorized peer across reload, then add readiness and
action-outcome acknowledgements. Preserve exact origin, known-window and action
restrictions; an unknown reader’s hello must not authorize itself. Retain the
latest pending command until
readiness, report the receiver's result, and test reload, delayed startup and
rejection. Broad same-origin acceptance or arbitrary sleeps would weaken the
boundary or hide the race.

### F3 — Preserve camera across pending states

[`surface-layer.ts:86`](../../src/surface-layer.ts#L86) disposes the engineering
assembly and clears its geometry key for a pending packet at line 150. Acceptance
then creates a new root, invoking camera fit/reset through the viewer. Simply,
a current-only recalculation can forget the inspected viewpoint even though the
hardware dimensions did not change. Preserve the pose/geometry identity across
pending and restore it for same-geometry acceptance, while withholding stale
numerical surfaces. Test accepted → pending → accepted; testing accepted →
accepted alone misses this path. Keeping stale quantitative colors is unnecessary.

### F4 — Make collection fractions readable at their point of use

[`fuel-centrifuge-ui.ts:510`](../../src/fuel-centrifuge-ui.ts#L510) sends internal
keys such as `innerLightPurity` to legends and shows `0.07891` and `0.335` without
units beside the readouts. The axis says Inventory fraction; Tutorial 4 now explains
0.08 = 8%, so the earlier prose discrepancy is partly addressed. The plot still
requires translation between internal field names, fractions and percentages.
Use descriptive series labels and either percentages throughout the display or
explicit 0–1 fraction units beside every readout. Keep purity/recovery denominators
and undefined empty-cut values; changing the correct model formulas is unwarranted.

### F5 — Profile repeated accepted-history scans

[`fuel-motion.ts:42`](../../src/fuel-motion.ts#L42) scans accepted checkpoints
for maximum speed each sample, including trail samples. Each comparison frame
calls [`comparisonDomain`](../../src/fuel-experiments.ts#L35), rescanning both
immutable runs and radial arrays. Simply, playback repeatedly recomputes bounds
that change only when a run or pin changes. Compute them on result acceptance/pin
and invalidate there. Measure long-history frame timing before claiming a speedup;
no visible slowdown or hardware-GPU frame budget was established here.

### F6 — Retain prepared release generations

[Deployment workflow](../../.github/workflows/deploy.yml#L46) downloads the previous
original `verified-site`, not the previous prepared release containing older
retained chunks. A → B → C can therefore drop A-only lazy modules still needed by
an open A tab. Save and admit the prepared artifact as the next retention source;
regress three-generation deployment and rollback. This follows existing hashed
asset verification without retaining old HTML or weakening digest checks. The
manual preparation used for this change retains the accumulated prepared tree.

### F7 — Separate future evidence archives from the live source snapshot

`git ls-files` currently accounts for 1,406,126,727 bytes (before this local report),
including many retained scientific source/results copies. `safe-dev init` refuses
this project's snapshot at its 512 MiB ceiling. Simply, preserved evidence has
outgrown the local development transport. Keep old evidence intact; move future
immutable campaigns to release artifacts with checksums and retain compact
protocols/manifests in Git. A reviewed source-input snapshot for development is
preferable to raising limits, deleting unique evidence or bypassing isolation.
CI remains the bounded execution path used for this change.

## Scientific and tooling assessment

The maintained browser calculation is a TypeScript SG/backward-Euler transport
and two-rotor model, with optional thermal closures; it is not an OpenFOAM/PETSc
reactor solver. The source explicitly separates numerical mechanical dissipation
from physical heating, conserves closed species inventory, and includes evolving
neutral inertia in angular momentum. Fixed species, diffusivity, conductivity,
friction and drive assumptions limit inference. The spatial option remains
experimental and omits resolved radial inertia/acoustics, chemistry, local
azimuthal momentum and Maxwell–Stefan/Soret transport. Rich meshes and moving dots
do not add those equations or establish as-built Marathon dimensions.

The beam/target path has a first-order coupled loading/thermal solver with exact
pulse-edge boundaries. Its stopping is an adaptation of Geant4 atomic formulas,
not measured LiT or full Geant4 transport; implantation weights, release and
material properties remain scenario assumptions. First-flight neutron accounting
keeps scattered particles unresolved; it does not predict shielding dose or a
complete fusion reactor. The Advanced kinetic model prescribes fields/electrons;
finite collision cells retain angular-momentum/locality error and need joint
refinement. Those limits are distinct from the conserved live two-rotor ledger.
Recorded Julia replay correctly states that scrubbing does not rerun a solver and
qualification is withheld. This turn reruns startup/control coverage and the unit
suite, not those historical kinetic or target convergence campaigns.

The equilibrium reference uses cylindrical inventory integration and stable
normalization, with explicit empty-cut/pure-feed limits. Its existing independent
Decimal qualification is finite numerical evidence. The retained argon profile
rejects the rigid family under its declared optical operator; the public-data
campaign also retains electrical and pressure disagreements. No measured
rotation/temperature/electrical benchmark has been jointly admitted. This audit
adds no experimental accuracy claim and reruns no historical PDE campaign.

The security trace checked exact-origin and known-window gating before the
guide action allowlist, worker request ID/kind/schema matching and termination,
and whole-batch scenario validation before DOM mutation. These boundaries remain
in place; F2 concerns delivery and outcome reporting, not permission expansion.
This is source/test coverage, not a penetration test or a general security
certification.

Strict TypeScript for maintained source, typed ESLint, versioned worker/scenario
boundaries, cancellable workers, pinned build containers, official glTF validation, Playwright/axe and
manifest-bound deployment are now present. The test typecheck still excludes a
listed set of historical JS-style TypeScript tests; the runtime test glob includes
them. Passing `typecheck:tests` does not mean every historical test is strictly
typed. Earlier stack-audit claims that the implemented controls were absent are
historical. No evidence here supports a framework rewrite or
moving browser interaction to a scientific server. The fresh CI dependency gate
reports no high/critical advisories. The retained
picomatch exception is configuration history, not evidence of a currently admitted
vulnerability; zero high/critical advisories also does not mean every dependency
is vulnerability-free.

Earlier findings removed or addressed: the duplicate investigation thermal
baseline and guidance-mode issues disappear with those pages; the numbered
pumping tutorial already distinguishes effective speed from required gas load;
Tutorial 4 already explains fractions. Do not carry those historical findings
forward as unchanged defects.

## Verification

[Verify run 44491090872](https://github.com/noahsong-sdg/mass-spinner/actions/runs/44491090872)
passed its offline verify job for the exact application revision above:

- `node --import tsx scripts/check-dependencies.ts npm-audit.json`: no high/critical advisories.
- `npm run typecheck`, `typecheck:infrastructure`, `typecheck:boundaries`, `typecheck:tests`: passed.
- `npm run lint`: passed.
- `python3 -m unittest discover -s scientific/electron-applicability -p test_screen.py -v`: 17 passed.
- `python3 -m unittest discover -s tests -p test_argon_reference_export.py -v`: 3 passed.
- `node --import tsx --test --test-concurrency=1 tests/*.test.ts`: 1,564 passed, zero failed.
- `npm run build`, `check:site`, `check:assets`, `check:gltf`, `release:seal`, `release:verify`: passed.
- `git diff --check`: passed.

The candidate has 254 digest-verified files. Preparation preserves all 254 qualified files
byte-for-byte and retains older hashed chunks, giving 370 manifest entries. Static
inspection confirms no retired readers are emitted and every redirect target
fragment exists. Local safe-dev execution was refused at the snapshot ceiling;
no project test or build was executed on the host.

The first browser run passed 40 checks and failed two instances of a new
comparison-label assertion: the test expected the control label “Assumed radial
diffusivity”, whereas the comparison’s existing label is “Radial diffusivity”.
The rendered accepted value was correct. The corrected test asserts the comparison
label and the physical value represented by the edited logarithmic slider; no
production comparison label or physics was changed to accommodate the test.
A subsequent regression-scan edit failed strict typechecking because
`readdirSync` inferred string-or-buffer paths; explicit UTF-8 encoding fixes the
actual Node API contract without a type assertion.
[Replacement run 44491090872](https://github.com/noahsong-sdg/mass-spinner/actions/runs/44491090872)
passed all 42 desktop/phone browser checks in 13.3 minutes, then verified the
254-file artifact again. The browser job uses
Chromium/SwiftShader, including phone viewport emulation; it cannot certify native
Safari or universal hardware-GPU performance.

Cloudflare version `447a6b14-e00d-40af-9db5-c1c980a53494` now serves this
revision. Its complete 370-entry manifest equals the prepared artifact; native
HTTP checks passed all 12 redirects and verified 11 served asset hashes, including
all six fonts with `font/woff2` MIME types. Python urllib received Cloudflare 1010;
the normal curl client succeeded. No security setting or browser policy changed.

Deployed IAB checks at widths 1280 and 373 px confirmed two index sections, no
retired links or horizontal overflow, and Commissioner/Literata computed families.
The simulator brand and floating titles also use their intended families. A fresh
Docs popup opened Tutorial 1 and its canonical current control. Editing 0.030 →
0.031 A produced a new accepted run; at 1 s, displayed gas speed changed 1,024 →
1,051 m/s and ion speed 1,051 → 1,079 m/s, with the spin plot updated. These rounded
readouts establish control response, not a new physical benchmark. The existing
user simulation was untouched; temporary test tabs were closed.

The simulator logged no console errors. The reader recorded two errors sourced
from Electron’s sandbox/preload bundle (`node:electron/...`); its content and
bridge actions worked. The application-only Playwright error checks passed.
This records an IAB host observation rather than claiming its cause was fixed.

Receipts and screenshots: `output/investigation-removal-4558845/`. The first failed
browser attempt and earlier deployed reproductions are preserved separately in
`output/investigation-removal-cf9bdb6/`. Reader reload/rejection and collection-label
findings were reproduced against the preceding live revision `935547b`; the
implicated code is unchanged in this revision. Findings F1–F7 remain open.
