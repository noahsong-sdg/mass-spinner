# Independent audit: radial separation and rotor feedback

## Scope and independent derivation

This review derived the conservation and energy identities before receiving the implementer's proposal. It concerns the reduced closed-vessel isothermal radial model, not experimental validation of a Marathon centrifuge. The root agent executes the tests in the existing safe-dev VM and separately verifies the deployed browser; this reviewer does not claim to have run either.

The previous transport solver reconstructed an evolving neutral inertia but continued prescribing both angular velocities from the uniform-inertia analytic solution. Redistribution therefore did not affect speed or the rotor budget. Substituting the new inertia into the old angular-acceleration equation is insufficient: it omits the `Ω dI/dt` term.

Use physical angular momenta as primary variables:

```
Li = Ii Ωi
Ln = In[P] Ωn
In[P] = Mn a² Σ_s ws Σ_j Psj yj
yj = (j + 1/2)/N
dLi/dt = τ − Γ(Ωi − Ωn)
dLn/dt = Γ(Ωi − Ωn) − νdrag In Ωn
d(Li + Ln)/dt = τ − νdrag Ln
```

Here `Psj` are conditional per-species probabilities, `ws` are neutral species **mass**, not number, fractions, and `Mn` is the fixed neutral mass. The cell-center moment is the exact moment of the stated piecewise-constant volume-density reconstruction. Initially `In = Mn a²/2`. The drag slider is a rate, so its integrated torque coefficient evolves as `νdrag In`; retaining the old uniform-inertia coefficient silently changes that interpretation.

A fixed ion inertia and fixed integrated friction coefficient are acceptable explicit closures for this stage. They describe a constrained ion distribution and prescribed reciprocal friction, not a fixed local ion fraction following the changing neutral density. A model that instead prescribes the ion density to follow the neutrals must evolve ion inertia too. Spatially resolved ionization, ion density, collision frequencies and viscosity require additional equations and data; global conservation does not supply those missing closures.

## Mechanical and thermodynamic budget

The exact reduced-model rotational energy identity is

```
K = Li²/(2 Ii) + Ln²/(2 In)
dK/dt = τ Ωi − Γ(Ωi−Ωn)² − νdrag In Ωn²
        − (Ωn²/2) dIn/dt.
```

The last term is work exchanged during radial redistribution. Calling it ordinary frictional heat or omitting it would conceal the coupling. A thermal evolution model is still absent.

A stronger structural test includes neutral ideal-gas entropy:

```
F = K + kT Σ_s Ns Σ_j Psj log(N Psj).
```

At fixed angular momenta, the derivative of the neutral rotational energy with respect to `Psj` is `−Ns ms Ωn² a² yj/2`. Thus the existing centrifugal drift is the gradient of this variable-inertia free energy. With no applied drive, reciprocal friction, drag and radial relaxation should dissipate `F`. Rotational energy alone and unweighted Shannon entropy need not be monotonic. This is a reduced-model structural derivation; it does not establish a Maxwell–Stefan gas mixture or local angular-momentum equation.

## Numerical requirements

The implicit SG transport and endpoint torque equations must solve for the same neutral speed and current inertia. With nonnegative angular momenta/drive, the endpoint scalar equation can be bracketed: increasing trial speed strengthens outward concentration and hence increases its moment, while the rotor equation's left side increases. The production solver must reject an unresolved nonlinear root, not silently use its last iterate.

Saved-time reconstruction must interpolate **cell probabilities, angular momenta and external impulses**, then derive inertia and speeds. Independently interpolating angular speeds violates `Ln=In Ωn` in general. All displayed torque, power, speed and separation values in the coupled mode must use this state; the old exact fixed-inertia response remains a separately labeled reference.

Required independent gates: raw inventory/positivity; direct mass-weighted inertia; reciprocal torque/drag impulses and cumulative external angular impulse; torque-free redistribution reducing speed at constant `Ln`; undriven free-energy dissipation; comparison with an independently integrated conservative flux-plus-momentum ODE; independent temporal and radial refinements; interpolated physical times; zero-drive/zero-duration and absent-species limits.

