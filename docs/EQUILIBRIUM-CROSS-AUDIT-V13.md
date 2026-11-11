# Independent cross-audit of equilibrium studies, v13

This is a read-only source/requirements review by the separate particle-campaign
auditor while continuum studies are running. It does not rerun PETSc or Julia,
recompute their results, or certify unfinished output bundles. Host operations
were reading, source tracing and hashing; no host scientific code executed.
The root application's previously reported software gate is separate and was not
repeated. No producer/reviewer files were edited by this auditor.

## Findings requiring precise closeout

1. **Independent nonlinear-quadrature coverage is selected, not every-state.**
   PETSc producer `analyze.py` computes orders3/8/16/32 at every exported state.
   Reviewer `audit_case.py` checks polynomial positivity, exact-degree Gauss3
   moments and H+ at every state, but initially selected dense nonlinear checks
   at initial/final, the largest Gauss3 adjacent increase, and several physical
   times. A peak selected at Gauss3 need not be the Gauss32 peak. The parent
   accepted this finding and requested the independent reviewer additionally
   examine both endpoints of the producer's worst Gauss32 adjacent pair, with
   a regression for distinct/noninitial peak indices. Final claims should still
   distinguish all-state producer refined diagnostics from selected independent
   dense checks. Additional checks reuse existing fields, not new solves.

2. **Julia numerical witnesses and PETSc exact certificates have different scope.**
   At the inspected snapshot, Julia `witness.py` reconstructs actual element
   polynomials and saves explicit negative evaluations, coefficients, barycentric
   weights and slices, but uses binary64 arithmetic and `math.fsum`. Its report
   referred to "exact negative witnesses" without an exact arithmetic or rounding
   certificate in that path. These are reproducible numerical witnesses; PETSc's
   Fraction/Bernstein path is an exact certificate of the serialized polynomial.
   The parent notified the Julia reviewer: either add a cheap exact serialized-
   node sign check or qualify the wording. Neither path certifies the continuum
   solution or an entire untested history.

3. **Preserved pilot manifests are not current reviewer validation.**
   The inspected PETSc `results/review-manifest.json` names an earlier
   `audit_case.py` hash `1201850a21a8596012c4de3456b379af56f84e7fbdb0f6f92c9d9473d42929aa`;
   current source at the initial cross-audit was
   `f4fee0e150da30330b70247483610c90630d829ea0464f8711a790c7d0a5425f`.
   Preserving that pilot evidence is correct. Final updated reviewer tests and
   completed-case audits must have their own source/input/output manifest and
   transfer verification. A source review alone does not establish that the
   latest changed path ran successfully.

These findings were sent to the parent during execution. Their subsequent
resolution is recorded below; the original snapshot findings remain preserved.

## Source paths and mathematical checks

The coordination plan correctly separates PETSc common5eV and Julia common6eV,
particle empirical measures, software checks and physical acceptance. Its fixed
reference convention `sum integral f log(f/fstar)` is dimensionally consistent.
PETSc uses a shared velocity/density normalization, so its `sum integral F log F`
is physical H divided by n0 for fixed fstar=n0/v0 cubed. Initial summed normalized
number is the correct denominator for its per-particle H changes. Its old
relative-H budget remains a separate, reference-convention-dependent quantity.

Julia's distribution reviewer independently includes the n0/c0 cubed factor
inside the logarithm and the cylindrical measure. Its operator entropy production
includes the +1 density-production term for the raw nonconserving operator.
The currently validated study fixes n0=c0=1 and u0=0, so those prefactors agree
between distribution and operator diagnostics in the actual tested domain.
This check should not be extrapolated to arbitrary species normalization.

Both packages distinguish H+ or log-absolute extensions from physical H. A
negative reconstructed field makes physical H undefined irrespective of how
small its negative integrated mass is. Sampled absence of negativity is not a
global positivity certificate. Thus refined H+ can reject an underintegration-
only explanation for a proxy increase without establishing a physical-H increase.
No full H theorem or full equilibrium PASS follows from the current assertions.

PETSc Gauss3 exactly integrates affine-Q2 number, momentum, quadratic energy
and squared polynomial drift up to floating arithmetic: the cylindrical radial
factor raises the largest coordinate degree to five. It does not exactly
integrate absolute differences or F log F. The producer reconstructs identical
fields at refined diagnostic quadrature without changing collision quadrature.
Cross-mesh comparisons integrate on the union cell partition and compare both
raw initial/current discrepancies and evolution increments, avoiding attribution
of initialization projection error to temporal dynamics. These are appropriate
controls; two short mesh/time sensitivities cannot establish full0.5ms convergence.

