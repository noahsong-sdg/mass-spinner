# Periodic-sector diagnostic

[Results](../../PERIODIC-AXIS-V96.md) · [Protocol](PROTOCOL.md) ·
[Stability follow-up](STABILITY.md).

Native cyclic boundaries plus least-squares reconstruction pass the initial
rigid-rotation gradient test. Evolution still needs timestep refinement, and
the full campaign remains incomplete. Live defaults are unchanged.

Run only through the pinned safe-dev environment. `control/launch.py` copies
and hashes immutable guest snapshots; `sector96.py` runs initial probes,
`study96.py` runs the registered campaign and `stability96.py` performs the
registered failure follow-up. Archived snapshots preserve failed controls and
nonfinite native fields. `score96.py` requires a complete campaign.

[Raw evidence](https://github.com/noahsong-sdg/mass-spinner/releases/tag/v96-scientific-evidence)
is a release asset; `export.json` records its checksum and
`evidence/ARCHIVE-MANIFEST.json` records every extracted member.
