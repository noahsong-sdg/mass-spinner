# Stage 7: bounded radial magnetic/current closure for II C

Implemented 6 November 2026. This is a separately selectable, mathematically checked equilibrium extension, not experimental validation or a complete vacuum-arc discharge simulation. The original common-corotation and imposed-field Gaussian closures remain unchanged.

## Execution path and root cause addressed

The existing prescribed-Gaussian path computes composition and density, derives electron flow/current in a uniform input B, and integrates an estimated magnetic perturbation. That estimate is diagnostic only: the changed B does not feed back into force balance. This is a valid low-self-field approximation, but it is inconsistent to call it a self-consistent magnetic equilibrium when the required field change is appreciable. In simple terms, the plasma's current changes the field, but the old model continues calculating motion using the original field.

`magneticCentrifuge(config)` is a separate closure. It uses the unchanged Gaussian composition/input domain, solves the radial magnetic pressure, then recomputes laboratory potential, electron drift and current using the solved B at every radius. It is not an estimate tacked onto the old profiles. Input `magneticT` now specifies either **axis B** or **wall B**, selected explicitly by `magneticBoundary`.

This is the smallest coherent feedback extension: it closes an identifiable radial equation while retaining prescribed density, temperature and rotation. A full source-driven, finite-length, resistive two-fluid discharge would require additional measured inputs and boundary conditions. Silently changing the existing Gaussian mode or prescribing both electron corotation and a peaked density would obscure the physical assumptions.

## Assumptions and independent derivation

Assume axisymmetry, axial invariance, no radial velocity, no axial/azimuthal B component except `Bz(r)`, common rigid ion rotation Ω, equal ion charge Z, common isothermal Ti and Te, and quasineutrality. Electron inertia, collisional viscosity and axial end effects are neglected. N(r)=N0 exp(−r²/R²) remains prescribed. Temperatures below are in eV; masses are in kg.

For species fractions f_s(r), ion radial momentum gives

```
f_s(r) ∝ f_s(0) exp[m_s Ω²r²/(2eTi)]
eTi d ln n_s/dr = m_s Ω²r − Ze φ′ + Ze Ωr B
```

Subtracting equal-charge ion equations fixes the fractions independently of B. Let mbar=Σf_s m_s. The Gaussian total density then requires

```
φ′/r = ΩB + mbar Ω²/(Ze) + 2Ti/(ZR²)
veθ/r = (φ′/r)/B + 2Te/(BR²)
F(r) = mbar(r) Ω² + 2e(Ti+ZTe)/R²
Jθ = ZeN(Ωr−veθ) = −N r F/B.
```

Ampère's law for an axial field gives `dB/dr=−μ0 Jθ`. Therefore

```
d(B²)/dr = 2μ0 N(r) r F(r)
B²(r) = B²(0) + 2μ0 ∫₀ʳ N(s) s F(s) ds.
```

The integrand is nonnegative. Prescribing nonzero axis B fixes a regular same-sign branch. Prescribing wall B instead requires

```
B²(0) = B²(a) − 2μ0 ∫₀ᵃ N(s) s F(s) ds > 0.
```

If this fails, the specified Gaussian density/rotation/temperature and wall magnetic pressure have **no regular nonzero-B solution within this closure**. The code throws rather than clipping B, lowering density or changing the boundary. This is not proof that no real discharge can exist: another density, electron response or boundary model may apply.

Finally define ΨB(r)=∫₀ʳ B(s)s ds. With φ(0)=0,

```
φ(r) = (Ti/Z)[log Σs f_s(0) exp(m_sΩ²r²/2eTi) + r²/R²] + Ω ΨB(r).
```

The previously named `effectivePotentialV` is φ−ΩΨB in this mode; the uniform-field expression ΩBr²/2 no longer applies. `magneticFluxTM2` stores ΨB, without the full-disk factor 2π.

The summed radial force gives the independent identity

```
d[ eN(Ti+ZTe) + B²/(2μ0) ]/dr = N mbar Ω² r.
```

No small-self-field expansion was used in the B² solve. The omitted electron-inertia force is nevertheless still an approximation and is reported rather than repaired with an arbitrary threshold.

## Numerical method and output interpretation

