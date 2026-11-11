# Playground redesign and adversarial audit — v19

7 November 2026. User direction: visual simulators and parameter playgrounds,
without an ordered lesson structure. Five reviewers traced all four levels and
cross-level interactions. Their original findings remain preserved separately;
this document records the resulting implementation and evidence boundaries.

## Resulting interface

- Level 1: rotating ions, four controls, collection/trajectory plots and versioned
  experiment links. The introductory lesson/steps panel is removed.
- Level 2: beamline console, beam and tritium switches, beam/target/electrical
  controls, a correctly scaled circular footprint, live output metrics and energy
  scans. Equations and explanations are expandable model notes. No lesson cards.
- Level 3: seven advanced separator models, with mechanism/tradeoff prose collapsed
  and actual plots prominent. Comparisons expose each independent operating point.
- Level 4: recorded-case/time viewer over exact saved Julia moments, with full
  tensor readouts, mean-velocity and diagonal/off-diagonal evolution plots.
  Static study figures and convergence details remain available on demand.

Level 4 replays three n6 cases/63 saved states. It changes neither physical inputs
nor numerical results, and does not interpolate a new state or start a solver.
Public raw moment data includes configurations, normalization and source hashes.
Complete source/velocity archives remain local; this is partial public provenance.

## Root causes and decisions

The v18 presentation mapped the three concepts to numbered question/explanation
cards and gave Level 4 static report images. In technical terms, the frontend
rendered prose around existing kernels and had no recorded-data controller.
Simply, the experience asked visitors to read before manipulating results.
The fix replaces that presentation with the console and recorded-run viewer,
while retaining the unchanged numerical kernels. Replacing or porting a solver
would not fix this interaction problem and would introduce new qualification work.

| Finding and cause | Smallest coherent fix | Why this choice |
| --- | --- | --- |
| Hidden levels produced a 0×0 stage; the resize callback divided width by height, making camera aspect NaN. A hidden panel could poison the next 3D view. | Ignore nonpositive stage dimensions; keep the last valid camera until a visible resize. | Positive dimensions are a real camera invariant. No renderer replacement or arbitrary aspect fallback. |
| Plot inspection existed only on pointermove. Keyboard users could change controls but not inspect samples. | Shared Arrow/Home/End inspection, focusable charts and live sample readouts. | One implementation covers every level; Tab remains unhandled for normal focus navigation. |
| Preset aria-pressed flags changed only on preset clicks. Slider edits made selection indicators disagree with the actual fields. | Treat presets as commands and remove pressed-state semantics. | There is no persistent exclusive selection to synchronize; no duplicate preset state is needed. |
| Copied URLs and success text survived parameter edits, including delayed clipboard completion. A visible link could describe old controls. | Clear visible share state on edits and reject stale asynchronous confirmation using the input revision. | Versioning enforces a real snapshot boundary without changing the fixed-source URL schema. |
| Survival auto-zoomed from about .999995 to 1; four-significant-digit formatting rendered every tick as 1. A tiny loss occupied the chart height. | Give survival an explicit 0–1 physical fraction domain; keep probability/yield axes nonnegative, including zero-output controls. | Preserve the computed data and show the correct denominator, rather than clipping small losses or inventing a minimum reaction rate. |
| Sensitivity scans intentionally held the toy target fixed, so moving energy left an apparently unchanged graph. | Include the exact slider energy among scan samples and draw its operating-point marker. | Preserve the correct sensitivity calculation and show where the selected experiment lies on it. |
| Logarithmic controls could never reach zero current or zero T column. | Explicit Beam on and Tritium loaded switches map to the backend's exact-zero limits. | Clear physical controls; no numerical floors or log-of-zero arithmetic. |
| Invalid fusion inputs cleared numbers but could retain old beam/neutron glyphs. | Clear dynamic geometry/labels and hide both glyph groups; valid updates restore them. | Extend existing stale-output invalidation instead of showing a preceding valid state. |
| Supported high-B/light/high-charge ions had no offered timestep satisfying the existing gyro guard. | Add 8 ns: 75,000 steps at the unchanged .6 ms horizon. | Resolves the demonstrated corner without relaxing either the .03 phase guard or 100,000-step budget. |
| Comparison cards hid independent model-specific B/energy controls and limits. Numbers could look like matched operating points. | Snapshot configurations before dispatch; expose each configuration and its current model-boundary status. | Do not silently overwrite distinct models' controls or compare incompatible observables as one metric. |
| Curved-drift sliders allowed rho/R≥1 or ≤1 gyroperiod without a prominent invalid-regime warning. | Label such results outside the guiding-centre approximation and as extrapolations; retain scale-ratio diagnostics. | These are clear gross violations, not a fabricated sharp validity threshold for the asymptotic regime. No drift coefficient or gate changed. |
| Research summaries abbreviated increment convergence and foregrounded fine passes. Adjacent levels could imply a Marathon/device backend. | Show v16's 16 PASS/six coarse FAIL, label evolution-increment comparisons, define 40/84-u/V₀ and keep physical qualification withheld. | Numerical differences between increments are not absolute-distribution or device-accuracy certificates. |

