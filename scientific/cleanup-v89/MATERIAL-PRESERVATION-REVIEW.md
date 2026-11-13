# Material V38 preservation review

**Preservation passes; native retirement remains conditional on root's final
durability, idle-volume and ownership gates.** No VM or deletion was performed
by this reviewer.

Independent host-only streaming readback completed 13 November 2026 at
02:34:25 UTC, exit0. It imported neither the transfer controller nor scientific
code. The reviewed volume is `safe-dev-91df66bcebf94022`, stage
`/private/tmp/mass-spinner-material-v38-agent`.

| Retained evidence | SHA256 |
|---|---|
| External `independent-preservation-review.json` | `a9c97854edbfed974ec01caebe9b178014349cd78662d6f2ea64fca1d542cf62` |
| New `restore-manifest.json` | `5d152fcc7cde55833d40ca1b16f1440a9c7a6da0dd84d02c7564407dd3d077a4` |
| `verified-preservation-receipt.json` | `5112dc3e8f5447d5bf892b99742e62461228a4bbfa5f115927751f8113b9217d` |
| Complete before/after inventory | `11cf0e115297ef1301555307cfbace7e7a89f561b5c7ab990b0378756325e0de` |
| Existing raw backup manifest | `cbb3cbabd0df1a74fbe6c79f386fd8f87837b47db2251d9c9ad9e1e4208c2f9a` |

New evidence resides at
`/Users/noahs/Scientific Backups/material-v38-retirement-v89-20261113`.
Existing raw bytes remain at
`/Users/noahs/Scientific Backups/material-v38-v43-20261109`.
Both locations are necessary for complete recovery; neither is a disposable cache.

Verified all3,744 regular-file paths, sizes, SHA256 values, modes and recorded
mtimes: **6,542,419,673bytes**, plus611directories and9relative Node executable
symlinks. The exact complete guest inventory is unchanged before/after backup;
there are no blocked sensitive paths or omitted package directories.

Rehashed all160existing raw/input/log files and7metadata files. Independently
reopened all5new tar archives and2large-file chunks, checking compressed hashes,
complete membership, regular-file type, modes, decompressed file/chunk hashes
and assembled large-file hashes. The3,501additional unique payloads total
1,210,386,864bytes;162guest files reference verified existing backup content.
This preserves installed dependencies, source, binary and the historically
invalid derived archives without rehabilitating their scientific status.

The original safe-dev metadata and all three archived helper sources match the
executed controller `61312c1814294aea3c8897d5d05e35aa0cac6277e444bc08fa25d9d9ff8ee6dc`.
Current application/V88 benchmark execution does not require this historical
material VM; canonical scientific fixtures are untouched. Future historical
native execution requires restoring both payload locations into a new VM.

Before deletion, root must fsync every new backup file and directory (including
`blobs/`), record current conditional owner release, acquire the standard
per-volume lock, freshly require zero attachments and unchanged metadata,
then use only native `container volume delete` for this exact volume. Preserve
the metadata registration before removing it, and verify the final native
inventory, protected volumes and actual filesystem free-space delta.

These checks establish recoverability, not new material physics or experimental
accuracy. No other volume is admitted by this review.

