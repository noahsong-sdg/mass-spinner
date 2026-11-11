# Structure-preserving two-ion collision adaptation, v14

Prospective coordination contract, 7 November 2026 UTC. This is a new scientific
backend study, not a change to the deployed separator or its calibrated status.
The v13 plans, arrays, negative witnesses and failed gates remain unchanged.

## Demonstrated problem and chosen boundary

The traced v13 FE path interpolates positive nodal values into signed polynomial
PDFs. Resolved positive-field PETSc H increases survive a tighter function-norm
solve. Conserved scalar moments do not repair either failure. In simple terms,
correct totals can hide a moving or inadmissible distribution. A local rate
factor, clipping, a thermostat or subtracting an equilibrium residual would
change the problem without supplying the missing discrete identities.

The implementation team will qualify and reuse licensed source from
JuliaPlasma/CollisionOperators.jl at
`9874021c9edf030fdaa1f62e28c450d63acc361c`, especially its collision metric and
Gonzalez discrete-gradient construction. Its existing 2V/single-population spline
entropy path is not a drop-in 3V two-ion solver. The proposed adapter has full
Cartesian 3V velocities, unlike species masses, physical collision prefactors,
and positive Gaussian-mixture type-I entropy. Those are explicit method changes
requiring new validation. Author MATLAB and older C++ sources are useful primary
references; incomplete CPU paths, 2V geometry and absent licenses are not hidden
behind an upstream-code label.

## Physical and algebraic contract

- Physical masses 40 u and 84 u; charges +e; density 5e17 m^-3 per species;
  Coulomb logarithm 12; no fields, spatial transport, sources or collectors.
- Common-temperature control targets 5 eV. Initialization must declare whether
  this temperature belongs to unsmoothed markers or the smooth represented PDF.
  The known Gaussian energy/temperature offset is reported without renormalizing
  snapshots. The choice is frozen before the adapter's dynamics.
- Gaussian epsilon denotes variance in the implemented kernel. Species
  smoothing must satisfy `m_s * epsilon_s = constant`, with the normalization
  and full 3D measure exported. This does not prove a finite particle set is an
  exact Maxwellian equilibrium.
- The implemented finite-quadrature entropy gradient must differentiate that
  same scalar functional, including any terms not canceled by exact full-space
  integration. Directional finite differences precede acceptance.
- Pair mobility is symmetric positive semidefinite, with the unlike-mass
  momentum and quadratic-energy null spaces. The time update must use a
  compatible discrete gradient; midpoint alone supplies no general H theorem.
- Entropy inequalities require adequately solved implicit equations. Every
  iteration status, final residual and failed step is retained; no silent
  fallback, clipping, state projection or rerun with a looser physical gate.

## Unchanged acceptance budgets

The prior PETSc plan is pinned to SHA256
`cc45ee538d0faa176c321ff7e9eb3d92b542a1b783cd96233278aba0b6a68531`.
The independent gate reviewer maps its definitions to the new representation.

| Quantity | Existing budget |
|---|---:|
| Number, total energy, positive-scale momentum residual | 1e-8 each |
| Negative-number fraction | 1e-10; strict positivity separate |
| Maximum adjacent and cumulative H increase / fixed initial total number | 1e-8 each |
| Same-field entropy integration sensitivity / initial total number | 2e-10 |
| L1 drift / actual initial species number | 1e-3 |
| Evolution-increment refinement L1 at common short horizon | 2e-4 |
| L1 integration sensitivity | 1e-6 |
| Negative-fraction integration sensitivity | 1e-12 |
| Unequal-temperature initial rate relative error (v12 physical gate) | 0.02 |

Physical H means `sum integral F_s log(F_s/fstar) d3v` for a fixed reference and
the explicitly represented positive PDF. A type-I Gaussian functional may equal
H of that smooth representation; a type-II particle sum is different. Neither
establishes an unregularized Landau limit. Both raw and initial-subtracted
distribution comparisons are required across particle/smoothing refinements.
Short 50/100 microsecond sensitivities do not qualify a 500 microsecond history.
Unresolved quadrature, missing runs and insufficient refinement remain UNKNOWN.
An independent initial thermal-transfer-rate control is required in addition to
equilibrium tests, so a frozen or vanishing collision operator cannot pass.

## Execution, resources and review

First run a bounded upstream-core qualification and a small adapter cost pilot
(at most 64 markers/species, two steps, 120 seconds and 1 GiB RSS). Those are
feasibility studies, not the convergence campaign. A separate machine-readable
case plan must freeze particle/quadrature/smoothing/time parameters, actual
source identities, acceptance mapping and projected cost before that campaign.
Keep at most three solver workers, 1.5 GiB measured combined solver RSS, 200 MiB
exported campaign artifacts and 45 planned wall minutes. If the measured cost
cannot support the full ladder, retain the bounded executed evidence and mark
missing comparisons UNKNOWN; do not make unplanned repeated budget extensions.

All dependency installation, upstream execution, tests and scientific computation
run in distinct Apple safe-dev VMs. Host operations are reviewed edits, copies,
reads, checksums and inspection of returned artifacts. Source is a copy, explicitly
synced after edits. Export valuable data and check actual host hashes before
replacing a guest copy. No credentials, home directories or control sockets are
mounted. The main application final tests/typecheck/build remain a separate gate.

Reviewable changes are split into licensed upstream qualification/provenance,
the homogeneous 3V two-ion numerical adapter, and independent campaign/diagnostic
auditing. Each proposed PR must stay below 700 non-test lines; no PR is presumed
created in this non-Git workspace. Independent agents own the mathematical,
source-selection and actual-output gate reviews and must report evidence rather
than approve from a published theorem or a green test count.