The Level 2 footprint uses radius √(A/π) against a fixed 40 cm reference diameter.
Color does not encode target temperature. Beamline geometry is conceptual and
neutron rays indicate directions, not sampled event counts. Assembly heat is
conditional on the substrate stopping the transmitted beam. Source strength is
not sample flux; nuclear output is not net electricity.

## Independent evidence

- [Level 1 audit](PLAYGROUND-AUDIT-L1-V19.md): source/configuration/share paths and
  event-state findings; source-only review, no numerical or browser execution.
- [Level 2 audit](PLAYGROUND-AUDIT-L2-V19.md): 72 adversarial corners in a distinct
  offline VM. Number/energy residuals about 1.5e-14; UI-range probability agrees
  with independent 20,000-interval integration within about 5 ppm relative.
  This checks integration of the imposed toy model, not LiT or Marathon accuracy.
- [Level 3 audit](PLAYGROUND-AUDIT-L3-V19.md): 126 tests, typecheck and production
  build pass in a distinct copied safe-dev VM; supported-domain issues reproduced.
- [Level 4 audit](PLAYGROUND-AUDIT-L4-V19.md): actual result dictionaries and
  original image hashes checked, with no new status/arithmetic contradiction.
- [Interaction audit](PLAYGROUND-INTERACTION-AUDIT-V19.md): independent archived
  failure reproductions and fixed-path checks, including all 63 replay states,
  beam toggles, invalid recovery, JavaScript syntax and isolated stylesheet build.
- [Recorded-data integrity](RESEARCH-RECORDINGS-V19.md): six integrity tests;
  all 1,575 exported floating values match saved originals bit-for-bit. No
  solver or physics recalculation.

All project execution used Apple safe-dev VMs. No host credentials/home/socket
mounts and no browser-policy workaround. These are source, unit, independent
formula/data and build checks. Live browser/GPU rendering remains unverified.

## Scientific limitations retained

Marathon target/stopping/cooling inputs remain illustrative, with no measured
operating point or temperature/lifetime/product-yield/net-electric prediction.
The browser separator collision paths are exploratory and have retained spatial,
distribution and angular-momentum convergence failures. The offline 3V studies
retain rate, increment-refinement and rotation failures; physical-H allowance
acceptance does not establish an H theorem. Replaying moments changes none of
those findings. No physics kernel or acceptance threshold was changed here.

Final application snapshot, logs and publication are recorded in
[the verification packet](../scientific/verification-v19/README.md). Final gate:
274 tests PASS; typecheck, build and static-site checks exit 0. All 259 input
files match the tested source map and actual export; all 99 built files match
the exact release map. Existing large renderer-chunk warning remains.

Published version `fe9ac4ef-6e6c-4483-9a46-3c52e4049b1a` is confirmed by
Cloudflare's separate latest-deployment record at 100%. Five changed assets
uploaded; 94 reused. Only reviewed build output was published, using the isolated
deployment VM and its existing authorized login. No live browser verification
claim follows from successful publication.
