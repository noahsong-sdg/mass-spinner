# Actual implicit heating-rate timestep study v15

The frozen v14 rate cases each measured one 10ns endpoint increment. That
quantity mixes initial distribution, smoothing, operator quadrature, nonlinear
solve, and finite-time averaging. The existing artifacts alone could not identify
which part caused the failed continuum heating-rate gate. In ordinary terms,
we were comparing the slope over a short interval with a theoretical initial
slope while also changing the numerical representation of the distribution.

This study adds a separate diagnostic path at
`scientific/structure-timestep-v15`, preserving v14. Its `core.jl`, entropy,
full three-dimensional fixed quadrature, mobility, stable entropy increment,
Gonzalez discrete gradient and JFNK remain byte-identical to v14. The execution
path is `run_group.main → entropy/mobility initial derivative → advance →
discrete_gradient → entropy/entropy_increment → mobility → JFNK residual`.
No numerical kernel change is justified by the pilot reproduction.

The fix to the evidence gap is a controlled comparison: every actual implicit
timestep starts from the same exported initial velocities; the initial derivative
uses exactly that state's entropy gradient and mobility. Holding n/alpha fixed
while changing q isolates operator quadrature; holding q fixed while changing
dt isolates finite-time/solver effects. This is preferable to tuning a collision
prefactor, changing a tolerance invisibly, or replacing the evolved-state kernel
with an initial-state tensor shortcut because those would change the question.

`scientific/structure-timestep-v15/PLAN.md` is the prospective main plan, SHA256
`17b64bf6b75bb8b3a4e3e8f37a356b756eacc4d1ea8929db9230bd85853c2947`.
An independent agent reviewed and accepted it before main outcomes. It freezes
15 actual independent steps: seven dt values at q48 and four at q64 and q96,
all GH4 per species/axis, alpha.25, R6, residual tolerance1e-12. Every group is
limited to600s wall and1024MiB aggregate child-process-group RSS. The continuum
target27982.16330006834eV/s and2% gate remain unchanged.

The runner retains full initial/final velocities, initial gradient/mobility,
weights, masses, species, widths, scales, complete quadrature and source hashes.
It exposes predictor equality, correction norm, update norm, actual nonlinear
residual and entropy/energy/momentum residual contractions. The independent
Python analysis recomputes initial work and finite-step temperature rates with
exact rational arithmetic on serialized binary64 values. That quantifies rate
calculation roundoff for the saved endpoints; neither that calculation nor a
small residual by itself bounds the implicit solution error.

For normalized marker velocities, species number weight N_s, normalized mass
m_s, species bulk velocity u_s, and the actual initial mobility acceleration
a_i=dv_i/dtau, the derivative checked is

```
dT_s/dt = (10 m_s kappa / (3 N_s)) sum_i w_i (v_i-u_s) dot a_i.
```

The factor10 is twice the fixed5eV normalization. The smoothing contribution
5m_s epsilon_s is constant in this frozen-width collision step, so marker and
smooth temperatures have identical time derivatives. Endpoint rates use the
exact weighted thermal-energy difference, including bulk velocity subtraction.
The stable Julia calculation expands the increment as2v0 dot dv+|dv|^2 and
subtracts2u0 dot du+|du|^2. The rational check evaluates the same invariant from
the exact represented endpoint values, making cancellation error observable
without changing any simulation state.

The preliminary pilot reproduced the frozen 10ns light rate
16900.180652429157eV/s; the same-state infinitesimal derivative was
16899.59077870642eV/s. Its initial residual7.66825022716405e-8 exceeded
tolerance1e-12; five JFNK evaluations reduced it to1.2433030659076343e-15.
Thus predictor-only acceptance did not cause that rate discrepancy.
Pilot wall9.054758837s, peak process-group RSS490221568B. The pilot, its exact
source and an earlier entrypoint parsing failure are preserved separately under
`provenance`; neither is presented as a main-campaign outcome.

All execution uses an offline Apple safe-dev copied-source VM
`safe-dev-5f9be59cf6b354d0`. Julia1.13.3 was downloaded inside that VM from its
official archive and verified against SHA256
`9ceb053bee6dfb8189bd40afd6925de3a9b7ff8fac8d01a5fcdd84af171ddf03`.
Source checksums bind the actual snapshot; guest exports are host-hash checked
before source sync. There are no host project executions or credential mounts.

