# Why Mass Spinner uses this stack

Decision review: 7 November 2026 UTC. These choices are engineering judgments
supported by inspected methods, actual runnable packages and initial benchmarks.
They are not the outcome of a comprehensive speed/accuracy contest or proof that
one stack is optimal for every plasma separator.

## How the choice developed

The project began as a free, shareable teaching simulator, so the first
constraint was interactive browser execution and hardware visualization.
TypeScript workers, Three.js, Blender and the user-selected Cloudflare host
serve that product requirement. They were not selected through a scientific
solver comparison.

As collision convergence became the limiting scientific question, the next
decision was to add established independent references around the existing
model. The v11 source review considered kinetic/PIC, continuum and specialist
orbit/formulary codes. Actual installation and matched-case feasibility then
narrowed the immediate choices to SciML, WarpX, PlasmaPy and PETSc. The user's
request to use Julia directly informed the scientific workflow; Julia did not
automatically replace the browser runtime or supply a collision discretization.

This was an incremental selection with explicit evidence gates. The initial
review missed the relevant non-default Julia FokkerPlanck multispecies branch,
which is now being qualified. That is a real coverage limitation of the earlier
search, and a reason to keep the selection revisable.

## Selection criteria

1. Match the physical task: full orbits, mutual ion collisions and eventually
   spatial sources/collectors. A plasma label or programming language is not
   enough to establish the required operator.
2. Reproduce pinned versions, inputs, constants and results locally without a
   commercial license or hosted solver service.
3. Compare different numerical representations. Two implementations can share a
   mistake; independent adaptive ODE, particle and deterministic velocity-space
   methods provide stronger ways to diagnose disagreement.
4. Keep scientific reference work separate from the latency/resource budget of
   a freely shared browser application.
5. Limit custom solver code and disclose unavoidable adaptations. Prefer a small
   audited setup change to rewriting a mature collision kernel.

## Roles and tradeoffs

| Tool | Why selected | Main tradeoff | What would change the choice |
| --- | --- | --- | --- |
| Julia / SciML | Expressive scientific workflow and a high-accuracy adaptive ODE method independent of Boris | Julia startup/compilation and deployment are less convenient for a static browser app; an ODE solver does not supply a validated collision operator | A better-qualified matched kinetic package, or measured workload requirements favoring another method |
| Julia / FokkerPlanck.jl multispecies branch | Executed coupled nonlinear Rosenbluth solver and matched SI initial-rate bridge; candidate for finite-time comparisons | Development branch, incomplete docs and explicit conservation corrections; negative values and equilibrium-shape drift remain | Full-distribution equilibrium, correction-size and finite-time refinement studies establish its useful accuracy/cost range |
| WarpX | Runnable established particle code, published collision tests, CPU/GPU infrastructure and a path toward kinetic fields/transport | Particle noise and finite collision-cell effects remain; its default scattering law and cross-section cap differ from ours | Matched studies show unacceptable bias/cost or unavailable required boundary/field physics |
| PETSc Landau | Deterministic velocity-space discretization provides a different check on random-pair collisions; mature nonlinear/time-integration infrastructure | Velocity-domain/mesh/timestep errors and positivity must be measured; installed setup is electron-first and requires an audited ion-only adaptation | Adaptation cannot be qualified, or an equally reproducible multispecies Landau implementation offers lower integration risk |
| PlasmaPy | Independent SI units, physical conventions, formulary coefficients and regime checks | It does not evolve our mutual ion distribution; numerical edge cases need testing | A formula is unsupported or inaccurate in the required regime; then use another derived/qualified reference for that quantity |
| TypeScript worker | Existing shareable interactive model and controls; runs without a backend, isolates computation from UI | Large converged studies exceed interactive budgets; doubles alone do not ensure numerical accuracy | A validated faster kernel/WASM implementation is justified by measured latency or scale |
| Three.js / Blender | Interactive geometry plus editable polished hardware assets | GPU rendering and attractive hardware are independent of physics fidelity | Geometry/field workflows demand a CAD/mesh interchange pipeline; otherwise preserve working assets |
| Cloudflare static hosting | User-selected sharing target; publishes the browser and frozen evidence | Static hosting does not provide an unrestricted scientific batch backend | On-demand scientific jobs become a requirement with an explicit compute/authentication/budget design |

