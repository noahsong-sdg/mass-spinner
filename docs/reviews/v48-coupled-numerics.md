# Independent numerical audit: separation–rotor feedback

## Execution path and root cause

The v47 radial solver evolved normalized species inventories under a prescribed exact fixed-inertia two-rotor speed. Its snapshot constructor called `rotorResponse` again, so redistribution's `neutralInertiaRatio` was only a warning; it could not change speed or angular momentum. Calling that same constructor during interpolation would also discard a newly coupled rotor trajectory. The old motion adapter independently called `rotorResponse`/`rotorPhase` in transport mode. These are separate execution paths that need consistent accepted coupled states.

The minimal coherent correction evolves angular momenta, computes neutral inertia from the current cell masses, and derives angular velocities from their ratios. It leaves equilibrium/pump/cascade reference closures explicitly separate. A full spatial angular-momentum PDE is a larger model, not something justified by adding this global budget.

Independent source review caught a subtle first implementation error: it computed final neutral momentum as `I_n × root_speed`. That imported the nonlinear solver's stopping residual into the nominally conserved variable and could accumulate it. The implementer changed the final update to the algebraic implicit angular-momentum solution at the accepted density/inertia, then derived speed from momentum. This preserves each momentum exactly in a torque-free, friction-free redistribution step and avoids accepting a looser conservation gate merely to accommodate root leakage.

## Independent physical checks

For neutral number fractions `x_s`, physical species masses `m_s`, normalized conditional cell inventories `p_s,i`, and `y_i=(i+1/2)/N`, the neutral inertia is

```
I_n = N_n a² Σ_s x_s m_s Σ_i p_s,i y_i
    = 2 I_n,uniform Σ_s w_s Σ_i p_s,i y_i.
```

With fixed charged-carrier inertia and prescribed reciprocal friction coefficient, this audit uses

```
L_i = I_i Ω_i; L_n = I_n[p] Ω_n
dL_i/dt = τ − Γ(Ω_i − Ω_n)
dL_n/dt = Γ(Ω_i − Ω_n) − ν_drag L_n.
```

Here `dragHz` is a neutral angular-momentum decay rate, so the angular drag coefficient is `I_n(t) dragHz`, not its initial value. Then `L_i + L_n = τ t − ∫ν_drag L_n dt` from rest. The `Ω_n dI_n/dt` contribution must not be omitted when converting this equation to acceleration. At fixed `L_n`, outward redistribution increases inertia and slows the gas. Charged-carrier inertia/profile, prescribed collision rate, temperature, diffusivity and radial solid-body rotation remain closure assumptions.

An independent thermodynamic consistency check follows without a new measured constitutive law. At fixed neutral angular momentum,

```
K_n = L_n²/(2 I_n[p]); δK_n/δN_s(r) = −m_s Ω_n² r²/2.
```

This is the centrifugal potential in the radial SG flux. For an undriven, reflecting, isothermal case, the functional

```
F = K_i + K_n + N_n k_B T Σ_s x_s Σ_i p_s,i log(N p_s,i)
```

should decrease. This checks more than a residual ledger: rotational energy lost through increasing inertia must be consistent with the entropic radial relaxation. It does not assert that mechanical energy alone is conserved in a thermostatted diffusion model.

## Independent gates authored

`tests/fuel-coupled-convergence-v48.test.ts` does not call production radial/coupling helpers for its reference trajectory. It reconstructs SG face flux divergence directly and integrates cell inventories plus both angular momenta with explicit classical RK4.

