# Independent hot-wall joint refinement review, v60

## Source trace and demonstrated gap in prior qualification

Reviewed the actual `simulateFuelOperation` → `advanceFuelMixtureThermal` /
`advanceFuelCoupledStep` → accepted checkpoints → `sampleFuelTransport` path,
the v58 and v59 studies and their tests. No project or scientific program was
executed on the host by this reviewer. VM execution is coordinated by the parent;
the observations below initially distinguish source/analytic reasoning from
subsequent executed receipts.

The v59 study fixes 64 gas cells and 16 solid cells, so its successful timestep
contraction does not establish gas spatial convergence. The earlier v58 campaign
samples a coarse piecewise-constant cell temperature at fine-grid representative
radii. That is a useful display-distance metric but is not a like-for-like
comparison of coarse finite-volume annulus averages against a refined solution.
The new joint study must compare conserved quantities over the same physical
volume before constructing temperature and pressure.

## Independent cross-grid comparison

For the equal-volume coordinate `y=r²/R²`, cell species probabilities and internal
energies are integrals over intervals `[i/n,(i+1)/n]`. Conservative overlap
projection of an integral `A_i` to target interval `J` is

```
A_J = sum_i A_i * length(J intersect I_i) / length(I_i)
N_J = Ntotal * (x * lightProbability_J + (1-x) * heavyProbability_J)
T_J = U_J / (1.5 kB N_J)
p_J = kB N_J T_J / volume_J
```

An arithmetic average of fine temperatures is correct only when particle counts
are equal, which is not true in the evolving pressure-driven mixture. Comparing
the outermost fine and coarse temperatures directly also compares different
physical annuli. Neither should be used to label a mesh converged.

The parent campaign can use the independently authored, production-independent
`scientific/hotwall-boundary-v60/metrics.ts`. Its tests explicitly include a
nonuniform-count control where arithmetic temperature averaging fails, signed
integrals, nested and nonnested meshes, conservation, uniform fields, and invalid
input domains. Rebinning the *fine reference to the coarse grid* is appropriate
for measuring the error in coarse cell averages. It does not imply the coarse
solution resolves pointwise structure within a coarse cell.

## Initial Fourier and boundary scales

The source-defined initial constant-inventory heat capacity per volume is
`Cv/V = 1.5 P/T`, giving `alpha = k/(1.5 P/T)`. For the live hot-wall example
`P=10 Pa`, `T=500 K`, `k=0.1 W/(m K)`, this is approximately `3.33 m²/s`.
At `R=0.12 m`, the outer cell width at 64 equal-volume cells is

```
dr_outer = R * (1 - sqrt(1 - 1/n)) ≈ 0.941 mm
```

The conventional diffusion penetration indicator `sqrt(alpha*t)` is approximately
0.577 mm at 0.1 microseconds, narrower than that cell. At the v59 first accepted
time of approximately 1.55 microseconds it is approximately 2.27 mm, only a few
outer cells. These are analytic initial Fourier indicators, not proofs of
accuracy for the moving mixture or a sharp finite propagation front.

The prescribed film conductance is only 0.1 W/K. With area `2πRL`, its h is about
0.166 W/(m² K) and the cylindrical gas Biot number is about 0.199. The film limits
the heat, so an unresolved layer can have a small absolute temperature error
relative to the 500 K wall/gas difference. Normalizing local error by the absolute
500 K gas temperature can therefore hide a large fraction of the *heating signal*.

The equal-volume Fourier flux is `Q=-4πLk y dT/dy`. The outer half-cell resistance
used by the source, `1/(8πLkn)`, is the corresponding linear-y half-cell value;
it must be placed in series with the film and solid half-cell resistances.
There is no source-level reason to remove that resistance to improve a comparison.
Doing so would change the represented Robin condition.

Linearizing the source-defined zero-rotation pressure-relaxation/enthalpy system
about uniform density n0 and temperature T0 gives an additional scope warning.
For `a=delta_n/n0`, `theta=delta_T/T0`,

