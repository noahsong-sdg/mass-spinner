# First-session review

Date: 2026-11-24

Published source: `9bc86a851ff60b531f1174749de0527fd8f180cc`

Full verification run: [45386873784](https://github.com/noahsong-sdg/mass-spinner/actions/runs/45386873784), passed.

## Route

Tutorial 1 now has four main questions:

1. What turns the gas? Compare zero current with powered rotation from rest.
2. Does rotation change composition? Compare prescribed temperatures at fixed speed.
3. What changes when temperature can evolve? Pin the fixed-temperature case. Enable thermal evolution. Compare both cases at the same physical time.
4. How much light isotope can we keep? Inspect inner sample purity and recovery against cut radius.

The previous seven section addresses still work. Current and temperature are subsections. Run comparison remains an optional reference.

## Corrections

The previous contents list gave seven topics equal weight. Four groups now connect drive, composition, heat and collection. They reuse the existing actions and simulations.

The reader selected the last main heading before an action. This sent a current-subsection action back to its parent heading. It now includes subsection headings. Existing navigation tests cover this case with current and stale reader state.

The heat exercise did not state that the default liner starts hotter than the gas. The instruction now states this condition before the action. This comparison includes heat from the liner. It cannot isolate drive heating.

The collection plot readout reports the inspected cut. Summary values report the configured cut. The summary now labels its configured radius. Instructions identify which readout to use. Plot inspection does not change the run or claim extraction flow.

These corrections retain the existing solvers and stable links. They do not add presets, another navigation mode or a second control path.

The isolated development copy omitted `LAURELIN-MODEL.md`, which the Laurelin UI imports. The input list now includes that file. A regression check verifies its copied content. The next local build passed. This changes no simulation result.

The new end plate blocked the gas in the axial tutorial camera. The action now selects the existing cutaway camera. It retains the complete end plate, shell opening and drive arrows. This avoids changing the hardware or physics to make the gas visible. The regression checks the camera selection. A local browser check confirmed the visible gas and drive arrows.

The new browser test selected both canvases after pinning comparison A. It now selects the current canvas explicitly. The comparison remains visible and separate.

The playback check inherited a five-second limit. Its software-rendering trace showed delayed frames, then physical time reached 0.887 s. The check now permits 30 seconds. It still requires a restart, more than 1% progress, and an intermediate state before completion. This corrects a functional test limit. It does not qualify render speed. The trace does not establish shader compilation as the cause.

Phone traces identified browser scroll anchoring in the tutorial column. When the delayed observation prompt appeared, the browser preserved the canvas position and moved the reader above the fixed header. The correction disables scroll anchoring only in the phone tutorial container. It avoids scroll retries that could override deliberate reader movement. The browser check must verify the section after its action has executed.

The next phone run exposed another test-order error. The test saved the heat summary before the parent received the collection action. It then compared that saved text with the collection summary. The existing assertion for the configured-cut row now comes before the capture. That row appears with the complete collection summary. The unchanged-summary and unchanged-input checks remain.

The next desktop trace reached the export step after the test's two-minute total budget had expired. Context setup used 35 seconds. Several later actions also took many seconds under software rendering. The two current-control cases now have a three-minute total budget. Their 30-second readiness limits and all export, speed, input and duration assertions remain. This local change preserves the complete reader-to-export test. It avoids a global timeout change or removal of the 3D view. It does not qualify interaction speed.

The browser traces also showed a rendering backlog. The same control transaction could submit the unchanged scene several times. OrbitControls and the explicit focus update also drew the same camera frame twice. Draw requests now share one screen frame. Animation still draws its latest state in that frame. The first draw after shader preparation remains immediate. Simultaneous paused camera focus and component explosion still use separate animation loops and can draw twice in one screen frame; this change does not claim a universal single-draw scheduler. This change removes repeated GPU submissions at their common entry point. It preserves the detailed model and avoids separate debounce rules in each control. Regression checks cover final camera and surface state, animation, focus, hidden and inactive views, model replacement and disposal. This is a demonstrated source correction; the next browser run must establish its effect on responsiveness.

The new floor and bench also carried the vessel component ID. Component focus included those meshes and could frame the room instead of the vessel. Material selection could highlight or dim them. These paths now use the same ancestor context boundary as ordinary framing. The regression adds a nested 100 m floor, compares focus cameras, and verifies unchanged context materials during vessel selection, coil explosion and restoration. This preserves the apparatus interaction rules and leaves the room as display context. An independent source review found no blocker.

## Checks

- Targeted tutorial and UI checks: 44 passed.
- Subsection navigation and playground integration checks: 43 passed after the navigation correction.
- Independent equilibrium and coupled-operation checks: 23 passed.
- Development snapshot checks: 5 passed. Isolated local build passed.
- Guide interaction checks after the camera correction: 26 passed. The next isolated local build passed.
- After the phone correction, the targeted guide checks, test typecheck and isolated build passed.
- Personal browser replay at 390 × 844: the direct link reached the gas view. After the cue appeared, the reader heading stayed visible.
- Independent source reviews: no remaining blocker in the four core experiments or corrected navigation path.
- Source checks for `52ee323`: all four typechecks, lint, Python checks, 1,701 TypeScript tests, build and release checks passed.
- Source checks for `cc5da2c`: passed in CI run `45380297428`. The artifact contains 266 files. Its source revision and lock digest match the committed candidate.
- Browser run `45375682210`: one group passed; three groups failed. The failures require correction before publication.
- Browser run `45380297428`: source checks and phone group 2 passed. Phone group 1 found the summary test race. Desktop group 2 exhausted the current-to-export test budget. Desktop group 1 exhausted its job limit after repeated interaction and screenshot delays. This candidate was not published.
- Renderer checks: two adjacent test groups passed, 59 checks each. The final viewer-only run passed 26 checks, including inactive-view reactivation.
- Vessel/context regression group: 32 checks passed in the isolated Node 26 guest.
- Final source gate for `9bc86a8`: all four typechecks, lint, four Python suites, 1,707 TypeScript tests, build, site, asset, glTF and release checks passed. The admitted candidate has 266 files, Node `v26.13.1`, and lock digest `807f7cb716e0734c9fd64d7b633f5f63c95faa79e462157f3c0a85e2f55109db`. Offline guest verification of its file hashes passed.
- Full browser gate: 94 passed, with no retries. Desktop groups: 27 checks in 7.6 minutes and 20 in 8.9 minutes. Phone groups: 27 checks in 10.8 minutes and 20 in 4.8 minutes. The previously job-limited desktop group passed without a job-limit increase.
- Cloudflare publication: completed from the admitted `verified-site` artifact, without rebuilding. Byte verification passed for 469 served files and the manifest. The one deployment control file and literal 301 redirect behavior passed verification.
- Personal deployed-browser checks: 0 A and 0.03 A at one second; fixed-speed 500/1,000 K composition; pinned fixed-temperature versus evolving-temperature run at one second; empty and full collection cuts; unchanged configured-cut summary during probing; calculator temperature and cut endpoints; gas/force view; coil explosion and assembly restoration; phone overflow and reader position. The checked tab had no console errors.
- New-reader comprehension was not tested.

The source gate runs these commands in a network-isolated container:

```sh
npm run typecheck
npm run typecheck:infrastructure
npm run typecheck:boundaries
npm run typecheck:tests
npm run lint
python3 -m unittest discover -s scientific/electron-applicability -p test_screen.py -v
python3 -m unittest discover -s tests -p test_argon_reference_export.py -v
python3 -m unittest discover -s tests -p test_dev_snapshot.py -v
python3 -m unittest discover -s tests -p test_deploy_credentials.py -v
node --import tsx --test --test-concurrency=1 tests/*.test.ts
npm run build
npm run check:site
npm run check:assets
npm run check:gltf
npm run release:seal
npm run release:verify
```

The dependency gate checks the locked dependency audit before these commands. The browser gate runs `npm run test:browser -- --project="$PLAYWRIGHT_PROJECT" --shard="$PLAYWRIGHT_SHARD/2"` for desktop and phone, with two groups per layout. It verifies the release file hashes before and after each group.

The equilibrium screen passed 8,640 comparisons with an independent 80-digit direct-integral calculation. The sampled domain spans heavy-species β = m v² / (2 kT) from 0 to 100, six feed fractions from 0 to 1, and nine radii from 0 to the vessel wall. It includes the six supported feed pairs, equal masses, near-equal masses and a large mass ratio. The oracle uses 500 K and selects speed through β; it does not independently sweep a two-dimensional speed/temperature grid. Separate tests cover microscopic cuts and absolute SI scaling. This finite screen does not prove all inputs or plot interpolation. Maximum absolute error was `1.99e-13` against a `2e-12` gate. Maximum inventory conservation error was `7.55e-15` against a `2e-13` gate. Tests also cover small cuts, pure feeds, equal masses and spatial refinement. Numerical agreement does not show experimental accuracy.

## Prediction scope

The narrow prediction is radial composition and closed-inventory sample purity and recovery for a specified ideal neutral gas in rigid, isothermal diffusive equilibrium. Speed, temperature, geometry and inventory are inputs.

This target does not predict the speed or temperature of a Marathon discharge. It does not qualify extraction flow, a power plant or a measured lithium apparatus. The Blender hardware remains a conceptual assembly where dimensions or materials lack a published specification.

Browser checks can verify links, controls, plots and layout. They cannot establish that a new reader understands the explanation. A first session with a new reader remains a separate check.

## Publication receipt

- URL: https://fieldwork-plasma-lab.fieldwork-plasma-lab.workers.dev/
- Worker version: `95a60b4b-ae24-4f55-8957-cc05c9ac7a8f`.
- Prepared manifest SHA256: `49171b60fd35a4fefff4f1673b95744888da4fe9cd3eb36cdbebf720fd6c7f16`.
- Prepared inventory: 470 files, including retained content-hashed chunks for older open tabs. Old HTML and unhashed data were not retained.
- The live prior manifest was checked before publication. It still matched `45eaeca81c62dc2c982ced8d2a104675c0da0c78`.

The live current comparison gave 0 m/s at 0 A and about 1,024 m/s at 0.03 A, both at one second. In the fixed-speed reference, axis light fraction changed from 8.108% at 500 K to 7.83% at 1,000 K. These are model outputs, not measured apparatus results.

The heat comparison gave 500 K for the prescribed bath and 953.2 K for the evolved gas at one second. The liner was 952.4 K. Its initial 1,000 K temperature is part of this result. At a full-vessel cut, the live plot and calculator gave feed purity and 100% light recovery. At zero cut radius, purity was undefined and recovery was zero.

## Remaining visual defect

Software-rendered CI screenshots show black/white stippling on the metal end plates. Interactive Brave screenshots show less stippling, but dark faces remain. The cause is unresolved. Static inspection found no duplicate triangles, incorrect broad-face normals, coplanar cover/flange surfaces or retained procedural end disks. This does not prove a software-only defect. A controlled shadow-off and microfinish-off comparison is the next diagnostic. No speculative shader or geometry change was added to this release.

The hardware, room and unknown material details remain illustrative. This release does not establish a measured Marathon assembly or experimental lithium performance.
