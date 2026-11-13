# Fresh V86/V87 physical replay helper

Executed offline in the root-authorized 2 GiB safe-dev guest on 12 November 2026: all 26 V86 flow cases, all 64 optical groups and all three V87 active-CFL trajectories completed. Both prediction packets and all 29 raw field/history packets exactly reproduce the originals. The four orchestration controls passed. The aggregate command deliberately exits 1 because V86's original and panel scientific failures remain. See [actual results](RESULTS.md), [execution receipt](evidence-20261112-01/run/execution.json) and [replay differences](evidence-20261112-01/run/v86-replay-differences.json). Frozen physics, inputs, protocols and gates were copied without edits; this execution closes the flow portion of the [earlier plan](../BENCHMARK-PLAN.md).

Actual command, inside `safe-dev --memory 2G -C /private/tmp/mass-spinner-app-v88-clean-20261112 run --`:

```text
/work/home/benchmark89-venv/bin/python -u /work/project/v89-flow-helper-20261112-02/rerun.py --source /work/project --destination /work/project/v89-flow-rerun-20261112-01
```

Before a future full launch, run the four focused orchestration controls inside that guest:

```text
VERIFIED-PY -m unittest discover -s scientific/cleanup-v89/flow-rerun -p test_rerun.py -v
```

Inside the already prepared safe-dev guest, from the copied repository root:

```text
/work/home/VERIFIED-SCIENTIFIC-ENV/bin/python scientific/cleanup-v89/flow-rerun/rerun.py --source /work/project --destination /work/project/v89-flow-rerun-RUNID
```

`RUNID` must name a destination that does not exist. All runtime packages must exactly match `requirements.txt`; the original runtime is Python 3.11.2/zlib 1.2.13. Install only inside safe-dev. The helper authenticates current sources against the frozen original V86/V87 source maps, stages separate roots, reruns 26 V86 trajectories and three active-CFL trajectories, performs independent audits, reruns full V86 optical production, and writes raw-byte/decoded-array/float differences from the original. It records every subprocess exit and stops execution failures. Original scientific audit failures remain exit 1 in the aggregate; they are never converted to success.

Use `--flow-only` only when the coordinator deliberately splits optical production into another run. That mode still reruns all 29 flow trajectories and their original physical audits but explicitly omits the 84 optical Fourier witnesses and full V86 optical production/summary. It must be reported as reduced scope.

Source/input closure is recorded before execution in `source-closure.json` and verified unchanged afterwards. Baseline copies remain immutable. Python cache files are excluded from new-artifact hashes. `execution.json` reports scientific statuses separately from successful producer completion. App tests/build/typecheck stay root-owned; they are not repeated by this helper. Four additional packaging controls and the root-requested five synthetic material-transfer controls passed; no actual material-candidate inventory or retirement ran here.

The [compact archive](evidence-20261112-01.tar.gz) is 608,410 bytes, SHA256 `86881d0c159c40bdf1b72c8edbab25e7e8a4eaf05d89aa50d4802fec85fc8f94`. Its [inventory](evidence-20261112-01/archive-inventory.json) includes every unique output and 531 exact-byte recovery references pinned to repository commit `ce57170038bfff66a6521883a70042aa1294e8d3`, relative path, SHA256 and Git blob OID. Recovery uses pinned Git bytes; no hard links were created. Every included member was reopened/hash-verified in the guest, then the transferred archive's host hash matched. All guest raw outputs and the scientific environment remain retained.

The rerun measured 931.70 s for the V86 physical producer, 129.72 s for full optics and 696.07 s for V87. The earlier plan inferred roughly 12 minutes for V87 from the first trajectory and 1:2:4 step scaling; this is now superseded by measured duration. Existing field output sizes are 34 MiB V86 and 8.4 MiB V87; archived V86 attempt01 is 36 MiB. This wrapper makes frozen copies for independent differences, then exports only unique bytes plus pinned recovery references.
