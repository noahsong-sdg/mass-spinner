# V29 adversarial audit: full ion orbits

Date: 2026-11-08. Scope: the production `simulate()` orbit backend, its worker dispatch, rotating diagnostics, RF drive, pulsed source, neutral scattering and absorbing collectors. Reduced gyro/curved geometry, collisional equilibrium and other research solvers have separate team audits.

## Result

One implementation defect was reproduced and corrected: active RF amplitude was absent from the timestep resolution invariant. A zero-frequency, zero-B RF case could pass validation with a grossly unresolved accelerated collector crossing. This is P2 for the public numerical API; the current orbit UI's B/dt ranges exclude the demonstrated failure. No new sign, cutoff, RF polarization, source-temperature or elastic-scattering defect was found in the bounded independent checks below. This does not qualify the model as a self-consistent plasma separator prediction.

Evidence is in `scientific/physics-audit-v29/orbits/`. `snapshot-manifest.json` records every copied source/test/config hash in the red and green VM snapshots. The old witness is preserved separately; earlier scientific studies were not edited.

## Traced execution path

`src/main.js` constructs orbit settings; `calculate()` routes them through the computation controller to `src/worker.ts`, whose explicit `kind:'orbit'` calls `simulate()`. Geometry modes have a different worker kind and do not use these full trajectories. `simulate()` first calls `validate()`, samples paired source positions, uses separate thermal/collision random streams, then integrates prescribed DC plus midpoint RF fields with `step()`. `firstHit()` selects the earliest absorbing surface along the full-step position chord. On collection the code reintegrates a fractional step for velocity and RF work. Surviving particles may undergo a cold-neutral elastic event. The paths retain only eight particles per species, with display sampling independent of the integration/counting.

The ideal cold cutoff is a diagnostic derived from the infinite prescribed-field radial equation, not a direct prediction of finite-device recovery. Stable bounded orbits can still hit the wall, and growing orbits can leave axially before hitting it.

## Corrected P2: unresolved constant-RF wall events

Trigger: default geometry/species/seed; ICR, fixed source, V=0, B=0, RF frequency=0, RF amplitude=200 V/m, perpendicular energy=0, axial energy=2 eV, source radius=.04 m, one particle/species, duration=dt=100 microseconds. The old implementation accepted this run. Exact constant-acceleration kinematics gives:

| Species | Exact wall time | Old wall time | Exact kinetic energy | Old kinetic energy |
| --- | ---: | ---: | ---: | ---: |
| 40 u, +e | 43.801853 us | 19.186023 us | 94.558491 eV | 19.758294 eV |
| 84 u, +e | 63.474915 us | 40.290649 us | 94.558491 eV | 39.292417 eV |

The first time error is 56.2%, although its full-step energy residual is zero and impact energy residual is 1.44e-14. `rf-degenerate-probe.json` preserves the old results and refinement sequence.

Technical cause: the previous `dt * max(gyrofrequency, DC-gradient rate, RF frequency) <= .03` check has all three rates zero for this input. Nevertheless, RF accelerates the ion. Constant-E state integration is exact, but a chord through a long accelerated step crosses the wall too early. Fractionally reintegrated impact velocity/work remain energy-consistent at that erroneous time; the RF-only Hamiltonian has no radial potential term to expose the chord-position mismatch.

In simple terms, the endpoint calculation is correct while the straight line used to find when it reached the wall is much too coarse. Balancing the energy ledger cannot prove the arrival time is right.

Fix: include `sqrt(max(q/m) * E_RF / a_device)` in the existing .03 guard only for active ICR mode. Include the same species-specific acceleration scale in path sampling. This enforces

`0.5 * (q E_RF/m) * dt^2 / a_device <= 0.00045`.

The bound is relative to device radius, not distance from an arbitrarily near-wall source; it is not a global accuracy guarantee. Refinement remains necessary. Zero-amplitude and off-mode RF do not acquire this constraint. Existing solver counts, random streams, work accounting and collector semantics are untouched.

This is the smallest coherent repair of the missing resolution scale. An exact accelerated/RF event root solver would be a larger independent change. A post hoc energy guard would miss this demonstrated case. Clipping a result or silently shrinking the timestep would change numerical behavior without exposing the unresolved requested step.

Current UI check: B>=.04 T, mass<=200 u, charge>=1, radius=.48 m and E_RF<=200 V/m imply the RF-acceleration/gyro-rate ratio is at most .735. The existing gyro bound already dominates it. Thus the new rejection does not reduce current UI-accessible orbit settings.

Red/green evidence: the nine new tests against old `physics.ts` gave eight passes and the expected missing-exception failure for this trigger. With the repair, the nine new plus 41 neighboring tests all passed. Accepted RF steps .8/.4/.2 us have maximum relative arrival errors 3.1223e-5 / 1.0424e-5 / 1.1624e-6 against independent kinematics; energy errors satisfy the separately derived shrinking quadratic envelope. Zero-amplitude and off-mode cases remain accepted.

## Independent equations and bounded checks

For `u=x+iy`, alpha=`2qV/(m a^2)` and signed Omega=`qB/m`, the equation is `u'' + i Omega u' - alpha u = 0`. Its repeated root occurs at `Omega^2=4 alpha`, giving `m_c/q=B^2 a^2/(8V)`. The code's potential sign, outward E, Brillouin branches and charge scaling agree. New tests use B of both signs and charges 1, 2 and 3 rather than calling the diagnostic as their reference.

