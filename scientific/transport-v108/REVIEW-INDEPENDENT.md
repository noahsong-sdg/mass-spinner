# Independent stress/heat review — V108

Source inspection, analytic derivation and retained-artifact audit, 2026-11-14. No host project execution or independently launched guest. Parent owns isolated execution; corrected controls and the thermal companion have now executed, and I independently checked the retained receipts.

## Execution path and invariants

The active campaign uses `heat106.FVDiffusion.advance` → `diffusion86.Diffusion.advance`. The latter first solves the coupled Q1 Newtonian stress system using FV mass/inertia, then allocates viscous and backward-Euler defect heat, then calls the overridden **FiPy** `conduct`. Its inherited FE `thermal_stiffness` is inactive. The final local total-energy change is stress mechanical redistribution plus conduction redistribution. Viscous plus numerical heat are already inside stress redistribution and must not be counted twice.

Stress does not directly move mass/species. Heat does not directly move momentum. Each can change pressure and therefore the following Euler mass flux. Separate frozen stress-only and heat-only response probes can establish sensitivity, but cannot establish accepted-trajectory causation by themselves. Finite-step stress+heat is a composition: heat acts on the post-stress temperature. A decomposition must retain that interaction or clearly state a small-step approximation.

The six cylindrical strains and `2μ dev(ε):dev(ε)` in the active stress operator have consistent units/signs. `Ω` represents angular velocity; torque is conjugate to Ω and capacity is `mass*mean(r²)`. Thermal capacity is `1.5 kB(number of heavy particles)`. There is no electron-energy/ionization closure in this conditional monatomic model. The ~618,000 K state therefore remains a physical-closure limitation even if the numerical equations converge.

## New independent analytic seam

Existing strain-integral and energy tests do not certify local momentum-force convergence. `test_independent108.py` compares the real stiffness action to independently derived exact annular averages of `div(τ)` and `r(div τ)θ` for a smooth field satisfying the imposed no-slip/axis/midplane boundaries:

`A=R²−r²`, `B=H²−z²`, `ur=a rAB`, `uz=b zAB`, `Ω=cAB`.

For constant μ and zero bulk viscosity:

`fr/μ=−(32/3)a rB−2a rA−(2/3)b r(H²−3z²)`;

`fz/μ=−4b zB−8b zA−(4/3)a z(R²−2r²)`;

`torque/μ=c r²(−8B−2A)`.

These follow from `div τ = μ[vector-Laplacian(u)+(1/3)grad(div u)]`; the radial vector-Laplacian includes `−ur/r²`. A separate affine-strain test checks exact cancellation of constant radial/hoop stresses at interior test functions. References use exact integral moments, including angular-momentum-weighted Ω, rather than centroid samples. Joint levels are 8×32, 16×64 and 32×128. Interior, last-endwall-row and whole-domain errors are reported separately. Interior test thresholds were written before outputs; they are manufactured-control requirements, never replacements for the frozen 5% density gate.

## Hypothesis requiring evidence

The wall-centroid half-interval Q1 stencil need not be pointwise strong-form consistent. In a 1D scalar analogue, `u=x(H−x)` and a final centroid at `H−h/2` give a last-cell discrete diffusion force of `−1.5κh`, versus the exact cell-integrated `−2κh`: a persistent 25% *local* force discrepancy. This is an analytical warning about interpreting FE nodal loads as FV rates, not a demonstrated cause of V107. A local truncation discrepancy can coexist with convergent weak/finite-time solutions. The new endwall report can test its relevance; no stress-boundary change is justified from this analogy alone.

The first parent-run control passed all three assertions and showed interior contraction, but its whole-domain force table was not admissible: I used `nodal_velocity(q)`, which fills every boundary trace with zero. Actual `advance` solves free massless natural traces rather than constraining them. Root correctly challenged this discrepancy. The revised control statically condenses exactly those natural traces: `Ktt xt=−Ktc xc`, retaining zero Dirichlet traces. The original test is preserved as `independent108_pretrace.py`; its first receipt must not be interpreted as a production boundary-force failure. The revised four controls passed in stage 05, including actual-small-step agreement with the condensed trace operator.

Corrected full-domain rate errors contract: radial 0.225897 → 0.155806 → 0.108776; axial 0.141064 → 0.095845 → 0.066491; torque 0.308408 → 0.217162 → 0.153125. The final-row relative errors do not contract to zero (radial 0.280577 → 0.266144 → 0.257917; axial 0.265224 → 0.287718 → 0.306367; torque 0.074831 → 0.107253 → 0.149409). This demonstrates a local difference between the weak nodal force and the exact physical last-cell strong-force average for this control. It does not establish a nonconvergent finite-time Galerkin solution or the V107 density cause. An O(1) discrepancy on an O(h)-volume layer is compatible with global RMS contraction proportional to √h. A production stress replacement is not justified from these instantaneous results alone.

There is currently no independently established production arithmetic bug or uniquely justified coefficient adjustment. In particular, tuning μ/κ, weakening gates, or treating the restriction commutator as pure operator error would not be supported.

