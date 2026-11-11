# Recorded research-moment packet — v19

The Level 4 viewer can select three actual offline Julia histories and their
saved times. The packet does not execute a solver, change a physical input,
recompute moments, or upgrade any scientific qualification.

## Selection and scope

`web-assets/research-recordings.json` contains all 21 saved accepted states from
each of `drift-n6-q5-a010`, `anisotropy-n6-q5-a010` and
`combined-n6-q5-a010`: 63 states spanning 0–100 µs in 5 µs steps.
These are homogeneous field-free 40/84-u two-ion benchmarks, with n=6 Gaussian
nodes per axis (216 markers/species), q=5 cubature nodes per axis and alpha=.1.
Density is 5e17 m^-3 per species; charge is +e; fixed Coulomb logarithm is 12.
Named drift/anisotropy cases also retain unequal 2/10 eV thermal energies.

The packet copies means and full 3x3 species temperature tensors directly from
the producer's saved history invariants. No raw velocity integration, fit,
interpolation, entropy estimate or new collision solve is performed. The
temperature tensor includes the fixed Gaussian variance and is centered on
each species' own mean. Means remain normalized by the saved
V0=3472.847033714796 m/s, defined by sqrt(5 eV/(40 u)); tensor entries are eV.
The packet retains original source/metadata/history/audit hashes and the
original independent audit seal digest. Its paths identify retained local
evidence; the full scientific archives are not published by this packet.

These coarse representations remain physically unqualified. Their moment
curves are not D/T target calculations, separator trajectories, a model of
Marathon's machine or confirmation of the correct full velocity distribution.
No physical-H values are included. Recorded-time selection must not be described
as rerunning a simulation or solving for arbitrary intermediate inputs.

## Interface contract

Schema version: `mass-spinner-recorded-moments-v1`.

| Field | Meaning |
| --- | --- |
| kind | `recorded-offline-data` |
| scope / limitations | Applicability and qualification limits |
| units / normalization | Coordinate order, physical scales and tensor definition |
| species | Fixed 40/84-u ion labels, masses and charge states |
| provenance | Original audit seal, exporter hash and selection policy |
| cases[].id / scenario / label | Stable selected case and descriptive name |
| cases[].config | Saved initial setup, n/q/alpha, dt, horizon and physical normalization |
| cases[].source | Original file paths, SHA256 identities, producer/audit source and plan hashes |
| cases[].status | `WITHHELD` qualification plus unchanged saved audit gates |
| cases[].states[].step / timeS | Saved accepted index and seconds |
| cases[].states[].means | Two Cartesian 3-vectors, in V0 |
| cases[].states[].temperatureTensorEV | Two full 3x3 temperature tensors, in eV |

## Execution boundary and exact commands

Trusted host file operations copied only nine selected scientific JSON/JSONL
files, the original seal and five pinned producer source files into a new
source-only directory. None of the pinned Julia source was executed.
The distinct safe-dev guest was `safe-dev-74a9aea4fb0a1da0`, identified by
`/private/tmp/mass-spinner-recordings-v19`. Network remained disabled. No host
home, credentials, signing material or control sockets were mounted.

Commands run, in order:

```sh
/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-recordings-v19 init
/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-recordings-v19 run -- python3 export_recordings.py
# First export failed: the copied snapshot does not retain an empty output directory.
# Changed only the exporter writer to create its output parent. No result existed.
/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-recordings-v19 sync --replace-guest
/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-recordings-v19 run -- python3 export_recordings.py
/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-recordings-v19 run -- python3 validate_recordings.py
/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-recordings-v19 export /tmp/mass-spinner-recordings-v19-verified-export
/Users/noahs/.local/bin/safe-dev -C /tmp/mass-spinner-recordings-v19 status
```

Final copied snapshot: 17 files, 6,507,224 bytes; safe-dev source digest
`194d74907f7fd5d9954cf7e294b54373fb9898258fdbca5c0429d2b546ce3704`.
The exact tested source/input map is retained as
`scientific/research-recordings-v19/output/tested-source-map.json`, SHA256
`6b1b08472d5981cd34afed92dd99d3be2a72e764a4fd51c76f9449524220e805`.
The retained export contains the exact final exporter, independent checker,
selected immutable input copies, output and validation result.

The writer failure was an export-directory assumption, not a numerical issue:
the VM copy contains files, so an empty host output directory was absent.
Creating the writer's parent is the narrow fix; it changes no source physics,
inputs or exported values. No valuable guest result existed before the sync.

## Validation and actual exported identities

The standalone checker imports no exporter functions and performs no numerical
physics. All 1,575 exported floating scalars (time, six mean components and 18
tensor entries per state) match original saved values bit-for-bit after JSON
round-trip. It also compares all steps, setup values, normalizations, status
records, expected case/state membership and file/source hashes.

Six checks PASS: actual packet; changed saved mean rejection; missing state
rejection; stale case rejection; wrong velocity normalization rejection; and
improperly upgraded qualification rejection. These are integrity checks, not
new physical qualification. The original audit seal binds each selected input;
this subtask checks those members, not all original sealed files.

Actual exported packet: 106,941 bytes; SHA256
`82b0cddac960f5260bf1ba090c59382cea1635afc4d2a259e6102d84137b6f5d`.
Exporter SHA256:
`cf4c24bf90e673d43c701c50b184b30e60feb65684b59e9abc141736da49c1e6`.
Checker SHA256:
`e90563e901a1f8643e96be30fa47838df32165a19dd0052d5fb7801875c4bf1e`.

After export, trusted host `cmp` checked all nine input JSON/JSONL copies, all
five pinned source files and the original seal against the canonical scientific
files. All were identical. `cmp` also confirms the public packet equals the
actual exported packet; host SHA256 checks match the guest output identities.
Only the JSON packet enters `web-assets/`. Original scientific files are unchanged.

No application code, scientific solver, dependency installation, tests/build
for the full frontend, live browser or GPU verification was run in this subtask.
The parent's interface implementation must pass its own final application gate.
