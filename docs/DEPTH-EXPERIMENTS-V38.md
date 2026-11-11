# Technical depth fixes — v38

## Passive collection

Problem: drawn collectors had no adjustable acceptance, so collection was conflated with arriving anywhere on a terminal surface. Technically, orbit impacts already retain complete positions but the summaries aggregate only destination counts. In plain terms, changing the opening could not change what the collector accepts.

Fix: `collectorAcceptance` applies an annular radial mask and optional axial interval to complete saved impact records. It preserves every incident nucleus in accepted, rejected, other-terminal or remaining inventory. Recovery divides by the original injected count. Purity divides by accepted simulated counts and is undefined for an empty collector. There is no g/s prediction or physical feed-weight assumption. End, wall and source surfaces are supported. Zero aperture is exactly empty; full aperture reproduces the original destination counts, including floating-point surface roots.

This is the smallest justified implementation because a passive aperture does not alter upstream orbits. Reintegrating the same prescribed fields would add cost without improving this observable. A biased collector, sheath or aperture that changes fields requires a new field/boundary model; this mask does not claim those effects. Incomplete old records are refused rather than inferred from histogram bins or sampled display paths.

Integration: `setupCollectorAcceptance(container).update(result)`, where `result.config.radius` and complete `result.species[].impacts[].position` are required. The parent wires completed orbit results to the panel.

## Actual recorded distributions and physical entropy

Problem: the public replay exported moments only. Many distinct distributions have identical moments, so fitting a Maxwellian to those moments would invent the very shape information the user wants to inspect. The complete positive Gaussian-mixture marker arrays and independent audit results already exist in the scientific archives.

Fix: `scripts/export-research-depth.py` evaluates one-dimensional marginals directly from each saved marker's velocity, positive weight and species kernel variance. It does not fit a Maxwellian or run a collision solver. All 63 exact saved times from the existing three n6/q5/α0.1 drift, anisotropy and combined cases are exported. The 378 species/axis marginals use 161 points each and retain population, first and second moments, kernel variance, source paths and SHA-256 identities. Public packet: `/research-depth/recorded-distributions.json`, 2,575,356 bytes; SHA-256 `43b5c17beaa8ddace06ca76ed29662a0968d64fc98f1499e53517bbae6ec52d5`.

The exporter gates every marginal's trapezoidal population/first/second moment error at 1e-8 relative to `max(1, |moment|)`. Observed maximum: 6.8834e-15. Independent regression checks compare integrated means and variances with the original moment packet for every state/species/axis. There are 20 pinned scientific/public source inputs.

The packet copies physical H estimates and their integration sensitivity from the independent v17 audit without altering decisions. The plot shows ΔH divided by initial total population and the sum of initial/current integration sensitivities. These are empirical integration estimates, not confidence intervals, certified error bounds or proof of an H theorem. All three selected physical-entropy gates remain UNKNOWN. Thirty-eight archived v16/v17 refinement records retain their original decisions, witnesses, integration metadata and source identity. v16 isotropic passes do not qualify the different general-3D v17 operator. A characteristic-function lower witness is not displayed as an evaluated full L¹ integral.

The UI loads these arrays only on request, plots a selected velocity-axis marginal and archived H history, and matches exact existing case/step keys. Unsaved states are unavailable; no interpolation or reconstructed distributions are offered. Existing moment replay remains independent and can still load if the separate distribution request fails.

This uses the retained scientific representation rather than introducing another live solver whose qualification would be unresolved. It makes actual distribution information inspectable while keeping the solver's failures visible.

## Scoped hydrogen charge-exchange kernel; generic coupling remains incomplete