## Primary references checked

- [oomph-lib axisymmetric equations](https://oomph-lib.github.io/oomph-lib/doc/the_data_structure/html/classoomph_1_1AxisymmetricNavierStokesEquations.html): cylindrical stress divergence and swirl geometry. Its incompressible constitutive presentation is not substituted for our explicit deviatoric compressible stress.
- [NIST FiPy finite-volume discretization](https://pages.nist.gov/fipy/en/stable/numerical/discret.html): cell-average storage, neighboring-cell face fluxes and natural no-flux boundary.
- [NIST FiPy cylindrical nonuniform grid](https://pages.nist.gov/fipy/en/4.0.2/generated/fipy.meshes.cylindricalNonUniformGrid2D.html): active mesh geometry/API.

## Retained stage-01 evidence checked

I independently checked all 17 exported payload hashes, three execution-log hashes, and both compressed/raw result seals in `retained/transport01`. The three decomposition controls passed; the first three manufactured controls also passed, subject to the natural-trace test error explained above. The pair runs completed in 8.1771 s and 4.0040 s, with a recorded peak of 696,236 KiB. The analysis execution receipt includes setup time and records 13.04 s.

I reopened both retained result packets and checked every numeric row in `TRANSPORT-V108.md`. At 4 µs / 0.5 ps in `densityRing`, the restriction-commutator RMS values are: radial force 4,944.782 → 4,486.092 N/m³; viscous heating 8,213,033.735 → 5,112,947.686 W/m³; ordered conduction 12,860,669.998 → 9,511,391.784 W/m³; ordering interaction 9.185 → 19.864 W/m³; combined pressure rate 8,341,436.214 → 7,461,353.634 Pa/s. Archived-input radial-force sensitivity grows 5,457.854 → 8,720.886 N/m³. These are frozen instantaneous diagnostics, not a trajectory error estimate. The report correctly retains the 5.595688% failing density gate and does not assert a production fix.

## Thermal-moment discrimination probe

`moment108.py` compares the active heat hook on conservative restriction `Rqf` with a companion `qT` that has identical restricted mass, all momenta and species, but sets thermal energy to the direct sum of fine-cell thermal energies. It reports the resulting total-energy offset explicitly. This is deliberately **nonconservative**, diagnostic only, and cannot replace production restriction or evolution.

The signed identity is `Hc(Rqf) − RHf(qf) = [Hc(Rqf) − Hc(qT)] + [Hc(qT) − RHf(qf)]`. The first term measures the heat response to restriction-induced thermalization; the second still includes coarse geometry, capacity and spatial discretization differences, so it is not certified pure operator error. RMS values of these terms cannot be added. All calls use incoming capacities and the native FiPy `conduct` method; no inactive FE heat approximation or stress advance is substituted. Cached fine rates require both the same snapshot SHA and timestep.

`test_moment108.py` covers exact conservative restriction, thermal/pressure reconstruction, identical non-energy channels, energy-offset accounting, equal-level roundoff, signed response algebra, and stale-state/timestep rejection. `moment_driver108.py` uses the admitted sealed V107 packets, verifies exact saved geometry and every primitive at every saved clock, and skips unrelated electrical initialization. It computes only two frozen radial pairs, caching fine heat before releasing its operator.

Stage 05 passed all three companion controls. Both frozen pairs completed in 4.8538 s and 2.1742 s with recorded peak 540,444 KiB. I independently checked all 66 payload hashes in `retained/review2-results`, both companion compressed/raw seals, and exact source equality for all four executed independent-control/companion files. At 4 µs / 0.5 ps in `densityRing`, full / restriction-thermalization / remaining heat-response RMS values are **12.860667 / 3.104866 / 14.180204 MW/m³** (80/160) and **9.511399 / 2.265208 / 9.214130 MW/m³** (160/320). Thus restriction-induced thermalization is material but does not explain most of this remaining response; its signed field can cancel part of the remainder. Those RMS values are not additive percentages. Halving the response step changes these values by only tens of W/m³, while signed algebra residuals are at most 3.73e−9 W/m³. Maximum whole-domain heat-energy residual is below 3.91e−18 J. No production state was replaced by the companion.

## Next discriminating check

`test_evolution108.py` freezes a finite-time stress manufactured solution before execution: `g(t)=1−t/10µs`, final time 4 µs, joint 8/16/32 radial grids with 64 steps, plus 128 steps at the middle grid. The analytic source is the exact cell integral of `ρ u_dot − div τ` (with angular inertia for torque). Linear g avoids a temporal manufactured-forcing floor without inserting any discrete stiffness residual. The source step adds matching kinetic energy, keeping incoming thermal energy well posed; the real `advance` then executes. No temperature solution or complete coupled trajectory is asserted.

It reports whole-domain and fixed-physical-endwall errors, time-halving field differences, exact analytical wall-stress integrals, and actual momentum/trace budgets. Radial momentum explicitly includes the cylindrical hoop-stress geometric term; axis-constraint and physical-boundary trace contributions are separate. Axial/rotation rigid virtual fields have zero strain, but a constant radial virtual field does not. The analytical wall-plus-geometry volume-force identity and actual trace budgets are asserted independently of convergence outcomes. Spatial contraction is reported honestly rather than chosen as a new acceptance threshold.

Stage 07 passed both finite-time stress controls, including the latest total-momentum assertion. Whole-domain relative velocity errors contract under joint refinement: radial **0.532843% → 0.289327% → 0.105040%**; axial **0.086100% → 0.048557% → 0.019378%**; angular velocity **0.255149% → 0.130402% → 0.049647%**. Fixed physical-endwall radial errors contract **0.810307% → 0.482135% → 0.196848%**. The middle-grid radial time-halving field difference is 1.0383e−5 relative. The maximum trace-budget residual is 1.76e−13 relative; total-momentum residual is at most 2.57e−16 relative.

Small final velocity error does not imply identical wall-traction accuracy: body forcing dominates total momentum change in this short control. Physical-boundary impulse errors against the analytic endpoint traction integral contract from **13.278% → 5.763% → 1.882%** (radial), **6.432% → 2.829% → 0.981%** (axial), and **15.653% → 7.123% → 2.498%** (torque). Both field and exchange errors therefore support a convergent stress discretization here. The instantaneous boundary-row discrepancy is not demonstrated as the V107 density cause, and no stress replacement is justified by these controls.

## Independent active-heat manufactured review

I reviewed `test_capacity_heat108.py` before execution. For `phi=cos(πr/R)cos(πz/H)` and `rho=rho0[1+c cos(2πr/R)cos(πz/H)]`, the code analytically integrates mass and `rho*phi` using `cos(2x)cos(x)=[cos(x)+cos(3x)]/2` and `cos²(z)=[1+cos(2z)]/2`. The radial primitive `r sin(ar)/a+cos(ar)/a²` differentiates to `r cos(ar)`. Its Laplacian cell integral is the exact cylindrical face flux, `2π[r phi_r]∫cos(kz z)dz + 2π∫r cos(kr r)dr[phi_z]`. The manufactured source is `A(Cphi*g_dot−κg*laplacianIntegral)`; linear g is endpoint-BE compatible. Capacity remains fixed and positive, and the active FiPy `conduct` hook executes. Variable density makes the global weighted `Cphi` nonzero; its source-energy change is correctly retained rather than forced to zero.

The initial stage-07 heat run failed because the fixture called a full-trajectory geometry whitelist with generic component levels. The preserved stage-08 diff changes exactly one geometry-call line to the underlying frozen `smooth-source-aligned` generator, which is also what the whitelist delegates to. No cuts, counts, family, equations or acceptance thresholds changed. Both stage-08 controls pass. Whole-domain **temperature-increment** relative errors are **0.206615% → 0.055677% → 0.014144%** at uniform capacity and **0.618437% → 0.236670% → 0.061573%** at density contrast 0.8, on 20×24 → 40×48 → 80×96 grids. Fixed-endwall errors also contract. Middle-grid time-halving differences are 1.66e−6 and 8.58e−6 relative to the increment; maximum source-energy residual is 2.49e−16 relative. The component thresholds were declared before outputs; they do not replace the coupled gates.

I independently checked all **57** hashes in `retained/component-results`, exact current-source equality with executed stage-07 stress and stage-08 heat tests, both logs, and the preserved one-line failed-fixture correction. This is a smooth, constant-mass/constant-coefficient transport control. Passive inherited FE heat in the stress-only control does not qualify the active FiPy model; that model is exercised separately in the heat control. Neither smooth control certifies sharp archived V107 profiles, nonlinear/current/flow feedback, missing plasma closure, or experimental accuracy.

## Final repeatability gate

Stage 09 passed all 14 controls and reran both D-decomposition pairs and both thermal-companion pairs. I independently checked all 32 final-export payload hashes, all eight execution-log seals and zero exit codes, and all four compressed/raw result seals. Every pair's numerical payload exactly reproduces its previous retained result after excluding elapsed time and RSS metadata. Current scientific tests/modules match their executed bindings; host `driver108.py` matches guest `driver.py`, and published `run108.py` matches the executed controller byte for byte. The review text was subsequently expanded and is not represented as the older transferred review snapshot.

The recorded runtime is Python 3.11.2 / NumPy 2.4.6 / SciPy 1.17.1 / scikit-fem 12.0.2 / FiPy 4.0.3. The final D-pair peak is 697,320 KiB, inside the parent's offline 1 GiB safe-dev run. Repetition strengthens numerical reproducibility; it does not extend the physical scope of these controls.

No experimental or full spatial qualification is granted by this review. The original 5.595688% density failure remains. Current evidence supports convergent isolated stress and active heat methods, with the sharp evolving-profile/coupled feedback question still unresolved. No production coefficient, state restriction, mesh cut or gate was changed; memory-pressure protections remained enabled.