For zero initial transverse velocity in the growing regime, `gamma^2=alpha-Omega^2/4` and `r^2/r0^2=1+(alpha/gamma^2)sinh^2(gamma t)`. Directly solving this expression gives an independent cold wall time. A bounded scan of V=0/400/800 V, B=.04/.1/.25 T, axial energies=2/20/100 eV and dt=40/20/10 ns (81 runs, 8 particles/species) had zero collector-destination disagreements with direct radial/axial first-arrival references. Worst relative impact-time error was 4.8747e-6. This is a cold, fixed-source check, not an RF/thermal/collisional throughput qualification.

Circular RF obeys `v'+i Omega v=(q E0/m)exp(i h omega t)`. From rest, its exact speed is `2(q E0/m)|sin((Omega+h omega)t/2)/(Omega+h omega)|`, with resonant limit `(q E0/m)t`. Independent tests verify resonance, counter-rotation and both signs of B with second-order timestep refinement. DC energy and canonical angular momentum are checked together under refinement, since speed/energy alone can hide phase errors.

The source is a drifting Maxwellian *pulse at z=0*, not a flux-weighted thermal reservoir. For Ebeam=2 eV and Tz=10 eV, the analytic negative-velocity probability is `Phi(-sqrt(2 Ebeam/Tz))`, approximately .2635. A 1000-particle paired sample returns the expected fraction immediately at the source plane. This behavior is consistent with the selected pulsed-source model, not evidence of a source-loss bug.

Cold-neutral COM scattering was independently integrated with eight sphere-cubature directions. Each unequal-mass pair conserves momentum and kinetic energy; the ion angular mean velocity is `m/(m+M)` times the incident velocity and its mean squared-speed fraction is `(m^2+M^2)/(m+M)^2`. Frozen-speed no-collision survival follows the exact exponential semigroup. These checks validate the implemented isotropic cold-neutral operator, not actual species-dependent cross sections.

One initial audit-test assumption failed: it required successive chord-event errors to have a fixed Richardson ratio of four. For a quadratic trajectory the interpolation coefficient depends on the within-step crossing phase. That ratio need not hold for successive meshes. The corrected three-level test uses a shrinking O(dt^2) absolute envelope, retaining its original 6-ppm 40-ns error budget. The original failed assertion is preserved in `initial-test-design-failure.log`; this was a reference-test correction, not an additional production change.

## Model limitations and unqualified domains

These are declared limitations or future research tasks, not implementation fixes made here:

- Prescribed uniform B/parabolic DC/circular uniform RF do not solve electrons, field penetration, antenna coupling, quasineutral response, space charge, sheaths, instabilities or source/collector plasma coupling.
- ICR has no self-consistent RF loading, antenna power efficiency, electron damping or gas-specific charge exchange. Finite prescribed trajectories cannot establish plant throughput/efficiency.
- The cold neutral bath uses an assumed constant isotropic cross section. Its one-event-per-step approximation and endpoint collision timing require timestep plus ensemble convergence even under the optical-depth .02 guard; physical gas validation requires external cross-section/temperature data.
- Chord collector timing remains second order in the smooth examples checked, with phase-dependent coefficients. The new guard does not certify near-tangent contacts, arbitrarily near-boundary sources or every accepted API configuration.
- Eight displayed paths are illustrative samples, not a density reconstruction. Equal-number injection and fixed eV temperatures should not be mistaken for identical velocities across masses.

The primary tutorial's IIA and IID discussions support treating gyro/RF selection and rotating filters as distinct mechanisms and emphasize collection, field penetration, collisionality and throughput restrictions. See Zweben et al., [Tutorial on plasma mass separation](https://w3.pppl.gov/~fisch/fischpapers/2018/Zweben_PMF_POP18.pdf), PDF pp. 4–5 and 7–8. The tests above check the stated mathematical reductions; they do not validate all those device-physics requirements.

## Exact checks and provenance

All dependency installs and execution used copied stage `/tmp/mass-spinner-adversarial-orbits-v29` in safe-dev guest `safe-dev-0f47d4037f8bc23e`, no host mounts. Network was enabled only for the initial bounded `npm ci --ignore-scripts`; later installs used `npm ci --offline --ignore-scripts`. Guest-only probe outputs were exported before replacing any guest snapshot. No production physics was executed on the host.

Commands, prefixed with `/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-adversarial-orbits-v29 run --`:

```text
node_modules/.bin/tsx probe.ts                         # 81 old-source cold runs
node_modules/.bin/tsx rf-degenerate-probe.ts           # old-source counterexample
node_modules/.bin/tsx --test tests/adversarial-orbits-v29.test.ts
  # red: 8 pass, 1 expected fail on old source
node_modules/.bin/tsx --test tests/adversarial-orbits-v29.test.ts tests/physics.test.ts tests/realism.test.ts tests/rotating-diagnostics.test.ts tests/collisions.test.ts tests/worker.test.ts tests/trajectory-graphics-v28.test.ts
  # green: 50 pass, 0 fail
node_modules/.bin/tsc --noEmit                         # exit 0
node_modules/.bin/tsx rf-accepted-probe.ts             # three accepted refinement levels
```

Key SHA-256 values:

```text
pre-fix physics.ts  6f252b20e733ed6f86f9d93cc1af39b94a1b11061919dd9d865d2098903be7ea
tested physics.ts   70da1eb0c6c78eb1a80bceea354fdc3161139554e3e393c5257f47b551e9385f
new orbit tests     a0a0cf52a5fad48b60e073ae23731d9cfce885045d145727fa2c7821f3b77930
```

Independent regime-audit reviewer confirmed the units, displacement inequality, active-mode scope and lack of a global accuracy guarantee; the parent coordinates final integration and the required final project build/typecheck. This subaudit's 50-test/typecheck result applies only to its recorded copied snapshot, not to concurrent team changes or a deployed bundle.
