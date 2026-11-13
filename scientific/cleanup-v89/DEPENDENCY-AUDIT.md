# Cleanup dependency audit

12 November 2026. Read-only dependency and duplicate-payload assessment.
The subsequently executed secondary cleanup is recorded separately in
[its completion and recovery report](SECONDARY-CLEANUP.md).
This report records candidates and preservation boundaries, not completed deletion
or a new benchmark result. Parent execution receipts must identify actual removals
and measured free-space changes separately. No Git, VM, dependency, build, test or
scientific execution was performed for this assessment.

## Verified active execution paths

- The application entry is root `index.html`, which loads `src/main.js`.
  `package.json` runs Vite through `scripts/build.mjs`; `vite.config.mjs` copies
  `web-assets/` and emits `release/`. Wrangler serves `release/`, and
  `scripts/check-site.mjs` inspects its modules and deployment assets.
- `npm test` executes `tests/*.test.ts`; some tests directly import/read
  `scientific/` fixtures. Examples include `loading-independent-v24`, `formulary`,
  `experimental-v64`, `field-v70`, `neutron-v38`, `transport-v33/performance`, and
  `hotwall-boundary-v60`. Python tests reference additional scientific modules.
  A package's old version number does not establish that it is unused.
- Vite/build resolution permits `.tools/frontend`; `render:host` explicitly
  names `.tools/blender36`. The atlas producer names `.tools/atlas-venv`.
  These are actual references, even though application/scientific execution is
  required to remain inside safe-dev under the current working rules.
- `blender/check_assets.py` and `tests/component-inspector.test.ts` inspect
  `assets/separator.*`; convergence tests read three tracked `assets/` inputs.
  `web-assets/` is the deployment source, not a disposable generated directory.

## Bounded generated-release duplicates

`generated-release-duplicates.json` admits exactly 34 archive/expanded pairs:
30 beneath `scientific/centrifuge-v44` and four beneath `scientific/fixes-v43`.
Every regular-file relative path, size and SHA-256 in each expanded directory
equals the corresponding original tar member. No links or special files were
admitted. The packet contains all 5,109 per-file records, archive SHA-256 values,
and a deterministic tree-hash recipe for independent revalidation.

The expanded copies contain 2,888,114,303 payload bytes and occupy
2,898,436,096 allocated regular-file bytes (about 2.70 GiB). These are duplicate
payload measurements, not a promised APFS free-space gain.

The technical cause is the historical publication transfer: `publish.py export`
writes both a tar and its unpacked release, while `publish.py deploy` reads the
tar. Simply, every old deployable site was retained twice. Removing only the
verified unpacked copy preserves the exact original artifact and deployment
input. This is preferable to deleting whole campaign directories because those
also contain unique studies, browser proof, source seals, failures and receipts.
Never replace frozen evidence with hardlinks to mutable working source.

Keep every original `.tar`, receipt, release hash manifest, browser record,
study/raw data and source seal. Update concrete links that name removed expanded
paths to the retained archive plus restoration instructions; the historical
`docs/AUDIT-FIXES-V43.md` link to the expanded zoom release is one such link.
Revalidate the admission packet immediately before any removal.

## Additional bounded obsolete candidates

| Candidate | Allocated KiB observed | Evidence and condition |
|---|---:|---|
| `separator-lab.html` | 12 | Standalone initial prototype; no other current app/build/test/source reference found. Preserve any uncommitted changes before removal. |
| `public/` | 8,892 | Superseded early site; Vite uses `web-assets/`. `tsconfig.json` names `public/engine` only as an emit destination, while required typecheck uses `--noEmit`. Its old GLB differs from the active asset, so do not describe it as byte-identical; preserve historical recovery through Git/archive first. |
| Twelve `release-before-*` directories | 865,820 | Build/deploy/check scripts use `release/`; only historical prose references these old exports. Preserve unique uncommitted files before removal; committed obsolete output can be recovered through Git history. |
| `downloads/` | 549,904 | Blender DMGs, their checksum files and the 7zip installer; no current runtime/build/test input reference. Preserve small source/version/checksum receipts if installers are removed. |
| `.tools/blender-app` | 832,548 | Old installed Blender app; no reference in current package/scripts/blender/src/tests/docs/web-assets. Check active renderer ownership before deletion. |
| `.tools/blender-python` | 694,944 | Installed Python dependency environment; no current reference in the same search. Inspected shallow layout is interpreter environment/bin/site-packages. Check for unique non-package files and active ownership before deletion. |
| `.tools/7zip` | 6,132 | Installed extractor and manuals; no current reference in the same search. Check active ownership before deletion. |

