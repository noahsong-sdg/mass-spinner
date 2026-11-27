# Reactor animation audit · 18 November 2026

Scope: source/accepted-target → apparatus state → actual GPU position buffers,
heat inset and viewport lifecycle. Four independent adversaries reviewed physics,
visual clarity, state ownership and geometry. These are display corrections;
they add no experimental qualification or neutron-transport solver.

## Confirmed defects and fixes

| Defect / cause | Correction and regression evidence |
| --- | --- |
| Birth radius and flight direction reused one index, producing outward-only transverse rays despite correct marginal angular moments. | Separately sampled disk births and antipodal equal-weight angular quadrature; tests recover directions and births from actual buffers and check conditional moments, cross-moments, radial second moments and low populations. Pairs represent quadrature, not individual reaction products. |
| First twelve production-indexed flashes occupied a shrinking fraction of the footprint. | Twelve area-uniform sites independent of production count; rate changes brightness. Zero production removes sites. |
| Fractional-span motion made speed depend on apparatus length; current speed multiplied accumulated time, teleporting particles on energy edits. A timestep cap also slowed low-frame-rate motion. | Integrate fixed display-scaled physical speed over actual elapsed time. Buffer tests check geometry independence, continuous energy edits and frame partition invariance. |
| Thermal faces were equally spaced over a beam-radius distance; refinement shrank arrowheads and a global opacity hid local changes. | Separate explicitly expanded film/backing inset with physical within-material face depths, local flux shading and spaced fixed-size chevrons. All faces retained; sparse flux and refinement tests prevent lost boundary/interior flow. |
| Internal heat redistribution could be labeled coolant removal; no signed coolant readout. | Show signed last-face flux × illuminated area, including reverse transfer and insulated/internal-only states. Initial source remains a conditional stopping budget. |
| Recreating the frame callback on every input update reset elapsed time. Observer re-entry reloaded the same asset and lost view choices. | Stable callback and successful/in-flight asset identity tracking. Regress repeated updates, pause, reduced motion, visibility, failed-load retry and disposal. |
| Initial-source maximum footprint crossed the reference bore; SI extraction bore was smaller than its prescribed beam. | Preserve square-root area scaling inside the reference bore; illustrative SI electrodes clear the entire beam with a finite wall. Actual mesh/raycast tests cover minimum/default/maximum areas. No focusing or interception prediction is implied. |
| Empty/hidden processes kept animating; the power reference exposed a no-op Beam toggle. | Schedule only visible nonzero motion; hide unsupported reference control. |

The expanded inset was chosen over exaggerated 3D plume geometry because it can
show micrometre and millimetre scales honestly without implying a solved coolant
velocity or volumetric heat field. The existing 3D hardware and temperature
surfaces remain the spatial context.

## Verification

[CI 44376236846](https://github.com/noahsong-sdg/mass-spinner/actions/runs/44376236846)
passed at exact runtime commit `6abf73a975755ee9d9f53470cc985a9f902a90ba`:

- `npm run typecheck`, `typecheck:infrastructure`, `typecheck:boundaries`,
  `typecheck:tests` and `lint`: passed.
- `node --import tsx --test --test-concurrency=1 tests/*.test.ts`: 1,528 passed.
- Python unittest discovery in `scientific/electron-applicability` and `tests`
  (`test_argon_reference_export.py`): 17 + 3 passed.
- `npm run build`, `check:site`, `check:assets`, `check:gltf`, `release:seal`
  and `release:verify`: passed; 238 release files verified.
- `npm run test:browser`: 26 passed on the exact candidate; the reactor case
  passed desktop (20.2 s) and phone (21.8 s). Release hashes verified again after.

Independent agents reviewed the completed CPU and browser job logs. New tests
inspect actual rendering buffers and mesh geometry, not only metadata/helpers.
Native candidate inspection confirmed coolant removal, insulated internal-only
redistribution, hotter-coolant reversal, pause/visibility persistence and a
390 × 844 layout without horizontal overflow.

The same release is deployed as Cloudflare Worker version
`e63202fa-601a-41cf-b2b6-768c3832ec78`. All 238 browser-verified files match
the candidate byte-for-byte. The public manifest, all 11 changed files and one
retained lazy-load asset match their expected hashes. Previous hashed assets
remain available for already-open tabs.

Native public-site browser verification repeated energy/current/area changes,
tritium-off and beam-off behavior, material-state selection, insulated cooling,
hot-coolant reversal, pause/layer persistence and desktop/phone layout. At the
default driven sample (0.1875 s), coolant transfer is 246.823 W. At 15 s,
beam/neutron populations and deposited power are zero while 0.626 W of retained
heat still leaves the target. No browser errors were recorded. These are checks
of displayed accepted simulation values, not measured experimental powers.

Local receipts, full logs and screenshots are in
`output/reactor-animation-audit-20261118/`. The report-only follow-up changes no
runtime or release asset; CI and deployment identity above refer to `6abf73a`.

## Retained limits

Isotropic neutron emission is an explicit approximation; weighted low-count
samples are coarse, straight rays are unattenuated, and no shielding, scattering
or dose is calculated. Ion/neutron speeds use the source's nonrelativistic
mass-number convention with separate display slowdown factors. Apparatus
construction remains assumed where Marathon publishes no dimensions. The power
reactor is a normalized reference animation, not a solved plasma or plant.