```
dt [a,theta] = [[D,D],[2D/3,alpha+2D/3]] Laplacian [a,theta]
```

The two diffusion eigenvalues have sum `alpha+5D/3` and product `alpha*D`.
For the illustrative `D=0.02 m²/s`, the fast thermal eigenvalue is about
3.347 m²/s and the slow density/pressure eigenvalue about 0.01992 m²/s. Thus the
pure Fourier indicator is useful for the strong thermal mode, but a much thinner
weak density response can accompany the reflecting-species boundary. Its
`sqrt(D*t)` scale is only about 45 micrometers at 0.1 microseconds. Temperature,
integrated CDF and wall-heat qualification should not be advertised as resolving
every pointwise species feature. This linearization is analytic reasoning about
the reduced model, not an executed extra study or a Navier–Stokes result.

## Predeclared study requirements

The parent proposes 64/128/256 gas cells crossed with 512/2,048/8,192 nominal
intervals, retaining a coarser negative control and a still-finer reference.
This full cross-product is necessary: one diagonal sequence can hide cancellation
between space and time errors. Temporal refinement at fixed fine space and spatial
refinement at fixed fine time must also be shown. Wall mesh changes should be
isolated separately or demonstrated negligible for the gas conclusions.

At common physical times, including dense 0.1 microseconds–20 ms samples and the
historical late times, report independently:

- Maximum ion/neutral speed difference, retaining the existing 3% rotor gate.
- Common-annulus maximum absolute temperature difference, target 0.1 K.
- Common-annulus heating-signal relative error, target 5% when the reference
  temperature rise is at least 0.1 K. Report where this gate is inactive.
- Instantaneous wall-to-gas heat rate and cumulative transferred heat, target 1%.
- Pressure, species cumulative distributions, entropy, conservation and positivity.
- Actual accepted time brackets around each maximum-error observation.

These are numerical qualification targets for the demonstrated input set, not
experimental uncertainty bounds. Passing heat flux/total heat alone does not
prove the local layer is resolved. A coarse-volume temperature gate alone does
not prove pointwise wall temperature or a visual smooth surface is resolved.

The 8,192-interval rotor-timescale cap starts at roughly 0.0967 microseconds,
but the actual step is the minimum of this cap and the next quadratic target.
At 8,192 intervals, the first quadratic target is roughly 0.0149 microseconds;
the 0.1 microsecond sample therefore lies after more than one accepted step.
The parent correctly identified this distinction while reviewing the initial
audit. This is better early resolution than the cap alone suggests, but still
requires a reference self-check. A contraction comparison against an unqualified
finite reference is insufficient to certify live defaults.

## Independent continuum limit

The physics reviewer owns a separate SciPy cylindrical Robin eigenseries for an
initially cold, fixed-inventory gas against a thermostatted hot wall. This limit
can isolate Fourier/Robin spatial and temporal errors, including FV annulus
averages, without importing production conductances or integrators. Its numerical
spectral tail/root convergence must be checked separately. It does not validate
the full pressure-relaxation mixture, whose enthalpy transport and evolving
particle counts remain additional coupled equations.

## Executed initial evidence inspected

Inspected the actual `hotwall60-metrics.log` and receipt: all three projection
and scale regressions passed in the VM, with 623 inputs verified before/after,
SHA-256 `5be88f8cc24aef31dcc7b272636bb65883cfdadbace74970cb16cbf98bb3d004`.

The parent-executed `hotwall60-joint-pilot.log` / receipt also passed its
conservation/positivity execution requirements, with 623 inputs SHA-256
`294b2fb22d99cc653ec159ddce8bbcc535c02ef17db2f1db8ff92b78fc7735cf`.
Its actual accuracy results do **not** approve the live defaults:

- 64 gas / 16 wall / 512 nominal intervals differs from the pilot finite
  256 gas / 64 wall / 8,192 reference by a maximum common-annulus 0.96664 K
  at about 21.75 ms, failing the 0.1 K gate.
