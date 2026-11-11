# Adversarial Level 4 research-bench audit — v19

Read-only scientific/source review, 7 November 2026. This audit changes no
application, solver, result, acceptance threshold or sealed scientific archive.
The frontend is being changed concurrently; findings below describe the inspected
v18 source identities, not a subsequently built or deployed v19 interface.

## Disposition

The current Level 4 accurately identifies itself as offline evidence and
withholds physical qualification. Its three public figures are actual copies
from the named scientific packages. No new contradiction between the displayed
v17 counts and the inspected numerical result dictionaries was found.

The largest remaining gap is the user's playground requirement: this level has
static figures and disclosure text, rather than controllable experiments. A
recorded-case viewer can close an interaction gap without pretending to run a
solver. Physical qualification and unrestricted live collisional simulation
remain separate research work.

## Execution path inspected

`index.html` defines the research section using three PNGs and a native details
element. `src/experience-ui.js` switches `body.dataset.level`, aborts/invalidates
existing separator work through `main.js`, and disables automatic separator
updates in Level 4. `src/style.css` hides the normal workspace, live plots and
diagnostics there. No Level 4 input dispatches Julia, PETSc, WarpX or a new browser
collision kernel. The normal application initializes other modules on page load;
that is not an offline solver invocation.

`vite.config.mjs` copies `web-assets/` into the release. The public provenance
page is `web-assets/LEVELS-RESEARCH.md`, not `docs/LEVELS-RESEARCH.md`.

## Findings and minimal remedies

### P1 requirements gap: Level 4 is an evidence page, not a playground

**Problem.** The new user brief asks for visual simulator/playground experiences
without lesson scaffolding. Level 4 presently offers one drift/tensor image,
two expandable figures and narrative status. It has no case, species, tensor
component, normalization, time or refinement selection.

**Technical cause.** It is static HTML, with level visibility handled by CSS;
there is no Level 4 state/data/controller path. In simple terms, visitors can
open an image but cannot manipulate the recorded experiment.

**Smallest fix.** Keep an explicitly named “Recorded research runs” or “Evidence
viewer” destination, or add selectors over a small versioned exported data
packet: case, species, physical time, vector/tensor component and comparison.
State “recorded run” beside every selection. Link the precise run and scope.
Do not interpolate particle configurations and label them a new numerical solve.

**Why this choice.** It makes the existing evidence explorable, without inventing
a browser deployment of an unqualified solver or rerunning expensive research
on every slider movement. Adding arbitrary physical-parameter sliders would
require actual new simulations and their convergence evidence.

### P2 scientific reporting: specify evolution increments and show coarse failures

**Problem.** The v16 card foregrounds fine width/timestep passes without exposing
its six coarse refinement failures. Both cards abbreviate distribution gates as
“distribution comparisons/refinements”. The figure itself correctly says
“evolution-increment L1”, but that distinction should survive image cropping,
mobile layout and summary readouts.

**Evidence.** `scientific/evolution-review-v16/results/final-audit.json` records
14 cases, 494 states, 42 equation replays and 22 refinement decisions:
16 PASS, six FAIL. The coarse particle pair contributes two FAIL; the width
pairs contribute four FAIL. Fine width and fine timestep pairs pass.
The v17 aggregate records 32 species/time decisions: 30 FAIL and two UNKNOWN.

**Meaning.** These refinements compare changes in represented PDFs, schematically
`||(f_h(t)-f_h(0)) - (f_k(t)-f_k(0))||_1`, with the recorded normalization.
Agreement of changes can cancel initial representation bias. It does not bound
`||f_h(t)-f_exact(t)||_1` or prove the initial distribution was resolved.

**Fix.** Display “evolution-increment refinement” and its 2e-4 budget, alongside
“difference between numerical runs; no exact-solution error certificate”. Include
both pass and fail totals for v16. Preserve UNKNOWN when diagnostic uncertainty
exceeds its prerequisite. This is a presentation fix; no threshold, result or
physical model should change.