The first four groups total 1,424,628 KiB (about 1.36 GiB). The three obsolete
host-tool groups total 1,533,624 KiB (about 1.46 GiB). Together with the verified
expanded releases, bounded candidates total about 5.52 GiB allocated bytes.
This report did not establish Git tracking/cleanliness or running-process state;
the parent owns those admission checks and deletion.

## V88 benchmark source and evidence closure

Keep `scientific/expert-v88/` intact (65,728 KiB observed), including attempts,
preliminary failures, original unqualified packets, negative controls and logs.
Admissions intentionally bind producer source/protocol/native bytes; changing or
discarding those files can invalidate reproducibility even if current app tests
still pass.

| Tool | Retained entry and external dependency boundary |
|---|---|
| OpenFOAM | `openfoam/reference88.py`, `audit88.py`, `test_reference88.py`; README points to `scientific/tooling-v87/openfoam-pilot` installation/license evidence and the authenticated dedicated guest prefix. Keep `INITIAL-INPUTS.zip` and raw-output receipts. |
| LoKI | `electrons/adapter.py`, `extension.py`, `admission.py`, both test modules; original and extension protocols/results/native `output/` are provenance inputs. V2 admission checks native power hashes and original table rows. |
| FESTIM | `festim/validated/` owns pinned source/lock/result/HASHES and campaign tests. `failed-install/` is an installation failure record, not solver rejection; preserve it. |
| WarpX | `warpx/reference.py`, `analyze.py`, `test_reference.py`, protocol/decks/raw arrays. Installation provenance derives from `scientific/warpx/installation.json` and the copied `previous-installation.json`; do not remove the older native installation record. |
| Coupled Radau | `target-radau/run.py`, `continue.py`, `reference.py`, `test_reference.py`, `audit_zero_beam.py` and test; `reference.py` reads `scientific/marathon-v35/material/reference/atomic-reference.cpp` at import time and binds current producing TypeScript plus export/cases/protocol. |
| Snakemake/FiPy | `workflow/Snakefile`, producer/assessor/report/qualifier/admission/seal modules, config/protocol/lock and `test_workflow.py`; content-addressed results and old malformed/cached/interrupted controls are part of the tested chain. |

OpenFOAM raw evolving fields are explicitly local-only: its
`LOCAL-RAW-RECEIPT.json` identifies
`/private/tmp/mass-spinner-openfoam-v88-evidence-20261112-01/v88-openfoam`, with
29 original ZIPs totaling 452,082,880 bytes. The public compact packet is not a
replacement for that unique local export. Keep the authoritative export and
native current-tool VMs for reruns unless separately archived and verified.

## Large groups that are not deletion-admitted

`scientific/storage-cleanup-2026-11-09` holds verified archives of retired VM
source/results and unique historical host differences. Its README explicitly
says these archives are independent of future canonical changes. It is not a
cache and cannot be removed merely because its original sources were deleted.

The remainder of `centrifuge-v44` includes raw/fine/initial/control studies,
browser downloads and source seals. `fixes-v43` includes first failures, exact
tested inputs, logs and final receipts. No blanket deletion of those groups is
admitted. Source snapshots elsewhere in `scientific/` may be deduplicated into
verified content-addressed archives in separate maintenance, but current hashes
and benchmark dependency closure must remain recoverable; filename similarity
alone is insufficient evidence of duplication.

Verification here consisted of source/config/reference reads, filesystem size
inventory, active-asset hash spot checks, and complete per-file tar/expanded
comparison for all 34 admitted pairs. No application or benchmark pass is
inferred from these maintenance checks.