- Its maximum common-annulus heating-signal difference is 90.54% at about
  1.0145 microseconds, failing the 5% gate. The rotor gate still passes.
- The intermediate 128 gas / 32 wall / 2,048 case still differs by 0.19404 K
  and 29.82% of local heating, also failing both gates.

These are finite joint-reference differences and the pilot reference is not
yet independently continuum-qualified. They demonstrate a qualification gap
despite excellent conservation, not a proven absolute continuum error.

## Campaign audit corrections and practical refinement

The initial joint campaign called total gas energy gain a heat metric. That
includes slip, Ohmic and signed centrifugal redistribution work; it is not
cumulative wall heat. The correct closed-gas signed wall contribution follows
directly from the model's gas first law:

```
Q_wall_to_gas = U_gas - U_initial - E_slip - E_Ohmic - W_redistribution
```

The parent was asked to capture and compare this separately. Mechanical
backward-Euler loss must not be included as physical gas heat. The initial
wall-flux distance also divides by the initial 50 W load; that is a defensible
load-normalized metric but not instantaneous relative flux error. Its label and
accuracy claims must distinguish the two, especially near a vanishing late flux.

A source audit identifies a minimal performance fix needed to make the finer
reference practical: `advanceFuelMixtureThermal.evaluate` computes the same
`Math.max(...values,coolantK)` inside every row of its tolerance map. `values`
does not change during that evaluation. Hoisting the identical ordered maximum
once eliminates an O(n²) scan without changing tolerance, arithmetic result,
equations, iterations or accepted states. This is preferable to loosening solve
convergence or accepting a coarser reference. Before/after state-identity and
thermal regression evidence should establish behavior preservation; wall-clock
unit assertions would be brittle. No other obvious O(n²) loop was found in this
spatial gas path; bounded rotor-root iterations and tridiagonal solves are O(n)
per iteration. A similar maximum in the separate legacy thermal path is outside
this demonstrated requirement and should remain untouched.

## Initial status before final joint evidence

Source tracing, independent metric/test implementation and initial evidence
review are complete. Live defaults are **not boundary-layer qualified** by the
pilot. Full crossed refinement and continuum controls remain required before
approving any replacement. No tolerance has been altered in response to an
observed failure, and no production model or timestep code has been edited by
this reviewer.

## Independent raw-history analyzer

Authored `scientific/hotwall-boundary-v60/analyze-joint.py` independently of the
TypeScript projection utility and parent campaign's distance routine. It sums
nested fine-grid canonical arrays into the common coarse annuli with NumPy,
reconstructs temperature from particles and energy, and reports the exact time
and physical annulus of every maximum error. Input audits independently check
particle normalization, ideal-monatomic EOS, total gas energy and the prescribed
film/logarithmic-solid/linear-y-gas resistance formula. No production helper is
imported. Accuracy failures remain output findings; corrupt canonical inputs
cause an execution failure.

The analyzer separates signed cumulative wall heat and instantaneous relative
wall flux from total gas energy and initial-load-normalized flux. It explicitly
reports active relative-error sample counts; no measurable reference signal
produces a not-assessed/null gate, not an automatic accuracy pass. Identical
N/wall/time/horizon cases repeated in separate batches must have identical raw
samples. A disagreement cannot be hidden by silently choosing a preferred run.

The strengthened parent study adds a longer full-horizon reference and a separate
short early horizon using the same recorded physical observation times. The
analyzer groups these by horizon, reports their overlap disagreement, and can
build a **comparison-only composite** using actual early fine states through
2 ms and actual full-horizon states thereafter. It performs no interpolation or
state evolution when constructing that comparison. This composite is not a
single conserved simulated trajectory, and is not suitable as a playback or
continuation history. Temporal and spatial self-checks remain separately reported
for both windows. The stronger finite reference still does not establish an
absolute continuum error bound for the nonlinear mixture.

