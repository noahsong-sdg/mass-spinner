# Non-rigid argon reference

See [results](../../NONRIGID-FLOW-V98.md), [protocol](PROTOCOL.md) and
[independent review](PHYSICS-REVIEW.md). Experimental/live qualification is false.

Run only inside safe-dev. The release preserves immutable producer snapshots,
partial/failed runs, raw native cases, independent auditor snapshots and logs.
For a bounded fresh reproduction, unpack producer source03 into a small staging
project before `safe-dev init`; do not import this checkout's large research caches.
Use Python3.11, numpy2.4.6, scipy1.17.1, scikit-fem12.0.2; matplotlib3.10.8 for plots.

```sh
python -m unittest discover -s scientific/nonrigid-v98 -p test_fem98.py -v
python scientific/nonrigid-v98/apparatus98.py NEW_RESULTS
python /path/to/auditor/audit98.py NEW_RESULTS /work/project NEW_AUDIT.json
```

Use retained audit-source02 for the independent auditor and its corruption tests.
Native diagnostics additionally require the pinned Foundation14 installation and
prior reference snapshots recorded in `references.json`; never substitute a
different native release or treat an exited process as a physical pass.
