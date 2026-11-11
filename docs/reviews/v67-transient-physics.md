# v67 independent transient comparison review

Prospective method, 10 November 2026. This agent authors the analyzer and its
regressions; parent alone synchronizes and executes project code in safe-dev.
No v66 or production code was edited by this agent.

## Why another study is needed

The v66 accepted coupled conservation/entropy audit covers every accepted step,
but its refinement errors compare only the 1 ms endpoint. A late endpoint can
agree after a startup boundary layer has decayed. Conservation is necessary
and does not establish temporal or spatial approximation accuracy.

The new analyzer therefore compares all coarse accepted endpoints with actual
fine accepted endpoints. It permits binary64 accumulation roundoff, never time
interpolation. It includes t=0 for profile errors and reports how many fine-only
accepted times were not compared. Those unmatched fine times are not qualified
by the shared-time comparison. The separate v66 all-step audit remains required.

## Independent canonical restrictions

Species inventories are normalized probabilities, not kg. Initial and evolving
temperature use `N_i=N[x*p_light,i+(1−x)*p_heavy,i]` and
`T_i=U_i/(1.5*kB*N_i)`. Assuming `N/n` when inventories are nonuniform would
compare the wrong temperature.

For radial refinement, restrict fine species inventory and gas internal energy
conservatively by overlap in q=r², then reconstruct coarse-bin temperature.
Restrict angular speed as `sum(L_partial)/sum(I_partial)`; for fine-cell mass M
and an overlap [a,b] in q, `I_partial=M*(b²−a²)/(2*Deltaq_fine)`. This accounts
for the angular inertia of the overlapping annulus. It is distinct from v66's
point interpolation at q centers, so the numerical error values need not match
the historical v66 endpoint norm. Initial spatial representation error remains
included instead of being subtracted away.

Restrict solid energy and mass by q overlap, verify the projected mass equals
the comparison cell's physical mass, then independently invert tungsten H(T).
Direct temperature interpolation would neither preserve enthalpy nor correctly
handle temperature-dependent heat capacity.

## Prospective primary and secondary criteria

Explicit comparison pairs identify coarse/fine cases and exactly one refined
axis. Every listed pair is required; extra retained cases are reported as
unpaired diagnostics. Source and prediction SHA256s bind exact inputs. Reject
incomplete/failed trajectories, duplicate identities/pairs, stale shear scheme,
time-grid mismatch, non-refinement or changes to unlisted physical inputs.
Conductivity fields and electrode coverage are checked on their physical cells.

Primary gates follow the parent-frozen protocol: whole-history Ω difference
over fine initial peak ≤0.5% in time and 2% in space; gas and solid temperature
difference over their respective entire-trajectory maximum excursions ≤1% in
time and 2% in space; species CDF difference ≤0.005. Raw errors and worst times
and cells accompany the normalized results.

Wall exchange has three different observables. Endpoint constitutive power is
`Q_step/dt_step`; interval-average power compares that coarse interval with the
sum of fine-step exchanged energies over the same interval. Both use the maximum
absolute accepted endpoint power across both complete histories as natural
scale. Cumulative signed heat error uses the larger trajectory total variation
`sum(abs(Q_step))`, avoiding cancellation in the denominator. Limits are 1% in
time and 2% in space. Exactly zero scales require exactly zero error; no positive
floor is introduced.

Global excursion norms can conceal early local relative errors. Gas therefore
has additional ungated per-cell causal-excursion diagnostics. Liner additionally
has secondary per-cell causal relative gates of 1% in time/2% in space and an
absolute 0.05 K error gate. A causal excursion is the maximum local reference
change up to that time, including intervening accepted fine states. Signals
below an explicitly reported 64-epsilon temperature-subtraction allowance are
labelled `unresolvedrelative`; they do not become relative passes. Resolved
relative tests, unresolved counts, errors above/below the roundoff allowance
and the absolute test remain separate. Thus primary global gates passing does
not claim full local causal accuracy.

## Execution and approval status

