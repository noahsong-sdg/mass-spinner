# Secondary obsolete-tree cleanup

Completed 12 November 2026 local time, at `2026-11-13T01:43:55.814834+00:00`.
The user authorized removal of obsolete material. This bounded maintenance
removed 18 obsolete host targets after preserving all their contents in a
verified local archive outside the working tree. No VM, current renderer,
scientific backend, source seal, or benchmark input was removed.

The [execution receipt](secondary-cleanup-receipt.json) records every target,
initial and final open-file checks, archive identity, counts and completed state.
The [package provenance index](secondary-package-provenance.json) identifies
18 installed Python distributions, native application metadata, original
installer checksum files and tool license/version records. All original package
and native binary bytes are also archived; no package-only exclusion was used.

| Verified quantity | Result |
|---|---:|
| Removed target roots | 18 |
| Preserved original regular files | 10,700 |
| Original regular-file payload | 3,002,018,234 bytes |
| Original allocated file/directory blocks | 3,029,250,048 bytes |
| Deduplicated archive blobs | 6,270 |
| Archive file size | 1,169,014,311 bytes |
| Archive allocated blocks | 1,169,014,784 bytes |
| Allocated-block reduction after archive | 1,860,235,264 bytes (about 1.73 GiB) |

These are bounded file/block measurements. Filesystem free-space changes occurred
concurrently with other cleanup and cannot be attributed exclusively to this
operation; APFS sharing also affects physical free space.

## Removed roots

- `public/`, `downloads/`, and the untracked `separator-lab.html` prototype.
- `release-before-v21`, `v22`, `v23`, `v24`, `v25`, `v28`, `v29`, `v30`, `v31`,
  `v32`, `v33`, and `v34` (each name begins with `release-before-`).
- `.tools/blender-app`, `.tools/blender-python`, and `.tools/7zip`.

`.tools/blender36`, `.tools/atlas-venv`, `.tools/frontend`, current `release/`,
all native-tool VMs and the separately audited 34 historical generated-release
pairs were outside this operation's scope.

## Preservation and recovery

Authoritative local archive:

```text
/Users/noahs/.codex/archives/mass-spinner-v89-secondary-20261112/preserved-content.zip
SHA-256 65a914bdf554b6c42607a8875b47037dc81ba93c6416d8e449530b75118fbf35
```

This archive is local-only and is not a repository/public download. Its sibling
`receipt.json`, `package-provenance.json` and trusted `maintenance.py` retain the
maintenance details. The copied project receipt binds the maintenance source
SHA-256 `7593fc07ed3dea550cb7b52338ac315104f88c98a9043570b68b3dae44cd11d5`.

`MANIFEST.json` inside the ZIP maps every original project-relative path to its
kind, mode, nanosecond modification time, symlink target or regular-file
SHA-256/size, and base64-encoded macOS extended attributes. File bytes are stored
once under `blobs/<sha256>`. This includes differing old assets, user/source
files, installer provenance, code signatures and unexpected installed-file
modifications; nothing depended on an assumption that installed files were
disposable.

For recovery, first verify the whole ZIP SHA-256 and select one original target
prefix, such as `release-before-v24/` or `public/`. Create a **new** review
directory, create its recorded directories, write each regular file from its
`blobs/<sha256>` member and verify its size/hash, recreate reviewed symlinks,
then restore recorded modes, timestamps and extended attributes. Do not extract
over current source, releases or tools. Installed dependency metadata and
original checksum files can instead be used to reinstall the obsolete tool
version in an appropriate isolated environment.

Every unique blob was read back and SHA-256 checked, the ZIP CRC check passed,
and the archived manifest was read back byte-for-byte. Each source tree was
then independently inventoried again and required to match the archived
path/metadata/hash mapping immediately before removal. Candidate-scoped native
`lsof` checks reported no open handles both before capture and immediately
before each removal (18 initial plus 18 final checks). Host process inventory
also found no Blender/7zip renderer at the initial check.

The first maintenance attempt stopped before capturing file payloads because
this macOS Python lacks `os.listxattr`; no target was removed. Its receipt and
empty archive are retained as `attempt01-*` beside the final archive. The final
trusted standard-library routine reads macOS filesystem attributes through
Darwin's read-only `listxattr/getxattr` APIs; it runs no project/native solver
code. No application or benchmark result is inferred from maintenance checks.
