# Tooling review

12 November 2026. Four independent source/literature audits, plus a separate
review of the new time study. Recommendations are engineering judgments;
existing-code execution, new pilot results and experimental accuracy are
separate evidence categories.

**Yes, some work has duplicated mature solver infrastructure. The largest
example is the bulk CFD engine.** NumPy/SciPy/scikit-fem are real reused
libraries, but they do not own our cylindrical fluxes, full-stress coupling,
heat placement or split integration. Those remain a new, unqualified solver.
Other domains already run established packages; replacing everything would
discard useful independent references without supplying missing physics/data.

## Decisions

| Area | Keep | Change next |
|---|---|---|
| Bulk flow | Frozen V86 controls and actual FiPy conduction oracle | Use OpenFOAM Foundation 14 for an independent neutral-flow reference before expanding custom CFD. Match compressibility, swirl and stress-work transport explicitly. |
| Plasma thermodynamics | Explicit electrical/energy ledgers | Evaluate BOLSIG+/LoKI transport and reaction tables for a separate electron/heavy-energy closure. Check magnetization, two-term and locality assumptions first. A new PDE framework cannot supply unknown discharge inputs. |
| Collision transport | Executed WarpX, PETSc and Julia references | Extend WarpX to spatial prescribed-field transport; stop prioritizing additional homogeneous custom engines. Select the finite-step scattering law explicitly. |
| Target materials | RustBCA implantation and actual FiPy/Geant4-kernel controls | Pilot FESTIM for diffusion/trapping/heat; extend the existing SciPy Radau oracle to the complete coupled target before growing integration machinery. |
| Neutrons and optics | Actual OpenMC/NJOY and PyAbel/HiGHS | Extend their physically specified input families. Add CHERAB only when instrument geometry/response justify a ray tracer. |
| Research workflow | Content seals, failed results, explicit qualification gates | Separate producer/checker dependencies; admit every consumed report artifact. Pilot a small Snakemake DAG before building more phase runners. |

These choices are tied to equations and failure modes, rather than a single
universal “SOTA” package. Heavy offline tools produce qualified references or
bounded tables; the browser remains the interactive reduced model.
The immediate order is active-CFL diagnosis, admitted reporting, then a
manufactured constant-property OpenFOAM control. The other rows are bounded
future tasks, not six simultaneous migrations.

## Concrete findings and changes

**Inactive timestep refinement.** The old caps were above the acoustic CFL
limit. Technically, `min(cap, remaining, acoustic)` selected almost the same
steps; simply, we changed a limit that was not controlling the calculation.
The new [V87 study](scientific/timestep-v87/PROTOCOL.md) halves the active CFL,
retains identical physics, proves V86 replay, and checks actual step activity.
This diagnoses temporal error before introducing a different integrator.

**Producer/checker overcoupling.** V86 hashed every local Python file, including
scorers and tests. A metadata-only comparator fix therefore forced 26 unchanged
physical reruns. The new study enumerates the actual physical dependency
closure and receipts checker code separately. This preserves input integrity
while avoiding unnecessary physical replays. V86 remains frozen.

**Report admission gap.** The old summary checked its cover-sheet prediction
hash but did not verify the consumed comparison and target bytes against their
existing seals. The new [read-only admission checker](scientific/tooling-v87/check_report87.py)
checks those links and the optics/audit/panel chain, with stale-input controls.
This closes the gap for the new review without changing historical evidence.
It checks cross-file identities; it does not re-audit optical field packets,
thermal-reference evidence or every historical source dependency, and it is
not another physics certificate.

**Collision-law ambiguity.** Existing WarpX adapters omit the angular-law
parameter. The official pinned 26.10 source defaults to Bobylev; the browser
Nanbu option is a different finite-step law. Compare explicit-law/subcycling
families before calling their finite-step disagreement a physical discrepancy.
The package build/patch identity still needs checking; upstream source alone
does not establish every binary detail. Historical runs are not relabeled.

**Conservation is insufficient.** Matching total energy does not establish local
stress-energy transport, correct atomic energy partition, or experimental
rotation. The new CFD reference must compare local fields and face-flux/work
budgets. Do not tune heat fractions or cooling to the viewed velocities.

## Evidence and next adoption gates

**OpenFOAM is now actually running in safe-dev.** The separate
[installation pilot](scientific/tooling-v87/openfoam-pilot/README.md) verified
the official signed ARM64 package and passed five offline checks, including
the unchanged 400-cell compressible-air cavity through 100 steps. Its
project-local environment corrected a demonstrated hardcoded `/opt` startup
path without modifying the package, loader or sandbox. This establishes serial
tool feasibility, not matched Ar/Hall, swirl, thermal or experimental accuracy.
Keep the actual FiPy controls as current independent thermal evidence.

The independent specialist reports trace actual execution paths, limitations,
primary documentation, and adoption gates:

- [CFD tools and installation route](scientific/tooling-v87/CFD-TOOLS.md)
- [Kinetic/collision tools](scientific/tooling-v87/KINETIC-TOOLS.md)
- [Material, thermal, nuclear and diagnostic tools](scientific/tooling-v87/MATERIAL-DIAGNOSTIC-TOOLS.md)
- [Workflow and provenance tools](scientific/tooling-v87/WORKFLOW-TOOLS.md)

Primary capabilities checked include [OpenFOAM thermophysical models](https://doc.cfd.direct/openfoam/user-guide-v14/thermophysical),
[BOLSIG+ and its assumptions](https://www.bolsig.laplace.univ-tlse.fr/),
[WarpX 26.10 collision controls](https://warpx.readthedocs.io/en/26.10/usage/parameters.html),
and [FESTIM hydrogen transport](https://festim.readthedocs.io/en/latest/).
FESTIM lists Marathon among users; that self-report does not identify Marathon's
private equations, parameters or validation workflow.

New execution results and exact checks are recorded in the
[V87 timestep report](TIMESTEP-REFINEMENT-V87.md) and the separate OpenFOAM pilot
receipt. Its 28 temporal gates pass, with a largest finest-pair field change
of 0.63954%; 64 existing spatial failures remain unresolved. No public playground behavior,
experimental qualification, or validated-applicability claim changes here.