Five independent Python regressions are provided in
`tests/test_joint_reference_v60.py`: integral conservation/nonuniform-particle
temperature, masked maximum location, absent-signal behavior, and exact composite
sample substitution without modifying the original arrays. The fifth directly
guards the audit's normalization findings: a small absolute error can fail the
local heating-signal gate, and a small error relative to initial load can fail
the instantaneous flux gate. Parent-coordinated VM execution and receipt
inspection are required before final approval.

## Long-history diagnostic regression

The 32,768-step full reference completed its physical advancement but failed
while computing terminal maxima: expanding more than 100,000 balance values
into one `Math.max` exceeded the JavaScript engine's argument-list limit. This
is a diagnostic implementation failure, not evidence that the physics iteration
failed. A single loop now accumulates all three nonnegative maxima using fixed
argument counts, with the same finite/conservation gate afterward. It preserves
the mathematical result and removes temporary flattened arrays; reducing the
reference resolution or dropping accepted states would instead weaken this
study. Initial capture always supplies a checkpoint, and zero seeds preserve the
nonnegative residual maximum, including propagation of a nonfinite diagnostic.

I inspected the actual parent-controlled before/after receipts. The focused
two-cell, 32,768-step regression failed at the original terminal maximum with
`RangeError: Maximum call stack size exceeded`, then passed after the bounded
loop. The after run also passed all 12 selected history, continuation, transient,
entropy and conservative-projection tests. Receipts verify identical staged
sources before/after each command: before SHA
`fbfd625142e34e2fbf05c46995da4a900fd4e70dd19097694500ff6dd0b54f22`
(627 inputs, exit 1), after SHA
`de763c91bd6d19db45c6e9e2697b417f249d267e704618185820c8aa8482aa85`
(627 inputs, exit 0). These are diagnostic regression results, not a completed
512-cell reference qualification.

The separate resume-prefix `checkpoints.push(...prefix)` remains a possible
argument-list boundary for unusually large resumed/event histories. No such
failure was demonstrated in this campaign; arbitrary large resumed histories
are consequently outside the demonstrated scope, rather than silently claimed
qualified by this terminal fix.

## Closing independent assessment of the joint study

I inspected the saved raw-history manifest and final
`scientific/centrifuge-v44/boundary60/studies/refined/hotwall60-joint-result.json`,
along with the actual `hotwall60-reference32-fixed`, `hotwall60-joint-early`,
`hotwall60-joint-analysis` and `hotwall60-oracles-final` receipts/logs. All four
commands completed successfully against the same 627-input snapshot
`de763c91bd6d19db45c6e9e2697b417f249d267e704618185820c8aa8482aa85`,
verified before and after execution. The independent analyzer audited 19 unique
histories: 16 full-horizon cases and three early-window cases. All eight Python
reference/analysis regressions passed, including all five tests I authored.
These were parent-controlled offline VM executions; I did not execute project
or scientific code on the host or start a competing VM job.

The full reference is 512 gas cells, 128 solid cells and 32,768 nominal steps
(55,733 accepted steps). The comparison replaces its observations through 2 ms
with the actual same-time observations from the separately evolved 512/128,
16,384-step short-window run. The saved full-reference raw packet SHA is
`84ff2a92e11180153358b3df868c029942fff26750daf2f53c6d214d6359233a`;
the early reference raw packet SHA is
`d8011487552ed73494598b414329ed9035b168bc87a3b5ec441bf47d8173ad1c`.
The final JSON SHA recorded in the export manifest is
`8b5b62c3d07d6a21bd2792e7053e5b539536e15311a043e208e60ca16747d81b`.
The analyzer independently checks canonical inventories, U/N temperatures,
ideal-gas pressure, total U, wall-interface resistance and recorded accepted-state
conservation bounds. The full reference's residual maxima are below 7e-14, with
positive gas temperature and species inventories. This conservation result does
not substitute for the accuracy checks below.

