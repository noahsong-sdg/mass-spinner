# Structure-preserving homogeneous two-ion adaptation, v14

The new Julia adapter implements positive Gaussian-mixture particles in full
Cartesian 3V with unequal physical masses. Its upstream-core and algebraic
qualification passes. Complete physical acceptance requires the separately frozen
distribution, quadrature, regularization, rate and time-refinement campaign;
the short cost pilots alone do not supply it. The deployed collision backend and
all v13 failed evidence remain unchanged.

## Existing code and actual execution path

The existing implementation is JuliaPlasma/CollisionOperators.jl, pinned to
`9874021c9edf030fdaa1f62e28c450d63acc361c`, with its MIT license retained.
`vendor/newton_krylov.jl` is copied byte-for-byte and actually solves the adapter's
implicit system. Its standalone nonlinear-root smoke passes three assertions.
This qualifies the generic JFNK core, not the complete upstream Mantis/GPU/spline
package. No Mantis installation or full upstream 2V benchmark is claimed.

The inspected upstream `solver.jl::landau_geff!` computes a midpoint entropy
coordinate gradient, applies a global Gonzalez correction, then divides by
particle weights. Its CPU Landau pair projection is in `functions.jl`; both paths
are 2V/single-population. The new `core.jl` extends their pair-metric and
discrete-gradient construction to 3V, unequal masses and a different positive
entropy representation. These adaptations are new code, not an upstream
multispecies theorem or drop-in solver. The unlicensed author MATLAB/C++ examples
were inspected but their source is not copied into this package.

The actual path is `run.jl::main` → `make_model` / `initial_state` → `advance` →
the unchanged upstream JFNK residual closure → `discrete_gradient` → fixed-grid
Gaussian `entropy` / stable `entropy_increment` → `mobility`. The runner exports
every actual state and fails after preserving any unconverged implicit result.
It does not substitute an analytic Maxwellian or fitted moments for the arrays.

## Representation, normalization and discrete identities

The physical problem fixes 40u/84u, +e/+e, number densities 5e17 m^-3 each,
Coulomb logarithm12, and no fields or spatial transport. Units are
`m0=40u`, `n0=5e17 m^-3`, `v0=sqrt(5eV/m0)`. Normalized masses are1/2.1;
weights sum to the actual normalized species number. The time coefficient is
`kappa=Gamma*n0/(m0^2*v0^3)` with
`Gamma=e^4*lnLambda/(8*pi*epsilon0^2)`. The case metadata gives all SI scales,
units, charge states, dimensionality and source identities explicitly.

`F_s(v)=sum_i w_i Gaussian(v-v_i,variance_s)` is positive for positive fixed
weights and variance. Variance is `alpha/m_s`, so `m_s*variance_s` is identical
across species. Common-temperature initialization uses deterministic tensor
Gauss-Hermite markers with component variance `(1-alpha)/m_s`. Smooth temperature
is5eV; marker temperature is`5*(1-alpha)eV`. There is no random seed. Both
temperatures and the known Gaussian energy offset are retained without snapshot
renormalization. A name beginning with`rate` selects the explicitly exported
2/10eV smooth-temperature initialization; its marker temperatures subtract5alpha.

The fixed Cartesian quadrature scalar is
`H_d=sum_s sum_q W_q F_s(x_q)log(F_s(x_q))`. Its coordinate derivative includes
`(logF+1)*w_i*Gaussian*(x-v_i)/variance`; the +1 term cannot be discarded just
because it would cancel in an exact full-space integral. Directional finite
differences check this same implemented scalar. Log-sum-exp evaluates the density
logarithm without a density floor or signed-log extension.

Gaussian changes are computed with`expm1` before summing a density increment.
The entropy increment uses `deltaF*logF0+F1*log1p(deltaF/F0)` where resolved, with
the direct log-density difference for large relative changes. The Gonzalez
correction uses that stable same-quadrature increment and the actual serialized
velocity difference; its denominator is guarded only at exact zero. No arbitrary
small-increment floor disables the discrete chain rule.

The symmetric pair mobility uses the midpoint relative velocity and the 3V
Landau tensor`Q(z)=(I-zz'/|z|^2)/|z|`. Its bracket divides each coordinate entropy
gradient by its own marker weight and species mass. Antisymmetric pair assembly
preserves momentum; the midpoint quadratic-energy null space preserves energy;
the positive metric dissipates the implemented entropy at an adequately solved
root. Exactly coincident pairs use`Q(0)=0`; nonzero distances are not clipped.
The output includes actual residual contractions for entropy, momentum and energy,
so their defects can be checked directly rather than inferred from a small norm.

These are identities for`H_d`, not automatic qualification of a full-space
physical entropy or the unregularized Landau limit. Independent full-space
quadrature, tail bounds and regularization refinement remain separate gates.

## Bounded executed cost pilots

