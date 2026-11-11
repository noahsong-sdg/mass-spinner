# Julia nonlinear Coulomb solver qualification — v12

Review date: 2026-11-06. This is independent source qualification and a bounded
upstream-example execution, not validation of Mass Spinner or a replacement of
the ongoing PETSc/WarpX comparisons. No production physics code changed.

## Decision

**Strong candidate for the next independent deterministic collision reference.**
The public **multi-species development branch** has the coupled nonlinear implicit
driver that the default branch lacks. It is a substantially better Julia lead
than a generic SDE/Fokker–Planck library or BGK model. Retain PETSc and WarpX:
the Julia implementation supplies a different Rosenbluth-potential discretization,
but shares continuum finite-element positivity limitations with PETSc. A third
implementation can help localize disagreement; language choice cannot establish
physical correctness.

## Source identity and scope

| Item | Verified evidence |
| --- | --- |
| Public repository | [KineticsforTransport/FokkerPlanck.jl](https://github.com/KineticsforTransport/FokkerPlanck.jl), redirected from the Oxford talk's moment-kinetics link |
| Default main | `76b09d2f7af11be4c9e7b61f9b81bad119011b4a`, 2025-11-24 |
| Qualified development branch | [`869e22dbbeda603caf99848c9d58052d9ec9d362`](https://github.com/KineticsforTransport/FokkerPlanck.jl/tree/869e22dbbeda603caf99848c9d58052d9ec9d362), branch `multi-species`, 2026-05-13 |
| License | [MIT](https://github.com/KineticsforTransport/FokkerPlanck.jl/blob/869e22dbbeda603caf99848c9d58052d9ec9d362/LICENSE) |
| Maintenance evidence | Branch commits and successful [upstream CI run](https://github.com/KineticsforTransport/FokkerPlanck.jl/actions/runs/25790276819) on the qualified pin; no release/tag observed through GitHub API |
| Documentation | README says further documentation is pending; project version `0.1.0`; default-main CI selects Julia 1.11 and qualified-branch CI selects Julia 1.12 |

The [Oxford seminar](https://www.maths.ox.ac.uk/node/74386) describes multi-species
Galerkin/JFNK backward Euler. The [2025 CPC publication](https://doi.org/10.1016/j.cpc.2025.109675)
describes the earlier Rosenbluth finite-element method and explicit integration;
it explicitly disclaims positivity guarantees. The later public branch, rather
than the article's future-work paragraph or default main, establishes the coupled
implicit capability. This supersedes the initial **main-only** assessment that a
coupled driver was missing from the public project.

## Actual execution path and physics

The [coupled driver](https://github.com/KineticsforTransport/FokkerPlanck.jl/blob/869e22dbbeda603caf99848c9d58052d9ec9d362/src/FokkerPlanck.jl#L322)
solves `Fnew - Fold - dt*C(Fnew,Fnew) = 0` with JFNK, an optional test-particle
preconditioner, and three-dimensional arrays indexed by velocity and species.
The [operator](https://github.com/KineticsforTransport/FokkerPlanck.jl/blob/869e22dbbeda603caf99848c9d58052d9ec9d362/src/FokkerPlanck.jl#L120)
calculates each species' nonlinear Rosenbluth potentials, transforms them between
species velocity grids, sums unlike/self contributions, assembles the weak form,
and solves a finite-element mass-matrix problem. This is actual nonlinear Coulomb
scattering, not relaxation to a prescribed Maxwellian. An optional analytic
Maxwellian coefficient path also exists and must not be mistaken for the default.

The RMJ kernel is equivalent to the Coulomb Landau tensor
`U(g)=(|g|² I - g*gᵀ)/|g|³`, i.e. Coulomb `gamma=-3` in the common generalized
Landau convention. The code does not expose gamma as a selectable interaction.
It assumes gyrotropic `f(v_parallel,v_perp)`, not a general three-velocity
distribution or a spatial separator simulation.

### Normalization: read the arithmetic, not only the docstring

The [potential sum](https://github.com/KineticsforTransport/FokkerPlanck.jl/blob/869e22dbbeda603caf99848c9d58052d9ec9d362/src/fokker_planck_calculus.jl#L3392)
uses

```
G_factor = (Zs*Zsp/ms)^2 * n0sp/(c0s^2*c0sp)
H_factor = (Zs*Zsp)^2/(ms*msp) * n0sp/(c0s*c0sp^2)
```

The drag assembly separately contributes the RMJ factor two. For common velocity
and density references, this gives diffusion proportional to `1/ms²` and friction
proportional to `1/(ms*msp)`. Species charge signs disappear in the squared product,
as expected for Coulomb collision rates. The source notes that species-dependent
Coulomb-log factors are absent: a common fixed logarithm can be included in
`nuref`; arbitrary `lnLambda_ssp` requires additional work. The docstring's shortened
charge-only relation must not be used to discard the actual mass factors.

For an intended SI bridge, with dimensionless masses `m_s/m_ref`, common reference
speed `c_ref`, density `n_ref`, time `t_ref`, use

```
Gamma_ref = 2*pi*e^4*lnLambda/(4*pi*epsilon0)^2
nuref = Gamma_ref*n_ref*t_ref/(m_ref^2*c_ref^3)
vth_s = sqrt(2*T_s*e/m_s)/c_ref     # T_s in eV
f_dimensionless = f_SI*c_ref^3/n_ref
```

This is a derivation from the inspected equations/arithmetic, not an executed SI
adapter. It needs an independent initial heating-slope test before matching our
40u/84u benchmark. The upstream smoke uses its original dimensionless masses and
charges; it does not validate this bridge.

### Conservation is a numerical projection, not a positivity proof

The [operator correction](https://github.com/KineticsforTransport/FokkerPlanck.jl/blob/869e22dbbeda603caf99848c9d58052d9ec9d362/src/fokker_planck_calculus.jl#L3845)
subtracts terms of the form

```
(x0 + x1*(v_parallel-u_s) + x2*((v_parallel-u_s)^2+v_perp^2))*f_s
```

Self terms enforce each species' density/momentum/energy. Unlike-pair coefficients
instead enforce the two species' separate particle numbers and their **summed**
momentum/energy, allowing real interspecies transfer. A four-coefficient linear
solve determines one density correction per species and common momentum/energy
correction coefficients. These adjustments remove numerical moment defects;
they do not make the uncorrected discretization exactly conservative by construction.

The [end-step correction](https://github.com/KineticsforTransport/FokkerPlanck.jl/blob/869e22dbbeda603caf99848c9d58052d9ec9d362/src/fokker_planck_calculus.jl#L3940)
similarly preserves all particle numbers, `sum(m_s*n_s*u_s)`, and
`sum(3*p_s/2 + m_s*n_s*u_s²/2)`. It is deliberately disabled for fixed backgrounds
or sources/sinks, because those systems exchange energy/momentum externally.
The multiplicative polynomial has no nonnegativity constraint; excellent
conservation alone can coexist with a signed, underresolved distribution.

The [entropy diagnostic](https://github.com/KineticsforTransport/FokkerPlanck.jl/blob/869e22dbbeda603caf99848c9d58052d9ec9d362/src/FokkerPlanck.jl#L271)
uses `log(abs(f)+1e-15)`. This keeps a diagnostic finite when f is negative; it is
not the physical Boltzmann entropy of that signed f. Neither a finite value nor
positive reported production establishes a discrete H-theorem. Positive nodal
samples would also not guarantee positivity between high-order interpolation
nodes. Raw minima, signed/negative mass, resolved interpolation, and conservation
correction norms must remain separate validation outputs.

## Bounded execution and reproducibility

Dedicated guest project: `scientific/julia-fokkerplanck-v12`, VM identity
`safe-dev-deee32e46dcef4df`. All downloads, Julia package operations and upstream
scientific execution occur inside safe-dev; no home/control/credential mounts.
Julia 1.13.3 Linux aarch64 archive is verified against official SHA256
`9ceb053bee6dfb8189bd40afd6925de3a9b7ff8fac8d01a5fcdd84af171ddf03`.

Four otherwise floating source dependency revisions are pinned:

| Dependency | Revision |
| --- | --- |
| FiniteElementAssembly | `5491472a575e475f19bbc46c29dd38672f371559` |
| FiniteElementMatrices | `7c94d6d75880d448beca9bffebd4e6b44ac98566` |
| JacobianFreeNewtonKrylov | `ecad28c38dce1383180599a9e4959afd9f1e5f62` |
| LagrangePolynomials | `d0512da41f31f9c652b2642443d00522ebb941de` |

Only upstream `Project.toml` source pins change; no solver physics changes.
The final harness loads the upstream demo through `include_string` with a single
checked transformation that asserts the already-returned nonlinear success flag.
The first default-main dependency installation succeeded but no main scientific
test ran. Its provenance, Manifest and log were exported to
`/tmp/mass-spinner-julia-main-v12-qualified-20261106` **before** replacing that guest
snapshot with the three-file branch bootstrap/harness/README snapshot.

The chosen smoke copies the **exact upstream two-species CI case**:
mass `[1,2]`, charge `[-1,2]`, 6x3 elements, five nodes/element,
100 backward-Euler steps of dt=1, nonlinear tolerance `1e-10`.
It checks the original saved distribution/moment regression and independently
checks actual computed final separate densities and total momentum/energy against
the actual initial conserved values. These tests are distinct from refinement,
physical benchmark accuracy, or nonnegativity. The upstream demo discards each
step's nonlinear-solver success Boolean. Technically that permits a failed Newton
solve to proceed into correction and diagnostics; simply, the demo can continue
after the solver says it failed. The final harness captures/asserts that existing
return at every step and requires exactly 100 successful returns. This is chosen
over altering the solver or accepting corrected moments as a convergence proxy.
The exact-source match guard also checks that precisely one call block is altered.
An initial marker guard failed before scientific execution because Julia dedents
triple-quoted strings; restoring the original indentation fixed that test-harness
issue. Its log and the earlier pilot are preserved in the exported evidence.

**Observed final run: PASS**, 100/100 asserted nonlinear-success returns and
12/12 distribution, moment and invariant assertions. Actual signed invariants
are `[n1,n2,total_parallel_momentum,total_energy]`:

```
initial = [1.0000000000000007, 0.5000000000000002, 1.0549443370246039, 1.9812979169696403]
final   = [0.9999999999999999, 0.5000000000000001, 1.0549443370246059, 1.981297916969643]
delta   = [-7.771561172376096e-16, -1.1102230246251565e-16, 1.9984014443252818e-15, 2.6645352591003757e-15]
initial nodal f_min = 9.342011027671782e-92
final nodal f_min   = -0.00021719994024481444
```

This demonstrates working coupled dynamics **and a positivity failure in the
coarse upstream case**. Near-machine moment conservation does not remove the
negative distribution. The final species temperatures are 0.7570492971200304 and
0.7566627752497239 in upstream normalized units; these are not our 40u/84u eV case.
Initialization took 4089 ms and the 100 steps 4483 ms in the final run, excluding
process startup/JIT; first package compilation took several minutes.

The numerical residual norms, signed/negative mass, and correction magnitudes
remain unmeasured. Success flags establish the solver's own success criterion,
not an independently recomputed residual or resolution accuracy.

Exact final command (offline, inside safe-dev):

```
JULIA_DEPOT_PATH=.cache/depot JULIA_NUM_PRECOMPILE_TASKS=2 OPENBLAS_NUM_THREADS=1 \
  .cache/julia-1.13.3/bin/julia --check-bounds=yes \
  --project=.cache/FokkerPlanck.jl-869e22dbbeda603caf99848c9d58052d9ec9d362 smoke.jl
```

The complete exported public-source/evidence snapshot is
`/tmp/mass-spinner-julia-fokkerplanck-v12-final-20261106`; scientific execution was
finished before export. The reviewed host harness was then updated to match the
tested guest byte-for-byte; its SHA256 is
`778132a2b6d610d8ffca9076542d9b812abcb57cbf137a9160ed3eacf58794e3`.
Pinned transitive dependencies, provenance and final log are retained under
`scientific/julia-fokkerplanck-v12/results/`. Manifest SHA256 is
`0c41ec6f33dadd3e2f5f367c60e0b2e9564b9cca5aa03bd5d7f92eca00d9a2c5`;
source archive SHA256 is
`9942adb3419c7428679e1dfcc87a5040e42c6f5144d7449b0708410d78db64d1`.
No frontend build/typecheck was needed for this isolated scientific-only increment;
the parent project still requires its own final gate. No full upstream test suite
or matched physical cross-code study was run here.

## Tradeoffs and next reviewable increment

| Tool | Useful independent role | Material limits |
| --- | --- | --- |
| FokkerPlanck.jl multi-species branch | Julia-native, inspectable nonlinear Rosenbluth reference; implicit unequal-species driver; species grid transformations | Research branch, incomplete docs/no releases, dependency pins required, JIT/install overhead, gyrotropic distribution, no positivity guarantee, conservative correction magnitude must converge |
| PETSc Landau | Mature nonlinear solver/FE infrastructure, coupled multispecies deterministic Landau reference | Configuration/SI normalization and projection require audit; resolving velocity tails is costly; conservation alone does not establish f positivity |
| WarpX collisions | Independent particle representation and established PIC application; avoids continuum negative-f oscillations | Monte Carlo uncertainty and finite particle/timestep error; collision-angle algorithm and low-speed cross-section cap affect comparison |
| Julia SciML orbit reference | Independent adaptive trajectory integration and strong numerical-tooling ecosystem | It is an integration framework, not a prevalidated nonlinear Coulomb solver |

Recommendation: **keep and qualify this Julia package**, then add one small,
explicit SI-normalized 40u/84u collision-only adapter. First check the analytic
initial heating rate, collision-off, equal-temperature equilibrium, both species'
rates, conservation residuals and correction magnitudes; then refine dt/domain/
velocity grid and compare full distributions as well as temperatures with PETSc.
Keep common lnLambda=12 and explicitly include self plus cross collisions to
match that reference. Avoid combining separator fields/collectors with this
first matching study. An upstream test pass would justify proceeding to that
increment; it would not resolve the present code disagreement by itself.
