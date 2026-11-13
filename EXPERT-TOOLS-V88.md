# Expert-code integrations

12 November 2026. Follow-up to [the tooling review](TOOLING-REVIEW-V87.md).
These are executed offline references for the interactive reduced models.
They do not make the browser a full OpenFOAM, WarpX or FESTIM simulation.

## What each tool owns

| Integration | Calculation | Boundary of the evidence |
|---|---|---|
| [OpenFOAM Foundation 14](scientific/expert-v88/openfoam/) | Cylindrical Ar heat conduction and viscous swirl decay; native wall torque and energy budgets | Constant-property neutral controls, not a Hall discharge or the complete V86 flow model |
| [LoKI-B++](scientific/expert-v88/electrons/) | Electron distribution, mobility, diffusion and ionization versus reduced field and gas temperature | Ground-state Ar, local unmagnetized two-term approximation; no admitted Hall tensor or extrapolation |
| [FESTIM 2.2](scientific/expert-v88/festim/) | D/T diffusion, shared trapping capacity, heat conduction and heat-dependent diffusion | Synthetic material coefficients; constant heat capacity and one-way thermal coupling, not measured LiT qualification |
| [WarpX 26.10](scientific/expert-v88/warpx/) | Spatial two-ion motion in prescribed fields, explicit collision laws and collision subcycling | Closed-boundary controls; canonical angular momentum includes field contributions; no collector or continuum transport certificate |
| [SciPy Radau](scientific/expert-v88/target-radau/) | Independent integration of the coupled depth-dependent target equations | Reuses the stated atomic/depth closure; integration agreement does not independently validate stopping data |
| [Snakemake / FiPy](scientific/expert-v88/workflow/) | Executable conduction → analytic audit → report → qualification DAG | A workflow/control pilot, not orchestration of every historical campaign |

Each directory contains its protocol, executable adapter, regression controls,
environment/source identity and retained results. Run instructions belong to
the specific tool environment: incompatible native stacks are isolated rather
than combined into one dependency installation.

## Observed results

| Tool | Executed control | Result |
|---|---|---|
| OpenFOAM | 13 native cases, four helper tests, 86 frozen gates | Passed; finest heat/swirl errors 0.135% / 0.108% |
| FESTIM | 36 native cases, nine adversarial tests, 94 frozen gates | Passed within the manufactured scope; maximum isotope inventory residual 5.11e-15 |
| LoKI | 44 native cases and eight adapter/admission tests | Bulk quantities admitted at eight exact points; original ionization and two extension contraction failures retained |
| WarpX | 12 spatial cases and nine adapter tests | Second-order orbit refinement and exact particle inventory; six of seven collision cases fail the raw canonical-angular screen |
| Coupled Radau | Three full reference cases at two tolerances, nine controls, nine requested browser trajectories | Eight browser runs complete; pulsed case passes, continuous finest run stops on packing admission, beam-off cooling-coordinate gate fails |
| Snakemake / FiPy | Eight integration tests, default and cached DAG executions | Passed; a coarse negative control is correctly rejected while its report is retained |

Independent execution receipts are in [review](scientific/expert-v88/review/).
Those reruns check the retained native results and negative controls; they are
not independent repetitions of every expensive physical campaign.

The WarpX result is particularly useful as a negative control: the finest
collision-off orbit has relative position/velocity errors 1.67e-7 / 3.53e-6,
but the warm collision cases still change canonical angular momentum too much.
Cold orbit controls alone cannot attribute that difference solely to collisions;
a separately frozen warm collision-off control isolates the pusher contribution.
One refined-grid collision case passes the single-seed screen; this does not
establish the joint particle/cell limit. The inherited strict 1e-10 energy
screen fails 11/12 prescribed-field cases and remains visible separately from
the supplementary pusher-accuracy screen. These failures are not relabeled as
transport qualification.

The matched warm collision-off run has energy/canonical-angular residuals
7.73e-6 / 1.87e-4. These are smaller than the failed collision screens, but
cannot be subtracted as an exact pure-collision error. Independent native
default-versus-disabled synchronization probes also verify that the returned
position and momentum snapshots share a time coordinate. Warm reflected orbits
are not scored against a free-space analytic orbit.

