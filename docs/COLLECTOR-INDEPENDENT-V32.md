# Independent collector verification, v32

## Scope and verdict

Independent validator; no production edits. The new event path passes 19 independent regression cases plus 29 adjacent existing tests (48/48), and strict source TypeScript checking. A separate 72-run RF phase/refinement sweep passes its prospectively declared **position** gates. The earlier timing-ratio study remains **18/19, FAIL**; it has not been relabeled a pass.

This verifies selected prescribed-field particle trajectories and absorbing contacts. It does not establish experimental validity, electron response, self-consistent fields, Coulomb collisions, all grazing conditioning, GPU appearance, or browser behavior. Root owns the final integrated build and repository-wide checks.

## Reproduced failure and execution path

Original production used `simulate -> step -> firstHit(start,end)`: a straight chord was tested, then velocity was reintegrated at the chord-derived time. The retained normalized example starts at `(0.99999,0)` with velocity `(0.003,-0.5)`, `Omega=1`, `dt=0.03`. The original step endpoints have radii `0.99999` and `0.9999675099823457`; the analytic orbit reaches `1.0000080000180016` inside the step. Original `firstHit` returns null although the first wall contact is at `0.003999993666672816`.

Technically, an endpoint chord does not preserve the interior extrema of a curved trajectory. Simply, the ion touches the wall and comes back before the next recorded point, so the old code never notices.

The candidate path is `simulate -> locateOrbitEvent -> fractional synchronized Boris step`, with a polynomial representation of the numerical partial-step wall equation. Impact position, velocity, clock and RF work consume the same fractional trajectory. The legacy/public chord helper is deliberately retained, and independent tests assert that it still misses the historical witness; production no longer calls it. This targets the root cause without replacing the orbit integrator or introducing random event samples.

## Prospective checks and results

`scientific/collector-v32/independent/plan.json` predates the candidate results. Gates: surface position `1e-10 a`; straight/constant-acceleration relative time `1e-10`; retained grazing relative time `2e-6`; resolved refinement ratio `3–5.5`; exact-invariant relative energy/work `1e-10`. No original threshold was widened.

The independent matrix covers both magnetic signs, wall/source/end competition, binary-exact tangent absorption and strictly inside control, constant RF acceleration, parabolic outward E, circular RF with both handedness signs, and the actual `simulate` path for straight flight, RF work, rotating DC impacts and finite-frequency RF impacts. Analytic references use Lorentz circles, constant-acceleration kinematics, hyperbolic motion, and the complex linear forced/DC equations rather than the production root polynomial.

For the grazing witness, both signs return `0.00399999899987824`: relative physical time error `1.3333035e-6`. This agrees with the synchronized Boris phase relation `t_num=2 tan(t_exact/2)`, rather than pretending event localization removes orbit phase error. Speed is conserved and the returned position is on the wall.

Parabolic event-time errors at `h=.02,.01,.005` are `2.171828e-6,4.887845e-7,1.221457e-7`. Actual rotating-DC impact-time errors decrease by approximately four for both masses and magnetic signs. Full RF trajectory-position errors decrease by approximately four for both handedness signs.

## Retained timing-gate failure and diagnosis

The first expanded matrix required every selected RF impact-time error to shrink by `3–5.5` on each halving. The positive-handed, seed-42, 40-u case produced absolute errors `1.0042531e-14,1.6704235e-15,4.1491062e-16` seconds: first ratio `6.01`, next `4.03`. That prospective timing gate **failed**. Preserve `prospective-failed.log`, `prospective-failed-tests.ts` and `prospective-failed-sha256.json` as the original record.

The error is not explained by an event-root defect or by unresolved roundoff in the full trajectory. A scalar impact time measures the radial projection of a vector orbit error; that projection can nearly cancel. The fractional last-step phase changes under refinement and its higher-order term then materially changes the unusually small timing bias. For this case, the full same-clock position errors are `7.551344e-8,1.889779e-8,4.724498e-9` m, consistently second order. The radial leading coefficient is about `4053`, versus about `635153` for the opposite handedness at the same seed/mass.