PETSc exports native vectors and closures from the actual local field without
changing the physical Vec. Independent native-value membership checks are
explicitly weaker than a full topology/order proof; the exporter source trace,
tabulated-basis bridge, geometry checks and moment agreement provide additional
evidence. They should remain separate claims rather than be called a standalone
binary-to-topology proof.

Julia reviewer uses actual element bounds/maps including the first reflected
Gauss-Radau radial element. The saved initial PDF is checked against each case's
first state. Returned backward-Euler residuals are recomputed from arrays using
the actual `onEnd && onC` corrected-operator condition; stored Newton success
is separate from postprojection residual quality. The moment-matched initial
control is correctly labeled a different PDF. It cannot be assumed to remove
between-node negativity or balance the full discrete collision flux.

## Frozen identities checked on this pass

```
coordination plan  92c0c13d943864eae76ecccf11c37d32b830f47a01a88423d4f73084e2318624
PETSc plan         cc45ee538d0faa176c321ff7e9eb3d92b542a1b783cd96233278aba0b6a68531
PETSc analyze.py   00704c7e6393a899e5416cfe7ff711e48d5ccf7a424f6cbad5fccf0861a95a5e
PETSc field.py     f404868b7efaa7b041ce36141e0d03ae34fd108a793e46dfdc0054cd53e39432
PETSc compare.py   18b1b4aa10545179ceef9846e0b5eeb7a2acd5a652b0cdd7f9b49e3293e4f4c8
Julia plan         8b0055186b477bd6c9be6c70d0cfe44c5ccc8ec183fd907eb4ecd6729745b8bd
Julia study.jl     428bbf97bcec148b0e18427283df8c078848c847a352f35595c4e60435e4a5a6
Julia followup     d07a5942114a4bced099a9260f5305ce6ff8994c3ab090426dbfb31573244834
Julia audit.py     f2d82eb9de9a571b5eae756682eb76caf07ab324fb80161548dfaa32b24efc16
Julia diagnostics  468acb56f19222e8d31de4ca1cf663d220b6efad3b25176a80c3c1b9cbd557ea
```

The PETSc reviewer hard-coded plan identity matches the actual prospective plan.
Julia original study/plan identities match the producer metadata and independent
reviewer arguments. The separately prospectively authorized Julia resource
follow-up preserves the original failed1GiB gate; it does not convert that
failure into a pass. Incomplete resource-limited configurations remain unrun or
incomplete rather than successful numerical experiments.

No scientific acceptance recommendation is issued before completed bundles,
current-source tests, mandatory transfer hashes and final case membership are
verified. Current source review supports the diagnostic definitions and the
conservative UNKNOWN/undefined physical-H boundaries, subject to the three
closeout issues above.

## Follow-up source and accepted-draft review

The later Julia reviewer adds `exact_serialized_value` using
`Fraction.from_float` for every saved node, coefficient and query coordinate,
with exact Lagrange products/sums. Its output retains numerator, denominator,
sign and a scope statement. The radial slice at the actual parallel node z=0
has five positive original radial nodal values, yet its metadata records the
exact negative sign at r=1.9725, value approximately -4.8421987e-7. The metadata
input hash matches the baseline initial field; `radial_slice.py` source hash
`aeaf4818522d7dc7afd23022cb9cb10b9e5d08772e3d0115d4acf7e5fc2763d5`
matches its saved metadata. The exact-sign regression is present in the current
16-test reviewer suite. This resolves the floating-versus-exact witness wording
issue for those explicit serialized-polynomial evaluations; numerical slice
curves and quadrature-integrated negative mass are still not exact bounds.