The prospectively bounded pilots use64 markers/species, alpha.25, R6, dt1us,
two advances, 120-second wall cap and1GiB RSS. They use the same numerical core.

| Pilot | Actual wall / peak direct Julia RSS | Residuals | Stable H_d changes |
|---|---|---|---|
| Fixed Cartesian q12 | 6.647s /459,198,464B | 3.23e-14 /9.25e-13 | -0.00723959 /-0.00603067 |
| Fixed Cartesian q32 | 5.507s /452,177,920B | 1.10e-14 /1.02e-14 | -5.88914e-12 /-5.73302e-12 |
| Fixed Cartesian q48 | 13.135s /512,888,832B | 2.95e-13 /2.94e-13 | -2.35405e-9 /-2.29730e-9 |

All six advances converge. The q48 RSS measures the whole process group. The very different initial scalar values
(-10.4131858 at q12 versus -7.32262914 at q32) demonstrate why the q12 scalar is
not a trustworthy physical entropy merely because its algebraic dissipation
identity passes. Independent physical-H diagnostics do not reuse these fixed
quadrature assumptions. Cost-pilot success is not a distribution-convergence pass.

The q12 entropy-balance residuals are4.02e-15/1.10e-13; the q32 values are
3.60e-17/-8.44e-17. Reported residual contractions account for those defects.
The independent mathematical reviewer separately evaluates the scalar, gradient,
line-integral entropy change and residual contractions on the actual q12 arrays.

## Corrected implementation and evidence failures

**Gauss-Hermite parity.** Raw eigensolver roots intended to be zero differed by
about1e-16 across mass-scaled species. With an arbitrary test gradient, their
spurious near-coincidence produced an ill-conditioned Coulomb denominator and a
large absolute force-cancellation residual. In plain terms, a shared origin was
represented by two nearly overlapping points. The fix enforces the known exact
quadrature symmetry: antisymmetric node pairs, equal paired weights and an exact
odd central zero. Tests retain weight positivity, normalization and second/fourth
moments. This repairs a real analytic invariant instead of adding a nonphysical
distance cutoff or hiding the odd-order case by testing only even orders.

**Runner scope.** The first scientific launch failed before writing any state:
a top-level Julia loop assigned the global state through ambiguous soft scope.
Wrapping the entrypoint in`main(args)` gives the state a well-defined local scope.
An actual one-step CLI regression now exercises that path, rejects a reused result
directory and rejects an invalid variance. A subsequent conditional-macro parse
error was caught by the same CLI regression and removed. Failed source/log
snapshots are retained; no failed launch is counted as a numerical experiment.

**Resource accounting.** The original wrapper measured only its immediate child,
which correctly measured the direct Julia pilots but missed Julia when launched
through a Python test parent. The corrected wrapper sums VmRSS over the complete
child process group and kills that group on a declared wall/RSS limit. A regression
launches a grandchild allocating64MiB under a40MiB cap. The final CLI test measures
545,918,976B for its actual process group. Earlier direct-child numbers are not
retroactively described as complete CLI/scheduler memory measurements.

An initial command also failed before Julia because`/usr/bin/time` is absent in
the VM. The stdlib watchdog replaces that unavailable measurement utility. All
launch failures and the original ill-conditioned test fixture remain preserved.

**Export size and path boundaries.** Explicit three-dimensional quadrature arrays
make a q96 metadata file about140MB; repeated plain JSON would exceed the frozen
campaign's200MiB output allowance. New cases retain every point and weight in
lossless deterministic`metadata.json.gz`, with a separate checksum of the
decompressed JSON. This changes storage only, rather than dropping scientific
inputs. The actual CLI regression decompresses and checks that checksum, rejects
an old plain-format stale result, and ensures there is exactly one metadata
format. The case name now enforces an identifier grammar before constructing its
path: previously`../escape` could leave the intended results directory. A real
CLI traversal regression verifies rejection before an outside artifact appears.

The single-case campaign runner verifies the frozen plan and every source hash
before dynamics. It preserves actual histories and failures, copies the exact
plan/source, verifies successful payload membership and complete step times,
then fsyncs all files and the directory and writes an exact raw-file manifest.
Plan/source/stale-case regressions exercise refusal boundaries. Solver memory
and elapsed time are counted separately from independent diagnostic budgets.

## Exact current-source checks and transfer evidence

Execution uses an explicitly copied Apple safe-dev stage
`/tmp/mass-spinner-structure-v14`, guest`safe-dev-90caa378e3d1fd53`. Julia1.13.3 is
downloaded and SHA256-verified inside the VM, outside the copied project, with
one Julia/OpenBLAS thread. Host operations edit/copy/read/hash reviewed files only.
Valuable results are exported and actual host hashes checked before every reset.

Current checks, all inside that VM:

