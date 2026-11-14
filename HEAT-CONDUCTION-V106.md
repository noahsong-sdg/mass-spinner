# V106: conservative heat on the conserved volumes

The new heat substep removes a reproduced axial-temperature artifact and
passes independent analytical controls. Coupled density/flow convergence is a
separate question; this is not an experimental or live-browser qualification.

## Problem, cause and fix

The path is `campaign106 -> campaign99.evolve -> Diffusion.advance -> conduct`.
The old method combines a finite-element heat stiffness matrix with heat
capacity only at the finite-volume centroid nodes. Additional boundary
temperature nodes have zero capacity. Their stiffness rows include tangential
heat flow, so their algebraic balance can induce axial variation even when
the physical temperature and material properties vary only radially.

In simple terms, the boundary part of the heat solver has no thermal storage.
It invents a sideways temperature variation to balance a radial heat pulse.
This is a finite-grid discretization defect: the old joint refinement can
still approach the correct continuum limit. It is not evidence that all
finite-element methods have this problem.

`FVDiffusion` replaces only conduction with existing **FiPy 4.0.3** cylindrical
cell-centred finite volumes and backward Euler. Its temperature unknowns now
coincide with the conserved annular cells. Physical heat capacity comes from
the current density and species; incoming post-mechanical temperature is
re-anchored on every call. Native unconstrained boundaries have zero flux.
The mechanical stress solve, viscous heating, numerical heat, mechanical work,
electrical model, source reconstruction and operator ordering are unchanged.

