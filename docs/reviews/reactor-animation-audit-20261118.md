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

Pending final exact-commit CI and deployed desktop/phone checks. New regressions
inspect rendering buffers and real mesh geometry, not only metadata or helpers.
Required gates: strict typechecks, lint, full runtime/Python suites, build,
site/assets/glTF checks, exact-candidate browser tests and public release hashes.

## Retained limits

Isotropic neutron emission is an explicit approximation; weighted low-count
samples are coarse, straight rays are unattenuated, and no shielding, scattering
or dose is calculated. Ion/neutron speeds use the source's nonrelativistic
mass-number convention with separate display slowdown factors. Apparatus
construction remains assumed where Marathon publishes no dimensions. The power
reactor is a normalized reference animation, not a solved plasma or plant.