Final checks on the frozen snapshot: unchanged Julia core46 assertions,
runner7 assertions, and four Python test methods passed. Python regressions
cover exact arithmetic, common bulk translation, duplicate JSON keys, stale
plan, incomplete/duplicate histories, unconverged endpoints, omitted source
pins, and corrupted metadata checksum.

All15 frozen actual steps completed, with no watchdog failures or extra cases.
The exact-arithmetic analysis and campaign case-membership/resource checks passed.
The independently reviewed plan remains unchanged.

| q | Initial light slope eV/s | Actual10ns average | Actual0.625ns average | Solver wall seconds | Peak process-group RSS bytes |
| --- | --- | --- | --- | --- | --- |
|48|16899.590778706424|16900.180652429160|16899.627654249092|43.414954729|533266432|
|64|16900.529998708244|16901.120237290834|16900.566896905897|44.398388270|531177472|
|96|16900.641213949120|16901.231492648607|16900.678114710110|155.284305114|582672384|

At q48 the extra2.56us,0.64us and0.16us averages were17041.310435626106,
16936.767277499282 and16908.994486923835eV/s. The time sequence approaches
the derivative of the same discrete model. At10ns the offset is only about
0.00349%; at0.625ns it is about0.000218%. Extrapolating the two finest averages
linearly to zero dt gives16899.590781099007,16900.530000895760 and
16900.641216217950eV/s for q48/64/96, respectively, within2.4e-6eV/s of their
direct derivatives. This is an observed agreement, not a certified error bound.

Increasing q64→96 changes the initial derivative by0.111215240876eV/s, about
0.000658%. Thus neither this operator-quadrature change nor finite10ns averaging
explains the roughly39.6% continuum heating-rate deficit at this frozen n/alpha.
All15 continuum2% gates still FAIL. The inference is that initialization,
finite-marker Landau quadrature and smoothing need the joint particle/width
study; this timestep study alone cannot separate those remaining effects.
It does not qualify a new physical collision method or prove a continuum limit.

No endpoint was accepted unchanged from its Euler predictor. Actual residuals
were at most2.6949794372346516e-14 against tolerance1e-12. Maximum absolute
discrete entropy balance residual was7.129713486264677e-16. Across both species
and all steps, stable endpoint-rate arithmetic differed from exact represented
endpoint arithmetic by at most1.0913936421275139e-11eV/s; naive subtraction
of separately rounded temperatures differed by up to5.83099972573109e-6eV/s.
Neither arithmetic effect is material to the physical gate failure.

Total measured solver wall was243.097648113s. Raw endpoints and every retained
source/log/analysis/provenance artifact are bound by the77-member
`scientific/structure-timestep-v15/SHA256SUMS-artifacts`, external SHA256
`0083c3b09bf257b25dc360e4a390a49a81f859b1ce8c7233e06ab7274a3034a3`.
All77 member hashes passed on the Mac after export and after copying the accepted
results into the canonical folder. An exact membership diff also passed: no
unlisted or missing exported regular file, excluding only the manifest itself.
The earlier partial manifest covered current main files but omitted the retained
provenance trees; independent review rejected that incomplete seal. The final
seal explicitly includes both provenance trees and the earlier partial manifest.

Reproduce inside safe-dev using the source snapshot in `SHA256SUMS-source`:

```
python3 -m unittest -v test_analyze
JULIA_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 julia test_group.jl
JULIA_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 julia test_core.jl
```

The exact15 main commands, environment, resource limits, measured outcomes and
postprocessing commands are retained in `logs/*.json`; the full source and
case plan are sealed with the results. All Julia commands used the verified
guest runtime `/work/home/structure-runtime-v14/julia-1.13.3/bin/julia`.
The application build/typecheck belong to the parent integration gate; this
diagnostic addition changes no production application source.

Independent replay subsequently completed in a distinct safe-dev VM: all15 raw
slopes match; selected full Gonzalez equations at q48 largest/smallest dt and
q64/q96 smallest dt agree. Independently reconstructed q48/q96 initial finite-grid
gradients agree within7.56e-16/7.05e-15; selected equation residuals are1.206e-14
or smaller. Stable entropy increments agree within3.47e-17. The separate reviewer
runs12 passing regressions and retains558 sealed files; the parent verified all558
exported and canonical hashes. See the [independent audit](HEATING-RATE-AUDIT-V15.md)
for coverage, corrected reviewer species-entropy assumptions and exact identities.
These checks preserve all15 failed physical rate gates.