Composite Simpson quadrature integrates the positive B² source on a twice-refined radial mesh. Direct square roots select the branch of the specified boundary B. A second Simpson integral computes ΨB; the potential is not obtained by replacing a variable B in ΩBr²/2.

The result is compatible with the existing radial inventory diagnostics and adds:

- Actual `magneticFieldT`, current, electron/ion velocity, laboratory φ and E at each radius.
- `axisMagneticT`, `wallMagneticT`, explicit boundary selection/value and `requiredMagneticPressureRisePa`.
- `magneticPerturbationT = B(r)−B(0)` as an **actual solved difference**, and its maximum relative to |B(0)|. It is not the old imposed-field estimate.
- Algebraic ion/electron force-balance and quasineutrality residuals.
- An independent midpoint finite-difference Ampère defect in T/m and normalized by the global maximum current source. This diagnostic decreases as radial resolution increases; it is not an instability threshold or an estimate of experimental accuracy.
- The neglected electron centrifugal force relative to retained electron force magnitudes. A large ratio warns that this inertia-free closure is inappropriate; passing a small-ratio check does not validate the other assumptions.

Holding Ω, Ti and the prescribed total density fixed means that changing B affects the required φ/current/electron flow but does **not** change the equal-charge composition or isotope enrichment law. The model does not predict how coil or electrode settings drive Ω.

For whole-column composition, solve the unchanged Gaussian inventory inverse first, then evaluate this field closure at the recovered central fractions. Magnetic compatibility at a pure-species bracketing trial must not falsely reject a physically compatible target mixture.

## Evidence and checks

The primary [Hole & Simpson 1997 paper](https://maths.anu.edu.au/files/U4348025XPUB31.pdf), [DOI](https://doi.org/10.1063/1.872246), was reopened. Its equations 3, 4 and 7–10 motivate the rigid, Gaussian, current-carrying radial closure; it explicitly neglects the plasma self-field. **The B² coupling above is our independently derived bounded extension**, not a claim to reproduce that paper's full axial perturbation model or its experimental performance.

`tests/magnetic-centrifuge.test.ts` checks:

1. An independent analytic single-species solution, `ΔB²=μ0N0 F R²[1−exp(−r²/R²)]`, for both B signs and both boundary choices.
2. Independent finite differences of the actual solved potential, log species densities and B against each ion/electron radial momentum equation and Ampère's law.
3. The low-density limit against the unchanged imposed-field Gaussian model; a dense case demonstrates genuine field feedback rather than postprocessing.
4. Zero rotation with retained pressure-driven electron current, equal masses, absent species, sign reversal and inventory invariants.
5. Axis/wall boundary round trips.
6. Radial refinement of quadrature and finite-difference defects.
7. Explicit rejection of incompatible wall pressure, unknown boundary, zero B and unequal charges.

Narrow command:

```
./node_modules/.bin/tsx --test tests/magnetic-centrifuge.test.ts
```

**7 passed, 0 failed.** At 25/50/100/200 bins, wall-field errors against a 2000-bin calculation were 3.51×10⁻¹², 2.19×10⁻¹³, 1.37×10⁻¹⁴ and 8.53×10⁻¹⁶ T; the first ratios are approximately 16 as expected for Simpson quadrature. Normalized midpoint Ampère defects were 0.0012144, 0.0003030, 0.00007583 and 0.00001896, decreasing approximately fourfold. The single-species analytic test avoids relying solely on a fine-grid self-comparison.

Standalone strict NodeNext typecheck of `src/magnetic-centrifuge.ts` passed. The new tests plus neighboring Gaussian/bulk/inventory checks passed **29/29** (about 1.48 s). The root records final integrated UI/build/typecheck separately. Execution followed the user-authorized scoped host exception with `login:false` after container service access was denied; no hooks, credentials, browser restrictions or isolation settings changed.

## Remaining Stage 7/8 gates

This completes the **bounded radial field-feedback increment**, not every physical realism task. N0/R/Ω/T/charge are imposed; electron heating/energy exchange, neutral/charge exchange, turbulence/stability, axial sources, endplate/sheath current, drive availability and collector acceptance remain separate closures. There is no calculated torque demand, engineering throughput or electrical power. No measured operating point or held-out experimental condition was fit or predicted here. A synthetic analytic benchmark establishes equations/numerics, not experimental calibration.
