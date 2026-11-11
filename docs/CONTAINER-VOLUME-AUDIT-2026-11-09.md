# Container volume audit — 2026-11-09

Read-only investigation. No volumes, files, raw results, or caches were deleted, trimmed, compacted, synced over, or exported for retirement. No running jobs were stopped. Inventory captured at 2026-11-09 08:41 Pacific (16:41 UTC).

## Current allocation

| Scope | Volumes | Host allocated GiB |
|---|---:|---:|
| All Apple Container volume images | 198 | 109.531 |
| Mass Spinner temporary stages | 138 | 62.683 |
| Mass Spinner canonical scientific backends | 32 | 28.157 |
| All Mass Spinner volumes | 170 | 90.840 |
| Other projects | 28 | 18.692 |

The reported **63 GiB across 138 Mass Spinner volumes** counts the temporary staging directories. Another 32 volumes map to scientific subdirectories of this project, so the full Mass Spinner allocation is larger.

Method: join `container volume ls --format json`, safe-dev's project mapping records, host `stat.st_blocks * 512` for each `volume.img`, and current container attachment metadata. All 198 images were registered and mapped to existing host project directories. The 12 GiB logical capacity of each sparse image is not its current host allocation: the combined logical size is 2376 GiB.

Host allocated-block totals are not a verified reclaimable total. APFS shared extents, snapshots, live guest files, filesystem overhead and discarded guest blocks affect how much a deletion or compaction would actually release. Free space at the start of inspection was approximately 8.43 GiB according to `df`.

## Largest allocations and sampled contents

| Volume / project | Allocated GiB | Observed contents / disposition |
|---|---:|---|
| `safe-dev-81e6bf2e56586564` — flux-pinning mesh-time stage | 10.618 | Guest filesystem reports 10.39 GiB used. `/work/project/.venv/full-qualification` alone is 4.78 GiB; scientific run directories also occupy substantial space. Do not assume `.venv` means disposable dependencies. |
| `safe-dev-91df66bcebf94022` — material v38 | 6.250 | 4.965 GiB under `home/material-v38-raw/cases`, plus 0.948 GiB of material archives. Raw-result recoverability was not reverified; retain. |
| `safe-dev-e6ee51fc540e8bfb` — renders v21 | 6.104 | About 1.70 GiB of Blender installation under guest home. Guest filesystem reports 1.809 GiB used, versus 6.104 GiB allocated to its image: 4.294 GiB more host allocation than guest reported use. Candidate for investigating supported discard/compaction, not a guaranteed saving. |
| `safe-dev-b89183ad2d06c667` — neutron v38 | 3.948 | 2.776 GiB under `project/.cache/mamba`; OpenMC environment about 0.228 GiB. Cache is the first plausible content-cleanup candidate after confirming it contains only recoverable packages. No files were removed. |
| `safe-dev-2baa634a3023e027` — FEL transport | 2.897 | Another research project's volume; contents and ownership not qualified for cleanup. |
| `safe-dev-1548cb547e3e8373` — scientific/petsc | 2.820 | Project contains retained equilibrium and two-ion results. Only project-level directory sizes were sampled; guest home and complete recoverability not audited. |
| `safe-dev-dbe256ff23753745` — scientific/petsc-distribution-v12 | 2.617 | Scientific backend, no content-retirement review. |
| `safe-dev-9c077b4be6956308` — RustBCA v23 | 2.288 | Earlier scientific backend/tool stage, no content-retirement review. |
| `safe-dev-fe50d03f2b59691b` — scientific/julia | 2.096 | Scientific backend/tool stage, no content-retirement review. |
| `safe-dev-03cb133e6ecc3d96` — scientific/warpx | 1.971 | Scientific backend/tool stage, no content-retirement review. |

The largest temporary stage groups are v38 (14 volumes, 14.527 GiB), v21 (4, 6.925 GiB), v35 (11, 6.028 GiB), and v23 (7, 3.767 GiB). Version groups are inferred from their staging-directory names; names alone do not establish completion, obsolescence, or recoverability.

