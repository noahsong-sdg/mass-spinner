# Replay

Run `python launch87.py` inside a fresh safe-dev copy whose V87 `results`
directory is absent or empty. The launcher refuses complete or partial existing
outputs. First export/preserve any previous guest evidence; do not remove
canonical results to obtain a fresh run. Use the Python/package versions in the
execution receipt. Compressed-byte replay additionally depends on Python/zlib;
raw-state equality is the numerical reproduction check.

The frozen `study87.py` was already executing when independent review identified
its overwrite risk. It remains the exact executed producer, and direct invocation
still permits overwrites. The canonical launcher guards it without changing the
physical source seal or rerunning identical physics for an I/O-only correction.
Its code/tests belong to the execution receipt, not the numerical cache key.

V86 fields, original failed audits and comparison remain immutable. This replay
does not score velocities, select a fitting time or qualify experimental accuracy.
