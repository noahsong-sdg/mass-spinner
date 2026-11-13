# Material V38 volume retirement: bounded preservation procedure

Prepared 13 November 2026 UTC. This is a procedure, not an executed guest
inventory or retirement. No VM was launched and no volume was deleted.

**Later execution:** root completed this procedure, independent preservation
review and native retirement on 13 November. The original preparation statements
below describe the earlier state. See [preservation review](MATERIAL-PRESERVATION-REVIEW.md)
and [final native receipt](material-retirement/retirement-receipt.json).

## Exact candidate and ownership

- Volume: `safe-dev-91df66bcebf94022`.
- Safe-dev stage: `/private/tmp/mass-spinner-material-v38-agent`.
- Original metadata snapshot: `f50ae199ef879238abd60b1e4fd978f856b9151868b4cbbb74fa98355fac5f04`.
- Existing separate raw backup:
  `/Users/noahs/Scientific Backups/material-v38-v43-20261109`.
- Its `restore-manifest.json` SHA256:
  `cbb3cbabd0df1a74fbe6c79f386fd8f87837b47db2251d9c9ad9e1e4208c2f9a`.

The prior owner-release flag is false. The current root must explicitly record
a new retirement decision after the following preservation gates; historical
documents must retain their original meaning. The current cleanup request
does not prove that an unattached volume has no new results.

Today's host-only readback independently checked all 160 raw/input/log files
against that exact manifest: 5,330,288,706 bytes, including 5,330,275,010 native
raw-output bytes. All seven preserved metadata hashes match. A previous
independent restore reducer passed; this is not a new scientific rerun.
Guest contents outside those 160 files have not yet been inventoried.

## Serial execution and inventory

Wait for the root-owned benchmark slot. No direct runtime launch, parallel
mount, sync or replacement is permitted. Parse fresh
`container list --all --format json` attachment metadata and require no container
attachment to this exact volume. Check that its safe-dev JSON mapping still
names the exact candidate stage and original source hash. Preserve the metadata
file byte-for-byte in the eventual backup.

Run a reviewed standard-library-only inventory helper through:

```text
/Users/noahs/.local/bin/safe-dev --memory 2G -C /private/tmp/mass-spinner-material-v38-agent run -- python3 -I -c INVENTORY_SOURCE
```

The helper must walk only `/work/project` and `/work/home`, without following
symlinks. Record every directory's relative path/mode; every symbolic link's
path/target; every regular file's relative path, mode, size and streaming SHA256.
Reject special files and unreadable paths. Reject sensitive paths before
opening their payloads: credential/config/key files are not backup candidates.
Report that rejection and retain the volume. Hash with <=1 MiB read buffers;
never load a multi-gigabyte raw file into memory. Include raw case files,
installed environments, caches, upstream trees and old failed archives. Do
not infer disposability from `.venv`, `target`, `cache` or `build` names.
Require stable file stats around hashing and a bounded JSON manifest size.

Expected evidence: fresh inventory JSON with UID1000/Linux, source stage/volume
identity, UTC start/end, explicit roots and source-helper SHA; launcher exit0.
A caught read failure is not a successful inventory.

## Preservation plan and chunked transfer

Create a new durable host destination, e.g.
`/Users/noahs/Scientific Backups/material-v38-retirement-v89-20261113`.
Refuse an existing destination. Compare inventoried regular-file SHA256/size
against the fully reread 160-file backup; deduplicate identical bytes by
content, retaining explicit restoration references to the existing backup.
Preserve every additional unique regular-file payload, even if it appears to
be an installed package. This avoids requiring an assumption about whether
unknown environment files are scientific data.

Pack unique small files into deterministic GNU-tar batches whose complete
streams, including conservative header/padding allowance, are at most256MiB.
Each batch uses one safe-dev invocation; the admitted file list is supplied on
stdin. Host trusted code simultaneously compresses the stream and checks every
member path/type/mode/size/SHA256. Reopen the saved archive and repeat those
checks. Files too large for a batch use at most256MiB chunks, with the same
safe-dev boundary and offline mode:

```text
/Users/noahs/.local/bin/safe-dev --memory 2G -C /private/tmp/mass-spinner-material-v38-agent run -- python3 -I -c CHUNK_SOURCE RELATIVE_PATH OFFSET LENGTH
```

