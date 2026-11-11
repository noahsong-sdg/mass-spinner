# Controls and plot audit: playgrounds 01–04

7 November 2026. Independent source review for the requested cleaner playground
and component inspection. This report is an acceptance matrix, **not a claim of
live browser verification**. The parent observed a fresh managed-origin denial.
No alternate browser, CDP, Playwright, indirect deployed-origin request or local
clone rendering was used. The initial audit was read-only. Subsequently, the
parent assigned this reviewer replay-loading and curve-identity fixes, described
in the implementation appendix below.

## Evidence and execution boundary

Read the actual entrypoints and event handlers in `index.html`,
`src/main.js`, `src/experience-ui.js`, `src/fusion-ui.js`,
`src/fusion-playground.ts`, `src/research-ui.js`, `src/laboratory.js`,
`src/style.css`, `src/study-ui.js`, `src/doublewell-ui.js`,
`src/limitations-ui.js`, `src/worker-client.ts`, `src/view-state.ts` and
`blender/build_separator.py`. Inspected existing regression definitions in the
experience, playground-audit, workbench, study, UI-contract and doublewell tests.
Those tests were **not rerun by this reviewer**. Read safe-dev's README; no
dependency installation, project execution or untrusted code ran on the host.

## Findings before v20 implementation

### 1. The narrow-screen controls override their own compact grid

**Problem:** a narrow viewport turns a small number of basic controls into a
long vertical wall, matching the structure visible in the user's screenshot.
The screenshot alone does not establish its CSS pixel viewport or browser zoom.

**Technical cause:** the first `@media(max-width:740px)` rule gives `.controls`
two grid columns. A later equal-width media rule sets `.controls{display:flex}`,
so the latter wins and the existing column flex direction stacks everything.
Level 1's mass, reset, presets, three field/temperature inputs, large cutoff,
run button and status are separate flex items. Shared 20px range margins and
25px gaps multiply the scroll cost. In plain terms, the stylesheet cancels its
own compact layout and gives every item a separate full-width row.

**Small fix:** scope a final compact layout to the basic playground; group the
four physical controls, group action commands, and reduce the cutoff to a
secondary readout. Keep primary visualization and current results adjacent.
Retain existing input IDs and change handlers. Other model controls can remain
behind named native disclosure panels. This directly fixes the layout rather
than reducing flexibility or introducing a new UI framework.

### 2. Replay has six lines but only four line styles

**Problem:** the three replay plots each overlay six species/axis components.
`renderPlots()` cycles a palette of four colors and uses solid strokes for all
series. Components 1/5 and 2/6 reuse indistinguishable styles.

**Technical cause:** `index % 4` in `src/laboratory.js` is sufficient for earlier
plots but not six-component tensor/velocity panels. In plain terms, two
different measurements look like the same line.

**Small fix:** supply six distinct styles or encode species by color and axis
by dash, with matching legend marks. Do not change the numerical curves to
solve a visual identity problem. Keyboard sample readout already reports exact
labels and can remain.

### 3. First replay loading failure has no recovery command

**Problem:** a transient recording fetch failure disables both replay controls;
switching away and back does not retry loading.

**Technical cause:** `setupResearchViewer()` catches failure and returns `null`;
`main.js` caches its promise with `research ??= setupResearchViewer()`. The
resolved promise is still non-null even when its result is null. In plain
terms, the application remembers the failed attempt as though loading finished.

**Small fix:** expose an explicit retry command and clear the cached failure;
retain one in-flight load at a time and do not duplicate event listeners after
success. An explicit retry is preferable to invisible repeated requests.

### 4. Clickable component identity is absent

This is a requested addition rather than a regression. `main.js` has camera
and view events but no raycaster or selected-component state. The beamline SVG
is one image with text labels; none of its physical groups is a component
button. Introduce one small component catalogue shared by a semantic list and
scene/SVG selection. Give every entry a function, modeled/assumed material,
and provenance boundary. Use the list for keyboard operation and when GPU
rendering fails. Do not make facts available only on hover or only through 3D.

The Blender source assigns 316 stainless appearance to the vessel and annular
end collectors, copper to exposed windings, alumina to electrical breaks and
electrode insulators, a molybdenum appearance to source electrodes, Viton to
seals, and nickel to fittings. Its `Graphite anodized housing` label is an art
material name rather than a chemically precise material specification. Avoid
promoting any of these conceptual asset assignments into a validated physical
machine bill of materials. The actual annular end collector uses `steel`,
despite a separate material variable being called `Molybdenum collector finish`.

## End-to-end acceptance matrix

Every row below requires browser execution on the exact deployed version once
policy grants access. Source tracing identifies the expected behavior; it does
not prove native events, GPU appearance, layout or downloads work.