### P2 attribution: explicitly disconnect this benchmark from Marathon and transport

**Problem.** Adjacent numbered levels and a generic “general 3D backend” title can
make the research graphs look like the validated engine behind every earlier
playground. The main page does not give the plotted masses, physical scales or
initial setup. The figure's mean-velocity axis uses V0 without defining V0 there.

**Evidence.** `scientific/general3d-evolution-v17/core.jl` uses
`V0=sqrt(5 eV/(40 u))`, species density 5e17 m^-3 and fixed lnLambda=12;
the preset masses are 40 and 84 u. `initialization.jl` uses arbitrary rotated
positive temperature tensors and counterdrift in the combined case. It evolves
velocity coordinates, without spatial fields, sources, device geometry,
electrons, target stopping or fusion. The plotted case is
`combined-n8-q5-a010`, not a D/T LiT target calculation.

**Fix.** Put “homogeneous 40/84-u ion collision benchmark; offline Julia” and the
V0 definition beside the plot, and state that it does not validate separator
transport or Marathon's source. Link a compact run manifest with mass, density,
charge, Coulomb logarithm, initial tensors/drifts, smoothing, n/q, dt and horizon.
Label n as nodes per axis (`n^3` markers/species), not as total particles.

**Why this choice.** It preserves meaningful physical units and applicability
without adding a long lesson. A generic “more advanced” badge cannot communicate
the scope boundary. The existing Level 3 text already says added detail does not
establish accuracy; retain that rule at the level navigation itself.

### P2 provenance usability: public seals do not expose reproducible evidence

**Problem.** The public page gives two seal hashes and says raw archives are not
deployed, but provides no retrievable scientific source/results artifact or
repository link. A visitor can verify a PNG hash only if separately given the
source package. They cannot reproduce the findings from this page alone.

**Fix.** Publish a small immutable manifest and plotted arrays with the app,
listing source/plan/result hashes, units, case IDs, diagnostic definitions,
failed/unknown status and the original scientific package identities. Link a
reviewable public repository or bounded archive if/when one is available.
Until then say “local retained provenance; full archives not publicly available”.
Do not link guessed paths, expose private project files, or deploy the entire
scientific directory as a convenience.

**Why this choice.** A small public data packet supports the shareable evidence
viewer and independent inspection. Copying huge archives would increase payload
without solving scientific reproducibility or privacy deliberately.

## Mathematical and status boundaries checked

The finite-rule method has positive fixed Gaussian weights/variances, making
its represented PDF positive by construction. Pair mobility uses
`Q(z)=(I-zz^T/|z|^2)/|z|`, which is positive semidefinite and annihilates z.
The paired unequal-mass updates cancel weighted momentum and kinetic-energy
changes. A solved weighted discrete-gradient step has a finite H_Q chain rule.
These are finite-model properties, not a claim of correct physical relaxation.
The actual benchmark uses common `m_s*epsilon_s`; arbitrary smoothing choices
must not be offered as physically interchangeable equilibria.

The implemented entropy gradient differentiates both moving cubature locations
and mixture centers. The fixed laboratory tensor cubature is not invariant
under arbitrary rotations. Rotating the quadrature along with the particles
tests a different covariance property, not the physical fixed-node experiment.

The displayed v17 qualification summary agrees with the inspected aggregate:

| Item | Retained evidence | Interpretation |
| --- | --- | --- |
| Evolution | 17 trajectories, 617 states, 600 accepted steps | Completed runs |
| Selected equation replay | 51 complete equations | Three selected steps per case, not every step |
| Number, momentum, energy | All 17 cases PASS | Finite-structure checks |
| Positivity | All 17 by positive Gaussians | Representation property |
| Nonzero initial physical rates | 52 nominal-Gaussian and 58 actual-GMM FAIL | No 2% physical-rate qualification |
| PDF-increment refinements | 30 FAIL, two UNKNOWN | No general distribution qualification |
| Boost/rotation records | 10 PASS / eight FAIL | Fixed-node rotation error remains |
| Physical-H integration | 217 state PASS / 400 UNKNOWN | Numerical integration prerequisite |
| Case H-rise allowance | Two PASS / 15 UNKNOWN | Not exact monotone physical H |