The reviewed helper accepts only manifest-admitted paths beneath the two fixed
roots, rejects symlinks in every path component, opens with O_NOFOLLOW, checks
regular-file type and expected size, validates offset/length, and streams <=1 MiB
blocks. Record each command/exit and returned byte count. Host trusted transfer
code compresses each batch/chunk and fsyncs it. Record compressed archive
SHA256, complete batch-member maps, decompressed chunk SHA256/size and each
large file's ordered chunk map. Repeated identical file payloads need one
archive member or blob sequence. This avoids a VM boot for every small
installed file.

Do not export raw LXCat or unrelated data; this exact material volume is the
only admitted scope. Do not read/export credentials if discovered. Do not
delete known-invalid derived archives merely because original raw is backed
up: preserve their bytes or leave the candidate unretired.

## Independent restoration and final gate

1. Reopen every new compressed batch/blob; require exact member inventories,
   decompress and verify file or chunk sizes/hashes.
   Reconstruct each full additional file as a streaming concatenation and
   require the original inventory size/SHA256. Resolve every old-backup
   reference and freshly rehash its size/content. Verify complete path
   membership and directory/link/mode restoration metadata. Reject missing,
   extra, truncated or substituted blobs.
2. Repeat the exact read-only full guest inventory. It must equal the first
   inventory's path/type/mode/size/content map. A newly created result or
   changed source invalidates the retirement plan.
3. Preserve the original safe-dev metadata, both inventories, helper sources,
   exact command logs, complete restore manifest and independent readback
   receipt. The receipt must account for every guest file, not only native
   raw cases. No package exclusions are necessary if all extra bytes are
   preserved.
4. Root records current ownership release and retirement eligibility. Acquire
   the standard per-volume lock nonblocking; recheck no attachments and
   unchanged mapping/metadata immediately before the native operation.
5. Only then use native `container volume delete safe-dev-91df66bcebf94022`.
   Never unlink/truncate `volume.img`. Remove the stale safe-dev registration
   only after native deletion succeeds, with its original bytes retained.
6. Fresh native inventory must prove this exact volume absent and protected
   volumes unchanged. Record actual Data-filesystem free bytes before/after;
   do not call image allocation the actual reclaimed amount.

The CLI command in step5 is conditional and not executed by this procedure.

## Other candidates: no deletion admission

- `safe-dev-d53fa8311a7066e4`: grew from1.32 to11.58GiB as later
  thermal/centrifuge studies used `/work/home/fix-v43-source`. No complete
  backup/current dependency inventory was found. Highest potential return,
  but requires a fresh guest inventory and preservation of later results.
- `safe-dev-f5e3965510847418`: authenticated deployment environment,
  still referenced by publication controls and a11November docs deployment.
  Preserve credentials and its working deployment capability; potentially
  deduplicate old checked release copies separately.
- `safe-dev-9c077b4be6956308`: the previous archive attempt explicitly failed
  because preserved content exceeded512MiB. Four large out-of-regime negative
  control raw files remain assigned to
  `/work/home/mass-spinner-rustbca-v23-negative-control-raw`; their exact
  hashes are in `scientific/stopping-reference-v23/results/archive-scope.json`.
  No complete separate raw backup was found. Retain pending chunked backup.
- `safe-dev-e1d20fcb54e3cb9b`: retained for previously unreadable proof
  inodes; old geometry and drive render controllers reference its installed
  Blender. Host historical exports preserve many assets but do not establish
  recovery of every unreadable guest path. Retain.
- `safe-dev-0b0443eadcbe4bd8`: newer public scientific environment has
  recorded filesystem corruption and many later study runtimes. A current
  app source copy is not a complete guest-result backup. Retain pending an
  inventory that explicitly records read errors and independently recovers
  every valuable unreadable result.
- The legacy orphaned read-only depth-export VM was stopped by root only after
  its original owner confirmed release; its depth volume remains intact. See
  [the separate stop receipt](orphan-export-stop.json). Every active V88/native
  benchmark environment remains protected. No running scientific job may be
  stopped for this cleanup.

These findings use safe-dev host mappings, project/source references, prior
backup receipts and today's full host-backup readback. They do not establish
the present guest state or fresh ownership of other chats.