SciML documents Verner methods for high-accuracy nonstiff integration and orbit
computation. That supports the orbit-reference role, not a claim that Vern9 is
the best long-time Hamiltonian or stiff collision solver.
[Official method documentation](https://docs.sciml.ai/OrdinaryDiffEq/stable/explicit/Verner/)

PETSc documents a DMPlex/DMForest discretization of the Landau Fokker–Planck
operator, integrated with its time/nonlinear solvers. This motivates the
independent deterministic reference; it does not eliminate velocity-domain,
positivity or normalization checks.
[Official operator documentation](https://petsc.org/release/manualpages/LANDAU/)

## What execution changed about our assessment

The first round found useful agreements and real limitations: Julia interior
orbits pass the declared budget, formula checks agree in a qualified regime,
PlasmaPy has a retained extreme-cold quadrature failure, and collision equivalence
remains unestablished. PETSc's shipped species setup cannot simply be relabeled
as a two-ion reference. See [v11 executed evidence](EXTERNAL-REFERENCE-RESULTS-V11.md).

The v12 source audit also found that WarpX defaults to Bobylev cumulative angles,
while our production model uses Gaussian Takizuka–Abe angles. WarpX applies a
low-speed transport-cross-section cap even with a fixed Coulomb logarithm. These
are actual method/operator differences, so a disagreement is not automatically
an implementation bug or a consequence of JavaScript. Their contribution must
be measured with separate controls.
[Angle selection](https://warpx.readthedocs.io/en/26.10/_static/doxyhtml/_pair_wise_coulomb_collision_func_8_h_source.html),
[cross-section setup](https://warpx.readthedocs.io/en/26.10/_static/doxyhtml/_elastic_collision_perez_8_h_source.html),
[momentum update](https://warpx.readthedocs.io/en/26.10/_static/doxyhtml/_update_momentum_perez_elastic_8_h_source.html)

The executed v12 studies make the representation tradeoff concrete. Positive
particle weights avoid a negative empirical distribution, while uncertainty and
finite collision steps still need refinement. Deterministic Q2 finite elements
remove Monte Carlo noise from the moment curves, but the independent raw-field
audit detects a tiny negative tail between quadrature points; common-temperature
sampled entropy also misses its declared budget. The Julia branch likewise
retains negative nodal values despite excellent moment conservation. Those
properties follow from the numerical method and its resolution, so language
choice alone cannot establish positivity, entropy behavior or convergence.
[Executed evidence and independent audits](TWOION-CONVERGENCE-V12.md).

## Alternatives and remaining decisions

An all-Julia rewrite would simplify the language boundary but would not establish
collision physics or numerical convergence. The inspected Kinetic.jl revisions
advertise Fokker–Planck–Landau support without a verified runnable Coulomb
unlike-species workflow; this is a bounded qualification gap, not a dismissal of
the Julia ecosystem. A subsequent search found a more directly relevant
[Julia FokkerPlanck implementation](https://github.com/KineticsforTransport/FokkerPlanck.jl).
Its default branch has a self-species implicit driver, while the non-default
`multi-species` branch contains coupled implicit evolution and two-/three-species
tests. The isolated upstream pilot reproduces its saved distributions and
near-machine-precision conserved moments, while directly observing negative
distribution values. A rerun passed all 100 nonlinear-success checks on the
return ignored by the upstream example, plus 12 distribution/moment assertions.
It could supply another deterministic reference and
reduce Julia integration costs. Its branch-only interface, conservation
corrections and entropy diagnostic require explicit review. A separate exact-SI
initial-rate probe now agrees with the analytic 40/84 u heating rate to about
0.0011%, with all five short-step success returns checked. Negative nodal values
and common-temperature distribution drift remain observed. No matched finite-time
accuracy/cost advantage has yet been established. This finding
is a reason to keep searching, not to discard the already frozen PETSc evidence.
The [Oxford research seminar](https://www.maths.ox.ac.uk/node/74386) connects the
implementation to published multispecies finite-element Fokker–Planck work.
See the [branch qualification](JULIA-FOKKERPLANCK-REVIEW-V12.md) and
[independent physics review](JULIA-FOKKERPLANCK-INDEPENDENT-V12.md) for the exact
source pin and executed scope. The subsequent
[matched SI probe](JULIA-FOKKERPLANCK-SI-PROBE-V12.md) and
[independent review](JULIA-FOKKERPLANCK-SI-REVIEW-V12.md) qualify its bounded
initial-rate bridge; long-time distribution gates remain open.

Commercial particle/CAD suites add licensing and sharing
constraints without a checked matched reference in this project. More custom
TypeScript collision solvers would increase the amount of science we must
independently qualify. Detailed source evidence and candidate limits are in
[the established solver review](INDUSTRY-SOLVER-REVIEW-V11.md).

FEniCSx is a strong later candidate for coupled potential/flow PDEs: a public
MIT/Simula presentation explicitly includes a centrifuge collaboration with
Marathon Fusion. That is application-specific evidence, not disclosure of a
reusable validated separator model or the company's current complete stack.
[Primary presentation, page 3](https://events.cels.anl.gov/event/610/contributions/1650/attachments/717/2386/openmc_fenicsx.pdf)

The present architecture is therefore an interactive reduced model checked by
offline scientific workflows. Reference agreement is earned quantity by
quantity. Introducing an online Julia job service, coupled plasma fields or
experimental performance predictions requires a separate demonstrated need and
validation contract.