This is the smallest isolated replacement that removes the demonstrated
storage/geometry mismatch using an already employed expert library. Changing
wall temperatures, adding cooling, smoothing initial data, or modifying the
transport closure would change the physical problem and obscure this test.
See [equations, geometry and output semantics](scientific/heat-v106/METHOD.md)
and [FiPy's boundary documentation](https://pages.nist.gov/fipy/en/stable/USAGE.html#default-boundary-conditions).

The base `Diffusion` retains its old method through a small `conduct` hook.
Three nonuniform, changing steps match the pre-extraction solver bit for bit,
including every state and receipt field. Only the research candidate selects
the new heat implementation. Its temperature trace explicitly means FV cells;
the inherited FE heat matrix is inactive and is not used to audit FV fluxes.

## Independent heat controls

The reference is the radial Neumann mode `J0(alpha*r)`, with `J1(alpha*R)=0`.
It uses exact annular averages and analytic exponential decay, not output
from the new solver. The four original controls are unchanged between old
and candidate execution.

| Control | Old hybrid heat | FiPy candidate |
|---|---:|---:|
| Artificial axial spread, uniform z, 1 µs | 0.653856 K | 9.09e-13 K |
| Artificial axial spread, graded z, 1 µs | 1.995961 K | 2.27e-12 K |
| Finest analytic spatial increment error | 1.0005% | 0.03430% |
| Finest analytic timestep increment error | 1.1540% | 0.91480% |

Candidate spatial errors under joint doubling are 1.8976%, 0.4802%, 0.1236%,
0.03430%, consistent with approximately second order. Time errors with
4/8/16/32 steps are 6.6156%, 3.4753%, 1.7896%, 0.9148%, consistent with
first-order backward Euler. The old method fails both separability subcases;
the candidate passes the same assertions.

The fourth control changes incoming heat, density and two-species composition
after a warm step. Reused and fresh operators agree, energy is conserved,
temperature stays positive, transport remains active, and thermal entropy
`sum(C*log(T))` does not decrease. This is a heat-substep statement at fixed
mass, not a full plasma entropy theorem. Two additional method-admission and
receipt controls and two real coupled initialization/ledger controls pass.

The complete control run has 131 passing test-method invocations, including
11 intentionally repeated inherited balance methods: 120 distinct methods.
The separate legacy-extraction control passes; the preserved old heat witness
has the two expected failed subcases. No threshold was relaxed.

## Coupled study and boundaries

The [frozen protocol](scientific/heat-v106/PROTOCOL.md) retains all five jobs,
physical inputs, initial states, electrode patches, V101 nested geometry,
0/1/2/4 µs clocks, spatial 5%, timestep 2%, contraction, positivity,
quadrature and mass/species/energy/angular/charge gates. Measurements are
not fitted. Optical scoring remains retrospective and follows sealed
predictions.

The full five-case study completes, but **all six spatial gates still fail**:

| Time | Density-increment difference, V105 → V106 | Radial-flow difference, V105 → V106 |
|---|---:|---:|
| 1 µs | 21.0524% → 20.7323% | 7.2734% → 7.0647% |
| 2 µs | 22.5206% → 22.1807% | 9.4219% → 9.2097% |
| 4 µs | 23.6330% → 23.4212% | 9.7540% → 9.6381% |

The heat artifact is real but does not dominate these coupled discrepancies
at the tested resolutions. All original contraction, timestep, positivity,
quadrature and conservation checks pass. Optical screening remains 0/288.
Finest peak temperature is 621,617 K. Maximum relative defects are 4.94e-16
mass/species, 9.18e-14 energy, 4.10e-14 angular momentum and 4.62e-12 charge.
The [V105 report](SOURCE-BALANCE-V105.md) preserves its earlier failures.
Directional refinements, if required, are supplemental causal diagnostics;
they cannot replace or erase a failed original gate.

The supplemental 1 µs directional cross confirms radial dominance. Doubling
radius alone changes the density increment by 20.2706% and radial speed by
6.9487%; doubling height alone changes them by 2.9548% and 0.9422%. With height
already refined, radial changes remain 20.3379% and 6.9442%. The reused joint
comparison exactly reproduces all seven metrics in the original full audit.
Five diagnostic protocol, geometry, containment and source-sealing tests pass.

At initialization, radial acoustic mass-flux truncation accounts for the
mass-rate discrepancy; the axial contribution is roundoff. Its squared,
volume-weighted contribution in the source-kink region increases from 59.2%
to 89.1% under refinement. This localizes an initial sensitivity, not a proof
that this term causes the later error. Each grid also recomputes its steady
torsional initializer, so directional differences include initialization and
evolution. Further targeted radial resolution must be tested before claiming
the density and radial-flow problem is fixed.

Constant positive scalar conductivity is the candidate's declared domain.
Variable conductivity, ionization/excitation energy, wall energy exhaust,
electrode/sheath uncertainty and apparatus calibration are not supplied by
this numerical fix. In particular, prescribed neutral transport outside its
reference range remains a physical limitation regardless of conservation.

## Reproducibility

Execution uses one-thread, 1G safe-dev, NumPy 2.4.6, SciPy 1.17.1,
scikit-fem 12.0.2 and FiPy 4.0.3. Install the existing pinned
`scientific/coupled-v99/requirements.txt` and
`scientific/meridional-v86/requirements.txt` in an isolated environment.

The 98-input tested snapshot is `/work/project/v106-candidate02`, transfer
SHA256 `89fa06a1c1b5f25a4790e8708f0d21caaa2a97f3942ac7d73a127ea03db0dece`.
Candidate source SHA256:
`9fd1903f0e1250a67065825e1b2688906faf1927639857c02c9eca302107ba84`.
Full prediction SHA256:
`96098e86f874d1d5f65317a882a5f14df75685afc06ecc8a98cbd7a76e48a7b4`.
The producer exits 0; evaluation correctly exits 1. The finest run uses
6,671 steps, 1,205.39 s and 401,896 KiB peak RSS. All 98 source inputs are
verified unchanged before and after execution.
The first candidate's incorrect top-level FiPy mesh import is retained as a
failed attempt; candidate02 uses the class's defining module. The old heat
red test, source inventories, environment and exact execution receipts are
retained alongside successful controls.