PETSc reviewer `selected_indices` now includes both endpoints of the largest
Gauss3 and producer-Gauss32 adjacent increments, both series' maximum cumulative
values, initial/final and the designated physical times. The distinct-peak
regression requires peak indices2 and5 and their predecessor endpoints. The
current 17-test log records that regression passing. Current `audit_case.py`
hash `4a8f7762c2ab64ddb4f4d685a0b1da8b03e9f1a5f2b1b00651e9f22d5064b559`
and test source hash
`f79fab25049ee90db647ef1cbd66dbbd8498fee7eba17d5963d574ff691321ef`
match their entries in the refreshed reviewer manifest. That manifest hash is
`d574c2fda83808e9e18c60c02f4403b575e81d01c3c017ef205ecf3bceac765d`.
Thus the observed earlier pilot-source mismatch is resolved for this current
reviewer/test snapshot. This cross-auditor checked those source/log identities;
the producer/reviewer own the complete bundle-transfer verification.

The dense-selection fix closes the missing-predecessor/other-peak gap while
retaining the intended scope: all-state independent positivity/moments/Gauss3,
selected independent dense nonlinear checks, producer every-state Gauss32.
It does not become an independent every-state Gauss32 recomputation.

The integrated `docs/EQUILIBRIUM-CONVERGENCE-V13.md` draft was compared with the
accepted twelve-case Julia/q24/100us reports, exact slice metadata and frozen
particle results. Its quoted refinement table,16 short-study advances,100-step
history, long-horizon L1/negative-mass magnitudes, preserved resource failures,
and particle189/3/0 nominal versus175/17/0 paired counts agree with those sources.
One inference was sent to the parent for qualification: a finite timestep ladder
showing greater drift at smaller dt is consistent with reduced implicit damping,
but does not by itself establish convergence to the semidiscrete trajectory.

The draft's positive-field PETSc pilot interpretation correctly distinguishes
certified nonnegative serialized fields and empirically resolved physical-H
increases from the negative-field H+ case. Same-field H32-H16 agreement is
empirical resolution, not a rigorous quadrature-error bound. A generic backward-
Euler truncation explanation alone is insufficient when an exact implicit root
advances an H-dissipating semidiscrete operator and H is convex; however a stored
SNES residual norm alone does not bound entropy error at an inexact root.
The separate slope/solve-residual study and long-run bundles remain separate
evidence, not presumed accepted by this draft review.

## Final bounded report audit and remaining follow-up condition

The later integrated report now correctly qualifies the timestep inference.
The inspected report snapshot hashes were
`6f1bd38cbc28b07153a147771391b8e93c9157bf39ff7ffedb5cb6cb9e59790c`
for `EQUILIBRIUM-CONVERGENCE-V13.md` and
`b6269ebde79b57a1ddf9dbcd9de3b5df0e7bfa14662c69ee3b9998e441fd9b39`
for the PETSc producer report. No further factual discrepancy was identified
against the available stable Julia, particle and PETSc main summaries.

The independent PETSc main summary, hash
`6e74eb914904d99e78e36168040540649b545e7330941a0503f38f0c62ce18b3`,
records the five frozen cases with checkpoint/field counts101/202,21/42,21/42,
11/22 and41/82, totaling195/390. All unresolved certificate counts are zero.
The mesh16 case certifies all42 fields nonnegative; baseline/coarse/both temporal
variants have explicit negative witnesses somewhere in their saved histories.
This matches the integrated report's state-specific physical-H interpretation.

The producer's full-baseline L1 stationarity metric6.5585e-4 passes its1e-3
diagnostic budget while physical acceptance remains false. Its small negative
number fraction can pass1e-10 yet still invalidate physical H at signed states.
The resolved fine spatial increment difference4.217e-4 fails2e-4, whereas the
short-horizon timestep comparisons pass that comparison budget. Coarse nonlinear
quadrature failures correctly propagate UNKNOWN to unresolved comparison metrics;
the coarse species-1/index1 increment at100us is not promoted to a resolved FAIL.
These are distinct gates, not interchangeable evidence of full convergence.

The sealed producer `summary.json` still says
`fullHValidity: UNKNOWN pending independent certificate`. The updated producer
report explicitly identifies that string as historical producer-only evidence
and links the independent certificates which now resolve particular fields.
Preserving sealed bytes is appropriate. Readers must use the combined report
and independent result for current sign status; reference acceptance stays false.

The parent reports all1535 final producer transfer hashes and all112 Julia
independent-package hashes verified against actual authoritative bytes. This
cross-auditor inspected their manifests and source/report identities but did not
repeat either full hash sweep. The producer manifest itself hashes to
`66f7f5e03d6b8fdf81378e58d3c9b3e7ae5c3f9ac2d77296fe0afc019faff599`;
the final Julia independent manifest hashes to
`4a78754e647094ceb215d873c3e97a4f7a8ce587a0e7b786a335d9c1234c82da`.
The latter records current source,16 regression tests,twelve cases and completed
100-step history while retaining the interrupted72-step history separately.