Authored `scientific/transient-v67/analyze.py` and eleven regression methods in
`test_analysis.py`, including stale data, incomplete histories, mismatched time
grids, canonical nonuniform inventories, conservative mappings, hidden early
failure with matching final endpoints, and distinct endpoint/interval power.
At authoring time these files have not been executed by this agent. Parent must
retain first scores and all failures before refining or drawing conclusions.
No device calibration, live promotion or unrestricted operating-envelope
accuracy follows from these numerical comparisons.

## First retained raw startup witness

Read-only inspection of the accepted v66 final-volume export independently
identifies the first-interval time error. At n64, the 32-step run's first
endpoint gas-wall power is −8.9703886 W. The 64-step run's first two powers are
−9.3747661 W and −8.9190458 W; their average over that same 31.25 μs interval
is −9.1469059 W. The interval-average difference is 0.1765173 W, or 1.883% of
the natural 9.3747661 W peak. This exceeds the prospective 1% time gate.

At the shared endpoint, outer gas temperatures differ only by about 0.5192 K
(1109.3555 versus 1109.8747 K), and first liner temperatures differ by about
3.9048e−6 K (1199.99988897 versus 1199.99988507 K). Small absolute liner error
can still be appreciable relative to its small early thermal response.
Both trajectories conserve their own accepted BE heat exactly: conservation
does not remove the error from approximating a changing boundary power over a
finite interval. Endpoint power and interval-average power must remain distinct.

This is evidence for startup time-discretization error in the observed heat
exchange, not a demonstrated defect in the physical accommodation/conduction
law. Independently, sourced κ and gas volumetric heat capacity give an outer
cell diffusion time of order microseconds, shorter than uniform64's 15.625 μs
step. That scale estimate is an inference; actual refinement and shared-time
traces must determine how much it contributes. Uniform refinement and nested
quadratic early steps can test the hypothesis while preserving the same
conservative BE equations and frozen acceptance limits.

## Interim parent-reported refinement, pending raw export inspection

Parent reports all eleven new analyzer regressions plus the five existing
electrical analyzer regressions passing on its `d94cd4` snapshot, and twenty
actual FiPy electrical cases passing 652 gates. These statements have not yet
been independently checked against exported artifacts by this reviewer.

For the n32 uniform128→256 time pair, parent reports all seven primary
shared-time history gates passing:

| Observable | Reported relative difference |
| --- | ---: |
| Ω / fine initial peak | 0.025011% |
| Gas T / trajectory excursion | 0.199812% |
| Liner T / trajectory excursion | 0.288089% |
| Species CDF | 8.702e−6 |
| Cumulative wall heat | 0.103611% |
| Endpoint wall power | 0.173464% |
| Interval-average wall power | 0.678159% |

The preceding 64→128 interval-power difference is still 1.14818%, above its
1% gate; a passing finer pair does not erase it. Successive-grid differences
are not continuum error bounds or experimental validation.

Local causal diagnostics remain separate. A reported 30.08% gas error arises
on a 0.051 K local reference excursion near 70 μs: about 0.01535 K absolute.
This is a real resolved local-response limitation even though the global
trajectory norm passes. A reported 114.9% liner ratio uses an excursion of only
4.3e−10 K, several times the conservative subtraction allowance; retain raw K,
the allowance and their ratio rather than dismissing the signal as noise or
interpreting it as 114% uncertainty in the absolute 1200 K wall temperature.

Only shared accepted times and the stated input pair are covered. Fine-only
accepted times, local first-order response accuracy, joint radial/axial/liner
convergence and device fidelity remain unqualified. Parent is retaining the
wall/axial/quadratic-time sweeps before judging those limits; no live promotion
is warranted by these provisional results.

## Export inspection and declared-scale arithmetic correction

Independently verified all 28 payload SHA256s in the retained `review-1`
manifest. The time packet has SHA256
`7a90b49430b2eddf84e9244d8c117a9e4d1ba0244f4d6d62b5fccee01715fbdf`,
matching its analyzer and audit links; its three trajectories contain 448
accepted steps, all independently audited, with nine rejected controls. Its
128→256 global-norm values match the interim table. The spatial packet has
SHA256 `0b77555d37a70fd489a62714abe483d8e200cf01f63b81b8b42de79a4bbaa868`;
all nine trajectories complete, totalling 1280 accepted steps. All seven
configured spatial/quadratic comparisons pass their 49 primary gates. The
original spatial conservation audit stopped on the following metadata issue,
so a fresh complete audit is required before conservation approval.

