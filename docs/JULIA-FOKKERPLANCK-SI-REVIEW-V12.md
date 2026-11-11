# Independent SI bridge review supplement — v12

2026-11-06. This supplements, without changing, the frozen
`JULIA-FOKKERPLANCK-INDEPENDENT-V12.md` branch review. Reviewer:
`collision_disagreement_audit_v12`. No scientific execution by this reviewer;
only source/log inspection, hashing, and algebra.

## Current bounded conclusion

The actual 40/84 u SI bridge normalization, Maxwellian initialization, gyro
quadrature, temperature conversion, and end-step correction accounting have
been source-reviewed and are consistent with the pinned operator. Independently
inspected exported outputs support **PASS of the frozen, bounded initial-rate
gates**. This is not a long-time collision benchmark, positivity qualification,
full equilibrium-stationarity test, or validation of the separator simulator.

An initial ENOSPC interruption prevented startup (a host `df -h` inspection
showed 181 MiB available and 100% capacity). Parent subsequently reported
recovering disk space, and the reviewed bridge was saved and resumed in safe-dev.

## Observed upstream smoke evidence

Read `scientific/julia-fokkerplanck-v12/results/smoke.log` directly: 100 nonlinear
step-success assertions and all 12 distribution/moment/invariant regression
checks passed. Final invariant residuals were
`[-7.77156e-16,-1.11022e-16,1.99840e-15,2.66454e-15]`.
The final nodal minimum was **-0.00021719994024481444**. Thus negativity is
observed for that upstream beam fixture despite converged solves and conserved
moments. The target Maxwellian results below separately show much smaller
negative nodal values. Weighted negative mass is still needed to assess their
integrated size.

Exact SHA-256 evidence fingerprints:

| File | SHA-256 |
|---|---|
| `scientific/julia-fokkerplanck-v12/si-probe.jl` | `f5aaf3361aa3d685522c459c580db9c4ddda39e8c412c135a62c4acc3991dd5b` |
| `scientific/julia-fokkerplanck-v12/si-probe-plan.md` | `223d57efd3cd03f3f47df30222325d2f54f23b01ad296eda0b6a733e87cca63c` |
| `scientific/julia-fokkerplanck-v12/si-results/probe.toml` | `bfdb1beba39b18446bf3d61a4cc3e6a12976bcc8e8125080171ca643b0ddf942` |
| `scientific/julia-fokkerplanck-v12/si-results/probe.log` | `f6b53b376c8f89165fe1b958be0685fdbfd2a13a06635dc614f318fa6679213c` |
| `scientific/julia-fokkerplanck-v12/smoke.jl` | `778132a2b6d610d8ffca9076542d9b812abcb57cbf137a9160ed3eacf58794e3` |
| `scientific/julia-fokkerplanck-v12/results/smoke.log` | `bf5cf6ff35d926ddef0b2fe7aaca9ed3c6a67b1ff7f29c8e3817aa6619cff2ac` |
| exported `src/FokkerPlanck.jl` | `3deebabaf70d47c533959fe7fd901c755592acc7566a421a456f5cc60b68ed62` |
| exported `src/fokker_planck_calculus.jl` | `69ba719e09b7c35347a094f29c042f95cab59183f4bbfb6802de3e538b5eb7c3` |
| exported `src/velocity_moments.jl` | `b0563247aa31a175f2b576bd88c6a84f96fee114705028d467a6d8a6ceeae29f` |

Source export inspected:
`/tmp/mass-spinner-julia-fokkerplanck-v12-final-20261106/evidence/upstream/`.
Upstream pin remains `869e22dbbeda603caf99848c9d58052d9ec9d362`.

## Actual SI normalization: source and algebra

The reviewed bridge uses mref=40 u, cref=sqrt(20 e/mref),
tref=1 microsecond, nref=5e17 per cubic metre, mass=[1,2.1], charges=[1,1],
common c0ref=n0ref=1 and zero reference drifts. With
Gamma=e^4 lnLambda/(8 pi eps0^2), use
nuref=Gamma*nref*tref/(mref^2*cref^3), lnLambda=12.

The resulting energy unit mref*cref^2/e is 20 eV. For initial temperatures
[2,10] eV, normalized temperatures are [.1,.5] and Maxwellian width inputs are
[sqrt(.2),sqrt(1/2.1)]. The target normalized initial derivative of the light
temperature is 27982.1633001*(1e-6/20)=0.001399108165005, with the opposite
physical temperature derivative for the heavy species because densities match.

Actual source constraints sent to the implementer:

