# Actual V86/V87 benchmark rerun

The complete current flow campaign was physically rerun offline in safe-dev. All 26 V86 trajectories, all 64 optical groups and all three V87 active-CFL trajectories completed. Every regenerated prediction packet and all 29 authenticated field/history packets match the frozen originals exactly. Recorded numerical differences are zero.

| Check | Actual result |
|---|---|
| V86 physical producer | 26/26 completed; 931.70 s |
| V86 archived field replay | All 26 complete state/history packets exactly match |
| Actual-field Fourier witnesses | 84/84 passed |
| V86 optical producer | 64/64 groups completed; 129.72 s |
| Optical comparison | All 2,304 alternatives retained; no unavailable groups or numerical optical failures; 0/576 all-point velocity matches at each of the four clocks |
| V86 original scientific audit | Exit 1; 85 field failures and 335 original quadrature failures retained |
| Exact-panel supplement | Exit 1; 85 field failures retained; 0 panel-quadrature failures |
| Native FiPy thermal reference | Exit 0 |
| V87 physical producer | 3/3 completed; 696.07 s; 654/1,310/2,621 accepted steps |
| V87 independent temporal screen | All 28 temporal gates and 112 quadrature checks passed; original 64 V86 spatial failures retained |
| Scientific unit controls | 117 passed: 48 V86 main, 24 independent, 12 hydro, 3 wall, 9 V87 study, 11 V87 audit, 10 report |
| Reproduction/export controls | 4 runner + 4 packaging + 5 synthetic material-transfer tests passed |

The aggregate process exits 1 solely because both V86 scientific audits correctly retain their failed gates. `physicalCampaignsComplete=true`, `allCommandsPassed=false`, `fullModelNumericallyQualified=false`, and `experimentalQualification=false`. Passing the fixed-grid temporal slice does not qualify the unresolved spatial model or establish experimental agreement. No threshold, case, parameter or scientific source was changed.

## Exact execution and snapshot

The guest project was `/private/tmp/mass-spinner-app-v88-clean-20261112`, with 2 GiB configured RAM, no network during science and no host mounts. Required public wheel downloads alone used an explicitly online invocation. Python 3.11.2/zlib 1.2.13, NumPy 2.4.6, SciPy 1.17.1, scikit-fem 12.0.2, FiPy 4.0.3, matplotlib 3.10.8 and PyAbel 0.9.1 were checked before running. Pip wheel URLs/hashes and the complete installed freeze are included in the packet.

```text
/work/home/benchmark89-venv/bin/python -m unittest discover -s /work/project/v89-flow-helper-20261112-02 -p test_rerun.py -v
/work/home/benchmark89-venv/bin/python -u /work/project/v89-flow-helper-20261112-02/rerun.py --source /work/project --destination /work/project/v89-flow-rerun-20261112-01
```

The actual [execution receipt](evidence-20261112-01/run/execution.json) records every subprocess command/cwd/exit/duration. Execution lasted 2026-11-13T01:41:23.941455Z through 02:11:05.443123Z. The [source/input closure](evidence-20261112-01/run/source-closure.json) contains 436 files/96,546,392 bytes, authenticated before and after execution. Closure-file SHA256: `9db734fc773ed2b7abdf41576ebad9458a1741acf526b277255e4257ffca3dfc`. Executed runner SHA256: `9d54ea68a21369d9e08c4e7bd75ba609972ec123a07d5ad844ed482110182d93`.

Prediction SHA256 identities remain:

```text
V86 70e0923e8ac9a53a476e439a9df3e670fb52467ee9d3d6ab5aa62ad9eae5e5c7
V87 4a3a4fcd7801480c9590828b7949d4fd7cf47289bf4dca183e46f8fd1a57b2e1
```

[V86 differences](evidence-20261112-01/run/v86-replay-differences.json) and [V87 differences](evidence-20261112-01/run/v87-replay-differences.json) independently authenticate raw/compressed packets and compare every saved numerical array/history coordinate. They report 26/26 and 3/3 raw and decoded exact matches respectively, plus identical prediction bytes. Trusted host `diff -u` also verifies that the new V87 audit exactly matches the canonical audit; the summary differs only in its seven recorded input paths. Both are retained in full where pinned-commit recovery was unavailable.

After the physical campaign, the following additional commands ran in fresh guest folders:

```text
/usr/bin/python3 -m unittest -v test_pack
/usr/bin/python3 -m unittest -v test_material_retirement_control
```

[Material controls](evidence-20261112-01/helper/material-tests-01/tested-snapshot.json) passed 5/5, exit 0, on controller SHA256 `61312c1814294aea3c8897d5d05e35aa0cac6277e444bc08fa25d9d9ff8ee6dc` and test SHA256 `3b9b0d68dfc434877d1842f6cb6b2cb1f8cf817d0b67aa6445e76643c14c0360`; both match the current host files. These execute only synthetic tar/chunk fixtures, never the host maintenance entrypoint or material candidate. [Packaging controls](evidence-20261112-01/helper/packaging-01/tested-snapshot.json) passed 4/4, including changed bytes, untracked bytes, incomplete runs and overwrite rejection.

## Preservation and recovery

The immutable-output problem is an execution-path issue: producers anchor results to their script directory, several permit overwrite, and the V86 producer can exit 0 after recording incomplete cases. In plain terms, a rerun in the old folder can replace evidence, and a successful process status alone can hide missing trajectories. The new orchestration copies a frozen source/input closure into fresh roots, checks the complete case inventory, admits outputs through the existing independent auditors and keeps every scientific failure. This preserves the executed producer seals and avoids changing frozen code merely to add output-directory switches.

The [compact archive](evidence-20261112-01.tar.gz) is 608,410 bytes, SHA256 `86881d0c159c40bdf1b72c8edbab25e7e8a4eaf05d89aa50d4802fec85fc8f94`. It carries 58 unique files totaling 2,248,591 regular-file bytes, including all execution logs, new differences, new receipts, package provenance and unique checker/report artifacts. The archive was reopened in the guest and every included member hash was verified; after transfer, trusted host `shasum -a 256` reproduced its exact hash and the extracted receipts were reopened.

The [inventory](evidence-20261112-01/archive-inventory.json) records 531 omitted exact-byte copies totaling 152,022,680 bytes, each bound to [the repository](https://github.com/noahsong-sdg/mass-spinner), commit `ce57170038bfff66a6521883a70042aa1294e8d3`, relative path, SHA256 and Git blob OID. The root-authorized trusted host `git ls-tree -rz -r` command produced 453,507 bytes with SHA256 `ac864b5adaa2d6ff68ba68691710f86e9cb85810ef7736ac1cdf68f61ca09e4f`; its raw output and [provenance](git-tree-provenance.json) are retained. Untracked/different files were archived in full. This avoids another raw-data duplicate while keeping recovery independent of later edits to a host pathname.

All guest raw outputs remain in `/work/project/v89-flow-rerun-20261112-01`; the scientific environment remains `/work/home/benchmark89-venv`. No scientific guest output, environment, VM volume or canonical evidence was deleted by this work. The serial slot was explicitly released after export verification. Application tests, required final typecheck/build and the V88 expert campaigns remain root-owned and are not claimed by this flow report.
