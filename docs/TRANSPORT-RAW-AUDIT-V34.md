# Prospective independent raw audit, v34

Preparation only: no v34 outcome artifact has been received or inspected by this reviewer. The frozen analyzer and protocol live in `scientific/transport-v34/independent-raw-review/`. This is separate from the previously sealed source/gate review.

The Python analyzer independently reconstructs sampled raw canonical angular momentum from active means and the exit flux, time-weighted active-representative unresolved exposure, domain-status/reason counts and scalar threshold flags. It verifies exact 30-case source/config/seed/RNG/mode/status identity and retains failed or missing cases. It imports no production checker and uses unchanged physical thresholds. The separate statistical reviewer owns paired observable inference.

Preparation checks ran offline inside guest `safe-dev-9cb72f23d28a98b3`, stage `/tmp/mass-spinner-transport34-raw-review`:

- `python3 -m py_compile audit-raw.py check-preparation.py`: exit 0.
- `python3 check-preparation.py -v`: seven synthetic arithmetic/status tests passed, exit 0. Cases cover exact-time exit inclusion, exposure weighting, absent fractions, no-active nodes, outside-domain precedence, invalid ledger scales and all 30 terminal failures.

The wrapper verified all five input hashes before and after. No dependencies, network, physical simulation or application suite were required. Valuable outputs were exported to `/tmp/mass-spinner-transport34-raw-review-preparation-export`. The analyzer SHA-256 is `494ae39dbcef187659c5b01a5859c0c3afb77a3642cf41177e2f6656b660c8fd`.

Future ingestion is gated on a parent-supplied terminal catalog and artifact pins. The current frozen protocol defines the catalog adapter schema. Any post-ingestion analyzer correction must use a new version and preserve the original script/result. This audit cannot independently recompute per-cell thermal/domain scalars because particle states and cell membership are not retained; it checks recorded sampled diagnostics and their accounting. No unsampled-time, continuum-error, statistical-independence or transport-qualification claim follows from preparation checks.