```
env JULIA_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 /work/home/structure-runtime-v14/julia-1.13.3/bin/julia test_core.jl
python3 -m unittest test_campaign.py test_bounded.py
python3 bounded.py entrypoint-tests 120 1024 env JULIA_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 python3 test_cli.py /work/home/structure-runtime-v14/julia-1.13.3/bin/julia
```

All46 Julia assertions, four watchdog and four frozen-plan regressions, and the actual CLI/stale/invalid/gzip/traversal
checks pass. Current hashes:

```
core.jl      e13928023f6b3e376f92ae74502994307b6e0f19de5f15475cfc23771a18e005
run.jl       ba5807f8454caa6d9c9f674428a7b71f158ad33a7abc3d97e5c1241502857f3a
campaign.py  ba7f8f42a9d4901b3ed70e8ddcc8b31d071937379ae3a87275039f44d70c0f4c
bounded.py   f4554d3c477ce621283080376d0e14956e0c332b79c1f7997622f212401b63c7
test_core.jl c36f08b7ab4af77ffd0e513b73dd28d659fbb11c9ddf71de78de75474e9c3028
```

The latest core/guard qualification and q48 pilot export is
`/tmp/mass-spinner-structure-v14-pilot-q48-accepted-export`; every record in
`pilot-q48-sha256.txt` passes actual host SHA256 verification. The final CLI
export is`/tmp/mass-spinner-structure-v14-identifier-cli-export`, also checked
against its actual host SHA256 manifest. The q12 and q32
accepted exports and their own checked manifests remain separately preserved.
The expanded GH2/3/4/5/6/8 rules, including pre-parity eigensolver values, are in
the q32 export's`rules.json`. The adapter/runtime/qualification scripts total407
non-test lines; the unchanged upstream core is a separate303-line review slice.
The107-line campaign runner and frozen configuration form a further reviewable
increment. Local executable non-test code totals514 lines before the separately
attributed upstream core.

## Frozen campaign execution

The prospectively frozen plan SHA256 is
`0f6a2fe6b9aa381d09c5e2279da502ccf3e0596dc7881a9a5b33adb205043073`.
The baseline began2026-11-07T07:28:25UTC. Its unchanged600-second wall cap
stopped the solver at600.034765108seconds, with peak process-group
RSS461,201,408bytes. Ninety actual states (initial through step89,445us) were
flushed and preserved. The declared100-step500us history is incomplete and
cannot pass a full-horizon gate. The raw case was sealed/fsynced, exported, and
every actual host file checksum verified; its trusted manifest SHA256 is
`2101782b7137c7b081f546e562eb2e4de838df2d24a1f3ef7d71e52974e22ba6`.
This resource failure is retained without rerunning a longer-cap replacement.

The four declared initial-rate controls all completed and were exported with
their own checked13-file seals. Their actual elapsed seconds are8.163770921
(baseline),19.362914926(fine-n6),15.525767883(alpha.125), and
45.741144105(alpha.0625). The q32 operator control also completed in
40.387207435seconds. The remaining controls and independent physical diagnostics
are evaluated against the unchanged plan, separately from completed pipeline
and discrete-algebra tests.

The campaign closed2026-11-07T07:51:14.928858UTC after1368.139755seconds of
campaign wall time and1234.462076196seconds of actual solver time. Eight of13
declared cases executed: seven completed, with the partial baseline recorded as
a resource failure. The q64 operator control completed20steps in386.758179970
seconds, and the10us timestep control completed10steps in118.488325848seconds.
Remaining solver allowance265.537923804seconds cannot cover even the smallest
remaining declared300-second case cap. Therefore`coarse-n3`,`fine-n6`,
`dt2p5us`,`variance-alpha125`, and`variance-alpha0625` remain explicitly
`UNRUN_UNKNOWN`; their caps and horizons were not reduced after observing cost.
Actual sealed case files total34,982,364bytes, including all quadrature inputs.

`campaign-status.json` records every actual resource result, source and raw-file
checksum, partial horizon and unrun reason. The final export is
`/tmp/mass-spinner-structure-v14-campaign-final-export`; its complete
`final-transfer.sha256` passes actual host verification. Its SHA256 is
`dad29a5f1ef659333689713302db18c49db42adebfb0cdd8e496116b6f466a43`.

Independent rate analysis rederives endpoint temperatures directly from the raw
velocities and reports light-ion slopes16900.18065,16585.57847,24480.56923,
and17306.15378eV/s for the baseline, finer-marker, alpha.125 and alpha.0625
controls. All fail the unchanged2% physical reference gate against
27982.16330eV/s (errors39.60%,40.73%,12.51%,38.15%). Continuum smoothing bias
explains part of the difference but does not remove particle/quadrature error.
The heavy-ion initial KDE shape lower bounds also worsen under fixed-marker
variance reduction. These results are not physical Landau convergence, despite
the positive representation and successful discrete conservation identities.
Independent full-space entropy/distribution decisions are reported separately
in the gate audit; no deployed backend replacement is made.