| Playground / action | Production path and expected outcome | Edge cases / acceptance evidence |
| --- | --- | --- |
| All: navigate 01→02→03→04→01 | `setupExperience.enter`: invalidates obsolete separator jobs, sets body level, toggles live state, updates title/URL and pressed nav | Only intended panels visible; Tab skips hidden controls; no stale result from previous mode; viewport remains finite after hidden→visible resize |
| All: narrow and wide layout | `style.css` grid/flex/media rules | 390, 740, 1024, 1440 CSS-px widths; 200% text zoom; no horizontal page overflow; controls and plots readable without giant empty regions |
| All: plots by mouse/keyboard | `renderPlots`: nearest sample; ArrowLeft/Right/Home/End; aria-live readout | Endpoint clamping; Tab remains native; uncertainty gaps remain gaps; selected marker matches exact current input/time; six-line legend uniquely maps each series |
| 01: B, V, transverse T, B mass | Proxy mass dispatches real `mass-b` input; `changed` clears old outputs and debounces `run` 250ms; worker orbit dispatch | Each input's min/default/max; zero V; equal mass; high B/light B ion corner; wait for completion then inspect counts/paths/plots/export consistency |
| 01: rapid slider changes | AbortController and revision in `invalidate/run`; worker termination settles promise | Drag while busy; only newest settings render; run button recovers; no rejected promise escapes; stale output/export remains cleared |
| 01: presets and reset | Presets set B/V/T/source values and run; reset restores saved basic defaults plus pinned source/species/resolution | Both presets after manual edits; reset after visiting 03; reset must not leave a stale copy-link success state |
| 01: share | `playgroundLink`, clipboard async revision guard | Paste fresh link in an independently authorized tab; four settings survive; advanced/source settings remain pinned; unsupported/old URL restores complete defaults; clipboard failure exposes selectable URL |
| 01: assembly/orbits/fields, camera reset | `showView` opacity/visibility; OrbitControls and keyboard camera | See actual GLB and field arrows; drag versus component click; zoom boundaries; Reset view; keyboard rotation/zoom; GPU failure shows still poster with inspection list usable |
| 01: collection and deposition | `drawResults` plus focused diagnostic/arrival curves | Species A/B injected = end+wall+source+remaining; no collector means undefined purity, not zero; cold cutoff not treated as warm-source finite-device purity |
| 02: energy/current/area | Eight dynamic inputs in `fusion-ui` → slab simulation → metrics, profiles, sensitivity and footprint | All endpoints and representative interiors; power follows I×energy, spot radius follows sqrt(area/pi); area changes heat/area without changing total source neutron production |
| 02: beam/tritium switches | Read functions return exact zero; inputs disabled while switch off | Beam off removes beam/neutron glyphs and absolute powers; gain undefined; tritium off removes neutrons but allows stopping heat; restoring switches restores retained slider settings |
| 02: target/electrical inputs | T column, fractional slowing, alpha deposition, efficiency and exposure update same model snapshot | Column zero boundary through switch; 0/0.9 slowing; alpha 0/1; efficiency only affects wall-plug/specific yield; exposure only affects integrated production; verify active point against export |
| 02: depth/energy plots | `fusionPlaygroundData` fixes survival domain 0–1 and adds exact selected energy to scan | Surviving fraction never auto-zooms tiny depletion into a large visible effect; probability/yield remain nonnegative; current-off scans explicitly conditional beam-on response |
| 02: invalid then valid inputs/export | Catch clears four result hosts, labels, spot, beam/neutrons and latest export | Inject unsupported energy/slowing through an authorized test harness; no stale scientific result persists; valid state recovers; downloaded JSON settings/results match |
| 03: centrifuge | `equilibriumConfig` → worker → `equilibriumPresentation` | All three closures; central/bulk composition; axis/wall magnetic boundary; equal-charge Gaussian restriction; invalid equilibrium message; radial refinement is quadrature, not transport validation |
| 03: rotating | Orbit config → orbit worker → collection/rotating diagnostics | Source thermal/fixed, masses/charges, neutral off/on, timestep corner and half-step; energy ledger must use RF/recoil-corrected residuals |
| 03: ICR | Voltage forced zero; circular RF amplitude/frequency/handedness; tune to A | Co/counter rotation; zero RF; tune after B/mass/charge edits; ICR voltage scans replaced by magnetic scans; no antenna-efficiency inference |
| 03: gyro, curved | Visible reduced controls → `reducedConfig` → geometry worker | Units and relevant controls; curved rho/R≥1 or ≤one gyroperiod shows extrapolation warning; plots do not imply full-orbit collection |
| 03: double-well landscape | Geometry reduced model; κ, canonical momentum and view-only inner radius | Plot-only crop changes view, not implied confinement/physical domain; landscape is distinct from collisional time dynamics |
| 03: double-well dynamics | Separate SI controls → `doublewellConfig` → kinetic worker | Equilibrium sets closed/common/zero drift; pulse inputs disabled; fixed/adaptive/annular controls enabled only when applicable; source-fitting disabled outside pulse/annular; actual regime and torque warning retained |
| 03: live/manual/refinement | `changed`, live switch, `run`, refine snapshot/controller/revision | Turning live off stops debounce; manual run works; late refinements never attach to new inputs; 100k-step budget rejected honestly; fine-grid cap respected |
| 03: seven-model compare | Snapshot each mode config, Promise.allSettled, per-card validity/config | Failures remain per model; hidden controls not silently synchronized; current operating point shown; no ranking across incompatible observables |
| 03: seed and parameter studies | `study-ui` → `runOrbitStudy` → workers → sample-aware plots/export | Change base/study control during work; cancel; new study before old settles; no partial/stale export; unresolved purity intervals remain withheld |
| 03: failure estimates/reference atlas | `failureBudgets` separate from separator; static reference directory | Controls do not mutate trajectories; export scope explicit; all reference images and links load; no atlas-only mode advertised as quantitative solver |
| 04: case/time | One lazy data fetch → exact saved state → tensors and three grouped plots | All 3 cases ×21 states; case change resets first state/range; no interpolation; marker and tensor match saved raw values; 40/84-u scale explicit |
| 04: load failure/recovery | Failed load disables controls; retry currently missing | Offline/HTTP/invalid-packet tests; explicit recoverability after successful reload; no stale tensors/scale left suggesting a valid current result |
| 04: evidence | Native details + raw JSON and original figure assets | Retain rate/rotation/refinement failures and withheld qualification; n6 replay distinguished from n8 image; moments do not claim full PDF or live solve |
| Component inspector: all visual apparatus | Proposed semantic list + raycast/SVG selected ID + detail panel | Every visible major part selects same entry by pointer and keyboard; drag does not select; selection resets appropriately on playground change; Escape clears if supported; material claim is categorized |