| Gate | Independent evidence and acceptance |
| --- | --- |
| Direct-flux coupled time convergence | 12 equal-volume cells; production 64/128/256 steps compared with independent RK4 8192 steps. RK4 4096→8192 must differ by less than `1e-7` in summed distribution L1 plus relative speed errors. Successive production errors must fall by a factor below 0.68; final combined error below 0.02. |
| Fixed-inertia limit | Vanishing positive diffusivity (`1e-24 m²/s`) holds uniform inventories and inertia; 64/128/256 production steps must approach the exact affine two-rotor solution, with final combined relative speed error below 0.01. |
| Separate and joint spatial/time convergence | Fixed-time-resolution spatial refinements 16/8192 → 32/8192 → 64/8192 compare with 128/8192; fixed-64-cell temporal refinements 128→256→512 compare with 8192 steps. A parabolic joint path 16/128 → 32/512 → 64/2048 holds `dt/h²` constant. Fine inventories are volume-aggregated to each coarse grid. Both distributions and both rotor speeds contribute. Each study must decrease errors below factor 0.75 at successive refinements and retain the final combined error gate below 0.02. |
| Conserved timeline reconstruction | Reconstruct inertia directly from species masses. At all saved times and additional non-snapshot times, verify `I_i Ω_i + I_n Ω_n = τ t − dragImpulse` to `1e-11` of total drive impulse, and verify interpolation blends momenta rather than velocities. |
| Torque-free redistribution | Start with nonzero momenta, remove drive, coupling and drag; one coupled step must conserve each momentum exactly, increase neutral inertia and reduce neutral angular speed. |
| Undriven thermodynamics | Independently calculate rotational plus ideal-mixture free energy after small, medium and large coupled steps; it must not increase beyond `2e-12` relative roundoff. |
| Stiff angular exchange | Multiply Γ by 1 and 10⁸ and use steps of `1e-8`, `0.005` and `10 s` from unequal nonzero rotor momenta. Require finite speeds, positive normalized species inventories, and the external impulse budget within `2e-12` of its physical scale. Stability does not by itself establish accuracy of a large step. |

These are qualification gates for this bounded closure and tested scenarios. The joint comparison is a numerical convergence study, not an independent physical experiment. The RK4 study independently checks the time/coupling implementation but deliberately shares the stated SG semidiscretization; existing Bessel-mode and continuum-grid tests remain necessary to qualify the radial operator itself.

## Evidence status

This agent read source and authored tests only, following the safe-dev isolation boundary. Root executes the reviewed snapshot in the existing isolated guest and records receipts and quantitative errors. Root separately verifies worker identity and the live motion/plot consumers; this source audit is not GPU/browser verification.

Root reported the first isolated narrow run as **76/77 passed**. Independent direct-flux RK4 comparison errors were `[0.0040251527, 0.0020163198, 0.00100909465]`; fixed-inertia exact-solution errors were `[0.006713087, 0.003370964, 0.001689105]`. Both display the expected first-order temporal reduction and meet their stated accuracy gates. The original mixed-order joint path 16/128 → 32/256 → 64/512 did **not** reduce errors monotonically: `[0.0005855546088943291, 0.0006184868456246995, 0.00037577911483778714]`. All three errors met the 0.02 accuracy bound; its monotonicity assertion failed.

That negative result is retained. A mixed-order path changes the relative contribution of second-order radial error and first-order temporal error, so opposite signed errors can cancel at one resolution and uncancel at the next. The updated study separates each refinement axis and adds a parabolic joint path where the leading orders scale together; it retains the original accuracy bound and logs signed speed and radial-second-moment errors for the original path and its separate space/time contributions.

### Executed discriminator and causal result

Root ran the exact command `node --import tsx --test tests/fuel-coupled-convergence-v48.test.ts` in the offline guest `/work/home/fix-v43-source`: **7/7 tests passed**, no skipped or cancelled tests. The controller verified 528 inputs before and after execution; snapshot SHA-256 is `decd652f0606970377ed655b98137b5e783c0abe3b386e3a52c56ebf0431e11f`. The receipt records exit code zero and 1.124 s elapsed. This agent inspected the [raw TAP log](../../scientific/fixes-v43/coupled48-refinement.log) and [receipt](../../scientific/fixes-v43/coupled48-refinement.receipt.json).

