# v43 deployed browser acceptance

9 November 2026. Root exercised the deployed site through the authorized Brave extension. No managed-policy bypass, alternate automation channel, or browser security setting change was used. Observations below are browser evidence, separate from CPU regression tests and scientific qualification.

## Exercised paths

| Playground | Desktop and mobile observations |
| --- | --- |
| Spinner | Changed voltage 400→380 V; accepted cutoff changed 69.5→73.1 u/e and destinations/plots updated. Pending exports disabled. Selected a visible impact dot and received species, boundary, time, energy and SI position. Apparatus fitted with both side panels open. |
| Marathon | Enabled the material model; entered physical heat capacity 5000 rather than its logarithmic slider coordinate. Changed beam energy 100→105 keV and observed updated neutron rate, power and plots. Picked the ceramic spacer: visible Inspect showed assumed alumina and working Parameters/Results shortcuts. Selected time 15 s and observed the beam-off state, zero instantaneous neutron source and corresponding temperature. Switched film/backing surfaces and the separate future-blanket design; cooldown changed the displayed inventory. |
| Models | Loaded all seven mechanism geometries, waiting for actual renderer readiness. At 2000 radial intervals, refinement is disabled with explicit unassessed status. Persistent named mechanism chooser remains usable with Controls closed. ICR collection/energy plots populate; collisional mode preserves budget-exceeded and continuum-unqualified diagnostics. |
| Research | Selected a combined case and saved terminal time; tensors and plots changed together. Loaded recorded distributions. Both species tensors remain visible at 390 px; at 320 px any extra numerical width scrolls locally. Qualification remains withheld. This recorded homogeneous study has no physical reactor geometry. |

Full matrix used 1440×900 and 390×844 browser viewports; Research additionally used 320×740. Mobile surfaces ended 12 px above the dock. Actual hardware meshes, accepted layers, true-scale caption, and separate mechanism/provenance bands were observed. Screenshots and AX captures are retained in [v43-evidence](v43-evidence/).

## Additional failures found during live acceptance

1. **Stray `null` heading text.** Capturing the h1 after detaching its parent returned null; appending that result created visible text. The fix captures the existing heading before reparenting. The actual initialization-order regression verifies heading identity and absence of stray text. The corrected deployed candidate was reopened across all four playgrounds.
2. **Legacy renderer first-use clipping.** Its fixed camera position and projection-only resize ignored the narrow viewport left by side panels. The fix derives the loaded hardware bounding sphere, fits the limiting horizontal/vertical field of view, and rescales the camera offset and zoom limits on resize. Keyboard zoom uses those same limits. This preserves user framing rather than resetting the orbit after every resize. Fresh final deployment acceptance is recorded below.

## Scope

These are desktop-browser mobile viewport checks, not physical-phone testing or a 200% zoom audit. Console warning/error capture was empty during the exercised paths. Export controls were exercised; downloaded-file readback was not completed through the browser API. Actual main export generation, accepted-result identity/race handling, and emitted-worker identity have separate executed regression evidence. Passing UI checks does not qualify collision transport or calibrate Marathon against an actual machine.

## Final camera/zoom deployment acceptance

The governing candidate passed 865/865 tests and all seven checks. Cloudflare reports version `49762a3a-b928-491a-b00a-6ef09739aa15` at 100%; the reopened browser loaded `/assets/index-B8zedRyd.js`, matching that exact checked release.

- First use of Live assembly at 1440×900 with View and Plots open fits the entire assembly, both flanges and supports: [reset](v43-evidence/final-legacy-reset.png).
- Pressing minus immediately, without first pressing plus, visibly reduces its size: [minus](v43-evidence/final-legacy-minus.png). The actual initialized-camera regression independently measures the increasing distance.
- Resizing that same view to 390×844 preserves a complete, centered model without Reset: [mobile](v43-evidence/final-legacy-mobile-visible.png).
- Reopened all four playgrounds on this final candidate at desktop and mobile sizes. Research still shows both tensors at 390 px (each 308 px with no internal excess; document width 390 px). Actual target-model acceptance produces 3.100e10 D–T/s at 20 °C; scrubbing to 15 s shows beam off, instantaneous source zero and 20.01 °C, with surfaces and plots at the same time: [target](v43-evidence/final-marathon-coupled.png), [time](v43-evidence/final-marathon-time.png).
- Final captured warnings/errors: empty. Temporary viewport override reset to the user's natural 739×778 viewport. Live site retained for the user.

[Browser receipt and evidence hashes](../../scientific/fixes-v43/browser-final.json). The complete control matrix above was exercised on the preceding heading-fixed build; the final delta changes only legacy camera limits/framing and their regressions. This final smoke pass supplements that matrix rather than claiming every control was re-exercised after an unrelated camera-only change.