## Review conclusion

No numerical kernel defect was established by this source review. The compact
layout override, six-series style collision and replay recovery gap are concrete
UI findings. Existing tests provide useful source-unit contracts; they do not
establish actual browser/GPU operation. Final acceptance still requires native
controls, plots, downloads, focus, responsiveness and visuals on the deployed
origin after the managed policy owner grants access. Do not call publication or
static module parsing a substitute for that gate.

## Assigned replay fixes and narrow execution evidence

After the source audit, this reviewer changed only `src/research-ui.js` and
added `tests/research-controls-v20.test.ts`. The parent owns main-app wiring,
retry-button markup, and shared-renderer changes.

`createResearchLoader()` returns the same promise to concurrent callers,
caches only a successful viewer, and releases its in-flight state on either a
null failure or rejection. A subsequent explicit retry can therefore reload
without duplicating listeners after success. The error path also clears saved
time, normalization scale and tensor elements, rather than leaving stale moments
next to a loading failure. This fixes the cached-failure cause instead of adding
unbounded automatic retry traffic.

Replay curves identify species by sage/copper and tensor/velocity component by
solid, long-dash and short-dash styles. The parent's shared renderer honors those
fields for paths and legend swatches. All six combinations are unique within a
panel. No recorded arrays, model parameters, numerical equations or qualification
status changed.

Execution was inside the independent Apple VM `safe-dev-dc67c68ac3a897af`, from
the 54-file copy at `/tmp/mass-spinner-research-controls-v20`. Dependencies were
installed with network enabled only for `npm ci --no-audit --no-fund`; tests ran
offline. The exact command was:

```text
/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-research-controls-v20 run -- ./node_modules/.bin/tsx --test tests/research-controls-v20.test.ts
```

**4 PASS, 0 FAIL, 0 skipped/cancelled.** The tests exercise concurrent requests,
first-load failure and retry, unexpected rejection recovery, clearing stale
moments, successful recovery using the actual saved packet and actual handlers,
and all six rendered path/legend identities in each of the three panels.
These are source-unit DOM tests, not browser or GPU tests.

The actual guest export is retained at
`/tmp/mass-spinner-research-controls-v20-verified-export`. Its
`tested-source.json` records all 54 input hashes. SHA-256 of that JSON file:
`53e2340579e3b04eb4bb3a0b60a8b915965a7f5ed1cccedf692f98d321fb1f47`.

Key tested file hashes:

| File | SHA-256 |
| --- | --- |
| `src/research-ui.js` | `81954606c6ce7aa462de92cf9e635619f7ba6f51b8a5ec6842010c82da68abe7` |
| `src/laboratory.js` | `9c00e0c93fec6beb5fb3ee6384410d1871b152c66ef4a506a6e62716ed2dd5ad` |
| `tests/research-controls-v20.test.ts` | `25605a290c9732c02f4c0182ffca60dd77beec8f78b91352c7f7f6ded60e2943` |

This is a bounded intermediate snapshot. The parent must run the required full
build/typecheck gates after integrating all v20 changes, and verify deployed
behavior separately. This reviewer did not claim those gates.
