# Independent II C / II D physics review

Reviewed 2026-11-06. This review independently traced `centrifuge.ts`, `physics.ts`, `collisions.ts`, `geometries.ts`, and their tests. It distinguishes equation verification from experimental validation. No source-code changes were made by this reviewer. Concurrent UI/diagnostic work is outside the tested snapshot below.

## Verdict

The implemented II C equilibrium equations and II D imposed-field orbit equations are internally consistent within their stated assumptions. Existing analytical tests provide meaningful verification, including the marginal cutoff, not merely implementation-mirroring assertions. They do **not** establish predictive accuracy for a functioning plasma separator. The important remaining gaps are source/inventory interpretation, finite-device collection versus infinite-domain confinement, collisional equilibration, and self-consistent field formation. No blocking algebra defect was found in the reviewed kernels.

## Primary literature checked

1. Fetterman & Fisch, **Metrics for comparing plasma mass filters**, *Physics of Plasmas* 18, 103503 (2011), [author full text](https://w3.pppl.gov/~fisch/fischpapers/2011/Fetterman_metric.POP11.pdf), [DOI](https://doi.org/10.1063/1.3646311). Read centrifuge Eq. 7 and Ohkawa Eqs. 14–24. The former concerns collisional equilibrium enrichment; the latter distinguishes radial confinement from thermal/finite-length collection losses. Its separate countercurrent-flow model is not implemented here.
2. Gueroult, Rax & Fisch, **The double well mass filter**, *Physics of Plasmas* 21, 020701 (2014), [author full text](https://w3.pppl.gov/~fisch/fischpapers/2014/Gueroult.DoubleWell.2014.pdf), [DOI](https://doi.org/10.1063/1.4864325). Read all three pages. The quartic potential creates distinct radial wells, while collisional diffusion and adequate residence time are required to populate them. The paper explicitly distinguishes collisionless orbital accessibility from equilibrium separation.
3. Gueroult, Rax, Zweben & Fisch, **Harnessing mass differential confinement effects in magnetized rotating plasmas to address new separation needs**, [author preprint/full text](https://arxiv.org/abs/1707.00511), [DOI](https://doi.org/10.1088/1361-6587/aa8be5). Read uniform-field discussion and Fig. 4. It highlights charge-state degeneracy, collisional radial leakage, field-production difficulty, and rotation/shear instability risks.
4. Gueroult, Rax & Fisch, **Centrifugal instability in the regime of fast rotation**, [author abstract](https://arxiv.org/abs/1707.00918), [DOI](https://doi.org/10.1063/1.4994546). Abstract checked: fast-rotation centrifugal instability is a collective plasma effect. The present single-particle discriminant must not be presented as a collective-stability guarantee.

The primary Rax et al. 2015 collisional-rotation PDF was found but its full-text fetch timed out. No quantitative result from that inaccessible full text is asserted here. No experimental dataset was downloaded or fitted.

## Independent derivations and numerical reproduction

### II C: centrifuge

Take signed azimuthal velocity `vθ = Ωr`, axial `B`, common rigid rotation, isothermal species, and negligible electron inertia. With `Ti, Te` expressed as energies, radial force balance gives

\[
T_i\partial_r\ln n_s=m_s\Omega^2r-Z_se\phi'+Z_se\Omega Br,
\qquad T_e\partial_r\ln n_e=e(\phi'-\Omega Br).
\]

Defining `ψ = φ − ΩBr²/2` yields exactly the implemented ion exponent and electron Boltzmann response. For equal charge states,

\[
\ln\frac{(n_h/n_l)(r)}{(n_h/n_l)(0)}
=\frac{(m_h-m_l)\Omega^2r^2}{2T_i}.
\]

The ambipolar potential cancels only for equal charges; using this mass-difference formula for unequal charge states would be wrong. The source correctly solves charge-weighted quasineutrality instead. For one ion species the density exponent reduces to `mΩ²r²/[2(Ti+ZTe)]`. Reversing Ω leaves composition unchanged; reconstructing laboratory φ would additionally require signed Ω and B.

The closure is monotone in ψ. Its implemented nonnegative bracket is valid: at ψ=0 all centrifugal exponents are nonnegative; at the maximum species root all ion charge terms are no larger than the electron term. Log-space evaluation avoids avoidable exponential overflow.

An independent cylindrical trapezoidal inventory integral, `Ns ∝ ∫₀ᵃ r ns(r) dr`, using the actual kernel at `a=.48 m`, `Ω=10000 rad/s`, `Ti=Te=5 eV`, and central 40/84-u fractions `.5/.5` gave:

| Quantity | Reproduced value |
|---|---:|
| Heavy whole-volume number fraction, 2000 intervals | 0.6418457856084995 |
| Light wall density / total on-axis ion density | 0.580263941162382 |
| Heavy wall density / total on-axis ion density | 1.6593334611806732 |
| Wall log ratio enrichment | 1.050688200310139 |
| Wall ψ | 4.0314805930826445 V |
| Maximum relative charge residual | 3.33066907387547e-16 |

Consequently, a `.5` central fraction is **not** a `.5` feed or bulk fraction. Collector inventory must use the cylindrical Jacobian; steady extracted flux additionally requires the species axial velocity distribution. `n(r)` alone does not predict throughput or product purity for an operating flow.

### II D: Ohkawa/Archimedes

For `φ=V(1−r²/a²)`, the implemented `Er=2Vr/a²` is outward for positive V. Circular force balance for a positive ion has discriminant

\[
\omega_c^2-\frac{8qV}{ma^2},\qquad
m_c=\frac{qB^2a^2}{8V}.
\]

The source cutoff and independently tested stable, unstable, and marginal orbit solutions agree. Equality is marginal: generic initial velocity produces a linearly increasing envelope, so an undifferentiated “confined at or below cutoff” statement would hide the threshold behavior. Below cutoff, a bounded infinite-domain orbit may still intersect a finite wall; above cutoff, finite axial flight can end before wall loss. Collector counts correctly require integrating trajectories, rather than directly classifying masses by cutoff.

The local `E×B` drift is not the actual finite-inertia ion circular-orbit frequency. At `B=.1 T`, `V=400 V`, `a=.48 m`, the cutoff is `69.46943915279037 u`; for 40-u singly charged ions, drift magnitude is `34722.222222 rad/s`, whereas the exact slow-branch ion frequency magnitude is `42054.104265 rad/s`. A drift readout should keep its drift label.

### Double well

For axisymmetric static fields, canonical angular momentum `Pθ = mr vθ + qBr²/2` is conserved and radial motion has

\[
U_{\rm eff}(r)=\frac{(P_\theta-qBr^2/2)^2}{2mr^2}+q\phi(r).
\]

At `Pθ=0`, this reduces to the implemented magnetic quadratic term plus imposed quartic potential. The constrained shape `φ=V[(r/a)⁴−(r/a)²]` belongs to the same family as the primary paper's illustrative Eq. 8; it is not its optimized independently chosen quadratic/quartic example. Potential minima identify energetically favored radii, not a predicted populated density or collection yield.

For the planned extension `φ=V[x⁴−κx²]`, the zero-P local-axis threshold becomes `mc=qB²a²/(8κV)` when `κV>0`. A nonzero P produces a divergent positive axis barrier. The old zero-P minimum/cutoff formula cannot be reused as its general confinement test. Opposite signs of P at equal magnitude change U only by a constant, so their extrema radii agree. These are useful independent regression invariants.

## Remaining fidelity gaps, in priority order

| Priority | Verified gap and consequence | Small coherent next step |
|---|---|---|
| 1 | II C central fractions normalize local density, not conserved global inventory. The existing API documents this correctly. | Keep that distinction visible; offer cylindrical cumulative inventory and an ideal radial-cut metric with explicit assumptions. If accepting bulk composition, solve the central fractions from the requested integrated inventory. |
| 1 | Double-well plots are Hamiltonian curves. The orbit code's cold-neutral elastic scattering is not a model for multispecies ion-ion equilibration into the wells. | Keep potential accessibility separate from equilibrium-density demonstrations. A transport model needs a justified diffusion/mobility operator, residence time and boundary conditions. |
| 1 | Imposed fields ignore space charge, sheath/end losses, electron response in II D, and voltage penetration. II C has no absolute density input. | Label equations as reduced models. Add density-based Debye-length/collisionality diagnostics before claiming a regime is a realizable plasma. Do not turn a geometric validity estimate into a hard universal stability bound. |
| 2 | Pulse injection samples particles, including backward axial velocities; it is not a reservoir boundary distribution weighted by forward flux. | Retain pulse labeling. A reservoir mode requires independently normalized `vz f(v)` injection for `vz>0`, not clipping or taking absolute vz. |
| 2 | Neutral collisions are isotropic elastic two-body events against cold stationary neutrals with constant cross section. They omit charge exchange, neutral temperature, Coulomb collisions and neutral feedback. | Treat this as an explicitly hypothetical scattering control until species/energy-dependent cross sections and process branching are sourced. |
| 2 | Collision kicks occur after nonabsorbed full steps; the final absorbing fractional interval receives no collision kick. The per-step optical-depth guard limits but does not eliminate this splitting error. | Add ensemble timestep convergence with collisions, especially for grazing impacts; event-time/hazard integration is a later targeted improvement if measured bias exceeds Monte Carlo uncertainty. |
| 2 | Absorbing surfaces use a chord crossing; fractional re-stepping repairs impact velocity but does not solve the exact curved-orbit crossing time. | Continue reporting separate impact-energy mismatch; add time-of-flight/impact-location convergence near tangency before changing the boundary solver. |
| 2 | Ninety-six particles/species can produce noisy efficiencies; a visually smooth curve can overstate information. | Show counts and binomial uncertainty for collection fractions; use independent seeds or a bootstrap for derived ratios. Distinguish sampling uncertainty from timestep bias and model discrepancy. |
| 3 | Neither common-rotation equilibrium nor orbit trajectories predict spin-up, heating, power balance or countercurrent enhancement. | Add those only as separate sourced dynamics with torque, loss and heat-flow equations; do not animate equilibrium into an invented relaxation time. |

## Meaningful next validation

1. **Numerical verification:** preserve exact cutoff/gyro/energy/Pθ tests; independently check integrated inventory refinement, finite-P Hamiltonian behavior, and event-location convergence. At the marginal cutoff, explicitly test generic nonzero transverse initial velocity.
2. **Collisions:** compare collection distributions at `dt`, `dt/2`, `dt/4` over multiple seeds, reporting confidence intervals. The per-event energy/momentum checks already pass, but do not validate a physical cross-section model.
3. **Conservation:** any future density evolution must conserve each species' inventory, account for source/sink fluxes, and satisfy quasineutrality to its stated asymptotic order. Any heating/spin-up model needs an energy and angular-momentum budget.
4. **Held-out experiment:** require measured `B(r,z)`, plasma `φ(r,z)`, source species/charge distribution, spatial/velocity distribution, `Ti/Te`, density, neutral conditions, collector geometry, and detector response. Fit only declared uncertain inputs on one operating point, then predict another voltage/field/source-temperature point without retuning. Compare radial species ratios, collection counts, flight times and impact profiles with experimental uncertainties. A paper's reported enrichment alone does not identify these inputs.

## Checks and exact snapshot

Executed on the host under the user's prior narrow host-execution exception, with `login:false`. No container/security setting was changed; no credentials or blocked deployment origin were accessed. This was not a live-browser/GPU verification.

`node --import tsx --test tests/centrifuge.test.ts tests/physics.test.ts tests/collisions.test.ts tests/geometries.test.ts` — **35 passed, 0 failed**.

`node --import tsx --input-type=module -e '…'` — direct kernel run and independent 2000-interval cylindrical quadrature produced the table and drift/orbit calculations above. No test files were added by this documentation-only reviewer. Build/typecheck remain the integrating agent's final gate.

SHA-256 of the reviewed/tested kernels:

```text
cfdc02f8d3fa10240a790588c15b3f03339e3454d2cbdc97ad94890db23b0edf  src/centrifuge.ts
ae14e254b428efbf9be7a8fa3117ae13a8e7d12b3ca923a920ba098fe79a8d88  src/physics.ts
129e76b125cb29840316188f6e9e4afd95190d2416523f6939b937712b903895  src/collisions.ts
34720eea77410b453191693d21993ff4289ce826e78a709fdc8ec83c3e84ba28  src/geometries.ts
```

## Integration follow-up: focused controls and canonical momentum

Read the newly integrated `focused-diagnostics.js`, `main.js`, `laboratory.js`, `index.html`, inventory/cold-reference diagnostics, and extended `geometries.ts`. The source traces show the radial cut, central fraction, κ and normalized Pθ controls reach their intended calculations. Presentation now distinguishes static inventory from extraction and explicitly separates cold analytic references from warm simulated trajectories.

Additional checks executed under the same narrow host exception:

`node --import tsx --test tests/geometries.test.ts tests/centrifuge-diagnostics.test.ts tests/rotating-diagnostics.test.ts tests/ui-contract.test.ts` — **27 passed, 0 failed** at this follow-up snapshot. These include actual configuration-adapter checks and analytical inventory/orbit tests; they are not browser-rendering evidence.

Independent direct-kernel checks at normalized Pθ `±.01`, `±.1`, `±.3` for both species confirmed identical minima radii for opposite signs and the predicted constant energy difference `U(+P)−U(−P)=−PqB/m`. The source correctly suppresses its old zero-P minimum-radius metric for nonzero P.

Issues sent to the integrating agent:

- **Incorrect reduced-mode readout:** `updateReadouts()` obtains hidden rotating-orbit settings outside ICR, and the frequency readout was still visible in reduced modes. In double-well mode this could show a different B's cyclotron frequency and an inapplicable rigid E×B frequency. Hiding this readout in reduced modes is the smallest coherent fix; geometry metrics already use the correct B.
- **Canonical-momentum plot scale:** at default settings and normalized Pθ `.1`, the axis-barrier sample near `.01a` reaches approximately 277600 eV while the light-ion well minimum is approximately −68 eV. Linear full-range autoscaling visually compresses the well. An explicitly labeled radial/energy viewport or separate zoom would preserve the Hamiltonian while making its finite-radius structure inspectable.
- **Steep-profile radial resolution:** at permitted controls `Ω=30000`, `Ti=Te=1 eV`, 20/200-u singly charged ions, central fractions `.99/.01`, the 400-bin heavy normalized inventory mean is `4.4347086468e43`, versus `4.3356535810e43` at 2000 bins, a roughly 2.3% difference. The heavy inventory fraction inside `.95a` changes from `2.81122449e-5` to `2.81735601e-5` (roughly 0.22%). The large absolute density is not a realizable-density prediction because axis density is unspecified; the comparison measures quadrature error. Add radial-resolution evidence or avoid implying arbitrary precision for extreme inventory calculations.

These follow-up observations do not change the equation-level verdict. The first is an actionable wiring/interpretation defect; the latter two are fidelity/usability limits, not demonstrated algebra errors.

### Final focused review: findings addressed

The integrating agent addressed all three observations above. Read-only source review confirms:

- `showLaboratory()` hides the unrelated orbit frequency readout in reduced modes. Its new behavioral regression test exercises reduced modes and restoration in ICR.
- The explicit `plotInnerFraction` control changes only the sampled plot interval. The Hamiltonian equation and zero-P physical minimum calculation remain unchanged; the explanatory note says cropping does not change the physical domain. Nonzero P still suppresses the zero-P minimum metric.
- Centrifuge controls now select 400, 1000 (default) or 2000 intervals. Its refinement action compares the selected solution against twice its radial resolution, capped at 2000, and reports relative inventory and bulk-fraction changes. The finest-grid selection disables further refinement, and an input change aborts/invalidate stale comparisons. The text correctly calls this a quadrature check rather than experimental validation.

Final focused command: `node --import tsx --test tests/geometries.test.ts tests/centrifuge-diagnostics.test.ts tests/rotating-diagnostics.test.ts tests/ui-contract.test.ts` — **28 passed, 0 failed**. No further must-fix issue was found in the reviewed paths or their adjacent supported input boundaries. Final whole-project build/typecheck and browser/rendering verification remain separate integrating-agent gates; this review did not execute them.
