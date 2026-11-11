# Independent finite-time homogeneous Landau reference candidate

6 November 2026. This is an **offline reference candidate**, not a new separator mode, a reproduced published implementation, an experimentally validated model, or a completed spatial-transport gate. It evolves a nonlinear isotropic two-species velocity distribution independently of the app's binary scattering algorithm. No source, bath, torque projection, speed floor or temperature reset is used.

## Why another implementation is needed

The existing pair tests establish conservation, angular diffusion and the initial Maxwellian thermal-exchange coefficient. A conservative pair map can nevertheless have finite-step relaxation bias. A finite-time reference must therefore solve a different numerical formulation, measure its own errors and keep stochastic sampling distinct from deterministic discretization.

The execution path is `scripts/run-landau-reference.ts → simulateLandauReference → radial distribution moments → Rosenbluth diffusion/drag → implicit finite-volume flux → physical number/energy/history`. The comparison path separately invokes `collideCoulombCell` on seeded Maxwellian populations. The deterministic module imports none of the stochastic collision code or its rate helper; constants and equations are independently written in SI.

## Governing problem and derivation

The primary formulation is [Shiroto et al., isotropic multispecies Rosenbluth–Fokker–Planck equation, Eq. 9–10](https://arxiv.org/html/2011.13086). Their normalized H is twice the usual integral of f/relative-speed. They construct a conservative DG method using the interspecies energy-exchange symmetry. **The code here does not implement that DG method or inherit its exact discrete energy conservation.**

For an isotropic phase-space number density f_b(v), define

```
I2_b(v) = ∫₀ᵛ s² f_b(s) ds
I4_b(v) = ∫₀ᵛ s⁴ f_b(s) ds
J1_b(v) = ∫ᵛ∞ s f_b(s) ds
D_b(v) = (8π/3)[I4_b(v)/v³ + J1_b(v)]
F_ab(v) = 8π (m_a/m_b) I2_b(v)/v²
Γ_ab = q_a² q_b² lnΛ / (8π ε₀² m_a²)
∂t f_a = Σ_b Γ_ab/v² ∂v{v²[D_b ∂v f_a + F_ab f_a]}.
```

The potential identities follow from spherical integration of the inverse-speed and speed kernels. `D_b=G_b''` and the drag term is `−(m_a/m_b)H_b'`. The SI Γ follows by replacing the cgs Coulomb coupling with `q_a q_b/(4π ε₀)`. For a Maxwellian bath with common temperature, `D_b=8π(kT/m_b)I2_b/v³`, so the continuous radial flux vanishes when `∂v f_a=−m_a v f_a/(kT)`. Momentum is identically zero by isotropy; the full continuum interspecies operator conserves total kinetic energy.

The numerical method stores shell-averaged f on a uniform speed grid. Piecewise-constant moments determine face diffusion/drag. Exponentially fitted face fluxes and a backward-Euler tridiagonal solve preserve positivity and each species' total number. Potentials are lagged one step, and zero flux is imposed at zero speed and a declared finite upper cutoff. The method has **unprojected energy truncation error** and does not claim a discrete H theorem. Initial Maxwellians are quadrature-integrated per shell and renormalized; the signed initial normalization defect includes both truncation and quadrature, not a measured tail probability.

This small method was chosen as an inspectable independent comparison rather than adding an unreviewed full DG/2V package or calling the same pair map a reference. It can falsify large rate/finite-time errors; it cannot establish arbitrary anisotropic Coulomb transport or exact continuum agreement by itself.

## Specified comparison case

- Two singly charged species: 40 u and 84 u; density 5×10¹⁷ m⁻³ each.
- Initial zero-mean isotropic Maxwellians at 2 and 10 eV; lnΛ=12.
- Closed homogeneous collision evolution for **1 ms**, well beyond the initial exchange timescale. No spatial cells, fields, boundaries, imposed bath or electron collisions.
- Reference velocity scale 3500 m/s; cutoff 8 times this scale, separately extended to 10 at the same spacing.
- Reference mesh 128/256/512 shells; time steps 1/0.5/0.25/0.125 µs.
- TA comparison: four independent seeds, 512 markers/species, time steps 1/0.5/0.25 µs. Reported temperatures are raw isotropic second moments, not drift-subtracted temperatures; finite-sample center-of-mass drift is included and conserved.

The runner records source hashes, settings, Node/platform identity, elapsed runtime, physical temperature histories and separate number/energy defects. Full JSON: `assets/landau-reference-results.json`.

## Executed evidence

The independently known initial Maxwellian exchange coefficient is **27982.1633 eV/s**. At 512 shells and a 10 ns probe, the reference obtains **27967.2080 eV/s**, about **0.054% low**, without fitting Γ to the stochastic implementation.

At 256 shells, 1 ms energy defects decrease under independent timestep refinement:

| Time step | Maximum absolute total-energy defect | Final temperatures (eV) |
| --- | ---: | --- |
| 1 µs | 0.00313092 | 5.80818 / 6.15681 |
| 0.5 µs | 0.00164769 | 5.81686 / 6.16593 |
| 0.25 µs | 0.000902224 | 5.82122 / 6.17051 |
| 0.125 µs | 0.000528517 | 5.82340 / 6.17281 |

At 0.125 µs, mesh 128→256→512 gives final temperatures 5.82378/6.17457 → 5.82340/6.17281 → **5.82331/6.17237 eV**, and maximum energy defects 0.00099035→0.00052852→0.00041312. Extending the cutoff from 8 to 10 at the same spacing changes those final temperatures by less than 3×10⁻¹³ eV in this case. Species-number defects stay around roundoff.

A common-6-eV stationarity experiment over 1 ms gives maximum species L1 distribution changes 0.0050735→0.0012723→0.00031789 for 64→128→256 shells, approximately second order. These are tests of this particular resolved regime, not universal tolerances.

The four-seed TA final second moments are:

| TA step | A mean ± standard error (eV) | B mean ± standard error (eV) |
| --- | ---: | ---: |
| 1 µs | 5.74141 ± 0.10794 | 6.09127 ± 0.17467 |
| 0.5 µs | 5.78700 ± 0.16933 | 6.04568 ± 0.11464 |
| 0.25 µs | 5.53806 ± 0.13633 | 6.29462 ± 0.14582 |

The stochastic means are not monotonic under timestep refinement. Four-seed uncertainty is much wider than a 0.01-eV deterministic temperature budget; these results do **not** establish a percent-accuracy TA pass. Standard errors are across whole independent runs, not independent interacting markers. Initial sampled temperatures and total energy differ among seeds and are retained in the artifact; no initial-temperature rescaling was used to manufacture agreement.

## Acceptance and remaining work

Pilot-informed exploratory checks in the runner are an energy defect below 0.001 and changes below 0.01 eV between the finest deterministic temperature levels. These engineering targets were fixed before the full reference/TA comparison campaign after inspecting prototype probes; they are not independent preregistration or a literature standard. The displayed fine reference cases meet those *chosen temperature checks*, but `referenceAccepted` remains false because independent code review, distribution-level accuracy, more seeds and a broader benchmark set have not been established. No target was retuned to accept the stochastic comparison.

Before using this as an accepted reference, independently review the flux/mass factors and tridiagonal solve, demonstrate joint mesh/time/cutoff refinement over the intended relaxation horizon, test further masses/charges/densities, compare full distributions or a second published solver, and resolve the TA uncertainty. Stage 6's spatial locality and separator outlet observables remain entirely separate: a homogeneous isotropic reference has no radial transport, canonical angular momentum or collector geometry.

## Commands

```
./node_modules/.bin/tsx --test tests/landau-reference.test.ts
./node_modules/.bin/tsc --noEmit --strict --module NodeNext --moduleResolution NodeNext --target ES2022 src/landau-reference.ts
./node_modules/.bin/tsx scripts/run-landau-reference.ts assets/landau-reference-results.json
```

The first two pass (**5 tests**, strict module typecheck); the runner writes the actual finite-time artifact. Root owns the final repository-wide gate. Commands use the user's explicit scoped host exception after safe-dev service access failed, with `login:false`; no policy, hook, credential or browser restriction was changed. No deployed origin or browser/GPU verification was attempted.