## Primary sources checked

- [Richard Fitzpatrick, fluid equations in cylindrical coordinates](https://farside.ph.utexas.edu/teaching/336L/Fluidhtml/node20.html): the azimuthal momentum equation contains radial-transport geometry terms. Integrating the closed axisymmetric vessel yields the angular-momentum budget used above.
- [Almeida, Bubba, Perthame and Pouchol (2019), *Energy and implicit discretization of the Fokker–Planck and Keller–Segel type equations*](https://www.aimsciences.org/article/doi/10.3934/nhm.2019002): finite-volume exponential and implicit methods can preserve mass, positivity and energy structure when terms are discretized consistently.
- [Heida, Kantner and Stephan (2021), *Consistency and convergence for a family of finite volume discretizations of the Fokker–Planck operator*](https://www.numdam.org/articles/10.1051/m2an/2021078/): SG convergence depends on mesh quality and drift resolution. Positivity is not a convergence certificate.

These sources support the continuum/numerical structure. The particular two-lumped-rotor coupling and its closure must be tested independently; no source is presented as a calibrated Marathon validation.

## Execution evidence

I inspected `scientific/fixes-v43/coupled48-narrow.log` and its JSON receipt. The root agent executed the nine-file narrow suite in the existing safe-dev guest, `/work/home/fix-v43-source`, against source SHA256 `3a8645215589582bf2593a598d1099dc85951e5577435d3ad5f323c2a16f356c`. The receipt records the same source before and after execution. Result: **76/77 tests passed; exit code 1**. All **9 tests** in this reviewer's independently authored `tests/fuel-coupled-independent-v48.test.ts` passed. This reviewer did not execute project code on the host.

The independent gates cover mass-weighted evolving inertia, torque-free spin-down at conserved angular momentum, a direct constant-inertia torque oracle, undriven free-energy dissipation, reversal symmetry, an independently integrated flux-plus-momentum ODE, physical-time interpolation, separate radial refinement, and rest/absent-species limits. Passing the ODE oracle checks the implementation of the declared reduced model, not the model's experimental accuracy.

The one initial failing gate belonged to the separately authored joint radial/time refinement study: errors against its finer reference were `0.00058555`, `0.00061849`, and `0.00037578`. The intermediate refinement was not monotonic under that study's declared threshold. Qualification was initially withheld rather than excusing that failure because the errors were small.

### Discriminating refinement and resolution

I subsequently inspected `scientific/fixes-v43/coupled48-refinement.log`, its receipt, and the complete revised numerical test. The seven numerical tests passed, with exit code 0, on source SHA256 `decd652f0606970377ed655b98137b5e783c0abe3b386e3a52c56ebf0431e11f`; the safe-dev receipt again verifies source before and after execution. This is a later snapshot than the initial 76/77 suite, so those counts must not be combined into a claim that the complete suite passed on the later snapshot.

The revised study separates spatial, temporal and balanced joint refinement against a 128-cell, 8192-step reference:

| Study | Coarse error | Intermediate error | Fine error |
| --- | ---: | ---: | ---: |
| Space, timestep held fixed | 0.00137753 | 0.000327690 | 0.0000655393 |
| Time, grid held fixed | 0.00198238 | 0.000976341 | 0.000472637 |
| Joint, `dt ∝ h²` | 0.000616555 | 0.000147588 | 0.0000295446 |

The metric remains the sum of the two full-distribution L1 errors and the two relative rotor-speed errors. Every study retains the original `fine error < 0.02` accuracy bound and requires each refinement error to be below 0.75 of its predecessor. The method was not changed and the threshold was not relaxed. Holding `dt/h²` fixed is justified by the observed second-order spatial error and first-order backward-Euler temporal error; it avoids changing their leading relative contribution during the joint study. Fixed-grid time convergence also agrees with a separately coded direct-flux RK4 oracle whose own timestep refinement is checked.

The original diagonal path is retained as diagnostic output. At 16 cells/128 steps, the neutral speed's spatial-only relative error is `+0.000563001`, while its temporal-only error is `−0.000684176`; their sum closely reproduces the combined `−0.000122333`. At 32 cells/256 steps those terms become `+0.000133921` and `−0.000336601`, with combined error `−0.000202815`. Ion-speed diagnostics show the same opposing signs. This directly supports loss of error cancellation as the cause of the intermediate rise, rather than a demonstrated failure of the continuum coupling. It does not claim every observable has an exact additive error expansion: the distribution moments retain same-sign spatial and temporal errors.

The original monotonicity blocker is therefore resolved by a more discriminating, stricter study. **The reduced-model coupling is qualified for the tested structural, analytic-limit, independent-ODE and refinement cases.** This is not a parameter-wide accuracy certificate: the complete final regression/build and the production-resolution error envelope still require their own evidence.

## Implementation findings and remaining limits

The reviewed execution path evolves angular momenta, reconstructs current neutral inertia, solves the radial/rotor endpoint together, and derives the saved-time speeds from interpolated inventories and momenta. The torque balance now computes momenta from the conservative algebra rather than multiplying an approximate nonlinear-root speed by inertia. This avoids accumulating the root residual as invented angular impulse, while retaining the scalar solve for radial drift. The nonlinear tolerance still bounds the agreement between that drift and the final torque-derived speed.

An independently identified root-bracket edge case was corrected: accepted inventory roundoff made the previous `initial inertia / cell count` lower bound slightly too large for a distribution concentrated in the innermost cell. The new bound includes the actual accepted species sums. This preserves raw inventory and the physical moment bound without renormalizing the state. Its regression passed in the inspected suite. These fixes address conservation algebra and numerical domain consistency; neither supplies missing local plasma physics.

The mechanical ledger distinguishes external work, reciprocal-friction loss, neutral drag loss, redistribution work, and backward-Euler numerical dissipation. Its exact discrete energy identity is appropriate for the declared isothermal lumped closure. Redistribution work and numerical dissipation must not be presented as measured heating. The isothermal reservoir, prescribed ion geometry/inertia, prescribed integrated collision coefficient, instantaneous neutral solid-body rotation, closed vessel, and independent-species drift–diffusion remain explicit assumptions. No evolving temperature, radial ion momentum, local neutral/ion angular-momentum transport, density-dependent collision closure, open feed/extraction, or experimentally calibrated Marathon prediction is validated here.

### Final regression and release evidence

I inspected the actual `scientific/fixes-v43/v44-final-coupled48b.receipt.json` and the embedded receipt and TAP output in `v44-final-coupled48b.log`. The root agent's final safe-dev run passed **1021/1021 tests**, with zero failures, skipped tests or cancellations. The same run passed `npm run typecheck`, `npm run build`, `npm run check:site`, `npm run check:assets`, both release-worker probes, and the saved collision-data recomputation probe. Every command has exit code 0; the receipt verifies source before and after every command.

The tested 528-input snapshot is SHA256 `014e23bc52a1008a636e27973b956004ca31a7867b50528b81034bb1f83137d7`. Its 150-file release is SHA256 `e7939f150d2ca2285c4bb4c29b3e1f15b7852c00d83752c69f6b693afc63695c`. The bundled physics worker is SHA256 `bf92a7dfbb132e95a21a0c530d63228154ac90017ff24db1a94e3ac2b056338d`; its actual bundled fuel probe completed 144 centrifuge cases and 144 transport cases, checked 49 map cells, verified source digests, and rejected invalid protocol/domain inputs. These artifact probes extend the source-test evidence to the produced worker; they do not establish a parameter-wide accuracy envelope.

This closes the final regression, typecheck and build requirements for that exact snapshot. The receipt explicitly records `browserVerified: false` and `calibratedMarathonDevice: false`. Deployed browser verification remains the root agent's separate responsibility. The saved collision-data probe is a recomputation of existing records and must not be described as a new collision simulation or as resolving pre-existing collision-transport qualification limits elsewhere in the project. The build also retains a bundle-size warning; it is not a failed physics/build gate.
