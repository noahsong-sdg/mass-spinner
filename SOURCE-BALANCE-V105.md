# V105: reconstructed force and stationary-wall consistency

Two local defects are corrected in a research candidate. **All six original
coupled spatial failures remain.** Neither this candidate nor its analytical
tests establish experimental accuracy or change the live playground.

The execution path is `campaign105 -> campaign101.case -> campaign99.evolve
-> CoupledFlow.rate / _face_states`, followed by electrical and viscous work.

## Fixes and their scope

**Geometric force.** V103's radial face reconstruction includes departures in
pressure, density and angular speed. Its cylindrical body source did not
integrate those same reconstructed departures. In simple terms, a cell's
boundary forces and its interior force described different gas states.
`SourceFlow` integrates the missing departures, including density–rotation
cross terms. Polynomial terms are exact; exponential terms use checked
adaptive quadrature, with explicit failure if unresolved. It changes radial
momentum only. Native rotational balance, common conserved fluxes and the
energy/angular-momentum map remain intact.

This is a source-consistency correction rather than a new reconstruction:
changing the physical force or suppressing radial motion would alter the
problem. It does not introduce a whole-cell positivity theorem; independent
checks find positive reconstructed pressure/density on the saved states only.
See [method and equations](scientific/source-v105/METHOD.md).

**Stationary-wall reconstruction.** The viscous apparatus imposes stationary
wall velocity, but the campaign left its existing no-slip tangential
reconstruction disabled. For inward advection of linear shear, the two
interior traces then represented different gradients; the resulting HLLC
tangential flux could be half the analytic value. `CoupledFlow` enables the
existing stationary-wall reconstruction. Final Euler ghosts remain slip/
reflecting, so the viscous solver supplies wall traction once. This bounded
configuration fix is preferable to inventing an additional drag law.

Both old-code physical witnesses fail and the corrected controls pass. Six
new source methods plus eleven inherited balance methods, four wall methods,
102 historical methods, two coupled methods and three source-postprocessing
methods pass. Historical methods run with the source candidate injected
before imports; the separately rerun inherited tests overlap that count.
No acceptance metric was modified to obtain these passes.

An independent publication review also caught a test dependency on an
unpublished diagnostic and a mutable campaign alias. Together these could
break fresh-checkout or combined discovery. The wall test now imports the
published base class directly and defines its local wall variant. This is
the smallest fix to isolate the physical witness from campaign import order.
Four wall methods and all 26 methods in the retained source-folder discovery
pass in the fresh `v106-review01` snapshot, including the diagnostic tests
included in that retained snapshot.

## Unchanged coupled study

The [frozen protocol](scientific/source-v105/PROTOCOL.md) retains the physical
manifest, initial states, source patches, V101 nested mesh, 0/1/2/4 µs clocks,
n=1/2/4 at CFL .1 and n=2 at .2/.05. The original evaluator retains spatial
5%, timestep 2%, contraction, positivity, quadrature and all conservation
checks. No measured current or velocity is fitted.

| Time | Density-increment difference | Radial-flow difference |
|---|---:|---:|
| 1 µs | 21.0524% | 7.2734% |
| 2 µs | 22.5206% | 9.4219% |
| 4 µs | 23.6330% | 9.7540% |

All six exceed the original 5% spatial limit. Timestep, contraction,
positivity and conservation checks pass. Maximum relative ledger defects:
mass/species 3.29e-16, energy 1.92e-13, angular momentum 4.10e-14,
charge 4.60e-12. These are finite-grid differences, not known continuum errors.

One-variable 1 µs probes confirm neither correction alone is sufficient:
wall-only density/flow differences are 20.9734%/7.2939%; source-only values
are 21.0573%/7.2915%. They are diagnostic slices, not replacement gates.
Frozen initial source-rate comparisons show electrical forcing contracts more
closely than viscous heating/conduction; nonsmooth initial profiles and
mesh-dependent swirl prevent treating these source norms as a smooth exact
continuum error or a unique cause of the evolved failures.

Optical screening remains retrospective: 0/288 alternatives pass, with best
worst-point discrepancy 47.69%. Finest peak temperature is 617,829 K, outside
the prescribed neutral-argon transport reference range. Closed, adiabatic,
positively powered evolution cannot establish a steady experimental heat
balance merely by passing numerical gates.

## Reproducibility

All execution used one-thread, 1G safe-dev. Full-study snapshot:
`/work/project/v105-candidate04`; 90-file transfer SHA256
`3f171bf091ea8a29fb228fe149090140b58716ca0ad3fdb1b9e1d9e087440291`.
Prediction SHA256:
`8a3b67855f225648dfa8435056f469fdc82ab0ed4f332245f344dd7c5eb90ff9`.
The five-case producer exits 0; the unchanged evaluator correctly exits 1.
The finest case takes 1,189.95 s, 6,655 steps and 370,968 KiB peak RSS.
Source inventories are verified unchanged before and after execution.

The follow-up heat study tests a separate, reproduced thermal discretization
defect. Its results must be assessed independently; V105 is not relabeled as
a convergence success if a later method improves the outcome.

[Public source snapshots, raw fields, exact logs and checksums](https://github.com/noahsong-sdg/mass-spinner/releases/tag/v106-density-flow-refinement)
include the failed attempts and the separate thermal study. Current source
includes the reviewed wall-test packaging fix; the archived transfer manifest
identifies the exact earlier full-study snapshot.