## Why usage accumulated

Verified launcher behavior: the exact absolute project path is hashed into a volume name. Every new staging directory therefore receives a distinct persistent volume. `run --rm` removes the ephemeral container, while the project volume and `/work/home` dependency/tool caches persist.

The 138 temporary Mass Spinner records total only 3.150 GiB of original imported source files; the images currently allocate 62.683 GiB. That difference includes later installed dependencies, toolchains, computed results, retained source copies, filesystem overhead and blocks no longer used by live guest files. It is not evidence that all of the difference is disposable cache.

The render sample directly demonstrates a large allocated-image versus live-filesystem disparity. It does not prove every image has the same disparity. The flux-pinning sample demonstrates the opposite: its large allocation mostly corresponds to guest filesystem use.

## Active use and preservation boundaries

At inventory time, container `45ceab65-e51c-487b-89a5-973927618825` was running an export against `safe-dev-d1fcc58287ea69d9`, mapped to `/private/tmp/mass-spinner-depth-v38`. It was not interrupted or inspected by mounting its volume elsewhere. Running attachment metadata can change after this snapshot.

The absence of a running attachment does not establish that a volume is abandoned. A stopped research stage can still be required by an active chat or hold unique results. No per-volume chat-owner reconciliation or complete backup/export comparison was performed for the other 197 volumes, so **no volume is approved for deletion by this report**.

Preserve the current v41 verification and deployment stages, the geometry stage, material raw results, scientific convergence evidence, and the active depth export pending any separate retirement review. The inventory is an allocation map, not a disposal manifest.

## Next cleanup work, if requested

1. Review recoverable package caches first, starting with the sampled 2.776 GiB mamba cache. Check adjacent generated data before deleting anything named `cache`, `.venv`, `build`, or `target`.
2. Verify an export/backup and investigate supported compaction or recreation for the render image's 4.294 GiB allocation disparity. Do not edit or truncate `volume.img` directly.
3. Retire old temporary stages only after reconciling the owning chat, active jobs, unique guest source/results and reproducible dependencies. Compare complete export manifests before deletion, including results outside `/work/project`.
4. Reuse a small number of named testing/rendering/backend stages going forward; preserve valuable guest edits before replacing any guest source.
5. Measure `df` after each authorized cleanup batch. Report actual free-space changes separately from summed file allocations.

## Checks and retained evidence

- Fresh daemon volume inventory and container attachments; 198 registered images mapped.
- Host allocated-block measurements for every image.
- Offline safe-dev directory-size inspection of renders v21, material v38, neutron v38, PETSc, and flux-pinning mesh-time stage. No source sync or dependency installation.
- Guest `df` for render and flux samples. The corresponding root `du` commands returned exit 1 only because unprivileged UID 1000 cannot read `lost+found`; the permission error is retained rather than ignored. Other sampled content scans returned exit 0.
- Separate safe-dev isolation check: **PASS**, UID 1000, interfaces `["lo"]`, zero IPv4 routes. The authorized Codex profile network toggle does not change the VM launcher's offline default.

Evidence in `scientific/`:

- `container-volume-audit-2026-11-09.json` — all 198 allocations, project mappings, attachments and original snapshot metadata.
- `container-volume-contents-2026-11-09.json` — material, rendering and neutron directory sizes.
- `container-volume-filesystems-2026-11-09.json` — guest filesystem usage and root directory-size results, including permission errors.
- `container-volume-backends-2026-11-09.json` — flux and PETSc project directory sizes.

## Subsequent authorized cleanup

The user subsequently authorized cleanup. Retired 132 temporary Mass Spinner volumes with verified backups; all canonical scientific and other-project volumes remain. Final measured free space was 77.58 GiB, a net gain of 70.19 GiB. See [the cleanup receipt](../scientific/storage-cleanup-2026-11-09/README.md) and its final inventory for the exact post-cleanup state. The initial read-only measurements above remain historical.