| Gas/solid cells; nominal steps | Maximum common-annulus temperature error | Maximum resolved local-heating error | Result against finite composite |
| --- | ---: | ---: | --- |
| 64/16; 512 (live default) | 1.01528 K | 84.0226% | Fails local temperature, local heating and instantaneous wall flux |
| 64/16; 8,192 | 0.0486254 K | 13.2644% | Fails local heating |
| 64/16; 16,384 | 0.0253918 K | 9.16866% | Fails local heating |
| 128/32; 16,384 | 0.0209914 K | 5.36364% | Fails local heating |
| 256/64; 16,384 | 0.0186765 K | 4.68332% | Passes the specified finite-reference gates only |
| 512/128; 16,384 | 0.0178691 K | 4.20310% | Passes the specified finite-reference gates only |

For live defaults the temperature maximum is at 21.7520 ms in the innermost
annulus, while the local-heating maximum is at 0.749894 microseconds in annulus
60, r=0.116190–0.117154 m. These are distinct errors: a later temporal bias and
an early radially structured signal error. Instantaneous wall-flux error is
6.26712% at 48.6968 ms, exceeding the 1% gate; signed cumulative wall heat differs
by only 0.313257%, meeting its separate 1% gate. Ion and neutral speed maxima are
1.29828% and 0.922394%, meeting the pre-existing 3% gate. Thus a visually plausible
rotor, accurate cumulative heat and excellent conservation do not establish
resolved local thermal dynamics.

The crossed matrix diagnoses both numerical causes. Increasing gas/solid cells
64/16→256/64 while retaining 512 steps leaves maximum temperature error near
1.015 K and flux error near 6.267%: time resolution dominates those quantities.
At 16,384 steps, spatial refinement 64→128→256 reduces local-heating error
9.16866%→5.36364%→4.68332%: the coarse gas mesh also matters for the early layer.
Changing only solid cells 16→64 at fixed 64 gas cells and 8,192 steps changes
gas temperature by at most 4.44919e-6 K. The thin tungsten wall is not the cause
of this case's gas error; that result should not be generalized to thick walls,
other materials or arbitrary heat-transfer parameters.

The reference has useful but finite uncertainty. Full-horizon 512-cell temporal
refinement 16,384→32,768 changes local temperature by 0.0162281 K and resolved
heating by 2.30361%. Full 256→512 spatial refinement at 16,384 steps changes
temperature by 0.00144234 K and local heating by 0.333268%. In the independent
early window, temporal refinement 8,192→16,384 at 256 cells changes temperature
by 0.00120913 K and heating by 0.356516%; spatial refinement 256→512 at 16,384
changes temperature by 0.00132549 K and heating by 0.339365%. All these comparisons
meet the declared gates. Nevertheless the full 32,768-step run and short-window
reference differ by 0.00820129 K and 1.99958% at shared early observations. This
is why the actual short-window states were used, rather than assuming the longer
run's finest nominal timestep count resolved its startup automatically.

The output's three passing full comparisons include the 32,768-step full
reference compared with its own early-window replacement. They represent two
alternative passing full histories plus this reference-overlap check, not three
independently qualified alternatives. In particular 4.68332% is too close to a
5% threshold to infer a continuum error bound from a finite reference with
measurable remaining temporal uncertainty. The evidence supports a conditional
reference-comparison result and strong failure diagnosis, not a universal
accuracy certificate or a justified replacement of the live default by this
expensive offline setting.

**Conclusion:** the live defaults resolve the existing rotor gate for this case
but do not resolve the requested hot-wall local gas thermal response. The
comparison procedure, negative controls, independent continuum control,
refinement evidence and minimal diagnostic/performance fixes are acceptable
within their stated scope. The model's common species temperature, prescribed
conductivity/accommodation and sub-microsecond rarefaction limitations remain;
neither Fourier-PDE agreement nor a small species CDF error demonstrates fully
resolved pointwise kinetic/species boundary layers. Deployment and browser
verification are owned by the parent and are not certified by this numerical
review.