For zero-B circular forcing, let `z=x+iy`, `a=qm*A`, `s=handedness`, and `theta=omega*h`. Summing the midpoint force and trapezoidal position update over complete equal steps gives

`z_num = z0+v0*T + a*S/(i*s*omega) [R*(exp(i*s*omega*T)-1)/(i*s*omega)-T]`,

where `S=(theta/2)/sin(theta/2)` and `R=(theta/2)cot(theta/2)`. Expansion gives the full-step leading displacement

`delta z = a*h²/24 [exp(i*s*omega*T)-1+i*s*omega*T] + O(h⁴)`.

Its leading norm is bounded by `a*h²*(2+omega*T)/24`. The subsequent **prescribed** envelope `a*h²*(2+omega*T)/12` uses twice this leading bound to test the selected event cases. It is not a proven finite-h bound for arbitrary partial steps or grazing data.

Before the follow-up run, `phase-plan.json` fixed seeds `1,42,113`, both signs, both masses and six admissible timesteps `4e-7` through `1.25e-8` seconds. It fixed position-ratio `3–5.5`, resolved-error floor `512 eps a`, and the envelope above. All 72 runs pass the envelope; all 60 full-position ratios lie in `3.987068–4.0000001`; largest error/envelope fraction is `0.2194105`. These measurements support the cancellation diagnosis. They do not turn the original timing gate into a pass.

The final regression therefore checks the full trajectory displacement at the same numerical impact clock, using the original ratio band and the separately declared phase-study envelope. Timing errors remain printed diagnostics. This is a change to the diagnostic being tested, justified by analysis and a retained failed study, rather than a tolerance relaxation.

## Reproducibility and exact snapshot

All execution occurred in the distinct Apple VM `safe-dev-d36ddd24b75c2861`, sourced from `/tmp/mass-spinner-collector32-independent`. Host source edits were explicitly synced; valuable result directories were exported before replacement. No host/home/credential/control mounts were used. Online access was used only for `npm ci --ignore-scripts`; computations were offline.

Exact commands inside `safe-dev run --`:

- `./node_modules/.bin/tsx original-witness.ts`: historical failure reproduced, exit 0 because the probe asserts the miss.
- `./node_modules/.bin/tsx --test tests/collector-independent-v32.test.ts`: original expanded matrix 18/19, exit 1, retained.
- `./node_modules/.bin/tsx scientific/collector-v32/independent/phase-study.ts`: 72 runs, 0 failed gates, exit 0; 0.435 s subprocess wall time.
- `./node_modules/.bin/tsx --test tests/collector-independent-v32.test.ts tests/physics.test.ts tests/adversarial-orbits-v29.test.ts tests/audit31-orbits.test.ts`: 48/48, exit 0; 1.355 s subprocess wall time.
- `./node_modules/.bin/tsc --noEmit`: exit 0; 1.398 s subprocess wall time.

Tests/studies remained well inside the 180-second numerical budget. Logs, summaries and `tested-sha256.json` are under `scientific/collector-v32/independent/`.

Production hashes tested:

| File | SHA256 |
| --- | --- |
| `src/physics.ts` | `a48f1cb57374c8a30c155837d2e91bdff605395ada3fec8911c1ead9ef6b370f` |
| `src/orbit-events.ts` | `3a4369d602755bd2eb903249ec456b4b29738731808c6650ea451ebcd3bb872f` |
| `src/polynomial-roots.ts` | `090190b5c47dce5368703853be5625e26d635b7fbf4893e1fc5567684d3952b5` |
| `src/doublewell-orbits.ts` | `23df1715b5a3dbe2f17b87a2bb32289dad758c5cb150ffed1225a961dfaeafb0` |

The independently tested regression hash is `58dc9daaf779c04beac23c750bb5845d7b822df5ca1b112b57db3753c17234ed`. Root subsequently changed only an assertion failure label to “prescribed error envelope for these RF cases”, retaining every predicate/gate; root's final snapshot and rerun cover that wording change. Original `physics.ts` hash was `70da1eb0c6c78eb1a80bceea354fdc3161139554e3e393c5257f47b551e9385f`.

No new demonstrated production defect remains from this matrix. Arbitrary multiple-root conditioning and universal tangency bounds remain outside the verified claim.
