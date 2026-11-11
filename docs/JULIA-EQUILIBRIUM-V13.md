# Julia distribution-level equilibrium study v13

Status: the twelve-case ladder and a separately reviewed100us history are
executed, exported and host-hash verified. The independent audit completed
quadrature orders8/12/16/24 on all twelve short-study cases and independently
checked the completed10/100us checkpoint histories. Earlier resource failures
are preserved below.
This is a distribution study of a public development branch,
not production simulator validation or a positivity/entropy qualification.

## Problem and execution path

The v12 common-temperature test conserved moments but changed its distribution.
Two ion species at a common temperature and drift should be a collision equilibrium
in the continuum. Checking temperatures and total energy alone cannot establish
that numerical equilibrium, nonnegative probability density, or an H theorem.

The pinned branch samples analytic Maxwellians at tensor finite-element nodes,
computes Rosenbluth potentials, assembles a weak-form collision operator, applies
optional conserving operator corrections, then uses backward Euler with JFNK and
an optional end-step conserving projection. The finite-element interpolant and
its derivatives need not reproduce the analytic Maxwellian nullspace. Polynomial
interpolation and moment projections also provide no positivity guarantee.
In simple terms, getting a few averages right can hide an incorrect shape.

No upstream bug has yet been demonstrated. This study therefore preserves the
solver and separates representation, potentials, conservation projection, Newton
tolerance, time step, velocity domain, and initial discrete moments before choosing
a remedy. Clipping or subtracting the equilibrium residual would change the
operator without establishing the desired physics.

