# Native OpenFOAM neutral-fluid controls

Executed offline in the dedicated Apple safe-dev guest on 12 November 2026:
**13/13 native cases completed, 86/86 frozen audit gates passed, 4/4 helper
tests passed.** These are two independently verified smooth, constant-property
neutral-Ar operators. They do not establish experimental agreement, qualify
V86's coupled Hall release, or change the live playground.

| Fixed test | Actual result |
|---|---:|
| Adiabatic conduction, final relative RMS, 8/16/32 meshes | 0.875 / 0.276 / 0.135% |
| Low-Re swirl, final relative RMS, 8/16/32 meshes | 1.464 / 0.401 / 0.108% |
| Heat timestep differences, 64→128 / 128→256 | 0.0968 / 0.0486% |
| Swirl timestep differences, 64→128 / 128→256 | 0.0156 / 0.00779% |
| Finest swirl wall-torque budget defect / angular loss | 0.00196% |
| Finest swirl stress/BE-defect budget / kinetic loss | 0.1543% |
| Maximum heat inventory drift | 1.56e-15 |
| Halving wedge angle: heat / swirl field change | 0.00967 / 0.00335% |
| Half-amplitude normalized swirl difference | 3.98e-14 |
| Peak meridional speed / imposed amplitude | 2.03e-7 |

The physical clock is 0.412829 ms. Native Foundation14 `laplacianFoam`
solves fixed-density internal-energy diffusion with alpha=k/(rho Cv), while
`foamRun -solver incompressibleFluid` solves laminar full Navier–Stokes at
amplitude Reynolds number 1e-4. Advection and centrifugal terms remain enabled;
the comparison solution is explicitly linearized Stokes flow. Mechanical
dissipation is a ledger, not an evolved thermal field. Density is a synthetic
uniform control input. The [prospective protocol](PROTOCOL.md) states all
equations, assumptions and thresholds; none were changed after predictions.

Actual native executables, cell geometry, wall forces and velocity gradients
are used. NumPy2.3.5/SciPy1.16.3 only initialize Bessel eigenmodes and independently
score outputs. Python3.11.2; native serial dummy-Pstream execution; maximum
child RSS185928 KiB. Binary and source SHA256 seals are in
[predictions](results/predictions.json), with each [audit gate](results/audit.json).
Official package authentication, LGPL/GPL notices and installation evidence
remain in [the V87 pilot](../../tooling-v87/openfoam-pilot/README.md), including
the complete upstream COPYING file. No upstream implementation is vendored here.

Three failed integration attempts are retained separately with original source
snapshots and raw evidence. First, the upstream volume function writes `Vc`,
where the adapter expected `V`. Second, the transient native momentum solver
requires `UFinal`; adding `UFinal {$U;}` selects the already specified tolerance.
Third, native forces include the initial t=0 row. The reporter now checks every
force timestamp against saved fields and integrates only BE right endpoints;
a regression test rejects missing/misaligned clocks. In simple terms, these
were disagreements about native file names and reporting conventions, fixed
by using the documented/native interface rather than replacing its equations.
No physical parameter, boundary condition or gate was tuned.

Reproduce **inside the dedicated guest**, with the authenticated V87 prefix at
`/work/project/tools/opt/openfoam14` and the recorded Python helper environment:

```sh
cd /work/project/v88-openfoam
../.venv/bin/python -m unittest -v test_reference88
../.venv/bin/python reference88.py
../.venv/bin/python audit88.py
```

Public evidence includes exact initial native dictionaries/mesh/fields in
`INITIAL-INPUTS.zip` (254 files, 2261434 bytes), a per-file hash manifest,
all final metrics/histories, source/binary seals and failed-attempt snapshots.
The compact-input check binds 247 files directly to recorded pre-solver hashes;
the remaining seven are native `gradU` diagnostics written at initial time.
**Raw evolving fields are retained locally, not included in this repository.**
`LOCAL-RAW-RECEIPT.json` identifies the authoritative local export and confirms
all 29 original ZIP hashes (452082880 bytes). `ARCHIVE-PACKING.json` also records
an optional lossless XZ experiment with verified original-ZIP roundtrips;
neither those large ZIPs nor packed copies are public downloads.

The local reviewer can run `audit88.py` against the authoritative export, whose
original ZIPs are present. A public reader must execute the native producer
above to regenerate raw fields, then run the auditor. Run in a fresh directory:
the source/protocol seals and numerical gates are fixed, but regenerated ZIP
byte hashes can change with archive timestamps; each new packet records its
own actual hashes. Do not overwrite the retained original evidence.

The next useful comparison is to run V86's own scalar/stress operators on these
same initial conditions and boundaries. Then extend the independent reference
to a matched compressible stress-work release; the present controls do not
silently stand in for either task.