The declared dynamic scale includes `abs(sum(U_new)−sum(U_old))`. Production
uses sequential JavaScript addition; the independent checker uses `math.fsum`.
For large stored solid enthalpies, those valid reductions can differ by a few
ULPs. Subtracting old from new exposes that tiny difference relative to the
small exchanged energy. In the retained w64 trajectory at accepted step 105,
the declared versus reconstructed scale differs by `1.4551920e−11 J` on a
`0.0144458451 J` dynamic scale: `1.00734e−9` relatively, barely above the
relative-only metadata comparison. In simple terms, subtracting two large
wall-energy totals retains their last-bit summation difference; it does not
show that heat or angular momentum disappeared.

The smallest correction is confined to that metadata comparison. For n
stored values and `eps=2^-52`, let
`gamma_(n−1)=(n−1)*eps/(1−(n−1)*eps)`. Sequential summation differs from exact
summation by at most `gamma*sum(abs(U))`, while correctly rounded fsum adds at
most `eps*sum(abs(U))`, using eps conservatively for unit roundoff. Bound both
old/new reductions, both final subtractions and the two at-most-eight-term
nonnegative outer scale sums. Absolute value is nonexpansive, so it introduces
no extra amplification. The checker now reports the resulting
`declaredDynamicScaleArithmeticAllowanceJ` and subtracts it only from the
declared-scale comparison error before the unchanged relative gate.

The actual dynamic scale remains the expected dynamic energy, not the large
background enthalpy. Physical conservation, entropy, their tolerances and
stored-energy allowances are unchanged; nothing is deposited as heat.
This is preferable to changing production summation merely to match an auditor,
loosening a physical convergence gate, or replacing the dynamic denominator
with wall background energy. Two new regressions construct the cancellation
failure and demonstrate that a fabricated `100*scale+1 J` is still rejected.
Parent alone must execute them and rerun the complete retained spatial audit.

The finest uniform wall 64→128 secondary diagnostic is especially instructive:
its point-estimate local ratio is 37.44%, but raw error is only
`3.32e−11 K`, reference excursion `8.87e−11 K`, and the explicit subtraction
allowance `6.82e−11 K`. The error is below that allowance and the signal is
only 1.3 times it. This cannot demonstrate a 37% physical wall-temperature error.
Detecting a nonzero signal and resolving a 2% relative-error criterion are
different precision requirements. Keep these local ratios as unqualified
point diagnostics; a future rigorous secondary classification should propagate
rounding intervals into numerator and denominator without turning uncertainty
into a pass. The gas 30.08% diagnostic on 0.051 K is many orders above roundoff
and remains a robust local-response limitation.

## Graded-wall representability correction and final audit inspection

Verified all seven `graded-1` payload hashes. Four graded trajectories complete
640 steps; their three configured comparisons pass all 21 primary gates. The
first corrected audit nevertheless exposed a separate first-solid-row
floating-resolution omission at step 74 of `r32-z4-g32-t128-q`.

Actual first-cell old/new energies are 15.295859672679098 and
15.295859603007521 J. Its stored-energy subtraction allowance is
4.34734e−13 J. Accepted neighboring solid temperatures are
1199.99894318317 and 1199.9989559802161 K across a near-wall graded shell of
about 1 μm. Here `dt*G` is several J/K, so one temperature ULP near 1200 K
changes inferred face heat by order 10−12 J. The local residual of
5.5420e−13 J exceeds the old storage-only row criterion, even though it is
below this face-temperature resolution. Production itself reports a maximum
row residual of 8.2434e−13 J, so this is not merely Python versus JavaScript
recomputation disagreement: the accepted floating-temperature state has a
nonzero, representability-limited row residual.

The new allowance is derived per conductive face, separately from stored U:

```
dT_l = ulp(T_l), dT_r = ulp(T_r)
eta = dT_l/T_l + dT_r/T_r
A_temperature = dt*G*(dT_l+dT_r)
A_kappa = abs(Q)*eta/(1−eta)
A_face = A_temperature + A_kappa
         + gamma_3*(abs(Q)+A_temperature+A_kappa)
A_row = sum(A_face of incident faces)
```

This assesses one adjacent representable temperature per endpoint; it is not a
fitted multiplier. The restricted neutral laws and tungsten fit satisfy
`abs(T*kappa'/kappa)≤1`; positive series resistances do not amplify those
relative changes. The conductivity term propagates that conditional variation.
`gamma_3=3*eps/(1−3*eps)` accounts for the flux arithmetic. A zero-conductance
face has zero allowance. The checker exports face and row allowances
separately; its relative dynamic 1e−9 and stored-energy allowances remain
unchanged. No residual is turned into physical heat. This is a per-row
floating-resolution test, not proof that one jointly perturbed temperature
vector exactly solves every nonlinear equation, nor a physical material
uncertainty estimate.

The regression embeds the actual retained step's temperatures, energies,
geometry, timestep and heat. It reproduces rejection by the storage-only
criterion and acceptance with the derived face bound. A separate injected
physical-heat regression still rejects. The old failed receipt is preserved.

Independently inspected and hash-verified all nine initially exported
`final-accepted` payloads. The corrected audit now accepts all 640 graded steps
and all 1280 steps of the separate uniform-wall/axial/quadratic sweep; each audit
also rejects all nine corruption controls. Their input digests match the raw
packets previously verified. The largest graded face/row arithmetic allowance
is explicitly recorded rather than hidden in background energy. All 1227
application tests pass; exported typecheck, build, site and asset receipts
also have exit code zero. The initial exported scientific test log records 26
tests and remains unchanged. The dedicated final 28-test log and source receipt
are now retained and independently verified in `qualification-evidence`.

Scoped physical conclusion is unchanged: numerical shared-time global norms
and all-step balances are supported for these tested conditional cases. Local
early-response relative accuracy, fine-only accepted times, fully joint
multiaxis qualification, experimental calibration and live promotion remain
outside this acceptance. Large local ratios based on near-ULP temperature
excursions remain explicitly unqualified; they are not grounds to modify the
physical conductivity or heat-transfer closure without independent evidence.

## Final evidence seal

Independently verified all 138 qualification-evidence payload hashes; its
manifest SHA256 is
`4d2def3dc1916eaaf249d1afe00ddb9fbe0b5bd3d8f44f43bfb3a96cf9835271`.
The dedicated final scientific stderr log reports 28 tests passed, zero failed.
Its receipt and the complete 640-step graded-audit receipt identify the final
727-input snapshot
`21ebe6218510aca9f80eb80232fdd287e44e3dcb3a6a507fb382ea250b94bb65`,
with source verified before and after isolated execution. Canonical manifest
hashing independently reproduces that digest. All 725 available host inputs
match; the two explicitly documented historical guest-only runners remain
absent from the host.

Comparing the final application gate's input manifest with this final scientific
manifest finds exactly two changed files: the independent coupled checker and
its regression tests. Application/build inputs are unchanged, so the retained
1227-test/typecheck/build/site/assets results apply to that same application.
The earlier 26-test log has not been relabeled 28. The final 640/1280-step audit
outputs are hash-linked to the actual raw accepted packets and retain the
separate arithmetic/representability allowances and nine rejected controls.

Read the completed `docs/TRANSIENT-REFINEMENT-V67.md`; its distinction between
endpoint and shared-time norms, physical surfaces versus moving cell centers,
electrical mesh error, finite representability and calibration limits is
consistent with the checked evidence. No remaining blocker was identified for
delivery of this conditional numerical refinement and solver fix. Approval
does not extend to uniform local-relative accuracy, fine-only times, a fully
joint evolving-current continuum study, first-order experimental device
accuracy or live promotion. This reviewer performed source/data inspection and
read-only hash verification, not project/scientific execution.