At this bounded check, PETSc reviewer manifest
`c2c1f115579116ade80cc3c1ce6031907ebc6da6786706e887702232e9343530`
covers main audit outputs/current17-test evidence and the stable entropy
primitive `ab13de897332d05173c4529d4e13fd50dcf688708319cb3af7bf30fe5794e3b3`.
It does not yet cover the new `audit_slope.py` path, whose inspected hash is
`6f95190f73a366b1daa059734ab856190065bc8f265dcad7ae8b2572829d2e61`.
The remaining explicit condition is a completed independently checked cross-mesh,
slope and strict-solver-control bundle with its own current-source tests,
endpoint certificates and fresh manifest/transfer checks. The report's
"Independent endpoint certification is pending" wording remains appropriate
until that evidence arrives. No new solve or broad test rerun is requested.

The larger PETSc reviewer implementation is explicitly822 non-test lines and
proposes three dependent review slices247/379/196 rather than claiming that the
entire package already fits a single700-line PR. This is a reviewable split plan,
not proof that such PRs have been created or independently approved.

## Final follow-up evidence: prior closeout condition resolved

The final accepted reviewer bundle is
`/tmp/mass-spinner-petsc-equilibrium-review-v13-final-accepted-export`.
The parent independently verified all1548 manifest-listed records and compared
the canonical accepted results and report with that export. This cross-auditor
did not repeat the full sweep; it read the completed audit outputs, current
sources/test log and final manifest, and independently hashed those inspected
canonical files. Final reviewer manifest SHA256 is
`5dec0d4c150cbfc79e37ade21ac573a7a26132e320d52242cc4d0c3957aba565`.
It now covers `audit_slope.py`, `audit_control.py`, stable entropy code, all four
slope/strict-control audits, comparison evidence and current closeout tests.
The export's `accepted-results/` maps to canonical `results/`; final manifest
and closeout log are at export root and canonical `results/`, respectively.
Those deliberate layout differences were separately compared by the parent.

The current inspected source identities match the final manifest:

```
audit_slope.py    6f95190f73a366b1daa059734ab856190065bc8f265dcad7ae8b2572829d2e61
audit_control.py  ae8e53b25e5ff89a1babd865a0167dacd0abfe24998fe93f45e3c38da00c270a
entropy_increment.py ab13de897332d05173c4529d4e13fd50dcf688708319cb3af7bf30fe5794e3b3
test_diagnostics.py f79fab25049ee90db647ef1cbd66dbbd8498fee7eba17d5963d574ff691321ef
closeout-self-test.txt 25ce5a13c357163d5771a9fc6e76652ea1d085bc471bbfc9a43db44c8b4b4c16
```

The closeout log records17 tests passing in0.059s. All four one-step cases certify
both endpoint species polynomials nonnegative: sixteen fields in total. Their
independent stable H32 rates are approximately+.0342448,+.0400789,+.0376507 per
second for1,.1,.01us. These are finite-step signals, not a demonstrated continuous-
time limit. The matched strict solve reaches function norm2.10933e-15 with
`CONVERGED_FNORM_ABS`; its entropy increment differs from default by-9.65991e-16
per initial particle and its largest species PDF L1 difference is2.67765e-15.
Extra Newton accuracy does not remove the matched positive-H rise. This control
does not provide a rigorous residual-to-entropy bound for arbitrary states.

All eight independently integrated cross-mesh/species comparisons are durable.
They confirm both resolved fine-spatial budget failures and the unresolved coarse
heavy-species comparison. Thus the prior pending independent endpoint/control/
comparison condition is resolved. Removing the stale pending caveat from the
integrated report is justified by these accepted outputs and manifest coverage.
No further factual finding remains open in this bounded cross-audit.

Evidence-integrity acceptance does not change the numerical physics outcomes:
strict positivity fails for several represented fields, admissible positive-field
H rises persist, fine spatial refinement fails its budget, and full continuum
PDF/reference or separator validation remains unqualified. Selected independent
nonlinear rechecks retain their selected-state scope. No heavy rerun or production
operator change was performed by this cross-auditor.