| Independent study | Coarse error | Medium error | Fine error |
| --- | ---: | ---: | ---: |
| Direct face-flux RK4, BE time refinement | 0.004025153 | 0.002016320 | 0.001009095 |
| Exact fixed-inertia rotor limit | 0.006713087 | 0.003370964 | 0.001689105 |
| Radial grid, fixed 8192 steps | 0.001377530 | 0.000327690 | 0.000065539 |
| Time, fixed 64 cells | 0.001982381 | 0.000976341 | 0.000472637 |
| Joint `dt∝h²` path | 0.000616555 | 0.000147588 | 0.000029545 |

The discriminator confirms the cancellation explanation. At 16 cells, the neutral-speed error from spatial discretization alone is **+0.000563001** relative, while the temporal contribution is **−0.000684176**. Their sum predicts −0.000121174, close to the measured combined error −0.000122333. At 32 cells the separate terms are **+0.000133921** and **−0.000336601**, predicting −0.000202680 versus measured −0.000202815. The mismatch in those sums is the smaller cross/higher-order term. Relative to the refined 128/8192 reference the original path still has nonmonotone aggregate errors `[0.000616555, 0.000649974, 0.000407294]`; that observation was not discarded.

Technically, finite-volume radial second moments are underestimated on the coarse cellwise-constant reconstruction, making inertia slightly too small and speed too large. Backward Euler's spin-up time error has the opposite sign in this scenario. In plain terms, two small errors initially hid each other; refining them at different rates exposed one of them. Requiring a monotone combined norm along that particular mixed-order path was therefore the faulty test assumption. Separate refinement controls distinguish the errors, and a parabolic joint path reduces both leading errors at the same rate. This is preferable to changing a conservation law, widening the 0.02 accuracy gate, or hiding the negative result. No physics-solver change was justified by this failure.

The torque-free conservation/slowdown, reconstructed inertia and interpolated impulse budget, undriven free-energy decrease, and stiff/large-step stability gates all passed in the same run. The direct-flux RK4 reference also passed its own 4096→8192 convergence check before production errors were assessed. These results qualify the stated closure and tested cases; they do not qualify arbitrary settings, physical transport coefficients or a Marathon device. Final application build/worker/deployment/browser evidence is root's separate release gate.

### Final release recheck

This agent also inspected the final `coupled48b` [receipt and command logs](../../scientific/fixes-v43/v44-final-coupled48b.log), including the full test-summary tail and bundled-worker outputs. The 528-input manifest is `014e23bc52a1008a636e27973b956004ca31a7867b50528b81034bb1f83137d7`; the 150-file release digest is `e7939f150d2ca2285c4bb4c29b3e1f15b7852c00d83752c69f6b693afc63695c`. Every command's source manifest was verified before and after execution.

- `npm test`: **1021/1021 passed**, zero failed/skipped/cancelled, test duration 36.786 s. The independent refinement diagnostics above were executed again in this full suite.
- `npm run typecheck`, `npm run build`, `npm run check:site`, `npm run check:assets`: all exited zero. The build retains a large-chunk advisory; this is not a numerical correctness failure.
- `node --import tsx scientific/fixes-v43/verify-release-worker.mjs` and `node --import tsx scripts/verify-fuel-release-v44.mjs`: both exited zero. The actual bundled worker passed 144 centrifuge/transport cases and 49 map cells, protocol/domain rejection and source-identity verification. Worker SHA-256 is `bf92a7dfbb132e95a21a0c530d63228154ac90017ff24db1a94e3ac2b056338d`; producing-source identity is `fc5bf33e2386c250a87d51cea9365eb49ac9ecaa2821b9a49b88bc3e1a182eb6`.
- `python3 docs/reviews/v42-collision-data-probe.py`: exited zero for saved-data recomputation. Its unresolved collision exposure/angular-momentum findings remain; this check is not new collision qualification.

Comparing the final manifest with the independent-refinement manifest confirms that only `src/fuel-playground.css` changed between those snapshots. `src/fuel-transport.ts` and this agent's convergence tests are byte-identical. Root reports that the CSS correction moves the mobile comparison playback bar after observing overlap; this agent did not operate that browser. The release receipt correctly still records `browserVerified:false` and `calibratedMarathonDevice:false`: root's deployed-browser observations and provider deployment evidence remain separate from these passing source/build/numerical gates.
