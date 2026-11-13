# Early wall-layer and largest-grid timestep study

This extends [V91](ENDWALL-REFERENCE-V91.md). The reference still describes
compressible, constant-property neutral argon in a closed adiabatic cylinder.
It does not qualify a measured plasma apparatus or change the deployed sim.

## What this tests

V91's fine spatial study passed at 20 μs, but its 128×256 grid had only one
timestep setting. Early-time diagnostics were not monotone. A final-time,
whole-volume norm can hide an error in a thin wall layer. In simple terms,
agreement after the flow settles does not establish accuracy during startup.

The new study freezes the same backend and native OpenFOAM 14 implementation.
It adds 128-grid trajectories at 512 and 2048 steps, bracketing the retained
1024-step case. It scores all three saved clocks 5, 10, 20 μs and the matched
1024-step spatial sweep 32→64→128. The full prospective
[protocol](scientific/wall-transient-v92/PROTOCOL.md) was written before these
predictions. No coefficient, wall condition or measured velocity is adjusted.
It was published in commit `1e648af` before the new trajectories began.
The spatial histories were already observed in V91: rescoring them adds
requirements, but is not a fresh held-out spatial prediction. The two new
timestep trajectories were uncomputed when the protocol was registered.

Besides the existing global norms, a new local admission set measures the
physical region within 4sqrt(mu*t/rho) of the endwall. Conserved quantities
are restricted before primitive recovery. Fractional cell-volume overlaps
keep the same physical band across grids; a center-only mask changes the
scored volume when the grid changes. This small scoring addition avoids
changing the solver or choosing a new region after seeing the answer.

The 5% spatial/cross-solver, 2% temporal and strict contraction limits remain.
New early/local checks are additional requirements, not replacements for the
failed old audits. Whole-state and response-increment norms are both retained.

## Results

| Admission set | Passed | Failed |
|---|---:|---:|
| Final global spatial, 20 μs | 48 | 0 |
| Early global spatial, 5/10 μs | 81 | 15 |
| Wall-local spatial, all saved clocks | 105 | 39 |
| Global temporal, all saved clocks | 96 | 0 |
| Wall-local temporal, all saved clocks | 96 | 0 |
| Mass, energy and native wall-angular budgets | 15 | 0 |

The sets overlap; these are not independent experiments. The final scorer
exits **1**, correctly retaining `numericalComparisonPass=false` and
`experimentalQualification=false`. Both new trajectories completed normally.
Temporal refinement now meets the declared requirements at the largest grid,
including local response increments. It does not resolve the spatial failures.
The largest 1024→2048 relative change is 0.1858% for native OpenFOAM
(local density increment at 5 μs) and 0.01901% for our backend
(local meridional flow at 5 μs), against the 2% limit. The largest temporal
contraction ratios are 0.54595 and 0.53299 respectively, below one.

The preflight on the retained 1024-step histories passes 48/48 final global
spatial checks, 81/96 early global spatial checks and 105/144 local spatial
checks. At 5 μs, the 64→128 meridional self-change in the physical band is
7.455% for native OpenFOAM and 7.404% for our backend; at 10 μs it is 7.753%
and 7.373%. Both exceed 5%, despite closer cross-solver agreement.

A post-preflight fixed 32-grid projection diagnostic reduces the local
meridional contraction ratios at 5 μs from 2.147/2.005 to 1.314/1.207
(native/ours); both still fail contraction. At 10 μs they fall from
1.332/1.220 to 0.945/0.825. Thus comparison-grid averaging contributes to
some ratios, but does not explain away the earliest failure. This additional
diagnostic is explicitly ineligible to replace any admission gate.

The evidence supports prioritizing wall-focused spatial refinement next.
At 5 μs, sqrt(nu*t) spans only about 0.81 axial cells on the finest mesh;
even though the scored band is four times that thickness, its steep inner
gradient remains poorly resolved. That scale estimate is a physical diagnosis,
not proof of either code's continuum error. A graded endwall mesh, registered
before new predictions and compared at matched temporal accuracy, should test
this explanation while avoiding the cost of uniformly refining the whole
cylinder. Pressure/stress discretization differences remain an alternative
if local errors persist after resolving the layer. No transport coefficient,
boundary condition or acceptance limit was changed to obtain these results.

## Scope and evidence

