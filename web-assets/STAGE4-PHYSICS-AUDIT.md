# Stage-four independent physics audit

Audit date: 6 November 2026. Scope: equations, collision normalization, numerical invariants and physical applicability of the collisional double-well extension. This document separates derivations, source facts and executed evidence. It does not certify an experimental separator. The production implementation and integration are reviewed below as they become available; the parent owns the final full test/typecheck/build/publication gate.

## Primary evidence read

- [Gueroult, Rax and Fisch, 2014, full text](https://w3.pppl.gov/~fisch/fischpapers/2014/Gueroult.DoubleWell.2014.pdf), DOI [10.1063/1.4864325](https://doi.org/10.1063/1.4864325). Equations 5 and 8–10 give the mass-dependent rotating-frame wells; the discussion assumes collisional radial diffusion and enough residence time before assigning equilibrium profiles. The proposed device extracts radially sorted populations axially. Its density curves are not a transient, conservative multispecies kinetic benchmark.
- [Wang et al., 2008, full text](https://www.math.ucla.edu/~caflisch/Pubs/Pubs2008/nanbuConvergenceJCP2008.pdf), DOI [10.1016/j.jcp.2007.12.027](https://doi.org/10.1016/j.jcp.2007.12.027). Equations 1–2 describe the Landau operator and TA angular law. Their species-separated matching uses the smaller species density. They test anisotropic homogeneous relaxation, distinguish timestep bias from particle noise, and compare independent ensembles. This does not directly prescribe the normalization of a mixed-species random matching scheme.
- [NRL Plasma Formulary 2019](https://www.nrl.navy.mil/Portals/38/PDF%20Files/NRL_Plasma_Formulary_2019.pdf), sections Collision Rates, Thermal Equilibration and Coulomb Logarithm. It defines cutoff scales and weak-scattering applicability and supplies independently useful Maxwellian rate limits. Its displayed formulas use Gaussian/cgs units, so coefficients cannot be inserted into an SI code without conversion. The web extraction occasionally garbles subscripts; use the PDF equations if transcribing a coefficient.

## Independent normalization derivation

This is an independent Rutherford small-angle calculation. Set `K=q_a q_b/(4π ε0)`, reduced mass `μ=m_a m_b/(m_a+m_b)`, relative speed `g`, and `b90=|K|/(μg²)`. At impact parameter `b>>b90`, the relative deflection satisfies `θ≈2b90/b`. The number of encounters in `[b,b+db]` per unit time is `2π n_b g b db`. Therefore

```
d<E θ²>/dt = ∫(2b90/b)² 2π n_b g b db
           = n_b q_a²q_b² lnΛ/(2π ε0² μ² g³).
```

For `δ=tan(θ/2)` with small variance, `Eδ²=Eθ²/4`, yielding

```
s = Eδ² = n_b q_a²q_b² lnΛ Δt/(8π ε0² μ² g³).
```

The center-of-mass reconstruction must rotate the *relative* velocity. Its reduced-mass factors are essential for unequal masses. For a fast light test species in an effectively fixed heavy background, the laboratory pitch angle approaches this relative deflection. With `C=d<Eθ²>/dt`, the Lorentz angular-diffusion generator is `(C/4) Δ_S²`: its independent mode expectations are `E P1(cosθ)=exp(-Ct/2)` and `E P2(cosθ)=exp(-3Ct/2)`. Agreement with these coefficients across timestep refinement is a physical-seconds normalization test, not just pair kinematics.

In mixed random matching of `N` equal-weight markers in a cell, `n=Nw/Vcell`. A random perfect matching for even `N` selects each other marker with probability `1/(N−1)`; one-unpaired random matching for odd `N` selects each other marker with probability `1/N`. To represent each nonself empirical partner at density `w/Vcell=n/N`, the angular-law density is respectively `n(N−1)/N` and `n`. This is a random-batch quadrature derivation, not a literal reuse of the source's species-separated recipe. It excludes the represented self marker. Relative to continuum total density, the resulting finite-marker generator has the expected `(N−1)/N` empirical-density effect. Low cell occupancy and spatial refinement at fixed particle number therefore need explicit diagnostics and convergence; two markers per cell do not establish a continuum collision rate.

## Invariant and physical interpretation checks

For `φ(r)=V[(r/a)^4−κ(r/a)^2]`, direct differentiation gives

```
E_x = V[2κ/a²−4r²/a⁴]x; E_y = V[2κ/a²−4r²/a⁴]y; E_z=0.
H_s = m_s|v|²/2 + q_sφ.
Pθ,s = m_s(xv_y−yv_x)+q_sBr²/2.
```

Static axisymmetric prescribed fields conserve each collisionless particle's H and Pθ. Pair collisions at a common spatial point preserve total momentum and kinetic energy and hence total Pθ; they need not preserve each species' energy or Pθ. Closed interspecies equilibrium has a *common* temperature and angular velocity under the total H/Pθ constraints. Completing the square in `exp[-(H_s−ΩPθ,s)/(kT)]` gives

```
n_s(r) ∝ exp{−[q_sφ−(m_sΩ²+q_sΩB)r²/2]/(kT)}.
```

The paper's species-dependent frames `Ω_s=−q_sB/(2m_s)` are useful coordinate transformations. They are not independently maintained angular-velocity reservoirs. No relaxation update should force each species to its own well while simultaneously claiming closed-mixture angular-momentum conservation.

For pair impulses at different positions the angular-momentum defect is `(r_a−r_b)×Δp_a`. With a prescribed B, positions stay unchanged during the collision, so this is also the defect in total canonical angular momentum. The code must measure signed and absolute torque defects and demonstrate spatial/particle refinement. A correction that artificially rescales velocities or projects impulses can change the intended Landau angular law; do not hide this problem with an unvalidated conservation fix. Axisymmetric local-frame matching requires its own derivation and residual ledger; it is not identical to applying a Cartesian common-point collision.

## Regime and input gates

Physical weights require a finite initial occupied volume. A pulse initialized precisely on one plane has no finite source volume and cannot derive its weight from a volumetric density. Declare a finite slug length or axially uniform initial column. A finite inside-vessel initial pulse is distinct from continuous flux-reservoir injection. Density must evolve from surviving marker weights and cell volumes, rather than being held fixed after collection or dilution.

For the assumed screening closure, report `λD`, representative `bmin=max(b90,ℏ/(2μg))`, `ln(λD/bmin)`, Debye-sphere particle count, coupling parameter `Γ`, and `|Ωc|λD/g`. A declared fixed Coulomb logarithm remains a physical approximation. These initial reference ratios are not proof that a cooling, diluting, drifting distribution stays within the same regime. The electron population supplies screening/neutralization only if explicitly assumed; this ion kinetic model does not solve electron dynamics, Poisson's equation, current supply, field penetration or anomalous transport.

TA small-angle accuracy also requires timestep convergence. Since `s∝g⁻³`, thermal pairs can have rare large s at any finite global timestep. Report the maximum s and the fraction of coarse angular updates; do not impose an arbitrary speed floor. Exact zero relative velocity has no relative kinetic motion to rotate. Skipping it is distinct from clipping a small nonzero relative speed.

As a **hypothetical illustrative regime**, `n≈10¹⁸ m⁻³`, singly charged 40/84-u ions, `Ti=Te=5 eV`, `B=.05 T` gives a representative relative RMS speed `≈7.31 km/s`. Using an explicitly assumed electron-plus-isothermal-ion screening length gives `λD≈11.8 μm`, `lnΛ≈11.7`, `Γ≈4.6×10⁻⁴`, about `6.8×10³` ions per Debye sphere and an encounter magnetization ratio around `2×10⁻⁴` for the light ions. The representative angular variance rate is about `5×10³ s⁻¹`. These are independently calculated reference scales, not a calibrated operating point. Cross-field redistribution over macroscopic radii can require milliseconds or longer; a 2.8-m vessel crossed at km/s need not reach the paper's equilibrium. A closed/periodic column is the sensible first redistribution benchmark. Do not tune an arbitrary relaxation multiplier merely to make an open short-flight animation separate visibly.

## Must-pass release gates

1. Collision normalization: independent Lorentz P1/P2 rates, exact unequal-mass momentum/energy, homogeneous drift/temperature/anisotropy and stationarity tests; independent seeds and timestep/particle comparisons.
2. Quartic orbits: independently differentiated fields, H/Pθ convergence, Hamiltonian turning-point reference and surface-event refinement. Preserve old parabolic results.
3. Coupling: species inventory, closed H/Pθ budgets including measured spatial-collision torque, common-Ω equilibrium stationarity, and spatial/particle refinement. Do not equate a residual ledger closing with a small unphysical torque.
4. Open pulse: all active/end/wall/source counts and exported energy/Pθ fluxes close at each observation time; collector fractions retain finite sampling uncertainty and survivors. Export source normalization and initial pulse geometry.
5. Product interpretation: label prescribed fields, collision approximation, source/boundary choices and numerical-resolution diagnostics. No calibrated device throughput, power, self-consistent plasma response or guaranteed separation claim.

## Executed evidence

At this initial audit-writing snapshot only the specification and primary literature were examined. Independent scalar scale calculations were executed with Python; no production tests or runtime checks are attributed to this initial snapshot. Implementation inspection and any subsequently executed tests must be recorded as separate evidence below.

## Implementation inspection and independent coefficient test

Inspected `coulomb.ts`, `doublewell-orbits.ts` and the first integrated `doublewell-dynamics.ts`. The pair variance, nonsingular transverse basis and unequal-mass center-of-mass reconstruction agree with the independent calculation above. The quartic field has the correct laboratory-potential derivative; no extra centrifugal force is inserted into the Cartesian Lorentz step. The coupled initialization correctly samples the common-Ω equilibrium with the cylindrical Jacobian, uses a finite source slug and equal physical marker weights, and retains signed electrostatic-energy flux at collectors. Negative total electrostatic-plus-kinetic energy at an exit is permissible and must not be clipped.

Added `tests/coulomb-independent.test.ts`, which executes the real pair kernel against an independently specified Maxwellian Landau energy moment, rather than restating pair conservation or testing qualitative heating only. For isotropic Maxwellians with temperatures in eV,

```
ν_ab = [8√(2π)/3] n_b [q_aq_b/(4πε0)]² lnΛ /
       {m_a m_b [eTa/m_a+eTb/m_b]^(3/2)}
dTa/dt = ν_ab(Tb−Ta).
```

This SI expression is consistent with the NRL Thermal Equilibration cgs coefficient after conversion. With 40/84-u ions, Ta=2 eV, Tb=10 eV, nb=5×10¹⁷ m⁻³ and lnΛ=12, it predicts 27982.1633 eV/s. Eight independent seeds of 16384 relative-velocity samples each gave the following initial rates through the actual `scatterCoulombPair` implementation:

| Δt (s) | Measured dTa/dt (eV/s) | Relative error | Standard error across seeds (eV/s) |
| --- | ---: | ---: | ---: |
| 1×10⁻⁷ | 27269.3302 | −2.547% | 103.1012 |
| 5×10⁻⁸ | 27539.4674 | −1.582% | 108.1552 |
| 2.5×10⁻⁸ | 27722.5608 | −0.928% | 112.6803 |

Antithetic conditional center-of-mass residuals and opposite scattering azimuths reduce estimator noise while preserving the Maxwellian marginals and the actual pair kernel. This is necessary because a naive sampled infinitesimal heat moment has a singular small-relative-speed variance. The test requires the finest rate to agree within 2% and the paired timestep refinement to reduce the bias. It is not a claim that a finite-time evolving mixture stays Maxwellian.

Executed `./node_modules/.bin/tsx --test tests/coulomb-independent.test.ts`: **1 passed, 0 failed**, about 2.7 seconds including startup. This independently verifies an unequal-mass, finite-temperature energy-exchange coefficient and physical time normalization. It does not certify the spatial collision discretization or open-separator predictions.

## Coupled-path findings sent for correction

1. The initial implementation summed absolute *cell-net* angular-momentum increments. Opposite pair torque defects inside a cell can cancel before that absolute value, so this is not a cumulative absolute pair-locality error. Requested a per-pair observer that measures `[(r_a−r_b)×Δp_a]_z`, its signed sum and sum of absolute magnitudes. Both raw conservation drift and this numerical locality defect must remain visible. Correcting the ledger by subtracting measured torque explains the error; it does not make the physics conservative.
2. The declared density for the equilibrium initial state is a volume mean; peaked sampled populations can have much larger local density. Initial mean-density applicability checks alone cannot certify the actual initialized or later state. Requested local occupied-cell regime diagnostics with measured temperatures/relative drift and explicit unresolved low-count exposure, evaluated over the trajectory. A sampled local estimate itself remains limited by spatial/particle resolution and flow shear.
3. The initial default uses a collision-cell width larger than the source radius. This spatially averages a steep pulse and can dilute its effective collision rate. Requested explicit cell/source and axial-cell/slug resolution ratios plus spatial refinement with particle co-refinement. The declared source weight is correct; this does not imply the coarse collision rate or radial sorting is converged.

These are implementation-specific root causes, not speculative objections to the paper. Production corrections and coupled convergence evidence must be reviewed before closing them. No browser, deployed origin or GPU verification was attempted by this reviewer.

## Final scoped verdict

**The implemented equations, pair operator and conservation bookkeeping pass this scoped review. Quantitative inhomogeneous separator transport is NOT validated: the spatial/particle convergence gate remains NOT ESTABLISHED.** Conditional release as a clearly labeled exploratory prescribed-field solver is consistent with the evidence; a claim that stage four is a validated physical separator or that every original release gate passed would be incorrect.

Reinspected the corrections in the final source path:

- `collideCoulombCell` now supplies the actual pre-update pair impulse to an observer. The coupled model accumulates absolute pair torque separately from absolute cell-net torque and raw signed Pθ drift. It additionally reports the square root of pair torque quadratic variation. The absolute-increment sum can grow under timestep refinement because stochastic impulses scale as √dt; it is a cancellation diagnostic, not a convergent transport-error norm or confidence bound. The quadratic-variation scale is also diagnostic, not a correction to trajectories.
- `inspectDoublewellRegime` removes species drift before estimating temperature, includes differential drift in pair encounter speeds, requires four markers in each present species or marks the entire cell thermally unresolved, and reports zero-spread states without a speed floor. Known electron charge density and prescribed Te are checked even in sparse cells, so a definite screening violation cannot be hidden by an unresolved ion temperature.
- The engine evaluates local regime diagnostics at recorded times. Initialization also checks a conservative upper bound on the normalized equilibrium peak, using the analytic maximum of its quadratic log weight and a lower bound on its normalization integral; unequal-charge peak-density bounds are included. The diagnostic wrapper now uses the same regime implementation rather than a separate cutoff convention. Initial reference estimates do not override unresolved sampled local states.
- Collision-cell width/source-radius and axial-cell/slug-length ratios are visible. The interface explicitly says spatial/particle convergence is not established and identifies the fast default as coarse. Outlet counts are descriptive, without independent-ion confidence claims for interacting particles.

The source-specific diagnostic defects above are therefore closed. The spatial nonlocality of the collision operator remains a measured physical/numerical approximation. The [independent coupled numerical report](STAGE4-NUMERICAL-VALIDATION.md) correctly reports that its raw angular-momentum error did not decrease monotonically under the tested joint cell/particle refinement. Short-time equilibrium stationarity and a well-closed torque-corrected ledger do not close that gate. Source-gradient dilution, low occupancy and long-time redistribution versus drag/escape remain concerns for quantitative interpretation. Regime diagnostics are sampled reference/thermal estimates, not proof about every instant or a strongly non-Maxwellian distribution.

Independently executed current narrow gates:

```sh
./node_modules/.bin/tsx --test tests/coulomb-independent.test.ts tests/coulomb.test.ts tests/doublewell-orbits.test.ts
```

**15 passed, 0 failed**, 18.5 seconds. Log: `assets/stage4-physics-audit-tests.txt`. This includes the independent finite-temperature Landau coefficient regression, Rutherford/Lorentz angular coefficient, rotational covariance, mixed/odd-cell normalization and collisionless quartic Hamiltonian checks.

```sh
./node_modules/.bin/tsx --test tests/doublewell-regime.test.ts tests/doublewell-dynamics.test.ts
```

**15 passed, 0 failed**, 2.0 seconds, after the local-regime corrections. Log: `assets/stage4-local-coupled-audit-tests.txt`. These execute actual concentrated-equilibrium rejection, sparse local-state reporting, known sparse screening failure, open/closed accounting, collision torque inequalities and common-rotation stationarity paths. No tests were skipped or tolerances relaxed to establish a transport-convergence pass.

The parent owns the final integrated test/typecheck/build/asset/publication checks. No experimental operating point or held-out apparatus comparison has been performed. Live browser controls, responsive layout, GPU appearance and deployed asset execution remain outside this audit's evidence.
