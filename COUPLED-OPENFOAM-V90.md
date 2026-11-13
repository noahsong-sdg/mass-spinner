# Coupled momentum and energy: OpenFOAM reference

The reference now evolves compressible neutral-gas momentum and energy together,
including centrifugal response, meridional flow, viscous stress/work and heat
conduction. It compares native OpenFOAM Foundation 14 against the existing V86
research backend. **It does not yet pass every convergence gate or establish
experimental accuracy.** Application physics and the deployed playground are
unchanged.

## Why the extension was necessary

V88 checked conduction and nearly linear, constant-density swirl separately.
Its viscous-loss ledger did not evolve temperature. In simple terms, it could
check heat spreading and rotation individually, but not how changing flow,
compression and heating affect each other.

The new adapter uses the existing native `fluid` module with perfect-gas,
constant-property monatomic argon. Its energy equation requires the existing
`viscousHeating` fvModel to include conservative stress-work transport. Adding
an independent dissipation heat source would double-count part of that balance.
Reusing the native model gives an independent discretization without maintaining
a custom OpenFOAM solver. See the actual [energy equation](https://cpp.openfoam.org/v14/fluid_2thermophysicalPredictor_8C_source.html)
and [stress-work implementation](https://cpp.openfoam.org/v14/classFoam_1_1fv_1_1viscousHeating.html).

The matched equations are continuity, full Newtonian momentum, and total energy:

```
∂t ρ + ∇·(ρU) = 0
∂t(ρU) + ∇·(ρUU) = −∇p + ∇·τ
∂t(ρE) + ∇·[(ρE+p)U] = ∇·(τ·U + k∇T)
τ = 2μ[sym(∇U) − I(∇·U)/3]
p = ρRT; E = CvT + |U|²/2
```

The existing V75 Euler transport and V86 scikit-fem stress/conduction operators
are reused without changes. This comparison excludes electrical forcing, Hall
transport, ionization, radiation, turbulence and species separation. It tests
the neutral momentum/energy block, not the complete driven plasma apparatus.

## Results

A closed, adiabatic cylinder releases a smooth nonuniform temperature and swirl
profile for 20 μs. Radius is 0.06 m, modeled axial length 0.24 m with midplane
symmetry, density 0.001 kg/m³, μ = 1.14×10⁻⁴ Pa·s, and k = 15Rμ/4. Side/end
walls are stationary and no-slip. No experimental currents or velocities were
used for fitting. Exact profiles, schemes and gates were frozen in the
[protocol](scientific/coupled-openfoam-v90/PROTOCOL.md).

| Audit | Result | Remaining failure |
|---|---|---|
| Original meshes 8×16, 16×32, 32×64 | 118/119 gates pass | Native swirl-increment spatial change 6.274%, above 5% |
| Prospectively declared extension through 64×128 | 130/134 gates pass | Cross-solver and V86 meridional spatial contraction, each scored as whole state and increment |

The extension retains the original norms and limits. Native swirl-increment
spatial change falls to 2.118%, resolving that gate. The original failed audit
remains unchanged. At 64×128 and 512 steps, cross-solver volume RMS differences
normalized by the actual response are:

| Field response | Difference |
|---|---:|
| Density change | 0.133% |
| Temperature change | 0.128% |
| Swirl change | 0.814% |
| Meridional velocity | 0.835% |

Small disagreement is encouraging but insufficient for admission: cross-solver
meridional error rises from 0.680% to 0.835%; V86's spatial self-change rises from
0.704% to 1.052%. The contraction ratios are 1.227 and 1.494, respectively,
against a strict limit below one. Whole and increment scores coincide here
because the initial meridional velocity is zero; the four failures represent
two distinct unresolved contraction checks, not four independent mechanisms.
Post-prediction localization puts 84.6% of the finest V86 spatial squared error
in the endmost axial quarter, with the largest cell contribution at z=0.2381 m
near the z=0.24 m wall. Radial and axial RMS differences are 0.1291 and
0.06338 m/s. This identifies the endwall region for investigation; it does not
establish a root cause. The next step is to examine its momentum/pressure and
stress coupling under joint refinement, without fitting transport coefficients
or measured velocities.

All native mass, energy, wall-angular-momentum, wedge-halving and finest-grid
timestep gates pass. Global energy conservation alone is not enough: removing
stress work still conserves the closed global energy budget but changes the
temperature response by 1.863% at 16×32. This negative control is retained and
explicitly ineligible as a physical reference.

The native wedge uses actual volumes; finite wedge geometry differs from the
analytic cylinder. Native point-velocity kinetic energy and V86's integrated
swirl inertia also differ at finite resolution. Common-grid scoring sums
integrated conserved quantities before recovering primitives; it does not
silently interpolate temperatures or equate the two finite-grid conventions.
The measured native EOS constant is 208.13226171523 J/(kg·K), versus V86's
208.13213730416: a relative difference of 5.98×10⁻⁷. Neither was tuned. This
small known mismatch remains explicit rather than being attributed to a solver.

## Reproducibility and checks

All scientific execution used offline, non-root Apple safe-dev VMs. The new
isolated environment uses Python 3.11.2, NumPy 2.4.6, SciPy 1.17.1 and scikit-fem
12.0.2. Existing native installation and older environments were preserved.
Sources, native executables/libraries, input dictionaries, reporting clocks,
conserved states and execution logs are sealed in the evidence.

- Eight adapter regression controls, twelve existing Flow controls and seven
  existing Diffusion controls pass.
- `npm test` passes all 1,238 tests. `npm run typecheck`, `npm run build`,
  `npm run check:site` and `npm run check:assets` pass on the unchanged,
  SHA-verified 2,666-file application snapshot
  `b066b4388152183e1714bbe5b4dedac2ca106adf0a57f43e960db893e9340b6e`.
  [Exact commands and receipts](scientific/coupled-openfoam-v90/app-final/execution.json).
- Seven original physical cases and three refinement cases complete. The
  original campaign was rerun after an output-only change; all seven native
  and V86 state arrays, packets and physical histories match exactly.
- The initial adapter's missing internal-energy pressure-work scheme was fixed
  explicitly and regression-tested; no default numerical-scheme fallback was
  introduced. All failed setup attempts remain recorded.
- Repeated fixed-mesh geometry writers were removed because they emitted
  redundant data every timestep. Initial verified geometry and every-step
  wall torque remain. Exact physical replay validates this output-only change.

See [reference code and evidence](scientific/coupled-openfoam-v90/README.md).
`numericalComparisonPass` and `experimentalQualification` remain false.