The backend remains the V91 opt-in wall reconstruction, V75 SSPRK2 Euler
transport and V86 implicit scikit-fem stress/work/conduction. Native OpenFOAM
uses the existing `fluid` module and `viscousHeating` model. Its pressure
correction and wall predictor path were reviewed against the official
[pressure corrector](https://cpp.openfoam.org/v14/isothermalFluid_2correctPressure_8C_source.html)
and [constrainHbyA](https://cpp.openfoam.org/v14/constrainHbyA_8C_source.html).
That source review does not establish a new pressure-boundary correction;
the native dictionaries are unchanged apart from timestep and output interval.

The finite wedge geometry and native versus integrated swirl-inertia
conventions remain those documented in V90. Code-to-code agreement cannot
resolve missing electrode, ionization, optical or experimental inputs.
Experimental qualification stays false even if every numerical check passes.
The compared primitives are recovered from restricted conserved states;
they are not synthetic optical measurements or direct fine-cell averages.
The checks concern the saved 5, 10 and 20 μs snapshots, not a dense-time error
bound or qualification earlier than 5 μs.

All computation runs offline in Apple safe-dev. Host controllers only copy,
hash, launch and export. Other running jobs are left untouched. A refused
VM admission is retained separately from scientific test or solver failures.

The tested scientific copy is `/work/project/v92-wall-source02`. Its complete
source map and referenced V91 manifest hashes are recorded in each execution
receipt. In particular, the unchanged physical `flow.py` SHA-256 is
`43dfde8fdf544e74e9c93cb7417218056fbbfeb5a1279b0d2ba011e4cf071d8c`.
The native source, executable and library hashes are checked against V91 before
and after both new trajectories. The application has a separate source map;
these scientific studies do not change its deployment.

The scientific command `python -u test92.py tests-results` passed 39 controls:
five new scoring regressions and the 34 retained boundary, flow, diffusion and
adapter checks. They test conservative scorer equivalence, physical-band
volume, invalid reporting clocks, identical-state errors and rejection of
undefined/noncontracting refinements. Passing these implementation controls
does not turn a failed physical convergence comparison into a pass.

The separate application snapshot contains 2666 authenticated files, with
source-tree SHA-256
`ccfc2619fbc2509e31034c4b9a86535a5d8e623f7f68a3c6f8510023fba1ab7c`.
Final offline checks on that unchanged copy passed: `npm test` (1238/1238),
`npm run typecheck`, `npm run build`, `npm run check:site`, and
`npm run check:assets`. These are build/application checks, not a new deployed
browser verification or experimental validation.

## Reproducibility

- [Protocol](scientific/wall-transient-v92/PROTOCOL.md),
  [study/scoring sources and controllers](scientific/wall-transient-v92/README.md).
- [Final gate details](scientific/wall-transient-v92/evidence/v92-wall-source02/scientific/wall-transient-v92/score-results/audit.json),
  [new predictions](scientific/wall-transient-v92/evidence/v92-wall-source02/scientific/wall-transient-v92/study-results/predictions.json),
  [scientific controls](scientific/wall-transient-v92/evidence/v92-wall-source02/scientific/wall-transient-v92/tests-results/controls.json).
- [Projection diagnostic](scientific/wall-transient-v92/projection-diagnostic.json),
  [scientific execution receipt](scientific/wall-transient-v92/v92-wall-source02-study.json),
  [application receipt](scientific/wall-transient-v92/app-final/execution.json).
- [Full source, dictionaries, raw native fields and packets](scientific/wall-transient-v92/evidence.tar.gz):
  51,065,449 bytes; SHA-256
  `6e9f85d487386e87943ea2efbe986adaaacc305e7281318ec5ebf92fb85c117f`.
  The [export receipt](scientific/wall-transient-v92/export.json) records
  rehash verification of all 137 archive members; its inventory lists each
  source/output separately. The retained V91 packets are linked from V91.

Run the checked-in host controllers only after restoring their recorded
safe-dev prerequisites. `tests`, `preflight`, `study` and `score` are separate
phases on the immutable source copy; an expected failed `score` is evidence,
not a reason to overwrite a trajectory. The initial refused source01 VM
admission and the successful source02 receipts are both retained. No jobs
were interrupted, no dependency/environment upgrade was made, and no new
deployed-site behavior is claimed.
