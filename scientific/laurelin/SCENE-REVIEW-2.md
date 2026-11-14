# Independent scene and UI review — 2026-11-14

Reviewed `src/laurelin-{scene,camera,workbench,physics}.js`, `laurelin.html`, CSS and the existing scene/workbench tests. Also opened a separate tab on the actual deployed site through the supported Brave extension. No project code was executed on the host; the parent owns isolated regression execution and deployment.

## Finding

**P2 — Unlabeled peak values look like instantaneous plot readouts.** Each caption displays `max(result.samples[key])`, but says only “Temperature”, “D density” or “D–D neutron rate”. At the initial timeline position the live page simultaneously showed a temperature caption of **3.68 keV** and current-state temperature **1.00 keV**. Scrubbing moves the cursor/readout while leaving the caption unchanged. The cause is an omitted description of the full-pulse maximum, rather than an incorrect thermal sample.

The smallest correction is the prefix **Peak** on each caption value. This preserves the existing full-pulse scale and current-state readout, avoids introducing another selected-value calculation, and makes their different meanings explicit. A new regression in `tests/laurelin-workbench.test.ts` checks all three labels and that the peak stays fixed while the current state changes from 1.00 to 1.56 keV. The parent reproduced the new regression failure with all other 24 checks passing in immutable check07 (source seal `2a62d65533c6b928442b7f6a44d271e4bf90d7fc9bf68dc8551d952516e0e31f`). I then applied the one-word prefix.

I independently checked all **21** retained export payload hashes, the **seven** check08 command-log hashes and zero exit codes, and both changed files against the tested source manifest `07393420863bf4168287f9eb59419d04072f982a2fff4db789d39ae315987ede`. The actual logs report **25/25 application tests** and **5/5 independent analytic controls** passing; typecheck, build, site and assets also pass. This verifies producer-run green evidence, not a reviewer-run repeat. The source/regression correction is closed.

The parent subsequently deployed that checked caption correction as Cloudflare version `5ca7dbb3-fb7c-4a99-9db6-6a58729e55cc`. In its separate native Brave verification, all three Peak labels stayed fixed while current temperature changed **1.00 → 0.96 → 1.56 keV** at **0 / 20 / 80 µs**; all three cursors reached x=130 at fraction 0.4. The parent also reported 390-px document width at 390×844 and an empty warning/error capture, then reset the viewport and restarted the pulse. I inspected its retained `review2-peak-live.jpg` and `review2-peak-phone.jpg`: both visibly distinguish Peak 3.68 keV from current 1.56 keV at 80 µs. This closes the displayed-caption finding using parent-operated post-deployment evidence; it is not a second live interaction by this reviewer. My earlier independent browser observations below concern prior version `13fe1bf6-40b2-4e36-9743-81aa56d5e4ed`.

The deployed before-correction screenshot is retained as `scientific/laurelin/retained/review2-peak-before.jpg`.

## Source-path checks

- The two initial plasma ellipsoids each have half the merged axial semiaxis at the same radius; their volumes sum to the merged volume. At the merge boundary their combined axial extent matches the merged body.
- The scene consumes the same selected sample as the numerical readout. Its radius scales with `sqrt(V/V0)` at fixed length; display units preserve the declared reference ellipsoid aspect ratio. The analytic field contours follow that same scale.
- Translation is a normalized phase animation. The page explicitly says it is not a computed trajectory. Field curves are analytic poloidal-flux contours, not solved fields or ion trajectories. Materials, dimensions and clearances are disclosed assumptions; there is no observed company-CAD claim.
- Picking includes inspectable meshes and filters ancestor visibility. Decorative field lines do not intercept hardware selection. A keyboard component selector supplies a parallel inspection route.
- The pressure-equivalent field is explicitly marked as a beta-one estimate, rather than inferred coil current or solved equilibrium.

## Live observations and limits

The actual WebGL assembly rendered with the pair of plasmas visible. Opening Parameters/Plots and resetting inputs worked. At **390×844** and **390×460**, document width remained 390 px; the parameter panel scrolled, Reset remained reachable, and the transport panel remained outside its footprint. The browser warning/error capture was empty. Temporary viewport changes were reset and the reviewer-created tab was closed.

These are independent source and live-layout observations, not an independent numerical rerun, a physical FRC validation, an exhaustive control sweep or certified browser coverage. No other demonstrable scene/state blocker was found in this bounded review. Default geometry remains illustrative and the actual Laurelin equilibrium, merging, stability and circuit are unsolved.