- The [coordinate already contains the 2 pi vperp Jacobian](https://github.com/KineticsforTransport/FokkerPlanck.jl/blob/869e22dbbeda603caf99848c9d58052d9ec9d362/src/fokker_planck_calculus.jl#L1041).
  Applying it again in moment conversion would double-count the gyro measure.
- [get_pressure](https://github.com/KineticsforTransport/FokkerPlanck.jl/blob/869e22dbbeda603caf99848c9d58052d9ec9d362/src/velocity_moments.jl#L48)
  returns normalized mass/3 times the central second moment. Convert
  T_eV=20*p/n. For a raw operator, use dT/dt=(20/tref)*(dp/n-p*dn/n^2).
  The center in the linear moment of C is the drift of f, not a drift inferred
  from the generally signed, near-zero-density C.
- The single-assembly correction-moment path requires
  [ngrid at least 5 and natural boundaries](https://github.com/KineticsforTransport/FokkerPlanck.jl/blob/869e22dbbeda603caf99848c9d58052d9ec9d362/src/fokker_planck_calculus.jl#L4148).

The bridge applies those constraints. It records the direct thermal derivative
with the quotient term, starts each timestep probe from the same Maxwellian,
asserts nonlinear success, and uses the finest R5 case for temporal controls.
Its pre-end-correction reconstruction `F + op.delta_pdf` is consistent with the
upstream closed-system projector: `delta_pdf` stores the preprojection increment
and is not subsequently overwritten by that projection. Its L1 diagnostics
integrate absolute nodal values with the existing quadrature; they are weighted
nodal diagnostics rather than exact norms of the continuous absolute FE field.

### Harness blocker caught and corrected before execution

The first saved bridge called `F_Maxwellian` with seven arguments, passing
coordinate objects and indices, while the pinned helper accepts five scalar
arguments. This would have caused a method-dispatch error during initialization.
In simple terms, it passed the whole grid where the helper needs one point.
The implementer made the minimal correction to pass `a.grid[i], b.grid[j]` at
`si-probe.jl:26`; no solver or physics change was needed. This fixes the actual
API mismatch without adding an adapter or overload. The corrected source hash
above was independently checked. All four direct probe cases and five advances
initialized successfully, providing the runtime regression evidence for this
API correction.

## Frozen acceptance and inspected results

The frozen plan specified natural-boundary grids 8x4, 12x6, and 16x8 with parallel
domain [-4,4] and perpendicular [0,4], ngrid=5; then 20x10 on [-5,5]x[0,5]
to extend the domain at unchanged element width. Frozen gates: initial n/T
projection error <=1e-4, final rate within 1% of the analytic value, last-ladder
rate change <=0.5%, and raw/corrected rate shift <=0.5%.

These gates are reasonable bounded normalization checks, not full validation.
After the direct-operator gates passed, the harness executed independent
one-step backward-Euler dt=1,.25,.0625 microsecond controls on the accepted
20x10/R5 configuration. It also recorded collision-off and common-temperature
controls, density/energy residuals, minimum nodal f, and raw/projected slopes.

The final 16x8/R4 versus 20x10/R5 comparison holds element width fixed, so its
`domain_pass` is a domain-extension check. The three R4 cases measure grid
sensitivity, but the harness does not enforce a separate final grid-difference
tolerance. The actual differences below demonstrate refinement sensitivity;
even an overall initial-rate PASS must not be described as proof of grid
convergence.

The reviewer read the exported TOML values, checked the gate comparisons, and
independently matched source/plan/log/result hashes to the retained project
copies. The output records the expected nuref=0.0013573454059700387 and
cref=6945.694067429592 m/s.

| Parallel/perpendicular elements, R | Corrected light rate (eV/s) | Corrected heavy rate (eV/s) |
|---|---:|---:|
| 8/4, 4 | 28054.354760 | -28049.850458 |
| 12/6, 4 | 27978.412012 | -27977.240686 |
| 16/8, 4 | 27981.865746 | -27981.862992 |
| 20/10, 5 | 27981.865746 | -27981.862993 |
| Analytic target | 27982.163300 | -27982.163300 |

The maximum signed-rate error falls approximately 0.258% -> 0.0176% -> 0.0011%
along the three R4 grids. The fixed-width domain extension changes the corrected
rates by about 5.3e-7 eV/s. Finest raw rates are
[27982.544818,-27981.792372] eV/s; the largest correction-induced slope shift is
about 0.6791 eV/s, well below the frozen 0.5%-of-target threshold. Finest initial
relative density and temperature errors are below 3e-7, meeting 1e-4. Small
unequal projected densities explain why the corrected temperature derivatives
are not exactly equal and opposite; conserved energy weights each by its actual
density.

| Independent one-step dt | Light rate (eV/s) | Heavy rate (eV/s) | Minimum final nodal f |
|---|---:|---:|---:|
| 1 microsecond | 27587.465244 | -27587.462529 | -2.01986e-7 |
| 0.25 microsecond | 27881.279676 | -27881.276932 | -6.67030e-8 |
| 0.0625 microsecond | 27956.589118 | -27956.586365 | -2.74734e-8 |

The finest rate error is about 0.0914%, and the last timestep change about
0.269%, meeting the 1% and 0.5% gates. All five advances returned true nonlinear
success (three unequal-temperature probes, collision-off, common-temperature).
The collision-off state is exactly unchanged in the recorded comparisons.
Across the unequal-temperature probes, absolute density changes are at most
3.6e-15, normalized energy changes at most 6.3e-15, and end-step correction
weighted-nodal L1 relative to the initial distribution at most 1.34e-13.

### Limits revealed by the controls

Every nonzero-collision advance has negative nodal values. They diminish with
the timestep in this probe, but weighted negative mass was not recorded and
positivity is not qualified. This occurs with tiny end-step projection changes,
so those changes alone do not establish the origin of the negativity.

The 6/6 eV temperature control changes species temperatures by only about
1.91e-8 eV in 1 microsecond, meeting the frozen moment threshold. However, its
maximum nodal distribution change is 6.8804e-5 and its minimum becomes
-4.5497e-9. Thus the control establishes near-stationary temperature moments at
this resolution; it does not establish stationarity of the full equilibrium
distribution. A later equilibrium residual/refinement and negative-mass audit
is warranted before promoting this branch to a general reference solver.