The broad-common control's positive physical-H estimate is about +4.44e-9/N,
inside the unchanged 1e-8/N allowance. H_Q decreases separately. The corrected
public entropy PNG explicitly labels this as an H-rise budget. Neither this
audit nor the prior numerical sensitivity estimate is an interval proof.

WarpX `analysis.json` contains 24 rate families: 20 nonzero UNRESOLVED and four
zero-reference cases without relative gates. Its deterministic physical-H and
full-PDF qualifications explicitly remain `UNQUALIFIED_STOCHASTIC_REFERENCE`.
Three whole-run seeds are three replicates; particles/checkpoints are not extra
independent runs. Student-t sampling assumptions and empirical derivative-window
sensitivity do not become rigorous confidence bounds on all campaign decisions.
WarpX is not the producer of the displayed Julia curves. PETSc is not their
producer either; established-solver names do not transfer validation to them.

## Actual local attribution checks

Trusted read-only host `shasum -a 256` confirms exact matching public/source PNGs:

| Public asset | Scientific source | SHA256 |
| --- | --- | --- |
| learning/research-drift.png | general3d-review-v17/figures/drift-and-full-pressure-tensor.png | f37e22cb9996c609de943b7e79d2336938f1552720f2cd169463b93dcc481026 |
| learning/research-entropy.png | general3d-presentation-v17/figures/entropy-physical-vs-discrete.png | 672e9e2fa43f0524b4b8e99351dbadf40963c1556cb3c7edd38f40fa381725a0 |
| learning/research-convergence.png | general3d-review-v17/figures/full3d-refinement-gates.png | a27a7a0f0ee440081a415625a33e25a639721517ec02127332d539af0d58a1f4 |

The actual seal-file digests match the public attribution:
main `51b7fef7862527194b4508bda97aec804e9ab0cb8c8ca0701a0eb4540d2890fa`;
presentation `1f37aa91f6a5cbd780c4f0e6fa62d72e821cd1c608d04ae9c9d93b3ce3b87dd4`.
This pass rehashed those files and three PNG pairs, not every sealed member.
The prior full-member verification is retained evidence, not a newly repeated
check by this reviewer. The actual local drift PNG was visually inspected;
its finite-representation and separate-qualification labels are legible.

## Snapshot and limits

Inspected v18 source SHA256 identities:

- index.html: c072dc538d6db56fac692d984d694f2bfd2ed2e5aa47458bc3d0e1a01283425e
- src/experience-ui.js: 2255c8b599d648121746e1349ec4132e72e30e39a284b182eacf2db68177d91c
- src/style.css: 9b44d47ca80411706a9a541083cec2d87939718056d09ff7d7b6ed09090fec03
- web-assets/LEVELS-RESEARCH.md: b870036ee34783d52ebc5cd0867291697f259f7483050507f8cb6e9e78274aa4
- v17 final-audit.json: d65878bf940bde4631633485d763879b39bdcac9f80734e21914d8804006eb35
- WarpX analysis.json: d06dc662c7b315ee6356071ce9b46eb295f1c2f63410e567ed0df8161b076234

Checks performed: source execution-path trace; direct JSON status/count queries
with jq; eight local SHA256 identity checks (three pairs plus two seals); local
drift figure inspection; mathematical scope/finite-rule consistency review.
No project code, dependency installation, solver, scientific replay, tests,
typecheck or build ran in this subtask. No numerical integrals or root solves
were independently repeated. Required application final gates belong to the
parent's changed source snapshot. Live browser/GPU/controls remain unverified;
no browser-policy workaround was used.
