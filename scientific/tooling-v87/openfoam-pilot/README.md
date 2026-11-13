# OpenFOAM 14: verified rootless serial installation

12 November 2026, local date (guest logs use 13 November UTC). The unchanged
upstream `tutorials/fluid/cavity` completed all 100 steps to 1 s on its
20×20×1 mesh. `foamRun -help`, `blockMesh -help`, `blockMesh`, `checkMesh` and
`foamRun` all exited zero; the mesh check reports `Mesh OK`.

**Scope:** installation/runtime feasibility only. This example is compressible
air with its upstream RAS turbulence model, moving lid and thermal boundaries.
It is not a matched neutral-Ar, axisymmetric-swirl, Hall, stress-work,
experimental or convergence validation. Parallel execution was not tested.

## Exact environment and provenance

- Separate project: `/private/tmp/mass-spinner-openfoam-v87-20261112`; guest
  identifier `safe-dev-f5ca2e0a435a6e1a`. The parent's active scientific project
  and volume were not operated on.
- AArch64 Debian 12, glibc `2.36-9+deb12u14`, Python 3.11.2, UID/GID 1000;
  safe-dev limits 4 CPUs/4 GiB and a 12 GiB volume. No host mounts, sudo,
  modified system image, nested runtime or downloaded replacement glibc.
- Official Foundation Jammy ARM64 package `openfoam14_20261008_arm64.deb`,
  build `14-a4867fc914c1`, 122,097,302 bytes. SHA256:
  `a0867f4f6509460315921629cea44620f9f9ca3f59591d93009d5e9cd2927ea6`.
- The Foundation key was obtained over HTTPS from its official origin. `gpgv`
  verified `Release.gpg` against `Release`, with fingerprint
  `678184F120A87A475F6569726C0DAC728B29D817`. Then SHA256 of `Packages` was
  checked against that signed Release, and the package against its entry.
  This records an official-origin key trust bootstrap, not a separate
  independently authenticated key exchange.
- [Download/verification receipt](evidence/receipt.json) records every exact
  URL, hash, byte count and command. [Signature log](evidence/repository-signature.log)
  and [authenticated repository metadata](evidence/authenticated-metadata/)
  are retained. [Executed-source hashes](evidence/executed-sourceSHA256.json)
  cover the two harnesses, package environment files and core binaries.
- [Original upstream inputs](upstream-initial/) are retained separately from
  the [actual run case and output](fluid-cavity/). Every original input hash
  and exact run command/environment appear in the
  [smoke receipt](evidence/smoke-receipt.json). No initial input was modified.
  Upstream files are GPLv3; [the package license](evidence/OpenFOAM-COPYING)
  is included.

## Failure, cause and fix

Directly sourcing the extracted package's `etc/bashrc` failed: the Debian
package hardcodes `/opt`, and its configuration scripts were consequently
looked up outside the user-owned extraction prefix. See the retained
[failed initialization log](evidence/environment-smoke.log). In plain terms,
the installed files were present but the startup script searched the wrong
directory. The initial bare `ldd` also lacked the OpenFOAM library path.

[The smoke harness](smoke.py) explicitly sets project-local executable/library
and OpenFOAM configuration paths. It selects the **upstream serial dummy
Pstream library** shipped in the signed package. This is a supported serial
library, not an improvised MPI implementation. The resulting
[loader-resolution log](evidence/serial-smoke.log) resolves the required
libraries to the guest system or extracted package. No binary, package source,
system loader or sandbox setting was patched. This was the smallest fix for
the demonstrated path problem; installing MPI or changing the runtime image
was unnecessary for serial execution.

## Checks and resource evidence

[The downloader/extractor](pilot.py) ran online only for official downloads;
the smoke ran offline. The actual command sequence used the exact project
path above:

```text
safe-dev -C PROJECT init
safe-dev -C PROJECT sync --replace-guest
safe-dev -C PROJECT run --online -- python3 pilot.py
safe-dev -C PROJECT run -- python3 smoke.py
safe-dev -C PROJECT export NEW_EXPORT_DIRECTORY
```

The source snapshot at execution is the exported `pilot.py`/`smoke.py` pair
bound by `executed-sourceSHA256.json`. The second script was written into the
guest before running; no project script ran on the host. The downloader
selects the newest signed `openfoam14` entry: historical replay must use the
recorded metadata/version/hash, rather than assume a later repository still
selects this package.

- [Mesh generation](evidence/smoke-2.log): 400 cells, 882 points, 1,640 faces.
- [Mesh validation](evidence/smoke-3.log): `Mesh OK`, exit zero.
- [Full upstream run](evidence/smoke-4.log): reaches 1 s and `End`, exit zero;
  measured subprocess wall time about 0.173 s. This tiny case is not a
  performance prediction for our model.
- Harness child peak RSS: 128,600 KiB (includes the command sequence, not a
  separately sampled per-solver memory trace). [Disk usage](evidence/disk-usage.log):
  whole writable volume 814 MiB used; ample capacity for this small smoke.

Regenerable package archives and extracted tools were moved under guest
`.cache` after the run and excluded from export; guest-local symlinks preserve
their original paths. Three new, non-overwriting exports were made. The final
reviewed export was `/private/tmp/mass-spinner-openfoam-v87-evidence-20261112-03`
and is the source of this folder. Original inputs, computed fields, failed and
successful logs, signed metadata and receipts are retained here; no unique
scientific data was discarded.

Next: a separately specified laminar monatomic-Ar wedge/swirl and stress-energy
comparison, with refinement and budgets. This smoke does not waive V86's
failed convergence gates or supply its missing plasma thermal closure.