Source: [pinned coupled driver](https://github.com/KineticsforTransport/FokkerPlanck.jl/blob/869e22dbbeda603caf99848c9d58052d9ec9d362/src/FokkerPlanck.jl#L322),
[moment corrections](https://github.com/KineticsforTransport/FokkerPlanck.jl/blob/869e22dbbeda603caf99848c9d58052d9ec9d362/src/fokker_planck_calculus.jl#L3846),
[end-step correction](https://github.com/KineticsforTransport/FokkerPlanck.jl/blob/869e22dbbeda603caf99848c9d58052d9ec9d362/src/fokker_planck_calculus.jl#L3962).
The upstream entropy diagnostic uses `log(abs(f)+1e-15)`; it does not establish
physical entropy for a signed distribution. This study never uses that extension
as physical H.

## Frozen physical case and evidence

Abstract 40u/84u ions, charge +e, density 5e17/m3 each, common nominal 6eV,
zero drift/fields, fixed Coulomb logarithm 12. Reference mass is 40u, speed
sqrt(20e/mref), time 1us; dimensionless masses [1,2.1] with common c0=n0=1.
Julia 1.13.3 and the v12 exact Manifest remain unchanged. All execution occurs
inside safe-dev VM `safe-dev-deee32e46dcef4df`, offline, with 4vCPU/4GiB cap.

The immutable [plan](../scientific/julia-equilibrium-v13/PLAN.md) declares all
distribution, refinement, invariant, and entropy metrics descriptive. A negative
node or reconstructed sample invalidates physical H, regardless of how little
mass it contains. Sampled positivity would still not prove global positivity.
No full-horizon qualification follows from this 1us study.

Pilot source hashes:

- `study.jl`: `428bbf97bcec148b0e18427283df8c078848c847a352f35595c4e60435e4a5a6`
- `PLAN.md`: `8b0055186b477bd6c9be6c70d0cfe44c5ccc8ec183fd907eb4ecd6729745b8bd`
- `run_study.py`: `651c8d0c1dc1baaf15f7b9305244a54dbd49440706ee5233a20b6d40736fe009`

The source and full initial/final distributions, raw/corrected operators,
analytic-potential control, mesh maps and weights, histories, and SI conversion
constants are preserved in [the package](../scientific/julia-equilibrium-v13/).
Before VM exit the launcher parsed every TOML, fsynced artifacts, and created a
SHA256 manifest; all nine pilot files were byte-verified on the host before sync.
The separate export is `/tmp/mass-spinner-julia-equilibrium-v13-pilot-20261106`.

## Executed pilot

The baseline is degree4, 20x10 elements, vparallel [-5,5], vperp [0,5], natural
boundaries, one backward-Euler step of 1us, nonlinear atol1e-12 and rtol0.

- Returned Newton success: true, 3 nonlinear/10 linear iterations.
- Diagnostic operator calls ON versus OFF: bitwise identical PDFs at both steps
  of a separate two-step twin, with identical flags and iteration/residual histories.
- Initial discrete temperatures: 6.000000683868359 and 6.000001772106319eV.
  Their tiny mismatch permits real exchange; the separate matched-initial case
  changes the PDF and is labeled accordingly.
- Final minimum nodal PDF: -4.549707202543362e-9, so physical H is invalid there.
- Weighted nodal L1 drift: [1.0065869736460519e-5,3.6219895661713104e-5].
- End-step correction weighted nodal L1:
  [1.8079774615849923e-14,8.651352674151911e-15].
- Initial raw collision L1: [1.756416305031707e-5,4.449419762653107e-5];
  analytic-Maxwellian-potential raw collision L1 remains
  [1.8425046719960712e-5,4.4446860644104236e-5]. Exact-potential evaluation
  alone therefore does not remove the residual at this resolution.

These are producer nodal-quadrature diagnostics, not continuous FE absolute norms.
The independent reconstruction audit reports the latter separately. The stored
solver residual maximum (~1.36e-11) is not the upstream Newton acceptance norm,
which is an RMS norm; a maximum greater than atol is not itself a failed solve.

Cold pilot wall42.688s and CPU42.104s include startup/JIT, exports, and the
instrumentation twin. Peak RSS1052236KiB exceeded the frozen1048576KiB resource
gate by3660KiB (~0.35%): **original resource gate FAIL**. No physics failure is
inferred from that memory limit. The original launcher consequently cannot run
its ladder. A separate prospectively reviewed [follow-up plan](../scientific/julia-equilibrium-v13/FOLLOWUP-PLAN.md)
retains the original result and imposes a hard1.5GiB RSS,60s/case,300s total
watchdog with causal controls first and larger grids last.

## Executed causal controls

All eleven follow-up configurations completed with every returned Newton flag
true. Total wall65.972s,CPU65.239s, sampled peakRSS1112288KiB; no1.5GiB/60s-case/
300s-total watchdog cutoff occurred. The first cold/JIT control cost26.94s inside
`run_case` (about38.25s around its whole invocation), while warm cases cost
0.52–7.53s. Forty-two full source/artifact hashes and every TOML were verified
on the host and copied byte-identically into the package before the next sync.
Export: `/tmp/mass-spinner-julia-equilibrium-v13-followup-20261106`.

The following are producer **weighted nodal** L1 drift diagnostics at1us in
dimensionless density units (initial density about1); independent continuous FE integrals
remain separate. Negative minima never become a positivity pass.

| Control | Ion40 drift | Ion84 drift | Minimum nodal PDF |
|---|---:|---:|---:|
| baseline degree4,20x10,R5 |1.007e-5|3.622e-5|-4.550e-9|
| raw operator, no end projection |1.007e-5|3.622e-5|-4.550e-9|
| raw operator, end projection only |1.007e-5|3.622e-5|-4.550e-9|
| atol1e-10 |1.007e-5|3.622e-5|-4.550e-9|
| atol1e-13 |1.007e-5|3.622e-5|-4.550e-9|
| dt0.5us x2 |1.079e-5|3.768e-5|-4.560e-9|
| dt0.25us x4 |1.122e-5|3.850e-5|-4.557e-9|
| discrete n=1,T=6eV initial moments |1.007e-5|3.622e-5|-4.550e-9|
| R4,16x8, same element width |1.007e-5|3.622e-5|-4.550e-9|
| coarse12x6,R5 |1.370e-4|3.896e-4|-1.993e-6|
| fine32x16,R5 |1.163e-6|4.210e-6|-1.202e-11|
| degree6,20x10,R5 |6.231e-8|1.075e-6|-2.645e-12|

The unchanged drift across tolerance, correction, domain, and matched-initial
controls argues against those being the leading cause in this bounded case.
Time-step refinement retains the defect. Spatial/p refinement reduces drift and
negative nodal amplitude substantially, supporting the representation/nullspace
explanation. Degree6 also changes nodes and collision quadrature, so that control
does not isolate polynomial order from quadrature. These trends establish neither
full spatial convergence nor positivity or equilibrium at a longer horizon.

## Independent reconstructed distributions

The independent reviewer reconstructs the actual tensor Lagrange polynomials from
saved node maps, including the first radial Radau element, and integrates with
the cylindrical Jacobian. The saved baseline shape is [81,41,2]. Producer and
independent moments agree to about1e-14 in density and1e-13eV in temperature.

Every saved initial node is positive, yet the actual heavy-species polynomial
has an exact-rational negative witness near(vparallel=0,vperp=1.9725), about
-4.8422e-7, through five positive radial nodal values on[1.5,2]. This certifies
the sign of the serialized polynomial at that point, not the continuum
Maxwellian or global properties of an untested field. Physical H is therefore
invalid **already in the initialized representation**.

The independent audit completed q8/12/16/24 on all twelve cases, with separate
baseline negative-region q24/32/48 checks. Those denser checks give initial
heavy-species negative-number fractions about1.57–1.66e-7 and negative-energy
fractions1.52–1.60e-6. The sign failure is robust, but the negative-part integrals
are not precision-converged; q8 undersamples the sign-changing tails, and even
q32→48 changes these small fractions by roughly4%. Reporting ranges avoids
false precision. Dynamics is not responsible for all the observed negativity.

Independent q16 continuous-FE heavy-species L1 drift divided by the fixed initial
number is2.92e-4(coarse),2.85e-5(baseline),3.18e-6(fine),8.05e-7(degree6).
These differ from the producer's weighted nodal quantities in the table above.
The independent causal comparisons support the same conclusions: higher spatial
resolution/order improves stationarity without restoring strict positivity;
tolerance, initial moments, domain and correction controls do not remove the
leading defect. Degree6 also changes interpolation nodes and collision quadrature.
See [the independent report](JULIA-EQUILIBRIUM-INDEPENDENT-V13.md) for current
test counts, exact-sign evidence, quadrature sensitivities and returned-BE residuals.

## Longer history and preserved resource cutoff

The first history plan ran a fresh10us case and a fresh100us case at dt1us.
All10 advances of the former and all72 retained advances of the latter returned
Newton success. The100us case exceeded its frozen60s limit and was killed;
**that resource gate FAIL is preserved**, and no100us endpoint exists from that
attempt. Its total wall109.492s and sampled peakRSS1079848KiB remained below
the300s-total/1.5GiB bounds. The cutoff demonstrates the nonzero-failure path of
the actual scientific wrapper; it is not a nonlinear convergence failure.

All59 artifacts passed host SHA verification, every TOML was complete, and the
regression log confirms3/3 watchdog tests passed. The retained partial history
contains success flags and moments through72us; full states exist at0/1/10us,
with the immediately previous PDF saved for independent residual checks. No
full72us distribution or100us checkpoint is inferred from those diagnostics.
Export: `/tmp/mass-spinner-julia-equilibrium-v13-history-20261106`.

At10us nodal minimum is-6.323e-8 with tiny moment changes. This further separates
conservation from shape/positivity. Physical H was already invalid at initialization.
The successful72 steps cost~60s warm, predicting~83s for100 and~125s with cold
startup/JIT. A separate [completion plan](../scientific/julia-equilibrium-v13/COMPLETION-PLAN.md)
therefore freezes a180s/case resource budget with the same1.5GiB/300s total
limits, unchanged physics, unique artifact names, and no further extensions if
it fails. This prospective resource review does not convert the earlier FAIL
into a pass or alter any physical qualification.

The separately frozen fresh100-step completion succeeded:100/100 Newton flags
true, its10us PDF bitwise identical to the earlier fresh10us run, wall92.983s,
CPU92.432s, sampled peakRSS1016088KiB, no cutoff. All71 source/artifact hashes
and all TOMLs were verified on the host before copying them byte-identically
into the package. The full0/1/10/100us states include previous_pdf at noninitial
checkpoints. Export: `/tmp/mass-spinner-julia-equilibrium-v13-complete-20261106`.

At100us producer weighted nodal L1 drift is[4.0597192351236045e-5,
3.1317295781455186e-4], minimum nodal PDF-2.7814579260583343e-8, and temperatures
[5.999994486438115,6.000007969539336]eV. Total normalized energy changes from
0.8999999496982274 to0.899999949698226. These demonstrate the distinction between
stable conserved moments and distribution stationarity. Selected snapshots cannot establish H
monotonicity between them, and no0.5ms qualification is claimed.

The independent100us audit reconstructs q24 L1 drift/initial number as
[3.21293e-5,2.46940e-4], compared with[7.64e-6,2.85e-5] at1us and[2.67e-5,1.54e-4]
at10us. Its100us heavy-species reconstructed minimum is about-1.56e-6 atq24
and-1.63e-6 atq48, much more negative than the nodal minimum. Negative-number
fractions atq32/48 are about1.16–1.18e-6; negative-energy fractions1.14–1.15e-5.
These are descriptive sensitivities rather than precision bounds. Exact sign
witnesses confirm negative serialized polynomials, and physical H remains invalid.
Independent dense moments agree to about1e-13, and the returned100us BE residual
maximum recomputed from previous_pdf/current/operator arrays is3.05904463e-11.
This checks the numerical trajectory without qualifying physical equilibrium.

## Remaining interpretation

Initial polynomial negativity and the bounded spatial sensitivity are
demonstrated independently. End-step projection is tiny and diagnostics are
bitwise nonperturbing in their tested twin. The controls support spatial
representation/derivative compatibility as a dominant cause of stationarity
error, without isolating every residual term. Conserving corrections still
serve their intended invariant purpose; small shape impact does not make them
unnecessary. No upstream or production operator fix is adopted, and no
interpolation clipping or equilibrium-residual subtraction is used.

## Launcher correction and regression

Review found that the new watchdog initially printed failure metadata but would
still exit0. Technically, a Python program returns0 unless its exit status is set;
in simple terms, automation would have reported a failed run as successful. The
small fix sets a nonzero exit after preserving logs/manifests for a child failure,
watchdog cutoff, or incomplete TOML. It leaves numerical evolution untouched.
This is preferable to raising before export, which could lose the diagnostic
evidence. The guest-only regression substitutes a synthetic child in a temporary
launcher copy and checks clean success, child exit7, and a short watchdog cutoff.
All three tests passed; the actual frozen scientific launcher remains unchanged.

## Exact verification and transfer boundary

Guest commands ran from the explicitly synchronized `v13-staging` directory
inside the existing dedicated v12 Julia VM; installed runtime/depot stayed
guest-only and were preserved outside the copied project during each sync.

```
python3 run_study.py pilot
python3 run_followup.py
python3 test_watchdog.py
python3 run_history.py
python3 run_history_complete.py
```

The first and third commands exited0; the causal follow-up exited0, with16/16
combined pilot/follow-up short-study advances successful; the first history
wrapper exited1 after its deliberate hard-wall cutoff; the separate completion
exited0 with100/100 successful advances. The instrumentation twin additionally
checks four successful advances. TOML parsing, fsync and SHA manifests ran before
VM exit; host file bytes were then checked against each manifest before reset.
The final package's71 manifest-listed files match the final export exactly.

The original v12 smoke source, Manifest, provenance, log, SI bridge/plan, probe
TOML and probe log remain byte-identical to the preserved pre-v13/v12 SI exports.
Sixty-five temporary host staging files were each compared byte-for-byte with
the retained canonical v13 file before removal; the temporary directory was
then removed. All unique source/results remain in the new package and exports.
No runtime/dependencies were exported to the host. The numerical/control slice
contains626 non-test lines and51 regression-test lines. Production application
build/typecheck/testing is a separate parent-owned gate, not rerun by this child.