The [Janev–Reiter–Samm primary report](https://juser.fz-juelich.de/record/38224/files/Juel_4105_Reiter.pdf), §2.2.3, Eq. 44 and Table 9, supplies a total H⁺ + H(n=1) capture fit. Its stated range is approximately 0.1 eV–2 MeV and accuracy 10–20%. [FIDASIM's `p_cx_1_janev`](https://d3denergetic.github.io/FIDASIM/sourcefile/atomic_tables.f90.html) independently implements this parameterization using keV/amu and cm². Coefficients A₁…A₆ are pinned in the helper: 3.2345, 235.88, 2.3713, 0.038371, 3.8068e-6, 1.1832e-10. Conversion to SI cross section is explicit.

`hydrogen-charge-exchange.ts` deliberately narrows this to explicit H-1 nuclear identity, proton nuclear mass, a cold stationary H-1 target and 0.1–20 eV/u relative laboratory energy. The upper bound keeps equal-mass center-of-mass energy below the first excited-state capture threshold. It returns both the tagged fast neutral and the reservoir-origin slow ion, using the straight-through nuclear-trajectory approximation; nuclear deflection and electron inertia are omitted. Atom, charge, nuclear momentum and kinetic-energy ledgers are tested from returned products. Constant-hazard event time obeys `t = -log(1-u)/(n σ v)` and exact constant-path survival `exp(-n σ L)`. Zero density disables the channel exactly.

This helper supports a separate [restricted analytic H-1 first-capture experiment](HYDROGEN-FIRST-CAPTURE-V38.md); **generic live coupling remains incomplete and full physical charge-exchange transport is not validated**. The total-capture fit does not specify or validate a differential nuclear-scattering law. Straight-through product kinematics are a declared approximation, not established by the total cross section. Generic 40/84-u ions have no atomic identities, and their masses cannot select hydrogen cross sections. Switching only the tagged ion's charge would lose a charged reservoir-origin nucleus; resetting velocity would lose the fast nucleus's energy. Neither is an acceptable local fix.

A reviewable live-coupling split is required:

1. Add explicit H-1 species preset and identity validation; incompatible generic-ion inputs must refuse this channel. Provide a cold-target boundary and enforce the energy range throughout acceleration, without clamping or silently disabling unsupported collisions.
2. Separate injected/tagged nuclei from reservoir-origin secondary ions in the state/result inventory. Add per-particle and per-impact charge. Preserve original-injection recovery denominators; do not count a newly ionized reservoir atom as another injected ion.
3. Integrate optical depth along the accelerated charged orbit, locate the reaction time against wall/end/source events, and restart both product trajectories at that position/time. The tagged neutral then propagates ballistically; the slow ion follows Lorentz dynamics and may undergo subsequent exchange. Keep finite-time uncollected products explicitly remaining.
4. Validate constant-field-free exponential survival, zero-density bitwise baseline recovery, event-boundary timing, timestep refinement, both-product atom/charge/momentum/energy accounting and closed collector inventories. Add target recoil/differential scattering or resolved excitation data before extending beyond this approximation/range.

## Verification evidence

All project execution occurred in the unique Apple safe-dev VM `safe-dev-d1fcc58287ea69d9`, from explicitly synced host stage `/tmp/mass-spinner-depth-v38`. No host source mount, credentials or sockets were used. Online execution was restricted to `npm ci --ignore-scripts --no-audit --no-fund`; export and checks ran offline. The final checked copy was exported to `/tmp/mass-spinner-depth-v38-final-export-2` before preserving its results.

Exact commands/results are in `scientific/depth-experiments-v38/depth-v38-gates.json`, including SHA-256 identities of that historical checked source/input snapshot. Its narrow command executed five named test files: collector acceptance, research distribution, depth UI, existing research controls and hydrogen charge exchange. **17 tests passed, 0 failed.** Strict TypeScript checking of the three new scientific TypeScript modules passed. An earlier full repository typecheck passed before the final hydrogen module; the parent performs the final integrated repository build/typecheck/test gates.

The integrated responsive renderer subsequently added observer ownership. Both distribution error paths now call `renderPlots(plots, [])`, disconnecting ResizeObservers before removing figures. A new jsdom lifecycle regression verifies invalid saved-state selection disconnects every existing observer and that a later valid selection creates fresh observers. The parent also hides unsupported unpositioned collector results; the UI regression now checks this behavior. After these changes, `node --import tsx --test tests/depth-ui-v38.test.ts tests/responsive-plots-v38.test.ts` passed **six tests, zero failures**, offline in the same explicitly resynced safe-dev VM. These edits supersede the earlier UI hashes and are covered by the parent's final integrated snapshot.

UI evidence here is jsdom interaction testing, not observed GPU/browser/mobile rendering. Managed browser-origin policy remains a separate verification limitation. No generic charge-exchange transport, new collision qualification, calibrated apparatus prediction or deployed-browser pass is claimed by these checks. The later restricted H-1 experiment has its own source snapshot and verification record.