For the target, the finest continuous run stops after 511 accepted steps:
packing defect 2.85327e-14 versus its fixed 2.84217e-14 bound, with all populations
positive. The exact discrete equations conserve packing; accumulated roundoff
from three independent solves is the supported explanation. No threshold was
changed. Separately, the beam-off cooling-ledger difference is 4.55 J/m² with
a 0.01425 K temperature difference. Its frozen 1 J/m² normalization and 1%
gate demand less than 0.01 J/m², so the declared numerical gate still fails.
These are different limitations from an experimental disagreement.

## Admission and scope

An upstream installation is checked separately from numerical convergence,
physical model suitability and agreement with experiment. Failed physical
gates remain data. A consumer must check the exact executed source, inputs,
result identity and supported domain before using a table or reference.
Changing a checker must not silently change the underlying prediction.

Two workflow defects were corrected. First, a cached final file could satisfy
Snakemake's timestamp checks without its contents being read. In plain terms,
"already exists" was being mistaken for "still valid." The final rule now
always admits the sealed evidence chain, including cached output. This keeps
Snakemake's useful caching while checking the actual result; disabling caching
or writing another scheduler would not address that boundary as directly.
Second, coordinate comparison used `zip`, which silently ignores an unmatched
tail. Exact array lengths and finite values are now required before assessing
the physical grid, with resealed malformed-array regression controls. These
guards enforce the finite-volume geometry rather than hiding solver failures.

The coupled-target oracle also has a separate small-reaction-channel check.
Normalizing every inventory by incident dose can hide a completely incorrect
fusion yield because only a tiny fraction reacts. Yield and instantaneous
reaction rate therefore have their own predeclared scales and convergence
gates, alongside the original state/energy checks. This tests the observable
of interest rather than making an arbitrary global tolerance tighter.
An additional exact-zero rate auditor closes the zero-current conversion
branch that could otherwise mask an erroneous nonzero rate. Four negative
controls pass, and all 45 retained zero-current samples are exactly zero;
the original numerical qualification remains false.

WarpX integration also exposed a memory-layout error: sliced velocity columns
were not contiguous, while the native particle-insertion interface consumed
them as contiguous arrays. This scrambled the requested initial velocities.
The adapter now passes contiguous arrays and verifies the actual inserted
state against the requested one before evolution. This fixes the interface
contract rather than compensating for wrong initial data in a comparison.
Native radius access, parser names and collision enums likewise use the
actual pinned backend's supported interface, without a replacement pusher.

The existing PETSc, Julia, RustBCA, Geant4-kernel, OpenMC/NJOY and PyAbel/HiGHS
references remain available. LoKI implements the recommended BOLSIG+/LoKI
choice; running two overlapping electron solvers is not required for this
integration. CHERAB remains conditional on known optical geometry and response.
Commercial COMSOL/Ansys tools were reviewed, but no license/access was established.

## Installation failure and evidence preservation

The first FESTIM install filled the Mac's backing disk and produced filesystem
errors inside its sparse guest disk. The failure preceded scientific execution;
it was not evidence against FESTIM's physics. The failed-install receipts were
preserved before retiring only that failed task-owned volume. The clean install
uses genuine upstream optional dependencies to avoid unused visualization
packages, with normal dependency checks; no placeholder packages or modified
physics libraries were introduced.

To recover space, task-owned V87/V86/V85/V84/V83 export copies were compared byte for byte
against the canonical project. Every differing file was copied into
`/private/tmp/mass-spinner-v88-preserved-export-differences-20261112`, with
SHA-256 inventories and a second full verification before deleting each duplicate
export. Unique scientific evidence was preserved. Historical reports' export
paths describe those historical copies and are not rewritten as new evidence.

## What this does not resolve

The existing V86 spatial convergence failures and experimental rotation/current
mismatch are not cleared by these controls. Missing electrode inputs, plasma
transport closures and diagnostic response still require apparatus-specific
evidence. Public playground behavior and its qualification remain unchanged
until a replacement closure passes its own matched comparison.

## Final repository checks

The [fresh-VM application gate](scientific/expert-v88/review/application/README.md)
passed **1238/1238 tests**, `npm run typecheck` and `npm run build`. All 2666
copied source files were hash-verified against staging, including 557 entries
matching the canonical application and fixtures. Two earlier checks on a guest
filesystem damaged during disk exhaustion are retained, not counted as passes.
The final build retains the existing bundle-size warning.

Every dependency/scientific/project run used safe-dev. Trusted host operations
were limited to reading/editing files, verifying and preserving exports,
scoped storage maintenance and Git. The adapters do not change the deployed
playground, and no new experimental-accuracy claim is made.
