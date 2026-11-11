# v43 material-v38 evidence retention

## Current decision

T42-3's single-location raw preservation risk is **CLOSED: verified separate local backup**. All 5,330,275,010 raw bytes (5.33 GB) were copied, reread against original hashes, and independently reduced from the restored host backup. The original volume remains preserved and **ownership is not released**. No deletion, guest synchronization, volume replacement, or rerun is authorized. Original raw data remains authoritative; the earlier invalid derived archives remain invalid.

## Evidence checked in this pass

Read-only host inspection on 2026-11-09 reopened `raw-retention.json`, `readout.json`, `protocol.json`, `native-execution-receipt.json`, the v38 independent raw reducer, `FINITE-FILM-V38.md`, T42-3 in `v42-tooling.md`, the installed safe-dev README and launcher, and the exact original safe-dev state record.

The state record `/Users/noahs/.config/safe-dev/safe-dev-91df66bcebf94022.json` identifies:

- Canonical original stage: `/private/tmp/mass-spinner-material-v38-agent` (the existing `/tmp/mass-spinner-material-v38-agent` resolves here).
- Retained volume: `safe-dev-91df66bcebf94022`.
- Original imported source snapshot: `f50ae199ef879238abd60b1e4fd978f856b9151868b4cbbb74fa98355fac5f04`.
- Raw location: `/work/home/material-v38-raw/cases/<case-name>`.
- Exact eight output digests per case: `scientific/material-v38/readout.json`, pinned SHA256 `30f95fd2e5f7d520af465b9c1a0241979a6713d5b9d2ee1a79525d400792e927`.
- Original input identity: `protocol.json` and each corresponding `inputSha256` in the readout.

`df -h /Users/noahs` initially reported 77 GiB free on the Data filesystem, versus the recorded 5,330,275,010 raw bytes. The transfer control rechecked exact capacity before writing. Capacity alone was not accepted as evidence of raw integrity. Root exclusively executed the VM operations; the separate reviewer performed host-only metadata and full backup-byte readback checks.

## Problem, cause, and bounded correction

The lifecycle problem is that the unique native output has only one retained operational location. Technically, standard safe-dev export only snapshots `/work/project`, applies a 512 MiB regular-content bound, and cannot select the raw `/work/home` subtree. Historical archive attempts also exhausted host space and left known invalid compressed files. In simple terms, completed scientific work still depends on preserving one guest disk because the backup was never completed.

The completed correction copied the explicitly named original files to a separate durable host directory, `/Users/noahs/Scientific Backups/material-v38-v43-20261109`. `scientific/audit-v43/material_backup_control.py` is a narrowly scoped host data-transfer control; it never imports or executes project code on the host. It invoked the unchanged safe-dev launcher against the canonical original project only, offline. Guest helpers opened only explicitly allowed regular files, rejected symlinks, and read the raw evidence without writing to the retained volume. All non-energy files fit in one checked bounded tar stream. Large energy-loss files were read in at most 256 MiB chunks, each in a separate invocation; no launcher cap or isolation setting was weakened.

The control checks host capacity for every inventoried byte plus a transfer chunk and a 1 GiB reserve, creates a new destination without overwriting an existing backup, flushes transferred data with `fsync`, and rereads each completed file to check its original digest. The 16 process logs receive new backup digests because the original input/output identity map does not prescribe their digest. An explicit manifest binds all 160 files (128 native outputs, 16 inputs, 16 process logs), sizes, digests, and copied metadata.

This approach was chosen because it preserves original bytes, isolates all project computation, bounds each transfer, avoids another 5 GB archive/restored duplicate, and changes neither application behavior nor safe-dev itself. Recompressing the known invalid archives, enlarging a global export cap, rerunning simulations, mounting a host directory, or replacing the original guest source would introduce unnecessary uncertainty or a broader operational change.

## Restore gate

After the initial transfer, a separate invocation of the host control's `verify` command reopens the backup, requires the exact manifest-complete file set, rereads every file and metadata digest, then streams those restored host bytes into the existing offline VM. The standalone guest-only `material_restore_reducer.py` checks all original output and input hashes independently, the 16 incident partitions and endpoints, projectile energy balances, all 64 Wilson intervals, eight sampling comparisons, and the recorded public translation. It imports neither producer reducer nor translator and writes nothing into the retained volume. Missing, extra, truncated, or digest-mismatched evidence fails before a successful receipt is written.

Successful evidence is `restore-manifest.json`, `independent-restore-reducer.log`, and `verified-backup-receipt.json` in the separate backup directory. Their small evidence copies, plus the pre-transfer inventory, are retained in `scientific/audit-v43/material-backup/`. A manifest, a gzip file, a successful transfer process, or an in-process hash alone would not close the gate. The completed restore verification receipt and independent reducer close T42-3's single-location raw preservation risk. Success does not authorize retiring the guest; ownership release remains false.

## Execution and result

Root reviewed and executed both controls unchanged, with serialized operations against the original volume:

- `material_backup_control.py backup`: root session `13042`, exit **0**.
- `material_backup_control.py verify`: root session `65875`, exit **0**.
- Exact host-control SHA256: `960c7658a5c6395e239b40b23a982ad63533eb73ef5cbb2d5f2f995acfb6da06`.
- Exact standalone guest-reducer SHA256: `de159bdfe9b83e3157f65276609850e07916253911d8c89ebfc6939582b5a09a`.

The reopened manifest records **160 restored files**, including **128 native outputs** totaling **5,330,275,010 bytes**, **16 original inputs**, and **16 process logs**. Root's verification reread and checked the original raw/input digests. After root's successful run, a separate reviewer again enumerated the complete backup file set, reopened and SHA256-hashed every one of the 160 restored files, checked every size and backup digest, and independently matched all **144 original output/input identities** against the original readout. That trusted host-only data readback exited **0** (reviewer session `45535`).

The independent guest restore reducer consumed bytes streamed from the host backup, not the original raw directory. Its reopened log shows **16 passing cases**, **128 original native-output digests**, **16 original input digests**, **64 Wilson intervals**, **eight refinement comparisons**, **5,330,275,010 raw bytes**, passing public translation, **no guest writes**, and **ownership not released**. The receipt records reducer exit **0** and a second original-hash read verification. These checks validate preservation and the existing recorded public summaries; they do not add material calibration, a qualified live retention kernel, or a new physical result.

Reopened evidence hashes:

| Evidence | SHA256 |
| --- | --- |
| `restore-manifest.json` | `cbb3cbabd0df1a74fbe6c79f386fd8f87837b47db2251d9c9ad9e1e4208c2f9a` |
| `verified-backup-receipt.json` | `2e754c792adf07b3a4526de2ddcd4494868c3f050214d4e941c8c77f5e69a2d6` |
| `independent-restore-reducer.log` | `36528d27782de2fa32f40590d40f338d96f16bb54c12e8c572f2ecd1b4d1f5d8` |

The appended `currentBackup` block in `scientific/material-v38/raw-retention.json` records the verified current state while retaining the November 8 historical failed-transport and invalid-archive fields. No original raw file, failed archive status, or ownership restriction was removed. The remaining retained-volume lifecycle boundary is explicit: **preserve `safe-dev-91df66bcebf94022`; no owner release has been given**.
